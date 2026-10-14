/**
 * 个税月度公式验收测试（含老版 bug 修正的回归锚点）
 * 运行：node test/tax.js
 * 期望值均为手算：月度税率表 = 应纳税所得额×税率 − 月度速算扣除
 * 自洽性：收入恒定时，月均税 × 12 == 累计预扣法（年度税率表）全年税
 */
const { calcMonthlySalaryTax, calcTax } = require('../utils/tax.js')

let failed = 0
function check(name, actual, expected) {
  const pass = actual === expected
  if (!pass) failed++
  console.log(`${pass ? '✅' : '❌'} ${name}：期望 ${expected}，实际 ${actual}`)
}

// 老版 bug 修正锚点：老版此例算 300（误套年表 3% 档），正确 790
const r1 = calcMonthlySalaryTax(15000, 0, 0, 0)
check('月薪15000→月缴个税(修正锚点 790，非老版 300)', r1.tax, 790)
check('月薪15000→到手', r1.afterTax, 14210)
check('月薪15000→适用税率', r1.rate, 0.1)

// 3% 档（≤3000）与档界
check('月薪8000(应税3000)→税 3%', calcMonthlySalaryTax(8000, 0, 0, 0).tax, 90)
check('月薪17000(应税12000 档界)→税 10%', calcMonthlySalaryTax(17000, 0, 0, 0).tax, 990)

// 20% 档 + 五险一金/专项附加/补贴全参
const r2 = calcMonthlySalaryTax(30000, 4500, 2000, 0)
check('月薪30000五险4500附加2000→税 20%档', r2.tax, 2290)
check('月薪30000→到手', r2.afterTax, 23210)
const r3 = calcMonthlySalaryTax(20000, 3000, 1000, 500)
check('月薪20000+补贴500→应税', r3.taxable, 11500)
check('月薪20000+补贴500→税', r3.tax, 940)

// 起征点下：不缴税、到手=月薪−五险
const r4 = calcMonthlySalaryTax(5000, 0, 0, 0)
check('月薪5000→税0', r4.tax, 0)
check('月薪5000→到手5000', r4.afterTax, 5000)
check('月薪4000(应税为负)→到手4000', calcMonthlySalaryTax(4000, 0, 0, 0).afterTax, 4000)

// 小数向上取整（老版语义保留）
check('月薪15000.5→ceil后税', calcMonthlySalaryTax(15000.5, 0, 0, 0).tax, 790)

// 自洽性：月均 × 12 == 年度税率表全年税（收入恒定）
;[7000, 15000, 30000].forEach((salary) => {
  const monthly = calcMonthlySalaryTax(salary, 0, 0, 0)
  const annualTax = calcTax((salary - 5000) * 12) // 年度表：即累计预扣法全年税
  check(`自洽 月薪${salary}：月税×12==年税`, monthly.tax * 12, annualTax.tax)
})

process.exit(failed ? 1 : 0)
