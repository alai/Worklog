// 生成发布包：node package.js <版本号> [输出目录]
// 产出 <输出目录>/Worklog-<版本号>/ 和同名 .zip。只用 Node 自带的模块。
// 包里刻意不放 data/ 和 backups/：用户把新包复制进工作区时，同名文件夹会被 Finder 整个替换，记录就没了。
// 应用第一次使用时会自己建 data/，备份文件夹也由应用创建。
const fs = require('fs'), path = require('path'), zlib = require('zlib'), { execFileSync } = require('child_process');
const version = process.argv[2], outDir = path.resolve(process.argv[3] || 'dist/release');
if (!/^\d+\.\d+(\.\d+)?$/.test(version || '')) { console.error('usage: node package.js <version> [out-dir]'); process.exit(2); }
const here = __dirname, name = `Worklog-${version}`, root = path.join(outDir, name);
const fail = (msg) => { console.error('package: ' + msg); process.exit(1); };

// 1. 构建，并核对版本号，防止打出一个版本号对不上的包
execFileSync(process.execPath, [path.join(here, 'build.js')], { cwd: here, stdio: 'inherit' });
const html = fs.readFileSync(path.join(here, 'dist/worklog.html'), 'utf8');
const built = (html.match(/APP_VERSION = '([^']+)'/) || [])[1];
if (built !== version) fail(`worklog.html says version ${built}, not ${version}. Update APP_VERSION in src/app.js first.`);

// 2. 组装目录
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
const put = (rel, content) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); };
const tpl = (f) => fs.readFileSync(path.join(here, 'release', f), 'utf8').replaceAll('{{VERSION}}', version);
put('worklog.html', html);
put('README.md', tpl('README.md'));
put('README.zh-CN.md', tpl('README.zh-CN.md'));
put('LICENSE', tpl('LICENSE'));
put('.gitignore', tpl('gitignore'));
// 演示数据：截止到今天的 60 天，每次打包重新生成，日期不会显旧
execFileSync(process.execPath, [path.join(here, 'test/demo.js'), path.join(root, 'demo/data'), new Date().toISOString().slice(0, 10), '60'], { stdio: 'inherit' });
// 源码
const copyTree = (rel) => {
  const from = path.join(here, rel);
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) copyTree(path.join(rel, e.name));
    else put(path.join('source', rel, e.name), fs.readFileSync(path.join(from, e.name)));
  }
};
for (const f of ['build.js', 'package.js']) put(path.join('source', f), fs.readFileSync(path.join(here, f)));
for (const d of ['src', 'test', 'release']) copyTree(d);

// 3. 检查：顶层绝不能有 data/ 或 backups/
for (const bad of ['data', 'backups']) if (fs.existsSync(path.join(root, bad))) fail(`refusing to ship a ${bad}/ folder`);

// 4. 打 zip（标准 deflate 格式，Finder、Windows 资源管理器都能直接解开）
const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const entries = [];
const walk = (rel) => {
  const abs = path.join(outDir, rel), st = fs.statSync(abs);
  if (st.isDirectory()) { entries.push({ name: rel.split(path.sep).join('/') + '/', data: Buffer.alloc(0), dir: true }); for (const f of fs.readdirSync(abs).sort()) walk(path.join(rel, f)); }
  else entries.push({ name: rel.split(path.sep).join('/'), data: fs.readFileSync(abs), dir: false });
};
walk(name);
const now = new Date(), dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1), dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
const locals = [], centrals = [];
let offset = 0;
for (const e of entries) {
  const nameBuf = Buffer.from(e.name, 'utf8'), comp = e.dir ? Buffer.alloc(0) : zlib.deflateRawSync(e.data, { level: 9 }), crc = crc32(e.data), method = e.dir ? 0 : 8;
  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(method, 8); lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12);
  lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(e.data.length, 22); lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
  locals.push(lh, nameBuf, comp);
  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(0x031e, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(method, 10); ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14);
  ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(e.data.length, 24); ch.writeUInt16LE(nameBuf.length, 28);
  ch.writeUInt32LE(((e.dir ? 0o40755 : 0o100644) << 16) >>> 0, 38); ch.writeUInt32LE(offset, 42);
  centrals.push(ch, nameBuf);
  offset += 30 + nameBuf.length + comp.length;
}
const cd = Buffer.concat(centrals), end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
const zipPath = path.join(outDir, name + '.zip');
fs.writeFileSync(zipPath, Buffer.concat([...locals, cd, end]));
console.log(`${root}\n${zipPath}  ${entries.length} entries, ${(fs.statSync(zipPath).size / 1024).toFixed(0)} KB`);
