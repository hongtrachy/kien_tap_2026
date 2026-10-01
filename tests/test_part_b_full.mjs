import cp from 'child_process';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\ade1b5a6-7a7f-4f90-a106-1dabc0b10775\\scratch\\part_b_profile';

if (fs.existsSync(userDataDir)) {
  fs.rmSync(userDataDir, { recursive: true, force: true });
}

const proc = cp.spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9555',
  `--user-data-dir=${userDataDir}`,
  '--disable-gpu',
  'http://localhost:5000'
]);

await new Promise(r => setTimeout(r, 2000));

try {
  const res = await fetch('http://127.0.0.1:9555/json');
  const tabs = await res.json();
  const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('5000')) || tabs.find(t => t.type === 'page') || tabs[0];
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  const evalInPage = (code, id) => new Promise(resolve => {
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        const val = data.result?.result?.value !== undefined ? data.result.result.value : data.result?.result;
        resolve(val);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({
      id,
      method: 'Runtime.evaluate',
      params: { expression: code, returnByValue: true, awaitPromise: true }
    }));
  });

  ws.addEventListener('open', async () => {
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
    ws.send(JSON.stringify({ id: 3, method: 'Page.navigate', params: { url: 'http://localhost:5000' } }));
  });

  // Wait for page to fully load and initialize
  await new Promise(r => setTimeout(r, 3000));

  // Step 0: Login as Admin
  console.log('Logging in as Admin...');
  await evalInPage(`
    (async () => {
      window.fillDemoAccount('admin');
      await new Promise(r => setTimeout(r, 600));
    })()
  `, 10);

  // Condition 1: Kiểm tra menu mục "Cấu hình cơ chế thưởng theo phòng ban"
  console.log('\n--- Checking Condition 1: Menu item ---');
  const c1 = await evalInPage(`
    (() => {
      const schemesNav = document.getElementById('nav-item-schemes') ||
        Array.from(document.querySelectorAll('#sidebar-nav-container button')).find(b => b.textContent.includes('Cơ chế') || b.textContent.includes('phòng ban'));
      return {
        found: !!schemesNav,
        text: schemesNav?.textContent?.trim(),
        visible: schemesNav ? window.getComputedStyle(schemesNav).display !== 'none' : false
      };
    })()
  `, 11);
  console.log('Condition 1:', c1);

  // Condition 2: Click vào và xem danh sách tối thiểu 4 phòng ban
  console.log('\n--- Checking Condition 2: 4 departments with different configs ---');
  const c2 = await evalInPage(`
    (async () => {
      window.switchTab('schemes');
      await new Promise(r => setTimeout(r, 400));
      const container = document.getElementById('department-schemes-cards');
      const cards = container ? Array.from(container.children) : [];
      const depts = cards.map(c => {
        const title = c.querySelector('h4')?.textContent?.trim();
        const sources = Array.from(c.querySelectorAll('.grid > div')).map(d => d.textContent.trim().replace(/\\s+/g, ' '));
        return { title, sourcesCount: sources.length, sources };
      });
      return {
        viewVisible: window.getComputedStyle(document.getElementById('view-schemes')).display !== 'none',
        deptCount: depts.length,
        depts
      };
    })()
  `, 12);
  console.log('Condition 2:', JSON.stringify(c2, null, 2));

  // Condition 3: Vào Đề xuất mức thưởng, so sánh nhân viên B2B vs Vận hành Bán lẻ
  console.log('\n--- Checking Condition 3: Dynamic sources for B2B vs Retail ---');
  const c3 = await evalInPage(`
    (async () => {
      window.switchTab('recommendation');
      await new Promise(r => setTimeout(r, 400));
      
      // Chọn Chi (B2B)
      const b2bEmp = window.AppState.employees.find(e => e.department.includes('Doanh nghiệp') || e.department.includes('B2B'));
      window.selectRecommendationEmployee(b2bEmp ? b2bEmp.id : 'EMP-003');
      await new Promise(r => setTimeout(r, 400));
      const b2bSources = Array.from(document.querySelectorAll('#rec-source-breakdown > div')).map(d => d.textContent.trim().replace(/\\s+/g, ' '));
      const b2bFormula = document.getElementById('rec-formula-step1-values')?.textContent?.trim();

      // Chọn Dũng (Vận hành Bán lẻ)
      const retailEmp = window.AppState.employees.find(e => e.department.includes('Bán lẻ'));
      window.selectRecommendationEmployee(retailEmp ? retailEmp.id : 'EMP-004');
      await new Promise(r => setTimeout(r, 400));
      const retailSources = Array.from(document.querySelectorAll('#rec-source-breakdown > div')).map(d => d.textContent.trim().replace(/\\s+/g, ' '));
      const retailFormula = document.getElementById('rec-formula-step1-values')?.textContent?.trim();

      return {
        b2b: { name: b2bEmp?.name, dept: b2bEmp?.department, sourcesCount: b2bSources.length, sources: b2bSources, formula: b2bFormula },
        retail: { name: retailEmp?.name, dept: retailEmp?.department, sourcesCount: retailSources.length, sources: retailSources, formula: retailFormula },
        areDifferent: JSON.stringify(b2bSources) !== JSON.stringify(retailSources)
      };
    })()
  `, 13);
  console.log('Condition 3:', JSON.stringify(c3, null, 2));

  // Condition 4: Thử tạo cấu hình vi phạm trần (Đánh giá quản lý = 50%)
  console.log('\n--- Checking Condition 4: Ceiling violation rejection ---');
  const c4 = await evalInPage(`
    (() => {
      const invalidPlan = {
        department: 'Kinh doanh Miền Nam',
        effective_from: '2026-Q3',
        sources: [
          { type: 'RULE_BASED', weight: 0.5 },
          { type: 'MANAGER_EVAL', weight: 0.5 } // 50% exceeds 35% cap!
        ]
      };
      const validation = window.CompensationPlans.validateCompPlan(invalidPlan);
      const addRes = window.CompensationPlans.addPlanVersion(invalidPlan, 'admin');
      return {
        isValid: validation.valid,
        errors: validation.errors,
        addRejected: !addRes.valid,
        addErrors: addRes.errors
      };
    })()
  `, 14);
  console.log('Condition 4:', JSON.stringify(c4, null, 2));

  // Condition 5: Sửa cấu hình 1 phòng ban -> bản cũ vẫn còn lưu
  console.log('\n--- Checking Condition 5: Versioning audit trail ---');
  const c5 = await evalInPage(`
    (() => {
      const allPlansMN = window.CompensationPlans.getPlans().filter(p => p.department === 'Kinh doanh Miền Nam');
      const versions = allPlansMN.map(p => ({ version: p.version, status: p.status, sources: p.sources }));
      return {
        totalVersions: allPlansMN.length,
        hasMultipleVersions: allPlansMN.length >= 2,
        versions
      };
    })()
  `, 15);
  console.log('Condition 5:', JSON.stringify(c5, null, 2));

  // Condition 6: Bảng so sánh các phòng ban ở màn Tổng quan
  console.log('\n--- Checking Condition 6: Department comparison table/card ---');
  const c6 = await evalInPage(`
    (async () => {
      window.switchTab('overview');
      await new Promise(r => setTimeout(r, 400));
      const panel = document.getElementById('department-comparison-panel');
      const list = document.getElementById('department-comparison-list');
      const cards = list ? Array.from(list.children) : [];
      const depts = cards.map(c => c.querySelector('strong')?.textContent?.trim());
      return {
        panelFound: !!panel,
        panelVisible: panel ? window.getComputedStyle(panel).display !== 'none' : false,
        deptCount: depts.length,
        depts
      };
    })()
  `, 16);
  console.log('Condition 6:', JSON.stringify(c6, null, 2));
  console.log('Condition 6:', JSON.stringify(c6, null, 2));

  // Condition 7: Manager không thấy menu và bị chặn URL/hash tới #schemes
  console.log('\n--- Checking Condition 7: Manager access blocked ---');
  const c7 = await evalInPage(`
    (async () => {
      window.logoutApp();
      sessionStorage.clear();
      window.fillDemoAccount('manager');
      await new Promise(r => setTimeout(r, 600));

      const navButtons = Array.from(document.querySelectorAll('#sidebar-nav-container button')).map(b => b.textContent.trim());
      const hasSchemesInMenu = navButtons.some(t => t.includes('Cơ chế') || t.includes('phòng ban'));

      // Thử cố tình truy cập #schemes
      window.switchTab('schemes');
      await new Promise(r => setTimeout(r, 300));
      const activeTabAfterSwitch = window.AppState.activeTab;
      const isSchemesVisible = window.getComputedStyle(document.getElementById('view-schemes')).display !== 'none';

      return {
        currentRole: window.AppState.currentUser?.role,
        hasSchemesInMenu,
        activeTabAfterAttempt: activeTabAfterSwitch,
        isSchemesVisible,
        blockedProperly: !hasSchemesInMenu && activeTabAfterSwitch !== 'schemes' && !isSchemesVisible
      };
    })()
  `, 17);
  console.log('Condition 7:', JSON.stringify(c7, null, 2));

  // Condition 8: 4 nhân vật neo An/Bình/Chi/Dũng chuẩn số tiền thưởng
  console.log('\n--- Checking Condition 8: 4 Anchor characters amounts ---');
  const c8 = await evalInPage(`
    (() => {
      const getEmp = id => window.AppState.employees.find(e => e.id === id);
      const an = getEmp('EMP-001');
      const binh = getEmp('EMP-002');
      const chi = getEmp('EMP-003');
      const dung = getEmp('EMP-004');
      
      const format = n => (n || 0).toLocaleString('vi-VN') + ' ₫';
      return {
        an: { id: 'EMP-001', name: an?.name, rate: an?.achievementRate, amount: an?.finalIncentive || an?.incentiveAmount, formatted: format(an?.finalIncentive || an?.incentiveAmount), expected: '27.500.000 ₫', pass: (an?.finalIncentive || an?.incentiveAmount) === 27500000 },
        binh: { id: 'EMP-002', name: binh?.name, rate: binh?.achievementRate, amount: binh?.finalIncentive || binh?.incentiveAmount, formatted: format(binh?.finalIncentive || binh?.incentiveAmount), expected: '16.300.000 ₫', pass: (binh?.finalIncentive || binh?.incentiveAmount) === 16300000 },
        chi: { id: 'EMP-003', name: chi?.name, rate: chi?.achievementRate, amount: chi?.finalIncentive || chi?.incentiveAmount, formatted: format(chi?.finalIncentive || chi?.incentiveAmount), expected: '20.000.000 ₫', pass: (chi?.finalIncentive || chi?.incentiveAmount) === 20000000 },
        dung: { id: 'EMP-004', name: dung?.name, rate: dung?.achievementRate, amount: dung?.finalIncentive || dung?.incentiveAmount, formatted: format(dung?.finalIncentive || dung?.incentiveAmount), expected: '20.000.000 ₫', pass: (dung?.finalIncentive || dung?.incentiveAmount) === 20000000 }
      };
    })()
  `, 18);
  console.log('Condition 8:', JSON.stringify(c8, null, 2));

  proc.kill();
  process.exit(0);
} catch (err) {
  console.error('Test error:', err);
  proc.kill();
  process.exit(1);
}
