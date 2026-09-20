/**
 * UNIT TEST SUITE V2: KIỂM THỬ CÁC HÀM MỚI TRONG INCENTIVE ENGINE V2
 * Kiểm thử:
 * 1. calculateWeightedRate (tính tỷ lệ có trọng số theo quy mô và độ phức tạp)
 * 2. calculateScaleFactor (hệ số quy mô [0.85, 1.20])
 * 3. normalizeManagerEvaluation (chuẩn hóa z-score của quản lý sang [-15%, +15%])
 * 4. calculateSmartRecommendation (kết hợp 3 nguồn, dải linh động ±20%)
 * 5. checkBudgetConstraint (kiểm tra vượt quỹ và hệ số co giãn)
 */

import IncentiveEngine from '../DEMO/js/engine.js';

console.log('=== RUNNING UNIT TESTS FOR INCENTIVE ENGINE V2 ===\n');

let allPassed = true;

function assert(condition, message) {
  if (condition) {
    console.log(`✔ ${message}`);
  } else {
    console.error(`✖ FAILED: ${message}`);
    allPassed = false;
  }
}

// 1. Kiểm thử calculateWeightedRate
const sampleTasks = [
  { id: 'T1', target: 300, actual: 360, packageValue: 300, complexityFactor: 1.2, difficultyFactor: 1.0 }, // Rate 1.2, w = 360
  { id: 'T2', target: 500, actual: 500, packageValue: 500, complexityFactor: 1.0, difficultyFactor: 1.0 }  // Rate 1.0, w = 500
];
// w1 = 360, w2 = 500, totalW = 860
// w1*rate1 = 360 * 1.2 = 432
// w2*rate2 = 500 * 1.0 = 500
// sum(w*rate) = 932
// weightedRate = 932 / 860 = 1.08372...
const resWeighted = IncentiveEngine.calculateWeightedRate(sampleTasks);
assert(Math.abs(resWeighted.weightedRate - 1.08372) < 0.001, `Weighted Rate tính đúng: ${resWeighted.weightedRate} (~1.0837)`);
assert(resWeighted.totalWeight === 860, `Total Weight tính đúng: ${resWeighted.totalWeight} (kỳ vọng 860)`);

// 2. Kiểm thử calculateScaleFactor
const scale1 = IncentiveEngine.calculateScaleFactor(1000, 1000); // sqrt(1) = 1.0
assert(scale1 === 1.0, `Scale factor chuẩn = 1.0: ${scale1}`);

const scaleHigh = IncentiveEngine.calculateScaleFactor(2500, 1000); // sqrt(2.5) = 1.58 -> kẹp 1.20
assert(scaleHigh === 1.20, `Scale factor kẹp trần 1.20: ${scaleHigh}`);

const scaleLow = IncentiveEngine.calculateScaleFactor(400, 1000); // sqrt(0.4) = 0.632 -> kẹp 0.85
assert(scaleLow === 0.85, `Scale factor kẹp sàn 0.85: ${scaleLow}`);

// 3. Kiểm thử normalizeManagerEvaluation
const evalNormal = IncentiveEngine.normalizeManagerEvaluation(
  { quality: 4.5, collaboration: 4.0, initiative: 4.0, objectiveDifficulty: 3.5 },
  { mean: 3.5, stdDev: 0.5 }
);
// rawScore = 4.5*0.3 + 4*0.25 + 4*0.25 + 3.5*0.2 = 1.35 + 1.0 + 1.0 + 0.7 = 4.05
// zScore = (4.05 - 3.5) / 0.5 = 1.1
// delta = 1.1 * 0.075 = +0.0825 (+8.25%)
assert(evalNormal.deltaManager > 0 && evalNormal.deltaManager <= 0.15, `Manager Delta trong khoảng dương hợp lệ: ${evalNormal.deltaManager}`);

// 4. Kiểm thử calculateSmartRecommendation
const recTest = IncentiveEngine.calculateSmartRecommendation({
  rRule: 1.00,
  rML: 1.10,
  deltaManager: 0.05,
  flexBand: 0.20
});
// rBase = 0.7*1.0 + 0.3*1.1 = 0.7 + 0.33 = 1.03
// rProposed = 1.03 + 0.05 = 1.08
// flexBand = [0.80, 1.20] -> 1.08 hợp lệ
assert(recTest.rProposed === 1.08, `Smart Recommendation kết hợp chính xác: ${recTest.rProposed} (kỳ vọng 1.08)`);
assert(recTest.isClampedByFlexBand === false, 'Không bị kẹp bởi Flex Band');

// Kiểm tra khi vượt quá flex band
const recExceed = IncentiveEngine.calculateSmartRecommendation({
  rRule: 0.80,
  rML: 1.30,
  deltaManager: 0.15,
  flexBand: 0.20
});
// rBase = 0.7*0.8 + 0.3*1.3 = 0.56 + 0.39 = 0.95
// rProposed thô = 0.95 + 0.15 = 1.10
// flexBand quanh rRule 0.80 là [0.60, 1.00] -> Bị kẹp về 1.00
assert(recExceed.rProposed === 1.00, `Smart Recommendation bị kẹp về cận trên Flex Band: ${recExceed.rProposed} (kỳ vọng 1.00)`);
assert(recExceed.isClampedByFlexBand === true, 'Cờ kẹp Flex Band được kích hoạt đúng');

// 5. Kiểm thử checkBudgetConstraint
const mockEmployees = [
  { finalIncentive: 1000000000 },
  { finalIncentive: 1000000000 }
]; // Tổng 2 tỷ vs Budget 1.75 tỷ
const budgetCheck = IncentiveEngine.checkBudgetConstraint(mockEmployees, 1750000000);
assert(budgetCheck.isOverBudget === true, 'Phát hiện vượt ngân sách quỹ');
assert(budgetCheck.scalingFactor === 0.875, `Hệ số co giãn đúng: ${budgetCheck.scalingFactor} (1.75 / 2.0 = 0.875)`);

if (!allPassed) {
  process.exit(1);
} else {
  console.log('\n=== ALL V2 TESTS PASSED SUCCESSFULLY! ===');
}
