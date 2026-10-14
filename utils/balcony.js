/**
 * 阳台架计算器 —— 分区计算内核（V1）
 *
 * 规则来源：psc/07-主题/12-职业发展/03-小程序V1-阳台架计算器.md
 * 已实战验证的案例（写死为验收用例）：
 *   总宽1300 / 包管265×218 / 洗衣机宽600+余量30 / 管径25
 *   → 分布 25+630+25+330+25+240+25 = 1300，立柱 4×2=8 根
 *
 * 模型：固定三分区（左=洗衣机位 / 中=自动 / 右=罩包管），方案 A/B 共用本内核，
 * 仅管段长度与配件清单不同。
 */

/** 默认余量：洗衣机宽 + 余量 = 左区净宽（实战 600+30=630） */
const DEFAULT_MARGIN = 30;
/** 默认管径 mm（本次 DIY 用 25mm 不锈钢管） */
const DEFAULT_PIPE_DIAMETER = 25;
/** 分区数（固定 3：洗衣机/中部/包管），立柱位置数 = 分区数 + 1 */
const ZONE_COUNT = 3;

/**
 * 计算阳台架分区与下料清单
 * @param {object} input
 * @param {number} input.totalWidth  阳台总宽 mm（如 1300）
 * @param {number} input.ductWidth   包管宽 mm（如 265）
 * @param {number} input.washerWidth 洗衣机宽 mm（如 600）
 * @param {number} [input.margin=30] 洗衣机两侧余量 mm
 * @param {number} [input.pipeDiameter=25] 管径 mm
 * @param {'A'|'B'} [input.plan='B'] 结构方案：A=立管式 / B=角码壁挂式
 * @param {number} [input.delta]     方案A连接件修正量 Δ mm（待实测；不填按 0 并给出警告）
 * @returns {{
 *   ok: boolean,
 *   zones: {left:number, middle:number, right:number},
 *   postPositions: number, posts: number,
 *   distribution: string,
 *   pipes: Array<{label:string, length:number}>,
 *   parts: {label:string, count:number|null, note:string},
 *   warnings: string[]
 * }}
 */
function computeBalcony(input) {
  const warnings = [];
  const d = Number(input.pipeDiameter) || DEFAULT_PIPE_DIAMETER;
  const margin = input.margin == null ? DEFAULT_MARGIN : Number(input.margin);
  const plan = input.plan === 'A' ? 'A' : 'B';

  const totalWidth = Number(input.totalWidth);
  const ductWidth = Number(input.ductWidth);
  const washerWidth = Number(input.washerWidth);

  // 输入校验：空/0/负数直接挡掉，不让 UI 崩
  if (!totalWidth || totalWidth <= 0) {
    return fail('请输入阳台总宽');
  }
  if (!ductWidth || ductWidth <= 0) {
    return fail('请输入包管宽');
  }
  if (!washerWidth || washerWidth <= 0) {
    return fail('请输入洗衣机宽');
  }
  if (ductWidth <= d) {
    return fail('包管宽必须大于管径（右区 = 包管宽 − 管径）');
  }

  // —— 分区内核（方案无关）——
  const left = washerWidth + margin;            // 左区 = 洗衣机 + 余量（630）
  const right = ductWidth - d;                  // 右区 = 包管 − 管径（240；两管中心距=包管宽）
  const postPositions = ZONE_COUNT + 1;         // 立柱位置数 = 4
  const structureWidth = postPositions * d;     // 结构占宽 = 100
  const middle = totalWidth - structureWidth - left - right; // 中区自动算（330）

  if (middle <= 0) {
    return fail(
      `中区净宽算出来只有 ${Math.round(middle)}mm：总宽不够，或包管/洗衣机位太大`
    );
  }
  if (middle < 150) {
    warnings.push(`中区仅 ${Math.round(middle)}mm，偏窄，确认是否够放台盆/置物`);
  }

  const posts = postPositions * 2; // 前后双排立柱（8 根）
  const round = (n) => Math.round(n * 10) / 10;
  const distribution = `${d}+${round(left)}+${d}+${round(middle)}+${d}+${round(right)}+${d}`;

  // —— 管段长度（方案差异在这里）——
  // 实战教训（03 文件）：管长清单和连接件型号必须绑定计算，不能分开算
  let delta = 0;
  if (plan === 'A') {
    if (input.delta == null || isNaN(Number(input.delta))) {
      warnings.push('方案A需要实测连接件修正量 Δ（03 文件待补项），当前按 Δ=0 计算，仅供预览');
    } else {
      delta = Number(input.delta);
    }
  }
  const pipes = [
    { label: '左跨管段（洗衣机位）', length: round(left + delta) },
    { label: '中跨管段', length: round(middle + delta) },
    { label: '右跨管段（罩包管）', length: round(right + delta) },
  ];

  // —— 配件清单（数量为估算框架，型号与精确数量待实测校准，见 03"连接件经验"）——
  const parts =
    plan === 'A'
      ? {
          label: '不锈钢可调连接件',
          count: null, // TODO(实测)：型号与数量待补——合金滑丝教训后改用不锈钢可调
          note: '型号与数量待实测校准（03 文件待补项），当前只给管长清单',
        }
      : {
          label: '角码',
          count: ZONE_COUNT * 2 * 2, // 估算：前后双排 × 3 跨 × 每跨两端
          note: '估算值，打孔前按实际点位复核',
        };

  return {
    ok: true,
    zones: { left: round(left), middle: round(middle), right: round(right) },
    postPositions,
    posts,
    distribution,
    pipes,
    parts,
    warnings,
  };
}

function fail(message) {
  return { ok: false, zones: null, posts: null, distribution: '', pipes: [], parts: null, warnings: [message] };
}

module.exports = { computeBalcony, DEFAULT_MARGIN, DEFAULT_PIPE_DIAMETER, ZONE_COUNT };
