const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const multer = require('multer');
const fs = require('fs');

// 1. 静态资源与上传配置
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// 2. 数据库持久化配置
const DB_FILE = path.join(__dirname, 'database.json');
let db = {
    homepage: {
        hero: { title: "探索 VUP 圈的学术宇宙", subtitle: "收录全网野生学术论文...", hotSearches: ["舰长转化率模型", "赛博套皮心理学"] },
        papers: []
    },
    users: [],
    manuscripts: [],
    vups: [] // 新增: 维基百科式存储的 VUP 资料实体
};

if (fs.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        console.log("✅ 硬盘数据加载成功");
    } catch (err) { console.error("❌ 数据加载失败"); }
}

function saveToDisk() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// 3. 中件间配置
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { index: 'vup-archive.html' }));

/* =========================================
   API 路由定义
========================================= */

// 获取首页数据 (带热度排序)
app.get('/api/homepage', (req, res) => {
    const papers = db.homepage.papers || [];
    const sortedPapers = [...papers].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    res.json({ success: true, data: { ...db.homepage, papers: sortedPapers } });
});

// 获取个人中心数据 (合并后的正确版)
app.get('/api/my-data', (req, res) => {
    const username = req.query.user;
    const myPapers = db.manuscripts.filter(m => m.author === username);
    const level = Math.min(6, 1 + myPapers.length);

    res.json({
        success: true,
        level: level,
        stats: {
            published: myPapers.filter(p => p.status === "已发表").length,
            pending: myPapers.filter(p => p.status !== "已发表").length,
            contribution: myPapers.length
        },
        list: myPapers
    });
});

// 处理新投稿 (支持封面 + 原稿 + VUP多选)
app.post('/api/auth/submit', upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), (req, res) => {
    try {
        const { title, vup, author } = req.body;
        const paperFile = req.files['file'] ? req.files['file'][0] : null;
        const coverFile = req.files['cover'] ? req.files['cover'][0] : null;

        // 如果传过来的是前端 multi-select 的逗号分隔字符串，将其拆分成数组 (保持向后兼容)
        let vupArray = Array.isArray(vup) ? vup : (vup ? vup.split(',').map(v => v.trim()) : []);

        const newDoc = {
            id: "V-" + Date.now().toString().slice(-4),
            title: title,
            vup: vupArray.length > 0 ? vupArray : vup, // 如果解析出数组则存数组，否则兼容旧的单个字符串
            status: "待初审",
            author: author,
            fileUrl: paperFile ? `/uploads/${paperFile.filename}` : null,
            coverUrl: coverFile ? `/uploads/${coverFile.filename}` : null,
            fileName: paperFile ? paperFile.originalname : "未知文件",
            feedback: ""
        };

        db.manuscripts.unshift(newDoc);
        saveToDisk();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// B站 登录与同步 (重新接回)
app.post('/api/auth/bilibili', async (req, res) => {
    const { uid } = req.body;
    try {
        const cardRes = await fetch(`https://api.bilibili.com/x/web-interface/card?mid=${uid}`);
        const cardData = await cardRes.json();

        let user = db.users.find(u => u.biliUid === uid);
        const userData = {
            nickname: cardData.data.card.name,
            avatar: cardData.data.card.face,
            biliUid: uid,
            follows: [{ name: "嘉然今天吃什么", tag: "顶流", status: "活跃" }] // 示例关注
        };

        if (!user) {
            user = { id: Date.now(), role: 'dd', level: 1, ...userData };
            db.users.push(user);
        } else { Object.assign(user, userData); }

        saveToDisk();
        res.json({ success: true, user });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 用户注册与登录
app.post('/api/auth/register', (req, res) => {
    const { nickname, role, email, password, biliuid, direction, affiliation, platform } = req.body;
    if (db.users.find(u => u.nickname === nickname)) return res.status(400).json({ success: false, message: "重名" });
    const newUser = { id: Date.now(), role, nickname, email, password, level: 1, contribution: 0, biliuid, direction, affiliation, platform };
    db.users.push(newUser);
    saveToDisk();
    res.json({ success: true, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
    const { account, password } = req.body;
    let user = db.users.find(u => u.nickname === account || u.email === account);

    if (user) {
        if (user.password && user.password !== password) {
            return res.status(401).json({ success: false, message: "密码错误" });
        }
        res.json({ success: true, user });
    } else {
        res.status(401).json({ success: false, message: "账号不存在" });
    }
});

// 管理员系统
app.get('/api/admin/manuscripts', (req, res) => res.json({ success: true, list: db.manuscripts }));

app.post('/api/admin/approve', (req, res) => {
    const { id, action, reason } = req.body;
    const doc = db.manuscripts.find(m => m.id === id);
    if (!doc) return res.status(404).json({ success: false });

    doc.feedback = reason || (action === 'approve' ? "准予发表。" : "请修改。");
    if (action === 'approve') {
        doc.status = "已发表";
        db.homepage.papers.unshift({
            id: doc.id,
            title: doc.title,
            authors: doc.author,
            abstract: doc.feedback,
            pdfUrl: doc.fileUrl || "#",
            coverUrl: doc.coverUrl || null,
            meta: `开源期刊 / ${new Date().getFullYear()} / VSTOR`,
            likes: 0,
            likers: []
        });
    } else { doc.status = "退回修改"; }
    saveToDisk();
    res.json({ success: true });
});

// 点赞逻辑
app.post('/api/papers/like', (req, res) => {
    const { paperId, username } = req.body;
    const paper = db.homepage.papers.find(p => p.id === paperId);
    if (!paper) return res.status(404).json({ success: false });
    if (!paper.likers) paper.likers = [];

    const index = paper.likers.indexOf(username);
    if (index > -1) {
        paper.likers.splice(index, 1);
        paper.likes = Math.max(0, (paper.likes || 1) - 1);
        saveToDisk();
        res.json({ success: true, action: "unliked", newCount: paper.likes });
    } else {
        paper.likers.push(username);
        paper.likes = (paper.likes || 0) + 1;
        saveToDisk();
        res.json({ success: true, action: "liked", newCount: paper.likes });
    }
});

// 搜索建议
app.get('/api/search/suggestions', (req, res) => {
    const q = (req.query.q || "").toLowerCase();
    const papers = db.homepage.papers.filter(p => p.title.toLowerCase().includes(q)).slice(0, 5);
    const authors = [...new Set(db.manuscripts.map(m => m.author))].filter(a => a.toLowerCase().includes(q)).slice(0, 3);
    const vups = [...new Set(db.manuscripts.map(m => m.vup))].filter(v => v.toLowerCase().includes(q)).slice(0, 3);
    res.json({ papers, authors, vups });
});

// 高级检索
app.get('/api/search/advanced', (req, res) => {
    const q = (req.query.q || "").toLowerCase();
    const status = req.query.status || "published";
    const sort = req.query.sort || "relevance";

    let results = [];

    // 如果选了全部(包含未经评审的代码预印本)，则全去 manuscripts 找，否则去 homepage.papers
    if (status === "all") {
        results = [...db.manuscripts];
    } else {
        // 对于只看发过的正刊，去 homepage.papers，但需从 manuscripts 中补全 VUP 等字段信息
        results = db.homepage.papers.map(p => {
            const originalMsg = db.manuscripts.find(m => m.id === p.id);
            return { ...p, vup: originalMsg ? originalMsg.vup : "未知" };
        });
    }

    // 执行关键词过滤（标题、作者、VUP）
    if (q) {
        results = results.filter(p => {
            const titleMatch = (p.title || "").toLowerCase().includes(q);
            const authorMatch = (p.author || p.authors || "").toLowerCase().includes(q);
            const vupMatch = (p.vup || "").toLowerCase().includes(q);
            return titleMatch || authorMatch || vupMatch;
        });
    }

    // 执行排序
    if (sort === "likes") {
        results.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (sort === "newest") {
        // 根据 ID (时间戳生成) 倒叙排序
        results.sort((a, b) => {
            const timeA = parseInt((a.id || "").replace("V-", ""));
            const timeB = parseInt((b.id || "").replace("V-", ""));
            return timeB - timeA;
        });
    }

    // 附加作者的头像和等级信息
    const enhancedResults = results.map(p => {
        const authorName = p.author || p.authors;
        const user = db.users.find(u => u.nickname === authorName);
        return {
            ...p,
            authorAvatar: user ? user.avatar : null,
            authorLevel: user ? user.level : 1
        };
    });

    res.json({ success: true, papers: enhancedResults });
});

// 1. 获取特定作者的公开资料 (搜索点击进入时调用)
app.get('/api/author/profile', (req, res) => {
    const name = req.query.name;
    // 找用户资料
    const user = db.users.find(u => u.nickname === name);
    // 找该作者所有已发表的论文
    const papers = db.homepage.papers.filter(p => p.authors.includes(name));

    res.json({
        success: true,
        data: {
            nickname: name,
            avatar: user ? user.avatar : null,
            bio: user ? (user.bio || "该学者尚未撰写自我简介。") : "野生学术界的一颗晨星。",
            level: user ? user.level : 1,
            papers: papers
        }
    });
});

// 核心新增：处理个人资料更新 (头像 + 简介)
app.post('/api/user/update-profile', upload.single('avatar'), (req, res) => {
    try {
        const { nickname, bio } = req.body;
        const user = db.users.find(u => u.nickname === nickname);

        if (!user) return res.status(404).json({ success: false, message: "用户不存在" });

        // 1. 更新简介
        if (bio !== undefined) user.bio = bio;

        // 2. 如果上传了新头像，更新头像路径
        if (req.file) {
            user.avatar = `/uploads/${req.file.filename}`;
        }

        // 3. 持久化存盘
        saveToDisk();

        console.log(`[档案更新] 用户:${nickname} 更新了资料`);
        res.json({ success: true, user: user });
    } catch (err) {
        console.error("更新档案失败:", err);
        res.status(500).json({ success: false });
    }
});

// --- 学术指标与合集 API ---

// M1: 获取统计指标
app.get('/api/metrics', (req, res) => {
    // 1. 高引文献 (按点赞排序)
    const topPapers = [...db.homepage.papers].sort((a, b) => (b.likes || 0) - (a.likes || 0));

    // 2. 统计高频 VUP
    const vupMap = {};
    db.manuscripts.forEach(m => {
        if (m.vup && m.status === "已发表") {
            vupMap[m.vup] = (vupMap[m.vup] || 0) + 1;
        }
    });
    const topVups = Object.keys(vupMap).map(k => ({ name: k, count: vupMap[k] })).sort((a, b) => b.count - a.count);

    // 3. 统计高产作家 (根据 manuscripts 中状态为"已发表"的数量)
    const authorMap = {};
    db.manuscripts.forEach(m => {
        if (m.author && m.status === "已发表") {
            authorMap[m.author] = (authorMap[m.author] || 0) + 1;
        }
    });
    const topAuthors = Object.keys(authorMap).map(k => {
        const u = db.users.find(user => user.nickname === k);
        return {
            name: k,
            count: authorMap[k],
            level: u ? (u.level || 1) : 1,
            contribution: u ? (u.contribution || 0) : 0
        };
    }).sort((a, b) => b.count - a.count);

    res.json({ success: true, topPapers, topVups, topAuthors });
});

// M2: 获取专栏合集
app.get('/api/collections', (req, res) => {
    // 假设数据库中没有合集结构，我们临时注入两个用于展示学术感
    // 取前几个论文作为特刊内容
    const pubPapers = db.homepage.papers;

    // 取最新的两篇
    const latestIds = pubPapers.slice(0, 2).map(p => p.id);
    // 取高赞的两篇
    const hotIds = [...pubPapers].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 2).map(p => p.id);

    const collections = [
        {
            id: "C-001",
            title: "特刊：互联网底边生态调查与抽象解析 (2026 第一期)",
            description: "本期特刊收录了聚焦于小型VUP生存环境与特定受众群体的深层社会学解析，探讨在流量垄断下的突围模式。",
            paperIds: latestIds
        },
        {
            id: "C-002",
            title: "精选合集：高被引里程碑论著选编",
            description: "集结 VSTOR 创刊至今在圈内引发最广泛讨论、点赞与引用的几篇神级论文。",
            paperIds: hotIds
        }
    ];

    res.json({ success: true, collections: collections, papersData: pubPapers });
});

// VUP 专属功能 API

// --- [新增] Wiki 式 VUP 实录档案库 API ---

// W1: 获取所有已登记的 VUP 档案（用于下拉框或列表）
app.get('/api/vups', (req, res) => {
    // 确保有默认数组
    const vupsList = db.vups || [];
    res.json({ success: true, list: vupsList });
});

// W2: 获取单个 VUP 的维基详细资料
app.get('/api/vups/:name', (req, res) => {
    const vupName = req.params.name;
    const vupData = (db.vups || []).find(v => v.name === vupName);
    if (vupData) {
        res.json({ success: true, data: vupData });
    } else {
        res.status(404).json({ success: false, message: "该实体尚无Wiki档案" });
    }
});

// W3: 保存/更新 VUP 维基词条 (共创编辑)
app.post('/api/vups/save', upload.single('avatar'), (req, res) => {
    try {
        const { name, bio, fanBadge, editorName, infoboxData } = req.body;
        if (!name) return res.status(400).json({ success: false, message: "需指定 VUP 名称" });

        if (!db.vups) db.vups = [];
        let vupEntity = db.vups.find(v => v.name === name);

        // 如果不存在则创建新的词条
        if (!vupEntity) {
            vupEntity = { name: name, createdAt: new Date().toISOString() };
            db.vups.push(vupEntity);
        }

        // 更新非空字段
        if (bio !== undefined) vupEntity.bio = bio;
        if (fanBadge !== undefined) vupEntity.fanBadge = fanBadge;
        // 记录最后编辑者，体现 Wiki 精神
        vupEntity.lastEditor = editorName || "匿名学者";
        vupEntity.updatedAt = new Date().toISOString();

        // 动态信息处理
        if (infoboxData) {
            try {
                vupEntity.infoboxData = JSON.parse(infoboxData);
            } catch (e) {
                console.warn("未能成功解析 infoboxData", e);
            }
        }

        // 处理头像上传
        if (req.file) {
            vupEntity.avatar = `/uploads/${req.file.filename}`;
        }

        saveToDisk();
        res.json({ success: true, data: vupEntity });
    } catch (err) {
        console.error("维基词条保存失败:", err);
        res.status(500).json({ success: false });
    }
});
// ----------------------------------------

// V1: 获取关于该 VUP 的所有论文
app.get('/api/vup/papers', (req, res) => {
    const vupName = req.query.name;
    if (!vupName) return res.status(400).json({ success: false });

    // 从所有已经发表的文章中，寻找研究对象为本VUP的
    const relatedPapers = db.homepage.papers.filter(p => {
        const ms = db.manuscripts.find(m => m.id === p.id);
        if (!ms) return false;
        if (Array.isArray(ms.vup)) return ms.vup.includes(vupName);
        return ms.vup === vupName;
    });

    res.json({ success: true, list: relatedPapers });
});

// V2: VUP 发表官方回应/声明
app.post('/api/vup/statement', (req, res) => {
    const { paperId, statement, vupName } = req.body;

    // 找到原稿件验证
    const ms = db.manuscripts.find(m => m.id === paperId);
    let hasPerm = false;
    if (ms && Array.isArray(ms.vup)) hasPerm = ms.vup.includes(vupName);
    else if (ms) hasPerm = ms.vup === vupName;

    if (!hasPerm) return res.status(403).json({ success: false, message: "无权对非本人相关的文献发表声明" });

    // 更新到已发表的文献结构中
    const paper = db.homepage.papers.find(p => p.id === paperId);
    if (paper) {
        paper.officialStatement = statement;
        saveToDisk();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// V3: (新增) 获取处于待评审状态且研究对象为当前VUP的论文
app.get('/api/vup/pending-papers', (req, res) => {
    const vupName = req.query.name;
    if (!vupName) return res.status(400).json({ success: false, message: "缺少VUP标识" });

    // 从手稿库获取该VUP相关且处于"待初审"的论文
    const pending = db.manuscripts.filter(m => {
        if (m.status !== '待初审') return false;
        if (Array.isArray(m.vup)) return m.vup.includes(vupName);
        return m.vup === vupName;
    });

    res.json({ success: true, list: pending });
});

// V4: (新增) VUP执行同行审核操作 (授权或退回)
app.post('/api/vup/review-paper', (req, res) => {
    const { id, action, reason, reviewer } = req.body;

    // 找到原手稿
    const ms = db.manuscripts.find(m => m.id === id);
    if (!ms) return res.status(404).json({ success: false, message: "稿件不存在" });

    let hasPerm = false;
    if (Array.isArray(ms.vup)) hasPerm = ms.vup.includes(reviewer);
    else hasPerm = ms.vup === reviewer;

    if (!hasPerm) {
        return res.status(403).json({ success: false, message: "您无权评审此文献" });
    }

    if (ms.status !== '待初审') {
        return res.status(400).json({ success: false, message: "该文献当前并非待审状态" });
    }

    if (action === 'approve') {
        ms.status = '已发表';
        ms.feedback = reason || "受试对象已授权披露该观测记录。";

        // 生成最终的发表ID并发布到主页
        const newId = `V-${Math.floor(Math.random() * 9000) + 1000}`; // 简化的新发文号
        ms.id = newId; // 更新手稿库里的ID

        db.homepage.papers.unshift({
            id: newId,
            title: ms.title,
            authors: ms.author,
            abstract: `本部文献已在同行评审中被【${reviewer}】亲自核实并授权发表。主笔研究员保留了所有的实证观测记录。该部分研究主要探讨其在当代虚拟社区中的核心学术价值与存在论意义...`,
            date: new Date().toISOString().split('T')[0],
            tags: [reviewer, "VUP授权", "实证研究"],
            likes: 0,
            likers: [],
            views: 0,
            pdfUrl: ms.fileUrl || "#",
            coverUrl: ms.coverUrl || null,
        });

    } else if (action === 'reject') {
        ms.status = '退回修改';
        ms.feedback = reason || "受试对象驳回了该观测记录。";
    } else {
        return res.status(400).json({ success: false, message: "未知的评审动作" });
    }

    saveToDisk();
    res.json({ success: true, newStatus: ms.status });
});

app.listen(PORT, () => console.log(`📚 VSTOR 服务器启动成功: http://localhost:${PORT}`));