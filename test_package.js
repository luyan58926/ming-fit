/* ============================================================
   MING FIT — 「力量套餐一键选择」测试
   验证 ADJUST TODAY 的 臀腿/胸肩/背 一键切换：
     - Logic.strengthPackages()
     - Logic.typeSourceFor() / dayPlanFor()
     - weekOverride 新旧数据兼容（字符串 vs {type,src}）
     - 引用语义（不是交换：来源日不受影响）
     - buildTodayWorkout 按 src 生成动作
   运行：NODE_PATH=<workspace>/node_modules node test_package.js
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = __dirname;
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  → ' + extra : '')); }
}
function eq(name, a, b) { ok(name, JSON.stringify(a) === JSON.stringify(b), '期望 ' + JSON.stringify(b) + '，实际 ' + JSON.stringify(a)); }

const storage = {};
function makeCtx() {
  Object.keys(storage).forEach(k => delete storage[k]);
  const ctx = {
    console, Date, Math, JSON,
    localStorage: {
      getItem: k => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: k => { delete storage[k]; }
    }
  };
  vm.createContext(ctx);
  ['js/data.js', 'js/store.js', 'js/persona.js', 'js/daily.js', 'js/logic.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));
  return ctx;
}
const grab = (ctx, n) => vm.runInContext(n, ctx);

const TODAY = (new Date().getDay() + 6) % 7; // 周一=0
const BASE = ['STRENGTH', 'CARDIO', 'STRENGTH', 'ACTIVE_RECOVERY', 'STRENGTH', 'CARDIO', 'FULL_REST'];
const PROFILE = { name: '明哥', weightKg: 70, heightCm: 175, age: 30, sex: 'male' };

// 建一个本周生效的 weekOverride（days 由回调定制）
function setup(mut) {
  const ctx = makeCtx();
  const Store = grab(ctx, 'Store');
  const days = BASE.slice();
  days[TODAY] = { type: 'STRENGTH', src: 2 };   // 默认：今天照周三练
  if (mut) mut(days);
  const d = Store.get();
  d.schedule = BASE.slice();
  d.weekOverride = { weekKey: Store.weekKeyOf(), days };
  d.strengthTemplate = null;
  Store.save();
  return { ctx, Store, Logic: grab(ctx, 'Logic') };
}

console.log('\n[1] strengthPackages() 基础结构');
{
  const { Logic } = setup();
  const pk = Logic.strengthPackages();
  eq('返回 3 个套餐', pk.length, 3);
  eq('套餐索引 = 周一/周三/周五', pk.map(p => p.idx), [0, 2, 4]);
  eq('周一 name = LOWER BODY', pk[0].name, 'LOWER BODY');
  eq('周三 name = UPPER PUSH', pk[1].name, 'UPPER PUSH');
  eq('周五 name = UPPER PULL', pk[2].name, 'UPPER PULL');
  ok('周一 muscles 含臀腿', /臀/.test(pk[0].muscles), pk[0].muscles);
  ok('周三 muscles 含胸', /胸/.test(pk[1].muscles), pk[1].muscles);
  ok('周五 muscles 含背', /背/.test(pk[2].muscles), pk[2].muscles);
  ok('每个套餐都有动作', pk.every(p => p.exCount > 0));
}

console.log('\n[2] strengthPackages() 跟随用户自定义动作');
{
  const { ctx, Store, Logic } = setup();
  const tpl0Count = grab(ctx, 'STRENGTH_TEMPLATES')[0].exercises.length;
  const d = Store.get();
  d.strengthTemplate = { 2: { exercises: ['LEG_PRESS'] } };
  Store.save();
  const pk = Logic.strengthPackages();
  eq('周三 exCount 跟随自定义', pk[1].exCount, 1);
  eq('周一 exCount 不受影响', pk[0].exCount, tpl0Count);
}

console.log('\n[3] 旧数据兼容：weekOverride.days 为纯字符串');
{
  const { Store, Logic } = setup(days => { days[TODAY] = 'STRENGTH'; });
  eq('字符串旧数据 typeFor 正常', Logic.typeFor(TODAY), 'STRENGTH');
  eq('字符串旧数据 typeSourceFor 返回自身', Logic.typeSourceFor(TODAY), TODAY);
  eq('字符串旧数据 dayPlanFor type 一致', Logic.dayPlanFor(TODAY).type, 'STRENGTH');
  ok('字符串旧数据 dayPlanFor 有 tpl', !!Logic.dayPlanFor(TODAY).tpl);
  eq('字符串旧数据 _normDayEntry', Logic._normDayEntry('CARDIO'), { type: 'CARDIO', src: null });
  const w = Logic.buildTodayWorkout(PROFILE, null);
  eq('字符串旧数据 buildTodayWorkout 正常', w.exercises.length, Logic.strengthTemplateFor(TODAY).exercises.length);
}

console.log('\n[4] 引用语义：今天照周三练，周三本天不受影响');
{
  const { Logic } = setup(days => { days[TODAY] = { type: 'STRENGTH', src: 2 }; });
  eq('今天类型 = STRENGTH', Logic.typeFor(TODAY), 'STRENGTH');
  eq('今天内容来源 = 2（周三）', Logic.typeSourceFor(TODAY), 2);
  eq('今天模板 = UPPER PUSH', Logic.dayPlanFor(TODAY).tpl.name, 'UPPER PUSH');
  eq('▸ 周三类型仍是 STRENGTH', Logic.typeFor(2), 'STRENGTH');
  eq('▸ 周三内容来源仍是自身', Logic.typeSourceFor(2), 2);
  eq('▸ 周三模板仍是 UPPER PUSH', Logic.dayPlanFor(2).tpl.name, 'UPPER PUSH');
  eq('▸ 周一模板仍是 LOWER BODY', Logic.dayPlanFor(0).tpl.name, 'LOWER BODY');
  eq('▸ 周五模板仍是 UPPER PULL', Logic.dayPlanFor(4).tpl.name, 'UPPER PULL');
}

console.log('\n[5] 三套套餐互相切换');
{
  for (const [src, name] of [[0, 'LOWER BODY'], [2, 'UPPER PUSH'], [4, 'UPPER PULL']]) {
    const { Logic } = setup(days => { days[TODAY] = { type: 'STRENGTH', src }; });
    eq('src=' + src + ' → ' + name, Logic.dayPlanFor(TODAY).tpl.name, name);
    eq('src=' + src + ' → typeSourceFor', Logic.typeSourceFor(TODAY), src);
  }
}

console.log('\n[6] 切到非力量类型时 src 被忽略');
{
  const { Logic } = setup(days => { days[TODAY] = { type: 'FULL_REST', src: null }; });
  eq('今天类型 = FULL_REST', Logic.typeFor(TODAY), 'FULL_REST');
  eq('非力量日 typeSourceFor 返回自身', Logic.typeSourceFor(TODAY), TODAY);
  ok('非力量日取恢复模板', !!Logic.dayPlanFor(TODAY).tpl.name);
}

console.log('\n[7] src 越界 / 脏数据保护');
{
  const { Logic } = setup(days => { days[TODAY] = { type: 'STRENGTH', src: 99 }; });
  eq('越界 src 归一为 null', Logic._normDayEntry({ type: 'STRENGTH', src: 99 }).src, null);
  eq('越界 src → typeSourceFor 返回自身', Logic.typeSourceFor(TODAY), TODAY);
  eq('null 条目安全', Logic._normDayEntry(null), null);
  eq('非法条目安全', Logic._normDayEntry({ foo: 1 }), null);
}

console.log('\n[8] buildTodayWorkout 按 src 生成动作');
{
  const { Logic } = setup(days => { days[TODAY] = { type: 'STRENGTH', src: 4 }; });
  const w = Logic.buildTodayWorkout(PROFILE, null);
  eq('生成动作 = 周五（背）模板动作', w.exercises.map(e => e.exId), Logic.strengthTemplateFor(4).exercises);
  eq('planDay.name = UPPER PULL', w.planDay.name, 'UPPER PULL');
  ok('动作数 > 0', w.exercises.length > 0);
  ok('每个动作有组数', w.exercises.every(e => e.sets > 0));
}

console.log('\n[9] 今天本来就是力量日（src=null）→ 用本天模板');
{
  const { Logic } = setup(days => { days[TODAY] = { type: 'STRENGTH', src: null }; });
  eq('src=null → typeSourceFor 返回自身', Logic.typeSourceFor(TODAY), TODAY);
  eq('模板与本天位置一致', Logic.dayPlanFor(TODAY).tpl.name, Logic.strengthTemplateFor(TODAY).name);
}

console.log('\n[10] 跨周失效（weekOverride 属于远古周）');
{
  const { Store, Logic } = setup();
  const d = Store.get();
  d.weekOverride.weekKey = '1970-01-05';
  Store.save();
  eq('跨周后 typeSourceFor 回落自身', Logic.typeSourceFor(TODAY), TODAY);
  eq('跨周后 typeFor 回落长期模板', Logic.typeFor(TODAY), Store.get().schedule[TODAY]);
}

console.log('\n[11] weekCompletion / completionRate 不被对象形态破坏');
{
  const { Logic } = setup(days => { days[TODAY] = { type: 'STRENGTH', src: 2 }; });
  const wc = Logic.weekCompletion();
  // BASE = 3 力量 / 2 有氧 / 1 主动恢复 / 1 完全恢复（共 7 天）；
  // 今天原类型 BASE[TODAY] 被改成力量 → 原类型 -1，力量 +1
  const orig = BASE[TODAY];
  eq('力量计划数', wc.strength.planned, 3 + (orig === 'STRENGTH' ? 0 : 1));
  eq('有氧计划数', wc.cardio.planned, 2 - (orig === 'CARDIO' ? 1 : 0));
  eq('主动恢复计划数', wc.activeRecovery.planned, 1 - (orig === 'ACTIVE_RECOVERY' ? 1 : 0));
  eq('完全恢复计划数', wc.fullRest.planned, 1 - (orig === 'FULL_REST' ? 1 : 0));
  eq('计划总数 = 7', wc.strength.planned + wc.cardio.planned + wc.activeRecovery.planned + wc.fullRest.planned, 7);
  ok('completionRate 是数字', typeof Logic.completionRate() === 'number');
}

console.log('\n[12] 今天改成休息 → 计划数同步变化');
{
  const { Logic } = setup(days => { days[TODAY] = { type: 'FULL_REST', src: null }; });
  const wc = Logic.weekCompletion();
  ok('完全恢复计划数 ≥ 1', wc.fullRest.planned >= 1, '实际 ' + wc.fullRest.planned);
  eq('计划总数仍 = 7', wc.strength.planned + wc.cardio.planned + wc.activeRecovery.planned + wc.fullRest.planned, 7);
}

console.log('\n========== 结果: ' + pass + ' 通过, ' + fail + ' 失败 ==========');
process.exit(fail ? 1 : 0);
