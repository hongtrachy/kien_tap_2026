import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

async function captureAfter() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,900',
    'http://localhost:8080/index.html'
  ]);

  await new Promise(r => setTimeout(r, 3000));

  try {
    const versionRes = await fetch('http://localhost:9223/json/list');
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

    // 1. Overview
    console.log('Capturing 01_overview...');
    await send('Runtime.evaluate', { expression: "switchTab('overview')" });
    await new Promise(r => setTimeout(r, 800));
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('docs/screenshots/after/01_overview.png', Buffer.from(shot.data, 'base64'));

    // 2. Central Incentive Table
    console.log('Capturing 02_incentives_table...');
    await send('Runtime.evaluate', { expression: "switchTab('incentives')" });
    await new Promise(r => setTimeout(r, 800));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('docs/screenshots/after/02_incentives_table.png', Buffer.from(shot.data, 'base64'));

    // 3. Drawer Traceability
    console.log('Capturing 03_drawer_traceability...');
    await send('Runtime.evaluate', { expression: "openDrawer('EMP-001')" });
    await new Promise(r => setTimeout(r, 800));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('docs/screenshots/after/03_drawer_traceability.png', Buffer.from(shot.data, 'base64'));
    await send('Runtime.evaluate', { expression: "closeDrawer()" });
    await new Promise(r => setTimeout(r, 400));

    // 4. Validation Queue
    console.log('Capturing 04_validation_queue...');
    await send('Runtime.evaluate', { expression: "switchTab('validation')" });
    await new Promise(r => setTimeout(r, 800));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('docs/screenshots/after/04_validation_queue.png', Buffer.from(shot.data, 'base64'));

    // 5. Calibration Board
    console.log('Capturing 05_calibration_board...');
    await send('Runtime.evaluate', { expression: "switchTab('calibration')" });
    await new Promise(r => setTimeout(r, 800));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('docs/screenshots/after/05_calibration_board.png', Buffer.from(shot.data, 'base64'));

    // 6. Approval & Payroll
    console.log('Capturing 06_approval_payroll...');
    await send('Runtime.evaluate', { expression: "switchTab('approval')" });
    await new Promise(r => setTimeout(r, 800));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('docs/screenshots/after/06_approval_payroll.png', Buffer.from(shot.data, 'base64'));

    // 7. Analytics & Bunching
    console.log('Capturing 07_scheme_analytics...');
    await send('Runtime.evaluate', { expression: "switchTab('analytics')" });
    await new Promise(r => setTimeout(r, 1200));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('docs/screenshots/after/07_scheme_analytics.png', Buffer.from(shot.data, 'base64'));

    // 8. Employee Slip
    console.log('Capturing 08_employee_slip...');
    await send('Runtime.evaluate', { expression: "switchTab('slip'); renderEmployeeSlip('EMP-002');" });
    await new Promise(r => setTimeout(r, 800));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('docs/screenshots/after/08_employee_slip.png', Buffer.from(shot.data, 'base64'));

    console.log('All 8 After screenshots captured successfully!');
    ws.close();
  } finally {
    chrome.kill();
  }
}

captureAfter().catch(err => {
  console.error(err);
  process.exit(1);
});
