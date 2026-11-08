/* =============================================
   CHARTS MODULE — Chart.js Wrapper
   ============================================= */

const ChartManager = {
    chart: null,
    ctx: null,

    init() {
        const canvas = document.getElementById('chart-canvas');
        if (canvas) {
            this.ctx = canvas.getContext('2d');
        }
    },

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    },

    _getThemeColors() {
        const style = getComputedStyle(document.documentElement);
        return {
            text: style.getPropertyValue('--text').trim() || '#1a1a2e',
            textSecondary: style.getPropertyValue('--text-secondary').trim() || '#636e72',
            border: style.getPropertyValue('--border').trim() || '#e8e8e8',
            cardBg: style.getPropertyValue('--card-bg').trim() || '#ffffff',
        };
    },

    // ---- Pie / Doughnut Chart (Category Breakdown) ----

    renderPie(categoryTotals) {
        this.destroy();
        const colors = this._getThemeColors();

        const labels = [];
        const data = [];
        const bgColors = [];

        for (const [cat, total] of Object.entries(categoryTotals)) {
            if (total > 0 && CATEGORIES[cat]) {
                labels.push(CATEGORIES[cat].icon + ' ' + CATEGORIES[cat].label);
                data.push(total);
                bgColors.push(CATEGORIES[cat].color);
            }
        }

        if (data.length === 0) return false;

        this.chart = new Chart(this.ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: bgColors,
                    borderWidth: 3,
                    borderColor: colors.cardBg,
                    hoverBorderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '55%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 16,
                            usePointStyle: true,
                            pointStyleWidth: 12,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12,
                                weight: '500'
                            },
                            color: colors.text
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { family: "'Inter', sans-serif", size: 13 },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((context.parsed / total) * 100).toFixed(1);
                                return ` ₹${context.parsed.toLocaleString('en-IN')} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
        return true;
    },

    // ---- Bar Chart (Monthly Comparison) ----

    renderBar(monthlyTotals) {
        this.destroy();
        const colors = this._getThemeColors();

        const labels = Object.keys(monthlyTotals);
        const data = Object.values(monthlyTotals);

        if (data.every(v => v === 0)) return false;

        const maxVal = Math.max(...data);
        const bgColors = data.map(v =>
            v === maxVal && v > 0 ? '#FF6384' : 'rgba(102, 126, 234, 0.8)'
        );

        this.chart = new Chart(this.ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Expense',
                    data: data,
                    backgroundColor: bgColors,
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { family: "'Inter', sans-serif", size: 13 },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return ' ₹' + context.parsed.y.toLocaleString('en-IN');
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (v) => '₹' + v.toLocaleString('en-IN'),
                            color: colors.textSecondary,
                            font: { family: "'Inter', sans-serif", size: 11 }
                        },
                        grid: { color: colors.border + '40' }
                    },
                    x: {
                        ticks: {
                            color: colors.textSecondary,
                            font: { family: "'Inter', sans-serif", size: 11 }
                        },
                        grid: { display: false }
                    }
                }
            }
        });
        return true;
    },

    // ---- Line Chart (Daily Trend) ----

    renderLine(dailyTotals) {
        this.destroy();
        const colors = this._getThemeColors();

        const labels = Object.keys(dailyTotals);
        const data = Object.values(dailyTotals);

        if (data.every(v => v === 0)) return false;

        this.chart = new Chart(this.ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Expense',
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.08)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    borderWidth: 2.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { family: "'Inter', sans-serif", size: 13 },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            title: function(items) {
                                return 'Day ' + items[0].label;
                            },
                            label: function(context) {
                                return ' ₹' + context.parsed.y.toLocaleString('en-IN');
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (v) => '₹' + v.toLocaleString('en-IN'),
                            color: colors.textSecondary,
                            font: { family: "'Inter', sans-serif", size: 11 }
                        },
                        grid: { color: colors.border + '40' }
                    },
                    x: {
                        ticks: {
                            color: colors.textSecondary,
                            font: { family: "'Inter', sans-serif", size: 11 },
                            maxTicksLimit: 15
                        },
                        grid: { display: false }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
        return true;
    }
};
