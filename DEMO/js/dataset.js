/**
 * MÔ PHỎNG DỮ LIỆU KỲ Q3/2026 (120 NHÂN VIÊN & 4 NHÂN VẬT NEO)
 * Dữ liệu được sinh bằng PRNG có Seed cố định để kết quả luôn nhất quán.
 * Cài đặt sẵn:
 * - 4 nhân vật neo: An, Bình, Chi, Dũng khớp 100% đề xuất đề tài.
 * - Hiện tượng dồn ứ (Bunching) ở khoảng 95% - 99% cho màn hình Phân tích.
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
    { id: 'MB', name: 'Kinh doanh Miền Bắc' },
    { id: 'MN', name: 'Kinh doanh Miền Nam' },
    { id: 'B2B', name: 'Khách hàng Doanh nghiệp' },
    { id: 'RETAIL', name: 'Vận hành Bán lẻ' }
  ];

  function generateBenchmarkDataset() {
    const rand = createRandom(20260920);
    const employees = [];

    // 1. CÀI ĐẶT 4 NHÂN VẬT NEO CỦA ĐỀ ÁN (Mức thưởng mục tiêu 20 triệu VNĐ)
    const BASE_BONUS = 20000000;

    // Nhân vật 1: An
    employees.push({
      id: 'EMP-001',
      code: 'MB-014',
      name: 'Nguyễn Văn An',
      role: 'Chuyên viên Kinh doanh Cấp cao',
      department: 'Kinh doanh Miền Bắc',
      email: 'an.nv@congty.vn',
      avatar: 'AN',
      target: 800, // 800 triệu
      actual: 920, // 920 triệu
      difficultyFactor: 1.0,
      targetIncentive: BASE_BONUS,
      status: 'CALCULATED', // Đã tính
      validationStatus: 'VALID',
      isNeo: true,
      contracts: [
        { code: 'HĐ-MB-101', client: 'Tập đoàn Hòa Phát', amount: 350, date: '15/07/2026' },
        { code: 'HĐ-MB-108', client: 'Tổng công ty Viglacera', amount: 420, date: '12/08/2026' },
        { code: 'HĐ-MB-119', client: 'Công ty CP May Sông Hồng', amount: 150, date: '18/09/2026' }
      ],
      auditLog: [
        { time: '01/07/2026 08:30', user: 'Hệ thống', action: 'Thiết lập chỉ tiêu ban đầu: 800M VNĐ' },
        { time: '15/09/2026 17:00', user: 'C&B Specialist (Thu Trang)', action: 'Chốt doanh số thực đạt: 920M VNĐ' },
        { time: '18/09/2026 09:15', user: 'Hệ thống', action: 'Tự động tính toán: 115.0% -> Hệ số chi trả 1.375' }
      ],
      calibration: null
    });

    // Nhân vật 2: Bình (Có đề xuất hiệu chỉnh độ khó 0.9)
    employees.push({
      id: 'EMP-002',
      code: 'MN-008',
      name: 'Trần Thị Bình',
      role: 'Quản lý Tài khoản Khách hàng',
      department: 'Kinh doanh Miền Nam',
      email: 'binh.tt@congty.vn',
      avatar: 'BI',
      target: 1000, // 1000 triệu
      actual: 850,  // 850 triệu
      difficultyFactor: 1.0, // Thô = 1.0, khi duyệt -> 0.9
      targetIncentive: BASE_BONUS,
      status: 'NEEDS_REVIEW', // Cần xem xét hiệu chỉnh
      validationStatus: 'PENDING_CALIBRATION',
      isNeo: true,
      contracts: [
        { code: 'HĐ-MN-205', client: 'Công ty Cổ phần Thaco', amount: 480, date: '20/07/2026' },
        { code: 'HĐ-MN-212', client: 'Vinamilk Chi nhánh Nam', amount: 370, date: '28/08/2026' }
      ],
      auditLog: [
        { time: '01/07/2026 08:30', user: 'Hệ thống', action: 'Thiết lập chỉ tiêu ban đầu: 1.000M VNĐ (Tăng trưởng 25% năm trước)' },
        { time: '05/09/2026 14:20', user: 'Line Manager (Quốc Hùng)', action: 'Gửi đề xuất hiệu chỉnh hệ số độ khó 0.9 (Do thị trường khu vực suy giảm 10%) kèm báo cáo thị trường' }
      ],
      calibration: {
        proposedFactor: 0.9,
        proposedTarget: 900,
        proposer: 'Quốc Hùng (Line Manager)',
        submitDate: '05/09/2026',
        evidence: 'Báo cáo chỉ số tiêu dùng ngành Q3/2026 co hẹp 10.2% tại vùng trọng điểm Đông Nam Bộ. 2 dự án lớn của khách hàng hoãn sang Q4 do nguyên nhân khách quan.',
        status: 'PENDING', // 'PENDING' | 'APPROVED' | 'REJECTED'
        reviewedBy: null,
        reviewDate: null,
        comment: ''
      }
    });

    // Nhân vật 3: Chi (Đạt chuẩn 100%)
    employees.push({
      id: 'EMP-003',
      code: 'B2B-005',
      name: 'Lê Hoàng Chi',
      role: 'Chuyên viên Phát triển Khách hàng B2B',
      department: 'Khách hàng Doanh nghiệp',
      email: 'chi.lh@congty.vn',
      avatar: 'CH',
      target: 600, // 600 triệu
      actual: 600, // 600 triệu
      difficultyFactor: 1.0,
      targetIncentive: BASE_BONUS,
      status: 'CALCULATED',
      validationStatus: 'VALID',
      isNeo: true,
      contracts: [
        { code: 'HĐ-B2B-01', client: 'Ngân hàng Quân đội MBBank', amount: 320, date: '11/07/2026' },
        { code: 'HĐ-B2B-04', client: 'Tập đoàn FPT', amount: 280, date: '04/09/2026' }
      ],
      auditLog: [
        { time: '01/07/2026 08:30', user: 'Hệ thống', action: 'Thiết lập chỉ tiêu: 600M VNĐ' },
        { time: '15/09/2026 17:00', user: 'C&B Specialist', action: 'Xác nhận doanh số nghiệm thu: 600M VNĐ' },
        { time: '18/09/2026 09:15', user: 'Hệ thống', action: 'Tính toán: 100.0% -> Hệ số chi trả 1.000' }
      ],
      calibration: null
    });

    // Nhân vật 4: Dũng (Có bản ghi trùng 90M cần gỡ)
    employees.push({
      id: 'EMP-004',
      code: 'RET-021',
      name: 'Phạm Tiến Dũng',
      role: 'Trưởng nhóm Giám sát Vận hành',
      department: 'Vận hành Bán lẻ',
      email: 'dung.pt@congty.vn',
      avatar: 'DU',
      target: 900,  // 900 triệu
      actual: 990,  // Ghi nhận thô 990 triệu (do trùng hợp đồng 90 triệu)
      difficultyFactor: 1.0,
      targetIncentive: BASE_BONUS,
      status: 'NEEDS_REVIEW',
      validationStatus: 'DUPLICATE_ENTRY',
      isNeo: true,
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
      auditLog: [
        { time: '01/07/2026 08:30', user: 'Hệ thống', action: 'Thiết lập chỉ tiêu: 900M VNĐ' },
        { time: '16/09/2026 10:00', user: 'Hệ thống (Kiểm tra dữ liệu)', action: 'CẢNH BÁO: Phát hiện mã hợp đồng trùng lặp HĐ-RET-099 trị giá 90M VNĐ.' }
      ],
      calibration: null
    });

    // 2. SINH THÊM 116 NHÂN VIÊN ĐỂ ĐẠT 120 NHÂN VIÊN TOÀN CÔNG TY
    // Thiết kế phân bố thực tế:
    // - 20 nhân viên dồn ở khoảng 95% - 99% (Bunching ngay sát ngưỡng 100%)
    // - 15 nhân viên dưới 70% (không đạt thưởng)
    // - 45 nhân viên đạt 70% - 99%
    // - 30 nhân viên đạt 100% - 120%
    // - 6 nhân viên vượt 120% (chạm trần 1.5)
    // - Cài đặt thêm 3 ca cảnh báo dữ liệu:
    //   + 1 ca MISSING_TARGET (chưa có target hợp lệ)
    //   + 1 ca UNASSIGNED_SCHEME (chưa gán scheme)
    //   + 1 ca EXTREME_INCENTIVE (outlier tăng vọt bất thường)

    const ROLES = [
      'Chuyên viên Kinh doanh Cấp 1',
      'Chuyên viên Kinh doanh Cấp 2',
      'Quản lý Khách hàng Khu vực',
      'Trưởng nhóm Kinh doanh',
      'Chuyên viên Tư vấn Doanh nghiệp',
      'Giám sát Hoạt động Phân phối'
    ];

    for (let i = 5; i <= 120; i++) {
      const ho = HO_NAMES[Math.floor(rand() * HO_NAMES.length)];
      const lot = LOT_NAMES[Math.floor(rand() * LOT_NAMES.length)];
      const ten = TEN_NAMES[Math.floor(rand() * TEN_NAMES.length)];
      const fullName = `${ho} ${lot} ${ten}`;
      const dept = DEPARTMENTS[i % DEPARTMENTS.length];
      const role = ROLES[Math.floor(rand() * ROLES.length)];

      let baseTarget = 500 + Math.floor(rand() * 11) * 50; // 500 - 1000 triệu
      let targetBonus = 20000000;
      let diffFactor = 1.0;
      let valStatus = 'VALID';
      let status = 'CALCULATED';
      let actual = 0;

      // Phân bố Achievement Rate theo kịch bản:
      if (i >= 5 && i <= 24) {
        // Nhóm BUNCHING (95% - 99%)
        const rate = 0.95 + rand() * 0.045; // 0.95 - 0.995
        actual = Math.round(baseTarget * rate);
      } else if (i >= 25 && i <= 39) {
        // Nhóm dưới sàn (< 70%)
        const rate = 0.45 + rand() * 0.23; // 45% - 68%
        actual = Math.round(baseTarget * rate);
      } else if (i >= 40 && i <= 75) {
        // Nhóm đạt vừa (70% - 95%)
        const rate = 0.71 + rand() * 0.23;
        actual = Math.round(baseTarget * rate);
      } else if (i >= 76 && i <= 105) {
        // Nhóm đạt mục tiêu (100% - 119%)
        const rate = 1.00 + rand() * 0.19;
        actual = Math.round(baseTarget * rate);
      } else if (i >= 106 && i <= 115) {
        // Nhóm vượt trần (> 120%)
        const rate = 1.21 + rand() * 0.25;
        actual = Math.round(baseTarget * rate);
      } else {
        // CÁC CA BẤT THƯỜNG TRONG VALIDATION QUEUE (i = 116 - 120)
        if (i === 116) {
          // Bất thường 1: Thiếu target (Target = 0)
          baseTarget = 0;
          actual = 450;
          valStatus = 'INVALID_TARGET';
          status = 'NEEDS_REVIEW';
        } else if (i === 117) {
          // Bất thường 2: Chưa gán Scheme
          actual = 700;
          valStatus = 'UNASSIGNED_SCHEME';
          status = 'NEEDS_REVIEW';
        } else if (i === 118) {
          // Bất thường 3: Thưởng vọt mức bất thường (Outlier 280% do số nhập lỗi)
          baseTarget = 500;
          actual = 1400; // 280%
          valStatus = 'EXTREME_INCENTIVE';
          status = 'NEEDS_REVIEW';
        } else if (i === 119) {
          // Bất thường 4: Thực đạt < target nhưng bị nhập sai cờ thủ công
          baseTarget = 800;
          actual = 520; // 65% (dưới sàn)
          valStatus = 'UNEARNED_INCENTIVE';
          status = 'NEEDS_REVIEW';
        } else {
          // Bình thường
          actual = Math.round(baseTarget * (0.85 + rand() * 0.25));
        }
      }

      employees.push({
        id: `EMP-${String(i).padStart(3, '0')}`,
        code: `${dept.id}-${String(i + 10).padStart(3, '0')}`,
        name: fullName,
        role,
        department: dept.name,
        email: `${ten.toLowerCase()}.${ho.toLowerCase()}${i}@congty.vn`,
        avatar: (ho[0] + ten[0]).toUpperCase(),
        target: baseTarget,
        actual,
        difficultyFactor: diffFactor,
        targetIncentive: targetBonus,
        status,
        validationStatus: valStatus,
        isNeo: false,
        contracts: [
          { code: `HĐ-${dept.id}-${i}01`, client: `Khách hàng Đối tác ${i}A`, amount: Math.round(actual * 0.6), date: '12/07/2026' },
          { code: `HĐ-${dept.id}-${i}02`, client: `Khách hàng Đối tác ${i}B`, amount: Math.round(actual * 0.4), date: '25/08/2026' }
        ],
        auditLog: [
          { time: '01/07/2026 08:30', user: 'Hệ thống', action: `Khởi tạo chỉ tiêu: ${baseTarget}M VNĐ` },
          { time: '15/09/2026 17:00', user: 'Hệ thống', action: `Đồng bộ doanh số kỳ: ${actual}M VNĐ` }
        ],
        calibration: null
      });
    }

    return employees;
  }

  const BenchmarkDataset = {
    generateBenchmarkDataset,
    DEPARTMENTS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BenchmarkDataset;
  } else {
    global.BenchmarkDataset = BenchmarkDataset;
  }
})(typeof window !== 'undefined' ? window : globalThis);
