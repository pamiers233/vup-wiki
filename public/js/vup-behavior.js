pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化页面：检查登录状态 + 加载主页数据
    checkLoginState();
    loadHomepageData();

    // 3. 右上角下拉菜单交互 (复用之前的逻辑)
    const userBtnToggle = document.getElementById('userBtnToggle');
    const userDropdown = document.getElementById('userDropdown');
    if (userBtnToggle) {
        userBtnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!userDropdown.contains(e.target) && !userBtnToggle.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
    }
	
	// 这一段放在你处理侧边栏点击的地方


    // 4. 退出登录逻辑
   const logoutBtn = document.getElementById('logoutBtn');
	if (logoutBtn) {
		logoutBtn.addEventListener('click', (e) => {
			e.preventDefault();
			localStorage.removeItem('vstor_user');
			window.location.reload();
		});
	}
});
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('nickname', user.nickname); // user是从localStorage拿的

    const res = await fetch('/api/user/update-profile', {
        method: 'POST',
        body: formData
    });
    const result = await res.json();
    if (result.success) {
        alert("档案已更新！");
        localStorage.setItem('vstor_user', JSON.stringify(result.user));
        location.reload();
    }
});

/* =========================================
   核心功能 1：鉴权与状态展示
========================================= */
function checkLoginState() {
    const authLoading = document.getElementById('authLoading');
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');

    // 模拟从本地或后端获取 Token/用户信息
    // 真实后端环境中，这里可能会 fetch('/api/user/me')
    const savedUser = localStorage.getItem('vstor_user');
    
    authLoading.classList.add('hidden'); // 隐藏加载中

    if (savedUser) {
        // 已登录
        const user = JSON.parse(savedUser);
        userMenu.classList.remove('hidden');
        
        // 渲染用户信息
        document.getElementById('navUsername').innerText = user.nickname;
        document.getElementById('navAvatar').innerText = user.nickname.charAt(0);
        document.getElementById('navRoleBadge').innerText = user.role === 'vup' ? '认证研究对象' : '独立研究员';
        document.getElementById('navDashboardLink').href = user.role === 'vup' ? 'vstor-vup.html' : 'vstor-dd.html';
        
        // 动态改变头像颜色
        const avatarStyle = document.getElementById('navAvatar');
        if(user.role === 'vup') {
            avatarStyle.style.backgroundColor = '#990000'; // 学术红
        } else {
            avatarStyle.style.backgroundColor = '#051224'; // 深夜蓝
        }

    } else {
        // 未登录
        loginBtn.classList.remove('hidden');
    }
}

/* =========================================
   核心功能 2：从后端获取并渲染主页数据
========================================= */
// public/main.js
async function loadHomepageData() {
    try {
        // 真正向你的 server.js 发起请求
        const response = await fetch('/api/homepage');
        const result = await response.json();

        if (result.success) {
            const data = result.data;
            // 渲染数据
            renderHero(data.hero);
            renderPapers(data.papers);
        } else {
            throw new Error("服务器返回异常");
        }
    } catch (error) {
        console.error("无法连接到后端:", error);
        document.getElementById('paperListContainer').innerHTML = 
            `<div class="v-loading-text" style="color: #990000;">系统错误：无法连接到 VSTOR 学术网络，请确保 Node.js 后端已启动。</div>`;
    }
}

// 渲染头部区块
function renderHero(heroData) {
    document.getElementById('heroTitle').innerText = heroData.title;
    document.getElementById('heroSubtitle').innerText = heroData.subtitle;
    
    const hotSearchesContainer = document.getElementById('hotSearches');
    // 清除掉原来的“热门检索：”文本后的内容，保留这个<span>
    hotSearchesContainer.innerHTML = '<span>热门检索：</span>';
    
    heroData.hotSearches.forEach(keyword => {
        const a = document.createElement('a');
        a.href = `#`; // 实际开发可写： `/search?q=${keyword}`
        a.innerText = `# ${keyword}`;
        hotSearchesContainer.appendChild(a);
    });
}

// 渲染论文列表
// vup-behavior.js 渲染论文列表的部分
// 渲染论文列表 (合并点赞 + 排行 + PDF预览版)
function renderPapers(papersData) {
    const container = document.getElementById('paperListContainer');
    container.innerHTML = '';
	
    // 1. 安全检查
    if (!papersData || papersData.length === 0) {
        container.innerHTML = '<div class="v-loading-text">近期暂无学术文献收录。</div>';
        return;
    }

    // 获取当前登录用户
    const savedUser = localStorage.getItem('vstor_user');
    const user = savedUser ? JSON.parse(savedUser) : {};

    // 2. 开始单次循环渲染
    papersData.forEach((paper, index) => {
        const article = document.createElement('article');
        article.className = 'v-paper-card';
        
        // --- 逻辑 A：处理点赞状态 ---
        const hasLiked = paper.likers && paper.likers.includes(user.nickname);
        const activeClass = hasLiked ? 'active' : '';

        // --- 逻辑 B：处理封面 (有图出图，没图出Canvas) ---
        let coverHtml = '';
        if (paper.coverUrl && paper.coverUrl !== "null" && paper.coverUrl !== "#") {
            coverHtml = `<img src="${paper.coverUrl}" class="v-paper-cover-img">`;
        } else if (paper.pdfUrl && paper.pdfUrl !== "null" && paper.pdfUrl.toLowerCase().endsWith('.pdf')) {
            // 如果是PDF且没封面，放个画布给 pdf.js 抓图
            coverHtml = `<canvas id="pdf-canvas-${paper.id}" class="v-pdf-thumbnail"></canvas>`;
        } else {
            coverHtml = `<div class="v-placeholder-cover"><div class="mini-title">VSTOR</div><div style="font-size:10px;">PREVIEW<br>UNAVAILABLE</div></div>`;
        }

        // --- 逻辑 C：处理链接防呆 ---
        const pdfLink = (paper.pdfUrl && paper.pdfUrl !== "null") ? paper.pdfUrl : "#";

        // --- 逻辑 D：拼接 HTML (合并排行勋章和点赞按钮) ---
        article.innerHTML = `
            <!-- 排行榜勋章 (前三名) -->
            ${index < 3 ? `<div class="v-rank-badge">0${index+1}</div>` : ''}

            <div class="v-paper-cover-box">
                ${coverHtml}
            </div>
            <div class="v-paper-info">
                <div class="v-paper-meta">${paper.meta || '学术资源 / VSTOR'}</div>
                <h3 class="v-paper-title"><a href="paper-view.html?id=${paper.id}">${paper.title}</a></h3>
                <div class="v-paper-authors">作者：${paper.authors}</div>
                <p class="v-paper-abstract">${paper.abstract}</p>
                <div class="v-paper-actions">
                    <!-- 注意这里的引号嵌套：handleReadFullText('${pdfLink}') -->
                    <button class="v-btn v-btn-text" onclick="handleReadFullText('${pdfLink}')">阅读全文</button>
                    <button class="v-btn v-btn-text">引用 (Cite)</button>
                </div>
            </div>

            <!-- 右侧点赞按钮区 -->
            <div class="v-like-container">
                <button class="v-like-btn ${activeClass}" data-id="${paper.id}">
                    ${hasLiked ? '★' : '☆'}
                </button>
                <span class="v-like-count">${paper.likes || 0}</span>
            </div>
        `;

        container.appendChild(article);

        // --- 逻辑 E：在页面渲染后，启动 PDF 抓图任务 ---
        if (!paper.coverUrl && pdfLink !== "#" && pdfLink.toLowerCase().endsWith('.pdf')) {
            setTimeout(() => {
                if (typeof renderPdfFirstPage === 'function') {
                    renderPdfFirstPage(pdfLink, `pdf-canvas-${paper.id}`);
                }
            }, 100);
        }
    });
}
/**
 * 核心黑科技：加载 PDF 并把第一页画到指定的 Canvas 上 (加固版)
 */
async function renderPdfFirstPage(pdfUrl, canvasId) {
    // 【人话解释 1】：如果路径是空的、null、或者是 #，直接停止，不让浏览器去乱找文件
    if (!pdfUrl || pdfUrl === "null" || pdfUrl === "#" || pdfUrl === "undefined") {
        console.warn(`[预览跳过] 稿件 ${canvasId} 没有有效的 PDF 路径，跳过抓取。`);
        return;
    }

    try {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`[预览失败] 找不到 ID 为 ${canvasId} 的画布`);
            return;
        }

        // 1. 加载文档
        // 使用 loadingTask 包装，增加超时或错误捕获
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        // 2. 获取第一页
        const page = await pdf.getPage(1);

        // 3. 【优化】：动态计算缩放比例，让封面刚好填满 140px 宽度的框
        // 假设我们的封面框宽度是 140px
        const desiredWidth = 140; 
        const viewportOrig = page.getViewport({ scale: 1 });
        const scale = desiredWidth / viewportOrig.width;
        const viewport = page.getViewport({ scale: scale });

        const context = canvas.getContext('2d');
        
        // 设置画布尺寸
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // 4. 开始渲染
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        // 等待渲染完成
        await page.render(renderContext).promise;
        console.log(`[封面生成] 成功抓取 PDF 第一页: ${pdfUrl}`);

    } catch (err) {
        console.error("【PDF.js 渲染报错】:", err);
        
        // 【人话解释 2】：如果 PDF 坏了或者加载失败，显示一个体面的错误提示
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            const parent = canvas.parentElement;
            parent.innerHTML = `
                <div class="v-placeholder-cover" style="background:#eee;">
                    <div style="font-size:10px; color:#999;">预览失败<br>FILE ERROR</div>
                </div>
            `;
        }
    }
}
function handleReadFullText(url) {
    if (!url || url === "#" || url === "null" || url === "undefined") {
        alert("抱歉，该文献的原稿链接失效或正在维护中。");
        return;
    }
    // 在新窗口打开 PDF
    window.open(url, '_blank');
}