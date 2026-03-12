document.addEventListener('DOMContentLoaded', () => {
    loadAllManuscripts();

    async function loadAllManuscripts() {
        try {
            const response = await fetch('/api/admin/manuscripts');
            const data = await response.json();
            const tbody = document.getElementById('adminTableBody');

            tbody.innerHTML = data.list.map(m => `
				<tr>
					<td>${m.id}</td>
					<td>
						<strong>《${m.title}》</strong><br>
						<small>原始文件名: ${m.fileName}</small>
					</td>
					<td>${m.author}</td>
					<td>
						<!-- target="_blank" 让 PDF 可以在浏览器直接预览，而不是强制下载 -->
						<a href="${m.fileUrl}" target="_blank" class="action-link" style="color:var(--brand-red)">
						   查看/下载原稿
						</a>
					</td>
					<td><span class="badge">${m.status}</span></td>
					<td>
						<button class="v-btn btn-sm bg-green" onclick="processDoc('${m.id}', 'approve')">通过</button>
						<button class="v-btn btn-sm bg-red" onclick="processDoc('${m.id}', 'reject')">退回</button>
					</td>
				</tr>
`			).join('')
        } catch (err) {
            console.error("加载管理后台失败", err);
        }
    }

    // 全局函数，供按钮调用
    window.handleApprove = async (id, action) => {
        if (!confirm(`确定要执行 ${action} 操作吗？`)) return;

        const response = await fetch('/api/admin/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action })
        });

        const result = await response.json();
        if (result.success) {
            alert("审核操作已同步至首页！");
            location.reload(); // 刷新列表
        }
    };
	window.processDoc = async (id, action) => {
		const msg = action === 'approve' ? "请输入发布评语（选填）" : "请输入退回理由（必填）";
		const reason = prompt(msg);
		
		if (action === 'reject' && !reason) return alert("退回必须写明理由！");

		const response = await fetch('/api/admin/approve', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, action, reason })
		});

		if ((await response.json()).success) {
			alert("操作已生效");
			location.reload();
		}
	};
});