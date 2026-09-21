import fs from 'fs';
import assert from 'assert';

console.log('=== KIỂM THỬ TÍNH TOÀN VẸN CỦA GIAO DIỆN (DOM INTEGRITY) ===\n');

const html = fs.readFileSync('DEMO/index.html', 'utf8');
const expectedIds = JSON.parse(fs.readFileSync('tests/dom_ids.json', 'utf8'));

let missing = [];
for (const id of expectedIds) {
  const pattern = new RegExp(`id=["']${id}["']`);
  if (!pattern.test(html)) {
    missing.push(id);
  }
}

if (missing.length > 0) {
  console.error('❌ Thiếu các ID DOM sau trong index.html:');
  missing.forEach(id => console.error('  - ' + id));
  process.exit(1);
} else {
  console.log(`✔ Đầy đủ toàn bộ ${expectedIds.length} ID phần tử DOM cần thiết cho app.js!`);
  console.log('=== HOÀN TẤT KIỂM THỬ DOM INTEGRITY! ===\n');
}
