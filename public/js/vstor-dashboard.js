document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 获取并渲染用户信息 ---
    const userData = localStorage.getItem('vstor_user');
    const modal = document.getElementById('submitModal');
    const openBtn = document.getElementById('openSubmitModal'); // 刚才加的ID
    const closeBtn = document.getElementById('closeModal');

    // 调试日志：如果按钮没反应，按下 F12 看控制台是否输出了下面这句话
    console.log("正在初始化弹窗逻辑...", { modal, openBtn, closeBtn });

    if (openBtn && modal) {
        openBtn.onclick = function () {
            console.log("点击了提交按钮，正在打开弹窗");
            modal.style.display = "block";
        };
    }

    if (closeBtn && modal) {
        closeBtn.onclick = function () {
            modal.style.display = "none";
        };
    }

    // 点击弹窗外部也能关闭
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    // 如果发现没登录（缓存里没东西），直接踢回登录页，防止非法进入
    if (!userData) {
        alert("请先登录学术账号");
        window.location.href = "vstor-auth.html";
        return;
    }

    const user = JSON.parse(userData);
    loadMyAcademicData();

    // 获取页面上的名字和头像元素
    const usernameElement = document.querySelector('.v-username');
    const avatarElement = document.querySelector('.v-avatar');
    const roleBadge = document.querySelector('.role-badge');
    const nameSpan = document.querySelector('.v-user-btn .v-username');
    const avatarSpan = document.querySelector('.v-user-btn .v-avatar');
    const dashTitle = document.querySelector('.dash-title');

    // 把“单推人小明”替换成真实昵称
    // Populate the VUP submit dropdown with available Wiki entities
    async function loadVupDropdown() {
        try {
            const vupSelect = document.getElementById('submitVupSelect');
            if (!vupSelect) return;
            const res = await fetch('/api/vups');
            const data = await res.json();
            if (data.success && data.list) {
                vupSelect.innerHTML = '';
                data.list.forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v.name;
                    opt.textContent = v.name;
                    vupSelect.appendChild(opt);
                });
            }
        } catch (e) { console.error('Failed to load VUPs for submission form', e); }
    }
    loadVupDropdown();

    if (usernameElement) {
        usernameElement.innerText = user.nickname;
    }

    // 把头像首字母换成昵称的第一个字
    if (avatarElement) {
        const avatarSrc = user.avatar || user.avatarUrl;
        if (avatarSrc && avatarSrc !== "null") {
            avatarElement.innerHTML = `<img src="${avatarSrc}">`;
            avatarElement.style.background = 'none';
        } else {
            avatarElement.innerText = user.nickname.charAt(0).toUpperCase();
            // 根据身份给头像上色
            if (user.role === 'vup') {
                avatarElement.style.background = 'linear-gradient(135deg, #990000, #d32f2f)'; // 学术红
            }
        }
    }

    // 新版：填充左侧学术概况卡片的数据
    const profileName = document.getElementById('profileDisplayName');
    const profileAvatar = document.getElementById('profileDisplayAvatar');
    const profileBio = document.getElementById('profileDisplayBio');
    const bioInput = document.getElementById('bioInput');

    if (profileName) profileName.innerText = user.nickname;
    if (profileAvatar) {
        const avatarSrc = user.avatar || user.avatarUrl;
        if (avatarSrc && avatarSrc !== "null") {
            profileAvatar.innerHTML = `<img src="${avatarSrc}">`;
            profileAvatar.style.background = 'none'; // 去掉原本的光晕背景
        } else {
            profileAvatar.innerText = user.nickname.charAt(0).toUpperCase();
        }
    }
    if (profileBio && user.bio) profileBio.innerText = user.bio;
    if (bioInput && user.bio) bioInput.value = user.bio;

    // 更新下拉框里的身份标签
    if (roleBadge) {
        roleBadge.innerText = user.role === 'vup' ? '认证研究对象 / 作者' : '独立研究员';
    }

    // --- 2. 下拉菜单交互逻辑 ---
    const userBtn = document.querySelector('.v-user-btn');
    const userDropdown = document.getElementById('userDropdown');

    if (userBtn && userDropdown) {
        userBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!userDropdown.contains(e.target) && !userBtn.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
    }

    // --- 5. 处理提交按钮 (Submit Manuscript) ---
    const manuscriptForm = document.getElementById('manuscriptForm');
    if (manuscriptForm) {
        manuscriptForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(manuscriptForm);

            // Handle multiple select for VUPs: Extract all selected options into JSON string
            const vupSelect = document.getElementById('submitVupSelect');
            if (vupSelect) {
                const selectedVups = Array.from(vupSelect.selectedOptions).map(opt => opt.value);
                formData.set('vup', JSON.stringify(selectedVups)); // Overwrite the default string field
            }

            const user = JSON.parse(localStorage.getItem('vstor_user'));
            formData.append('author', user.nickname); // 把当前登录的人传过去

            try {
                const response = await fetch('/api/auth/submit', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.success) {
                    alert("提交成功！稿件已进入初审。");
                    // 关闭弹窗
                    document.getElementById('submitModal').style.display = 'none';
                    // 关键：重新调用加载数据的函数，刷新列表
                    loadMyAcademicData();
                }
            } catch (err) {
                console.error("提交失败", err);
            }
        });
    }
    // --- 3. 退出登录逻辑 ---
    const logoutBtn = document.querySelector('.text-red'); // 找到那个红色的退出按钮
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('vstor_user'); // 销毁缓存
            window.location.href = "/"; // 回到首页（即 vup-archive.html）
        });
    }

    // --- 核心新增：处理个人资料修改表单 ---
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 使用 FormData 抓取文件和文字
            const formData = new FormData(profileForm);
            // 必须带上名字，后端才知道改谁
            formData.append('nickname', user.nickname);

            try {
                const res = await fetch('/api/user/update-profile', {
                    method: 'POST',
                    body: formData
                });
                const result = await res.json();

                if (result.success) {
                    alert("✅ 学术档案更新成功！");
                    // 重要：更新本地缓存，否则侧边栏头像不会立刻变
                    localStorage.setItem('vstor_user', JSON.stringify(result.user));

                    // 直接刷新页面或手动更新UI都可以，这里选择隐藏编辑框并刷新
                    const panel = document.getElementById('profileEditPanel');
                    if (panel) panel.style.display = 'none';

                    location.reload(); // 刷新页面看效果
                } else {
                    alert("失败：" + result.message);
                }
            } catch (err) {
                console.error("网络错误:", err);
                alert("无法连接服务器");
            }
        });
    }

    // --- 4. 动态加载学术数据 (Published, Pending, Table) ---
    async function loadMyAcademicData() {
        const userData = localStorage.getItem('vstor_user');
        if (!userData) return;
        const user = JSON.parse(userData);

        try {
            const response = await fetch(`/api/my-data?user=${user.nickname}`);
            const data = await response.json();

            // 填入统计数字
            document.getElementById('stat-published').innerText = data.stats.published;
            document.getElementById('stat-pending').innerText = data.stats.pending;

            // 填入表格
            const tbody = document.getElementById('manuscriptTableBody');
            if (data.list.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">暂无投稿记录</td></tr>`;
            } else {
                tbody.innerHTML = data.list.map(m => {
                    // 1. 确定状态颜色类
                    let statusClass = 'status-review';
                    if (m.status === '已发表') statusClass = 'status-published';
                    if (m.status === '退回修改') statusClass = 'status-review'; // 或者你自定一个颜色

                    // 2. 核心逻辑：精准判断操作列显示什么
                    let actionContent = '';

                    if (m.status === '退回修改') {
                        // 只要状态是退回，就强制显示反馈框，如果没有理由就显示“请查看修改要求”
                        const reason = m.feedback || "编辑未填写具体理由，请联系编委会。";
                        actionContent = `<div class="feedback-box">💡 意见: ${reason}</div>`;
                    } else if (m.status === '已发表') {
                        actionContent = `<span style="color:green">收录成功</span>`;
                    } else {
                        // 默认状态（待初审、正在评审等）
                        actionContent = '<span class="text-muted">等待评审...</span>';
                    }

                    return `
						<tr>
							<td>${m.id}</td>
							<td>《${m.title}》</td>
							<td><span class="vup-tag">${m.vup}</span></td>
							<td><span class="${statusClass}">${m.status}</span></td>
							<td style="font-size: 0.85rem; color: #666;">
								${actionContent}
							</td>
						</tr>
					`;
                }).join('');;
            }
        } catch (err) {
            console.error("加载失败", err);
        }
    }

});