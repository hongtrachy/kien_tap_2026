/**
 * MÔ ĐUN XÁC THỰC VÀ PHÂN QUYỀN MÔ PHỎNG (AUTH & ACCESS CONTROL)
 * Nền tảng Quản lý & Đề xuất Thưởng Thông minh
 * 
 * Lưu ý minh bạch: "Đây là cơ chế xác thực mô phỏng trên trình duyệt phục vụ đánh giá đề tài,
 * không phải giải pháp bảo mật cấp doanh nghiệp".
 * 
 * 3 Vai trò:
 * 1. Admin: Xem toàn công ty, cấu hình, duyệt cấp hai, xuất chi trả.
 * 2. Quản lý (Manager): Xem bộ phận mình, đánh giá nhân viên, quyết định thưởng cuối cùng cho người thuộc quyền.
 * 3. Nhân viên (Employee): Chỉ xem dữ liệu của chính mình, gửi khiếu nại.
 */

(function (global) {
  'use strict';

  // Danh mục 3 tài khoản mẫu mặc định
  const SAMPLE_ACCOUNTS = {
    admin: {
      username: 'admin',
      demoPassword: '123456',
      name: 'Nguyễn Thu Trang',
      role: 'admin',
      roleName: 'Quản trị viên (Admin C&B & Tài chính)',
      department: null, // Toàn quyền xem mọi phòng ban
      email: 'trang.nt@congty.vn',
      avatar: 'TR',
      allowedTabs: ['overview', 'employees', 'employee-info', 'performance', 'recommendation', 'validation', 'payroll']
    },
    manager: {
      username: 'manager',
      demoPassword: '123456',
      name: 'Trần Minh Đức',
      role: 'manager',
      roleName: 'Quản lý Trực tiếp (Trưởng phòng KD Miền Nam)',
      managerId: 'MGR-02',
      department: 'Kinh doanh Miền Nam', // Chỉ xem phòng mình
      email: 'duc.tm@congty.vn',
      avatar: 'ĐU',
      allowedTabs: ['overview', 'employees', 'employee-info', 'performance', 'recommendation', 'validation']
    },
    employee: {
      username: 'employee',
      demoPassword: '123456',
      name: 'Trần Thị Bình',
      role: 'employee',
      roleName: 'Nhân viên (EMP-002)',
      employeeId: 'EMP-002',
      department: 'Kinh doanh Miền Nam',
      email: 'binh.tt@congty.vn',
      avatar: 'BI',
      allowedTabs: ['my-overview', 'my-profile', 'my-performance', 'my-slip']
    }
  };

  const STORAGE_KEY = 'incentive_auth_session';

  /**
   * Lấy thông tin người dùng đang đăng nhập
   */
  function getCurrentUser() {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Lỗi đọc session auth:', e);
    }
    return null;
  }

  /**
   * Đăng nhập người dùng
   */
  function login(username, password) {
    const user = SAMPLE_ACCOUNTS[username];
    if (user && password === user.demoPassword) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return { success: true, user };
    }
    return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' };
  }

  /**
   * Đăng xuất
   */
  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Chuyển nhanh vai trò (phục vụ người thuyết trình demo 5 phút)
   */
  function switchRoleQuick(roleKey) {
    const user = SAMPLE_ACCOUNTS[roleKey];
    if (user) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return user;
    }
    return getCurrentUser();
  }

  /**
   * Kiểm tra quyền truy cập tab màn hình của vai trò hiện tại
   * @param {string} tabId - Tên tab/route
   * @param {object} user - Người dùng hiện tại
   * @returns {boolean} Được phép hay không
   */
  function checkRoutePermission(tabId, user = getCurrentUser()) {
    if (!user) return false;
    
    // Nếu là nhân viên mà cố tình vào tab admin/quản lý -> Chặn tuyệt đối!
    if (user.role === 'employee') {
      const allowed = ['my-overview', 'my-profile', 'my-performance', 'my-slip', 'slip'];
      return allowed.includes(tabId);
    }

    // Nếu là quản lý hoặc admin
    if (user.role === 'manager') {
      if (tabId === 'comp-plans') return false;
      // Quản lý không có quyền xuất chi trả payroll cấp hai
      if (tabId === 'payroll') return false;
      return true;
    }

    if (user.role === 'admin') {
      return true;
    }

    return false;
  }

  /**
   * Lọc danh sách nhân viên theo quyền của người dùng
   * @param {Array} employees - Toàn bộ nhân viên
   * @param {object} user - Người dùng hiện tại
   * @returns {Array} Danh sách đã lọc theo thẩm quyền
   */
  function filterEmployeesByPermission(employees = [], user = getCurrentUser()) {
    if (!user) return [];

    // Nhân viên chỉ thấy chính mình!
    if (user.role === 'employee') {
      const empId = user.employeeId || 'EMP-002';
      return employees.filter(e => e.id === empId);
    }

    // Quản lý chỉ thấy nhân viên thuộc phòng ban mình phụ trách!
    if (user.role === 'manager') {
      return employees.filter(e => e.department === user.department);
    }

    // Admin thấy toàn bộ công ty
    return employees;
  }

  const AppAuth = {
    SAMPLE_ACCOUNTS,
    getCurrentUser,
    login,
    logout,
    switchRoleQuick,
    checkRoutePermission,
    filterEmployeesByPermission
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppAuth;
  }
  global.AppAuth = AppAuth;
  if (typeof window !== 'undefined') {
    window.AppAuth = AppAuth;
  }
})(typeof window !== 'undefined' ? window : globalThis);
