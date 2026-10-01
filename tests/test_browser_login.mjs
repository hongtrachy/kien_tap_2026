import cp from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\ade1b5a6-7a7f-4f90-a106-1dabc0b10775\\scratch\\edge_test_profile';
const proc = cp.spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9333',
  `--user-data-dir=${userDataDir}`,
  '--disable-gpu',
  'http://localhost:5000'
]);

await new Promise(r => setTimeout(r, 2500));

try {
  const res = await fetch('http://127.0.0.1:9333/json');
  const tabs = await res.json();
  const wsUrl = tabs[0]?.webSocketDebuggerUrl;
  console.log('WS URL:', wsUrl);

  const ws = new WebSocket(wsUrl);

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 4, method: 'Network.enable' }));
    ws.send(JSON.stringify({ id: 5, method: 'Page.enable' }));

    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 100,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (async () => {
              let fillError = null;
              let loginResult = null;
              try {
                const btn = document.querySelector('button[onclick*="admin"]');
                if (btn) btn.click();
              } catch (e) {
                fillError = e.message;
              }
              await new Promise(r => setTimeout(r, 600));
              const loginScreen = document.getElementById('login-screen');
              loginResult = {
                classList: loginScreen?.className,
                hasHiddenClass: loginScreen?.classList.contains('hidden'),
                computedDisplay: window.getComputedStyle(loginScreen).display,
                currentUser: window.AppState?.currentUser?.name,
                activeTab: window.AppState?.activeTab
              };
              const usernameVal = document.getElementById('login-username')?.value;
              const passwordVal = document.getElementById('login-password')?.value;
              return { fillError, user: usernameVal, pass: passwordVal, loginResult };
            })()
          `,
          returnByValue: true,
          awaitPromise: true
        }
      }));
    }, 2000);
  });

  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.exceptionThrown') {
      console.log('EXCEPTION:', JSON.stringify(data.params.exceptionDetails));
    }
    if (data.method === 'Network.responseReceived') {
      console.log('NET Response:', data.params.response.url, data.params.response.status);
    }
    if (data.method === 'Network.loadingFailed') {
      console.log('NET Failed:', data.params.errorText, data.params.type);
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('Browser Console:', data.params.type, data.params.args.map(a => a.value || a.description));
    }
    if (data.method === 'Console.messageAdded') {
      console.log('Browser Console Msg:', data.params.message.level, data.params.message.text);
    }
    if (data.id === 100) {
      console.log('=== TEST RESULT ===:', JSON.stringify(data.result, null, 2));
      setTimeout(() => {
        proc.kill();
        process.exit(0);
      }, 500);
    }
  });
} catch (err) {
  console.error('Error:', err);
  proc.kill();
}
