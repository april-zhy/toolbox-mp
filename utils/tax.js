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

module.exports = { calcTax, calcAnnualBonusTax }
