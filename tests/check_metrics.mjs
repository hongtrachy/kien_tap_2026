import IncentiveEngine from '../DEMO/js/engine.js';
import BenchmarkDataset from '../DEMO/js/dataset.js';

const emps = BenchmarkDataset.generateBenchmarkDataset();
const metrics = IncentiveEngine.calculateBusinessMetrics({
  employees: emps,
  budget: 1750000000,
  workdaysElapsed: 15,
  totalWorkdays: 22
});

console.log('--- KIỂM TRA CHỈ SỐ DASHBOARD ---');
console.log('Tỷ lệ đạt có trọng số:', IncentiveEngine.formatPercent(metrics.avgWeightedRate, 1));
console.log('Tổng thưởng tạm tính:', IncentiveEngine.formatVND(metrics.totalIncentive));
console.log('Tỷ lệ sử dụng quỹ:', IncentiveEngine.formatPercent(metrics.budgetUsageRate, 1));
console.log('Tiến độ thời gian:', IncentiveEngine.formatPercent(metrics.progressVsTime, 1));
