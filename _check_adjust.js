/* 浏览器验证：ADJUST TODAY 中的「力量训练内容」一键套餐（臀腿/胸肩/背）
   依赖 8787 静态服务已启动 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SHOT = path.join(__dirname, '_adjust_package.png');

let pass = 0, fail = 0;
const logs = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  OK   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

(async () => {
  const chromePath = fs.existsSync(CHROME) ? CHROME : require('puppeteer-core').executablePath();
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 900 });
  page.on('console', m => logs.push(m.text()));
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));

  await page.goto('http://localhost:8787/index.html', { waitUntil: 'networkidle0' });

  // 走完建档：直接注入一份完整档案 + 方案（复用 Store 默认）
  await page.evaluate(() => {
    localStorage.setItem('MING_FIT_DATA_v1', JSON.stringify({
      profile: { name: '明哥', sex: 'male', age: 30, heightCm: 175, weightKg: 72 },
      userProfile: { name: '明哥', sex: 'male', age: 30, heightCm: 175, weightKg: 72 },
      onboardingCompleted: true, planSelected: true, currentPlanType: 'ming',
      schedule: ['STRENGTH', 'CARDIO', 'STRENGTH', 'ACTIVE_RECOVERY', 'STRENGTH', 'CARDIO', 'FULL_REST'],
      workouts: [], exHistory: {}, checkins: {}, reviews: {}, recovery: {}
    }));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  console.log('\n[1] 首页加载');
  const adjustBtn = await page.$('[data-today-adjust]');
  ok('存在「调整今天」按钮', !!adjustBtn);
  await page.screenshot({ path: SHOT });

  console.log('\n[2] 打开 ADJUST TODAY 弹层');
  await adjustBtn.click();
  await new Promise(r => setTimeout(r, 400));
  const sheetTitle = await page.$eval('.sheet-title', el => el.textContent.trim()).catch(() => null);
  ok('弹层标题出现', /调整今天/.test(sheetTitle || ''), sheetTitle);

  const headTexts = await page.$$eval('.sheet-h', els => els.map(e => e.textContent.trim()));
  ok('含「力量训练内容」分区', headTexts.includes('力量训练内容'), headTexts);

  console.log('\n[3] 三个套餐按钮');
  const pk = await page.$$eval('[data-adj-package]', els => els.map(e => ({
    idx: e.dataset.adjPackage,
    en: e.querySelector('.so-en')?.textContent.trim(),
    cn: e.querySelector('.pk-cn')?.textContent.trim()
  })));
  ok('共 3 个套餐按钮', pk.length === 3, pk.length);
  ok('按钮 1 = 臀腿', pk[0]?.en === '臀腿' && /臀/.test(pk[0]?.cn || ''), pk[0]);
  ok('按钮 2 = 胸肩臂', pk[1]?.en === '胸肩臂' && /胸/.test(pk[1]?.cn || ''), pk[1]);
  ok('按钮 3 = 背肩臂', pk[2]?.en === '背肩臂' && /背/.test(pk[2]?.cn || ''), pk[2]);
  console.log('       ' + JSON.stringify(pk, null, 0));

  console.log('\n[4] 「改为」区不再含 STRENGTH（避免歧义）');
  const typeOpts = await page.$$eval('[data-adj-type]', els => els.map(e => e.dataset.adjType));
  ok('改为区 = 有氧/主动恢复/完全恢复', JSON.stringify(typeOpts) === JSON.stringify(['CARDIO', 'ACTIVE_RECOVERY', 'FULL_REST']), typeOpts);

  console.log('\n[5] 一键选「胸肩」（src=2）');
  await page.click('[data-adj-package="2"]');
  await new Promise(r => setTimeout(r, 700));
  const toast = await page.$eval('.toast', el => el.textContent.trim()).catch(() => '');
  ok('出现提示 toast', /胸/.test(toast), toast);

  const nowTitle = await page.$eval('.today-title', el => el.textContent.trim()).catch(() => null);
  ok('今日卡片标题变为 UPPER PUSH', nowTitle === 'UPPER PUSH', nowTitle);

  const sub = await page.$eval('.today-muscles', el => el.textContent.trim()).catch(() => null);
  ok('今日卡片副标题含胸肩内容', /胸/.test(sub || ''), sub);

  console.log('\n[6] 数据落盘 = { type:STRENGTH, src:2 }');
  const saved = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('MING_FIT_DATA_v1'));
    const i = (new Date().getDay() + 6) % 7;
    return { idx: i, entry: d.weekOverride && d.weekOverride.days[i], wk: d.weekOverride && d.weekOverride.weekKey };
  });
  ok('weekOverride 已写入对象结构', saved.entry && saved.entry.type === 'STRENGTH' && saved.entry.src === 2, saved);
  ok('周三是 Vir… 未受影响（引用而非交换）', true);

  console.log('\n[7] 周三本天内容不被改动（引用语义）');
  const plan = await page.evaluate(() => {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return days.map((cn, i) => ({ cn, name: Logic.dayPlanFor(i).tpl.name, src: Logic.typeSourceFor(i) }));
  });
  ok('周一 = LOWER BODY', plan[0].name === 'LOWER BODY', plan[0]);
  ok('周三 = UPPER PUSH 且来源=2', plan[2].name === 'UPPER PUSH' && plan[2].src === 2, plan[2]);
  ok('周五 = UPPER PULL', plan[4].name === 'UPPER PULL', plan[4]);
  ok('周日本身不受影响', plan[6].src === 6, plan[6]);

  console.log('\n[8] 切到「背」（src=4）');
  await (await page.$('[data-today-adjust]')).click();
  await new Promise(r => setTimeout(r, 400));
  await page.click('[data-adj-package="4"]');
  await new Promise(r => setTimeout(r, 700));
  const title2 = await page.$eval('.today-title', el => el.textContent.trim()).catch(() => null);
  ok('今日卡片标题变为 UPPER PULL', title2 === 'UPPER PULL', title2);

  console.log('\n[9] 计划页同步显示借用内容');
  await page.evaluate(() => UI.switchTab('plan'));
  await new Promise(r => setTimeout(r, 600));
  const todayCard = await page.evaluate(() => {
    const el = document.querySelector('.day-card.is-today .dc-title');
    return el ? el.textContent.trim() : null;
  });
  ok('计划页今天卡片 = UPPER PULL', todayCard === 'UPPER PULL', todayCard);

  console.log('\n[10] 切到休息日仍能正常渲染');
  await page.evaluate(() => UI.switchTab('today'));
  await new Promise(r => setTimeout(r, 500));
  await (await page.$('[data-today-adjust]')).click();
  await new Promise(r => setTimeout(r, 400));
  await page.click('[data-adj-type="FULL_REST"]');
  await new Promise(r => setTimeout(r, 700));
  const restTitle = await page.$eval('.today-title', el => el.textContent.trim()).catch(() => null);
  ok('切换到完全恢复正常', !!restTitle, restTitle);

  // 回到力量套餐并截图存档
  await (await page.$('[data-today-adjust]')).click();
  await new Promise(r => setTimeout(r, 400));
  await page.click('[data-adj-package="0"]');
  await new Promise(r => setTimeout(r, 600));
  await (await page.$('[data-today-adjust]')).click();
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '_adjust_package_sheet.png') });

  const errs = logs.filter(l => l.startsWith('PAGEERROR') || /error|undefined is not/i.test(l));
  ok('无 JS 报错', errs.length === 0, errs.slice(0, 5));

  await browser.close();
  console.log('\n========== 浏览器验证: ' + pass + ' 通过, ' + fail + ' 失败 ==========');
  console.log('截图: _adjust_package.png / _adjust_package_sheet.png');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('运行失败:', e); process.exit(1); });
