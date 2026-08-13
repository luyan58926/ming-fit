/* ============================================================
   MING FIT — DATA
   动作库 · 方案模板 · 肌肉映射 · 器械匹配
   ============================================================ */

const DB = {
  GOALS: {
    fatloss: { name: '减脂', days: 4, cardio: '每周 2 次低强度有氧', focus: { core: 3, leg: 4, upper: 3 } },
    muscle: { name: '增肌', days: 4, cardio: '每周 1 次低强度有氧', focus: { chest: 4, back: 4, shoulder: 3 } },
    recomp: { name: '增肌减脂 · 身材重塑', days: 4, cardio: '每周 2 次低强度有氧', focus: { leg: 4, glute: 3, core: 3 } },
    strength: { name: '力量提升', days: 3, cardio: '每周 1 次低强度有氧', focus: { chest: 4, back: 4, leg: 4 } },
    posture: { name: '体态改善', days: 3, cardio: '每周 1 次低强度有氧', focus: { back: 4, core: 3, shoulder: 3 } },
    health: { name: '健康 · 保持运动', days: 3, cardio: '每周 1–2 次有氧', focus: { core: 3, leg: 3, upper: 3 } },
  },

  BODY_FOCUS: {
    chest: '胸', back: '背', shoulder: '肩', arms: '手臂',
    leg: '腿', glute: '臀', waist: '腰腹', full: '全身'
  },

  LEVELS: {
    new: { name: '新手', range: '0–6 个月', sets: '3', reps: '12–15', rir: '2–3' },
    beginner: { name: '初级', range: '6 个月–2 年', sets: '3–4', reps: '8–12', rir: '1–2' },
    intermediate: { name: '中级', range: '2 年以上稳定', sets: '4', reps: '6–10', rir: '1–2' },
    advanced: { name: '高级', range: '长期系统训练', sets: '4–5', reps: '4–8', rir: '0–1' }
  },

  RISKS: {
    shoulder: '肩部不适', lowerback: '腰部不适', knee: '膝盖不适',
    wrist: '手腕不适', hip: '髋部活动受限', injury: '近期受伤', other: '其他身体问题'
  },
  RISK_BAN: {
    shoulder: ['barbell-overhead-press', 'dip'],
    knee: ['back-squat', 'barbell-lunge'],
    lowerback: ['barbell-deadlift', 'good-morning', 'back-extension'],
    wrist: ['barbell-bench-press', 'push-up'],
    hip: ['barbell-lunge', 'back-squat']
  },

  LOCATIONS: {
    gym: '商业健身房', homegym: '家庭健身房', home: '家里简单器械', bodyweight: '徒手训练'
  },

  EQUIP_ACTIONS: {
    barbell: ['杠铃卧推', '杠铃深蹲', '杠铃硬拉', '杠铃推举', '杠铃划船', '牧师凳杠铃弯举'],
    dumbbell: ['哑铃卧推', '哑铃推举', '哑铃划船', '哑铃侧平举', '哑铃弯举', '哑铃箭步蹲'],
    smith: ['杠铃深蹲'],
    cable: ['绳索下压', '绳索夹胸', '绳索三头下压', '站立飞鸟'],
    lat: ['高位下拉', '高位下拉器械'],
    row: ['坐姿划船', '坐姿划船器械'],
    machine: ['腿举', '45°倒蹬机', '器械臀推', '坐式推胸', '器械夹胸', '反向飞鸟', '大腿内收', '大腿外展', '坐式腿屈伸'],
    leg_ext: ['腿屈伸', '坐式腿屈伸'],
    leg_curl: ['腿弯举'],
    band: [],
    bar: ['引体向上'],
    bench: ['杠铃卧推', '哑铃卧推'],
    none: ['俯卧撑', '卷腹', '平板支撑', '侧平板支撑', '反向卷腹']
  }
};

/* ===== 动作库 =====
   level: 最低经验  equip: 所需器械关键字
   若所需器械不在用户可用器械中，动作被过滤或替换为替代动作
*/
const EXERCISES = {
  // ===== 胸 =====
  'barbell-bench-press': {
    en: 'BARBELL BENCH PRESS', cn: '杠铃卧推',
    muscle: '胸大肌', assist: ['三角肌前束', '肱三头肌'],
    target: '胸', level: 'beginner', sets: 4, reps: [6, 8], rir: 2, rest: 150,
    equip: ['barbell', 'bench'],
    points: ['肩胛后缩并保持稳定', '双脚稳定踩地', '胸廓保持自然稳定', '杠铃下降到适当位置', '前臂尽量接近垂直', '推起时保持肩部稳定'],
    mistakes: ['肩膀前送', '手腕过度后折', '肘部过度外展', '臀部明显离开训练凳', '下放速度完全失控'],
    alts: ['dumbbell-bench-press', 'push-up']
  },
  'dumbbell-bench-press': {
    en: 'DUMBBELL BENCH PRESS', cn: '哑铃卧推',
    muscle: '胸大肌', assist: ['三角肌前束', '肱三头肌'],
    target: '胸', level: 'beginner', sets: 4, reps: [8, 12], rir: 1, rest: 120,
    equip: ['dumbbell', 'bench'],
    points: ['肩胛下沉收紧', '下放时肘部约 45 度', '哑铃在胸部两侧缓慢下降', '推起时哑铃向中间靠拢'],
    mistakes: ['肩膀前送', '下放过深导致肩部受压', '手腕折压'],
    alts: ['barbell-bench-press', 'push-up']
  },
  'incline-db-press': {
    en: 'INCLINE DUMBBELL PRESS', cn: '上斜哑铃卧推',
    muscle: '胸大肌上束', assist: ['三角肌前束'],
    target: '胸', level: 'beginner', sets: 3, reps: [8, 12], rir: 1, rest: 120,
    equip: ['dumbbell', 'bench'],
    points: ['凳面约 30 度', '肩胛下沉', '缓慢下放至上胸', '推起时上胸发力'],
    mistakes: ['角度过大变成推肩', '肩膀前送'],
    alts: ['dumbbell-bench-press', 'barbell-bench-press']
  },
  'push-up': {
    en: 'PUSH-UP', cn: '俯卧撑',
    muscle: '胸大肌', assist: ['肱三头肌', '核心'],
    target: '胸', level: 'new', sets: 3, reps: [10, 15], rir: 2, rest: 90,
    equip: ['none'],
    points: ['身体保持一条直线', '双手略宽于肩', '下降时肘部约 45 度', '核心收紧不塌腰'],
    mistakes: ['塌腰', '只做半程', '颈部前伸'],
    alts: ['dumbbell-bench-press', 'push-up']
  },

  // ===== 背 =====
  'barbell-row': {
    en: 'BARBELL ROW', cn: '杠铃划船',
    muscle: '背阔肌', assist: ['斜方肌', '肱二头肌', '竖脊肌'],
    target: '背', level: 'beginner', sets: 4, reps: [6, 10], rir: 1, rest: 150,
    equip: ['barbell'],
    points: ['俯身约 45 度', '核心收紧', '杠铃沿大腿拉向腹部', '肩胛后收'],
    mistakes: ['身体过度晃动', '耸肩', '用腰部发力'],
    alts: ['seated-row', 'dumbbell-row']
  },
  'dumbbell-row': {
    en: 'DUMBBELL ROW', cn: '哑铃划船',
    muscle: '背阔肌', assist: ['斜方肌', '肱二头肌'],
    target: '背', level: 'beginner', sets: 3, reps: [8, 12], rir: 1, rest: 120,
    equip: ['dumbbell', 'bench'],
    points: ['单臂支撑在凳上', '背部平直', '哑铃拉向髋部', '顶端稍停'],
    mistakes: ['身体旋转', '耸肩'],
    alts: ['barbell-row', 'seated-row']
  },
  'lat-pulldown': {
    en: 'LAT PULLDOWN', cn: '高位下拉',
    muscle: '背阔肌', assist: ['肱二头肌', '大圆肌'],
    target: '背', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 120,
    equip: ['lat'],
    points: ['握距略宽于肩', '下沉肩胛', '拉向锁骨方向', '避免身体大幅后仰'],
    mistakes: ['借力后仰', '手臂主导发力', '耸肩'],
    alts: ['pull-up', 'seated-row']
  },
  'seated-row': {
    en: 'SEATED CABLE ROW', cn: '坐姿划船',
    muscle: '背阔肌', assist: ['斜方肌', '菱形肌', '肱二头肌'],
    target: '背', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 120,
    equip: ['row'],
    points: ['身体微前倾', '拉向腹部', '肩胛后收', '缓慢还原'],
    mistakes: ['身体大幅摆动', '耸肩'],
    alts: ['barbell-row', 'dumbbell-row']
  },
  'pull-up': {
    en: 'PULL-UP', cn: '引体向上',
    muscle: '背阔肌', assist: ['肱二头肌', '斜方肌'],
    target: '背', level: 'intermediate', sets: 3, reps: [6, 10], rir: 2, rest: 150,
    equip: ['bar'],
    points: ['握距略宽于肩', '从完全悬垂开始', '胸部拉向横杆', '控制下放'],
    mistakes: ['借助摆动', '半程', '耸肩'],
    alts: ['lat-pulldown', 'seated-row']
  },

  // ===== 肩 =====
  'barbell-overhead-press': {
    en: 'BARBELL OVERHEAD PRESS', cn: '杠铃推举',
    muscle: '三角肌前束', assist: ['三角肌中束', '肱三头肌', '上胸'],
    target: '肩', level: 'beginner', sets: 4, reps: [6, 8], rir: 1, rest: 150,
    equip: ['barbell'],
    points: ['核心收紧', '杠铃从锁骨上方推起', '头部微前移让杠铃过顶', '全程不塌腰'],
    mistakes: ['过度后仰借力', '肘部过宽', '腰部代偿'],
    alts: ['dumbbell-shoulder-press', 'db-lateral-raise']
  },
  'dumbbell-shoulder-press': {
    en: 'DUMBBELL SHOULDER PRESS', cn: '哑铃推举',
    muscle: '三角肌前束', assist: ['三角肌中束', '肱三头肌'],
    target: '肩', level: 'beginner', sets: 3, reps: [8, 10], rir: 1, rest: 120,
    equip: ['dumbbell'],
    points: ['坐姿或站姿', '哑铃在耳朵两侧', '向上推起', '顶部不碰撞'],
    mistakes: ['腰部代偿', '推举路径偏前'],
    alts: ['barbell-overhead-press', 'db-lateral-raise']
  },
  'db-lateral-raise': {
    en: 'DUMBBELL LATERAL RAISE', cn: '哑铃侧平举',
    muscle: '三角肌中束', assist: ['斜方肌'],
    target: '肩', level: 'new', sets: 3, reps: [12, 15], rir: 1, rest: 75,
    equip: ['dumbbell'],
    points: ['身体微前倾', '手臂微屈', '侧举至肩高', '缓慢下放'],
    mistakes: ['耸肩', '甩动借力', '举得过高'],
    alts: ['dumbbell-shoulder-press', 'barbell-overhead-press']
  },

  // ===== 手臂 =====
  'barbell-curl': {
    en: 'BARBELL CURL', cn: '杠铃弯举',
    muscle: '肱二头肌', assist: ['肱肌', '前臂'],
    target: '手臂', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 90,
    equip: ['barbell'],
    points: ['上臂夹紧身体', '缓慢弯举', '下放控制', '不借力摆动'],
    mistakes: ['身体后仰借力', '肘部前移'],
    alts: ['db-curl', 'barbell-curl']
  },
  'db-curl': {
    en: 'DUMBBELL CURL', cn: '哑铃弯举',
    muscle: '肱二头肌', assist: ['肱肌'],
    target: '手臂', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 90,
    equip: ['dumbbell'],
    points: ['上臂固定', '手腕中立', '缓慢下放'],
    mistakes: ['身体摆动', '甩动借力'],
    alts: ['barbell-curl', 'db-curl']
  },
  'cable-pushdown': {
    en: 'CABLE PUSHDOWN', cn: '绳索下压',
    muscle: '肱三头肌', assist: [],
    target: '手臂', level: 'new', sets: 3, reps: [10, 15], rir: 1, rest: 75,
    equip: ['cable'],
    points: ['上臂夹紧身体', '向下压至手臂伸直', '缓慢还原'],
    mistakes: ['身体前倾借力', '肘部外展'],
    alts: ['db-curl', 'barbell-curl']
  },
  'db-tricep-extension': {
    en: 'DB TRICEP EXTENSION', cn: '哑铃臂屈伸',
    muscle: '肱三头肌', assist: [],
    target: '手臂', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 75,
    equip: ['dumbbell'],
    points: ['双手托哑铃于头顶', '肘部固定', '缓慢下放再伸直'],
    mistakes: ['肘部外展', '借力'],
    alts: ['cable-pushdown', 'db-curl']
  },

  // ===== 腿 =====
  'back-squat': {
    en: 'BACK SQUAT', cn: '杠铃深蹲',
    muscle: '股四头肌', assist: ['臀大肌', '腘绳肌', '竖脊肌'],
    target: '腿', level: 'beginner', sets: 4, reps: [6, 10], rir: 1, rest: 180,
    equip: ['barbell'],
    points: ['杠铃置于斜方肌上', '双脚略宽于肩', '膝盖与脚尖同向', '下蹲至大腿平行或稍低', '核心全程收紧'],
    mistakes: ['膝盖内扣', '重心前移脚后跟离地', '弓背', '下蹲过快'],
    alts: ['leg-press', 'barbell-lunge']
  },
  'leg-press': {
    en: 'LEG PRESS', cn: '腿举',
    muscle: '股四头肌', assist: ['臀大肌'],
    target: '腿', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 150,
    equip: ['machine'],
    points: ['背部贴紧椅背', '膝盖与脚尖同向', '下放至 90 度附近', '不锁死膝盖'],
    mistakes: ['下放过深腰部离座', '膝盖内扣'],
    alts: ['back-squat', 'barbell-lunge']
  },
  'barbell-lunge': {
    en: 'BARBELL LUNGE', cn: '杠铃箭步蹲',
    muscle: '股四头肌', assist: ['臀大肌', '腘绳肌'],
    target: '腿', level: 'beginner', sets: 3, reps: [8, 10], rir: 1, rest: 150,
    equip: ['barbell'],
    points: ['身体直立', '跨步向前', '前膝与脚尖同向', '后膝接近地面'],
    mistakes: ['前膝内扣', '身体前倾过度'],
    alts: ['leg-press', 'back-squat']
  },
  'leg-extension': {
    en: 'LEG EXTENSION', cn: '腿屈伸',
    muscle: '股四头肌', assist: [],
    target: '腿', level: 'new', sets: 3, reps: [12, 15], rir: 1, rest: 90,
    equip: ['leg_ext'],
    points: ['调整靠垫至踝部', '缓慢伸直膝盖', '顶端稍停', '缓慢下放'],
    mistakes: ['速度过快', '顶端猛踢'],
    alts: ['back-squat', 'leg-press']
  },
  'leg-curl': {
    en: 'LEG CURL', cn: '腿弯举',
    muscle: '腘绳肌', assist: [],
    target: '腿', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 90,
    equip: ['leg_curl'],
    points: ['垫片置于跟腱处', '髋部贴紧', '缓慢弯起', '控制下放'],
    mistakes: ['髋部抬起', '速度过快'],
    alts: ['barbell-lunge', 'back-squat']
  },

  // ===== 臀 =====
  'barbell-deadlift': {
    en: 'BARBELL DEADLIFT', cn: '杠铃硬拉',
    muscle: '臀大肌', assist: ['腘绳肌', '竖脊肌', '背阔肌'],
    target: '臀', level: 'intermediate', sets: 3, reps: [4, 6], rir: 2, rest: 180,
    equip: ['barbell'],
    points: ['杠铃贴近小腿', '背部平直', '双脚与髋同宽', '用臀腿发力站起', '顶端不后仰'],
    mistakes: ['弓背', '杠铃离身体太远', '过度后仰'],
    alts: ['barbell-row', 'back-squat']
  },
  'hip-thrust': {
    en: 'BARBELL HIP THRUST', cn: '杠铃臀桥',
    muscle: '臀大肌', assist: ['腘绳肌'],
    target: '臀', level: 'beginner', sets: 3, reps: [8, 12], rir: 1, rest: 150,
    equip: ['barbell', 'bench'],
    points: ['肩胛靠在凳上', '杠铃置于髋部', '顶髋至躯干水平', '顶端挤压臀部'],
    mistakes: ['腰部代偿', '幅度过小'],
    alts: ['barbell-deadlift', 'barbell-lunge']
  },

  // ===== 腰腹 / 核心 =====
  'crunch': {
    en: 'CRUNCH', cn: '卷腹', type: 'reps',
    muscle: '腹直肌', assist: [],
    target: '腰腹', level: 'new', sets: 3, reps: [15, 20], rir: 2, rest: 60,
    equip: ['none'],
    points: ['仰卧屈膝', '用腹部卷起上背', '缓慢下放'],
    mistakes: ['用手拉脖子', '腰部离地'],
    alts: ['plank', 'crunch']
  },
  'plank': {
    en: 'PLANK', cn: '平板支撑',
    muscle: '核心', assist: ['腹直肌', '腹横肌'],
    target: '腰腹', level: 'new', sets: 3, reps: [30, 60], rir: 2, rest: 60,
    equip: ['none'],
    points: ['肘部支撑', '身体成直线', '核心收紧', '正常呼吸'],
    mistakes: ['塌腰', '臀部抬高', '憋气'],
    alts: ['crunch', 'plank']
  },
  'hanging-leg-raise': {
    en: 'HANGING LEG RAISE', cn: '悬垂举腿',
    muscle: '下腹部', assist: ['屈髋肌'],
    target: '腰腹', level: 'intermediate', sets: 3, reps: [10, 15], rir: 2, rest: 90,
    equip: ['bar'],
    points: ['悬垂于单杠', '骨盆后倾', '缓慢抬腿', '控制下放'],
    mistakes: ['摆动借力', '用惯性甩腿'],
    alts: ['crunch', 'plank']
  },

  /* ============================================================
     以下为明哥正式周计划新增动作（器械为主）
     时间型动作（无 KG）用 timeUnit: 'sec' 标记；重量型默认用 KG。
     ============================================================ */

  // ===== 臀腿（周一 LOWER BODY） =====
  'leg-press-45': {
    en: '45° LEG PRESS', cn: '45°倒蹬机', type: 'weight',
    muscle: '股四头肌', assist: ['臀大肌', '腘绳肌'],
    target: '腿', level: 'new', sets: 4, reps: [10, 12], rir: 1, rest: 120,
    equip: ['machine'],
    points: ['背部贴紧椅垫', '双脚踩稳踏板与髋同宽', '下放至约 90 度，膝盖不内扣', '脚后跟发力蹬起，不完全锁死膝盖', '全程腰背不离垫'],
    mistakes: ['膝盖内扣', '下放过深导致腰部离垫', '锁死膝盖', '双手死拽把手借力'],
    alts: ['leg-press', 'back-squat'],
    videoTitle: '45° 倒蹬机 动作示范', videoPlatform: 'pending'
  },
  'seated-leg-extension': {
    en: 'SEATED LEG EXTENSION', cn: '坐式腿屈伸', type: 'weight',
    muscle: '股四头肌', assist: [],
    target: '腿', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 90,
    equip: ['leg_ext'],
    points: ['调整靠垫至踝关节上方', '身体坐直贴靠背', '缓慢伸直膝盖', '顶端停顿 1 秒再缓慢下放', '避免速度过快猛踢'],
    mistakes: ['顶端猛踢借力', '下放过快', '身体后仰代偿'],
    alts: ['leg-extension', 'back-squat'],
    videoTitle: '坐式腿屈伸 动作示范', videoPlatform: 'pending'
  },
  'machine-hip-thrust': {
    en: 'MACHINE HIP THRUST', cn: '器械臀推', type: 'weight',
    muscle: '臀大肌', assist: ['腘绳肌'],
    target: '臀', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 120,
    equip: ['machine'],
    points: ['肩胛靠在器械靠垫上', '髋部发力向上顶起', '顶端挤压臀部停顿', '控制下放不完全贴地'],
    mistakes: ['腰部代偿', '顶端不挤压', '幅度过小'],
    alts: ['hip-thrust', 'barbell-deadlift'],
    videoTitle: '器械臀推 动作示范', videoPlatform: 'pending'
  },
  'hip-adduction': {
    en: 'HIP ADDUCTION', cn: '大腿内收机', type: 'weight',
    muscle: '大腿内收肌', assist: ['耻骨肌'],
    target: '腿', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 75,
    equip: ['machine'],
    points: ['坐姿挺直背部', '大腿内侧发力向中间夹拢', '顶端停顿', '缓慢控制打开'],
    mistakes: ['用腰部摇晃借力', '打开过快'],
    alts: ['hip-abduction', 'seated-leg-extension'],
    videoTitle: '大腿内收机 动作示范', videoPlatform: 'pending'
  },
  'hip-abduction': {
    en: 'HIP ABDUCTION', cn: '大腿外展机', type: 'weight',
    muscle: '臀中肌', assist: ['臀大肌'],
    target: '臀', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 75,
    equip: ['machine'],
    points: ['坐姿挺直背部', '双腿向外打开', '顶端停顿感受臀部发力', '缓慢控制收回'],
    mistakes: ['借力猛开', '上半身前倾代偿'],
    alts: ['hip-adduction', 'db-lateral-raise'],
    videoTitle: '大腿外展机 动作示范', videoPlatform: 'pending'
  },
  'glute-stretch': {
    en: 'GLUTE STATIC STRETCH', cn: '臀腿静态拉伸', type: 'time', timeUnit: 'min',
    muscle: '臀 · 腘绳肌', assist: ['髋部'],
    target: '臀', level: 'new', sets: 1, reps: [8, 10], rir: 0, rest: 30,
    equip: ['none'],
    points: ['拉伸时不弹震', '每个动作保持 20-30 秒', '感受到牵拉但无刺痛', '配合深呼吸放松'],
    mistakes: ['弹震式拉伸', '憋气', '拉到剧痛'],
    alts: ['glute-stretch'],
    videoTitle: '臀腿静态拉伸 示范', videoPlatform: 'pending'
  },
  'incline-walk-optional': {
    en: 'LOW INCLINE WALK', cn: '低坡度慢走（可选）', type: 'time', timeUnit: 'min', optional: true,
    muscle: '全身', assist: ['心肺'],
    target: 'full', level: 'new', sets: 1, reps: [15, 20], rir: 0, rest: 30,
    equip: ['none'],
    points: ['坡度 0-2，速度平缓', '保持能说话不喘的节奏', '作为力量日的收尾放松'],
    mistakes: ['速度过快', '当成冲刺走'],
    alts: ['incline-walk-optional'],
    videoTitle: '低坡度慢走 示范', videoPlatform: 'pending'
  },

  // ===== 胸肩手臂（周三 UPPER PUSH） =====
  'chest-press-machine': {
    en: 'SEATED CHEST PRESS', cn: '坐式推胸器械', type: 'weight',
    muscle: '胸大肌', assist: ['三角肌前束', '肱三头肌'],
    target: '胸', level: 'new', sets: 4, reps: [10, 12], rir: 1, rest: 120,
    equip: ['machine'],
    points: ['调整座椅使把手与胸中部同高', '肩胛后收下沉', '向前推至手臂接近伸直不锁死', '缓慢还原', '全程核心收紧'],
    mistakes: ['肩膀前送', '推得过快', '肘部过度外展', '座椅高度不当'],
    alts: ['barbell-bench-press', 'dumbbell-bench-press'],
    videoTitle: '坐式推胸器械 动作示范', videoPlatform: 'pending'
  },
  'pec-deck-fly': {
    en: 'PEC DECK FLY', cn: '器械夹胸飞鸟', type: 'weight',
    muscle: '胸大肌', assist: [],
    target: '胸', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 90,
    equip: ['machine'],
    points: ['调整座椅高度使把手与胸部同高', '背部贴紧靠垫', '双臂微屈向中间夹拢', '顶端挤压胸部停顿', '缓慢打开还原'],
    mistakes: ['耸肩', '肘部完全伸直', '用手臂而非胸部发力'],
    alts: ['cable-crossover', 'chest-press-machine'],
    videoTitle: '器械夹胸飞鸟 动作示范', videoPlatform: 'pending'
  },
  'cable-lateral-raise': {
    en: 'CABLE LATERAL RAISE', cn: '站立飞鸟机（侧平举）', type: 'weight',
    muscle: '三角肌中束', assist: ['斜方肌'],
    target: '肩', level: 'new', sets: 4, reps: [12, 15], rir: 1, rest: 75,
    equip: ['cable'],
    points: ['单侧或双侧握把手', '身体微侧倾', '手臂微屈侧举至肩高', '缓慢下放'],
    mistakes: ['耸肩', '甩动借力', '举得过高'],
    alts: ['db-lateral-raise', 'chest-press-machine'],
    videoTitle: '站立飞鸟机 动作示范', videoPlatform: 'pending'
  },
  'tricep-pushdown-machine': {
    en: 'TRICEP PUSHDOWN MACHINE', cn: '三头下压训练器', type: 'weight',
    muscle: '肱三头肌', assist: [],
    target: '手臂', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 75,
    equip: ['cable'],
    points: ['上臂夹紧身体', '向下压至手臂伸直', '顶端停顿', '缓慢还原'],
    mistakes: ['身体前倾借力', '肘部外展', '下压不完全'],
    alts: ['cable-pushdown', 'db-tricep-extension'],
    videoTitle: '三头下压 动作示范', videoPlatform: 'pending'
  },
  'ezbar-preacher-curl': {
    en: 'EZ BAR PREACHER CURL', cn: '牧师凳杠铃弯举', type: 'weight',
    muscle: '肱二头肌', assist: ['肱肌'],
    target: '手臂', level: 'new', sets: 4, reps: [10, 12], rir: 1, rest: 90,
    equip: ['barbell'],
    points: ['上臂贴紧牧师凳垫面', '缓慢弯举', '顶端挤压二头', '缓慢下放至近伸直'],
    mistakes: ['身体后仰借力', '肘部离开垫面', '下放太快'],
    alts: ['barbell-curl', 'db-curl'],
    videoTitle: '牧师凳杠铃弯举 动作示范', videoPlatform: 'pending'
  },
  'reverse-crunch': {
    en: 'REVERSE CRUNCH', cn: '反向卷腹', type: 'reps',
    muscle: '下腹部', assist: ['屈髋肌'],
    target: '腰腹', level: 'new', sets: 3, reps: [10, 12], rir: 2, rest: 60,
    equip: ['none'],
    points: ['仰卧双手放两侧', '用腹部卷起下背离开垫面', '膝盖向胸口收紧', '缓慢下放'],
    mistakes: ['用手推地借力', '动作过快用惯性'],
    alts: ['crunch', 'hanging-leg-raise'],
    videoTitle: '反向卷腹 动作示范', videoPlatform: 'pending'
  },

  // ===== 背肩后束手臂（周五 UPPER PULL） =====
  'lat-pulldown-machine': {
    en: 'LAT PULLDOWN MACHINE', cn: '高位下拉器械', type: 'weight',
    muscle: '背阔肌', assist: ['肱二头肌', '大圆肌'],
    target: '背', level: 'new', sets: 4, reps: [10, 12], rir: 1, rest: 120,
    equip: ['lat'],
    points: ['握距略宽于肩', '下沉肩胛', '拉向锁骨方向', '避免身体大幅后仰'],
    mistakes: ['借力后仰', '手臂主导发力', '耸肩'],
    alts: ['lat-pulldown', 'pull-up'],
    videoTitle: '高位下拉 动作示范', videoPlatform: 'pending'
  },
  'seated-row-machine': {
    en: 'SEATED ROW MACHINE', cn: '坐姿划船器械', type: 'weight',
    muscle: '背阔肌', assist: ['斜方肌', '菱形肌', '肱二头肌'],
    target: '背', level: 'new', sets: 4, reps: [10, 12], rir: 1, rest: 120,
    equip: ['row'],
    points: ['身体微前倾', '拉向腹部', '肩胛后收', '缓慢还原'],
    mistakes: ['身体大幅摆动', '耸肩'],
    alts: ['seated-row', 'barbell-row'],
    videoTitle: '坐姿划船 动作示范', videoPlatform: 'pending'
  },
  'reverse-fly-nautilus': {
    en: 'REVERSE FLY (NAUTILUS)', cn: '反向飞鸟鹦鹉螺', type: 'weight',
    muscle: '三角肌后束', assist: ['菱形肌', '斜方肌'],
    target: '肩', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 75,
    equip: ['machine'],
    points: ['胸部贴靠垫面', '双臂微屈向两侧打开', '肩胛后收', '顶端停顿', '缓慢还原'],
    mistakes: ['耸肩', '用手臂甩动', '肘部过度弯曲'],
    alts: ['reverse-fly', 'db-lateral-raise'],
    videoTitle: '反向飞鸟 动作示范', videoPlatform: 'pending'
  },
  'cable-rope-pushdown': {
    en: 'CABLE ROPE PUSHDOWN', cn: '绳索三头下压', type: 'weight',
    muscle: '肱三头肌', assist: [],
    target: '手臂', level: 'new', sets: 3, reps: [10, 12], rir: 1, rest: 75,
    equip: ['cable'],
    points: ['上臂夹紧身体', '绳索向下压至手臂伸直并外展', '顶端停顿', '缓慢还原'],
    mistakes: ['身体前倾借力', '肘部外展', '下压不完全'],
    alts: ['cable-pushdown', 'tricep-pushdown-machine'],
    videoTitle: '绳索三头下压 动作示范', videoPlatform: 'pending'
  },
  'plank-hold': {
    en: 'PLANK HOLD', cn: '平板支撑', type: 'time', timeUnit: 'sec',
    muscle: '核心', assist: ['腹直肌', '腹横肌'],
    target: '腰腹', level: 'new', sets: 3, reps: [30, 35], rir: 2, rest: 60,
    equip: ['none'],
    points: ['肘部支撑', '身体成一条直线', '核心收紧', '正常呼吸不憋气'],
    mistakes: ['塌腰', '臀部抬高', '憋气'],
    alts: ['crunch', 'reverse-crunch'],
    videoTitle: '平板支撑 动作示范', videoPlatform: 'pending'
  },
  'side-plank': {
    en: 'SIDE PLANK', cn: '侧平板支撑', type: 'time', timeUnit: 'sec',
    muscle: '腹斜肌', assist: ['核心'],
    target: '腰腹', level: 'new', sets: 3, reps: [30, 35], rir: 2, rest: 60,
    equip: ['none'],
    points: ['单肘撑地', '身体侧面成直线', '髋部抬高', '左右各一组交替', '核心收紧'],
    mistakes: ['髋部下塌', '身体前后晃动', '憋气'],
    alts: ['plank-hold', 'crunch'],
    videoTitle: '侧平板支撑 动作示范', videoPlatform: 'pending'
  }
};

/* ===== 方案生成 =====
   根据 目标 + 可用器械 + 经验 + 风险 生成周计划
   返回：{ planName, days: [{label, type, muscles, exercises:[...] }], focus }
*/
function buildPlan(profile) {
  const goal = DB.GOALS[profile.goal] || DB.GOALS.muscle;
  const level = profile.level || 'beginner';
  const loc = profile.location;
  const availEquip = profile.equipment || [];
  const risks = profile.risks || [];

  // 是否有杠铃/哑铃/器械（决定是否能做复合动作）
  const hasBarbell = availEquip.includes('barbell');
  const hasDumbbell = availEquip.includes('dumbbell');
  const hasMachine = availEquip.includes('machine') || availEquip.includes('lat') || availEquip.includes('row');

  // 评估适合的动作：经验>=动作level，器械满足，未被风险禁用
  const banned = new Set();
  risks.forEach(r => (DB.RISK_BAN[r] || []).forEach(id => banned.add(id)));

  const usable = (id) => {
    const ex = EXERCISES[id];
    if (!ex) return false;
    const lvRank = { new: 0, beginner: 1, intermediate: 2, advanced: 3 };
    if (lvRank[level] < lvRank[ex.level]) return false;
    if (banned.has(id)) return false;
    // 器械匹配：动作所需器械至少有一项在可用器械中
    const exEquip = ex.equip || [];
    if (exEquip.includes('none')) return true;
    const ok = exEquip.some(e => availEquip.includes(e));
    return ok;
  };

  const pool = {
    chest: ['barbell-bench-press', 'dumbbell-bench-press', 'incline-db-press', 'push-up'].filter(usable),
    back: ['barbell-row', 'dumbbell-row', 'lat-pulldown', 'seated-row', 'pull-up'].filter(usable),
    shoulder: ['barbell-overhead-press', 'dumbbell-shoulder-press', 'db-lateral-raise'].filter(usable),
    arms: ['barbell-curl', 'db-curl', 'cable-pushdown', 'db-tricep-extension'].filter(usable),
    leg: ['back-squat', 'leg-press', 'barbell-lunge', 'leg-extension', 'leg-curl'].filter(usable),
    glute: ['barbell-deadlift', 'hip-thrust', 'barbell-lunge'].filter(usable),
    core: ['crunch', 'plank', 'hanging-leg-raise'].filter(usable)
  };

  // 兜底：某类为空时从整体动作池补
  const allIds = Object.keys(EXERCISES).filter(usable);
  Object.keys(pool).forEach(k => {
    if (pool[k].length === 0) {
      pool[k] = allIds.filter(id => EXERCISES[id].target === k);
      if (pool[k].length === 0) pool[k] = allIds.slice(0, 2);
    }
  });

  // 依据身体关注重点加权
  const focusKey = profile.bodyFocus || 'full';
  const focusPriority = ['chest', 'back', 'shoulder', 'arms', 'leg', 'glute', 'core'];
  // 简化：直接编排 4 个训练日
  const upperA = pick(pool.chest, 1).concat(pick(pool.back, 1)).concat(pick(pool.shoulder, 1)).concat(pick(pool.arms, 1));
  const upperB = pick(pool.chest, 1).concat(pick(pool.back, 1)).concat(pick(pool.shoulder, 1)).concat(pick(pool.core, 1));
  const lowerA = pick(pool.leg, 1).concat(pick(pool.glute, 1)).concat(pick(pool.leg, 1)).concat(pick(pool.core, 1));
  const lowerB = pick(pool.leg, 1).concat(pick(pool.glute, 1)).concat(pick(pool.core, 1)).concat(pick(pool.arms, 1));
  const upperC = pick(pool.chest, 1).concat(pick(pool.back, 1)).concat(pick(pool.shoulder, 1)).concat(pick(pool.arms, 1));

  // 动作去重保持顺序
  const uniq = (arr) => [...new Set(arr)];

  let plan;
  const daysWanted = Math.max(2, Math.min(4, goal.days || 4));

  if (daysWanted >= 4) {
    plan = {
      name: goal.name + ' · 进阶塑形',
      goalName: goal.name,
      cardio: goal.cardio,
      week: 12,
      days: [
        { label: '周一', type: '训练', name: '上肢 A', muscles: '胸 · 背 · 肩', exercises: uniq(upperA), restNote: 50 },
        { label: '周二', type: '训练', name: '下肢 A', muscles: '腿 · 臀 · 核心', exercises: uniq(lowerA), restNote: 55 },
        { label: '周三', type: '恢复', name: '有氧 / 恢复', muscles: '低强度有氧 · 拉伸', exercises: [], restNote: 40 },
        { label: '周四', type: '训练', name: '上肢 B', muscles: '胸 · 背 · 肩', exercises: uniq(upperB), restNote: 50 },
        { label: '周五', type: '休息', name: '休息', muscles: '', exercises: [], restNote: 0 },
        { label: '周六', type: '训练', name: '下肢 B', muscles: '腿 · 臀 · 核心', exercises: uniq(lowerB), restNote: 55 },
        { label: '周日', type: '休息', name: '休息', muscles: '', exercises: [], restNote: 0 }
      ],
      focus: computeFocus(focusKey, goal)
    };
  } else {
    plan = {
      name: goal.name + ' · 每周三练',
      goalName: goal.name,
      cardio: goal.cardio,
      week: 12,
      days: [
        { label: '周一', type: '训练', name: '全身 A', muscles: '胸 · 背 · 腿', exercises: uniq(pick(pool.chest,1).concat(pick(pool.back,1)).concat(pick(pool.leg,1))), restNote: 55 },
        { label: '周二', type: '休息', name: '休息', muscles: '', exercises: [], restNote: 0 },
        { label: '周三', type: '训练', name: '上肢', muscles: '胸 · 背 · 肩 · 手臂', exercises: uniq(upperC), restNote: 50 },
        { label: '周四', type: '休息', name: '休息', muscles: '', exercises: [], restNote: 0 },
        { label: '周五', type: '训练', name: '下肢', muscles: '腿 · 臀 · 核心', exercises: uniq(lowerB), restNote: 55 },
        { label: '周六', type: '恢复', name: '有氧 / 恢复', muscles: '低强度有氧 · 拉伸', exercises: [], restNote: 40 },
        { label: '周日', type: '休息', name: '休息', muscles: '', exercises: [], restNote: 0 }
      ],
      focus: computeFocus(focusKey, goal)
    };
  }
  return plan;
}

function pick(arr, n) {
  const a = arr.slice();
  const out = [];
  for (let i = 0; i < n && a.length; i++) {
    const idx = Math.floor(Math.random() * a.length);
    out.push(a.splice(idx, 1)[0]);
  }
  return out;
}

function computeFocus(focusKey, goal) {
  const base = { 胸: 3, 背: 3, 肩: 3, 腿: 3, 臀: 3, 核心: 3, 手臂: 3 };
  // 目标加权
  if (goal.focus) {
    if (goal.focus.chest) base['胸'] += 1;
    if (goal.focus.back) base['背'] += 1;
    if (goal.focus.shoulder) base['肩'] += goal.focus.shoulder >= 4 ? 1 : 0;
    if (goal.focus.leg) base['腿'] += 1;
    if (goal.focus.glute) base['臀'] += 1;
    if (goal.focus.core) base['核心'] += goal.focus.core >= 4 ? 1 : 0;
  }
  // 身体关注加权
  const fmap = { chest: '胸', back: '背', shoulder: '肩', arms: '手臂', leg: '腿', glute: '臀', waist: '核心', full: null };
  if (fmap[focusKey]) base[fmap[focusKey]] += 1;
  return base;
}

/* ============================================================
   每周训练安排 —— 明哥正式周计划
   周一 LOWER BODY · 周二 CARDIO A · 周三 UPPER PUSH
   周四 ACTIVE RECOVERY · 周五 UPPER PULL · 周六 CARDIO B · 周日 FULL REST
   这套计划为 TODAY / PLAN / STATS / 动作详情 / 训练记录的唯一依据。
   ============================================================ */

// 力量日模板（周[0]=周一 臀腿 / 周[2]=周三 胸肩手臂 / 周[4]=周五 背肩后束手臂）
const STRENGTH_TEMPLATES = {
  0: { // 周一 LOWER BODY —— 臀腿力量
    name: 'LOWER BODY',
    cn: '臀腿力量',
    dayCn: '臀腿力量日',
    restNote: 75,
    muscles: '臀 · 腿 · 核心',
    target: '臀腿',
    exercises: ['leg-press-45', 'seated-leg-extension', 'machine-hip-thrust', 'hip-adduction', 'hip-abduction', 'glute-stretch', 'incline-walk-optional']
  },
  2: { // 周三 UPPER PUSH —— 胸 / 肩 / 手臂（推）
    name: 'UPPER PUSH',
    cn: '胸 · 肩 · 手臂',
    dayCn: '胸肩手臂日',
    restNote: 65,
    muscles: '胸 · 肩 · 三头 · 核心',
    target: '胸肩臂',
    exercises: ['chest-press-machine', 'pec-deck-fly', 'cable-lateral-raise', 'tricep-pushdown-machine', 'ezbar-preacher-curl', 'crunch', 'reverse-crunch']
  },
  4: { // 周五 UPPER PULL —— 背 / 肩后束 / 手臂（拉）
    name: 'UPPER PULL',
    cn: '背 · 肩后束 · 手臂',
    dayCn: '背肩后束手臂日',
    restNote: 70,
    muscles: '背 · 肩后束 · 二头 · 核心',
    target: '背肩臂',
    exercises: ['lat-pulldown-machine', 'seated-row-machine', 'reverse-fly-nautilus', 'cable-rope-pushdown', 'ezbar-preacher-curl', 'plank-hold', 'side-plank']
  }
};

// 有氧日模板：周二 CARDIO A / 周六 CARDIO B —— 爬坡有氧
const CARDIO_TEMPLATES = {
  1: { name: 'CARDIO A', cn: '爬坡有氧', intensity: '中等', profile: '坡度 8 / 4.0 km/h', stages: ['热身 3min（坡度2/4.2）', '爬坡 40min（坡度8/4.0）', '放松慢走 10min', '全身拉伸 10min'], targetMin: [40, 60] },
  5: { name: 'CARDIO B', cn: '爬坡有氧', intensity: '中等', profile: '坡度 8 / 4.0 km/h', stages: ['热身 3min（坡度2/4.2）', '爬坡 40min（坡度8/4.0）', '放松慢走 10min', '全身拉伸 10min'], targetMin: [40, 60] }
};

// 主动恢复日（周四）—— 轻度有氧二选一 + 全身拉伸 + 恢复提醒
const ACTIVE_RECOVERY_TEMPLATE = {
  name: 'ACTIVE RECOVERY',
  cn: '主动恢复',
  dayCn: '主动恢复日',
  targetMin: [35, 40],
  options: [
    { id: 'treadmill-walk', en: 'TREADMILL WALK', cn: '跑步机慢走', profile: '坡度 4-5 / 3.2-3.5 km/h' },
    { id: 'elliptical-low', en: 'ELLIPTICAL LOW', cn: '椭圆机低阻力', profile: '低阻力慢速' }
  ],
  stretchMin: 15,
  reminders: ['补充肌酸', '多喝水', '饮食清淡', '注意恢复']
};

// 完全恢复日（周日）—— 充分休息，不做力量，可选轻度活动
const FULL_REST_TEMPLATE = {
  name: 'FULL REST',
  cn: '完全恢复',
  dayCn: '完全恢复日',
  note: '今天的任务：恢复。充分休息全天，不做力量训练。',
  optional: ['散步', '轻度拉伸']
};

// 有氧方式选项
const CARDIO_OPTIONS = [
  { id: 'treadmill', en: 'TREADMILL', cn: '跑步机' },
  { id: 'outdoor-run', en: 'OUTDOOR RUN', cn: '户外跑' },
  { id: 'elliptical', en: 'ELLIPTICAL', cn: '椭圆机' },
  { id: 'bike', en: 'CYCLE', cn: '动感单车' },
  { id: 'rowing', en: 'ROWING', cn: '划船机' },
  { id: 'incline-walk', en: 'INCLINE WALK', cn: '爬坡走' },
  { id: 'jump-rope', en: 'JUMP ROPE', cn: '跳绳' },
  { id: 'other', en: 'OTHER', cn: '其他' }
];
