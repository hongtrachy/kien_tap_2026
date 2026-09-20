let chartInstance = null;

// TASK 3: Gom nhóm dữ liệu CSV thật theo khoảng Thưởng & Vẽ Biểu đồ
function renderAnalyticsChart(processedData) {
    const brackets = [
        { label: '0 (Không Thưởng)', min: -1, max: 0 },
        { label: '1-30 (Thấp)', min: 0.1, max: 30 },
        { label: '31-60 (Vừa)', min: 30.1, max: 60 },
        { label: '61-100 (Cao)', min: 60.1, max: 100 },
        { label: '100+ (Rất Cao)', min: 100.1, max: 9999 }
    ];

    const labels = brackets.map(b => b.label);
    const avgActuals = [];
    const avgTargets = [];

    brackets.forEach(b => {
        const rows = processedData.filter(d => d.incentive >= b.min && d.incentive <= b.max);
        if (rows.length > 0) {
            const sumActual = rows.reduce((s, r) => s + r.actual, 0);
            const sumTarget = rows.reduce((s, r) => s + r.target, 0);
            avgActuals.push((sumActual / rows.length * 100).toFixed(1));
            avgTargets.push((sumTarget / rows.length * 100).toFixed(1));
        } else {
            avgActuals.push(0);
            avgTargets.push(0);
        }
    });

    const ctx = document.getElementById('productivityChart').getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Actual Productivity (%)',
                    data: avgActuals,
                    backgroundColor: 'rgba(79, 70, 229, 0.85)',
                    borderRadius: 6
                },
                {
                    label: 'Targeted Productivity (%)',
                    data: avgTargets,
                    backgroundColor: 'rgba(203, 213, 225, 0.8)',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%`
                    }
                }
            },
            scales: {
                y: {
                    min: 40,
                    max: 100,
                    ticks: { callback: v => v + '%' }
                }
            }
        }
    });
}