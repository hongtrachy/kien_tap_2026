import assert from 'node:assert/strict';
import IncentiveEngine from '../DEMO/js/engine.js';

console.log('=== RUNNING UNIT TESTS FOR INCENTIVE ENGINE ===');

const TARGET_BONUS = 20000000; // 20 triệu VNĐ

// 1. Kiểm tra trường hợp An
// An: Target 800, Actual 920 -> 115.0% -> Hệ số 1.375 -> Thưởng 27.5 triệu
const anResult = IncentiveEngine.calculateEmployeeIncentive({
  target: 800,
  actual: 920,
  difficultyFactor: 1.0,
  targetIncentive: TARGET_BONUS
});
assert.equal(anResult.achievementRate, 1.15, 'An achievement rate must be exactly 115.0%');
assert.equal(anResult.payoutFactor, 1.375, 'An payout factor must be 1.375');
assert.equal(anResult.incentiveAmount, 27500000, 'An incentive amount must be 27,500,000 VND');
console.log('✔ Test Case 1 Passed: An - Target 800, Actual 920 -> 115% -> Factor 1.375 -> 27.5M VND');

// 2. Kiểm tra trường hợp Bình
// Bình: Target 1000, Actual 850
// Tính thô: 85% -> Hệ số 0.500 -> 10 triệu
const binhRaw = IncentiveEngine.calculateEmployeeIncentive({
  target: 1000,
  actual: 850,
  difficultyFactor: 1.0,
  targetIncentive: TARGET_BONUS
});
assert.equal(binhRaw.achievementRate, 0.85, 'Bình raw achievement rate must be 85.0%');
assert.equal(binhRaw.payoutFactor, 0.50, 'Bình raw payout factor must be 0.500');
assert.equal(binhRaw.incentiveAmount, 10000000, 'Bình raw incentive must be 10,000,000 VND');

// Sau hiệu chỉnh độ khó 0.9 (Target hiệu chỉnh 900)
// Rate = 850 / 900 = 0.944444... (94.4%)
// Factor = (850/900 - 0.70) / 0.30 = 0.8148148... (~0.815)
// Thưởng = 20M * 0.8148148... = 16,296,296 VND (~16.3M)
const binhAdjusted = IncentiveEngine.calculateEmployeeIncentive({
  target: 1000,
  actual: 850,
  difficultyFactor: 0.9,
  targetIncentive: TARGET_BONUS
});
assert.equal(binhAdjusted.adjustedTarget, 900, 'Bình adjusted target must be 900');
assert.ok(Math.abs(binhAdjusted.achievementRate - 0.9444444) < 1e-4, 'Bình adjusted rate must be ~94.4%');
assert.ok(Math.abs(binhAdjusted.payoutFactor - 0.8148148) < 1e-4, 'Bình payout factor must be ~0.815');
assert.ok(Math.abs(binhAdjusted.incentiveAmount - 16296300) <= 50, 'Bình incentive must be ~16.3M (16,296,300 VND)');
console.log('✔ Test Case 2 Passed: Bình - Raw 10.0M -> Adjusted (Factor 0.9) -> 16.3M VND');

// 3. Kiểm tra trường hợp Chi
// Chi: Target 600, Actual 600 -> 100.0% -> Hệ số 1.000 -> Thưởng 20 triệu
const chiResult = IncentiveEngine.calculateEmployeeIncentive({
  target: 600,
  actual: 600,
  difficultyFactor: 1.0,
  targetIncentive: TARGET_BONUS
});
assert.equal(chiResult.achievementRate, 1.0, 'Chi achievement rate must be 100%');
assert.equal(chiResult.payoutFactor, 1.0, 'Chi payout factor must be 1.0');
assert.equal(chiResult.incentiveAmount, 20000000, 'Chi incentive must be 20,000,000 VND');
console.log('✔ Test Case 3 Passed: Chi - Target 600, Actual 600 -> 100% -> Factor 1.0 -> 20.0M VND');

// 4. Kiểm tra trường hợp Dũng
// Dũng: Target 900, Actual ghi nhận 990 (tính thô) -> 110% -> Hệ số 1.25 -> 25 triệu
const dungRaw = IncentiveEngine.calculateEmployeeIncentive({
  target: 900,
  actual: 990,
  difficultyFactor: 1.0,
  targetIncentive: TARGET_BONUS
});
assert.equal(dungRaw.achievementRate, 1.10, 'Dũng raw rate must be 110%');
assert.equal(dungRaw.payoutFactor, 1.25, 'Dũng raw factor must be 1.25');
assert.equal(dungRaw.incentiveAmount, 25000000, 'Dũng raw incentive must be 25,000,000 VND');

// Sau khi gỡ trùng hợp đồng 90M -> Actual 900 -> 100% -> 20 triệu
const dungClean = IncentiveEngine.calculateEmployeeIncentive({
  target: 900,
  actual: 900,
  difficultyFactor: 1.0,
  targetIncentive: TARGET_BONUS
});
assert.equal(dungClean.achievementRate, 1.0, 'Dũng clean rate must be 100%');
assert.equal(dungClean.payoutFactor, 1.0, 'Dũng clean factor must be 1.0');
assert.equal(dungClean.incentiveAmount, 20000000, 'Dũng clean incentive must be 20,000,000 VND');
console.log('✔ Test Case 4 Passed: Dũng - Raw 25.0M -> Deduplicated -> 20.0M VND');

// 5. Kiểm tra tổng ngân sách 4 người
const totalRaw = (anResult.incentiveAmount + binhRaw.incentiveAmount + chiResult.incentiveAmount + dungRaw.incentiveAmount) / 1000000;
const totalClean = (anResult.incentiveAmount + binhAdjusted.incentiveAmount + chiResult.incentiveAmount + dungClean.incentiveAmount) / 1000000;
assert.equal(totalRaw, 82.5, 'Total raw must be 82.5M');
assert.ok(Math.abs(totalClean - 83.8) < 0.05, 'Total clean must be ~83.8M');
console.log(`✔ Test Case 5 Passed: Total Raw = ${totalRaw}M VND, Total After Checks = ${totalClean.toFixed(1)}M VND (Budget 80M)`);

// 6. Kiểm tra ngưỡng sàn (< 70%) và trần (> 120%)
const belowFloor = IncentiveEngine.calculatePayoutFactor(0.699);
assert.equal(belowFloor, 0.0, 'Factor below 70% must be 0');

const atCap = IncentiveEngine.calculatePayoutFactor(1.20);
assert.equal(atCap, 1.5, 'Factor at 120% must be 1.5');

const aboveCap = IncentiveEngine.calculatePayoutFactor(1.50);
assert.equal(aboveCap, 1.5, 'Factor above 120% must be capped at 1.5');
console.log('✔ Test Case 6 Passed: Floor (<70% = 0) and Ceiling (>120% = 1.5) behave correctly');

console.log('=== ALL UNIT TESTS PASSED SUCCESSFULLY! ===');
