/**
 * VSTOR 智能搜索引擎 (独立模块)
 */
(function() {
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    
    // 创建联想框
    const suggestionBox = document.createElement('div');
    suggestionBox.className = 'search-suggestions hidden';
    searchForm.style.position = 'relative'; 
    searchForm.appendChild(suggestionBox);

    // 监听输入
    searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        if (query.length < 1) { return suggestionBox.classList.add('hidden'); }

        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        renderSuggestions(data);
    }, 300));

    function renderSuggestions(data) {
        if (!data.papers.length && !data.authors.length && !data.vups.length) {
            return suggestionBox.classList.add('hidden');
        }
        suggestionBox.innerHTML = `
            ${data.papers.map(p => `<div class="s-item" onclick="location.href='paper-view.html?id=${p.id}'">📄 论文：${p.title}</div>`).join('')}
            ${data.authors.map(a => `<div class="s-item" onclick="location.href='author-view.html?name=${encodeURIComponent(a)}'">👤 作者：${a}</div>`).join('')}
            ${data.vups.map(v => `<div class="s-item" onclick="location.href='vup-view.html?name=${encodeURIComponent(v)}'">📺 研究对象：${v}</div>`).join('')}
        `;
        suggestionBox.classList.remove('hidden');
    }

    // --- 核心新增：处理点击“搜索”按钮或按回车 ---
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;

        // 默认逻辑：如果用户直接点搜索，我们跳转到作者页看他的作品
        // 实际开发可以做一个专门的 search-results.html
        window.location.href = `author-view.html?name=${encodeURIComponent(query)}`;
    });

    function debounce(fn, delay) {
        let timer = null;
        return function() {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, arguments), delay);
        }
    }
})();