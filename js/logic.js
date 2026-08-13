/* ============================================================
   MING FIT — LOGIC
   建档 · 训练编排 · 渐进超负荷 · 统计
   ============================================================ */

const Logic = {
  /* ---------- 建档 ---------- */
  // 计算 BMI
  bmi(weightKg, heightCm) {
    if (!weightKg || !heightCm) return null;
    const m = heightCm / 100;
    return (weightKg / (m * m)).toFixed(1);
  },

  /* ---------- 每周训练安排 ---------- */
  // 获取某天(index)在当前周的实际类型（应用本周临时调整后的结果）
  // index: 0=周一 .. 6=周日
  typeFor(index) {
    const d = Store.get();
    const ov = this.weekOverrideActive();
    if (ov && ov.days && ov.days[index]) return ov.days[index];
    return (d.schedule && d.schedule[index]) || 'REST';
  },

  // 本周临时调整是否生效（weekOverride 属于本周）
  weekOverrideActive() {
    const d = Store.get();
    const ov = d.weekOverride;
    if (!ov) return null;
    if (ov.weekKey !== Store.weekKeyOf()) return null;
    return ov;
  },

  // 今日类型：STRENGTH | CARDIO | ACTIVE_RECOVERY | FULL_REST
  todayType() {
    const dow = new Date().getDay();
    const dayIndex = (dow + 6) % 7; // 周一=0
    return this.typeFor(dayIndex);
  },

  // 长期模板统计 { strength, cardio, activeRecovery, fullRest }
  scheduleStats() {
    const d = Store.get();
    const s = d.schedule || [];
    return {
      strength: s.filter(t => t === 'STRENGTH').length,
      cardio: s.filter(t => t === 'CARDIO').length,
      activeRecovery: s.filter(t => t === 'ACTIVE_RECOVERY').length,
      fullRest: s.filter(t => t === 'FULL_REST').length
    };
  },

  // 力量日模板：index=0/2/4 → LOWER BODY/UPPER PUSH/UPPER PULL；其他力量日（用户自定义）回退到周一
  // 用户在【编辑训练内容】中的修改（exercises 列表 + overrides 组数/次数）优先于默认模板
  strengthTemplateFor(index) {
    const d = Store.get();
    const tpl = STRENGTH_TEMPLATES[index] || STRENGTH_TEMPLATES[0];
    const custom = d.strengthTemplate && d.strengthTemplate[index];
    if (custom && Array.isArray(custom.exercises) && custom.exercises.length) {
      return Object.assign({}, tpl, custom);
    }
    return tpl;
  },

  // 有氧日模板：index=1/5 → CARDIO A/B（爬坡有氧）；其他有氧日回退到 A
  cardioTemplateFor(index) {
    return CARDIO_TEMPLATES[index] || CARDIO_TEMPLATES[1];
  },

  // 主动恢复日模板（周四）
  activeRecoveryTemplateFor() {
    return ACTIVE_RECOVERY_TEMPLATE;
  },

  // 完全恢复日模板（周日）
  fullRestTemplateFor() {
    return FULL_REST_TEMPLATE;
  },

  // 某天是恢复性质（含主动/完全恢复）
  isRecoveryType(type) {
    return type === 'ACTIVE_RECOVERY' || type === 'FULL_REST';
  },

  // 训练类型 → 统计键（STRENGTH→strength / ACTIVE_RECOVERY→activeRecovery 等）
  // 统一处理大写类型名与历史脏数据，避免 "active_recovery" 对不上 camelCase 键
  _typeKey(type) {
    const T = { 'STRENGTH': 'strength', 'CARDIO': 'cardio', 'ACTIVE_RECOVERY': 'activeRecovery', 'FULL_REST': 'fullRest' };
    const k = String(type || '').toUpperCase();
    return T[k] || String(type || '').toLowerCase();
  },

  // 本周各类型完成情况：{ strength, cardio, activeRecovery, fullRest } 各含 {done, planned}
  weekCompletion() {
    const d = Store.get();
    const wkey = Store.weekKeyOf();
    const result = {
      strength: { done: 0, planned: 0 },
      cardio: { done: 0, planned: 0 },
      activeRecovery: { done: 0, planned: 0 },
      fullRest: { done: 0, planned: 0 }
    };
    for (let i = 0; i < 7; i++) {
      const type = this.typeFor(i);
      const key = this._typeKey(type);
      if (result[key] !== undefined) result[key].planned++;
      const k = this.dateKeyOfWeek(wkey, i);
      const w = d.workouts.find(x => x.dateKey === k && !x.inProgress);
      if (w) {
        // 按记录实际类型统计完成；若该天记录缺失或类型未知则归入其计划类型
        const recKey = w.type ? this._typeKey(w.type) : key;
        if (result[recKey] !== undefined) result[recKey].done++;
        else if (result[key] !== undefined) result[key].done++;
      }
    }
    return result;
  },

  // 由周一日期键 + 偏移得到某天日期键
  dateKeyOfWeek(mondayKey, offset) {
    const t = new Date(mondayKey + 'T00:00:00');
    t.setDate(t.getDate() + offset);
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  },

  // 本月各类型完成次数
  monthTypeCount() {
    const d = Store.get();
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const out = { strength: 0, cardio: 0, activeRecovery: 0, fullRest: 0 };
    d.workouts.forEach(w => {
      if (w.inProgress) return; // 进行中记录不计入完成统计
      if (!w.dateKey || w.dateKey.indexOf(ym) !== 0) return;
      const raw = (w.type || (w.planDay === '恢复日' ? 'ACTIVE_RECOVERY' : 'STRENGTH'));
      const t = this._typeKey(raw); // 统一归一化到 camelCase 统计键
      if (out[t] !== undefined) out[t]++;
    });
    return out;
  },

  /* ---------- 训练日编排 ---------- */
  // 根据 todayType() 生成训练对象 { dateKey, planDay, type, exercises:[{...}], totalSets }
  buildTodayWorkout(profile, plan) {
    const type = this.todayType();
    const todayKey = Store.todayKey();
    const dow = new Date().getDay();
    const dayIndex = (dow + 6) % 7;  // 周一=0

    // 有氧 / 恢复日：无力量动作
    if (type !== 'STRENGTH') {
      let planDayName = '有氧训练';
      if (type === 'ACTIVE_RECOVERY') planDayName = '主动恢复';
      else if (type === 'FULL_REST') planDayName = '完全恢复';
      return {
        dateKey: todayKey,
        planDay: type === 'CARDIO' ? '有氧训练' : planDayName,
        type,
        exercises: [],
        totalSets: 0,
        startTs: Date.now(),
        inProgress: false
      };
    }

    const planDay = this.strengthTemplateFor(dayIndex);
    const existing = Store.get().workouts.find(w => w.dateKey === todayKey && (w.type || 'STRENGTH') === 'STRENGTH');
    if (existing && existing.inProgress && Array.isArray(existing.records) && existing.records.length > 0) {
      return {
        dateKey: todayKey,
        planDay: planDay,
        type: 'STRENGTH',
        exercises: existing.records.map((r, i) => {
          const src = EXERCISES[r.exId] || {};
          return {
            exId: r.exId, en: r.en || src.en || '', cn: r.cn || src.cn || '', target: r.target || src.target,
            muscle: src.muscle, assist: src.assist || [], points: src.points || [], mistakes: src.mistakes || [], alts: src.alts || [],
            sets: r.setsTotal || 1, reps: Array.isArray(r.reps) ? r.reps : [1, 1], rir: r.rir || 0, rest: r.rest || 90,
            weight: r.weight, lastSets: r.lastSets, lastRec: (r.done && r.done.length) ? r.done[r.done.length - 1] : null,
            done: r.done || [], curSet: r.curSet || 0,
            skipped: !!r.skipped,
            timeUnit: src.timeUnit || null, optional: !!src.optional
          };
        }),
        totalSets: existing.records.reduce((a, r) => a + r.setsTotal, 0),
        startTs: existing.startTs,
        inProgress: true,
        prs: existing.prs || [], // ← TODAY 暂离恢复：保留已累计的 PR 记录（否则总结页 PR banner 丢失）
        // ← TODAY 暂离恢复：回到离场时的动作序号 / 休息计时
        currentIdx: (typeof existing.currentIdx === 'number' && existing.currentIdx >= 0 && existing.currentIdx < existing.records.length) ? existing.currentIdx : 0,
        restSnapshot: existing.restSnapshot || null
      };
    }

    const exercises = (planDay && Array.isArray(planDay.exercises) ? planDay.exercises : []).map(exId => {
      const ex = EXERCISES[exId];
      if (!ex) return null;
      const hist = Store.historyOf(exId);
      const lastRec = hist.length ? hist[hist.length - 1] : null;
      // 重量型动作：取历史重量或估算起始；时间型/徒手动作用 0
      let suggestW = null;
      if (ex.type === 'time' || ex.type === 'reps') {
        suggestW = 0;
      } else if (lastRec && lastRec.weight) {
        suggestW = lastRec.weight;
      } else {
        suggestW = estimateStartWeight(ex, profile);
      }
      // 用户编辑训练内容时的覆盖（组数/次数/休息）
      const ov = (planDay && planDay.overrides) ? planDay.overrides[exId] : null;
      const sets = ov ? ov.sets : ex.sets;
      const reps = ov ? ov.reps : ex.reps;
      const rest = ov && ov.rest ? ov.rest : ex.rest;
      return {
        exId, en: ex.en, cn: ex.cn, target: ex.target,
        muscle: ex.muscle, assist: ex.assist,
        sets, reps, rir: ex.rir, rest,
        points: ex.points, mistakes: ex.mistakes, alts: ex.alts,
        weight: suggestW,
        lastRec,
        done: [],
        curSet: 0,
        timeUnit: ex.timeUnit || null,   // 'min' | 'sec' | null（重量型）
        optional: !!ex.optional
      };
    }).filter(Boolean);

    return {
      dateKey: todayKey,
      planDay,
      type: 'STRENGTH',
      exercises,
      totalSets: exercises.reduce((a, e) => a + e.sets, 0),
      startTs: Date.now(),
      inProgress: true
    };
  },

  /* ---------- 组完成记录 ---------- */
  completeSet(workout, exIdx, weight, reps, rir) {
    const ex = workout.exercises[exIdx];
    ex.done.push({ weight, reps, rir });
    ex.curSet = ex.done.length;
    // 计算该组是否为目标次数达成
    const targetReps = ex.reps[1];
    const isTarget = reps >= targetReps;
    return isTarget;
  },

  /* ---------- 渐进超负荷建议 ---------- */
  // 对某个动作，根据本日完成情况给出下一次建议
  // 重量型动作建议加 2.5kg；时间型动作（平板支撑等）建议 +5 sec/min
  suggestNext(exId, doneSets, reps) {
    const hist = Store.historyOf(exId);
    const targetReps = reps[1];
    const ex = EXERCISES[exId] || {};
    const isTime = ex.type === 'time';
    const step = isTime ? 5 : 2.5;
    const unit = isTime ? (ex.timeUnit || 'sec') : 'kg';
    // 完成度：达到目标次数的组数
    const hit = doneSets.filter(s => s.reps >= targetReps).length;
    const total = doneSets.length;
    let suggestion = null;

    if (total > 0) {
      // 时间型动作 weight 恒为 0，取其 reps（秒/分钟数）作为"当前值"
      const lastV = doneSets[doneSets.length - 1].weight || doneSets[doneSets.length - 1].reps;
      if (hit === total && total >= 2) {
        // 全部完成 -> 加重量 2.5kg / 加时长 step
        suggestion = {
          type: 'up',
          text: isTime ? `完成目标，下次建议 +${step} ${unit}。` : '完成目标，下次建议加 2.5kg。',
          newWeight: isTime ? lastV + step : roundW(lastV + 2.5)
        };
      } else if (hit >= 1) {
        suggestion = { type: 'hold', text: isTime ? '部分完成，继续巩固当前时长。' : '部分完成，继续巩固当前重量。', newWeight: lastV };
      } else {
        suggestion = { type: 'down', text: isTime ? `未完成目标，建议保持或下调 ${step} ${unit}。` : '未完成目标，建议保持或下调 2.5kg。', newWeight: isTime ? Math.max(0, lastV - step) : roundW(lastV - 2.5) };
      }
    }
    return suggestion;
  },

  /* ---------- 统计 ---------- */
  weeklySessions() {
    const d = Store.get();
    const key = Store.todayKey();
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const k = Store.dateKeyOf(-i);
      if (d.workouts.some(w => w.dateKey === k && !w.inProgress)) count++;
    }
    return count;
  },
  monthlySessions() {
    const d = Store.get();
    const now = new Date();
    return d.workouts.filter(w => {
      if (w.inProgress) return false;
      const [y, m] = w.dateKey.split('-').map(Number);
      return y === now.getFullYear() && m === now.getMonth() + 1;
    }).length;
  },
  totalDuration() {
    return Store.get().workouts.reduce((a, w) => a + (w.inProgress ? 0 : (w.duration || 0)), 0);
  },
  totalSets() {
    return Store.get().workouts.reduce((a, w) => a + (w.inProgress ? 0 : (w.setsDone || 0)), 0);
  },
  totalVolume() {
    return Store.get().workouts.reduce((a, w) => a + (w.inProgress ? 0 : (w.volume || 0)), 0);
  },
  // 计划完成率（本周已完成训练日/本周计划训练日）
  // 训练日=力量+有氧+主动恢复；完全恢复不计入"完成率"分母（不要求训练）
  completionRate() {
    const wc = this.weekCompletion();
    const planned = wc.strength.planned + wc.cardio.planned + wc.activeRecovery.planned;
    if (!planned) return 0;
    const done = wc.strength.done + wc.cardio.done + wc.activeRecovery.done;
    return Math.round(Math.min(100, done / planned * 100));
  },

  /* ================= SMART COACH ================= */
  // 根据当天状态/睡眠生成今日训练调整建议
  // energy: 'great'|'good'|'tired'|'wiped'   sleep: 'great'|'good'|'bad'
  // 返回 { title, mode, items:[{t,d}], summary }
  computeCheckin(energy, sleep) {
    const e = energy || 'good';
    const s = sleep || 'good';
    const tired = e === 'tired';
    const wiped = e === 'wiped';
    const badSleep = s === 'bad';
    const goodSleep = s === 'great';
    const goodEnergy = e === 'great';
    const normal = e === 'good';

    // 状态很差 → RECOVERY BIAS / CARE
    if (wiped || badSleep) {
      return {
        title: wiped ? 'RECOVERY BIAS' : 'LOW RECOVERY',
        mode: 'care',
        summary: '今天以完成和动作质量为主。不要追求新纪录。',
        items: [
          { t: '训练强度', d: '约 85%' },
          { t: '主要动作', d: '降低 5%–10%' },
          { t: 'RIR', d: '至少保留 2' },
          { t: 'PR', d: '今天不追' }
        ]
      };
    }
    if (tired) {
      return {
        title: 'TODAY ADJUSTMENT',
        mode: 'light',
        summary: '状态欠佳。强度下调，保质量。',
        items: [
          { t: '训练强度', d: '约 90%' },
          { t: '复合动作', d: '原重量或小幅降低' },
          { t: 'PR', d: '不追' },
          { t: '动作质量', d: '优先保证' }
        ]
      };
    }
    if (goodEnergy && goodSleep) {
      return {
        title: 'TODAY CHECK-IN',
        mode: 'full',
        summary: '今日状态良好。按原计划训练。',
        items: [
          { t: '训练强度', d: '100%' },
          { t: '训练量', d: '100%' },
          { t: '进阶', d: '可尝试计划中的进阶目标' }
        ]
      };
    }
    // 一般 / 混合
    return {
      title: 'TODAY CHECK-IN',
      mode: 'hold',
      summary: '保持原计划。不主动提高训练量。',
      items: [
        { t: '训练强度', d: '95%–100%' },
        { t: '训练量', d: '100%' },
        { t: '建议', d: '第一组看实际感觉再定' }
      ]
    };
  },

  // 连续训练天数（含今天未练则从昨天回推；今天练了则从今天回推）
  consecutiveDays() {
    const d = Store.get();
    const keys = (d.workouts || []).filter(w => !w.inProgress).map(w => w.dateKey);
    const set = new Set(keys);
    if (!set.size) return 0;
    const today = Store.todayKey();
    let count = 0;
    // 从今天开始往前数连续天数；若今天没练，从昨天开始
    let cursor = today;
    if (!set.has(today)) cursor = Store.dateKeyOf(-1);
    while (set.has(cursor)) {
      count++;
      const t = new Date(cursor + 'T00:00:00');
      t.setDate(t.getDate() - 1);
      cursor = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    }
    return count;
  },

  // 最近两天是否都选"很累"（用于连续主观疲劳）
  fatigueHigh() {
    const d = Store.get();
    const r = d.reviews || {};
    const keys = Object.keys(r).sort().reverse().slice(0, 2);
    return keys.length >= 2 && keys.every(k => r[k] === 'hard');
  },

  // 恢复日任务统计（total 由调用方根据 主动恢复/完全恢复 传入）
  recoveryStats(dateKey, total) {
    const d = Store.get();
    const rec = (d.recovery || {})[dateKey] || { done: [] };
    const doneArr = Array.isArray(rec.done) ? rec.done : [];
    const doneCount = doneArr.filter(Boolean).length;
    return { doneCount, total: total || 4, confirmed: !!(d.recoveryConfirmed && d.recoveryConfirmed[dateKey]) };
  },

  /* ================= 第一版：首次使用 · 计划选择 · 计划切换 ================= */

  // 当前方案信息（TODAY/PLAN 徽标、MINE 模块用）
  // 返回 { type:'ming'|'smart'|null, name, subtitle, tag }
  currentPlanInfo() {
    const d = Store.get();
    if (!d.planSelected || !d.currentPlanType) return { type: null, name: '—', subtitle: '', tag: '' };
    if (d.currentPlanType === 'ming') {
      const t = d.mingPlanTemplate || {};
      return { type: 'ming', name: t.name || 'MING PLAN', subtitle: t.subtitle || '明哥专属', tag: t.tag || 'READY' };
    }
    const s = d.smartPlan || {};
    return { type: 'smart', name: s.name || 'SMART PLAN', subtitle: s.subtitle || '智能定制', tag: s.tag || 'CUSTOM' };
  },

  // MING PLAN 正式周安排（内置快照，永不删除）
  mingSchedule() {
    const t = Store.get().mingPlanTemplate;
    return (t && t.schedule && t.schedule.length === 7) ? t.schedule.slice() : ['STRENGTH','CARDIO','STRENGTH','ACTIVE_RECOVERY','STRENGTH','CARDIO','FULL_REST'];
  },

  // 启用 MING PLAN：加载明哥正式训练表（周安排 + 内置力量日模板）
  // 绝不触碰任何历史数据（训练记录/重量/有氧/体重/围度/REVIEW/STATS/档案/连续记录）
  activateMingPlan() {
    const d = Store.get();
    const t = d.mingPlanTemplate || {};
    d.schedule = (t.schedule && t.schedule.length === 7) ? t.schedule.slice() : this.mingSchedule();
    d.strengthTemplate = null;   // null = 使用 data.js 内置正式力量日模板
    d.cardioPrefs = (t.cardioPrefs !== undefined && t.cardioPrefs !== null) ? t.cardioPrefs : null;
    d.currentPlanType = 'ming';
    d.planSelected = true;
    Store.save();
    return d.currentPlanType;
  },

  // 恢复原版 MING PLAN（语义同上，供 CHANGE PLAN 页使用）
  restoreMingPlan() {
    return this.activateMingPlan();
  },

  // 由问卷答案生成 SMART PLAN（只写入 d.smartPlan，不改变当前使用中的方案；不删除 MING PLAN 模板）
  // answer 结构兼容 buildPlan：goal/bodyFocus/level/knownLifts/risks/location/daysPerWeek/duration/equipment
  generateSmartPlan(answer) {
    const plan = buildPlan(answer);
    const TYPE = { '训练':'STRENGTH', '恢复':'CARDIO', '休息':'FULL_REST' };
    const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    // 按问卷选择的每周天数（2-6 天）编排 7 天结构：训练日优先排前，周日固定完全恢复
    const daysWanted = Math.max(2, Math.min(6, Number(answer.daysPerWeek) || 4));
    const trainPool = (plan.days || []).filter(day => day.type === '训练');
    const recoveryPool = (plan.days || []).filter(day => day.type === '恢复');
    const restDay = { label: '休息', type: '休息', name: '休息', muscles: '', exercises: [], restNote: 0 };
    const recDay = (recoveryPool[0] || { label: '恢复', type: '恢复', name: '有氧 / 恢复', muscles: '低强度有氧 · 拉伸', exercises: [], restNote: 40 });
    const durationMin = Math.max(20, Math.min(120, Number(answer.duration) || 50));
    const days = DAY_LABELS.map((label, i) => {
      if (i < daysWanted) {
        const t = trainPool[i % trainPool.length] || recDay;
        return {
          label, type: '训练', name: t.name, muscles: t.muscles || '',
          exercises: (t.exercises || []).slice(), restNote: durationMin
        };
      }
      if (i === 6) return Object.assign({}, restDay, { label });
      return Object.assign({}, recDay, { label, name: recDay.name + ' · 恢复', type: '恢复' });
    });
    const schedule = days.map(day => TYPE[day.type] || 'FULL_REST');
    const smart = {
      name: plan.name,
      subtitle: '智能定制',
      tag: 'CUSTOM',
      goal: answer.goal || 'muscle',
      goalName: plan.goalName,
      bodyFocus: answer.bodyFocus || 'full',
      bodyFocusList: answer.bodyFocusList || [],
      level: answer.level || 'beginner',
      daysPerWeek: daysWanted,
      duration: String(durationMin),
      location: answer.location || 'gym',
      equipment: answer.equipment || [],
      risks: answer.risks || [],
      cardio: plan.cardio,
      week: plan.week,
      focus: plan.focus,
      days,
      schedule,
      createdAt: Date.now()
    };
    const d = Store.get();
    d.smartPlan = smart;
    Store.save();
    return smart;
  },

  // 启用 SMART PLAN：应用其周安排与力量日动作
  // 不删除 MING PLAN 模板，不触碰任何历史数据
  activateSmartPlan() {
    const d = Store.get();
    const s = d.smartPlan;
    if (!s) return false;
    d.schedule = (s.schedule && s.schedule.length === 7) ? s.schedule.slice() : d.schedule;
    // SMART 的力量日动作 → 写入 strengthTemplate（按星期索引），保证 buildTodayWorkout 按方案动作生成
    const st = new Array(7).fill(null);
    (s.days || []).forEach((day, i) => {
      if (day.type === '训练' && Array.isArray(day.exercises) && day.exercises.length) {
        st[i] = {
          name: day.name, cn: day.name, dayCn: day.name + '日',
          restNote: day.restNote || 50, muscles: day.muscles || '', target: day.name,
          exercises: day.exercises.slice(), overrides: {}
        };
      }
    });
    d.strengthTemplate = st;
    d.cardioPrefs = s.cardioPrefs || d.cardioPrefs;
    d.currentPlanType = 'smart';
    d.planSelected = true;
    Store.save();
    return true;
  },

  // 切换当前方案（CHANGE PLAN 页）：target = 'ming' | 'smart'
  switchPlan(target) {
    if (target === 'ming') return this.activateMingPlan();
    if (target === 'smart') return this.activateSmartPlan();
    return null;
  }
};

/* ---------- 辅助 ---------- */
function roundW(w) {
  return Math.round((w || 0) * 10) / 10;
}

// 首次动作起始重量估算（若用户填了已知数据则用；否则按经验粗估）
function estimateStartWeight(ex, profile) {
  // 若用户填了工作重量校准数据
  if (profile && profile.knownLifts && profile.knownLifts.length) {
    const kl = profile.knownLifts.find(k => k.cn === ex.cn);
    if (kl && kl.weight) return kl.weight;
  }
  // 按动作类型粗估（仅参考，首次训练校准）
  const rough = {
    'barbell-bench-press': 20, 'dumbbell-bench-press': 10, 'incline-db-press': 8,
    'push-up': 0, 'barbell-row': 20, 'dumbbell-row': 10, 'lat-pulldown': 25,
    'seated-row': 25, 'pull-up': 0, 'barbell-overhead-press': 20,
    'dumbbell-shoulder-press': 8, 'db-lateral-raise': 4, 'barbell-curl': 10,
    'db-curl': 5, 'cable-pushdown': 15, 'db-tricep-extension': 6,
    'back-squat': 20, 'leg-press': 40, 'barbell-lunge': 10,
    'leg-extension': 20, 'leg-curl': 15, 'barbell-deadlift': 40,
    'hip-thrust': 20, 'crunch': 0, 'plank': 0, 'hanging-leg-raise': 0,
    /* ---- 明哥正式周计划新动作 ---- */
    'leg-press-45': 60, 'seated-leg-extension': 25, 'machine-hip-thrust': 40,
    'hip-adduction': 30, 'hip-abduction': 30, 'glute-stretch': 0, 'incline-walk-optional': 0,
    'chest-press-machine': 25, 'pec-deck-fly': 20, 'cable-lateral-raise': 5,
    'tricep-pushdown-machine': 15, 'ezbar-preacher-curl': 15, 'reverse-crunch': 0,
    'lat-pulldown-machine': 30, 'seated-row-machine': 30, 'reverse-fly-nautilus': 15,
    'cable-rope-pushdown': 15, 'plank-hold': 0, 'side-plank': 0
  };
  const base = rough[ex.cn] !== undefined ? rough[ex.cn] : 10;
  // 新手更保守
  const lvFactor = profile && profile.level === 'new' ? 0.7 : 1;
  return roundW(base * lvFactor);
}
