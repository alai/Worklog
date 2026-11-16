# Worklog 0.31

本地、纯文本的个人项目与任务日志。一个 HTML 文件，没有服务器、没有账号，数据就是你电脑上的 Markdown 文件。

## 开始使用

1. [下载 Worklog-0.31.zip](https://github.com/alai/Worklog/releases/download/v0.31/Worklog-0.31.zip)，解压后用桌面版 **Chrome 或 Edge** 打开 `worklog.html`（Safari 和 Firefox 不支持读写本地文件夹）。
2. 点 **Choose workspace folder**，选中这个 `Worklog-0.31` 文件夹，并允许浏览器查看和修改其中的文件。
3. 开始写。每天的记录保存在 `data/` 下，一天一个文件，如 `data/2026-11-15.md`。

以后再打开 `worklog.html`，如果浏览器提示重新授权，点击 **Reopen**。

## 先看看演示数据

`demo/` 里有一份 60 天的示例（内容为英文），包含若干项目、分支、待办和等待事项。
打开应用后进入 **Settings → Change folder**，选 `demo` 文件夹。看完再用同样的方式选回 `Worklog-0.31`。

## 基本用法

- 点击 Journal 的日期或按 `D` 跳到指定日期。编辑时输入 `/date` 可插入日期。
- 每一行是一条记录。回车新建，Tab / Shift+Tab 调整缩进，缩进在谁下面就属于谁。
- 输入 `[[` 创建或引用项目；记录缩进在项目下面就归入该项目，顶层记录进入 Inbox。
- Ctrl/Cmd+Enter 在 无 → TODO → WAIT → DONE 之间切换状态。
- 用 `@名字` 标记人，`#类型` 标记类别；名字里有空格时写成 `@{Li Wei}`。点击标签可以列出全部相关记录。
- 按 `?` 查看全部键盘快捷键。

侧栏各页：Journal（按天书写）、Projects（项目生命线）、Working（未完成的 TODO 和 WAIT）、Inbox（未归入项目的记录）、Archive（已归档项目）、Maintenance（格式问题和已删除记录）、Settings。

## 关于你的数据

- 文件是唯一的数据来源，可以用任何文本编辑器直接打开和修改，应用会在下次读取时识别改动。
- 备份或迁移：复制整个文件夹即可。
- 应用不联网，不上传任何内容。界面偏好（主题、折叠状态等）保存在浏览器里，不在数据文件中。
- 同一个工作区同一时间只应在一个浏览器标签页里打开。

## 文件清单

| 路径 | 说明 |
|---|---|
| `worklog.html` | 应用本体 |
| `data/` | 你的记录（初始为空） |
| `demo/data/` | 演示数据，可以删除 |
| `source/` | 源代码、测试和构建脚本（`node build.js` 重新生成 `worklog.html`） |
| `LICENSE` | 许可证 |

## 许可证

Worklog 以 MIT 许可证发布。你可以自由使用、修改和再分发，包括用于商业用途；条件是在所有副本或其主要部分中保留版权声明和许可证文本。本软件不提供任何担保。详见 `LICENSE`。
