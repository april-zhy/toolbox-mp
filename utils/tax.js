/**
 * 个税计算工具（从老项目 D:\Work\ISD_NEW\tools\util.js 照搬，逻辑未动）
 * 基于2024年个人所得税税率表
 *
 * 说明：老文件里的 calcMonthlyTaxDetail（累计预扣法）老页面未使用，未随迁。
 */

// 年度税率表（应纳税所得额）
const TAX_RULE_YEAR = [
  [36000, 0.03, 0],
  [144000, 0.1, 2520],
  [300000, 0.2, 16920],
  [420000, 0.25, 31920],
  [660000, 0.3, 52920],
  [960000, 0.35, 85920],
  [Infinity, 0.45, 181920],
]

// 月度税率表（适用于年终奖等）
const TAX_RULE_MONTH = [
  [3000, 0.03, 0],
  [12000, 0.1, 210],
  [25000, 0.2, 1410],
  [35000, 0.25, 2660],
  [55000, 0.3, 4410],
  [80000, 0.35, 7160],
  [Infinity, 0.45, 15160],
]

/**
 * 根据应纳税所得额计算税额
 * @param {number} taxableIncome - 应纳税所得额
 * @param {boolean} isMonthly - 是否使用月度税率表
 * @returns {{ tax: number, rate: number, deduction: number }}
 */
function calcTax(taxableIncome, isMonthly) {
  if (taxableIncome <= 0) return { tax: 0, rate: 0, deduction: 0 }

  const RULES = isMonthly ? TAX_RULE_MONTH : TAX_RULE_YEAR
  for (let i = 0; i < RULES.length; i++) {
    const limit = RULES[i][0]
    const rate = RULES[i][1]
    const deduction = RULES[i][2]
    if (taxableIncome <= limit) {
      return {
        tax: Math.round(taxableIncome * rate - deduction),
        rate,
        deduction,
      }
    }
  }
  return { tax: 0, rate: 0, deduction: 0 }
}

/**
 * 计算年终奖个税
 * @param {number} annualBonus - 年终奖金额
 * @returns {{ tax: number, rate: number, afterTax: number }}
 */
function calcAnnualBonusTax(annualBonus) {
  if (annualBonus <= 0) return { tax: 0, rate: 0, afterTax: 0 }

  const monthlyAvg = annualBonus / 12
  const result = calcTax(monthlyAvg, true)
  const tax = Math.round(annualBonus * result.rate - result.deduction)

  return {
    tax,
    rate: result.rate,
    afterTax: annualBonus - tax,
  }
}

/**
 * 月度工资个税（月均简化估算法）—— 页面公式，含对老版 bug 的修正
 *
 * 老版 bug（2026-10-14 移植时发现并修正）：单月应纳税所得额套了年度税率表，
 * 速算扣除按全年额度扣（如 10% 档扣 2520），且 ≤36000 一律 3% —— 税额显著偏低
 * （例：月薪 15000 无扣除，老版 300 元/月，正确 790 元/月）。
 * 正确口径：单月应纳税所得额套月度税率表（速算扣除 = 年度 ÷ 12，2520/12=210）；
 * 收入恒定时与累计预扣法的全年月均完全一致。
 * 照搬的老函数 calcTax / calcAnnualBonusTax（年终奖用月度表）保持原样未动。
 *
 * @param {number} salary 税前月薪
 * @param {number} insurance 五险一金个人部分
 * @param {number} additional 专项附加扣除
 * @param {number} subsidy 补贴（计税）
 * @returns {{ monthIncome, taxable, tax, rate, afterTax }}
 */
function calcMonthlySalaryTax(salary, insurance, additional, subsidy) {
  const monthIncome = salary + subsidy
  const monthTaxable = monthIncome - insurance - additional - 5000
  const res = calcTax(Math.ceil(monthTaxable), true)
  const tax = Math.max(0, res.tax)
  return {
    monthIncome,
    taxable: Math.max(0, monthTaxable),
    tax,
    rate: res.rate,
    afterTax: monthIncome - tax - insurance,
  }
}

module.exports = { calcTax, calcAnnualBonusTax, calcMonthlySalaryTax }
