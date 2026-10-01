/**
 * APPLICATION CONTROLLER - NỀN TẢNG QUẢN LÝ VÀ ĐỀ XUẤT THƯỞNG
 * Thiết kế tinh giản, trực quan, giống bản gốc, loại bỏ hoàn toàn chi tiết thừa và AI-slop.
 */

(function (global) {
  'use strict';
  const AppAuth = global.AppAuth || (typeof window !== 'undefined' ? window.AppAuth : null);
  const IncentiveEngine = global.IncentiveEngine || (typeof window !== 'undefined' ? window.IncentiveEngine : null);
  const CompensationPlans = global.CompensationPlans || (typeof window !== 'undefined' ? window.CompensationPlans : null);

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
    rejectionTargetId: null,
    privacyMasked: false,
    overviewChartMode: 'line',
    overviewChartInstance: null,
    distributionChartInstance: null,
    routingReady: false,
    bulkApprovalTimer: null,
    bulkApprovalSecondsLeft: 300,
    optimizations: [
      {
        id: 1, category: 'Chỉ tiêu khu vực', title: 'Hạ chỉ tiêu khu vực Đông Nam Bộ',
        description: 'Thị trường khu vực sụt giảm 10,2% do biến động khách quan. Đề xuất áp dụng hệ số 0,9 để ghi nhận công bằng nỗ lực của nhân sự.',
        status: 'PENDING_ADMIN', impact: 6300000, submittedBy: 'Trần Minh Đức', submittedDepartment: 'Kinh doanh Miền Nam', submittedDate: '20/09/2026'
      },
      {
        id: 2, category: 'Bậc thưởng', title: 'Chia nhỏ bậc thưởng gần ngưỡng 100%',
        description: 'Hiện có 20 nhân viên đạt từ 95% đến 99% chỉ tiêu. Đề xuất thêm bậc thưởng trung gian để tránh việc chỉ lệch 1% dẫn đến cách biệt thưởng quá lớn.',
        status: 'PENDING_ADMIN', impact: -12500000, submittedBy: 'Nguyễn Tiến Hưng', submittedDepartment: 'Kinh doanh Miền Bắc', submittedDate: '19/09/2026'
      },
      {
        id: 3, category: 'Trọng số gói việc', title: 'Tính trọng số cho hợp đồng dài hạn B2B',
        description: 'Hợp đồng B2B kéo dài 4–6 tháng cần có trọng số riêng để phản ánh đúng công sức thay vì tính cào bằng với hợp đồng nhỏ.',
        status: 'PENDING_ADMIN', impact: 0, submittedBy: 'Lê Hoàng Nam', submittedDepartment: 'Khách hàng Doanh nghiệp', submittedDate: '18/09/2026'
      }
    ],
    evaluations: [],
    claims: [],
    retentionFunds: []
  };

  const WORKFLOW_STORAGE_KEY = 'incentive_workflow_v1';

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

  function isCurrentPeriod() {
    return state.selectedPeriod === 'Q3_2026';
  }

  function getBaseEmployee(id) {
    return state.employees.find(emp => emp.id === id);
  }

  function formatImpact(amount) {
    if (!amount) return 'Không làm thay đổi quỹ';
    return `${amount > 0 ? '+' : ''}${(amount / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu ₫`;
  }

  function getOverviewContext() {
    const activeEmployees = getActiveEmployees();
    const permittedEmployees = AppAuth.filterEmployeesByPermission(activeEmployees, state.currentUser);
    const employees = state.filterDept === 'ALL'
      ? permittedEmployees
      : permittedEmployees.filter(employee => employee.department === state.filterDept);
    const metrics = IncentiveEngine.calculateBusinessMetrics({
      employees,
      budget: 1750000000,
      workdaysElapsed: state.asOfWorkday,
      totalWorkdays: 22
    });
    return { employees, metrics };
  }

  function getRecommendationRates(employee, allEmployees) {
    const recommendation = SmartRecommendationEngine.computeEmployeeRecommendation(employee, allEmployees, {
      period: state.selectedPeriod.replace('_', '-')
    });
    if (!recommendation) return null;
    const hasWorkflowRate = ['PENDING_ADMIN', 'APPROVED', 'REJECTED'].includes(employee.status) && Number.isFinite(employee.finalRate);
    return {
      recommendation,
      systemRate: recommendation.rProposed,
      systemAmount: recommendation.proposedAmount,
      displayedRate: hasWorkflowRate ? employee.finalRate : recommendation.rProposed,
      displayedAmount: hasWorkflowRate
        ? (employee.finalIncentive || Math.round(recommendation.targetIncentivePersonal * employee.finalRate))
        : recommendation.proposedAmount,
      isWorkflowRate: hasWorkflowRate
    };
  }

  function saveWorkflowState() {
    try {
      const employeeWorkflow = state.employees.map(employee => ({
        id: employee.id,
        status: employee.status,
        finalRate: employee.finalRate,
        finalIncentive: employee.finalIncentive,
        proposalType: employee.proposalType,
        adjustReason: employee.adjustReason,
        rejectionReason: employee.rejectionReason,
        submittedBy: employee.submittedBy,
        submittedDate: employee.submittedDate,
        approvedBy: employee.approvedBy,
        approvedDate: employee.approvedDate,
        difficultyFactor: employee.difficultyFactor,
        target: employee.target,
        actual: employee.actual,
        achievementRate: employee.achievementRate,
        payoutFactor: employee.payoutFactor,
        incentiveAmount: employee.incentiveAmount,
        validationStatus: employee.validationStatus,
        duplicateInfo: employee.duplicateInfo
      }));
      localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify({
        selectedPeriod: state.selectedPeriod,
        optimizations: state.optimizations,
        employeeWorkflow
      }));
    } catch (error) {
      console.warn('Không thể lưu trạng thái workflow:', error);
    }
  }

  function restoreWorkflowState() {
    try {
      const saved = JSON.parse(localStorage.getItem(WORKFLOW_STORAGE_KEY) || 'null');
      if (!saved) return;
      state.selectedPeriod = saved.selectedPeriod || state.selectedPeriod;
      if (Array.isArray(saved.optimizations)) state.optimizations = saved.optimizations;
      if (Array.isArray(saved.employeeWorkflow)) {
        saved.employeeWorkflow.forEach(savedEmployee => {
          const employee = getBaseEmployee(savedEmployee.id);
          if (!employee) return;
          Object.assign(employee, savedEmployee);
        });
      }
    } catch (error) {
      console.warn('Không thể khôi phục trạng thái workflow:', error);
      localStorage.removeItem(WORKFLOW_STORAGE_KEY);
    }
  }

  // Khởi động
  document.addEventListener('DOMContentLoaded', async () => {
    state.currentUser = AppAuth.getCurrentUser();
    state.employees = BenchmarkDataset.generateBenchmarkDataset();

    // 4 nhân vật neo đề án:
    const an = state.employees.find(e => e.id === 'EMP-001');
    if (an) {
      an.status = 'APPROVED';
      an.finalRate = 1.375;
      an.finalIncentive = 27500000;
      an.incentiveAmount = 27500000;
    }

    const binh = state.employees.find(e => e.id === 'EMP-002');
    if (binh) {
      binh.difficultyFactor = 0.9;
      binh.finalRate = 0.815;
      binh.finalIncentive = 16300000;
      binh.incentiveAmount = 16300000;
    }

    const chi = state.employees.find(e => e.id === 'EMP-003');
    if (chi) {
      chi.status = 'APPROVED';
      chi.finalRate = 1.00;
      chi.finalIncentive = 20000000;
      chi.incentiveAmount = 20000000;
    }

    const dung = state.employees.find(e => e.id === 'EMP-004');
    if (dung) {
      dung.status = 'APPROVED';
      dung.finalRate = 1.00;
      dung.finalIncentive = 20000000;
      dung.incentiveAmount = 20000000;
    }

    restoreWorkflowState();

    if (window.SmartRecommendationEngine) {
      await SmartRecommendationEngine.loadMLPredictions();
    }
    if (window.CompensationPlans) {
      await CompensationPlans.loadPlans();
    }
    try {
      const [evaluations, claims, funds] = await Promise.all([
        fetch('data/performance_evaluations.json').then(r => r.json()),
        fetch('data/expectation_claims.json').then(r => r.json()),
        fetch('data/retention_fund.json').then(r => r.json())
      ]);
      state.evaluations = evaluations; state.claims = claims; state.retentionFunds = funds;
    } catch (_) { /* Chạy qua file:// vẫn có thể thao tác với dữ liệu trong phiên. */ }

    if (!state.currentUser) {
      showLoginScreen();
      return;
    }
    startUserSession();
  });

  function startUserSession() {
    document.getElementById('login-screen')?.classList.add('hidden');
    renderUserSidebar();
    renderSidebarNav();

    if (state.currentUser.role === 'employee') {
      switchTab('slip');
    } else {
      switchTab('overview');
    }

    if (!state.routingReady) {
      setupHashRouting();
      state.routingReady = true;
    }
  }

  function showLoginScreen() {
    document.getElementById('login-screen')?.classList.remove('hidden');
    document.getElementById('login-error')?.classList.add('hidden');
  }

  window.fillDemoAccount = function (roleKey) {
    const auth = window.AppAuth || (typeof AppAuth !== 'undefined' ? AppAuth : null);
    const account = auth?.SAMPLE_ACCOUNTS ? auth.SAMPLE_ACCOUNTS[roleKey] : null;
    if (!account) return;
    const username = document.getElementById('login-username');
    const password = document.getElementById('login-password');
    if (username) username.value = account.username;
    if (password) password.value = account.demoPassword;
    document.getElementById('login-error')?.classList.add('hidden');
    // Đăng nhập tự động mượt mà
    if (typeof window.submitLogin === 'function') {
      window.submitLogin();
    }
  };

  window.submitLogin = function (event) {
    if (event && event.preventDefault) event.preventDefault();
    const auth = window.AppAuth || (typeof AppAuth !== 'undefined' ? AppAuth : null);
    if (!auth) {
      console.error('AppAuth is not loaded yet');
      return;
    }
    const username = document.getElementById('login-username')?.value.trim();
    const password = document.getElementById('login-password')?.value || '';
    const result = auth.login(username, password);
    if (!result.success) {
      const error = document.getElementById('login-error');
      if (error) { error.textContent = result.message; error.classList.remove('hidden'); }
      return;
    }
    state.currentUser = result.user;
    startUserSession();
    showToast(`Chào mừng ${result.user.name}.`);
  };

  window.logoutApp = function () {
    AppAuth.logout();
    state.currentUser = null;
    window.location.hash = '';
    showLoginScreen();
  };

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
    const periodLabel = document.getElementById('sidebar-period-label');
    const globalPeriodSelect = document.getElementById('select-period-global');
    if (periodLabel) periodLabel.textContent = state.selectedPeriod.replace('_', '/');
    if (globalPeriodSelect) globalPeriodSelect.value = state.selectedPeriod;

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
        { id: 'slip', label: 'Phiếu thưởng của tôi', icon: 'fa-receipt' }
      ];
    } else if (role === 'manager') {
      items = [
        { id: 'overview', label: 'Tổng quan', icon: 'fa-house' },
        { id: 'recommendation', label: 'Đề xuất mức thưởng', icon: 'fa-calculator' },
        { id: 'evaluation', label: 'Đánh giá & lịch sử', icon: 'fa-star' },
        { id: 'employees', label: 'Danh sách nhân sự', icon: 'fa-users' },
        { id: 'validation', label: 'Xét duyệt & kiểm tra', icon: 'fa-clipboard-check' }
      ];
    } else {
      // Admin
      items = [
        { id: 'overview', label: 'Tổng quan', icon: 'fa-house' },
        { id: 'schemes', label: 'Cấu hình cơ chế thưởng theo phòng ban', icon: 'fa-layer-group' },
        { id: 'recommendation', label: 'Đề xuất mức thưởng', icon: 'fa-calculator' },
        { id: 'evaluation', label: 'Đánh giá & lịch sử', icon: 'fa-star' },
        { id: 'employees', label: 'Danh sách nhân sự', icon: 'fa-users' },
        { id: 'validation', label: 'Xét duyệt & kiểm tra', icon: 'fa-clipboard-check' },
        { id: 'payroll', label: 'Chi trả thưởng', icon: 'fa-file-invoice-dollar' }
      ];
    }

    nav.innerHTML = items.map(it => {
      const active = (state.activeTab === it.id);
      const activeClasses = active
        ? 'text-white bg-teal-600 font-semibold shadow-sm'
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
  function switchTab(tabId) {
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
    if (tabId === 'comp-plans') renderCompPlans();
    if (tabId === 'recommendation') renderRecommendationView();
    if (tabId === 'slip') renderSlipView();
    if (tabId === 'employees') renderEmployeesTable();
    if (tabId === 'validation') renderValidationQueue();
    if (tabId === 'evaluation') renderEvaluationView();
    if (tabId === 'schemes') renderDepartmentSchemesView();
    if (tabId === 'payroll') renderPayrollView();
  }
  window.switchTab = switchTab;

  function updatePageHeader(tabId) {
    const titleEl = document.getElementById('page-title');
    const subEl = document.getElementById('page-subtitle');
    const periodStr = state.selectedPeriod.replace('_', '/');
    const titles = {
      overview: { t: 'Tổng quan', s: `Tiến độ hoàn thành chỉ tiêu và dự phóng quỹ thưởng kỳ ${periodStr}` },
      'comp-plans': { t: 'Cấu hình cơ chế thưởng theo phòng ban', s: 'Thư viện nguồn tính thưởng, version và phê duyệt tập trung' },
      recommendation: { t: 'Đề xuất mức thưởng thông minh', s: 'Tổng hợp từ quy chế công ty, dữ liệu lịch sử và đánh giá của quản lý' },
      schemes: { t: 'Cơ chế thưởng theo phòng ban', s: 'Quản lý cấu hình nguồn tính thưởng cho từng phòng ban, kiểm soát trần/sàn chống cảm tính và theo dõi phiên bản chính sách' },
      employees: { t: 'Danh sách nhân sự & chỉ tiêu', s: `Theo dõi tiến độ hoàn thành chỉ tiêu toàn bộ nhân viên kỳ ${periodStr}` },
      validation: { t: 'Xét duyệt đề xuất & kiểm tra dữ liệu', s: 'Phê duyệt đề xuất từ quản lý và rà soát các trường hợp bất thường' },
      evaluation: { t: 'Đánh giá quản lý & lịch sử hiệu suất', s: 'Chuẩn hóa đánh giá và tra cứu kết quả nhiều kỳ' },
      payroll: { t: 'Chi trả thưởng & xuất bảng lương', s: `Đối soát tổng ngân sách và xuất file CSV kỳ ${periodStr} sang phòng Kế toán` },
      slip: { t: 'Phiếu thưởng cá nhân', s: `Bản giải trình chi tiết cách tính khoản thưởng kỳ ${periodStr}` }
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
    const { metrics } = getOverviewContext();

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
    const timeNoteEl = document.getElementById('metric-time-progress-note');
    if (timeNoteEl) timeNoteEl.textContent = `Đã qua ${state.asOfWorkday}/22 ngày làm việc`;
    const paceEl = document.getElementById('metric-completion-pace');
    if (paceEl) {
      const pace = metrics.progressVsTime > 0 ? metrics.avgWeightedRate / metrics.progressVsTime : 0;
      paceEl.textContent = `Tốc độ hoàn thành: ${pace.toFixed(2).replace('.', ',')} lần`;
    }

    renderOverviewChart();
    renderDistributionChart();
    renderOptimizationCards();
    renderDepartmentComparison();
  }

  function renderDepartmentComparison() {
    const panel = document.getElementById('department-comparison-panel');
    const container = document.getElementById('department-comparison-list');
    if (!panel || !container) return;
    panel.classList.remove('hidden');
    const employees = getActiveEmployees();
    const groups = [...new Set(employees.map(e => e.department))];
    const curPeriod = state.selectedPeriod.replace('_', '-');

    // Tính mức thưởng trung bình toàn công ty làm chuẩn đối chuẩn
    const allRates = employees.map(e => getRecommendationRates(e, employees)?.displayedRate || 0);
    const companyAvg = allRates.length ? allRates.reduce((a, b) => a + b, 0) / allRates.length : 1.0;

    container.innerHTML = groups.map(department => {
      const deptEmps = employees.filter(e => e.department === department);
      const rates = deptEmps.map(e => getRecommendationRates(e, employees)?.displayedRate || 0).sort((a, b) => a - b);
      const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
      const min = rates[0] || 0, max = rates[rates.length - 1] || 0;

      const plan = window.CompensationPlans ? CompensationPlans.getPlanForPeriod(department, curPeriod) : null;
      const planLabel = plan
        ? `v${plan.version} (${plan.sources.map(s => `${(s.weight * 100).toFixed(0)}% ${s.type === 'RULE_BASED' ? 'Quy chế' : s.type === 'ML_PREDICTION' ? 'Học máy' : s.type === 'MANAGER_EVAL' ? 'Quản lý' : 'Doanh thu'}`).join(', ')})`
        : 'Công thức chuẩn';

      // Kiểm định công bằng liên phòng ban (Cross-Department Equity Check)
      const diffFromCompany = Math.abs(avg - companyAvg);
      const isBalanced = diffFromCompany <= 0.12;

      return `
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2.5">
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <strong class="text-slate-900 font-semibold text-xs">${department}</strong>
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">${deptEmps.length} NV</span>
              </div>
              <div class="text-[11px] text-teal-800 font-medium mt-0.5">${planLabel}</div>
            </div>
            ${isBalanced ? `
              <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <i class="fa-solid fa-check"></i> Cân bằng chuẩn
              </span>
            ` : `
              <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1" title="Mức chi trả bình quân lệch so với toàn công ty">
                <i class="fa-solid fa-triangle-exclamation"></i> Lệch ${(diffFromCompany * 100).toFixed(1)}% so với TB
              </span>
            `}
          </div>

          <div class="space-y-1">
            <div class="flex justify-between text-[11px] text-slate-500">
              <span>Hệ số chi trả TB: <strong class="text-slate-800 font-bold font-mono">${IncentiveEngine.formatPercent(avg, 1)}</strong></span>
              <span>Dải phân bổ: <strong class="font-mono text-slate-700">${IncentiveEngine.formatPercent(min, 0)} – ${IncentiveEngine.formatPercent(max, 0)}</strong></span>
            </div>
            <div class="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div class="h-full bg-teal-600 rounded-full transition-all" style="width:${Math.min(100, avg / 1.5 * 100)}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderOverviewChart() {
    const ctx = document.getElementById('overviewTrendsChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (state.overviewChartInstance) {
      state.overviewChartInstance.destroy();
    }

    const subTitle = document.getElementById('chart-sub-title');
    const curPeriodStr = state.selectedPeriod.replace('_', '/');

    if (state.overviewChartMode === 'line') {
      if (subTitle) subTitle.textContent = `Đường xu hướng qua 5 kỳ liên tiếp (Đang xem: ${curPeriodStr})`;
      
      const periods = ['Q3/2025', 'Q4/2025', 'Q1/2026', 'Q2/2026', 'Q3/2026'];
      const pointRadii = periods.map(p => p === curPeriodStr ? 7 : 4);
      const pointColors = periods.map(p => p === curPeriodStr ? '#0E5A55' : '#147A73');

      state.overviewChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Q3/2025', 'Q4/2025', 'Q1/2026', 'Q2/2026', 'Q3/2026'],
          datasets: [
            {
              label: 'Tỷ lệ đạt chỉ tiêu (%)',
              data: [92.4, 96.8, 98.2, 95.5, 94.6],
              borderColor: '#0E5A55',
              backgroundColor: 'rgba(14, 90, 85, 0.08)',
              borderWidth: 2.5,
              fill: true,
              tension: 0.25,
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
            backgroundColor: ['#0E5A55', '#147A73', '#1F9D93', '#45B6AD'],
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
    if (!ctx || typeof Chart === 'undefined') return;

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
          backgroundColor: ['#f43f5e', '#f59e0b', '#0E5A55', '#059669'],
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
      btnLine.className = 'px-2.5 py-1 rounded-lg bg-teal-600 text-white font-medium';
      btnBar.className = 'px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium';
    } else {
      btnBar.className = 'px-2.5 py-1 rounded-lg bg-teal-600 text-white font-medium';
      btnLine.className = 'px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium';
    }
    renderOverviewChart();
  };

  // Bộ lọc
  window.handlePeriodChange = function (periodVal) {
    state.selectedPeriod = periodVal;
    saveWorkflowState();

    const overviewPeriodSelect = document.getElementById('select-period');
    const globalPeriodSelect = document.getElementById('select-period-global');
    if (overviewPeriodSelect) overviewPeriodSelect.value = periodVal;
    if (globalPeriodSelect) globalPeriodSelect.value = periodVal;

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

    renderUserSidebar();
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

  // Đề xuất và xét duyệt tối ưu cơ chế thưởng
  function renderOptimizationCards() {
    const list = document.getElementById('scheme-optimizations-list');
    const title = document.getElementById('optimization-panel-title');
    const subtitle = document.getElementById('optimization-panel-subtitle');
    const createBtn = document.getElementById('btn-create-optimization');
    const approveAllBtn = document.getElementById('btn-approve-all-optimizations');
    if (!list) return;

    const isAdmin = state.currentUser.role === 'admin';
    const isManager = state.currentUser.role === 'manager';
    const visible = isManager
      ? state.optimizations.filter(item => item.submittedDepartment === state.currentUser.department)
      : state.optimizations;

    if (title) title.textContent = isAdmin ? 'Đề xuất tối ưu cơ chế thưởng cần xét duyệt' : 'Đề xuất tối ưu cơ chế thưởng';
    if (subtitle) subtitle.textContent = isAdmin
      ? 'Các đề xuất từ quản lý khu vực, chờ C&B phê duyệt trước khi áp dụng'
      : 'Gửi đề xuất điều chỉnh cơ chế từ dữ liệu thực tế của khu vực phụ trách';
    if (createBtn) createBtn.classList.toggle('hidden', !isManager);
    if (approveAllBtn) approveAllBtn.classList.toggle('hidden', !isAdmin || !visible.some(item => item.status === 'PENDING_ADMIN'));

    if (visible.length === 0) {
      list.innerHTML = '<div class="md:col-span-3 p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">Chưa có đề xuất cơ chế nào từ khu vực này.</div>';
      return;
    }

    list.innerHTML = visible.map(item => {
      const status = item.status === 'APPROVED'
        ? '<span class="text-emerald-700 font-semibold">Đã áp dụng</span>'
        : item.status === 'REJECTED'
          ? '<span class="text-rose-700 font-semibold">Không chấp thuận</span>'
          : '<span class="text-amber-800 font-semibold">Chờ C&B duyệt</span>';
      const actions = isAdmin && item.status === 'PENDING_ADMIN'
        ? `<div class="flex items-center gap-2"><button onclick="rejectOptimization(${item.id})" class="px-2.5 py-1 border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold rounded text-[11px]">Từ chối</button><button onclick="approveSingleOptimization(${item.id})" class="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded text-[11px]">Phê duyệt</button></div>`
        : `<span class="text-[11px] text-slate-400">${item.submittedBy} · ${item.submittedDate}</span>`;
      return `<article class="p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between gap-3">
        <div class="space-y-2"><div class="flex items-start justify-between gap-3 text-xs"><span class="font-semibold text-teal-700">${item.category}</span><span class="text-slate-500 text-right">${formatImpact(item.impact)}</span></div><h4 class="font-semibold text-slate-900 text-sm">${item.title}</h4><p class="text-xs leading-relaxed text-slate-600">${item.description}</p><p class="text-[11px] text-slate-400">Đề xuất bởi ${item.submittedBy} · ${item.submittedDepartment}</p></div>
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between">${status}${actions}</div></article>`;
    }).join('');
  }

  function applyApprovedOptimization(opt) {
    if (opt.id !== 1) return;
    const binh = getBaseEmployee('EMP-002');
    if (!binh) return;
    binh.difficultyFactor = 0.9;
    binh.target = 900;
    if (binh.tasks) binh.tasks.forEach(task => { task.difficultyFactor = 0.9; });
  }

  window.approveSingleOptimization = function (optId) {
    if (state.currentUser.role !== 'admin') return showToast('Chỉ C&B mới có quyền phê duyệt cơ chế.', 'warning');
    const opt = state.optimizations.find(item => item.id === optId);
    if (!opt || opt.status !== 'PENDING_ADMIN') return;
    opt.status = 'APPROVED';
    applyApprovedOptimization(opt);
    saveWorkflowState();
    renderOverview();
    showToast(`Đã phê duyệt và áp dụng: ${opt.title}`);
  };

  window.rejectOptimization = function (optId) {
    if (state.currentUser.role !== 'admin') return showToast('Chỉ C&B mới có quyền xét duyệt cơ chế.', 'warning');
    const opt = state.optimizations.find(item => item.id === optId);
    if (!opt || opt.status !== 'PENDING_ADMIN') return;
    opt.status = 'REJECTED';
    saveWorkflowState();
    renderOverview();
    showToast(`Đã từ chối đề xuất: ${opt.title}`, 'warning');
  };

  window.openOptimizationModal = function () {
    if (state.currentUser.role !== 'manager') return showToast('Chỉ quản lý khu vực có thể tạo đề xuất cơ chế.', 'warning');
    if (!isCurrentPeriod()) return showToast('Kỳ đã chốt chỉ cho phép xem dữ liệu.', 'warning');
    document.getElementById('modal-optimization')?.classList.remove('hidden');
  };

  window.closeOptimizationModal = function () {
    document.getElementById('modal-optimization')?.classList.add('hidden');
  };

  window.submitOptimizationProposal = function () {
    if (state.currentUser.role !== 'manager') return showToast('Bạn không có quyền gửi đề xuất cơ chế.', 'warning');
    const category = document.getElementById('input-optimization-category')?.value || 'Khác';
    const title = document.getElementById('input-optimization-title')?.value.trim() || '';
    const description = document.getElementById('input-optimization-description')?.value.trim() || '';
    const impact = Number(document.getElementById('input-optimization-impact')?.value || 0) * 1000000;
    if (!title || !description) return showToast('Vui lòng nhập tên đề xuất và căn cứ thực tế.', 'warning');
    state.optimizations.unshift({
      id: Date.now(), category, title, description, impact, status: 'PENDING_ADMIN',
      submittedBy: state.currentUser.name, submittedDepartment: state.currentUser.department,
      submittedDate: new Date().toLocaleDateString('vi-VN')
    });
    saveWorkflowState();
    closeOptimizationModal();
    document.getElementById('input-optimization-title').value = '';
    document.getElementById('input-optimization-description').value = '';
    document.getElementById('input-optimization-impact').value = '0';
    renderOptimizationCards();
    showToast('Đã gửi đề xuất cơ chế đến C&B xét duyệt.');
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
    if (state.currentUser.role !== 'admin') return;
    state.optimizations.filter(item => item.status === 'PENDING_ADMIN').forEach(item => { item.status = 'APPROVED'; applyApprovedOptimization(item); });
    saveWorkflowState();

    if (state.activeTab === 'overview') renderOverview();
    if (state.activeTab === 'slip') renderSlipView();
    if (state.activeTab === 'recommendation') renderRecommendationView();
    if (state.activeTab === 'employees') renderEmployeesTable();

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

    renderOptimizationCards();
    showToast('Đã duyệt toàn bộ đề xuất chính sách.');
  };

  window.undoBulkApproval = function () {
    clearInterval(state.bulkApprovalTimer);
    state.optimizations.forEach(o => { if (o.status === 'APPROVED') o.status = 'PENDING_ADMIN'; });

    const binh = getBaseEmployee('EMP-002');
    if (binh) { binh.difficultyFactor = 1.0; binh.target = 1000; if (binh.tasks) binh.tasks.forEach(task => { task.difficultyFactor = 1.0; }); }
    saveWorkflowState();

    if (state.activeTab === 'overview') renderOverview();
    if (state.activeTab === 'slip') renderSlipView();
    if (state.activeTab === 'recommendation') renderRecommendationView();
    if (state.activeTab === 'employees') renderEmployeesTable();

    const undoCard = document.getElementById('opt-undo-countdown');
    const undoBtn = document.getElementById('btn-undo-approval');
    const approveAllBtn = document.getElementById('btn-approve-all-optimizations');

    if (undoCard) undoCard.classList.add('hidden');
    if (undoBtn) undoBtn.classList.add('hidden');
    if (approveAllBtn) approveAllBtn.classList.remove('hidden');

    renderOptimizationCards();
    showToast('Đã hoàn tác quyết định duyệt.', 'warning');
  };

  // =========================================================================
  // VIEW 2: ĐỀ XUẤT MỨC THƯỞNG THÔNG MINH
  // =========================================================================
  function renderRecommendationView() {
    const activeEmployees = getActiveEmployees();
    const visibleEmployees = AppAuth.filterEmployeesByPermission(activeEmployees, state.currentUser);
    if (!visibleEmployees.some(employee => employee.id === state.selectedRecEmpId)) {
      state.selectedRecEmpId = visibleEmployees[0] ? visibleEmployees[0].id : null;
    }
    const countEl = document.getElementById('rec-team-count');
    if (countEl) countEl.textContent = `${visibleEmployees.length} nhân sự`;

    // Cập nhật 3 nút chọn nhanh nhân sự đại diện
    ['EMP-002', 'EMP-001', 'EMP-004'].forEach(id => {
      const btn = document.getElementById(`btn-quick-${id}`);
      if (btn) {
        btn.classList.toggle('hidden', !visibleEmployees.some(employee => employee.id === id));
        if (state.selectedRecEmpId === id) {
          btn.className = 'p-2 border border-teal-600 bg-teal-50 text-teal-900 font-bold rounded-lg text-xs hover:bg-teal-100 transition shadow-sm';
        } else {
          btn.className = 'p-2 border border-slate-200 bg-slate-50 text-slate-700 font-medium rounded-lg text-xs hover:bg-slate-100 transition';
        }
      }
    });

    // Danh sách bên trái kèm trạng thái
    const listEl = document.getElementById('rec-employee-list');
    if (listEl) {
      listEl.innerHTML = visibleEmployees.map(emp => {
        const rates = getRecommendationRates(emp, activeEmployees);
        const isSelected = emp.id === state.selectedRecEmpId;
        const activeClass = isSelected
          ? 'bg-teal-50 border-teal-500 text-teal-950 font-bold'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';

        let statusBadge = '';
        if (emp.status === 'PENDING_ADMIN') {
          statusBadge = '<span class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200"><span class="w-1 h-1 rounded-full bg-amber-500"></span> Chờ duyệt</span>';
        } else if (emp.status === 'APPROVED') {
          statusBadge = '<span class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"><span class="w-1 h-1 rounded-full bg-emerald-500"></span> Đã duyệt</span>';
        } else if (emp.status === 'REJECTED') {
          statusBadge = '<span class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200"><span class="w-1 h-1 rounded-full bg-rose-500"></span> Từ chối</span>';
        }

        return `
          <div onclick="selectRecEmployee('${emp.id}')" class="p-2.5 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition ${activeClass}">
            <div class="flex items-center gap-2.5">
              <span class="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 border border-slate-200/60">${emp.avatar}</span>
              <div>
                <div class="font-semibold text-slate-900 leading-tight">${emp.name}</div>
                <div class="text-slate-400 font-mono text-[10px]">${emp.code}</div>
              </div>
            </div>
            <div class="text-right flex flex-col items-end gap-0.5">
              <span class="font-bold font-mono text-slate-900 tabular-nums">${IncentiveEngine.formatPercent(rates ? rates.displayedRate : 0, 1)}</span>
              ${statusBadge}
            </div>
          </div>
        `;
      }).join('');
    }

    const emp = activeEmployees.find(e => e.id === state.selectedRecEmpId) || visibleEmployees[0];
    if (!emp) return;

    const rates = getRecommendationRates(emp, activeEmployees);
    if (!rates) return;
    const rec = rates.recommendation;

    // Header nhân sự
    const nameEl = document.getElementById('rec-detail-name');
    const codeEl = document.getElementById('rec-detail-code');
    const roleEl = document.getElementById('rec-detail-role');
    const avatarEl = document.getElementById('rec-detail-avatar');
    const statusPill = document.getElementById('rec-detail-status-pill');

    if (nameEl) nameEl.textContent = emp.name;
    if (codeEl) codeEl.textContent = emp.code;
    if (roleEl) roleEl.textContent = `${emp.position} • ${emp.department}`;
    if (avatarEl) avatarEl.textContent = emp.avatar;

    if (statusPill) {
      if (emp.status === 'PENDING_ADMIN') {
        statusPill.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5';
        statusPill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Chờ Admin duyệt';
        statusPill.classList.remove('hidden');
      } else if (emp.status === 'APPROVED') {
        statusPill.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5';
        statusPill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đã duyệt chính thức';
        statusPill.classList.remove('hidden');
      } else if (emp.status === 'REJECTED') {
        statusPill.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1.5';
        statusPill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Bị từ chối';
        statusPill.classList.remove('hidden');
      } else {
        statusPill.classList.add('hidden');
      }
    }

    // Các nút thao tác theo vai trò và trạng thái
    const actionContainer = document.getElementById('rec-action-buttons-container');
    if (actionContainer) {
      const role = state.currentUser.role;
      if (!isCurrentPeriod()) {
        actionContainer.innerHTML = '<span class="px-3 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold">Dữ liệu kỳ đã chốt · chỉ xem</span>';
      } else if (role === 'manager') {
        if (emp.status === 'PENDING_ADMIN') {
          actionContainer.innerHTML = `
            <span class="px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <i class="fa-solid fa-clock text-amber-600"></i> Đã gửi đề xuất — Chờ Admin duyệt
            </span>
            <button onclick="openAdjustModal()" class="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-semibold text-xs text-slate-700">
              Sửa lại
            </button>
          `;
        } else if (emp.status === 'APPROVED') {
          actionContainer.innerHTML = `
            <span class="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <i class="fa-solid fa-check text-emerald-600"></i> Đã được phê duyệt chính thức
            </span>
          `;
        } else if (emp.status === 'REJECTED') {
          actionContainer.innerHTML = `
            <span class="px-3 py-2 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <i class="fa-solid fa-xmark text-rose-600"></i> Đề xuất bị từ chối
            </span>
            <button onclick="openAdjustModal()" class="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-xs">
              Đề xuất lại
            </button>
          `;
        } else {
          actionContainer.innerHTML = `
            <button onclick="openAdjustModal()" class="px-3.5 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-semibold text-xs text-slate-700">
              Điều chỉnh mức khác
            </button>
            <button onclick="agreeProposedRate()" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-xs shadow-sm">
              Đồng ý mức đề xuất
            </button>
          `;
        }
      } else if (role === 'admin') {
        if (emp.status === 'PENDING_ADMIN') {
          actionContainer.innerHTML = `
            <button onclick="openRejectModal('${emp.id}')" class="px-3.5 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg font-semibold text-xs">
              Từ chối
            </button>
            <button onclick="adminApproveProposal('${emp.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs shadow-sm flex items-center gap-1.5">
              <i class="fa-solid fa-check"></i> Phê duyệt mức này
            </button>
          `;
        } else if (emp.status === 'APPROVED') {
          actionContainer.innerHTML = `
            <span class="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <i class="fa-solid fa-check text-emerald-600"></i> Đã phê duyệt chính thức
            </span>
            <button onclick="openAdjustModal()" class="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-semibold text-xs text-slate-700">
              Điều chỉnh lại
            </button>
          `;
        } else {
          actionContainer.innerHTML = '<span class="px-3 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold">Chờ quản lý gửi đề xuất</span>';
        }
      }
    }

    // Hiển thị số liệu đề xuất
    const propRateEl = document.getElementById('rec-detail-proposed-rate');
    const propAmountEl = document.getElementById('rec-detail-proposed-amount');
    const effectiveRate = rates.displayedRate;
    const effectiveAmount = rates.displayedAmount;

    if (propRateEl) propRateEl.textContent = IncentiveEngine.formatPercent(effectiveRate, 1);
    if (propAmountEl) propAmountEl.textContent = IncentiveEngine.formatVND(effectiveAmount);

    const proposalLabel = document.getElementById('rec-detail-proposal-label');
    if (proposalLabel) {
      proposalLabel.textContent = rates.isWorkflowRate
        ? (emp.status === 'APPROVED' ? 'Mức thưởng đã được phê duyệt:' : 'Mức quản lý đề xuất:')
        : 'Mức thưởng hệ thống đề xuất:';
    }

    // Các thẻ nguồn đóng góp được sinh theo cấu hình phòng ban của kỳ đang xem.
    const sourceContainer = document.getElementById('rec-source-breakdown');
    const breakdownTitle = document.getElementById('rec-breakdown-title');
    const sourceLabels = { RULE_BASED: 'Theo quy chế công ty', ML_PREDICTION: 'Dự báo dữ liệu lịch sử', MANAGER_EVAL: 'Đánh giá của quản lý', KPI_REVENUE: 'KPI doanh thu' };
    if (sourceContainer && rec.breakdown && rec.breakdown.length) {
      if (breakdownTitle) breakdownTitle.textContent = `${rec.breakdown.length} nguồn căn cứ cấu thành mức đề xuất${rec.plan ? ` · Cấu hình v${rec.plan.version}` : ''}`;
      sourceContainer.className = `grid grid-cols-1 md:grid-cols-${Math.min(rec.breakdown.length, 4)} gap-3`;
      sourceContainer.innerHTML = rec.breakdown.map(item => `
        <div class="p-3.5 rounded-lg border border-slate-200/80 bg-white">
          <div class="text-[11px] text-slate-500 font-semibold">${sourceLabels[item.type] || item.type} (${(item.weight * 100).toFixed(0)}%)</div>
          <div class="text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">${IncentiveEngine.formatPercent(item.rate, 1)}</div>
          <div class="text-xs text-slate-500 mt-0.5">Đóng góp: ${IncentiveEngine.formatPercent(item.contribution, 1)}.</div>
        </div>`).join('');
    }

    // Tương thích các ID cũ trong giao diện mẫu.
    const rRuleEl = document.getElementById('rec-card-rule-rate');
    const rRuleDesc = document.getElementById('rec-card-rule-desc');
    if (rRuleEl) rRuleEl.textContent = IncentiveEngine.formatPercent(rec.rRule, 1);
    if (rRuleDesc) rRuleDesc.textContent = `Tỷ lệ đạt có trọng số: ${IncentiveEngine.formatPercent(rec.weightedRate, 1)}.`;

    const rMLEl = document.getElementById('rec-card-ml-rate');
    const rMLDesc = document.getElementById('rec-card-ml-desc');
    if (rMLEl) rMLEl.textContent = IncentiveEngine.formatPercent(rec.rML, 1);
    if (rMLDesc) rMLDesc.textContent = `Biên độ kỳ vọng: từ ${IncentiveEngine.formatPercent(rec.intervalP10, 0)} đến ${IncentiveEngine.formatPercent(rec.intervalP90, 0)}.`;

    const rMgrEl = document.getElementById('rec-card-mgr-delta');
    const rMgrDesc = document.getElementById('rec-card-mgr-desc');
    const mgrSigned = (rec.deltaManager >= 0 ? '+' : '') + (rec.deltaManager * 100).toFixed(1) + '%';
    if (rMgrEl) rMgrEl.textContent = mgrSigned;
    if (rMgrDesc) rMgrDesc.textContent = `Điểm chấm quản lý: ${rec.managerRawScore}/5,0.`;

    // Cập nhật công thức tính toán trực quan, tự nhiên
    const fStep1 = document.getElementById('rec-formula-step1-values');
    const fStep1Sub = document.getElementById('rec-formula-step1-sub');
    if (fStep1) {
      if (rec.breakdown && rec.breakdown.length) {
        const partsMath = rec.breakdown.map(item => `(${(item.weight * 100).toFixed(0)}% × ${IncentiveEngine.formatPercent(item.rate, 1)})`);
        fStep1.textContent = `= ${partsMath.join(' + ')} = ${IncentiveEngine.formatPercent(rec.rProposed, 1)}`;
        if (fStep1Sub) {
          const partsSub = rec.breakdown.map(item => `${(item.contribution * 100).toFixed(1)}% từ ${item.label || item.type}`);
          fStep1Sub.textContent = `Trong đó: ${partsSub.join(' + ')}.`;
        }
      } else {
        const rRulePct = IncentiveEngine.formatPercent(rec.rRule, 1);
        const rMLPct = IncentiveEngine.formatPercent(rec.rML, 1);
        const mgrSignText = rec.deltaManager >= 0 ? `+ ${(rec.deltaManager * 100).toFixed(1)}%` : `- ${Math.abs(rec.deltaManager * 100).toFixed(1)}%`;
        const rPropPct = IncentiveEngine.formatPercent(rec.rProposed, 1);
        fStep1.textContent = `= (70% × ${rRulePct}) + (30% × ${rMLPct}) ${mgrSignText} = ${rPropPct}`;
        if (fStep1Sub) {
          const pRule = (0.7 * rec.rRule * 100).toFixed(2);
          const pML = (0.3 * rec.rML * 100).toFixed(2);
          const pMgr = (rec.deltaManager * 100).toFixed(1);
          fStep1Sub.textContent = `Trong đó: ${pRule}% từ quy chế + ${pML}% từ dữ liệu lịch sử + ${pMgr}% từ đánh giá của quản lý.`;
        }
      }
    }

    const fStep2 = document.getElementById('rec-formula-step2-values');
    const fStep2Sub = document.getElementById('rec-formula-step2-sub');
    if (fStep2) {
      const targetInc = IncentiveEngine.formatVND(rec.targetIncentivePersonal);
      const rPropPct = IncentiveEngine.formatPercent(rec.rProposed, 1);
      const finalAmount = IncentiveEngine.formatVND(rec.proposedAmount);
      fStep2.textContent = `= ${targetInc} × ${rPropPct} = ${finalAmount}`;
      if (fStep2Sub) {
        fStep2Sub.textContent = `Mức thưởng chuẩn của vị trí là ${targetInc}/kỳ khi hoàn thành 100% chỉ tiêu.`;
      }
    }

    // Căn cứ giải thích
    const expEl = document.getElementById('rec-explanation-container');
    if (expEl) {
      const workflowNote = rates.isWorkflowRate && Math.abs(rates.displayedRate - rec.rProposed) > 0.0001
        ? `<div class="mt-3 pt-3 border-t border-slate-200"><strong>${emp.status === 'APPROVED' ? 'Mức đã phê duyệt' : 'Mức quản lý trình duyệt'}: ${IncentiveEngine.formatPercent(rates.displayedRate, 1)}</strong> (${IncentiveEngine.formatVND(rates.displayedAmount)}), so với mức hệ thống đề xuất ${IncentiveEngine.formatPercent(rec.rProposed, 1)}. ${emp.adjustReason ? `Lý do: ${emp.adjustReason}` : ''}</div>`
        : '';
      expEl.innerHTML = rec.explanationText + workflowNote;
    }

    // Thanh kéo mô phỏng What-if
    const slider = document.getElementById('whatif-slider');
    if (slider) {
      const sliderVal = Math.round(rates.displayedRate * 100);
      slider.value = sliderVal;
      handleWhatIfSlider(sliderVal);
    }
  }

  // Thao tác hồ sơ thưởng: quản lý gửi, C&B duyệt
  window.selectRecEmployee = function (employeeId) {
    const visibleEmployees = AppAuth.filterEmployeesByPermission(getActiveEmployees(), state.currentUser);
    if (!visibleEmployees.some(employee => employee.id === employeeId)) {
      return showToast('Bạn không có quyền xem hồ sơ nhân sự này.', 'warning');
    }
    state.selectedRecEmpId = employeeId;
    if (state.activeTab !== 'recommendation') {
      switchTab('recommendation');
      return;
    }
    renderRecommendationView();
  };
  window.selectRecommendationEmployee = window.selectRecEmployee;

  window.handleWhatIfSlider = function (value) {
    const rate = Math.max(0, Math.min(150, Number(value) || 0)) / 100;
    const emp = getActiveEmployees().find(employee => employee.id === state.selectedRecEmpId);
    if (!emp) return;
    const rec = SmartRecommendationEngine.computeEmployeeRecommendation(emp, getActiveEmployees());
    if (!rec) return;
    const display = document.getElementById('whatif-slider-val-display');
    const payout = document.getElementById('whatif-payout-display');
    const diff = document.getElementById('whatif-diff-display');
    const warning = document.getElementById('whatif-l2-badge');
    const delta = rate - rec.rProposed;
    if (display) display.textContent = IncentiveEngine.formatPercent(rate, 1);
    if (payout) payout.textContent = IncentiveEngine.formatVND(Math.round(rec.targetIncentivePersonal * rate));
    if (diff) diff.textContent = `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)} điểm %`;
    if (warning) warning.classList.toggle('hidden', Math.abs(delta) <= 0.1);
  };

  window.applyWhatIfSimulation = function () {
    if (state.currentUser.role !== 'manager') return showToast('Chỉ quản lý trực tiếp có thể gửi đề xuất điều chỉnh.', 'warning');
    if (!isCurrentPeriod()) return showToast('Kỳ đã chốt chỉ cho phép xem dữ liệu.', 'warning');
    const slider = document.getElementById('whatif-slider');
    if (!slider) return;
    window.openAdjustModal(Number(slider.value));
  };

  window.openAdjustModal = function (presetRate) {
    if (state.currentUser.role !== 'manager') return showToast('Chỉ quản lý trực tiếp có thể điều chỉnh mức thưởng.', 'warning');
    if (!isCurrentPeriod()) return showToast('Kỳ đã chốt chỉ cho phép xem dữ liệu.', 'warning');
    const emp = getBaseEmployee(state.selectedRecEmpId);
    if (!emp) return;
    const rec = SmartRecommendationEngine.computeEmployeeRecommendation(emp, state.employees);
    const input = document.getElementById('input-adjust-rate');
    const current = document.getElementById('adjust-modal-rec-val');
    const reason = document.getElementById('input-adjust-reason');
    if (input) input.value = presetRate ?? Math.round((emp.finalRate || rec.rProposed) * 100);
    if (current) current.textContent = IncentiveEngine.formatPercent(rec.rProposed, 1);
    if (reason) reason.value = emp.adjustReason || '';
    document.getElementById('modal-adjust-rate')?.classList.remove('hidden');
  };

  window.closeAdjustModal = function () {
    document.getElementById('modal-adjust-rate')?.classList.add('hidden');
  };

  function submitManagerProposal(employee, rate, proposalType, reason) {
    const rec = SmartRecommendationEngine.computeEmployeeRecommendation(employee, state.employees);
    employee.status = 'PENDING_ADMIN';
    employee.finalRate = rate;
    employee.finalIncentive = Math.round(rec.targetIncentivePersonal * rate);
    employee.proposalType = proposalType;
    employee.adjustReason = reason || '';
    employee.submittedBy = state.currentUser.name;
    employee.submittedDate = new Date().toLocaleDateString('vi-VN');
    saveWorkflowState();
    renderRecommendationView();
    showToast('Đã gửi đề xuất đến C&B để phê duyệt.');
  }

  window.agreeProposedRate = function () {
    if (state.currentUser.role !== 'manager') return showToast('Chỉ quản lý trực tiếp có thể gửi đề xuất.', 'warning');
    if (!isCurrentPeriod()) return showToast('Kỳ đã chốt chỉ cho phép xem dữ liệu.', 'warning');
    const employee = getBaseEmployee(state.selectedRecEmpId);
    if (!employee) return;
    const rec = SmartRecommendationEngine.computeEmployeeRecommendation(employee, state.employees);
    submitManagerProposal(employee, rec.rProposed, 'MANAGER_ACCEPTED', 'Quản lý đồng ý với mức do hệ thống đề xuất.');
  };

  window.submitAdjustRate = function () {
    const employee = getBaseEmployee(state.selectedRecEmpId);
    const rate = (Number(document.getElementById('input-adjust-rate')?.value) || 0) / 100;
    const reason = document.getElementById('input-adjust-reason')?.value.trim() || '';
    if (!employee || rate < 0 || rate > 1.5) return showToast('Mức thưởng phải nằm trong khoảng từ 0% đến 150%.', 'warning');
    if (!reason) return showToast('Vui lòng nêu lý do điều chỉnh để C&B có căn cứ xét duyệt.', 'warning');
    closeAdjustModal();
    submitManagerProposal(employee, rate, 'MANAGER_ADJUSTED', reason);
  };

  window.adminApproveProposal = function (employeeId) {
    if (state.currentUser.role !== 'admin') return showToast('Chỉ C&B mới có quyền phê duyệt.', 'warning');
    const employee = getBaseEmployee(employeeId);
    if (!employee || employee.status !== 'PENDING_ADMIN') return;
    employee.status = 'APPROVED';
    employee.approvedBy = state.currentUser.name;
    employee.approvedDate = new Date().toLocaleDateString('vi-VN');
    saveWorkflowState();
    if (state.activeTab === 'validation') renderValidationQueue();
    if (state.activeTab === 'recommendation') renderRecommendationView();
    if (state.activeTab === 'employees') renderEmployeesTable();
    showToast(`Đã phê duyệt mức thưởng của ${employee.name}.`);
  };

  window.openRejectModal = function (employeeId) {
    if (state.currentUser.role !== 'admin') return showToast('Chỉ C&B mới có quyền từ chối.', 'warning');
    const employee = getBaseEmployee(employeeId);
    if (!employee || employee.status !== 'PENDING_ADMIN') return;
    state.rejectionTargetId = employeeId;
    const nameEl = document.getElementById('reject-employee-name');
    const reasonEl = document.getElementById('input-reject-reason');
    if (nameEl) nameEl.textContent = employee.name;
    if (reasonEl) reasonEl.value = '';
    document.getElementById('modal-reject-proposal')?.classList.remove('hidden');
  };

  window.closeRejectModal = function () {
    state.rejectionTargetId = null;
    document.getElementById('modal-reject-proposal')?.classList.add('hidden');
  };

  window.adminRejectProposal = function (employeeId, reason) {
    if (state.currentUser.role !== 'admin') return showToast('Chỉ C&B mới có quyền từ chối.', 'warning');
    const employee = getBaseEmployee(employeeId);
    if (!employee || employee.status !== 'PENDING_ADMIN') return;
    employee.status = 'REJECTED';
    employee.rejectionReason = reason || 'C&B cần quản lý bổ sung căn cứ và gửi lại đề xuất.';
    saveWorkflowState();
    if (state.activeTab === 'validation') renderValidationQueue();
    if (state.activeTab === 'recommendation') renderRecommendationView();
    if (state.activeTab === 'employees') renderEmployeesTable();
    showToast(`Đã từ chối đề xuất của ${employee.name}.`, 'warning');
  };

  window.confirmRejectProposal = function () {
    const reason = document.getElementById('input-reject-reason')?.value.trim() || '';
    if (!state.rejectionTargetId) return;
    if (!reason) return showToast('Vui lòng nêu lý do để quản lý có thể bổ sung và gửi lại.', 'warning');
    const employeeId = state.rejectionTargetId;
    closeRejectModal();
    adminRejectProposal(employeeId, reason);
  };

  window.adminDirectApprove = function () {
    showToast('C&B chỉ phê duyệt đề xuất đã được quản lý gửi lên.', 'warning');
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
    const pillEl = document.getElementById('slip-status-pill');
    const bannerTitleEl = document.getElementById('slip-banner-title');
    const subDescEl = document.getElementById('slip-sub-desc');

    if (nameEl) nameEl.textContent = emp.name;
    if (metaEl) metaEl.textContent = `Mã NV: ${emp.code} • ${emp.position} • Kỳ ${periodLabel}`;

    const rawTarget = emp.target || 1000;
    const diffFactor = emp.difficultyFactor || 1.0;
    const adjustedTarget = Math.round(rawTarget * diffFactor);
    const rawActual = emp.actual || 850;
    const rate = adjustedTarget > 0 ? (rawActual / adjustedTarget) : 1.0;
    const rulePayoutFactor = IncentiveEngine.calculatePayoutFactor(rate);
    const baseInc = emp.baseIncentive || 20000000;

    const isApproved = emp.status === 'APPROVED';
    const effectiveRate = isApproved ? (emp.finalRate || rulePayoutFactor) : rulePayoutFactor;
    const finalBonus = isApproved
      ? (emp.finalIncentive || Math.round(baseInc * effectiveRate))
      : Math.round(baseInc * rulePayoutFactor);

    if (pillEl) {
      if (isApproved) {
        pillEl.className = 'px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold';
        pillEl.textContent = 'Đã phê duyệt chính thức';
      } else {
        pillEl.className = 'px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold';
        pillEl.textContent = 'Tạm tính theo quy chế (chờ duyệt)';
      }
    }

    if (bannerTitleEl) {
      bannerTitleEl.textContent = isApproved ? 'Khoản thưởng thực nhận kỳ này' : 'Khoản thưởng tạm tính (chờ duyệt)';
    }

    if (subDescEl) {
      subDescEl.textContent = `Mức thưởng chuẩn: ${IncentiveEngine.formatVND(baseInc)} • Hệ số chi trả: ${IncentiveEngine.formatPercent(effectiveRate, 1)}`;
    }

    const incAmountEl = document.getElementById('slip-incentive-amount');
    const achRateEl = document.getElementById('slip-achievement-rate');
    const diffNoteEl = document.getElementById('slip-diff-note');

    if (incAmountEl) incAmountEl.textContent = IncentiveEngine.formatVND(finalBonus);
    if (achRateEl) achRateEl.textContent = IncentiveEngine.formatPercent(rate, 1);
    if (diffNoteEl) {
      diffNoteEl.textContent = diffFactor !== 1.0 ? `Đã áp dụng độ khó ${diffFactor}` : 'Chỉ tiêu tiêu chuẩn';
    }

    // Bước 1: Chỉ tiêu sau hiệu chỉnh
    const s1Math = document.getElementById('slip-step1-math');
    const s1Desc = document.getElementById('slip-step1-desc');
    if (s1Math) {
      if (diffFactor !== 1.0) {
        s1Math.textContent = `${rawTarget} triệu ₫ × ${diffFactor.toFixed(2)} = ${adjustedTarget} triệu ₫`;
        if (s1Desc) s1Desc.textContent = `Áp dụng hệ số độ khó ${diffFactor} theo tình hình thị trường khu vực.`;
      } else {
        s1Math.textContent = `Chỉ tiêu giao: ${rawTarget} triệu ₫`;
        if (s1Desc) s1Desc.textContent = `Chỉ tiêu chuẩn không áp dụng hiệu chỉnh độ khó bổ sung.`;
      }
    }

    // Bước 2: Tỷ lệ hoàn thành
    const s2Math = document.getElementById('slip-step2-math');
    const s2Desc = document.getElementById('slip-step2-desc');
    if (s2Math) s2Math.textContent = `${rawActual} triệu ₫ / ${adjustedTarget} triệu ₫ = ${IncentiveEngine.formatPercent(rate, 2)}`;
    if (s2Desc) s2Desc.textContent = `Doanh số nghiệm thu đạt ${rawActual} triệu đồng trên chỉ tiêu ${adjustedTarget} triệu.`;

    // Bước 3: Hệ số chi trả quy chế
    const s3Math = document.getElementById('slip-step3-math');
    const s3Desc = document.getElementById('slip-step3-desc');
    if (s3Math) {
      if (rate < 0.70) {
        s3Math.textContent = `Dưới ngưỡng sàn 70% → Hệ số: 0,0%`;
        if (s3Desc) s3Desc.textContent = `Theo quy chế, dưới ngưỡng sàn 70% không đủ điều kiện xét thưởng.`;
      } else if (rate <= 1.00) {
        s3Math.textContent = `(${IncentiveEngine.formatPercent(rate, 2)} - 70%) / 30% = ${IncentiveEngine.formatPercent(rulePayoutFactor, 1)}`;
        if (s3Desc) s3Desc.textContent = `Khoảng tuyến tính từ ngưỡng sàn 70% (0 lần) đến mức chuẩn 100% (1,0 lần).`;
      } else if (rate <= 1.20) {
        s3Math.textContent = `1,0 + (${IncentiveEngine.formatPercent(rate, 2)} - 100%) / 20% × 0,5 = ${IncentiveEngine.formatPercent(rulePayoutFactor, 1)}`;
        if (s3Desc) s3Desc.textContent = `Khoảng tuyến tính vượt chuẩn từ 100% (1,0 lần) đến trần 120% (1,5 lần).`;
      } else {
        s3Math.textContent = `Đạt ≥ 120% → Chạm trần tối đa: 150,0%`;
        if (s3Desc) s3Desc.textContent = `Hệ số chi trả được chặn trần tối đa 1,5 lần theo quy chế tài chính.`;
      }
    }

    // Bước 4: Tiền thưởng thực nhận
    const s4Math = document.getElementById('slip-step4-math');
    const s4Desc = document.getElementById('slip-step4-desc');
    const s4Title = document.getElementById('slip-step4-title');

    if (s4Math) {
      s4Math.textContent = `${IncentiveEngine.formatVND(baseInc)} × ${IncentiveEngine.formatPercent(effectiveRate, 1)} = ${IncentiveEngine.formatVND(finalBonus)}`;
    }
    if (s4Desc) {
      if (isApproved) {
        s4Desc.textContent = `Áp dụng mức thưởng ${IncentiveEngine.formatPercent(effectiveRate, 1)} đã được Hội đồng C&B phê duyệt chính thức.`;
      } else {
        s4Desc.textContent = `Mức tạm tính theo quy chế, đang chờ quản lý trực tiếp đề xuất và phê duyệt.`;
      }
    }
    if (s4Title) {
      s4Title.textContent = isApproved ? 'Bước 4: Tiền thưởng phê duyệt thực nhận' : 'Bước 4: Tiền thưởng tạm tính theo quy chế';
    }
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
        <tr class="hover:bg-teal-50/20 transition-colors">
          <td class="p-3.5 font-mono font-semibold text-slate-700">${emp.id}</td>
          <td class="p-3.5 font-medium text-slate-900">${emp.name}</td>
          <td class="p-3.5 text-slate-600">${emp.department}</td>
          <td class="p-3.5 text-slate-500">${emp.position}</td>
          <td class="p-3.5 text-right font-mono tabular-nums text-slate-700">${emp.target} triệu ₫</td>
          <td class="p-3.5 text-right font-mono tabular-nums font-medium text-slate-900">${emp.actual} triệu ₫</td>
          <td class="p-3.5 text-right font-mono tabular-nums font-bold text-slate-900">${IncentiveEngine.formatPercent(rate, 1)}</td>
          <td class="p-3.5 text-right font-mono tabular-nums font-bold text-teal-800 masked-amount">${IncentiveEngine.formatVND(amount)}</td>
          <td class="p-3.5 text-center">
            <button onclick="selectRecEmployee('${emp.id}'); switchTab('recommendation');" class="px-2.5 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-[11px] transition">
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
  // VIEW 5: XÉT DUYỆT ĐỀ XUẤT & KIỂM TRA DỮ LIỆU
  // =========================================================================
  function renderCompPlans() {
    const plans = CompensationPlans.getPlans();
    const list = document.getElementById('comp-plans-list');
    const pending = document.getElementById('comp-pending-list');
    const select = document.getElementById('comp-plan-department');
    const active = plans.filter(p => p.status === 'active');
    if (select) select.innerHTML = active.map(p => `<option value="${p.department}">${p.department}</option>`).join('');
    if (list) list.innerHTML = active.map(plan => {
      const history = plans.filter(p => p.department === plan.department).sort((a,b) => b.version-a.version);
      return `<div class="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3"><div class="flex justify-between"><strong>${plan.department}</strong><span class="text-teal-800 font-semibold">v${plan.version} · ${plan.effective_from}</span></div>${plan.sources.map(s => `<div><div class="flex justify-between text-[11px]"><span>${CompensationPlans.sourceRegistry[s.type].label}</span><span>${s.type === 'MANAGER_EVAL' ? `×${s.weight}` : `${(s.weight*100).toFixed(0)}%`}</span></div><div class="h-2 mt-1 bg-slate-200 rounded overflow-hidden"><div class="h-full bg-teal-600" style="width:${Math.min(100,s.weight*100)}%"></div></div></div>`).join('')}<div class="pt-2 border-t text-[11px] text-slate-500">Lịch sử: ${history.map(h => `v${h.version} (${h.status})`).join(' → ')}</div></div>`;
    }).join('');
    if (pending) pending.innerHTML = plans.filter(p => ['DRAFT','PENDING_APPROVAL'].includes(p.status)).map(p => `<div class="p-3 border rounded flex justify-between"><span>${p.department} · v${p.version} · ${p.status}</span>${p.status === 'DRAFT' ? `<button onclick="submitCompPlan('${p.department}',${p.version})" class="px-2 py-1 rounded bg-slate-700 text-white font-semibold">Gửi duyệt</button>` : `<button onclick="approveCompPlan('${p.department}',${p.version})" class="px-2 py-1 rounded bg-teal-700 text-white font-semibold">Duyệt</button>`}</div>`).join('') || '<span class="text-slate-500">Không có cấu hình chờ duyệt.</span>';
  }
  window.createCompPlan = function(event) { event.preventDefault(); const plan = { department: document.getElementById('comp-plan-department').value, effective_from: document.getElementById('comp-plan-effective').value, sources: [{ type:'RULE_BASED', weight:+document.getElementById('comp-rule').value },{ type:'ML_PREDICTION', weight:+document.getElementById('comp-ml').value },{ type:'MANAGER_EVAL', weight:+document.getElementById('comp-manager').value }] }; const r = CompensationPlans.addPlanVersion(plan, state.currentUser.role); const error = document.getElementById('comp-plan-error'); if (!r.valid) { error.textContent=r.errors.join(' '); return; } error.textContent='Đã lưu nháp v'+r.plan.version+'. Hãy gửi duyệt ở bước tiếp theo.'; renderCompPlans(); };
  window.submitCompPlan = function(department, version) { const r = CompensationPlans.submitPlan(department,version,state.currentUser.role); if (!r.valid) return showToast(r.errors[0],'warning'); renderCompPlans(); showToast('Đã gửi cấu hình chờ phê duyệt.'); };
  window.approveCompPlan = function(department, version) { const r = CompensationPlans.approvePlan(department,version,state.currentUser.role); if (!r.valid) return showToast(r.errors[0],'warning'); renderCompPlans(); showToast('Đã duyệt và kích hoạt cấu hình mới.'); };

  function renderValidationQueue() {
    renderCalibrationRisks();
    renderExpectationClaims();
    // 1. Khối đề xuất thưởng chờ duyệt
    renderApprovalQueue();

    // 2. Khối 5 trường hợp lỗi dữ liệu bất thường
    renderDataAnomalyQueue();
  }

  function renderCalibrationRisks() {
    const container = document.getElementById('calibration-risk-list');
    if (!container || !window.ManagerEvaluation) return;
    const departments = [...new Set(state.employees.map(e => e.department))];
    container.innerHTML = departments.map(department => {
      const risk = ManagerEvaluation.flagCalibrationRisk(department, state.selectedPeriod.replace('_', '-'), state.evaluations);
      return `<div class="p-3 rounded-lg border ${risk.flag ? 'border-amber-200 bg-amber-50' : 'border-emerald-100 bg-emerald-50/50'} text-xs">
        <strong>${department}</strong> · điều chỉnh TB ${(risk.avgDelta * 100).toFixed(1)}%<br><span class="${risk.flag ? 'text-amber-800' : 'text-emerald-700'}">${risk.flag ? risk.reason : 'Không có dấu hiệu bất thường.'}</span>
      </div>`;
    }).join('');
  }

  function renderExpectationClaims() {
    const container = document.getElementById('expectation-claims-list');
    if (!container) return;
    container.innerHTML = state.claims.length ? state.claims.map((claim, index) => {
      const emp = state.employees.find(e => e.id === claim.employee_id);
      return `<div class="p-3 rounded-lg border border-slate-200 text-xs"><strong>${emp ? emp.name : claim.employee_id}</strong> · kỳ vọng ${IncentiveEngine.formatVND(claim.employee_expected_amount)}<br>
        <span class="text-slate-500">Trạng thái: ${claim.status}</span>
        ${state.currentUser.role === 'admin' && claim.status === 'pending' ? `<button onclick="resolveClaim(${index})" class="mt-2 px-2.5 py-1 bg-teal-700 text-white rounded text-[11px] font-semibold">Xử lý 3 bước</button>` : ''}
        ${claim.resolution ? `<div class="mt-2 text-emerald-700">Kết quả: ${IncentiveEngine.formatVND(claim.resolution.final_amount)}</div>` : ''}
      </div>`;
    }).join('') : '<p class="text-xs text-slate-500">Chưa có yêu cầu nào.</p>';
  }

  function renderEvaluationView() {
    const visible = AppAuth.filterEmployeesByPermission(getActiveEmployees(), state.currentUser);
    const options = visible.map(e => `<option value="${e.id}">${e.name} (${e.code})</option>`).join('');
    const formSelect = document.getElementById('eval-employee-id');
    const historySelect = document.getElementById('history-employee-id');
    if (formSelect) { formSelect.innerHTML = options; formSelect.value = state.selectedRecEmpId && visible.some(e => e.id === state.selectedRecEmpId) ? state.selectedRecEmpId : visible[0]?.id; }
    if (historySelect) { historySelect.innerHTML = options; historySelect.value = formSelect?.value || visible[0]?.id; renderEmployeeHistory(historySelect.value); }
  }

  window.renderEmployeeHistory = function (employeeId) {
    const emp = state.employees.find(e => e.id === employeeId); if (!emp || !window.ManagerEvaluation) return;
    const summary = ManagerEvaluation.buildHistorySummary(emp);
    const info = document.getElementById('employee-history-summary');
    const list = document.getElementById('employee-history-list');
    if (info) info.innerHTML = `Bình quân: <strong>${IncentiveEngine.formatPercent(summary.hist_avg_rate, 1)}</strong> · Xu hướng: <strong>${(summary.hist_rate_trend * 100).toFixed(1)} điểm/kỳ</strong> · Dao động: <strong>${IncentiveEngine.formatPercent(summary.hist_volatility, 1)}</strong>`;
    if (list) list.innerHTML = summary.last_5_periods.map(x => `<div class="flex justify-between p-2 rounded bg-slate-50 text-xs"><span>${x.period}</span><strong>${IncentiveEngine.formatPercent(x.rate, 1)}</strong></div>`).join('');
  };

  window.submitManagerEvaluation = function (event) {
    event.preventDefault();
    if (state.currentUser.role !== 'manager') return showToast('Chỉ quản lý trực tiếp được gửi đánh giá.', 'warning');
    const scores = { quality: +document.getElementById('eval-quality').value, collaboration: +document.getElementById('eval-collaboration').value, initiative: +document.getElementById('eval-initiative').value, objectiveDifficulty: +document.getElementById('eval-difficulty').value };
    const evaluation = { employee_id: document.getElementById('eval-employee-id').value, manager_id: state.currentUser.id || 'MGR-02', period: state.selectedPeriod.replace('_', '-'), scores, comment: document.getElementById('eval-comment').value.trim(), status: 'submitted', department: state.currentUser.department };
    const check = ManagerEvaluation.validateEvaluation(evaluation);
    if (!check.valid) return showToast(check.errors[0], 'warning');
    state.evaluations.push(evaluation);
    const emp = state.employees.find(e => e.id === evaluation.employee_id); if (emp) emp.managerEval = { ...scores, comment: evaluation.comment, managerId: evaluation.manager_id };
    event.target.reset(); showToast('Đã gửi đánh giá; dữ liệu đã sẵn sàng cho bước hiệu chỉnh.'); renderEmployeeHistory(evaluation.employee_id);
  };

  window.toggleClaimForm = function () { document.getElementById('claim-form')?.classList.toggle('hidden'); };
  window.submitExpectationClaim = function (event) {
    event.preventDefault(); const emp = state.employees.find(e => e.id === state.currentUser.employeeId); if (!emp) return;
    const rates = getRecommendationRates(emp, state.employees);
    state.claims.push({ employee_id: emp.id, period: state.selectedPeriod.replace('_', '-'), system_proposed_amount: rates.systemAmount, employee_expected_amount: +document.getElementById('claim-expected-amount').value, evidence: [{ type: 'employee_statement', description: document.getElementById('claim-evidence').value.trim(), status: 'pending_review' }], status: 'pending' });
    event.target.reset(); toggleClaimForm(); showToast('Đã gửi yêu cầu. C&B sẽ rà soát theo quy trình 3 bước.');
  };

  window.resolveClaim = function (index) {
    if (state.currentUser.role !== 'admin') return;
    const claim = state.claims[index]; const emp = state.employees.find(e => e.id === claim.employee_id); const fund = state.retentionFunds.find(f => f.department === emp.department && f.year === 2026) || { total_budget: 0, used: 0 };
    claim.resolution = ExpectationResolver.resolveExpectationGap(claim, emp, state.employees, fund, emp.managerEval?.managerId); claim.status = 'resolved';
    renderExpectationClaims(); showToast('Đã xử lý yêu cầu theo 3 bước và lưu bảng phân rã.');
  };

  function renderApprovalQueue() {
    const container = document.getElementById('approval-queue-cards');
    const badge = document.getElementById('approval-badge-count');
    const titleEl = document.getElementById('approval-queue-title');
    const subEl = document.getElementById('approval-queue-sub');
    if (!container) return;

    const role = state.currentUser.role;
    if (titleEl) {
      titleEl.textContent = role === 'admin'
        ? 'Đề xuất mức thưởng chờ phê duyệt'
        : 'Đề xuất bạn đã gửi lên Hội đồng C&B';
    }
    if (subEl) {
      subEl.textContent = role === 'admin'
        ? 'Các đề xuất điều chỉnh mức thưởng do Quản lý bộ phận gửi lên'
        : 'Theo dõi tiến độ xét duyệt các đề xuất điều chỉnh của nhân sự thuộc quyền';
    }

    let pendingEmps = state.employees.filter(e => e.status === 'PENDING_ADMIN');
    if (role === 'manager') {
      pendingEmps = pendingEmps.filter(e => e.department === state.currentUser.department || (e.submittedBy && e.submittedBy.includes(state.currentUser.name)));
    }

    if (badge) {
      badge.textContent = `${pendingEmps.length} đề xuất chờ duyệt`;
      badge.className = pendingEmps.length > 0
        ? 'px-3 py-1 bg-amber-50 text-amber-800 font-bold rounded-full text-xs border border-amber-200'
        : 'px-3 py-1 bg-slate-100 text-slate-600 font-medium rounded-full text-xs border border-slate-200';
    }

    if (pendingEmps.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
          <i class="fa-solid fa-clipboard-check text-slate-400 text-xl mb-1.5 block"></i>
          <span>Hiện không có đề xuất nào đang chờ phê duyệt.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = pendingEmps.map(emp => {
      const rec = SmartRecommendationEngine.computeEmployeeRecommendation(emp, state.employees);
      const sysRate = rec ? IncentiveEngine.formatPercent(rec.rProposed, 1) : '82,8%';
      const mgrRate = IncentiveEngine.formatPercent(emp.finalRate, 1);
      const isAdjusted = emp.proposalType === 'MANAGER_ADJUSTED';
      const badgeType = isAdjusted
        ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">Quản lý điều chỉnh</span>'
        : '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800">Theo đề xuất thông minh</span>';

      const actions = (role === 'admin')
        ? `
          <div class="flex items-center gap-2">
            <button onclick="openRejectModal('${emp.id}')" class="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition">
              Từ chối
            </button>
            <button onclick="adminApproveProposal('${emp.id}')" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5">
              <i class="fa-solid fa-check"></i> Phê duyệt
            </button>
          </div>
        `
        : `
          <span class="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
            <i class="fa-solid fa-clock text-amber-600"></i> Đang chờ Admin duyệt
          </span>
        `;

      const reasonBlock = emp.adjustReason
        ? `<div class="mt-2.5 p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700">
             <span class="font-semibold text-slate-900">Lý do điều chỉnh:</span> ${emp.adjustReason}
           </div>`
        : '';

      return `
        <div class="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs">${emp.avatar}</span>
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="font-bold text-sm text-slate-900">${emp.name} (${emp.code})</h4>
                  ${badgeType}
                </div>
                <p class="text-xs text-slate-500">${emp.position} &bull; ${emp.department}</p>
              </div>
            </div>
            ${actions}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
            <div class="p-2.5 bg-white rounded-lg border border-slate-200">
              <span class="text-slate-400 block text-[11px]">Hệ thống đề xuất:</span>
              <span class="font-bold text-slate-800">${sysRate}</span>
            </div>
            <div class="p-2.5 bg-white rounded-lg border border-slate-200">
              <span class="text-slate-400 block text-[11px]">Mức quản lý trình duyệt:</span>
              <span class="font-bold text-teal-700">${mgrRate} (${IncentiveEngine.formatVND(emp.finalIncentive)})</span>
            </div>
            <div class="p-2.5 bg-white rounded-lg border border-slate-200">
              <span class="text-slate-400 block text-[11px]">Người trình:</span>
              <span class="font-medium text-slate-700">${emp.submittedBy || 'Quản lý'} (${emp.submittedDate || '20/09/2026'})</span>
            </div>
          </div>

          ${reasonBlock}
        </div>
      `;
    }).join('');
  }

  function renderDataAnomalyQueue() {
    const container = document.getElementById('validation-queue-cards');
    const badge = document.getElementById('validation-badge-count');
    if (!container) return;

    // 5 ca bất thường
    const dung = state.employees.find(e => e.id === 'EMP-004');
    const emp116 = state.employees.find(e => e.id === 'EMP-116');
    const emp117 = state.employees.find(e => e.id === 'EMP-117');
    const emp118 = state.employees.find(e => e.id === 'EMP-118');
    const emp119 = state.employees.find(e => e.id === 'EMP-119');

    const cases = [
      {
        id: 'EMP-004',
        emp: dung,
        tag: 'TRÙNG LẶP HỢP ĐỒNG',
        tagClass: 'bg-rose-100 text-rose-800',
        title: 'Hợp đồng HĐ-RET-099 (90 triệu ₫) bị kế toán chi nhánh nhập 2 lần',
        desc: 'Doanh số thô bị đội lên 990 triệu ₫ thay vì 900 triệu ₫. Khấu trừ 90 triệu ₫ để đưa về đúng mức đạt chuẩn 100% (thưởng 20 triệu ₫).',
        isResolved: dung && dung.duplicateInfo && dung.duplicateInfo.isResolved,
        actionLabel: 'Khấu trừ hợp đồng trùng (90 triệu ₫)',
        resolveFn: 'resolveDungDuplicate()'
      },
      {
        id: 'EMP-116',
        emp: emp116,
        tag: 'CHỈ TIÊU BẰNG 0',
        tagClass: 'bg-amber-100 text-amber-800',
        title: 'Nhân sự chưa được giao chỉ tiêu doanh số ban đầu (Target = 0)',
        desc: 'Doanh số thực tế ghi nhận 450 triệu ₫ nhưng hệ thống chưa có chỉ tiêu phân bổ dẫn đến lỗi chia cho 0.',
        isResolved: emp116 && emp116.validationStatus === 'VALID',
        actionLabel: 'Gán chỉ tiêu chuẩn (500 triệu ₫)',
        resolveFn: 'resolveInvalidTarget("EMP-116")'
      },
      {
        id: 'EMP-117',
        emp: emp117,
        tag: 'CHƯA GÁN CƠ CHẾ',
        tagClass: 'bg-sky-100 text-sky-800',
        title: 'Hồ sơ thiếu thông tin chính sách chi trả thưởng',
        desc: 'Nhân sự đạt 105% chỉ tiêu nhưng chưa được liên kết cơ chế chi trả doanh số theo chuẩn phòng ban.',
        isResolved: emp117 && emp117.validationStatus === 'VALID',
        actionLabel: 'Gán cơ chế bán hàng chuẩn',
        resolveFn: 'resolveUnassignedScheme("EMP-117")'
      },
      {
        id: 'EMP-118',
        emp: emp118,
        tag: 'VƯỢT TRẦN BẤT THƯỜNG',
        tagClass: 'bg-purple-100 text-purple-800',
        title: 'Tỷ lệ hoàn thành đạt 280% — cần áp trần theo quy chế tài chính',
        desc: 'Hệ thống tự động tính thưởng vượt chuẩn nhưng quy định tài chính giới hạn trần chi trả tối đa là 150% (1,5 lần).',
        isResolved: emp118 && emp118.validationStatus === 'VALID',
        actionLabel: 'Áp dụng trần chi trả 150%',
        resolveFn: 'resolveExtremeIncentive("EMP-118")'
      },
      {
        id: 'EMP-119',
        emp: emp119,
        tag: 'DƯỚI SÀN QUY CHẾ',
        tagClass: 'bg-rose-100 text-rose-800',
        title: 'Tỷ lệ đạt 65% (dưới sàn 70%) nhưng dữ liệu ghi nhận có thưởng',
        desc: 'Theo quy chế chi trả, nhân sự đạt dưới 70% không thuộc diện xét thưởng hiệu suất kỳ này.',
        isResolved: emp119 && emp119.validationStatus === 'VALID',
        actionLabel: 'Áp dụng ngưỡng sàn 0%',
        resolveFn: 'resolveUnearnedIncentive("EMP-119")'
      }
    ];

    const unresolvedCount = cases.filter(c => !c.isResolved).length;
    if (badge) {
      badge.textContent = `${unresolvedCount} trường hợp cần xử lý`;
      badge.className = unresolvedCount > 0
        ? 'px-3 py-1 bg-amber-50 text-amber-800 font-bold rounded-full text-xs border border-amber-200'
        : 'px-3 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-full text-xs border border-emerald-200';
    }

    container.innerHTML = cases.map(item => {
      const e = item.emp;
      const meta = e ? `${e.name} (${e.code}) &bull; ${e.department}` : item.id;

      return `
        <div class="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[11px] font-bold ${item.tagClass}">${item.tag}</span>
              <span class="text-xs text-slate-500">${meta}</span>
              ${item.isResolved ? '<span class="text-emerald-600 font-semibold text-xs ml-1"><i class="fa-solid fa-check mr-1"></i>Đã xử lý</span>' : ''}
            </div>
            <h4 class="font-bold text-xs text-slate-900">${item.title}</h4>
            <p class="text-xs text-slate-600 leading-relaxed max-w-2xl">${item.desc}</p>
          </div>
          <div>
            <button onclick="${item.resolveFn}" class="px-3.5 py-1.5 ${item.isResolved ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'} rounded-lg text-xs font-semibold transition" ${item.isResolved ? 'disabled' : ''}>
              ${item.isResolved ? 'Đã hoàn tất' : item.actionLabel}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  window.resolveDungDuplicate = function () {
    const dung = state.employees.find(e => e.id === 'EMP-004');
    if (!dung) return;

    if (dung.duplicateInfo) dung.duplicateInfo.isResolved = true;
    dung.actual = 900;
    dung.validationStatus = 'VALID';
    dung.status = 'CALCULATED';
    saveWorkflowState();

    renderValidationQueue();
    showToast('Đã khấu trừ hợp đồng trùng 90 triệu ₫ của Phạm Tiến Dũng.');
  };

  window.resolveInvalidTarget = function (empId) {
    const emp = state.employees.find(e => e.id === empId);
    if (!emp) return;

    emp.target = 500;
    emp.actual = 450;
    emp.achievementRate = 0.90;
    emp.validationStatus = 'VALID';
    emp.status = 'CALCULATED';
    saveWorkflowState();

    renderValidationQueue();
    showToast(`Đã thiết lập chỉ tiêu chuẩn 500 triệu ₫ cho ${emp.name}.`);
  };

  window.resolveUnassignedScheme = function (empId) {
    const emp = state.employees.find(e => e.id === empId);
    if (!emp) return;

    emp.validationStatus = 'VALID';
    emp.status = 'CALCULATED';
    saveWorkflowState();

    renderValidationQueue();
    showToast(`Đã gán cơ chế bán hàng tiêu chuẩn cho ${emp.name}.`);
  };

  window.resolveExtremeIncentive = function (empId) {
    const emp = state.employees.find(e => e.id === empId);
    if (!emp) return;

    emp.achievementRate = 1.20;
    emp.payoutFactor = 1.50;
    emp.validationStatus = 'VALID';
    emp.status = 'CALCULATED';
    saveWorkflowState();

    renderValidationQueue();
    showToast(`Đã áp dụng trần chi trả 150% theo quy chế cho ${emp.name}.`);
  };

  window.resolveUnearnedIncentive = function (empId) {
    const emp = state.employees.find(e => e.id === empId);
    if (!emp) return;

    emp.payoutFactor = 0;
    emp.finalIncentive = 0;
    emp.incentiveAmount = 0;
    emp.validationStatus = 'VALID';
    emp.status = 'CALCULATED';
    saveWorkflowState();

    renderValidationQueue();
    showToast(`Đã áp dụng hệ số 0% (dưới sàn 70%) cho ${emp.name}.`);
  };

  // =========================================================================
  // VIEW 6: CHI TRẢ (PAYROLL)
  // =========================================================================
  function renderPayrollView() {
    const activeEmps = getActiveEmployees();
    const approvedEmployees = activeEmps.filter(emp => emp.status === 'APPROVED');
    const totalApproved = approvedEmployees.reduce((sum, emp) => {
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
    const summaryEl = document.getElementById('payroll-approved-summary');
    if (summaryEl) {
      const pendingCount = activeEmps.filter(emp => emp.status === 'PENDING_ADMIN').length;
      summaryEl.textContent = pendingCount
        ? `${approvedEmployees.length}/${activeEmps.length} hồ sơ đã phê duyệt · ${pendingCount} hồ sơ chờ C&B xét duyệt`
        : `${approvedEmployees.length}/${activeEmps.length} hồ sơ đã phê duyệt`;
    }
  }

  window.openPayrollExportModal = function () {
    const modal = document.getElementById('modal-payroll-export');
    if (!modal) return;

    const activeEmps = getActiveEmployees();
    const totalApproved = activeEmps.filter(emp => emp.status === 'APPROVED').reduce((sum, emp) => {
      const target = (emp.target || 1) * (emp.difficultyFactor || 1.0);
      const rate = emp.achievementRate || (target > 0 ? (emp.actual / target) : 0);
      const factor = emp.payoutFactor || IncentiveEngine.calculatePayoutFactor(rate);
      const amount = emp.finalIncentive || emp.incentiveAmount || Math.round((emp.baseIncentive || 20000000) * factor);
      return sum + amount;
    }, 0);

    const totalAmountEl = document.getElementById('payroll-modal-total-amount');
    const userNameEl = document.getElementById('payroll-modal-user-name');
    const filenameEl = document.getElementById('payroll-modal-filename');

    if (totalAmountEl) totalAmountEl.textContent = IncentiveEngine.formatVND(totalApproved);
    if (userNameEl) userNameEl.textContent = `${state.currentUser.name} (${state.currentUser.role === 'admin' ? 'Admin C&B' : 'Quản lý'})`;
    if (filenameEl) filenameEl.textContent = `PAYROLL_${state.selectedPeriod}_FINAL.csv`;

    modal.classList.remove('hidden');
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

  // Modal Cách tính (Diễn giải tự nhiên, dễ hiểu, đồng bộ số liệu thật)
  window.openFormulaModal = function (metricKey) {
    const modal = document.getElementById('modal-formula');
    const titleEl = document.getElementById('formula-modal-title');
    const bodyEl = document.getElementById('formula-modal-body');

    const { employees, metrics } = getOverviewContext();
    const formatMoney = value => IncentiveEngine.formatVND(Number(value) || 0);
    const periodLabel = state.selectedPeriod.replace('_', '/');

    if (metricKey === 'weighted_rate') {
      titleEl.textContent = 'Ý nghĩa: Tỷ lệ đạt chỉ tiêu';
      bodyEl.innerHTML = `
        <p class="text-slate-700 leading-relaxed">
          Tỷ lệ này phản ánh mức độ hoàn thành công việc thực tế của nhân sự, trong đó mỗi gói hợp đồng được nhân với hệ số quy mô và độ phức tạp tương ứng thay vì chia cào bằng.
        </p>
        <p class="text-slate-600 mt-2">
          Kỳ ${periodLabel}, phạm vi đang xem gồm <strong>${employees.length} nhân sự</strong>; tỷ lệ bình quân là <strong>${IncentiveEngine.formatPercent(metrics.avgWeightedRate, 1)}</strong>.
        </p>
      `;
    } else if (metricKey === 'interim_incentive') {
      titleEl.textContent = 'Ý nghĩa: Thưởng tạm tính đến ngày';
      bodyEl.innerHTML = `
        <p class="text-slate-700 leading-relaxed">
          Ước tính số tiền thưởng nhân viên đã tích lũy tương ứng với tiến độ làm việc tính đến ngày hiện tại trong kỳ.
        </p>
        <p class="text-slate-600 mt-2">
          Công thức: <strong>${formatMoney(metrics.totalIncentive)} × ${IncentiveEngine.formatPercent(metrics.progressVsTime, 1)} = ${formatMoney(Math.round(metrics.totalIncentive * metrics.progressVsTime))}</strong>.<br>
          Tính đến ngày công ${state.asOfWorkday}/22, quỹ thưởng tạm tính là <strong>${formatMoney(Math.round(metrics.totalIncentive * metrics.progressVsTime))}</strong>; dự phóng cuối kỳ theo dữ liệu hiện có là <strong>${formatMoney(metrics.totalIncentive)}</strong>.
        </p>
      `;
    } else if (metricKey === 'budget_usage') {
      titleEl.textContent = 'Ý nghĩa: Chi phí so với quỹ thưởng';
      bodyEl.innerHTML = `
        <p class="text-slate-700 leading-relaxed">
          Công thức: <strong>${formatMoney(metrics.totalIncentive)} / 1.750.000.000 ₫ = ${IncentiveEngine.formatPercent(metrics.budgetUsageRate, 1)}</strong>.<br>
          Đây là so sánh tổng thưởng dự kiến của ${employees.length} nhân sự trong phạm vi đang xem với hạn mức quỹ 1,75 tỷ ₫ của kỳ ${periodLabel}.
        </p>
      `;
    } else if (metricKey === 'time_progress') {
      titleEl.textContent = 'Ý nghĩa: Tiến độ thời gian';
      bodyEl.innerHTML = `
        <p class="text-slate-700 leading-relaxed">
          Công thức: <strong>${state.asOfWorkday} / 22 = ${IncentiveEngine.formatPercent(metrics.progressVsTime, 1)}</strong>.<br>
          Đã đi qua <strong>${state.asOfWorkday} trên tổng số 22 ngày làm việc</strong> tiêu chuẩn trong kỳ ${periodLabel}.
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
      if (iconEl) iconEl.className = 'fa-solid fa-eye text-teal-600';
    } else {
      document.body.classList.remove('privacy-masked');
      if (textEl) textEl.textContent = 'Ẩn số tiền';
      if (iconEl) iconEl.className = 'fa-solid fa-eye-slash text-slate-500';
    }
  };

  // =========================================================================
  // VIEW: CƠ CHẾ THƯỞNG THEO PHÒNG BAN (CONTROLLED COMPONENT LIBRARY - HƯỚNG 1)
  // =========================================================================
  function renderDepartmentSchemesView() {
    const container = document.getElementById('department-schemes-cards');
    const countEl = document.getElementById('schemes-active-count');
    if (!container || !window.CompensationPlans) return;

    const allPlans = CompensationPlans.getPlans();
    const depts = ['Kinh doanh Miền Bắc', 'Kinh doanh Miền Nam', 'Khách hàng Doanh nghiệp', 'Vận hành Bán lẻ'];
    const curPeriod = state.selectedPeriod.replace('_', '-');

    if (countEl) {
      countEl.textContent = `${depts.length} phòng ban · Kỳ đánh giá ${state.selectedPeriod.replace('_', '/')}`;
    }

    const sourceColorMap = {
      RULE_BASED: { bg: 'bg-teal-600', text: 'text-teal-700', label: 'Quy chế công ty' },
      ML_PREDICTION: { bg: 'bg-indigo-600', text: 'text-indigo-700', label: 'Học máy lịch sử' },
      MANAGER_EVAL: { bg: 'bg-amber-600', text: 'text-amber-800', label: 'Đánh giá quản lý' },
      KPI_REVENUE: { bg: 'bg-emerald-600', text: 'text-emerald-700', label: 'KPI Doanh thu' }
    };

    container.innerHTML = depts.map(dept => {
      const activePlan = CompensationPlans.getPlanForPeriod(dept, curPeriod);
      const deptPlans = allPlans.filter(p => p.department === dept).sort((a, b) => (b.version || 0) - (a.version || 0));
      const pendingPlan = deptPlans.find(p => p.status === 'PENDING_APPROVAL' || p.status === 'pending');
      const isAdmin = state.currentUser.role === 'admin';
      const isManagerOfDept = state.currentUser.role === 'manager' && state.currentUser.department === dept;

      const sourcesList = activePlan && activePlan.sources ? activePlan.sources : [];

      return `
        <div class="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div>
              <div class="flex items-center gap-2.5">
                <h4 class="font-bold text-sm text-slate-900">${dept}</h4>
                ${activePlan ? `
                  <span class="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <i class="fa-solid fa-circle-check text-[10px]"></i> Đang áp dụng v${activePlan.version}
                  </span>
                ` : '<span class="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-500">Chưa có cấu hình</span>'}
                ${pendingPlan ? `
                  <span class="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <i class="fa-solid fa-clock text-[10px]"></i> Bản v${pendingPlan.version} chờ C&B duyệt
                  </span>
                ` : ''}
              </div>
              <p class="text-xs text-slate-500 mt-1">
                ${activePlan?.change_note || 'Cấu hình tiêu chuẩn phù hợp chức năng nghiệp vụ của phòng ban.'}
                ${activePlan?.approved_by ? `· Người duyệt: <strong class="text-slate-700">${activePlan.approved_by}</strong> (${activePlan.approved_at || 'Đã kích hoạt'})` : ''}
              </p>
            </div>
            <div class="flex items-center gap-2">
              ${(isAdmin || isManagerOfDept) ? `
                <button onclick="openNewSchemeModal('${dept}')" class="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition">
                  <i class="fa-solid fa-code-branch text-teal-700"></i> Tạo phiên bản mới (v${(activePlan?.version || 1) + 1})
                </button>
              ` : ''}
              ${(isAdmin && pendingPlan) ? `
                <button onclick="executeApproveScheme('${dept}', ${pendingPlan.version})" class="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition">
                  <i class="fa-solid fa-check"></i> Duyệt áp dụng v${pendingPlan.version}
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Thanh phân bổ tỷ trọng nguồn -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs text-slate-600">
              <span class="font-medium">Cấu trúc ${sourcesList.length} nguồn thành phần:</span>
              <span class="font-mono font-semibold text-slate-800">Tổng 100%</span>
            </div>
            <div class="h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              ${sourcesList.map(s => {
                const conf = sourceColorMap[s.type] || { bg: 'bg-slate-500' };
                const pct = Math.round(s.weight * 100);
                return `<div class="${conf.bg} h-full transition-all" style="width: ${pct}%" title="${conf.label || s.type}: ${pct}%"></div>`;
              }).join('')}
            </div>
            <div class="grid grid-cols-2 md:grid-cols-${Math.min(sourcesList.length, 4)} gap-2 pt-1 text-xs">
              ${sourcesList.map(s => {
                const conf = sourceColorMap[s.type] || { label: s.type, text: 'text-slate-700' };
                const pct = Math.round(s.weight * 100);
                return `
                  <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                    <div class="text-[11px] text-slate-500 truncate">${conf.label || s.type}</div>
                    <div class="font-bold text-sm font-mono ${conf.text} mt-0.5">${pct}%</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Lịch sử các phiên bản (Version Audit Trail) -->
          <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div>
              <span>Lịch sử phiên bản: </span>
              ${deptPlans.map(p => `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' : p.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 font-semibold border border-amber-200' : 'bg-slate-100 text-slate-500'}">
                  v${p.version} (${p.status})
                </span>
              `).join(' ')}
            </div>
            <span>Hiệu lực từ: <strong class="text-slate-700">${activePlan?.effective_from || '2025-Q3'}</strong></span>
          </div>
        </div>
      `;
    }).join('');
  }

  window.openNewSchemeModal = function (defaultDept) {
    const modal = document.getElementById('modal-new-scheme');
    if (!modal) return;
    const deptSelect = document.getElementById('scheme-input-department');
    if (deptSelect && defaultDept) {
      deptSelect.value = defaultDept;
    }
    handleSchemeDeptChange(deptSelect ? deptSelect.value : 'Kinh doanh Miền Nam');
    modal.classList.remove('hidden');
  };

  window.closeNewSchemeModal = function () {
    const modal = document.getElementById('modal-new-scheme');
    if (modal) modal.classList.add('hidden');
  };

  window.handleSchemeDeptChange = function (dept) {
    if (!window.CompensationPlans) return;
    const curPeriod = state.selectedPeriod.replace('_', '-');
    const plan = CompensationPlans.getPlanForPeriod(dept, curPeriod);
    const sources = plan?.sources || [{ type: 'RULE_BASED', weight: 0.7 }, { type: 'ML_PREDICTION', weight: 0.3 }];

    ['RULE_BASED', 'ML_PREDICTION', 'MANAGER_EVAL', 'KPI_REVENUE'].forEach(type => {
      const chk = document.getElementById(`chk-src-${type}`);
      const input = document.getElementById(`weight-src-${type}`);
      const found = sources.find(s => s.type === type);
      if (chk) chk.checked = !!found;
      if (input) {
        input.value = found ? Math.round(found.weight * 100) : 0;
        input.disabled = !found;
      }
    });

    updateSchemeWeightCalculation();
  };

  window.updateSchemeWeightCalculation = function () {
    let total = 0;
    let selectedCount = 0;
    const types = ['RULE_BASED', 'ML_PREDICTION', 'MANAGER_EVAL', 'KPI_REVENUE'];
    const limits = window.CompensationPlans ? CompensationPlans.getLimits() : { RULE_BASED: 0.8, ML_PREDICTION: 0.4, MANAGER_EVAL: 0.35, KPI_REVENUE: 0.6 };
    const errors = [];

    types.forEach(type => {
      const chk = document.getElementById(`chk-src-${type}`);
      const input = document.getElementById(`weight-src-${type}`);
      if (input) input.disabled = !chk?.checked;
      if (chk?.checked) {
        selectedCount++;
        const val = Number(input?.value || 0);
        total += val;
        const limVal = typeof limits[type] === 'object' ? limits[type]?.max : limits[type];
        if (limVal != null && val > Math.round(limVal * 100)) {
          errors.push(`Nguồn ${type} vượt trần cho phép (${Math.round(limVal * 100)}%).`);
        }
      }
    });

    if (selectedCount < 2 || selectedCount > 4) {
      errors.push('Cần chọn từ 2 đến 4 nguồn độc lập.');
    }
    if (total !== 100) {
      errors.push(`Tổng trọng số phải bằng chính xác 100% (hiện là ${total}%).`);
    }

    const badge = document.getElementById('scheme-total-weight-badge');
    if (badge) {
      badge.textContent = `Tổng: ${total}%`;
      badge.className = `px-2.5 py-0.5 rounded font-mono font-bold text-xs ${total === 100 && errors.length === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`;
    }

    const msgEl = document.getElementById('scheme-validation-message');
    const submitBtn = document.getElementById('btn-submit-scheme');
    if (msgEl) {
      if (errors.length) {
        msgEl.className = 'p-3 rounded-lg text-xs leading-relaxed bg-rose-50 text-rose-700 border border-rose-200 space-y-1';
        msgEl.innerHTML = errors.map(e => `<div><i class="fa-solid fa-triangle-exclamation mr-1.5"></i>${e}</div>`).join('');
        msgEl.classList.remove('hidden');
        if (submitBtn) submitBtn.disabled = true;
      } else {
        msgEl.className = 'p-3 rounded-lg text-xs leading-relaxed bg-emerald-50 text-emerald-800 border border-emerald-200';
        msgEl.innerHTML = '<div><i class="fa-solid fa-circle-check mr-1.5 text-emerald-600"></i>Cấu hình thỏa mãn toàn bộ các trần/sàn và quy tắc kiểm soát hệ thống.</div>';
        msgEl.classList.remove('hidden');
        if (submitBtn) submitBtn.disabled = false;
      }
    }
  };

  window.submitNewSchemeForm = function (event) {
    event.preventDefault();
    if (!window.CompensationPlans) return;

    const dept = document.getElementById('scheme-input-department').value;
    const period = document.getElementById('scheme-input-period').value;
    const note = document.getElementById('scheme-input-note').value.trim();

    const sources = [];
    ['RULE_BASED', 'ML_PREDICTION', 'MANAGER_EVAL', 'KPI_REVENUE'].forEach(type => {
      const chk = document.getElementById(`chk-src-${type}`);
      const input = document.getElementById(`weight-src-${type}`);
      if (chk?.checked) {
        sources.push({
          type,
          weight: Math.round(Number(input?.value || 0)) / 100
        });
      }
    });

    const isManager = state.currentUser.role === 'manager';
    const actor = isManager ? state.currentUser.username || 'manager' : 'admin';

    const newPlanData = {
      department: dept,
      effective_from: period,
      sources,
      change_note: note || `Cập nhật cấu hình ${sources.map(s => `${(s.weight*100).toFixed(0)}% ${s.type}`).join(', ')}`
    };

    const addRes = CompensationPlans.addPlanVersion(newPlanData, actor);
    if (!addRes.valid) {
      showToast(addRes.errors.join(' '), 'warning');
      return;
    }

    if (isManager) {
      CompensationPlans.submitPlan(dept, addRes.plan.version, 'admin');
      showToast(`Đã tạo bản thảo v${addRes.plan.version} cho ${dept} và chuyển Hội đồng C&B xét duyệt.`, 'success');
    } else {
      CompensationPlans.approvePlan(dept, addRes.plan.version, 'admin');
      showToast(`Đã thiết lập và phê duyệt áp dụng ngay phiên bản v${addRes.plan.version} cho ${dept}.`, 'success');
    }

    closeNewSchemeModal();
    renderDepartmentSchemesView();
    renderDepartmentComparison();
  };

  window.executeApproveScheme = function (dept, version) {
    if (!window.CompensationPlans) return;
    const res = CompensationPlans.approvePlan(dept, version, state.currentUser.name || 'Admin C&B');
    if (!res.valid) {
      showToast(res.errors.join(' '), 'warning');
      return;
    }
    showToast(`Đã phê duyệt và kích hoạt áp dụng phiên bản v${version} cho ${dept}!`, 'success');
    renderDepartmentSchemesView();
    renderDepartmentComparison();
    if (state.activeTab === 'recommendation') {
      renderRecommendationView();
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
})(typeof window !== 'undefined' ? window : globalThis);
