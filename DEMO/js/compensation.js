/* Thư viện thành phần thưởng: version theo kỳ, kiểm soát tập trung. */
(function (global) {
  'use strict';
  const DEFAULT_LIMITS = { RULE_BASED: { min: .3, max: 1 }, ML_PREDICTION: { min: 0, max: .4 }, MANAGER_EVAL: { min: 0, max: .35 }, KPI_REVENUE: { min: 0, max: .6 } };
  let plans = [], limits = DEFAULT_LIMITS;
  const index = p => { const s = String(p || ''); const y = +(s.match(/20\d{2}/) || [])[0]; const q = +(s.match(/Q([1-4])/i) || [])[1]; return y && q ? y * 4 + q : -1; };
  const round = n => Math.round(n * 10000) / 10000;
  const sourceRegistry = {
    RULE_BASED: { label: 'Theo quy chế công ty', compute(e) { const c = global.IncentiveEngine.calculateWeightedRate(e.tasks); const rate = global.IncentiveEngine.calculatePayoutFactor(c.weightedRate || (+e.actual / (+e.target || 1))); return { rate, explanation: `Tỷ lệ đạt có trọng số ${(c.weightedRate * 100).toFixed(1)}% qua đường cong chi trả.` }; } },
    ML_PREDICTION: { label: 'Dự báo học máy', compute(e, p, ctx = {}) { const d = ctx.mlPredictions?.[e.id]; const rate = +(d?.rML ?? ctx.rML ?? e.rML ?? 1); return { rate, explanation: `Dự báo ${Math.round(rate * 100)}% từ dữ liệu lịch sử.` }; } },
    MANAGER_EVAL: { label: 'Đánh giá của quản lý', compute(e) { const n = global.IncentiveEngine.normalizeManagerEvaluation(e.managerEval || {}); const rate = Number.isFinite(e.managerEval?.normalizedDelta) ? e.managerEval.normalizedDelta : n.deltaManager; return { rate, isDelta: true, explanation: `Điểm chấm ${n.rawScore}/5 sau chuẩn hóa z-score.` }; } },
    KPI_REVENUE: { label: 'KPI doanh số', compute(e) { const ts = (e.tasks || []).filter(t => t.benefitType === 'doanh_thu'); const target = ts.reduce((s, t) => s + (+t.target || 0), 0) || 1; const actual = ts.reduce((s, t) => s + (+t.actual || 0), 0); return { rate: Math.min(1.5, actual / target), explanation: `Doanh số thực tế ${actual}M / chỉ tiêu ${target}M.` }; } }
  };
  function validateCompPlan(plan, sourceLimits = limits) {
    const errors = [], sources = plan?.sources || [];
    if (!plan?.department) errors.push('Thiếu tên phòng ban.');
    if (sources.length < 2 || sources.length > 4) errors.push('Cần chọn từ 2 đến 4 nguồn thành phần.');
    const seen = new Set();
    let totalWeight = 0;
    sources.forEach(s => {
      const w = +s.weight;
      const lim = sourceLimits[s.type];
      if (!sourceRegistry[s.type] || !lim) errors.push(`Loại nguồn không hợp lệ: ${s.type}`);
      if (seen.has(s.type)) errors.push(`Nguồn ${s.type} bị lặp lại.`);
      seen.add(s.type);
      if (!Number.isFinite(w) || w <= 0) errors.push(`Trọng số ${s.type} phải lớn hơn 0.`);
      totalWeight += w;
      if (lim && (w < lim.min || w > lim.max)) {
        errors.push(`${sourceRegistry[s.type]?.label || s.type} vượt giới hạn cho phép (${Math.round(lim.min * 100)}%–${Math.round(lim.max * 100)}%).`);
      }
    });
    if (Math.abs(totalWeight - 1) > 0.001) {
      errors.push(`Tổng trọng số các nguồn phải bằng 100%, hiện là ${(totalWeight * 100).toFixed(1)}%.`);
    }
    return { valid: !errors.length, errors };
  }
  function getPlanForPeriod(department, period) { const at = index(period); return plans.filter(p => p.department === department && ['active', 'archived'].includes(p.status) && index(p.effective_from) <= at).sort((a,b) => index(b.effective_from) - index(a.effective_from) || b.version - a.version)[0] || null; }
  function calculateRate(employee, period, plan, context = {}) { const active = plan || getPlanForPeriod(employee.department, period); const check = validateCompPlan(active); if (!active || !check.valid) return { rate: 0, breakdown: [], error: check.errors?.join(' ') || 'Chưa có cấu hình.' }; let base = 0, delta = 0; const breakdown = active.sources.map(s => { const r = sourceRegistry[s.type].compute(employee, period, context); const contribution = s.weight * r.rate; if (r.isDelta) delta += contribution; else base += contribution; return { type:s.type, label:sourceRegistry[s.type].label, weight:s.weight, rate:round(r.rate), contribution:round(contribution), explanation:r.explanation, isDelta:!!r.isDelta }; }); const rule = breakdown.find(x => x.type === 'RULE_BASED')?.rate || 0; const rate = Math.max(0, Math.min(1.5, Math.max(rule - .2, Math.min(rule + .2, base + delta)))); return { rate:round(rate), breakdown, plan:active, rBase:round(base), managerDelta:round(delta) }; }
  function addPlanVersion(plan, actor = 'admin') { if (actor !== 'admin') return { valid:false, errors:['Chỉ Admin được tạo cấu hình.'] }; const c = validateCompPlan(plan); if (!c.valid) return c; const version = Math.max(0, ...plans.filter(p => p.department === plan.department).map(p => +p.version || 0)) + 1; const record = { ...plan, version, status:'DRAFT', created_by:actor }; plans.push(record); return { valid:true, plan:record }; }
  function submitPlan(dept, version, actor = 'admin') { const p = plans.find(x => x.department === dept && +x.version === +version); if (actor !== 'admin' || !p || p.status !== 'DRAFT') return { valid:false, errors:['Không có quyền hoặc cấu hình không ở trạng thái nháp.'] }; p.status='PENDING_APPROVAL'; return { valid:true, plan:p }; }
  function approvePlan(dept, version, actor = 'admin') { const p = plans.find(x => x.department === dept && +x.version === +version); if (actor !== 'admin' || !p || p.status !== 'PENDING_APPROVAL') return { valid:false, errors:['Không có quyền hoặc không tìm thấy cấu hình chờ duyệt.'] }; plans.filter(x => x.department === dept && x.status === 'active').forEach(x => x.status='archived'); p.status='active'; p.approved_by=actor; return { valid:true, plan:p }; }
  async function loadPlans() { try { const [p,l] = await Promise.all([fetch('data/department_comp_plans.json').then(r=>r.json()), fetch('data/source_limits.json').then(r=>r.json())]); plans=p; limits=l; } catch (_) {} return plans; }
  const api = { sourceRegistry, validateCompPlan, getPlanForPeriod, calculateRate, addPlanVersion, submitPlan, approvePlan, loadPlans, setPlans:v=>plans=v||[], getPlans:()=>plans, setLimits:v=>limits=v||DEFAULT_LIMITS, getLimits:()=>limits, periodIndex:index };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else global.CompensationPlans = api;
})(typeof window !== 'undefined' ? window : globalThis);
