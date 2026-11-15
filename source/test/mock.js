// 内存里的假目录，接口与 File System Access API 的句柄一致
(function () {
  const store = new Map(); let clock = Date.now() - 60000;
  const fileHandle = (name) => ({ kind: 'file', name,
    async getFile() { const f = store.get(name); return { lastModified: f.mtime, size: new Blob([f.text]).size, text: async () => f.text }; },
    async createWritable() { let buf = ''; return { write: async (t) => { buf += t; }, close: async () => { store.set(name, { text: buf, mtime: ++clock }); window.__writes.push(name); } }; } });
  const data = { kind: 'directory', name: 'data',
    async *entries() { for (const name of [...store.keys()]) yield [name, fileHandle(name)]; },
    async getFileHandle(name, o) { if (!store.has(name)) { if (!o || !o.create) throw new Error('NotFound'); store.set(name, { text: '', mtime: ++clock }); } return fileHandle(name); } };
  window.__writes = [];
  window.__store = store;
  window.__ext = (name, text) => store.set(name, { text, mtime: ++clock });   // 模拟外部编辑器改文件
  window.__mockDir = { kind: 'directory', name: 'mock-workspace', async getDirectoryHandle() { return data; } };
})();
