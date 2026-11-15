// 生成测试数据：node test/demo.js <输出目录> [结束日期 YYYY-MM-DD] [天数]
// 先写成手写格式，再用内核自己的正规化流程落盘，保证和应用写出的文件完全一致
const fs = require('fs'), path = require('path'), C = require('../src/core.js');
const out = process.argv[2] || 'demo/data', END = process.argv[3] || new Date().toISOString().slice(0, 10), DAYS = +process.argv[4] || 150;
let seed = 20261115; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)], chance = (p) => rnd() < p;
const day = (n) => new Date(Date.parse(END + 'T00:00:00Z') - (DAYS - n) * 86400000).toISOString().slice(0, 10);
const dow = (n) => new Date(day(n) + 'T00:00:00Z').getUTCDay();
const PEOPLE = ['@Mandy', '@Jesson', '@Steve', '@{Li Wei}', '@Anna', '@Kevin', '@Yuki', '@Tom'];
// [name, start day, end day or null, activity, branches]
const TREE = [
  ['AI Sandbox', 0, null, .5, [['GPU Procurement', 3, 40, .5, []], ['Environment Setup', 30, null, .45, [['Driver Compatibility', 52, 95, .4, []], ['Image Registry', 100, null, .35, []]]], ['Model Evaluation', 70, null, .5, []]]],
  ['CMS Sync', 20, null, .45, [['API Integration', 24, null, .45, []], ['Data Migration', 35, 88, .5, []], ['Launch Acceptance', 120, null, .5, []]]],
  ['Website Redesign', 45, null, .4, [['Visual Design', 48, 110, .45, []], ['Frontend Build', 90, null, .5, []]]],
  ['Hiring', 10, null, .25, [['Backend Role', 12, null, .3, []], ['Designer Role', 15, 75, .3, []]]],
  ['Q3 Retrospective', 5, 60, .35, [['Data Cleanup', 8, 30, .5, []]]],
  ['Reading Notes', 30, null, .12, []],
  ['Other Ideas', 60, null, .05, []]
];
const EVENTS = ['#meeting Aligned on this week\'s goals with {p}', '#call {p} confirmed the schedule, two days later than expected', 'Got feedback from {p}, the plan needs adjusting', 'Finished the first draft and sent it to {p} for review', '#decision Going with option B because it is cheaper to maintain', 'Tracked down a blocker, root cause was a config mismatch', '#meeting Weekly sync: on track, one risk', 'Walked through the requirements list with {p} and {q}', '#note The bottleneck right now is the approval process', 'Vendor sent a quote, 8% over budget', 'Review passed, moving on to the next phase', '#call Spoke with {p}, they would like delivery sooner', 'Tidied up the docs and filed them on the shared drive', 'Found a missing dependency and added it', '#demo Showed the current build to {p}, positive reaction', '#mail Sent {p} a progress update'];
const TODOS = ['Set up a meeting with {p} to confirm details', 'Write this week\'s progress report', 'Update the schedule', 'Reply to {p}\'s email', 'Prepare the review materials', 'Fill in the missing test cases', 'Follow up on the contract terms', 'Write a one-page comparison of the options'];
const WAITS = ['Waiting for {p} to confirm', 'Waiting for finance approval', 'Waiting for the vendor\'s delivery date', 'Waiting for data from {p}', 'Waiting for legal to review the contract'];
const INBOX = ['Idea: generate the weekly report automatically #idea', 'Call {p} back', 'Book a meeting room for next Wednesday', 'File last month\'s travel expenses', 'Read the article {p} recommended #read', 'Renew the software licence', '#idea Turn the recurring checklist into a template'];
const fill = (s) => { const p = pick(PEOPLE); let q = pick(PEOPLE); while (q === p) q = pick(PEOPLE); return s.replace('{p}', p).replace('{q}', q); };
const lines = {}, add = (n, l) => (lines[n] = lines[n] || []).push(l), closed = [];
function task(n, end, ind) {
  const wait = chance(.35), text = fill(pick(wait ? WAITS : TODOS)), limit = end == null ? DAYS : end, doneAt = n + 1 + Math.floor(rnd() * 12);
  // 已结束的项目里任务必须全部关闭；进行中的项目留下最近的和少数陈旧的
  if (doneAt <= limit && (end != null || n < DAYS - 12 ? !chance(.06) : chance(.4))) return `${ind}- [DONE:${day(Math.min(doneAt, limit))}] ${text}`;
  if (end != null) return `${ind}- [DONE:${day(limit)}] ${text}`;
  return `${ind}- [${wait ? 'WAIT' : 'TODO'}:${day(n)}] ${text}`;
}
// 项目表按 150 天写的；天数不同时按比例缩放，保证所有项目都落在范围内
const sc = (n) => (n == null ? null : Math.min(DAYS, Math.round(n * DAYS / 150)));
function walk(node, parent) {
  const name = node[0], start = sc(node[1]), end = sc(node[2]), act = node[3], kids = node[4];
  if (parent) { add(start, `- [[PJ/${parent}]]`); add(start, `  - [[PJ/${name}]] Branch created.`); add(start, `    - ${fill(pick(EVENTS))}`); }
  else { add(start, `- [[PJ/${name}]] Project created.`); add(start, `  - ${fill('Kickoff: agreed scope and goals with {p}')}`); }
  if (end != null) closed.push([name, day(end)]);
  for (let n = start + 1; n <= (end == null ? DAYS : end); n++) {
    const d = dow(n);
    if ((d === 0 || d === 6) && !chance(.08)) continue;
    if (!chance(act)) continue;
    add(n, `- [[PJ/${name}]]`);
    for (let i = 0, k = 1 + Math.floor(rnd() * 3); i < k; i++) {
      if (chance(.3)) { add(n, task(n, end, '  ')); continue; }
      add(n, `  - ${fill(pick(EVENTS))}`);
      if (chance(.15)) add(n, '    | Details are in the meeting notes; we will proceed on this basis.');
      if (chance(.2)) add(n, task(n, end, '    '));
      else if (chance(.12)) add(n, `    - ${fill(pick(EVENTS))}`);
    }
  }
  for (const k of kids) walk(k, name);
}
for (const t of TREE) walk(t, null);
for (let n = 0; n <= DAYS; n++) if (chance(.3)) { const t = fill(pick(INBOX)); add(n, chance(.5) ? `- ${t}` : n < DAYS - 20 && !chance(.1) ? `- [DONE:${day(Math.min(DAYS, n + 2))}] ${t}` : `- [TODO:${day(n)}] ${t}`); }

const S = C.newState();
for (const n in lines) C.loadPage(S, day(+n), lines[n].join('\n') + '\n', END);
C.settle(S, END);
const P = C.projects(S), byName = {}; for (const id in P) byName[P[id].name] = id;
for (const [name, date] of closed) C.index(S).byId[byName[name]].life = date;
C.bump(S); C.settle(S, END);
fs.mkdirSync(out, { recursive: true });
let files = 0, recs = 0;
for (const date of Object.keys(S.pages).sort()) { C.ensureIds(S, END, date); fs.writeFileSync(path.join(out, date + '.md'), C.serializePage(S, date)); files++; }
C.eachBlock(S, () => recs++);
const st = C.stats(S, END);
console.log(`${files} files, ${recs} records, ${Object.keys(P).length} projects, ${st.open.length} open, ${S.diags.length} issues -> ${out}`);
