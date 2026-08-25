/* ============================================================
   MING FIT — STORE
   localStorage 持久化 · 数据模型
   ============================================================ */

const Store = (() => {
  const KEY = 'MING_FIT_DATA_v1';

  // 明哥正式周安排（内置，永不删除 —— MING PLAN 的周模板）
  const DEFAULT_SCHEDULE = ['STRENGTH','CARDIO','STRENGTH','ACTIVE_RECOVERY','STRENGTH','CARDIO','FULL_REST'];

  // MING PLAN 永久内置模板（明哥正式训练表快照）
  // schedule 为正式周安排；strengthTemplate=null 表示使用 data.js 内置力量日模板（STRENGTH_TEMPLATES）
  const mingTemplate = () => ({
    name: 'MING PLAN',
    subtitle: '明哥专属',
    tag: 'READY',
    schedule: DEFAULT_SCHEDULE.slice(),
    strengthTemplate: null,
    cardioPrefs: null,
    createdAt: 0
  });

  const defaultData = () => ({
    profile: null,          // [兼容旧字段] 建档档案（第一版起统一读写 userProfile，此字段保持同步）
    plan: null,             // [兼容旧字段] 建档时生成的训练方案（第一版起不再自动生成；保留不删）
    /* ---- 第一版：首次使用 · 计划选择 · 计划切换 ---- */
    userProfile: null,      // 身体档案（与训练方案彻底分离：填写资料绝不自动生成/覆盖方案）
    onboardingCompleted: false, // 首次引导是否完成（WELCOME → 身体档案 → 选择方案）
    planSelected: false,    // 是否已选择训练方案
    currentPlanType: null,  // 当前方案：'ming'（明哥专属）| 'smart'（智能定制）| null
    mingPlanTemplate: mingTemplate(), // MING PLAN 永久内置模板（永不删除/覆盖，可随时恢复原版）
    smartPlan: null,        // SMART PLAN（问卷生成后原样保留，不删除 MING PLAN）
    voice: 'standard',      // training voice: standard | motivational | yan
    rivalMode: true,        // RIVAL MODE 对手刺激开关（默认 ON；OFF 时首页不出现 0哥/签哥/小王总 相关文案）
    lang: 'zh-CN',          // 界面语言：zh-CN | en-US（默认中文）
    recentDailyPushIds: [], // 最近显示过的 DAILY PUSH 文案 id（上限 10，短期优先不重复）
    workouts: [],           // 已完成训练 [{ date, dateKey, planDay, exName, duration, volume, setsDone, setsTotal, records:[{exId,en,cn,target,weight,reps,rir}], prs:[...] }]
    exHistory: {},          // { exId: [{ dateKey, weight, reps, rir }] } 动作历史
    exerciseDefaults: {},   // { exId: defaultWeightKg } 用户预设的默认工作重量（优先级高于历史）
    bodyLog: [],            // [{ dateKey, weight, bodyFat, waist, chest, arm, hip, thigh }]
    measures: {},           // 最近一次各身体指标
    state: {                // 训练前状态（最近一次）
      energy: 'good', sleep: 'good', ache: 'none'
    },
    lastWorkoutDateKey: null,
    streak: 0,              // 连续训练天数
    totalSessions: 0,
    yanOpened: 0,           // FROM YAN 打开次数
    lastYanMsg: '',         // 最近一条妍宝留言
    achievements: {},       // 已解锁彩蛋
    /* ---- SMART COACH ---- */
    checkins: {},           // { dateKey: { energy, sleep, ache } } 每日状态/睡眠记录
    reviews: {},            // { dateKey: 'easy'|'just'|'hard' } 每次训练后的主观难度
    recovery: {},           // { dateKey: { done:[bool×4], confirmed:bool } } 恢复日任务
    recoveryConfirmed: {},  // { dateKey: true } 恢复日是否确认完成（兼容旧字段）
    todayAdjust: null,      // 当天训练调整建议 { title, items:[], mode } 
    reviewStreak: { hard: 0, easy: 0 }, // 连续主观难度计数
    /* ---- 每周训练安排（长期模板 + 本周临时调整） ---- */
    schedule: ['STRENGTH','CARDIO','STRENGTH','ACTIVE_RECOVERY','STRENGTH','CARDIO','FULL_REST'], // 周[0]=周一..周[6]=周日（长期默认模板 = 明哥正式周计划）
    weekOverride: null,   // { weekKey:'2026-08-10', days:[...7项 临时类型] } 本周临时调整，仅影响本周
    cardioPrefs: null,    // 有氧偏好（用户选择的有氧方式，可选）
    strengthTemplate: null // 可选：力量日模板覆盖 { [weekdayIndex]: [exIds] }
  });

  let data = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        data = Object.assign(defaultData(), parsed);
        // 兼容旧数据缺字段
        if (!data.exHistory) data.exHistory = {};
        if (!data.exerciseDefaults) data.exerciseDefaults = {};
        if (!data.achievements) data.achievements = {};
        if (!data.measures) data.measures = {};
        // 兼容旧字段：huaOpened → yanOpened
        if (data.huaOpened !== undefined && data.yanOpened === undefined) { data.yanOpened = data.huaOpened; }
        if (data.yanOpened === undefined) data.yanOpened = 0;
        if (data.lastYanMsg === undefined) data.lastYanMsg = '';
        // SMART COACH 兼容迁移
        if (!data.checkins || typeof data.checkins !== 'object') data.checkins = {};
        if (!data.reviews || typeof data.reviews !== 'object') data.reviews = {};
        if (!data.recovery || typeof data.recovery !== 'object') data.recovery = {};
        if (!data.recoveryConfirmed || typeof data.recoveryConfirmed !== 'object') data.recoveryConfirmed = {};
        if (data.todayAdjust === undefined) data.todayAdjust = null;
        if (!data.reviewStreak) data.reviewStreak = { hard: 0, easy: 0 };
        // 每周训练安排 迁移兼容
        if (!Array.isArray(data.schedule) || data.schedule.length !== 7) {
          data.schedule = ['STRENGTH','CARDIO','STRENGTH','ACTIVE_RECOVERY','STRENGTH','CARDIO','FULL_REST'];
        }
        // 归一化类型：训练/STRENGTH→STRENGTH；有氧/CARDIO→CARDIO；旧 REST/休息→FULL_REST；保留新 ACTIVE_RECOVERY/FULL_REST
        const NORM = { 'STRENGTH':'STRENGTH', '训练':'STRENGTH', 'CARDIO':'CARDIO', '有氧':'CARDIO', 'REST':'FULL_REST', '休息':'FULL_REST', '恢复':'ACTIVE_RECOVERY', 'ACTIVE_RECOVERY':'ACTIVE_RECOVERY', 'FULL_REST':'FULL_REST' };
        data.schedule = data.schedule.map(t => NORM[t] || 'FULL_REST');
        if (data.weekOverride === undefined) data.weekOverride = null;
        if (data.cardioPrefs === undefined) data.cardioPrefs = null;
        if (data.strengthTemplate === undefined) data.strengthTemplate = null;
        // DAILY PUSH / RIVAL MODE 迁移兼容
        if (data.rivalMode === undefined) data.rivalMode = true;
        if (!Array.isArray(data.recentDailyPushIds)) data.recentDailyPushIds = [];
        // ---- 第一版迁移：身体档案与训练方案彻底分离 ----
        if (data.userProfile === undefined) data.userProfile = data.profile || null;
        if (data.onboardingCompleted === undefined) data.onboardingCompleted = false;
        if (data.planSelected === undefined) data.planSelected = false;
        if (data.currentPlanType === undefined) data.currentPlanType = null;
        if (data.smartPlan === undefined) data.smartPlan = null;
        if (!data.mingPlanTemplate) data.mingPlanTemplate = mingTemplate();
        // 老用户兼容：已有建档(profile)+方案(plan) → 视为已完成首次引导，当前方案 = MING PLAN
        if (data.profile && data.plan && !data.onboardingCompleted) {
          data.onboardingCompleted = true;
          data.planSelected = true;
          data.currentPlanType = 'ming';
        }
        // 双向同步：新代码读写 userProfile，旧代码引用 profile → 保持同步
        if (data.userProfile && data.userProfile.name) data.profile = data.userProfile;
        else if (data.profile && data.profile.name) data.userProfile = data.profile;
        // 空状态兜底：已选方案但 currentPlanType 异常 → 修正为 MING PLAN
        if (data.planSelected && !data.currentPlanType) data.currentPlanType = 'ming';
        // 数据清洗：清理"标记进行中但无任何组记录"的残留（中途退出留下的空壳），避免首页误显示"继续训练"
        if (Array.isArray(data.workouts)) {
          data.workouts = data.workouts.filter(w => !(w.inProgress && (!Array.isArray(w.records) || w.records.length === 0)));
        }
        return data;
      }
    } catch (e) { /* ignore */ }
    data = defaultData();
    return data;
  }

  function save() {
    // 双向同步兜底：任何写入路径都保持 userProfile ↔ profile 一致（与 load() 迁移逻辑相同）
    if (data && data.userProfile && data.userProfile.name) data.profile = data.userProfile;
    else if (data && data.profile && data.profile.name) data.userProfile = data.profile;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function get() { if (!data) load(); return data; }
  function reset() { data = defaultData(); save(); return data; }

  // 动作历史追加
  function pushExHistory(exId, rec) {
    const d = get();
    if (!d.exHistory[exId]) d.exHistory[exId] = [];
    d.exHistory[exId].push(rec);
    save();
  }

  // 计算动作当前工作重量 = 最近一次完成>=目标次数的最高重量（含未完成取最后）
  function currentWeight(exId) {
    const h = (get().exHistory || {})[exId];
    if (!h || h.length === 0) return null;
    const last = h[h.length - 1];
    return last ? last.weight : null;
  }

  // 获取用户预设的默认工作重量（若无则返回 null）
  function getExerciseDefault(exId) {
    const val = (get().exerciseDefaults || {})[exId];
    return val !== undefined && val !== null ? val : null;
  }

  // 设置某动作的默认工作重量（weight 为 null 时清除该默认值）
  function setExerciseDefault(exId, weight) {
    const d = get();
    if (weight === null || weight === undefined || weight === '') {
      delete d.exerciseDefaults[exId];
    } else {
      d.exerciseDefaults[exId] = Number(weight);
    }
    save();
  }

  function historyOf(exId) { return (get().exHistory || {})[exId] || []; }
  function bestOf(exId) {
    const h = historyOf(exId);
    if (!h.length) return null;
    let best = null;
    h.forEach(r => {
      if (r.weight && (!best || r.weight > best.weight || (r.weight === best.weight && r.reps > best.reps))) {
        best = r;
      }
    });
    return best;
  }

  // 估算 1RM (Epley)
  function estimate1RM(weight, reps) {
    if (!weight || !reps) return null;
    if (reps <= 1) return weight;
    return Math.round(weight * (1 + reps / 30));
  }

  // 训练日期
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function dateKeyOf(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // 本周起始日（周一）日期键
  function weekKeyOf(dateKey) {
    const d = dateKey ? new Date(dateKey + 'T00:00:00') : new Date();
    const dow = (d.getDay() + 6) % 7; // 周一=0
    d.setDate(d.getDate() - dow);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  return { load, save, get, reset, pushExHistory, currentWeight, getExerciseDefault, setExerciseDefault, historyOf, bestOf, estimate1RM, todayKey, dateKeyOf, weekKeyOf };
})();
