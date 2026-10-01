import assert from 'node:assert/strict';
import Resolver from '../DEMO/js/expectation-resolver.js';

console.log('=== KIỂM THỬ XỬ LÝ CHÊNH LỆCH KỲ VỌNG ===\n');
const fund = { total_budget: 1000000, used: 0 };
const claim = { employee_id: 'E1', system_proposed_amount: 10000000, employee_expected_amount: 15000000, evidence: [] };
const employee = { id: 'E1', department: 'A', level: 2 };
const result = Resolver.resolveExpectationGap(claim, employee, [{ id: 'E2', department: 'A', level: 2, incentiveAmount: 9000000 }], fund, 'M1');
assert.equal(result.final_amount, 10000000, 'Không tự thêm quỹ giữ chân khi chưa có phê duyệt Admin');
const overCap = Resolver.validateRetentionAllocation({ amount: 1600001, justification: 'Lý do giữ chân đủ dài để kiểm tra hợp lệ.', approved_by: 'admin' }, { total_budget: 5000000, used: 0 }, 10000000);
assert.equal(overCap.valid, false, 'Từ chối khoản vượt trần 15%');
const overBudget = Resolver.validateRetentionAllocation({ amount: 900000, justification: 'Lý do giữ chân đủ dài để kiểm tra hợp lệ.', approved_by: 'admin' }, { total_budget: 500000, used: 0 }, 10000000);
assert.equal(overBudget.valid, false, 'Từ chối khoản vượt số dư quỹ');
const frequency = Resolver.managerTopupFrequency('M1', [], [{ manager_id: 'M1' }, { manager_id: 'M1' }], Array.from({ length: 5 }, () => ({ manager_id: 'M1' })));
assert.equal(frequency.flag, true, 'Cảnh báo khi tần suất dùng quỹ vượt 30%');
console.log('✔ Resolver, trần quỹ và cảnh báo tần suất hoạt động đúng.');
