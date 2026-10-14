/**
 * 房贷计算工具（从老项目 D:\Work\ISD_NEW\tools\utils\mortgage.js 照搬，逻辑未动）
 * 支持等额本息和等额本金两种还款方式
 */

/**
 * 等额本息计算
 * 每月还款额 = [贷款本金 × 月利率 × (1+月利率)^还款月数] ÷ [(1+月利率)^还款月数 - 1]
 * @param {number} principal - 贷款总额（元）
 * @param {number} yearRate - 年利率（如 0.031 表示 3.1%）
 * @param {number} months - 还款月数
 * @returns {{ monthlyPayment: number, totalPayment: number, totalInterest: number, details: Array }}
 */
function calcEqualInstallment(principal, yearRate, months) {
  if (principal <= 0 || months <= 0) {
    return { monthlyPayment: 0, totalPayment: 0, totalInterest: 0, details: [] }
  }

  const monthRate = yearRate / 12
  let monthlyPayment, totalPayment, totalInterest

  if (monthRate === 0) {
    monthlyPayment = principal / months
    totalPayment = principal
    totalInterest = 0
  } else {
    const pow = Math.pow(1 + monthRate, months)
    monthlyPayment = (principal * monthRate * pow) / (pow - 1)
    totalPayment = monthlyPayment * months
    totalInterest = totalPayment - principal
  }

  let remaining = principal
  const details = []
  for (let i = 1; i <= months; i++) {
    const monthInterest = remaining * monthRate
    const monthPrincipal = monthlyPayment - monthInterest
    remaining -= monthPrincipal

    details.push({
      month: i,
      payment: Math.round(monthlyPayment * 100) / 100,
      principal: Math.round(monthPrincipal * 100) / 100,
      interest: Math.round(monthInterest * 100) / 100,
      remaining: Math.max(0, Math.round(remaining * 100) / 100),
    })
  }

  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    details,
  }
}

/**
 * 等额本金计算
 * 每月还款额 = (贷款本金 ÷ 还款月数) + (贷款本金 - 已归还本金累计额) × 月利率
 * @param {number} principal - 贷款总额（元）
 * @param {number} yearRate - 年利率
 * @param {number} months - 还款月数
 * @returns {{ firstPayment: number, lastPayment: number, totalPayment: number, totalInterest: number, details: Array }}
 */
function calcEqualPrincipal(principal, yearRate, months) {
  if (principal <= 0 || months <= 0) {
    return { firstPayment: 0, lastPayment: 0, totalPayment: 0, totalInterest: 0, details: [] }
  }

  const monthRate = yearRate / 12
  const monthPrincipal = principal / months
  let remaining = principal
  let totalInterest = 0

  const details = []
  for (let i = 1; i <= months; i++) {
    const monthInterest = remaining * monthRate
    const payment = monthPrincipal + monthInterest
    remaining -= monthPrincipal
    totalInterest += monthInterest

    details.push({
      month: i,
      payment: Math.round(payment * 100) / 100,
      principal: Math.round(monthPrincipal * 100) / 100,
      interest: Math.round(monthInterest * 100) / 100,
      remaining: Math.max(0, Math.round(remaining * 100) / 100),
    })
  }

  return {
    firstPayment: Math.round(details[0].payment * 100) / 100,
    lastPayment: Math.round(details[details.length - 1].payment * 100) / 100,
    totalPayment: Math.round((principal + totalInterest) * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    details,
  }
}

module.exports = { calcEqualInstallment, calcEqualPrincipal }
