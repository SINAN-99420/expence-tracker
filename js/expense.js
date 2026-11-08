/* =============================================
   EXPENSE MODULE — CRUD & Calculations
   ============================================= */

// Category definitions with icon and color
const CATEGORIES = {
    petrol:        { label: 'Petrol',        icon: '⛽', color: '#FF6384' },
    food:          { label: 'Food',          icon: '🍕', color: '#36A2EB' },
    dress:         { label: 'Dress',         icon: '👕', color: '#FFCE56' },
    medical:       { label: 'Medical',       icon: '🏥', color: '#4BC0C0' },
    entertainment: { label: 'Entertainment', icon: '🎬', color: '#9966FF' },
    recharge:      { label: 'Bills',         icon: '📱', color: '#FF9F40' },
    travel:        { label: 'Travel',        icon: '🚌', color: '#45B7D1' },
    other:         { label: 'Other',         icon: '📦', color: '#7C8CF8' }
};

const CATEGORY_COLORS = Object.fromEntries(
    Object.entries(CATEGORIES).map(([k, v]) => [k, v.color])
);

const ExpenseManager = {

    // Generate a unique ID
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    },

    // ---- CRUD ----

    add(amount, category, date, note) {
        const expenses = Storage.getExpenses();
        const expense = {
            id: this._generateId(),
            amount: parseFloat(amount),
            category: category,
            date: date,
            note: note || '',
            createdAt: new Date().toISOString()
        };
        expenses.push(expense);
        Storage.saveExpenses(expenses);
        return expense;
    },

    update(id, data) {
        const expenses = Storage.getExpenses();
        const index = expenses.findIndex(e => e.id === id);
        if (index === -1) return null;

        expenses[index] = {
            ...expenses[index],
            amount: parseFloat(data.amount),
            category: data.category,
            date: data.date,
            note: data.note || '',
        };
        Storage.saveExpenses(expenses);
        return expenses[index];
    },

    remove(id) {
        const expenses = Storage.getExpenses();
        const filtered = expenses.filter(e => e.id !== id);
        Storage.saveExpenses(filtered);
        return filtered.length < expenses.length;
    },

    // ---- Retrieval ----

    getAll() {
        return Storage.getExpenses().sort((a, b) => {
            // Sort by date desc, then by createdAt desc
            if (b.date !== a.date) return b.date.localeCompare(a.date);
            return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
    },

    getById(id) {
        return Storage.getExpenses().find(e => e.id === id) || null;
    },

    // ---- Filtering ----

    getFiltered(category, monthStr) {
        let expenses = this.getAll();

        if (category && category !== 'all') {
            expenses = expenses.filter(e => e.category === category);
        }

        if (monthStr) {
            // monthStr format: "2026-11"
            expenses = expenses.filter(e => e.date.startsWith(monthStr));
        }

        return expenses;
    },

    // ---- Calculations ----

    _todayStr() {
        return new Date().toISOString().split('T')[0];
    },

    _sumAmounts(expenses) {
        return expenses.reduce((sum, e) => sum + e.amount, 0);
    },

    getTodayTotal() {
        const today = this._todayStr();
        const expenses = Storage.getExpenses().filter(e => e.date === today);
        return this._sumAmounts(expenses);
    },

    getWeekTotal() {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sun
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const expenses = Storage.getExpenses().filter(e => {
            const d = new Date(e.date + 'T00:00:00');
            return d >= startOfWeek && d <= endOfWeek;
        });
        return this._sumAmounts(expenses);
    },

    getMonthTotal(year, month) {
        const y = year || new Date().getFullYear();
        const m = month !== undefined ? month : new Date().getMonth();
        const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;

        const expenses = Storage.getExpenses().filter(e => e.date.startsWith(prefix));
        return this._sumAmounts(expenses);
    },

    getAllTimeTotal() {
        return this._sumAmounts(Storage.getExpenses());
    },

    // ---- Aggregations for Charts ----

    getCategoryTotals(monthStr) {
        let expenses = Storage.getExpenses();
        if (monthStr && monthStr !== 'all') {
            expenses = expenses.filter(e => e.date.startsWith(monthStr));
        }

        const totals = {};
        Object.keys(CATEGORIES).forEach(cat => totals[cat] = 0);
        expenses.forEach(e => {
            if (totals[e.category] !== undefined) {
                totals[e.category] += e.amount;
            }
        });
        return totals;
    },

    getMonthlyTotals(year) {
        const expenses = Storage.getExpenses();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const totals = {};
        months.forEach(m => totals[m] = 0);

        expenses.forEach(e => {
            const d = new Date(e.date + 'T00:00:00');
            if (d.getFullYear() === year) {
                totals[months[d.getMonth()]] += e.amount;
            }
        });
        return totals;
    },

    getDailyTotals(year, month) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

        const totals = {};
        for (let d = 1; d <= daysInMonth; d++) {
            totals[d] = 0;
        }

        const expenses = Storage.getExpenses().filter(e => e.date.startsWith(prefix));
        expenses.forEach(e => {
            const day = parseInt(e.date.split('-')[2], 10);
            totals[day] += e.amount;
        });
        return totals;
    },

    // Get all unique years from expenses
    getYears() {
        const expenses = Storage.getExpenses();
        const years = new Set();
        const currentYear = new Date().getFullYear();
        years.add(currentYear);

        expenses.forEach(e => {
            const y = parseInt(e.date.split('-')[0], 10);
            if (y) years.add(y);
        });
        return Array.from(years).sort((a, b) => b - a);
    },

    // Get all unique months (as "YYYY-MM") from expenses
    getMonths() {
        const expenses = Storage.getExpenses();
        const months = new Set();
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        months.add(currentMonth);

        expenses.forEach(e => {
            const parts = e.date.split('-');
            if (parts.length >= 2) {
                months.add(`${parts[0]}-${parts[1]}`);
            }
        });
        return Array.from(months).sort().reverse();
    }
};
