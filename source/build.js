// 把 src/ 拼成单个 HTML 文件：node build.js
const fs = require('fs'), r = (f) => fs.readFileSync(__dirname + '/src/' + f, 'utf8');
const html = `<!DOCTYPE html>
<!--
  Worklog — a local, plain-text project and task journal.
  Copyright (c) 2026 The Worklog authors
  Released under the MIT License. See the LICENSE file. This notice must be kept in all copies.

  This file is the complete application and is not minified. The separate source files it is
  built from are in the source/ folder.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Worklog</title>
<style>
${r('style.css')}</style>
</head>
<body>
${r('body.html')}<script>
${r('core.js')}
${r('fs.js')}
${r('app.js')}
${r('views.js')}</script>
</body>
</html>
`;
fs.mkdirSync(__dirname + '/dist', { recursive: true });
fs.writeFileSync(__dirname + '/dist/worklog.html', html);
console.log('dist/worklog.html', (html.length / 1024).toFixed(1) + ' KB');
