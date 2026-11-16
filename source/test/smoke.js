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
    nav('Working'); if (act().blur) act().blur(); press('g'); const grouped = qa('.grp-head').length; press('j', { ctrlKey: true }); const gh = !!q('.grp-head.cur'); press('Enter'); const recsFolded = qa('#view .rec').length; press('Enter'); press('g');
    log.push('g: groups=' + grouped + ' ctrl+j on group head=' + gh + ' enter folds group (recs ' + recsFolded + ' -> ' + qa('#view .rec').length + ') g again groups=' + qa('.grp-head').length);
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
    if (window.__final) window.__final();
  } catch (e) { log.push('ERROR ' + e.stack); }
  const out = document.createElement('pre'); out.id = 'SMOKE'; out.textContent = log.join('\n'); document.body.appendChild(out);
})();
window.onerror = (m) => { const x = document.createElement('pre'); x.id = 'ERR'; x.textContent = 'JSERR ' + m; document.body.appendChild(x); };
