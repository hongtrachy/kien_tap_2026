import cp from 'child_process';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\ade1b5a6-7a7f-4f90-a106-1dabc0b10775\\scratch\\diag_profile';

// Clean profile
if (fs.existsSync(userDataDir)) {
  fs.rmSync(userDataDir, { recursive: true, force: true });
}

const proc = cp.spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9444',
  `--user-data-dir=${userDataDir}`,
  '--disable-gpu',
  'http://localhost:5000'
]);

await new Promise(r => setTimeout(r, 2000));

try {
  const res = await fetch('http://127.0.0.1:9444/json');
  const tabs = await res.json();
  console.log('Available tabs:', tabs.map(t => ({ id: t.id, type: t.type, url: t.url, title: t.title })));
  const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('5000')) || tabs.find(t => t.type === 'page') || tabs[0];
  const wsUrl = pageTab?.webSocketDebuggerUrl;
  console.log('Connecting to tab:', pageTab?.url, 'ws:', wsUrl);

  const ws = new WebSocket(wsUrl);

  const consoleMessages = [];
  const networkRequests = [];
  const exceptions = [];

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 3, method: 'Network.enable' }));
    ws.send(JSON.stringify({ id: 4, method: 'Page.enable' }));
    ws.send(JSON.stringify({ id: 5, method: 'Page.navigate', params: { url: 'http://localhost:5000' } }));
  });

  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      consoleMessages.push({
        type: data.params.type,
        args: data.params.args.map(a => a.value ?? a.description)
      });
    }
    if (data.method === 'Console.messageAdded') {
      consoleMessages.push({
        level: data.params.message.level,
        text: data.params.message.text
      });
    }
    if (data.method === 'Runtime.exceptionThrown') {
      exceptions.push(data.params.exceptionDetails);
    }
    if (data.method === 'Network.responseReceived') {
      networkRequests.push({
        url: data.params.response.url,
        status: data.params.response.status,
        mimeType: data.params.response.mimeType
      });
    }
  });

  // Wait for initial load
  await new Promise(r => setTimeout(r, 2500));

  console.log('=== NETWORK NON-200 REQUESTS (Initial Load) ===');
  const non200 = networkRequests.filter(r => r.status !== 200);
  console.log(JSON.stringify(non200, null, 2));

  console.log('=== EXCEPTIONS ON LOAD ===');
  console.log(JSON.stringify(exceptions, null, 2));

  // TEST CÁCH 1: Bấm thẻ Nguyễn Thu Trang
  console.log('\n--- TESTING CÁCH 1: Bấm thẻ Nguyễn Thu Trang ---');
  const msgCountBeforeC1 = consoleMessages.length;
  const excCountBeforeC1 = exceptions.length;

  const c1Eval = await new Promise(resolve => {
    const reqId = 101;
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === reqId) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({
      id: reqId,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (async () => {
            const btn = document.querySelector('button[onclick*="admin"]');
            const beforeClick = {
              btnFound: !!btn,
              loginScreenDisplay: window.getComputedStyle(document.getElementById('login-screen')).display,
              userVal: document.getElementById('login-username')?.value,
              passVal: document.getElementById('login-password')?.value
            };
            if (btn) btn.click();
            await new Promise(r => setTimeout(r, 600));
            const afterClick = {
              loginScreenDisplay: window.getComputedStyle(document.getElementById('login-screen')).display,
              hasHidden: document.getElementById('login-screen')?.classList.contains('hidden'),
              userVal: document.getElementById('login-username')?.value,
              passVal: document.getElementById('login-password')?.value,
              currentUser: window.AppState?.currentUser?.name,
              currentRole: window.AppState?.currentUser?.role,
              activeTab: window.AppState?.activeTab
            };
            return { beforeClick, afterClick };
          })()
        `,
        returnByValue: true,
        awaitPromise: true
      }
    }));
  });

  console.log('Cách 1 Result:', JSON.stringify(c1Eval, null, 2));
  console.log('Cách 1 New Console Messages:', JSON.stringify(consoleMessages.slice(msgCountBeforeC1), null, 2));
  console.log('Cách 1 New Exceptions:', JSON.stringify(exceptions.slice(excCountBeforeC1), null, 2));

  // Reset session for TEST CÁCH 2
  await new Promise(resolve => {
    const reqId = 102;
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === reqId) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({
      id: reqId,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (() => {
            if (window.logoutApp) window.logoutApp();
            sessionStorage.clear();
            document.getElementById('login-screen')?.classList.remove('hidden');
            const u = document.getElementById('login-username');
            const p = document.getElementById('login-password');
            if (u) u.value = '';
            if (p) p.value = '';
            return {
              loginScreenDisplay: window.getComputedStyle(document.getElementById('login-screen')).display,
              uVal: u?.value,
              pVal: p?.value
            };
          })()
        `,
        returnByValue: true
      }
    }));
  });

  // TEST CÁCH 2: Điền tay admin / 123456 và bấm submit
  console.log('\n--- TESTING CÁCH 2: Điền tay admin/123456 và submit form ---');
  const msgCountBeforeC2 = consoleMessages.length;
  const excCountBeforeC2 = exceptions.length;

  const c2Eval = await new Promise(resolve => {
    const reqId = 103;
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === reqId) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({
      id: reqId,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (async () => {
            const u = document.getElementById('login-username');
            const p = document.getElementById('login-password');
            if (u) u.value = 'admin';
            if (p) p.value = '123456';
            const form = document.getElementById('login-form');
            const submitBtn = form?.querySelector('button[type="submit"]');
            if (submitBtn) {
              submitBtn.click();
            } else if (form) {
              form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
            await new Promise(r => setTimeout(r, 600));
            return {
              loginScreenDisplay: window.getComputedStyle(document.getElementById('login-screen')).display,
              hasHidden: document.getElementById('login-screen')?.classList.contains('hidden'),
              currentUser: window.AppState?.currentUser?.name,
              currentRole: window.AppState?.currentUser?.role,
              activeTab: window.AppState?.activeTab
            };
          })()
        `,
        returnByValue: true,
        awaitPromise: true
      }
    }));
  });

  console.log('Cách 2 Result:', JSON.stringify(c2Eval, null, 2));
  console.log('Cách 2 New Console Messages:', JSON.stringify(consoleMessages.slice(msgCountBeforeC2), null, 2));
  console.log('Cách 2 New Exceptions:', JSON.stringify(exceptions.slice(excCountBeforeC2), null, 2));

  // TEST CÁCH 3: Thử vai trò Quản lý (manager)
  console.log('\n--- TESTING MANAGER LOGIN ---');
  const mgrEval = await new Promise(resolve => {
    const reqId = 104;
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === reqId) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({
      id: reqId,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (async () => {
            if (window.logoutApp) window.logoutApp();
            sessionStorage.clear();
            const btn = document.querySelector('button[onclick*="manager"]');
            if (btn) btn.click();
            await new Promise(r => setTimeout(r, 600));
            return {
              loginScreenDisplay: window.getComputedStyle(document.getElementById('login-screen')).display,
              hasHidden: document.getElementById('login-screen')?.classList.contains('hidden'),
              currentUser: window.AppState?.currentUser?.name,
              currentRole: window.AppState?.currentUser?.role,
              activeTab: window.AppState?.activeTab
            };
          })()
        `,
        returnByValue: true,
        awaitPromise: true
      }
    }));
  });
  console.log('Manager Result:', JSON.stringify(mgrEval, null, 2));

  // TEST CÁCH 4: Thử vai trò Nhân viên (employee)
  console.log('\n--- TESTING EMPLOYEE LOGIN ---');
  const empEval = await new Promise(resolve => {
    const reqId = 105;
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === reqId) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({
      id: reqId,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (async () => {
            if (window.logoutApp) window.logoutApp();
            sessionStorage.clear();
            const btn = document.querySelector('button[onclick*="employee"]');
            if (btn) btn.click();
            await new Promise(r => setTimeout(r, 600));
            return {
              loginScreenDisplay: window.getComputedStyle(document.getElementById('login-screen')).display,
              hasHidden: document.getElementById('login-screen')?.classList.contains('hidden'),
              currentUser: window.AppState?.currentUser?.name,
              currentRole: window.AppState?.currentUser?.role,
              activeTab: window.AppState?.activeTab
            };
          })()
        `,
        returnByValue: true,
        awaitPromise: true
      }
    }));
  });
  console.log('Employee Result:', JSON.stringify(empEval, null, 2));

  proc.kill();
  process.exit(0);
} catch (err) {
  console.error('Diagnostic error:', err);
  proc.kill();
  process.exit(1);
}
