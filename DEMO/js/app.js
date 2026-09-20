/**
 * APPLICATION CONTROLLER - NỀN TẢNG QUẢN LÝ VÀ ĐỀ XUẤT THƯỞNG
 * Thiết kế tinh giản, trực quan, giống bản gốc, loại bỏ hoàn toàn chi tiết thừa và AI-slop.
 */

(function () {
  'use strict';

  // Thông báo Toast đơn giản
  function showToast(message, type = 'success') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'fixed bottom-5 right-5 z-50 px-4 py-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg border border-slate-700 flex items-center gap-2 transition-all duration-200 pointer-events-none opacity-0 translate-y-2';
      document.body.appendChild(toast);
    }
    const icon = type === 'warning' ? 'fa-triangle-exclamation text-amber-400' : 'fa-circle-check text-emerald-400';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
    }, 2800);
  }

  // State quản lý
  const state = {
    currentUser: null,
    activeTab: 'overview',
    employees: [],
    selectedPeriod: 'Q3_2026',
    asOfWorkday: 15,
    filterDept: 'ALL',
    searchQuery: '',
    selectedRecEmpId: 'EMP-002', // Mặc định mở Bình
    privacyMasked: false,
    overviewChartMode: 'line',
    overviewChartInstance: null,
    distributionChartInstance: null,
    bulkApprovalTimer: null,
    bulkApprovalSecondsLeft: 300,
    optimizations: [
      { id: 1, title: 'Hệ số độ khó 0.9 vùng Đông Nam Bộ', status: 'PENDING', impact: 6300000 },
      { id: 2, title: 'Giảm độ dốc vùng dồn ứ (95% - 99%)', status: 'PENDING', impact: -12500000 },
      { id: 3, title: 'Gán trọng số cho hợp đồng B2B', status: 'PENDING', impact: 0 }
    ]
  };

  /**
   * Lấy danh sách nhân viên theo kỳ tính được chọn (hỗ trợ chuyển kỳ động Q1, Q2, Q3)
   */
  function getActiveEmployees(periodKey = state.selectedPeriod) {
    if (!periodKey || periodKey === 'Q3_2026') {
      return state.employees;
    }
    const targetQuarter = periodKey.replace('_', '/'); // ví dụ 'Q2/2026' hoặc 'Q1/2026'
    return state.employees.map(emp => {
      const h = (emp.history || []).find(item => item.period === targetQuarter);
      if (!h) return emp;
      const targetVal = emp.target || 800;
      const actualVal = Math.round(targetVal * h.weightedRate);
      return {
        ...emp,
        period: targetQuarter,
        target: targetVal,
        actual: actualVal,
        difficultyFactor: 1.0,
        achievementRate: h.weightedRate,
        weightedRate: h.weightedRate,
        payoutFactor: h.payoutFactor,
        incentiveAmount: h.incentive,
        finalIncentive: h.incentive,
        status: 'APPROVED',
        validationStatus: 'VALID'
      };
    });
  }

  // Khởi động
  document.addEventListener('DOMContentLoaded', async () => {
    state.currentUser = AppAuth.getCurrentUser();
    state.employees = BenchmarkDataset.generateBenchmarkDataset();

    if (window.SmartRecommendationEngine) {
      await SmartRecommendationEngine.loadMLPredictions();
    }

    renderUserSidebar();
    renderSidebarNav();

    if (state.currentUser.role === 'employee') {
      switchTab('slip');
    } else {
      switchTab('overview');
    }

    setupHashRouting();
  });

  // Hiển thị thông tin người dùng ở sidebar và header
  function renderUserSidebar() {
    const u = state.currentUser;
    const nameEl = document.getElementById('sidebar-user-name');
    const deptEl = document.getElementById('sidebar-user-dept');
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const roleBadge = document.getElementById('sidebar-role-name');
    const selectQuick = document.getElementById('select-role-quick');

    if (nameEl) nameEl.textContent = u.name;
    if (deptEl) deptEl.textContent = u.department || 'Toàn công ty';
    if (avatarEl) avatarEl.textContent = u.avatar || 'U';
    if (roleBadge) roleBadge.textContent = u.roleName;
    if (selectQuick) selectQuick.value = u.role;

    // Ẩn/Hiện text automation theo vai trò
    const autoText = document.getElementById('automation-info-text');
    if (autoText) {
      if (u.role === 'employee') autoText.classList.add('hidden');
      else autoText.classList.remove('hidden');
    }
  }

  // Render các mục menu bên sidebar trái (giống web gốc)
  function renderSidebarNav() {
    const nav = document.getElementById('sidebar-nav-container');
    if (!nav) return;
    const role = state.currentUser.role;

    let items = [];
    if (role === 'employee') {
      items = [
        { id: 'slip', label: 'Phiếu Thưởng Của Tôi', icon: 'fa-receipt' },
        { id: 'overview', label: 'Tiến Độ Công Ty', icon: 'fa-chart-line' }
      ];
    } else if (role === 'manager') {
      items = [
        { id: 'overview', label: 'Dashboard Tổng Quan', icon: 'fa-house' },
        { id: 'recommendation', label: 'Đề Xuất Mức Thưởng', icon: 'fa-calculator' },
        { id: 'employees', label: 'Danh Mục Nhân Viên', icon: 'fa-users' },
        { id: 'validation', label: 'Kiểm Tra Lỗi Dữ Liệu', icon: 'fa-shield-halved' }
      ];
    } else {
      // Admin
      items = [
        { id: 'overview', label: 'Dashboard Tổng Quan', icon: 'fa-house' },
        { id: 'recommendation', label: 'Đề Xuất Mức Thưởng', icon: 'fa-calculator' },
        { id: 'employees', label: 'Danh Mục Nhân Viên', icon: 'fa-users' },
        { id: 'validation', label: 'Kiểm Tra Lỗi Dữ Liệu', icon: 'fa-shield-halved' },
        { id: 'payroll', label: 'Phê Duyệt & Chi Trả', icon: 'fa-file-invoice-dollar' }
      ];
    }

    nav.innerHTML = items.map(it => {
      const active = (state.activeTab === it.id);
      const activeClasses = active
        ? 'text-white bg-indigo-600 font-semibold shadow-sm'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium';
      return `
        <button onclick="switchTab('${it.id}')" class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs transition ${activeClasses}">
          <i class="fa-solid ${it.icon} w-5 text-center text-sm"></i>
          <span>${it.label}</span>
        </button>
      `;
    }).join('');
  }

  // Chuyển Tab
  window.switchTab = function (tabId) {
    if (!AppAuth.checkRoutePermission(tabId, state.currentUser)) {
      showToast('Bạn không có quyền truy cập chức năng này.', 'warning');
      return;
    }

    state.activeTab = tabId;
    window.location.hash = tabId;

    // Cập nhật tiêu đề Header
    updatePageHeader(tabId);

    // Ẩn tất cả view
    document.querySelectorAll('.view-panel').forEach(el => el.classList.add('hidden'));

    const targetEl = document.getElementById('view-' + tabId);
    if (targetEl) targetEl.classList.remove('hidden');

    renderSidebarNav();

    if (tabId === 'overview') renderOverview();
    if (tabId === 'recommendation') renderRecommendationView();
    if (tabId === 'slip') renderSlipView();
    if (tabId === 'employees') renderEmployeesTable();
    if (tabId === 'validation') renderValidationQueue();
    if (tabId === 'payroll') renderPayrollView();
  };

  function updatePageHeader(tabId) {
    const titleEl = document.getElementById('page-title');
    const subEl = document.getElementById('page-subtitle');
    const periodStr = state.selectedPeriod.replace('_', '/');
    const titles = {
      overview: { t: 'Dashboard Tổng Quan', s: `Tiến độ hoàn thành chỉ tiêu và dự phóng quỹ thưởng kỳ ${periodStr}` },
      recommendation: { t: 'Đề Xuất Mức Thưởng Thông Minh', s: 'Kết hợp 3 nguồn: Quy tắc định lượng, Học máy và Đánh giá quản lý' },
      employees: { t: 'Danh Mục Nhân Sự & Chỉ Tiêu', s: `Theo dõi tiến độ hoàn thành chỉ tiêu toàn bộ nhân viên kỳ ${periodStr}` },
      validation: { t: 'Kiểm Tra Lỗi Dữ Liệu & Bất Thường', s: 'Rà soát trùng lặp hợp đồng và số liệu bất thường' },
      payroll: { t: 'Phê Duyệt Lô & Xuất Bảng Chi Trả', s: `Đối chiếu ngân sách và xuất file CSV kỳ ${periodStr} sang phòng Kế toán` },
      slip: { t: 'Phiếu Thưởng Cá Nhân', s: `Bản giải trình chi tiết cách tính khoản thưởng kỳ ${periodStr}` }
    };
    if (titles[tabId]) {
      if (titleEl) titleEl.textContent = titles[tabId].t;
      if (subEl) subEl.textContent = titles[tabId].s;
    }
  }

  // Đổi vai trò nhanh
  window.handleRoleSwitch = function (roleKey) {
    state.currentUser = AppAuth.switchRoleQuick(roleKey);
    renderUserSidebar();
    renderSidebarNav();

    if (state.currentUser.role === 'employee') {
      switchTab('slip');
    } else {
      switchTab('overview');
    }
    showToast(`Chuyển sang: ${state.currentUser.roleName}`);
  };

  // =========================================================================
  // VIEW 1: TỔNG QUAN (OVERVIEW)
  // =========================================================================
  function renderOverview() {
    const activeEmps = getActiveEmployees();
    const visibleEmployees = AppAuth.filterEmployeesByPermission(activeEmps, state.currentUser);
    const filtered = state.filterDept === 'ALL'
      ? visibleEmployees
      : visibleEmployees.filter(e => e.department === state.filterDept);

    const metrics = IncentiveEngine.calculateBusinessMetrics({
      employees: filtered,
      budget: 1750000000,
      workdaysElapsed: state.asOfWorkday,
      totalWorkdays: 22
    });

    const wRateEl = document.getElementById('metric-weighted-rate');
    if (wRateEl) wRateEl.textContent = IncentiveEngine.formatPercent(metrics.avgWeightedRate, 1);

    const interimToDate = Math.round(metrics.totalIncentive * metrics.progressVsTime);
    const interimEl = document.getElementById('metric-interim-amount');
    const projEl = document.getElementById('metric-projected-amount');
    if (interimEl) interimEl.textContent = IncentiveEngine.formatVND(interimToDate);
    if (projEl) projEl.textContent = IncentiveEngine.formatVND(metrics.totalIncentive);

    const budUsageEl = document.getElementById('metric-budget-usage');
    if (budUsageEl) budUsageEl.textContent = IncentiveEngine.formatPercent(metrics.budgetUsageRate, 1);

    const timeProgEl = document.getElementById('metric-time-progress');
    if (timeProgEl) timeProgEl.textContent = IncentiveEngine.formatPercent(metrics.progressVsTime, 1);

    renderOverviewChart();
    renderDistributionChart();
  }

  function renderOverviewChart() {
    const ctx = document.getElementById('overviewTrendsChart');
    if (!ctx) return;

    if (state.overviewChartInstance) {
      state.overviewChartInstance.destroy();
    }

    const subTitle = document.getElementById('chart-sub-title');
    const curPeriodStr = state.selectedPeriod.replace('_', '/');

    if (state.overviewChartMode === 'line') {
      if (subTitle) subTitle.textContent = `Đường xu hướng qua 5 kỳ liên tiếp (Đang xem: ${curPeriodStr})`;
      
      const periods = ['Q3/2025', 'Q4/2025', 'Q1/2026', 'Q2/2026', 'Q3/2026'];
      const pointRadii = periods.map(p => p === curPeriodStr ? 7 : 4);
      const pointColors = periods.map(p => p === curPeriodStr ? '#fbbf24' : '#4f46e5');

      state.overviewChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Q3/2025', 'Q4/2025', 'Q1/2026', 'Q2/2026', 'Q3/2026'],
          datasets: [
            {
              label: 'Tỷ lệ đạt chỉ tiêu (%)',
              data: [92.4, 96.8, 98.2, 95.5, 94.6],
              borderColor: '#4f46e5',
              backgroundColor: 'rgba(79, 70, 229, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.2,
              pointRadius: pointRadii,
              pointBackgroundColor: pointColors
            },
            {
              label: 'Mục tiêu chuẩn (100%)',
              data: [100, 100, 100, 100, 100],
              borderColor: '#94a3b8',
              borderWidth: 1.5,
              borderDash: [4, 4],
              fill: false,
              pointRadius: 0
            },
            {
              label: 'Ngưỡng sàn (70%)',
              data: [70, 70, 70, 70, 70],
              borderColor: '#f59e0b',
              borderWidth: 1.5,
              borderDash: [2, 2],
              fill: false,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
          },
          scales: {
            y: { min: 50, max: 130, ticks: { callback: v => v + '%' } }
          }
        }
      });
    } else {
      if (subTitle) subTitle.textContent = `So sánh tỷ lệ đạt chỉ tiêu giữa 4 khối kinh doanh kỳ ${curPeriodStr}`;
      
      const activeEmps = getActiveEmployees();
      const depts = [
        { name: 'Kinh doanh Miền Bắc', label: 'Miền Bắc' },
        { name: 'Kinh doanh Miền Nam', label: 'Miền Nam' },
        { name: 'Khách hàng Doanh nghiệp', label: 'K.H Doanh nghiệp' },
        { name: 'Vận hành Bán lẻ', label: 'Vận hành Bán lẻ' }
      ];

      const deptRates = depts.map(d => {
        const empsInDept = activeEmps.filter(e => e.department === d.name);
        if (!empsInDept.length) return 100;
        const sumRate = empsInDept.reduce((sum, e) => {
          const t = (e.target || 1) * (e.difficultyFactor || 1.0);
          return sum + (e.achievementRate || (t > 0 ? (e.actual / t) : 1.0));
        }, 0);
        return Math.round((sumRate / empsInDept.length) * 1000) / 10;
      });

      state.overviewChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: depts.map(d => d.label),
          datasets: [{
            label: 'Tỷ lệ hoàn thành (%)',
            data: deptRates,
            backgroundColor: ['#4f46e5', '#6366f1', '#0ea5e9', '#14b8a6'],
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { min: 60, max: 120, ticks: { callback: v => v + '%' } }
          }
        }
      });
    }
  }

  function renderDistributionChart() {
    const ctx = document.getElementById('overviewDistributionChart');
    if (!ctx) return;

    if (state.distributionChartInstance) {
      state.distributionChartInstance.destroy();
    }

    const activeEmps = getActiveEmployees();
    const visibleEmployees = AppAuth.filterEmployeesByPermission(activeEmps, state.currentUser);
    const filtered = state.filterDept === 'ALL'
      ? visibleEmployees
      : visibleEmployees.filter(e => e.department === state.filterDept);

    let underFloor = 0; // < 70%
    let partial = 0;    // 70% - 99.9%
    let target = 0;     // 100% - 119.9%
    let cap = 0;        // >= 120%

    filtered.forEach(emp => {
      const t = (emp.target || 1) * (emp.difficultyFactor || 1.0);
      const rate = emp.achievementRate || (t > 0 ? (emp.actual / t) : 0);
      if (rate < 0.70) underFloor++;
      else if (rate < 1.00) partial++;
      else if (rate < 1.20) target++;
      else cap++;
    });

    const totalCountEl = document.getElementById('chart-distribution-total');
    if (totalCountEl) totalCountEl.textContent = `${filtered.length} nhân sự`;

    const subTitle = document.getElementById('chart-distribution-subtitle');
    if (subTitle) {
      const periodLabel = state.selectedPeriod.replace('_', '/');
      subTitle.textContent = `Tỷ trọng nhân sự theo các ngưỡng chi trả quy chế kỳ ${periodLabel}`;
    }

    state.distributionChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Dưới sàn (<70%)', 'Đạt 1 phần (70-99%)', 'Đạt chuẩn (100-119%)', 'Chạm trần (≥120%)'],
        datasets: [{
          label: 'Số lượng nhân sự',
          data: [underFloor, partial, target, cap],
          backgroundColor: ['#ef4444', '#f59e0b', '#4f46e5', '#10b981'],
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const count = context.parsed.y;
                const pct = filtered.length > 0 ? ((count / filtered.length) * 100).toFixed(1) : 0;
                return ` ${count} người (${pct}%)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 10, precision: 0 }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });
  }

  window.setOverviewChartMode = function (mode) {
    state.overviewChartMode = mode;
    const btnLine = document.getElementById('btn-chart-mode-line');
    const btnBar = document.getElementById('btn-chart-mode-bar');

    if (mode === 'line') {
      btnLine.className = 'px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-medium';
      btnBar.className = 'px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium';
    } else {
      btnBar.className = 'px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-medium';
      btnLine.className = 'px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium';
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
      let statusBadge = '<span class="text-emerald-700 font-semibold">Đạt chuẩn</span>';

      if (emp.id === 'EMP-002') {
        if (isBinhApproved) {
          displayTarget = 900;
          rate = 850 / 900;
          payoutFactor = 0.814815;
          incentive = 16296300;
          statusBadge = '<span class="text-indigo-600 font-semibold">Đã duyệt độ khó 0.9</span>';
        } else {
          statusBadge = '<span class="text-amber-600 font-semibold">Chờ duyệt độ khó</span>';
        }
      } else if (emp.id === 'EMP-004') {
        if (isDungResolved) {
          displayActual = 900;
          rate = 1.00;
          payoutFactor = 1.00;
          incentive = 20000000;
          statusBadge = '<span class="text-indigo-600 font-semibold">Đã gỡ trùng 90M</span>';
        } else {
          statusBadge = '<span class="text-rose-600 font-semibold">Trùng HĐ 90M</span>';
        }
      }

      return `
        <tr class="hover:bg-slate-50">
          <td class="p-3 font-semibold text-slate-800">${emp.name} (${emp.id})</td>
          <td class="p-3 text-slate-600">${emp.department}</td>
          <td class="p-3 text-right">${displayTarget}M ₫</td>
          <td class="p-3 text-right font-medium">${displayActual}M ₫</td>
          <td class="p-3 text-right font-bold">${IncentiveEngine.formatPercent(rate, 1)}</td>
          <td class="p-3 text-right">${payoutFactor.toFixed(3)}</td>
          <td class="p-3 text-right font-bold text-indigo-700 masked-amount">${IncentiveEngine.formatVND(incentive)}</td>
          <td class="p-3 text-center">${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  // Bộ lọc
  window.handlePeriodChange = function (periodVal) {
    state.selectedPeriod = periodVal;

    // Tự động chuyển ngày công nếu xem kỳ quá khứ (đã hoàn thành 22/22 ngày)
    const asOfSelect = document.getElementById('select-as-of-date');
    if (periodVal !== 'Q3_2026') {
      state.asOfWorkday = 22;
      if (asOfSelect) asOfSelect.value = '22';
    } else {
      state.asOfWorkday = 15;
      if (asOfSelect) asOfSelect.value = '15';
    }

    updatePageHeader(state.activeTab);
    renderOverview();

    if (state.activeTab === 'employees') renderEmployeesTable();
    if (state.activeTab === 'payroll') renderPayrollView();
    if (state.activeTab === 'slip') renderSlipView();
    if (state.activeTab === 'recommendation') renderRecommendationView();

    showToast(`Đã chuyển sang xem số liệu: ${periodVal.replace('_', '/')}`);
  };

  window.handleAsOfDateChange = function (dayVal) {
    state.asOfWorkday = Number(dayVal) || 15;
    renderOverview();
    showToast(`Tính đến ngày công: ${state.asOfWorkday}/22`);
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
    if (statusEl) statusEl.innerHTML = `<span class="text-emerald-600 font-bold">Đã duyệt</span>`;

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
    showToast(`Đã duyệt: ${opt.title}`);
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

    const binh = state.employees.find(e => e.id === 'EMP-002');
    if (binh && binh.calibration) {
      binh.calibration.status = 'APPROVED';
      binh.difficultyFactor = 0.9;
      binh.target = 900;
      binh.status = 'CALCULATED';
    }

    renderAnchorPersonasTable();

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
      if (statusEl) statusEl.innerHTML = `<span class="text-emerald-600 font-bold">Đã duyệt</span>`;
    }

    showToast('Đã duyệt toàn bộ đề xuất chính sách.');
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
      if (statusEl) statusEl.textContent = 'Chờ duyệt';
    }

    showToast('Đã hoàn tác quyết định duyệt.', 'warning');
  };

  // =========================================================================
  // VIEW 2: ĐỀ XUẤT MỨC THƯỞNG THÔNG MINH
  // =========================================================================
  function renderRecommendationView() {
    const visibleEmployees = AppAuth.filterEmployeesByPermission(state.employees, state.currentUser);
    const countEl = document.getElementById('rec-team-count');
    if (countEl) countEl.textContent = `${visibleEmployees.length} nhân sự`;

    // Danh sách bên trái
    const listEl = document.getElementById('rec-employee-list');
    if (listEl) {
      listEl.innerHTML = visibleEmployees.map(emp => {
        const isSelected = emp.id === state.selectedRecEmpId;
        const activeClass = isSelected
          ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';
        return `
          <div onclick="selectRecEmployee('${emp.id}')" class="p-2.5 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition ${activeClass}">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">${emp.avatar}</span>
              <div>
                <div class="leading-tight">${emp.name}</div>
                <div class="text-slate-400 text-[11px]">${emp.code}</div>
              </div>
            </div>
            <span class="font-bold text-slate-900">${IncentiveEngine.formatPercent(emp.achievementRate || (emp.actual / (emp.target || 1)), 0)}</span>
          </div>
        `;
      }).join('');
    }

    const emp = state.employees.find(e => e.id === state.selectedRecEmpId) || state.employees[1];
    if (!emp) return;

    const rec = SmartRecommendationEngine.computeEmployeeRecommendation(emp, state.employees);
    if (!rec) return;

    // Header
    const nameEl = document.getElementById('rec-detail-name');
    const codeEl = document.getElementById('rec-detail-code');
    const roleEl = document.getElementById('rec-detail-role');
    const avatarEl = document.getElementById('rec-detail-avatar');

    if (nameEl) nameEl.textContent = emp.name;
    if (codeEl) codeEl.textContent = emp.code;
    if (roleEl) roleEl.textContent = `${emp.position} • ${emp.department}`;
    if (avatarEl) avatarEl.textContent = emp.avatar;

    const propRateEl = document.getElementById('rec-detail-proposed-rate');
    const propAmountEl = document.getElementById('rec-detail-proposed-amount');
    if (propRateEl) propRateEl.textContent = IncentiveEngine.formatPercent(rec.rProposed, 1);
    if (propAmountEl) propAmountEl.textContent = IncentiveEngine.formatVND(rec.proposedAmount);

    // 3 Thẻ nguồn
    const rRuleEl = document.getElementById('rec-card-rule-rate');
    const rRuleDesc = document.getElementById('rec-card-rule-desc');
    if (rRuleEl) rRuleEl.textContent = IncentiveEngine.formatPercent(rec.rRule, 1);
    if (rRuleDesc) rRuleDesc.textContent = `Tỷ lệ đạt có trọng số: ${IncentiveEngine.formatPercent(rec.weightedRate, 1)}.`;

    const rMLEl = document.getElementById('rec-card-ml-rate');
    const rMLDesc = document.getElementById('rec-card-ml-desc');
    if (rMLEl) rMLEl.textContent = IncentiveEngine.formatPercent(rec.rML, 1);
    if (rMLDesc) rMLDesc.textContent = `Dự báo theo mẫu 4 kỳ. Khoảng [${IncentiveEngine.formatPercent(rec.intervalP10, 0)}, ${IncentiveEngine.formatPercent(rec.intervalP90, 0)}].`;

    const rMgrEl = document.getElementById('rec-card-mgr-delta');
    const rMgrDesc = document.getElementById('rec-card-mgr-desc');
    const mgrSign = rec.deltaManager >= 0 ? '+' : '';
    // Cập nhật công thức trực quan từng bước
    const fStep1 = document.getElementById('rec-formula-step1-values');
    if (fStep1) {
      const rRulePct = IncentiveEngine.formatPercent(rec.rRule, 1);
      const rMLPct = IncentiveEngine.formatPercent(rec.rML, 1);
      const rMgrPct = `${mgrSign}${(rec.deltaManager * 100).toFixed(1)}%`;
      const rPropPct = IncentiveEngine.formatPercent(rec.rProposed, 1);
      fStep1.innerHTML = `= (70% × ${rRulePct}) + (30% × ${rMLPct}) + (${rMgrPct}) = <strong class="text-amber-300">${rPropPct}</strong>`;
    }
    const fStep2 = document.getElementById('rec-formula-step2-values');
    if (fStep2) {
      const targetInc = IncentiveEngine.formatVND(rec.targetIncentivePersonal);
      const rPropPct = IncentiveEngine.formatPercent(rec.rProposed, 1);
      const finalAmount = IncentiveEngine.formatVND(rec.proposedAmount);
      fStep2.innerHTML = `= ${targetInc} × ${rPropPct} = <strong class="text-emerald-400">${finalAmount}</strong>`;
    }

    // Căn cứ giải thích
    const expEl = document.getElementById('rec-explanation-container');
    if (expEl) expEl.innerHTML = rec.explanationText.replace(/\n/g, '<br>');

    // Slider What-if
    const slider = document.getElementById('whatif-slider');
    if (slider) {
      const sliderVal = Math.round(rec.rProposed * 100);
      slider.value = sliderVal;
      handleWhatIfSlider(sliderVal);
    }
  }

  window.selectRecEmployee = function (empId) {
    state.selectedRecEmpId = empId;
    renderRecommendationView();
  };

  window.handleWhatIfSlider = function (val) {
    const rate = Number(val) / 100;
    const emp = state.employees.find(e => e.id === state.selectedRecEmpId);
    if (!emp) return;

    const rec = SmartRecommendationEngine.computeEmployeeRecommendation(emp, state.employees);
    if (!rec) return;

    const dispVal = document.getElementById('whatif-slider-val-display');
    if (dispVal) dispVal.textContent = (rate * 100).toFixed(1) + '%';

    const newAmount = Math.round(rec.targetIncentivePersonal * rate);
    const diffRate = (rate - rec.rProposed) * 100;
    const sign = diffRate >= 0 ? '+' : '';

    const payoutDisp = document.getElementById('whatif-payout-display');
    const diffDisp = document.getElementById('whatif-diff-display');
    if (payoutDisp) payoutDisp.textContent = IncentiveEngine.formatVND(newAmount);
    if (diffDisp) diffDisp.textContent = `${sign}${diffRate.toFixed(1)}%`;

    const l2Badge = document.getElementById('whatif-l2-badge');
    if (l2Badge) {
      if (Math.abs(rate - rec.rProposed) > 0.10) l2Badge.classList.remove('hidden');
      else l2Badge.classList.add('hidden');
    }
  };

  window.agreeProposedRate = function () {
    const emp = state.employees.find(e => e.id === state.selectedRecEmpId);
    if (!emp) return;

    const rec = SmartRecommendationEngine.computeEmployeeRecommendation(emp, state.employees);
    emp.finalIncentive = rec.proposedAmount;
    emp.finalRate = rec.rProposed;
    emp.status = 'APPROVED';

    showToast(`Đã duyệt mức thưởng ${IncentiveEngine.formatPercent(rec.rProposed, 1)} cho ${emp.name}.`);
  };

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

    if (diff > 0.10 && reason.length < 5) {
      alert('Vui lòng nhập lý do cụ thể khi mức điều chỉnh lệch quá 10%!');
      return;
    }

    emp.finalRate = newRate;
    emp.finalIncentive = Math.round(rec.targetIncentivePersonal * newRate);
    emp.adjustReason = reason;

    if (diff > 0.10) {
      emp.status = 'PENDING_L2';
      showToast(`Đã ghi nhận ${IncentiveEngine.formatPercent(newRate, 1)}. Chuyển Hội đồng Admin duyệt cấp hai.`, 'warning');
    } else {
      emp.status = 'APPROVED';
      showToast(`Đã chốt mức điều chỉnh ${IncentiveEngine.formatPercent(newRate, 1)}.`);
    }

    closeAdjustModal();
  };

  // =========================================================================
  // VIEW 3: PHIẾU THƯỞNG NHÂN VIÊN (SLIP)
  // =========================================================================
  function renderSlipView() {
    const empId = (state.currentUser.role === 'employee' && state.currentUser.employeeId)
      ? state.currentUser.employeeId
      : 'EMP-002';

    const activeEmps = getActiveEmployees();
    const emp = activeEmps.find(e => e.id === empId) || activeEmps[1] || activeEmps[0];
    if (!emp) return;

    const periodLabel = state.selectedPeriod.replace('_', '/');
    const nameEl = document.getElementById('slip-emp-name');
    const metaEl = document.getElementById('slip-emp-meta');
    if (nameEl) nameEl.textContent = emp.name;
    if (metaEl) metaEl.textContent = `Mã NV: ${emp.code} • ${emp.position} • Kỳ ${periodLabel}`;

    const rawTarget = emp.target || 1000;
    const diffFactor = emp.difficultyFactor || 1.0;
    const adjustedTarget = Math.round(rawTarget * diffFactor);
    const rawActual = emp.actual || 850;
    const rate = adjustedTarget > 0 ? (rawActual / adjustedTarget) : 1.0;
    const payoutFactor = IncentiveEngine.calculatePayoutFactor(rate);
    const baseInc = emp.baseIncentive || 20000000;
    const finalBonus = emp.finalIncentive || emp.incentiveAmount || Math.round(baseInc * payoutFactor);

    const incAmountEl = document.getElementById('slip-incentive-amount');
    const achRateEl = document.getElementById('slip-achievement-rate');
    if (incAmountEl) incAmountEl.textContent = IncentiveEngine.formatVND(finalBonus);
    if (achRateEl) achRateEl.textContent = IncentiveEngine.formatPercent(rate, 1);

    // Bước 1: Chỉ tiêu sau hiệu chỉnh
    const s1Math = document.getElementById('slip-step1-math');
    const s1Desc = document.getElementById('slip-step1-desc');
    if (s1Math) {
      if (diffFactor !== 1.0) {
        s1Math.textContent = `${rawTarget}M ₫ × ${diffFactor.toFixed(2)} = ${adjustedTarget}M ₫`;
        if (s1Desc) s1Desc.textContent = `Áp dụng hệ số độ khó ${diffFactor} theo tình hình thị trường khu vực.`;
      } else {
        s1Math.textContent = `Chỉ tiêu giao: ${rawTarget}M ₫`;
        if (s1Desc) s1Desc.textContent = `Chỉ tiêu chuẩn không áp dụng hiệu chỉnh độ khó bổ sung.`;
      }
    }

    // Bước 2: Tỷ lệ hoàn thành
    const s2Math = document.getElementById('slip-step2-math');
    const s2Desc = document.getElementById('slip-step2-desc');
    if (s2Math) s2Math.textContent = `${rawActual}M ₫ / ${adjustedTarget}M ₫ = ${IncentiveEngine.formatPercent(rate, 2)}`;
    if (s2Desc) s2Desc.textContent = `Doanh số nghiệm thu đạt ${rawActual} triệu đồng trên chỉ tiêu ${adjustedTarget} triệu.`;

    // Bước 3: Hệ số chi trả quy chế
    const s3Math = document.getElementById('slip-step3-math');
    const s3Desc = document.getElementById('slip-step3-desc');
    if (s3Math) {
      if (rate < 0.70) {
        s3Math.textContent = `Dưới ngưỡng sàn 70% → Hệ số: 0,0%`;
        if (s3Desc) s3Desc.textContent = `Theo quy chế, dưới ngưỡng sàn 70% không đủ điều kiện xét thưởng.`;
      } else if (rate <= 1.00) {
        s3Math.textContent = `(${IncentiveEngine.formatPercent(rate, 2)} - 70%) / 30% = ${IncentiveEngine.formatPercent(payoutFactor, 1)}`;
        if (s3Desc) s3Desc.textContent = `Khoảng tuyến tính từ ngưỡng sàn 70% (0x) đến mục tiêu 100% (1,0x).`;
      } else if (rate <= 1.20) {
        s3Math.textContent = `1,0 + (${IncentiveEngine.formatPercent(rate, 2)} - 100%) / 20% × 0,5 = ${IncentiveEngine.formatPercent(payoutFactor, 1)}`;
        if (s3Desc) s3Desc.textContent = `Khoảng tuyến tính vượt chuẩn từ 100% (1,0x) đến trần 120% (1,5x).`;
      } else {
        s3Math.textContent = `Đạt ≥ 120% → Chạm trần tối đa: 150,0%`;
        if (s3Desc) s3Desc.textContent = `Hệ số chi trả được chặn trần tối đa 1,5x theo quy chế tài chính.`;
      }
    }

    // Bước 4: Tiền thưởng thực nhận
    const s4Math = document.getElementById('slip-step4-math');
    if (s4Math) s4Math.textContent = `${IncentiveEngine.formatVND(baseInc)} × ${IncentiveEngine.formatPercent(payoutFactor, 1)} = ${IncentiveEngine.formatVND(finalBonus)}`;
  }

  window.openDisputeModal = function () {
    const reason = prompt('Nhập nội dung giải trình hoặc lý do khiếu nại (Hạn xử lý 15 ngày làm việc):');
    if (reason && reason.trim()) {
      showToast('Đã gửi yêu cầu giải trình tới phòng C&B. Thời hạn phản hồi: 05/10/2026.');
    }
  };

  // =========================================================================
  // VIEW 4: DANH MỤC NHÂN VIÊN
  // =========================================================================
  function renderEmployeesTable() {
    const tbody = document.getElementById('employees-table-tbody');
    if (!tbody) return;

    const activeEmps = getActiveEmployees();
    const visibleEmployees = AppAuth.filterEmployeesByPermission(activeEmps, state.currentUser);
    const q = state.searchQuery.toLowerCase();
    const filtered = q
      ? visibleEmployees.filter(e => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))
      : visibleEmployees;

    tbody.innerHTML = filtered.slice(0, 30).map(emp => {
      const target = (emp.target || 1) * (emp.difficultyFactor || 1.0);
      const rate = emp.achievementRate || (target > 0 ? (emp.actual / target) : 0);
      const factor = emp.payoutFactor || IncentiveEngine.calculatePayoutFactor(rate);
      const amount = emp.finalIncentive || emp.incentiveAmount || Math.round((emp.baseIncentive || 20000000) * factor);

      return `
        <tr class="hover:bg-slate-50">
          <td class="p-3 font-semibold text-slate-700">${emp.id}</td>
          <td class="p-3 font-medium text-slate-900">${emp.name}</td>
          <td class="p-3 text-slate-600">${emp.department}</td>
          <td class="p-3 text-slate-500">${emp.position}</td>
          <td class="p-3 text-right">${emp.target}M ₫</td>
          <td class="p-3 text-right font-medium">${emp.actual}M ₫</td>
          <td class="p-3 text-right font-bold">${IncentiveEngine.formatPercent(rate, 1)}</td>
          <td class="p-3 text-right font-bold text-indigo-700 masked-amount">${IncentiveEngine.formatVND(amount)}</td>
          <td class="p-3 text-center">
            <button onclick="selectRecEmployee('${emp.id}'); switchTab('recommendation');" class="text-indigo-600 hover:underline font-semibold text-xs">
              Đề xuất
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
  // VIEW 5: KIỂM TRA DỮ LIỆU
  // =========================================================================
  function renderValidationQueue() {
    const container = document.getElementById('validation-queue-cards');
    if (!container) return;

    const dung = state.employees.find(e => e.id === 'EMP-004');
    const isDungResolved = dung && dung.duplicateInfo && dung.duplicateInfo.isResolved;

    container.innerHTML = `
      <div class="bg-slate-50 rounded-xl border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">TRÙNG LẶP HỢP ĐỒNG</span>
            <span class="text-xs text-slate-500">Phạm Tiến Dũng (RET-021) &bull; Vận hành Bán lẻ</span>
          </div>
          <h4 class="font-bold text-sm text-slate-900 mt-2">Hợp đồng HĐ-RET-099 trị giá 90.000.000 ₫ bị nhập 2 lần</h4>
          <p class="text-xs text-slate-600 mt-1">
            Ghi nhận doanh số thô 990M ₫ khiến thưởng vọt lên 25M ₫. Thực đạt đúng sau khấu trừ là 900M ₫ (100% → Thưởng 20M ₫).
          </p>
        </div>
        <div>
          <button onclick="resolveDungDuplicate()" class="px-4 py-2 ${isDungResolved ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'} rounded-lg text-xs font-bold transition" ${isDungResolved ? 'disabled' : ''}>
            ${isDungResolved ? 'Đã khấu trừ' : 'Khấu trừ bản ghi trùng (90M ₫)'}
          </button>
        </div>
      </div>
    `;
  }

  window.resolveDungDuplicate = function () {
    const dung = state.employees.find(e => e.id === 'EMP-004');
    if (!dung) return;

    if (dung.duplicateInfo) dung.duplicateInfo.isResolved = true;
    dung.actual = 900;
    dung.validationStatus = 'VALID';
    dung.status = 'CALCULATED';

    renderValidationQueue();
    showToast('Đã khấu trừ hợp đồng trùng 90M ₫ của Phạm Tiến Dũng.');
  };

  // =========================================================================
  // VIEW 6: CHI TRẢ (PAYROLL)
  // =========================================================================
  function renderPayrollView() {
    const activeEmps = getActiveEmployees();
    const totalApproved = activeEmps.reduce((sum, emp) => {
      const target = (emp.target || 1) * (emp.difficultyFactor || 1.0);
      const rate = emp.achievementRate || (target > 0 ? (emp.actual / target) : 0);
      const factor = emp.payoutFactor || IncentiveEngine.calculatePayoutFactor(rate);
      const amount = emp.finalIncentive || emp.incentiveAmount || Math.round((emp.baseIncentive || 20000000) * factor);
      return sum + amount;
    }, 0);

    const totalEl = document.getElementById('payroll-total-approved');
    if (totalEl) totalEl.textContent = IncentiveEngine.formatVND(totalApproved);

    const statusEl = document.getElementById('payroll-budget-status');
    if (statusEl) {
      const usageRate = (totalApproved / 1750000000) * 100;
      const isSafe = totalApproved <= 1750000000;
      statusEl.textContent = `${usageRate.toFixed(1)}% (${isSafe ? 'An toàn' : 'Vượt quỹ'})`;
      statusEl.className = isSafe ? 'text-xl font-bold text-emerald-600 mt-1' : 'text-xl font-bold text-rose-600 mt-1';
    }
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
    const activeEmps = getActiveEmployees();
    let csv = '\uFEFFMã NV,Họ và tên,Phòng ban,Vị trí,Chỉ tiêu,Thực đạt,Tỷ lệ đạt,Khoản thưởng,Trạng thái\n';
    activeEmps.forEach(emp => {
      const target = (emp.target || 1) * (emp.difficultyFactor || 1.0);
      const rateVal = emp.achievementRate || (target > 0 ? (emp.actual / target) : 0);
      const rate = (rateVal * 100).toFixed(1);
      const factor = emp.payoutFactor || IncentiveEngine.calculatePayoutFactor(rateVal);
      const bonus = emp.finalIncentive || emp.incentiveAmount || Math.round((emp.baseIncentive || 20000000) * factor);
      csv += `"${emp.id}","${emp.name}","${emp.department}","${emp.position}",${target * 1000000},${emp.actual * 1000000},${rate}%,${bonus},"Đã duyệt"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PAYROLL_${state.selectedPeriod}_FINAL.csv`;
    link.click();

    showToast(`Đã tải xuống PAYROLL_${state.selectedPeriod}_FINAL.csv thành công!`);
  };

  // Modal Cách tính (Diễn giải tự nhiên, dễ hiểu, không công thức khó nhìn)
  window.openFormulaModal = function (metricKey) {
    const modal = document.getElementById('modal-formula');
    const titleEl = document.getElementById('formula-modal-title');
    const bodyEl = document.getElementById('formula-modal-body');

    if (metricKey === 'weighted_rate') {
      titleEl.textContent = 'Ý nghĩa: Tỷ lệ đạt chỉ tiêu có trọng số';
      bodyEl.innerHTML = `
        <p class="text-slate-700 leading-relaxed">
          Tỷ lệ này phản ánh mức độ hoàn thành công việc thực tế của nhân sự, trong đó mỗi gói hợp đồng được nhân với hệ số quy mô và độ phức tạp tương ứng thay vì chia cào bằng.
        </p>
        <p class="text-slate-600 mt-2">
          Hiện tại toàn công ty đạt trung bình <strong>94,6%</strong> chỉ tiêu được giao.
        </p>
      `;
    } else if (metricKey === 'interim_incentive') {
      titleEl.textContent = 'Ý nghĩa: Thưởng tạm tính đến ngày';
      bodyEl.innerHTML = `
        <p class="text-slate-700 leading-relaxed">
          Ước tính số tiền thưởng nhân viên đã tích lũy tương ứng với tiến độ làm việc tính đến ngày hiện tại trong tháng.
        </p>
        <p class="text-slate-600 mt-2">
          Tính đến ngày công 15/22 (Tuần 3), quỹ thưởng đã tích lũy đạt khoảng <strong>1,30 tỷ ₫</strong> và dự phóng kết thúc kỳ sẽ đạt <strong>1,90 tỷ ₫</strong> nếu duy trì tốc độ này.
        </p>
      `;
    } else if (metricKey === 'budget_usage') {
      titleEl.textContent = 'Ý nghĩa: Chi phí so với Quỹ thưởng';
      bodyEl.innerHTML = `
        <p class="text-slate-700 leading-relaxed">
          So sánh tổng chi phí thưởng dự kiến với hạn mức ngân sách <strong>1,75 tỷ ₫</strong> đã được Hội đồng quản trị phê duyệt cho kỳ Q3/2026.
        </p>
      `;
    } else if (metricKey === 'time_progress') {
      titleEl.textContent = 'Ý nghĩa: Tiến độ thời gian';
      bodyEl.innerHTML = `
        <p class="text-slate-700 leading-relaxed">
          Đã đi qua <strong>15 trên tổng số 22 ngày làm việc</strong> tiêu chuẩn trong tháng (tương đương 68,2% chu kỳ thời gian).
        </p>
      `;
    }

    if (modal) modal.classList.remove('hidden');
  };

  window.closeFormulaModal = function () {
    const modal = document.getElementById('modal-formula');
    if (modal) modal.classList.add('hidden');
  };

  // Privacy Mode
  window.togglePrivacyMode = function () {
    state.privacyMasked = !state.privacyMasked;
    const textEl = document.getElementById('privacy-text');
    const iconEl = document.getElementById('privacy-icon');

    if (state.privacyMasked) {
      document.body.classList.add('privacy-masked');
      if (textEl) textEl.textContent = 'Hiện số tiền';
      if (iconEl) iconEl.className = 'fa-solid fa-eye text-indigo-600';
    } else {
      document.body.classList.remove('privacy-masked');
      if (textEl) textEl.textContent = 'Ẩn số tiền';
      if (iconEl) iconEl.className = 'fa-solid fa-eye-slash text-slate-500';
    }
  };

  function setupHashRouting() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== state.activeTab) switchTab(hash);
    });
    if (window.location.hash) {
      const initHash = window.location.hash.replace('#', '');
      switchTab(initHash);
    }
  }

  window.AppState = state;
})();