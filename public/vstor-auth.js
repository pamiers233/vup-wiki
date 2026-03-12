document.addEventListener('DOMContentLoaded', () => {
    // 1. 状态管理：实时记录用户当前选中的身份和动作
    let currentRole = 'dd';      // 默认 DD
    let currentAction = 'login'; // 默认 登录

    const roleTabs = document.querySelectorAll('.role-tab');
    const actionTabs = document.querySelectorAll('.action-tab');
    const forms = document.querySelectorAll('.auth-form');

    // 2. 切换表单显示逻辑
    function updateActiveForm() {
        const targetFormId = `form-${currentRole}-${currentAction}`;
        forms.forEach(form => {
            form.classList.toggle('active', form.id === targetFormId);
        });
    }

    // 3. 监听身份切换 (DD vs VUP)
    roleTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            roleTabs.forEach(t => t.classList.remove('active'));
            const clickedTab = e.currentTarget;
            clickedTab.classList.add('active');
            currentRole = clickedTab.getAttribute('data-role');
            updateActiveForm();
        });
    });

    // 4. 监听动作切换 (登录 vs 注册)
    actionTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            actionTabs.forEach(t => t.classList.remove('active'));
            const clickedTab = e.currentTarget;
            clickedTab.classList.add('active');
            currentAction = clickedTab.getAttribute('data-action');
            updateActiveForm();
        });
    });
	


    // 5. 核心：处理提交并跳转
    // public/vstor-auth.js
	// 修改 vstor-auth.js 里的表单提交部分
	forms.forEach(form => {
		form.addEventListener('submit', async (e) => {
			e.preventDefault(); 
			
			const submitBtn = form.querySelector('.auth-btn');
			const originalText = submitBtn.innerText;
			submitBtn.disabled = true;
			submitBtn.style.opacity = "0.7";
			submitBtn.innerText = "处理中...";

			// --- 核心修改：使用 FormData 自动收集带有 name 属性的输入框数据 ---
			const formData = new FormData(form);
			const requestData = Object.fromEntries(formData.entries());
			
			// 补上手动管理的状态
			requestData.role = currentRole; 
			
			// 如果是登录表单，后端 server.js 期待的是 account 字段
			// 我们做个兼容处理：如果没有 nickname 但有 account，就统一一下
			if (currentAction === 'login' && requestData.account) {
				requestData.nickname = requestData.account; 
			}
			// -------------------------------------------------------

			try {
				const url = currentAction === 'register' ? '/api/auth/register' : '/api/auth/login';
				const response = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(requestData)
				});
				const result = await response.json();

				if (result.success) {
					localStorage.setItem('vstor_user', JSON.stringify(result.user));
					const targetUrl = currentRole === 'dd' ? 'vstor-dd.html' : 'vstor-vup.html';
					window.location.href = targetUrl;
				} else {
					alert(`错误: ${result.message}`);
					submitBtn.disabled = false;
					submitBtn.innerText = originalText;
					submitBtn.style.opacity = "1";
				}
			} catch (error) {
				alert("无法连接到学术服务器，请检查 server.js 是否运行。");
				submitBtn.disabled = false;
				submitBtn.innerText = originalText;
				submitBtn.style.opacity = "1";
			}
		});
	});;;
});
