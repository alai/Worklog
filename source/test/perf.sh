#!/bin/sh
# 性能基准：node build.js && sh test/perf.sh [天数]
# 用 test/demo.js 生成约 4700 天、5 万条记录的数据，在无头 Chrome 里量启动、打字、退出编辑、移动、切换各页面的耗时（毫秒）。
# 目标：打字、退出编辑、移动、翻日都在 16 ms（一帧）以内；切换页面在 100 ms 以内。数字和机器有关，用来前后对比。
cd "$(dirname "$0")/.." || exit 1
DIR=$(mktemp -d) && node test/demo.js "$DIR" 2026-11-24 "${1:-4700}" >/dev/null && node -e "
const fs=require('fs'),dir=process.argv[1],F={};for(const f of fs.readdirSync(dir))F[f]=fs.readFileSync(dir+'/'+f,'utf8');
let h=fs.readFileSync('dist/worklog.html','utf8');
h=h.replace('<script>',()=>'<script>'+fs.readFileSync('test/mock.js','utf8')+'</script><script>window.__F='+JSON.stringify(F).replace(/<\//g,'<\\/')+'</script><script>').replace('</body>',()=>'<script>'+fs.readFileSync('test/perf.js','utf8')+'</script></body>');
fs.writeFileSync('dist/perf.html',h);" "$DIR" && rm -rf "$DIR" && node test/run-browser.js "file://$PWD/dist/perf.html" 180
