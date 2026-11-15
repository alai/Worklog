// 本地目录读写层：File System Access API。window.__mockDir 存在时用它代替真实目录（测试用）。
const FS = {
  dir: null, data: null, files: new Map(),   // date → { handle, mtime, size }

  supported() { return 'showDirectoryPicker' in window || !!window.__mockDir; },

  idb(mode, fn) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open('worklog', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('kv');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction('kv', mode), req = fn(tx.objectStore('kv'));
        tx.oncomplete = () => resolve(req && req.result);
        tx.onerror = () => reject(tx.error);
      };
    });
  },

  // 返回 'ready' | 'prompt'（已记住目录但需要点一下授权）| 'none'
  async restore() {
    if (window.__mockDir) { this.dir = window.__mockDir; return 'ready'; }
    try { this.dir = await this.idb('readonly', (s) => s.get('dir')); } catch (e) { this.dir = null; }
    if (!this.dir) return 'none';
    return (await this.dir.queryPermission({ mode: 'readwrite' })) === 'granted' ? 'ready' : 'prompt';
  },
  async grant() { return (await this.dir.requestPermission({ mode: 'readwrite' })) === 'granted'; },
  async pick() {
    this.dir = await window.showDirectoryPicker({ mode: 'readwrite', id: 'worklog' });
    try { await this.idb('readwrite', (s) => s.put(this.dir, 'dir')); } catch (e) { /* 记不住也能用，下次重新选择 */ }
  },

  // 决定记录放在哪里，让"选了外层文件夹"和"直接选了 data"得到同一个结果，不再出现 data/data：
  //   1. 选中的文件夹里已有 data 子文件夹 → 用它
  //   2. 选中的文件夹本身叫 data，或里面直接放着日期文件 → 就用它本身
  //   3. 其他情况 → 在里面新建 data
  async locate() {
    const d = this.dir;
    let sub = null;
    try { sub = await d.getDirectoryHandle('data'); } catch (e) { /* 没有这个子文件夹 */ }
    if (!sub) {
      let own = d.name === 'data';
      if (!own && d.entries) for await (const [name, h] of d.entries()) if (h.kind === 'file' && /^\d{4}-\d{2}-\d{2}\.md$/.test(name)) { own = true; break; }
      if (!own) sub = await d.getDirectoryHandle('data', { create: true });
    }
    this.data = sub || d;
    this.where = sub ? d.name + '/data' : d.name;
  },

  // 读入 data/ 下全部日期文件，返回 [[date, text], …]
  async loadAll() {
    await this.locate();
    this.files.clear();
    const jobs = [];
    for await (const [name, handle] of this.data.entries()) {
      const m = handle.kind === 'file' && name.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
      if (m) jobs.push(handle.getFile().then(async (f) => { this.files.set(m[1], { handle, mtime: f.lastModified, size: f.size }); return [m[1], await f.text()]; }));
    }
    return Promise.all(jobs);
  },

  // 磁盘上的文件自上次读写后是否被改过
  async changed(date) {
    const e = this.files.get(date);
    if (!e) return false;
    const f = await e.handle.getFile();
    return f.lastModified !== e.mtime || f.size !== e.size;
  },
  async read(date) {
    const e = this.files.get(date), f = await e.handle.getFile();
    e.mtime = f.lastModified; e.size = f.size;
    return f.text();
  },
  async write(date, text) {
    let e = this.files.get(date);
    if (!e) this.files.set(date, e = { handle: await this.data.getFileHandle(date + '.md', { create: true }), mtime: 0, size: 0 });
    const w = await e.handle.createWritable();   // 写入临时文件，close 时整体替换
    await w.write(text); await w.close();
    const f = await e.handle.getFile();
    e.mtime = f.lastModified; e.size = f.size;
  },
  age(date) { const e = this.files.get(date); return e ? Date.now() - e.mtime : Infinity; }
};
