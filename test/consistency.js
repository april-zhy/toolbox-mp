/**
 * 移植一致性核对：老项目（uni-app）计算函数 vs 本项目 utils/ 移植版
 * 运行：node test/consistency.js
 *
 * 老项目源码是 ESM，这里剥掉 `export ` 前缀后用 new Function 执行，
 * 拿到的就是老代码本身（非复制粘贴），对比结果即"与老版一致"的证据。
 * 老项目路径不存在时（换机器/老库归档）打印 SKIP 并以 0 退出。
 */
const fs = require('fs')
const path = require('path')

const OLD_FILES = {
  tax: 'D:/Work/ISD_NEW/tools/util.js',
  mortgage: 'D:/Work/ISD_NEW/tools/utils/mortgage.js',
}

function loadOld(file, names) {
  const src = fs.readFileSync(file, 'utf8').replace(/^export\s+/gm, '')
  const body = src + `\nmodule.exports = { ${names.join(', ')} };`
  const mod = {}
  new Function('module', body)(mod)
  return mod.exports
}

function deepEqual(a, b) {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every((k) => deepEqual(a[k], b[k]))
}

let failed = 0
function check(name, actual, expected) {
  const pass = deepEqual(actual, expected)
  if (!pass) {
    failed++
    console.log(`❌ ${name}\n   老：${JSON.stringify(expected)}\n   新：${JSON.stringify(actual)}`)
  } else {
    console.log(`✅ ${name}`)
  }
}

const missing = Object.values(OLD_FILES).filter((f) => !fs.existsSync(f))
if (missing.length) {
  console.log(`⏭️  SKIP 一致性核对：老项目文件不存在（${missing.join(', ')}）`)
  process.exit(0)
}

// —— 个税 ——
const oldTax = loadOld(OLD_FILES.tax, ['calcTax', 'calcAnnualBonusTax'])
const newTax = require('../utils/tax.js')

// 覆盖各税率档 + 跳档边界 + 月度表
const taxCases = [
  [0], [1], [3000], [36000], [36001], [80000], [144000], [300000],
  [420000], [660000], [960000], [960001], [1500000],
  [3000, true], [12000, true], [12001, true], [80000, true],
]
taxCases.forEach((args) => {
  check(`calcTax(${args.join(', ')})`, newTax.calcTax(...args), oldTax.calcTax(...args))
})

const bonusCases = [0, 1, 36000, 36001, 144000, 300000, 500000, 1000000]
bonusCases.forEach((v) => {
  check(`calcAnnualBonusTax(${v})`, newTax.calcAnnualBonusTax(v), oldTax.calcAnnualBonusTax(v))
})

// —— 房贷 ——
const oldMortgage = loadOld(OLD_FILES.mortgage, ['calcEqualInstallment', 'calcEqualPrincipal'])
const newMortgage = require('../utils/mortgage.js')

// 商贷 30 年 / 公积金 10 年 / 零利率 / 无效输入，两种还款方式各跑一遍（details 全量逐月对比）
const mortgageCases = [
  [1000000, 0.031, 360],
  [500000, 0.0285, 120],
  [1000000, 0, 12],
  [0, 0.031, 360],
  [865000.5, 0.0345, 25 * 12],
]
mortgageCases.forEach((args) => {
  check(`calcEqualInstallment(${args.join(', ')}) 含 ${newMortgage.calcEqualInstallment(...args).details.length} 个月明细`,
    newMortgage.calcEqualInstallment(...args), oldMortgage.calcEqualInstallment(...args))
  check(`calcEqualPrincipal(${args.join(', ')}) 含 ${newMortgage.calcEqualPrincipal(...args).details.length} 个月明细`,
    newMortgage.calcEqualPrincipal(...args), oldMortgage.calcEqualPrincipal(...args))
})

console.log(failed ? `\n一致性核对：${failed} 项不一致 ❌` : '\n一致性核对：全部通过 ✅')
process.exit(failed ? 1 : 0)
