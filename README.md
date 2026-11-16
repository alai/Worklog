# Worklog 0.31

A local, plain-text journal for projects and tasks. One HTML file, no server, no account. Your data is a folder of Markdown files on your own computer.

中文说明见 [README.zh-CN.md](README.zh-CN.md).

## Getting started

1. [Download Worklog-0.31.zip](https://github.com/alai/Worklog/releases/download/v0.31/Worklog-0.31.zip), unzip it, and open `worklog.html` in desktop **Chrome or Edge**. Safari and Firefox cannot read and write local folders, so they are not supported.
2. Click **Choose workspace folder**, select this `Worklog-0.31` folder, and allow the browser to view and edit files in it.
3. Start writing. Each day is saved as one file under `data/`, for example `data/2026-11-15.md`.

If Chrome or Edge prompts for folder access again when you open `worklog.html`, click **Reopen**.

## Try the demo data first

`demo/` holds 60 days of sample records: several projects with branches, to-dos and waiting items.
In the app, go to **Settings → Change folder** and select the `demo` folder. Switch back the same way by selecting `Worklog-0.31`.

## Basics

- Click the Journal date or press `D` to jump to a day. Type `/date` while editing to insert a date.
- Every line is a record. Enter adds one, Tab and Shift+Tab change the indent. A record belongs to whatever it is indented under.
- Type `[[` to create or reference a project. Records indented under a project belong to it; top-level records go to the Inbox.
- Ctrl/Cmd+Enter cycles a record through none → TODO → WAIT → DONE.
- Tag people with `@name` and categories with `#kind`. Write `@{Li Wei}` when a name contains a space. Click a tag to list every record that carries it.
- Press `?` for the full list of keyboard shortcuts.

Pages in the sidebar: Journal (write day by day), Projects (the lifeline of each project), Working (open TODO and WAIT items), Inbox (records not filed under a project), Archive (archived projects), Maintenance (format issues and deleted records), Settings.

## About your data

- The files are the only source of truth. You can open and edit them in any text editor; the app picks up the changes the next time it reads them.
- To back up or move your data, copy the folder.
- The app never goes online and uploads nothing. Interface preferences such as theme and fold state are kept in the browser, not in the data files.
- Open a workspace in only one browser tab at a time.

## What is in this folder

| Path | What it is |
|---|---|
| `worklog.html` | The application |
| `data/` | Your records, empty to begin with |
| `demo/data/` | Sample data, safe to delete |
| `source/` | Source files, tests and the build script (`node build.js` rebuilds `worklog.html`) |
| `LICENSE` | Licence |

## Licence

Worklog is released under the MIT License. You may use, modify and redistribute it, including commercially, as long as the copyright notice and the licence text stay with every copy or substantial portion of it. There is no warranty. See `LICENSE`.
