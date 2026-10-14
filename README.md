# 生活工具箱（原生微信小程序 v2）

个人小程序"生活工具箱"的原生重写版。原 uni-app 版本（`D:\Work\ISD_NEW\tools`、`D:\Work\SELF\tools11`）不再开发，仅作移植参考。

## 这是什么

家用计算器矩阵：一个账号攒搜索权重，一个工具页吃一个搜索词。

| 工具页 | 状态 |
|---|---|
| 个税计算器 | ✅ 已从旧项目移植（`node test/consistency.js` 与老版逐字段一致） |
| 房贷计算器 | ✅ 已从旧项目移植（同上） |
| **阳台架计算器** | ✅ V1 完成（表单 + 实时结果 + 方案 A/B + 台上盆提示卡），待真机预览 |
| **衣柜计算器** | ✅ V1 实战版（锚 1775 真实落地案例：列数自动 ≤1m/列 + 顶层 5 杆井格托顶板 → 下料单 + 管夹清单 + 立体/正视/侧视三图），待真机预览 |

## 需求与开发方案（权威文档，在 psc 库里）

- 需求：`D:\Work\SELF\psc\07-主题\12-职业发展\03-小程序V1-阳台架计算器.md`
- 开发方案（步骤/验收/SEO/变现）：`D:\Work\SELF\psc\07-主题\12-职业发展\06-开发方案-阳台架计算器V1.md`

## 如何运行

1. 微信开发者工具 → 导入项目 → 选本目录（AppID 已配好）
2. 编辑用 VS Code + Claude Code，开发者工具开着同目录实时预览（保存即热更新）
3. 跑测试：`node test/run.js`（阳台架内核，1300 实战案例）、`node test/tax.js`（个税月度公式，含 bug 修正锚点）、`node test/wardrobe.js`（衣柜实战内核，1775 真实案例）、`node test/consistency.js`（与老项目计算结果一致性，老路径不存在时自动 SKIP）

## 目录结构

```
app.{js,json,wxss}        全局
pages/index/              工具箱首页（卡片入口）
pages/tax/                个税计算器
pages/mortgage/           房贷计算器
pages/balcony/            阳台架计算器（V1）
pages/wardrobe/           衣柜计算器（竖管立柱式 V1）
utils/tax.js              个税计算内核（自老项目照搬）
utils/mortgage.js         房贷计算内核（自老项目照搬）
utils/balcony.js          阳台架分区内核（纯函数，方案 A/B 共用）
utils/wardrobe.js         衣柜实战内核（1775 案例锚定：分区下料 + 管夹清单）
test/run.js               阳台架内核验收测试（1300 实战案例）
test/tax.js               个税月度公式验收测试
test/wardrobe.js          衣柜内核验收测试
test/consistency.js       新老计算结果一致性核对（依赖老项目路径）
```

## 开发约定

- 计算逻辑全部放 `utils/` 纯函数，UI 只做输入输出，内核可被 node 直接测试
- 零后端、零登录、不收集信息（个人主体审核最顺）
- 上 TypeScript / 构建链 = 需要先说服自己不值得
