/**
 * MÔ PHỎNG DỮ LIỆU KỲ Q3/2026 (120 NHÂN VIÊN & 4 NHÂN VẬT NEO) - BẢN NÂNG CẤP V2
 * Dữ liệu được sinh bằng PRNG có Seed cố định để kết quả luôn nhất quán.
 * Cài đặt sẵn:
 * - 4 nhân vật neo: An, Bình, Chi, Dũng khớp 100% đề xuất đề tài.
 * - Mỗi nhân viên có từ 4 đến 6 đầu việc/gói hợp đồng cụ thể (Task/Work Packages).
 * - Lịch sử hiệu suất 4 kỳ trước (Q3/2025, Q4/2025, Q1/2026, Q2/2026) phục vụ ML và phân tích xu hướng.
 * - Đánh giá của Quản lý trực tiếp theo 4 tiêu chí cấu trúc.
 * - Hiện tượng dồn ứ (Bunching) ở khoảng 95% - 99%.
 * - Hàng đợi kiểm tra dữ liệu với đầy đủ các loại bất thường thực tế.
 */

(function (global) {
  'use strict';

  // PRNG xorshift đơn giản với seed cố định
  function createRandom(seed = 123456789) {
    let s = seed;
    return function () {
      s ^= s << 13;
      s ^= s >> 17;
      s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  }

  const HO_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Vũ', 'Võ', 'Phan', 'Trương', 'Bùi', 'Đặng', 'Đỗ', 'Ngô', 'Hồ', 'Dương', 'Đinh'];
  const LOT_NAMES = ['Văn', 'Thị', 'Thanh', 'Hải', 'Đức', 'Quốc', 'Minh', 'Ngọc', 'Gia', 'Hồng', 'Tuấn', 'Phương', 'Bảo', 'Kim'];
  const TEN_NAMES = ['Anh', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Giang', 'Hà', 'Hưng', 'Khánh', 'Linh', 'Long', 'Mai', 'Nam', 'Nhi', 'Phong', 'Phúc', 'Quân', 'Quang', 'Sơn', 'Tâm', 'Thảo', 'Thắng', 'Trang', 'Trung', 'Tuấn', 'Tùng', 'Việt', 'Vinh', 'Yến'];

  const DEPARTMENTS = [
    { id: 'MB', name: 'Kinh doanh Miền Bắc', manager: 'Lê Quốc Hùng', managerId: 'MGR-01' },
    { id: 'MN', name: 'Kinh doanh Miền Nam', manager: 'Trần Minh Đức', managerId: 'MGR-02' },
    { id: 'B2B', name: 'Khách hàng Doanh nghiệp', manager: 'Vũ Thị Thanh', managerId: 'MGR-03' },
    { id: 'RETAIL', name: 'Vận hành Bán lẻ', manager: 'Hoàng Văn Sơn', managerId: 'MGR-04' }
  ];

  const BASE_BONUS = 20000000; // 20 triệu chuẩn

  function generateBenchmarkDataset() {
    const rand = createRandom(20260920);
    const employees = [];

    // ==========================================
    // 1. CÀI ĐẶT 4 NHÂN VẬT NEO CỦA ĐỀ ÁN
    // ==========================================

    // Nhân vật 1: An (EMP-001) - Đạt 115% -> Thưởng 27.5M
    const anTasks = [
      { id: 'TASK-001-1', name: 'Hợp đồng Cung ứng Tập đoàn Hòa Phát', target: 350, actual: 420, packageValue: 350, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'doanh_thu', contribution: 1.0 },
      { id: 'TASK-001-2', name: 'Gói Thầu Vật tư Tổng công ty Viglacera', target: 250, actual: 280, packageValue: 250, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'doanh_thu', contribution: 1.0 },
      { id: 'TASK-001-3', name: 'Phát triển Kênh Đại lý May Sông Hồng', target: 150, actual: 170, packageValue: 150, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'hop_dong_moi', contribution: 0.9 },
      { id: 'TASK-001-4', name: 'Dự án Tối ưu Chi phí Logistics Bắc Bộ', target: 50, actual: 50, packageValue: 50, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'tiet_kiem_chi_phi', contribution: 0.8 }
    ];

    employees.push({
      id: 'EMP-001',
      code: 'MB-014',
      name: 'Nguyễn Văn An',
      role: 'Chuyên viên Kinh doanh Cấp cao',
      position: 'Chuyên viên Kinh doanh',
      level: 4,
      seniority: 4.5,
      baseSalary: 18000000,
      baseIncentive: BASE_BONUS,
      department: 'Kinh doanh Miền Bắc',
      email: 'an.nv@congty.vn',
      avatar: 'AN',
      target: 800,
      actual: 920,
      difficultyFactor: 1.0,
      targetIncentive: BASE_BONUS,
      scaleFactor: 1.0,
      status: 'CALCULATED',
      validationStatus: 'VALID',
      isNeo: true,
      tasks: anTasks,
      contracts: [
        { code: 'HĐ-MB-101', client: 'Tập đoàn Hòa Phát', amount: 350, date: '15/07/2026' },
        { code: 'HĐ-MB-108', client: 'Tổng công ty Viglacera', amount: 420, date: '12/08/2026' },
        { code: 'HĐ-MB-119', client: 'Công ty CP May Sông Hồng', amount: 150, date: '18/09/2026' }
      ],
      history: [
        { period: 'Q3/2025', weightedRate: 1.05, payoutFactor: 1.125, incentive: 22500000 },
        { period: 'Q4/2025', weightedRate: 1.12, payoutFactor: 1.300, incentive: 26000000 },
        { period: 'Q1/2026', weightedRate: 1.08, payoutFactor: 1.200, incentive: 24000000 },
        { period: 'Q2/2026', weightedRate: 1.14, payoutFactor: 1.350, incentive: 27000000 }
      ],
      managerEval: {
        quality: 4.8,
        collaboration: 4.5,
        initiative: 4.6,
        objectiveDifficulty: 3.5,
        comment: 'Hoàn thành xuất sắc mọi dự án trọng điểm, chủ động hỗ trợ đồng nghiệp mở rộng thị trường phía Bắc.',
        managerId: 'MGR-01',
        evaluatedDate: '15/09/2026'
      },
      auditLog: [
        { time: '01/07/2026 08:30', user: 'Hệ thống', action: 'Thiết lập chỉ tiêu ban đầu: 800M VNĐ (4 gói việc)' },
        { time: '15/09/2026 17:00', user: 'C&B Specialist (Thu Trang)', action: 'Chốt doanh số thực đạt: 920M VNĐ' },
        { time: '18/09/2026 09:15', user: 'Hệ thống', action: 'Tự động tính toán: 115.0% -> Hệ số chi trả 1.375' }
      ],
      calibration: null,
      promotionReady: true,
      promotionRationale: 'Tỷ lệ đạt chỉ tiêu bền vững trên 105% qua 5 kỳ liên tiếp, kỹ năng dẫn dắt dự án xuất sắc, thâm niên 4.5 năm.'
    });

    // Nhân vật 2: Bình (EMP-002) - Thô 85% (10M), sau hiệu chỉnh độ khó 0.9 đạt 94.44% (16.3M)
    const binhTasks = [
      { id: 'TASK-002-1', name: 'Phân phối Thiết bị Công ty CP Thaco', target: 450, actual: 380, packageValue: 450, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'doanh_thu', contribution: 1.0 },
      { id: 'TASK-002-2', name: 'Cung cấp Nguyên liệu Vinamilk Chi nhánh Nam', target: 350, actual: 300, packageValue: 350, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'doanh_thu', contribution: 1.0 },
      { id: 'TASK-002-3', name: 'Mở rộng Hệ thống Phân phối Vùng Cần Thơ', target: 120, actual: 110, packageValue: 120, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'hop_dong_moi', contribution: 0.9 },
      { id: 'TASK-002-4', name: 'Tối ưu Chi phí Công nợ & Vòng quay Vốn', target: 80, actual: 60, packageValue: 80, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'tiet_kiem_chi_phi', contribution: 0.8 }
    ];

    employees.push({
      id: 'EMP-002',
      code: 'MN-008',
      name: 'Trần Thị Bình',
      role: 'Quản lý Tài khoản Khách hàng',
      position: 'Quản lý Tài khoản Khách hàng',
      level: 3,
      seniority: 3.2,
      baseSalary: 16000000,
      baseIncentive: BASE_BONUS,
      department: 'Kinh doanh Miền Nam',
      email: 'binh.tt@congty.vn',
      avatar: 'BI',
      target: 1000,
      actual: 850,
      difficultyFactor: 1.0, // Sau khi duyệt hiệu chỉnh -> 0.9
      targetIncentive: BASE_BONUS,
      scaleFactor: 1.0,
      status: 'NEEDS_REVIEW',
      validationStatus: 'PENDING_CALIBRATION',
      isNeo: true,
      tasks: binhTasks,
      contracts: [
        { code: 'HĐ-MN-205', client: 'Công ty Cổ phần Thaco', amount: 480, date: '20/07/2026' },
        { code: 'HĐ-MN-212', client: 'Vinamilk Chi nhánh Nam', amount: 370, date: '28/08/2026' }
      ],
      history: [
        { period: 'Q3/2025', weightedRate: 0.98, payoutFactor: 0.933, incentive: 18660000 },
        { period: 'Q4/2025', weightedRate: 1.01, payoutFactor: 1.025, incentive: 20500000 },
        { period: 'Q1/2026', weightedRate: 0.94, payoutFactor: 0.800, incentive: 16000000 },
        { period: 'Q2/2026', weightedRate: 0.91, payoutFactor: 0.700, incentive: 14000000 }
      ],
      managerEval: {
        quality: 4.2,
        collaboration: 4.5,
        initiative: 3.8,
        objectiveDifficulty: 4.8,
        comment: 'Thị trường Đông Nam Bộ gặp khó khăn khách quan lớn (sức mua co hẹp 10.2%). Nhân sự nỗ lực duy trì 85% chỉ tiêu là rất đáng ghi nhận.',
        managerId: 'MGR-02',
        evaluatedDate: '05/09/2026'
      },
      auditLog: [
        { time: '01/07/2026 08:30', user: 'Hệ thống', action: 'Thiết lập chỉ tiêu ban đầu: 1.000M VNĐ (4 gói việc)' },
        { time: '05/09/2026 14:20', user: 'Line Manager (Trần Minh Đức)', action: 'Gửi đề xuất hiệu chỉnh hệ số độ khó 0.9 (Thị trường khu vực suy giảm 10.2%)' }
      ],
      calibration: {
        proposedFactor: 0.9,
        proposedTarget: 900,
        proposer: 'Trần Minh Đức (Line Manager)',
        submitDate: '05/09/2026',
        evidence: 'Báo cáo chỉ số tiêu dùng ngành Q3/2026 co hẹp 10.2% tại vùng trọng điểm Đông Nam Bộ. 2 dự án lớn của khách hàng hoãn sang Q4 do nguyên nhân khách quan.',
        status: 'PENDING',
        reviewedBy: null,
        reviewDate: null,
        comment: ''
      },
      promotionReady: false,
      promotionRationale: null
    });

    // Nhân vật 3: Chi (EMP-003) - Đạt chuẩn 100% -> Thưởng 20.0M
    const chiTasks = [
      { id: 'TASK-003-1', name: 'Triển khai Hạ tầng Ngân hàng Quân đội MBBank', target: 320, actual: 320, packageValue: 320, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'doanh_thu', contribution: 1.0 },
      { id: 'TASK-003-2', name: 'Cung cấp Dịch vụ Đám mây Tập đoàn FPT', target: 200, actual: 200, packageValue: 200, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'doanh_thu', contribution: 1.0 },
      { id: 'TASK-003-3', name: 'Tối ưu Hóa đơn Thuê bao B2B Viettel', target: 80, actual: 80, packageValue: 80, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'tiet_kiem_chi_phi', contribution: 1.0 }
    ];

    employees.push({
      id: 'EMP-003',
      code: 'B2B-005',
      name: 'Lê Hoàng Chi',
      role: 'Chuyên viên Phát triển Khách hàng B2B',
      position: 'Chuyên viên B2B',
      level: 3,
      seniority: 2.8,
      baseSalary: 15000000,
      baseIncentive: BASE_BONUS,
      department: 'Khách hàng Doanh nghiệp',
      email: 'chi.lh@congty.vn',
      avatar: 'CH',
      target: 600,
      actual: 600,
      difficultyFactor: 1.0,
      targetIncentive: BASE_BONUS,
      scaleFactor: 1.0,
      status: 'CALCULATED',
      validationStatus: 'VALID',
      isNeo: true,
      tasks: chiTasks,
      contracts: [
        { code: 'HĐ-B2B-01', client: 'Ngân hàng Quân đội MBBank', amount: 320, date: '11/07/2026' },
        { code: 'HĐ-B2B-04', client: 'Tập đoàn FPT', amount: 280, date: '04/09/2026' }
      ],
      history: [
        { period: 'Q3/2025', weightedRate: 1.00, payoutFactor: 1.000, incentive: 20000000 },
        { period: 'Q4/2025', weightedRate: 0.99, payoutFactor: 0.967, incentive: 19340000 },
        { period: 'Q1/2026', weightedRate: 1.02, payoutFactor: 1.050, incentive: 21000000 },
        { period: 'Q2/2026', weightedRate: 1.00, payoutFactor: 1.000, incentive: 20000000 }
      ],
      managerEval: {
        quality: 4.5,
        collaboration: 4.2,
        initiative: 4.0,
        objectiveDifficulty: 3.2,
        comment: 'Độ tin cậy rất cao, luôn hoàn thành chuẩn mực 100% các cam kết hợp đồng với khối tài chính ngân hàng.',
        managerId: 'MGR-03',
        evaluatedDate: '12/09/2026'
      },
      auditLog: [
        { time: '01/07/2026 08:30', user: 'Hệ thống', action: 'Thiết lập chỉ tiêu: 600M VNĐ' },
        { time: '15/09/2026 17:00', user: 'C&B Specialist', action: 'Xác nhận doanh số nghiệm thu: 600M VNĐ' },
        { time: '18/09/2026 09:15', user: 'Hệ thống', action: 'Tính toán: 100.0% -> Hệ số chi trả 1.000' }
      ],
      calibration: null,
      promotionReady: false,
      promotionRationale: null
    });

    // Nhân vật 4: Dũng (EMP-004) - Thô 990M (110% -> 25M), Sau gỡ trùng 900M (100% -> 20M)
    const dungTasks = [
      { id: 'TASK-004-1', name: 'Giám sát Chuỗi Cung ứng Bách Hóa Xanh', target: 500, actual: 500, packageValue: 500, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'doanh_thu', contribution: 1.0 },
      { id: 'TASK-004-2', name: 'Điều phối Vận hành Chuỗi WinMart+', target: 310, actual: 310, packageValue: 310, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'doanh_thu', contribution: 1.0 },
      { id: 'TASK-004-3', name: 'Hợp đồng Bán lẻ K Mart Chi nhánh 1', target: 90, actual: 90, packageValue: 90, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'doanh_thu', contribution: 1.0 },
      { id: 'TASK-004-4', name: 'Hợp đồng Bán lẻ K Mart Chi nhánh 2 (Ghi nhận trùng)', target: 0, actual: 90, packageValue: 90, complexityFactor: 1.0, difficultyFactor: 1.0, benefitType: 'doanh_thu', contribution: 1.0, isDuplicate: true }
    ];

    employees.push({
      id: 'EMP-004',
      code: 'RET-021',
      name: 'Phạm Tiến Dũng',
      role: 'Trưởng nhóm Giám sát Vận hành',
      position: 'Trưởng nhóm Vận hành',
      level: 4,
      seniority: 5.0,
      baseSalary: 19000000,
      baseIncentive: BASE_BONUS,
      department: 'Vận hành Bán lẻ',
      email: 'dung.pt@congty.vn',
      avatar: 'DU',
      target: 900,
      actual: 990, // Thô có trùng
      difficultyFactor: 1.0,
      targetIncentive: BASE_BONUS,
      scaleFactor: 1.0,
      status: 'NEEDS_REVIEW',
      validationStatus: 'DUPLICATE_ENTRY',
      isNeo: true,
      tasks: dungTasks,
      duplicateInfo: {
        isResolved: false,
        duplicateAmount: 90,
        contractCode: 'HĐ-RET-099',
        reason: 'Hợp đồng HĐ-RET-099 (90M) bị kế toán chi nhánh nhập 2 lần vào ngày 14/08 và 15/08.',
        cleanActual: 900
      },
      contracts: [
        { code: 'HĐ-RET-088', client: 'Chuỗi Bách Hóa Xanh', amount: 500, date: '10/07/2026' },
        { code: 'HĐ-RET-092', client: 'Chuỗi WinMart+', amount: 310, date: '02/08/2026' },
        { code: 'HĐ-RET-099', client: 'Công ty CP Bán lẻ K Mart', amount: 90, date: '14/08/2026' },
        { code: 'HĐ-RET-099', client: 'Công ty CP Bán lẻ K Mart (Trùng)', amount: 90, date: '15/08/2026', isDuplicate: true }
      ],
      history: [
        { period: 'Q3/2025', weightedRate: 1.02, payoutFactor: 1.050, incentive: 21000000 },
        { period: 'Q4/2025', weightedRate: 0.98, payoutFactor: 0.933, incentive: 18660000 },
        { period: 'Q1/2026', weightedRate: 1.00, payoutFactor: 1.000, incentive: 20000000 },
        { period: 'Q2/2026', weightedRate: 1.01, payoutFactor: 1.025, incentive: 20500000 }
      ],
      managerEval: {
        quality: 4.4,
        collaboration: 4.6,
        initiative: 4.2,
        objectiveDifficulty: 3.0,
        comment: 'Quản lý vận hành mạng lưới bán lẻ rất trôi chảy, cần lưu ý khâu kiểm soát chứng từ nghiệm thu của thủ kho chi nhánh.',
        managerId: 'MGR-04',
        evaluatedDate: '16/09/2026'
      },
      auditLog: [
        { time: '01/07/2026 08:30', user: 'Hệ thống', action: 'Thiết lập chỉ tiêu: 900M VNĐ' },
        { time: '16/09/2026 10:00', user: 'Hệ thống (Kiểm tra dữ liệu)', action: 'CẢNH BÁO: Phát hiện mã hợp đồng trùng lặp HĐ-RET-099 trị giá 90M VNĐ.' }
      ],
      calibration: null,
      promotionReady: false,
      promotionRationale: null
    });

    // ==========================================
    // 2. SINH 116 NHÂN VIÊN CÒN LẠI
    // ==========================================
    const ROLES = [
      { role: 'Chuyên viên Kinh doanh Cấp 1', level: 1, base: 11000000, senMin: 0.5, senMax: 2.0 },
      { role: 'Chuyên viên Kinh doanh Cấp 2', level: 2, base: 14000000, senMin: 1.5, senMax: 3.5 },
      { role: 'Quản lý Khách hàng Khu vực', level: 3, base: 17000000, senMin: 2.5, senMax: 5.0 },
      { role: 'Trưởng nhóm Kinh doanh', level: 4, base: 21000000, senMin: 4.0, senMax: 7.0 },
      { role: 'Chuyên viên Tư vấn Doanh nghiệp', level: 3, base: 16000000, senMin: 2.0, senMax: 4.5 },
      { role: 'Giám sát Hoạt động Phân phối', level: 3, base: 16500000, senMin: 2.5, senMax: 5.0 }
    ];

    const BENEFIT_TYPES = ['doanh_thu', 'tiet_kiem_chi_phi', 'hop_dong_moi'];

    for (let i = 5; i <= 120; i++) {
      const ho = HO_NAMES[Math.floor(rand() * HO_NAMES.length)];
      const lot = LOT_NAMES[Math.floor(rand() * LOT_NAMES.length)];
      const ten = TEN_NAMES[Math.floor(rand() * TEN_NAMES.length)];
      const fullName = `${ho} ${lot} ${ten}`;
      const dept = DEPARTMENTS[i % DEPARTMENTS.length];
      const roleObj = ROLES[Math.floor(rand() * ROLES.length)];

      const seniority = Math.round((roleObj.senMin + rand() * (roleObj.senMax - roleObj.senMin)) * 10) / 10;
      let baseTarget = 500 + Math.floor(rand() * 11) * 50; // 500 - 1000 triệu
      let valStatus = 'VALID';
      let status = 'CALCULATED';
      let rate = 1.0;

      // Phân bổ Achievement Rate theo kịch bản:
      if (i >= 5 && i <= 24) {
        // Nhóm BUNCHING (95% - 99.5%)
        rate = 0.95 + rand() * 0.045;
      } else if (i >= 25 && i <= 39) {
        // Nhóm dưới sàn (< 70%)
        rate = 0.45 + rand() * 0.23;
      } else if (i >= 40 && i <= 75) {
        // Nhóm đạt vừa (71% - 95%)
        rate = 0.71 + rand() * 0.23;
      } else if (i >= 76 && i <= 105) {
        // Nhóm đạt mục tiêu (100% - 119%)
        rate = 1.00 + rand() * 0.19;
      } else if (i >= 106 && i <= 115) {
        // Nhóm vượt trần (> 120%)
        rate = 1.21 + rand() * 0.25;
      } else {
        // CÁC CA BẤT THƯỜNG TRONG VALIDATION QUEUE (i = 116 - 120)
        if (i === 116) {
          baseTarget = 0;
          rate = 0;
          valStatus = 'INVALID_TARGET';
          status = 'NEEDS_REVIEW';
        } else if (i === 117) {
          rate = 1.05;
          valStatus = 'UNASSIGNED_SCHEME';
          status = 'NEEDS_REVIEW';
        } else if (i === 118) {
          baseTarget = 500;
          rate = 2.80; // Outlier 280%
          valStatus = 'EXTREME_INCENTIVE';
          status = 'NEEDS_REVIEW';
        } else if (i === 119) {
          baseTarget = 800;
          rate = 0.65; // 65% dưới sàn
          valStatus = 'UNEARNED_INCENTIVE';
          status = 'NEEDS_REVIEW';
        } else {
          rate = 0.85 + rand() * 0.25;
        }
      }

      const totalActual = baseTarget === 0 ? 450 : Math.round(baseTarget * rate);

      // Sinh 4-5 đầu việc cho mỗi người
      const taskCount = 4 + Math.floor(rand() * 2); // 4 hoặc 5 gói
      const empTasks = [];
      let remTarget = baseTarget;
      let remActual = totalActual;

      for (let t = 1; t <= taskCount; t++) {
        const isLast = (t === taskCount);
        const tTarget = isLast ? remTarget : Math.max(20, Math.round((remTarget / (taskCount - t + 1)) * (0.8 + rand() * 0.4)));
        const tActual = isLast ? remActual : Math.max(10, Math.round((remActual / (taskCount - t + 1)) * (0.8 + rand() * 0.4)));
        remTarget -= tTarget;
        remActual -= tActual;

        const pkgVal = tTarget;
        const compFactor = 0.9 + Math.round(rand() * 4) * 0.1; // 0.9, 1.0, 1.1, 1.2, 1.3
        const bType = BENEFIT_TYPES[t % BENEFIT_TYPES.length];

        empTasks.push({
          id: `TASK-${String(i).padStart(3, '0')}-${t}`,
          name: `Dự án Khách hàng ${dept.id}-${i}0${t}`,
          target: tTarget,
          actual: tActual,
          packageValue: pkgVal,
          complexityFactor: compFactor,
          difficultyFactor: 1.0,
          benefitType: bType,
          contribution: 0.8 + Math.round(rand() * 2) * 0.1
        });
      }

      // Sinh 4 kỳ lịch sử
      const history = [];
      const periods = ['Q3/2025', 'Q4/2025', 'Q1/2026', 'Q2/2026'];
      let histRateSum = 0;
      periods.forEach((p, pIdx) => {
        const hRate = Math.round((rate * (0.90 + rand() * 0.20)) * 1000) / 1000;
        histRateSum += hRate;
        const pFactor = global.IncentiveEngine
          ? global.IncentiveEngine.calculatePayoutFactor(hRate)
          : Math.max(0, Math.min(1.5, (hRate - 0.7) / 0.3));
        history.push({
          period: p,
          weightedRate: hRate,
          payoutFactor: pFactor,
          incentive: Math.round(BASE_BONUS * pFactor)
        });
      });

      const avgHistRate = histRateSum / 4;
      const isHighPerformer = avgHistRate >= 1.05 && rate >= 1.05 && seniority >= 3.0;

      // Đánh giá quản lý
      const qScore = Math.round((3.0 + (rate >= 1.0 ? 1.0 : 0) + rand() * 1.0) * 10) / 10;
      const cScore = Math.round((3.2 + rand() * 1.6) * 10) / 10;
      const iScore = Math.round((3.0 + rand() * 1.8) * 10) / 10;
      const dScore = Math.round((3.0 + rand() * 1.5) * 10) / 10;

      employees.push({
        id: `EMP-${String(i).padStart(3, '0')}`,
        code: `${dept.id}-${String(i + 10).padStart(3, '0')}`,
        name: fullName,
        role: roleObj.role,
        position: roleObj.role,
        level: roleObj.level,
        seniority,
        baseSalary: roleObj.base,
        baseIncentive: BASE_BONUS,
        department: dept.name,
        email: `${ten.toLowerCase()}.${ho.toLowerCase()}${i}@congty.vn`,
        avatar: (ho[0] + ten[0]).toUpperCase(),
        target: baseTarget,
        actual: totalActual,
        difficultyFactor: 1.0,
        targetIncentive: BASE_BONUS,
        scaleFactor: 1.0,
        status,
        validationStatus: valStatus,
        isNeo: false,
        tasks: empTasks,
        contracts: [
          { code: `HĐ-${dept.id}-${i}01`, client: `Khách hàng Đối tác ${i}A`, amount: Math.round(totalActual * 0.6), date: '12/07/2026' },
          { code: `HĐ-${dept.id}-${i}02`, client: `Khách hàng Đối tác ${i}B`, amount: Math.round(totalActual * 0.4), date: '25/08/2026' }
        ],
        history,
        managerEval: {
          quality: Math.min(5.0, qScore),
          collaboration: Math.min(5.0, cScore),
          initiative: Math.min(5.0, iScore),
          objectiveDifficulty: Math.min(5.0, dScore),
          comment: rate >= 1.0
            ? 'Hoàn thành tốt các nhiệm vụ được giao, chủ động trong công tác phát triển khách hàng.'
            : 'Cần tích cực bám sát kế hoạch hành động và cải thiện tiến độ các gói thầu.',
          managerId: dept.managerId,
          evaluatedDate: '14/09/2026'
        },
        auditLog: [
          { time: '01/07/2026 08:30', user: 'Hệ thống', action: `Khởi tạo chỉ tiêu: ${baseTarget}M VNĐ (${empTasks.length} gói việc)` },
          { time: '15/09/2026 17:00', user: 'Hệ thống', action: `Đồng bộ doanh số kỳ: ${totalActual}M VNĐ` }
        ],
        calibration: null,
        promotionReady: isHighPerformer,
        promotionRationale: isHighPerformer
          ? `Tỷ lệ đạt chỉ tiêu bền vững (trung bình 4 kỳ đạt ${(avgHistRate * 100).toFixed(1)}%), thâm niên ${seniority} năm.`
          : null
      });
    }

    return employees;
  }

  const BenchmarkDataset = {
    generateBenchmarkDataset,
    DEPARTMENTS,
    BASE_BONUS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BenchmarkDataset;
  } else {
    global.BenchmarkDataset = BenchmarkDataset;
  }
})(typeof window !== 'undefined' ? window : globalThis);
