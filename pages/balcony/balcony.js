/**
 * 阳台架计算器 —— V1 页面（Step 2-3：表单 + 实时结果 + 方案 A/B + 台上盆提示卡）
 * 需求：psc/07-主题/12-职业发展/03-小程序V1-阳台架计算器.md
 * 方案：psc/07-主题/12-职业发展/06-开发方案-阳台架计算器V1.md 第三节
 * 计算全在 utils/balcony.js 纯函数内核（node test/run.js 可回归），本页只做输入输出。
 */
const { computeBalcony } = require('../../utils/balcony.js')

// 结构方案说明（03 需求文件"结构方案分支"）
const PLAN_DESC = {
  B: '角码钉墙：洗衣机落地 + 上方层架壁挂，角码不占管长，管长=净距。墙面可承重或净空被挤占时选它。',
  A: '立管落地框架：4 根立管 + 不锈钢可调连接件，管长=净距+Δ。墙面不能打孔时选它（Δ 与连接件型号需实测）。',
}

Page({
  data: {
    form: {
      totalWidth: '1300',
      ductWidth: '265',
      washerWidth: '600',
      margin: '30',
      pipeDiameter: '25',
      delta: '',
    },
    plan: 'B',
    planDesc: PLAN_DESC.B,
    // 实时结果（ok=false 时 result=null、error 有值）
    result: null,
    error: '',
  },

  onLoad() {
    this.recalc()
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
    this.recalc()
  },

  setPlan(e) {
    const plan = e.currentTarget.dataset.plan
    this.setData({ plan, planDesc: PLAN_DESC[plan] })
    this.recalc()
  },

  recalc() {
    const f = this.data.form
    const r = computeBalcony({
      totalWidth: f.totalWidth,
      ductWidth: f.ductWidth,
      washerWidth: f.washerWidth,
      margin: f.margin,
      pipeDiameter: f.pipeDiameter,
      plan: this.data.plan,
      delta: f.delta === '' ? undefined : f.delta,
    })

    if (!r.ok) {
      this.setData({ result: null, error: r.warnings[0] })
      return
    }

    this.setData({
      error: '',
      result: {
        distribution: r.distribution,
        totalWidth: f.totalWidth,
        zones: [
          { label: '左区 · 洗衣机位', width: r.zones.left },
          { label: '中区 · 自动算', width: r.zones.middle },
          { label: '右区 · 罩包管', width: r.zones.right },
        ],
        postPositions: r.postPositions,
        posts: r.posts,
        pipes: r.pipes,
        parts: {
          label: r.parts.label,
          count: r.parts.count === null ? '待实测' : r.parts.count,
          note: r.parts.note,
        },
        warnings: r.warnings,
      },
    })
  },
})
