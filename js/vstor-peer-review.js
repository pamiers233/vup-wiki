// js/vstor-peer-review.js
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. 获取全站稿件
        const response = await fetch('/api/admin/manuscripts');
        const data = await response.json();
        
        // 2. 过滤出：非“已发表”的稿件
        const reviewList = data.list.filter(m => m.status !== "已发表");
        
        document.getElementById('peerReviewCount').innerText = reviewList.length;
        const container = document.getElementById('peerReviewList');
        
        if (reviewList.length === 0) {
            container.innerHTML = '<div class="v-loading-text">目前学术界一片祥和，暂无待评审稿件。</div>';
            return;
        }

        container.innerHTML = reviewList.map(m => `
            <div class="v-paper-card" style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:20px; border:1px solid #eee; margin-bottom:15px;">
                <div>
                    <div class="v-paper-meta">${m.id} / 作者: ${m.author}</div>
                    <h3 class="v-paper-title">《${m.title}》</h3>
                    <div style="font-size:0.85rem; color:#666;">研究对象: <span class="vup-tag">${m.vup}</span></div>
                </div>
                <div style="text-align:right;">
                    <button class="v-btn v-btn-outline" onclick="window.open('${m.fileUrl}')">查阅原稿</button>
                    <p style="font-size:10px; color:#999; margin-top:5px;">当前状态: ${m.status}</p>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("加载评审中心失败", err);
    }
});