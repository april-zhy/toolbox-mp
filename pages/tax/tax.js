// 个税计算器 —— 自老项目移植（D:\Work\ISD_NEW\tools\pages\tax\tax.vue）
// 差异：① v-model 改 bindinput，toFixed 移到 JS 侧；② 月度工资改用月度税率表
//（老版误套年度税率表，税额偏低，修正说明见 utils/tax.js calcMonthlySalaryTax）
const { calcMonthlySalaryTax, calcAnnualBonusTax } = require('../../utils/tax.js')

// 专项附加扣除快捷项（与老版一致：点击自动累加进"专项附加扣除"输入框）
const DEDUCTION_PRESETS = [
  { key: 'children', label: '子女教育 2000', amount: 2000 },
  { key: 'elders', label: '赡养老人 3000', amount: 3000 },
  { key: 'housing', label: '住房利息 1000', amount: 1000 },
  { key: 'rent', label: '住房租金 1500', amount: 1500 },
  { key: 'continuing', label: '继续教育 400', amount: 400 },
]

Page({
  data: {
    form: {
      salary: '',
      insurance: '',
      additional: '',
      subsidy: '',
      annualBonus: '',
    },
    deductionTags: DEDUCTION_PRESETS.map(function (p) {
      return { key: p.key, label: p.label, active: false }
    }),
    result: null,
    bonusResult: null,
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  toggleDeduction(e) {
    const key = e.currentTarget.dataset.key
    const preset = DEDUCTION_PRESETS.find(function (p) { return p.key === key })
    const tags = this.data.deductionTags.map(function (t) {
      return t.key === key ? { key: t.key, label: t.label, active: !t.active } : t
    })
    let sum = 0
    tags.forEach(function (t) {
      if (t.active) {
        sum += DEDUCTION_PRESETS.find(function (p) { return p.key === t.key }).amount
      }
    })
    this.setData({ deductionTags: tags, 'form.additional': String(sum) })
  },

  calculate() {
    const salary = parseFloat(this.data.form.salary) || 0
    const insurance = parseFloat(this.data.form.insurance) || 0
    const additional = parseFloat(this.data.form.additional) || 0
    const subsidy = parseFloat(this.data.form.subsidy) || 0

    if (salary <= 0) {
      wx.showToast({ title: '请输入税前月薪', icon: 'none' })
      return
    }

    const r = calcMonthlySalaryTax(salary, insurance, additional, subsidy)

    this.setData({
      result: {
        salary: r.monthIncome.toFixed(2),
        insurance: insurance.toFixed(2),
        additional: additional.toFixed(2),
        taxable: r.taxable.toFixed(2),
        taxRate: (r.rate * 100).toFixed(0),
        tax: r.tax.toFixed(2),
        afterTax: r.afterTax.toFixed(2),
      },
      bonusResult: this.calcBonus(),
    })
  },

  calcBonus() {
    const annualBonus = parseFloat(this.data.form.annualBonus) || 0
    if (annualBonus <= 0) return null
    const res = calcAnnualBonusTax(annualBonus)
    return {
      bonus: annualBonus.toFixed(2),
      rate: (res.rate * 100).toFixed(0),
      tax: res.tax.toFixed(2),
      afterTax: res.afterTax.toFixed(2),
    }
  },
})
