document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const paperId = params.get('id');

    if (!paperId) {
        alert("文献标识符缺失");
        return;
    }

    try {
        // 1. 从首页 API 获取所有已发表文献的元数据
        const res = await fetch('/api/homepage');
        const result = await res.json();
        
        if (result.success) {
            // 在 papers 数组中寻找对应的稿件
            const paper = result.data.papers.find(p => p.id === paperId);

            if (paper) {
                // 2. 渲染文字信息
                document.title = `${paper.title} | VSTOR Archive`;
                document.getElementById('p-title').innerText = paper.title;
                document.getElementById('p-authors').innerText = `作者：${paper.authors}`;
                document.getElementById('p-meta').innerText = paper.meta || "VSTOR 开源文献库收录";
                document.getElementById('p-abstract').innerText = paper.abstract;

                // 3. 【核心】注入 PDF 地址
                const iframe = document.getElementById('pdf-iframe');
                if (paper.pdfUrl && paper.pdfUrl !== "#") {
                    // 加上 #toolbar=0 可以隐藏原生工具栏（可选）
                    iframe.src = paper.pdfUrl; 
                } else {
                    iframe.parentElement.innerHTML = "<div style='padding:50px; color:white;'>该文献暂无在线预览，请联系作者。</div>";
                }

                // 4. 下载按钮逻辑
                const dlBtn = document.getElementById('p-download-top');
                dlBtn.onclick = () => window.open(paper.pdfUrl, '_blank');

            } else {
                document.body.innerHTML = "<div class='v-loading-text'>文献已下架或 ID 错误。</div>";
            }
        }
    } catch (err) {
        console.error("加载文献失败:", err);
    }
});