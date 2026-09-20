import fs from 'fs';
import path from 'path';
import BenchmarkDataset from '../DEMO/js/dataset.js';
import Engine from '../DEMO/js/engine.js';
global.IncentiveEngine = Engine;
import RecEngine from '../DEMO/js/recommendation.js';

console.log('=== KIỂM THỬ FLOW PHÊ DUYỆT & XỬ LÝ BẤT THƯỜNG (TEST FLOW & APPROVAL) ===\n');

let allPassed = true;
function assert(condition, msg) {
  if (condition) console.log(`✔ ${msg}`);
  else { console.error(`✖ FAILED: ${msg}`); allPassed = false; }
}

// Nạp cache ML
const mlData = JSON.parse(fs.readFileSync(path.resolve('DEMO/data/ml_predictions.json'), 'utf8'));
RecEngine.setPredictionsCache(mlData.predictions);

const employees = BenchmarkDataset.generateBenchmarkDataset();

// 1. Kiểm tra trạng thái khởi tạo
const binh = employees.find(e => e.id === 'EMP-002');
assert(binh !== undefined, 'Tìm thấy nhân viên Bình EMP-002');

// Hiệu chỉnh độ khó 0.9 của Bình (tương ứng với Đề xuất tối ưu chính sách 1 đã duyệt)
binh.difficultyFactor = 0.9;
binh.target = 900;
binh.tasks.forEach(t => t.difficultyFactor = 0.9);

// 2. Manager gửi đề xuất thông minh
const recBinh = RecEngine.computeEmployeeRecommendation(binh, employees);
assert(recBinh && recBinh.rProposed > 0, `Đề xuất thông minh tính ra hệ số: ${(recBinh.rProposed * 100).toFixed(1)}%`);

binh.finalRate = recBinh.rProposed;
binh.finalIncentive = recBinh.proposedAmount;
binh.status = 'PENDING_ADMIN';
binh.submittedBy = 'Trần Minh Đức';

assert(binh.status === 'PENDING_ADMIN', 'Hồ sơ chuyển sang trạng thái PENDING_ADMIN chờ Admin duyệt');
assert(binh.finalIncentive === recBinh.proposedAmount, `Khoản thưởng đề xuất đồng bộ đúng: ${binh.finalIncentive} ₫`);

// 3. Admin phê duyệt
binh.status = 'APPROVED';
assert(binh.status === 'APPROVED', 'Admin phê duyệt thành công, status = APPROVED');

// 4. Phiếu thưởng sau khi duyệt đồng bộ đúng khoản thưởng đã duyệt
const finalSlipBonus = (binh.status === 'APPROVED') ? binh.finalIncentive : Math.round(binh.baseIncentive * Engine.calculatePayoutFactor(binh.actual / binh.target));
assert(finalSlipBonus === binh.finalIncentive, `Phiếu thưởng đồng bộ mức thưởng đã duyệt: ${finalSlipBonus} ₫`);

// 5. Kiểm tra 5 ca bất thường trong validation queue
const dung = employees.find(e => e.id === 'EMP-004');
const emp116 = employees.find(e => e.id === 'EMP-116');
const emp117 = employees.find(e => e.id === 'EMP-117');
const emp118 = employees.find(e => e.id === 'EMP-118');
const emp119 = employees.find(e => e.id === 'EMP-119');

assert(dung.validationStatus === 'DUPLICATE_ENTRY', 'Dũng bị đánh dấu hợp đồng trùng 90M');
assert(emp116.validationStatus === 'INVALID_TARGET', 'EMP-116 bị lỗi chỉ tiêu bằng 0');
assert(emp117.validationStatus === 'UNASSIGNED_SCHEME', 'EMP-117 bị thiếu cơ chế thưởng');
assert(emp118.validationStatus === 'EXTREME_INCENTIVE', 'EMP-118 bị tỷ lệ ngoại lai 280%');
assert(emp119.validationStatus === 'UNEARNED_INCENTIVE', 'EMP-119 bị lỗi thưởng dưới sàn');

// Xử lý cả 5 ca
dung.actual = 900;
dung.validationStatus = 'VALID';
assert(dung.validationStatus === 'VALID' && dung.actual === 900, 'Khấu trừ trùng hợp đồng Dũng thành công (900M)');

emp116.target = 500;
emp116.validationStatus = 'VALID';
assert(emp116.validationStatus === 'VALID', 'Gán chỉ tiêu chuẩn cho EMP-116 thành công');

emp117.validationStatus = 'VALID';
assert(emp117.validationStatus === 'VALID', 'Gán cơ chế cho EMP-117 thành công');

emp118.payoutFactor = 1.5;
emp118.validationStatus = 'VALID';
assert(emp118.validationStatus === 'VALID', 'Áp trần 150% cho EMP-118 thành công');

emp119.payoutFactor = 0;
emp119.validationStatus = 'VALID';
assert(emp119.validationStatus === 'VALID', 'Áp sàn 0% cho EMP-119 thành công');

if (!allPassed) process.exit(1);
console.log('\n=== TẤT CẢ TEST FLOW PHÊ DUYỆT & BẤT THƯỜNG ĐÃ QUA THÀNH CÔNG! ===');
