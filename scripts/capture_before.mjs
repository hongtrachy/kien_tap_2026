import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

async function capture() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  
  // Launch Chrome with remote debugging
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,900',
    'http://localhost:8080/index.html'
  ]);

  // Wait 3 seconds for chrome to start
  await new Promise(r => setTimeout(r, 3000));

  try {
    const versionRes = await fetch('http://localhost:9222/json/list');
    const tabs = await versionRes.json();
    const pageTab = tabs.find(t => t.type === 'page');
    if (!pageTab) throw new Error('No page tab found');

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

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
    // Wait for CSV to load and process
    await new Promise(r => setTimeout(r, 2000));

    const views = [
      { id: 'dashboard', filename: 'docs/screenshots/before/01_dashboard.png' },
      { id: 'task1', filename: 'docs/screenshots/before/02_task1_calculation.png' },
      { id: 'task2', filename: 'docs/screenshots/before/03_task2_alerts.png' },
      { id: 'task3', filename: 'docs/screenshots/before/04_task3_analytics.png' },
    ];

    for (const v of views) {
      console.log(`Capturing ${v.id}...`);
      await send('Runtime.evaluate', {
        expression: `switchTab('${v.id}')`
      });
      await new Promise(r => setTimeout(r, 1000));
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(shot.data, 'base64');
      writeFileSync(v.filename, buffer);
      console.log(`Saved ${v.filename}`);
    }

    ws.close();
  } finally {
    chrome.kill();
  }
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
