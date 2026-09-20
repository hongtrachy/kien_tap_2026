/**
 * UNIT TEST SUITE CHO HỆ THỐNG PHÂN QUYỀN (AUTH & PERMISSION TESTS)
 */

import AppAuth from '../DEMO/js/auth.js';
import BenchmarkDataset from '../DEMO/js/dataset.js';

console.log('=== KIỂM THỬ HỆ THỐNG PHÂN QUYỀN MÔ PHỎNG (TEST AUTH) ===\n');

let allPassed = true;
function assert(condition, msg) {
  if (condition) console.log(`✔ ${msg}`);
  else { console.error(`✖ FAILED: ${msg}`); allPassed = false; }
}

const employees = BenchmarkDataset.generateBenchmarkDataset();

// 1. Kiểm tra quyền Nhân viên
const empUser = AppAuth.SAMPLE_ACCOUNTS.employee;
assert(AppAuth.checkRoutePermission('overview', empUser) === false, 'Nhân viên bị chặn truy cập Tổng quan toàn công ty');
assert(AppAuth.checkRoutePermission('recommendation', empUser) === false, 'Nhân viên bị chặn truy cập Đề xuất thưởng quản lý');
assert(AppAuth.checkRoutePermission('my-slip', empUser) === true, 'Nhân viên được phép truy cập Phiếu thưởng của mình');

const empFiltered = AppAuth.filterEmployeesByPermission(employees, empUser);
assert(empFiltered.length === 1 && empFiltered[0].id === 'EMP-002', `Nhân viên chỉ thấy duy nhất 1 hồ sơ của mình: ${empFiltered.length}`);

// 2. Kiểm tra quyền Quản lý (Trần Minh Đức - KD Miền Nam)
const mgrUser = AppAuth.SAMPLE_ACCOUNTS.manager;
assert(AppAuth.checkRoutePermission('recommendation', mgrUser) === true, 'Quản lý được phép vào màn hình Đề xuất thưởng');
assert(AppAuth.checkRoutePermission('payroll', mgrUser) === false, 'Quản lý không có quyền xuất chi trả tài chính (Payroll)');

const mgrFiltered = AppAuth.filterEmployeesByPermission(employees, mgrUser);
const isAllSameDept = mgrFiltered.every(e => e.department === 'Kinh doanh Miền Nam');
assert(mgrFiltered.length > 0 && isAllSameDept, `Quản lý chỉ thấy nhân viên phòng Kinh doanh Miền Nam: ${mgrFiltered.length} người`);

// 3. Kiểm tra quyền Admin
const adminUser = AppAuth.SAMPLE_ACCOUNTS.admin;
assert(AppAuth.checkRoutePermission('payroll', adminUser) === true, 'Admin có toàn quyền xuất chi trả');
const adminFiltered = AppAuth.filterEmployeesByPermission(employees, adminUser);
assert(adminFiltered.length === 120, `Admin thấy toàn bộ 120 nhân viên công ty: ${adminFiltered.length}`);

if (!allPassed) process.exit(1);
console.log('\n=== TẤT CẢ KIỂM THỬ PHÂN QUYỀN ĐÃ QUA! ===');
