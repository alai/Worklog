const c = require('../src/core.js'); const assert = require('assert');
const T = '2026-11-21';
const f13 = `<!-- worklog-schema: 0.3 -->
# Journal 2026-11-13

- 2026-11-13 [[PJ/AI-Sandbox]] Project created. ((k3Vw9xQ_2a))
  - 2026-11-13 #meeting with @Mandy 讨论 GPU 配置 ((Zp4mT8cL-e)) ^pj((k3Vw9xQ_2a)) ^pr((k3Vw9xQ_2a))
    | 决定调整硬件方案。
    |
    | InfoSec 可能需要重新评估方案。
    - 2026-11-13 [WAIT:2026-11-13] #email @Frank 已发送新配置要求 ((h7Rb2NqY5s)) ^pj((k3Vw9xQ_2a)) ^pr((Zp4mT8cL-e))
    - 2026-11-13 [TODO:2026-11-13] 约 @Jesson 和 @Steve 开会 ((u9DfX1aGm6)) ^pj((k3Vw9xQ_2a)) ^pr((Zp4mT8cL-e))
    - 2026-11-13 [[PJ/AI-Sandbox InfoSec Approval]] Branch created. ((B5tJc0WzKr)) ^pj((k3Vw9xQ_2a)) ^pr((Zp4mT8cL-e))
      - 2026-11-13 [TODO:2026-11-13] 联系 InfoSec ((nE8yP3vH_d)) ^pj((B5tJc0WzKr)) ^pr((B5tJc0WzKr))
    - 2026-11-13 [[PJ/CMS 同步|Jt3LqA7xVf]] ((Hd6uK2mWq9)) ^pj((Jt3LqA7xVf)) ^pr((Zp4mT8cL-e))
      - 2026-11-13 [TODO:2026-11-13] 检查 CMS 同步是否受影响 ((Wd1ZnC5hS8)) ^pj((Jt3LqA7xVf)) ^pr((Zp4mT8cL-e))
- 2026-11-13 [WAIT:2026-11-13] 等待另一件独立事项的反馈 ((Qa6LsM4oT1)) ^pj(INBOX)
`;
const f10 = `<!-- worklog-schema: 0.3 -->\n# Journal 2026-11-10\n\n- 2026-11-10 [[PJ/CMS 同步]] Project created. ((Jt3LqA7xVf))\n`;
const f19 = `<!-- worklog-schema: 0.3 -->
# Journal 2026-11-19

- 2026-11-19 [[PJ/AI-Sandbox InfoSec Approval|B5tJc0WzKr]] ((Rk7pV3nXa2)) ^pj((B5tJc0WzKr))
  - 2026-11-19 #email 收到 InfoSec 反馈，涉及 [[PJ/AI-Sandbox|k3Vw9xQ_2a]] 的硬件方案 ((x2GkU7rFb9)) ^pj((B5tJc0WzKr)) ^pr((nE8yP3vH_d))
`;
function load(files){ const S=c.newState(); const r={}; for(const [d,t] of Object.entries(files)) r[d]=c.loadPage(S,d,t,T); c.settle(S,T); return {S,r}; }
// 1. canonical round trip, byte-identical, no rewrite needed, no diags
let {S,r} = load({'2026-11-10':f10,'2026-11-13':f13,'2026-11-19':f19});
assert.strictEqual(c.serializePage(S,'2026-11-13'), f13); assert.strictEqual(c.serializePage(S,'2026-11-19'), f19); assert.strictEqual(c.serializePage(S,'2026-11-10'), f10);
assert(!r['2026-11-13'].needsWrite && !r['2026-11-19'].needsWrite); assert.deepStrictEqual(S.diags, []);
// 2. index: projects, tags, refs
const ix=c.index(S); assert.strictEqual(Object.keys(ix.P).length,3); assert.strictEqual(ix.P.B5tJc0WzKr.parent,'k3Vw9xQ_2a');
assert.deepStrictEqual(c.recordsByTag(S,'@Frank').map(b=>b.id),['h7Rb2NqY5s']); assert.strictEqual(c.recordsByTag(S,'#email').length,2);
assert(c.referenced(S,'nE8yP3vH_d')); assert(!c.referenced(S,'u9DfX1aGm6'));
// 3. handwritten lines (spec 17.3) + stray + unresolved name + CRLF + tabs
({S,r} = load({'2026-11-10':f10,'2026-11-13':f13,'2026-11-21':'- [[PJ/AI-Sandbox]]\r\n\t- 确认交期 [WAIT]\r\n\t\t- 问 Frank 要书面报价 [TODO]\r\n\t\t  第二行说明\r\n- 回电话给 Mandy [TODO]\r\n随手写的一行\r\n- [[PJ/AI Sandbx]]\r\n  - 催一下采购 [TODO]\r\n- [[PJ/新项目]] Project created.\r\n  - 第一条\r\n'}));
assert(r['2026-11-21'].needsWrite);
const out=c.serializePage(S,'2026-11-21').split('\n'); console.log(out.join('\n'));
const R=(re,l)=>assert(re.test(l),l);
R(/^- 2026-11-21 \[\[PJ\/AI-Sandbox\|k3Vw9xQ_2a\]\] \(\(.{10}\)\) \^pj\(\(k3Vw9xQ_2a\)\)$/,out[3]);
R(/^  - 2026-11-21 \[WAIT:2026-11-21\] 确认交期 \(\(.{10}\)\) \^pj\(\(k3Vw9xQ_2a\)\)$/,out[4]);
R(/^    - 2026-11-21 \[TODO:2026-11-21\] 问 Frank 要书面报价 \(\(.{10}\)\) \^pj\(\(k3Vw9xQ_2a\)\) \^pr\(\(.{10}\)\)$/,out[5]);
assert.strictEqual(out[6],'      | 第二行说明');
R(/^- 2026-11-21 \[TODO:2026-11-21\] 回电话给 Mandy \(\(.{10}\)\) \^pj\(INBOX\)$/,out[7]);
assert.strictEqual(out[8],'随手写的一行');
R(/^- 2026-11-21 \[\[PJ\/AI Sandbx\]\] \(\(.{10}\)\) \^pj\(INBOX\)$/,out[9]);
R(/^  - 2026-11-21 \[TODO:2026-11-21\] 催一下采购 \(\(.{10}\)\) \^pj\(INBOX\) \^pr\(\(.{10}\)\)$/,out[10]);
R(/^- 2026-11-21 \[\[PJ\/新项目\]\] Project created\. \(\(.{10}\)\)$/,out[11]);
R(/^  - 2026-11-21 第一条 \(\(.{10}\)\) \^pj\(\((.{10})\)\) \^pr\(\(\1\)\)$/,out[12]);
assert(S.diags.some(d=>d.msg.includes('Unrecognized line')));
// idempotent: reparse the normalized text -> identical, no write needed
const norm=c.serializePage(S,'2026-11-21'); const S2=c.newState(); c.loadPage(S2,'2026-11-10',f10,T); c.loadPage(S2,'2026-11-13',f13,T); const r2=c.loadPage(S2,'2026-11-21',norm,T); c.settle(S2,T);
assert.strictEqual(c.serializePage(S2,'2026-11-21'),norm); assert(!r2.needsWrite);
// 4. conflict: stored ^pj differs from indentation -> kept until resolved
const conf=f13.replace('联系 InfoSec ((nE8yP3vH_d)) ^pj((B5tJc0WzKr))','联系 InfoSec ((nE8yP3vH_d)) ^pj((Jt3LqA7xVf))');
({S}=load({'2026-11-10':f10,'2026-11-13':conf}));
assert(S.diags.some(d=>d.msg.includes('Ownership conflict'))); assert.strictEqual(c.serializePage(S,'2026-11-13'),conf);
let b=c.index(S).byId.nE8yP3vH_d; c.resolveConflict(S,b.key,false); assert.strictEqual(c.serializePage(S,'2026-11-13'),f13);
({S}=load({'2026-11-10':f10,'2026-11-13':conf})); b=c.index(S).byId.nE8yP3vH_d; c.resolveConflict(S,b.key,true); c.ensureIds(S,T,'2026-11-13');
const o2=c.serializePage(S,'2026-11-13').split('\n'); R(/^      - 2026-11-13 \[\[PJ\/CMS 同步\|Jt3LqA7xVf\]\] \(\(.{10}\)\) \^pj\(\(Jt3LqA7xVf\)\) \^pr\(\(B5tJc0WzKr\)\)$/,o2[11]); R(/^        - .*联系 InfoSec \(\(nE8yP3vH_d\)\) \^pj\(\(Jt3LqA7xVf\)\) \^pr\(\(B5tJc0WzKr\)\)$/,o2[12]);
// 5. diagnostics: duplicate id, bad line kept raw with children, wrong ^pr fixed, dangling parent, future schema
({S,r}=load({'2026-11-13':f13+'- 2026-11-13 重复 ((Qa6LsM4oT1)) ^pj(INBOX)\n- 2026-13-45 坏日期 ((AAAAAAAAAA)) ^pj(INBOX)\n  - 2026-11-13 坏行的子项 ((BBBBBBBBBB)) ^pj(INBOX) ^pr((AAAAAAAAAA))\n- 2026-11-13 悬空 ((CCCCCCCCCC)) ^pj(INBOX) ^pr((ZZZZZZZZZZ))\n','2026-11-10':f10,'2026-11-30':'<!-- worklog-schema: 9.0 -->\n- x\n'}));
const msgs=S.diags.map(d=>d.level+':'+d.msg).join('\n'); console.log(msgs);
for (const w of ['Duplicate record ID','no valid date','could not be parsed','a record that does not exist','newer than this app supports']) assert(msgs.includes(w),w);
const s5=c.serializePage(S,'2026-11-13'); assert(s5.includes('- 2026-13-45 坏日期 ((AAAAAAAAAA)) ^pj(INBOX)\n  - 2026-11-13 坏行的子项 ((BBBBBBBBBB)) ^pj(INBOX) ^pr((AAAAAAAAAA))\n'));
// 6. ops still work on parsed state
({S}=load({'2026-11-10':f10,'2026-11-13':f13})); const page=S.pages['2026-11-13'], inbox=page[1];
c.indent(S,inbox.key); c.ensureIds(S,T,'2026-11-13'); assert(c.serializePage(S,'2026-11-13').includes('  - 2026-11-13 [WAIT:2026-11-13] 等待另一件独立事项的反馈 ((Qa6LsM4oT1)) ^pj((k3Vw9xQ_2a)) ^pr((k3Vw9xQ_2a))'));
c.outdent(S,inbox.key); assert.strictEqual(c.serializePage(S,'2026-11-13'),f13);
const nb=c.newAfter(S,inbox.key); nb.text='[[cms 同步]]'; c.commitBlock(S,nb,T); assert.strictEqual(nb.type,'head');
assert(!c.deleteBlock(S,page[0].key,T).ok); assert(c.deleteBlock(S,nb.key,T).ok);
// 7. performance: 2000 files x 20 records
const big=c.newState(); const t0=performance.now(); let n=0;
for(let i=0;i<2000;i++){ const d=new Date(2021,0,1+i); const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; let t=`<!-- worklog-schema: 0.3 -->\n# Journal ${ds}\n\n`;
  for(let j=0;j<20;j++){ const id=(i.toString(36).padStart(4,'0')+j.toString(36).padStart(2,'0')+'xxxx').slice(0,10); t+=`${j%4?'  ':''}- ${ds} ${j%3?'':'[TODO:'+ds+'] '}#meeting with @Mandy 第 ${j} 条记录的正文内容 ((${id})) ^pj(INBOX)${j%4?' ^pr(('+(i.toString(36).padStart(4,'0')+(j-j%4).toString(36).padStart(2,'0')+'xxxx').slice(0,10)+'))':''}\n`; n++; }
  c.loadPage(big,ds,t,T); }
const t1=performance.now(); c.settle(big,T); const t2=performance.now(); c.index(big); const t3=performance.now(); const hits=c.recordsByTag(big,'@Mandy').length; const t4=performance.now();
let ser=0; const t5=performance.now(); for(const d of Object.keys(big.pages).slice(0,200)) ser+=c.serializePage(big,d).length; const t6=performance.now();
console.log(`PERF ${n} records / 2000 files: parse ${Math.round(t1-t0)}ms, settle ${Math.round(t2-t1)}ms, index ${Math.round(t3-t2)}ms, tag lookup ${hits} hits ${(t4-t3).toFixed(2)}ms, serialize 1 page ${((t6-t5)/200).toFixed(3)}ms, diags ${big.diags.length}`);
assert.strictEqual(big.diags.length,0);
console.log('ALL OK');
// 8. stats and lifecycle
{
  const {S} = load({'2026-11-10':f10,'2026-11-13':f13,'2026-11-19':f19});
  let st=c.stats(S,T); const A=st.N.k3Vw9xQ_2a, B=st.N.B5tJc0WzKr, C=st.N.Jt3LqA7xVf;
  assert.deepStrictEqual([A.todo,A.wait,A.events.length,A.subTodo,A.subWait,A.status,A.days],[1,1,1,2,1,'ongoing',9]);
  assert.deepStrictEqual([B.todo,B.events.length,B.status,B.days],[1,1,'ongoing',9]);
  assert.deepStrictEqual([C.todo,C.status,C.days],[1,'ongoing',12]);
  assert.strictEqual(st.open.length,5); assert.strictEqual(st.inbox.length,1); assert.deepStrictEqual(st.tops,['Jt3LqA7xVf','k3Vw9xQ_2a']);
  assert(!c.setLife(S,'B5tJc0WzKr',T).ok);
  const todo=c.index(S).byId.nE8yP3vH_d; todo.status='DONE'; c.bump(S);
  let r=c.setLife(S,'B5tJc0WzKr',T); assert(r.ok && r.page==='2026-11-13');
  assert(c.serializePage(S,'2026-11-13').includes('[[PJ/AI-Sandbox InfoSec Approval]] Branch created. [COMPLETED:2026-11-21] ((B5tJc0WzKr))'));
  st=c.stats(S,T); assert.strictEqual(st.N.B5tJc0WzKr.status,'completed'); assert(st.N.B5tJc0WzKr.closed);
  assert(c.setLife(S,'B5tJc0WzKr',T).ok); assert.strictEqual(c.stats(S,T).N.B5tJc0WzKr.status,'ready');
  console.log('stats OK');
}
{ // 带点号的人名
  const C = require('../src/core.js'), S = C.newState(), T = '2026-11-15';
  C.loadPage(S, T, '- 和 @John.Smith 开会，然后找 @Mandy. 还有 @{Li Wei} 和 a@b.com\n', T); C.settle(S, T); C.ensureIds(S, T, T);
  const ix = C.index(S), keys = [...ix.tags.keys()].sort().join(',');
  if (keys !== '@John.Smith,@Li Wei,@Mandy') throw new Error('dot tags: ' + keys);
  const text = C.serializePage(S, T), S2 = C.newState(); C.loadPage(S2, T, text, T); C.settle(S2, T);
  if (C.serializePage(S2, T) !== text || S2.diags.length) throw new Error('dot round-trip');
  console.log('dot names OK');
}
{ // 工作区定位：选外层文件夹或直接选 data，结果一致
  const vm = require('vm'), fs = require('fs'), ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(__dirname + '/../src/fs.js', 'utf8') + ';this.FS = FS;', ctx);
  const dir = (name, kids = {}) => ({ kind: 'directory', name, kids,
    async getDirectoryHandle(n, o) { if (kids[n] && kids[n].kind === 'directory') return kids[n]; if (o && o.create) return (kids[n] = dir(n)); const e = new Error('nf'); e.name = 'NotFoundError'; throw e; },
    async *entries() { for (const k in kids) yield [k, kids[k]]; } });
  const file = (name) => ({ kind: 'file', name, async getFile() { return { lastModified: 1, size: 1, text: async () => '' }; } });
  (async () => {
    const run = async (d) => { ctx.FS.dir = d; const pairs = await ctx.FS.loadAll(); return ctx.FS.where + ':' + pairs.length; };
    const inner = dir('data', { '2026-01-01.md': file('2026-01-01.md') });
    const got = [
      await run(dir('Worklog', { data: inner })),                                   // 外层，已有 data
      await run(inner),                                                              // 直接选了 data
      await run(dir('notes', { '2026-01-02.md': file('2026-01-02.md'), 'x.txt': file('x.txt') })),   // 里面直接是日期文件
      await run(dir('data', { data: dir('data', { '2026-01-03.md': file('2026-01-03.md') }) })),     // 旧的 data/data 仍然照旧
    ];
    const fresh = dir('Empty'); got.push(await run(fresh), String(!!fresh.kids.data));
    const want = 'Worklog/data:1,data:1,notes:1,data/data:1,Empty/data:0,true';
    if (got.join(',') !== want) throw new Error('locate: ' + got.join(','));
    console.log('workspace locate OK');
  })().catch((e) => { console.error(e); process.exit(1); });
}
{ // 删除项目标题块：删的是这一行，不是项目
  const C = require('../src/core.js'), T = '2026-11-16', S = C.newState();
  C.loadPage(S, T, '- [[PJ/One]] Project created.\n  - a\n- [[PJ/Two]] Project created.\n  - c\n  - [[PJ/One]]\n    - d\n    - e\n', T); C.settle(S, T); C.ensureIds(S, T, T);
  const P = C.projects(S), id = (n) => Object.keys(P).find((k) => P[k].name === n), blocks = () => { const o = []; C.eachBlock(S, (b) => o.push(b)); return o; };
  const head = blocks().find((b) => b.type === 'head');
  // 标题下自动给的空占位行不算子块
  const ph = C.newAfter(S, head.children[1].key); if (C.hasContent(ph) || ph.id) throw new Error('placeholder');
  const r = C.deleteBlock(S, head.key, T);
  if (!r.ok || !/2 records moved up/.test(r.msg)) throw new Error('head delete: ' + JSON.stringify(r));
  C.settle(S, T); C.ensureIds(S, T, T);
  const ix = C.index(S), d = blocks().find((b) => b.text === 'd'), e = blocks().find((b) => b.text === 'e');
  if (blocks().some((b) => b.type === 'head') || d.own !== id('Two') || e.own !== id('Two')) throw new Error('records should now belong to Two');
  if (!P[id('One')] || blocks().find((b) => b.text === 'a').own !== id('One')) throw new Error('project One must be untouched');
  if (blocks().some((b) => b.type === 'ord' && !C.hasContent(b))) throw new Error('placeholder should be gone');
  const text = C.serializePage(S, T), S2 = C.newState(); C.loadPage(S2, T, text, T); C.settle(S2, T);
  if (S2.diags.length || C.serializePage(S2, T) !== text) throw new Error('round-trip after head delete: ' + JSON.stringify(S2.diags));
  // 声明块：只有空占位行时可以删，有真实记录时拒绝
  const two = ix.byId[id('Two')]; if (C.deleteBlock(S, two.key, T).ok) throw new Error('decl with records must refuse');
  const S3 = C.newState(); C.loadPage(S3, T, '- [[PJ/Solo]] Project created.\n', T); C.settle(S3, T); C.ensureIds(S3, T, T);
  const solo = S3.pages[T][0]; C.newAfter(S3, solo.key);
  console.log('heading delete OK');
}
{ // 同一条记录里重复出现的标签只算一次
  const C = require('../src/core.js'), S = C.newState(), T = '2026-11-20';
  C.loadPage(S, T, '- #call @Mandy asked @Mandy to call back, #call again\n- one @Mandy only\n- @{Li Wei} and @{Li Wei}\n', T); C.settle(S, T); C.ensureIds(S, T, T);
  const n = (t) => C.recordsByTag(S, t).length, got = [n('@Mandy'), n('#call'), n('@Li Wei')].join(',');
  if (got !== '2,1,1') throw new Error('duplicate tag hits: ' + got);
  console.log('tag dedupe OK');
}
{ // block 引用：手写行末尾的 ((ID)) 是引用不是自己的 ID；反向链接索引；被引用的记录删除时变为软删除
  const C = require('../src/core.js'), S = C.newState(), T1 = '2026-11-17', T2 = '2026-11-23';
  C.loadPage(S, T1, '- 需要进一步确认方案 ABC 的可能性\n- 另一条\n', T1); C.settle(S, T1); C.ensureIds(S, T2, T1);
  const orig = S.pages[T1][0], oid = orig.id;
  C.loadPage(S, T2, `- ((${oid}))\n- see ((${oid}))\n- 2026-11-23 ((${oid})) -> #meeting 决定放弃 ((ABCDEFGHI1)) ^pj(INBOX)\n`, T2); C.settle(S, T2); C.ensureIds(S, T2, T2);
  const p2 = S.pages[T2], ids = new Set(p2.map((b) => b.id));
  if (p2.length !== 3 || ids.size !== 3 || ids.has(oid)) throw new Error('reference mistaken for own id: ' + p2.map((b) => b.id + ':' + b.text).join(' | '));
  if (p2[0].text !== `((${oid}))` || p2[1].text !== `see ((${oid}))`) throw new Error('reference text lost: ' + p2.map((b) => b.text).join(' | '));
  if (S.diags.length) throw new Error('diags: ' + JSON.stringify(S.diags));
  const bl = C.index(S).brefs.get(oid) || [];
  if (bl.length !== 3) throw new Error('backlinks: ' + bl.length);
  const text = C.serializePage(S, T2), S2 = C.newState(); C.loadPage(S2, T1, C.serializePage(S, T1), T2); C.loadPage(S2, T2, text, T2); C.settle(S2, T2);
  if (C.serializePage(S2, T2) !== text || S2.diags.length) throw new Error('round-trip with references');
  const r = C.deleteBlock(S, orig.key, T2); if (!r.ok || !r.soft || !orig.del) throw new Error('referenced record must be soft-deleted: ' + JSON.stringify(r));
  console.log('block refs OK');
}
{ // 项目多久没有新记录：分支里的记录和改状态的日子都算，关闭的项目不算
  const C = require('../src/core.js'), S = C.newState();
  C.loadPage(S, '2026-10-01', '- [[PJ/Alpha]] Project created.\n  - kickoff\n  - [[PJ/Beta]] Branch created.\n    - [DONE:2026-11-10] ship it\n- [[PJ/Gamma]] Project created.\n  - note\n', '2026-10-01');
  C.settle(S, '2026-10-01'); C.ensureIds(S, '2026-10-01', '2026-10-01');
  const st = C.stats(S, '2026-11-23'), by = (n) => Object.values(st.N).find((p) => p.name === n);
  const got = ['Alpha', 'Beta', 'Gamma'].map((n) => by(n).quiet + '@' + by(n).subLast).join(',');
  if (got !== '13@2026-11-10,13@2026-11-10,53@2026-10-01') throw new Error('quiet days: ' + got);
  console.log('project quiet OK');
}
{ // 行内代码：里面的 @ # (( [[ 都是文字，不进索引，也不被改写
  const C = require('../src/core.js'), S = C.newState(), T = '2026-11-23';
  C.loadPage(S, T, '- [[PJ/Alpha]] Project created.\n- target\n', T); C.settle(S, T); C.ensureIds(S, T, T);
  const tid = S.pages[T][1].id;
  C.loadPage(S, '2026-11-24', `- run \`git log @Tom #x ((${tid})) [[Alpha]]\` with @Mandy #real\n- odd \` @Kevin\n`, T); C.settle(S, '2026-11-24'); C.ensureIds(S, '2026-11-24', '2026-11-24');
  const ix = C.index(S), t = (x) => (ix.tags.get(x) || []).length;
  const got = [t('@Tom'), t('#x'), t('@Mandy'), t('#real'), t('@Kevin'), (ix.brefs.get(tid) || []).length, S.pages['2026-11-24'][0].text.includes('`git log @Tom #x ((' + tid + ')) [[Alpha]]`')].join(',');
  if (got !== '0,0,1,1,1,0,true') throw new Error('inline code: ' + got);
  if (C.inCode('a `b') !== true || C.inCode('a `b` c') !== false || C.inCode('x `y`\nz') !== false) throw new Error('inCode');
  console.log('inline code OK');
}
{ // 拖动：放到同一层某条前面，或放到最后；放回原位不算改动
  const C = require('../src/core.js'), S = C.newState(), T = '2026-11-24';
  C.loadPage(S, T, '- a\n- b\n- c\n', T);
  const L = () => S.pages[T].map((b) => b.text).join(''), k = (t) => S.pages[T].find((b) => b.text === t).key;
  const r = [C.moveBefore(S, k('c'), k('a')), L(), C.moveBefore(S, k('c'), null), L(), C.moveBefore(S, k('a'), k('b')), C.moveBefore(S, k('c'), null), L()].join(',');
  if (r !== 'true,cab,true,abc,false,false,abc') throw new Error('moveBefore: ' + r);
  console.log('moveBefore OK');
}
{ // 行内代码：处理代码段以外的文字时如果又用到同一个正则（比如引文里也有代码），不能让外层重复输出代码段
  const C = require('../src/core.js');
  const r = C.outsideCode('a `x` b `y` c', (p) => { C.maskCode('q `z`'); C.outsideCode('m `n`', (x) => x); return p; }, (c) => '[' + c + ']');
  if (r !== 'a [`x`] b [`y`] c') throw new Error('outsideCode nested: ' + r);
  console.log('inline code nested OK');
}
{ // 只改文字时就地更新的索引，必须和整体重建的结果完全一样
  const C = require('../src/core.js'), S = C.newState(), T = '2026-11-24';
  C.loadPage(S, T, '- a #x @Tom\n- b ((zzzzzzzzzz))\n- c\n', T); C.settle(S, T); C.ensureIds(S, T, T);
  const [a, b, c] = S.pages[T];
  const snap = (ix) => JSON.stringify({ tags: [...ix.tags].map(([k, v]) => [k, [...v].sort()]).sort(), refs: [...ix.refs].map(([k, v]) => [k, [...v].sort()]).sort(), brefs: [...ix.brefs].map(([k, v]) => [k, v.map((x) => x.key).sort()]).sort() });
  C.index(S);
  const edits = [[a, 'a #y @Tom @Ann'], [b, 'b ((' + a.id + ')) #x'], [c, 'c ((' + a.id + ')) `#nope` #x'], [a, 'a plain'], [b, 'b']];
  for (const [blk, t] of edits) {
    const before = C.index(S); blk.text = t; C.retext(S, blk); const patched = C.index(S);
    if (patched !== before) throw new Error('retext rebuilt instead of patching');
    const got = snap(patched); C.bump(S); const full = snap(C.index(S));
    if (got !== full) throw new Error('retext mismatch after "' + t + '": ' + got + ' vs ' + full);
  }
  const st0 = C.stats(S, T); C.move(S, c.key, -1); if (C.stats(S, T) !== st0) throw new Error('reorder rebuilt stats');
  if (S.pages[T].map((x) => x.text[0]).join('') !== 'acb') throw new Error('move order');
  console.log('incremental index OK');
}
