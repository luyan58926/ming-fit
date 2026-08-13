/* ============================================================
   MING FIT — UI
   页面渲染 · 底部导航 · 建档表单 · 训练流程
   ============================================================ */

const UI = {
  app: null,
  currentTab: 'today',
  obStep: 0,
  obDraft: {},   // 建档草稿
  workout: null, // 当前进行中的训练
  restTimer: null,
  restLeft: 0,
  view: 'app',   // 'app' | 'workout' | 'rest' | 'onboard'

  init() {
    this.app = document.getElementById('app');
    this._smartEnableFromChange = false; // 是否从 CHANGE PLAN 直接启用 SMART（确认后回 MINE）
    const d = Store.load();
    Persona.setVoice(d.voice);
    this._debug('init', 'start');
    try {
      if (!d.onboardingCompleted) {
        // 首次引导未完成 → 进入 onboarding（已填身体档案则直接进 CHOOSE YOUR PLAN）
        this.renderOnboard();
      } else {
        // 完成引导 → 直接进 TODAY
        this.renderApp();
      }
      this._debug('init', 'ok onboard=' + d.onboardingCompleted + ' plan=' + (d.currentPlanType || 'none'));
    } catch (e) {
      this._debug('init', 'ERROR ' + (e && e.message));
      console.error('[MING FIT] init failed:', e);
      this.renderFatal(e);
    }
  },

  // 是否已有可用身体档案
  _hasValidProfile(d) {
    const p = (d && (d.userProfile || d.profile)) || null;
    return !!(p && p.name);
  },

  // 是否已选择有效训练方案
  _hasValidPlan(d) {
    return !!(d && d.planSelected && d.currentPlanType);
  },

  // 空态：无身体档案 → 引导首次设置
  _emptyProfile(sc) {
    sc.innerHTML = `
      <div class="screen-header">
        <div class="brand-row">
          <div><div class="brand">MING FIT</div><div class="brand-sub">STRONGER THAN YESTERDAY</div></div>
        </div>
        <div class="greeting">先让我认识一下明哥。</div>
        <div class="one-liner">建立身体档案后，再选择你的训练方案。</div>
      </div>
      <button class="btn" data-go-choose-plan>开始设置 →</button>`;
    const btn = sc.querySelector('[data-go-choose-plan]');
    if (btn) btn.onclick = () => this.renderOnboard();
  },

  // 空态：未选择训练方案 → 引导进入 CHOOSE YOUR PLAN（绝不自动生成）
  _emptyPlan(sc) {
    sc.innerHTML = `
      <div class="screen-header">
        <div class="brand-row">
          <div><div class="brand">MING FIT</div><div class="brand-sub">STRONGER THAN YESTERDAY</div></div>
        </div>
        <div class="greeting">还没有选择训练方案。</div>
        <div class="one-liner">MING PLAN 明哥专属训练表已就绪；或回答几个问题，定制 SMART PLAN。</div>
      </div>
      <button class="btn" data-go-choose-plan>选择训练方案 →</button>`;
    const btn = sc.querySelector('[data-go-choose-plan]');
    if (btn) btn.onclick = () => this.renderOnboard();
  },

  // 进入 CHOOSE YOUR PLAN（替代旧版"一键生成计划"，第一版起不自动生成方案）
  _goChoosePlan() {
    const d = Store.get();
    if (!this._hasValidProfile(d)) { this.renderOnboard(); return; }
    this.renderOnboard();
  },

  // 空态：无训练记录
  _emptyStats(sc) {
    sc.innerHTML = `
      <div class="screen-header">
        <div class="brand-row"><div class="brand" style="font-size:24px;">STATS</div></div>
        <div class="brand-sub" style="margin-top:4px;">数据 · 力量 · 身体</div>
      </div>
      <div class="today-card" style="text-align:center;padding:40px 24px;">
        <div class="today-label">NO DATA YET</div>
        <div class="today-title" style="font-size:30px;margin-top:12px;">第一条训练记录</div>
        <div class="today-muscles" style="margin-top:12px;">会从你第一次完成训练开始。</div>
      </div>`;
  },

  /* ================= 首次使用引导（onboarding） ================= */
  renderOnboard() {
    this.view = 'onboard';
    this.obStep = 0;        // 0=WELCOME 1=身体档案 2=CHOOSE YOUR PLAN 3=分支页
    this.obBranch = null;   // 'ming' | 'smart' | null
    this.smartStep = 0;     // SMART 问卷步 0..6
    this._smartCache = null;
    this._smartCacheKey = null;
    this.obDraft = { equipment: [], risks: [], knownLifts: [], measures: {}, goal: null, bodyFocus: null, bodyFocusList: [], level: null, daysPerWeek: null, duration: null, location: null };
    this._smartFromChange = false; // 是否从 CHANGE PLAN 进入问卷（第 0 步上一步返回更换页）
    const d = Store.get();
    // 空状态兜底：已填身体档案但未选方案 → 直接进 CHOOSE YOUR PLAN
    if (this._hasValidProfile(d)) this.obStep = 2;
    this.app.innerHTML = '';
    this._ob();
  },

  // onboarding 渲染分发
  _ob() {
    let html = '';
    if (this.obStep === 0) html = this._obWelcome();
    else if (this.obStep === 1) html = this._obBody();
    else if (this.obStep === 2) html = this._obChoosePlan();
    else if (this.obStep === 3) {
      html = this.obBranch === 'ming' ? this._obMingActivated() : this._smartRender();
    } else {
      html = this._obWelcome();
    }
    const total = 3;
    const progress = this.obStep <= 2
      ? `<div class="onboard-progress">${Array.from({length:total},(_,i)=>`<div class="seg ${i<=this.obStep?'on':''}"></div>`).join('')}</div>`
      : '';
    this.app.innerHTML = `<div class="onboard">${progress}<div class="ob-step">${html}</div></div>`;
    this._bindOb();
  },

  // ---- 第 0 步：WELCOME ----
  _obWelcome() {
    return `
      <div class="ob-welcome">
        <div class="ow-brand">MING FIT</div>
        <div class="ow-slogan">STRONGER THAN YESTERDAY</div>
        <div class="ow-quote">今天也比昨天强一点。</div>
        <button class="btn btn-accent ow-btn" data-ob-start>开始设置 →</button>
      </div>`;
  },

  // ---- 第 1 步：身体档案（与训练方案彻底分离，绝不自动生成方案） ----
  _obBody() {
    const v = this.obDraft;
    const opt = (id, label, unit) => `
      <div class="field ob-opt">
        <label>${label}<span class="f-unit">${unit || ''}</span></label>
        <input type="number" id="${id}" placeholder="可选" value="${v[id] || ''}">
      </div>`;
    return `
      <h2>先认识你一下。</h2>
      <p class="ob-desc">这是你的身体档案。它只用于记录你的状态，<b>不会自动生成或覆盖任何训练方案</b>。</p>
      <div class="field"><label>怎么称呼你</label>
        <input type="text" id="ob-name" placeholder="昵称 / 名字" value="${v.name || '明哥'}">
      </div>
      <div class="field"><label>性别</label>
        <div class="chip-grid">
          <div class="chip ${v.gender==='male'?'selected':''}" data-set="gender" data-v="male">男</div>
          <div class="chip ${v.gender==='female'?'selected':''}" data-set="gender" data-v="female">女</div>
        </div>
      </div>
      <div class="field"><label>年龄</label><input type="number" id="ob-age" placeholder="岁" value="${v.age || ''}"></div>
      <div class="field"><label>身高（cm）</label><input type="number" id="ob-height" placeholder="例如 178" value="${v.height || ''}"></div>
      <div class="field"><label>当前体重（kg）</label><input type="number" id="ob-weight" placeholder="例如 78" value="${v.weight || ''}"></div>
      <div class="ob-opt-head">可选指标 · 仅用于记录，不影响训练方案</div>
      <div class="ob-opt-grid">
        ${opt('ob-bodyfat','体脂率','%')}
        ${opt('ob-waist','腰围','cm')}
        ${opt('ob-chest','胸围','cm')}
        ${opt('ob-arm','臂围','cm')}
        ${opt('ob-hip','臀围','cm')}
        ${opt('ob-thigh','大腿围','cm')}
        ${opt('ob-target','目标体重','kg')}
      </div>
      <p class="ob-desc note">BMI、体重、体脂率仅作为参考指标，不用于医学诊断。</p>
      <div class="step-nav">
        <button class="btn btn-accent" data-ob-save-body>保存档案，选择方案 →</button>
      </div>`;
  },

  // 保存身体档案（只写 userProfile，绝不触碰任何方案）
  _saveBodyProfile() {
    const v = this.obDraft;
    const num = (x) => { const n = Number(x); return (x === '' || x === undefined || x === null || isNaN(n)) ? 0 : n; };
    const nv = (x) => { const n = Number(x); return (x === '' || x === undefined || x === null || isNaN(n)) ? null : n; };
    const profile = {
      name: (v.name && String(v.name).trim()) || '明哥',
      gender: v.gender || 'male',
      age: num(v.age), height: num(v.height), weight: num(v.weight),
      targetWeight: nv(v.targetWeight),
      bodyFat: nv(v.bodyfat), waist: nv(v.waist), chest: nv(v.chest),
      arm: nv(v.arm), hip: nv(v.hip), thigh: nv(v.thigh),
      createdAt: Date.now()
    };
    const d = Store.get();
    d.userProfile = profile;
    d.profile = profile; // 兼容旧引用
    // 首次建档写入 bodyLog 首条（不覆盖已有历史）
    if (!Array.isArray(d.bodyLog) || d.bodyLog.length === 0) {
      d.bodyLog = [{ dateKey: Store.todayKey(), weight: profile.weight || 0, bodyFat: profile.bodyFat || undefined, waist: profile.waist || undefined }];
    }
    Store.save();
    return profile;
  },

  // ---- 第 2 步：CHOOSE YOUR PLAN（双方案入口） ----
  _obChoosePlan() {
    return `
      <h2>选择你的训练方案。</h2>
      <p class="ob-desc">MING PLAN 是明哥的正式训练表，一键加载；SMART PLAN 会根据你的目标与条件智能定制。</p>
      <div class="plan-choice">
        <div class="pc-card pc-ming" data-choose-ming>
          <div class="pcc-top"><span class="pcc-kicker">MING PLAN</span><span class="pcc-badge">RECOMMENDED</span></div>
          <div class="pcc-name">明哥专属</div>
          <div class="pcc-status">READY</div>
          <div class="pcc-desc">妍宝已准备好。一键加载正式训练表：力量 3 天 · 有氧 2 天 · 主动恢复 1 天 · 完全恢复 1 天。</div>
          <div class="pcc-go">使用 MING PLAN →</div>
        </div>
        <div class="pc-card pc-smart" data-choose-smart>
          <div class="pcc-top"><span class="pcc-kicker">SMART PLAN</span></div>
          <div class="pcc-name">智能定制</div>
          <div class="pcc-status">CUSTOM</div>
          <div class="pcc-desc">回答几个问题，生成适合你的训练方案。随时可以换回 MING PLAN。</div>
          <div class="pcc-go">定制 SMART PLAN →</div>
        </div>
      </div>`;
  },

  // ---- 第 3 步（MING 分支）：MING PLAN ACTIVATED ----
  _obMingActivated() {
    return `
      <h2>MING PLAN ACTIVATED</h2>
      <p class="ob-desc">明哥正式训练表已加载。每周安排：力量 3 天 · 有氧 2 天 · 主动恢复 1 天 · 完全恢复 1 天。</p>
      <div class="yan-quote">“${Persona.special('mingActivated')}”</div>
      <div class="yan-sign">——妍宝</div>
      <div class="step-nav">
        <button class="btn btn-accent" data-ming-go>开始训练 →</button>
      </div>`;
  },

  // ---- 第 3 步（SMART 分支）：问卷 7 步 ----
  _smartRender() {
    const steps = [
      this._smartStep0, this._smartStep1, this._smartStep2, this._smartStep3,
      this._smartStep4, this._smartStep5, this._smartStepReview
    ];
    const s = Math.max(0, Math.min(6, this.smartStep));
    const progress = `<div class="onboard-progress">${steps.map((_, i) => `<div class="seg ${i <= s ? 'on' : ''}"></div>`).join('')}</div>`;
    return progress + steps[s].call(this);
  },

  // SMART 问卷 0：训练目标（6 选）
  _smartStep0() {
    const v = this.obDraft;
    return `
      <h2>你的训练目标是什么？</h2>
      <p class="ob-desc">目标会影响每周频率、动作与训练内容。</p>
      <div class="field"><label>主要目标（单选）</label>
        <div class="chip-grid">
          ${Object.entries(DB.GOALS).map(([k, g]) => `<div class="chip ${v.goal === k ? 'selected' : ''}" data-set="goal" data-v="${k}">${g.name}</div>`).join('')}
        </div>
      </div>
      <div class="step-nav">
        <button class="btn btn-ghost" data-smart-back>上一步</button>
        <button class="btn btn-accent" data-smart-next>继续</button>
      </div>`;
  },

  // SMART 问卷 1：重点部位（多选）
  _smartStep1() {
    const v = this.obDraft;
    return `
      <h2>最想重点改善的部位？</h2>
      <p class="ob-desc">可多选。系统会据此调整动作侧重。</p>
      <div class="field"><label>重点部位（可多选）</label>
        <div class="chip-grid cols-3">
          ${Object.entries(DB.BODY_FOCUS).map(([k, t]) => `<div class="chip ${v.bodyFocusList.includes(k) ? 'selected' : ''}" data-toggle-bodyfocus="${k}">${t}</div>`).join('')}
        </div>
      </div>
      <div class="step-nav">
        <button class="btn btn-ghost" data-smart-back>上一步</button>
        <button class="btn btn-accent" data-smart-next>继续</button>
      </div>`;
  },

  // SMART 问卷 2：训练经验（4 档）
  _smartStep2() {
    const v = this.obDraft;
    return `
      <h2>你练过多久？</h2>
      <p class="ob-desc">如实选。系统会根据经验安排动作难度。</p>
      <div class="chip-grid">
        ${Object.entries(DB.LEVELS).map(([k, l]) => `<div class="chip ${v.level === k ? 'selected' : ''}" data-set="level" data-v="${k}">${l.name}<span class="ch-sub">${l.desc || ''}</span></div>`).join('')}
      </div>
      <div class="step-nav">
        <button class="btn btn-ghost" data-smart-back>上一步</button>
        <button class="btn btn-accent" data-smart-next>继续</button>
      </div>`;
  },

  // SMART 问卷 3：每周训练条件（天数 + 时长）
  _smartStep3() {
    const v = this.obDraft;
    return `
      <h2>每周能练几天？每次多久？</h2>
      <p class="ob-desc">按实际情况选，系统据此编排每周安排。</p>
      <div class="field"><label>每周训练天数</label>
        <div class="chip-grid cols-3">
          ${[2, 3, 4, 5, 6].map(n => `<div class="chip ${v.daysPerWeek === n ? 'selected' : ''}" data-set="daysPerWeek" data-v="${n}">${n} 天</div>`).join('')}
        </div>
      </div>
      <div class="field"><label>单次训练时长</label>
        <div class="chip-grid">
          ${[['30','30 min'],['45','45 min'],['60','60 min'],['90','90 min+']].map(([val, lbl]) => `<div class="chip ${v.duration === val ? 'selected' : ''}" data-set="duration" data-v="${val}">${lbl}</div>`).join('')}
        </div>
      </div>
      <div class="step-nav">
        <button class="btn btn-ghost" data-smart-back>上一步</button>
        <button class="btn btn-accent" data-smart-next>继续</button>
      </div>`;
  },

  // SMART 问卷 4：训练环境（地点 + 器械多选）
  _smartStep4() {
    const v = this.obDraft;
    return `
      <h2>你都在哪练？</h2>
      <p class="ob-desc">方案会根据场地与器械自动适配动作。</p>
      <div class="field"><label>训练地点</label>
        <div class="chip-grid">
          ${Object.entries(DB.LOCATIONS).map(([k, t]) => `<div class="chip ${v.location === k ? 'selected' : ''}" data-set="location" data-v="${k}">${t}</div>`).join('')}
        </div>
      </div>
      <div class="field"><label>可用器械（可多选）</label>
        <div class="chip-grid">
          ${[
            ['barbell','杠铃'],['dumbbell','哑铃'],['smith','史密斯'],['cable','龙门架'],
            ['lat','高位下拉'],['row','坐姿划船'],['machine','固定器械'],['leg_ext','腿屈伸'],
            ['leg_curl','腿弯举'],['band','弹力带'],['bar','单杠'],['bench','训练凳'],['none','无器械']
          ].map(([k, t]) => `<div class="chip ${v.equipment.includes(k) ? 'selected' : ''}" data-toggle-equip="${k}">${t}</div>`).join('')}
        </div>
      </div>
      <div class="step-nav">
        <button class="btn btn-ghost" data-smart-back>上一步</button>
        <button class="btn btn-accent" data-smart-next>继续</button>
      </div>`;
  },

  // SMART 问卷 5：身体状态（疼痛 / 损伤 → 谨慎调整动作）
  _smartStep5() {
    const v = this.obDraft;
    return `
      <h2>身体有没有不舒服？</h2>
      <p class="ob-desc">MING FIT 是训练辅助工具，不是医疗诊断工具。持续疼痛、损伤或疾病问题，建议咨询医生或物理治疗师。</p>
      <div class="field"><label>身体状况（可多选）</label>
        <div class="chip-grid">
          ${Object.entries(DB.RISKS).map(([k, t]) => `<div class="chip ${v.risks.includes(k) ? 'selected' : ''}" data-toggle-risk="${k}">${t}</div>`).join('')}
        </div>
      </div>
      <p class="ob-desc note">如有疼痛或损伤，系统会谨慎调整动作，避开相关动作。</p>
      <div class="step-nav">
        <button class="btn btn-ghost" data-smart-back>上一步</button>
        <button class="btn btn-accent" data-smart-next>生成方案</button>
      </div>`;
  },

  // SMART 问卷 6：YOUR SMART PLAN 展示（必须主动点击"启用这个方案"）
  _smartStepReview() {
    const ans = this._smartAnswers();
    const key = JSON.stringify([ans.goal, ans.bodyFocusList, ans.level, ans.daysPerWeek, ans.duration, ans.location, ans.equipment, ans.risks]);
    if (!this._smartCache || this._smartCacheKey !== key) {
      try {
        this._smartCache = Logic.generateSmartPlan(ans);
        this._smartCacheKey = key;
      } catch (e) {
        console.error('[MING FIT] generateSmartPlan failed:', e);
        this._smartCache = null;
      }
    }
    const smart = this._smartCache;
    if (!smart) {
      // 生成失败兜底：引导重新生成或使用 MING PLAN
      return `
        <h2>方案生成失败了。</h2>
        <p class="ob-desc">别担心，MING PLAN 正式训练表随时可用。</p>
        <div class="step-nav">
          <button class="btn btn-ghost" data-smart-back>返回上一步</button>
          <button class="btn btn-accent" data-go-ming>使用 MING PLAN →</button>
        </div>`;
    }
    const days = smart.days.map((day, i) => `
      <div class="sp-day">
        <div class="spd-head"><span class="spd-label">${day.label}</span><span class="spd-type">${day.type}</span></div>
        <div class="spd-name">${day.name}${day.muscles ? ' · ' + day.muscles : ''}</div>
        <div class="spd-ex">${Array.isArray(day.exercises) && day.exercises.length ? day.exercises.map(id => (EXERCISES[id] ? EXERCISES[id].cn : id)).join(' / ') : (day.type === '训练' ? '—' : day.name)}</div>
      </div>`).join('');
    return `
      <h2>YOUR SMART PLAN</h2>
      <p class="ob-desc">根据你的目标与条件生成的方案。确认后才会启用，不会覆盖 MING PLAN。</p>
      <div class="plan-banner">
        <div class="pb-kicker">YOUR PROGRAM</div>
        <div class="pb-name">${smart.name}</div>
        <div class="pb-sub">每周 ${smart.daysPerWeek} 练 · 每次 ${smart.duration} min · ${smart.week} 周</div>
      </div>
      <div class="sp-days">${days}</div>
      <p class="ob-desc note">${smart.risks && smart.risks.length ? '已注意你的身体状况，相关动作已谨慎调整。' : '生成方案仅供参考，训练时以自身状态为准。'}</p>
      <div class="step-nav">
        <button class="btn btn-ghost" data-smart-back>上一步</button>
        <button class="btn btn-accent" data-smart-enable>启用这个方案 →</button>
      </div>`;
  },

  // 问卷答案（兼容 buildPlan 输入结构）
  _smartAnswers() {
    const v = this.obDraft;
    const d = Store.get();
    const p = d.userProfile || d.profile || {};
    return {
      name: p.name || '明哥',
      gender: p.gender || 'male',
      age: p.age || 0, height: p.height || 0, weight: p.weight || 0,
      goal: v.goal || 'muscle',
      bodyFocus: (v.bodyFocusList && v.bodyFocusList[0]) || 'full',
      bodyFocusList: v.bodyFocusList || [],
      level: v.level || 'beginner',
      knownLifts: v.knownLifts || [],
      risks: v.risks || [],
      location: v.location || 'gym',
      daysPerWeek: v.daysPerWeek || 4,
      duration: v.duration || '60',
      equipment: (v.equipment && v.equipment.length) ? v.equipment : ['machine', 'dumbbell', 'cable', 'barbell']
    };
  },

  // SMART 启用确认弹窗（切换前必须确认）
  _smartEnableConfirm() {
    const sheet = document.createElement('div');
    sheet.className = 'sheet-mask';
    sheet.innerHTML = `
      <div class="sheet">
        <div class="sheet-title">启用 SMART PLAN？</div>
        <div class="sheet-sub">切换后不会删除任何训练记录、重量、身体数据与历史。MING PLAN 正式训练表仍保留在「我的」中，随时可以恢复。</div>
        <button class="btn btn-accent" data-confirm-enable style="width:100%;">确认启用</button>
        <button class="btn btn-ghost" data-sheet-cancel style="width:100%;margin-top:8px;">再想想</button>
      </div>`;
    document.body.appendChild(sheet);
    sheet.querySelector('[data-confirm-enable]').onclick = () => {
      sheet.remove();
      try {
        const ok = Logic.activateSmartPlan();
        const d = Store.get();
        d.onboardingCompleted = true;
        Store.save();
        this.renderApp();
        // CHANGE PLAN 里启用 SMART 后回到 MINE（onboarding 首次启用则默认进 TODAY）
        if (this._smartEnableFromChange || this._smartFromChange) {
          this._smartEnableFromChange = false;
          this._smartFromChange = false;
          this.switchTab('mine');
        }
        this._toast(ok ? 'SMART PLAN 已启用。' : '启用失败，请重试。');
      } catch (e) {
        console.error('[MING FIT] activateSmartPlan failed:', e);
        this._toast('启用时出了点问题，请重试。');
      }
    };
    sheet.querySelector('[data-sheet-cancel]').onclick = () => sheet.remove();
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.remove(); });
  },

  // 启用 MING PLAN（ACTIVATED 页确认后调用）
  _activateMing() {
    try {
      Logic.activateMingPlan();
      const d = Store.get();
      d.onboardingCompleted = true;
      Store.save();
      this.renderApp();
      this._toast('MING PLAN 已启用，欢迎回家。');
    } catch (e) {
      console.error('[MING FIT] activateMingPlan failed:', e);
      this._toast('启用时出了点问题，请重试。');
    }
  },

  // onboarding 交互绑定
  _bindOb() {
    const el = this.app;
    // WELCOME → 身体档案
    const start = el.querySelector('[data-ob-start]');
    if (start) start.onclick = () => { this.obStep = 1; this._ob(); };
    // 身体档案 → 保存并进入 CHOOSE YOUR PLAN
    const saveBody = el.querySelector('[data-ob-save-body]');
    if (saveBody) saveBody.onclick = () => { this._saveBodyProfile(); this.obStep = 2; this._ob(); };
    // 单项选择（chip data-set）
    el.querySelectorAll('.chip[data-set]').forEach(c => {
      c.onclick = () => {
        const set = c.dataset.set, v = c.dataset.v;
        this.obDraft[set] = set === 'daysPerWeek' ? Number(v) : v;
        this._ob();
      };
    });
    // 多选：重点部位
    el.querySelectorAll('[data-toggle-bodyfocus]').forEach(c => {
      c.onclick = () => {
        const k = c.dataset.toggleBodyfocus;
        const arr = this.obDraft.bodyFocusList;
        const i = arr.indexOf(k);
        if (i >= 0) arr.splice(i, 1); else arr.push(k);
        this._ob();
      };
    });
    // 多选：风险
    el.querySelectorAll('[data-toggle-risk]').forEach(c => {
      c.onclick = () => {
        const k = c.dataset.toggleRisk;
        const arr = this.obDraft.risks;
        const i = arr.indexOf(k);
        if (i >= 0) arr.splice(i, 1); else arr.push(k);
        if (k === 'other' && i < 0) this.obDraft.risks = ['other'];
        this._ob();
      };
    });
    // 多选：器械
    el.querySelectorAll('[data-toggle-equip]').forEach(c => {
      c.onclick = () => {
        const k = c.dataset.toggleEquip;
        const arr = this.obDraft.equipment;
        const i = arr.indexOf(k);
        if (i >= 0) arr.splice(i, 1); else arr.push(k);
        if (k === 'none' && i < 0) this.obDraft.equipment = ['none'];
        else if (k !== 'none') { const j = arr.indexOf('none'); if (j >= 0) arr.splice(j, 1); }
        this._ob();
      };
    });
    // 身体档案输入框实时更新
    ['ob-name','ob-age','ob-height','ob-weight','ob-target','ob-bodyfat','ob-waist','ob-chest','ob-arm','ob-hip','ob-thigh'].forEach(id => {
      const inp = el.querySelector('#' + id);
      if (inp) inp.oninput = () => {
        const map = { 'ob-name':'name','ob-age':'age','ob-height':'height','ob-weight':'weight','ob-target':'targetWeight','ob-bodyfat':'bodyfat','ob-waist':'waist','ob-chest':'chest','ob-arm':'arm','ob-hip':'hip','ob-thigh':'thigh' };
        this.obDraft[map[id]] = inp.value;
      };
    });
    // CHOOSE YOUR PLAN：MING
    const chooseMing = el.querySelector('[data-choose-ming]');
    if (chooseMing) chooseMing.onclick = () => { this.obBranch = 'ming'; this.obStep = 3; this._ob(); };
    // CHOOSE YOUR PLAN：SMART
    const chooseSmart = el.querySelector('[data-choose-smart]');
    if (chooseSmart) chooseSmart.onclick = () => { this.obBranch = 'smart'; this.smartStep = 0; this.obStep = 3; this._ob(); };
    // MING ACTIVATED → 启用
    const mingGo = el.querySelector('[data-ming-go]');
    if (mingGo) mingGo.onclick = () => this._activateMing();
    // 生成失败兜底 → 用 MING PLAN
    const goMing = el.querySelector('[data-go-ming]');
    if (goMing) goMing.onclick = () => this._activateMing();
    // SMART 问卷：上一步 / 下一步
    const smartBack = el.querySelector('[data-smart-back]');
    if (smartBack) smartBack.onclick = () => {
      if (this.obBranch !== 'smart') return;
      if (this.smartStep === 0 && this._smartFromChange) {
        this._smartFromChange = false;
        this.showChangePlan();
        return;
      }
      this.smartStep = Math.max(0, this.smartStep - 1);
      this._ob();
    };
    const smartNext = el.querySelector('[data-smart-next]');
    if (smartNext) smartNext.onclick = () => {
      if (this.obBranch !== 'smart') return;
      this.smartStep = Math.min(6, this.smartStep + 1);
      this._ob();
    };
    // SMART 启用
    const smartEnable = el.querySelector('[data-smart-enable]');
    if (smartEnable) smartEnable.onclick = () => this._smartEnableConfirm();
  },

  /* ================= 应用主体 ================= */
  renderApp() {
    this.view = 'app';
    this.app.innerHTML = `
      ${this._screen('today')}
      ${this._screen('plan')}
      ${this._screen('progress')}
      ${this._screen('mine')}
      ${this._tabbar()}
    `;
    this.switchTab('today');
  },

  _screen(id) {
    return `<div class="screen" id="screen-${id}"></div>`;
  },

  _tabbar() {
    const tabs = [
      ['today','今天'],['plan','计划'],['progress','进度'],['mine','我的']
    ];
    return `<div class="tabbar">${tabs.map(([id,lbl])=>`
      <button type="button" class="tab ${this.currentTab===id?'active':''}" data-tab="${id}">
        <span class="t-ico">${id==='today'?'TODAY':id==='plan'?'PLAN':id==='progress'?'STATS':'MINE'}</span>
        <span class="t-lbl">${lbl}</span>
      </button>`).join('')}</div>`;
  },

  switchTab(id) {
    this.currentTab = id;
    // 更新 tabbar
    const tb = this.app.querySelector('.tabbar');
    if (tb) {
      tb.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
    }
    // 关键：切换主内容 screen 的显示（CSS: .screen{display:none} .screen.active{display:block}）
    this.app.querySelectorAll('.screen').forEach(s => {
      s.classList.toggle('active', s.id === 'screen-' + id);
    });
    const map = { today: this.renderToday, plan: this.renderPlan, progress: this.renderProgress, mine: this.renderMine };
    // 单个页面渲染异常不能拖垮整个应用：隔离异常，保证 tab 始终可点
    try {
      map[id].call(this);
    } catch (e) {
      console.error('[MING FIT] render ' + id + ' failed:', e);
      const sc = this.app.querySelector('#screen-' + id);
      if (sc && sc.innerHTML.trim() === '') {
        sc.innerHTML = this._errorScreen('这一页出了点问题，但其他页面不受影响。');
        this._bindErrorScreen(sc);
      }
    }
    // 兜底：确保 tabbar 事件始终绑定（任何渲染路径都不能丢绑定）
    this._bindTabbar(this.app.querySelector('.tabbar'));
    this._debug('tab', id);
  },

  _errorScreen(msg) {
    return `
      <div class="screen-header">
        <div class="brand-row"><div class="brand" style="font-size:24px;">MING FIT</div></div>
      </div>
      <div class="today-card" style="text-align:center;padding:40px 24px;">
        <div class="today-label">SOMETHING BROKE</div>
        <div class="today-title" style="font-size:26px;margin-top:12px;">页面出了点问题</div>
        <div class="today-muscles" style="margin-top:12px;">${msg || '但训练计划还在。'}</div>
        <button class="btn" data-reload style="margin-top:24px;">重新加载 →</button>
        <button class="btn btn-dark" data-home style="margin-top:12px;">返回首页</button>
      </div>`;
  },

  _bindErrorScreen(sc) {
    const r = sc.querySelector('[data-reload]');
    if (r) r.onclick = () => window.location.reload();
    const h = sc.querySelector('[data-home]');
    if (h) h.onclick = () => { try { this.renderApp(); } catch(e){ window.location.reload(); } };
  },

  // 全局致命错误兜底：整屏白屏前救回来
  renderFatal(err) {
    console.error('[MING FIT] fatal:', err);
    try {
      this.app.innerHTML = this._errorScreen('页面出了点问题，但训练计划还在。');
      this._bindErrorScreen(this.app);
    } catch (e) {
      // 极端情况：连渲染兜底都失败，用最小化 HTML
      this.app.innerHTML = '<div style="padding:40px;color:#F5F5F3;font-family:sans-serif;text-align:center;">MING FIT<br><br>页面出了问题。<br><button onclick="location.reload()" style="margin-top:16px;padding:12px 24px;">重新加载</button></div>';
    }
  },

  /* ---------- 开发调试模式 ---------- */
  _debugActive: false,
  _debugTag: null,
  _debug(tag, msg) {
    if (!this._debugActive) return;
    if (!this._debugTag) {
      const d = document.createElement('div');
      d.id = 'ming-debug';
      d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:rgba(0,0,0,0.85);color:#7DD3FC;font:11px/1.6 monospace;padding:6px 10px;pointer-events:none;';
      document.body.appendChild(d);
      this._debugTag = d;
    }
    this._debugTag.textContent = 'MING FIT DEBUG | ' + tag + ': ' + msg + ' | tab: ' + (this.currentTab||'?') + ' | profile: ' + (this._hasValidProfile(Store.get()) ? 'yes' : 'no') + ' | plan: ' + (this._hasValidPlan(Store.get()) ? 'yes' : 'no') + ' | overlay: ' + (document.querySelector('.pr-flash,.done-flash') ? 'yes' : 'no');
  },

  /* ---------- 今天 ---------- */
  renderToday() {
    const d = Store.get();
    const sc = this.app.querySelector('#screen-today');
    if (!sc) return;
    try {
      if (!this._hasValidProfile(d)) { this._emptyProfile(sc); this._bindTabbar(sc); return; }
      if (!this._hasValidPlan(d)) { this._emptyPlan(sc, d.profile); this._bindTabbar(sc); return; }
    } catch (e) { console.error('[MING FIT] renderToday guard:', e); this._bindTabbar(sc); return; }

    const name = d.profile ? d.profile.name : '明哥';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
    // 今日训练类型：由 每周安排(含本周临时调整) 决定
    const dow = new Date().getDay();
    const dayIndex = (dow + 6) % 7;
    const dayType = Logic.todayType(); // STRENGTH | CARDIO | ACTIVE_RECOVERY | FULL_REST
    const isTraining = dayType === 'STRENGTH' || dayType === 'CARDIO';
    const isCardio = dayType === 'CARDIO';
    const isStrength = dayType === 'STRENGTH';
    const isActiveRecovery = dayType === 'ACTIVE_RECOVERY';
    const isFullRest = dayType === 'FULL_REST';
    const workout = Logic.buildTodayWorkout(d.profile, d.plan) || { totalSets: 0, exercises: [] };
    const todayDone = d.workouts && d.workouts.find(w => w.dateKey === Store.todayKey());
    // 训练进行中（暂离未结束）：START 变 CONTINUE + 显示进度
    const inProgress = !!(todayDone && todayDone.inProgress);
    // 首页进度行数据（进行中）：已完成动作 / 已完成组数 / 累计分钟
    let progEx = 0, progSets = 0, progTotalSets = 0, progMin = 0;
    if (inProgress && todayDone) {
      const recs = todayDone.records || [];
      progEx = recs.filter(r => ((r.done || []).length > 0) || r.skipped).length;
      progSets = recs.reduce((a, r) => a + (r.done || []).length, 0);
      progTotalSets = todayDone.setsTotal || recs.reduce((a, r) => a + (r.setsTotal || 1), 0);
      progMin = Math.max(0, Math.round((Date.now() - (todayDone.startTs || Date.now())) / 60000));
    }
    const week = Logic.weeklySessions();
    const rate = Logic.completionRate();

    // 今天卡片标题/内容
    let title, label, muscles, stats, startBtn;
    if (isStrength) {
      const tpl = Logic.strengthTemplateFor(dayIndex);
      title = tpl.name;
      label = 'STRENGTH DAY';
      muscles = tpl.cn + ' · ' + tpl.muscles;
      stats = `
        <div class="today-stat"><div class="num">${tpl.restNote || 0}</div><div class="lbl">MIN</div></div>
        <div class="today-stat"><div class="num">${workout.totalSets || 0}</div><div class="lbl">SETS</div></div>
        <div class="today-stat"><div class="num">${(workout.exercises||[]).length}</div><div class="lbl">EX</div></div>`;
      startBtn = `<button class="btn" data-start-workout>${inProgress ? 'CONTINUE WORKOUT' : (todayDone ? '继续训练' : 'START WORKOUT')} →</button>`;
    } else if (isCardio) {
      const cpl = Logic.cardioTemplateFor(dayIndex);
      title = cpl.name;
      label = 'CARDIO DAY';
      muscles = cpl.cn + ' · ' + cpl.intensity + '强度';
      stats = `
        <div class="today-stat"><div class="num">${cpl.targetMin[1]}</div><div class="lbl">MIN</div></div>
        <div class="today-stat"><div class="num">${cpl.profile}</div><div class="lbl">坡度/速度</div></div>
        <div class="today-stat"><div class="num">${cpl.stages.length}</div><div class="lbl">阶段</div></div>`;
      startBtn = `<button class="btn" data-start-workout>${todayDone ? '继续训练' : 'START CARDIO'} →</button>`;
    } else if (isActiveRecovery) {
      const ar = Logic.activeRecoveryTemplateFor();
      title = ar.name;
      label = 'ACTIVE RECOVERY';
      muscles = ar.cn + ' · 轻度有氧 + 拉伸';
      stats = `
        <div class="today-stat"><div class="num">${ar.targetMin[1]}</div><div class="lbl">MIN</div></div>
        <div class="today-stat"><div class="num">${ar.stretchMin}</div><div class="lbl">拉伸</div></div>
        <div class="today-stat"><div class="num">${ar.options.length}</div><div class="lbl">可选</div></div>`;
      startBtn = `<button class="btn" data-start-workout>${todayDone ? '继续恢复' : '开始主动恢复'} →</button>`;
    } else if (isFullRest) {
      const fr = Logic.fullRestTemplateFor();
      title = fr.name;
      label = 'FULL REST';
      muscles = Persona.get('restDay');
      stats = `
        <div class="today-stat"><div class="num">R</div><div class="lbl">休息</div></div>
        <div class="today-stat"><div class="num">${(fr.optional||[]).length}</div><div class="lbl">可选</div></div>`;
      startBtn = `<button class="btn btn-dark" data-start-workout>完成完全恢复日</button>`;
    } else {
      title = 'REST DAY';
      label = 'REST DAY';
      muscles = Persona.get('restDay');
      stats = `
        <div class="today-stat"><div class="num">20</div><div class="lbl">MIN</div></div>
        <div class="today-stat"><div class="num">60%</div><div class="lbl">强度</div></div>`;
      startBtn = `<button class="btn btn-dark" data-start-workout>完成恢复日</button>`;
    }

    const isEvening = hour >= 20;
    // 方案来源角标（训练主卡右上角：MING PLAN / SMART PLAN，仅显示方案名）
    const planInfo = Logic.currentPlanInfo();
    const planCorner = planInfo && planInfo.type ? `<div class="plan-corner">${planInfo.name}</div>` : '';
    // 里程碑 / 提醒触发
    const streak = d.streak || 0;
    const lastKey = d.lastWorkoutDateKey;
    let daysAway = 999;
    if (lastKey) {
      const t = new Date(), l = new Date(lastKey);
      daysAway = Math.round((t - l) / 86400000);
      if (daysAway < 0) daysAway = 0;
    }
    const awayLong = !todayDone && lastKey && daysAway >= 4 && !isTraining;
    const streakMilestone = !todayDone && streak >= 3;
    const overTrained = !todayDone && streak >= 4 && isStrength;

    // ===== DAILY PUSH 每日一句（首页动态文案系统）=====
    // 每次只显示一条；CARE MODE 强制温和并关闭对手刺激；RIVAL MODE 关闭时不出对手文案
    const rivalMode = DailyPush.rivalEnabled();
    const careMode = Persona.softMode() || overTrained;
    const restDay = !isTraining;
    let dailyHtml;
    if (isEvening) {
      // 晚间安全提醒（时间场景，保持原有逻辑）
      dailyHtml = `<div class="one-liner">${Persona.get('evening')}</div>`;
    } else if (todayDone && !inProgress) {
      // 训练完成 → 完成文案（不显示"你还在看首页？"类刺激）
      dailyHtml = this._dailyPushHtml(DailyPush.pickHome({ done: true, care: false, rivalMode }));
    } else if (awayLong) {
      dailyHtml = `<div class="one-liner">${Persona.get('away4')}</div>`;
    } else if (streakMilestone) {
      dailyHtml = `<div class="one-liner">${Persona._milestone(streak)}</div>`;
    } else {
      const item = DailyPush.pickHome({ done: false, restDay, care: careMode, rivalMode });
      // RIVAL CHECK 特殊彩蛋：低概率（10%），点击"那还等什么 →"直接进今天训练
      const rivalCheck = DailyPush.rivalCheckEligible({ rivalMode, care: careMode, done: false, restDay });
      dailyHtml = this._dailyPushHtml(item, { rivalCheck });
    }

    sc.innerHTML = `
      <div class="screen-header">
        <div class="brand-row">
          <div>
            <div class="brand">MING FIT</div>
            <div class="brand-sub">STRONGER THAN YESTERDAY</div>
          </div>
          <button class="adjust-btn" data-today-adjust>调整今天</button>
        </div>
        <div class="greeting">${greeting}，<span class="tag">${name}。</span></div>
        ${dailyHtml}
      </div>

      <div class="today-card">
        ${planCorner}
        <div class="today-label">${label}</div>
        <div class="today-title">${title}</div>
        <div class="today-muscles">${muscles}</div>
        <div class="today-stats">
          ${stats}
        </div>
        ${inProgress && isStrength ? `
        <div class="progress-line">
          <div class="pl-status">WORKOUT IN PROGRESS</div>
          <div class="pl-meta">${progEx} / ${(workout.exercises || []).length} EXERCISES · ${progSets} / ${progTotalSets} SETS · ${progMin} MIN</div>
        </div>` : ''}
        ${startBtn}
        ${inProgress && isStrength ? `<div class="progress-hint">继续训练</div>` : ''}
      </div>

      <div class="week-strip">
        <div class="week-cell"><div class="num ${week>0?'accent':''}">${week}</div><div class="lbl">本周训练</div></div>
        <div class="week-cell"><div class="num">${d.streak || 0}</div><div class="lbl">连续 DAYS</div></div>
        <div class="week-cell"><div class="num">${rate}%</div><div class="lbl">完成率</div></div>
      </div>

      ${this._smartCoachCard(d, dayType, todayDone && !inProgress, overTrained, isCardio, isActiveRecovery)}
    `;

    sc.querySelectorAll('[data-today-adjust]').forEach(b => b.onclick = () => this.showTodayAdjust());

    // RIVAL CHECK 彩蛋按钮：那还等什么 → 直接进入今天训练
    const rivalBtn = sc.querySelector('[data-rival-go]');
    if (rivalBtn) rivalBtn.onclick = () => {
      if (isStrength) this.startWorkout();
      else if (isCardio) this.startCardio();
      else if (isActiveRecovery) this._startActiveRecoveryFlow();
      else if (isFullRest) this._startFullRestFlow();
      else this._startRecoveryFlow();
    };

    const btn = sc.querySelector('[data-start-workout]');
    if (btn) btn.onclick = () => {
      if (isStrength) this.startWorkout();
      else if (isCardio) this.startCardio();
      else if (isActiveRecovery) this._startActiveRecoveryFlow();
      else if (isFullRest) this._startFullRestFlow();
      else this._startRecoveryFlow();
    };
    this._bindSmartCoach(sc, dayType, todayDone);
    this._bindTabbar(sc);
  },

  // DAILY PUSH 渲染：轻量标签 + 一句文案；RIVAL CHECK 为特殊彩蛋格式
  _dailyPushHtml(item, opts) {
    const o = opts || {};
    if (!item) return '';
    if (o.rivalCheck) {
      const rows = RIVALS.map(r => `${r}：状态未知`).join('<br>');
      return `
        <div class="daily-push rival-check">
          <div class="dp-tag">RIVAL CHECK</div>
          <div class="dp-text">${rows}<br><span class="dp-you">明哥：今天还没练</span></div>
          <button class="btn btn-accent" data-rival-go style="margin-top:14px;">那还等什么 →</button>
        </div>`;
    }
    return `
      <div class="daily-push">
        <div class="dp-tag">DAILY PUSH</div>
        <div class="dp-text">${item.text}</div>
      </div>`;
  },

  // 训练日专属文案池名：周一臀腿 / 周三胸肩手臂 / 周五背肩后束
  _dayPool(dayIndex, kind) {
    if (kind === 'strength') {
      if (dayIndex === 0) return 'legs';
      if (dayIndex === 2) return 'push';
      if (dayIndex === 4) return 'pull';
      return 'strength';
    }
    // cardio
    if (dayIndex === 1 || dayIndex === 5) return 'hill';
    return 'cardio';
  },

  /* ============================================================
     SMART COACH CARD
     MING FIT 给动作，妍宝只说人话。
     四种模式：训练前 CHECK-IN / 训练完成 REVIEW / 恢复日 TASKS / 状态差 CARE
     ============================================================ */
  _smartCoachCard(d, dayType, todayDone, overTrained, isCardio, isActiveRecovery) {
    const key = Store.todayKey();
    const tag = this._tagFor('coach');

    // —— 训练日（力量/有氧）已开始但未完成 → 显示 CHECK-IN ——
    // —— 训练已完成 → TODAY REVIEW ——
    if (dayType === 'STRENGTH' || dayType === 'CARDIO') {
      if (todayDone) {
        const rv = (d.reviews || {})[key];
        return this._reviewCard(d, key, rv);
      }
      return this._checkinCard(d, key, tag, overTrained, isCardio);
    }

    // —— 恢复日（主动恢复/完全恢复）→ RECOVERY TASKS ——
    return this._recoveryCard(d, key, tag, dayType);
  },

  /* ---------- 训练前 TODAY CHECK-IN ---------- */
  _checkinCard(d, key, tag, overTrained, isCardio) {
    const ci = (d.checkins || {})[key] || {};
    // 判断是否已生成调整
    const hasAdjust = !!ci.energy && !!ci.sleep;
    const checkin = hasAdjust ? Logic.computeCheckin(ci.energy, ci.sleep) : null;

    // CARE 判断：状态很差 / 连续疲劳 / 连续多天训练
    const wiped = ci.energy === 'wiped';
    const badSleep = ci.sleep === 'bad';
    const careMode = (wiped || badSleep || Logic.fatigueHigh() || overTrained) && hasAdjust;

    // 妍宝一句：care 强制温和，否则按模式取
    let yanLine = '';
    if (hasAdjust) {
      const pool = careMode ? 'care' : (checkin && checkin.mode === 'light' ? 'checkin_light' : (checkin && checkin.mode === 'full' ? 'checkin_great' : 'checkin_hold'));
      yanLine = careMode ? Persona.coach('care', true) : Persona.coach(pool);
    }

    const energyOpts = [['great','状态不错'],['good','一般'],['tired','有点累'],['wiped','很疲惫']];
    const sleepOpts = [['great','睡得好'],['good','一般'],['bad','睡得差']];

    const startLabel = isCardio ? 'START CARDIO →' : 'START WORKOUT →';
    const kicker = isCardio ? 'CARDIO CHECK-IN' : 'TODAY CHECK-IN';
    const desc = isCardio
      ? '先告诉系统你现在的状态，有氧的时长和强度会根据它调整。'
      : '先告诉系统你现在的状态，今天的强度会根据它调整。';

    return `
      <div class="coach-card">
        <div class="cc-head">
          <div class="cc-kicker">${kicker}</div>
          <div class="cc-step">${hasAdjust ? '已生成建议' : '1 · 2'}</div>
        </div>
        ${!hasAdjust ? `
        <div class="cc-desc">${desc}</div>
        <div class="cc-field"><label>今日状态</label>
          <div class="seg-row">
            ${energyOpts.map(([k,l]) => `<div class="seg ${ci.energy===k?'sel':''}" data-ci-energy="${k}"><span>${l}</span></div>`).join('')}
          </div>
        </div>
        <div class="cc-field"><label>昨晚睡眠</label>
          <div class="seg-row">
            ${sleepOpts.map(([k,l]) => `<div class="seg ${ci.sleep===k?'sel':''}" data-ci-sleep="${k}"><span>${l}</span></div>`).join('')}
          </div>
        </div>` : `
        <div class="cc-summary ${careMode?'care':''}">
          <div class="cc-s-title">${careMode ? (wiped||badSleep ? 'RECOVERY BIAS' : 'CARE MODE') : (checkin && checkin.title || 'TODAY ADJUSTMENT')}</div>
          <div class="cc-s-txt">${careMode ? (isCardio ? '今天有氧改低强度、短时长。动一动就行，别跟自己较劲。' : '今天以完成和动作质量为主。不追纪录，别硬撑。') : (checkin ? checkin.summary : '')}</div>
        </div>
        <div class="cc-items">
          ${(checkin && checkin.items ? checkin.items : []).map(it => `<div class="cc-item"><span class="ci-k">${it.t}</span><span class="ci-v">${it.d}</span></div>`).join('')}
        </div>
        <div class="cc-btn-row">
          <button class="btn btn-sm btn-ghost" data-ci-reset>重新选择</button>
          <button class="btn btn-sm btn-accent" data-start-workout>${startLabel}</button>
        </div>
        ${yanLine ? `<div class="hua-msg"><div class="hm-tag">${tag}</div><div class="hm-txt">${yanLine}</div></div>` : ''}
        `}
      </div>`;
  },

  /* ---------- 训练完成 TODAY REVIEW ----------
     一个状态，一个结论：选择后只给一句系统反馈（强度结论 + 下次调整建议）。
     不叠加妍宝语录 / 额外鸡汤 / 第二次建议。 */
  _reviewCard(d, key, rv) {
    const reviewOpts = [['easy','轻松'],['just','正好'],['hard','很累']];
    return `
      <div class="coach-card">
        <div class="cc-head">
          <div class="cc-kicker">TODAY REVIEW</div>
          <div class="cc-step">训练完成</div>
        </div>
        <div class="cc-desc">今天练下来感觉怎么样？这个反馈会进入下一次计划。</div>
        <div class="seg-row">
          ${reviewOpts.map(([k,l]) => `<div class="seg ${rv===k?'sel':''}" data-review="${k}"><span>${l}</span></div>`).join('')}
        </div>
        ${rv ? this._reviewFeedback(rv) : ''}
      </div>`;
  },

  // REVIEW 选择后的系统反馈：一句强度结论 + 下一次调整建议（强制系统直说池，不出现妍宝）
  _reviewFeedback(rv) {
    const pool = rv === 'easy' ? 'review_easy' : rv === 'hard' ? 'review_hard' : 'review_just';
    let sysMsg = Persona.coach(pool, 'sys');
    // 连续两次很累 → 明确提示将降量（属于"下一次调整建议"，替换为更明确的结论）
    const fatigue = Logic.fatigueHigh();
    if (rv === 'hard' && fatigue) {
      sysMsg = '系统记录：连续两次训练感觉吃力。下次训练量将降低约 10%，并观察恢复。';
    }
    return `
      <div class="cc-feedback">
        <div class="cf-txt">${sysMsg}</div>
      </div>`;
  },

  /* ---------- 恢复日 RECOVERY TASKS ----------
     ACTIVE_RECOVERY（周四）：轻度有氧二选一 + 全身拉伸 + 恢复提醒卡
     FULL_REST（周日）：充分休息，可选轻度活动，不要求训练 */
  _recoveryCard(d, key, tag, dayType) {
    const isActive = dayType === 'ACTIVE_RECOVERY';
    const ar = Logic.activeRecoveryTemplateFor();
    const fr = Logic.fullRestTemplateFor();

    // 任务列表：主动恢复 = 轻度有氧 + 拉伸 + 提醒；完全恢复 = 休息确认项
    const tasks = isActive ? [
      { id: 0, en: 'LIGHT CARDIO 35-40', cn: '轻度有氧 35-40 分钟（跑步机慢走 / 椭圆机低阻力）' },
      { id: 1, en: 'FULL STRETCH 15 MIN', cn: '全身静态拉伸 15 分钟' },
      { id: 2, en: 'CREATINE + WATER', cn: '补充肌酸 · 多喝水' },
      { id: 3, en: 'LIGHT DIET · REST', cn: '饮食清淡 · 注意恢复' }
    ] : [
      { id: 0, en: 'FULL REST', cn: '充分休息全天，不做力量' },
      { id: 1, en: 'LIGHT WALK OK', cn: '可选：散步 / 轻度拉伸（不勉强）' },
      { id: 2, en: 'EAT WELL', cn: '好好吃饭 · 好好睡觉' },
      { id: 3, en: 'NO EXTRA TRAINING', cn: '不加练。休息也是计划的一部分' }
    ];
    const stats = Logic.recoveryStats(key, tasks.length);
    const doneArr = ((d.recovery || {})[key] || {}).done || [];
    const partial = stats.doneCount > 0 && stats.doneCount < stats.total;
    const allDone = stats.doneCount >= stats.total;

    // 完成按钮可用：至少完成 2 个任务，或已全部完成
    const canConfirm = stats.doneCount >= 2;

    // 恢复提醒卡（仅主动恢复日显示）
    const remindCard = isActive ? `
      <div class="recovery-remind">
        <div class="rr-h">今日恢复提醒</div>
        <div class="rr-items">${(ar.reminders || []).map(r => `<span class="rr-chip">${r}</span>`).join('')}</div>
      </div>` : '';

    let body;
    if (stats.confirmed) {
      // 已确认恢复日
      body = `
        <div class="cc-summary done">
          <div class="cc-s-title">RECOVERY DONE</div>
          <div class="cc-s-txt">${isActive ? '主动恢复已记录。身体恢复到位，明天可以放心练。' : '完全恢复已记录。休息到位，明天满状态开练。'}</div>
        </div>
        <div class="hua-msg"><div class="hm-tag">${tag}</div><div class="hm-txt">${Persona.coach('recovery_done', true)}</div></div>
        <div class="cc-progress"><span>${stats.doneCount} / ${stats.total}</span><div class="cc-bar"><i style="width:${Math.round(stats.doneCount/stats.total*100)}%"></i></div></div>`;
    } else {
      body = `
        <div class="cc-desc">${isActive ? '今天是主动恢复日。轻度活动 + 拉伸，促进恢复，不强练。' : '今天是完全恢复日。任务只有一个：好好休息。'}</div>
        ${remindCard}
        <div class="cc-tasks">
          ${tasks.map((t,i) => `<div class="cc-task ${doneArr[i]?'done':''}" data-task="${i}"><span class="ct-check">${doneArr[i]?'✓':''}</span><span class="ct-txt">${t.en}<small>${t.cn}</small></span></div>`).join('')}
        </div>
        ${stats.doneCount ? `<div class="cc-progress"><span>${stats.doneCount} / ${stats.total}</span><div class="cc-bar"><i style="width:${Math.round(stats.doneCount/stats.total*100)}%"></i></div></div>` : ''}
        ${partial ? `<div class="cc-hint">${Persona.coach('recovery_hint')}</div>` : ''}
        <div class="cc-btn-row">
          <button class="btn btn-sm btn-accent" data-confirm-recovery ${canConfirm?'':'disabled'}>${allDone ? '完成恢复日 ✓' : (canConfirm ? '完成恢复日' : '至少完成 2 项可确认')}</button>
        </div>
        ${canConfirm && !allDone ? `<div class="cc-sub-hint">可以提前确认，但建议把 ${stats.total} 项都完成。未完成项不会计入恢复记录。</div>` : ''}`;
    }

    return `
      <div class="coach-card">
        <div class="cc-head">
          <div class="cc-kicker">${isActive ? 'ACTIVE RECOVERY TASKS' : 'FULL REST'}</div>
          <div class="cc-step">${stats.confirmed ? '已完成' : (stats.doneCount + ' / ' + stats.total)}</div>
        </div>
        ${body}
      </div>`;
  },

  /* ---------- SMART COACH 交互绑定 ---------- */
  _bindSmartCoach(sc, dayType, todayDone) {
    const d = Store.get();
    const key = Store.todayKey();

    // CHECK-IN 状态/睡眠选择
    sc.querySelectorAll('[data-ci-energy]').forEach(el => {
      el.onclick = () => {
        const d2 = Store.get();
        d2.checkins = d2.checkins || {};
        d2.checkins[key] = Object.assign({}, d2.checkins[key] || {}, { energy: el.dataset.ciEnergy });
        Store.save();
        this.renderToday();
      };
    });
    sc.querySelectorAll('[data-ci-sleep]').forEach(el => {
      el.onclick = () => {
        const d2 = Store.get();
        d2.checkins = d2.checkins || {};
        d2.checkins[key] = Object.assign({}, d2.checkins[key] || {}, { sleep: el.dataset.ciSleep });
        Store.save();
        this.renderToday();
      };
    });
    sc.querySelectorAll('[data-ci-reset]').forEach(el => {
      el.onclick = () => {
        const d2 = Store.get();
        delete d2.checkins[key];
        Store.save();
        this.renderToday();
      };
    });

    // REVIEW 选择
    sc.querySelectorAll('[data-review]').forEach(el => {
      el.onclick = () => {
        const d2 = Store.get();
        d2.reviews = d2.reviews || {};
        d2.reviews[key] = el.dataset.review;
        // 更新连续主观疲劳计数
        d2.reviewStreak = d2.reviewStreak || { hard: 0, easy: 0 };
        if (el.dataset.review === 'hard') d2.reviewStreak.hard = (d2.reviewStreak.hard || 0) + 1;
        else if (el.dataset.review === 'easy') d2.reviewStreak.easy = (d2.reviewStreak.easy || 0) + 1;
        Store.save();
        this.renderToday();
      };
    });

    // 恢复日任务打勾
    sc.querySelectorAll('[data-task]').forEach(el => {
      el.onclick = () => {
        const d2 = Store.get();
        const idx = Number(el.dataset.task);
        d2.recovery = d2.recovery || {};
        const rec = d2.recovery[key] || {};
        const arr = Array.isArray(rec.done) ? rec.done.slice() : [false,false,false,false];
        arr[idx] = !arr[idx];
        d2.recovery[key] = Object.assign({}, rec, { done: arr });
        Store.save();
        this.renderToday();
      };
    });

    // 确认恢复日
    sc.querySelectorAll('[data-confirm-recovery]').forEach(el => {
      el.onclick = () => {
        const dayType = Logic.todayType();
        const isActive = dayType === 'ACTIVE_RECOVERY';
        const ar = Logic.activeRecoveryTemplateFor();
        const taskTotal = isActive ? (ar.options ? 4 : 4) : 4;
        const stats = Logic.recoveryStats(key, taskTotal);
        if (stats.doneCount < 2) {
          this._toast('至少完成 2 个恢复任务才能确认。');
          return;
        }
        const d2 = Store.get();
        d2.recoveryConfirmed = d2.recoveryConfirmed || {};
        if (!d2.recoveryConfirmed[key]) {
          d2.recoveryConfirmed[key] = true;
          // 记录到 workout 历史（仅首次）——按真实恢复类型记录
          if (!d2.workouts.find(w => w.dateKey === key)) {
            d2.workouts.push({ dateKey: key, type: isActive ? 'ACTIVE_RECOVERY' : 'FULL_REST', planDay: isActive ? '主动恢复' : '完全恢复', duration: isActive ? 55 : 20, volume: 0, setsDone: 0, setsTotal: 0, records: [], prs: [], recoveryTasks: stats.doneCount });
            this._updateStreak(key);
          }
        }
        Store.save();
        this._toast(isActive ? '主动恢复完成，已记录。' : '完全恢复完成，已记录。');
        this.renderToday();
      };
    });
  },

  // 主动恢复日入口（周四）：展示轻度有氧二选一 + 恢复提醒
  _startActiveRecoveryFlow() {
    const d = Store.get();
    const ar = Logic.activeRecoveryTemplateFor();
    this.view = 'cardio';
    this.app.innerHTML = `
      <div class="workout-screen">
        <div class="ex-header"><div class="ex-count">ACTIVE RECOVERY</div></div>
        <div class="ex-title" style="margin-top:10px;">选择今天的轻度有氧</div>
        <div class="one-liner" style="margin-top:8px;">主动恢复：轻度活动 ${ar.targetMin[0]}-${ar.targetMin[1]} MIN + 全身拉伸 ${ar.stretchMin} MIN</div>

        <div class="cardio-methods">
          ${ar.options.map(o => `<div class="cardio-m" data-cd-method="${o.id}"><span class="cm-en">${o.en}</span><span class="cm-cn">${o.cn}<small>${o.profile}</small></span></div>`).join('')}
        </div>

        <div class="field" style="margin-top:24px;"><label>目标时长（分钟）</label>
          <input type="number" class="cardio-input" data-cd-min value="${ar.targetMin[1]}" min="5" max="120">
        </div>
        <div class="field"><label>训练强度</label>
          <div class="seg-row">
            ${[['LOW','低'],['MED','中等']].map(([k,l]) => `<div class="seg ${k==='LOW'?'sel':''}" data-cd-intensity="${k}"><span>${l}</span></div>`).join('')}
          </div>
        </div>

        <div class="recovery-remind" style="margin-top:18px;">
          <div class="rr-h">今日恢复提醒</div>
          <div class="rr-items">${(ar.reminders || []).map(r => `<span class="rr-chip">${r}</span>`).join('')}</div>
        </div>

        <div class="step-nav" style="margin-top:30px;">
          <button class="btn btn-ghost" data-cancel-cardio>取消</button>
          <button class="btn btn-accent" data-start-cardio-session>开始 →</button>
        </div>
      </div>`;

    const sc = this.app;
    let method = ar.options[0].id;
    sc.querySelectorAll('[data-cd-method]').forEach(el => {
      el.onclick = () => {
        sc.querySelectorAll('[data-cd-method]').forEach(x => x.classList.remove('sel'));
        el.classList.add('sel');
        method = el.dataset.cdMethod;
      };
    });
    sc.querySelectorAll('[data-cancel-cardio]').forEach(b => b.onclick = () => this.renderApp());
    sc.querySelectorAll('[data-start-cardio-session]').forEach(b => {
      b.onclick = () => {
        const d2 = Store.get();
        const min = Number(sc.querySelector('[data-cd-min]').value) || ar.targetMin[1];
        d2.cardioPrefs = Object.assign({}, d2.cardioPrefs || {}, { method, targetMin: min });
        Store.save();
        this._beginActiveRecoverySession();
      };
    });
  },

  _beginActiveRecoverySession() {
    const d = Store.get();
    this.view = 'cardio';
    this._cardioStart = Date.now();
    this._cardioRunning = true;
    this._tick();
    this._cardioT = setInterval(() => this._tick(), 1000);

    this.app.innerHTML = `
      <div class="workout-screen">
        <div class="ex-header"><div class="ex-count">ACTIVE RECOVERY</div></div>
        <div class="cardio-timer" data-cd-timer>00:00</div>
        <div class="one-liner" style="text-align:center;margin-top:6px;">低强度，别上头。今天的目的是恢复。</div>
        <div class="step-nav" style="margin-top:40px;">
          <button class="btn btn-accent" data-finish-cardio>完成恢复</button>
        </div>
      </div>`;
    this.app.querySelector('[data-finish-cardio]').onclick = () => this._finishCardio();
  },

  // 完全恢复日入口（周日）：确认休息即可
  _startFullRestFlow() {
    const d = Store.get();
    const key = Store.todayKey();
    if (d.recoveryConfirmed && d.recoveryConfirmed[key]) {
      this._toast('今天已经确认休息啦。');
      this.renderToday();
      return;
    }
    // 直接打开 RECOVERY TASKS（FULL REST 版）
    this.renderToday();
  },

  // 恢复日入口：先展示 SMART COACH 卡片（由 renderToday 渲染），这里作为 START 兜底
  _startRecoveryFlow() {
    this.renderToday();
  },

  _updateStreak(key) {
    const d = Store.get();
    d.lastWorkoutDateKey = key;
    d.streak = (d.streak || 0) + 1;
    d.totalSessions = (d.totalSessions || 0) + 1;
  },

  /* ---------- 计划 ---------- */
  renderPlan() {
    const d = Store.get();
    const sc = this.app.querySelector('#screen-plan');
    if (!sc) return;
    if (!this._hasValidProfile(d)) { this._emptyProfile(sc); this._bindTabbar(sc); return; }
    if (!this._hasValidPlan(d)) {
      // 无方案 → 空态引导去选择训练方案
      sc.innerHTML = `
        <div class="screen-header">
          <div class="brand-row"><div class="brand" style="font-size:24px;">PLAN</div></div>
          <div class="brand-sub" style="margin-top:4px;">你的专属训练计划</div>
        </div>
        <div class="today-card" style="text-align:center;padding:40px 24px;">
          <div class="today-label">NO PLAN</div>
          <div class="today-title" style="font-size:30px;margin-top:12px;">还没有选择训练方案</div>
          <div class="today-muscles" style="margin-top:12px;">从 MING PLAN 或 SMART PLAN 里选一个，开始安排每周训练。</div>
          <button class="btn" data-choose-plan style="margin-top:24px;">选择训练方案 →</button>
        </div>`;
      const b = sc.querySelector('[data-choose-plan]');
      if (b) b.onclick = () => this._goChoosePlan();
      this._bindTabbar(sc);
      return;
    }

    const daysCn = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const daysEn = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const wc = Logic.weekCompletion();
    const planInfo2 = Logic.currentPlanInfo();
    const planBadge2 = planInfo2 ? `<div class="plan-badge">PLAN · ${planInfo2.name}${planInfo2.subtitle ? ' ' + planInfo2.subtitle : ''}</div>` : '';

    sc.innerHTML = `
      <div class="screen-header">
        <div class="brand-row"><div class="brand" style="font-size:24px;">PLAN</div></div>
        <div class="brand-sub" style="margin-top:4px;">每周训练计划 · 以本周安排为准</div>
        ${planBadge2}
      </div>

      <div class="today-card">
        <div class="today-label">YOUR WEEKLY SCHEDULE</div>
        <div class="today-title" style="font-size:34px;">正式训练计划</div>
        <div class="today-muscles" style="margin-top:10px;font-size:13px;">力量 3 天 · 有氧 2 天 · 主动恢复 1 天 · 完全恢复 1 天</div>
        <div class="plan-type-row">
          <div class="pt-chip pt-strength">STRENGTH × ${wc.strength.planned}</div>
          <div class="pt-chip pt-cardio">CARDIO × ${wc.cardio.planned}</div>
          <div class="pt-chip pt-ar">ACTIVE RECOVERY × ${wc.activeRecovery.planned}</div>
          <div class="pt-chip pt-fr">FULL REST × ${wc.fullRest.planned}</div>
        </div>
      </div>

      <div class="prog-section-t">本周安排</div>
      ${daysCn.map((cn, i) => this._planDayCard(i, cn, daysEn[i])).join('')}

      <div class="prog-section-t">动作库 · 点击卡片查看完整指南</div>
      ${Object.entries(EXERCISES).map(([id, ex]) => this._exDetailCard(id, ex)).join('')}
    `;
    sc.querySelectorAll('[data-plan-day]').forEach(b => {
      b.onclick = () => this._showPlanDayDetail(Number(b.dataset.planDay));
    });
    sc.querySelectorAll('[data-guide]').forEach(b => {
      b.onclick = () => this._showExerciseGuide(b.dataset.guide);
    });
    this._bindTabbar(sc);
  },

  // 计划页：单天卡片（按真实类型渲染）
  _planDayCard(i, cn, en) {
    const type = Logic.typeFor(i);
    const m = this._typeMeta(type);
    let title, sub, meta = '', detail = '';
    if (type === 'STRENGTH') {
      const tpl = Logic.strengthTemplateFor(i);
      const exs = (tpl.exercises || []).map(id => EXERCISES[id]).filter(Boolean);
      const sets = exs.reduce((s, e) => s + (e.sets || 0), 0);
      title = tpl.name;
      sub = tpl.cn + ' · ' + tpl.muscles;
      meta = `${sets} SETS · ${exs.length} 动作`;
      detail = exs.map(e => `${e.cn} ${e.sets}×${Array.isArray(e.reps) ? e.reps[1] : e.reps}${e.type === 'time' ? ' ' + e.timeUnit : ' 次'}`).join(' · ');
    } else if (type === 'CARDIO') {
      const cpl = Logic.cardioTemplateFor(i);
      title = cpl.name;
      sub = cpl.cn + ' · ' + cpl.intensity + '强度';
      meta = `${cpl.targetMin[1]} MIN · ${cpl.stages.length} 阶段`;
      detail = cpl.stages.join(' → ');
    } else if (type === 'ACTIVE_RECOVERY') {
      const ar = Logic.activeRecoveryTemplateFor();
      title = ar.name;
      sub = ar.cn + ' · 轻度有氧 + 拉伸';
      meta = `${ar.targetMin[1]} MIN · 拉伸 ${ar.stretchMin} MIN`;
      detail = ar.options.map(o => o.cn + '（' + o.profile + '）').join(' 或 ');
    } else {
      const fr = Logic.fullRestTemplateFor();
      title = fr.name;
      sub = fr.cn + ' · 充分休息';
      meta = '休息日';
      detail = fr.note + (fr.optional || []).join(' / ');
    }
    const isToday = ((new Date().getDay() + 6) % 7) === i;
    return `
      <div class="day-card ${isToday ? 'is-today' : ''}" data-plan-day="${i}">
        <div class="dc-head">
          <div class="dc-day">${en} · ${cn}${isToday ? ' · 今天' : ''}</div>
          <div class="dc-type ${m.css}">${m.en}</div>
        </div>
        <div class="dc-title">${title}</div>
        <div class="dc-muscles">${sub}</div>
        <div class="dc-meta"><span>${meta}</span></div>
        <div class="dc-detail">${detail}</div>
      </div>`;
  },

  // 计划页：点击某天 → 动作详情弹层
  _showPlanDayDetail(i) {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const type = Logic.typeFor(i);
    const m = this._typeMeta(type);
    const sheet = document.createElement('div');
    sheet.className = 'sheet-mask';
    let body = '';
    if (type === 'STRENGTH') {
      const tpl = Logic.strengthTemplateFor(i);
      body = (tpl.exercises || []).map(id => {
        const e = EXERCISES[id];
        if (!e) return '';
        const reps = Array.isArray(e.reps) ? `${e.reps[0]}-${e.reps[1]}` : e.reps;
        const unit = e.type === 'time' ? ' ' + e.timeUnit : ' 次';
        return `<div class="pd-row"><span class="pd-cn">${e.cn}${e.optional ? ' <span class="pd-opt">可选</span>' : ''}</span><span class="pd-spec">${e.sets} × ${reps}${unit}</span></div>`;
      }).join('');
    } else if (type === 'CARDIO') {
      const cpl = Logic.cardioTemplateFor(i);
      body = cpl.stages.map(s => `<div class="pd-row"><span class="pd-cn">${s}</span></div>`).join('');
    } else if (type === 'ACTIVE_RECOVERY') {
      const ar = Logic.activeRecoveryTemplateFor();
      body = ar.options.map(o => `<div class="pd-row"><span class="pd-cn">${o.en}</span><span class="pd-spec">${o.cn} · ${o.profile}</span></div>`).join('') +
        `<div class="pd-row"><span class="pd-cn">全身静态拉伸</span><span class="pd-spec">${ar.stretchMin} MIN</span></div>`;
    } else {
      const fr = Logic.fullRestTemplateFor();
      body = `<div class="pd-row"><span class="pd-cn">${fr.note}</span></div>` +
        (fr.optional || []).map(o => `<div class="pd-row"><span class="pd-cn">可选：${o}</span></div>`).join('');
    }
    sheet.innerHTML = `
      <div class="sheet">
        <div class="sheet-title">${days[i]} · ${m.cn}</div>
        <div class="sheet-sub">${m.en} · 仅展示当天安排</div>
        <div class="pd-list">${body}</div>
        <button class="btn btn-ghost" data-sheet-cancel style="width:100%;margin-top:8px;">关闭</button>
      </div>`;
    document.body.appendChild(sheet);
    sheet.querySelectorAll('[data-sheet-cancel]').forEach(b => b.onclick = () => sheet.remove());
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.remove(); });
  },

  // 动作库卡片（PLAN 页）：点击 → 完整指南弹层
  _exDetailCard(id, ex) {
    if (!ex) return '';
    const reps = Array.isArray(ex.reps) ? ex.reps : [1, 1];
    const unit = ex.type === 'time' ? ' ' + (ex.timeUnit || 'sec') : ' 次';
    const hasVid = ex.videoTitle && ex.videoTitle !== 'pending';
    const tagVid = hasVid
      ? '<span class="exg-tag ok">VIDEO</span>'
      : '<span class="exg-tag soon">VIDEO 待定</span>';
    return `
      <div class="ex-detail exg-card" data-guide="${id}">
        <div class="exg-head">
          <div class="exg-name">
            <div class="ed-cn">${ex.cn || ''}${ex.optional ? ' <span class="ex-opt-tag">OPTIONAL</span>' : ''}</div>
            <div class="ed-name">${ex.en || ''}</div>
          </div>
          <div class="exg-arrow">›</div>
        </div>
        <div class="ed-group">${ex.muscle || ''}${ex.assist && ex.assist.length ? ' · ' + ex.assist.join(' / ') : ''}</div>
        <div class="ed-spec"><b>${ex.sets || 0} 组 × ${reps[0]}-${reps[1]}${unit}</b> · RIR ${ex.rir || 0} · 休息 ${this._restTxt(ex.rest)}</div>
        <div class="exg-tags">
          ${tagVid}
          <span class="exg-tag">要点</span>
          <span class="exg-tag">错误</span>
          <span class="exg-tag">替代</span>
          <span class="exg-tag">表现</span>
        </div>
      </div>`;
  },

  // 休息秒数 → 文案（如 2:30）
  _restTxt(sec) {
    if (!sec) return '—';
    return `${Math.round(sec / 60)}:${String(Math.round(sec) % 60).padStart(2, '0')}`;
  },

  /* ============================================================
     EXERCISE GUIDE 动作指南弹层
     VIDEO GUIDE / KEY POINTS / COMMON MISTAKES / ALTERNATIVES / MY PERFORMANCE
     ============================================================ */
  _showExerciseGuide(id) {
    const ex = EXERCISES[id];
    if (!ex) return;
    const sheet = document.createElement('div');
    sheet.className = 'sheet-mask';
    sheet.innerHTML = this._guideSheetHTML(id, ex);
    document.body.appendChild(sheet);
    this._bindGuideSheet(sheet, id);
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.remove(); });
  },

  _guideSheetHTML(id, ex) {
    const reps = Array.isArray(ex.reps) ? ex.reps : [1, 1];
    const unit = ex.type === 'time' ? ' ' + (ex.timeUnit || 'sec') : ' 次';
    const alts = (ex.alts || []).filter(a => EXERCISES[a]);
    return `
      <div class="sheet guide-sheet">
        <div class="sheet-title">${ex.cn || ''}${ex.optional ? ' <span class="ex-opt-tag">OPTIONAL</span>' : ''}</div>
        <div class="sheet-sub">${ex.en || ''} · ${ex.muscle || ''} · ${ex.sets || 0} 组 × ${reps[0]}-${reps[1]}${unit} · RIR ${ex.rir || 0}</div>

        <div class="gs-sec">VIDEO GUIDE</div>
        ${this._videoBlock(ex)}

        <div class="gs-sec">KEY POINTS</div>
        <div class="gs-list">${(ex.points || []).map(p => `<div class="gs-li"><span class="gs-dot"></span>${p}</div>`).join('') || '<div class="muted">暂无要点。</div>'}</div>

        <div class="gs-sec">COMMON MISTAKES</div>
        <div class="gs-list">${(ex.mistakes || []).map(p => `<div class="gs-li"><span class="gs-x">✕</span>${p}</div>`).join('') || '<div class="muted">暂无常见错误。</div>'}</div>

        <div class="gs-sec">ALTERNATIVES</div>
        <div class="gs-alts">${alts.length ? alts.map(a => `<button class="gs-alt" data-guide-alt="${a}">${EXERCISES[a].cn}<span>${EXERCISES[a].en}</span></button>`).join('') : '<div class="muted">暂无替代动作。</div>'}</div>

        <div class="gs-sec">MY PERFORMANCE</div>
        ${this._perfBlock(id, ex)}

        <button class="btn btn-ghost" data-sheet-cancel style="width:100%;margin-top:14px;">关闭</button>
      </div>`;
  },

  _videoBlock(ex) {
    const pending = !ex.videoTitle || ex.videoTitle === 'pending';
    if (pending) {
      return `
        <div class="gs-video soon">
          <div class="gs-v-t">VIDEO COMING SOON</div>
          <div class="gs-v-p">示范视频还在准备中，先按文字要点做，稳比快重要。</div>
        </div>`;
    }
    return `
      <div class="gs-video ok">
        <div class="gs-v-t">${ex.videoTitle || '动作示范'}</div>
        <div class="gs-v-p">${ex.videoPlatform ? '平台：' + ex.videoPlatform : ''}${ex.videoUrl ? '' : ' · 链接配置中'}</div>
        ${ex.videoUrl
          ? `<a class="btn btn-dark btn-sm" href="${ex.videoUrl}" target="_blank" rel="noopener" style="margin-top:8px;">去观看 →</a>`
          : '<div class="muted" style="font-size:12px;margin-top:6px;">视频链接待补充，稍后可观看。</div>'}
      </div>`;
  },

  _perfBlock(id, ex) {
    const hist = Store.historyOf(id);
    if (!hist || !hist.length) {
      return '<div class="gs-perf empty">还没有记录。完成一次训练后，这里会出现你的表现趋势。</div>';
    }
    const isTime = ex.type === 'time';
    const unit = isTime ? (ex.timeUnit || 'sec') : 'kg';
    const rows = hist.slice(-5).reverse().map(r => {
      const val = isTime ? `${r.reps} ${unit}` : `${r.weight} kg × ${r.reps} 次`;
      return `<div class="gs-p-row"><span class="gs-p-d">${r.dateKey || ''}</span><span class="gs-p-v">${val}</span></div>`;
    }).join('');
    const best = Store.bestOf(id);
    const bestLine = best
      ? (isTime ? `最佳：${best.reps} ${unit}` : `最佳：${best.weight} kg × ${best.reps} 次`)
      : '';
    // 用最近一次训练记录做下一次建议（记录结构与 doneSets 兼容）
    const sug = Logic.suggestNext(id, hist, ex.reps);
    return `
      <div class="gs-p-list">${rows}</div>
      ${bestLine ? `<div class="gs-p-best">${bestLine}</div>` : ''}
      ${sug && sug.text ? `<div class="gs-p-sug">${sug.text}</div>` : ''}`;
  },

  _bindGuideSheet(sheet, id) {
    sheet.querySelectorAll('[data-sheet-cancel]').forEach(b => b.onclick = () => sheet.remove());
    sheet.querySelectorAll('[data-guide-alt]').forEach(b => {
      b.onclick = () => {
        const nid = b.dataset.guideAlt;
        const nex = EXERCISES[nid];
        if (!nex) return;
        sheet.innerHTML = this._guideSheetHTML(nid, nex);
        this._bindGuideSheet(sheet, nid);
      };
    });
  },

  /* ---------- 进度 ---------- */
  renderProgress() {
    const d = Store.get();
    const sc = this.app.querySelector('#screen-progress');
    if (!sc) return;
    const noWorkouts = !(d.workouts && d.workouts.length > 0);
    // 无任何训练记录 → 空态
    if (noWorkouts) {
      this._emptyStats(sc);
      this._bindTabbar(sc);
      return;
    }
    const week = Logic.weeklySessions() || 0;
    const month = Logic.monthlySessions() || 0;
    const dur = Logic.totalDuration() || 0;
    const totalSets = Logic.totalSets() || 0;
    const volume = Logic.totalVolume() || 0;
    const rate = Logic.completionRate() || 0;
    const wc = Logic.weekCompletion();
    const mc = Logic.monthTypeCount();

    // 动作表现：所有有历史的动作
    const exIds = Object.keys(d.exHistory || {});
    const progEx = exIds.slice(0, 5);

    // 身体变化
    const body = d.measures || {};

    sc.innerHTML = `
      <div class="screen-header">
        <div class="brand-row"><div class="brand" style="font-size:24px;">PROGRESS</div></div>
        <div class="brand-sub" style="margin-top:4px;">数据 · 力量 · 身体</div>
      </div>

      <div class="prog-section-t">训练数据</div>
      <div class="prog-stats">
        <div class="prog-stat"><div class="ps-n ${week>0?'accent':''}">${week}</div><div class="ps-l">本周训练</div></div>
        <div class="prog-stat"><div class="ps-n">${month}</div><div class="ps-l">本月训练</div></div>
        <div class="prog-stat"><div class="ps-n">${d.streak||0}</div><div class="ps-l">连续天数</div></div>
        <div class="prog-stat"><div class="ps-n ${rate>=70?'accent':''}">${rate}%</div><div class="ps-l">计划完成率</div></div>
        <div class="prog-stat"><div class="ps-n">${Math.round(dur/60)}h</div><div class="ps-l">总时长</div></div>
        <div class="prog-stat"><div class="ps-n">${totalSets}</div><div class="ps-l">总组数</div></div>
        <div class="prog-stat"><div class="ps-n">${volume>1000?Math.round(volume/1000)+'t':volume}</div><div class="ps-l">总容量</div></div>
        <div class="prog-stat"><div class="ps-n">${d.totalSessions||0}</div><div class="ps-l">累计训练</div></div>
      </div>

      <div class="prog-section-t">THIS WEEK · 训练类型</div>
      <div class="week-type-stats">
        ${[['力量', 'STRENGTH', wc.strength], ['有氧', 'CARDIO', wc.cardio], ['主动恢复', 'ACTIVE RECOVERY', wc.activeRecovery], ['完全恢复', 'FULL REST', wc.fullRest]].map(([cn, en, v]) => `
          <div class="wt-row">
            <span class="wt-k">${cn}<span class="wt-e">${en}</span></span>
            <span class="wt-bar"><i style="width:${Math.round(v.planned ? v.done / v.planned * 100 : 0)}%"></i></span>
            <span class="wt-v">${v.done} / ${v.planned}</span>
          </div>`).join('')}
      </div>

      <div class="prog-section-t">THIS MONTH</div>
      <div class="month-type-stats">
        <div class="prog-stat"><div class="ps-n">${mc.strength}</div><div class="ps-l">STRENGTH</div></div>
        <div class="prog-stat"><div class="ps-n">${mc.cardio}</div><div class="ps-l">CARDIO</div></div>
        <div class="prog-stat"><div class="ps-n">${mc.activeRecovery}</div><div class="ps-l">ACTIVE RECOVERY</div></div>
        <div class="prog-stat"><div class="ps-n">${mc.fullRest}</div><div class="ps-l">FULL REST</div></div>
      </div>

      ${progEx.length ? `<div class="prog-section-t">动作表现</div>` + progEx.map(id => this._exProgCard(id)).join('') : `
        <div class="prog-section-t">动作表现</div>
        <div class="reminder"><div class="dot"></div><div class="txt">还没有动作记录。完成几次训练后，这里会出现每个动作的重量趋势。</div></div>`}

      <div class="prog-section-t">身体变化</div>
      <div class="body-prog">
        ${this._bodyRow('体重', body.weight, 'kg')}
        ${this._bodyRow('体脂率', body.bodyFat, '%')}
        ${this._bodyRow('腰围', body.waist, 'cm')}
        ${this._bodyRow('胸围', body.chest, 'cm')}
        ${this._bodyRow('臂围', body.arm, 'cm')}
        ${this._bodyRow('臀围', body.hip, 'cm')}
        ${this._bodyRow('大腿围', body.thigh, 'cm')}
      </div>

      <div class="measure-form">
        <div class="prog-section-t" style="margin:0 0 12px;">记录身体数据</div>
        ${[['weight','体重'],['bodyFat','体脂率'],['waist','腰围'],['chest','胸围'],['arm','臂围'],['hip','臀围'],['thigh','大腿围']].map(([k,l])=>`
          <div class="mf-row"><label>${l}${['bodyFat'].includes(k)?'(%)':'(cm/kg)'}</label><input type="number" data-measure="${k}" value="${body[k]||''}"></div>`).join('')}
        <button class="btn btn-dark btn-sm" data-save-measure style="margin-top:6px;">保存记录</button>
      </div>
    `;

    sc.querySelectorAll('[data-save-measure]').forEach(b => {
      b.onclick = () => {
        const d2 = Store.get();
        const m = {};
        sc.querySelectorAll('[data-measure]').forEach(inp => {
          if (inp.value !== '') m[inp.dataset.measure] = Number(inp.value);
        });
        d2.measures = m;
        d2.bodyLog.push(Object.assign({ dateKey: Store.todayKey() }, m));
        Store.save();
        this._toast('身体数据已保存。');
      };
    });
    this._bindTabbar(sc);
  },

  _bodyRow(name, val, unit) {
    if (!val) return `<div class="bp-row"><span class="bp-name">${name}</span><span class="bp-val muted">未记录</span></div>`;
    return `<div class="bp-row"><span class="bp-name">${name}</span><span class="bp-val">${val} <span style="color:var(--faint);font-size:12px;">${unit}</span></span></div>`;
  },

  _exProgCard(id) {
    const ex = EXERCISES[id];
    const h = Store.historyOf(id);
    if (!h.length || !ex) return '';
    const last = h[h.length-1];
    const best = Store.bestOf(id);
    const e1rm = Store.estimate1RM(last.weight, last.reps);
    const isTime = ex.type === 'time';
    const unit = isTime ? (ex.timeUnit || 'sec') : 'kg';
    const fmt = (w, reps) => isTime ? `${w || reps} ${unit}` : `${w}kg × ${reps}`;
    // 最近趋势（取每场最后完成组）
    const recent = h.slice(-5).map(r => r.weight || r.reps);
    const max = Math.max(...recent.map(w=>w||0), 1);
    return `
      <div class="ex-prog">
        <div class="ep-name">${ex.en}</div>
        <div class="ep-cn">${ex.cn}</div>
        <div class="ep-row"><span class="k">当前${isTime ? '时长' : '工作重量'}</span><span class="v accent">${fmt(last.weight, last.reps)}</span></div>
        <div class="ep-row"><span class="k">历史最佳</span><span class="v">${fmt(best.weight, best.reps)}</span></div>
        ${isTime ? '' : `<div class="ep-row"><span class="k">估算 1RM</span><span class="v">${e1rm ? '约 ' + e1rm + 'kg' : '—'}</span></div>`}
        <div class="ep-chart">
          <div class="ep-trend">
            ${recent.map((w,i)=>`<div class="ep-bar ${i===recent.length-1?'latest':''}" style="height:${Math.max(12, w/max*100)}%"></div>`).join('')}
          </div>
          <div class="ep-labels">${recent.map(w=>`<span>${w}</span>`).join('')}</div>
        </div>
      </div>`;
  },

  /* ---------- 我的 ---------- */
  renderMine() {
    const d = Store.get();
    const sc = this.app.querySelector('#screen-mine');
    if (!sc) return;
    const p = d.profile || {};
    const voice = d.voice;
    const rivalOn = d.rivalMode !== false;
    const active = [d.totalSessions || 0, d.streak || 0, Logic.totalSets() || 0];
    const goalName = (DB.GOALS && p.goal && DB.GOALS[p.goal]) ? DB.GOALS[p.goal].name : '';
    const levelName = (DB.LEVELS && p.level && DB.LEVELS[p.level]) ? DB.LEVELS[p.level].name : '';
    const name = p.name || '明哥';
    const height = p.height || '—';
    const weight = p.weight || '—';
    const first = name ? name.charAt(0) : '明';
    const sched = Logic.scheduleStats();
    const planInfo = Logic.currentPlanInfo();
    const cpTag = planInfo.tag ? `<span class="cp-tag">${planInfo.tag}</span>` : '';

    sc.innerHTML = `
      <div class="screen-header">
        <div class="profile-head">
          <div class="avatar">${first}</div>
          <div>
            <div class="ph-name">${name}</div>
            <div class="ph-sub">${goalName} · ${levelName} · ${height}cm / ${weight}kg</div>
          </div>
        </div>
        <div class="profile-stats">
          <div class="ps-mini"><div class="n">${active[0]}</div><div class="l">训练</div></div>
          <div class="ps-mini"><div class="n">${active[1]}</div><div class="l">连续</div></div>
          <div class="ps-mini"><div class="n">${active[2]}</div><div class="l">组数</div></div>
        </div>
      </div>

      <div class="menu-group">
        <div class="mg-h">MY TRAINING PLAN</div>
        <div class="cur-plan-card">
          <div class="cp-head">
            <span class="cp-kicker">CURRENT PLAN</span>
            ${cpTag}
          </div>
          <div class="cp-name">${planInfo.name}</div>
          <div class="cp-sub">${planInfo.subtitle}${planInfo.type ? '' : ' · 尚未选择方案'}</div>
        </div>
        <div class="cp-actions">
          <button class="btn btn-dark btn-sm" data-go-view-plan>查看当前方案</button>
          <button class="btn btn-dark btn-sm" data-go-edit-plan>编辑当前方案</button>
          <button class="btn btn-accent btn-sm" data-go-change-plan>更换训练方案</button>
        </div>
      </div>

      <div class="menu-group">
        <div class="mg-h">TRAINING SCHEDULE</div>
        <div class="sched-summary">
          <div class="ss-row">
            <span class="ss-k">每周训练安排</span>
            <span class="ss-e" data-go-schedule>编辑 <span class="arrow">›</span></span>
          </div>
          <div class="ss-stats">
            <div class="ss-stat"><div class="n">${sched.strength}</div><div class="l">力量</div></div>
            <div class="ss-stat"><div class="n">${sched.cardio}</div><div class="l">有氧</div></div>
            <div class="ss-stat"><div class="n">${sched.activeRecovery}</div><div class="l">主动恢复</div></div>
            <div class="ss-stat"><div class="n">${sched.fullRest}</div><div class="l">完全恢复</div></div>
          </div>
        </div>
      </div>

      <div class="menu-group">
        <div class="mg-h">EXERCISE CONTENT</div>
        <div class="menu-row"><div class="mr-l">编辑训练内容</div><div class="mr-r" data-go-exercise-edit>动作 / 组数 / 次数 / 时间 <span class="arrow">›</span></div></div>
      </div>

      <div class="menu-group">
        <div class="mg-h">TRAINING VOICE</div>
        <div class="voice-select">
          ${[['standard','STANDARD','标准模式'],['motivational','MOTIVATIONAL','鼓励模式'],['yan','YAN MODE','妍宝模式']].map(([k,en,cn])=>`
            <div class="vs ${voice===k?'selected':''}" data-voice="${k}"><div class="vs-t">${en}</div><div class="vs-s">${cn}</div></div>`).join('')}
        </div>
      </div>

      <div class="menu-group">
        <div class="mg-h">RIVAL MODE</div>
        <div class="menu-row">
          <div class="mr-l">对手刺激</div>
          <div class="mr-r rm-toggle ${rivalOn ? 'on' : ''}" data-rival-toggle>${rivalOn ? 'ON' : 'OFF'}</div>
        </div>
        <div class="mr-hint">偶尔让 0哥 / 签哥 / 小王总 出来添把火。关闭后首页不再出现对手文案。</div>
      </div>

      <div class="menu-group">
        <div class="mg-h">档案</div>
        <div class="menu-row"><div class="mr-l">身体数据</div><div class="mr-r" data-go-body>编辑 <span class="arrow">›</span></div></div>
      </div>

      <div class="menu-group">
        <div class="mg-h">成就</div>
        ${this._ach('连续 7 次训练', d.streak>=7, 'HIDDEN MESSAGE', '能坚持到这里已经很棒啦。慢慢练。身体越来越好最重要。——妍宝')}
        ${this._ach('累计 10 次训练', d.totalSessions>=10, 'SYSTEM MESSAGE', '连续完成 10 次训练。妍宝：不错嘛，继续。别得意。')}
        ${this._ach('累计 30 次训练', d.totalSessions>=30, '坚持一个月', '别急着看自己变了多少。先承认：你真的坚持下来了。')}
        ${this._ach('累计 100 次训练', d.totalSessions>=100, '100 SESSIONS', '有些变化是镜子里看见的，有些只有自己知道。妍宝说：继续练。别飘。')}
        ${this._ach('妍宝批准', d.streak>=3 && d.streak<7, 'HIDDEN ACHIEVEMENT', '检测到明哥最近训练非常认真。经系统审核：批准奖励一顿好吃的。注：MING FIT 不负责买单。')}
      </div>

      <div class="from-yan ${d.yanOpened>0?'revealed':''}" data-from-yan>
        <div class="fh-k">FROM YAN</div>
        ${d.yanOpened>0 ? `<div class="fh-message">${this._lastYanMsg()}</div><div class="fh-sign">——妍宝</div>` : '<div class="fh-message" style="margin-top:8px;">有一句话想对你说。</div>'}
      </div>

      <button class="reset-btn" data-reset>重置所有数据</button>
    `;

    sc.querySelectorAll('[data-voice]').forEach(v => {
      v.onclick = () => { d.voice = v.dataset.voice; Persona.setVoice(d.voice); Store.save(); this.renderMine(); };
    });
    // RIVAL MODE 开关（默认 ON；关闭后首页不出现对手刺激文案）
    sc.querySelectorAll('[data-rival-toggle]').forEach(t => {
      t.onclick = () => {
        d.rivalMode = !(d.rivalMode !== false);
        Store.save();
        this.renderMine();
      };
    });
    sc.querySelectorAll('[data-from-yan]').forEach(f => {
      f.onclick = () => {
        d.yanOpened++;
        const msg = Persona.fromYan();
        d.lastYanMsg = msg;
        Store.save();
        f.innerHTML = `<div class="fh-k">FROM YAN</div><div class="fh-message">${msg}</div><div class="fh-sign">——妍宝</div>`;
        f.classList.add('revealed');
      };
    });
    sc.querySelectorAll('[data-reset]').forEach(r => {
      r.onclick = () => {
        if (confirm('确定要清空所有数据并重新建档吗？')) {
          Store.reset();
          this.renderOnboard();
        }
      };
    });
    sc.querySelectorAll('[data-go-body]').forEach(b => {
      b.onclick = () => { this.switchTab('progress'); };
    });
    sc.querySelectorAll('[data-go-schedule]').forEach(b => {
      b.onclick = () => { this.showScheduleEditor(); };
    });
    sc.querySelectorAll('[data-go-exercise-edit]').forEach(b => {
      b.onclick = () => { this.showExerciseEditor(); };
    });
    // MY TRAINING PLAN 模块：查看 / 编辑 / 更换
    sc.querySelectorAll('[data-go-view-plan]').forEach(b => {
      b.onclick = () => { this.switchTab('plan'); };
    });
    sc.querySelectorAll('[data-go-edit-plan]').forEach(b => {
      b.onclick = () => { this.showScheduleEditor(); };
    });
    sc.querySelectorAll('[data-go-change-plan]').forEach(b => {
      b.onclick = () => { this.showChangePlan(); };
    });
    this._bindTabbar(sc);
  },

  /* ---------- 更换训练方案（CHANGE PLAN） ---------- */
  showChangePlan() {
    const d = Store.get();
    const planInfo = Logic.currentPlanInfo();
    const smart = d.smartPlan;
    const isMing = planInfo.type === 'ming';
    const isSmart = planInfo.type === 'smart';
    this.view = 'change-plan';
    this.app.innerHTML = `
      <div class="schedule-screen">
        <div class="screen-header">
          <div class="brand-row">
            <button class="icon-btn" data-cp-back>←</button>
            <div>
              <div class="brand" style="font-size:22px;">CHANGE PLAN</div>
              <div class="brand-sub">更换训练方案</div>
            </div>
          </div>
        </div>
        <div class="sched-desc">切换方案不会删除任何训练记录、重量、身体数据与历史。MING PLAN 正式训练表永久内置，随时可以恢复原版。</div>

        <div class="pc-card pc-ming ${isMing ? 'current' : ''}">
          <div class="pcc-head">
            <span class="pcc-kicker">MING PLAN</span>
            <span class="pcc-sub">明哥专属</span>
            <span class="pcc-badge rec">RECOMMENDED</span>
            ${isMing ? '<span class="pcc-badge cur">CURRENT</span>' : ''}
          </div>
          <div class="pcc-name">MING PLAN</div>
          <div class="pcc-desc">明哥正式训练表：力量 3 天 · 有氧 2 天 · 主动恢复 1 天 · 完全恢复 1 天。内置原版，永不删除。</div>
          <button class="btn ${isMing ? 'btn-dark' : 'btn-accent'}" data-cp-ming style="width:100%;">${isMing ? '恢复原版 MING PLAN' : '切回 MING PLAN'} →</button>
        </div>

        <div class="pc-card pc-smart ${isSmart ? 'current' : ''}">
          <div class="pcc-head">
            <span class="pcc-kicker">SMART PLAN</span>
            <span class="pcc-sub">智能定制</span>
            <span class="pcc-badge">CUSTOM</span>
            ${isSmart ? '<span class="pcc-badge cur">CURRENT</span>' : ''}
          </div>
          <div class="pcc-name">${smart ? smart.name : 'SMART PLAN'}</div>
          <div class="pcc-desc">${smart
            ? `按你的目标与条件生成：每周 ${smart.daysPerWeek} 练 · 每次 ${smart.duration} min · ${smart.week} 周。`
            : '根据目标、部位、经验、时间、环境与身体状态，一步步生成专属方案。'}</div>
          <button class="btn ${isSmart ? 'btn-dark' : 'btn-accent'}" data-cp-smart style="width:100%;">${!smart ? '生成 SMART PLAN →' : isSmart ? '重新生成 SMART PLAN' : '启用 SMART PLAN →'}</button>
        </div>

        <button class="btn btn-ghost" data-cp-back2 style="width:100%;margin-top:8px;">返回</button>
      </div>`;

    const back = () => { this.renderApp(); this.switchTab('mine'); };
    this.app.querySelectorAll('[data-cp-back]').forEach(b => b.onclick = back);
    this.app.querySelectorAll('[data-cp-back2]').forEach(b => b.onclick = back);
    this.app.querySelector('[data-cp-ming]').onclick = () => this._restoreMingConfirm();
    this.app.querySelector('[data-cp-smart]').onclick = () => {
      if (!smart || isSmart) {
        // 没有生成过 / 当前就是 SMART → 重新走问卷（复用 onboarding 问卷，不重置已完成状态）
        this._smartFromChange = true;
        this.obBranch = 'smart';
        this.smartStep = 0;
        this.obStep = 3;
        this._ob();
        return;
      }
      this._smartEnableFromChange = true;
      this._smartEnableConfirm();
    };
  },

  // 恢复原版 MING PLAN 确认（切换前必须确认）
  _restoreMingConfirm() {
    const sheet = document.createElement('div');
    sheet.className = 'sheet-mask';
    sheet.innerHTML = `
      <div class="sheet">
        <div class="sheet-title">恢复原版 MING PLAN？</div>
        <div class="sheet-sub">恢复后将以内置正式训练表为准（力量 3 天 · 有氧 2 天 · 主动恢复 1 天 · 完全恢复 1 天）。你的训练记录、重量、身体数据与历史全部保留，不会被删除。</div>
        <button class="btn btn-accent" data-confirm-ming style="width:100%;">确认恢复</button>
        <button class="btn btn-ghost" data-sheet-cancel style="width:100%;margin-top:8px;">再想想</button>
      </div>`;
    document.body.appendChild(sheet);
    sheet.querySelector('[data-confirm-ming]').onclick = () => {
      sheet.remove();
      try {
        Logic.restoreMingPlan();
        // CHANGE PLAN 视图里没有 #screen-mine，必须重建应用再切回 MINE
        this.renderApp();
        this.switchTab('mine');
        this._toast('已恢复原版 MING PLAN。');
      } catch (e) {
        console.error('[MING FIT] restoreMingPlan failed:', e);
        this._toast('恢复时出了点问题，请重试。');
      }
    };
    sheet.querySelector('[data-sheet-cancel]').onclick = () => sheet.remove();
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.remove(); });
  },

  /* ---------- 类型元信息（力量 / 有氧 / 主动恢复 / 完全恢复） ---------- */
  _typeMeta(type) {
    const M = {
      STRENGTH: { cn: '力量训练', en: 'STRENGTH', css: 'strength' },
      CARDIO: { cn: '有氧训练', en: 'CARDIO', css: 'cardio' },
      ACTIVE_RECOVERY: { cn: '主动恢复', en: 'ACTIVE RECOVERY', css: 'active_recovery' },
      FULL_REST: { cn: '完全恢复', en: 'FULL REST', css: 'full_rest' }
    };
    return M[type] || M.FULL_REST;
  },

  /* ---------- 编辑训练内容（力量日动作 / 组数 / 次数 / 时间） ---------- */
  showExerciseEditor() {
    this.view = 'exercise-editor';
    const days = [['MON', '周一', 0], ['WED', '周三', 2], ['FRI', '周五', 4]];
    this.app.innerHTML = `
      <div class="schedule-screen">
        <div class="screen-header">
          <div class="brand-row">
            <button class="icon-btn" data-ee-back>←</button>
            <div>
              <div class="brand" style="font-size:22px;">EXERCISE CONTENT</div>
              <div class="brand-sub">编辑训练内容</div>
            </div>
          </div>
        </div>
        <div class="sched-desc">选择要编辑的力量日，调整动作、组数、次数或时长。修改保存为你的长期模板。</div>
        <div class="sched-list">
          ${days.map(([en, cn, idx]) => {
            const tpl = Logic.strengthTemplateFor(idx);
            return `
            <div class="sched-row" data-ee-day="${idx}">
              <div class="sr-day"><span class="sr-en">${en}</span><span class="sr-cn">${cn}</span></div>
              <div class="sr-type strength"><span class="st-en">${tpl.name}</span><span class="st-cn">${tpl.dayCn || tpl.cn}</span></div>
              <div class="sr-edit">编辑 ›</div>
            </div>`;
          }).join('')}
        </div>
        <button class="btn btn-ghost" data-ee-back style="margin-top:20px;width:100%;">完成</button>
      </div>`;
    const goBack = () => { this.renderApp(); this.switchTab('mine'); };
    this.app.querySelectorAll('[data-ee-back]').forEach(b => b.onclick = goBack);
    this.app.querySelectorAll('[data-ee-day]').forEach(row => {
      row.onclick = () => this._editStrengthDay(Number(row.dataset.eeDay));
    });
  },

  // 编辑某力量日的动作清单（组数 / 次数 / 时间）
  _editStrengthDay(idx) {
    const d = Store.get();
    this.view = 'exercise-editor';
    const daysCn = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const base = STRENGTH_TEMPLATES[idx] || STRENGTH_TEMPLATES[0];
    const custom = d.strengthTemplate && d.strengthTemplate[idx];
    const exIds = (custom && custom.exercises && custom.exercises.length) ? custom.exercises : base.exercises;
    const ovs = (custom && custom.overrides) || {};

    const rowHtml = (id) => {
      const ex = EXERCISES[id];
      if (!ex) return '';
      const ov = ovs[id] || {};
      const sets = ov.sets || ex.sets;
      const repMax = (ov.reps && ov.reps[1]) || (Array.isArray(ex.reps) ? ex.reps[1] : ex.reps);
      const unit = ex.type === 'time' ? (ex.timeUnit || 'sec') : '次';
      return `
        <div class="ee-row" data-ee-ex="${id}">
          <div class="ee-name">${ex.cn}${ex.optional ? ' <span class="pd-opt">可选</span>' : ''}</div>
          <div class="ee-controls">
            <div class="ee-ctrl"><span class="ee-lbl">组</span><div class="ee-stepper" data-ee-k="sets"><span class="ee-s" data-ee-dec>−</span><span class="ee-v">${sets}</span><span class="ee-s" data-ee-inc>+</span></div></div>
            <div class="ee-ctrl"><span class="ee-lbl">${unit}</span><div class="ee-stepper" data-ee-k="reps"><span class="ee-s" data-ee-dec>−</span><span class="ee-v">${repMax}</span><span class="ee-s" data-ee-inc>+</span></div></div>
            <div class="ee-del" data-ee-del>✕</div>
          </div>
        </div>`;
    };

    this.app.innerHTML = `
      <div class="schedule-screen">
        <div class="screen-header">
          <div class="brand-row">
            <button class="icon-btn" data-ee-back2>←</button>
            <div>
              <div class="brand" style="font-size:22px;">${base.name}</div>
              <div class="brand-sub">${daysCn[idx]} · ${base.dayCn || base.cn}</div>
            </div>
          </div>
        </div>
        <div class="sched-desc">调整动作的组数、次数或时长。删除多余动作，或点击下方添加动作。</div>
        <div class="ee-list" id="ee-list">
          ${exIds.map(rowHtml).join('')}
        </div>
        <button class="btn btn-ghost" data-ee-add style="margin-top:14px;width:100%;">+ 添加动作</button>
        <div class="step-nav" style="margin-top:20px;">
          <button class="btn btn-ghost" data-ee-back2>取消</button>
          <button class="btn btn-accent" data-ee-save>保存修改</button>
        </div>
      </div>`;

    // 加减组数 / 次数
    this.app.querySelectorAll('.ee-stepper').forEach(st => {
      const dec = st.querySelector('[data-ee-dec]');
      const inc = st.querySelector('[data-ee-inc]');
      const v = () => st.querySelector('.ee-v');
      if (dec) dec.onclick = () => { v().textContent = Math.max(1, Number(v().textContent) - 1); };
      if (inc) inc.onclick = () => { v().textContent = Math.min(60, Number(v().textContent) + 1); };
    });
    // 删除动作
    this.app.querySelectorAll('[data-ee-del]').forEach(del => {
      del.onclick = () => {
        const row = del.closest('.ee-row');
        if (row) row.remove();
      };
    });
    // 添加动作
    this.app.querySelectorAll('[data-ee-add]').forEach(b => {
      b.onclick = () => {
        const list = this.app.querySelector('#ee-list');
        const have = Array.from(list.querySelectorAll('.ee-row')).map(r => r.dataset.eeEx);
        const sheet = document.createElement('div');
        sheet.className = 'sheet-mask';
        sheet.innerHTML = `
          <div class="sheet">
            <div class="sheet-title">添加动作</div>
            <div class="sheet-sub">从动作库选择（${Object.keys(EXERCISES).length} 个动作）</div>
            <div class="pd-list" style="max-height:46vh;overflow-y:auto;">
              ${Object.entries(EXERCISES).filter(([id]) => !have.includes(id)).map(([id, ex]) => `
                <div class="pd-row" data-ee-pick="${id}"><span class="pd-cn">${ex.cn}</span><span class="pd-spec">${ex.en} · ${ex.muscle}</span></div>`).join('')}
            </div>
            <button class="btn btn-ghost" data-sheet-cancel style="width:100%;margin-top:8px;">取消</button>
          </div>`;
        document.body.appendChild(sheet);
        sheet.querySelectorAll('[data-ee-pick]').forEach(p => {
          p.onclick = () => {
            const id = p.dataset.eePick;
            const ex = EXERCISES[id];
            const sets = ex.sets || 3;
            const repMax = Array.isArray(ex.reps) ? ex.reps[1] : ex.reps;
            const unit = ex.type === 'time' ? (ex.timeUnit || 'sec') : '次';
            const div = document.createElement('div');
            div.innerHTML = `
              <div class="ee-row" data-ee-ex="${id}">
                <div class="ee-name">${ex.cn}${ex.optional ? ' <span class="pd-opt">可选</span>' : ''}</div>
                <div class="ee-controls">
                  <div class="ee-ctrl"><span class="ee-lbl">组</span><div class="ee-stepper" data-ee-k="sets"><span class="ee-s" data-ee-dec>−</span><span class="ee-v">${sets}</span><span class="ee-s" data-ee-inc>+</span></div></div>
                  <div class="ee-ctrl"><span class="ee-lbl">${unit}</span><div class="ee-stepper" data-ee-k="reps"><span class="ee-s" data-ee-dec>−</span><span class="ee-v">${repMax}</span><span class="ee-s" data-ee-inc>+</span></div></div>
                  <div class="ee-del" data-ee-del>✕</div>
                </div>
              </div>`;
            const row = div.firstElementChild;
            // 重新绑定新行的事件
            row.querySelectorAll('.ee-stepper').forEach(st => {
              const dec = st.querySelector('[data-ee-dec]');
              const inc = st.querySelector('[data-ee-inc]');
              const v = () => st.querySelector('.ee-v');
              if (dec) dec.onclick = () => { v().textContent = Math.max(1, Number(v().textContent) - 1); };
              if (inc) inc.onclick = () => { v().textContent = Math.min(60, Number(v().textContent) + 1); };
            });
            row.querySelector('[data-ee-del]').onclick = () => row.remove();
            list.appendChild(row);
            sheet.remove();
          };
        });
        sheet.querySelectorAll('[data-sheet-cancel]').forEach(c => c.onclick = () => sheet.remove());
        sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.remove(); });
      };
    });
    // 保存
    this.app.querySelectorAll('[data-ee-save]').forEach(b => {
      b.onclick = () => {
        const d2 = Store.get();
        const rows = this.app.querySelectorAll('.ee-row');
        const exIds2 = [];
        const overrides = {};
        rows.forEach(row => {
          const id = row.dataset.eeEx;
          const ex = EXERCISES[id];
          if (!ex) return;
          exIds2.push(id);
          const sets = Number(row.querySelector('[data-ee-k="sets"] .ee-v').textContent) || ex.sets;
          const repMax = Number(row.querySelector('[data-ee-k="reps"] .ee-v').textContent) || (Array.isArray(ex.reps) ? ex.reps[1] : ex.reps);
          const low = Array.isArray(ex.reps) ? Math.min(ex.reps[0], repMax) : repMax;
          overrides[id] = { sets, reps: [low, repMax] };
        });
        if (!exIds2.length) { this._toast('至少保留一个动作。'); return; }
        d2.strengthTemplate = d2.strengthTemplate || {};
        d2.strengthTemplate[idx] = {
          name: base.name, cn: base.cn, dayCn: base.dayCn, restNote: base.restNote,
          muscles: base.muscles, target: base.target,
          exercises: exIds2, overrides
        };
        Store.save();
        this._toast('训练内容已保存。');
        this.renderApp();
        this.switchTab('mine');
      };
    });
    // 返回 / 取消
    this.app.querySelectorAll('[data-ee-back2]').forEach(b => b.onclick = () => this.showExerciseEditor());
  },

  /* ---------- 每周训练安排编辑（WEEKLY SCHEDULE） ---------- */
  showScheduleEditor() {
    const d = Store.get();
    this.view = 'schedule';
    const days = [
      ['MON', '周一'], ['TUE', '周二'], ['WED', '周三'], ['THU', '周四'],
      ['FRI', '周五'], ['SAT', '周六'], ['SUN', '周日']
    ];
    const sched = d.schedule || [];

    this.app.innerHTML = `
      <div class="schedule-screen">
        <div class="screen-header">
          <div class="brand-row">
            <button class="icon-btn" data-sched-back>←</button>
            <div>
              <div class="brand" style="font-size:22px;">WEEKLY SCHEDULE</div>
              <div class="brand-sub">每周训练安排</div>
            </div>
          </div>
        </div>
        <div class="sched-desc">点击任意一天，修改它的训练类型。修改会作为你的长期默认模板保存。</div>
        <div class="sched-list">
          ${days.map(([en, cn], i) => {
            const t = this._typeMeta(sched[i]);
            return `
            <div class="sched-row" data-sched-day="${i}">
              <div class="sr-day"><span class="sr-en">${en}</span><span class="sr-cn">${cn}</span></div>
              <div class="sr-type ${t.css}"><span class="st-en">${t.en}</span><span class="st-cn">${t.cn}</span></div>
              <div class="sr-edit">改 ›</div>
            </div>`;
          }).join('')}
        </div>
        <button class="btn btn-ghost" data-sched-back style="margin-top:20px;width:100%;">完成</button>
      </div>`;

    const goBack = () => {
      this.renderApp();
      this.switchTab('mine');
    };
    this.app.querySelectorAll('[data-sched-back]').forEach(b => b.onclick = goBack);

    this.app.querySelectorAll('[data-sched-day]').forEach(row => {
      row.onclick = () => {
        const idx = Number(row.dataset.schedDay);
        this._schedTypePicker(idx);
      };
    });
  },

  // 选择某一天的类型（力量/有氧/主动恢复/完全恢复）
  _schedTypePicker(idx) {
    const d = Store.get();
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const opts = ['STRENGTH', 'CARDIO', 'ACTIVE_RECOVERY', 'FULL_REST'];
    const current = (d.schedule && d.schedule[idx]) || 'FULL_REST';
    // 用一个轻量 bottom-sheet 让用户选择
    const sheet = document.createElement('div');
    sheet.className = 'sheet-mask';
    sheet.innerHTML = `
      <div class="sheet">
        <div class="sheet-title">${days[idx]} · 训练类型</div>
        ${opts.map(k => { const m = this._typeMeta(k); return `<div class="sheet-opt ${current === k ? 'sel' : ''}" data-type="${k}"><span class="so-en">${m.en}</span><span class="so-cn">${m.cn}</span></div>`; }).join('')}
        <button class="btn btn-ghost" data-sheet-cancel style="width:100%;margin-top:8px;">取消</button>
      </div>`;
    document.body.appendChild(sheet);
    sheet.querySelectorAll('[data-type]').forEach(o => {
      o.onclick = () => {
        const d2 = Store.get();
        d2.schedule = (d2.schedule || []).slice();
        d2.schedule[idx] = o.dataset.type;
        Store.save();
        sheet.remove();
        this.showScheduleEditor();
      };
    });
    sheet.querySelectorAll('[data-sheet-cancel]').forEach(b => {
      b.onclick = () => sheet.remove();
    });
    // 点遮罩关闭
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.remove(); });
  },

  /* ---------- 调整今天（本周临时调整，不影响长期模板） ---------- */
  showTodayAdjust() {
    const d = Store.get();
    const dow = new Date().getDay();
    const dayIndex = (dow + 6) % 7;
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const opts = ['STRENGTH', 'CARDIO', 'ACTIVE_RECOVERY', 'FULL_REST'];

    const sheet = document.createElement('div');
    sheet.className = 'sheet-mask';
    const swapDays = [];
    for (let i = 0; i < 7; i++) {
      if (i === dayIndex) continue;
      swapDays.push([i, days[i], this._typeMeta(Logic.typeFor(i)).cn]);
    }
    sheet.innerHTML = `
      <div class="sheet">
        <div class="sheet-title">调整今天 · ${days[dayIndex]}</div>
        <div class="sheet-sub">只改本周这次，不改变长期安排。</div>
        <div class="sheet-h">改为</div>
        ${opts.map(k => { const m = this._typeMeta(k); return `<div class="sheet-opt" data-adj-type="${k}"><span class="so-en">${m.en}</span><span class="so-cn">${m.cn}</span></div>`; }).join('')}
        <div class="sheet-h">与其他日期交换</div>
        ${swapDays.map(([i, dn, t]) => `<div class="sheet-opt" data-adj-swap="${i}"><span class="so-en">${dn}</span><span class="so-cn">${t} ›</span></div>`).join('')}
        <button class="btn btn-ghost" data-sheet-cancel style="width:100%;margin-top:8px;">取消</button>
      </div>`;
    document.body.appendChild(sheet);

    const weekKey = Store.weekKeyOf();
    sheet.querySelectorAll('[data-adj-type]').forEach(o => {
      o.onclick = () => {
        const d2 = Store.get();
        if (!d2.weekOverride || d2.weekOverride.weekKey !== weekKey) {
          d2.weekOverride = { weekKey, days: (d2.schedule || []).slice() };
        }
        d2.weekOverride.days[dayIndex] = o.dataset.adjType;
        Store.save();
        sheet.remove();
        this._toast('今天已改为' + this._typeMeta(o.dataset.adjType).cn + '（仅本周）。');
        this.renderToday();
      };
    });
    sheet.querySelectorAll('[data-adj-swap]').forEach(o => {
      o.onclick = () => {
        const other = Number(o.dataset.adjSwap);
        this._confirmSwap(dayIndex, other, sheet);
      };
    });
    sheet.querySelectorAll('[data-sheet-cancel]').forEach(b => b.onclick = () => sheet.remove());
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.remove(); });
  },

  // 交换两个日期（本周临时）
  _confirmSwap(aIdx, bIdx, sheet) {
    const d = Store.get();
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const weekKey = Store.weekKeyOf();
    const confirmBox = document.createElement('div');
    confirmBox.className = 'sheet-mask';
    confirmBox.innerHTML = `
      <div class="sheet">
        <div class="sheet-title">交换训练日</div>
        <div class="sheet-sub">将：<b>${days[aIdx]} ${this._typeMeta(Logic.typeFor(aIdx)).cn}</b><br>与：<b>${days[bIdx]} ${this._typeMeta(Logic.typeFor(bIdx)).cn}</b><br>交换？</div>
        <div class="sheet-hint">仅本周生效，长期模板不变。</div>
        <div class="cc-btn-row" style="margin-top:14px;">
          <button class="btn btn-sm btn-ghost" data-swap-no>取消</button>
          <button class="btn btn-sm btn-accent" data-swap-yes>确认交换</button>
        </div>
      </div>`;
    document.body.appendChild(confirmBox);
    const doSwap = () => {
      const d2 = Store.get();
      if (!d2.weekOverride || d2.weekOverride.weekKey !== weekKey) {
        d2.weekOverride = { weekKey, days: (d2.schedule || []).slice() };
      }
      const t = d2.weekOverride.days[aIdx];
      d2.weekOverride.days[aIdx] = d2.weekOverride.days[bIdx];
      d2.weekOverride.days[bIdx] = t;
      Store.save();
      confirmBox.remove();
      if (sheet) sheet.remove();
      this._toast('已交换。今天按新安排显示（仅本周）。');
      this.renderToday();
    };
    confirmBox.querySelector('[data-swap-yes]').onclick = doSwap;
    confirmBox.querySelector('[data-swap-no]').onclick = () => confirmBox.remove();
    confirmBox.addEventListener('click', (e) => { if (e.target === confirmBox) confirmBox.remove(); });
  },

  _lastYanMsg() {
    const d = Store.get();
    if (d.lastYanMsg) return d.lastYanMsg;
    // 兜底：返回一条妍宝留言
    return Persona.fromYan();
  },

  _ach(title, unlocked, tag, body) {
    return `
      <div class="achievement" style="${!unlocked?'opacity:0.4;':''}">
        <div class="ach-tag">${unlocked ? tag : 'LOCKED'}</div>
        <div class="ach-title">${title}</div>
        ${unlocked ? `<div class="ach-body">${body}</div>` : ''}
      </div>`;
  },

  _bindTabbar(sc) {
    sc.querySelectorAll('.tab[data-tab]').forEach(t => {
      t.onclick = () => this.switchTab(t.dataset.tab);
    });
  },

  _toast(msg) {
    let t = this.app.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; this.app.appendChild(t); }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), 2400);
  },

  /* ---------- 训练流程 ---------- */
  startWorkout() {
    const d = Store.get();
    // 今日有进行中的训练 → 直接恢复（绕过 CHECK-IN），回到离场位置
    const todayRec = d.workouts && d.workouts.find(w => w.dateKey === Store.todayKey() && (w.type || 'STRENGTH') === 'STRENGTH');
    if (todayRec && todayRec.inProgress && Array.isArray(todayRec.records) && todayRec.records.length > 0) {
      this.resumeWorkout();
      return;
    }
    // 训练前状态检测
    this.showStateCheck();
  },

  /* ---------- 恢复进行中的训练（← TODAY 暂离后回来） ---------- */
  resumeWorkout() {
    const d = Store.get();
    this.workout = Logic.buildTodayWorkout(d.profile, d.plan);
    this.view = 'workout';
    // 兜底：无动作时与 beginWorkout 一致给提示
    if (!this.workout.exercises || this.workout.exercises.length === 0) {
      this.app.innerHTML = `
        <div class="workout-screen">
          <div class="ex-header"><div class="ex-count">REST DAY</div></div>
          <div class="ex-title" style="margin-top:14px;">今天没有训练安排。</div>
          <div class="one-liner" style="margin-top:10px;">恢复也是训练的一部分。让身体休息，明天再战。</div>
          <div style="margin-top:34px;text-align:center;">
            <button class="btn btn-accent" data-back-home>返回首页</button>
          </div>
        </div>`;
      this.app.querySelector('[data-back-home]').onclick = () => this.renderApp();
      return;
    }
    const todayRec = (d.workouts || []).find(w => w.dateKey === Store.todayKey() && (w.type || 'STRENGTH') === 'STRENGTH');
    // 回到离场时的动作序号
    const cur = (todayRec && typeof todayRec.currentIdx === 'number' && todayRec.currentIdx >= 0 && todayRec.currentIdx < this.workout.exercises.length)
      ? todayRec.currentIdx : 0;
    this.curIdx = cur;
    // 休息计时恢复：按实际经过时间计算剩余（wall-clock），超时显示 REST COMPLETE
    const rs = todayRec && todayRec.restSnapshot;
    if (rs && typeof rs.idx === 'number' && rs.idx >= 0 && rs.idx < this.workout.exercises.length) {
      const left = Math.round(((rs.restEndTs || 0) - Date.now()) / 1000);
      this.showRest(rs.idx, !!rs.finishedEx, { restSec: rs.restSec, leftSec: Math.max(0, left) });
      return;
    }
    this.renderExercise(cur);
  },

  /* ---------- 有氧流程 ---------- */
  startCardio() {
    const d = Store.get();
    this.view = 'cardio';
    const dayIndex = (new Date().getDay() + 6) % 7;
    const cpl = Logic.cardioTemplateFor(dayIndex);
    const pref = d.cardioPrefs || {};
    const target = pref.targetMin || cpl.targetMin;

    this.app.innerHTML = `
      <div class="workout-screen">
        <div class="ex-header"><div class="ex-count">CARDIO DAY</div></div>
        <div class="ex-title" style="margin-top:10px;">选择今天的有氧方式</div>
        <div class="one-liner" style="margin-top:8px;">${cpl.name} · ${cpl.cn} · 建议 ${target[0]}-${target[1]} MIN</div>

        <div class="cardio-methods">
          ${CARDIO_OPTIONS.map(o => `<div class="cardio-m ${pref.method === o.id ? 'sel' : ''}" data-cd-method="${o.id}"><span class="cm-en">${o.en}</span><span class="cm-cn">${o.cn}</span></div>`).join('')}
        </div>

        <div class="field" style="margin-top:24px;"><label>目标时长（分钟）</label>
          <input type="number" class="cardio-input" data-cd-min value="${target[1]}" min="5" max="180">
        </div>
        <div class="field"><label>训练强度</label>
          <div class="seg-row">
            ${[['LOW','低'],['MED','中等'],['HIGH','高']].map(([k,l]) => `<div class="seg ${(pref.intensity || 'MED') === k ? 'sel' : ''}" data-cd-intensity="${k}"><span>${l}</span></div>`).join('')}
          </div>
        </div>

        <div class="step-nav" style="margin-top:30px;">
          <button class="btn btn-ghost" data-cancel-cardio>取消</button>
          <button class="btn btn-accent" data-start-cardio-session>开始 →</button>
        </div>
      </div>`;

    const sc = this.app;
    sc.querySelectorAll('[data-cd-method]').forEach(el => {
      el.onclick = () => {
        const d2 = Store.get();
        d2.cardioPrefs = Object.assign({}, d2.cardioPrefs || {}, { method: el.dataset.cdMethod });
        Store.save();
        this.startCardio();
      };
    });
    sc.querySelectorAll('[data-cd-intensity]').forEach(el => {
      el.onclick = () => {
        const d2 = Store.get();
        d2.cardioPrefs = Object.assign({}, d2.cardioPrefs || {}, { intensity: el.dataset.cdIntensity });
        Store.save();
        this.startCardio();
      };
    });
    sc.querySelectorAll('[data-cancel-cardio]').forEach(b => b.onclick = () => this.renderApp());
    sc.querySelectorAll('[data-start-cardio-session]').forEach(b => {
      b.onclick = () => {
        const d2 = Store.get();
        const min = Number(sc.querySelector('[data-cd-min]').value) || 30;
        d2.cardioPrefs = Object.assign({}, d2.cardioPrefs || {}, { targetMin: min });
        Store.save();
        this._beginCardioSession();
      };
    });
  },

  _beginCardioSession() {
    const d = Store.get();
    this.view = 'cardio';
    this._cardioStart = Date.now();
    this._cardioRunning = true;
    this._tick();
    this._cardioT = setInterval(() => this._tick(), 1000);

    this.app.innerHTML = `
      <div class="workout-screen">
        <div class="ex-header"><div class="ex-count">CARDIO IN PROGRESS</div></div>
        <div class="cardio-timer" data-cd-timer>00:00</div>
        <div class="one-liner" style="text-align:center;margin-top:6px;">保持节奏。别第一分钟就冲太猛。</div>
        <div class="step-nav" style="margin-top:40px;">
          <button class="btn btn-accent" data-finish-cardio>完成训练</button>
        </div>
      </div>`;
    this.app.querySelector('[data-finish-cardio]').onclick = () => this._finishCardio();
  },

  _tick() {
    const el = this.app.querySelector('[data-cd-timer]');
    if (!el || !this._cardioStart) return;
    const s = Math.floor((Date.now() - this._cardioStart) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    el.textContent = mm + ':' + ss;
  },

  _finishCardio() {
    clearInterval(this._cardioT);
    const d = Store.get();
    const duration = Math.round((Date.now() - (this._cardioStart || Date.now())) / 60000) || 1;
    const pref = d.cardioPrefs || {};
    const isActiveRecovery = Logic.todayType() === 'ACTIVE_RECOVERY';
    const method = CARDIO_OPTIONS.find(o => o.id === (pref.method || 'treadmill')) || CARDIO_OPTIONS[0];
    const hasDistance = ['treadmill', 'outdoor-run', 'elliptical', 'rowing', 'incline-walk'].includes(method.id);

    this.app.innerHTML = `
      <div class="workout-screen">
        <div class="ex-header"><div class="ex-count">${isActiveRecovery ? 'ACTIVE RECOVERY DONE' : 'CARDIO DONE'}</div></div>
        <div class="ex-title" style="margin-top:10px;">记录今天的${method.cn}</div>
        <div class="cardio-done-time">${method.en} · ${duration} MIN</div>

        ${hasDistance ? `<div class="field" style="margin-top:20px;"><label>距离（km）</label><input type="number" class="cardio-input" data-cd-dist value="" step="0.1" min="0" placeholder="例如 5.0"></div>` : ''}
        <div class="field"><label>平均心率（可选）</label><input type="number" class="cardio-input" data-cd-hr value="" step="1" min="40" max="220" placeholder="例如 145"></div>
        <div class="field"><label>今日感受</label>
          <div class="seg-row">
            ${[['easy','轻松'],['just','正好'],['hard','很累']].map(([k,l]) => `<div class="seg" data-cd-feel="${k}"><span>${l}</span></div>`).join('')}
          </div>
        </div>

        <div class="step-nav" style="margin-top:26px;">
          <button class="btn btn-ghost" data-cd-skip>跳过</button>
          <button class="btn btn-accent" data-cd-save>保存记录 →</button>
        </div>
      </div>`;

    const sc = this.app;
    let feel = '';
    sc.querySelectorAll('[data-cd-feel]').forEach(el => {
      el.onclick = () => {
        sc.querySelectorAll('[data-cd-feel]').forEach(x => x.classList.remove('sel'));
        el.classList.add('sel');
        feel = el.dataset.cdFeel;
      };
    });
    const save = (skip) => {
      const d2 = Store.get();
      const key = Store.todayKey();
      const dist = Number(sc.querySelector('[data-cd-dist]')?.value || 0);
      const hr = Number(sc.querySelector('[data-cd-hr]')?.value || 0);
      const isActiveRecovery = Logic.todayType() === 'ACTIVE_RECOVERY';
      const rec = {
        dateKey: key, type: isActiveRecovery ? 'ACTIVE_RECOVERY' : 'CARDIO', planDay: isActiveRecovery ? '主动恢复' : '有氧训练', duration,
        cardioMethod: method.id, cardioMethodCn: method.cn,
        distance: dist, avgHr: hr || null, feel: feel || null,
        volume: 0, setsDone: 0, setsTotal: 0, records: [], prs: []
      };
      const existingIdx = d2.workouts.findIndex(x => x.dateKey === key);
      if (existingIdx >= 0) d2.workouts[existingIdx] = rec;
      else d2.workouts.push(rec);
      if (feel) { d2.reviews = d2.reviews || {}; d2.reviews[key] = feel; }
      this._updateStreak(key);
      Store.save();
      this._toast(isActiveRecovery ? '主动恢复记录已保存。' : '有氧记录已保存。');
      this.renderApp();
      this.switchTab('today');
    };
    sc.querySelectorAll('[data-cd-save]').forEach(b => b.onclick = () => save(false));
    sc.querySelectorAll('[data-cd-skip]').forEach(b => b.onclick = () => save(true));
  },

  showStateCheck() {
    const d = Store.get();
    this.view = 'workout';
    const s = d.state || {};
    this.app.innerHTML = `
      <div class="workout-screen">
        <div class="ex-header"><div class="ex-count">PRE-WORKOUT</div></div>
        <div class="ex-title" style="margin-top:10px;">今天状态怎么样？</div>
        <div class="one-liner" style="margin-top:8px;">${Persona.softMode() ? '状态不好也没关系。今天降一点强度。' : '告诉系统你现在的状态，系统会调整今天的强度。'}</div>

        <div class="field" style="margin-top:30px;"><label>状态</label>
          <div class="state-quick">
            ${[['great','很好'],['good','正常'],['tired','有点累'],['wiped','很疲惫']].map(([k,l])=>`<div class="state-q ${s.energy===k?'selected':''}" data-energy="${k}"><div class="sq-t">${l}</div></div>`).join('')}
          </div>
        </div>
        <div class="field"><label>昨晚睡眠</label>
          <div class="state-quick">
            ${[['great','很好'],['good','一般'],['bad','较差']].map(([k,l])=>`<div class="state-q ${s.sleep===k?'selected':''}" data-sleep="${k}"><div class="sq-t">${l}</div></div>`).join('')}
          </div>
        </div>
        <div class="field"><label>身体有没有不舒服</label>
          <div class="state-quick">
            ${[['none','没有'],['shoulder','肩'],['back','腰'],['knee','膝'],['wrist','手腕'],['other','其他']].map(([k,l])=>`<div class="state-q ${s.ache===k?'selected':''}" data-ache="${k}"><div class="sq-t">${l}</div></div>`).join('')}
          </div>
        </div>

        ${this._stateHint(s)}

        <div class="step-nav" style="margin-top:32px;">
          <button class="btn btn-ghost" data-cancel-workout>取消</button>
          <button class="btn btn-accent" data-confirm-state>开练</button>
        </div>
      </div>`;

    const sc = this.app;
    const pick = (sel, key) => sc.querySelectorAll(sel).forEach(el => {
      el.onclick = () => {
        d.state = d.state || {};
        d.state[key] = el.dataset[Object.keys(el.dataset).find(k=>k.startsWith(key))] || el.dataset[key];
        Store.save();
        this.showStateCheck();
      };
    });
    sc.querySelectorAll('[data-energy]').forEach(el => { el.onclick = () => { d.state.energy = el.dataset.energy; Store.save(); this.showStateCheck(); }; });
    sc.querySelectorAll('[data-sleep]').forEach(el => { el.onclick = () => { d.state.sleep = el.dataset.sleep; Store.save(); this.showStateCheck(); }; });
    sc.querySelectorAll('[data-ache]').forEach(el => { el.onclick = () => { d.state.ache = el.dataset.ache; Store.save(); this.showStateCheck(); }; });

    sc.querySelectorAll('[data-cancel-workout]').forEach(b => b.onclick = () => this.renderApp());
    sc.querySelectorAll('[data-confirm-state]').forEach(b => b.onclick = () => this.beginWorkout());
  },

  _stateHint(s) {
    const soft = Persona.softMode();
    if (soft) {
      return `<div class="hua-msg"><div class="hm-tag">${this._tagFor('gentle')}</div><div class="hm-txt">${Persona.gentle(true)}</div></div>`;
    }
    return '';
  },

  // 消息署名标签：YAN MODE 用"妍宝"，其他模式用"系统"/"教练"
  _tagFor(pool) {
    const v = (Store.get() && Store.get().voice) || 'standard';
    if (v === 'yan') return '妍宝';
    return 'MING FIT';
  },

  beginWorkout() {
    const d = Store.get();
    this.workout = Logic.buildTodayWorkout(d.profile, d.plan);
    this.view = 'workout';
    // 训练前温馨文案（妍宝/系统）
    this._toast(Persona.preWarm(true));
    // 兜底：今天无动作（恢复日 / 空计划）时，给出友好提示而非白屏
    if (!this.workout.exercises || this.workout.exercises.length === 0) {
      this.app.innerHTML = `
        <div class="workout-screen">
          <div class="ex-header"><div class="ex-count">REST DAY</div></div>
          <div class="ex-title" style="margin-top:14px;">今天没有训练安排。</div>
          <div class="one-liner" style="margin-top:10px;">恢复也是训练的一部分。让身体休息，明天再战。</div>
          <div style="margin-top:34px;text-align:center;">
            <button class="btn btn-accent" data-back-home>返回首页</button>
          </div>
        </div>`;
      this.app.querySelector('[data-back-home]').onclick = () => this.renderApp();
      return;
    }
    this.renderExercise(0);
  },

  renderExercise(idx) {
    const w = this.workout;
    this.view = 'workout'; // 显式回到动作视图（避免 showRest 后残留 rest 态，保证暂离快照判断正确）
    this.curIdx = idx; // 当前动作序号（← TODAY 暂离快照用）
    const ex = w.exercises[idx];
    if (!ex) {
      // 兜底：动作缺失时直接完成或返回，避免崩溃白屏
      if (idx <= 0) { this.beginWorkout(); return; }
      this.finishWorkout();
      return;
    }
    const total = w.exercises.length;
    const next = idx + 1 < total ? w.exercises[idx+1] : null;
    const isLast = idx === total - 1;
    const isLastSet = ex.curSet >= ex.sets;

    // 单位：时间型动作（平板支撑/侧平板/慢走）用 SEC/MIN，不用 KG
    const isTime = ex.type === 'time';
    const unit = isTime ? String(ex.timeUnit || 'sec').toUpperCase() : 'KG';

    // 目标次数 = 上一组完成后计算
    const targetReps = ex.reps[1];
    const skipped = !!ex.skipped;
    const completedAll = ex.done.length >= ex.sets || skipped;

    // 上次记录展示（时间型显示时长，不用 kg）
    const lastDisplay = ex.lastRec
      ? (isTime ? `<b>${ex.lastRec.reps} ${unit}</b>` : `<b>${ex.lastRec.weight} kg × ${ex.lastRec.reps}</b>`)
      : '<b>首次训练</b>';

    // 当前组列表
    const setItems = Array.from({length: ex.sets}, (_,i)=>{
      const done = ex.done[i];
      const isCur = !done && !skipped && i === ex.done.length;
      if (skipped) {
        return `<div class="set-item" style="opacity:0.35;"><div><div class="s-name">SET ${String(i+1).padStart(2,'0')}</div><div class="s-val">SKIPPED</div></div><div class="s-status">—</div></div>`;
      }
      if (done) {
        const hit = done.reps >= targetReps;
        const v = done.weight ? `${done.weight} <span class="sv-lite">KG</span>` : `${done.reps} <span class="sv-lite">${unit}</span>`;
        return `<div class="set-item done"><div><div class="s-name">SET ${String(i+1).padStart(2,'0')}</div><div class="s-val">${v}</div></div><div class="s-status">${done.reps} ${unit} · ${hit?'✓':''}</div></div>`;
      }
      const vCur = isTime ? `${ex.reps[1]} <span class="sv-lite">${unit}</span>` : `${ex.weight} <span class="sv-lite">KG</span>`;
      if (isCur) {
        return `<div class="set-item current"><div><div class="s-name">SET ${String(i+1).padStart(2,'0')}</div><div class="s-val">${vCur}</div></div><div class="s-status">输入${isTime ? '时长' : '次数'}</div></div>`;
      }
      return `<div class="set-item" style="opacity:0.45;"><div><div class="s-name">SET ${String(i+1).padStart(2,'0')}</div><div class="s-val">${vCur}</div></div><div class="s-status">—</div></div>`;
    }).join('');

    // 本轮当前组目标（对第 curSet 组）
    const curTarget = ex.reps;

    this.app.innerHTML = `
      <div class="workout-screen">
        <div class="ex-header">
          <button class="ex-back" data-leave-today>← TODAY<span class="ex-back-cn">暂离保存</span></button>
          <div class="ex-count">${String(idx+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}</div>
        </div>
        <div class="ex-title">${ex.en}</div>
        <div class="ex-cn">${ex.cn}${ex.optional ? ' <span class="ex-opt-tag">OPTIONAL</span>' : ''}</div>
        <div class="ex-muscle">${ex.muscle} / ${ex.assist.join(' / ')}</div>

        <div class="last-time">上次：${lastDisplay}</div>

        <div class="target-row">
          <div class="target-weight">${isTime ? ex.reps[1] : ex.weight} <span class="unit">${unit}</span></div>
          <div class="target-meta">
            <div class="tm">${ex.sets} × ${ex.reps[0]}-${ex.reps[1]} ${unit}</div>
            <div class="tm-sm">RIR ${ex.rir} · 目标 ${targetReps}${isTime ? ' ' + unit : '+'}</div>
          </div>
        </div>

        <div class="set-list">${setItems}</div>

        ${!completedAll ? `
          <div class="reps-input">
            <div class="ri-label">${isTime ? '时长（' + unit + '）' : '次数'}</div>
            <div class="ri-controls">
              <div class="ri-step" data-reps-dec>−</div>
              <div class="ri-val" id="reps-val">${targetReps}</div>
              <div class="ri-step" data-reps-inc>+</div>
            </div>
          </div>
          <div class="riir-row">
            ${[0,1,2,3].map(r=>`<div class="riir" data-rir="${r}"><div class="rr-n">${r}</div><div class="rr-l">${r===0?'力竭':r+' 次余力'}</div></div>`).join('')}
          </div>
          <button class="btn" data-complete-set style="margin-top:20px;">COMPLETE SET</button>
          ${next ? `<button class="btn btn-ghost" data-skip-ex style="margin-top:10px;">跳过动作</button>` : ''}
        ` : `
          <div style="text-align:center;margin-top:26px;">
            <div class="eyebrow">${skipped ? '该动作已跳过' : '该动作全部完成'}</div>
            ${next ? `<button class="btn btn-dark" data-next-ex style="margin-top:16px;">下一个动作 →</button>` : `<button class="btn btn-accent" data-finish-workout style="margin-top:16px;">完成训练 →</button>`}
          </div>
        `}
      </div>`;

    // reps 增减
    let repsVal = targetReps;
    const repsEl = this.app.querySelector('#reps-val');
    if (repsEl) {
      this.app.querySelectorAll('[data-reps-inc]').forEach(b => b.onclick = () => { repsVal++; repsEl.textContent = repsVal; });
      this.app.querySelectorAll('[data-reps-dec]').forEach(b => b.onclick = () => { repsVal = Math.max(0, repsVal-1); repsEl.textContent = repsVal; });
    }
    let rirVal = ex.rir;
    this.app.querySelectorAll('[data-rir]').forEach(b => {
      if (ex.done.length === 0) { /* 首组默认 RIR */ }
      b.onclick = () => {
        this.app.querySelectorAll('[data-rir]').forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
        rirVal = Number(b.dataset.rir);
      };
    });

    const csBtn = this.app.querySelector('[data-complete-set]');
    if (csBtn) csBtn.onclick = () => {
      Logic.completeSet(this.workout, idx, ex.weight, repsVal, rirVal);
      // PR 检测：该组达到目标且重量>历史最佳
      this._checkPR(ex, repsVal);
      // 下一组或休息
      if (ex.done.length >= ex.sets) {
        // 该动作完成，进入休息或下一动作
        if (!next) {
          this.showRest(idx, true);
        } else {
          this.showRest(idx, false);
        }
      } else {
        this.showRest(idx, false);
      }
    };
    const skip = this.app.querySelector('[data-skip-ex]');
    if (skip) skip.onclick = () => {
      ex.skipped = true; // 标记跳过，暂离后恢复不再要求重做
      if (next) this.renderExercise(idx+1); else this.finishWorkout();
    };
    // ← TODAY 暂离返回：保存当前进度回首页（训练不结束）
    this.app.querySelectorAll('[data-leave-today]').forEach(b => b.onclick = () => this._leaveToToday());
    const nex = this.app.querySelector('[data-next-ex]');
    if (nex) nex.onclick = () => this.renderExercise(idx+1);
    const fin = this.app.querySelector('[data-finish-workout]');
    if (fin) fin.onclick = () => this.finishWorkout();
  },

  _checkPR(ex, reps) {
    const target = ex.reps[1];
    if (reps >= target) {
      const best = Store.bestOf(ex.exId);
      const isPR = !best || (ex.weight && ex.weight > best.weight) || (ex.weight && ex.weight === best.weight && reps > best.reps);
      if (isPR && ex.weight > 0) {
        this.workout.prs = this.workout.prs || [];
        this.workout.prs.push({ exId: ex.exId, en: ex.en, cn: ex.cn, weight: ex.weight, reps });
        // 记录 PR 闪屏（稍后集中展示）
      }
    }
  },

  showRest(idx, finishedEx, opts) {
    const o = opts || {};
    const w = this.workout;
    const ex = w.exercises[idx];
    const rest = o.restSec || ex.rest; // 目标休息时长（秒）
    this.view = 'rest';
    // 恢复模式按 wall-clock 计算剩余；全新休息从目标时长开始
    const left = (o.leftSec !== undefined) ? Math.max(0, Math.round(o.leftSec)) : rest;
    this.restLeft = left;
    // 记录休息上下文（← TODAY 暂离快照用）
    this.restIdx = idx;
    this.restFinishedEx = !!finishedEx;
    this.restSec = rest;
    this.restEndTs = Date.now() + left * 1000;
    const nextEx = idx + 1 < w.exercises.length ? w.exercises[idx+1] : null;
    let nextLabel = '即将完成训练';
    if (nextEx) {
      if (nextEx.type === 'time') {
        const u = String(nextEx.timeUnit || 'sec');
        nextLabel = `下一组：<b>${nextEx.cn} ${nextEx.reps && nextEx.reps[1] ? nextEx.reps[1] : ''} ${u}</b>`;
      } else if (nextEx.type === 'reps' || !nextEx.weight) {
        nextLabel = `下一组：<b>${nextEx.cn}（徒手）</b>`;
      } else {
        nextLabel = `下一组：<b>${nextEx.cn} ${nextEx.weight}kg</b>`;
      }
    }

    // 训练中低频对手彩蛋（12% 概率；RIVAL OFF / CARE 状态时关闭）
    const rivalLine = DailyPush.pickWorkoutRival({ rivalMode: DailyPush.rivalEnabled(), care: Persona.softMode() });
    // 休息已超时（暂离回来）→ REST COMPLETE
    const restComplete = left <= 0;

    this.app.innerHTML = `
      <div class="rest-screen">
        <button class="ex-back rest-back" data-leave-today>← TODAY<span class="ex-back-cn">暂离保存</span></button>
        <div class="rest-label">${restComplete ? 'REST COMPLETE' : 'REST'}</div>
        <div class="rest-time" id="rest-time">${this._fmt(left)}</div>
        <div class="rest-next">${nextLabel}</div>
        ${!restComplete && rivalLine ? `<div class="rest-rival">${rivalLine}</div>` : ''}
        <div class="rest-actions">
          <button class="btn btn-ghost" data-rest-skip style="flex:1;">${restComplete ? '继续下一组' : 'SKIP REST'}</button>
        </div>
      </div>`;
    this.app.querySelector('[data-rest-skip]').onclick = () => {
      clearInterval(this.restTimer);
      this._afterRest(idx, finishedEx);
    };
    this.app.querySelectorAll('[data-leave-today]').forEach(b => b.onclick = () => this._leaveToToday());

    // 倒计时：基于绝对结束时间（防定时器漂移；恢复时按实际经过时间计算剩余）
    clearInterval(this.restTimer);
    if (!restComplete) {
      this.restTimer = setInterval(() => {
        const l = Math.max(0, Math.round((this.restEndTs - Date.now()) / 1000));
        this.restLeft = l;
        const el = this.app.querySelector('#rest-time');
        if (el) {
          el.textContent = this._fmt(l);
          if (l <= 5 && l > 0) el.classList.add('accent-pulse');
        }
        if (l <= 0) {
          clearInterval(this.restTimer);
          this._afterRest(idx, finishedEx);
        }
      }, 250);
    }
  },

  _fmt(sec) {
    return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
  },

  _afterRest(idx, finishedEx) {
    const w = this.workout;
    // 如果刚完成的动作还有未完成组 -> 回到该动作继续
    const ex = w.exercises[idx];
    if (!ex.skipped && ex.done.length < ex.sets) {
      this.renderExercise(idx);
    } else if (idx + 1 < w.exercises.length) {
      // 下一个动作
      this.renderExercise(idx + 1);
    } else {
      this.finishWorkout();
    }
  },

  /* ---------- ← TODAY 暂离：保存当前训练状态，返回首页（训练不结束） ---------- */
  _persistWorkoutState() {
    const w = this.workout;
    if (!w) return;
    const d = Store.get();
    const key = Store.todayKey();
    const now = Date.now();
    // 快照：与 buildTodayWorkout 复用分支期望的 records 结构一致（含 skipped）
    const records = w.exercises.map(ex => ({
      exId: ex.exId, en: ex.en, cn: ex.cn, target: ex.target, muscle: ex.muscle, assist: ex.assist,
      setsTotal: ex.sets, reps: ex.reps, rir: ex.rir, rest: ex.rest,
      weight: ex.weight, lastSets: ex.lastSets,
      lastRec: ex.lastRec || (ex.done && ex.done.length ? ex.done[ex.done.length - 1] : null),
      done: ex.done || [], curSet: ex.curSet || 0,
      skipped: !!ex.skipped,
      timeUnit: ex.timeUnit || null, optional: !!ex.optional
    }));
    const rec = {
      dateKey: key, type: 'STRENGTH', planDay: w.planDay ? w.planDay.name : '力量训练',
      duration: Math.max(0, Math.round((now - (w.startTs || now)) / 60000)),
      volume: w.exercises.reduce((a, ex) => a + (ex.done || []).reduce((v, s) => v + (s.weight || 0) * s.reps, 0), 0),
      setsDone: w.exercises.reduce((a, ex) => a + (ex.done || []).length, 0),
      setsTotal: w.totalSets || 0,
      records, prs: w.prs || [],
      startTs: w.startTs || now,
      inProgress: true,
      // 离场位置：当前动作序号 + 休息计时快照
      currentIdx: (typeof this.curIdx === 'number' && this.curIdx >= 0) ? this.curIdx : 0,
      restSnapshot: (this.view === 'rest' && typeof this.restIdx === 'number')
        ? { idx: this.restIdx, finishedEx: !!this.restFinishedEx, restSec: this.restSec || 90, restEndTs: now + Math.max(0, this.restLeft || 0) * 1000, leftSec: Math.max(0, this.restLeft || 0) }
        : null
    };
    const existingIdx = d.workouts.findIndex(x => x.dateKey === key);
    if (existingIdx >= 0) d.workouts[existingIdx] = rec;
    else d.workouts.push(rec);
    Store.save();
  },

  _leaveToToday() {
    clearInterval(this.restTimer);
    this.restTimer = null;
    this._persistWorkoutState();
    this.workout = null;
    this.view = null;
    this.renderApp();
    this.switchTab('today');
  },

  finishWorkout() {
    const w = this.workout;
    const d = Store.get();
    clearInterval(this.restTimer);

    // 保存训练
    const key = Store.todayKey();
    const duration = Math.round((Date.now() - (w.startTs || Date.now())) / 60000);
    let volume = 0;
    let setsDone = 0;
    const records = [];

    w.exercises.forEach(ex => {
      ex.done.forEach(set => {
        volume += (set.weight || 0) * set.reps;
        setsDone++;
      });
      // 保存动作历史
      if (ex.done.length) {
        const last = ex.done[ex.done.length - 1];
        records.push({ exId: ex.exId, en: ex.en, cn: ex.cn, target: ex.target, weight: last.weight, reps: last.reps, rir: last.rir });
        // 记录到 exHistory
        ex.done.forEach(set => {
          Store.pushExHistory(ex.exId, { dateKey: key, weight: set.weight, reps: set.reps, rir: set.rir });
        });
      }
    });

    const workoutRec = {
      dateKey: key, type: 'STRENGTH', planDay: w.planDay ? w.planDay.name : '力量训练', duration, volume: Math.round(volume),
      setsDone, setsTotal: w.totalSets, records, prs: w.prs || [],
      startTs: w.startTs
    };
    // 覆盖当天已有记录
    const existingIdx = d.workouts.findIndex(x => x.dateKey === key);
    if (existingIdx >= 0) d.workouts[existingIdx] = workoutRec;
    else d.workouts.push(workoutRec);

    this._updateStreak(key);
    Store.save();
    this.workout = null;

    // DONE 闪白
    this._showDoneFlash(() => {
      this.renderSummary(workoutRec);
    });
  },

  _showDoneFlash(cb) {
    const f = document.createElement('div');
    f.className = 'done-flash in';
    f.innerHTML = `<div class="df-t">DONE.</div>`;
    this.app.appendChild(f);
    setTimeout(() => { f.remove(); cb(); }, 1600);
  },

  renderSummary(rec) {
    const d = Store.get();
    this.view = 'workout';
    const nextEx = [];

    // 为每个动作生成下一次建议
    rec.records.forEach(r => {
      const ex = EXERCISES[r.exId];
      if (!ex) return;
      const hist = Store.historyOf(r.exId);
      const todaySets = hist.filter(h => h.dateKey === Store.todayKey());
      const suggestion = Logic.suggestNext(r.exId, todaySets, ex.reps);
      if (suggestion) nextEx.push({ ex: ex, cn: ex.cn, text: suggestion.text, newWeight: suggestion.newWeight });
    });

    const prs = rec.prs || [];
    const tag = this._tagFor('done');
    // 完成训练后低频文案（20% 概率）
    const completionLine = DailyPush.pickCompletion();

    this.app.innerHTML = `
      <div class="workout-screen">
        <div class="summary-hero">
          <div class="sh-kicker">TODAY DONE</div>
          <div class="sh-time">${rec.duration} <span class="u">MIN</span></div>
          <div class="sh-sub">${rec.setsDone} / ${rec.setsTotal} SETS · ${rec.volume} KG</div>
        </div>
        ${completionLine ? `<div class="completion-line">${completionLine}</div>` : ''}

        ${prs.length ? `
          <div class="pr-banner">
            <div class="pb-k">NEW PR</div>
            <div class="pb-ex">${prs[0].en}</div>
            <div class="pb-v">${prs[0].weight} kg × ${prs[0].reps}</div>
          </div>
          <div class="hua-msg"><div class="hm-tag">${tag}</div><div class="hm-txt">${Persona.get('pr')}</div></div>` : ''}

        <div class="hua-msg" style="border-color:var(--line);">
          <div class="hm-tag" style="color:var(--faint);">${tag}</div>
          <div class="hm-txt">${Persona.get(rec.setsDone >= rec.setsTotal - 2 ? 'done' : 'underSet')}</div>
        </div>

        ${nextEx.length ? `<div class="next-session">
          <div class="ns-h">NEXT SESSION</div>
          ${nextEx.slice(0,4).map(n=>{
            const isTime = n.ex && n.ex.type === 'time';
            const unit = isTime ? ' ' + (n.ex.timeUnit || 'sec') : 'kg';
            return `<div class="next-row"><span class="n-ex">${n.cn}</span><span class="n-adj">${n.text.split('。')[0]} <b>${n.newWeight}${unit}</b></span></div>`;
          }).join('')}
        </div>` : ''}

        <div class="hua-msg" style="border-color:var(--line);">
          <div class="hm-tag" style="color:var(--faint);">${tag}</div>
          <div class="hm-txt">${Persona.get('done')}</div>
        </div>

        <button class="btn btn-accent" data-back-home style="margin-top:24px;">返回首页</button>
      </div>`;

    this.app.querySelector('[data-back-home]').onclick = () => {
      this.renderApp();
      this.switchTab('today');
      this.renderToday();
    };
  }
};
