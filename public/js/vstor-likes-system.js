/**
 * VSTOR 文献点赞与排行系统
 */
const VstorLikes = {
    async init() {
        // 由于论文列表是动态渲染的，我们使用事件委托
        const container = document.getElementById('paperListContainer');
        if (!container) return;

        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('.v-like-btn');
            if (!btn) return;

            const paperId = btn.getAttribute('data-id');
            await this.submitLike(paperId, btn);
        });
    },

    async submitLike(paperId, btnElement) {
        const userData = localStorage.getItem('vstor_user');
        if (!userData) {
            alert("请先登录学术账号以参与文献评选");
            return;
        }
        const user = JSON.parse(userData);

        try {
            const res = await fetch('/api/papers/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paperId, username: user.nickname })
            });

            const result = await res.json();

            if (result.success) {
                // 更新 UI
                const countSpan = btnElement.nextElementSibling;
                countSpan.innerText = result.newCount;
                btnElement.classList.add('active');
                if (result.action === "liked") {
					alert("推荐成功！该文献热度已提升。");
				} else {
					alert("已撤回推荐。");
				}
                // 可选：重新加载页面以更新排行
                location.reload(); 
            } else {
                alert(result.message);
            }
        } catch (err) {
            console.error("点赞通讯失败", err);
        }
    }
};

// 启动
document.addEventListener('DOMContentLoaded', () => VstorLikes.init());