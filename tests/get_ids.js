const fs = require('fs');
const content = fs.readFileSync('DEMO/js/app.js', 'utf8');
const re = /getElementById\(['"]([^'"]+)['"]\)/g;
let m;
const ids = new Set();
while ((m = re.exec(content)) !== null) {
  ids.add(m[1]);
}
fs.writeFileSync('tests/dom_ids.json', JSON.stringify([...ids].sort(), null, 2));
console.log('Found IDs:', ids.size);
