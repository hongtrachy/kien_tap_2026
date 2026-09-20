/**
 * DỮ LIỆU TIẾN ĐỘ THEO NGÀY (DAILY WORKDAY SIMULATOR)
 * Nền tảng Quản lý & Đề xuất Thưởng Thông minh
 * Sinh dữ liệu lũy kế 22 ngày làm việc trong tháng có seed cố định
 * RÀNG BUỘC SỐ HỌC: Tổng đến ngày 22 luôn khớp 100% với số liệu tháng của nhân viên!
 * Ghi chú minh bạch: "Dữ liệu ngày là mô phỏng phân bổ có kiểm soát phục vụ dự phóng tiến độ"
 */

(function (global) {
  'use strict';

  // PRNG với seed riêng cho dữ liệu ngày
  function createRandom(seed = 987654321) {
    let s = seed;
    return function () {
      s ^= s << 13;
      s ^= s >> 17;
      s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  }

  const TOTAL_WORKDAYS = 22; // 22 ngày làm việc tiêu chuẩn trong tháng

  /**
   * Sinh chuỗi tiến độ lũy kế 22 ngày làm việc cho một nhân viên
   * @param {object} emp - Thông tin nhân viên
   * @returns {Array} Mảng 22 ngày { day, cumulativeActual, cumulativeTarget, dailyActual, dailyTarget }
   */
  function generateEmployeeDailySeries(emp) {
    // Sử dụng seed dựa trên mã nhân viên
    let empSeed = 1000;
    if (emp && emp.id) {
      const numPart = parseInt(emp.id.replace(/\D/g, ''), 10) || 1;
      empSeed += numPart * 179;
    }
    const rand = createRandom(empSeed);

    const totalActual = Number(emp.actual) || 0;
    const totalTarget = Number(emp.target) || 0;

    // Sinh 22 trọng số ngày ngẫu nhiên
    const weights = [];
    let sumWeight = 0;
    for (let d = 1; d <= TOTAL_WORKDAYS; d++) {
      // Đầu tháng và giữa tháng tiến độ vừa phải, cuối tháng tăng tốc nhẹ
      const periodBoost = d >= 18 ? 1.25 : (d <= 5 ? 0.85 : 1.0);
      const w = (0.7 + rand() * 0.6) * periodBoost;
      weights.push(w);
      sumWeight += w;
    }

    const series = [];
    let cumActual = 0;
    let cumTarget = 0;

    for (let d = 1; d <= TOTAL_WORKDAYS; d++) {
      const fraction = weights[d - 1] / sumWeight;
      const dayTarget = Math.round((totalTarget / TOTAL_WORKDAYS) * 10) / 10;
      cumTarget = (d === TOTAL_WORKDAYS) ? totalTarget : Math.round(cumTarget + dayTarget);

      let dayActual = Math.round(totalActual * fraction * 10) / 10;
      if (d === TOTAL_WORKDAYS) {
        // Bảo đảm ngày 22 khớp chính xác 100% với totalActual
        dayActual = totalActual - cumActual;
        cumActual = totalActual;
      } else {
        cumActual += dayActual;
      }

      series.push({
        day: d,
        dateString: `${String(d).padStart(2, '0')}/09/2026`,
        dailyActual: Math.round(dayActual * 10) / 10,
        dailyTarget: dayTarget,
        cumulativeActual: Math.round(cumActual * 10) / 10,
        cumulativeTarget: cumTarget,
        rateToDate: cumTarget > 0 ? (cumActual / cumTarget) : 0
      });
    }

    return series;
  }

  /**
   * Lấy số liệu tiến độ của nhân viên tính đến ngày làm việc được chọn
   * @param {object} emp - Nhân viên
   * @param {number} asOfDay - Ngày làm việc chọn (1 đến 22)
   */
  function getEmployeeProgressAsOf(emp, asOfDay = 15) {
    const clampedDay = Math.max(1, Math.min(TOTAL_WORKDAYS, Number(asOfDay) || 15));
    const series = generateEmployeeDailySeries(emp);
    const dayRecord = series[clampedDay - 1];

    const timeRatio = clampedDay / TOTAL_WORKDAYS;
    const rateToDate = dayRecord.rateToDate;
    const velocity = timeRatio > 0 ? (rateToDate / timeRatio) : 1.0;

    // Dự phóng hoàn thành khi kết thúc kỳ nếu duy trì tốc độ hiện tại
    const projectedRate = Math.min(1.5, rateToDate + (1 - timeRatio) * velocity * 0.95);

    return {
      asOfDay: clampedDay,
      totalDays: TOTAL_WORKDAYS,
      timeElapsedPercent: Math.round(timeRatio * 1000) / 10,
      actualToDate: dayRecord.cumulativeActual,
      targetToDate: dayRecord.cumulativeTarget,
      rateToDate: Math.round(rateToDate * 1000) / 1000,
      velocity: Math.round(velocity * 100) / 100,
      projectedFinalRate: Math.round(projectedRate * 1000) / 1000,
      isAheadOfTime: velocity >= 1.0,
      daySeries: series
    };
  }

  const DailyDataSimulator = {
    TOTAL_WORKDAYS,
    generateEmployeeDailySeries,
    getEmployeeProgressAsOf
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DailyDataSimulator;
  } else {
    global.DailyDataSimulator = DailyDataSimulator;
  }
})(typeof window !== 'undefined' ? window : globalThis);
