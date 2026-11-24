# Worklog {{VERSION}}

A local, plain-text journal for projects and tasks. One HTML file, no server, no account. Your data is a folder of Markdown files on your own computer.

中文说明见 [README.zh-CN.md](README.zh-CN.md).

## Getting started

1. [Download Worklog-{{VERSION}}.zip](https://github.com/alai/Worklog/releases/download/v{{VERSION}}/Worklog-{{VERSION}}.zip), unzip it, and open `worklog.html` in desktop **Chrome or Edge**. Safari and Firefox cannot read and write local folders, so they are not supported.
2. Click **Choose workspace folder**, select this `Worklog-{{VERSION}}` folder, and allow the browser to view and edit files in it.
3. Start writing. The app creates a `data/` folder on first use and saves each day as one file there, for example `data/2026-11-15.md`.

If Chrome or Edge prompts for folder access again when you open `worklog.html`, click **Reopen**.

## Upgrading

[Download the latest worklog.html](https://github.com/alai/Worklog/releases/latest/download/worklog.html). Close Worklog, replace your existing `worklog.html` with the downloaded file, and reopen it in Chrome or Edge.

Release packages contain no `data/` or `backups/` folder, so copying a whole new package over your workspace cannot overwrite your records either. Keeping your records in a separate folder, for example `~/Documents/Worklog-data`, makes this even safer: in the app choose that folder with **Settings → Change folder**.

## Try the demo data first

`demo/` holds 60 days of sample records: several projects with branches, to-dos and waiting items.
In the app, go to **Settings → Change folder** and select the `demo` folder. Switch back the same way by selecting `Worklog-{{VERSION}}`.

## Basics

- Click the Journal date or press `D` to jump to a day. Type `/date` while editing to insert a date.
- Every line is a record. Enter adds one, Tab and Shift+Tab change the indent. A record belongs to whatever it is indented under.
- Type `[[` to create or reference a project. Records indented under a project belong to it; top-level records go to the Inbox.
- Type `((` and a few words to quote another record. The quote always shows the original's current text; click it to jump there. A record that is quoted shows `↩ N` at the end of its line.
- Wrap text in backticks for inline code: `` `git log @Tom` ``. Inside code, `@`, `#`, `((`, `[[` and `/date` are plain text.
- Ctrl/Cmd+Enter cycles a record through none → TODO → WAIT → DONE.
- Tag people with `@name` and categories with `#kind`. Write `@{Li Wei}` when a name contains a space. Typing `@` or `#` suggests names and tags you have already used. Click a tag to list every record that carries it.
- Press `?` for the full list of keyboard shortcuts.

Pages in the sidebar: Journal (write day by day), Projects (the lifeline of each project), Working (open TODO and WAIT items), Inbox (records not filed under a project), Archive (archived projects), Maintenance (format issues and deleted records), Settings.

## About your data

- The files are the only source of truth. You can open and edit them in any text editor; the app picks up the changes the next time it reads them.
- **Automatic backups:** once a day, the first time you open Worklog, all records are packed into one compressed file in `backups/` next to `data/`, for example `backups/2026-11-23.worklog.gz`. The latest 14 are kept. A copy of the latest backup is also kept in the browser.
- **Restoring:** open **Maintenance → Backups** and click **Restore** twice. The current state is backed up first, then every file in the backup is written back. Files that are not in the backup are left alone.
- **Safety check:** if the data folder suddenly has far fewer files than last time, for example because it was replaced by an empty one, Worklog stops, saves nothing, and offers to restore a backup.
- **Manual export:** **Settings → Export backup** saves a backup file to your downloads folder. To move your data to another computer, copy the `data/` folder.
- The app never goes online and uploads nothing. Interface preferences such as theme and fold state are kept in the browser, not in the data files.
- Open a workspace in only one browser tab at a time.

## What is in this folder

| Path | What it is |
|---|---|
| `worklog.html` | The application |
| `data/` | Your records. Created by the app on first use, not part of the package |
| `backups/` | Daily backups. Created by the app, not part of the package |
| `demo/data/` | Sample data, safe to delete |
| `source/` | Source files, tests and the build script (`node build.js` rebuilds `worklog.html`) |
| `LICENSE` | Licence |

## Licence

Worklog is released under the MIT License. You may use, modify and redistribute it, including commercially, as long as the copyright notice and the licence text stay with every copy or substantial portion of it. There is no warranty. See `LICENSE`.
