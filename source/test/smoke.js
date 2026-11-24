(async function () {
  const log = []; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = (ta, k, o = {}) => ta.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o)));
  const act = () => document.activeElement; const type = (ta, v) => { ta.value = v; ta.setSelectionRange(v.length, v.length); ta.dispatchEvent(new Event('input')); };
  const p = (n) => String(n).padStart(2, '0'), d = new Date(), T = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const f13 = `<!-- worklog-schema: 0.3 -->\n# Journal 2026-11-13\n\n- 2026-11-13 [[PJ/AI-Sandbox]] Project created. ((k3Vw9xQ_2a))\n  - 2026-11-13 #meeting with @Mandy 讨论 GPU 配置 ((Zp4mT8cL-e)) ^pj((k3Vw9xQ_2a)) ^pr((k3Vw9xQ_2a))\n    - 2026-11-13 [TODO:2026-11-13] 约 @Jesson 和 @Steve 开会 ((u9DfX1aGm6)) ^pj((k3Vw9xQ_2a)) ^pr((Zp4mT8cL-e))\n- 2026-11-13 [WAIT:2026-11-13] 等待另一件独立事项的反馈 ((Qa6LsM4oT1)) ^pj(INBOX)\n`;
  __ext('2026-11-13.md', f13);
  __ext(T + '.md', '- [[PJ/AI-Sandbox]]\n\t- 确认交期 [WAIT]\n- 回电话给 Mandy [TODO]\n- 2026-11-13 归属写错 ((CCCCCCCCCC)) ^pj((k3Vw9xQ_2a))\n');
  __ext('notes.txt', 'ignored');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await sleep(300); await saving;
  try {
    log.push('stats: ' + document.querySelector('#stats').textContent.replace(/read \d+ ms · parse \d+ ms/, 'read N ms · parse N ms'));
    log.push('writes after load: ' + __writes.join(','));
    log.push('today file:\n' + __store.get(T + '.md').text.replace(/\(\([A-Za-z0-9_-]{10}\)\)/g, (m) => m === '((CCCCCCCCCC))' || m === '((k3Vw9xQ_2a))' ? m : '((ID))'));
    log.push('issues: ' + ((document.querySelector('.nav-item .count.warn') || {}).textContent) + ' | conflict buttons: ' + [...document.querySelectorAll('.mini')].map((x) => x.textContent).filter((x) => /Keep|Move/.test(x)).join(','));
    // resolve conflict by mark
    [...document.querySelectorAll('.mini')].find((x) => x.textContent.startsWith('Move to')).click(); await sleep(50); await saving;
    log.push('after resolve, last lines:\n' + __store.get(T + '.md').text.trimEnd().split('\n').slice(-2).join('\n').replace(/\(\((?!CCCCCCCCCC|k3Vw9xQ_2a)[A-Za-z0-9_-]{10}\)\)/g, '((ID))'));
    // edit on 11-13
    await go('2026-11-13'); __writes.length = 0;
    [...document.querySelectorAll('.view')].find((v) => v.textContent.includes('约')).click(); let ta = act();
    key(ta, 'Enter', { ctrlKey: true }); ta = act(); ta.setSelectionRange(ta.value.length, ta.value.length); key(ta, 'Enter'); ta = act(); type(ta, '新加的一条 #call'); ta.blur();
    await sleep(600); await saving;
    log.push('writes after edit: ' + __writes.join(',') + ' | saved: ' + document.querySelector('#saved').textContent.replace(/\d\d:\d\d:\d\d/, 'HH:MM:SS'));
    log.push('11-13 file tail:\n' + __store.get('2026-11-13.md').text.trimEnd().split('\n').slice(-3).join('\n').replace(/新加的一条 #call \(\(.{10}\)\)/, '新加的一条 #call ((ID))').replace(/WAIT:\d{4}-\d\d-\d\d\] 约/, 'WAIT:TODAY] 约'));
    // external change, no local edits -> reload on focus
    __ext('2026-11-13.md', __store.get('2026-11-13.md').text + '- 2026-11-13 外部追加的一行 ((DDDDDDDDDD)) ^pj(INBOX)\n');
    window.dispatchEvent(new Event('focus')); await sleep(100);
    log.push('external line shown: ' + [...document.querySelectorAll('.view')].some((v) => v.textContent.includes('外部追加的一行')));
    // conflict: local edit + external change
    [...document.querySelectorAll('.view')].find((v) => v.textContent.includes('外部追加')).click(); ta = act(); type(ta, '外部追加的一行，本地又改了');
    __ext('2026-11-13.md', __store.get('2026-11-13.md').text + '- 2026-11-13 第二次外部修改 ((EEEEEEEEEE)) ^pj(INBOX)\n');
    await sleep(600); await saving;
    log.push('banner: ' + document.querySelector('#banner').textContent + ' | file has local edit: ' + __store.get('2026-11-13.md').text.includes('本地又改了'));
    [...document.querySelectorAll('#banner button')].find((x) => x.textContent === 'Keep mine').click(); await sleep(50); await saving;
    log.push('after keep mine: local=' + __store.get('2026-11-13.md').text.includes('本地又改了') + ' banner hidden=' + document.querySelector('#banner').hidden);
    // empty day not written
    __writes.length = 0; await go('2030-01-01'); document.querySelector('#add').click(); await sleep(500); await saving;
    log.push('empty day writes: ' + __writes.length + ' file exists: ' + __store.has('2030-01-01.md'));
    // ---- round 2 ----
    const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];
    const nav = (name) => qa('.nav-item').find((x) => x.getAttribute('aria-label') === name).click();
    await go('2026-11-13');
    qa('.view').find((v) => v.textContent.includes('GPU')).click(); ta = act(); key(ta, 'Escape');
    log.push('esc leaves editing: ' + (document.activeElement !== ta) + ' rows editing=' + qa('.row.editing').length);
    nav('Projects');
    log.push('projects: ' + qa('.pj.top').map((x) => x.querySelector('.pj-head').textContent).join(' || '));
    log.push('lifeline events: ' + qa('.pj-body .rec').length);
    { const st = stats(S, today()), want = st.tops.filter((id) => !st.N[id].life).length, navCount = (qa('.nav-item').find((x) => x.querySelector('.nav-label').textContent === 'Projects').querySelector('.count') || {}).textContent;
      const q0 = cfg.quiet; cfg.quiet = 1; drawView(); const qs = qa('.pj-head .quiet').map((x) => x.textContent + ' [' + x.title.replace(/\d{4}-\d\d-\d\d/, 'DATE') + ']');
      cfg.quiet = 365; drawView(); const none = qa('.pj-head .quiet').length; cfg.quiet = q0; drawView();
      { const t0 = cfg.theme, out = []; for (const th of ['light', 'dark']) { cfg.theme = th; applyTheme(); out.push(th + '=' + q('meta[name=theme-color]').content); } cfg.palette = 'solarized'; applyTheme(); out.push('solarized-dark=' + q('meta[name=theme-color]').content); cfg.palette = 'default'; cfg.theme = t0; applyTheme(); log.push('theme-color: ' + out.join(' ')); }
    log.push('projects nav count=' + navCount + ' (open top-level=' + want + ') | quiet>=1: ' + qs.join(' ; ') + ' | quiet>=365: ' + none); }
    { const press = (k) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: 'Key' + k.toUpperCase(), bubbles: true, cancelable: true })); if (act().blur) act().blur(); const t0 = q('#view .icon-btn.foldall').title; press('z'); const f1 = qa('.pj.top').filter((x) => !x.querySelector('.pj-body')).length + '/' + qa('.pj.top').length, t1 = q('#view .icon-btn.foldall').title, sep = getComputedStyle(q('.pj.top')).borderBottomStyle;
      press('z'); const f2 = qa('.pj.top').filter((x) => !x.querySelector('.pj-body')).length; log.push('fold all: ' + t0 + ' -> Z folded=' + f1 + ' tip=' + t1 + ' separator=' + sep + ' | Z again folded=' + f2); }
    { const press = (k) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: 'Key' + k.toUpperCase(), bubbles: true, cancelable: true }));
      const g0 = cfg.tagGroup, w0 = cfg.workGroup, out = [];
      for (const [v, arg, key] of [['tag', '@Mandy', 'tagGroup'], ['working', undefined, 'workGroup']]) {
        cfg[key] = false; show(v, arg); const flat = !!q('#view .icon-btn.foldall');
        cfg[key] = true; show(v, arg); if (act().blur) act().blur(); const heads = qa('#view .grp-head').length, tip0 = (q('#view .icon-btn.foldall') || {}).title;
        press('z'); const shut = qa('#view .grp-head.shut').length, recs = qa('#view .rec').length, tip1 = q('#view .icon-btn.foldall').title;
        press('z'); out.push(v + ': ungrouped button=' + flat + ' | grouped heads=' + heads + ' tip=' + tip0 + ' -> Z shut=' + shut + ' records shown=' + recs + ' tip=' + tip1 + ' -> Z shut=' + qa('#view .grp-head.shut').length);
      }
      cfg.tagGroup = g0; cfg.workGroup = w0; log.push('group fold all: ' + out.join(' || ')); nav('Projects'); }
    qa('.mini.act').find((x) => x.textContent === 'Archive').click(); await sleep(30);
    log.push('archive refused toast: ' + q('#toast').textContent);
    q('.fold').click(); log.push('folded head: ' + q('.pj-head').textContent + ' body=' + qa('.pj-body').length);
    q('.fold').click();
    nav('Working');
    log.push('working: ' + qa('.col').map((c) => c.querySelector('h2').textContent + ' ' + c.querySelectorAll('.rec').length).join(' | '));
    q('.icon-btn.grp').click(); log.push('working grouped: ' + q('.icon-btn.grp').title + ' | ' + qa('.col').map((c) => [...c.querySelectorAll('.group')].map((x) => x.textContent).join('+')).join(' | ') + ' recs=' + qa('#view .rec').length); q('.icon-btn.grp').click();
    nav('Inbox'); log.push('inbox recs: ' + qa('#view .rec').length);
    qa('.person').find((x) => x.textContent === '@Mandy').click();
    log.push('tag view: ' + q('#view h1').textContent + ' -> ' + qa('#view .rec').length);
    q('.icon-btn.grp').click();
    log.push('tag grouped: ' + qa('#view .group').map((x) => x.textContent).join(' | ') + ' recs=' + qa('#view .rec').length);
    q('.icon-btn.grp').click();
    q('#q').value = 'gpu'; q('#q').dispatchEvent(new Event('input')); await sleep(250);
    log.push('search: ' + q('#view h1').textContent + ' -> ' + qa('#view .rec').length);
    // inline edit in a list view
    __writes.length = 0; qa('#view .rec')[0].click(); ta = act();
    log.push('inline edit opens: ' + (ta.tagName === 'TEXTAREA') + ' still in view=' + !q('#view').hidden);
    type(ta, ta.value + ' (edited in list)'); key(ta, 'Enter', { ctrlKey: true }); key(ta, 'Enter'); if (document.activeElement === ta) ta.blur();
    await sleep(100); await saving;
    log.push('inline saved: writes=' + __writes.join(',') + ' file ok=' + /\[TODO:\d{4}-\d\d-\d\d\] #meeting.*\(edited in list\)/.test(__store.get('2026-11-13.md').text) + ' row=' + qa('#view .rec')[0].textContent);
    qa('#view .rec')[0].click(); ta = act(); key(ta, 'Enter', { ctrlKey: true }); key(ta, 'Enter', { ctrlKey: true }); key(ta, 'Enter', { ctrlKey: true }); ta.blur(); await sleep(50); await saving;
    qa('#view .rec .goto')[0].click(); await sleep(50);
    log.push('jump back to journal: view hidden=' + q('#view').hidden + ' title=' + q('#title').textContent.slice(0, 10) + ' editing=' + qa('.row.editing').length);
    if (act().blur) act().blur();
    // close all open items then archive
    for (const b of index(S).byId ? Object.values(index(S).byId) : []) if (b.status === 'TODO' || b.status === 'WAIT') { b.status = 'DONE'; b.statusDate = T; dirty.add(b.page); }
    bump(S); await flush();
    nav('Projects'); __writes.length = 0;
    qa('.mini.act').find((x) => x.textContent === 'Archive').click(); await sleep(50); await saving;
    log.push('archived: writes=' + __writes.join(',') + ' line=' + __store.get('2026-11-13.md').text.split('\n')[3].replace(/ARCHIVED:\d{4}-\d\d-\d\d/, 'ARCHIVED:TODAY') + ' | active left=' + qa('.pj.top').length);
    nav('Archive'); log.push('archive view: ' + qa('.pj.top').length + ' action=' + q('.mini.act').textContent);
    await go('2026-11-13');
    log.push('locked in archived project: readonly textareas=' + qa('.row textarea').filter((x) => x.readOnly).length + '/' + qa('.row textarea').length);
    nav('Archive'); q('.mini.act').click(); await sleep(50); await saving;
    nav('Projects'); log.push('restored: active=' + qa('.pj.top').length);
    nav('Settings');
    qa('.seg button').find((x) => x.textContent === 'Dark').click();
    log.push('theme: ' + document.documentElement.dataset.theme + ' bg=' + getComputedStyle(document.body).backgroundColor);
    { const bg = () => getComputedStyle(document.body).backgroundColor, pick = (t) => qa('.seg button').find((x) => x.textContent === t).click();
      pick('Solarized'); const sd = bg(); pick('Light'); const sl = bg(), pal = document.documentElement.dataset.palette, todo = (() => { const x = document.createElement('span'); x.className = 'status TODO'; document.body.appendChild(x); const c = getComputedStyle(x).color; x.remove(); return c; })();
      pick('Default'); const back = bg() + ' attr=' + (document.documentElement.dataset.palette || 'none'); pick('Dark');
      log.push('palette: solarized dark bg=' + sd + ' light bg=' + sl + ' attr=' + pal + ' todo=' + todo + ' | default -> ' + back); }
    qa('.seg button').find((x) => x.textContent === 'Days').click();
    log.push('cfg: ' + localStorage.getItem('worklog-cfg'));
    q('#nav-toggle').click(); log.push('nav narrow: ' + q('#nav').classList.contains('narrow') + ' width=' + q('#nav').offsetWidth);
    q('#nav-toggle').click();
    nav('Maintenance'); log.push('maintenance: ' + qa('#view h2').map((x) => x.textContent).join(' | '));
    qa('.btn').find((x) => x.textContent === 'Rescan workspace').click(); await sleep(300); await saving;
    if (readOnly || !q('#banner').hidden) throw new Error('Rescan must keep the current tab writable');
    log.push('rescan ok: ' + q('#view h1').textContent + ' stats=' + (q('#stats').textContent.length > 10));
    const hk = (c) => { document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Key' + c, key: c, ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true })); return view; };
    log.push('hotkeys: ' + ['P', 'W', 'I', 'A', 'M', 'S'].map(hk).join(',')); hk('J'); await sleep(50); log.push('hotkey J: ' + view + ' journal shown=' + !q('#journal').hidden);
    // keyboard navigation
    const press = (k, o = {}) => document.body.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, code: /^[a-z]$/i.test(k) ? 'Key' + k.toUpperCase() : '', bubbles: true, cancelable: true }, o)));
    const curText = () => { const c = q('.cur'); return c ? c.textContent.slice(0, 18) : 'none'; };
    nav('Inbox'); if (act().blur) act().blur();
    const w0 = curText(); press('j'); const w1 = curText(); press('ArrowDown'); press('k'); const w2 = curText();
    log.push('nav working: start=' + w0 + ' | j=' + w1 + ' | j,k back same=' + (w1 === w2) + ' heads skipped=' + !q('.cur.pj-head'));
    press('j'); press('Enter'); ta = act(); log.push('nav enter edits: ' + (ta.tagName === 'TEXTAREA') + ' in view=' + !q('#view').hidden);
    if (ta.tagName === 'TEXTAREA') { key(ta, 'Escape'); } await sleep(30);
    log.push('nav esc: editing=' + qa('.rec.editing').length + ' cursor kept=' + (curText() !== 'none')); press('Escape'); log.push('nav esc again clears: ' + curText());
    await go('2026-11-13'); if (act().blur) act().blur();
    const j0 = curText(); press('j'); const j1 = q('.cur') && q('.cur').classList.contains('decl'); press('j'); press('Enter'); ta = act();
    log.push('nav journal: start=' + j0 + ' first is project block=' + j1 + ' enter edits=' + (ta.tagName === 'TEXTAREA' && qa('.row.editing').length === 1));
    const before = curText(); key(ta, 'Escape'); await sleep(30); const mid = curText() + '/' + navCur; press('j'); log.push('nav journal after esc: editing=' + qa('.row.editing').length + ' before=' + before + ' mid=' + mid + ' cur=' + curText());
    // headings, o, g, ctrl+j, help
    await go('2026-11-13'); const t2 = qa('.view').find((v) => v.textContent.includes('GPU')); t2.click(); ta = act(); key(ta, 'Enter', { ctrlKey: true }); ta.blur(); await sleep(50);
    nav('Projects'); if (act().blur) act().blur();
    press('j'); const onHead = q('.cur') && q('.cur').classList.contains('pj-head'); press('Enter'); const foldedNow = qa('.pj-body').length; press('Enter');
    log.push('nav head: first is heading=' + onHead + ' enter folds=' + (foldedNow === 0) + ' enter unfolds=' + (qa('.pj-body').length > 0) + ' cursor kept=' + !!q('.pj-head.cur'));
    press('j'); const onRec = q('.cur').classList.contains('rec'); press('o'); await sleep(50);
    log.push('o: on record=' + onRec + ' jumped to journal=' + (view === 'journal') + ' editing=' + qa('.row.editing').length);
    if (act().blur) act().blur(); press('k', { ctrlKey: true }); log.push('ctrl+k journal: on project block=' + !!q('.row.decl.cur'));
    nav('Working'); if (act().blur) act().blur(); press('p'); const grouped = qa('.grp-head').length; press('j', { ctrlKey: true }); const gh = !!q('.grp-head.cur'); press('Enter'); const recsFolded = qa('#view .rec').length; press('Enter'); press('p');
    log.push('p: groups=' + grouped + ' ctrl+j on group head=' + gh + ' enter folds group (recs ' + recsFolded + ' -> ' + qa('#view .rec').length + ') g again groups=' + qa('.grp-head').length);
    press('?'); const opened = q('#help').open, rows = qa('.help-row').length; press('?'); log.push('help: opened=' + opened + ' rows=' + rows + ' closed=' + !q('#help').open);
    nav('Projects'); if (act().blur) act().blur(); press('J', { shiftKey: true }); const sj = !!q('.pj-head.cur'); press('3'); const d3 = view; press('1'); await sleep(50);
    log.push('alt keys: shift+j on heading=' + sj + ' 3=' + d3 + ' 1=' + view);
    // [[ auto close
    await go('2030-01-02'); q('#add').click(); ta = act();
    const typeCh = (ch) => { const p = ta.selectionStart; ta.value = ta.value.slice(0, p) + ch + ta.value.slice(p); ta.setSelectionRange(p + 1, p + 1); ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: ch })); };
    const hit = (k) => { const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); ta.dispatchEvent(ev); return ev.defaultPrevented; };
    typeCh('见 '); ta.value = '见 '; ta.setSelectionRange(2, 2); typeCh('['); typeCh('[');
    const paired = ta.value + ' @' + ta.selectionStart, menu = !q('#ac').hidden;
    typeCh('A'); typeCh('I'); const over1 = hit(']'), over2 = hit(']');
    log.push('pair: ' + paired + ' menu=' + menu + ' | after AI + ]]: ' + ta.value + ' @' + ta.selectionStart + ' typeover=' + over1 + ',' + over2);
    ta.value = ''; ta.setSelectionRange(0, 0); typeCh('['); typeCh('['); const bs = hit('Backspace'); log.push('pair backspace: prevented=' + bs + ' value="' + ta.value + '"');
    ta.value = ''; ta.dispatchEvent(new Event('input')); ta.blur();
    // sort order toggles
    const dates = (sel) => qa(sel).map((x) => x.textContent).join(',');
    nav('Projects'); const p0 = dates('.pj.top .pj-body > .rec .rec-date'); q('.icon-btn.sort').click(); const p1 = dates('.pj.top .pj-body > .rec .rec-date'), tip = q('.icon-btn.sort').title; q('.icon-btn.sort').click();
    log.push('sort projects: ' + p0 + ' -> ' + p1 + ' | ' + tip + ' | back=' + (dates('.pj.top .pj-body > .rec .rec-date') === p0));
    show('tag', '@Mandy'); const t0 = dates('#view .rec-date'); q('.icon-btn.sort').click(); log.push('sort tag: ' + t0 + ' -> ' + dates('#view .rec-date')); q('.icon-btn.sort').click();
    nav('Inbox'); if (act().blur) act().blur(); const i0 = q('.icon-btn.sort').title; press('s'); log.push('sort inbox + S key: ' + i0 + ' -> ' + q('.icon-btn.sort').title); press('s');
    press('f'); const n1 = q('#nav').classList.contains('narrow'), tt = q('#nav-toggle').title; press('f'); log.push('F key: narrow=' + n1 + ' tip=' + tt + ' back=' + !q('#nav').classList.contains('narrow'));
    nav('Projects'); if (act().blur) act().blur(); press('j'); const ht = q('.pj-head.cur .goto').title, hv = getComputedStyle(q('.pj-head.cur .goto')).opacity; press('o'); log.push('O on heading: tip=' + ht + ' visible=' + hv + ' -> view=' + view + ' title=' + q('.pj-head.page .pj-name').textContent + ' page icon=' + !!q('.pj-head.page .goto'));
    { // 项目页：H 隐藏 TODO / WAIT / DONE，只留事件；再按一次恢复，设置会记住
      const after = () => { const h = q('#view h2.rec-head'), out = []; for (let n = h && h.nextElementSibling; n; n = n.nextElementSibling) if (n.classList.contains('rec')) out.push(n); return out; };
      const h0 = q('#view h2.rec-head').textContent, all = after(), st0 = all.filter((r) => r.querySelector('.status')).length, tip0 = q('.rec-head .icon-btn.tasks').title;
      press('h'); const hNoop = q('.rec-head .icon-btn.tasks').getAttribute('aria-pressed'); press('e'); const h1 = q('#view h2.rec-head').textContent, left = after(), st1 = left.filter((r) => r.querySelector('.status')).length, pressed = q('.rec-head .icon-btn.tasks').getAttribute('aria-pressed'), saved = cfg.pageEvents;
      const openKept = q('#view h2').textContent;
      q('.rec-head .icon-btn.tasks').click(); const h2 = q('#view h2.rec-head').textContent;
      log.push('project hide tasks: "' + h0 + '" with status=' + st0 + ' tip=' + tip0 + ' | E -> "' + h1 + '" rows=' + left.length + '/' + all.length + ' with status=' + st1 + ' pressed=' + pressed + ' (H on project page does nothing: pressed=' + hNoop + ') saved=' + saved + ' first h2 still "' + openKept + '" | click -> "' + h2 + '" saved=' + cfg.pageEvents);
    }
    nav('Working'); if (act().blur) act().blur(); press('/'); const foc = act().id; const setQ = async (x) => { q('#q').value = x; q('#q').dispatchEvent(new Event('input')); await sleep(220); };
    await setQ('gpu'); const s1 = view + ':' + q('#view h1').textContent; await setQ('g'); const s2 = q('#view h1').textContent; await setQ(''); const s3 = view;
    await setQ('gpu'); q('#q').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(30);
    log.push('search: / focuses=' + foc + ' | ' + s1 + ' | ' + s2 + ' | cleared -> ' + s3 + ' | esc -> ' + view + ' value="' + q('#q').value + '"');
    nav('Settings'); log.push('about: ' + qa('#view .set-val').map((x) => x.textContent).join(' | '));
    nav('Working'); log.push('sort working btn: ' + q('.icon-btn.sort').title);
    if (navigator.locks) {
      const original = FS.dir;
      await openWorkspace(() => { FS.dir = { ...original, name: 'mock-demo' }; });
      await navigator.locks.request('worklog:' + original.name, { ifAvailable: true }, async (lock) => {
        if (!lock) throw new Error('Switching must release the previous workspace lock');
        await openWorkspace(() => { FS.dir = original; });
        if (!readOnly || q('#banner').hidden) throw new Error('Another tab must retain exclusive write access');
      });
      await openWorkspace(() => true);
      if (readOnly || !q('#banner').hidden) throw new Error('Rescan must reclaim a released workspace lock');
      await openWorkspace(() => { FS.dir = { ...original, name: 'mock-demo' }; });
      await openWorkspace(() => { FS.dir = original; });
      if (readOnly || !q('#banner').hidden) throw new Error('Switching back must keep the workspace writable');
      log.push('workspace locks OK');
    }
    // date picker
    const wkey = (k) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    await go('2031-03-30'); if (act().blur) act().blur(); __writes.length = 0;
    q('#title').click(); const dpOpen = !q('#dp').hidden, dpTitle = q('.dp-title').textContent, dpOn = q('.dp-day.on').textContent;
    wkey('ArrowRight'); wkey('ArrowRight'); const rolled = q('.dp-title').textContent; wkey('Enter'); await sleep(80); await saving;
    log.push('picker title: open=' + dpOpen + ' ' + dpTitle + ' day ' + dpOn + ' | two days right -> ' + rolled + ' | jumped to ' + cur + ' closed=' + q('#dp').hidden + ' | writes=' + __writes.length + ' file=' + __store.has('2031-04-01.md'));
    press('d'); const dOpen = !q('#dp').hidden; press('j'); const jBlocked = !q('.cur'); wkey('Escape'); log.push('picker D key: open=' + dOpen + ' J blocked=' + jBlocked + ' esc closes=' + q('#dp').hidden + ' still on ' + cur);
    q('#title').click(); wkey('PageUp'); const hasDot = qa('.dp-day.has').length; qa('.dp-day').find((x) => x.textContent === '15' && !x.classList.contains('out')).click(); await sleep(80);
    log.push('picker click: page ' + cur + ' | days with records marked in that month: ' + hasDot);
    await go('2026-11-13'); q('#title').click(); log.push('picker marks: ' + qa('.dp-day.has').map((x) => x.textContent).join(',')); wkey('Escape');
    // /date in the editor
    await go('2031-05-05'); q('#add').click(); ta = act();
    const typeIn = (x) => { const p0 = ta.selectionStart; ta.value = ta.value.slice(0, p0) + x + ta.value.slice(p0); ta.setSelectionRange(p0 + x.length, p0 + x.length); ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: x.slice(-1) })); };
    typeIn('Due /dat'); const early = !q('#dp').hidden; typeIn('e'); const slashOpen = !q('#dp').hidden, focusKept = act() === ta;
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const tomorrow = (() => { const d2 = new Date(); d2.setDate(d2.getDate() + 1); return d2.getFullYear() + '-' + p(d2.getMonth() + 1) + '-' + p(d2.getDate()); })();
    log.push('/date: early=' + early + ' open=' + slashOpen + ' focus kept=' + focusKept + ' -> "' + ta.value.replace(tomorrow, '<tomorrow>') + '" caret at end=' + (ta.selectionStart === ta.value.length) + ' still editing=' + (act() === ta) + ' blocks=' + qa('#editor .row').length);
    typeIn(' x/date'); const midWord = !q('#dp').hidden; typeIn(' /date'); const again = !q('#dp').hidden; ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    log.push('/date rules: inside a word=' + midWord + ' after space=' + again + ' esc keeps text=' + ta.value.endsWith(' /date') + ' closed=' + q('#dp').hidden + ' still editing=' + (act() === ta));
    ta.value = ''; ta.dispatchEvent(new Event('input')); ta.blur(); await sleep(50);
    // @name / #tag autocomplete
    await go('2031-06-06'); q('#add').click(); ta = act();
    const tIn = (x) => { const p0 = ta.selectionStart; ta.value = ta.value.slice(0, p0) + x + ta.value.slice(p0); ta.setSelectionRange(p0 + x.length, p0 + x.length); ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: x.slice(-1) })); };
    const kd = (k, o = {}) => { const ev = new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o)); ta.dispatchEvent(ev); return ev.defaultPrevented; };
    const tmenu = () => q('#tac').hidden ? 'closed' : qa('#tac .ac-title').map((x) => x.textContent).join(',');
    tIn('Ask @'); const tBare = tmenu(); tIn('m'); const m1 = tmenu(); kd('Enter');
    log.push('tag ac @: after @ alone=' + tBare + ' | @m -> ' + m1 + ' | Enter -> "' + ta.value + '" still editing=' + (act() === ta) + ' blocks=' + qa('#editor .row').length);
    tIn('about #ME'); const m2 = tmenu(); kd('Tab'); log.push('tag ac #: #ME -> ' + m2 + ' | Tab -> "' + ta.value + '"');
    tIn('and @{Li Wei} '); ta.blur(); await sleep(60); qa('.view').find((x) => x.textContent.includes('Ask')).click(); ta = act(); ta.setSelectionRange(ta.value.length, ta.value.length);
    tIn('then @we'); const m3 = tmenu(); kd('Enter'); log.push('tag ac braces: @we -> ' + m3 + ' | -> "' + ta.value.slice(ta.value.indexOf('then')) + '"');
    tIn('mail a@b'); const tEmail = tmenu(); tIn(' x#1'); const tMid = tmenu(); tIn(' @Steve'); const tExact = tmenu(); tIn(' @Zz'); const tNone = tmenu();
    log.push('tag ac rules: email=' + tEmail + ' inside word=' + tMid + ' exact only=' + tExact + ' unknown=' + tNone);
    tIn(' @J'); const m4 = tmenu(); const escd = kd('Escape'); log.push('tag ac esc: ' + m4 + ' -> ' + tmenu() + ' prevented=' + escd + ' still editing=' + (act() === ta) + ' text kept=' + ta.value.endsWith('@J'));
    ta.value = ''; ta.dispatchEvent(new Event('input')); ta.blur(); await sleep(50);
    // also in list-page inline edit
    show('tag', '@Mandy'); const rr = q('#view .rec.editable'); rr.click(); ta = act(); ta.setSelectionRange(ta.value.length, ta.value.length);
    const before2 = ta.value; tIn(' cc @st'); const m5 = tmenu(); kd('Enter'); log.push('tag ac in list edit: ' + m5 + ' -> ends "' + ta.value.slice(before2.length) + '" still editing=' + (act() === ta));
    ta.value = before2; ta.blur(); await sleep(60); await saving;
    // gg / Shift+G / Shift+M
    show('search', 'e'); if (act().blur) act().blur(); await sleep(30);
    const all = navItems(), idx = () => all.indexOf(q('.cur')); const nItems = all.length;
    press('G', { shiftKey: true }); const last = idx(); press('g'); const afterOneG = idx(); press('g'); const first = idx();
    press('g'); await sleep(700); press('g'); const slowGG = idx();
    press('G', { shiftKey: true }); press('g'); press('j'); press('g'); const brokenGG = idx();
    q('#view').scrollTop = 0; press('M', { shiftKey: true }); const mi = idx(), mr = q('.cur') && q('.cur').getBoundingClientRect(), vb = q('#view').getBoundingClientRect();
    press('p'); const pOnSearch = qa('.grp-head').length;
    log.push('gg/G/M: items=' + nItems + ' G->' + last + ' one g stays=' + (afterOneG === last) + ' gg->' + first + ' slow gg (700ms apart) stays=' + (slowGG === first) + ' g,j,g not gg=' + (brokenGG !== 0) + ' | M->' + mi + ' visible=' + !!(mr && mr.top >= vb.top && mr.bottom <= vb.bottom) + ' | P on search page does nothing=' + (pOnSearch === 0));
    await go('2026-11-13'); if (act().blur) act().blur(); const jRows = navItems(); press('G', { shiftKey: true }); const jl = jRows.indexOf(q('.cur')); press('g'); press('g'); log.push('gg/G journal: rows=' + jRows.length + ' G->' + jl + ' gg->' + jRows.indexOf(q('.cur')));
    log.push('version: ' + qa('#view').length + ' ' + APP_VERSION);
    // 跳转日期时，某一天的文件读不到（比如数据文件夹在应用开着时被替换）：标题、正文、文件名、Source 仍是同一天，并给出提示
    { await go('2026-11-14'); await sleep(50); if (!showSide) q('#side-toggle').click();
      const ent = FS.files.get('2026-11-13'), keep = ent.handle;
      ent.handle = { getFile: async () => { const x = new Error('A requested file or directory could not be found'); x.name = 'NotFoundError'; throw x; } };
      q('#prev').click(); await sleep(250);
      const st = 'file=' + q('#file').textContent.slice(5, 15) + ' title=' + q('#title').textContent.slice(0, 10) + ' source=' + (q('#raw').textContent.match(/Journal (\S+)/) || [])[1] + ' body has 11-13 record=' + q('#editor').textContent.includes('GPU');
      const bn = q('#banner').hidden ? 'none' : q('#banner').textContent.slice(0, 44);
      ent.handle = keep; banner(); q('#side-toggle').click();
      log.push('nav onto unreadable file: ' + st + ' banner="' + bn + '…"'); }
    // 只改文字的编辑：列表页原地编辑也要写回文件，索引立即更新（0.32 之前漏掉了）
    { show('working'); await sleep(50); const r0 = q('#view .rec.editable'); r0.click(); ta = act(); const was = ta.value; ta.value = was + ' @Zed'; ta.dispatchEvent(new Event('input')); ta.blur(); await sleep(150); await saving;
      const saved = [...__store.values()].some((f) => f.text && f.text.includes(' @Zed'));
      log.push('text-only edit: list inline saved to file=' + saved + ' tag index updated=' + (recordsByTag(S, '@Zed').length === 1));
      const r1 = qa('#view .rec.editable').find((x) => x.textContent.includes('@Zed')); r1.click(); ta = act(); ta.value = was; ta.dispatchEvent(new Event('input')); ta.blur(); await sleep(150); await saving; }
    // ---- block 引用 ----
    { await go('2031-07-01'); q('#add').click(); ta = act();
      const tIn2 = (x) => { const p0 = ta.selectionStart; ta.value = ta.value.slice(0, p0) + x + ta.value.slice(p0); ta.setSelectionRange(p0 + x.length, p0 + x.length); ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: x.slice(-1) })); };
      const kd2 = (k) => { const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); ta.dispatchEvent(ev); return ev.defaultPrevented; };
      const rmenu = () => q('#rac').hidden ? 'closed' : qa('#rac .ac-item').map((x) => x.textContent).join(' | ');
      tIn2('需要进一步确认方案 ABC 的可能性'); kd2('Enter'); await sleep(30); ta = act();   // 原记录（还没保存，也就还没有 ID）
      tIn2('('); tIn2('(');
      const paired = ta.value + ' @' + ta.selectionStart, recent = rmenu().slice(0, 40);
      tIn2('方案 ABC'); const m1 = rmenu(); tIn2(' 可能'); const m2 = rmenu();
      const prevented = kd2('Enter'); await sleep(30);
      const own = S.pages[cur].find((x) => x.text.startsWith('需要进一步')), refId = (ta.value.match(/\(\(([A-Za-z0-9_-]{10})\)\)/) || [])[1];
      log.push('ref (( pair: "' + paired + '" recent shows=' + recent);
      log.push('ref search: "方案 ABC" -> ' + m1.slice(0, 60) + ' | "方案 ABC 可能" -> ' + m2.slice(0, 40) + ' | Enter prevented=' + prevented + ' -> text="' + ta.value.replace(refId, 'ID') + '" original got id=' + (!!own.id && own.id === refId) + ' caret at end=' + (ta.selectionStart === ta.value.length));
      tIn2(' -> #decision 放弃'); const typeover = (() => { tIn2(' x(('); tIn2('zz'); const r = kd2(')'); return r && ta.value.slice(ta.selectionStart - 1, ta.selectionStart) === ')'; })();
      ta.value = ta.value.replace(' x((zz))', ''); ta.dispatchEvent(new Event('input'));
      tIn2(' (('); const bs = kd2('Backspace'); log.push('ref keys: ) types over=' + typeover + ' backspace removes pair=' + bs + ' value ends="' + ta.value.slice(-6) + '"');
      const keepText = ta.value; tIn2('(XYZW'); const none = rmenu(); kd2('Escape'); log.push('ref no match: ' + none + ' esc closes=' + q('#rac').hidden + ' still editing=' + (act() === ta));
      ta.value = keepText.replace(/ \($/, ''); ta.dispatchEvent(new Event('input')); ta.blur(); await sleep(150); await saving;
      const quote = qa('#editor .qref').map((x) => x.textContent + (x.title ? ' [' + x.title.replace(/\d{4}-\d\d-\d\d/, 'DATE') + ']' : ''));
      const blBtn = q('#editor .bl');
      log.push('ref display: ' + quote.join(' ; ') + ' | backlink=' + (blBtn && blBtn.textContent) + ' file has ref=' + /\(\([A-Za-z0-9_-]{10}\)\) -> #decision/.test((__store.get('2031-07-01.md') || {}).text || '') + ' file=' + JSON.stringify(((__store.get('2031-07-01.md') || {}).text || '').split('\n').slice(3).join(' / ').replace(/\(\([A-Za-z0-9_-]{10}\)\)/g, '((ID))').slice(0, 160)));
      blBtn.click(); await sleep(30); const bl = qa('#blp .ac-item').map((x) => x.textContent).join(' | '); const blOpen = !q('#blp').hidden;
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); log.push('ref backlinks: open=' + blOpen + ' rows="' + bl + '" esc closes=' + q('#blp').hidden);
      { // 键盘：焦点在被引用的记录上按 R 打开列表，J 下移，再按 R 关闭；列表页同样有效
        const key = (k, sh) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: 'Key' + k.toUpperCase(), shiftKey: !!sh, bubbles: true, cancelable: true }));
        const isOrig = () => { const c = q('#editor .cur'); const t = c && c.querySelector('.view').textContent; return !!t && t.includes('需要进一步') && !t.includes('“'); };
        key('g'); key('g'); for (let i = 0; i < 30 && !isOrig(); i++) key('j');
        key('r'); await sleep(20); const kOpen = !q('#blp').hidden, kRows = qa('#blp .ac-item').length; key('j'); const kSel = qa('#blp .ac-item').findIndex((x) => x.classList.contains('on')); const stay = isOrig();
        key('r'); const kClosed = q('#blp').hidden;
        for (let i = 0; i < 30 && q('#editor .cur') && !q('#editor .cur .view').textContent.startsWith('看'); i++) key('j');
        key('r'); const noBl = q('#blp').hidden;
        show('search', '需要进一步'); await sleep(50); if (act().blur) act().blur();   // 搜索框里按的键归搜索框
        const lrow = qa('#view .rec').find((x) => x.textContent.includes('需要进一步') && x.querySelector('.bl'));
        for (let i = 0; i < 20 && !(q('#view .rec.cur') && q('#view .rec.cur') === lrow); i++) key('j');
        key('r'); await sleep(20); const lOpen = !q('#blp').hidden; key('r');
        log.push('ref R key: on original open=' + kOpen + ' rows=' + kRows + ' J moves in list sel=' + kSel + ' cursor kept=' + stay + ' R closes=' + kClosed + ' | other record stays closed=' + noBl + ' | list view: marker=' + (lrow && lrow.querySelector('.bl').textContent) + ' tip="' + (lrow && lrow.querySelector('.bl').title) + '" R opens=' + lOpen + ' closed=' + q('#blp').hidden);
        await go('2031-07-01');
      }
      // 改原记录，引用处同步变；点击引文跳回原记录
      qa('#editor .view').find((x) => x.textContent.startsWith('需要进一步')).click(); ta = act(); ta.value = '需要进一步确认方案 ABC 和 D 的可能性'; ta.dispatchEvent(new Event('input')); ta.blur(); await sleep(80);
      log.push('ref live update: ' + q('#editor .qref').textContent);
      await go('2031-07-02'); q('#add').click(); ta = act(); tIn2('看 (('); tIn2('ABC 和 D'); kd2('Enter'); ta.blur(); await sleep(80);
      q('#editor .qref').click(); await sleep(80); log.push('ref click jumps: page=' + cur + ' focused original=' + (act().value || '').startsWith('需要进一步确认'));
      if (act().blur) act().blur();
      show('search', '看'); await sleep(50); log.push('ref in list views: ' + qa('#view .qref').map((x) => x.textContent).join(' ; '));
      await go('2031-07-01'); const delBtn = qa('#editor .row').find((x) => x.querySelector('.view').textContent.startsWith('需要进一步')).querySelector('.mini.del'); delBtn.click(); await sleep(80);
      log.push('ref delete original: toast="' + q('#toast').textContent + '" quotes=' + qa('#editor .qref').map((x) => x.className + ':' + x.textContent).join(' ; ') + ' orig.del=' + (S.pages[cur].find((x) => x.text.startsWith('需要进一步')) || {}).del);
    }
    // ---- 行内代码 ----
    { await go('2031-07-03'); q('#add').click(); let ta = act();
      const tIn = (x) => { for (const ch of x) { const p0 = ta.selectionStart; ta.value = ta.value.slice(0, p0) + ch + ta.value.slice(ta.selectionEnd); ta.setSelectionRange(p0 + 1, p0 + 1); ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: ch })); } };
      const kd = (k) => { const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); ta.dispatchEvent(ev); return ev.defaultPrevented; };
      const tick = () => { if (!kd('`')) tIn('`'); };   // 没被接管的按键就照常输入
      tIn('run '); tick(); const paired = ta.value + '@' + ta.selectionStart;
      tIn('git @Ma'); const tagMenu = !q('#tac').hidden; tIn(' (('); const refMenu = !q('#rac').hidden, noAuto = !ta.value.includes('(())'); tIn(' /date'); const picker = !q('#dp').hidden;
      tick(); const over = ta.value.endsWith('/date`') && ta.selectionStart === ta.value.length;
      tIn(' @Ma'); const tagAfter = !q('#tac').hidden; kd('Escape');
      tIn(' '); tick(); const bsPair = kd('Backspace'), afterBs = ta.value.slice(-3);
      tIn(' wrap'); ta.setSelectionRange(ta.value.length - 4, ta.value.length); tick(); const wrapped = ta.value.endsWith('`wrap`');
      // 代码里写了 (( / @ / [[，光标移到代码后面继续打字，不能把它们当成触发
      const leak = []; for (const t of ['((', '@Ma', '[[Al']) { ta.setSelectionRange(ta.value.length, ta.value.length); tIn(' '); tick(); tIn(t); const end = ta.value.length; ta.setSelectionRange(end, end); tIn(' x'); leak.push(t + ':' + [!q('#rac').hidden, !q('#tac').hidden, !q('#ac').hidden].map(Number).join('')); }
      log.push('inline code after closing: menus(ref,tag,project) ' + leak.join(' ') + ' value tail="' + ta.value.slice(-22) + '"');
      ta.value = ta.value.replace(/ `\(\(` x `@Ma` x `\[\[Al` x$/, ''); ta.dispatchEvent(new Event('input'));
      ta.blur(); await sleep(120);
      const view = qa('#editor .view').find((x) => x.textContent.startsWith('run ')), codes = view ? [...view.querySelectorAll('code')].map((x) => x.textContent) : [];
      log.push('inline code: pair="' + paired + '" in code: tag menu=' + tagMenu + ' ref menu=' + refMenu + ' no (()) pair=' + noAuto + ' date picker=' + picker + ' | ` types over=' + over + ' | after code: tag menu=' + tagAfter + ' | empty pair backspace=' + bsPair + ' "' + afterBs + '" | wrap selection=' + wrapped);
      log.push('inline code render: code=' + JSON.stringify(codes) + ' person spans outside=' + (view ? view.querySelectorAll('.person').length : -1) + ' tag @Ma indexed=' + recordsByTag(S, '@Ma').length);
    }
    // ---- 移动记录 ----
    { await go('2031-07-05'); q('#add').click(); let ta = act();
      const k = (key, o = {}) => { const ev = new KeyboardEvent('keydown', { key, code: o.code, altKey: !!o.alt, shiftKey: !!o.shift, bubbles: true, cancelable: true }); act().dispatchEvent(ev); return ev.defaultPrevented; };
      for (const t of ['mv-A', 'mv-B', 'mv-C']) { ta = act(); ta.value = t; ta.dispatchEvent(new Event('input')); if (t !== 'mv-C') k('Enter'); }
      const order = () => S.pages[cur].filter((b) => /^mv-/.test(b.text)).map((b) => b.text).join(',');
      act().blur(); await sleep(30); S.pages[cur] = S.pages[cur].filter((b) => b.text); bump(S); render(S.pages[cur].find((b) => b.text === 'mv-B').key, 0);   // 去掉新页面自带的空行，只留三条
      const o0 = order(); k('ArrowUp', { alt: true, shift: true }); const o1 = order(), f1 = act().value;
      const kPrevented = k('Ô', { alt: true, shift: true, code: 'KeyK' }); const o2 = order(), txt = act().value;   // Mac 上 Option+Shift+K 的 key 不是 k
      q('#toast').textContent = ''; k('Ô', { alt: true, shift: true, code: 'KeyK' }); const edge = q('#toast').textContent;
      log.push('move while editing: ' + o0 + ' -> Alt+Shift+Up -> ' + o1 + ' focus="' + f1 + '" | Alt+Shift+K -> ' + o2 + ' text kept="' + txt + '" prevented=' + kPrevented + ' | at top: toast="' + edge + '"');
      act().blur(); await sleep(50);
      { // 选中状态：J/K 选到 mv-B，Alt+Shift+J 下移，焦点跟着走
        const kb = (key, o = {}) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key, code: o.code || 'Key' + key.toUpperCase(), altKey: !!o.alt, shiftKey: !!o.shift, bubbles: true, cancelable: true }));
        const curText = () => { const c = q('#editor .row.cur .view'); return c && c.textContent; };
        kb('g'); kb('g'); for (let i = 0; i < 40 && curText() !== 'mv-B'; i++) kb('j');
        kb('Ô', { alt: true, shift: true, code: 'KeyJ' }); const s1 = order(), c1 = curText(), editing = !!q('#editor textarea:focus');
        kb('ArrowDown', { alt: true, shift: true, code: 'ArrowDown' }); const s2 = order(), c2 = curText();
        log.push('move while selected: Alt+Shift+J -> ' + s1 + ' cursor="' + c1 + '" editing=' + editing + ' | Alt+Shift+Down -> ' + s2 + ' cursor="' + c2 + '"');
      }
      { // 拖动圆点：把 mv-A 拖到 mv-B 前面；拖动中有插入线；Esc 取消
        const blk = (t) => qa('#editor .block').find((x) => x.querySelector(':scope > .row .view') && x.querySelector(':scope > .row .view').textContent === t);
        const pe = (type, el, y) => (el || window).dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 30, clientY: y, pointerId: 1 }));
        const drag = (from, to, cancel) => { const b = blk(from).querySelector(':scope > .row .bullet'), r = b.getBoundingClientRect(), t = blk(to).getBoundingClientRect();
          pe('pointerdown', b, r.top + 2); pe('pointermove', null, r.top + 12); pe('pointermove', null, t.top + 3); const lineShown = !q('#dropline').hidden, dim = blk(from).classList.contains('dragging');
          if (cancel) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); else pe('pointerup', null, t.top + 3); return lineShown + '/' + dim; };
        const before = order(), d1 = drag('mv-A', 'mv-B'), after1 = order(), d2 = drag('mv-B', 'mv-C', true), after2 = order(), grip = getComputedStyle(blk('mv-A').querySelector('.bullet')).cursor;
        log.push('drag dot: ' + before + ' -> drag mv-A onto mv-B -> ' + after1 + ' (line/dim ' + d1 + ') | Esc cancels -> ' + after2 + ' line hidden=' + q('#dropline').hidden + ' cursor=' + grip);
      }
    }
    // ---- Journal 折叠 ----
    { const day = Object.keys(S.pages).sort().find((d) => S.pages[d].filter((b) => b.children.length).length >= 1 && S.pages[d].length >= 2);
      await go(day); if (act().blur) act().blur();
      const press = (k) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: 'Key' + k.toUpperCase(), bubbles: true, cancelable: true }));
      const tops = S.pages[cur].filter((b) => b.children.length), kidsShown = () => qa('#editor > .list > .block > .kids').length;
      const k0 = kidsShown(), btn = !q('#jfold').hidden, t0 = q('#jfold').title;
      press('z'); const k1 = kidsShown(), more = qa('#editor .jmore').map((x) => x.textContent).join(' '), t1 = q('#jfold').title, ring = getComputedStyle(q('#editor .block.shut > .row .bullet')).boxShadow !== 'none';
      press('z'); const k2 = kidsShown();
      q('#editor .jchev').click(); const one = qa('#editor .block.shut').length;
      const hidden = tops[0].children[0]; await go(day, hidden.key); const back = !jFold.has(tops[0].key) && !!q(`#editor .block[data-key="${hidden.key}"]`); if (act().blur) act().blur();
      log.push('journal fold: button=' + btn + ' tip=' + t0 + ' | Z -> kids shown ' + k0 + '->' + k1 + ' of ' + tops.length + ' more=[' + more + '] tip=' + t1 + ' halo=' + ring + ' | Z -> ' + k2 + ' | chevron folds one=' + one + ' | jump into hidden child unfolds=' + back);
      await go('2031-07-05'); log.push('journal fold: page without children shows button=' + !q('#jfold').hidden);
    }
    { // 代码段和引文混在一起时，每个代码段只渲染一次
      await go('2031-07-06'); q('#add').click(); let ta = act(); ta.value = 'target with `inner code`'; ta.dispatchEvent(new Event('input')); ta.blur(); await sleep(60);
      const tgt = S.pages[cur].find((b) => b.text === 'target with `inner code`'); ensureIds(S, today(), cur); bump(S);
      q('#add').click(); ta = act(); ta.value = '`npm run build -- --watch --verbose` then ((' + tgt.id + ')) and `git push origin main --force-with-lease`'; ta.dispatchEvent(new Event('input')); ta.blur(); await sleep(60);
      const v = qa('#editor .view').find((x) => x.textContent.startsWith('npm run')), codes = v ? [...v.querySelectorAll('code')].map((x) => x.textContent) : [];
      log.push('inline code with quote: codes=' + JSON.stringify(codes) + ' quote="' + (v && v.querySelector('.qref') ? v.querySelector('.qref').textContent : '') + '"');
    }
    // ---- Working 一栏全宽 ----
    { const kb = (k) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: 'Key' + k.toUpperCase(), bubbles: true, cancelable: true }));
      const w0 = cfg.workOnly; cfg.workOnly = null; show('working'); if (act().blur) act().blur();
      const st = () => (cfg.workOnly || 'both') + '[' + qa('#view .cols > *').map((x) => x.classList.contains('rail') ? 'rail:' + x.textContent : 'col:' + x.querySelector('.col-head').textContent).join(',') + ']';
      const out = [st(), q('#view .col-head').title];
      kb('t'); out.push('T ' + st() + ' tip=' + q('#view .col-head').title + ' rail tip=' + q('#view .rail').title);
      kb('w'); out.push('W ' + st()); kb('w'); out.push('W ' + st());
      kb('w'); q('#view .rail').click(); out.push('rail click ' + st()); q('#view .col-head').click(); out.push('head click ' + st());
      kb('t'); const saved = JSON.parse(localStorage.getItem('worklog-cfg') || '{}').workOnly; cfg.workOnly = w0; saveCfg(); drawView();
      log.push('working full width: ' + out.join(' | ') + ' | saved=' + saved);
    }
    // ---- 复制 Journal ----
    { const got = []; navigator.clipboard.write = async (items) => { for (const it of items) got.push({ text: await (await it.getType('text/plain')).text(), html: await (await it.getType('text/html')).text() }); };
      navigator.clipboard.writeText = async (t) => { got.push({ text: t }); };
      const kb = (k, sh) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: 'KeyY', shiftKey: !!sh, bubbles: true, cancelable: true }));
      await go('2031-07-06'); if (act().blur) act().blur(); navCur = null; setCur(null);
      q('#copy').click(); await sleep(30); const t1 = q('#toast').textContent, c1 = got[got.length - 1];
      kb('Y', true); await sleep(30); const t2 = q('#toast').textContent, c2 = got[got.length - 1];
      log.push('copy as text: toast="' + t1 + '" btn=' + q('#copy').classList.contains('done') + ' text=' + JSON.stringify(c1.text) + ' html has <ul>=' + /<ul>/.test(c1.html) + ' <code>=' + /<code>/.test(c1.html));
      log.push('copy for roam (Shift+Y): toast="' + t2 + '" text=' + JSON.stringify(c2.text) + ' help lists Shift+Y=' + /Shift\+Y/.test(q('#help').textContent));
    }
    // ---- 翻日快捷键 ----
    { const kb = (key, o = {}) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key, code: o.code || (key.length === 1 ? 'Key' + key.toUpperCase() : key), shiftKey: !!o.shift, bubbles: true, cancelable: true }));
      const days = Object.keys(S.pages).filter((d) => /^\d{4}-\d\d-\d\d$/.test(d) && S.pages[d].some(hasContent)).sort();
      const mid = days[Math.floor(days.length / 2)]; await go(mid); if (act().blur) act().blur();
      const out = [];
      kb('l'); await sleep(30); out.push('L=' + cur); kb('h'); await sleep(30); out.push('H=' + cur); kb('ArrowRight'); await sleep(30); out.push('→=' + cur); kb('ArrowLeft'); await sleep(30); out.push('←=' + cur);
      kb('L', { shift: true }); await sleep(30); out.push('Shift+L=' + cur + (cur === days[days.indexOf(mid) + 1] ? ' (next with records)' : ' WRONG'));
      kb('H', { shift: true }); await sleep(30); out.push('Shift+H=' + cur);
      await go(days[0]); q('#toast').textContent = ''; kb('H', { shift: true }); await sleep(30); out.push('first day Shift+H stays=' + (cur === days[0]) + ' toast="' + q('#toast').textContent + '"');
      kb('t'); await sleep(30); out.push('T=' + (cur === today() ? 'today' : cur));
      out.push('tips=' + ['#prev', '#next', '#today'].map((x) => q(x).title).join(' / '));
      log.push('day keys: mid=' + mid + ' ' + out.join(' | '));
    }
    // ---- backups ----
    const bkMap = () => window.__subs.get('backups') || new Map(), bkNames = () => [...bkMap().keys()].sort();
    const T0 = today(), mdCount = () => [...__store.keys()].filter((k) => /\.md$/.test(k)).length;
    { const first = bkNames(), b = bkMap().get(T0 + '.worklog.gz'), parsed = b && BK.parse(await BK.gunzip(b.blob));
      const sample = parsed && parsed.files.find(([n]) => n === '2026-11-13.md');
      log.push('backup daily: names=' + first.join(',').replace(new RegExp(T0, 'g'), 'TODAY') + ' files in backup=' + (parsed && parsed.files.length) + ' gz bytes=' + (b && b.blob.size) + ' sample matches a real file=' + !!(sample && sample[1].includes('[[PJ/AI-Sandbox]]'))); }
    { const tricky = [['2026-01-01.md', 'line\n--- 2026-01-02.md 5\nabcde\n'], ['2026-01-02.md', ''], ['2026-01-03.md', '中文 @{Li Wei}\n']];
      const back = BK.parse(await BK.gunzip(await BK.gzip(BK.bundle(tricky)))).files;
      log.push('backup format: round-trip with tricky content=' + (JSON.stringify(back) === JSON.stringify(tricky))); }
    show('issues'); await sleep(120);
    { const before = bkNames().length, btn = qa('.btn').find((x) => x.textContent === 'Back up now'); btn.click(); await sleep(250);
      log.push('backup now: ' + before + ' -> ' + bkNames().length + ' rows listed=' + qa('.bk-row').length + ' browser copy row=' + qa('.bk-name').some((x) => x.textContent === 'Browser copy')); }
    { const one = await BK.gzip(BK.bundle([['2026-01-01.md', 'x\n']]));
      for (let d = 1; d <= 16; d++) bkMap().set(`2026-01-${p(d)}.worklog.gz`, { blob: one, mtime: d });
      await BK.prune(); const left = bkNames();
      log.push('backup keep 14: total=' + left.length + ' oldest kept=' + left[0] + ' today kept=' + left.some((n) => n.startsWith(T0))); }
    { const copy = await BK.browserCopy(); log.push('backup browser copy: files=' + (copy && copy.files) + ' blob=' + !!(copy && copy.blob && copy.blob.size)); }
    { let got = null; const orig = URL.createObjectURL; URL.createObjectURL = (b) => { got = b; return orig.call(URL, b); };
      show('settings'); await sleep(50); qa('.btn').find((x) => x.textContent === 'Export backup').click(); await sleep(250); URL.createObjectURL = orig;
      const files = got && BK.parse(await BK.gunzip(got)).files.length;
      log.push('backup export: toast=' + q('#toast').textContent.replace(/\d{4}-\d\d-\d\d-\d{4}/, 'STAMP') + ' files=' + files + ' (data has ' + mdCount() + ')'); }
    // 数据被空文件夹覆盖：打开时拦住，不写任何东西，可以从备份恢复
    { const saved = new Map(__store), nBefore = mdCount(); __store.clear(); __writes.length = 0;
      await start(); await sleep(50);
      const msg = q('#banner').hidden ? 'no banner' : q('#banner').textContent;
      await go('2032-02-02'); q('#add').click(); ta = act(); const canEdit = ta.tagName === 'TEXTAREA' && !ta.readOnly; if (canEdit) { type(ta, 'typed while held'); ta.blur(); } await sleep(150); await saving;
      log.push('backup guard: banner="' + msg.slice(0, 70) + '…" readOnly=' + readOnly + ' writes while held=' + __writes.filter((w) => !w.startsWith('backups/')).length);
      qa('#banner .btn').find((x) => x.textContent === 'Restore a backup').click(); await sleep(150);
      const rows = qa('.bk-row'), newest = rows[0], newestName = newest.querySelector('.bk-name').textContent, rb = newest.querySelector('.mini');
      const want = BK.parse(await BK.gunzip(bkMap().get(newestName + '.worklog.gz').blob)).files;
      rb.click(); const armed = rb.textContent; rb.click(); await sleep(500); await saving;
      log.push('backup restore: newest listed first=' + /-\d{4}$/.test(newestName) + ' armed="' + armed + '" files ' + 0 + ' -> ' + mdCount() + ' (had ' + nBefore + ') banner hidden=' + q('#banner').hidden + ' readOnly=' + readOnly + ' view=' + view + ' toast=' + q('#toast').textContent.replace(new RegExp(T0, 'g'), 'TODAY') + ' before-restore backup made=' + bkNames().some((n) => n.includes('before-restore')));
      const same = want.length > 0 && want.every(([n, text]) => __store.has(n) && __store.get(n).text === text);
      log.push('backup restore content: restored files identical to backup=' + same);
      // 少了一半以上 → 同样拦住；选择"保持现状"后恢复可写，并记住新的规模
      const keys = [...__store.keys()]; keys.slice(0, Math.floor(keys.length * 0.7)).forEach((k) => __store.delete(k));
      await start(); await sleep(50); const held = !q('#banner').hidden && readOnly;
      qa('#banner .btn').find((x) => x.textContent === 'Keep as is').click(); await sleep(50);
      const remembered = JSON.parse(localStorage.getItem('worklog-ws:' + FS.where));
      log.push('backup keep as is: held=' + held + ' -> banner hidden=' + q('#banner').hidden + ' readOnly=' + readOnly + ' remembered files=' + remembered.files + ' (now ' + mdCount() + ')');
      for (const [k, val] of saved) __store.set(k, val); await start(); await sleep(50);
    }
    if (window.__final) window.__final();
  } catch (e) { log.push('ERROR ' + e.stack); }
  const out = document.createElement('pre'); out.id = 'SMOKE'; out.textContent = log.join('\n'); document.body.appendChild(out);
})();
window.onerror = (m) => { const x = document.createElement('pre'); x.id = 'ERR'; x.textContent = 'JSERR ' + m; document.body.appendChild(x); };
