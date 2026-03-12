/**
 * VSTOR 等级与职称独立系统
 * 独立运行，不干扰原有投稿逻辑
 */
(function() {
    const DD_TITLES = {
        1: { name: "见习单推人", color: "#616161", next: 1 },
        2: { name: "资深老哥", color: "#1e88e5", next: 2 },
        3: { name: "杂谈考据家", color: "#43a047", next: 3 },
        4: { name: "赛博人类学者", color: "#fbc02d", next: 4 },
        5: { name: "核心DD院士", color: "#e67e22", next: 5 },
        6: { name: "终身DD大导师", color: "#990000", next: 0 }
    };

    async function initLevelSystem() {
        const userData = localStorage.getItem('vstor_user');
        if (!userData) return;
        const user = JSON.parse(userData);

        try {
            // 请求后端获取等级数据
            const response = await fetch(`/api/my-data?user=${user.nickname}`);
            const data = await response.json();
            
            // 如果后端还没改好 res.json，这里做个兼容：通过列表长度强行计算
            const currentLevel = data.level || Math.min(6, 1 + (data.list ? data.list.length : 0));
            const info = DD_TITLES[currentLevel];

            console.log(`[职称系统] 当前等级: LV${currentLevel} 称号: ${info.name}`);

            // --- 1. 更新顶部导航栏的职称勋章 ---
            const badge = document.getElementById('navRoleBadge');
            if (badge) {
                badge.innerText = info.name;
                badge.style.color = info.color;
                badge.style.borderColor = info.color;
            }

            // --- 2. 更新欢迎区域的副标题 ---
            const subtitle = document.querySelector('.dash-subtitle');
            if (subtitle) {
                subtitle.innerHTML = `当前职称：<strong style="color:${info.color}">${info.name} (LV${currentLevel})</strong>。您的野生学术之旅正在进行中。`;
            }

            // --- 3. 更新底部经验条区域 ---
            const els = {
                title: document.getElementById('displayTitle'),
                lv: document.getElementById('displayLevel'),
                bar: document.getElementById('levelProgress'),
                next: document.getElementById('nextLevelCount')
            };

            if (els.title) els.title.innerText = info.name;
            if (els.lv) els.lv.innerText = `LV.${currentLevel}`;
            if (els.bar) {
                const percent = (currentLevel / 6) * 100;
                els.bar.style.width = percent + "%";
                els.bar.style.backgroundColor = info.color;
            }
            if (els.next) {
                // 计算距离下一级还差几个投稿
                els.next.innerText = currentLevel < 6 ? "1" : "0";
            }

        } catch (err) {
            console.error("职称系统运行失败:", err);
        }
    }
	
	// 这一段放在你处理侧边栏点击的地方
	const peerReviewLink = document.getElementById('peerReviewLink');
	if (peerReviewLink) {
		peerReviewLink.onclick = (e) => {
			const user = JSON.parse(localStorage.getItem('vstor_user'));
			// 如果是 LV6 大导师，或者你手动指定的管理员名字
			if (user.level >= 6 || user.nickname === "老王") {
				// 自动跳转到真实的“管理网站”
				window.location.href = "vstor-admin.html";
				return false; // 阻止默认跳转
			}
		};
	}

    // 页面加载完成后运行
    window.addEventListener('load', initLevelSystem);

    // 暴露一个手动刷新的接口给投稿功能使用
    window.refreshVstorLevel = initLevelSystem;
})();