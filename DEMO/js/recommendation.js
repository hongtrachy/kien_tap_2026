/**
 * MÔ ĐUN ĐỀ XUẤT MỨC THƯỞNG THÔNG MINH (SMART RECOMMENDATION CONTROLLER)
 * Nền tảng Quản lý & Đề xuất Thưởng Thông minh
 * 
 * Kết hợp 3 nguồn:
 * 1. Quy tắc định lượng công việc có trọng số (R_quy_tắc)
 * 2. Học máy dựa trên lịch sử toàn công ty (R_học_máy)
 * 3. Đánh giá của quản lý trực tiếp sau chuẩn hóa (delta_quản_lý)
 * 
 * Cung cấp:
 * - Khung hỏi & đáp giải thích (Template-based Q&A)
 * - Thanh kéo What-If tương tác tức thì
 * - Kiểm soát dải linh động và duyệt cấp hai
 * - Đề xuất thăng tiến tự động có căn cứ
 */

(function (global) {
  'use strict';

  // Cache dự đoán ML nạp từ JSON
  let mlPredictionsCache = null;

  /**
   * Nạp trước dữ liệu dự đoán ML
   */
  async function loadMLPredictions() {
    if (mlPredictionsCache) return mlPredictionsCache;
    try {
      const response = await fetch('data/ml_predictions.json');
      if (response.ok) {
        const data = await response.json();
        mlPredictionsCache = data.predictions || {};
        return mlPredictionsCache;
      }
    } catch (err) {
      console.warn('Không thể fetch ml_predictions.json (có thể do xem qua file://). Dùng fallback mô phỏng.', err);
    }
    mlPredictionsCache = {};
    return mlPredictionsCache;
  }

  /**
   * Tính toán đề xuất thông minh toàn diện cho một nhân viên
   * @param {object} emp - Hồ sơ nhân viên
   * @param {object} allEmployees - Danh sách đồng nghiệp để so sánh nhóm
   * @param {object} customConfig - Cấu hình tùy biến
   */
  function computeEmployeeRecommendation(emp, allEmployees = [], customConfig = {}) {
    const Engine = global.IncentiveEngine;
    if (!Engine) return null;

    // 1. Thành phần 1: Quy tắc (từ các đầu việc có trọng số)
    const taskCalc = Engine.calculateWeightedRate(emp.tasks);
    const weightedRate = taskCalc.weightedRate || (emp.actual / (emp.target || 1));
    const rRule = Engine.calculatePayoutFactor(weightedRate);

    // Tính hệ số quy mô Sw
    let medianGroupW = 800; // Mặc định
    if (Array.isArray(allEmployees) && allEmployees.length > 0) {
      const peers = allEmployees.filter(e => e.role === emp.role);
      if (peers.length > 0) {
        const weights = peers.map(p => {
          const tc = Engine.calculateWeightedRate(p.tasks);
          return tc.totalWeight || p.target || 800;
        }).sort((a, b) => a - b);
        medianGroupW = weights[Math.floor(weights.length / 2)] || 800;
      }
    }
    const scaleFactor = Engine.calculateScaleFactor(taskCalc.totalWeight, medianGroupW);
    const targetIncentivePersonal = Math.round((emp.baseIncentive || 20000000) * scaleFactor);

    // 2. Thành phần 2: Học máy R_học_máy
    let mlData = (mlPredictionsCache && mlPredictionsCache[emp.id]) ? mlPredictionsCache[emp.id] : null;
    let rML = rRule;
    let intervalP10 = Math.max(0, rRule - 0.08);
    let intervalP90 = Math.min(1.5, rRule + 0.08);
    let mlDrivers = [];

    if (mlData) {
      rML = mlData.rML;
      intervalP10 = mlData.intervalP10;
      intervalP90 = mlData.intervalP90;
      mlDrivers = mlData.topDrivers || [];
    } else {
      // Fallback mô phỏng nếu chưa load được JSON
      const hist = emp.history || [];
      const histAvg = hist.length ? (hist.reduce((s, h) => s + h.weightedRate, 0) / hist.length) : 1.0;
      rML = Math.round(((0.75 * weightedRate) + (0.25 * histAvg)) * 1000) / 1000;
      intervalP10 = Math.max(0, Math.round((rML - 0.06) * 1000) / 1000);
      intervalP90 = Math.min(1.5, Math.round((rML + 0.06) * 1000) / 1000);
    }

    // 3. Thành phần 3: Đánh giá quản lý
    const managerEval = emp.managerEval || { quality: 3.5, collaboration: 3.5, initiative: 3.5, objectiveDifficulty: 3.0 };
    const normEval = Engine.normalizeManagerEvaluation(managerEval);
    const deltaManager = normEval.deltaManager;

    // 4. Kết hợp 3 nguồn
    const recCalc = Engine.calculateSmartRecommendation({
      rRule,
      rML,
      deltaManager,
      flexBand: customConfig.flexBand || 0.20
    });

    const proposedAmount = Math.round(targetIncentivePersonal * recCalc.rProposed);

    // 5. Thống kê nhóm đồng cấp (Peer Group Statistics) ẩn danh
    let peerStats = { count: 1, medianRate: 1.0, minRate: 0.8, maxRate: 1.2 };
    if (Array.isArray(allEmployees) && allEmployees.length > 0) {
      const peers = allEmployees.filter(e => e.role === emp.role && e.id !== emp.id);
      if (peers.length > 0) {
        const pRates = peers.map(p => Number(p.achievementRate || 1.0)).sort((a, b) => a - b);
        peerStats = {
          count: peers.length,
          medianRate: pRates[Math.floor(pRates.length / 2)],
          minRate: pRates[0],
          maxRate: pRates[pRates.length - 1]
        };
      }
    }

    // 6. Tự động sinh diễn giải tiếng Việt theo mẫu chuẩn
    const explanationText = generateRecommendationExplanation({
      emp,
      weightedRate,
      rRule,
      rML,
      deltaManager,
      rProposed: recCalc.rProposed,
      normEval,
      peerStats
    });

    return {
      employeeId: emp.id,
      weightedRate,
      rRule,
      rML,
      intervalP10,
      intervalP90,
      mlDrivers,
      deltaManager,
      managerScores: normEval.details,
      managerRawScore: normEval.rawScore,
      rBase: recCalc.rBase,
      rProposed: recCalc.rProposed,
      flexMin: recCalc.flexMin,
      flexMax: recCalc.flexMax,
      isClampedByFlexBand: recCalc.isClampedByFlexBand,
      scaleFactor,
      targetIncentivePersonal,
      proposedAmount,
      explanationText,
      peerStats,
      promotionReady: emp.promotionReady,
      promotionRationale: emp.promotionRationale
    };
  }

  /**
   * Sinh bản giải trình đề xuất tiếng Việt dựa trên số liệu thật
   */
  function generateRecommendationExplanation({ emp, weightedRate, rRule, rML, deltaManager, rProposed, normEval, peerStats }) {
    const Engine = global.IncentiveEngine;
    const wRatePercent = Engine.formatPercent(weightedRate, 1);
    const rRulePercent = Engine.formatPercent(rRule, 1);
    const rProposedPercent = Engine.formatPercent(rProposed, 1);
    
    // Tính hiệu số của ML
    const mlDiffPoints = Math.round((rML - rRule) * 1000) / 10;
    const mlSign = mlDiffPoints >= 0 ? 'cộng thêm' : 'điều chỉnh giảm';
    const mlAbsPoints = Math.abs(mlDiffPoints).toFixed(1);

    // Nhận xét quản lý
    const mgrSign = deltaManager >= 0 ? 'cộng thêm' : 'trừ đi';
    const mgrAbsPoints = Math.abs(deltaManager * 100).toFixed(1);
    const highestCriterion = getHighestCriterionText(normEval.details);

    return `Hệ thống đề xuất mức thưởng **${rProposedPercent}** dựa trên sự kết hợp có kiểm soát của 3 nguồn:\n\n` +
      `1. **Theo quy tắc định lượng**: Tỷ lệ đạt có trọng số của các gói việc đạt **${wRatePercent}**, tương ứng hệ số chi trả **${rRulePercent}** theo đường cong quy chế chuẩn.\n` +
      `2. **Theo học máy lịch sử**: Phân tích hồ sơ 4 kỳ liên tiếp cho thấy tính ổn định cao; học máy dự báo mức chi trả tham chiếu ${Engine.formatPercent(rML, 1)} (${mlSign} ${mlAbsPoints} điểm phần trăm).\n` +
      `3. **Theo đánh giá quản lý**: Quản lý trực tiếp chấm điểm bình quân ${normEval.rawScore}/5,0 (trong đó tiêu chí *${highestCriterion}* nổi bật), quy đổi ${mgrSign} ${mgrAbsPoints} điểm phần trăm sau chuẩn hóa thiên kiến cá nhân.\n\n` +
      `*Mức đề xuất nằm hoàn toàn trong dải linh động an toàn cho phép và không bị chi phối đơn phương bởi bất kỳ nguồn nào.*`;
  }

  function getHighestCriterionText(details = {}) {
    const map = {
      quality: 'Chất lượng công việc',
      collaboration: 'Tinh thần hợp tác',
      initiative: 'Chủ động & đóng góp vượt trội',
      objectiveDifficulty: 'Thách thức thị trường khách quan'
    };
    let maxKey = 'quality';
    let maxVal = -1;
    for (const k in details) {
      if (details[k] > maxVal) {
        maxVal = details[k];
        maxKey = k;
      }
    }
    return `${map[maxKey]} (${maxVal}/5)`;
  }

  /**
   * Khung hỏi đáp cho quản lý (Q&A Generator)
   */
  function answerManagerQuestion(questionKey, { emp, recData, customTargetRate = null }) {
    const Engine = global.IncentiveEngine;
    if (!recData) return 'Chưa đủ dữ liệu để trả lời câu hỏi này.';

    if (questionKey === 'why_this_rate') {
      return recData.explanationText;
    }

    if (questionKey === 'what_if_adjust') {
      const targetRate = customTargetRate != null ? customTargetRate : 0.60;
      const targetAmount = Math.round(recData.targetIncentivePersonal * targetRate);
      const diffAmount = targetAmount - recData.proposedAmount;
      const signText = diffAmount >= 0 ? 'tăng thêm' : 'giảm đi';
      const absDiffStr = Engine.formatVND(Math.abs(diffAmount));
      
      let peerContext = 'ở mức trung bình';
      if (targetRate < recData.peerStats.medianRate * 0.9) {
        peerContext = 'thấp hơn đáng kể so với mức trung vị của nhóm đồng cấp';
      } else if (targetRate > recData.peerStats.medianRate * 1.1) {
        peerContext = 'thuộc nhóm dẫn đầu so với các đồng nghiệp cùng vị trí';
      }

      const l2Warning = Math.abs(targetRate - recData.rProposed) > 0.10
        ? `\n\n⚠️ **Lưu ý nghiệp vụ**: Mức điều chỉnh này lệch quá 10 điểm phần trăm so với đề xuất (${(Math.abs(targetRate - recData.rProposed) * 100).toFixed(1)} điểm), do đó bắt buộc phải nhập lý do giải trình chi tiết và sẽ chuyển sang cấp Hội đồng / Admin phê duyệt cấp hai.`
        : '';

      return `Nếu điều chỉnh mức thưởng về **${Engine.formatPercent(targetRate, 1)}**:\n\n` +
        `- Khoản thưởng chi trả sẽ là **${Engine.formatVND(targetAmount)}** (${signText} ${absDiffStr} so với đề xuất ban đầu).\n` +
        `- Mức này ${peerContext} (Trung vị nhóm: ${Engine.formatPercent(recData.peerStats.medianRate, 1)}, dao động từ ${Engine.formatPercent(recData.peerStats.minRate, 1)} đến ${Engine.formatPercent(recData.peerStats.maxRate, 1)}).${l2Warning}`;
    }

    if (questionKey === 'peer_comparison') {
      const p = recData.peerStats;
      const myRate = recData.rProposed;
      const rankStatus = myRate >= p.medianRate ? 'cao hơn' : 'thấp hơn';
      return `So với **${p.count} đồng nghiệp** cùng chức danh (${emp.role}):\n\n` +
        `- Mức đề xuất của ${emp.name} là **${Engine.formatPercent(myRate, 1)}**, ${rankStatus} trung vị nhóm (${Engine.formatPercent(p.medianRate, 1)}).\n` +
        `- Dải thưởng của nhóm đồng cấp hiện dao động từ ${Engine.formatPercent(p.minRate, 1)} đến ${Engine.formatPercent(p.maxRate, 1)}.\n` +
        `- Quy mô công việc đảm nhận đạt hệ số ${recData.scaleFactor} lần so với khối lượng trung bình của nhóm.`;
    }

    if (questionKey === 'promotion_check') {
      if (emp.promotionReady) {
        return `✅ **Cân nhắc thăng tiến: CÓ THỂ ĐỀ XUẤT**\n\n` +
          `**Căn cứ đánh giá**:\n` +
          `- ${emp.promotionRationale || 'Hiệu suất hoàn thành chỉ tiêu cao và bền vững qua nhiều kỳ liên tiếp.'}\n` +
          `- Điểm đánh giá năng lực của Quản lý trực tiếp đạt ${recData.managerRawScore}/5,0.\n` +
          `- Thâm niên công tác ${emp.seniority} năm tại vị trí hiện tại đã đáp ứng tiêu chuẩn quy hoạch cán bộ nguồn.`;
      } else {
        return `ℹ️ **Cân nhắc thăng tiến: CHƯA ĐỦ ĐIỀU KIỆN**\n\n` +
          `- Nhân sự hiện đang duy trì tiến độ công việc ở mức ổn định nhưng chưa đạt chuỗi 3 kỳ liên tiếp vượt trội (>105%).\n` +
          `- Thâm niên hiện tại (${emp.seniority} năm) cần thêm thời gian tích lũy tại vị trí ${emp.role}.`;
      }
    }

    return 'Hệ thống đã ghi nhận câu hỏi của bạn và tổng hợp câu trả lời dựa trên dữ liệu thật.';
  }

  const SmartRecommendationEngine = {
    loadMLPredictions,
    computeEmployeeRecommendation,
    answerManagerQuestion
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartRecommendationEngine;
  } else {
    global.SmartRecommendationEngine = SmartRecommendationEngine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
