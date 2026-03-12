document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const authorName = params.get('name');

    if (!authorName) return;

    try {
        const res = await fetch(`/api/author/profile?name=${encodeURIComponent(authorName)}`);
        const result = await res.json();
        const author = result.data;

        // 1. 渲染基础信息
        document.getElementById('authorName').innerText = author.nickname;
        document.getElementById('authorBio').innerText = author.bio;
        document.getElementById('authorLevel').innerText = `LV${author.level}`;
        document.getElementById('paperCount').innerText = author.papers.length;

        // 在 vstor-author-view.js 渲染头像的部分进行微调
        const avatarBox = document.getElementById('authorAvatar');
        // 只有当 avatar 存在且不是 null 时才显示图片
        if (author.avatar && author.avatar !== "null" && author.avatar !== "") {
            avatarBox.innerHTML = `<img src="${author.avatar}">`;
            avatarBox.style.background = "none";
            avatarBox.style.border = "none"; // 如果有图片就不需要边框和背景，或者保留白色边框
        } else {
            // 没有头像，使用深色背景和首字母
            avatarBox.innerText = author.nickname ? author.nickname.charAt(0).toUpperCase() : "?";
        }

        // 3. 渲染论文列表
        const listContainer = document.getElementById('authorPapersList');
        if (author.papers.length === 0) {
            listContainer.innerHTML = "<div style='text-align:center; color:#888; padding:60px 20px;'>该学者非常低调，暂无公开出版文献。</div>";
        } else {
            listContainer.innerHTML = author.papers.map(p => {
                const abstractText = p.abstract || p.feedback || "暂无摘要。请点击查阅原文深造。";

                return `
                <div class="paper-card">
                    <div class="paper-content-col">
                        <h3 class="paper-title">
                            <a href="paper-view.html?id=${p.id}">${p.title}</a>
                        </h3>
                        
                        <p style="font-size: 0.95rem; color: #4b5563; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0 0 15px 0;">
                            ${abstractText}
                        </p>
                        
                        <div class="paper-meta" style="margin-top: 0; padding-top: 15px;">
                            <div class="meta-stat">
                                <span style="font-weight: bold; color: #111827;">${author.nickname}</span>
                                <span style="margin: 0 8px; color: #ccc;">|</span>
                                <span>📚 VSTOR ${new Date().getFullYear()}</span>
                                <span style="margin: 0 8px; color: #ccc;">|</span>
                                <span>Likes: <strong style="color: #e53e3e;">${p.likes || 0}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }

    } catch (err) {
        console.error("加载档案失败");
    }
});