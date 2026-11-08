/* =============================================
   STORAGE MODULE — LocalStorage Wrapper
   ============================================= */

const Storage = {
    KEYS: {
        EXPENSES: 'em_expenses',
        THEME: 'em_theme',
    },

    // ---- Expense Data ----

    getExpenses() {
        try {
            const data = localStorage.getItem(this.KEYS.EXPENSES);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading expenses:', e);
            return [];
        }
    },

    saveExpenses(expenses) {
        try {
            localStorage.setItem(this.KEYS.EXPENSES, JSON.stringify(expenses));
            return true;
        } catch (e) {
            console.error('Error saving expenses:', e);
            return false;
        }
    },

    // ---- Theme ----

    getTheme() {
        return localStorage.getItem(this.KEYS.THEME) || 'light';
    },

    saveTheme(theme) {
        localStorage.setItem(this.KEYS.THEME, theme);
    },

    // ---- Export / Import ----

    exportJSON() {
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            expenses: this.getExpenses()
        };
        return JSON.stringify(data, null, 2);
    },

    exportCSV() {
        const expenses = this.getExpenses();
        if (expenses.length === 0) return '';

        const headers = ['Date', 'Category', 'Amount', 'Note'];
        const rows = expenses.map(exp => [
            exp.date,
            exp.category,
            exp.amount,
            `"${(exp.note || '').replace(/"/g, '""')}"`
        ]);

        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    },

    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            let expenses;

            if (data.expenses && Array.isArray(data.expenses)) {
                expenses = data.expenses;
            } else if (Array.isArray(data)) {
                expenses = data;
            } else {
                throw new Error('Invalid format');
            }

            // Validate each expense
            expenses = expenses.filter(exp =>
                exp && typeof exp.amount === 'number' && exp.category && exp.date
            );

            // Merge with existing (avoid duplicates by id)
            const existing = this.getExpenses();
            const existingIds = new Set(existing.map(e => e.id));
            const newExpenses = expenses.filter(e => !existingIds.has(e.id));
            const merged = [...existing, ...newExpenses];

            this.saveExpenses(merged);
            return { total: expenses.length, imported: newExpenses.length };
        } catch (e) {
            console.error('Import error:', e);
            return null;
        }
    },

    // ---- Clear ----

    clearAll() {
        localStorage.removeItem(this.KEYS.EXPENSES);
    }
};
