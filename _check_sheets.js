/* 确认 max-height 改动没有影响其他共用 .sheet 的弹层 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
let pass = 0, fail = 0;
const ok = (n, c, e) => { if (c) { pass++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n + (e !== undefined ? '  → ' + JSON.stringify(e) : '')); } };

const probe = () => {
  const s = document.querySelector('.sheet');
  if (!s) return null;
  const r = s.getBoundingClientRect();
  return {
    top: r.top, bottom: r.bottom,
    scrollH: s.scrollHeight, clientH: s.clientHeight,
    titleTop: document.querySelector('.sheet-title')?.getBoundingClientRect().top ?? null,
    overflowing: s.scrollHeight > s.clientHeight + 1,
    scrollable: getComputedStyle(s).overflowY
  };
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 844 });
  await page.goto('http://localhost:8787/index.html', { waitUntil: 'networkidle0' });
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
  await new Promise(r => setTimeout(r, 700));

  console.log('\n[1] 动作指南弹层（PLAN 页）');
  await page.evaluate(() => UI.switchTab('plan'));
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => { const b = document.querySelector('[data-guide]'); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 500));
  let m = await page.evaluate(probe);
  ok('指南弹层存在', !!m);
  if (m) {
    ok('未溢出视口顶部', m.top >= -0.5, m.top);
    ok('标题可见', m.titleTop !== null && m.titleTop >= -0.5, m.titleTop);
    ok('可滚动', m.scrollable === 'auto', m.scrollable);
    console.log('       scrollH=' + m.scrollH + ' clientH=' + m.clientH + ' top=' + Math.round(m.top));
  }
  await page.evaluate(() => document.querySelector('.sheet-mask')?.remove());

  console.log('\n[2] 计划日详情弹层');
  await page.evaluate(() => { const b = document.querySelector('[data-plan-day="0"]'); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 500));
  m = await page.evaluate(probe);
  ok('详情弹层存在', !!m);
  if (m) {
    ok('未溢出视口顶部', m.top >= -0.5, m.top);
    ok('标题可见', m.titleTop !== null && m.titleTop >= -0.5, m.titleTop);
    console.log('       scrollH=' + m.scrollH + ' clientH=' + m.clientH + ' top=' + Math.round(m.top));
  }
  await page.evaluate(() => document.querySelector('.sheet-mask')?.remove());

  console.log('\n[3] 日程类型选择器（MINE 页）');
  await page.evaluate(() => UI.showScheduleEditor());
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => { const b = document.querySelector('[data-sched-day="0"]'); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 500));
  m = await page.evaluate(probe);
  ok('选择器弹层存在', !!m);
  if (m) {
    ok('未溢出视口顶部', m.top >= -0.5, m.top);
    ok('标题可见', m.titleTop !== null && m.titleTop >= -0.5, m.titleTop);
    console.log('       scrollH=' + m.scrollH + ' clientH=' + m.clientH + ' top=' + Math.round(m.top));
  }
  await page.evaluate(() => document.querySelector('.sheet-mask')?.remove());

  console.log('\n[4] 交换确认弹层（短内容，不应出现滚动条）');
  // 完整重载，避免前几步残留的弹层事件处理器干扰
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 700));
  await page.evaluate(() => UI.showTodayAdjust());
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => { const b = document.querySelector('[data-adj-swap]'); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 500));
  m = await page.evaluate(() => {
    const all = document.querySelectorAll('.sheet');
    const s = all[all.length - 1];
    if (!s) return null;
    const r = s.getBoundingClientRect();
    return {
      top: r.top, bottom: r.bottom,
      scrollH: s.scrollHeight, clientH: s.clientHeight,
      titleTop: s.querySelector('.sheet-title')?.getBoundingClientRect().top ?? null,
      overflowing: s.scrollHeight > s.clientHeight + 1,
      count: all.length
    };
  });
  ok('交换弹层存在', !!m);
  if (m) {
    ok('未溢出视口顶部', m.top >= -0.5, m.top);
    ok('短内容不产生多余滚动', !m.overflowing, { scrollH: m.scrollH, clientH: m.clientH });
    console.log('       scrollH=' + m.scrollH + ' clientH=' + m.clientH + ' top=' + Math.round(m.top) + ' 弹层数=' + m.count);
  }

  await browser.close();
  console.log('\n========== 其他弹层回归: ' + pass + ' 通过, ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
