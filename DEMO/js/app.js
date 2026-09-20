/**
 * APPLICATION CONTROLLER - NỀN TẢNG QUẢN LÝ & PHÂN TÍCH INCENTIVE
 * Quản lý trạng thái, tương tác người dùng, truy vết dữ liệu và trực quan hóa
 */

(function () {
  'use strict';

  // Toast thông báo không chặn luồng (Non-blocking Toast thay cho window.alert)
  function showToast(message, type = 'success') {
    console.log(`[Thông báo] ${message}`);
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-slate-900 text-white text-xs rounded shadow-xl border border-slate-700 flex items-center gap-2 transition-all duration-200 pointer-events-none opacity-0 translate-y-2';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fa-solid fa-circle-check text-teal-400"></i> <span>${message}</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
    }, 2800);
  }

  // State quản lý toàn cục
  const state = {
    datasetSource: 'benchmark', // 'benchmark' | 'kaggle' | 'custom'
    userRole: 'cb', // 'cb' | 'approver' | 'manager' | 'employee'
    activeTab: 'overview',
    privacyMasked: false,
    densityCompact: false,
    employees: [],
    legacyRows: [],
    selectedEmployeeId: null,
    searchQuery: '',
    filterDept: 'ALL',
    filterStatus: 'ALL',
    filterTier: 'ALL',
    sortCol: 'id',
    sortDir: 'asc',
    currentPage: 1,
    pageSize: 25,
    selectedIds: new Set(),
    batchStatus: 'NEEDS_REVIEW', // 'CALCULATED' | 'NEEDS_REVIEW' | 'APPROVED' | 'PAID'
    schemeConfig: { ...IncentiveEngine.DEFAULT_SCHEME_CONFIG },
    charts: {
      curve: null,
      bunching: null
    }
  };

  // Khởi tạo ứng dụng
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEvents();
  });

  function initApp() {
    loadBenchmarkData();
    initUrlHashRouting();
  }

  function setupEvents() {
    // Search input
    const searchInput = document.getElementById('input-search-employee');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        state.currentPage = 1;
        renderIncentiveTable();
      });
    }

    // Dataset selector
    const selectDataset = document.getElementById('select-dataset');
    if (selectDataset) {
      selectDataset.addEventListener('change', (e) => {
        if (e.target.value === 'benchmark') {
          loadBenchmarkData();
        } else if (e.target.value === 'kaggle') {
          loadLegacyCSV();
        }
      });
    }

    // File input custom CSV
    const fileInput = document.getElementById('csv-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              loadCustomCSV(results.data, file.name);
            }
          });
        }
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
        closePayrollModal();
      } else if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        switchTab('incentives');
        const input = document.getElementById('input-search-employee');
        if (input) input.focus();
      } else if (e.altKey && e.key >= '1' && e.key <= '7') {
        const tabs = ['overview', 'incentives', 'validation', 'calibration', 'approval', 'analytics', 'slip'];
        const idx = parseInt(e.key, 10) - 1;
        if (tabs[idx]) switchTab(tabs[idx]);
      }
    });

    // Window resize chart update
    window.addEventListener('resize', () => {
      if (state.activeTab === 'analytics') {
        renderPayoutCurveChart();
        renderBunchingChart();
      }
    });
  }

  // =========================================================================
  // NẠP DỮ LIỆU & TÍNH TOÁN
  // =========================================================================
  function loadBenchmarkData() {
    state.datasetSource = 'benchmark';
    document.getElementById('sidebar-dataset-label').innerText = 'Bộ chuẩn Q3/2026 (120 nhân sự)';
    document.getElementById('select-dataset').value = 'benchmark';

    // Sinh 120 nhân viên
    const rawList = BenchmarkDataset.generateBenchmarkDataset();

    // Tính toán lại toàn bộ qua Engine
    state.employees = rawList.map(emp => {
      const calc = IncentiveEngine.calculateEmployeeIncentive({
        target: emp.target,
        actual: emp.actual,
        difficultyFactor: emp.difficultyFactor,
        targetIncentive: emp.targetIncentive,
        config: state.schemeConfig
      });
      return {
        ...emp,
        calc
      };
    });

    populateDeptFilterOptions();
    refreshAllViews();
  }

  function loadLegacyCSV() {
    document.getElementById('sidebar-dataset-label').innerText = 'Đang tải Kaggle May mặc...';
    Papa.parse('csv.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        state.datasetSource = 'kaggle';
        document.getElementById('sidebar-dataset-label').innerText = `Kaggle CSV (${results.data.length.toLocaleString()} dòng)`;
        document.getElementById('select-dataset').value = 'kaggle';

        // Chuyển đổi sang format nhân sự
        state.employees = results.data.map((row, idx) => {
          const target = (parseFloat(row.targeted_productivity) || 0.8) * 1000;
          const actual = (parseFloat(row.actual_productivity) || 0) * 1000;
          const dept = (row.department || 'Sweing').trim();
          const team = row.team || '1';

          let valStatus = 'VALID';
          let status = 'CALCULATED';
          if (actual < target && parseFloat(row.incentive) > 0) {
            valStatus = 'UNEARNED_INCENTIVE';
            status = 'NEEDS_REVIEW';
          }

          const calc = IncentiveEngine.calculateEmployeeIncentive({
            target,
            actual,
            difficultyFactor: 1.0,
            targetIncentive: 20000000,
            config: state.schemeConfig
          });

          return {
            id: `KAG-${String(idx + 1).padStart(4, '0')}`,
            code: `${dept.substring(0, 3).toUpperCase()}-T${team}-${idx + 1}`,
            name: `Công nhân May Đội ${team} (#${idx + 1})`,
            role: `Thợ may xưởng ${dept}`,
            department: dept.toUpperCase(),
            email: `worker${idx + 1}@factory.vn`,
            avatar: 'CN',
            target,
            actual,
            difficultyFactor: 1.0,
            targetIncentive: 20000000,
            status,
            validationStatus: valStatus,
            isNeo: false,
            contracts: [{ code: `CA-${row.date || '01/01/2015'}`, client: `Kế hoạch xưởng ${dept}`, amount: actual, date: row.date || '01/01/2015' }],
            auditLog: [{ time: row.date || '01/01/2015', user: 'Hệ thống chuyền', action: `Ghi nhận năng suất: ${(actual / 10).toFixed(1)}%` }],
            calibration: null,
            calc
          };
        });

        populateDeptFilterOptions();
        refreshAllViews();
      },
      error: () => {
        showToast('Không tải được file csv.csv. Bạn có thể bấm nút Tải file CSV để chọn file từ máy.', 'warning');
      }
    });
  }

  function loadCustomCSV(data, fileName) {
    state.datasetSource = 'custom';
    document.getElementById('sidebar-dataset-label').innerText = `${fileName} (${data.length} dòng)`;

    state.employees = data.map((row, idx) => {
      const target = parseFloat(row.target || row.targeted_productivity || 800) || 800;
      const actual = parseFloat(row.actual || row.actual_productivity || 800) || 800;
      const name = row.name || row.employee_name || `Nhân viên ${idx + 1}`;
      const dept = row.department || row.dept || 'Kinh doanh';

      const calc = IncentiveEngine.calculateEmployeeIncentive({
        target,
        actual,
        difficultyFactor: 1.0,
        targetIncentive: 20000000,
        config: state.schemeConfig
      });

      return {
        id: `CUS-${String(idx + 1).padStart(3, '0')}`,
        code: `NV-${idx + 1}`,
        name,
        role: 'Chuyên viên',
        department: dept,
        email: `nv${idx + 1}@custom.vn`,
        avatar: 'NV',
        target,
        actual,
        difficultyFactor: 1.0,
        targetIncentive: 20000000,
        status: 'CALCULATED',
        validationStatus: 'VALID',
        isNeo: false,
        contracts: [{ code: `HĐ-${idx + 1}`, client: 'Khách hàng', amount: actual, date: '01/08/2026' }],
        auditLog: [{ time: '01/08/2026', user: 'CSV Upload', action: 'Nạp từ CSV' }],
        calibration: null,
        calc
      };
    });

    populateDeptFilterOptions();
    refreshAllViews();
  }

  function populateDeptFilterOptions() {
    const select = document.getElementById('filter-incentive-dept');
    if (!select) return;
    const depts = [...new Set(state.employees.map(e => e.department))].filter(Boolean);
    select.innerHTML = '<option value="ALL">Tất cả phòng ban</option>' +
      depts.map(d => `<option value="${d}">${d}</option>`).join('');
  }

  function recalculateAllEmployees() {
    state.employees.forEach(emp => {
      emp.calc = IncentiveEngine.calculateEmployeeIncentive({
        target: emp.target,
        actual: emp.actual,
        difficultyFactor: emp.difficultyFactor,
        targetIncentive: emp.targetIncentive,
        config: state.schemeConfig
      });
    });
  }

  function refreshAllViews() {
    renderOverview();
    renderIncentiveTable();
    renderValidationQueue();
    renderCalibrationBoard();
    renderBatchApproval();
    renderEmployeeSlip('EMP-002');
    updateBadges();

    if (state.activeTab === 'analytics') {
      renderPayoutCurveChart();
      renderBunchingChart();
    }
  }

  // =========================================================================
  // VIEW 1: OVERVIEW (TỔNG QUAN KỲ THƯỞNG)
  // =========================================================================
  function renderOverview() {
    const totalPayout = state.employees.reduce((sum, e) => sum + e.calc.incentiveAmount, 0);
    const avgRate = state.employees.length > 0
      ? state.employees.reduce((sum, e) => sum + e.calc.achievementRate, 0) / state.employees.length
      : 0;
    const qualifiedCount = state.employees.filter(e => e.calc.achievementRate >= state.schemeConfig.thresholdMin).length;
    const pendingIssues = state.employees.filter(e => e.validationStatus !== 'VALID').length;

    // Chỉ số phẳng
    const companyBudget = 1750000000; // 1.75 tỷ VNĐ (Ngân sách toàn công ty 120 người)
    document.getElementById('stat-total-payout').innerText = IncentiveEngine.formatVND(totalPayout, state.privacyMasked);
    document.getElementById('stat-avg-rate').innerText = IncentiveEngine.formatPercent(avgRate, 1);
    document.getElementById('stat-qualified-count').innerText = `${qualifiedCount} / ${state.employees.length} nhân sự đủ điều kiện thưởng (≥ 70%)`;
    document.getElementById('stat-pending-tasks').innerText = `${pendingIssues} việc`;

    const budgetRatio = (totalPayout / companyBudget * 100).toFixed(1);
    const budgetElem = document.getElementById('stat-budget-ratio');
    if (budgetElem) {
      budgetElem.innerText = `${budgetRatio}% ngân sách`;
      if (budgetRatio > 115) {
        budgetElem.className = 'text-xs font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded';
      } else {
        budgetElem.className = 'text-xs font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded';
      }
    }

    // Action items queue
    const container = document.getElementById('overview-action-items');
    if (container) {
      const dung = state.employees.find(e => e.id === 'EMP-004');
      const binh = state.employees.find(e => e.id === 'EMP-002');
      const isDungResolved = dung && dung.duplicateInfo && dung.duplicateInfo.isResolved;
      const isBinhApproved = binh && binh.calibration && binh.calibration.status === 'APPROVED';

      let itemsHtml = '';

      // Item 1: Dũng
      itemsHtml += `
        <div class="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
          <div class="flex items-start gap-3">
            <span class="w-6 h-6 rounded ${isDungResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              <i class="fa-solid ${isDungResolved ? 'fa-check' : 'fa-triangle-exclamation'}"></i>
            </span>
            <div>
              <p class="font-medium text-slate-800 text-xs">
                ${isDungResolved ? '<span class="line-through text-slate-400">Bản ghi hợp đồng trùng lặp của Phạm Tiến Dũng (90M VNĐ)</span> &bull; <span class="text-emerald-700 font-semibold">Đã khấu trừ thành công</span>' : 'Phát hiện bản ghi hợp đồng trùng lặp: Phạm Tiến Dũng (90M VNĐ)'}
              </p>
              <p class="text-[11px] text-slate-500 mt-0.5">Hợp đồng HĐ-RET-099 bị nhập 2 lần. Cần khấu trừ 90M để đưa doanh số về 900M chuẩn.</p>
            </div>
          </div>
          <div>
            ${isDungResolved
              ? '<span class="text-emerald-700 text-xs font-medium"><i class="fa-solid fa-circle-check"></i> Đã xử lý</span>'
              : '<button onclick="resolveDungDuplicate()" class="px-2.5 py-1 bg-teal-800 hover:bg-teal-900 text-white rounded text-xs font-medium transition">Khấu trừ ngay</button>'
            }
          </div>
        </div>
      `;

      // Item 2: Bình
      itemsHtml += `
        <div class="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
          <div class="flex items-start gap-3">
            <span class="w-6 h-6 rounded ${isBinhApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-teal-100 text-teal-800'} flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              <i class="fa-solid ${isBinhApproved ? 'fa-check' : 'fa-sliders'}"></i>
            </span>
            <div>
              <p class="font-medium text-slate-800 text-xs">
                ${isBinhApproved ? '<span class="line-through text-slate-400">Đề xuất hiệu chỉnh hệ số độ khó 0.9 của Trần Thị Bình</span> &bull; <span class="text-emerald-700 font-semibold">Hội đồng đã phê duyệt</span>' : 'Đề xuất hiệu chỉnh hệ số độ khó 0.9 cho Trần Thị Bình (MN-008)'}
              </p>
              <p class="text-[11px] text-slate-500 mt-0.5">Do thị trường Đông Nam Bộ co hẹp 10.2%. Target hiệu chỉnh: 1.000M &rarr; 900M.</p>
            </div>
          </div>
          <div>
            ${isBinhApproved
              ? '<span class="text-emerald-700 text-xs font-medium"><i class="fa-solid fa-circle-check"></i> Đã duyệt</span>'
              : '<button onclick="switchTab(\'calibration\')" class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition">Xem xét & Duyệt</button>'
            }
          </div>
        </div>
      `;

      // Item 3: Batch Approval
      const canApproveBatch = isDungResolved && isBinhApproved;
      itemsHtml += `
        <div class="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
          <div class="flex items-start gap-3">
            <span class="w-6 h-6 rounded ${state.batchStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'} flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              <i class="fa-solid ${state.batchStatus === 'PAID' ? 'fa-check-double' : 'fa-file-invoice-dollar'}"></i>
            </span>
            <div>
              <p class="font-medium text-slate-800 text-xs">Phê duyệt lô chi trả kỳ Q3/2026 và xuất file sang Payroll</p>
              <p class="text-[11px] text-slate-500 mt-0.5">Quyết toán ${state.employees.length} nhân sự &bull; Ngân sách dự kiến: 83.800.000 ₫.</p>
            </div>
          </div>
          <div>
            ${state.batchStatus === 'PAID'
              ? '<span class="text-emerald-700 text-xs font-semibold"><i class="fa-solid fa-check"></i> Đã chi trả</span>'
              : `<button onclick="switchTab('approval')" class="px-2.5 py-1 ${canApproveBatch ? 'bg-teal-800 hover:bg-teal-900 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'} rounded text-xs font-medium transition">Đi tới phê duyệt</button>`
            }
          </div>
        </div>
      `;

      container.innerHTML = itemsHtml;
    }

    // Benchmark 4 anchor personas table
    renderBenchmarkAnchorTable();
  }

  function renderBenchmarkAnchorTable() {
    const tbody = document.getElementById('benchmark-anchor-table-body');
    if (!tbody) return;

    const neoList = state.employees.filter(e => e.isNeo);
    if (neoList.length === 0) return;

    tbody.innerHTML = neoList.map(e => {
      const c = e.calc;
      return `
        <tr onclick="openDrawer('${e.id}')">
          <td class="font-semibold text-slate-900">
            ${e.name}
            <span class="block text-[11px] text-slate-400 font-normal font-mono">${e.code}</span>
          </td>
          <td>${e.department}</td>
          <td class="text-right font-mono">${IncentiveEngine.formatNumberVN(e.target, 0)}</td>
          <td class="text-right font-mono font-medium ${e.duplicateInfo && !e.duplicateInfo.isResolved ? 'text-amber-600' : 'text-slate-900'}">
            ${IncentiveEngine.formatNumberVN(e.actual, 0)}
            ${e.duplicateInfo && !e.duplicateInfo.isResolved ? '<span class="block text-[10px] text-rose-600 font-normal">Trùng 90M</span>' : ''}
          </td>
          <td class="text-right font-mono ${c.difficultyFactor !== 1.0 ? 'text-teal-700 font-bold' : ''}">
            ${IncentiveEngine.formatNumberVN(c.difficultyFactor, 2)}
          </td>
          <td class="text-right font-mono font-bold ${c.achievementRate >= 1.0 ? 'text-teal-800' : c.achievementRate >= 0.7 ? 'text-amber-700' : 'text-slate-400'}">
            ${IncentiveEngine.formatPercent(c.achievementRate, 1)}
          </td>
          <td class="text-right font-mono">${IncentiveEngine.formatNumberVN(c.payoutFactor, 3)}</td>
          <td class="text-right font-mono text-slate-400 italic masked-amount">
            ${IncentiveEngine.formatVND(c.rawIncentiveAmount, state.privacyMasked)}
          </td>
          <td class="text-right font-mono font-bold text-teal-800 bg-teal-50/50 masked-amount">
            ${IncentiveEngine.formatVND(c.incentiveAmount, state.privacyMasked)}
          </td>
          <td class="text-xs text-slate-500">
            ${e.id === 'EMP-001' ? '<span class="text-teal-700">Đạt 115% &bull; Thưởng 27.5M</span>' : ''}
            ${e.id === 'EMP-002' ? (c.difficultyFactor === 0.9 ? '<span class="text-emerald-700 font-medium">Đã duyệt độ khó 0.9 (10M &rarr; 16.3M)</span>' : '<span class="text-amber-600 font-medium">Chờ duyệt độ khó 0.9</span>') : ''}
            ${e.id === 'EMP-003' ? 'Đạt chuẩn 100% &bull; Thưởng 20.0M' : ''}
            ${e.id === 'EMP-004' ? (e.duplicateInfo && e.duplicateInfo.isResolved ? '<span class="text-emerald-700 font-medium">Đã gỡ trùng 90M (25M &rarr; 20M)</span>' : '<span class="text-rose-600 font-medium">Có trùng 90M (Cần gỡ)</span>') : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // VIEW 2: INCENTIVE LIST (BẢNG DỮ LIỆU TRUNG TÂM)
  // =========================================================================
  function renderIncentiveTable() {
    const tbody = document.getElementById('incentive-table-body');
    if (!tbody) return;

    // Filter
    let list = [...state.employees];

    if (state.searchQuery) {
      list = list.filter(e =>
        e.name.toLowerCase().includes(state.searchQuery) ||
        e.code.toLowerCase().includes(state.searchQuery) ||
        e.department.toLowerCase().includes(state.searchQuery)
      );
    }

    if (state.filterDept !== 'ALL') {
      list = list.filter(e => e.department === state.filterDept);
    }

    if (state.filterStatus !== 'ALL') {
      list = list.filter(e => e.status === state.filterStatus || e.validationStatus === state.filterStatus);
    }

    if (state.filterTier !== 'ALL') {
      if (state.filterTier === 'BELOW_70') {
        list = list.filter(e => e.calc.achievementRate < 0.70);
      } else if (state.filterTier === '70_100') {
        list = list.filter(e => e.calc.achievementRate >= 0.70 && e.calc.achievementRate <= 1.00);
      } else if (state.filterTier === '100_120') {
        list = list.filter(e => e.calc.achievementRate > 1.00 && e.calc.achievementRate <= 1.20);
      } else if (state.filterTier === 'ABOVE_120') {
        list = list.filter(e => e.calc.achievementRate > 1.20);
      } else if (state.filterTier === 'BUNCHING') {
        list = list.filter(e => e.calc.achievementRate >= 0.95 && e.calc.achievementRate <= 0.995);
      }
    }

    // Sort
    list.sort((a, b) => {
      let vA, vB;
      if (state.sortCol === 'name') {
        vA = a.name; vB = b.name;
      } else if (state.sortCol === 'target') {
        vA = a.target; vB = b.target;
      } else if (state.sortCol === 'actual') {
        vA = a.actual; vB = b.actual;
      } else if (state.sortCol === 'difficultyFactor') {
        vA = a.calc.difficultyFactor; vB = b.calc.difficultyFactor;
      } else if (state.sortCol === 'achievementRate') {
        vA = a.calc.achievementRate; vB = b.calc.achievementRate;
      } else if (state.sortCol === 'payoutFactor') {
        vA = a.calc.payoutFactor; vB = b.calc.payoutFactor;
      } else if (state.sortCol === 'incentiveAmount') {
        vA = a.calc.incentiveAmount; vB = b.calc.incentiveAmount;
      } else {
        vA = a.id; vB = b.id;
      }
      if (vA < vB) return state.sortDir === 'asc' ? -1 : 1;
      if (vA > vB) return state.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const totalFiltered = list.length;
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const paginatedList = list.slice(startIndex, startIndex + state.pageSize);

    // Update footer info
    document.getElementById('table-selection-summary').innerText =
      `Hiển thị ${Math.min(startIndex + 1, totalFiltered)} - ${Math.min(startIndex + paginatedList.length, totalFiltered)} trên tổng số ${totalFiltered} nhân sự`;

    renderPaginationControls(totalFiltered);

    if (paginatedList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="p-8 text-center text-slate-400">
            <i class="fa-solid fa-folder-open text-2xl mb-2"></i>
            <p>Không tìm thấy nhân sự phù hợp với bộ lọc hiện tại.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = paginatedList.map(e => {
      const c = e.calc;
      const isSelected = state.selectedIds.has(e.id);
      let statusBadge = '';

      if (e.validationStatus === 'DUPLICATE_ENTRY') {
        statusBadge = '<span class="badge badge-danger"><i class="fa-solid fa-copy"></i> Trùng HĐ (90M)</span>';
      } else if (e.validationStatus === 'PENDING_CALIBRATION') {
        statusBadge = '<span class="badge badge-review"><i class="fa-solid fa-sliders"></i> Chờ hiệu chỉnh</span>';
      } else if (e.validationStatus === 'INVALID_TARGET') {
        statusBadge = '<span class="badge badge-danger"><i class="fa-solid fa-circle-exclamation"></i> Thiếu Target</span>';
      } else if (e.validationStatus === 'UNASSIGNED_SCHEME') {
        statusBadge = '<span class="badge badge-review"><i class="fa-solid fa-link-slash"></i> Chưa gán Scheme</span>';
      } else if (e.validationStatus === 'EXTREME_INCENTIVE') {
        statusBadge = '<span class="badge badge-review"><i class="fa-solid fa-bolt"></i> Outlier cao</span>';
      } else if (e.status === 'PAID') {
        statusBadge = '<span class="badge badge-valid"><i class="fa-solid fa-check-double"></i> Đã chi trả</span>';
      } else if (e.status === 'APPROVED') {
        statusBadge = '<span class="badge badge-valid"><i class="fa-solid fa-check"></i> Đã duyệt</span>';
      } else {
        statusBadge = '<span class="badge badge-neutral"><i class="fa-solid fa-circle-check"></i> Hợp lệ</span>';
      }

      return `
        <tr class="${isSelected ? 'row-selected' : ''} ${e.isNeo ? 'bg-teal-50/20' : ''}" onclick="openDrawer('${e.id}')">
          <td class="text-center" onclick="event.stopPropagation()">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSelectRow('${e.id}', this.checked)">
          </td>
          <td class="font-mono text-xs text-slate-500">${e.code}</td>
          <td class="font-medium text-slate-900">
            ${e.name}
            ${e.isNeo ? '<span class="ml-1 text-[10px] text-teal-800 bg-teal-100/60 px-1 py-0.2 rounded font-bold">Neo</span>' : ''}
          </td>
          <td class="text-slate-600 text-xs">${e.department}</td>
          <td class="text-right font-mono text-slate-700">${IncentiveEngine.formatNumberVN(e.target, 0)}</td>
          <td class="text-right font-mono text-slate-900 font-medium">${IncentiveEngine.formatNumberVN(e.actual, 0)}</td>
          <td class="text-right font-mono ${c.difficultyFactor !== 1.0 ? 'text-teal-700 font-bold' : 'text-slate-500'}">
            ${IncentiveEngine.formatNumberVN(c.difficultyFactor, 2)}
          </td>
          <td class="text-right font-mono font-bold ${c.achievementRate >= 1.0 ? 'text-teal-800' : c.achievementRate >= 0.7 ? 'text-amber-700' : 'text-slate-400'}">
            ${IncentiveEngine.formatPercent(c.achievementRate, 1)}
          </td>
          <td class="text-right font-mono text-slate-700">${IncentiveEngine.formatNumberVN(c.payoutFactor, 3)}</td>
          <td class="text-right font-mono font-bold text-slate-900 masked-amount">
            ${IncentiveEngine.formatVND(c.incentiveAmount, state.privacyMasked)}
          </td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  function renderPaginationControls(totalFiltered) {
    const container = document.getElementById('table-pagination-controls');
    if (!container) return;

    const totalPages = Math.ceil(totalFiltered / state.pageSize) || 1;
    let html = `
      <button onclick="changePage(${state.currentPage - 1})" ${state.currentPage <= 1 ? 'disabled class="px-2 py-1 border border-slate-200 rounded text-slate-300 cursor-not-allowed"' : 'class="px-2 py-1 border border-slate-200 rounded text-slate-700 hover:bg-slate-100"'}>
        <i class="fa-solid fa-chevron-left text-[10px]"></i>
      </button>
      <span class="px-2">Trang ${state.currentPage} / ${totalPages}</span>
      <button onclick="changePage(${state.currentPage + 1})" ${state.currentPage >= totalPages ? 'disabled class="px-2 py-1 border border-slate-200 rounded text-slate-300 cursor-not-allowed"' : 'class="px-2 py-1 border border-slate-200 rounded text-slate-700 hover:bg-slate-100"'}>
        <i class="fa-solid fa-chevron-right text-[10px]"></i>
      </button>
    `;
    container.innerHTML = html;
  }

  window.changePage = function (page) {
    state.currentPage = page;
    renderIncentiveTable();
  };

  window.sortBy = function (col) {
    if (state.sortCol === col) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortCol = col;
      state.sortDir = 'asc';
    }
    renderIncentiveTable();
  };

  window.applyFilters = function () {
    state.filterDept = document.getElementById('filter-incentive-dept').value;
    state.filterStatus = document.getElementById('filter-incentive-status').value;
    state.filterTier = document.getElementById('filter-incentive-tier').value;
    state.currentPage = 1;
    renderIncentiveTable();
  };

  window.resetFilters = function () {
    state.filterDept = 'ALL';
    state.filterStatus = 'ALL';
    state.filterTier = 'ALL';
    state.searchQuery = '';
    document.getElementById('input-search-employee').value = '';
    document.getElementById('filter-incentive-dept').value = 'ALL';
    document.getElementById('filter-incentive-status').value = 'ALL';
    document.getElementById('filter-incentive-tier').value = 'ALL';
    state.currentPage = 1;
    renderIncentiveTable();
  };

  window.toggleSelectRow = function (id, checked) {
    if (checked) state.selectedIds.add(id);
    else state.selectedIds.delete(id);
    renderIncentiveTable();
  };

  window.toggleSelectAll = function (elem) {
    if (elem.checked) {
      state.employees.forEach(e => state.selectedIds.add(e.id));
    } else {
      state.selectedIds.clear();
    }
    renderIncentiveTable();
  };

  // =========================================================================
  // VIEW 3: VALIDATION QUEUE (KIỂM TRA DỮ LIỆU)
  // =========================================================================
  function renderValidationQueue(filterType = 'ALL') {
    const container = document.getElementById('validation-queue-container');
    if (!container) return;

    let issues = state.employees.filter(e => e.validationStatus !== 'VALID');
    if (filterType !== 'ALL') {
      issues = issues.filter(e => e.validationStatus === filterType);
    }

    // Update counts
    document.getElementById('val-count-all').innerText = state.employees.filter(e => e.validationStatus !== 'VALID').length;

    if (issues.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center bg-white border border-slate-200 rounded-md">
          <i class="fa-solid fa-circle-check text-3xl text-emerald-600 mb-2"></i>
          <h4 class="font-semibold text-slate-800 text-sm">Toàn bộ dữ liệu kỳ Q3/2026 đã hợp lệ</h4>
          <p class="text-xs text-slate-500 mt-1">Không phát hiện bản ghi trùng lặp, thiếu target hay bất thường nào.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = issues.map(e => {
      if (e.id === 'EMP-004') {
        // Dũng: Duplicate contract
        const isResolved = e.duplicateInfo && e.duplicateInfo.isResolved;
        return `
          <div class="border border-slate-200 bg-white rounded-md p-5 space-y-4">
            <div class="flex items-start justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded ${isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} flex items-center justify-center font-bold text-sm">
                  <i class="fa-solid ${isResolved ? 'fa-check' : 'fa-copy'}"></i>
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900">${e.name}</span>
                    <span class="text-xs text-slate-400 font-mono">(${e.code}) &bull; ${e.department}</span>
                    <span class="badge ${isResolved ? 'badge-valid' : 'badge-danger'}">${isResolved ? 'Đã giải quyết' : 'Bản ghi trùng lặp'}</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5">Phát hiện 2 hợp đồng mã <strong>HĐ-RET-099</strong> có cùng số tiền 90.000.000 ₫.</p>
                </div>
              </div>
              <div>
                ${isResolved
                  ? '<span class="text-xs text-emerald-700 font-semibold"><i class="fa-solid fa-check"></i> Đã khấu trừ 90M</span>'
                  : '<button onclick="resolveDungDuplicate()" class="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded text-xs font-semibold transition flex items-center gap-1"><i class="fa-solid fa-scissors"></i> Khấu trừ bản ghi trùng</button>'
                }
              </div>
            </div>

            <!-- Before vs After Diff -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div class="p-3 bg-rose-50/50 border border-rose-200 rounded">
                <span class="font-semibold text-rose-900 block mb-2"><i class="fa-solid fa-xmark mr-1"></i> Dữ liệu ghi nhận thô (Trước xử lý):</span>
                <div class="space-y-1 text-slate-700">
                  <div class="flex justify-between"><span>Target:</span><strong>900M ₫</strong></div>
                  <div class="flex justify-between"><span>Doanh số thô:</span><strong class="text-rose-700 font-mono">990M ₫</strong></div>
                  <div class="flex justify-between"><span>Achievement Rate thô:</span><strong>110.0%</strong></div>
                  <div class="flex justify-between"><span>Hệ số chi trả thô:</span><strong>1.250x</strong></div>
                  <div class="flex justify-between pt-1 border-t border-rose-200"><span>Tiền thưởng thô:</span><strong class="text-rose-700 font-mono">25.000.000 ₫ (Trả thừa 5M)</strong></div>
                </div>
              </div>

              <div class="p-3 bg-emerald-50/50 border border-emerald-200 rounded">
                <span class="font-semibold text-emerald-900 block mb-2"><i class="fa-solid fa-check mr-1"></i> Dữ liệu chuẩn xác thực (Sau xử lý):</span>
                <div class="space-y-1 text-slate-700">
                  <div class="flex justify-between"><span>Target chuẩn:</span><strong>900M ₫</strong></div>
                  <div class="flex justify-between"><span>Doanh số chuẩn:</span><strong class="text-emerald-700 font-mono">900M ₫ (Khấu trừ 90M)</strong></div>
                  <div class="flex justify-between"><span>Achievement Rate chuẩn:</span><strong>100.0%</strong></div>
                  <div class="flex justify-between"><span>Hệ số chi trả chuẩn:</span><strong>1.000x</strong></div>
                  <div class="flex justify-between pt-1 border-t border-emerald-200"><span>Tiền thưởng thực nhận:</span><strong class="text-emerald-700 font-mono">20.000.000 ₫ (Chính xác)</strong></div>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (e.id === 'EMP-002') {
        // Bình: Pending calibration
        return `
          <div class="border border-slate-200 bg-white rounded-md p-5 space-y-3">
            <div class="flex items-start justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                  <i class="fa-solid fa-sliders"></i>
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900">${e.name}</span>
                    <span class="text-xs text-slate-400 font-mono">(${e.code}) &bull; ${e.department}</span>
                    <span class="badge badge-review">Chờ duyệt hiệu chỉnh độ khó</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5">Line Manager đề xuất hệ số 0.9 do thị trường vùng suy thoái 10.2%.</p>
                </div>
              </div>
              <button onclick="switchTab('calibration')" class="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition">
                Tới hội đồng hiệu chỉnh &rarr;
              </button>
            </div>
            <p class="text-xs text-slate-600">
              Target gốc: 1.000M &rarr; Target hiệu chỉnh đề xuất: 900M. Thưởng dự kiến điều chỉnh từ 10.0M lên 16.3M.
            </p>
          </div>
        `;
      } else {
        // General issue cards
        return `
          <div class="border border-slate-200 bg-white rounded-md p-4 flex items-center justify-between text-xs">
            <div class="flex items-center gap-3">
              <span class="w-7 h-7 rounded bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </span>
              <div>
                <span class="font-semibold text-slate-900">${e.name} (${e.code})</span>
                <p class="text-slate-500">${e.validationStatus === 'INVALID_TARGET' ? 'Mục tiêu (Target) chưa được cấu hình hoặc bằng 0.' : e.validationStatus === 'UNASSIGNED_SCHEME' ? 'Chưa gán công thức Scheme cho nhân sự này.' : 'Doanh số thực tế vọt mức bất thường (> 200%). Cần đối chiếu hóa đơn VAT.'}</p>
              </div>
            </div>
            <button onclick="resolveGenericAnomaly('${e.id}')" class="px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-100 font-medium">Xác thực & Bỏ qua</button>
          </div>
        `;
      }
    }).join('');
  }

  window.filterValidationQueue = function (type) {
    document.querySelectorAll('[id^="val-btn-"]').forEach(btn => {
      btn.className = 'px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50';
    });
    const active = document.getElementById(type === 'ALL' ? 'val-btn-ALL' : `val-btn-${type.replace('_ENTRY', '').replace('PENDING_', '').replace('INVALID_', '').replace('EXTREME_', '').replace('UNASSIGNED_', '')}`);
    if (active) active.className = 'px-2.5 py-1 rounded bg-slate-900 text-white font-medium';
    renderValidationQueue(type);
  };

  window.runFullDataValidation = function () {
    showToast('Hệ thống đã hoàn tất quét 120 bản ghi. Phát hiện 1 lỗi bản ghi trùng lặp và 1 đề xuất hiệu chỉnh.');
    renderValidationQueue();
  };

  window.resolveDungDuplicate = function () {
    const dung = state.employees.find(e => e.id === 'EMP-004');
    if (!dung) return;

    dung.actual = 900; // Khấu trừ 90M
    dung.validationStatus = 'VALID';
    dung.status = 'CALCULATED';
    if (dung.duplicateInfo) {
      dung.duplicateInfo.isResolved = true;
    }
    // Cập nhật hợp đồng
    const dupContract = dung.contracts.find(c => c.isDuplicate);
    if (dupContract) dupContract.isRemoved = true;

    dung.auditLog.push({
      time: new Date().toLocaleString('vi-VN'),
      user: 'C&B Specialist (Thu Trang)',
      action: 'Xử lý gỡ bỏ bản ghi trùng hợp đồng HĐ-RET-099 (90M VNĐ). Doanh số thực tế cập nhật về 900M VNĐ.'
    });

    // Tính toán lại
    dung.calc = IncentiveEngine.calculateEmployeeIncentive({
      target: dung.target,
      actual: dung.actual,
      difficultyFactor: dung.difficultyFactor,
      targetIncentive: dung.targetIncentive,
      config: state.schemeConfig
    });

    refreshAllViews();
    showToast('Đã khấu trừ thành công bản ghi trùng 90M VNĐ của Phạm Tiến Dũng. Thưởng chuẩn: 20.000.000 ₫.');
  };

  window.resolveGenericAnomaly = function (empId) {
    const emp = state.employees.find(e => e.id === empId);
    if (!emp) return;
    emp.validationStatus = 'VALID';
    emp.status = 'CALCULATED';
    emp.auditLog.push({
      time: new Date().toLocaleString('vi-VN'),
      user: 'C&B Specialist',
      action: 'Xác thực và chuyển trạng thái về Hợp lệ.'
    });
    refreshAllViews();
    showToast(`Đã xác thực và chuyển ${emp.name} về trạng thái Hợp lệ.`);
  };

  // =========================================================================
  // VIEW 4: TARGET CALIBRATION (HIỆU CHỈNH ĐỘ KHÓ)
  // =========================================================================
  function renderCalibrationBoard() {
    const container = document.getElementById('calibration-proposals-container');
    const logContainer = document.getElementById('calibration-audit-log');
    if (!container) return;

    const binh = state.employees.find(e => e.id === 'EMP-002');
    if (!binh || !binh.calibration) return;

    const isApproved = binh.calibration.status === 'APPROVED';

    container.innerHTML = `
      <div class="border border-slate-200 rounded-md p-5 space-y-4 bg-slate-50/50">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-sm">
              ${binh.avatar}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-slate-900 text-sm">${binh.name}</h3>
                <span class="text-xs text-slate-500 font-mono">${binh.code}</span>
                <span class="badge ${isApproved ? 'badge-valid' : 'badge-review'}">
                  ${isApproved ? '<i class="fa-solid fa-check"></i> Đã phê duyệt hệ số 0.9' : 'Chờ Hội đồng duyệt'}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">${binh.role} &bull; ${binh.department}</p>
            </div>
          </div>

          <div>
            ${isApproved
              ? '<span class="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded inline-flex items-center gap-1"><i class="fa-solid fa-check-circle"></i> Đã ghi nhận quyết định</span>'
              : `
                <div class="flex items-center gap-2">
                  <button onclick="approveBinhCalibration()" class="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded text-xs font-semibold transition flex items-center gap-1.5">
                    <i class="fa-solid fa-stamp"></i> Phê duyệt hệ số 0.9
                  </button>
                  <button onclick="showToast('Đã ghi nhận ý kiến phản hồi về đề xuất.', 'info')" class="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-700 hover:bg-slate-100">
                    Từ chối
                  </button>
                </div>
              `
            }
          </div>
        </div>

        <!-- Proposal details -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
          <div class="p-3 bg-white border border-slate-200 rounded space-y-1">
            <span class="text-slate-500 font-medium">Người đề xuất:</span>
            <p class="font-semibold text-slate-900">${binh.calibration.proposer}</p>
            <span class="text-[11px] text-slate-400">Ngày gửi: ${binh.calibration.submitDate}</span>
          </div>

          <div class="p-3 bg-white border border-slate-200 rounded space-y-1">
            <span class="text-slate-500 font-medium">Chỉ tiêu ban đầu vs Đề xuất:</span>
            <p class="font-semibold text-slate-900">1.000M VNĐ &rarr; <span class="text-teal-800 font-bold">900M VNĐ</span></p>
            <span class="text-[11px] text-slate-400">Hệ số độ khó đề xuất: <strong>0.90</strong></span>
          </div>

          <div class="p-3 bg-white border border-slate-200 rounded space-y-1">
            <span class="text-slate-500 font-medium">Tác động tài chính:</span>
            <p class="font-semibold text-slate-900">Thưởng: 10.0M &rarr; <span class="text-teal-800 font-bold">16.3M VNĐ</span></p>
            <span class="text-[11px] text-slate-400">Chênh lệch: +6.300.000 ₫ (Sửa sai lệch target)</span>
          </div>
        </div>

        <!-- Evidence attachment -->
        <div class="p-3.5 bg-white border border-slate-200 rounded text-xs space-y-1.5">
          <span class="font-semibold text-slate-800 flex items-center gap-1.5">
            <i class="fa-solid fa-paperclip text-slate-400"></i> Bằng chứng khách quan đính kèm:
          </span>
          <p class="text-slate-600 leading-relaxed">${binh.calibration.evidence}</p>
        </div>
      </div>
    `;

    // Audit log
    if (logContainer) {
      logContainer.innerHTML = binh.auditLog.map(l => `
        <div class="py-2.5 flex items-start justify-between">
          <div>
            <span class="font-medium text-slate-800">${l.action}</span>
            <p class="text-[11px] text-slate-400 mt-0.5">Thực hiện bởi: <strong>${l.user}</strong></p>
          </div>
          <span class="text-[11px] text-slate-400 font-mono">${l.time}</span>
        </div>
      `).join('');
    }
  }

  window.approveBinhCalibration = function () {
    const binh = state.employees.find(e => e.id === 'EMP-002');
    if (!binh) return;

    binh.difficultyFactor = 0.9;
    binh.validationStatus = 'VALID';
    binh.status = 'APPROVED';
    if (binh.calibration) {
      binh.calibration.status = 'APPROVED';
      binh.calibration.reviewedBy = 'Trần Đức Minh (Kế toán trưởng & Đại diện Hội đồng)';
      binh.calibration.reviewDate = new Date().toLocaleDateString('vi-VN');
    }

    binh.auditLog.push({
      time: new Date().toLocaleString('vi-VN'),
      user: 'Hội đồng Hiệu chỉnh (Trần Đức Minh - Kế toán trưởng)',
      action: 'PHÊ DUYỆT hệ số độ khó 0.9. Target hiệu chỉnh xác lập: 900M VNĐ. Achievement Rate đạt 94.4%, tiền thưởng chuẩn: 16.296.300 ₫.'
    });

    binh.calc = IncentiveEngine.calculateEmployeeIncentive({
      target: binh.target,
      actual: binh.actual,
      difficultyFactor: binh.difficultyFactor,
      targetIncentive: binh.targetIncentive,
      config: state.schemeConfig
    });

    refreshAllViews();
    showToast('Hội đồng đã phê duyệt thành công hệ số 0.9 cho Trần Thị Bình. Thưởng mới: 16.300.000 ₫.');
  };

  // =========================================================================
  // VIEW 5: BATCH APPROVAL & PAYROLL EXPORT
  // =========================================================================
  function renderBatchApproval() {
    const tbody = document.getElementById('payroll-preview-tbody');
    if (!tbody) return;

    const totalPayout = state.employees.reduce((s, e) => s + e.calc.incentiveAmount, 0);
    const qualified = state.employees.filter(e => e.calc.achievementRate >= state.schemeConfig.thresholdMin);

    document.getElementById('batch-employee-count').innerText = `${qualified.length} nhân sự`;
    document.getElementById('batch-payout-amount').innerText = IncentiveEngine.formatVND(totalPayout, state.privacyMasked);

    const statusElem = document.getElementById('batch-status-text');
    if (state.batchStatus === 'PAID') {
      statusElem.innerHTML = '<span class="text-emerald-700 font-bold"><i class="fa-solid fa-check-double mr-1"></i> Đã chi trả (Lô đã đóng)</span>';
    } else if (state.batchStatus === 'APPROVED') {
      statusElem.innerHTML = '<span class="text-teal-800 font-bold"><i class="fa-solid fa-check mr-1"></i> Đã phê duyệt toàn bộ lô</span>';
    } else {
      statusElem.innerHTML = '<span class="text-amber-600 font-bold"><i class="fa-solid fa-clock mr-1"></i> Chờ duyệt lô</span>';
    }

    // Render first 20 rows of preview
    tbody.innerHTML = qualified.slice(0, 20).map((e, idx) => `
      <tr>
        <td class="font-mono text-slate-500">${e.code}</td>
        <td class="font-medium text-slate-900">${e.name}</td>
        <td class="font-mono text-slate-600">19038${String(idx + 1000).padStart(5, '0')}</td>
        <td class="text-slate-600">Techcombank</td>
        <td class="text-right font-mono font-bold text-teal-800">${IncentiveEngine.formatPercent(e.calc.achievementRate, 1)}</td>
        <td class="text-right font-mono font-bold text-slate-900 masked-amount">${IncentiveEngine.formatVND(e.calc.incentiveAmount, state.privacyMasked)}</td>
        <td>
          <span class="badge ${state.batchStatus === 'PAID' ? 'badge-valid' : state.batchStatus === 'APPROVED' ? 'badge-valid' : 'badge-neutral'}">
            ${state.batchStatus === 'PAID' ? 'Đã chi trả' : state.batchStatus === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}
          </span>
        </td>
      </tr>
    `).join('');
  }

  window.approveEntireBatch = function () {
    state.batchStatus = 'APPROVED';
    state.employees.forEach(e => {
      if (e.validationStatus === 'VALID') e.status = 'APPROVED';
    });
    refreshAllViews();
    showToast('Đã phê duyệt toàn bộ lô chi trả kỳ Q3/2026.');
  };

  window.openPayrollExportModal = function () {
    const modal = document.getElementById('payroll-modal');
    if (!modal) return;
    const qualified = state.employees.filter(e => e.calc.achievementRate >= state.schemeConfig.thresholdMin);
    const totalPayout = state.employees.reduce((s, e) => s + e.calc.incentiveAmount, 0);

    document.getElementById('modal-emp-count').innerText = `${qualified.length} nhân sự`;
    document.getElementById('modal-total-amount').innerText = IncentiveEngine.formatVND(totalPayout, false);
    modal.classList.remove('hidden');
  };

  window.closePayrollModal = function () {
    const modal = document.getElementById('payroll-modal');
    if (modal) modal.classList.add('hidden');
  };

  window.executePayrollExportCSV = function () {
    const qualified = state.employees.filter(e => e.calc.achievementRate >= state.schemeConfig.thresholdMin);
    let csv = 'Mã NV,Họ và tên,Phòng ban,Target,Thực đạt,Achievement Rate,Hệ số chi trả,Incentive Thực Nhận (VND),Ngân hàng,Số tài khoản\n';

    qualified.forEach(e => {
      csv += `"${e.code}","${e.name}","${e.department}",${e.target},${e.actual},"${(e.calc.achievementRate * 100).toFixed(1)}%",${e.calc.payoutFactor.toFixed(3)},${e.calc.incentiveAmount},"Techcombank","19038${e.code.replace(/[^0-9]/g, '')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `PAYROLL_INCENTIVE_Q3_2026_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    state.batchStatus = 'PAID';
    state.employees.forEach(e => {
      if (e.calc.achievementRate >= state.schemeConfig.thresholdMin) e.status = 'PAID';
    });

    closePayrollModal();
    refreshAllViews();
    showToast('Đã xuất file Payroll CSV thành công!');
  };

  // =========================================================================
  // VIEW 6: SCHEME ANALYTICS (ĐƯỜNG CONG LIÊN TỤC & BUNCHING)
  // =========================================================================
  function renderPayoutCurveChart() {
    const ctx = document.getElementById('payoutCurveCanvas');
    if (!ctx) return;

    if (state.charts.curve) {
      state.charts.curve.destroy();
    }

    // 1. Dựng tọa độ đường cong liên tục từ 50% đến 140%
    const curvePoints = [];
    for (let r = 0.50; r <= 1.40; r += 0.02) {
      curvePoints.push({
        x: Math.round(r * 100),
        y: IncentiveEngine.calculatePayoutFactor(r, state.schemeConfig)
      });
    }

    // 2. Điểm thực tế của các nhân viên
    const employeePoints = state.employees.map(e => ({
      x: Math.round(e.calc.achievementRate * 100),
      y: e.calc.payoutFactor,
      name: e.name,
      isNeo: e.isNeo
    }));

    // Tách riêng 4 nhân vật neo
    const an = state.employees.find(e => e.id === 'EMP-001');
    const binh = state.employees.find(e => e.id === 'EMP-002');
    const chi = state.employees.find(e => e.id === 'EMP-003');
    const dung = state.employees.find(e => e.id === 'EMP-004');

    const neoPoints = [
      { x: Math.round(an.calc.achievementRate * 100), y: an.calc.payoutFactor, label: 'An (115%)' },
      { x: Math.round(binh.calc.achievementRate * 100), y: binh.calc.payoutFactor, label: `Bình (${(binh.calc.achievementRate * 100).toFixed(1)}%)` },
      { x: Math.round(chi.calc.achievementRate * 100), y: chi.calc.payoutFactor, label: 'Chi (100%)' },
      { x: Math.round(dung.calc.achievementRate * 100), y: dung.calc.payoutFactor, label: 'Dũng (100%)' }
    ];

    state.charts.curve = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            type: 'line',
            label: 'Đường cong chi trả chuẩn (Continuous Payout Curve)',
            data: curvePoints,
            borderColor: '#0E5A55',
            borderWidth: 2.5,
            fill: false,
            pointRadius: 0,
            tension: 0.1
          },
          {
            label: 'Nhân viên công ty (120 nhân sự)',
            data: employeePoints,
            backgroundColor: 'rgba(100, 116, 139, 0.4)',
            pointRadius: 3.5,
            pointHoverRadius: 6
          },
          {
            label: '4 Nhân vật neo (Proposal Benchmark)',
            data: neoPoints,
            backgroundColor: '#BE123C',
            borderColor: '#FFFFFF',
            borderWidth: 1.5,
            pointRadius: 6.5,
            pointHoverRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (item) => {
                const raw = item.raw;
                if (raw.name) return `${raw.name}: Đạt ${raw.x}% -> Hệ số ${raw.y.toFixed(3)}`;
                if (raw.label) return `${raw.label}: Hệ số ${raw.y.toFixed(3)}`;
                return `Ngưỡng ${raw.x}%: Hệ số ${raw.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Tỷ lệ đạt mục tiêu (Achievement Rate %)' },
            min: 50,
            max: 140,
            ticks: { callback: v => v + '%' }
          },
          y: {
            title: { display: true, text: 'Hệ số chi trả (Payout Factor)' },
            min: 0,
            max: 1.7,
            ticks: { stepSize: 0.25 }
          }
        }
      }
    });
  }

  function renderBunchingChart() {
    const ctx = document.getElementById('bunchingChartCanvas');
    if (!ctx) return;

    if (state.charts.bunching) {
      state.charts.bunching.destroy();
    }

    // Các dải Achievement Rate
    const bins = [
      { label: '< 70% (Không thưởng)', min: 0, max: 0.699, count: 0 },
      { label: '70% - 79%', min: 0.70, max: 0.799, count: 0 },
      { label: '80% - 89%', min: 0.80, max: 0.899, count: 0 },
      { label: '90% - 94%', min: 0.90, max: 0.949, count: 0 },
      { label: '95% - 99% (Dồn ứ!)', min: 0.95, max: 0.999, count: 0, isSpike: true },
      { label: '100% - 109%', min: 1.00, max: 1.099, count: 0 },
      { label: '110% - 119%', min: 1.10, max: 1.199, count: 0 },
      { label: '≥ 120% (Chạm trần)', min: 1.20, max: 99.0, count: 0 }
    ];

    state.employees.forEach(e => {
      const r = e.calc.achievementRate;
      const b = bins.find(bin => r >= bin.min && r <= bin.max);
      if (b) b.count++;
    });

    state.charts.bunching = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: bins.map(b => b.label),
        datasets: [{
          label: 'Số lượng nhân sự',
          data: bins.map(b => b.count),
          backgroundColor: bins.map(b => b.isSpike ? '#B45309' : '#0E5A55'),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} nhân sự (${(ctx.parsed.y / state.employees.length * 100).toFixed(1)}%)`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 5 }
          }
        }
      }
    });
  }

  // =========================================================================
  // VIEW 7: EMPLOYEE EXPLANATION SLIP (BẢN GIẢI TRÌNH NHÂN VIÊN)
  // =========================================================================
  function renderEmployeeSlip(empId = 'EMP-002') {
    const container = document.getElementById('employee-slip-content');
    if (!container) return;

    const emp = state.employees.find(e => e.id === empId) || state.employees[0];
    if (!emp) return;

    const c = emp.calc;

    container.innerHTML = `
      <!-- Slip Header -->
      <div class="border-b border-slate-100 pb-4 flex items-center justify-between">
        <div>
          <span class="text-[11px] uppercase tracking-wider text-teal-800 font-bold">Bản giải trình kết quả thưởng</span>
          <h2 class="text-base font-bold text-slate-900 mt-0.5">${emp.name}</h2>
          <p class="text-xs text-slate-500">${emp.role} &bull; ${emp.department}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-sm">
          ${emp.avatar}
        </div>
      </div>

      <!-- Money Highlight -->
      <div class="p-4 bg-teal-50 border border-teal-200 rounded-md text-center space-y-1">
        <span class="text-xs text-teal-900 font-medium">Khoản Thưởng Q3/2026 Của Bạn</span>
        <div class="text-3xl font-bold text-teal-900 tabular-nums masked-amount">
          ${IncentiveEngine.formatVND(c.incentiveAmount, state.privacyMasked)}
        </div>
        <p class="text-[11px] text-teal-800 font-medium">
          Dự kiến chuyển khoản kỳ lương tháng 09/2026
        </p>
      </div>

      <!-- Step-by-Step Transparency Breakdown -->
      <div class="space-y-3 text-xs">
        <h4 class="font-semibold text-slate-800 text-xs border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
          <i class="fa-solid fa-list-check text-teal-700"></i> Minh bạch cách tính con số của bạn
        </h4>

        <div class="space-y-2">
          <div class="flex justify-between py-1 border-b border-slate-50">
            <span class="text-slate-500">Mục tiêu giao ban đầu (Target):</span>
            <strong class="font-mono text-slate-900">${IncentiveEngine.formatNumberVN(emp.target, 0)} triệu đồng</strong>
          </div>

          <div class="flex justify-between py-1 border-b border-slate-50">
            <span class="text-slate-500">Hệ số độ khó địa bàn:</span>
            <div class="text-right">
              <strong class="font-mono ${c.difficultyFactor !== 1.0 ? 'text-teal-800 font-bold' : 'text-slate-900'}">${IncentiveEngine.formatNumberVN(c.difficultyFactor, 2)}</strong>
              ${c.difficultyFactor !== 1.0 ? '<span class="block text-[10px] text-teal-700 font-normal">(Hội đồng đã hiệu chỉnh)</span>' : ''}
            </div>
          </div>

          <div class="flex justify-between py-1 border-b border-slate-50">
            <span class="text-slate-500">Target hiệu chỉnh thực tế:</span>
            <strong class="font-mono text-teal-900 font-bold">${IncentiveEngine.formatNumberVN(c.adjustedTarget, 0)} triệu đồng</strong>
          </div>

          <div class="flex justify-between py-1 border-b border-slate-50">
            <span class="text-slate-500">Doanh số thực tế ghi nhận:</span>
            <strong class="font-mono text-slate-900">${IncentiveEngine.formatNumberVN(emp.actual, 0)} triệu đồng</strong>
          </div>

          <div class="flex justify-between py-1 border-b border-slate-50">
            <span class="text-slate-500">Achievement Rate hiệu chỉnh:</span>
            <strong class="font-mono text-teal-800 font-bold">${IncentiveEngine.formatPercent(c.achievementRate, 1)}</strong>
          </div>

          <div class="flex justify-between py-1 border-b border-slate-50">
            <span class="text-slate-500">Hệ số chi trả theo quy chế:</span>
            <strong class="font-mono text-slate-900">${IncentiveEngine.formatNumberVN(c.payoutFactor, 3)}x</strong>
          </div>

          <div class="flex justify-between py-1">
            <span class="text-slate-500">Mức thưởng mục tiêu khung:</span>
            <span class="font-mono text-slate-700">20.000.000 ₫</span>
          </div>
        </div>
      </div>

      <!-- Respectful Explanation Note -->
      <div class="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 leading-relaxed space-y-1">
        <p><strong>Thông điệp từ Ban Lãnh đạo & C&B:</strong></p>
        <p>Cảm ơn bạn đã nỗ lực cống hiến trong kỳ Q3/2026. Mọi con số đều được tính toán theo quy chế công khai của công ty. Bạn có thể kiểm tra từng hợp đồng doanh số đã ghi nhận trong kỳ.</p>
      </div>

      <!-- Dispute / Inquiry Channel with Deadline -->
      <div class="border-t border-slate-100 pt-3 space-y-2">
        <div class="flex items-center justify-between text-[11px] text-slate-500">
          <span>Kênh phản hồi & Khiếu nại</span>
          <span class="text-amber-700 font-medium">Hạn tiếp nhận: 17:00 ngày 25/09/2026</span>
        </div>
        <button onclick="showToast('Biểu mẫu khiếu nại đã mở. Đội ngũ C&B cam kết phản hồi trong 24 giờ.')" class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-xs transition flex items-center justify-center gap-1.5 border border-slate-300">
          <i class="fa-regular fa-comment-dots"></i> Gửi yêu cầu rà soát hoặc khiếu nại
        </button>
      </div>
    `;
  }

  window.renderEmployeeSlip = renderEmployeeSlip;

  // =========================================================================
  // VIEW 8: WHAT-IF SIMULATION
  // =========================================================================
  window.updateWhatIfSim = function () {
    const floor = parseFloat(document.getElementById('input-param-floor').value) / 100;
    const target = parseFloat(document.getElementById('input-param-target').value) / 100;
    const max = parseFloat(document.getElementById('input-param-max').value) / 100;
    const cap = parseFloat(document.getElementById('input-param-cap').value);

    document.getElementById('val-param-floor').innerText = `${Math.round(floor * 100)}%`;
    document.getElementById('val-param-target').innerText = `${Math.round(target * 100)}%`;
    document.getElementById('val-param-max').innerText = `${Math.round(max * 100)}%`;
    document.getElementById('val-param-cap').innerText = `${cap.toFixed(1)}x`;

    const simConfig = {
      thresholdMin: floor,
      thresholdTarget: target,
      thresholdMax: max,
      factorAtMin: 0.0,
      factorAtTarget: 1.0,
      factorCap: cap,
      defaultTargetIncentive: 20000000
    };

    let totalSim = 0;
    state.employees.forEach(e => {
      const pFactor = IncentiveEngine.calculatePayoutFactor(e.calc.achievementRate, simConfig);
      totalSim += Math.round(e.targetIncentive * pFactor);
    });

    document.getElementById('sim-total-cost').innerText = IncentiveEngine.formatVND(totalSim, state.privacyMasked);
    const delta = totalSim - 1750000000;
    const deltaPercent = (delta / 1750000000 * 100).toFixed(1);
    document.getElementById('sim-delta-cost').innerText = `${delta >= 0 ? '+' : ''}${IncentiveEngine.formatVND(delta, state.privacyMasked)} (${deltaPercent >= 0 ? '+' : ''}${deltaPercent}%)`;
  };

  window.resetSchemeToDefault = function () {
    document.getElementById('input-param-floor').value = 70;
    document.getElementById('input-param-target').value = 100;
    document.getElementById('input-param-max').value = 120;
    document.getElementById('input-param-cap').value = 1.5;
    updateWhatIfSim();
  };

  window.applySimToCurrentScheme = function () {
    state.schemeConfig.thresholdMin = parseFloat(document.getElementById('input-param-floor').value) / 100;
    state.schemeConfig.thresholdTarget = parseFloat(document.getElementById('input-param-target').value) / 100;
    state.schemeConfig.thresholdMax = parseFloat(document.getElementById('input-param-max').value) / 100;
    state.schemeConfig.factorCap = parseFloat(document.getElementById('input-param-cap').value);

    recalculateAllEmployees();
    refreshAllViews();
    showToast('Đã áp dụng cấu hình Scheme mới vào kỳ tính toán hiện tại!');
  };

  // =========================================================================
  // DRAWER CHI TIẾT (OFFCANVAS PANEL)
  // =========================================================================
  window.openDrawer = function (empId) {
    const emp = state.employees.find(e => e.id === empId);
    if (!emp) return;

    state.selectedEmployeeId = empId;
    const c = emp.calc;

    document.getElementById('drawer-emp-name').innerText = emp.name;
    document.getElementById('drawer-emp-code').innerText = emp.code;
    document.getElementById('drawer-emp-role-dept').innerText = `${emp.role} • ${emp.department}`;

    document.getElementById('drawer-payout-amount').innerText = IncentiveEngine.formatVND(c.incentiveAmount, state.privacyMasked);
    document.getElementById('drawer-payout-factor').innerText = `${IncentiveEngine.formatNumberVN(c.payoutFactor, 3)}x`;

    // Step calculations
    document.getElementById('drawer-step-target').innerText = `${IncentiveEngine.formatNumberVN(emp.target, 0)}M × ${IncentiveEngine.formatNumberVN(c.difficultyFactor, 2)} = ${IncentiveEngine.formatNumberVN(c.adjustedTarget, 0)}M`;
    document.getElementById('drawer-step-actual').innerText = `${IncentiveEngine.formatNumberVN(emp.actual, 0)}M VNĐ`;
    document.getElementById('drawer-step-rate').innerText = `${IncentiveEngine.formatNumberVN(emp.actual, 0)} / ${IncentiveEngine.formatNumberVN(c.adjustedTarget, 0)} = ${IncentiveEngine.formatPercent(c.achievementRate, 1)}`;

    let formulaText = '';
    if (c.achievementRate < state.schemeConfig.thresholdMin) {
      formulaText = '< 70% -> Hệ số = 0';
    } else if (c.achievementRate <= state.schemeConfig.thresholdTarget) {
      formulaText = `(${IncentiveEngine.formatPercent(c.achievementRate, 1)} - 70%)/30% × 1.0 = ${c.payoutFactor.toFixed(3)}`;
    } else if (c.achievementRate <= state.schemeConfig.thresholdMax) {
      formulaText = `1.0 + (${IncentiveEngine.formatPercent(c.achievementRate, 1)} - 100%)/20% × 0.5 = ${c.payoutFactor.toFixed(3)}`;
    } else {
      formulaText = `> 120% -> Chạm trần 1.500x`;
    }
    document.getElementById('drawer-step-factor').innerText = formulaText;

    // Contracts list
    const contractsList = document.getElementById('drawer-contracts-list');
    if (contractsList) {
      contractsList.innerHTML = emp.contracts.map(cnt => `
        <div class="py-2 flex items-center justify-between ${cnt.isDuplicate ? 'bg-rose-50 px-2 rounded' : ''}">
          <div>
            <span class="font-semibold text-slate-800">${cnt.code}</span> - <span class="text-slate-600">${cnt.client}</span>
            <span class="block text-[11px] text-slate-400">Ngày nghiệm thu: ${cnt.date}</span>
          </div>
          <span class="font-mono font-bold ${cnt.isDuplicate ? 'text-rose-700 line-through' : 'text-slate-900'}">${IncentiveEngine.formatNumberVN(cnt.amount, 0)}M ₫</span>
        </div>
      `).join('');
    }

    // Audit logs
    const auditList = document.getElementById('drawer-audit-list');
    if (auditList) {
      auditList.innerHTML = emp.auditLog.map(log => `
        <div class="border-l-2 border-slate-300 pl-2.5 py-1">
          <p class="font-medium text-slate-800">${log.action}</p>
          <span class="text-[10px] text-slate-400">${log.time} &bull; ${log.user}</span>
        </div>
      `).join('');
    }

    document.getElementById('drawer-backdrop').classList.remove('hidden');
    document.getElementById('drawer-panel').classList.add('open');
  };

  window.closeDrawer = function () {
    const backdrop = document.getElementById('drawer-backdrop');
    const panel = document.getElementById('drawer-panel');
    if (backdrop) backdrop.classList.add('hidden');
    if (panel) panel.classList.remove('open');
  };

  window.showTraceInfo = function (type) {
    const popover = document.getElementById('drawer-trace-popover');
    if (!popover) return;
    const emp = state.employees.find(e => e.id === state.selectedEmployeeId);
    if (!emp) return;

    if (type === 'target') {
      popover.innerHTML = `<strong>Nguồn gốc Target:</strong> Mục tiêu giao đầu kỳ Q3/2026 từ phòng Kế hoạch (${emp.target}M VNĐ). Hệ số độ khó địa bàn hiện tại: ${emp.calc.difficultyFactor}. Chỉ thay đổi khi có quyết định bằng văn bản từ Hội đồng Hiệu chỉnh.`;
    } else if (type === 'actual') {
      popover.innerHTML = `<strong>Nguồn gốc Doanh số Thực đạt:</strong> Tổng hợp tự động từ ${emp.contracts.length} hợp đồng đã ký và có biên bản nghiệm thu hợp lệ trong kỳ.`;
    } else if (type === 'rate') {
      popover.innerHTML = `<strong>Công thức Achievement Rate:</strong> Actual ÷ Target hiệu chỉnh = ${emp.actual}M ÷ ${emp.calc.adjustedTarget}M = ${IncentiveEngine.formatPercent(emp.calc.achievementRate, 2)}.`;
    } else if (type === 'factor') {
      popover.innerHTML = `<strong>Đường cong chi trả liên tục:</strong> Dưới 70% bằng 0; từ 70% đến 100% tăng từ 0 lên 1; từ 100% đến 120% tăng từ 1 lên 1.5; trên 120% cố định trần 1.5 lần.`;
    }
  };

  // =========================================================================
  // UTILITIES & UI CONTROLS
  // =========================================================================
  window.switchTab = function (tabId) {
    state.activeTab = tabId;

    document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));
    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) targetView.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('bg-teal-800', 'text-white', 'font-medium');
      btn.classList.add('text-slate-300');
    });

    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) {
      activeBtn.classList.add('bg-teal-800', 'text-white', 'font-medium');
      activeBtn.classList.remove('text-slate-300');
    }

    const titleMap = {
      'overview': 'Tổng quan kỳ thưởng (Overview)',
      'incentives': 'Danh sách Incentive (Central Grid)',
      'validation': 'Kiểm tra dữ liệu & Bất thường (Validation Queue)',
      'calibration': 'Hội đồng Hiệu chỉnh Target (Calibration Board)',
      'approval': 'Phê duyệt & Xuất chi trả (Payroll Output)',
      'analytics': 'Phân tích Scheme & Phát hiện dồn ứ (Analytics)',
      'slip': 'Bản giải trình Nhân viên (Employee Explanation Slip)',
      'scheme-designer': 'Thiết kế Scheme & Mô phỏng Ngân sách (What-If)'
    };
    document.getElementById('topbar-view-title').innerText = titleMap[tabId] || 'Incentive Lifecycle';

    window.location.hash = tabId;

    if (tabId === 'analytics') {
      setTimeout(() => {
        renderPayoutCurveChart();
        renderBunchingChart();
      }, 50);
    }
  };

  function initUrlHashRouting() {
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(`view-${hash}`)) {
      switchTab(hash);
    } else {
      switchTab('overview');
    }
  }

  window.switchUserRole = function (role) {
    state.userRole = role;
    if (role === 'employee') {
      switchTab('slip');
      renderEmployeeSlip('EMP-002');
      showToast('Đã chuyển sang vai trò Nhân viên (Trần Thị Bình).');
    } else if (role === 'approver') {
      switchTab('calibration');
      showToast('Đã chuyển sang vai trò Hội đồng Hiệu chỉnh & Kế toán trưởng.');
    } else if (role === 'manager') {
      switchTab('incentives');
      showToast('Đã chuyển sang vai trò Line Manager.');
    } else {
      switchTab('overview');
    }
  };

  window.togglePrivacyMode = function () {
    state.privacyMasked = !state.privacyMasked;
    document.body.classList.toggle('privacy-masked', state.privacyMasked);
    const text = document.getElementById('privacy-text');
    const icon = document.getElementById('privacy-icon');
    if (state.privacyMasked) {
      text.innerText = 'Hiện số tiền';
      icon.className = 'fa-solid fa-eye';
    } else {
      text.innerText = 'Ẩn số tiền';
      icon.className = 'fa-solid fa-eye-slash';
    }
    refreshAllViews();
  };

  window.toggleDensityMode = function () {
    state.densityCompact = !state.densityCompact;
    document.body.classList.toggle('density-compact', state.densityCompact);
    const text = document.getElementById('density-text');
    text.innerText = state.densityCompact ? 'Chế độ Thoải mái' : 'Chế độ Gọn';
  };

  function updateBadges() {
    const totalEmp = state.employees.length;
    const alertCount = state.employees.filter(e => e.validationStatus !== 'VALID').length;
    const calibCount = state.employees.filter(e => e.validationStatus === 'PENDING_CALIBRATION').length;

    const bTotal = document.getElementById('badge-total-employees');
    const bAlert = document.getElementById('badge-alerts-count');
    const bCalib = document.getElementById('badge-calibration-count');

    if (bTotal) bTotal.innerText = totalEmp;
    if (bAlert) bAlert.innerText = alertCount;
    if (bCalib) bCalib.innerText = calibCount;
  }

  // Export module helpers for testing
  window.AppState = state;
})();