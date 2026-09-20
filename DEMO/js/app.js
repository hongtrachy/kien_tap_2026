let globalProcessedData = [];

// HÀM CHUYỂN TAB KHI BẤM VÀO SIDEBAR
function switchTab(tabId) {
    document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));

    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) targetView.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
        btn.classList.add('text-slate-400');
    });

    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
        activeBtn.classList.remove('text-slate-400');
    }

    const titleMap = {
        'dashboard': 'Dashboard Tổng Quan Incentive',
        'task1': 'Task 1: Tính Toán Incentive Tự Động',
        'task2': 'Task 2: Hệ Thống Cảnh Báo & Kiểm Duyệt Lỗi',
        'task3': 'Task 3: Phân Tích Thưởng vs Productivity'
    };
    document.getElementById('page-title').innerText = titleMap[tabId] || 'Incentive Analytics';

    if (tabId === 'task3' && globalProcessedData.length > 0) {
        renderAnalyticsChart(globalProcessedData);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadDefaultCSV();

    document.getElementById("csv-file-input").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    handleParsedData(results.data, file.name);
                }
            });
        }
    });

    document.getElementById("filter-dept").addEventListener("change", (e) => {
        const dept = e.target.value;
        const filtered = dept === "ALL" ? globalProcessedData : globalProcessedData.filter(d => d.department === dept);
        renderTable(filtered);
    });

    document.getElementById("btn-reload-data").addEventListener("click", () => {
        loadDefaultCSV();
    });
});

function loadDefaultCSV() {
    document.getElementById("data-status-text").innerText = "Đang đọc dữ liệu từ csv.csv...";
    
    Papa.parse("csv.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            handleParsedData(results.data, "csv.csv");
        },
        error: () => {
            document.getElementById("data-status-text").innerText = "Hãy bấm 'Nạp File CSV Khác' để chọn file CSV trên máy bạn.";
        }
    });
}

function handleParsedData(rawData, fileName) {
    document.getElementById("data-status-text").innerText = `Đã nạp thành công ${rawData.length.toLocaleString()} dòng từ ${fileName}`;
    document.getElementById("sidebar-dataset-info").innerText = `${fileName} (${rawData.length.toLocaleString()} rows)`;

    // Process data through Automation logic
    globalProcessedData = processCSVData(rawData);
    const alerts = generateValidationAlerts(globalProcessedData);

    // Populate Dynamic Filter Options for Department
    populateDeptFilter(globalProcessedData);

    // Render Dynamic Content
    renderKPICards(globalProcessedData);
    renderDashboardSummary(globalProcessedData);
    renderTable(globalProcessedData);
    renderAlerts(alerts);
    renderTask3DynamicInsights(globalProcessedData);
    renderAnalyticsChart(globalProcessedData);
}

function populateDeptFilter(data) {
    const filterSelect = document.getElementById("filter-dept");
    const depts = [...new Set(data.map(d => d.department))].filter(Boolean);
    
    filterSelect.innerHTML = `<option value="ALL">Tất cả Bộ Phận (${depts.length} bộ phận)</option>` + 
        depts.map(d => `<option value="${d}">${d.toUpperCase()}</option>`).join('');
}

function renderKPICards(data) {
    const totalIncentive = data.reduce((sum, d) => sum + d.incentive, 0);
    const avgActual = data.length > 0 ? (data.reduce((sum, d) => sum + d.actual, 0) / data.length * 100).toFixed(1) : 0;
    const achievementCount = data.filter(d => d.actual >= d.target).length;
    const anomalyCount = data.filter(d => d.status !== 'VALID').length;

    const container = document.getElementById("kpi-cards");
    container.innerHTML = `
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p class="text-xs font-semibold text-slate-400 uppercase">TỔNG CHI PHÍ THƯỞNG</p>
            <h3 class="text-2xl font-bold text-slate-900 mt-2">${totalIncentive.toLocaleString()} <span class="text-sm font-normal text-slate-500">Đơn vị</span></h3>
            <p class="text-xs text-slate-500 mt-2">Tính từ ${data.length.toLocaleString()} bản ghi</p>
        </div>
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p class="text-xs font-semibold text-slate-400 uppercase">PRODUCTIVITY TRUNG BÌNH</p>
            <h3 class="text-2xl font-bold text-indigo-600 mt-2">${avgActual}%</h3>
            <p class="text-xs text-emerald-600 font-medium mt-2"><i class="fa-solid fa-check"></i> Toàn bộ nhà máy</p>
        </div>
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p class="text-xs font-semibold text-slate-400 uppercase">TỶ LỆ ĐẠT TARGET</p>
            <h3 class="text-2xl font-bold text-slate-900 mt-2">${data.length > 0 ? ((achievementCount / data.length) * 100).toFixed(1) : 0}%</h3>
            <p class="text-xs text-slate-500 mt-2">${achievementCount.toLocaleString()} / ${data.length.toLocaleString()} ca đạt chỉ tiêu</p>
        </div>
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p class="text-xs font-semibold text-slate-400 uppercase">LỖI DỮ LIỆU CẦN DUYỆT</p>
            <h3 class="text-2xl font-bold text-amber-600 mt-2">${anomalyCount.toLocaleString()} Ca</h3>
            <p class="text-xs text-amber-600 font-medium mt-2">Cần xem xét (Task 2)</p>
        </div>
    `;
}

function renderDashboardSummary(data) {
    const totalRows = data.length;
    const achieved = data.filter(d => d.actual >= d.target).length;
    const totalPayout = data.reduce((sum, d) => sum + d.incentive, 0);
    const anomalies = data.filter(d => d.status !== 'VALID').length;
    const unearned = data.filter(d => d.status === 'UNEARNED_INCENTIVE').length;

    document.getElementById("dash-total-rows").innerText = totalRows.toLocaleString();
    document.getElementById("dash-achieved-count").innerText = `${achieved.toLocaleString()} / ${totalRows.toLocaleString()} ca`;
    document.getElementById("dash-total-payout").innerText = `${totalPayout.toLocaleString()} Đơn vị`;
    document.getElementById("dash-total-anomalies").innerText = `${anomalies.toLocaleString()} ca bất thường`;

    const alertBox = document.getElementById("dash-unearned-alert-box");
    if (unearned > 0) {
        alertBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i> Có <strong>${unearned.toLocaleString()} ca</strong> "Chưa đạt Target vẫn được nhận thưởng" cần thu hồi / kiểm tra lại.`;
        alertBox.className = "p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium";
    } else {
        alertBox.innerHTML = `<i class="fa-solid fa-circle-check mr-1 text-emerald-600"></i> Không có trường hợp chưa đạt target nào bị chi trả thưởng lãng phí.`;
        alertBox.className = "p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium";
    }
}

function renderTable(data) {
    const tbody = document.getElementById("employee-table-body");
    
    // Đã bỏ .slice(0, 100) -> Hiển thị toàn bộ 100% số dòng trong CSV
    tbody.innerHTML = data.map(d => `
        <tr class="hover:bg-slate-50 transition ${d.status === 'UNEARNED_INCENTIVE' ? 'bg-rose-50/50' : d.status === 'EXTREME_INCENTIVE' ? 'bg-amber-50/50' : ''}">
            <td class="p-3 font-mono text-slate-500">${d.date}</td>
            <td class="p-3 font-semibold uppercase text-indigo-600">${d.department}</td>
            <td class="p-3">Team ${d.team}</td>
            <td class="p-3">${(d.target * 100).toFixed(0)}%</td>
            <td class="p-3 font-bold ${(d.actual >= d.target) ? 'text-emerald-600' : 'text-rose-600'}">${(d.actual * 100).toFixed(1)}%</td>
            <td class="p-3 font-bold">${(d.achievementRate * 100).toFixed(1)}%</td>
            <td class="p-3 font-bold text-slate-900">${d.incentive.toLocaleString()}</td>
            <td class="p-3">
                ${d.status === 'VALID' ? '<span class="text-emerald-600 font-medium"><i class="fa-solid fa-circle-check"></i> Hợp lệ</span>' : ''}
                ${d.status === 'UNEARNED_INCENTIVE' ? '<span class="text-rose-600 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Chưa đạt vẫn thưởng</span>' : ''}
                ${d.status === 'EXTREME_INCENTIVE' ? '<span class="text-amber-600 font-bold"><i class="fa-solid fa-bolt"></i> Outlier cao</span>' : ''}
                ${d.status === 'MISSING_WIP' ? '<span class="text-slate-400"><i class="fa-solid fa-minus"></i> Thiếu WIP</span>' : ''}
                ${d.status === 'IDLE_TIME_ALERT' ? '<span class="text-purple-600 font-medium"><i class="fa-solid fa-clock"></i> Idle Time</span>' : ''}
            </td>
        </tr>
    `).join('');
}

function renderAlerts(alerts) {
    const container = document.getElementById("validation-alerts");
    const summaryBox = document.getElementById("anomaly-summary-box");
    
    const totalAlerts = alerts.reduce((s, a) => s + a.count, 0);
    document.getElementById("badge-alert-count").innerText = totalAlerts.toLocaleString();

    container.innerHTML = alerts.map(alert => `
        <div class="p-3 bg-slate-50 rounded-lg border-l-4 ${alert.type === 'DANGER' ? 'border-rose-500' : alert.type === 'WARNING' ? 'border-amber-500' : 'border-blue-500'} flex justify-between items-center">
            <div>
                <p class="font-bold text-slate-800">${alert.title}</p>
                <p class="text-slate-500">${alert.desc}</p>
            </div>
            <button class="px-2.5 py-1 bg-white border text-slate-700 rounded hover:bg-slate-100 font-medium shrink-0">Chi tiết</button>
        </div>
    `).join('');

    summaryBox.innerHTML = alerts.map(a => `
        <div class="flex justify-between items-center p-3 border rounded-lg">
            <span class="font-medium text-slate-700">${a.title}</span>
            <span class="font-bold text-indigo-600">${a.count.toLocaleString()} trường hợp</span>
        </div>
    `).join('');
}

// TÍNH TOÁN ĐỘNG CHO TASK 3
function renderTask3DynamicInsights(data) {
    const tiers = [
        { name: "0 (Không Thưởng)", min: 0, max: 0 },
        { name: "1-30 (Thấp)", min: 1, max: 30 },
        { name: "31-60 (Vừa)", min: 31, max: 60 },
        { name: "61-100 (Cao)", min: 61, max: 100 },
        { name: "100+ (Rất Cao)", min: 101, max: Infinity }
    ];

    const stats = tiers.map(tier => {
        const items = data.filter(d => {
            if (tier.min === 0 && tier.max === 0) return d.incentive === 0;
            return d.incentive >= tier.min && d.incentive <= tier.max;
        });
        const count = items.length;
        const avgActual = count > 0 ? (items.reduce((s, i) => s + i.actual, 0) / count * 100).toFixed(1) : 0;
        const avgTarget = count > 0 ? (items.reduce((s, i) => s + i.target, 0) / count * 100).toFixed(1) : 0;
        const avgBonus = count > 0 ? (items.reduce((s, i) => s + i.incentive, 0) / count).toFixed(0) : 0;
        return { ...tier, count, avgActual, avgTarget, avgBonus };
    });

    const listContainer = document.getElementById("task3-insights-list");
    if (listContainer) {
        listContainer.innerHTML = stats.filter(s => s.count > 0).map(s => `
            <li><strong>Nhóm ${s.name}:</strong> Năng suất đạt <strong>${s.avgActual}%</strong> (Target: ${s.avgTarget}%), Tiền thưởng TB: <strong>${Number(s.avgBonus).toLocaleString()}</strong> (${s.count.toLocaleString()} ca).</li>
        `).join('');
    }

    const recBox = document.getElementById("task3-recommendation");
    if (recBox) {
        const maxTier = stats.reduce((prev, current) => (Number(current.avgBonus) > Number(prev.avgBonus)) ? current : prev, stats[0]);
        recBox.innerHTML = `<strong>Đề xuất cải thiện Scheme:</strong> Dựa trên dữ liệu ${data.length.toLocaleString()} dòng, nhóm <strong>${maxTier.name}</strong> đang tiêu tốn mức thưởng TB cao nhất (<strong>${Number(maxTier.avgBonus).toLocaleString()}</strong>/ca). Cần cân nhắc áp dụng mức Trần (Cap) để tránh phình ngân sách.`;
    }
}