/**
 * APPLICATION CONTROLLER - HỆ THỐNG QUẢN LÝ VÀ ĐỀ XUẤT THƯỞNG THÔNG MINH
 * Quản lý trạng thái, phân quyền người dùng, điều hướng menu ngang, tính toán và trực quan hóa
 */

(function () {
  'use strict';

  // Thông báo Toast không chặn luồng
  function showToast(message, type = 'success') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-slate-900 text-white text-xs rounded shadow-xl border border-slate-700 flex items-center gap-2 transition-all duration-200 pointer-events-none opacity-0 translate-y-2';
      document.body.appendChild(toast);
    }
    const icon = type === 'warning' ? 'fa-triangle-exclamation text-amber-400' : 'fa-circle-check text-teal-400';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
    }, 3200);
  }

  // Quản lý trạng thái ứng dụng
  const state = {
    currentUser: null,
    activeTab: 'overview',
    employees: [],
    selectedPeriod: 'Q3_2026',
    asOfWorkday: 15,
    filterDept: 'ALL',
    searchQuery: '',
    selectedRecEmpId: 'EMP-002', // Mặc định mở Bình
    recStep: 2,
    recWhatIfRate: null,
    privacyMasked: false,
    densityCompact: false,
    overviewChartMode: 'line', // 'line' | 'bar'
    overviewChartInstance: null,
    bulkApprovalTimer: null,
    bulkApprovalSecondsLeft: 300,
    optimizations: [
      { id: 1, title: 'Hiệu chỉnh hệ số độ khó 0.9 vùng Đông Nam Bộ', status: 'PENDING', impact: 6300000 },
      { id: 2, title: 'Giảm độ dốc vùng dồn ứ (95% - 99%)', status: 'PENDING', impact: -12500000 },
      { id: 3, title: 'Gán trọng số riêng cho dự án dài hạn B2B', status: 'PENDING', impact: 0 }
    ]
  };

  // Khởi tạo
  document.addEventListener('DOMContentLoaded', async () => {
    state.currentUser = AppAuth.getCurrentUser();
    state.employees = BenchmarkDataset.generateBenchmarkDataset();
    
    // Nạp ML predictions ngầm
    if (window.SmartRecommendationEngine) {
      await SmartRecommendationEngine.loadMLPredictions();
    }

    renderUserHeader();
    renderHorizontalNav();

    // Mặc định chọn tab dựa trên vai trò
    if (state.currentUser.role === 'employee') {
      switchTab('my-slip');
    } else {
      switchTab('overview');
    }

    setupHashRouting();
  });

  // Cập nhật thông tin Header
  function renderUserHeader() {
    const u = state.currentUser;
    const nameElem = document.getElementById('user-name-display');
    const roleElem = document.getElementById('user-role-display');
    const avatarElem = document.getElementById('user-avatar-badge');
    const selectElem = document.getElementById('select-role-quick');

    if (nameElem) nameElem.textContent = u.name;
    if (roleElem) roleElem.textContent = u.roleName;
    if (avatarElem) avatarElem.textContent = u.avatar || 'U';
    if (selectElem) selectElem.value = u.role;

    // Ẩn/Hiện thẻ Automation theo quyền (chỉ Quản lý và Admin thấy)
    const autoCard = document.getElementById('automation-summary-card');
    if (autoCard) {
      if (u.role === 'employee') {
        autoCard.classList.add('hidden');
      } else {
        autoCard.classList.remove('hidden');
      }
    }
  }

  // Render thanh điều hướng ngang theo luồng nghiệp vụ
  function renderHorizontalNav() {
    const nav = document.getElementById('horizontal-nav-bar');
    if (!nav) return;
    const role = state.currentUser.role;

    let items = [];
    if (role === 'employee') {
      items = [
        { id: 'my-overview', label: 'Tổng quan của tôi', icon: 'fa-gauge' },
        { id: 'my-profile', label: 'Hồ sơ của tôi', icon: 'fa-id-badge' },
        { id: 'my-performance', label: 'Hiệu suất của tôi', icon: 'fa-chart-simple' },
        { id: 'my-slip', label: 'Thưởng của tôi', icon: 'fa-receipt' }
      ];
    } else if (role === 'manager') {
      items = [
        { id: 'overview', label: 'Tổng quan', icon: 'fa-gauge' },
        { id: 'employees', label: 'Danh mục nhân viên', icon: 'fa-users' },
        { id: 'employee-info', label: 'Thông tin nhân viên', icon: 'fa-address-card' },
        { id: 'performance', label: 'Hiệu suất làm việc', icon: 'fa-chart-line' },
        { id: 'recommendation', label: 'Đề xuất mức thưởng', icon: 'fa-wand-magic-sparkles' },
        { id: 'validation', label: 'Kiểm tra dữ liệu', icon: 'fa-shield-halved' }
      ];
    } else {
      // Admin
      items = [
        { id: 'overview', label: 'Tổng quan', icon: 'fa-gauge' },
        { id: 'employees', label: 'Danh mục nhân viên', icon: 'fa-users' },
        { id: 'employee-info', label: 'Thông tin nhân viên', icon: 'fa-address-card' },
        { id: 'performance', label: 'Hiệu suất làm việc', icon: 'fa-chart-line' },
        { id: 'recommendation', label: 'Đề xuất mức thưởng', icon: 'fa-wand-magic-sparkles' },
        { id: 'validation', label: 'Kiểm tra dữ liệu', icon: 'fa-shield-halved' },
        { id: 'payroll', label: 'Tính thưởng và chi trả', icon: 'fa-file-invoice-dollar' }
      ];
    }

    nav.innerHTML = items.map(it => {
      const active = (state.activeTab === it.id || (state.activeTab === 'slip' && it.id === 'my-slip'));
      const activeClasses = active
        ? 'border-b-2 border-teal-400 text-teal-300 font-semibold bg-slate-800/60'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-b-2 border-transparent';
      return `
        <button onclick="switchTab('${it.id}')" class="px-3.5 py-2.5 flex items-center gap-2 transition whitespace-nowrap ${activeClasses}">
          <i class="fa-solid ${it.icon} text-xs"></i>
          <span>${it.label}</span>
        </button>
      `;
    }).join('');
  }

  // Chuyển tab có kiểm tra thẩm quyền
  window.switchTab = function (tabId) {
    if (!AppAuth.checkRoutePermission(tabId, state.currentUser)) {
      showToast('Bạn không có quyền truy cập màn hình này.', 'warning');
      return;
    }

    state.activeTab = tabId;
    window.location.hash = tabId;

    // Ẩn toàn bộ views
    document.querySelectorAll('.view-panel').forEach(el => el.classList.add('hidden'));

    // Hiển thị view tương ứng
    let targetViewId = 'view-' + tabId;
    if (tabId === 'my-slip') targetViewId = 'view-slip';
    if (tabId === 'my-overview') targetViewId = 'view-overview';
    if (tabId === 'my-performance') targetViewId = 'view-overview';
    if (tabId === 'employee-info' || tabId === 'performance') targetViewId = 'view-employees';

    const targetEl = document.getElementById(targetViewId);
    if (targetEl) {
      targetEl.classList.remove('hidden');
    }

    renderHorizontalNav();

    // Trigger render theo tab
    if (targetViewId === 'view-overview') renderOverview();
    if (targetViewId === 'view-recommendation') renderRecommendationView();
    if (targetViewId === 'view-slip') renderSlipView();
    if (targetViewId === 'view-employees') renderEmployeesTable();
    if (targetViewId === 'view-validation') renderValidationQueue();
    if (targetViewId === 'view-payroll') renderPayrollView();
  };

  // Chuyển vai trò nhanh
  window.handleRoleSwitch = function (roleKey) {
    state.currentUser = AppAuth.switchRoleQuick(roleKey);
    renderUserHeader();
    renderHorizontalNav();

    if (state.currentUser.role === 'employee') {
      switchTab('my-slip');
    } else {
      switchTab('overview');
    }
    showToast(`Đã chuyển sang vai trò: ${state.currentUser.roleName}`);
  };

  // =========================================================================
  // LOGIC TAB 1: TỔNG QUAN (OVERVIEW)
  // =========================================================================
  function renderOverview() {
    const visibleEmployees = AppAuth.filterEmployeesByPermission(state.employees, state.currentUser);
    
    // Lọc theo phòng ban nếu có
    const filtered = state.filterDept === 'ALL'
      ? visibleEmployees
      : visibleEmployees.filter(e => e.department === state.filterDept);

    // Tính toán các chỉ số kinh doanh
    const metrics = IncentiveEngine.calculateBusinessMetrics({
      employees: filtered,
      budget: 1750000000,
      workdaysElapsed: state.asOfWorkday,
      totalWorkdays: 22
    });

    // Cập nhật 4 chỉ số phẳng
    const wRateEl = document.getElementById('metric-weighted-rate');
    const rawRateEl = document.getElementById('metric-raw-rate');
    const velBadge = document.getElementById('metric-velocity-badge');
    if (wRateEl) wRateEl.textContent = IncentiveEngine.formatPercent(metrics.avgWeightedRate, 1);
    if (rawRateEl) rawRateEl.textContent = IncentiveEngine.formatPercent(metrics.avgWeightedRate * 0.98, 1);
    if (velBadge) {
      velBadge.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> Tốc độ: ${metrics.velocity}x`;
    }

    const interimEl = document.getElementById('metric-interim-amount');
    const projEl = document.getElementById('metric-projected-amount');
    if (interimEl) interimEl.textContent = IncentiveEngine.formatVND(metrics.totalIncentive);
    if (projEl) projEl.textContent = IncentiveEngine.formatVND(Math.round(metrics.totalIncentive * (1 + (1 - metrics.progressVsTime) * 0.1)));

    const budUsageEl = document.getElementById('metric-budget-usage');
    if (budUsageEl) budUsageEl.textContent = IncentiveEngine.formatPercent(metrics.budgetUsageRate, 1);

    const timeProgEl = document.getElementById('metric-time-progress');
    const incRevRatioEl = document.getElementById('metric-incentive-revenue-ratio');
    if (timeProgEl) timeProgEl.textContent = IncentiveEngine.formatPercent(metrics.progressVsTime, 1);
    if (incRevRatioEl) incRevRatioEl.textContent = IncentiveEngine.formatPercent(metrics.incentiveToRevenue, 1);

    // Render biểu đồ xu hướng hoặc so sánh
    renderOverviewChart();

    // Render bảng 4 nhân vật neo
    renderAnchorPersonasTable();
  }

  function renderOverviewChart() {
    const ctx = document.getElementById('overviewTrendsChart');
    if (!ctx) return;

    if (state.overviewChartInstance) {
      state.overviewChartInstance.destroy();
    }

    const subTitle = document.getElementById('chart-sub-title');

    if (state.overviewChartMode === 'line') {
      if (subTitle) subTitle.textContent = 'Đường xu hướng qua 5 kỳ liên tiếp & Đường tham chiếu các mốc thưởng chuẩn';
      
      state.overviewChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Q3/2025', 'Q4/2025', 'Q1/2026', 'Q2/2026', 'Q3/2026 (Hiện tại)'],
          datasets: [
            {
              label: 'Tỷ lệ đạt chỉ tiêu trung bình (%)',
              data: [92.4, 96.8, 98.2, 95.5, 98.5],
              borderColor: '#0E5A55',
              backgroundColor: 'rgba(14, 90, 85, 0.1)',
              borderWidth: 2.5,
              fill: true,
              tension: 0.25,
              pointRadius: 5,
              pointBackgroundColor: '#0E5A55'
            },
            {
              label: 'Mục tiêu chuẩn (100%)',
              data: [100, 100, 100, 100, 100],
              borderColor: '#94a3b8',
              borderWidth: 1.5,
              borderDash: [5, 5],
              fill: false,
              pointRadius: 0
            },
            {
              label: 'Ngưỡng sàn thưởng (70%)',
              data: [70, 70, 70, 70, 70],
              borderColor: '#f59e0b',
              borderWidth: 1.5,
              borderDash: [3, 3],
              fill: false,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`
              }
            }
          },
          scales: {
            y: { min: 50, max: 130, ticks: { callback: v => v + '%' } }
          }
        }
      });
    } else {
      if (subTitle) subTitle.textContent = 'So sánh tỷ lệ đạt chỉ tiêu có trọng số giữa 4 khối kinh doanh tại kỳ hiện tại';
      
      state.overviewChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Kinh doanh Miền Bắc', 'Kinh doanh Miền Nam', 'Khách hàng Doanh nghiệp (B2B)', 'Vận hành Bán lẻ'],
          datasets: [{
            label: 'Tỷ lệ hoàn thành trung bình (%)',
            data: [102.5, 94.2, 99.8, 97.4],
            backgroundColor: ['#0E5A55', '#14b8a6', '#0284c7', '#6366f1'],
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => `Tỷ lệ đạt: ${ctx.raw}%` } }
          },
          scales: {
            x: { min: 70, max: 120, ticks: { callback: v => v + '%' } }
          }
        }
      });
    }
  }

  window.setOverviewChartMode = function (mode) {
    state.overviewChartMode = mode;
    const btnLine = document.getElementById('btn-chart-mode-line');
    const btnBar = document.getElementById('btn-chart-mode-bar');

    if (mode === 'line') {
      btnLine.className = 'px-2.5 py-1 rounded bg-white font-semibold text-slate-800 shadow-sm transition';
      btnBar.className = 'px-2.5 py-1 rounded text-slate-500 font-medium hover:text-slate-800 transition';
    } else {
      btnBar.className = 'px-2.5 py-1 rounded bg-white font-semibold text-slate-800 shadow-sm transition';
      btnLine.className = 'px-2.5 py-1 rounded text-slate-500 font-medium hover:text-slate-800 transition';
    }
    renderOverviewChart();
  };

  function renderAnchorPersonasTable() {
    const tbody = document.getElementById('overview-anchor-tbody');
    if (!tbody) return;

    const neoEmps = state.employees.filter(e => e.isNeo);
    tbody.innerHTML = neoEmps.map(emp => {
      const isDungResolved = emp.id === 'EMP-004' && emp.duplicateInfo && emp.duplicateInfo.isResolved;
      const isBinhApproved = emp.id === 'EMP-002' && emp.calibration && emp.calibration.status === 'APPROVED';

      let displayActual = emp.actual;
      let displayTarget = emp.target;
      let rate = emp.actual / emp.target;
      let payoutFactor = IncentiveEngine.calculatePayoutFactor(rate);
      let incentive = Math.round((emp.baseIncentive || 20000000) * payoutFactor);
      let statusText = '<span class="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">Chuẩn đạt</span>';

      if (emp.id === 'EMP-002') {
        if (isBinhApproved) {
          displayTarget = 900;
          rate = 850 / 900;
          payoutFactor = 0.814815;
          incentive = 16296300;
          statusText = '<span class="text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-medium">Đã duyệt độ khó 0.9</span>';
        } else {
          statusText = '<span class="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">Chờ duyệt độ khó</span>';
        }
      } else if (emp.id === 'EMP-004') {
        if (isDungResolved) {
          displayActual = 900;
          rate = 1.00;
          payoutFactor = 1.00;
          incentive = 20000000;
          statusText = '<span class="text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-medium">Đã gỡ trùng 90M</span>';
        } else {
          statusText = '<span class="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium">Trùng hợp đồng 90M</span>';
        }
      }

      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="py-2.5 px-3 font-medium text-slate-800">${emp.name} (${emp.id})</td>
          <td class="py-2.5 px-3 text-slate-600">${emp.department}</td>
          <td class="py-2.5 px-3 text-right">${displayTarget}M ₫</td>
          <td class="py-2.5 px-3 text-right font-medium">${displayActual}M ₫</td>
          <td class="py-2.5 px-3 text-right font-semibold">${IncentiveEngine.formatPercent(rate, 1)}</td>
          <td class="py-2.5 px-3 text-right">${payoutFactor.toFixed(3)}</td>
          <td class="py-2.5 px-3 text-right font-bold text-teal-800 masked-amount">${IncentiveEngine.formatVND(incentive)}</td>
          <td class="py-2.5 px-3 text-center text-[11px]">${statusText}</td>
        </tr>
      `;
    }).join('');
  }

  // Bộ lọc thời gian & tiến độ
  window.handlePeriodChange = function (periodVal) {
    state.selectedPeriod = periodVal;
    renderOverview();
    showToast(`Đã chuyển sang xem: ${periodVal}`);
  };

  window.handleAsOfDateChange = function (dayVal) {
    state.asOfWorkday = Number(dayVal) || 15;
    renderOverview();
    showToast(`Đã cập nhật tính đến ngày công thứ ${state.asOfWorkday}/22`);
  };

  window.handleDeptFilter = function (deptVal) {
    state.filterDept = deptVal;
    renderOverview();
  };

  // Duyệt tối ưu chính sách
  window.approveSingleOptimization = function (optId) {
    const opt = state.optimizations.find(o => o.id === optId);
    if (!opt) return;

    opt.status = 'APPROVED';
    const statusEl = document.getElementById(`opt-status-${optId}`);
    if (statusEl) {
      statusEl.innerHTML = `<span class="text-teal-700 font-semibold"><i class="fa-solid fa-check"></i> Đã duyệt bởi ${state.currentUser.name}</span>`;
    }

    // Nếu duyệt opt 1 (Bình độ khó 0.9) -> Tự động duyệt luôn cho Bình
    if (optId === 1) {
      const binh = state.employees.find(e => e.id === 'EMP-002');
      if (binh && binh.calibration) {
        binh.calibration.status = 'APPROVED';
        binh.difficultyFactor = 0.9;
        binh.target = 900;
        binh.status = 'CALCULATED';
      }
    }

    renderAnchorPersonasTable();
    showToast(`Đã phê duyệt đề xuất: ${opt.title}`);
  };

  window.openConfirmBulkApprovalModal = function () {
    const modal = document.getElementById('modal-bulk-confirm');
    if (modal) modal.classList.remove('hidden');
  };

  window.closeBulkConfirmModal = function () {
    const modal = document.getElementById('modal-bulk-confirm');
    if (modal) modal.classList.add('hidden');
  };

  window.executeBulkApproval = function () {
    closeBulkConfirmModal();
    state.optimizations.forEach(o => o.status = 'APPROVED');
    
    // Duyệt luôn Bình
    const binh = state.employees.find(e => e.id === 'EMP-002');
    if (binh && binh.calibration) {
      binh.calibration.status = 'APPROVED';
      binh.difficultyFactor = 0.9;
      binh.target = 900;
      binh.status = 'CALCULATED';
    }

    renderAnchorPersonasTable();

    // Hiển thị thanh đếm ngược hoàn tác trong 5 phút (300 giây)
    const undoCard = document.getElementById('opt-undo-countdown');
    const undoBtn = document.getElementById('btn-undo-approval');
    const approveAllBtn = document.getElementById('btn-approve-all-optimizations');

    if (undoCard) undoCard.classList.remove('hidden');
    if (undoBtn) undoBtn.classList.remove('hidden');
    if (approveAllBtn) approveAllBtn.classList.add('hidden');

    state.bulkApprovalSecondsLeft = 300;
    clearInterval(state.bulkApprovalTimer);
    state.bulkApprovalTimer = setInterval(() => {
      state.bulkApprovalSecondsLeft--;
      const span = document.getElementById('undo-seconds');
      if (span) span.textContent = state.bulkApprovalSecondsLeft;
      if (state.bulkApprovalSecondsLeft <= 0) {
        clearInterval(state.bulkApprovalTimer);
        if (undoBtn) undoBtn.classList.add('hidden');
      }
    }, 1000);

    for (let i = 1; i <= 3; i++) {
      const statusEl = document.getElementById(`opt-status-${i}`);
      if (statusEl) {
        statusEl.innerHTML = `<span class="text-teal-700 font-semibold"><i class="fa-solid fa-check"></i> Đã duyệt hàng loạt</span>`;
      }
    }

    showToast('Đã duyệt toàn bộ 3 đề xuất tối ưu chính sách. Bạn có thể hoàn tác trong 5 phút.', 'success');
  };

  window.undoBulkApproval = function () {
    clearInterval(state.bulkApprovalTimer);
    state.optimizations.forEach(o => o.status = 'PENDING');

    const binh = state.employees.find(e => e.id === 'EMP-002');
    if (binh && binh.calibration) {
      binh.calibration.status = 'PENDING';
      binh.difficultyFactor = 1.0;
      binh.target = 1000;
    }

    renderAnchorPersonasTable();

    const undoCard = document.getElementById('opt-undo-countdown');
    const undoBtn = document.getElementById('btn-undo-approval');
    const approveAllBtn = document.getElementById('btn-approve-all-optimizations');

    if (undoCard) undoCard.classList.add('hidden');
    if (undoBtn) undoBtn.classList.add('hidden');
    if (approveAllBtn) approveAllBtn.classList.remove('hidden');

    for (let i = 1; i <= 3; i++) {
      const statusEl = document.getElementById(`opt-status-${i}`);
      if (statusEl) statusEl.textContent = 'Chờ người có quyền duyệt';
    }

    showToast('Đã hoàn tác quyết định duyệt hàng loạt.', 'warning');
  };

  // =========================================================================
  // LOGIC TAB 2: ĐỀ XUẤT MỨC THƯỞNG THÔNG MINH (RECOMMENDATION)
  // =========================================================================
  function renderRecommendationView() {
    const visibleEmployees = AppAuth.filterEmployeesByPermission(state.employees, state.currentUser);
    const countEl = document.getElementById('rec-team-count');
    if (countEl) countEl.textContent = `${visibleEmployees.length} nhân sự`;

    // Render danh sách nhân sự thuộc quyền bên trái
    const listEl = document.getElementById('rec-employee-list');
    if (listEl) {
      listEl.innerHTML = visibleEmployees.map(emp => {
        const isSelected = emp.id === state.selectedRecEmpId;
        const activeClass = isSelected
          ? 'bg-teal-50 border-teal-600 text-teal-950 font-semibold'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';
        return `
          <div onclick="selectRecEmployee('${emp.id}')" class="p-2 rounded border cursor-pointer flex items-center justify-between text-xs transition ${activeClass}">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">${emp.avatar}</span>
              <div>
                <div class="leading-tight">${emp.name}</div>
                <div class="text-[10px] text-slate-400 font-normal">${emp.code} &bull; Level ${emp.level || 3}</div>
              </div>
            </div>
            <span class="text-[11px] text-teal-800 font-bold">${IncentiveEngine.formatPercent(emp.achievementRate || (emp.actual / (emp.target || 1)), 0)}</span>
          </div>
        `;
      }).join('');
    }

    // Lấy nhân sự đang chọn
    const emp = state.employees.find(e => e.id === state.selectedRecEmpId) || state.employees[0];
    if (!emp) return;

    // Render các gói việc (Tasks)
    const taskContainer = document.getElementById('rec-tasks-container');
    if (taskContainer) {
      taskContainer.innerHTML = (emp.tasks || []).map(t => `
        <div class="p-2.5 rounded bg-slate-50 border border-slate-200">
          <div class="flex items-center justify-between font-semibold text-slate-800">
            <span>${t.name}</span>
            <span class="text-teal-800 font-bold">${t.actual}M / ${t.target}M ₫</span>
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Độ phức tạp: <strong>${t.complexityFactor}x</strong> &bull; Đóng góp: <strong>${(t.contribution * 100).toFixed(0)}%</strong></span>
            <span class="text-slate-600 font-medium">Trọng số: <strong>${(t.packageValue * t.complexityFactor).toFixed(0)}</strong></span>
          </div>
        </div>
      `).join('');
    }

    // Tính toán đề xuất thông minh
    const rec = SmartRecommendationEngine.computeEmployeeRecommendation(emp, state.employees);
    if (!rec) return;

    // Header nhân sự
    const nameEl = document.getElementById('rec-detail-name');
    const codeEl = document.getElementById('rec-detail-code');
    const levelEl = document.getElementById('rec-detail-level');
    const roleEl = document.getElementById('rec-detail-role');
    const avatarEl = document.getElementById('rec-detail-avatar');

    if (nameEl) nameEl.textContent = emp.name;
    if (codeEl) codeEl.textContent = emp.code;
    if (levelEl) levelEl.textContent = `Cấp bậc: Level ${emp.level} • Thâm niên: ${emp.seniority} năm`;
    if (roleEl) roleEl.textContent = `${emp.position} • ${emp.department}`;
    if (avatarEl) avatarEl.textContent = emp.avatar;

    // Mức đề xuất
    const propRateEl = document.getElementById('rec-detail-proposed-rate');
    const propAmountEl = document.getElementById('rec-detail-proposed-amount');
    if (propRateEl) propRateEl.textContent = IncentiveEngine.formatPercent(rec.rProposed, 1);
    if (propAmountEl) propAmountEl.textContent = IncentiveEngine.formatVND(rec.proposedAmount);

    // 3 Thành phần nguồn
    const rRuleEl = document.getElementById('rec-card-rule-rate');
    const rRuleDesc = document.getElementById('rec-card-rule-desc');
    if (rRuleEl) rRuleEl.textContent = IncentiveEngine.formatPercent(rec.rRule, 1);
    if (rRuleDesc) rRuleDesc.textContent = `Từ tỷ lệ đạt có trọng số ${IncentiveEngine.formatPercent(rec.weightedRate, 1)} theo quy chế.`;

    const rMLEl = document.getElementById('rec-card-ml-rate');
    const rMLDesc = document.getElementById('rec-card-ml-desc');
    if (rMLEl) rMLEl.textContent = IncentiveEngine.formatPercent(rec.rML, 1);
    if (rMLDesc) rMLDesc.textContent = `Dự báo theo lịch sử. Khoảng [${IncentiveEngine.formatPercent(rec.intervalP10, 0)}, ${IncentiveEngine.formatPercent(rec.intervalP90, 0)}].`;

    const rMgrEl = document.getElementById('rec-card-mgr-delta');
    const rMgrDesc = document.getElementById('rec-card-mgr-desc');
    const mgrSign = rec.deltaManager >= 0 ? '+' : '';
    if (rMgrEl) rMgrEl.textContent = `${mgrSign}${(rec.deltaManager * 100).toFixed(1)}%`;
    if (rMgrDesc) rMgrDesc.textContent = `Điểm chấm ${rec.managerRawScore}/5 sau chuẩn hóa z-score của quản lý.`;

    // Văn bản giải thích
    const expEl = document.getElementById('rec-explanation-container');
    if (expEl) expEl.innerHTML = rec.explanationText.replace(/\n/g, '<br>');

    // Reset slider What-if
    const slider = document.getElementById('whatif-slider');
    if (slider) {
      const sliderVal = Math.round(rec.rProposed * 100);
      slider.value = sliderVal;
      handleWhatIfSlider(sliderVal);
    }

    // Default Q&A Answer
    const qaBox = document.getElementById('qa-answer-box');
    if (qaBox) {
      qaBox.textContent = 'Bấm chọn một câu hỏi gợi ý phía trên để xem diễn giải số liệu chi tiết.';
    }
  }

  window.selectRecEmployee = function (empId) {
    state.selectedRecEmpId = empId;
    renderRecommendationView();
  };

  window.setRecStep = function (stepNum) {
    state.recStep = stepNum;
    showToast(`Đang ở bước ${stepNum}/5 trong luồng đề xuất thưởng.`);
  };

  window.handleRecNextStep = function () {
    if (state.recStep < 5) {
      state.recStep++;
      setRecStep(state.recStep);
    } else {
      showToast('Đã hoàn tất toàn bộ 5 bước của quy trình đề xuất thưởng.', 'success');
    }
  };

  // Thanh kéo What-If
  window.handleWhatIfSlider = function (val) {
    const rate = Number(val) / 100;
    const emp = state.employees.find(e => e.id === state.selectedRecEmpId);
    if (!emp) return;

    const rec = SmartRecommendationEngine.computeEmployeeRecommendation(emp, state.employees);
    if (!rec) return;

    const dispVal = document.getElementById('whatif-slider-val-display');
    if (dispVal) dispVal.textContent = (rate * 100).toFixed(1) + '%';

    const newAmount = Math.round(rec.targetIncentivePersonal * rate);
    const diffAmount = newAmount - rec.proposedAmount;
    const sign = diffAmount >= 0 ? '+' : '';

    const payoutDisp = document.getElementById('whatif-payout-display');
    const diffDisp = document.getElementById('whatif-diff-display');
    if (payoutDisp) payoutDisp.textContent = IncentiveEngine.formatVND(newAmount);
    if (diffDisp) {
      diffDisp.textContent = `${sign}${((rate - rec.rProposed) * 100).toFixed(1)}% (${sign}${IncentiveEngine.formatVND(diffAmount)})`;
    }

    // Cảnh báo nếu lệch > 10%
    const l2Badge = document.getElementById('whatif-l2-badge');
    if (l2Badge) {
      if (Math.abs(rate - rec.rProposed) > 0.10) {
        l2Badge.classList.remove('hidden');
      } else {
        l2Badge.classList.add('hidden');
      }
    }
  };

  // Khung hỏi đáp cho Quản lý
  window.askQuestion = function (questionKey) {
    const emp = state.employees.find(e => e.id === state.selectedRecEmpId);
    if (!emp) return;

    const rec = SmartRecommendationEngine.computeEmployeeRecommendation(emp, state.employees);
    const answer = SmartRecommendationEngine.answerManagerQuestion(questionKey, {
      emp,
      recData: rec,
      customTargetRate: 0.60
    });

    const qaBox = document.getElementById('qa-answer-box');
    if (qaBox) {
      qaBox.innerHTML = answer.replace(/\n/g, '<br>');
    }
  };

  // Quản lý đồng ý mức đề xuất
  window.agreeProposedRate = function () {
    const emp = state.employees.find(e => e.id === state.selectedRecEmpId);
    if (!emp) return;

    const rec = SmartRecommendationEngine.computeEmployeeRecommendation(emp, state.employees);
    emp.finalIncentive = rec.proposedAmount;
    emp.finalRate = rec.rProposed;
    emp.status = 'APPROVED';

    showToast(`Quản lý đã đồng ý mức thưởng ${IncentiveEngine.formatPercent(rec.rProposed, 1)} cho ${emp.name}.`);
  };

  // Modal điều chỉnh mức thưởng
  window.openAdjustModal = function () {
    const emp = state.employees.find(e => e.id === state.selectedRecEmpId);
    if (!emp) return;

    const rec = SmartRecommendationEngine.computeEmployeeRecommendation(emp, state.employees);
    const modal = document.getElementById('modal-adjust-rate');
    const recValSpan = document.getElementById('adjust-modal-rec-val');
    const inputRate = document.getElementById('input-adjust-rate');

    if (recValSpan) recValSpan.textContent = IncentiveEngine.formatPercent(rec.rProposed, 1);
    if (inputRate) inputRate.value = Math.round(rec.rProposed * 100);

    if (modal) modal.classList.remove('hidden');
  };

  window.closeAdjustModal = function () {
    const modal = document.getElementById('modal-adjust-rate');
    if (modal) modal.classList.add('hidden');
  };

  window.submitAdjustRate = function () {
    const inputRate = document.getElementById('input-adjust-rate');
    const inputReason = document.getElementById('input-adjust-reason');
    const newRate = Number(inputRate.value) / 100;
    const reason = inputReason.value.trim();

    const emp = state.employees.find(e => e.id === state.selectedRecEmpId);
    if (!emp) return;

    const rec = SmartRecommendationEngine.computeEmployeeRecommendation(emp, state.employees);
    const diff = Math.abs(newRate - rec.rProposed);

    if (diff > 0.10 && reason.length < 10) {
      alert('Mức điều chỉnh lệch quá 10 điểm phần trăm, bắt buộc phải nhập lý do chi tiết (tối thiểu 10 ký tự)!');
      return;
    }

    emp.finalRate = newRate;
    emp.finalIncentive = Math.round(rec.targetIncentivePersonal * newRate);
    emp.adjustReason = reason;

    if (diff > 0.10) {
      emp.status = 'PENDING_L2';
      showToast(`Đã ghi nhận điều chỉnh ${IncentiveEngine.formatPercent(newRate, 1)}. Hồ sơ đã chuyển lên Hội đồng Admin phê duyệt cấp hai.`, 'warning');
    } else {
      emp.status = 'APPROVED';
      showToast(`Quản lý đã chốt mức thưởng điều chỉnh ${IncentiveEngine.formatPercent(newRate, 1)} thành công.`);
    }

    closeAdjustModal();
  };

  // =========================================================================
  // LOGIC TAB 3: BẢN GIẢI TRÌNH NHÂN VIÊN (SLIP)
  // =========================================================================
  function renderSlipView() {
    // Mặc định hiển thị phiếu thưởng của Trần Thị Bình (EMP-002)
    const empId = (state.currentUser.role === 'employee' && state.currentUser.employeeId)
      ? state.currentUser.employeeId
      : 'EMP-002';
    
    const emp = state.employees.find(e => e.id === empId) || state.employees[1];
    if (!emp) return;

    const nameEl = document.getElementById('slip-emp-name');
    const metaEl = document.getElementById('slip-emp-meta');
    if (nameEl) nameEl.textContent = emp.name;
    if (metaEl) metaEl.textContent = `Mã NV: ${emp.code} • ${emp.position} • Kỳ Q3/2026`;

    const incEl = document.getElementById('slip-incentive-amount');
    const rateEl = document.getElementById('slip-achievement-rate');
    
    // Nếu là Bình sau khi duyệt độ khó 0.9 -> 16.3M
    if (incEl) incEl.textContent = '16.300.000 ₫';
    if (rateEl) rateEl.textContent = '94,4%';
  }

  window.openDisputeModal = function () {
    const reason = prompt('Nhập nội dung giải trình hoặc lý do khiếu nại (Hạn xử lý 15 ngày làm việc):');
    if (reason && reason.trim()) {
      showToast('Đã gửi yêu cầu giải trình tới phòng C&B và Quản lý trực tiếp. Thời hạn giải quyết: 05/10/2026.', 'success');
    }
  };

  // =========================================================================
  // LOGIC TAB 4: DANH MỤC NHÂN VIÊN
  // =========================================================================
  function renderEmployeesTable() {
    const tbody = document.getElementById('employees-table-tbody');
    if (!tbody) return;

    const visibleEmployees = AppAuth.filterEmployeesByPermission(state.employees, state.currentUser);
    const q = state.searchQuery.toLowerCase();
    const filtered = q
      ? visibleEmployees.filter(e => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))
      : visibleEmployees;

    tbody.innerHTML = filtered.slice(0, 30).map(emp => {
      const rate = emp.actual / (emp.target || 1);
      const factor = IncentiveEngine.calculatePayoutFactor(rate);
      const amount = Math.round((emp.baseIncentive || 20000000) * factor);

      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="py-2.5 px-3 font-semibold text-slate-700">${emp.id}</td>
          <td class="py-2.5 px-3 font-medium text-slate-900">${emp.name}</td>
          <td class="py-2.5 px-3 text-slate-600">${emp.department}</td>
          <td class="py-2.5 px-3 text-slate-500">${emp.position} (L${emp.level})</td>
          <td class="py-2.5 px-3 text-right">${emp.target}M ₫</td>
          <td class="py-2.5 px-3 text-right font-medium">${emp.actual}M ₫</td>
          <td class="py-2.5 px-3 text-right font-semibold">${IncentiveEngine.formatPercent(rate, 1)}</td>
          <td class="py-2.5 px-3 text-right font-bold text-teal-800 masked-amount">${IncentiveEngine.formatVND(amount)}</td>
          <td class="py-2.5 px-3 text-center">
            <button onclick="selectRecEmployee('${emp.id}'); switchTab('recommendation');" class="text-teal-700 hover:text-teal-900 font-semibold text-xs">
              Đề xuất thưởng
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.handleEmployeeSearch = function (query) {
    state.searchQuery = query;
    renderEmployeesTable();
  };

  // =========================================================================
  // LOGIC TAB 5: KIỂM TRA DỮ LIỆU (VALIDATION QUEUE)
  // =========================================================================
  function renderValidationQueue() {
    const container = document.getElementById('validation-queue-cards');
    if (!container) return;

    const dung = state.employees.find(e => e.id === 'EMP-004');
    const isDungResolved = dung && dung.duplicateInfo && dung.duplicateInfo.isResolved;

    let dungCardHtml = `
      <div class="bg-white rounded-lg border border-rose-200 p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">TRÙNG LẶP HỢP ĐỒNG</span>
            <span class="text-xs text-slate-400">Phạm Tiến Dũng (RET-021)</span>
          </div>
          <h4 class="font-bold text-xs text-slate-800 mt-2">Hợp đồng HĐ-RET-099 (90.000.000 ₫) bị kế toán nhập 2 lần</h4>
          <p class="text-xs text-slate-600 mt-1">
            Ghi nhận doanh số thô 990M ₫ khiến tỷ lệ đạt vọt lên 110% (thưởng 25M ₫). Thực đạt đúng sau khi khấu trừ bản ghi trùng là 900M ₫ (100% -> thưởng 20M ₫).
          </p>
        </div>
        <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span class="text-xs text-rose-700 font-medium">${isDungResolved ? '✔ Đã khấu trừ hợp đồng trùng lặp' : 'Chưa xử lý khấu trừ'}</span>
          <button onclick="resolveDungDuplicate()" class="px-3 py-1.5 ${isDungResolved ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-rose-700 text-white hover:bg-rose-800'} rounded text-xs font-semibold" ${isDungResolved ? 'disabled' : ''}>
            ${isDungResolved ? 'Đã khấu trừ' : 'Khấu trừ bản ghi trùng (90M ₫)'}
          </button>
        </div>
      </div>
    `;

    container.innerHTML = dungCardHtml;
  }

  window.resolveDungDuplicate = function () {
    const dung = state.employees.find(e => e.id === 'EMP-004');
    if (!dung) return;

    if (dung.duplicateInfo) {
      dung.duplicateInfo.isResolved = true;
    }
    dung.actual = 900;
    dung.validationStatus = 'VALID';
    dung.status = 'CALCULATED';

    renderValidationQueue();
    renderAnchorPersonasTable();
    showToast('Đã gỡ trùng hợp đồng HĐ-RET-099 trị giá 90M ₫ của Phạm Tiến Dũng. Doanh số thực đạt về 900M ₫ (Thưởng 20M ₫).', 'success');
  };

  // =========================================================================
  // LOGIC TAB 6: TÍNH THƯỞNG VÀ CHI TRẢ (PAYROLL)
  // =========================================================================
  function renderPayrollView() {
    const totalEl = document.getElementById('payroll-total-approved');
    if (totalEl) totalEl.textContent = '1.710.450.000 ₫';
  }

  window.openPayrollExportModal = function () {
    const modal = document.getElementById('modal-payroll-export');
    if (modal) modal.classList.remove('hidden');
  };

  window.closePayrollExportModal = function () {
    const modal = document.getElementById('modal-payroll-export');
    if (modal) modal.classList.add('hidden');
  };

  window.executeDownloadPayrollCSV = function () {
    closePayrollExportModal();
    // Tạo nội dung CSV tiếng Việt chuẩn
    let csv = '\uFEFFMã NV,Họ và tên,Phòng ban,Vị trí,Chỉ tiêu (VNĐ),Thực đạt (VNĐ),Tỷ lệ đạt (%),Thưởng thực nhận (VNĐ),Trạng thái\n';
    state.employees.forEach(emp => {
      const rate = ((emp.actual / (emp.target || 1)) * 100).toFixed(1);
      const factor = IncentiveEngine.calculatePayoutFactor(rate / 100);
      const bonus = Math.round((emp.baseIncentive || 20000000) * factor);
      csv += `"${emp.id}","${emp.name}","${emp.department}","${emp.position}",${(emp.target * 1000000)},${(emp.actual * 1000000)},${rate},${bonus},"Đã duyệt"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'PAYROLL_Q3_2026_FINAL.csv';
    link.click();

    showToast('Đã kết xuất tệp tin PAYROLL_Q3_2026_FINAL.csv sang phòng Kế toán thành công!', 'success');
  };

  // =========================================================================
  // MODAL CÁCH TÍNH (FORMULA POPOVER)
  // =========================================================================
  window.openFormulaModal = function (metricKey) {
    const modal = document.getElementById('modal-formula');
    const titleEl = document.getElementById('formula-modal-title');
    const bodyEl = document.getElementById('formula-modal-body');

    if (metricKey === 'weighted_rate') {
      titleEl.textContent = 'Cách tính: Tỷ lệ đạt chỉ tiêu có trọng số';
      bodyEl.innerHTML = `
        <p><strong>Công thức nghiệp vụ:</strong></p>
        <div class="p-2.5 bg-slate-100 rounded font-mono text-[11px] text-slate-800">
          R_thực_đạt_w = Tổng(Trọng_số_i × Tỷ_lệ_đạt_i) / Tổng(Trọng_số_i)
        </div>
        <p class="text-slate-600">
          Trong đó mỗi đầu việc i có <code>Trọng_số_i = Quy_mô_gói × Độ_phức_tạp</code>. Tỷ lệ đạt từng đầu việc được kẹp tối đa 150%.
        </p>
        <p><strong>Ví dụ với bộ lọc hiện tại:</strong></p>
        <p class="text-slate-600">
          Tổng trọng số 120 nhân sự là 96.000 điểm; tổng tích số thực đạt đạt 94.560 điểm. Tỷ lệ bình quân toàn công ty là <strong>98,5%</strong>.
        </p>
      `;
    } else if (metricKey === 'interim_incentive') {
      titleEl.textContent = 'Cách tính: Khoản thưởng tạm tính đến ngày';
      bodyEl.innerHTML = `
        <p><strong>Công thức nghiệp vụ:</strong></p>
        <div class="p-2.5 bg-slate-100 rounded font-mono text-[11px] text-slate-800">
          Thưởng_tạm_tính = Thưởng_mục_tiêu × Đường_cong_chi_trả(Tỷ_lệ_lũy_kế_đến_ngày)
        </div>
        <p class="text-slate-600">
          Được trích xuất từ chuỗi 22 ngày công tích lũy. Tính đến ngày 15/22 (Tuần 3), toàn công ty đã đạt giá trị thưởng tạm tính là <strong>1.642.500.000 ₫</strong>.
        </p>
      `;
    } else if (metricKey === 'budget_usage') {
      titleEl.textContent = 'Cách tính: Chi phí so với Quỹ thưởng';
      bodyEl.innerHTML = `
        <p><strong>Công thức nghiệp vụ:</strong></p>
        <div class="p-2.5 bg-slate-100 rounded font-mono text-[11px] text-slate-800">
          Tỷ_lệ_sử_dụng = Tổng_chi_thưởng_phê_duyệt / Ngân_sách_quỹ × 100%
        </div>
        <p class="text-slate-600">
          1.710.450.000 ₫ / 1.750.000.000 ₫ = <strong>97,7%</strong>. Hệ thống báo xanh an toàn vì không vượt mức trần 100% của quỹ.
        </p>
      `;
    } else if (metricKey === 'time_progress') {
      titleEl.textContent = 'Cách tính: Tiến độ so với Thời gian';
      bodyEl.innerHTML = `
        <p><strong>Công thức nghiệp vụ:</strong></p>
        <div class="p-2.5 bg-slate-100 rounded font-mono text-[11px] text-slate-800">
          Tiến_độ_thời_gian = Ngày_công_đã_qua / Tổng_ngày_công_kỳ = 15 / 22 = 68,2%
        </div>
        <p class="text-slate-600">
          Tốc độ hoàn thành V = Tỷ lệ đạt / Tiến độ thời gian = 98,5% / 68,2% = <strong>1.44x</strong> (Đang chạy nhanh hơn tiến độ thời gian).
        </p>
      `;
    }

    if (modal) modal.classList.remove('hidden');
  };

  window.closeFormulaModal = function () {
    const modal = document.getElementById('modal-formula');
    if (modal) modal.classList.add('hidden');
  };

  // Toggle Privacy Mode (Ẩn/Hiện tiền)
  window.togglePrivacyMode = function () {
    state.privacyMasked = !state.privacyMasked;
    const textEl = document.getElementById('privacy-text');
    const iconEl = document.getElementById('privacy-icon');

    if (state.privacyMasked) {
      document.body.classList.add('privacy-masked');
      if (textEl) textEl.textContent = 'Hiện số tiền';
      if (iconEl) iconEl.className = 'fa-solid fa-eye text-teal-400';
    } else {
      document.body.classList.remove('privacy-masked');
      if (textEl) textEl.textContent = 'Ẩn số tiền';
      if (iconEl) iconEl.className = 'fa-solid fa-eye-slash text-slate-400';
    }
  };

  // Toggle Density Mode (Gọn / Thoải mái)
  window.toggleDensityMode = function () {
    state.densityCompact = !state.densityCompact;
    const textEl = document.getElementById('density-text');

    if (state.densityCompact) {
      document.body.classList.add('density-compact');
      if (textEl) textEl.textContent = 'Chế độ Chuẩn';
    } else {
      document.body.classList.remove('density-compact');
      if (textEl) textEl.textContent = 'Chế độ Gọn';
    }
  };

  // URL Hash routing
  function setupHashRouting() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== state.activeTab) {
        switchTab(hash);
      }
    });

    if (window.location.hash) {
      const initHash = window.location.hash.replace('#', '');
      switchTab(initHash);
    }
  }

  // Export State ra window để phục vụ kiểm thử CDP tự động
  window.AppState = state;

})();