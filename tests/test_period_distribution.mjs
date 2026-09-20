import { createRequire } from 'module';
import assert from 'assert';

const require = createRequire(import.meta.url);
const BenchmarkDataset = require('../DEMO/js/dataset.js');
const IncentiveEngine = require('../DEMO/js/engine.js');

console.log('=== KIỂM THỬ CHUYỂN KỲ & PHÂN BỔ BẬC THƯỞNG (TEST PERIOD SWITCH & DISTRIBUTION) ===\n');

const employees = BenchmarkDataset.generateBenchmarkDataset();
assert.strictEqual(employees.length, 120, 'Phải có đúng 120 nhân viên');

function getActiveEmployees(periodKey, allEmployees) {
  if (!periodKey || periodKey === 'Q3_2026') {
    return allEmployees;
  }
  const targetQuarter = periodKey.replace('_', '/');
  return allEmployees.map(emp => {
    const h = (emp.history || []).find(item => item.period === targetQuarter);
    if (!h) return emp;
    const targetVal = emp.target || 800;
    const actualVal = Math.round(targetVal * h.weightedRate);
    return {
      ...emp,
      period: targetQuarter,
      target: targetVal,
      actual: actualVal,
      difficultyFactor: 1.0,
      achievementRate: h.weightedRate,
      weightedRate: h.weightedRate,
      payoutFactor: h.payoutFactor,
      incentiveAmount: h.incentive,
      finalIncentive: h.incentive,
      status: 'APPROVED',
      validationStatus: 'VALID'
    };
  });
}

// 1. Kiểm tra chuyển kỳ Q3 -> Q2 -> Q1
const q3Emps = getActiveEmployees('Q3_2026', employees);
const q2Emps = getActiveEmployees('Q2_2026', employees);
const q1Emps = getActiveEmployees('Q1_2026', employees);

const mQ3 = IncentiveEngine.calculateBusinessMetrics({ employees: q3Emps });
const mQ2 = IncentiveEngine.calculateBusinessMetrics({ employees: q2Emps });
const mQ1 = IncentiveEngine.calculateBusinessMetrics({ employees: q1Emps });

console.log(`✔ Kỳ Q3/2026: Tỷ lệ đạt = ${IncentiveEngine.formatPercent(mQ3.avgWeightedRate, 1)}, Tổng thưởng = ${IncentiveEngine.formatVND(mQ3.totalIncentive)}`);
console.log(`✔ Kỳ Q2/2026: Tỷ lệ đạt = ${IncentiveEngine.formatPercent(mQ2.avgWeightedRate, 1)}, Tổng thưởng = ${IncentiveEngine.formatVND(mQ2.totalIncentive)}`);
console.log(`✔ Kỳ Q1/2026: Tỷ lệ đạt = ${IncentiveEngine.formatPercent(mQ1.avgWeightedRate, 1)}, Tổng thưởng = ${IncentiveEngine.formatVND(mQ1.totalIncentive)}`);

assert.notStrictEqual(mQ3.totalIncentive, mQ2.totalIncentive, 'Số liệu tổng thưởng kỳ Q3 và Q2 phải khác nhau');
assert.notStrictEqual(mQ2.totalIncentive, mQ1.totalIncentive, 'Số liệu tổng thưởng kỳ Q2 và Q1 phải khác nhau');

// 2. Kiểm tra phân bổ bậc thưởng 4 tầng
let underFloor = 0;
let partial = 0;
let target = 0;
let cap = 0;

q3Emps.forEach(emp => {
  const t = (emp.target || 1) * (emp.difficultyFactor || 1.0);
  const rate = emp.achievementRate || (t > 0 ? (emp.actual / t) : 0);
  if (rate < 0.70) underFloor++;
  else if (rate < 1.00) partial++;
  else if (rate < 1.20) target++;
  else cap++;
});

console.log(`✔ Phân bổ bậc thưởng Q3: Dưới sàn = ${underFloor}, Đạt một phần = ${partial}, Đạt chuẩn = ${target}, Chạm trần = ${cap}`);
assert.strictEqual(underFloor + partial + target + cap, 120, 'Tổng số lượng nhân sự trong 4 bậc phải đúng 120');

console.log('\n=== TẤT CẢ KIỂM THỬ CHUYỂN KỲ & PHÂN BỔ BẬC THƯỞNG ĐÃ QUA THÀNH CÔNG! ===');
