/* ============================================================
   MING FIT — DAILY PUSH (每日一句 · 首页动态文案系统)
   + RIVAL MODE (对手刺激彩蛋：0哥 / 签哥 / 小王总)

   原则：
   · 首页最多一条 DAILY PUSH，保持克制（轻 / 克制 / 有力量）
   · 60% 自我激励 / 25% 妍宝式提醒 / 15% 对手彩蛋
   · 最近 5–10 次显示过的文案优先不重复（recentDailyPushIds）
   · 对手文案偶尔突然出现，不制造焦虑：玩笑、推测、未知
   · CARE MODE（很累 / 睡眠差 / 身体不舒服 / 连续疲劳）→ 关闭 RIVAL
   · RIVAL MODE 开关在 MINE 管理，默认 ON
   ============================================================ */

// 竞争对手集中配置：以后增删对手只改这里（不要散落写死在 UI 组件里）
const RIVALS = ['0哥', '签哥', '小王总'];

// 首页 DAILY PUSH 文案池（统一数据配置）
// 每条：id / category / text / allowedStates
// allowedStates: 'pre'=训练未开始 | 'rest'=休息/恢复日 | 'done'=训练完成 | 'any'
// rival: true 表示含对手内容（RIVAL MODE 关闭时排除）
const DAILY_PUSH_COPY = {
  /* ===== 自我激励（约 60%） ===== */
  selfMotivation: [
    { id: 'sm01', category: 'selfMotivation', text: '今天该轮到你赢了。', allowedStates: ['pre', 'rest', 'done', 'any'] },
    { id: 'sm02', category: 'selfMotivation', text: '不用一下赢很多。今天赢一点就行。', allowedStates: ['pre', 'any'] },
    { id: 'sm03', category: 'selfMotivation', text: '昨天练过的重量。今天再拿稳一点。', allowedStates: ['pre'] },
    { id: 'sm04', category: 'selfMotivation', text: '别等状态来了。先开始。', allowedStates: ['pre', 'any'] },
    { id: 'sm05', category: 'selfMotivation', text: '今天不需要完美。但别随便。', allowedStates: ['pre', 'any'] },
    { id: 'sm06', category: 'selfMotivation', text: '今天也比昨天强一点。一点就够。', allowedStates: ['pre', 'any'] },
    { id: 'sm07', category: 'selfMotivation', text: '你不用证明给所有人看。数据会替你说话。', allowedStates: ['pre', 'any'] },
    { id: 'sm08', category: 'selfMotivation', text: '训练不会马上改变你。但每一次认真都会留下东西。', allowedStates: ['pre', 'any'] },
    { id: 'sm09', category: 'selfMotivation', text: '今天练完。再决定自己行不行。', allowedStates: ['pre'] },
    { id: 'sm10', category: 'selfMotivation', text: '别想太多。先完成第一组。', allowedStates: ['pre'] },
    { id: 'sm11', category: 'selfMotivation', text: '今天不需要很燃。你只需要出现。', allowedStates: ['pre', 'any'] },
    { id: 'sm12', category: 'selfMotivation', text: '坚持不是每天都厉害。是普通状态也照样回来。', allowedStates: ['pre', 'any'] },
    { id: 'sm13', category: 'selfMotivation', text: '今天认真一点。明天就少后悔一点。', allowedStates: ['pre', 'any'] },
    { id: 'sm14', category: 'selfMotivation', text: '重量可以慢慢加。习惯别慢慢丢。', allowedStates: ['pre'] },
    { id: 'sm15', category: 'selfMotivation', text: '有时候变强没有感觉。数据会记得。', allowedStates: ['pre', 'any'] },
    { id: 'sm16', category: 'selfMotivation', text: '不跟昨天争输赢。只比昨天多认真一点。', allowedStates: ['pre', 'any'] },
    { id: 'sm17', category: 'selfMotivation', text: '今天的训练不会白做。', allowedStates: ['pre'] },
    { id: 'sm18', category: 'selfMotivation', text: '开始比状态重要。', allowedStates: ['pre', 'any'] },
    { id: 'sm19', category: 'selfMotivation', text: '慢慢变强。但别停。', allowedStates: ['pre', 'any'] },
    { id: 'sm20', category: 'selfMotivation', text: '今天完成。这就够硬。', allowedStates: ['done', 'pre'] },
    { id: 'sm21', category: 'selfMotivation', text: '没有哪一组是白做的。', allowedStates: ['pre', 'any'] },
    { id: 'sm22', category: 'selfMotivation', text: '别急着看结果。先把过程做完。', allowedStates: ['pre', 'any'] },
    { id: 'sm23', category: 'selfMotivation', text: '今天不需要创造纪录。只需要别敷衍。', allowedStates: ['pre', 'any'] },
    { id: 'sm24', category: 'selfMotivation', text: '一次普通训练。也是进步的一部分。', allowedStates: ['pre', 'any'] },
    { id: 'sm25', category: 'selfMotivation', text: '想变强。就从下一组开始。', allowedStates: ['pre'] },
    { id: 'sm26', category: 'selfMotivation', text: '你今天练的不是情绪。是长期。', allowedStates: ['pre', 'any'] },
    { id: 'sm27', category: 'selfMotivation', text: '该做的做完。剩下的交给时间。', allowedStates: ['pre', 'any'] }
  ],

  /* ===== 妍宝式提醒 / 刺激（约 25%） ===== */
  yanPush: [
    { id: 'yp01', category: 'yanPush', text: '妍宝提醒：今天可以累。不能糊弄。', allowedStates: ['pre', 'any'] },
    { id: 'yp02', category: 'yanPush', text: '明哥。状态可以一般。动作不能一般。', allowedStates: ['pre'] },
    { id: 'yp03', category: 'yanPush', text: '今天别跟重量赌气。把该做的做完。', allowedStates: ['pre', 'any'] },
    { id: 'yp04', category: 'yanPush', text: '今天如果想偷一点。先想想是谁给你做的 MING FIT。', allowedStates: ['pre', 'any'] },
    { id: 'yp05', category: 'yanPush', text: '妍宝说：别急着变厉害。先别变懒。', allowedStates: ['pre', 'any'] },
    { id: 'yp06', category: 'yanPush', text: '今天认真一点。我又不是做这个给你看的。——妍宝', allowedStates: ['pre', 'any'] },
    { id: 'yp07', category: 'yanPush', text: '慢慢练。别一上来就跟自己较劲。——妍宝', allowedStates: ['pre', 'any'] },
    { id: 'yp08', category: 'yanPush', text: '状态好也别乱加重量。你一兴奋我就有点不放心。', allowedStates: ['pre'] },
    { id: 'yp09', category: 'yanPush', text: '今天先把动作做漂亮。数字以后再涨。——妍宝', allowedStates: ['pre'] },
    { id: 'yp10', category: 'yanPush', text: '明哥。你练你的。我负责提醒你：别瞎逞强。', allowedStates: ['pre', 'any'] },
    { id: 'yp11', category: 'yanPush', text: '今天能认真完成。我就夸你。——妍宝', allowedStates: ['pre'] },
    { id: 'yp12', category: 'yanPush', text: '别总想着今天多厉害。能一直练下去更厉害。', allowedStates: ['pre', 'any'] },
    { id: 'yp13', category: 'yanPush', text: '认真练。但别把自己练废。——妍宝', allowedStates: ['pre', 'any'] },
    { id: 'yp14', category: 'yanPush', text: '今天少刷会儿手机。多做一组。', allowedStates: ['pre', 'any'] },
    { id: 'yp15', category: 'yanPush', text: '如果真的累。就按计划降一点。不许硬撑。——妍宝', allowedStates: ['pre', 'any'] }
  ],

  /* ===== 对手彩蛋 RIVAL（约 15%，偶尔突然出现） ===== */
  rivalPush: [
    { id: 'rp01', category: 'rivalPush', text: '0哥今天练没练不知道。但明哥今天不能先投降。', allowedStates: ['pre'] },
    { id: 'rp02', category: 'rivalPush', text: '签哥的数据先放一边。先把你自己的这一组做漂亮。', allowedStates: ['pre'] },
    { id: 'rp03', category: 'rivalPush', text: '小王总可能已经开练了。你还在看首页？', allowedStates: ['pre'] },
    { id: 'rp04', category: 'rivalPush', text: '0哥可以休息。你为什么也跟着休息？', allowedStates: ['pre'] },
    { id: 'rp05', category: 'rivalPush', text: '签哥今天加没加重量不知道。你先把自己的计划完成。', allowedStates: ['pre'] },
    { id: 'rp06', category: 'rivalPush', text: '小王总要是今天没练。那正好。拉开一点。', allowedStates: ['pre'] },
    { id: 'rp07', category: 'rivalPush', text: '今天的目标不复杂。别给0哥追上的机会。', allowedStates: ['pre'] },
    { id: 'rp08', category: 'rivalPush', text: '签哥可以赢一次。别让他赢成习惯。', allowedStates: ['pre'] },
    { id: 'rp09', category: 'rivalPush', text: '小王总的数据不用天天查。你把自己的数据练上去。他自然会看见。', allowedStates: ['pre'] },
    { id: 'rp10', category: 'rivalPush', text: '0哥、签哥、小王总先放一边。这一组是你的。', allowedStates: ['pre'] },
    { id: 'rp11', category: 'rivalPush', text: '今天谁最强不知道。但谁没练，数据会知道。', allowedStates: ['pre', 'done'] },
    { id: 'rp12', category: 'rivalPush', text: '0哥可能在休息。签哥可能在训练。小王总可能在摸鱼。你别猜了。先练。', allowedStates: ['pre'] },
    { id: 'rp13', category: 'rivalPush', text: '明哥。竞争对手最大的作用：提醒你别偷懒。', allowedStates: ['pre'] },
    { id: 'rp14', category: 'rivalPush', text: '别人练没练你管不了。今天自己练没练。你管得了。', allowedStates: ['pre'] },
    { id: 'rp15', category: 'rivalPush', text: '小王总如果今天练了。你也练。如果他没练。更该练。', allowedStates: ['pre'] },
    { id: 'rp16', category: 'rivalPush', text: '签哥今天状态怎么样不知道。你的状态：可以开始。', allowedStates: ['pre'] },
    { id: 'rp17', category: 'rivalPush', text: '0哥今天的数据还是未知。明哥今天的数据：等你写。', allowedStates: ['pre'] },
    { id: 'rp18', category: 'rivalPush', text: '别老想着超过谁。先别让别人轻松超过你。', allowedStates: ['pre'] },
    { id: 'rp19', category: 'rivalPush', text: '0哥、签哥、小王总都不是重点。重点是：你今天别掉线。', allowedStates: ['pre'] },
    { id: 'rp20', category: 'rivalPush', text: '今天训练做完。竞争对手自然少一点机会。', allowedStates: ['pre'] }
  ],

  /* ===== 恢复日（休息 / 主动恢复 / 完全恢复） ===== */
  recovery: [
    { id: 'rc01', category: 'recovery', text: '今天的任务不是赢谁。是恢复。', allowedStates: ['rest'] },
    { id: 'rc02', category: 'recovery', text: '休息也是计划的一部分。', allowedStates: ['rest'] },
    { id: 'rc03', category: 'recovery', text: '今天别偷偷加练。身体也要有下班时间。——妍宝', allowedStates: ['rest'] },
    { id: 'rc04', category: 'recovery', text: '0哥、签哥、小王总今天练不练都不重要。你今天该休息。', allowedStates: ['rest'], rival: true }
  ],

  /* ===== 完成训练后 ===== */
  completion: [
    { id: 'cp01', category: 'completion', text: '今天这局。拿下。', allowedStates: ['done'] },
    { id: 'cp02', category: 'completion', text: '训练完成。数据已到账。', allowedStates: ['done'] },
    { id: 'cp03', category: 'completion', text: '今天不一定赢了所有人。但没输给自己的计划。', allowedStates: ['done'] },
    { id: 'cp04', category: 'completion', text: '明哥。今天完成了。这就值得记一下。', allowedStates: ['done'] }
  ],

  /* ===== CARE MODE（状态很累 / 睡眠差 / 身体不舒服 / 连续疲劳） ===== */
  care: [
    { id: 'care01', category: 'care', text: '今天少一点也没关系。身体状态优先。', allowedStates: ['any'] },
    { id: 'care02', category: 'care', text: '今天的目标是恢复好。不是证明什么。', allowedStates: ['any'] },
    { id: 'care03', category: 'care', text: '别跟身体赌气。状态好的日子会回来的。', allowedStates: ['any'] }
  ],

  /* ===== 训练中对手彩蛋（低频，还剩几组时） ===== */
  workoutRival: [
    { id: 'wr01', category: 'workoutRival', text: '现在停。0哥不一定知道。但我知道。——妍宝', allowedStates: ['pre'] },
    { id: 'wr02', category: 'workoutRival', text: '签哥今天练没练不重要。你这一组做不做很重要。', allowedStates: ['pre'] },
    { id: 'wr03', category: 'workoutRival', text: '最后一组。小王总先不管。把自己的动作做完。', allowedStates: ['pre'] }
  ]
};

// 全部文案扁平索引
const DAILY_PUSH_ALL = Object.keys(DAILY_PUSH_COPY)
  .reduce((arr, cat) => arr.concat(DAILY_PUSH_COPY[cat].map(p => Object.assign({}, p, { category: cat }))), []);

/* ============================================================
   DailyPush — 抽取引擎
   ============================================================ */
const DailyPush = {
  _d() { return Store.get(); },

  // RIVAL MODE 开关（MINE 管理，默认 ON）
  rivalEnabled() { return this._d().rivalMode !== false; },

  // 归一化 opts.rivalMode：未显式传入时以 Store 开关为准（防止调用方漏传导致对手池静默关闭）
  _rivalOn(opts) {
    return opts.rivalMode === undefined ? this.rivalEnabled() : !!opts.rivalMode;
  },

  // 最近显示过的文案 id（上限 10，短期优先不重复）
  _recent() { return this._d().recentDailyPushIds || []; },

  _remember(id) {
    const d = this._d();
    d.recentDailyPushIds = (d.recentDailyPushIds || []).filter(x => x !== id).concat([id]).slice(-10);
    Store.save();
  },

  _pool(cat) { return DAILY_PUSH_COPY[cat] || []; },

  // 从池子抽取：优先排除最近用过的；池子太小则放宽
  _pickFrom(pool, excludeIds, skipRemember) {
    if (!pool.length) return null;
    const excl = excludeIds || [];
    let cand = pool.filter(p => !excl.includes(p.id));
    if (cand.length < 2) cand = pool; // 池太小（恢复/完成/关怀），不强制去重
    const item = cand[Math.floor(Math.random() * cand.length)];
    if (!skipRemember) this._remember(item.id);
    return item;
  },

  // 首页 DAILY PUSH 主入口（opts: { done, restDay, care, rivalMode }）
  // 返回 { id, text, category }；care 时强制温和、关闭 RIVAL
  pickHome(opts) {
    const o = opts || {};
    const rivalOn = this._rivalOn(o);
    if (o.care) return this._pickFrom(this._pool('care'), null, true);
    if (o.done) return this._pickFrom(this._pool('completion'), null, true);
    if (o.restDay) {
      let pool = this._pool('recovery');
      if (!rivalOn) pool = pool.filter(p => !p.rival);
      return this._pickFrom(pool, null, true);
    }
    // 训练日未开始：60% 自我激励 / 25% 妍宝 / 15% 对手彩蛋
    const roll = Math.random();
    let pool;
    if (roll < 0.60) pool = this._pool('selfMotivation');
    else if (roll < 0.85) pool = this._pool('yanPush');
    else pool = rivalOn ? this._pool('rivalPush') : this._pool('selfMotivation');
    return this._pickFrom(pool, this._recent());
  },

  // RIVAL CHECK 特殊彩蛋（低概率：训练日 + RIVAL ON + 非 care + 未训练）
  rivalCheckEligible(o) {
    const oo = o || {};
    const rivalOn = this._rivalOn(oo);
    return !!(rivalOn && !oo.care && !oo.done && !oo.restDay && Math.random() < 0.10);
  },

  // 训练中对手彩蛋（低频 12%）
  pickWorkoutRival(o) {
    const oo = o || {};
    const rivalOn = this._rivalOn(oo);
    if (!rivalOn || oo.care) return '';
    if (Math.random() >= 0.12) return '';
    const item = this._pickFrom(this._pool('workoutRival'), null, true);
    return item ? item.text : '';
  },

  // 完成训练后低频文案（20%）
  pickCompletion() {
    if (Math.random() >= 0.20) return '';
    const item = this._pickFrom(this._pool('completion'), null, true);
    return item ? item.text : '';
  }
};
