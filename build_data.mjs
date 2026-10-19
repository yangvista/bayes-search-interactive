// 从问卷 CSV 生成网页内联数据 data.js
import { readFileSync, writeFileSync } from 'node:fs';

const raw = readFileSync('C:/Users/Jianhua Zhong/Desktop/问卷星刷脚本/概率论的脚本/填写问卷数据.csv', 'utf8');
const lines = raw.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
const header = lines[0].split(',');
const rows = lines.slice(1).map(l => l.split(','));
const col = name => rows.map(r => r[header.indexOf(name)]);
const q = n => col(`q${n}_` in {} ? '' : col => col) // noop guard
const get = n => rows.map(r => r[header.findIndex(h => h.startsWith(`q${n}_`))]);

const stage = s => (s === '已经学过' ? 2 : s === '正在学习' ? 1 : 0);
const belief = s => (s === '不能说明' ? 2 : s === '能说明' ? 1 : 0);
const place = s => ({ 图书馆: 0, 教室: 1, 食堂: 2, 不确定: 3 }[s] ?? 3);
const tplace = s => ({ 实验室: 0, 活动室: 1, 操场: 2, 不确定: 3 }[s] ?? 3);
const hardest = s => ({
  '失败后如何重算概率': 0, '分不清位置概率和找到概率': 1, '三地同时归一化': 2, '演示操作本身': 3,
}[s] ?? 4);

const num = s => { const v = Number(s); return Number.isFinite(v) ? Math.round(v * 100) / 100 : 999; };

// 逐人压缩记录：stage,first,pre,post,estPre,estPost,rePre,rePost,confPre,confPost,demo,help,hardest,trans
const people = rows.map((_, i) => [
  stage(get(2)[i]), place(get(3)[i]), belief(get(4)[i]), belief(get(10)[i]),
  num(get(5)[i]), num(get(11)[i]),
  place(get(7)[i]), place(get(13)[i]),
  num(get(8)[i]), num(get(14)[i]),
  get(9)[i] === '已完整完成演示' ? 1 : 0,
  num(get(17)[i]), hardest(get(18)[i]), tplace(get(15)[i]),
]);

const out = `/* 问卷数据（350 份，2026-10）。由 analyze/build_data 脚本从问卷星导出 CSV 生成。
   people 每行 14 个字段：
   0 学习阶段(2已学/1在学/0未学) 1 首搜地点(0馆/1教/2食/3不确定) 2 前测认知(2不能/1能/0不确定)
   3 后测认知 4 前测估计(999=未答) 5 后测估计(999=未答) 6 前测再搜 7 后测再搜
   8 前测把握度 9 后测把握度 10 完成演示(1/0) 11 演示帮助度(1-5)
   12 最难步骤(0失败重算/1两类概率/2同时归一化/3操作本身/4未填) 13 迁移题再搜(0实验室/1活动室/2操场/3不确定) */
window.STORY_DATA = {
  n: 350,
  theory: 16.67,
  band: [14, 19],
  people: ${JSON.stringify(people)}
};
`;
writeFileSync(new URL('./data.js', import.meta.url), out);
console.log('data.js written:', people.length, 'people,', Math.round(out.length / 1024), 'KB');
