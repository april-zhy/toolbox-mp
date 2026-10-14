Page({
  data: {
    tools: [
      {
        icon: '💰',
        title: '个税计算器',
        desc: '工资个税估算',
        path: '/pages/tax/tax',
        badge: '待移植',
      },
      {
        icon: '🏠',
        title: '房贷计算器',
        desc: '商贷/公积金月供',
        path: '/pages/mortgage/mortgage',
        badge: '待移植',
      },
      {
        icon: '🔧',
        title: '阳台架计算器',
        desc: 'DIY 定尺寸 · 管长 · 配件',
        path: '/pages/balcony/balcony',
        badge: 'V1 开发中',
      },
    ],
  },
  onTapTool(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.path });
  },
});
