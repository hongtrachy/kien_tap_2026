/* Số hóa đánh giá quản lý, chuẩn hóa và cảnh báo calibration. */
(function (global) {
  'use strict';
  const MIN_SAMPLE_SIZE = 20;
  const round = n => Math.round(n * 10000) / 10000;
  const meanStd = values => { const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; const variance = values.length ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length : 0; return { mean, stdDev: Math.sqrt(variance) || 0.6 }; };
  function weightedScore(scores = {}) { return (Number(scores.quality) || 3) * .3 + (Number(scores.collaboration) || 3) * .25 + (Number(scores.initiative) || 3) * .25 + (Number(scores.objectiveDifficulty) || 3) * .2; }
  function validateEvaluation(evaluation) {
    const errors = []; const scores = evaluation && evaluation.scores || {};
    for (const key of ['quality', 'collaboration', 'initiative', 'objectiveDifficulty']) { const score = Number(scores[key]); if (!Number.isFinite(score) || score < 1 || score > 5) errors.push(`Điểm ${key} phải nằm trong khoảng 1–5.`); }
    const extreme = Object.values(scores).some(v => Number(v) <= 2 || Number(v) >= 4.5);
    if (extreme && String(evaluation.comment || '').trim().length < 20) errors.push('Điểm cực (≤2 hoặc ≥4,5) cần nhận xét tối thiểu 20 ký tự.');
    if (!evaluation || !evaluation.employee_id || !evaluation.manager_id || !evaluation.period) errors.push('Thiếu nhân viên, quản lý hoặc kỳ đánh giá.');
    return { valid: !errors.length, errors };
  }
  function getManagerRatingHistory(managerId, evaluations = []) { return evaluations.filter(e => e.manager_id === managerId && e.status === 'submitted').map(e => weightedScore(e.scores)); }
  function normalizeManagerDelta(managerId, rawDelta, evaluations = [], department) {
    const managerHistory = getManagerRatingHistory(managerId, evaluations);
    const reference = managerHistory.length >= MIN_SAMPLE_SIZE ? managerHistory : evaluations.filter(e => !department || e.department === department).map(e => weightedScore(e.scores));
    const stats = meanStd(reference.length ? reference : [3.5]);
    const rawScore = 3.5 + Number(rawDelta || 0) / .075 * .6;
    const z = (rawScore - stats.mean) / stats.stdDev;
    return { delta: round(Math.max(-.15, Math.min(.15, z * .075))), source: managerHistory.length >= MIN_SAMPLE_SIZE ? 'manager_history' : 'department_fallback', sampleSize: managerHistory.length };
  }
  function buildHistorySummary(employee) {
    const h = employee.history || []; const rates = h.map(x => Number(x.weightedRate) || 0); const payouts = h.map(x => Number(x.payoutFactor) || 0);
    const average = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const trend = rates.length > 1 ? (rates[rates.length - 1] - rates[0]) / (rates.length - 1) : 0;
    const m = average(rates); const volatility = rates.length ? Math.sqrt(average(rates.map(x => (x - m) ** 2))) : 0;
    return { employee_id: employee.id, hist_avg_rate: round(m), hist_rate_trend: round(trend), hist_volatility: round(volatility), hist_avg_payout: round(average(payouts)), last_5_periods: h.slice(-5).map(x => ({ period: x.period, rate: x.weightedRate })) };
  }
  function flagCalibrationRisk(department, period, evaluations = [], threshold = .10) {
    const relevant = evaluations.filter(e => e.department === department && e.period === period && e.status === 'submitted');
    const deltas = relevant.map(e => (weightedScore(e.scores) - 3.5) * .075 / .6);
    const avgDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    return { flag: avgDelta > threshold, avgDelta: round(avgDelta), reason: avgDelta > threshold ? 'Toàn phòng được chấm cao bất thường; cần HR xem xét trước khi khóa điểm.' : '', status: avgDelta > threshold ? 'CHO_HR_XEM_XET' : 'SAN_SANG_KHOA' };
  }
  const api = { MIN_SAMPLE_SIZE, weightedScore, validateEvaluation, getManagerRatingHistory, normalizeManagerDelta, buildHistorySummary, flagCalibrationRisk };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else global.ManagerEvaluation = api;
})(typeof window !== 'undefined' ? window : globalThis);
