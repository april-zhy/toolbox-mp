/**
 * 衣柜内核验收测试（V1 实战版）
 * 运行：node test/wardrobe.js
 *
 * 主锚点 = 用户 1775 真实落地案例（自己算料自己装）：
 *   内空 1775 / 净深 550 + 帘 50 / 竖管 2000×3
 *   顶层井格（2026-10-14 三改）：5 根宽向承重杆从里往外 a~e 托顶板
 *     a/b/d/e：长侧杆+两夹+735+一字夹+810+两夹；c 行（竖管平面）：三夹(L位)+735+四夹(T位)+810+三夹
 *     命名按能夹几根管：T字夹=四夹、L夹=三夹（即三字夹）——用户 2026-10-14 确认
 *   左列 735×6 = 顶板承重 738×5 + 挂衣独立 738×1 统一切
 *   右列 810×5 = 顶板承重 820×5（右柱下方通高挂长衣，无下层杆）
 *   实购：两夹 19、法兰 9、堵头 6 全对上 ✅
 *   一字夹 4 + L夹 2 + T字夹 1（用量）vs 实购 一字夹 3 + 三字夹 4（含备件），总数 7=7，映射待确认
 *
 * 2026-10-14 四改（现建）：+顶部通长挂衣杆（两夹+735+一字夹+810+两夹）、左列挂衣+1、
 *   右列挂衣+1（两夹+810+两夹）、左列台面双杆（a 侧杆+两夹+735+两夹+侧杆 /
 *   b 侧杆+竖杆+三夹+735+三夹+竖杆+侧杆，a/b 同一根侧杆）→ 左 735×10、右 810×7
 *
 * 2026-10-14 五改：全部宽向杆统一 区−42（同列只切一种长度）——独立/层板/台面杆由 区−50 改为
 *   区−42（738/820）；画图侧杆高度 30/100/200cm 口径、三视图同一比例（纯页面，不动本内核数量）
 *
 * 2026-10-14 加列：列数按总宽自动算（ceil(总宽/1000)，一列 ≤1m）→ planZones + 多列恒等式
 */
const { computeWardrobe, planZones } = require('../utils/wardrobe.js')

let failed = 0
function check(name, actual, expected) {
  const pass = actual === expected
  if (!pass) failed++
  console.log(`${pass ? '✅' : '❌'} ${name}：期望 ${expected}，实际 ${actual}`)
}
function checkClose(name, actual, expected, tol) {
  const pass = Math.abs(actual - expected) <= tol
  if (!pass) failed++
  console.log(`${pass ? '✅' : '❌'} ${name}：期望 ${expected}±${tol}，实际 ${actual}`)
}

// —— 死验收用例 1：1775 原建（顶板井格 + 左挂 1，实购全部对上的主锚点）——
const CASE = {
  nicheWidth: 1775,
  postLength: 2000,
  netDepth: 550,
  zones: [
    { width: 780, independent: 1, shelves: 0 },
    { width: 862, independent: 0, shelves: 0 },
  ],
}
const r = computeWardrobe(CASE)

check('计算成功', r.ok, true)
check('竖管数', r.posts, 3)
check('框架总宽 = Σ区净宽 + 3×25', r.frameWidth, 1717) // 780+862+75，实测 1717 ✅
check('总高 = 竖管 + 26 + 25', r.totalHeight, 2051) // 用户口径 ≈2050
check('总深 = 净深 + 帘 50', r.totalDepth, 600)
check('规划宽 = 内空 − 2×30', r.targetWidth, 1715) // 与 1717 差 2，容差内
check('分区 vs 内空无警告', r.warnings.length, 0)
check('横杆总数 = 左 6 + 右 5', r.rodTotal, 11)

// 下料单（理论切长，用户实切在 ±10 内统一成一种）
const cut = (name) => r.cuts.find((x) => x.name === name)
check('竖管 2000×3', cut('竖管（落地立柱）').count + '×' + cut('竖管（落地立柱）').len, '3×2000')
check('长侧杆 550×3', cut('长侧杆（顶部·深度方向）').count + '×' + cut('长侧杆（顶部·深度方向）').len, '3×550')
check('短侧杆 260×6', cut('短侧杆（中部拉墙）').count + '×' + cut('短侧杆（中部拉墙）').len, '6×260')
check('左列顶板承重段 738×5（780−42）', cut('左列顶板承重段').len + '×' + cut('左列顶板承重段').count, '738×5')
check('左列独立挂衣杆 738×1（780−42 统一）', cut('左列独立挂衣杆').len + '×' + cut('左列独立挂衣杆').count, '738×1')
check('右列顶板承重段 820×5（862−42）', cut('右列顶板承重段').len + '×' + cut('右列顶板承重段').count, '820×5')

// 理论切长 vs 用户实切：全部 ±10 内（左统一 735×6、右统一 810×5，宜长不宜短）
checkClose('实切 735 vs 顶板承重段 738', 735, cut('左列顶板承重段').len, 10)
checkClose('实切 735 vs 独立 738', 735, cut('左列独立挂衣杆').len, 10)
checkClose('实切 810 vs 顶板承重段 820（压线）', 810, cut('右列顶板承重段').len, 10)

// 配件清单（两夹恒等式：顶板杆端头 8 + 顶轨 3 + 短侧杆 6 + 挂衣杆端头 2 = 19 ✅ 实购对上）
const part = (label) => r.parts.find((p) => p.label === label)
check('两夹 19 = 8+3+6+2', part('两夹').count, 19)
check('一字夹 4（a/b/d/e 行中柱对接）', part('一字夹').count, 4)
check('四夹 1（c 行中柱：左右段+长侧杆+竖管）', part('四夹').count, 1)
check('三夹 2（c 行两端，无层板）', part('三夹（三字夹）').count, 2)
check('法兰 9（顶轨 3 + 短侧杆 6）', part('法兰底座').count, 9)
check('塑料堵头 6', part('塑料堵头').count, 6)

// —— 死验收用例 2：1775 现建（2026-10-14 四改）——
//   +顶部通长挂衣杆（左段 735 口径 + 右段 810 口径）+ 左列挂衣 +1 + 右列挂衣 +1 + 左列台面双杆
const CASE4 = {
  nicheWidth: 1775,
  postLength: 2000,
  netDepth: 550,
  topHangRod: 1,
  zones: [
    { width: 780, independent: 2, shelves: 0, counter: 1 },
    { width: 862, independent: 1, shelves: 0, counter: 0 },
  ],
}
const r4 = computeWardrobe(CASE4)
const cut4 = (name) => r4.cuts.find((x) => x.name === name)
const part4 = (label) => r4.parts.find((p) => p.label === label)
check('现建计算成功', r4.ok, true)
check('现建横杆总数 = 左(5+1+2+2) + 右(5+1+1) = 17', r4.rodTotal, 17)
check('现建左顶部挂衣段 738×1（区−42，同顶板口径）', cut4('左列顶部挂衣段').len + '×' + cut4('左列顶部挂衣段').count, '738×1')
check('现建右顶部挂衣段 820×1', cut4('右列顶部挂衣段').len + '×' + cut4('右列顶部挂衣段').count, '820×1')
check('现建左独立 738×2（统一 区−42，实切 735）', cut4('左列独立挂衣杆').len + '×' + cut4('左列独立挂衣杆').count, '738×2')
check('现建右独立 820×1（统一 区−42，实切 810）', cut4('右列独立挂衣杆').len + '×' + cut4('右列独立挂衣杆').count, '820×1')
check('现建台面杆 738×2（a 两夹夹侧杆 + b 三夹套竖杆，统一）', cut4('左列台面杆（前+后）').len + '×' + cut4('左列台面杆（前+后）').count, '738×2')
// 配件：两夹 25 = 8(顶板端) + 3(顶轨) + 4(短侧杆，台面三夹盖掉 2) + 8(挂衣端) + 2(台面a杆)
check('现建两夹 25 = 8+3+4+8+2', part4('两夹').count, 25)
check('现建一字夹 5 = 顶板 4 + 顶挂中柱 1', part4('一字夹').count, 5)
check('现建三夹 4 = c 行 2 + 台面b杆 2', part4('三夹（三字夹）').count, 4)
check('现建四夹/法兰/堵头不变', part4('四夹').count + ':' + part4('法兰底座').count + ':' + part4('塑料堵头').count, '1:9:6')
// 统一切长（五改后同列只有一种理论长度）：左列统一 738（实切 735）×10、右列统一 820（实切 810）×7
checkClose('实切 735 vs 顶部挂衣段 738', 735, cut4('左列顶部挂衣段').len, 10)
checkClose('实切 735 vs 台面杆 738', 735, cut4('左列台面杆（前+后）').len, 10)
checkClose('实切 810 vs 右独立 820', 810, cut4('右列独立挂衣杆').len, 10)
check('现建左列 735 合计 = 5+1+2+2', cut4('左列顶板承重段').count + cut4('左列顶部挂衣段').count + cut4('左列独立挂衣杆').count + cut4('左列台面杆（前+后）').count, 10)
check('现建右列 810 合计 = 5+1+1', cut4('右列顶板承重段').count + cut4('右列顶部挂衣段').count + cut4('右列独立挂衣杆').count, 7)

// —— planZones：列数按总宽自动算（一列 ≤1m，均分，余数摊前几列）——
const p1775 = planZones(1775)
check('1775 → 2 列', p1775.cols, 2)
check('1775 → 3 竖管', p1775.posts, 3)
check('1775 → 框架总宽 1715', p1775.frameWidth, 1715)
check('1775 → 均分 820+820', p1775.zones.map((z) => z.width).join(','), '820,820')

const p990 = planZones(990)
check('990 → 总宽 930 仍 1 列', p990.cols + ':' + p990.zones[0].width, '1:880')

const p1010 = planZones(1010)
check('1010 → 总宽 950 仍 1 列（≤1000 不拆）', p1010.cols + ':' + p1010.zones[0].width, '1:900')

const p2500 = planZones(2500)
check('2500 → 3 列', p2500.cols, 3)
check('2500 → 均分 780×3', p2500.zones.map((z) => z.width).join(','), '780,780,780')

const p3000 = planZones(3000)
check('3000 → 3 列 4 竖管', p3000.cols + ':' + p3000.posts, '3:4')
check('3000 → 947/947/946（余数摊前）', p3000.zones.map((z) => z.width).join(','), '947,947,946')

// planZones 均分结果喂回 computeWardrobe：自洽（无警告）
const rAuto = computeWardrobe({ ...CASE, zones: planZones(1775).zones.map((z) => ({ ...z, independent: 1, shelves: 0 })) })
check('均分 820/820 与内空差 ≤10 无警告', rAuto.warnings.length, 0)
check('均分顶板承重段 778（820−42）', rAuto.cuts.find((x) => x.name === '左列顶板承重段').len, 778)

// —— 3 列恒等式：顶板 5 行，a/b/d/e 各 2 次中柱对接；c 行 T×2 + L×2 ——
const r3 = computeWardrobe({
  nicheWidth: 2860,
  postLength: 2000,
  netDepth: 550,
  zones: [
    { width: 900, independent: 2, shelves: 1 },
    { width: 900, independent: 1, shelves: 0 },
    { width: 900, independent: 1, shelves: 0 },
  ],
})
const part3 = (label) => r3.parts.find((p) => p.label === label)
check('3 列计算成功', r3.ok, true)
check('3 列竖管 4 根', r3.posts, 4)
check('3 列框架总宽 2800', r3.frameWidth, 2800) // 2700 + 4×25
check('3 列横杆总数 21', r3.rodTotal, 21) // (5+2+2) + (5+1) + (5+1)
check('3 列顶板承重段 858×5/列', r3.cuts.find((x) => x.name === '第 1 列顶板承重段').len, 858) // 900−42
check('3 列一字夹 = 4 行 × 2 对接', part3('一字夹').count, 8)
check('3 列四夹 2（c 行 2 中柱）', part3('四夹').count, 2)
check('3 列两夹 = 8 + 4 顶轨 + 4 短侧杆 + 8 挂衣端头', part3('两夹').count, 24)
check('3 列三夹 = c 行 2 + 层板 1 块×4', part3('三夹（三字夹）').count, 6)
check('3 列法兰 12', part3('法兰底座').count, 12)
check('3 列堵头 8', part3('塑料堵头').count, 8)

// —— 恒等式自检：无层板单列 ——
const r1 = computeWardrobe({
  nicheWidth: 1000,
  postLength: 2000,
  netDepth: 550,
  zones: [{ width: 900, independent: 3, shelves: 0 }],
})
check('单列竖管 2 根', r1.posts, 2)
check('单列顶板承重段 858×5', r1.cuts.find((x) => x.name === '顶板承重段').len, 858)
check('单列独立杆 858×3（统一 区−42，同顶板段）', r1.cuts.find((x) => x.name === '独立挂衣杆').len, 858)
check('单列两夹 = 8+2+4+6', r1.parts.find((p) => p.label === '两夹').count, 20)
check('单列一字夹 0（无中柱）', r1.parts.find((p) => p.label === '一字夹').count, 0)
check('单列四夹 0（无中柱）', r1.parts.find((p) => p.label === '四夹').count, 0)
check('单列三夹 2（c 行两端）', r1.parts.find((p) => p.label === '三夹（三字夹）').count, 2)
check('单列法兰 6', r1.parts.find((p) => p.label === '法兰底座').count, 6)

// —— 3 列恒等式（含顶部挂衣杆 + 全列台面，四改通式）——
const r3b = computeWardrobe({
  nicheWidth: 2860,
  postLength: 2000,
  netDepth: 550,
  topHangRod: 1,
  zones: [1, 2, 3].map(() => ({ width: 900, independent: 1, shelves: 0, counter: 1 })),
})
const part3b = (label) => r3b.parts.find((p) => p.label === label)
check('3 列顶挂+台面：一字夹 = 顶板 8 + 顶挂 2', part3b('一字夹').count, 10)
check('3 列顶挂+台面：两夹 = 8+4+2+6+2+6', part3b('两夹').count, 28)
check('3 列顶挂+台面：三夹 = c 行 2 + 台面 3×2 − 同档汇合四夹 2', part3b('三夹（三字夹）').count, 6)
check('3 列顶挂+台面：四夹 = c 行 2 + 台面汇合 2', part3b('四夹').count, 4)
check('3 列顶挂+台面：横杆总数 3×(5+1+1+2)', r3b.rodTotal, 27)

// —— 边界与防呆 ——
const rW = computeWardrobe({ ...CASE, zones: [{ width: 1100, independent: 2, shelves: 0 }, { width: 862, independent: 0, shelves: 0 }] })
check('区净宽>1000 警告', rW.warnings.some((w) => w.includes('下弯')), true)

const rM = computeWardrobe({ ...CASE, nicheWidth: 1900 })
check('分区与内空差>10 警告', rM.warnings.some((w) => w.includes('建议调分区')), true)

check('7 列报错（V1 上限 6）', computeWardrobe({ ...CASE, zones: [1, 2, 3, 4, 5, 6, 7].map(() => ({ width: 500, independent: 1, shelves: 0 })) }).ok, false)
check('层板 2 块报错', computeWardrobe({ ...CASE, zones: [{ width: 780, independent: 2, shelves: 2 }] }).ok, false)
check('台面 3 块报错（2000 档上限 2）', computeWardrobe({ ...CASE, zones: [{ width: 780, independent: 1, shelves: 0, counter: 3 }] }).ok, false)

// —— 十八改：短侧杆/台面跟竖管高度 ——
const rT2 = computeWardrobe({ ...CASE, zones: [{ width: 780, independent: 1, shelves: 0, counter: 2 }, { width: 862, independent: 0, shelves: 0 }] })
check('2000 档：短侧杆 6 根', rT2.cuts.find((x) => x.name.includes('短侧杆')).count, 6)
check('2000 档：台面 2 块合法', rT2.ok, true)
const rT4 = computeWardrobe({ ...CASE, postLength: 2400, zones: [{ width: 780, independent: 1, shelves: 0, counter: 4 }, { width: 862, independent: 0, shelves: 0 }] })
check('2400 档：短侧杆 12 根', rT4.cuts.find((x) => x.name.includes('短侧杆')).count, 12)
check('2400 档：法兰 15 个', rT4.parts.find((x) => x.label === '法兰底座').count, 15)
check('2400 档：台面 4 块合法', rT4.ok, true)
check('2400 档：台面 5 块报错', computeWardrobe({ ...CASE, postLength: 2400, zones: [{ width: 780, independent: 1, counter: 5 }] }).ok, false)
check('内空 0 报错', computeWardrobe({ ...CASE, nicheWidth: 0 }).ok, false)

// —— 博主 151×205 交叉验证（不同厂件、口径 26，公式结构同源）——
const blogger = 2.65 + 130 + 4 * 2.6 + 3 * 2.5
checkClose('博主公式 150.55 ≈ 实测 151', blogger, 151, 1)

console.log(failed ? `\n${failed} 项未过` : '\n全部通过')
process.exit(failed ? 1 : 0)
