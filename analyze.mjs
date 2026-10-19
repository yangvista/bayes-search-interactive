// 问卷数据统计分析：为叙事网页提供真实数字
import { readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync('C:/Users/Jianhua Zhong/Desktop/问卷星刷脚本/概率论的脚本/填写问卷数据.csv', 'utf8');
// 去掉 BOM，按行解析（数据内无引号包裹逗号，可直接 split）
const lines = raw.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
const header = lines[0].split(',');
const rows = lines.slice(1).map(l => l.split(','));
console.log('N =', rows.length, '| columns =', header.length);

const col = name => rows.map(r => r[header.indexOf(name)]);
const dist = arr => {
  const m = {};
  for (const v of arr) m[v] = (m[v] || 0) + 1;
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
};
const pct = (n, d) => (n / d * 100).toFixed(1) + '%';
const nums = arr => arr.map(Number).filter(v => Number.isFinite(v) && v !== 999);
const stats = arr => {
  const v = nums(arr).sort((a, b) => a - b);
  if (!v.length) return null;
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const median = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  return { n: v.length, missing: arr.length - v.length, mean: +mean.toFixed(2), median: +median.toFixed(2), min: v[0], max: v[v.length - 1] };
};
const near = (arr, lo, hi) => nums(arr).filter(v => v >= lo && v <= hi).length;
const roundNum = arr => nums(arr).filter(v => Math.abs(v - Math.round(v / 10) * 10) < 0.001 || v === 0 || v === 50).length;

// q5/q11 的理论值检验：先验(馆,教,食)=(0.4,0.3,0.3)、检出率 p=0.7 时后验 = 0.4*0.3/0.72
console.log('\n理论后验(0.4/0.3/0.3, p=0.7) =', (0.4 * 0.3 / 0.72 * 100).toFixed(2) + '%');
console.log('理论后验(0.4/0.25/0.35, p=0.7) =', (0.4 * 0.3 / 0.72 * 100).toFixed(2) + '%');

const q2 = col('q2_条件概率学习情况'), q3 = col('q3_第一次搜索地点');
const q4 = col('q4_失败能否说明不在图书馆'), q10 = col('q10_失败能否说明_后测');
const q5 = col('q5_图书馆后验_前测'), q11 = col('q11_图书馆后验_后测');
const q6 = col('q6_最可能地点_前测'), q12 = col('q12_最可能地点_后测');
const q7 = col('q7_再搜地点_前测'), q13 = col('q13_再搜地点_后测');
const q8 = col('q8_把握度_前测'), q14 = col('q14_把握度_后测');
const q9 = col('q9_是否完成演示'), q15 = col('q15_耳机题再搜地点');
const q16 = col('q16_操场后验'), q17 = col('q17_演示帮助程度_1to5');
const q18 = col('q18_最难理解的一步');

console.log('\n--- q2 学习阶段 ---'); console.log(dist(q2));
console.log('\n--- q3 第一次搜哪里 ---'); console.log(dist(q3));
console.log('\n--- q4 前测:失败能否说明不在图书馆 ---'); console.log(dist(q4));
console.log('--- q10 后测:同题 ---'); console.log(dist(q10));
// 配对翻转
const flip = {};
rows.forEach((_, i) => { const k = q4[i] + ' → ' + q10[i]; flip[k] = (flip[k] || 0) + 1; });
console.log('--- q4→q10 配对变化 ---'); console.log(flip);

console.log('\n--- q5 前测后验估计 ---'); console.log(stats(q5));
console.log('  在14–19%区间:', near(q5, 14, 19), pct(near(q5, 14, 19), rows.length), '| 答整十/0/50:', roundNum(q5), '| 答0:', nums(q5).filter(v => v === 0).length);
console.log('--- q11 后测后验估计 ---'); console.log(stats(q11));
console.log('  在14–19%区间:', near(q11, 14, 19), pct(near(q11, 14, 19), rows.length), '| 答整十/0/50:', roundNum(q11), '| 答0:', nums(q11).filter(v => v === 0).length);
// 直方图桶
const bucket = arr => {
  const v = nums(arr); const b = { '0': 0, '1-9': 0, '10-19': 0, '20-29': 0, '30-49': 0, '50+': 0 };
  for (const x of v) { if (x === 0) b['0']++; else if (x < 10) b['1-9']++; else if (x < 20) b['10-19']++; else if (x < 30) b['20-29']++; else if (x < 50) b['30-49']++; else b['50+']++; }
  return b;
};
console.log('q5 桶:', bucket(q5));
console.log('q11 桶:', bucket(q11));

console.log('\n--- q6 前测最可能地点 ---'); console.log(dist(q6));
console.log('--- q12 后测最可能地点 ---'); console.log(dist(q12));
console.log('--- q7 前测再搜地点 ---'); console.log(dist(q7));
console.log('--- q13 后测再搜地点 ---'); console.log(dist(q13));
const f2 = {};
rows.forEach((_, i) => { const k = q7[i] + ' → ' + q13[i]; f2[k] = (f2[k] || 0) + 1; });
console.log('--- q7→q13 配对 ---'); console.log(f2);

console.log('\n--- q8/q14 把握度 ---'); console.log('前测:', stats(q8)); console.log('后测:', stats(q14));
console.log('\n--- q9 是否完成演示 ---'); console.log(dist(q9));
console.log('\n--- q15 耳机迁移题再搜地点 ---'); console.log(dist(q15));
console.log('--- q16 操场后验 ---'); console.log(stats(q16));
console.log('  在13–15%区间:', near(q16, 13, 15), pct(near(q16, 13, 15), rows.length));
console.log('\n--- q17 演示帮助程度 ---'); console.log(dist(q17), '均值', stats(q17).mean);
console.log('\n--- q18 最难理解的一步 ---'); console.log(dist(q18));

// 按学习阶段分组的前测正确认知（不能说明）
for (const g of ['已经学过', '正在学习', '尚未学习']) {
  const idx = rows.map((_, i) => i).filter(i => q2[i] === g);
  const ok = idx.filter(i => q4[i] === '不能说明').length;
  console.log(`\n[${g}] n=${idx.length} 前测答「不能说明」: ${ok} (${pct(ok, idx.length)})`);
}
// 完成演示与否 × 后测精确度（14-19）
for (const g of ['已完整完成演示', '尚未完成']) {
  const idx = rows.map((_, i) => i).filter(i => q9[i] === g);
  const ok = idx.filter(i => { const v = Number(q11[i]); return Number.isFinite(v) && v !== 999 && v >= 14 && v <= 19; }).length;
  console.log(`[${g}] n=${idx.length} 后测落在14–19%: ${ok} (${pct(ok, idx.length)})`);
}

// 导出精简的逐人数据（供网页档案板使用）
const compact = rows.map((r, i) => [
  q2[i][0] === '已' ? 2 : q2[i][0] === '正' ? 1 : 0,          // 学习阶段
  q3[i],                                                       // 首搜
  q4[i] === '不能说明' ? 2 : q4[i] === '能说明' ? 1 : 0,      // 前测认知
  q10[i] === '不能说明' ? 2 : q10[i] === '能说明' ? 1 : 0,    // 后测认知
  q5[i], q11[i],                                               // 后验估计(999=未答)
  q7[i], q13[i],                                               // 再搜地点
  Math.round(Number(q8[i])) || 0, Math.round(Number(q14[i])) || 0, // 把握度
  q9[i] === '已完整完成演示' ? 1 : 0,                          // 是否完成演示
  q17[i], q18[i] || ''                                         // 帮助度、最难步骤
]);
writeFileSync(new URL('./survey_compact.json', import.meta.url), JSON.stringify(compact));
console.log('\nsurvey_compact.json written,', compact.length, 'rows');
