/**
 * INCENTIVE CALCULATION ENGINE (Core business logic)
 * Nền tảng Quản lý & Đề xuất Thưởng Thông minh
 * Tuân thủ triết lý 3 tầng công bằng:
 * 1. Công bằng về kết quả (Outcome fairness): Target hiệu chỉnh theo độ khó, đường cong chi trả liên tục, trần chi trả, phân bổ theo quy mô gói việc.
 * 2. Công bằng về thủ tục (Procedural fairness): Quy tắc minh bạch, kết hợp 3 nguồn độc lập có kiểm soát, dải linh động chống áp đặt.
 * 3. Công bằng về tương tác (Interactional fairness): Minh bạch công thức, hỗ trợ giải trình, khung hỏi đáp rõ ràng.
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
    defaultTargetIncentive: 20000000, // 20.000.000 ₫ (20 triệu)
    // Cấu hình đề xuất 3 nguồn
    weightRule: 0.70,       // Trọng số quy tắc (70%)
    weightML: 0.30,         // Trọng số học máy (30%)
    defaultFlexBand: 0.20,  // Dải linh động mặc định (±20 điểm phần trăm)
    l2ApprovalThreshold: 0.10 // Ngưỡng duyệt cấp hai nếu lệch quá 10 điểm
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
   * Tính tỷ lệ hoàn thành có trọng số từ danh sách đầu việc / gói việc (Thành phần 1)
   * w_i = packageValue_i * complexityFactor_i
   * Rate_i = min(1.5, actual_i / (target_i * difficultyFactor_i))
   * R_weighted = sum(w_i * Rate_i) / sum(w_i)
   * @param {Array} tasks - Danh sách đầu việc
   * @returns {object} Chi tiết tính toán trọng số
   */
  function calculateWeightedRate(tasks = []) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return {
        weightedRate: 0,
        totalWeight: 0,
        totalTarget: 0,
        totalActual: 0,
        taskDetails: []
      };
    }

    let sumWeightRate = 0;
    let totalWeight = 0;
    let totalTarget = 0;
    let totalActual = 0;

    const taskDetails = tasks.map((t, idx) => {
      const target = Number(t.target) || 0;
      const actual = Number(t.actual) || 0;
      const packageVal = Number(t.packageValue) || target || 1;
      const complexity = Number(t.complexityFactor) || 1.0;
      const difficulty = Number(t.difficultyFactor) || 1.0;

      // Trọng số w_i
      const w = packageVal * complexity;

      // Target hiệu chỉnh của từng đầu việc
      const adjTarget = target * difficulty;
      const rawRate = adjTarget > 0 ? (actual / adjTarget) : 0;
      const cappedRate = Math.min(1.5, rawRate);

      sumWeightRate += w * cappedRate;
      totalWeight += w;
      totalTarget += target;
      totalActual += actual;

      return {
        id: t.id || `TASK-${idx + 1}`,
        name: t.name || `Gói việc ${idx + 1}`,
        target,
        actual,
        packageValue: packageVal,
        complexityFactor: complexity,
        difficultyFactor: difficulty,
        weight: Math.round(w * 100) / 100,
        rawRate: Math.round(rawRate * 10000) / 10000,
        rate: Math.round(cappedRate * 10000) / 10000
      };
    });

    const weightedRate = totalWeight > 0 ? (sumWeightRate / totalWeight) : 0;

    return {
      weightedRate: Math.round(weightedRate * 1000000) / 1000000,
      totalWeight: Math.round(totalWeight * 100) / 100,
      totalTarget,
      totalActual,
      taskDetails
    };
  }

  /**
   * Tính hệ số quy mô (Scale Factor) cá nhân hóa mức thưởng mục tiêu
   * S_w = sqrt(sum_w_i / median_w_group), kẹp trong [0.85, 1.20]
   * @param {number} totalW - Tổng trọng số công việc của nhân viên
   * @param {number} medianGroupW - Trung vị tổng trọng số của nhóm cùng vị trí/cấp bậc
   * @returns {number} Hệ số quy mô
   */
  function calculateScaleFactor(totalW, medianGroupW) {
    if (!medianGroupW || medianGroupW <= 0 || !totalW || totalW <= 0) {
      return 1.0;
    }
    const rawScale = Math.sqrt(totalW / medianGroupW);
    // Kẹp trong khoảng [0.85, 1.20]
    const clampedScale = Math.max(0.85, Math.min(1.20, rawScale));
    return Math.round(clampedScale * 1000) / 1000;
  }

  /**
   * Chuẩn hóa điểm đánh giá của Quản lý sang mức điều chỉnh deltaManager [-0.15, +0.15]
   * Chuẩn hóa z-score theo thói quen chấm điểm của quản lý (tránh chênh lệch người dễ/người khó)
   * @param {object} scores - { quality: 1-5, collaboration: 1-5, initiative: 1-5, objectiveDifficulty: 1-5 }
   * @param {object} managerStats - { mean: 3.5, stdDev: 0.6 } (thói quen chấm lịch sử của quản lý)
   * @returns {object} Điểm số chuẩn hóa và deltaManager
   */
  function normalizeManagerEvaluation(scores = {}, managerStats = { mean: 3.5, stdDev: 0.6 }) {
    const q = Number(scores.quality) || 3.0;
    const c = Number(scores.collaboration) || 3.0;
    const i = Number(scores.initiative) || 3.0;
    const d = Number(scores.objectiveDifficulty) || 3.0;

    // Trọng số 4 tiêu chí: Chất lượng 30%, Hợp tác 25%, Chủ động 25%, Khó khăn khách quan 20%
    const rawScore = (q * 0.30) + (c * 0.25) + (i * 0.25) + (d * 0.20);

    const mean = Number(managerStats.mean) || 3.5;
    const stdDev = Number(managerStats.stdDev) || 0.6;

    // Z-score
    const zScore = stdDev > 0 ? ((rawScore - mean) / stdDev) : 0;

    // Quy đổi z-score sang delta trong khoảng [-15%, +15%] (tức [-0.15, +0.15])
    // 1 độ lệch chuẩn tương ứng ~7.5 điểm phần trăm (0.075)
    let delta = zScore * 0.075;
    delta = Math.max(-0.15, Math.min(0.15, delta));

    return {
      rawScore: Math.round(rawScore * 100) / 100,
      zScore: Math.round(zScore * 100) / 100,
      deltaManager: Math.round(delta * 10000) / 10000,
      details: { quality: q, collaboration: c, initiative: i, objectiveDifficulty: d }
    };
  }

  /**
   * Kết hợp 3 nguồn để ra mức đề xuất thông minh:
   * 1. R_nền = 0.7 * R_quy_tắc + 0.3 * R_học_máy
   * 2. R_đề_xuất = R_nền + delta_quản_lý
   * Ràng buộc: kẹp trong [0, 1.50], và lệch so với R_quy_tắc không vượt flexBand (mặc định ±20%)
   * @param {object} params
   * @returns {object} Kết quả đề xuất và cảnh báo kiểm duyệt
   */
  function calculateSmartRecommendation({
    rRule = 1.0,
    rML = 1.0,
    deltaManager = 0.0,
    flexBand = DEFAULT_SCHEME_CONFIG.defaultFlexBand,
    config = DEFAULT_SCHEME_CONFIG
  }) {
    const wRule = config.weightRule ?? 0.70;
    const wML = config.weightML ?? 0.30;

    // 1. Tỷ lệ nền
    const rBase = (wRule * rRule) + (wML * rML);

    // 2. Cộng điều chỉnh quản lý
    let rProposed = rBase + deltaManager;

    // 3. Ràng buộc dải linh động quanh R_quy_tắc
    const minFlex = Math.max(0, rRule - flexBand);
    const maxFlex = Math.min(config.factorCap, rRule + flexBand);

    let isClampedByFlexBand = false;
    if (rProposed < minFlex) {
      rProposed = minFlex;
      isClampedByFlexBand = true;
    } else if (rProposed > maxFlex) {
      rProposed = maxFlex;
      isClampedByFlexBand = true;
    }

    // 4. Kẹp tuyệt đối [0, factorCap]
    rProposed = Math.max(0, Math.min(config.factorCap, rProposed));
    rProposed = Math.round(rProposed * 10000) / 10000;

    return {
      rRule: Math.round(rRule * 10000) / 10000,
      rML: Math.round(rML * 10000) / 10000,
      deltaManager: Math.round(deltaManager * 10000) / 10000,
      rBase: Math.round(rBase * 10000) / 10000,
      rProposed,
      flexMin: Math.round(minFlex * 10000) / 10000,
      flexMax: Math.round(maxFlex * 10000) / 10000,
      isClampedByFlexBand
    };
  }

  /**
   * Kiểm tra quyết định cuối của Quản lý so với Đề xuất
   * Nếu lệch quá 10 điểm phần trăm (0.10) thì bắt buộc lý do và cần duyệt cấp 2
   */
  function evaluateManagerFinalChoice(rProposed, rFinal, reason = '') {
    const diff = Math.abs(rFinal - rProposed);
    const requiresL2 = diff > DEFAULT_SCHEME_CONFIG.l2ApprovalThreshold;
    return {
      rProposed,
      rFinal,
      difference: Math.round(diff * 10000) / 10000,
      requiresL2Approval: requiresL2,
      hasValidReason: Boolean(reason && reason.trim().length >= 10),
      status: requiresL2 ? 'PENDING_L2_APPROVAL' : 'APPROVED_BY_MANAGER'
    };
  }

  /**
   * Kiểm tra ràng buộc quỹ thưởng toàn công ty (Budget Constraint)
   * Nếu tổng chi thưởng vượt quỹ, đề xuất hệ số co giãn đều (pro-rata scaling)
   */
  function checkBudgetConstraint(employees = [], budget = 1750000000) {
    let totalCalculatedCost = 0;
    let totalProposedCost = 0;
    let totalFinalCost = 0;

    employees.forEach(emp => {
      totalCalculatedCost += Number(emp.incentiveAmount || 0);
      totalProposedCost += Number(emp.proposedIncentive || emp.incentiveAmount || 0);
      totalFinalCost += Number(emp.finalIncentive || emp.incentiveAmount || 0);
    });

    const isOverBudget = totalFinalCost > budget;
    const overAmount = isOverBudget ? (totalFinalCost - budget) : 0;
    const scalingFactor = isOverBudget ? (budget / totalFinalCost) : 1.0;

    return {
      budget,
      totalCalculatedCost,
      totalProposedCost,
      totalFinalCost,
      isOverBudget,
      overAmount,
      utilizationRate: budget > 0 ? (totalFinalCost / budget) : 0,
      scalingFactor: Math.round(scalingFactor * 10000) / 10000,
      suggestedScalingDescription: isOverBudget
        ? `Ngân sách vượt ${formatVND(overAmount)}. Đề xuất áp dụng hệ số co giãn đồng đều k = ${formatNumberVN(scalingFactor * 100, 2)}% để đưa tổng chi về mức quỹ cho phép.`
        : 'Tổng chi phí thưởng nằm an toàn trong hạn mức quỹ cho phép.'
    };
  }

  /**
   * Tính toán các chỉ số kinh doanh bổ sung theo thời gian
   */
  function calculateBusinessMetrics({
    employees = [],
    budget = 1750000000,
    workdaysElapsed = 15,
    totalWorkdays = 22
  }) {
    const totalCount = employees.length || 1;
    let totalWeightedRate = 0;
    let totalRawRate = 0;
    let totalIncentive = 0;
    let totalActualRev = 0;
    let nearThresholdUpper = 0; // 95% - 99.9%
    let nearThresholdLower = 0; // 65% - 69.9%

    employees.forEach(emp => {
      const rate = Number(emp.achievementRate || 0);
      totalRawRate += rate;
      totalWeightedRate += Number(emp.weightedRate || rate);
      totalIncentive += Number(emp.finalIncentive || emp.incentiveAmount || 0);
      totalActualRev += Number(emp.actual || 0);

      if (rate >= 0.95 && rate < 1.00) nearThresholdUpper++;
      if (rate >= 0.65 && rate < 0.70) nearThresholdLower++;
    });

    const avgWeightedRate = totalWeightedRate / totalCount;
    const progressVsTime = totalWorkdays > 0 ? (workdaysElapsed / totalWorkdays) : 1;
    const velocity = progressVsTime > 0 ? (avgWeightedRate / progressVsTime) : 1;

    // Dự phóng hoàn thành cuối kỳ = thực đạt đến nay + thời gian còn lại * tốc độ hiện tại
    const remainingTime = Math.max(0, 1 - progressVsTime);
    const projectedFinalRate = avgWeightedRate + (remainingTime * velocity * 0.95);

    // Tỷ lệ chi phí thưởng trên doanh thu
    const incentiveToRevenue = totalActualRev > 0 ? (totalIncentive / (totalActualRev * 1000000)) : 0;

    return {
      workdaysElapsed,
      totalWorkdays,
      progressVsTime: Math.round(progressVsTime * 1000) / 1000,
      avgWeightedRate: Math.round(avgWeightedRate * 1000) / 1000,
      velocity: Math.round(velocity * 100) / 100,
      projectedFinalRate: Math.round(projectedFinalRate * 1000) / 1000,
      totalIncentive,
      budget,
      budgetUsageRate: budget > 0 ? (totalIncentive / budget) : 0,
      incentiveToRevenue: Math.round(incentiveToRevenue * 10000) / 10000,
      bunchingCount: nearThresholdUpper,
      nearFloorCount: nearThresholdLower
    };
  }

  /**
   * Hàm tính toán incentive lõi duy nhất cho một nhân viên/bản ghi (Tương thích ngược)
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
      // Dữ liệu đối chiếu
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
   * Định dạng số theo chuẩn Việt Nam
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
    calculateWeightedRate,
    calculateScaleFactor,
    normalizeManagerEvaluation,
    calculateSmartRecommendation,
    evaluateManagerFinalChoice,
    checkBudgetConstraint,
    calculateBusinessMetrics,
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
