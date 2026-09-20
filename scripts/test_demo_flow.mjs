import { spawn } from 'child_process';
import assert from 'node:assert/strict';

async function testDemoFlow() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,900',
    'http://localhost:8080/index.html'
  ]);

  await new Promise(r => setTimeout(r, 3000));

  try {
    const versionRes = await fetch('http://localhost:9224/json/list');
    const tabs = await versionRes.json();
    const pageTab = tabs.find(t => t.type === 'page');
    if (!pageTab) throw new Error('No page tab found');

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise(resolve => ws.onopen = resolve);

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === msgId) {
            ws.removeEventListener('message', handler);
            if (data.error) reject(data.error);
            else resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await new Promise(r => setTimeout(r, 2000));

    console.log('--- BƯỚC 1: KIỂM TRA TRẠNG THÁI KHỞI ĐẦU ---');
    let res = await send('Runtime.evaluate', {
      expression: `({
        dungActual: AppState.employees.find(e => e.id === 'EMP-004').actual,
        dungIncentive: AppState.employees.find(e => e.id === 'EMP-004').calc.incentiveAmount,
        binhFactor: AppState.employees.find(e => e.id === 'EMP-002').calc.difficultyFactor,
        binhIncentive: AppState.employees.find(e => e.id === 'EMP-002').calc.incentiveAmount
      })`,
      returnByValue: true
    });
    console.log('Initial values:', res.result.value);
    assert.equal(res.result.value.dungActual, 990, 'Dũng initial actual must be 990M');
    assert.equal(res.result.value.dungIncentive, 25000000, 'Dũng initial incentive must be 25M');
    assert.equal(res.result.value.binhFactor, 1.0, 'Bình initial factor must be 1.0');
    assert.equal(res.result.value.binhIncentive, 10000000, 'Bình initial incentive must be 10M');

    console.log('--- BƯỚC 2: XỬ LÝ KHẤU TRỪ TRÙNG LẶP CHO DŨNG ---');
    await send('Runtime.evaluate', { expression: "resolveDungDuplicate()" });
    res = await send('Runtime.evaluate', {
      expression: `({
        dungActual: AppState.employees.find(e => e.id === 'EMP-004').actual,
        dungIncentive: AppState.employees.find(e => e.id === 'EMP-004').calc.incentiveAmount
      })`,
      returnByValue: true
    });
    console.log('After deduplication Dũng:', res.result.value);
    assert.equal(res.result.value.dungActual, 900, 'Dũng clean actual must be 900M');
    assert.equal(res.result.value.dungIncentive, 20000000, 'Dũng clean incentive must be 20M');

    console.log('--- BƯỚC 3: DUYỆT ĐỘ KHÓ 0.9 CHO BÌNH ---');
    await send('Runtime.evaluate', { expression: "approveBinhCalibration()" });
    res = await send('Runtime.evaluate', {
      expression: `({
        binhFactor: AppState.employees.find(e => e.id === 'EMP-002').calc.difficultyFactor,
        binhTargetAdj: AppState.employees.find(e => e.id === 'EMP-002').calc.adjustedTarget,
        binhRate: AppState.employees.find(e => e.id === 'EMP-002').calc.achievementRate,
        binhIncentive: AppState.employees.find(e => e.id === 'EMP-002').calc.incentiveAmount
      })`,
      returnByValue: true
    });
    console.log('After calibration approval Bình:', res.result.value);
    assert.equal(res.result.value.binhFactor, 0.9, 'Bình approved factor must be 0.9');
    assert.equal(res.result.value.binhTargetAdj, 900, 'Bình adjusted target must be 900M');
    assert.ok(Math.abs(res.result.value.binhRate - 0.944444) < 1e-4, 'Bình rate must be ~94.4%');
    assert.ok(Math.abs(res.result.value.binhIncentive - 16296300) < 50, 'Bình incentive must be ~16.3M');

    console.log('--- BƯỚC 4: TỔNG QUAN 4 NHÂN VẬT NEO SAU XỬ LÝ ---');
    res = await send('Runtime.evaluate', {
      expression: `
        AppState.employees.filter(e => e.isNeo).reduce((s, e) => s + e.calc.incentiveAmount, 0)
      `,
      returnByValue: true
    });
    const total4 = res.result.value / 1000000;
    console.log('Total 4 neo personas payout:', total4.toFixed(1), 'M VNĐ (Expected: 83.8M vs Budget 80M)');
    assert.ok(Math.abs(total4 - 83.8) < 0.05, 'Total 4 neo personas must be 83.8M');

    console.log('--- BƯỚC 5: PHÊ DUYỆT LÔ VÀ ĐỔI VAI TRÒ ---');
    await send('Runtime.evaluate', { expression: "approveEntireBatch()" });
    res = await send('Runtime.evaluate', {
      expression: "AppState.batchStatus",
      returnByValue: true
    });
    assert.equal(res.result.value, 'APPROVED', 'Batch status must be APPROVED');

    await send('Runtime.evaluate', { expression: "switchUserRole('employee')" });
    res = await send('Runtime.evaluate', {
      expression: "({ role: AppState.userRole, tab: AppState.activeTab })",
      returnByValue: true
    });
    console.log('Role switch result:', res.result.value);
    assert.equal(res.result.value.role, 'employee', 'Role must be employee');
    assert.equal(res.result.value.tab, 'slip', 'Active tab must be slip');

    console.log('=== KỊCH BẢN DEMO 5 PHÚT CHẠY HOÀN TOÀN MƯỢT MÀ VÀ CHÍNH XÁC 100%! ===');
    ws.close();
  } finally {
    chrome.kill();
  }
}

testDemoFlow().catch(err => {
  console.error(err);
  process.exit(1);
});
