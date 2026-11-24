// 性能基准：在 5 万条记录上量常用操作的耗时（毫秒）。由 test/perf.sh 生成数据并运行
(async function () { const R = {}; try {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];
  const T = (name, fn, n = 1) => { try { const t0 = performance.now(); for (let i = 0; i < n; i++) fn(i); R[name] = +((performance.now() - t0) / n).toFixed(2); } catch (e) { R[name] = 'n/a'; } };
  const t0 = performance.now();
  for (const k in window.__F) __ext(k, window.__F[k]);
  document.dispatchEvent(new Event('DOMContentLoaded'));
  for (let i = 0; i < 400 && !q('#stats').textContent; i++) await sleep(25);
  R.startup_ms = Math.round(performance.now() - t0); R.stats_bar = q('#stats').textContent;
  const has = (f) => typeof window[f] === 'function' || (() => { try { return typeof eval(f) === 'function'; } catch (e) { return false; } })();
  const days = Object.keys(S.pages).filter((d) => S.pages[d].length > 6).sort(); const day = days[days.length - 5];
  await go(day); await sleep(50);
  T('index_rebuild', () => { bump(S); index(S); }, 5);
  T('index_plus_stats_rebuild', () => { bump(S); stats(S, today()); }, 5);
  T('journal_render', () => render(), 20);
  T('journal_render_after_bump', () => { bump(S); render(); }, 5);
  T('drawNav', () => drawNav(), 20);
  // 打字：在一条记录里连续输入
  let b = null; const wk = (l) => { for (const x of l) { if (!b && x.type === 'ord' && x.text && !x.status) b = x; wk(x.children); } }; wk(S.pages[day]); render(b.key, 0); const ta = document.activeElement;
  T('keystroke_input', (i) => { ta.value = ta.value + 'x'; ta.setSelectionRange(ta.value.length, ta.value.length); ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: 'x' })); }, 50);
  T('keystroke_input_@tag', (i) => { ta.value = ta.value + (i === 0 ? ' @M' : 'a'); ta.setSelectionRange(ta.value.length, ta.value.length); ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: 'a' })); }, 10);
  T('keystroke_input_((ref', (i) => { ta.value = ta.value + (i === 0 ? ' ((' : 'e'); ta.setSelectionRange(ta.value.length - (i === 0 ? 0 : 0), ta.value.length); ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: i === 0 ? '(' : 'e' })); }, 10);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  T('blur_commit', () => { ta.blur(); }, 1);
  await sleep(50);
  { render(b.key, 0); const t2 = document.activeElement; T('blur_no_change', () => t2.blur(), 1); }
  await sleep(30);
  { render(b.key, 0); let t3 = document.activeElement; const t0 = performance.now(); for (let i = 0; i < 5; i++) { t3 = document.activeElement; t3.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); } R.enter_new_block = +((performance.now() - t0) / 5).toFixed(2); document.activeElement.blur(); }
  await sleep(30);
  await sleep(50);
  // 键盘导航、移动、折叠、复制、翻日
  const kb = (key, o = {}) => document.body.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key, code: key.length === 1 ? 'Key' + key.toUpperCase() : key, bubbles: true, cancelable: true }, o)));
  T('nav_J', () => kb('j'), 20);
  T('move_alt_shift_J', () => kb('Ô', { code: 'KeyJ', altKey: true, shiftKey: true }), 5);
  T('fold_all_Z', () => kb('z'), 4);
  T('export_text', () => exportJournal(false), 5);
  T('export_roam', () => exportJournal(true), 5);
  T('jumpDay_scan', () => { const d = Object.keys(S.pages).filter((x) => x < cur && S.pages[x].some(hasContent)).sort(); }, 5);
  // 各视图
  const V = async (name, fn) => { try { const t = performance.now(); fn(); R[name] = +(performance.now() - t).toFixed(1); } catch (e) { R[name] = 'n/a'; } await sleep(30); };
  cfg.fold = {}; cfg.lifeline = 'text';
  await V('view_projects_text_expanded', () => show('projects'));
  for (const id of stats(S, today()).tops) cfg.fold[id] = 1;
  await V('view_projects_text_folded', () => show('projects'));
  cfg.lifeline = 'graph'; await V('view_projects_graph', () => show('projects')); cfg.lifeline = 'text';
  const pid = stats(S, today()).tops[0];
  cfg.pageEvents = false; await V('view_project_page', () => show('project', pid));
  await V('view_working', () => show('working'));
  cfg.workGroup = true; await V('view_working_grouped', () => show('working')); cfg.workGroup = false;
  await V('view_tag_@Mandy', () => show('tag', '@Mandy'));
  cfg.tagGroup = true; await V('view_tag_@Mandy_grouped', () => show('tag', '@Mandy')); cfg.tagGroup = false;
  await V('view_tag_#meeting', () => show('tag', '#meeting'));
  await V('view_search_review', () => show('search', 'review'));
  await V('view_inbox', () => show('inbox'));
  await V('view_archive', () => show('archive'));
  R.dom_nodes_last_view = document.getElementsByTagName('*').length;
  show('tag', '@Mandy'); R.tag_mandy_rows = qa('#view .rec').length;
  show('projects'); R.projects_rows = qa('#view .rec').length;
} catch (e) { R.ERROR = String(e && e.stack || e); }
const out = document.createElement('pre'); out.id = R.ERROR ? 'ERR' : 'SMOKE'; out.textContent = Object.entries(R).map(([k, v]) => k.padEnd(30) + ' ' + v).join('\n'); document.body.appendChild(out);
})();
