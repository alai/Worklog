# Worklog {{VERSION}}

本地、纯文本的个人项目与任务日志。一个 HTML 文件，没有服务器、没有账号，数据就是你电脑上的 Markdown 文件。

## 开始使用

1. [下载 Worklog-{{VERSION}}.zip](https://github.com/alai/Worklog/releases/download/v{{VERSION}}/Worklog-{{VERSION}}.zip)，解压后用桌面版 **Chrome 或 Edge** 打开 `worklog.html`（Safari 和 Firefox 不支持读写本地文件夹）。
2. 点 **Choose workspace folder**，选中这个 `Worklog-{{VERSION}}` 文件夹，并允许浏览器查看和修改其中的文件。
3. 开始写。应用第一次使用时会自动建好 `data/` 文件夹，每天的记录保存为其中的一个文件，如 `data/2026-11-15.md`。

以后再打开 `worklog.html`，如果浏览器提示重新授权，点击 **Reopen**。

## 升级

[下载最新版 worklog.html](https://github.com/alai/Worklog/releases/latest/download/worklog.html)，关闭 Worklog，用下载的文件替换现有的 `worklog.html`，然后用 Chrome 或 Edge 重新打开。

发布包里不含 `data/` 和 `backups/` 文件夹，所以即使把整个新包复制进你的工作区，也不会覆盖你的记录。把记录放在单独的文件夹里（比如 `~/Documents/Worklog-data`）会更稳妥：在应用里用 **Settings → Change folder** 选中那个文件夹。

## 先看看演示数据

`demo/` 里有一份 60 天的示例（内容为英文），包含若干项目、分支、待办和等待事项。
打开应用后进入 **Settings → Change folder**，选 `demo` 文件夹。看完再用同样的方式选回 `Worklog-{{VERSION}}`。

## 基本用法

- 点击 Journal 的日期或按 `D` 跳到指定日期。编辑时输入 `/date` 可插入日期。
- 每一行是一条记录。回车新建，Tab / Shift+Tab 调整缩进，缩进在谁下面就属于谁。
- 输入 `[[` 创建或引用项目；记录缩进在项目下面就归入该项目，顶层记录进入 Inbox。
- 输入 `((` 加几个关键词即可引用另一条记录。引用处总是显示原记录的当前文字，点击跳转到原处；被引用的记录行尾会显示 `↩ N`。
- 用反引号把文字包起来就是行内代码：`` `git log @Tom` ``。代码里的 `@`、`#`、`((`、`[[` 和 `/date` 都只是文字。
- 按 `Y`（或文件名旁的复制按钮）把当前 Journal 页复制为文本，可直接贴进邮件或聊天。先折叠或选中某条，就只复制一部分。
- Ctrl/Cmd+Enter 在 无 → TODO → WAIT → DONE 之间切换状态。
- 用 `@名字` 标记人，`#类型` 标记类别；名字里有空格时写成 `@{Li Wei}`。输入 `@` 或 `#` 时会提示已经用过的名字和标签。点击标签可以列出全部相关记录。
- 按 `?` 查看全部键盘快捷键。

侧栏各页：Journal（按天书写）、Projects（项目生命线）、Working（未完成的 TODO 和 WAIT）、Inbox（未归入项目的记录）、Archive（已归档项目）、Maintenance（格式问题和已删除记录）、Settings。

## 关于你的数据

- 文件是唯一的数据来源，可以用任何文本编辑器直接打开和修改，应用会在下次读取时识别改动。
- **自动备份：** 每天第一次打开时，全部记录会打包压缩成一个文件，存到 `data/` 旁边的 `backups/` 里，如 `backups/2026-11-23.worklog.gz`，保留最近 14 份。浏览器里也会保存一份最新的备份。
- **恢复：** 打开 **Maintenance → Backups**，在要恢复的那份上连点两次 **Restore**。应用会先把当前状态备份一次，再把备份里的文件逐个写回；备份里没有的文件保持不动。
- **安全检查：** 如果打开时发现数据文件夹里的文件比上次骤减（比如被一个空文件夹覆盖了），应用会停下来、不保存任何内容，并提示从备份恢复。
- **手动导出：** **Settings → Export backup** 会把一份备份保存到下载文件夹。要把数据搬到另一台电脑，复制 `data/` 文件夹即可。
- 应用不联网，不上传任何内容。界面偏好（主题、折叠状态等）保存在浏览器里，不在数据文件中。
- 同一个工作区同一时间只应在一个浏览器标签页里打开。

## 文件清单

| 路径 | 说明 |
|---|---|
| `worklog.html` | 应用本体 |
| `data/` | 你的记录。应用第一次使用时自动创建，不在发布包里 |
| `backups/` | 每日备份。由应用创建，不在发布包里 |
| `demo/data/` | 演示数据，可以删除 |
| `source/` | 源代码、测试和构建脚本（`node build.js` 重新生成 `worklog.html`） |
| `LICENSE` | 许可证 |

## 许可证

Worklog 以 MIT 许可证发布。你可以自由使用、修改和再分发，包括用于商业用途；条件是在所有副本或其主要部分中保留版权声明和许可证文本。本软件不提供任何担保。详见 `LICENSE`。
