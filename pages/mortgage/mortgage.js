// 房贷计算器 —— 自老项目移植（D:\Work\ISD_NEW\tools\pages\mortgage\mortgage.vue，计算逻辑照搬）
// 差异：v-model 改 bindinput；组合贷明细合并处的 ?. 可选链降级为 ES5（原生 es6 编译不保证覆盖 ES2020）
const { calcEqualInstallment, calcEqualPrincipal } = require('../../utils/mortgage.js')

Page({
  data: {
    form: {
      loanType: 'commercial',
      amount: '',
      commercialAmount: '',
      fundAmount: '',
      years: 30,
      rate: '3.1',
      commercialRate: '3.1',
      fundRate: '2.85',
      method: 'equal_installment',
    },
    quickYears: [10, 15, 20, 25, 30],
    result: null,
    showDetail: false,
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  setLoanType(e) {
    const type = e.currentTarget.dataset.type
    const patch = { 'form.loanType': type }
    if (type === 'commercial') {
      patch['form.rate'] = '3.1'
    } else if (type === 'fund') {
      patch['form.rate'] = '2.85'
    } else {
      patch['form.commercialRate'] = '3.1'
      patch['form.fundRate'] = '2.85'
    }
    this.setData(patch)
  },

  setYear(e) {
    this.setData({ 'form.years': e.currentTarget.dataset.y })
  },

  setMethod(e) {
    this.setData({ 'form.method': e.currentTarget.dataset.method })
  },

  toggleDetail() {
    this.setData({ showDetail: !this.data.showDetail })
  },

  calculate() {
    const years = parseInt(this.data.form.years) || 0
    const months = years * 12

    if (months <= 0) {
      wx.showToast({ title: '请输入贷款年限', icon: 'none' })
      return
    }

    let result = null

    if (this.data.form.loanType === 'combined') {
      const comPrincipal = (parseFloat(this.data.form.commercialAmount) || 0) * 10000
      const fundPrincipal = (parseFloat(this.data.form.fundAmount) || 0) * 10000
      const comRate = (parseFloat(this.data.form.commercialRate) || 3.1) / 100
      const fundRate = (parseFloat(this.data.form.fundRate) || 2.85) / 100

      if (comPrincipal + fundPrincipal <= 0) {
        wx.showToast({ title: '请输入贷款金额', icon: 'none' })
        return
      }

      const calcFn = this.data.form.method === 'equal_installment' ? calcEqualInstallment : calcEqualPrincipal
      const comRes = calcFn(comPrincipal, comRate, months)
      const fundRes = calcFn(fundPrincipal, fundRate, months)

      result = {
        totalPrincipal: ((comPrincipal + fundPrincipal) / 10000).toFixed(2),
        totalPayment: ((comRes.totalPayment + fundRes.totalPayment) / 10000).toFixed(2),
        totalInterest: ((comRes.totalInterest + fundRes.totalInterest) / 10000).toFixed(2),
        months,
        monthlyPayment: (comRes.monthlyPayment + fundRes.monthlyPayment).toFixed(2),
        details: comRes.details.map((d, i) => {
          const fd = fundRes.details[i] || {}
          return {
            month: d.month,
            payment: (d.payment + (fd.payment || 0)).toFixed(2),
            principal: (d.principal + (fd.principal || 0)).toFixed(2),
            interest: (d.interest + (fd.interest || 0)).toFixed(2),
            remaining: (d.remaining + (fd.remaining || 0)).toFixed(2),
          }
        }),
      }
    } else {
      const principal = (parseFloat(this.data.form.amount) || 0) * 10000
      const rate = (parseFloat(this.data.form.rate) || 3.1) / 100

      if (principal <= 0) {
        wx.showToast({ title: '请输入贷款金额', icon: 'none' })
        return
      }

      if (this.data.form.method === 'equal_installment') {
        const res = calcEqualInstallment(principal, rate, months)
        result = {
          totalPrincipal: (principal / 10000).toFixed(2),
          totalPayment: (res.totalPayment / 10000).toFixed(2),
          totalInterest: (res.totalInterest / 10000).toFixed(2),
          months,
          monthlyPayment: res.monthlyPayment.toFixed(2),
          details: res.details,
        }
      } else {
        const res = calcEqualPrincipal(principal, rate, months)
        result = {
          totalPrincipal: (principal / 10000).toFixed(2),
          totalPayment: (res.totalPayment / 10000).toFixed(2),
          totalInterest: (res.totalInterest / 10000).toFixed(2),
          months,
          monthlyPayment: res.firstPayment.toFixed(2),
          lastPayment: res.lastPayment.toFixed(2),
          monthlyDecrease: (principal / months * rate).toFixed(2),
          details: res.details,
        }
      }
    }

    this.setData({ result, showDetail: false })
  },
})
