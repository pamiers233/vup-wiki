/**
 * VSTOR Bilibili 神经连接系统 (独立插件版)
 */
(function() {
    // 1. 核心配置
    const BILI_THEME_COLOR = "#fb7299";

    // 2. 初始化逻辑
    async function initBiliBridge() {
        const path = window.location.pathname;
        const userData = localStorage.getItem('vstor_user');

        // --- 功能 A：如果你在登录页 (vstor-auth.html) ---
        const loginBtn = document.getElementById('biliQuickLoginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', handleBiliLogin);
        }

        // --- 功能 B：如果你在控制台 (vstor-dd.html) ---
        if (userData && path.includes('vstor-dd.html')) {
            const user = JSON.parse(userData);
            if (user.biliUid) {
                renderBiliFeatures(user);
            }
        }
    }

    // 处理 B站 UID 登录
    async function handleBiliLogin() {
    const choice = confirm("⚡ VSTOR B站神经连接：\n\n【确定】：自动同步 (简单，但需B站开启公开关注)\n【取消】：手动注入 (强力破解，100%成功，适合隐私用户)");

		if (choice) {
			// --- 方案 A：原有的 UID 自动同步逻辑 ---
			const uid = prompt("请输入您的 B站 UID：");
			if (!uid || isNaN(uid)) return;
			executeBiliSync('/api/auth/bilibili', { uid: uid.trim() });
		} else {
			// --- 方案 B：物理破解 (手动注入) ---
			const uid = prompt("第一步：请输入您的 B站 UID：");
			if (!uid) return;
			
			const rawData = prompt(
				"第二步：物理破解操作指引：\n" +
				"1. 在电脑浏览器打开您的 B站 关注页\n" +
				"2. 按 F12，在控制台(Console)输入：copy(window.__INITIAL_STATE__)\n" +
				"3. 回到这里，在此处粘贴 (Ctrl+V)："
			);

			if (!rawData) return;

			try {
				// 解析 B 站极其复杂的原始数据包
				const state = JSON.parse(rawData);
				
				// 提取关注列表 (这是 B 站网页的原始数据结构)
				const list = state.relation.followingList || [];
				const realFollows = list.map(v => ({
					name: v.uname,
					tag: v.official_verify.desc || "已关注",
					status: "物理破解同步"
				}));

				// 提取个人信息
				const nickname = state.user.info.uname;
				const avatar = state.user.info.face;

				console.log("[破解成功] 提取到关注数：", realFollows.length);

				// 发送给后端
				executeBiliSync('/api/auth/bilibili-manual', { 
					uid: uid.trim(), 
					nickname, 
					avatar, 
					follows: realFollows 
				});

			} catch (e) {
				alert("破解失败：粘贴的数据格式不正确，请确保复制了完整的 window.__INITIAL_STATE__");
				console.error(e);
			}
		}
	}
	
	async function executeBiliSync(url, payload) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            localStorage.setItem('vstor_user', JSON.stringify(result.user));
            alert("Bilibili 数据连接成功！系统已激活。");
            window.location.href = "vstor-dd.html";
        }
    } catch (e) {
        alert("后端连接失败");
    }
}

    // 渲染 B站 专属特权（头像与关注列表）
    function renderBiliFeatures(user) {
        console.log("[B站桥接] 检测到 B站 同步身份，正在解锁特权模块...");

        // 1. 强行替换全站头像为 B站 真实头像
        const avatarEls = document.querySelectorAll('.v-avatar');
        avatarEls.forEach(el => {
            el.innerHTML = `<img src="${user.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:0;">`;
            el.style.border = `2px solid ${BILI_THEME_COLOR}`;
        });

        // 2. 渲染关注雷达模块
        const section = document.getElementById('biliFollowsSection');
        const listContainer = document.getElementById('biliFollowsList');
        
        if (section && listContainer && user.follows) {
            section.style.display = 'block';
            listContainer.innerHTML = user.follows.map(vup => `
                <div style="border: 1px solid ${BILI_THEME_COLOR}; padding: 12px; background: white; min-width:140px;">
                    <div style="font-weight: bold; font-size:0.9rem;">${vup.name}</div>
                    <div style="font-size: 0.75rem; color: ${BILI_THEME_COLOR}; margin-top:4px;"># ${vup.tag}</div>
                    <button class="v-btn v-btn-outline" style="font-size:10px; padding:2px 5px; margin-top:8px; border-color:${BILI_THEME_COLOR}; color:${BILI_THEME_COLOR};">立项研究</button>
                </div>
            `).join('');
        }
    }

    window.addEventListener('DOMContentLoaded', initBiliBridge);
})();