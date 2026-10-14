/**
 * 衣柜计算器 V1 —— 实战版内核（2026-10-14 需求闭环）
 *
 * 锚点：用户 1775 真实落地案例（自己算料、自己下单、自己装，全部复现）
 * 需求文档：psc 07-主题/12-职业发展/07-小程序V1-衣柜计算器.md 第六节
 *
 * 结构（与博主斜撑式不同，按用户实物）：
 *   - 竖管落地（塑料堵头，不打孔不打胶），不打顶
 *   - 顶部：净深长侧杆（550）× 每竖管 1 根，两夹压在竖管顶上，尾端法兰上墙
 *     → 总高 = 竖管净长 + 两夹间隙 26 + 管径 25
 *   - 中部：短侧杆（260）× 每竖管 2 根（竖管 ≥2.4m 升 4 根，十八改），一端法兰上墙、一端两夹夹竖管
 *   - 顶层 = 井格托顶板（从里往外 5 根宽向承重杆 a~e，均布在净深上）：
 *       · a/b/d/e 行：长侧杆+两夹 + 通长段(区−42) + 一字夹对接 + 通长段 + 两夹+长侧杆
 *       · c 行（在竖管平面）：长侧杆+三夹(L 位：侧杆+竖杆+承重段) + 通长段 + 四夹(T 位：
 *         左右承重段+长侧杆+竖管四向交汇) + 通长段 + 三夹
 *     —— 命名按能夹几根管：两夹/(三字夹)/四夹，图上 T/L 指夹位形状
 *   - 其余层 = 列内独立杆（挂衣等）：两夹+杆+两夹，左右错层
 *   - 层板（列内）：前后 2 根层板杆，三字夹（竖筒套竖管 + 宽臂夹杆 + 深臂夹 260 侧杆）
 *     × 4 托住，板直接搁
 *   - 顶部通长挂衣杆（可选，2026-10-14 四改）：井格下方过柱——两夹(边柱)+段+一字夹(中柱)+段+两夹，
 *     段 = 区−42（口径同顶板承重段）
 *   - 台面（可选/列，四改；十八改上限跟短侧杆档位）：短侧杆档位处宽向双杆当台面——
 *     b 杆三夹套竖杆（深臂夹 260 侧杆）、a 杆两夹夹侧杆；a/b 夹的是同一根侧杆；每列最多 = 档位数
 *
 * 常数（用户自己的件实测锁定，博主的是另一家厂，不用）：
 *   两夹/三字夹占位 25 · 一字夹占位 17 · 顶轨间隙 26 · 管外径 25 · 顶板承重杆固定 5 根
 *
 * 公式（2026-10-14 五改拍板）：全部宽向杆统一通长口径 = 区净宽 − 42（两夹 25 + 一字夹 17），
 * 同列只切一种长度；±10 容差，宜长不宜短
 */

const CONST = {
  clamp: 25, // 两夹（及三字夹宽臂）占位 mm
  inline: 17, // 一字夹占位 mm
  railGap: 26, // 顶部长侧杆与竖管顶的间隙 mm
  pipe: 25, // 管外径 mm
  topRods: 5, // 顶板承重杆固定 5 根（从里往外 a~e，c 行在竖管平面）
}

const DEFAULTS = {
  reserve: 30, // 每侧预留 mm（法兰拧螺丝的扳手空间；用户实装 26.5~29，拍板 30）——固定值，页面不可改
  curtainGap: 50, // 前方帘子余量 mm
  sideRod: 260, // 中部短侧杆长 mm——固定值，页面不可改
  maxZone: 1000, // 区净宽上限（防挂衣杆下弯，沿阳台架口径）
  maxZones: 6, // 列数上限（V1）
  tolerance: 10, // 下料容差 mm
}

/**
 * 自动分区：列数 = ceil(框架总宽 / 1000)，一列 ≤1m；各区净宽均分（余数摊给前几列）
 * 框架总宽 = 内空 − 2×预留；区净宽合计 = 框架总宽 − 竖管数×25
 * @returns { frameWidth, cols, posts, zones:[{width}] }
 */
function planZones(nicheWidth, reserve = DEFAULTS.reserve) {
  const frameWidth = nicheWidth - 2 * reserve
  const cols = Math.max(1, Math.ceil(frameWidth / DEFAULTS.maxZone))
  const posts = cols + 1
  const total = frameWidth - posts * CONST.pipe
  const base = Math.floor(total / cols)
  const rem = total - base * cols
  const zones = []
  for (let i = 0; i < cols; i++) zones.push({ width: base + (i < rem ? 1 : 0) })
  return { frameWidth, cols, posts, zones }
}

/**
 * @param {object} input
 * @param {number} input.nicheWidth   墙内空宽 mm（总宽 = 内空 − 2×预留 校验用）
 * @param {number} input.postLength   竖管净长 mm
 * @param {number} input.netDepth     净深 mm（= 顶部长侧杆长）
 * @param {number} [input.reserve]    每侧预留，默认 30
 * @param {number} [input.curtainGap] 帘子余量，默认 50
 * @param {number} [input.sideRod]    短侧杆长，默认 260
 * @param {number} [input.topHangRod] 顶部通长挂衣杆 0/1（井格下方：两夹边柱+段+一字夹中柱，段=区−42）
 * @param {Array}  input.zones  [{ width, independent, shelves, counter }] × 1~6 列
 *   列数用 planZones 按总宽自动算（一列 ≤1m）；shelves 每列 0~1 块（每块 = 前+后 2 根层板杆 × 4 三字夹，十八改起页面不再展示）
 *   counter 每列 0~短侧杆档位数块台面（2000 档 0~2、≥2400 档 0~4；架在短侧杆档位上：a 两夹夹侧杆 + b 三夹套竖杆，统一 区−42）
 *   顶板承重杆固定 5 根/列（通长口径），不算在 independent 里
 */
function computeWardrobe(input) {
  const errors = []
  const warnings = []
  const { nicheWidth, postLength, netDepth } = input
  const reserve = input.reserve || DEFAULTS.reserve
  const curtainGap = input.curtainGap || DEFAULTS.curtainGap
  const sideRod = input.sideRod || DEFAULTS.sideRod
  const topHang = input.topHangRod ? 1 : 0 // 顶部通长挂衣杆
  const zones = input.zones || []
  // 短侧杆档位（十八改）：竖管 ≥2.4m 每竖管 4 根（离地 300/1000/1700/2300，最高一根留 100 给顶轨两夹），
  // 否则 2 根（300/1000）——台面只能架在短侧杆上，故台面上限 = 档位数
  const tieLevels = postLength >= 2400 ? [300, 1000, 1700, 2300] : [300, 1000]
  const tieCount = tieLevels.length

  if (!Array.isArray(zones) || zones.length < 1 || zones.length > DEFAULTS.maxZones) {
    errors.push(`分区数须为 1~${DEFAULTS.maxZones} 列（列数按总宽自动算，一列 ≤1m）`)
  }
  zones.forEach((z, i) => {
    const tag = zones.length === 1 ? '' : `第 ${i + 1} 列`
    if (!(z.width > 0)) errors.push(`${tag}区净宽无效`)
    if ((z.independent || 0) < 0) errors.push(`${tag}独立层数无效`)
    if ((z.shelves || 0) < 0 || (z.shelves || 0) > 1) errors.push(`${tag}层板数须为 0 或 1 块`)
    if ((z.counter || 0) < 0 || (z.counter || 0) > tieCount)
      errors.push(`${tag}台面数须为 0~${tieCount} 块（只能架在短侧杆上，上限跟短侧杆档位数）`)
  })
  if (!(nicheWidth > 0)) errors.push('内空宽无效')
  if (!(postLength > 0)) errors.push('竖管净长无效')
  if (!(netDepth > 0)) errors.push('净深无效')
  if (errors.length) return { ok: false, errors, warnings }

  const c = CONST
  const posts = zones.length + 1

  // —— 三向尺寸 ——
  const frameWidth = zones.reduce((s, z) => s + z.width, 0) + posts * c.pipe
  const totalHeight = postLength + c.railGap + c.pipe
  const totalDepth = netDepth + curtainGap
  const targetWidth = nicheWidth - 2 * reserve

  if (Math.abs(targetWidth - frameWidth) > DEFAULTS.tolerance) {
    warnings.push(
      `分区合计 ${frameWidth} 与 内空−2×预留 ${targetWidth} 差 ${Math.abs(targetWidth - frameWidth)}mm（>10），建议调分区净宽`
    )
  }
  zones.forEach((z, i) => {
    if (z.width > DEFAULTS.maxZone) {
      const tag = zones.length === 1 ? '该列' : zones.length === 2 ? (i === 0 ? '左列' : '右列') : `第 ${i + 1} 列`
      warnings.push(`${tag}净宽 ${z.width} > 1000，挂衣杆易下弯，建议加分竖管`)
    }
  })
  if (postLength < 1300) warnings.push(`竖管 ${postLength} 偏矮，长衣（≥1500 挂高）会拖地`)

  // —— 管材下料（按类型分长；同列差 8mm，±10 容差内可统一切一种，宜长不宜短）——
  const cuts = []
  cuts.push({ name: '竖管（落地立柱）', len: postLength, count: posts, note: '底部塑料堵头，不打孔不打胶' })
  cuts.push({ name: '长侧杆（顶部·深度方向）', len: netDepth, count: posts, note: '两夹压竖管顶，尾端法兰上墙' })
  cuts.push({ name: '短侧杆（中部拉墙）', len: sideRod, count: posts * tieCount, note: `每竖管 ${tieCount} 根（竖管${postLength >= 2400 ? ' ≥2.4m' : ' <2.4m'}档），尾端法兰上墙` })

  let rodTotal = 0
  const indepTotal = zones.reduce((s, z) => s + (z.independent || 0), 0)
  zones.forEach((z, i) => {
    const tag = zones.length === 1 ? '' : zones.length === 2 ? `${i === 0 ? '左' : '右'}列` : `第 ${i + 1} 列`
    // 顶板承重杆固定 5 根（从里往外 a~e），通长口径 = 区净宽 − 25 − 17
    cuts.push({
      name: `${tag}顶板承重段`,
      len: z.width - c.clamp - c.inline,
      count: c.topRods,
      note: '顶部宽向 ×5（a~e 托顶板；c 行过柱用 L/T 夹）',
    })
    if (topHang) {
      cuts.push({
        name: `${tag}顶部挂衣段`,
        len: z.width - c.clamp - c.inline,
        count: 1,
        note: '通长挂衣杆过柱：两夹(边柱)+段+一字夹(中柱)，口径同顶板承重段',
      })
    }
    if (z.independent > 0) {
      cuts.push({
        name: `${tag}独立挂衣杆`,
        len: z.width - c.clamp - c.inline,
        count: z.independent,
        note: '统一通长口径：与顶板段同长下料，两夹端头、左右错层',
      })
    }
    if (z.shelves > 0) {
      cuts.push({ name: `${tag}层板杆（前+后）`, len: z.width - c.clamp - c.inline, count: 2 * z.shelves, note: '统一通长口径，三字夹托板，板直接搁' })
    }
    if (z.counter > 0) {
      cuts.push({
        name: `${tag}台面杆（前+后）`,
        len: z.width - c.clamp - c.inline,
        count: 2 * z.counter,
        note: '统一通长口径：底部侧杆处双杆（a 两夹夹侧杆 + b 三夹套竖杆，同一根侧杆）',
      })
    }
    rodTotal += c.topRods + topHang + z.independent + 2 * (z.shelves || 0) + 2 * (z.counter || 0)
  })

  // —— 按长度合并下料单（同长合并一根条目，用途写进描述）——
  const mergedMap = new Map()
  cuts.forEach((it) => {
    const k = it.len
    if (!mergedMap.has(k)) mergedMap.set(k, { len: it.len, count: 0, names: [] })
    const m = mergedMap.get(k)
    m.count += it.count
    m.names.push(`${it.name}×${it.count}`)
  })
  const mergedCuts = [...mergedMap.values()].sort((a, b) => b.len - a.len)

  // —— 切割方案（原管 6000mm，贪心装箱：每次尽量装满一根）——
  const STOCK = 6000
  const SAW = 3 // 每刀锯缝 3mm
  const pieces = [] // 展开成单根：{len, name}
  cuts.forEach((it) => { for (let i = 0; i < it.count; i++) pieces.push({ len: it.len, name: it.name }) })
  pieces.sort((a, b) => b.len - a.len)
  const bars = [] // 每根 {remain, items:[{len,name}] }
  pieces.forEach((p) => {
    const cost = p.len + SAW
    let bar = bars.find((b) => b.remain >= cost)
    if (!bar) { bar = { remain: STOCK, items: [] }; bars.push(bar) }
    bar.remain -= cost
    bar.items.push(p)
  })
  const cuttingPlan = bars.map((b, i) => {
    const byLen = {}
    b.items.forEach((it) => { byLen[it.len] = (byLen[it.len] || 0) + 1 })
    const desc = Object.keys(byLen).sort((x, y) => y - x).map((l) => `${byLen[l]}根×${l}`).join(' + ')
    return { no: i + 1, desc, remain: b.remain + SAW } // 最后一根尾料不扣锯缝
  })
  const planText = [
    `管材切割方案（原管 ${STOCK}mm，锯缝 ${SAW}mm）：共 ${cuttingPlan.length} 根`,
    ...cuttingPlan.map((r) => `第${r.no}根：${r.desc}，余 ${r.remain}mm`),
  ].join('\n')

  const shelves = zones.reduce((s, z) => s + (z.shelves || 0), 0)
  const counters = zones.reduce((s, z) => s + (z.counter || 0), 0)

  // —— 配件清单（按顶层井格 a~e 结构拆解）——
  // a/b/d/e 行（4 根）：两端两夹连长侧杆 + 中柱一字夹对接
  // c 行（1 根，在竖管平面）：两端三夹(L 位) + 中柱四夹(T 位：左右段+长侧杆+竖管)
  const gridEndClamps = 2 * (c.topRods - 1) // a/b/d/e 两端 = 8（1775 实购对上）
  const gridInline = (c.topRods - 1) * (zones.length - 1) // 顶板 a/b/d/e 中柱对接
  const hangInline = topHang ? zones.length - 1 : 0 // 顶部挂衣杆中柱（一字夹中心孔套柱）
  const railClamps = posts // 长侧杆两夹压顶
  // 【二十三改】相邻两列台面在同一档位汇合：公共竖杆上左右两列 b 杆 + 短侧杆同点 → 用
  // 四夹（T 型）1 个顶替两个三夹（各深臂省掉）；仅单侧有台面的档位仍是三夹
  const sharedCounterLv = (() => {
    let n = 0
    for (let t = 0; t < tieCount; t++) {
      for (let i = 0; i + 1 < zones.length; i++) {
        if ((zones[i].counter || 0) > t && (zones[i + 1].counter || 0) > t) n++
      }
    }
    return n
  })()
  const tieClamps = posts * tieCount - Math.min(4 * shelves + 2 * counters, posts * tieCount) // 短侧杆竖管端（层板/台面夹具深臂覆盖的扣除）
  const hangEndClamps = 2 * (indepTotal + topHang) // 独立杆 + 顶部挂衣杆两端
  const counterClamps = 2 * counters // 台面 a 杆两端（两夹夹侧杆）
  // 配件排序（十九改）：两夹 → 一字夹 → 三夹 → 四夹 → 法兰底座 → 塑料堵头（五夹预留，暂未入 BOM）
  const parts = [
    {
      label: '两夹',
      count: gridEndClamps + railClamps + tieClamps + hangEndClamps + counterClamps,
      usage: `顶板杆端头 ${gridEndClamps} + 顶轨 ${railClamps} + 短侧杆 ${tieClamps} + 挂衣杆端头 ${hangEndClamps} + 台面a杆 ${counterClamps}`,
    },
    {
      label: '一字夹',
      count: gridInline + hangInline,
      usage: `顶板 a/b/d/e 行中柱对接 ${gridInline}${hangInline ? ` + 顶部挂衣杆中柱 ${hangInline}` : ''}`,
    },
    {
      label: '三夹（三字夹）',
      count: 2 + 4 * shelves + 2 * counters - sharedCounterLv,
      usage: `顶板 c 行两端 2（长侧杆+竖管+承重段）${shelves ? ` + 层板角 ${shelves} 块 × 4` : ''}${counters ? ` + 台面b杆两端 ${2 * counters - sharedCounterLv}` : ''}${sharedCounterLv ? `（左右台面同档汇合 ${sharedCounterLv} 处改四夹已扣）` : ''}`,
    },
    {
      label: '四夹',
      count: zones.length - 1 + sharedCounterLv,
      usage: `顶板 c 行（竖管平面）中柱：左右承重段+长侧杆+竖管${sharedCounterLv ? ` + 台面同档汇合公共柱 ${sharedCounterLv}` : ''}`,
    },
    { label: '法兰底座', count: (1 + tieCount) * posts, usage: `顶轨上墙 ${posts} + 短侧杆上墙 ${tieCount * posts}` },
    { label: '塑料堵头', count: 2 * posts, usage: `竖管底 ${posts} + 顶轨前端 ${posts}` },
  ]

  return {
    ok: true,
    errors,
    warnings,
    posts,
    frameWidth,
    totalHeight,
    totalDepth,
    targetWidth,
    cuts,
    mergedCuts,
    cuttingPlan,
    planText,
    parts,
    // 供页面/画图用
    zones: zones.map((z) => ({
      width: z.width,
      independent: z.independent || 0,
      shelfRods: 2 * (z.shelves || 0),
      counter: z.counter || 0,
    })),
    topHang: !!topHang,
    tieCount, // 短侧杆每竖管根数（十八改：竖管≥2.4m → 4，否则 2）
    tieLevels, // 短侧杆离地高度档（mm，画图用）——台面只能架在这些档位上
    rodTotal,
  }
}

module.exports = { computeWardrobe, planZones, CONST, DEFAULTS }
