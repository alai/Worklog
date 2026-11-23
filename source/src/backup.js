// ---- 本地备份 ----
// 三层：1) 每天第一次打开时，把全部记录打成一个文件、gzip 压缩，存到 data 旁边的 backups/，保留最近 14 份；
//       2) 同一份压缩包在浏览器 IndexedDB 里再存一份（整个文件夹没了也还在）；
//       3) 打开时如果 data 里的文件突然变少，先停下来、不写任何东西，让用户决定是否恢复。
// 备份文件是纯文本压缩而成：解压后头部几行是说明，之后每个日期文件以 "--- 文件名 长度" 开头、紧跟原文。
const BK = {
  KEEP: 14,
  NAME: /^(\d{4}-\d{2}-\d{2})[^/]*\.worklog\.gz$/,
  hold: null,   // 数据骤减时的提示状态：{ files, prev }；有它时不写任何文件
  day: null,    // 已经做过备份的日期

  // backups 放在 data 旁边；直接选了 data 文件夹时放在它里面（日期文件只认顶层的 .md，子文件夹不会被当成记录）
  async dir(create) {
    const parent = FS.data === FS.dir ? FS.data : FS.dir;
    try { return await parent.getDirectoryHandle('backups', create ? { create: true } : undefined); } catch (e) { return null; }
  },
  where() { return FS.data === FS.dir ? FS.where + '/backups' : FS.dir.name + '/backups'; },

  bundle(pairs) {   // pairs: [[文件名, 原文], …]
    const head = `worklog-backup 1\ncreated ${new Date().toISOString()}\nworkspace ${FS.where}\nfiles ${pairs.length}\n`;
    return head + pairs.map(([name, text]) => `--- ${name} ${text.length}\n${text}\n`).join('');
  },
  parse(s) {
    if (!s.startsWith('worklog-backup 1\n')) throw new Error('Not a Worklog backup');
    const files = [], re = /--- (\d{4}-\d{2}-\d{2}\.md) (\d+)\n/y;
    let i = s.indexOf('\n---');
    if (i < 0) return { files };   // 空工作区的备份
    i++;
    while (i < s.length) {
      re.lastIndex = i;
      const m = re.exec(s);
      if (!m) throw new Error('Backup file is damaged near position ' + i);
      const start = re.lastIndex, end = start + Number(m[2]);
      files.push([m[1], s.slice(start, end)]);
      i = end + 1;   // 跳过每段原文后面补的换行
    }
    return { files };
  },
  async gzip(s) { return new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))).blob(); },
  async gunzip(blob) { return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text(); },

  // 当前磁盘上的全部日期文件。启动时直接用刚读进来的内容，不再读一遍盘
  async current(pairs) {
    if (pairs) return pairs.map(([d, t]) => [d + '.md', t]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const out = [];
    for (const [d, e] of FS.files) out.push([d + '.md', await (await e.handle.getFile()).text()]);
    return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  },
  stamp() { const d = new Date(); return `${today()}-${pad(d.getHours())}${pad(d.getMinutes())}`; },

  async list() {
    const dir = await this.dir(false), out = [];
    if (!dir) return out;
    for await (const [name, h] of dir.entries()) {
      if (h.kind !== 'file' || !this.NAME.test(name)) continue;
      const f = await h.getFile();
      out.push({ name, size: f.size, mtime: f.lastModified, handle: h });
    }
    // 新的在前：先按文件名里的日期，同一天的按写入时间（同一天可能有自动、手动、恢复前三种）
    return out.sort((a, b) => (a.name.slice(0, 10) !== b.name.slice(0, 10) ? (a.name < b.name ? 1 : -1) : b.mtime - a.mtime));
  },
  async make(name, pairs) {
    const files = await this.current(pairs), blob = await this.gzip(this.bundle(files));
    const dir = await this.dir(true), h = await dir.getFileHandle(name, { create: true }), w = await h.createWritable();
    await w.write(blob); await w.close();
    try { await FS.idb('readwrite', (s) => s.put({ at: Date.now(), name, files: files.length, blob }, 'snap:' + FS.where)); } catch (e) { /* 浏览器副本只是辅助，失败不影响磁盘上的备份 */ }
    await this.prune();
    return { name, files: files.length, size: blob.size };
  },
  async prune() {
    const dir = await this.dir(false), all = await this.list();
    for (const b of all.slice(this.KEEP)) { try { await dir.removeEntry(b.name); } catch (e) { /* 删不掉就留着 */ } }
  },
  // 每天一次：当天已经有任何一份备份（包括手动的）就跳过；工作区是空的、或正处于数据骤减的提示中也跳过
  async daily(pairs) {
    const t = today();
    if (this.day === t || this.hold || readOnly || !FS.files.size) return;
    this.day = t;
    try {
      if ((await this.list()).some((b) => b.name.startsWith(t))) return;
      await this.make(`${t}.worklog.gz`, pairs);
      if (view === 'issues') drawView();
    } catch (e) { this.day = null; toast('Backup failed: ' + e.message); }
  },
  async browserCopy() { try { return await FS.idb('readonly', (s) => s.get('snap:' + FS.where)); } catch (e) { return null; } },

  // 记住每个工作区上次的规模；打开时文件数骤减（清空，或少了一半以上）就先停下来
  remember(files, records) {
    try { localStorage.setItem('worklog-ws:' + FS.where, JSON.stringify({ files, records, date: today() })); } catch (e) { /* 记不住就不检查 */ }
  },
  check(files) {
    let prev = null;
    try { prev = JSON.parse(localStorage.getItem('worklog-ws:' + FS.where) || 'null'); } catch (e) { /* 忽略 */ }
    return prev && prev.files >= 3 && (files === 0 || files < prev.files / 2) ? prev : null;
  },

  // 恢复：先把当前状态再备份一份，然后把备份里的文件逐个写回 data（同名覆盖，备份里没有的文件不动）
  async restore(source) {
    if (lockedOut) return toast('This workspace is open in another tab. Restore from that tab.');
    await flush();
    const blob = source.blob || await (await source.handle.getFile());
    const { files } = this.parse(await this.gunzip(blob));
    if (FS.files.size) await this.make(`${this.stamp()}-before-restore.worklog.gz`);
    for (const [name, text] of files) await FS.write(name.slice(0, 10), text);
    this.hold = null; this.day = null;
    await start();
    show('issues');
    toast(`Restored ${files.length} ${files.length === 1 ? 'file' : 'files'} from ${source.label}`);
  },

  // Settings 里的手动导出：下载到浏览器的下载文件夹
  async exportFile() {
    await flush();
    const blob = await this.gzip(this.bundle(await this.current()));
    const a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = `worklog-backup-${this.stamp()}.worklog.gz`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return a.download;
  }
};

// 数据骤减时的提示：不写任何文件，直到用户选择恢复或保持现状
function holdBanner() {
  const h = BK.hold;
  banner(`The data folder now has ${h.files} ${h.files === 1 ? 'file' : 'files'}, but had ${h.prev.files} on ${h.prev.date}. If it was replaced by mistake, restore a backup. Nothing is saved until you choose.`,
    [['Restore a backup', () => show('issues')], ['Keep as is', () => { BK.hold = null; readOnly = lockedOut; banner(); BK.remember(FS.files.size, recordCount()); BK.daily(); render(); drawView(); }]]);
}
function recordCount() { let n = 0; eachBlock(S, () => n++); return n; }

// Maintenance 页里的备份一节
async function drawBackups(root) {
  root.appendChild(el('h2', null, 'Backups'));
  const info = el('div', 'set-row'), now = el('button', 'btn', 'Back up now');
  info.append(el('span', 'bk-note', `Daily, latest ${BK.KEEP} kept, in ${BK.where()}`), now);
  now.disabled = readOnly || !FS.files.size;
  now.onclick = async () => { now.disabled = true; try { const r = await BK.make(`${BK.stamp()}.worklog.gz`); toast(`Backed up ${r.files} files (${kb(r.size)})`); } catch (e) { toast('Backup failed: ' + e.message); } drawView(); };
  root.appendChild(info);
  const box = el('div', 'bk-list'); root.appendChild(box);
  const [all, copy] = await Promise.all([BK.list(), BK.browserCopy()]);
  if (!box.isConnected) return;   // 等待期间页面已重画
  if (!all.length && !copy) box.appendChild(empty('No backups yet.'));
  const row = (label, meta, src) => {
    const r = el('div', 'bk-row'), b = el('button', 'mini', 'Restore');
    r.append(el('span', 'bk-name', label), el('span', 'bk-meta', meta), b);
    let armed = 0;   // 两步确认：第一次点击只是提示，4 秒内再点一次才恢复
    b.disabled = lockedOut;
    b.onclick = async () => {
      if (Date.now() - armed > 4000) { armed = Date.now(); b.textContent = 'Click again to restore'; b.classList.add('arm'); setTimeout(() => { if (b.isConnected) { b.textContent = 'Restore'; b.classList.remove('arm'); } }, 4000); return; }
      b.disabled = true; b.textContent = 'Restoring…';
      try { await BK.restore(src); } catch (e) { toast('Restore failed: ' + e.message); drawView(); }
    };
    box.appendChild(r);
  };
  for (const b of all) row(b.name.replace('.worklog.gz', ''), `${kb(b.size)} · ${when(b.mtime)}`, { handle: b.handle, label: b.name });
  if (copy) row('Browser copy', `${copy.files} files · ${kb(copy.blob.size)} · ${when(copy.at)}`, { blob: copy.blob, label: 'the browser copy' });
}
const when = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const kb = (n) => (n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB');
