/* =============================================
   APP MODULE — Main Controller
   ============================================= */

const App = {
    currentPage: 'dashboard',
    activeChartType: 'pie',
    selectedCategory: null,        // For add form
    editSelectedCategory: null,    // For edit modal
    confirmCallback: null,         // For confirm modal

    // ---- Formatting Helpers ----

    formatAmount(amount) {
        return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    },

    formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return d.toLocaleDateString('en-IN', options);
    },

    formatDateShort(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (dateStr === today.toISOString().split('T')[0]) return 'Today';
        if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';

        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    },

    getMonthLabel(monthStr) {
        if (!monthStr) return '';
        const [y, m] = monthStr.split('-');
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
        return months[parseInt(m, 10) - 1] + ' ' + y;
    },

    // ---- Toast Notification ----

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    },

    // ---- Confirm Dialog ----

    showConfirm(title, message, okLabel, callback) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        document.getElementById('btn-confirm-ok').textContent = okLabel;
        this.confirmCallback = callback;
        document.getElementById('confirm-modal').classList.add('active');
    },

    closeConfirm() {
        document.getElementById('confirm-modal').classList.remove('active');
        this.confirmCallback = null;
    },

    // ---- Navigation ----

    navigate(page) {
        this.currentPage = page;

        // Update pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById('page-' + page);
        if (pageEl) pageEl.classList.add('active');

        // Update nav
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (navItem) navItem.classList.add('active');

        // Refresh page content
        switch (page) {
            case 'dashboard': this.refreshDashboard(); break;
            case 'add':       this.initAddForm(); break;
            case 'list':      this.refreshList(); break;
            case 'charts':    this.refreshCharts(); break;
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // ===== DASHBOARD =====

    refreshDashboard() {
        const now = new Date();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'];

        // Month label
        document.getElementById('current-month-label').textContent =
            monthNames[now.getMonth()] + ' ' + now.getFullYear();

        // Stats
        document.getElementById('total-month').textContent =
            this.formatAmount(ExpenseManager.getMonthTotal());
        document.getElementById('total-today').textContent =
            this.formatAmount(ExpenseManager.getTodayTotal());
        document.getElementById('total-week').textContent =
            this.formatAmount(ExpenseManager.getWeekTotal());
        document.getElementById('total-all').textContent =
            this.formatAmount(ExpenseManager.getAllTimeTotal());

        // Recent expenses (last 5)
        const recent = ExpenseManager.getAll().slice(0, 5);
        const listEl = document.getElementById('recent-list');

        if (recent.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📝</span>
                    <p>No expenses yet!</p>
                    <p class="empty-sub">Tap + to add your first expense</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = recent.map(exp => this._renderExpenseItem(exp, false)).join('');
    },

    // ===== ADD EXPENSE =====

    initAddForm() {
        this.selectedCategory = null;
        document.getElementById('expense-amount').value = '';
        document.getElementById('expense-note').value = '';
        document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];

        this._renderCategoryGrid('category-grid', null);
    },

    _renderCategoryGrid(containerId, selectedCat) {
        const container = document.getElementById(containerId);
        container.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => `
            <button type="button" class="category-btn ${selectedCat === key ? 'selected' : ''}"
                    data-category="${key}">
                <span class="cat-icon">${cat.icon}</span>
                <span class="cat-label">${cat.label}</span>
            </button>
        `).join('');
    },

    saveExpense() {
        const amount = document.getElementById('expense-amount').value;
        const date = document.getElementById('expense-date').value;
        const note = document.getElementById('expense-note').value;
        const category = this.selectedCategory;

        // Validation
        if (!amount || parseFloat(amount) <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            document.getElementById('expense-amount').focus();
            return;
        }
        if (!category) {
            this.showToast('Please select a category', 'error');
            return;
        }
        if (!date) {
            this.showToast('Please select a date', 'error');
            return;
        }

        ExpenseManager.add(parseFloat(amount), category, date, note);
        this.showToast('✅ Expense saved!');
        this.initAddForm();

        // Navigate to dashboard after short delay
        setTimeout(() => this.navigate('dashboard'), 500);
    },

    // ===== EXPENSE LIST =====

    initListFilters() {
        // Populate category filter
        const catFilter = document.getElementById('filter-category');
        catFilter.innerHTML = '<option value="all">All Categories</option>' +
            Object.entries(CATEGORIES).map(([key, cat]) =>
                `<option value="${key}">${cat.icon} ${cat.label}</option>`
            ).join('');

        // Set month filter to current month
        const now = new Date();
        const monthInput = document.getElementById('filter-month');
        monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },

    refreshList() {
        const category = document.getElementById('filter-category').value;
        const month = document.getElementById('filter-month').value;

        const expenses = ExpenseManager.getFiltered(category, month);

        // Count & total
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        document.getElementById('expenses-count').textContent =
            `${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`;
        document.getElementById('expenses-filtered-total').textContent =
            `Total: ${this.formatAmount(total)}`;

        // Render list
        const container = document.getElementById('expense-list-container');
        if (expenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📋</span>
                    <p>No expenses found</p>
                    <p class="empty-sub">Try changing the filters</p>
                </div>
            `;
            return;
        }

        container.innerHTML = expenses.map(exp => this._renderExpenseItem(exp, true)).join('');
    },

    _renderExpenseItem(exp, showActions) {
        const cat = CATEGORIES[exp.category] || CATEGORIES.other;
        const actionsHtml = showActions ? `
            <div class="expense-actions">
                <button class="action-btn edit-btn" data-id="${exp.id}" title="Edit">✏️ Edit</button>
                <button class="action-btn delete-btn" data-id="${exp.id}" title="Delete">🗑️</button>
            </div>
        ` : '';

        return `
            <div class="expense-item" data-id="${exp.id}">
                <div class="expense-cat-icon" style="background:${cat.color}20;">
                    ${cat.icon}
                </div>
                <div class="expense-details">
                    <p class="expense-category">${cat.label}</p>
                    ${exp.note ? `<p class="expense-note">${this._escapeHtml(exp.note)}</p>` : ''}
                    <p class="expense-date-text">${this.formatDateShort(exp.date)}</p>
                </div>
                <div class="expense-right">
                    <p class="expense-amount">-${this.formatAmount(exp.amount)}</p>
                    ${actionsHtml}
                </div>
            </div>
        `;
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ===== EDIT MODAL =====

    openEditModal(id) {
        const expense = ExpenseManager.getById(id);
        if (!expense) return;

        document.getElementById('edit-id').value = expense.id;
        document.getElementById('edit-amount').value = expense.amount;
        document.getElementById('edit-date').value = expense.date;
        document.getElementById('edit-note').value = expense.note || '';

        this.editSelectedCategory = expense.category;
        this._renderCategoryGrid('edit-category-grid', expense.category);

        document.getElementById('edit-modal').classList.add('active');
    },

    closeEditModal() {
        document.getElementById('edit-modal').classList.remove('active');
        this.editSelectedCategory = null;
    },

    updateExpense() {
        const id = document.getElementById('edit-id').value;
        const amount = document.getElementById('edit-amount').value;
        const date = document.getElementById('edit-date').value;
        const note = document.getElementById('edit-note').value;
        const category = this.editSelectedCategory;

        if (!amount || parseFloat(amount) <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return;
        }
        if (!category) {
            this.showToast('Please select a category', 'error');
            return;
        }

        ExpenseManager.update(id, {
            amount: parseFloat(amount),
            category: category,
            date: date,
            note: note
        });

        this.closeEditModal();
        this.showToast('✅ Expense updated!');
        this.refreshList();
    },

    deleteExpense(id) {
        const expense = ExpenseManager.getById(id);
        if (!expense) return;

        const cat = CATEGORIES[expense.category] || CATEGORIES.other;
        this.showConfirm(
            'Delete Expense?',
            `Are you sure you want to delete ${cat.icon} ${cat.label} — ${this.formatAmount(expense.amount)}?`,
            '🗑️ Delete',
            () => {
                ExpenseManager.remove(id);
                this.showToast('Expense deleted', 'info');
                this.refreshList();
                this.closeConfirm();
            }
        );
    },

    // ===== CHARTS =====

    initChartFilters() {
        // Month selector
        const monthSelect = document.getElementById('chart-month-select');
        const months = ExpenseManager.getMonths();
        monthSelect.innerHTML = '<option value="all">All Time</option>' +
            months.map(m => `<option value="${m}">${this.getMonthLabel(m)}</option>`).join('');

        // Set current month as default
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        monthSelect.value = currentMonth;

        // Year selector
        const yearSelect = document.getElementById('chart-year-select');
        const years = ExpenseManager.getYears();
        yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    },

    refreshCharts() {
        ChartManager.init();
        this.initChartFilters();
        this._updateChartVisibility();
        this._renderActiveChart();
    },

    _updateChartVisibility() {
        const monthSelect = document.getElementById('chart-month-select');
        const yearSelect = document.getElementById('chart-year-select');

        // Show/hide filters based on chart type
        if (this.activeChartType === 'bar') {
            monthSelect.style.display = 'none';
            yearSelect.style.display = '';
        } else {
            monthSelect.style.display = '';
            yearSelect.style.display = 'none';
        }
    },

    _renderActiveChart() {
        const canvas = document.getElementById('chart-canvas');
        const emptyEl = document.getElementById('chart-empty');
        const summaryEl = document.getElementById('chart-summary');
        let hasData = false;

        switch (this.activeChartType) {
            case 'pie': {
                const month = document.getElementById('chart-month-select').value;
                const totals = ExpenseManager.getCategoryTotals(month);
                hasData = ChartManager.renderPie(totals);
                this._renderPieSummary(totals, summaryEl);
                break;
            }
            case 'bar': {
                const year = parseInt(document.getElementById('chart-year-select').value, 10);
                const totals = ExpenseManager.getMonthlyTotals(year);
                hasData = ChartManager.renderBar(totals);
                this._renderBarSummary(totals, summaryEl, year);
                break;
            }
            case 'line': {
                const monthStr = document.getElementById('chart-month-select').value;
                if (monthStr && monthStr !== 'all') {
                    const [y, m] = monthStr.split('-').map(Number);
                    const totals = ExpenseManager.getDailyTotals(y, m - 1);
                    hasData = ChartManager.renderLine(totals);
                    this._renderLineSummary(totals, summaryEl, monthStr);
                } else {
                    // For "All Time" in line chart, show current month
                    const now = new Date();
                    const totals = ExpenseManager.getDailyTotals(now.getFullYear(), now.getMonth());
                    hasData = ChartManager.renderLine(totals);
                    const cm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    this._renderLineSummary(totals, summaryEl, cm);
                }
                break;
            }
        }

        canvas.style.display = hasData ? '' : 'none';
        emptyEl.style.display = hasData ? 'none' : '';
        if (!hasData) summaryEl.innerHTML = '';
    },

    _renderPieSummary(totals, el) {
        const entries = Object.entries(totals).filter(([_, v]) => v > 0);
        if (entries.length === 0) { el.innerHTML = ''; return; }

        const sorted = entries.sort((a, b) => b[1] - a[1]);
        const total = sorted.reduce((s, [_, v]) => s + v, 0);
        const [topCat, topVal] = sorted[0];
        const topInfo = CATEGORIES[topCat];

        let html = `
            <div class="summary-highlight danger">
                <p class="highlight-label">Highest Spending Category</p>
                <p class="highlight-value">${topInfo.icon} ${topInfo.label} — ${this.formatAmount(topVal)}</p>
            </div>
        `;

        html += sorted.map(([cat, val]) => {
            const info = CATEGORIES[cat];
            const pct = ((val / total) * 100).toFixed(1);
            return `
                <div class="summary-item">
                    <span class="label">${info.icon} ${info.label}</span>
                    <span class="value">${this.formatAmount(val)} (${pct}%)</span>
                </div>
            `;
        }).join('');

        el.innerHTML = html;
    },

    _renderBarSummary(totals, el, year) {
        const entries = Object.entries(totals).filter(([_, v]) => v > 0);
        if (entries.length === 0) { el.innerHTML = ''; return; }

        const sorted = entries.sort((a, b) => b[1] - a[1]);
        const total = sorted.reduce((s, [_, v]) => s + v, 0);
        const [highMonth, highVal] = sorted[0];
        const [lowMonth, lowVal] = sorted[sorted.length - 1];

        el.innerHTML = `
            <div class="summary-highlight danger">
                <p class="highlight-label">🔴 Highest Spending Month (${year})</p>
                <p class="highlight-value">${highMonth} — ${this.formatAmount(highVal)}</p>
            </div>
            <div class="summary-highlight">
                <p class="highlight-label">🟢 Lowest Spending Month</p>
                <p class="highlight-value">${lowMonth} — ${this.formatAmount(lowVal)}</p>
            </div>
            <div class="summary-item">
                <span class="label">Year Total (${year})</span>
                <span class="value">${this.formatAmount(total)}</span>
            </div>
            <div class="summary-item">
                <span class="label">Monthly Average</span>
                <span class="value">${this.formatAmount(total / 12)}</span>
            </div>
        `;
    },

    _renderLineSummary(totals, el, monthStr) {
        const entries = Object.entries(totals).filter(([_, v]) => v > 0);
        if (entries.length === 0) { el.innerHTML = ''; return; }

        const sorted = entries.sort((a, b) => b[1] - a[1]);
        const total = sorted.reduce((s, [_, v]) => s + v, 0);
        const [highDay, highVal] = sorted[0];
        const daysInMonth = Object.keys(totals).length;

        el.innerHTML = `
            <div class="summary-highlight danger">
                <p class="highlight-label">Highest Spending Day</p>
                <p class="highlight-value">Day ${highDay} — ${this.formatAmount(highVal)}</p>
            </div>
            <div class="summary-item">
                <span class="label">Month Total</span>
                <span class="value">${this.formatAmount(total)}</span>
            </div>
            <div class="summary-item">
                <span class="label">Daily Average</span>
                <span class="value">${this.formatAmount(total / daysInMonth)}</span>
            </div>
            <div class="summary-item">
                <span class="label">Days with Expenses</span>
                <span class="value">${entries.length} / ${daysInMonth}</span>
            </div>
        `;
    },

    // ===== THEME =====

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        Storage.saveTheme(theme);

        const icon = document.querySelector('.theme-icon');
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';

        const settingsToggle = document.getElementById('settings-theme-toggle');
        if (settingsToggle) settingsToggle.checked = (theme === 'dark');
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        this.applyTheme(next);
    },

    // ===== EXPORT / IMPORT =====

    exportJSON() {
        const json = Storage.exportJSON();
        this._downloadFile(json, 'expense-manager-backup.json', 'application/json');
        this.showToast('📤 Data exported (JSON)');
    },

    exportCSV() {
        const csv = Storage.exportCSV();
        if (!csv) {
            this.showToast('No data to export', 'error');
            return;
        }
        this._downloadFile(csv, 'expense-manager-data.csv', 'text/csv');
        this.showToast('📤 Data exported (CSV)');
    },

    _downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = Storage.importJSON(e.target.result);
            if (result) {
                this.showToast(`📥 Imported ${result.imported} new expenses (${result.total} total in file)`);
                this.navigate(this.currentPage);
            } else {
                this.showToast('❌ Invalid file format', 'error');
            }
        };
        reader.readAsText(file);
    },

    clearAllData() {
        this.showConfirm(
            '⚠️ Clear All Data?',
            'This will permanently delete ALL your expenses. This cannot be undone! Consider exporting your data first.',
            '🗑️ Clear Everything',
            () => {
                Storage.clearAll();
                this.showToast('All data cleared', 'info');
                this.closeConfirm();
                this.navigate('dashboard');
            }
        );
    },

    // ===== EVENT LISTENERS =====

    setupEventListeners() {
        // --- Navigation ---
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                if (page) this.navigate(page);
            });
        });

        // "View All" link on dashboard
        document.querySelectorAll('[data-navigate]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.navigate(btn.dataset.navigate);
            });
        });

        // --- Theme ---
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        document.getElementById('settings-theme-toggle').addEventListener('change', () => {
            this.toggleTheme();
        });

        // --- Add Expense ---
        // Category grid (Add page)
        document.getElementById('category-grid').addEventListener('click', (e) => {
            const btn = e.target.closest('.category-btn');
            if (!btn) return;
            this.selectedCategory = btn.dataset.category;
            document.querySelectorAll('#category-grid .category-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });

        // Save button
        document.getElementById('btn-save-expense').addEventListener('click', () => {
            this.saveExpense();
        });

        // --- Expense List ---
        // Filters
        document.getElementById('filter-category').addEventListener('change', () => this.refreshList());
        document.getElementById('filter-month').addEventListener('change', () => this.refreshList());

        // Edit & Delete (delegated)
        document.getElementById('expense-list-container').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');

            if (editBtn) this.openEditModal(editBtn.dataset.id);
            if (deleteBtn) this.deleteExpense(deleteBtn.dataset.id);
        });

        // --- Edit Modal ---
        // Category grid (Edit modal)
        document.getElementById('edit-category-grid').addEventListener('click', (e) => {
            const btn = e.target.closest('.category-btn');
            if (!btn) return;
            this.editSelectedCategory = btn.dataset.category;
            document.querySelectorAll('#edit-category-grid .category-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });

        document.getElementById('btn-update-expense').addEventListener('click', () => {
            this.updateExpense();
        });

        document.getElementById('btn-close-modal').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.querySelector('#edit-modal .modal-overlay').addEventListener('click', () => {
            this.closeEditModal();
        });

        // --- Confirm Modal ---
        document.getElementById('btn-confirm-ok').addEventListener('click', () => {
            if (this.confirmCallback) this.confirmCallback();
        });

        document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
            this.closeConfirm();
        });

        document.querySelector('#confirm-modal .modal-overlay').addEventListener('click', () => {
            this.closeConfirm();
        });

        // --- Charts ---
        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeChartType = tab.dataset.chart;
                this._updateChartVisibility();
                this._renderActiveChart();
            });
        });

        document.getElementById('chart-month-select').addEventListener('change', () => {
            this._renderActiveChart();
        });

        document.getElementById('chart-year-select').addEventListener('change', () => {
            this._renderActiveChart();
        });

        // --- Settings ---
        document.getElementById('btn-export').addEventListener('click', () => this.exportJSON());
        document.getElementById('btn-export-csv').addEventListener('click', () => this.exportCSV());
        document.getElementById('file-import').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
            e.target.value = ''; // Reset input
        });
        document.getElementById('btn-clear').addEventListener('click', () => this.clearAllData());

        // --- Keyboard: Enter to save ---
        document.getElementById('expense-amount').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.saveExpense();
        });
        document.getElementById('expense-note').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.saveExpense();
        });
    },

    // ===== INITIALIZATION =====

    init() {
        // Apply saved theme
        const savedTheme = Storage.getTheme();
        this.applyTheme(savedTheme);

        // Setup event listeners
        this.setupEventListeners();

        // Initialize pages
        this.initListFilters();

        // Show dashboard
        this.navigate('dashboard');

        console.log('💰 Expense Manager initialized!');
    }
};

// ---- Start App ----
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
