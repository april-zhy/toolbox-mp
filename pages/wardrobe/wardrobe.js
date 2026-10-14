/**
 * 衣柜计算器 V1（实战版）页面
 * 默认值 = 用户 1775 真实落地案例，进页即见已验证结果
 * 内核：utils/wardrobe.js（占位/公式全部实测锁定，见需求文档）
 *
 * 2026-10-14 改版：
 *   - 列数自动：ceil(框架总宽/1000)，一列 ≤1m，各区均分可手调（1775 预填真实 780/862）
 *   - 连接件口径写死不可改（每侧预留 30 / 短侧杆 260 / 占位 25·17·26）
 *   - 三张图各占一行、同一比例（drawAll 统一算 s）：立体（等轴测）/ 正视 / 侧视（真比例）
 *   - 2026-10-14 五/六改：短侧杆高度 30/100cm 落图；宽向杆统一切长 区−42；改一列宽其余列自动均摊
 *   - 2026-10-14 七改：立体回退等轴测；顶挂高度 = 竖管顶 − 26 = 1974
 *   - 2026-10-14 八改：三图只留尺寸标注（去构件文字/正视去下料单）；顶部挂衣杆固定装（表单去开关）；
 *     三张图挪到下料单/配件清单前面
 *   - 2026-10-14 十改：立体图 = 主视图不许动（保持镜像投影：墙上左、帘下右）；
 *     正视图整体左右镜像来配它（x=0 在画面右侧）；宽度标注挪到墙侧；三图逐行注释便于手改
 *   - 2026-10-14 十一改：立体图总宽/总深标注挪到上方（沿顶边外扩 y/x=−40、z=H+130）；
 *     立体图只画连侧杆的横杆——独立挂衣杆/顶部通长挂衣杆整块注释隐藏（代码保留，删行首 // 即恢复）
 *   - 2026-10-14 十二改：下料单按长度合并 + 6000 原管切割方案 + 一键复制——生成逻辑全在
 *     内核（mergedCuts/cuttingPlan/planText，锯缝 3mm、尾料不扣），页面只直传给 WXML
 *   - 2026-10-14 十三改：列净宽标注从靠墙挪到外侧前沿（端点 y=0→D、偏移 −55→+55，靠墙旧版
 *     注释保留）；dim3 头部补「偏移方向口诀」；isoBox 外扩点同步（墙下圈 → 前沿外圈）
 *   - 2026-10-14 十四改：顶挂口径修正——顶板井格 a~e = 台面不能挂衣，最高挂衣杆贴竖管顶夹装：
 *     离地 = 竖管 − 两夹间隙 26 − 管径 25 = 1949（原 1974 作废）；自由层画图默认
 *     第 1 列短衣区（0.35H~0.8H）、其余列居中（0.3H~0.75H），实际两夹可滑高度自由调
 *   - 2026-10-14 十五改：1949 顶挂杆三视图红色标出（原来全是 TEAL 混在自由杆里认不出，
 *     立体图更是整块被十一改注释隐藏）——按列断开 = 每列 1 根，正/侧视加高度数字标注；
 *     根因 = recalc 的 result 漏传 topHang，三图 if (r.topHang) 全进不去
 *   - 2026-10-14 十六改：挂衣杆统一绿色 GREEN（顶挂红→绿、独立/层板自由杆 teal→绿；台面/侧杆
 *     等固定结构杆保持 TEAL/DARK）；顶挂画图下调 TOPHANG_DROP=50（口径 1949 不变，离顶线远一点
 *     更明显）；左列默认自由杆 2→1（有台面那侧只留 1 根）；正视图空白处标「短衣区/长衣区」
 *     （第 1 列短、其余长，与 levelPlan 的 short = i===0 同规则）
 *   - 2026-10-14 十七改：全线改色——只有自由调节的挂杆（独立/层板）绿 GREEN，其余结构杆/固定件
 *     全黑（顶挂 1949、台面、短侧杆、长侧杆/顶轨、竖管等）；夹具分色：法兰/两夹黑、三夹橙 CLAMP3、
 *     四夹紫 CLAMP4、一字夹蓝 CLAMP1、五夹洋红 CLAMP5（预留，BOM/图暂无五夹）；淡绿板面色保留
 *   - 2026-10-14 二十改：顶挂杆高度改为固定离地 1840mm（原 1100 口径作废）；
 *     下调量随之删除）；两夹从黑里分出来给独立色 CLAMP2 青绿（法兰仍黑）；侧视图标一根短侧杆长度
 *     260；保存图片高清重绘（SAVE_SCALE=3 倍重画再导出）+ 立体图标题基线 10→18 修截断
 */
const {
  computeWardrobe,
  planZones,
  DEFAULTS,
} = require("../../utils/wardrobe.js");

const DARK = "#333"; // 黑（十七改：除自由挂杆绿 + 夹具彩色外，其余结构杆/固定件全黑）
const GRAY = "#999";
const LIGHT = "#bbb";
const GREEN = "#16a34a"; // 自由调节挂杆专用绿（独立/层板自由杆；顶挂/台面/侧杆等固定杆全黑）
// 顶挂杆高度口径（十九改）：固定离地 1840mm（二十改；原「竖管−26−25=1949 贴顶」
// 口径作废，TOPHANG_DROP 下调量随之删除——三图直接画在 1840）
const Z_TOPHANG = 1840;
// 夹具配色（十七改分色 · 十九改两夹出黑）：法兰 = 黑（跟结构一体）；两夹青绿 · 三夹橙 ·
// 四夹紫 · 一字夹蓝 · 五夹洋红（五夹预留：BOM 和图里暂无）——看图认夹子全靠这排颜色，动色只改这里
const CLAMP2 = "#eab308"; // 二十一改：两夹青绿 → 黄（跟独立绿杆/竖管区分更明显）
const CLAMP3 = "#dc2626"; // 二十一改：三夹橙 → 红
const CLAMP4 = "#8f4fd1";
const CLAMP1 = "#2f6bd8";
const CLAMP5 = "#d84fa0";
const CONST_PIPE = 25;
const POST_PLANE = DEFAULTS.sideRod + CONST_PIPE; // 竖管平面离墙 260+25=285（短侧杆+管径）
// 短侧杆高度口径（十八改：档位跟竖管高度走，与内核同式）：竖管 <2.4m = 离地 300/1000 两档；
// ≥2.4m = 300/1000/1700/2300 四档（最高一根留 100 给顶轨两夹）——台面只能架在档位上，上限 = 档数
const TIE_LOWER = 300; // 底部短侧杆离地 mm（= 台面双杆位，三夹深臂夹的就是这根侧杆）
function tieLevels(postLength) {
  return postLength >= 2400 ? [300, 1000, 1700, 2300] : [300, 1000];
}
// 立体图偏转角度（想调角度只改这一个数）：调小更「正」（如 20°）、调大更「斜」（如 40°）；30° = 标准等轴测
const ISO_DEG = 12;
// 保存图片倍率（十九改）：导出时画布按 3× 重画一遍再存（屏幕本身 2×，之前直接导 2× 位图，
// 放大就糊/细线断「缺墨」）；还嫌不够清晰就加大这个数（4/5 都行，画布越大导出越慢）
const SAVE_SCALE = 3;

Page({
  data: {
    form: {
      nicheWidth: "1775",
      postLength: "2000",
      netDepth: "550",
      curtainGap: "50",
    },
    columns: [], // [{ width, independent, counter }]，列数由总宽自动算（十八改：层板入口已去，只留台面）
    result: null,
    error: "",
  },

  onLoad() {
    // 1775 现建（四改）：顶板承重 5 根/列固定 + 顶部通长挂衣杆；左列挂衣 1 + 台面 1、右列挂衣 1
    //（十六改：有台面那侧自由杆 2→1，只留 1 根可调；十八改：层板字段下线，台面走短侧杆档位）
    this.setData({
      columns: [
        { id: 1, width: "780", independent: "1", counter: "1" },
        { id: 2, width: "862", independent: "1", counter: "0" },
      ],
    });
    this.recalc();
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ["form." + field]: e.detail.value });
    if (field === "nicheWidth") this.syncColumns();
    this.recalc();
  },

  // 列数跟总宽走：ceil(总宽/1000)。列数变了才重置各区（均分 + 默认层数）；没变则保留手调值
  syncColumns() {
    const niche = Number(this.data.form.nicheWidth) || 0;
    if (niche <= 0) return;
    const p = planZones(niche);
    if (p.cols === this.data.columns.length) return;
    const patch = {
      // 均分净宽 + 默认每列挂衣 1 层、无台面（顶板承重 5 根固定，不占层数；十八改：层板已下线）
      columns: p.zones.map((z, i) => ({
        id: i + 1,
        width: String(z.width),
        independent: "1",
        counter: "0",
      })),
    };
    this.setData(patch);
  },

  // 改一列宽 → 其余列自动均摊补齐，各区合计恒 = 内空 − 2×预留 − 竖管×25（总宽锁定，2026-10-14）
  onColInput(e) {
    const { index, field } = e.currentTarget.dataset;
    const i = Number(index);
    const v = e.detail.value;
    const w = Number(v);
    const cols = this.data.columns.map((c) => ({ ...c }));
    const niche = Number(this.data.form.nicheWidth) || 0;
    const rest =
      niche - 2 * DEFAULTS.reserve - (cols.length + 1) * CONST_PIPE - w;
    const n = cols.length - 1;
    if (field === "width" && w > 0 && niche > 0 && n > 0 && rest > n * 50) {
      cols[i].width = v;
      const base = Math.floor(rest / n);
      const rem = rest - base * n;
      let given = 0;
      cols.forEach((c, j) => {
        if (j === i) return;
        const extra = given < rem ? 1 : 0;
        given += extra;
        c.width = String(base + extra);
      });
      this.setData({ columns: cols });
    } else {
      this.setData({ [`columns[${index}].${field}`]: v });
    }
    this.recalc();
  },

  recalc() {
    const f = this.data.form;
    const n = (v) => Number(v) || 0;
    const zones = this.data.columns.map((c) => ({
      width: n(c.width),
      independent: n(c.independent),
      shelves: n(c.shelves),
      counter: n(c.counter),
    }));

    const r = computeWardrobe({
      nicheWidth: n(f.nicheWidth),
      postLength: n(f.postLength),
      netDepth: n(f.netDepth),
      curtainGap: n(f.curtainGap),
      topHangRod: 1, // 顶部通长挂衣杆：固定装（同顶板 5 杆，不走表单，八改）
      reserve: DEFAULTS.reserve, // 固定值，页面不可改
      sideRod: DEFAULTS.sideRod, // 固定值，页面不可改
      zones,
    });

    if (!r.ok) {
      this.setData({ result: null, error: r.errors[0] });
      return;
    }

    // 「下层 N 层杆」计数：独立 1 杆/层 + 层板前后 2 杆/块 + 台面双杆算 1 层/块（十八改：台面可多块）
    const levelCount = (z) => z.independent + z.shelfRods + z.counter;
    this.setData(
      {
        error: "",
        result: {
          posts: r.posts,
          topHang: r.topHang, // 内核布尔：顶部通长挂衣杆装/不装——三张图的 if (r.topHang) 全靠它（十五改补传，之前漏传导致 1949 杆一张图都不画）
          tieCount: r.tieCount, // 短侧杆每竖管根数（十八改：竖管≥2.4m→4、否则 2）；台面上限 = 它
          frameWidth: r.frameWidth,
          totalHeight: r.totalHeight,
          totalDepth: r.totalDepth,
          targetWidth: r.targetWidth,
          cuts: r.cuts,
          mergedCuts: r.mergedCuts, // 下料单按长度合并（十二改：内核生成，页面直传）
          cuttingPlan: r.cuttingPlan, // 6000 原管切割方案（十二改：内核生成）
          planText: r.planText, // 复制切割方案按钮用（十二改：内核生成）
          parts: r.parts,
          warnings: r.warnings,
          zones: r.zones,
          zoneLevels: r.zones.map(levelCount),
        },
      },
      () => this.drawAll(),
    );
  },

  // —— 三张图：立体（等轴测）/ 正视 / 侧视，一行一张 ——
  drawAll() {
    const query = wx.createSelectorQuery();
    query
      .select("#cvIso")
      .fields({ node: true, size: true })
      .select("#cvFront")
      .fields({ node: true, size: true })
      .select("#cvSide")
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) return;
        this.canvases = [];
        const ctxs = [];
        res.forEach((it) => {
          if (!it || !it.node) {
            ctxs.push(null);
            return;
          }
          const canvas = it.node;
          this.canvases.push(canvas);
          const ctx = canvas.getContext("2d");
          const dpr = (wx.getWindowInfo && wx.getWindowInfo().pixelRatio) || 2;
          canvas.width = it.width * dpr;
          canvas.height = it.height * dpr;
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, it.width, it.height);
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, it.width, it.height);
          ctxs.push(ctx);
        });
        const r = this.data.result;
        if (!r) return;
        const sizes = res.map((it) =>
          it ? { w: it.width, h: it.height } : null,
        );
        // 记下画布 + css 尺寸（十九改）：saveImage 高清导出要按同一尺寸重画
        this.viewMeta = res.map((it, i) =>
          it && it.node
            ? {
                canvas: it.node,
                w: it.width,
                h: it.height,
                kind: ["Iso", "Front", "Side"][i],
              }
            : null,
        );
        const s = this.sharedScale(r, sizes); // 三视图同一比例（2026-10-14）：改任何尺寸三张同步等比
        if (ctxs[0] && sizes[0])
          this.drawIso(ctxs[0], r, sizes[0].w, sizes[0].h, s);
        if (ctxs[1] && sizes[1])
          this.drawFront(ctxs[1], r, sizes[1].w, sizes[1].h, s);
        if (ctxs[2] && sizes[2])
          this.drawSide(ctxs[2], r, sizes[2].w, sizes[2].h, s);
      });
  },

  // 层位（mm，离地，示意排布非精确层高）：顶部挂衣杆贴井格下方；台面固定在底部短侧杆处；
  // 其余独立/层板排在 台面（或底部）~ 中段之间
  levelPlan(r) {
    const H = Number(this.data.form.postLength) || r.totalHeight - 51;
    const zCounter = TIE_LOWER; // 底部短侧杆高度 = 台面双杆位（三夹深臂夹的就是这根侧杆，同高）
    const ties = tieLevels(H); // 短侧杆档位（十八改）：竖管≥2.4m 四档、否则两档；台面从最底档往上占
    // 最上方通长挂衣杆（十九改口径）：固定离地 1840mm（二十改），
    // 不再贴竖管顶（原 1949 口径作废）；三图 + 分区字位置全跟这个数
    const zTopHang = Z_TOPHANG;
    // 自由层（独立/层板）默认带：实际两夹可滑、高度自由调，这里只是画图默认——
    // 第 1 列（左）默认短衣区：带高且满（0.35H~0.8H，双层短衣错开）；其余列默认居中（0.3H~0.75H）
    const perCol = r.zones.map((z, i) => {
      const cnt = z.independent + (z.shelfRods > 0 ? 1 : 0);
      const short = i === 0; // 左列 = 短衣区，其余居中
      const lo = Math.max(short ? H * 0.35 : H * 0.3, z.counter > 0 ? zCounter + 90 : 0);
      const hi = short ? H * 0.8 : H * 0.75;
      const yAt = (k) => lo + ((hi - lo) * (k + 1)) / (cnt + 1);
      const list = [];
      for (let k = 0; k < z.independent; k++) {
        list.push({ type: "indep", y: yAt(k) });
      }
      if (z.shelfRods > 0) list.push({ type: "shelf", y: yAt(z.independent) });
      // 台面（十八改）：只能架在短侧杆档位上，从最底档（300）往上每档 1 块
      for (let k = 0; k < Math.min(z.counter, ties.length); k++) {
        list.push({ type: "counter", y: ties[k] });
      }
      return list;
    });
    console.log("perCol", perCol);
    return { perCol, zTopHang, zCounter, tieLv: ties };
  },

  // 竖管中心 x 坐标（mm）：按分区净宽 + 25 竖管宽推进
  postXmm(r) {
    const arr = [];
    let cur = 0;
    for (let i = 0; i < r.posts; i++) {
      arr.push(cur + CONST_PIPE / 2);
      cur += CONST_PIPE;
      if (i < r.zones.length) cur += r.zones[i].width;
    }
    return arr;
  },

  // —— 三视图同一比例（1mm = s px，2026-10-14）：三张画布各自能放下的最大缩放取小 ——
  // 立体图投影 = 等轴测·镜像（十改拍板：立体图为主不许动；要动也是改正视图来配它）：
  // x 向左下、深度 y 向右下 → 墙在上左、帘口在下右；x=0（第 1 列）落在画面右侧，
  // 正视图已整体镜像成同向。角度由顶部 ISO_DEG 控制。(x,y,z) → [(y−x)·cosA, (x+y)·sinA − z]
  isoProj() {
    const A = (ISO_DEG * Math.PI) / 180;
    return (x, y, z) => [(y - x) * Math.cos(A), (x + y) * Math.sin(A) - z];
  },

  // 立体图包络盒（8 角点 + 尺寸标注外扩点）
  isoBox(r) {
    const W = r.frameWidth;
    const D = r.totalDepth;
    const H = r.totalHeight;
    const proj = this.isoProj();
    let minX = 1e9;
    let maxX = -1e9;
    let minY = 1e9;
    let maxY = -1e9;
    [
      [0, 0, 0],
      [W, 0, 0],
      [0, D, 0],
      [W, D, 0],
      [0, 0, H],
      [W, 0, H],
      [0, D, H],
      [W, D, H],
      // 尺寸标注外扩的包围点（标注挪位置必须同步这里，否则裁边）：
      // 列宽在外侧前沿 y=D+55（外圈 D+110，十三改）；
      // 总高在墙侧左缘 x=W+130（二十一改：外扩盒 W+230 防文字裁边）；
      // 总宽/总深在上方沿顶边外扩（y/x=−40、z=H+130，十一改）
      [0, D + 110, 0],
      [W, D + 110, 0],
      [0, -70, H + 160],
      [W, -70, H + 160],
      [-70, 0, H + 160],
      [-70, D, H + 160],
      [W + 230, 0, 0],
      [W + 230, 0, H],
    ].forEach(([x, y, z]) => {
      const [sx, sy] = proj(x, y, z);
      minX = Math.min(minX, sx);
      maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy);
      maxY = Math.max(maxY, sy);
    });
    return { minX, maxX, minY, maxY };
  },

  // 各画布留白：立体 16/46/18，正视 96（标题 + 底部尺寸），侧视 96（标题 + 底部深度标注）
  sharedScale(r, sizes) {
    const box = this.isoBox(r);
    const fits = [];
    if (sizes[0])
      fits.push(
        Math.min(
          (sizes[0].w - 32) / (box.maxX - box.minX),
          (sizes[0].h - 64) / (box.maxY - box.minY),
        ),
      );
    if (sizes[1])
      fits.push(
        Math.min(
          (sizes[1].w - 32) / r.frameWidth,
          (sizes[1].h - 96) / r.totalHeight,
        ),
      ); // 正视：标题+底部尺寸，无下料单（八改）
    if (sizes[2])
      fits.push(
        Math.min(
          (sizes[2].w - 52) / r.totalDepth,
          (sizes[2].h - 96) / r.totalHeight,
        ),
      );
    return fits.length ? Math.min(...fits) : 0.1;
  },

  // —— 立体图（等轴测·镜像，主视图：所有改动以本图为基准，别张图来配它）——
  // 坐标：x = 宽 0→W（画面往左下）· y = 深 0→D（0 = 贴墙，画面往右下）· z = 离地高（向上）
  // 构件：竖管落地 / 顶部净深长侧杆压顶 / 顶板承重杆×5（井格 a~e）/ 顶部通长挂衣杆 /
  //       短侧杆×2 拉墙 / 各列独立挂衣杆·层板·台面 / 前方帘区
  drawIso(ctx, r, w, h, s) {
    const W = r.frameWidth; // 框架总宽 mm
    const D = r.totalDepth; // 总深 mm = 净深 + 帘
    const H = r.totalHeight; // 总高 mm = 竖管 + 26 + 25
    const netDepth = Number(this.data.form.netDepth) || D - DEFAULTS.curtainGap; // 净深 = 顶部长侧杆长

    // 标题（八改：图面只留尺寸标注，构件说明全写在代码注释里；基线 10→18 修放大后顶部截断）
    ctx.textAlign = "center";
    ctx.fillStyle = DARK;
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("立体示意图", w / 2, 18);

    // 投影 + 比例：角度 = 页面顶部 ISO_DEG；s 由 drawAll 统一算出（三视图 1mm = 同 px）
    const proj = this.isoProj();
    const box = this.isoBox(r);
    const mX = 16;
    const mTop = 30;
    const mBot = 18;
    const ox = (w - (box.maxX - box.minX) * s) / 2 - box.minX * s;
    const oy =
      mTop + (h - mTop - mBot - (box.maxY - box.minY) * s) / 2 - box.minY * s;
    const P = (x, y, z) => {
      const [sx, sy] = proj(x, y, z);
      return [sx * s + ox, sy * s + oy];
    };
    const line3 = (a, b, color, lw, dash) => {
      const [x1, y1] = P(...a);
      const [x2, y2] = P(...b);
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    const quad = (a, b, c, d, fill, stroke) => {
      ctx.beginPath();
      [a, b, c, d].forEach((p, i) => {
        const [x, y] = P(...p);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };
    const dot = (p, color, size) => {
      const [x, y] = P(...p);
      ctx.fillStyle = color;
      const sz = size + 1; // 画布放大后夹点同步加粗
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    };

    const plan = this.levelPlan(r);
    const px = this.postXmm(r);
    const zRail = H - 12; // 顶轨（压在竖管顶上，深度方向）

    // 后墙面（y=0 整面）：十八改加同款矩形阴影框（跟地面一样：极浅填充 + 浅灰描边）
    quad([0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H], "rgba(0,0,0,0.03)", "#eee");
    // 地面（z=0 整面，极浅填充）
    quad(
      [0, 0, 0],
      [W, 0, 0],
      [W, D, 0],
      [0, D, 0],
      "rgba(0,0,0,0.03)",
      "#eee",
    );

    // 短侧杆 ×档位数/竖管（十八改档位跟竖管高度走）：法兰上墙 → 两夹夹竖管（在横杆下面，先画）
    // 高度口径：2000 档离地 30/100cm；≥2400 档 30/100/170/230cm（顶排 200cm+ 由顶部长侧杆顶轨承担）
    plan.tieLv.forEach((z) => {
      px.forEach((x) => {
        line3([x, 0, z], [x, POST_PLANE, z], DARK, 2);
        dot([x, 0, z], DARK, 5); // 法兰
      });
    });

    // 各列下层杆（全在竖管平面 y=POST_PLANE=285）：a/b = 杆端点（区净宽两端各内缩 10 画）；
    // 独立挂衣 = 单绿线 · 层板 = 双绿线 + 淡绿板面 + 橙三夹 · 台面 = 双黑线 + 淡绿板面 +
    // 橙三夹(b 杆贴柱)/黑两夹(a 杆靠墙侧，画在 y=POST_PLANE−130)——十七改：只有自由层杆绿
    r.zones.forEach((z, i) => {
      const a = px[i] + 10;
      const b = px[i + 1] - 10;
      plan.perCol[i].forEach((lv) => {
        if (lv.type === "indep") {
          // 【十一改曾隐藏 → 用户已自行恢复（删了行首 //）；十七改起独立杆 = 自由层绿色】
          line3([a, POST_PLANE, lv.y], [b, POST_PLANE, lv.y], GREEN, 3);
        } else if (lv.type === "shelf") {
          // 层板：前后双杆 + 板面 + 三字夹
          line3(
            [a, POST_PLANE, lv.y + 5],
            [b, POST_PLANE, lv.y + 5],
            GREEN,
            2.5,
          );
          line3(
            [a, POST_PLANE, lv.y - 5],
            [b, POST_PLANE, lv.y - 5],
            GREEN,
            2.5,
          );
          quad(
            [a, POST_PLANE - 40, lv.y + 5],
            [b, POST_PLANE - 40, lv.y + 5],
            [b, POST_PLANE + 40, lv.y + 5],
            [a, POST_PLANE + 40, lv.y + 5],
            "rgba(10,157,108,0.10)",
          );
          [a - 8, b + 8].forEach((x) =>
            dot([x, POST_PLANE, lv.y], CLAMP3, 6),
          ); // 三字夹（橙）
        } else {
          // 台面：底部侧杆处宽向双杆——b 杆在竖管平面（三夹套竖杆），a 杆靠墙侧（两夹夹侧杆）
          const yB = POST_PLANE;
          const yA = POST_PLANE - 130;
          line3([a, yB, lv.y], [b, yB, lv.y], DARK, 2.5);
          line3([a, yA, lv.y], [b, yA, lv.y], DARK, 2.5);
          quad(
            [a, yA, lv.y],
            [b, yA, lv.y],
            [b, yB, lv.y],
            [a, yB, lv.y],
            "rgba(10,157,108,0.10)",
          );
          [px[i], px[i + 1]].forEach((x) => {
            dot([x, yB, lv.y], CLAMP3, 6); // b 杆三夹（竖杆+侧杆+杆，橙）
            dot([x, yA, lv.y], CLAMP2, 5); // a 杆两夹（夹侧杆，十九改青绿）
          });
        }
      });
    });

    // 竖管（落地，画在横杆之上）
    px.forEach((x) => {
      line3([x, POST_PLANE, 0], [x, POST_PLANE, H - 51], DARK, 5);
      dot([x, POST_PLANE, 0], GRAY, 6); // 塑料堵头
    });

    // 夹点统一补在管上方（二十改）：短侧杆夹竖管的夹具 + 独立绿杆端头两夹——
    // 放在竖管之后画，保证夹点覆盖在管线上、不被管遮挡
    // 【二十一改更正】短侧杆夹具跟台面走；【二十三改】该竖杆左右两列同档都有台面（汇合）
    // → 四夹（T 型，紫），仅单侧有台面 → 三夹（红），无台面 → 两夹（黄）
    const counterAt = r.zones.map((z) => z.counter || 0); // 每列台面数
    plan.tieLv.forEach((z, ti) => {
      px.forEach((x, xi) => {
        const left = xi > 0 && counterAt[xi - 1] > ti;
        const right = xi < r.zones.length && counterAt[xi] > ti;
        const c = left && right ? CLAMP4 : left || right ? CLAMP3 : CLAMP2;
        dot([x, POST_PLANE, z], c, 5);
      });
    });
    r.zones.forEach((z, i) => {
      plan.perCol[i]
        .filter((lv) => lv.type === "indep")
        .forEach((lv) => {
          [px[i], px[i + 1]].forEach((x) =>
            dot([x, POST_PLANE, lv.y], CLAMP2, 5),
          ); // 独立绿杆端头两夹（青绿）
        });
    });

    // 顶部：净深长侧杆（墙法兰 → 前端），压在竖管顶上
    px.forEach((x) => {
      line3([x, 0, zRail], [x, netDepth, zRail], DARK, 4);
      dot([x, 0, zRail], DARK, 5); // 法兰上墙（黑）
      dot([x, POST_PLANE, zRail], CLAMP2, 6); // 两夹压顶（十九改青绿）
    });

    // 顶板承重杆 ×5（宽向通长，与长侧杆组成井格托顶板；均在 z=zRail 顶轨高度）
    // a/b/d/e 行：两端两夹连长侧杆 + 中柱一字夹；c 行在竖管平面：三夹(L位)/四夹(T位)过柱（橙点）
    const dFront = netDepth - 40; // e 行深度（最前排，净深内缩 40）
    const gridYs = [
      POST_PLANE * 0.2, // a 行（最靠墙）
      POST_PLANE * 0.6, // b 行
      POST_PLANE, // c 行（竖管平面，过柱）
      POST_PLANE + (dFront - POST_PLANE) / 2, // d 行
      dFront, // e 行（最前）
    ];
    gridYs.forEach((dy) => {
      const onPost = Math.abs(dy - POST_PLANE) < 1;
      line3([px[0], dy, zRail], [px[px.length - 1], dy, zRail], DARK, 2.5);
      px.forEach((x, j) => {
        const interior = j > 0 && j < px.length - 1;
        if (onPost) {
          // c 行过柱：中柱四夹（T 位，紫）· 边柱三夹（L 位，橙）——十七改分色
          dot([x, dy, zRail], interior ? CLAMP4 : CLAMP3, 6);
        } else {
          dot([x, dy, zRail], interior ? CLAMP1 : CLAMP2, interior ? 6 : 5); // 一字夹（蓝）/ 两夹（青绿）
        }
      });
    });

    // 顶部通长挂衣杆（井格下方过柱：边柱两夹 + 中柱一字夹）
    // 30° 下它投影在井格 d 行上方 ≈1px 处（深度前移抵消 65mm 落差）——先垫白底再描 teal，撕开与井格的重叠
    // 【十一改隐藏：这根杆两夹/一字夹夹的都是竖管（过柱）、不连侧杆——整块注释保留，
    //    恢复时删掉下面每行行首的 // 即可，代码一行没删】
    // if (r.topHang) {
    //   const zTop = plan.zTopHang
    //   line3([px[0], POST_PLANE, zTop], [px[px.length - 1], POST_PLANE, zTop], '#fff', 7)
    //   line3([px[0], POST_PLANE, zTop], [px[px.length - 1], POST_PLANE, zTop], TEAL, 3.5)
    //   px.forEach((x, j) => {
    //     const interior = j > 0 && j < px.length - 1
    //     dot([x, POST_PLANE, zTop], DARK, interior ? 5 : 4) // 一字夹过中柱 / 两夹边柱
    //   })
    // }

    // 【十五改标出 → 十九改高度改 1840 固定离地】顶挂杆：与上面【十一改隐藏】块同一几何
    // （深度 POST_PLANE），按列断开 = 每列 1 根；固定杆全黑、一字夹蓝/两夹青绿；
    // 白底垫层先撕开与井格行的重叠
    if (r.topHang) {
      const zTop = plan.zTopHang;
      px.slice(0, -1).forEach((xa, i) => {
        line3([xa, POST_PLANE, zTop], [px[i + 1], POST_PLANE, zTop], "#fff", 7);
        line3([xa, POST_PLANE, zTop], [px[i + 1], POST_PLANE, zTop], DARK, 3.5);
      });
      px.forEach((x, j) => {
        const interior = j > 0 && j < px.length - 1;
        dot([x, POST_PLANE, zTop], interior ? CLAMP1 : CLAMP2, interior ? 5 : 4); // 一字夹（蓝）/ 两夹（青绿）
      });
    }

    // 分区标识（十八改）：第 1 列 = 短衣区、其余 = 长衣区（与正视图同规则），标在竖管平面、
    // 顶挂杆下方 250 的空白处，绿色加粗（跟正视图分区字同款式）
    ctx.fillStyle = GREEN;
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    r.zones.forEach((z, i) => {
      const mid = (px[i] + px[i + 1]) / 2;
      const p = P(mid, POST_PLANE, plan.zTopHang - 250);
      ctx.fillText(i === 0 ? "短衣区" : "长衣区", p[0], p[1]);
    });

    // —— 尺寸标注（制图式短端符，无箭头，同正视图口径）——
    // dim3(起点, 终点, 文字, 偏移[dx,dy,dz])：偏移单位 mm，加在两端点上再投影。
    // 方向口诀（立体图坐标：x=宽·0 在画面右，y=深·0 贴墙，z=高）：y 负=往墙那边，y 正=往前外侧
    // （帘那边）；x 负=画面右外撇，x 正=画面左；z 正=往上抬。挪标注 = 改「端点坐标 + 偏移量」两处，
    // 挪完去 isoBox 外扩点补上新范围，不然会被裁边
    const dim3 = (a, b, label, off) => {
      const A = P(a[0] + off[0], a[1] + off[1], a[2] + off[2]);
      const B = P(b[0] + off[0], b[1] + off[1], b[2] + off[2]);
      ctx.strokeStyle = LIGHT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(B[0], B[1]);
      ctx.stroke();
      // 端符：垂直短线
      const dx = B[0] - A[0];
      const dy = B[1] - A[1];
      const L = Math.hypot(dx, dy) || 1;
      const nx = (-dy / L) * 4;
      const ny = (dx / L) * 4;
      [A, B].forEach((pt) => {
        ctx.beginPath();
        ctx.moveTo(pt[0] - nx, pt[1] - ny);
        ctx.lineTo(pt[0] + nx, pt[1] + ny);
        ctx.stroke();
      });
      ctx.fillStyle = DARK;
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        label,
        (A[0] + B[0]) / 2 + nx * 2,
        (A[1] + B[1]) / 2 + ny * 2 + 3,
      );
    };
    // 列净宽标注（十三改：从靠墙挪到外侧前沿）——只改两处：端点 y=0→D（贴墙边换前边）、
    // 偏移 [0,−55,0]→[0,55,0]（往墙外撇 → 往前外撇）；靠墙旧版整行注释保留，换回=删新版放开旧版
    px.forEach((x, i) => {
      if (i < px.length - 1)
        dim3([x, D, 0], [px[i + 1], D, 0], `${r.zones[i].width}`, [0, 55, 0]);
    });
    // 旧版靠墙：px.forEach((x, i) => { if (i < px.length - 1) dim3([x, 0, 0], [px[i + 1], 0, 0], `${r.zones[i].width}`, [0, -55, 0]) })
    // 总宽标注：上方沿墙顶边（y=−40 再抬高 130，十一改）
    dim3([0, 0, H], [W, 0, H], `${W}`, [0, -40, 130]);
    // 总高标注：墙侧左缘竖边向外（x=W+130，比顶部总宽更外，避免交角打架）
    dim3([W, 0, 0], [W, 0, H], `${H}`, [130, 0, 0]);
    // 总深标注：挪到上方沿顶深边（x=−40 再抬高 130，和总宽在顶点两侧分开，十一改）
    dim3([0, 0, H], [0, D, H], `${D}`, [-40, 0, 130]);
  },

  // —— 正视图（宽 × 高）——十改：整体左右镜像，x=0（第 1 列）画在画面右侧，与立体图同向 ——
  drawFront(ctx, r, w, h, s) {
    const areaX = 16;
    const areaW = w - 32;
    const scale = s; // 三视图同一比例（drawAll 统一算出）
    const fw = r.frameWidth * scale;
    const fh = r.totalHeight * scale;
    const x0 = areaX + (areaW - fw) / 2;
    const yFloor = 50 + fh + Math.max(0, (h - 94 - fh) / 2); // 标题下、底部尺寸区之上居中
    const yTop = yFloor - fh;

    ctx.textAlign = "center";
    ctx.fillStyle = DARK;
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("正视图（宽 × 高）", w / 2, 20);

    // 地面
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0 - 8, yFloor);
    ctx.lineTo(x0 + fw + 8, yFloor);
    ctx.stroke();

    // 十改镜像：x 反着画（x0 + fw − x·scale）→ 第 1 列落在画面右侧 = 立体图同向（立体图为主）
    const postX = this.postXmm(r).map((x) => x0 + fw - x * scale);

    // 横杆层 y：通长在上段、独立/层板在下段（与立体图同一套层位）
    const plan = this.levelPlan(r);
    const yOf = (mm) => yFloor - mm * scale;
    const rodSpan = (i) => [postX[i] + 5, postX[i + 1] - 5];
    const line = (x1, x2, y, color, lw) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    };

    // 各列下层杆（从下往上）：独立挂衣 = 单绿线 · 层板 = 双绿线 + 橙三夹×4 + 淡绿板面 ·
    // 台面 = 双黑线 + 橙三夹端/黑两夹端 + 淡绿板面（十七改：只有自由层杆绿，固定杆全黑；
    // 顶板承重 5 根在正视方向重叠成顶线，画在顶区）
    r.zones.forEach((z, i) => {
      const span = rodSpan(i);
      plan.perCol[i].forEach((lv) => {
        const y = yOf(lv.y);
        if (lv.type === "indep") {
          line(span[0], span[1], y, GREEN, 2.5);
        } else if (lv.type === "shelf") {
          line(span[0], span[1], y - 4, GREEN, 2);
          line(span[0], span[1], y + 4, GREEN, 2);
          ctx.fillStyle = CLAMP3; // 三字夹（层板角 ×4，橙）
          [span[0] - 5, span[1] + 5].forEach((x) => {
            ctx.fillRect(x - 3, y - 7, 6, 6);
            ctx.fillRect(x - 3, y + 1, 6, 6);
          });
          ctx.fillStyle = "rgba(10,157,108,0.10)";
          ctx.fillRect(span[0], y - 5, span[1] - span[0], 10);
        } else {
          // 台面：b 杆三夹端（橙）+ a 杆两夹端（青绿，十九改出黑）——杆本身仍固定黑
          line(span[0], span[1], y - 4, DARK, 2);
          line(span[0], span[1], y + 4, DARK, 2);
          ctx.fillStyle = CLAMP3;
          [span[0] - 5, span[1] + 5].forEach((x) =>
            ctx.fillRect(x - 3, y - 7, 6, 6),
          );
          ctx.fillStyle = CLAMP2;
          [span[0] - 5, span[1] + 5].forEach((x) =>
            ctx.fillRect(x - 3, y + 1, 6, 6),
          );
          ctx.fillStyle = "rgba(10,157,108,0.10)";
          ctx.fillRect(span[0], y - 5, span[1] - span[0], 10);
        }
      });
    });

    // 竖管（画在横杆之上）+ 塑料堵头
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 4;
    postX.forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, yTop);
      ctx.lineTo(x, yFloor);
      ctx.stroke();
      ctx.fillStyle = GRAY;
      ctx.fillRect(x - 4, yFloor - 2, 8, 5);
    });

    // 短侧杆高度标定（十八改档位跟竖管高度走，与立体/侧视同步）：竖管上的两夹位（十九改青绿）
    plan.tieLv.forEach((z) =>
      postX.forEach((x) => line(x - 6, x + 6, yOf(z), CLAMP2, 2)),
    );

    // 顶轨（压在竖管顶上，深度方向 → 画成顶帽；十七改全黑）
    postX.forEach((x) => {
      ctx.fillStyle = DARK;
      ctx.fillRect(x - 12, yTop - 6, 24, 5);
    });

    // 顶板承重杆 ×5：宽向通长、沿深度从里往外 a→e（正视方向 5 根重叠成一条顶线）
    const yGrid = yOf(r.totalHeight - 12);
    line(postX[0] - 4, postX[r.posts - 1] + 4, yGrid, DARK, 2);
    // 顶部通长挂衣杆（十九改：固定离地 1840，不再贴顶）
    // ——固定杆全黑，按列断开 = 每列 1 根 + 标离地高度（黑）
    if (r.topHang) {
      const yTopHang = yOf(plan.zTopHang);
      r.zones.forEach((z, i) => {
        const span = rodSpan(i);
        line(span[0], span[1], yTopHang, DARK, 3.5);
      });
      ctx.fillStyle = DARK;
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(plan.zTopHang)}`, (postX[0] + postX[r.posts - 1]) / 2, yTopHang - 5);
    }

    // 分区标识（十六改）：第 1 列 = 短衣区、其余 = 长衣区（与 levelPlan 的 short = i===0 同规则），
    // 标在自由杆与顶挂杆之间的空白处
    ctx.fillStyle = GREEN;
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    r.zones.forEach((z, i) => {
      const span = rodSpan(i);
      ctx.fillText(i === 0 ? "短衣区" : "长衣区", (span[0] + span[1]) / 2, yOf(plan.zTopHang - 250));
    });

    // 尺寸标注：底部两圈（内圈各列净宽 y+8、外圈总宽 y+22）+ 右侧总高竖标；
    // 镜像后列宽从右往左 = 第 1..n 列
    ctx.fillStyle = DARK;
    ctx.font = "9px sans-serif";
    const dimLine = (x1, x2, y, label) => {
      ctx.strokeStyle = LIGHT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.moveTo(x1, y - 3);
      ctx.lineTo(x1, y + 3);
      ctx.moveTo(x2, y - 3);
      ctx.lineTo(x2, y + 3);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillText(label, (x1 + x2) / 2, y + 10);
    };
    r.zones.forEach((z, i) => {
      dimLine(postX[i], postX[i + 1], yFloor + 8, `${z.width}`);
    });
    dimLine(x0, x0 + fw, yFloor + 22, `${r.frameWidth}`);
    ctx.strokeStyle = LIGHT;
    ctx.beginPath();
    ctx.moveTo(x0 + fw + 12, yTop);
    ctx.lineTo(x0 + fw + 12, yFloor);
    ctx.stroke();
    ctx.fillText(`${r.totalHeight}`, x0 + fw + 12, (yTop + yFloor) / 2);
  },

  // —— 侧视图（深 × 高，同比例）：墙在左、帘在右；横轴 = 离墙深度 mm，竖轴 = 离地高度 mm（真实比例）——
  // 构件（从上往下）：顶轨 + 顶板 5 截面 / 顶部挂衣杆方点 / 竖管落地 / 短侧杆×2 / 台面方点
  drawSide(ctx, r, w, h, s) {
    const D = r.totalDepth;
    const H = r.totalHeight;
    const netDepth = Number(this.data.form.netDepth) || D - DEFAULTS.curtainGap;
    const gap = Number(this.data.form.curtainGap) || DEFAULTS.curtainGap;

    ctx.textAlign = "center";
    ctx.fillStyle = DARK;
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("侧视图（深 × 高，同比例）", w / 2, 20);

    // 模型坐标：y = 离墙深度 mm，z = 离地高度 mm，均按共用比例 s 换算
    const x0 = 26;
    const areaW = w - 52;
    const ox = x0 + (areaW - D * s) / 2;
    const yFloor = h - 44;
    const xOf = (y) => ox + y * s;
    const yOf = (z) => yFloor - z * s;
    const plan = this.levelPlan(r);
    const postX = xOf(POST_PLANE); // 竖管平面：短侧杆 260 + 管径 25
    const zRail = H - 12; // 顶轨中心（压在竖管顶上）

    // 墙（左）+ 地面
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox, yOf(H) + 6);
    ctx.lineTo(ox, yFloor);
    ctx.stroke();
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox, yFloor);
    ctx.lineTo(xOf(D) + 26, yFloor);
    ctx.stroke();
    ctx.font = "9px sans-serif";
    ctx.textAlign = "right";

    // 总高标注（墙左侧，制图短端符）
    ctx.strokeStyle = LIGHT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox - 14, yOf(H));
    ctx.lineTo(ox - 14, yFloor);
    ctx.moveTo(ox - 17, yOf(H));
    ctx.lineTo(ox - 11, yOf(H));
    ctx.moveTo(ox - 17, yFloor);
    ctx.lineTo(ox - 11, yFloor);
    ctx.stroke();
    ctx.fillStyle = DARK;
    ctx.fillText(`${H}`, ox - 18, (yOf(H) + yFloor) / 2 + 3);

    // 帘子（前方虚线）
    ctx.strokeStyle = GRAY;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xOf(D), yOf(H - 51));
    ctx.lineTo(xOf(D), yFloor);
    ctx.stroke();
    ctx.setLineDash([]);

    // 长侧杆（顶轨）：法兰上墙 → 净深最前，压在竖管顶上（十七改：杆黑、法兰黑、两夹黑）
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ox, yOf(zRail));
    ctx.lineTo(xOf(netDepth), yOf(zRail));
    ctx.stroke();
    ctx.fillStyle = DARK;
    ctx.fillRect(ox - 3, yOf(zRail) - 3, 6, 6); // 法兰
    ctx.fillStyle = CLAMP2;
    ctx.fillRect(postX - 4, yOf(zRail) - 4, 8, 8); // 两夹压顶（十九改青绿）

    // 顶板承重杆 ×5：宽向通长（侧视 = 长侧杆上 5 个截面；c 行在竖管平面过柱）
    const dFront = netDepth - 40;
    [
      POST_PLANE * 0.2,
      POST_PLANE * 0.6,
      POST_PLANE,
      POST_PLANE + (dFront - POST_PLANE) / 2,
      dFront,
    ].forEach((dy, i) => {
      // c 行过柱：端柱其实是三夹 L 位，侧视分不清端/中柱 → 统一按四夹紫（立体图里才分得出）
      ctx.fillStyle = i === 2 ? CLAMP4 : DARK;
      ctx.fillRect(xOf(dy) - 3, yOf(zRail) - 3, 6, 6);
    });

    // 竖管（落地 + 塑料堵头）
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(postX, yOf(H - 51));
    ctx.lineTo(postX, yFloor);
    ctx.stroke();
    ctx.fillStyle = GRAY;
    ctx.fillRect(postX - 4, yFloor - 2, 8, 5);

    // 短侧杆 ×档位数（十八改：档位跟竖管高度走）：法兰上墙（黑）→ 两夹夹竖管（十九改青绿）
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 2;
    plan.tieLv.forEach((z) => {
      const y = yOf(z);
      ctx.beginPath();
      ctx.moveTo(ox, y);
      ctx.lineTo(postX, y);
      ctx.stroke();
      ctx.fillStyle = DARK;
      ctx.fillRect(ox - 3, y - 3, 6, 6); // 法兰
      ctx.fillStyle = CLAMP2;
      ctx.fillRect(postX - 3, y - 3, 6, 6); // 两夹（青绿）
    });

    // 标注一根短侧杆长度（十九改）：最底档那根，杆中点上方标 260，跟深度标注同款式
    ctx.fillStyle = DARK;
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${DEFAULTS.sideRod}`, (ox + postX) / 2, yOf(plan.tieLv[0]) - 5);

    // 台面（十八改）：每块架在一个短侧杆档位上，柱端三夹盖住两夹位（橙 = 三夹）；侧视按第 1 列画
    plan.perCol[0]
      .filter((lv) => lv.type === "counter")
      .forEach((lv) => {
        ctx.fillStyle = CLAMP3;
        ctx.fillRect(postX - 4, yOf(lv.y) - 4, 8, 8);
      });

    // 顶部通长挂衣杆（十九改：固定离地 1840）——侧视呈点，黑 + 标高度
    if (r.topHang) {
      const yTopHang = yOf(plan.zTopHang);
      ctx.fillStyle = DARK;
      ctx.fillRect(postX - 4, yTopHang - 4, 8, 8);
      ctx.font = "9px sans-serif";
      ctx.fillText(`${Math.round(plan.zTopHang)}`, postX, yTopHang - 8);
    }

    // 深度标注（地面下方两行：净深 + 帘 / 总深）
    const dimLine = (x1, x2, y, label) => {
      ctx.strokeStyle = LIGHT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.moveTo(x1, y - 3);
      ctx.lineTo(x1, y + 3);
      ctx.moveTo(x2, y - 3);
      ctx.lineTo(x2, y + 3);
      ctx.stroke();
      ctx.fillStyle = DARK;
      ctx.textAlign = "center";
      ctx.fillText(label, (x1 + x2) / 2, y + 10);
    };
    dimLine(ox, xOf(netDepth), yFloor + 10, `净深 ${netDepth}`);
    dimLine(xOf(netDepth), xOf(D), yFloor + 10, `帘 ${gap}`);
    dimLine(ox, xOf(D), yFloor + 24, `总深 ${D}`);
  },

  // 复制切割方案到剪贴板
  copyPlan() {
    const planText = this.data.result && this.data.result.planText;
    if (!planText) return wx.showToast({ title: "请先计算", icon: "none" });
    wx.setClipboardData({
      data: planText,
      success: () => wx.showToast({ title: "已复制", icon: "success" }),
    });
  },

  // 三张图依次存相册（十九改高清方案：不是把 2× 位图拉大，而是把画布临时按 SAVE_SCALE 倍
  // 重画一遍再导出——线宽/字号全按高倍率渲染，放大不糊、细线不再「缺墨」；导完重画回屏幕倍率）
  saveImage() {
    const metas = (this.viewMeta || []).filter(Boolean);
    const r = this.data.result;
    if (!metas.length || !r) return;
    const K = SAVE_SCALE;
    const s = this.sharedScale(r, metas.map((m) => ({ w: m.w, h: m.h })));
    // 画布切到 K 倍：重置位图尺寸 + 变换，白底，再按 css 尺寸画同一套三视图
    metas.forEach((m) => {
      m.canvas.width = m.w * K;
      m.canvas.height = m.h * K;
      const ctx = m.canvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(K, K);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, m.w, m.h);
      this["draw" + m.kind](ctx, r, m.w, m.h, s);
    });
    const toTemp = (m) =>
      new Promise((resolve, reject) =>
        wx.canvasToTempFilePath({
          canvas: m.canvas,
          destWidth: m.w * K,
          destHeight: m.h * K,
          success: (res) => resolve(res.tempFilePath),
          fail: reject,
        }),
      );
    const save = (filePath) =>
      new Promise((resolve, reject) =>
        wx.saveImageToPhotosAlbum({ filePath, success: resolve, fail: reject }),
      );
    Promise.all(metas.map(toTemp))
      .then((files) =>
        files.reduce((p, f) => p.then(() => save(f)), Promise.resolve()),
      )
      .then(() =>
        wx.showToast({
          title: `已保存 ${metas.length} 张图`,
          icon: "success",
        }),
      )
      .catch((e) => {
        if (e && e.errMsg && e.errMsg.includes("auth")) {
          wx.showModal({
            title: "需要相册权限",
            content: "请在设置中允许保存到相册",
            confirmText: "去设置",
            success: (m) => m.confirm && wx.openSetting(),
          });
        } else {
          wx.showToast({ title: "保存失败", icon: "none" });
        }
      })
      .then(() => this.drawAll()); // 画布还挂在 K 倍上，重画回屏幕 2×
  },
});
