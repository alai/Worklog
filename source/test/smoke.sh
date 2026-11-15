#!/bin/sh
# 无头 Chrome 冒烟测试：node build.js && sh test/smoke.sh
cd "$(dirname "$0")/.." && node -e "
const fs=require('fs');let h=fs.readFileSync('dist/worklog.html','utf8');
h=h.replace('<script>','<script>'+fs.readFileSync('test/mock.js','utf8')+'</script><script>').replace('</body>',()=>'<script>'+fs.readFileSync('test/smoke.js','utf8')+'</script></body>');
fs.writeFileSync('dist/test.html',h);"
google-chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget=15000 --dump-dom "file://$PWD/dist/test.html" 2>/dev/null | python3 -c "
import sys,re,html
d=sys.stdin.read()
for i in ('SMOKE','ERR'):
    for m in re.findall(r'<pre id=\"%s\">(.*?)</pre>'%i,d,re.S): print(html.unescape(m))
"
