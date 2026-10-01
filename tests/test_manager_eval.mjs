import assert from 'node:assert/strict';
import Evaluation from '../DEMO/js/manager-evaluation.js';

console.log('=== KIỂM THỬ ĐÁNH GIÁ QUẢN LÝ & CALIBRATION ===\n');
const invalid = Evaluation.validateEvaluation({ employee_id: 'EMP-1', manager_id: 'MGR-1', period: '2026-Q3', scores: { quality: 4.5, collaboration: 4, initiative: 4, objectiveDifficulty: 4 }, comment: 'ngắn' });
assert.equal(invalid.valid, false, 'Điểm cực thiếu nhận xét bị chặn');
const evaluations = Array.from({ length: 5 }, (_, i) => ({ manager_id: 'MGR-1', department: 'A', period: '2026-Q2', status: 'submitted', scores: { quality: 4, collaboration: 4, initiative: 4, objectiveDifficulty: 4 } }));
const normalized = Evaluation.normalizeManagerDelta('MGR-1', .08, evaluations, 'A');
assert.equal(normalized.source, 'department_fallback', 'Ít hơn 20 mẫu dùng chuẩn hóa phòng ban');
const high = Array.from({ length: 25 }, () => ({ manager_id: 'MGR-2', department: 'A', period: '2026-Q3', status: 'submitted', scores: { quality: 5, collaboration: 5, initiative: 5, objectiveDifficulty: 5 } }));
const flag = Evaluation.flagCalibrationRisk('A', '2026-Q3', high);
assert.equal(flag.flag, true, 'Phòng được chấm cao đồng loạt bị gắn cờ');
console.log('✔ Validate, fallback và calibration flag hoạt động đúng.');
