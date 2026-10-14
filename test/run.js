/**
 * 阳台架内核验收测试 —— 用实战已验证的 1300 案例回归
 * 运行：node test/run.js
 */
const { computeBalcony } = require('../utils/balcony.js');

let failed = 0;
function check(name, actual, expected) {
  const pass = actual === expected;
  if (!pass) failed++;
  console.log(`${pass ? '✅' : '❌'} ${name}：期望 ${expected}，实际 ${actual}`);
}

// 实战案例：1300 / 265 / 600+30 / 25 → 25+630+25+330+25+240+25，8 根立柱
const r = computeBalcony({
  totalWidth: 1300,
  ductWidth: 265,
  washerWidth: 600,
  margin: 30,
  pipeDiameter: 25,
  plan: 'B',
});

check('计算成功', r.ok, true);
check('左区(洗衣机)净宽', r.zones.left, 630);
check('中区净宽(自动)', r.zones.middle, 330);
check('右区(罩包管)净宽', r.zones.right, 240);
check('立柱根数(前后双排)', r.posts, 8);
check('分布串', r.distribution, '25+630+25+330+25+240+25');
check('方案B 左跨管长=净距', r.pipes[0].length, 630);

// 变更回归：包管宽 300 → 右区 275，中区自动收缩
const r2 = computeBalcony({ totalWidth: 1300, ductWidth: 300, washerWidth: 600, plan: 'B' });
check('包管300→右区275', r2.zones.right, 275);
check('包管300→中区295', r2.zones.middle, 295);

// 方案A Δ 生效
const r3 = computeBalcony({ totalWidth: 1300, ductWidth: 265, washerWidth: 600, plan: 'A', delta: 10 });
check('方案A Δ=10→左跨640', r3.pipes[0].length, 640);

// 边界：不崩
const bad = computeBalcony({ totalWidth: 0, ductWidth: 265, washerWidth: 600 });
check('总宽为0→ok=false', bad.ok, false);

process.exit(failed ? 1 : 0);
