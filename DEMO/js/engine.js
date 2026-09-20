/**
 * INCENTIVE CALCULATION ENGINE (Core business logic)
 * Nền tảng Quản lý & Phân tích Incentive
 * Tuân thủ triết lý 3 tầng công bằng:
 * 1. Công bằng về kết quả (Outcome fairness): Target hiệu chỉnh theo độ khó, đường cong chi trả liên tục, trần chi trả.
 * 2. Công bằng về thủ tục (Procedural fairness): Quy tắc rõ ràng, không hardcode, audit log mọi thay đổi.
 * 3. Công bằng về tương tác (Interactional fairness): Minh bạch công thức, hỗ trợ giải trình.
 */

(function (global) {
  'use strict';

  // Cấu hình mặc định cho đường cong chi trả (Configurable Scheme Parameters)
  const DEFAULT_SCHEME_CONFIG = {
    thresholdMin: 0.70,     // Dưới 70% không có thưởng
    thresholdTarget: 1.00,  // Đạt 100% nhận 1.0 lần thưởng mục tiêu
    thresholdMax: 1.20,     // Từ 100% đến 120% tăng lũy tiến lên 1.5
    factorAtMin: 0.0,       // Hệ số tại ngưỡng tối thiểu (0.0)
    factorAtTarget: 1.0,    // Hệ số tại ngưỡng đạt mục tiêu (1.0)
    factorCap: 1.5,         // Trần hệ số chi trả tối đa (1.5)
    defaultTargetIncentive: 20000000 // 20.000.000 ₫ (20 triệu)
  };

  /**
   * Tính hệ số chi trả (Payout Factor) dựa trên đường cong liên tục
   * @param {number} rate - Tỷ lệ đạt mục tiêu (Achievement Rate, ví dụ 1.15 cho 115%)
   * @param {object} config - Cấu hình ngưỡng scheme
   * @returns {number} Hệ số chi trả
   */
  function calculatePayoutFactor(rate, config = DEFAULT_SCHEME_CONFIG) {
    let factor = config.factorCap;
    if (rate == null || isNaN(rate) || rate < config.thresholdMin) {
      factor = config.factorAtMin;
    } else if (rate <= config.thresholdTarget) {
      // Tuyến tính từ thresholdMin -> thresholdTarget (0 -> 1.0)
      const range = config.thresholdTarget - config.thresholdMin;
      factor = range <= 0 ? config.factorAtTarget : config.factorAtMin + ((rate - config.thresholdMin) / range) * (config.factorAtTarget - config.factorAtMin);
    } else if (rate <= config.thresholdMax) {
      // Tuyến tính từ thresholdTarget -> thresholdMax (1.0 -> 1.5)
      const range = config.thresholdMax - config.thresholdTarget;
      factor = range <= 0 ? config.factorCap : config.factorAtTarget + ((rate - config.thresholdTarget) / range) * (config.factorCap - config.factorAtTarget);
    }
    // Chuẩn hóa làm tròn 6 chữ số thập phân chống nhiễu số học IEEE 754
    return Math.round(factor * 1000000) / 1000000;
  }

  /**
   * Hàm tính toán incentive lõi duy nhất cho một nhân viên/bản ghi
   * @param {object} params
   * @param {number} params.target - Doanh số/KPI mục tiêu ban đầu
   * @param {number} params.actual - Doanh số/KPI thực tế đạt được
   * @param {number} [params.difficultyFactor=1.0] - Hệ số độ khó (mặc định 1.0, hiệu chỉnh khi duyệt)
   * @param {number} [params.targetIncentive=20000000] - Mức thưởng mục tiêu (VNĐ)
   * @param {object} [params.config] - Cấu hình scheme
   * @returns {object} Chi tiết tính toán từng bước để phục vụ giải trình và truy vết
   */
  function calculateEmployeeIncentive({
    target,
    actual,
    difficultyFactor = 1.0,
    targetIncentive = DEFAULT_SCHEME_CONFIG.defaultTargetIncentive,
    config = DEFAULT_SCHEME_CONFIG
  }) {
    const rawTarget = Number(target) || 0;
    const rawActual = Number(actual) || 0;
    const factor = Number(difficultyFactor) || 1.0;
    const baseBonus = Number(targetIncentive) || DEFAULT_SCHEME_CONFIG.defaultTargetIncentive;

    // 1. Target hiệu chỉnh = Target ban đầu * Hệ số độ khó
    const adjustedTarget = rawTarget * factor;

    // 2. Achievement Rate hiệu chỉnh = Actual / Adjusted Target
    const achievementRate = adjustedTarget > 0 ? (rawActual / adjustedTarget) : 0;

    // 3. Hệ số chi trả theo đường cong liên tục
    const payoutFactor = calculatePayoutFactor(achievementRate, config);

    // 4. Tiền thưởng thực nhận
    const incentiveAmount = Math.round(baseBonus * payoutFactor);

    // 5. Tỷ lệ và số tiền tính thô (độ khó = 1.0) để đối chiếu
    const rawAchievementRate = rawTarget > 0 ? (rawActual / rawTarget) : 0;
    const rawPayoutFactor = calculatePayoutFactor(rawAchievementRate, config);
    const rawIncentiveAmount = Math.round(baseBonus * rawPayoutFactor);

    return {
      rawTarget,
      difficultyFactor: factor,
      adjustedTarget,
      actual: rawActual,
      achievementRate,
      payoutFactor,
      targetIncentive: baseBonus,
      incentiveAmount,
      // Dữ liệu đối chiếu (Trước khi hiệu chỉnh)
      rawAchievementRate,
      rawPayoutFactor,
      rawIncentiveAmount,
      isAdjusted: factor !== 1.0,
      isCapped: achievementRate > config.thresholdMax,
      isBelowFloor: achievementRate < config.thresholdMin
    };
  }

  /**
   * Định dạng tiền tệ Việt Nam (vi-VN: 1.000.000 ₫)
   */
  function formatVND(amount, privacy = false) {
    if (privacy) return '•••••• ₫';
    if (amount == null || isNaN(amount)) return '0 ₫';
    return Number(amount).toLocaleString('vi-VN') + ' ₫';
  }

  /**
   * Định dạng số theo chuẩn Việt Nam (phân tách hàng nghìn bằng dấu chấm, thập phân phẩy)
   */
  function formatNumberVN(num, decimals = 1) {
    if (num == null || isNaN(num)) return '0';
    return Number(num).toLocaleString('vi-VN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Định dạng phần trăm
   */
  function formatPercent(rate, decimals = 1) {
    if (rate == null || isNaN(rate)) return '0%';
    return (rate * 100).toLocaleString('vi-VN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }) + '%';
  }

  const IncentiveEngine = {
    DEFAULT_SCHEME_CONFIG,
    calculatePayoutFactor,
    calculateEmployeeIncentive,
    formatVND,
    formatNumberVN,
    formatPercent
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = IncentiveEngine;
  } else {
    global.IncentiveEngine = IncentiveEngine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
