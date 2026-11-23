// Worklog 内核：模型、解析、正规化、序列化、块操作、内存索引。无依赖，可在 Node 中测试。
const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const ID_RE = '[A-Za-z0-9_-]{10}';
const DATE_RE = '\\d{4}-\\d{2}-\\d{2}';
const SCHEMA = '0.3';
let keySeq = 0;

function randomId() {
  const a = new Uint8Array(10);
  crypto.getRandomValues(a);
  let s = '';
  for (let i = 0; i < 10; i++) s += ID_CHARS[a[i] & 63];
  return s;
}

// type: ord 普通记录 | proj 项目声明 | branch 分支声明 | head 项目标题块 | raw 无法识别的行（原样保留）
function mk(props) {
  return Object.assign({
    key: 'b' + (++keySeq), id: null, type: 'ord', date: null, status: null, statusDate: null,
    text: '', owner: null, proj: null, extParent: null, del: null, life: null, children: []
  }, props);
}

function newState() { return { pages: {}, ids: new Set(), ver: 0, pdiags: {}, diags: [] }; }
function bump(S) { S.ver++; }

function walk(list, fn, parent = null, depth = 0) {
  for (const b of list.slice()) { fn(b, parent, depth, list); walk(b.children, fn, b, depth + 1); }
}
function eachBlock(S, fn) { for (const d in S.pages) walk(S.pages[d], (b, parent) => fn(b, parent, d)); }

function find(S, key) {
  let hit = null;
  const search = (list, parent, page) => {
    for (let i = 0; i < list.length && !hit; i++) {
      if (list[i].key === key) { hit = { b: list[i], parent, list, index: i, page }; return; }
      search(list[i].children, list[i], page);
    }
  };
  for (const d in S.pages) { if (hit) break; search(S.pages[d], null, d); }
  return hit;
}

function flat(S, page) { const out = []; walk(S.pages[page] || [], (b) => out.push(b)); return out; }
function hasContent(b) { return b.type === 'head' || b.type === 'raw' || b.text.trim() !== ''; }
function newId(S) { let id; do { id = randomId(); } while (S.ids.has(id)); S.ids.add(id); return id; }
function validDate(s) {
  const [y, m, d] = s.split('-').map(Number), t = new Date(y, m - 1, d);
  return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d;
}

// ---- 内存索引：按版本号缓存，结构变化后首次使用时重建 ----
const TAG_RE = /(?<![A-Za-z0-9\\])([@#])(?:\{([^}\n]+)\}|([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*))/g;   // 名字中间允许点号：@Firstname.Lastname；句末的点不算
const REC_RE = new RegExp(`\\(\\((${ID_RE})\\)\\)`, 'g');   // 正文里对别的记录的引用
const REF_RE = new RegExp(`\\[\\[PJ\\/[^\\]|\\[]+\\|(${ID_RE})\\]\\]|\\(\\((${ID_RE})\\)\\)`, 'g');
let cache = { S: null, ver: -1 };
function index(S) {
  if (cache.S === S && cache.ver === S.ver) return cache;
  const P = {}, byId = {}, tags = new Map(), refs = new Map(), byProj = new Map(), brefs = new Map();   // brefs：被 ((ID)) 引用的记录 → 引用它的记录
  const add = (map, k, v) => { let a = map.get(k); if (!a) map.set(k, a = []); a.push(v); };
  const go = (list, ctx, page) => {
    for (const b of list) {
      b.page = page;
      if (b.type === 'raw') { go(b.children, ctx, page); continue; }
      if (b.id) byId[b.id] = b;
      if (b.type === 'proj' || b.type === 'branch') { if (b.id) P[b.id] = { id: b.id, name: b.text, type: b.type, parent: b.owner, life: b.life, date: b.date }; }
      else if (b.type === 'ord') {
        b.own = ctx;   // 推导出的归属，随索引一起刷新
        // 反向链接不依赖引用方有没有 ID：刚写下、还没保存的记录也要立刻算上
        if (b.text.indexOf('((') >= 0) {
          const seen = new Set(); let r;
          REC_RE.lastIndex = 0;
          while ((r = REC_RE.exec(b.text))) if (r[1] !== b.id && !seen.has(r[1])) { seen.add(r[1]); add(brefs, r[1], b); }
        }
        if (b.id) {
          add(byProj, ctx, b);
          // 同一条记录里同一个标签或引用出现几次都只登记一次，否则标签页会把这条记录列出好几遍
          let m; const seenTags = new Set(), seenRefs = new Set();
          TAG_RE.lastIndex = 0;
          while ((m = TAG_RE.exec(b.text))) seenTags.add(m[1] + (m[2] || m[3]));
          REF_RE.lastIndex = 0;
          while ((m = REF_RE.exec(b.text))) seenRefs.add(m[1] || m[2]);
          if (b.extParent) seenRefs.add(b.extParent);
          for (const t of seenTags) add(tags, t, b.id);
          for (const r of seenRefs) add(refs, r, b.id);
        }
      }
      go(b.children, childCtx(b, ctx), page);
    }
  };
  for (const d in S.pages) go(S.pages[d], 'INBOX', d);
  return (cache = { S, ver: S.ver, P, byId, tags, refs, byProj, brefs });
}
function projects(S) { return index(S).P; }
function recordsByTag(S, tag) { const ix = index(S); return (ix.tags.get(tag) || []).map((id) => ix.byId[id]); }
function referenced(S, id) { return !!id && (index(S).refs.get(id) || []).some((x) => x !== id); }

function projectPath(P, id) {
  const parts = []; let cur = P[id], guard = 0;
  while (cur && guard++ < 20) { parts.unshift(cur.name); cur = cur.type === 'branch' ? P[cur.parent] : null; }
  return parts.join(' / ');
}
function normName(s) { return s.normalize('NFC').trim().replace(/\s+/g, ' ').replace(/[A-Z]/g, (c) => c.toLowerCase()); }
function matchProjects(S, name) { const n = normName(name); return Object.values(projects(S)).filter((p) => normName(p.name) === n); }

// 归属由缩进推导：声明块和项目标题块为其下的记录提供项目，普通块沿用上层，顶层为 Inbox
function childCtx(b, ctx) { return b.type === 'head' ? b.proj : (b.type === 'ord' || b.type === 'raw' ? ctx : b.id); }
function ownerAt(S, key) {
  let found = 'INBOX';
  const go = (list, ctx) => { for (const b of list) { if (b.key === key) { found = ctx; return true; } if (go(b.children, childCtx(b, ctx))) return true; } return false; };
  for (const d in S.pages) if (go(S.pages[d], 'INBOX')) break;
  return found;
}

// ---- 正规化 ----
const RE_ST = new RegExp(`^\\[(TODO|WAIT|DONE)(?::(${DATE_RE}))?\\]\\s*`);
const RE_ST_END = new RegExp(`\\s*\\[(TODO|WAIT|DONE)(?::(${DATE_RE}))?\\]$`);
const RE_PURE = new RegExp(`^\\[\\[PJ\\/[^\\]|\\[]+\\|(${ID_RE})\\]\\]$`);

function normalizeRefs(S, text) {
  if (text.indexOf('[[') < 0) return text;
  return text.replace(/\[\[([^\[\]|]+)\]\]/g, (all, inner) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(inner)) return all;
    const hits = matchProjects(S, inner.replace(/^PJ\//, ''));
    return hits.length === 1 ? `[[PJ/${hits[0].name}|${hits[0].id}]]` : all;
  });
}

// 失焦或结构操作前调用：只移动和补全字段，不改写正文
function commitBlock(S, b, today) {
  if (b.type === 'head' || b.type === 'raw') return;
  const before = b.text + '|' + b.status + '|' + b.type;
  if (b.type !== 'ord') b.text = b.text.replace(/[|\[\]\n]/g, '').normalize('NFC').trim();
  else {
    let t = b.text.replace(/^\n+/, '').replace(/\s+$/, '');
    const head = t.match(RE_ST), tail = head ? null : t.match(RE_ST_END);
    if (head) { b.status = head[1]; b.statusDate = head[2] && validDate(head[2]) ? head[2] : today; t = t.slice(head[0].length); }
    else if (tail) { b.status = tail[1]; b.statusDate = tail[2] && validDate(tail[2]) ? tail[2] : today; t = t.slice(0, t.length - tail[0].length); }
    b.text = normalizeRefs(S, t);
    const pure = b.text.match(RE_PURE);
    if (pure && !b.status && projects(S)[pure[1]]) { b.type = 'head'; b.proj = pure[1]; b.text = ''; }
  }
  if (before !== b.text + '|' + b.status + '|' + b.type) bump(S);
}

// 给当前页补 ID 和状态日期；有了非标题的上层记录后不再保留跨文件父记录
function ensureIds(S, today, date) {
  const fix = (list, logical) => {
    for (const b of list) {
      if (b.type === 'raw') { fix(b.children, logical); continue; }
      if (!b.id && hasContent(b)) { b.id = newId(S); bump(S); }
      if (b.status && !b.statusDate) b.statusDate = today;
      if (logical && b.extParent) b.extParent = null;
      fix(b.children, b.type === 'head' ? logical : (b.id && hasContent(b) ? b : logical));
    }
  };
  fix(S.pages[date] || [], null);
}

function serializePage(S, date) {
  const lines = ['<!-- worklog-schema: ' + SCHEMA + ' -->', '# Journal ' + date, ''], P = projects(S);
  // parentId 是逻辑父记录：项目标题块对父子关系透明
  const emit = (list, depth, parentId, ctx) => {
    for (const b of list) {
      if (b.type === 'raw') { lines.push(b.text); emit(b.children, depth + 1, parentId, ctx); continue; }
      if (!hasContent(b) || !b.id) { emit(b.children, depth, parentId, ctx); continue; }
      const ind = '  '.repeat(depth);
      let payload, cont = b.note ? b.note.split('\n') : [], own = ctx;
      if (b.type === 'proj') { payload = `[[PJ/${b.text}]] Project created.` + (b.life ? ` [ARCHIVED:${b.life}]` : ''); own = null; }
      else if (b.type === 'branch') { payload = `[[PJ/${b.text}]] Branch created.` + (b.life ? ` [COMPLETED:${b.life}]` : ''); own = b.owner; }
      else if (b.type === 'head') { payload = `[[PJ/${P[b.proj] ? P[b.proj].name : (b.label || 'unknown')}|${b.proj}]]`; own = b.proj; }
      else {
        const parts = b.text.split('\n');
        payload = (b.status ? `[${b.status}:${b.statusDate}] ` : '') + parts[0];
        cont = parts.slice(1);
        if (b.conflict) own = b.conflict;   // 归属冲突未解决前保留文件里原有的标记
      }
      let line = `${ind}- ${b.date} ${payload} ((${b.id}))`;
      if (own) line += own === 'INBOX' ? ' ^pj(INBOX)' : ` ^pj((${own}))`;
      const pr = parentId || b.extParent;
      if (pr) line += ` ^pr((${pr}))`;
      if (b.del) line += ` ^del(${b.del})`;
      lines.push(line);
      for (const c of cont) lines.push(ind + '  |' + (c ? ' ' + c : ''));
      emit(b.children, depth + 1, b.type === 'head' ? parentId : b.id, childCtx(b, ctx));
    }
  };
  emit(S.pages[date] || [], 0, null, 'INBOX');
  return lines.join('\n') + '\n';
}

// ---- 解析 ----
const RE_TAIL = new RegExp(`^(.*) \\(\\((${ID_RE})\\)\\)((?:\\s+\\^[a-z]+\\(\\S*\\))*)\\s*$`);
const RE_LEAD_DATE = new RegExp(`^(${DATE_RE})\\s+(.*)$`);
const RE_DECL = new RegExp(`^\\[\\[PJ\\/([^\\[\\]|]+)\\]\\] (Project|Branch) created\\.(?: \\[(ARCHIVED|COMPLETED):(${DATE_RE})\\])?$`);
const RE_HEAD = new RegExp(`^\\[\\[PJ\\/([^\\[\\]|]+)\\|(${ID_RE})\\]\\]$`);
const RE_PJ = new RegExp(`^\\^pj\\(\\((${ID_RE})\\)\\)$`);
const RE_PR = new RegExp(`^\\^pr\\(\\((${ID_RE})\\)\\)$`);
const RE_DEL = new RegExp(`^\\^del\\((${DATE_RE})\\)$`);

function parseHeader(S, str, date, today, out, line) {
  const bad = (msg) => { out.diags.push({ line, level: 'error', msg }); return null; };
  const takeStatus = (o, m) => { o.status = m[1]; if (m[2] && validDate(m[2])) o.statusDate = m[2]; else { o.statusDate = today; out.needsWrite = true; } };
  let m = str.match(RE_TAIL);
  // 规范行总以日期开头。没有日期的行是手写的：行尾的 ((ID)) 是正文里对别的记录的引用，不是它自己的 ID
  if (m && !m[3].trim() && !RE_LEAD_DATE.test(m[1])) m = null;
  if (m) {   // 已有 ID 的规范行
    let stored = null, pr = null, del = null, x;
    for (const t of m[3].trim().split(/\s+/)) {
      if (!t) continue;
      if ((x = t.match(RE_PJ))) stored = x[1];
      else if (t === '^pj(INBOX)') stored = 'INBOX';
      else if ((x = t.match(RE_PR))) pr = x[1];
      else if ((x = t.match(RE_DEL)) && validDate(x[1])) del = x[1];
      else return bad('Unrecognized metadata ' + t);
    }
    const d = m[1].match(RE_LEAD_DATE);
    if (!d || !validDate(d[1])) return bad('The record has no valid date');
    const base = { id: m[2], date: d[1], extParent: pr, fresh: true };
    let head = d[2];
    S.ids.add(m[2]);
    if ((x = head.match(RE_DECL))) {
      if (x[2] === 'Project') return mk({ ...base, type: 'proj', text: x[1].trim(), life: x[3] === 'ARCHIVED' ? x[4] : null });
      return mk({ ...base, type: 'branch', text: x[1].trim(), owner: stored && stored !== 'INBOX' ? stored : null, life: x[3] === 'COMPLETED' ? x[4] : null });
    }
    if ((x = head.match(RE_HEAD))) return mk({ ...base, type: 'head', proj: x[2], label: x[1] });
    const o = { ...base, stored, del };
    if ((x = head.match(RE_ST))) { takeStatus(o, x); head = head.slice(x[0].length); }
    if (!head.trim()) return bad('The record has no text');
    o.text = head;
    return mk(o);
  }
  // 没有 ID：待正规化的手写行
  out.needsWrite = true;
  const o = { date, pending: true, fresh: true };
  let rest = str, x = rest.match(RE_LEAD_DATE);
  if (x && validDate(x[1])) { o.date = x[1]; rest = x[2]; }
  if ((x = rest.match(RE_DECL))) return mk({ ...o, type: x[2] === 'Project' ? 'proj' : 'branch', text: x[1].trim() });
  if ((x = rest.match(RE_ST))) { takeStatus(o, x); rest = rest.slice(x[0].length); }
  else if ((x = rest.match(RE_ST_END))) { takeStatus(o, x); rest = rest.slice(0, rest.length - x[0].length); }
  if (!rest.trim()) return bad('The record has no text');
  o.text = rest;
  return mk(o);
}

function parseFile(S, text, date, today) {
  const out = { blocks: [], diags: [], needsWrite: false, unsupported: null };
  const lines = text.replace(/\r/g, '').split('\n');
  let i = 0;
  const v = lines[0] && lines[0].match(/^<!-- worklog-schema: ([\d.]+) -->\s*$/);
  if (v) { if (parseFloat(v[1]) > parseFloat(SCHEMA)) { out.unsupported = v[1]; return out; } i = 1; }
  else if (text.trim()) out.needsWrite = true;
  if (lines[i] && lines[i].startsWith('# ')) i++;
  const stack = [];
  let last = null, lastLevel = -1;
  for (; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    let level = 0, spaces = 0, k = 0;
    for (; k < raw.length; k++) { const c = raw.charCodeAt(k); if (c === 9) level++; else if (c === 32) spaces++; else break; }
    if (level || spaces % 2) out.needsWrite = true;
    level += spaces >> 1;
    const rest = raw.slice(k);
    if (last && level > lastLevel && !rest.startsWith('- ')) {   // 续行
      let piece;
      if (rest === '|') piece = ''; else if (rest.startsWith('| ')) piece = rest.slice(2); else { piece = rest; out.needsWrite = true; }
      if (last.type === 'ord') last.text += '\n' + piece; else last.note = last.note == null ? piece : last.note + '\n' + piece;
      continue;
    }
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    const sibs = stack.length ? stack[stack.length - 1].block.children : out.blocks;
    if (!rest.startsWith('- ')) {
      sibs.push(mk({ type: 'raw', text: raw, date }));
      out.diags.push({ line: i + 1, level: 'warn', msg: 'Unrecognized line, kept as it is' });
      last = null; continue;
    }
    let b = parseHeader(S, rest.slice(2).trim(), date, today, out, i + 1);
    if (!b) { b = mk({ type: 'raw', text: raw, date, err: true }); last = null; } else { last = b; lastLevel = level; }
    sibs.push(b);
    stack.push({ level, block: b });
  }
  return out;
}

// 全部文件解析完后调用：补全手写行、推导关系、生成诊断
function settle(S, today) {
  const diags = [];
  eachBlock(S, (b) => { b.dup = false; if (b.pending && b.type !== 'ord' && !b.id) b.id = newId(S); });
  bump(S);
  eachBlock(S, (b) => { if (b.pending && b.type === 'ord') { b.text = normalizeRefs(S, b.text); const p = b.text.match(RE_PURE); if (p && !b.status) { b.type = 'head'; b.proj = p[1]; b.text = ''; } } });
  const seen = new Map();
  const pass = (list, logical, ctx, date) => {
    for (const b of list) {
      if (b.type === 'raw') { if (b.err) diags.push({ date, key: b.key, level: 'error', msg: 'This record could not be parsed, kept as it is' }); pass(b.children, logical, ctx, date); continue; }
      if (b.type === 'branch' && b.pending) b.owner = ctx === 'INBOX' ? null : ctx;
      if (!b.id && hasContent(b)) b.id = newId(S);
      if (b.id) { const o = seen.get(b.id); if (o) { o.dup = b.dup = true; } else seen.set(b.id, b); }
      if (logical) { if (b.fresh && b.extParent && b.extParent !== logical.id) diags.push({ date, key: b.key, level: 'warn', msg: 'Parent mark disagreed with the indentation; corrected to follow the indentation' }); b.extParent = null; }
      if (b.type === 'ord' && b.fresh && !b.pending && b.stored && b.stored !== ctx) b.conflict = b.stored;
      b.pending = false; b.fresh = false; b.stored = undefined;
      pass(b.children, b.type === 'head' ? logical : (b.id ? b : logical), childCtx(b, ctx), date);
    }
  };
  for (const d in S.pages) pass(S.pages[d], null, 'INBOX', d);
  bump(S);
  const { P, byId } = index(S);
  eachBlock(S, (b, parent, date) => {
    const push = (level, msg) => diags.push({ date, key: b.key, level, msg });
    if (b.dup) push('block', 'Duplicate record ID: ' + b.id);
    if (b.conflict) push('warn', 'Ownership conflict: the mark in the file disagrees with the indentation');
    if (b.type === 'head' && !P[b.proj]) push('error', 'Project heading points to a project that does not exist');
    if (b.type === 'branch' && !P[b.owner]) push('error', 'Branch has no valid parent project');
    if (b.extParent && !byId[b.extParent]) push('warn', 'Parent mark points to a record that does not exist');
  });
  for (const d in S.pdiags) for (const x of S.pdiags[d]) diags.push({ date: d, line: x.line, level: x.level, msg: x.msg });
  S.diags = diags;
  return diags;
}

function loadPage(S, date, text, today) {
  const r = parseFile(S, text, date, today);
  if (r.unsupported) { S.pages[date] = []; S.pdiags[date] = [{ level: 'block', msg: 'File uses schema version ' + r.unsupported + ', newer than this app supports; not loaded' }]; return { needsWrite: false, unsupported: true }; }
  S.pages[date] = r.blocks; S.pdiags[date] = r.diags;
  bump(S);
  return r;
}

// ---- 块操作 ----
function indent(S, key) {
  const loc = find(S, key);
  if (!loc || loc.index === 0) return false;
  const prev = loc.list[loc.index - 1];
  if (prev.type === 'raw') return false;
  loc.list.splice(loc.index, 1);
  prev.children.push(loc.b);
  bump(S); return true;
}

function outdent(S, key) {
  const loc = find(S, key);
  if (!loc || !loc.parent) return false;
  const ploc = find(S, loc.parent.key);
  loc.list.splice(loc.index, 1);
  ploc.list.splice(ploc.index + 1, 0, loc.b);
  loc.b.extParent = null;
  bump(S); return true;
}

function move(S, key, dir) {
  const loc = find(S, key), j = loc ? loc.index + dir : -1;
  if (!loc || j < 0 || j >= loc.list.length) return false;
  loc.list.splice(loc.index, 1);
  loc.list.splice(j, 0, loc.b);
  bump(S); return true;
}

function newAfter(S, key) {
  const loc = find(S, key), nb = mk({ date: loc.page });
  if (loc.b.children.length || (loc.b.type !== 'ord' && loc.b.type !== 'raw')) loc.b.children.unshift(nb);
  else loc.list.splice(loc.index + 1, 0, nb);
  return nb;
}

function newBefore(S, key) {
  const loc = find(S, key), nb = mk({ date: loc.page });
  loc.list.splice(loc.index, 0, nb); return nb;
}

function split(S, key, pos) {
  const loc = find(S, key), b = loc.b;
  const nb = mk({ date: b.date, text: b.text.slice(pos).replace(/^\s+/, '') });
  b.text = b.text.slice(0, pos).replace(/\s+$/, '');
  loc.list.splice(loc.index + 1, 0, nb);
  bump(S); return nb;
}

function removeBlock(S, key) { const loc = find(S, key); loc.list.splice(loc.index, 1); bump(S); }

function mergeUp(S, key) {
  const loc = find(S, key), b = loc.b, order = flat(S, loc.page);
  const prev = order[order.indexOf(b) - 1];
  if (!prev) return { ok: false, msg: '' };
  if (prev.type === 'ord' && !hasContent(prev) && !prev.id && !prev.children.length) { removeBlock(S, prev.key); return { ok: true, focus: b.key, pos: 0 }; }
  if (b.type !== 'ord' || prev.type !== 'ord') return { ok: false, msg: 'Project lines and headings cannot be merged' };
  if (b.children.length) return { ok: false, msg: 'This block has children and cannot be merged into the one above' };
  if (b.status) return { ok: false, msg: 'This block has a status and cannot be merged into the one above' };
  if (b.del || prev.del) return { ok: false, msg: 'Deleted blocks cannot be merged' };
  if (referenced(S, b.id)) return { ok: false, msg: 'Other records refer to this block, so it cannot be merged into the one above' };
  const pos = prev.text.length;
  prev.text += b.text;
  removeBlock(S, key);
  return { ok: true, focus: prev.key, pos };
}

function deleteBlock(S, key, today) {
  const { b } = find(S, key);
  if (b.type === 'raw') return { ok: false, msg: 'Fix unrecognized lines in a text editor' };
  // 还没写内容的空子块只是占位（选完项目标题后自动给的那一行），不算"有子块"
  const real = b.children.filter((c) => !(c.type === 'ord' && !c.id && !hasContent(c) && !c.children.length));
  if (b.type === 'head') {
    // 项目标题块只是一个分组标记：删掉的是这一行，不是项目。它下面的记录原地上移一级，归属随缩进重新推导
    const loc = find(S, key);
    for (const c of real) c.extParent = null;
    loc.list.splice(loc.index, 1, ...real); bump(S);
    return { ok: true, focus: real[0] && real[0].key, msg: real.length ? `Heading removed. ${real.length} ${real.length === 1 ? 'record' : 'records'} moved up one level` : '' };
  }
  if (real.length) return { ok: false, msg: b.type === 'ord' ? 'This block has children. Move or delete them first' : 'The project still has records or branches, so it cannot be deleted' };
  b.children = [];
  if (!b.id) { removeBlock(S, key); return { ok: true }; }
  if (b.type !== 'ord') {
    let used = false;
    eachBlock(S, (x) => { if (x.owner === b.id || x.proj === b.id) used = true; });
    if (used) return { ok: false, msg: 'The project still has records or branches, so it cannot be deleted' };
    removeBlock(S, key); return { ok: true };
  }
  if (referenced(S, b.id)) { b.del = today; bump(S); return { ok: true, soft: true, msg: 'Other records refer to this one, so it was marked deleted instead of removed' }; }
  removeBlock(S, key); return { ok: true };
}

function cycleStatus(S, key, today) {
  const { b } = find(S, key);
  if (b.type !== 'ord') return false;
  const order = [null, 'TODO', 'WAIT', 'DONE'];
  b.status = order[(order.indexOf(b.status) + 1) % order.length];
  b.statusDate = b.status ? today : null;
  bump(S); return true;
}

// 在当前位置插入声明块，当前块成为它的第一个子块
function createProject(S, key, name, kind, parentProj) {
  const loc = find(S, key);
  const decl = mk({ type: kind, text: name.normalize('NFC').trim(), id: newId(S), date: loc.page, owner: kind === 'branch' ? parentProj : null });
  loc.list.splice(loc.index, 1, decl);
  decl.children = [loc.b];
  bump(S); return decl;
}

// 归入项目：上一个同级块已是该项目的标题就移到它下面，否则在当前位置插入标题块
function wrapInProject(S, key, projId) {
  if (ownerAt(S, key) === projId) return { ok: false, msg: 'This block already belongs to that project' };
  const loc = find(S, key), prev = loc.list[loc.index - 1];
  if (prev && prev.type === 'head' && prev.proj === projId) { loc.list.splice(loc.index, 1); prev.children.push(loc.b); }
  else { const head = mk({ type: 'head', proj: projId, date: loc.page }); loc.list.splice(loc.index, 1, head); head.children = [loc.b]; }
  bump(S); return { ok: true };
}

// 解决归属冲突：按缩进，或按文件里的标记（插入对应项目的标题块）
function resolveConflict(S, key, byMark) {
  const { b } = find(S, key), target = b.conflict;
  b.conflict = null; bump(S);
  if (byMark && projects(S)[target]) wrapInProject(S, key, target);
}

// ---- 项目统计：总览、Working、归档都从这里取数；按版本号缓存 ----
function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
let scache = { S: null, ver: -1, today: null };
function stats(S, today) {
  if (scache.S === S && scache.ver === S.ver && scache.today === today) return scache;
  const ix = index(S), N = {}, open = [], inbox = [];
  for (const id in ix.P) N[id] = { ...ix.P[id], kids: [], todo: 0, wait: 0, events: [], last: ix.P[id].date || '' };
  for (const id in N) { const p = N[id]; if (p.type === 'branch' && N[p.parent]) N[p.parent].kids.push(id); }
  for (const [own, list] of ix.byProj) {
    const n = N[own];
    for (const b of list) {
      if (b.del) continue;
      if (own === 'INBOX') inbox.push(b);
      if (n) { const d = b.statusDate && b.statusDate > b.date ? b.statusDate : b.date; if (d && d > n.last) n.last = d; }   // 最近一次有记录或改状态的日子
      if (b.status === 'TODO' || b.status === 'WAIT') { open.push(b); if (n) { if (b.status === 'TODO') n.todo++; else n.wait++; } }
      else if (!b.status && n) n.events.push(b);
    }
  }
  const cmp = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const roll = (id, closedAbove, depth) => {
    const p = N[id];
    p.closed = closedAbove || !!p.life;
    p.events.sort(cmp); p.kids.sort((a, b) => cmp(N[a], N[b]));
    p.subTodo = p.todo; p.subWait = p.wait; p.subEvents = p.events.length; p.subLast = p.last;
    if (depth < 30) for (const k of p.kids) { roll(k, p.closed, depth + 1); p.subTodo += N[k].subTodo; p.subWait += N[k].subWait; p.subEvents += N[k].subEvents; if (N[k].subLast > p.subLast) p.subLast = N[k].subLast; }
    p.quiet = p.closed || !p.subLast ? 0 : Math.max(0, daysBetween(p.subLast, today));   // 包括分支在内，多少天没有新记录
    p.status = p.life ? (p.type === 'proj' ? 'archived' : 'completed') : (p.subTodo + p.subWait ? 'ongoing' : 'ready');
    p.days = daysBetween(p.date, p.life || today) + 1;
  };
  const tops = [];
  for (const id in N) if (N[id].type === 'proj') { roll(id, false, 0); tops.push(id); }
  for (const id in N) if (N[id].closed === undefined) roll(id, false, 0);
  tops.sort((a, b) => cmp(N[a], N[b]));
  return (scache = { S, ver: S.ver, today, N, tops, open, inbox });
}

// 完成或重新打开分支、归档或恢复顶级项目：只改声明记录这一行
function setLife(S, id, today) {
  const st = stats(S, today), p = st.N[id], b = index(S).byId[id];
  if (!p || !b) return { ok: false, msg: '' };
  if (b.life) {
    const par = p.type === 'branch' ? st.N[p.parent] : null;
    if (par && par.closed) return { ok: false, msg: 'The parent project is closed. Reopen it first' };
    b.life = null;
  } else {
    const n = p.subTodo + p.subWait;
    if (n) return { ok: false, msg: `${n} open TODO or WAIT ${n === 1 ? 'item' : 'items'} left. Close them first` };
    b.life = today;
  }
  bump(S);
  return { ok: true, page: b.page };
}

if (typeof module !== 'undefined') module.exports = { stats, setLife, daysBetween, mk, newState, bump, find, flat, index, projects, recordsByTag, referenced, projectPath, matchProjects, childCtx, ownerAt, wrapInProject, resolveConflict, commitBlock, ensureIds, serializePage, parseFile, loadPage, settle, indent, outdent, move, newAfter, newBefore, split, mergeUp, deleteBlock, cycleStatus, createProject, normalizeRefs, eachBlock, hasContent, validDate };
