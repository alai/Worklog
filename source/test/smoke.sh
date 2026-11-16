#!/bin/sh
# 无头 Chrome 冒烟测试：node build.js && sh test/smoke.sh
# 用真实时钟运行（见 test/run-browser.js 开头的说明）。有 ERROR 时退出码为 1。
cd "$(dirname "$0")/.." && node -e "
const fs=require('fs');let h=fs.readFileSync('dist/worklog.html','utf8');
h=h.replace('<script>','<script>'+fs.readFileSync('test/mock.js','utf8')+'</script><script>').replace('</body>',()=>'<script>'+fs.readFileSync('test/smoke.js','utf8')+'</script></body>');
fs.writeFileSync('dist/test.html',h);" && node test/run-browser.js "file://$PWD/dist/test.html"
