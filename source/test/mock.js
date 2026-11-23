// 内存里的假目录，接口与 File System Access API 的句柄一致（测试用）
// 根目录下的 data 存日期文件（__store），其他子文件夹（如 backups）各自独立，支持二进制内容和删除
(function () {
  let clock = Date.now() - 60000;
  const store = new Map();   // data/ 里的文件：name → { text, mtime }
  const fileHandle = (map, name) => ({ kind: 'file', name,
    async getFile() { const f = map.get(name); return new File([f.blob || f.text], name, { lastModified: f.mtime }); },
    async createWritable() {
      const parts = [];
      return { write: async (t) => { parts.push(t); }, close: async () => {
        const blob = new Blob(parts);
        map.set(name, map === store ? { text: await blob.text(), mtime: ++clock } : { blob, mtime: ++clock });
        window.__writes.push(map === store ? name : 'backups/' + name);
      } };
    } });
  const dirHandle = (name, map) => ({ kind: 'directory', name,
    async *entries() { for (const k of [...map.keys()]) yield [k, fileHandle(map, k)]; },
    async getFileHandle(n, o) { if (!map.has(n)) { if (!o || !o.create) { const e = new Error('NotFound'); e.name = 'NotFoundError'; throw e; } map.set(n, map === store ? { text: '', mtime: ++clock } : { blob: new Blob([]), mtime: ++clock }); } return fileHandle(map, n); },
    async removeEntry(n) { if (!map.delete(n)) { const e = new Error('NotFound'); e.name = 'NotFoundError'; throw e; } } });
  const data = dirHandle('data', store), subs = new Map();
  window.__writes = [];
  window.__store = store;
  window.__subs = subs;   // 其他子文件夹：name → Map
  window.__ext = (name, text) => store.set(name, { text, mtime: ++clock });   // 模拟外部编辑器改文件
  window.__mockDir = { kind: 'directory', name: 'mock-workspace',
    async getDirectoryHandle(n, o) {
      if (n === 'data') return data;
      if (!subs.has(n)) { if (!o || !o.create) { const e = new Error('NotFound'); e.name = 'NotFoundError'; throw e; } subs.set(n, new Map()); }
      return dirHandle(n, subs.get(n));
    } };
})();
