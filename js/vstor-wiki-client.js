document.addEventListener("DOMContentLoaded", () => {
    loadVupList();

    // 监听下拉框选择变化
    document.getElementById('vupSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            loadWikiData(e.target.value);
        } else {
            document.getElementById('wikiContent').style.display = 'none';
        }
    });
});

let currentVupData = null;

async function loadVupList() {
    try {
        const res = await fetch('/api/vups');
        const data = await res.json();

        const select = document.getElementById('vupSelect');
        select.innerHTML = '<option value="">请选择一个观测对象查阅档案...</option>';

        if (data.list && data.list.length > 0) {
            data.list.forEach(vup => {
                const opt = document.createElement('option');
                opt.value = vup.name;
                opt.textContent = vup.name;
                select.appendChild(opt);
            });
            // 默认加载第一个
            select.value = data.list[0].name;
            loadWikiData(data.list[0].name);
        } else {
            select.innerHTML = '<option value="">暂无记录，请创建</option>';
        }
    } catch (e) {
        console.error("加载列表失败", e);
    }
}

async function loadWikiData(name) {
    try {
        const res = await fetch(`/api/vups/${encodeURIComponent(name)}`);
        const data = await res.json();

        if (data.success && data.data) {
            currentVupData = data.data;
            renderWiki(currentVupData);
            document.getElementById('wikiContent').style.display = 'grid';
        }
    } catch (e) {
        console.error("加载数据失败", e);
    }
}

function renderWiki(vup) {
    // Info Box
    document.getElementById('infoName').textContent = vup.name;
    document.getElementById('infoAvatar').src = vup.avatar || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 200 200\'><rect width=\'200\' height=\'200\' fill=\'%23f5f7fa\'/><circle cx=\'100\' cy=\'85\' r=\'40\' fill=\'%23c3cfe2\'/><path d=\'M30 200 Q100 120 170 200\' fill=\'%23c3cfe2\'/></svg>';

    // Render Dynamic Infobox
    const infoboxDisplay = document.getElementById('infoboxContentDisplay');
    infoboxDisplay.innerHTML = ''; // 清空

    if (vup.infoboxData && vup.infoboxData.length > 0) {
        vup.infoboxData.forEach(cat => {
            // Category header
            const catElem = document.createElement('div');
            catElem.className = 'infobox-category';
            catElem.textContent = cat.categoryName || '未知大类';
            infoboxDisplay.appendChild(catElem);

            // Properties
            if (cat.items && cat.items.length > 0) {
                cat.items.forEach(item => {
                    const rowElem = document.createElement('div');
                    rowElem.className = 'infobox-row';

                    const labelElem = document.createElement('div');
                    labelElem.className = 'infobox-label';
                    labelElem.textContent = item.key;

                    const valElem = document.createElement('div');
                    valElem.className = 'infobox-value';
                    valElem.textContent = item.value;

                    rowElem.appendChild(labelElem);
                    rowElem.appendChild(valElem);
                    infoboxDisplay.appendChild(rowElem);
                });
            }
        });
    } else {
        // Fallback default structure if no dynamic data exists
        infoboxDisplay.innerHTML = `
            <div class="infobox-category">基本信息</div>
            <div class="infobox-row"><div class="infobox-label">分类/类型</div><div class="infobox-value">虚拟主播 (VUP)</div></div>
            <div class="infobox-row"><div class="infobox-label">专属粉丝勋章</div><div class="infobox-value">${vup.fanBadge || '无记录'}</div></div>
        `;
    }

    // Main Content
    document.getElementById('wikiNameDisplay').textContent = vup.name;
    document.getElementById('wikiBioDisplay').textContent = vup.bio || '该观测对象暂无详细的学术生平传记。点击 [编辑此页面] 进行补充。';

    // Meta
    document.getElementById('wikiEditorDisplay').textContent = vup.lastEditor || '系统';
    document.getElementById('wikiDateDisplay').textContent = new Date(vup.updatedAt || vup.createdAt).toLocaleDateString() || '未知时间';
}

function openCreateModal() {
    document.getElementById('wikiModal').classList.remove('hidden');
    document.getElementById('modalTitle').textContent = '创建新观测对象词条';
    document.getElementById('wikiForm').reset();
    document.getElementById('editName').disabled = false; // 允许修改名字

    // Initialize Empty Dynamic Builder
    document.getElementById('dynamicEditorContainer').innerHTML = '';
}

function openEditModal() {
    if (!currentVupData) return;
    document.getElementById('wikiModal').classList.remove('hidden');
    document.getElementById('modalTitle').textContent = `编辑词条: ${currentVupData.name}`;

    // 填充数据
    document.getElementById('editName').value = currentVupData.name;
    document.getElementById('editName').disabled = true; // 编辑时不许改名，作为主键
    document.getElementById('editBio').value = currentVupData.bio || '';

    // Load dynamic builder UI
    const container = document.getElementById('dynamicEditorContainer');
    container.innerHTML = ''; // 清空

    if (currentVupData.infoboxData && currentVupData.infoboxData.length > 0) {
        currentVupData.infoboxData.forEach(cat => {
            const catGroup = createCategoryUI(cat.categoryName);
            if (cat.items && cat.items.length > 0) {
                cat.items.forEach(item => {
                    addPropRowUI(catGroup, item.key, item.value);
                });
            }
            container.appendChild(catGroup);
        });
    } else {
        // If legacy fallback data
        const catGroup = createCategoryUI("基本信息");
        addPropRowUI(catGroup, "专属粉丝勋章", currentVupData.fanBadge || "");
        container.appendChild(catGroup);
    }
}

function closeModal() {
    document.getElementById('wikiModal').classList.add('hidden');
}

async function submitWiki() {
    const name = document.getElementById('editName').value;
    const bio = document.getElementById('editBio').value;
    const avatarFile = document.getElementById('editAvatar').files[0];

    // Gather dynamic JSON payload
    const infoboxData = [];
    document.querySelectorAll('.editor-category-group').forEach(group => {
        const catNameInput = group.querySelector('.cat-name-input');
        if (!catNameInput || !catNameInput.value.trim()) return; // skip empty cats

        const catData = { categoryName: catNameInput.value.trim(), items: [] };
        group.querySelectorAll('.editor-prop-row').forEach(row => {
            const keyInput = row.querySelector('.prop-key-input');
            const valInput = row.querySelector('.prop-val-input');
            if (keyInput && keyInput.value.trim()) {
                catData.items.push({ key: keyInput.value.trim(), value: valInput.value });
            }
        });
        infoboxData.push(catData);
    });

    if (!name) return alert("必须填写名称！");

    // 获取当前登录用户名 (若未登录，提供匿名)
    let currentUser = "匿名学者";
    const localUser = localStorage.getItem('vstor_user');
    if (localUser) {
        try { currentUser = JSON.parse(localUser).nickname; } catch (e) { }
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('bio', bio);
    formData.append('editorName', currentUser);
    formData.append('infoboxData', JSON.stringify(infoboxData));
    if (avatarFile) formData.append('avatar', avatarFile);

    try {
        const res = await fetch('/api/vups/save', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        if (result.success) {
            alert("词条保存成功！");
            closeModal();
            loadVupList(); // 重新加载数据
        } else {
            alert(result.message || "保存失败");
        }
    } catch (e) {
        alert("网络错误");
    }
}

// ---- Dynamic Builder Helper Functions ----

function addCategoryUI() {
    const container = document.getElementById('dynamicEditorContainer');
    const group = createCategoryUI('');
    container.appendChild(group);
}

function createCategoryUI(nameStr) {
    const group = document.createElement('div');
    group.className = 'editor-category-group';

    // Header (Title + delete cat btn)
    const header = document.createElement('div');
    header.className = 'editor-category-header';
    header.innerHTML = `
        <input type="text" class="cat-name-input" placeholder="大类名称 (例如: 设定信息)" value="${nameStr}" style="flex:1;">
        <button type="button" class="btn-rm" onclick="this.parentElement.parentElement.remove()">×</button>
    `;
    group.appendChild(header);

    // Rows Container
    const rowsContainer = document.createElement('div');
    rowsContainer.className = 'editor-rows-container';
    group.appendChild(rowsContainer);

    // Add Row btn
    const addRowBtn = document.createElement('button');
    addRowBtn.type = 'button';
    addRowBtn.className = 'btn-add-sm';
    addRowBtn.textContent = '+ 属性行 (Property Row)';
    addRowBtn.onclick = () => addPropRowUI(group, '', '');
    group.appendChild(addRowBtn);

    return group;
}

function addPropRowUI(groupElement, keyStr, valStr) {
    const rowsContainer = groupElement.querySelector('.editor-rows-container');
    const row = document.createElement('div');
    row.className = 'editor-prop-row';
    row.innerHTML = `
        <input type="text" class="prop-key-input" placeholder="键名 (如: 身高)" value="${keyStr}" style="width: 120px;">
        <input type="text" class="prop-val-input" placeholder="值 (如: 165cm)" value="${valStr}" style="flex:1;">
        <button type="button" class="btn-rm" onclick="this.parentElement.remove()">×</button>
    `;
    rowsContainer.appendChild(row);
}
// 引入全局鉴权脚本控制用户状态（保持与 vup-archive 主页一致）
const scriptAuth = document.createElement('script');
scriptAuth.src = 'js/vup-behavior.js'; // 我们假设 auth 逻辑写在这里或共用框架
document.body.appendChild(scriptAuth);
