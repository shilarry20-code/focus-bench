/* ---------- study guides: write them, or import ones made elsewhere (Markdown, text or JSON) ---------- */
// A guide is Markdown with a few extras: "- [ ]" checklists, and "Q:" / "A:" pairs that hide the answer
// until clicked. Guides live in IndexedDB (falling back to localStorage) and are part of backups.
let GUIDES = [], guidesReady = false, gView = null, gEdit = null, gImportFound = [];
const GF = {q: '', cls: 'all'};
const gid = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function loadGuides(){
  const fromLS = () => { GUIDES = store.get('fb.guides', []); };
  return IDB.get('guides').then(v => { if (Array.isArray(v)) GUIDES = v; else fromLS(); }, fromLS)
    .then(() => { guidesReady = true; if (!$('#page-guides').hidden) renderGuides(); renderGuideSlot(); });
}
let gSaveT = null;
function saveGuides(){
  clearTimeout(gSaveT);
  gSaveT = setTimeout(() => IDB.set('guides', GUIDES).catch(() => { try { store.set('fb.guides', GUIDES); } catch(e){ toast('Could not save your guides.'); } }), 300);
}
const guideById = id => GUIDES.find(g => g.id === id);

/* ---- Markdown → HTML (the parts study guides use) ---- */
function mdInline(t){
  const codes = [];
  let s = esc(t).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/__(.+?)__/g, '<b>$1</b>')
       .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<i>$2</i>').replace(/(^|[^_\w])_(?!\s)(.+?)_(?!\w)/g, '$1<i>$2</i>')
       .replace(/~~(.+?)~~/g, '<s>$1</s>').replace(/==(.+?)==/g, '<mark>$1</mark>')
       .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, k) => `<code>${codes[+k]}</code>`);
}
function mdRender(src, opts){
  const L = String(src || '').replace(/\r\n?/g, '\n').split('\n'), out = [], heads = [];
  let i = 0, qn = 0;
  const listRe = /^(\s*)([-*+]|\d+[.)])\s+(\[( |x|X)\]\s+)?(.*)$/;
  while (i < L.length){
    const line = L[i];
    if (/^\s*$/.test(line)){ i++; continue; }
    let m;
    if ((m = line.match(/^\s*```(.*)$/))){                       // code block
      const buf = []; i++;
      while (i < L.length && !/^\s*```/.test(L[i])) buf.push(L[i++]);
      i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue;
    }
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))){                  // heading
      const lv = m[1].length, id = 'gh' + heads.length; heads.push({lv, text: m[2].replace(/[*_`=~]/g, ''), id});
      out.push(`<h${lv + 1} id="${id}">${mdInline(m[2])}</h${lv + 1}>`); i++; continue;
    }
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)){ out.push('<hr>'); i++; continue; }
    if ((m = line.match(/^\s*Q[:.)]\s*(.*)$/i))){                // flashcard: Q: … A: …
      const q = [m[1]], a = []; i++;
      while (i < L.length && !/^\s*A[:.)]/i.test(L[i]) && !/^\s*$/.test(L[i])) q.push(L[i++].trim());
      if (i < L.length && (m = L[i].match(/^\s*A[:.)]\s*(.*)$/i))){ a.push(m[1]); i++; while (i < L.length && !/^\s*$/.test(L[i]) && !/^\s*Q[:.)]/i.test(L[i])) a.push(L[i++].trim()); }
      qn++;
      out.push(`<details class="qa"><summary><span class="qa-q">Q${qn}</span><span>${q.map(mdInline).join('<br>')}</span><span class="qa-tap">Show answer</span></summary><div class="qa-a">${a.length ? a.map(mdInline).join('<br>') : '<em>No answer written.</em>'}</div></details>`);
      continue;
    }
    if (/^\s*>/.test(line)){                                     // quote / tip box
      const buf = []; while (i < L.length && /^\s*>/.test(L[i])) buf.push(L[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${mdRender(buf.join('\n'), {inner: true}).html}</blockquote>`); continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < L.length && /^\s*\|?\s*:?-{2,}/.test(L[i + 1])){   // table
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(line); i += 2; const rows = [];
      while (i < L.length && /^\s*\|/.test(L[i])) rows.push(cells(L[i++]));
      out.push(`<div class="g-tbl"><table><thead><tr>${head.map(c => `<th>${mdInline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${mdInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (listRe.test(line)){                                      // lists and checklists
      let h = '';
      while (i < L.length && (m = L[i].match(listRe))){
        const ind = Math.min(4, Math.floor(m[1].replace(/\t/g, '  ').length / 2)), ord = /\d/.test(m[2]);
        if (m[3] && !opts?.inner){
          const on = m[4] !== ' ';
          h += `<li class="g-chk${on ? ' on' : ''}" style="--ind:${ind}"><label><input type="checkbox" data-gl="${i}" ${on ? 'checked' : ''}><span>${mdInline(m[5])}</span></label></li>`;
        } else h += `<li class="${ord ? 'g-ol' : 'g-ul'}" style="--ind:${ind}"${ord ? ` data-n="${m[2].replace(/\D/g, '')}"` : ''}><span>${mdInline(m[5])}</span></li>`;
        i++;
        while (i < L.length && /^\s{2,}\S/.test(L[i]) && !listRe.test(L[i])){ h = h.replace(/<\/span><\/(label><\/)?li>$/, ` ${mdInline(L[i].trim())}</span></$1li>`); i++; }
      }
      out.push(`<ul class="g-list">${h}</ul>`); continue;
    }
    const buf = [line]; i++;                                     // paragraph
    while (i < L.length && !/^\s*$/.test(L[i]) && !/^(#{1,4}\s|\s*```|\s*>|\s*\||\s*Q[:.)]|\s*(---+|\*\*\*+)\s*$)/i.test(L[i]) && !listRe.test(L[i])) buf.push(L[i++]);
    out.push(`<p>${buf.map(x => mdInline(x.trim())).join('<br>')}</p>`);
  }
  return {html: out.join('\n'), heads, qn};
}
function guideProgress(g){
  let total = 0, done = 0, qa = 0;
  String(g.body || '').split('\n').forEach(l => { const m = l.match(/^\s*([-*+]|\d+[.)])\s+\[( |x|X)\]/); if (m){ total++; if (m[2] !== ' ') done++; } if (/^\s*Q[:.)]/i.test(l)) qa++; });
  return {total, done, qa};
}
const guideTask = g => g.title.trim();
const guideMinutes = g => { const t = guideTask(g).toLowerCase(); return LOG.reduce((n, s) => n + ((s.task || '').trim().toLowerCase() === t ? s.min : 0), 0); };
function examText(g){
  if (!g.exam) return '';
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const d = new Date(g.exam + 'T00:00'), n = Math.round((d - d0) / 864e5);
  if (isNaN(n)) return '';
  return n === 0 ? 'Exam today' : n === 1 ? 'Exam tomorrow' : n > 1 ? `Exam in ${n} days` : `Exam was ${d.toLocaleDateString(undefined, {month:'short', day:'numeric'})}`;
}
const examSoon = g => { if (!g.exam) return false; const d0 = new Date(); d0.setHours(0, 0, 0, 0); const n = Math.round((new Date(g.exam + 'T00:00') - d0) / 864e5); return n >= 0 && n <= 7; };

/* ---- importing: Markdown with optional front matter, plain text, or JSON ---- */
function normDate(v){
  if (!v) return '';
  const s = String(v).trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s); return isNaN(t) ? '' : dayKey(t);
}
const normTags = v => (Array.isArray(v) ? v : String(v || '').replace(/^\[|\]$/g, '').split(',')).map(x => String(x).trim().replace(/^["']|["']$/g, '')).filter(Boolean).slice(0, 12);
function makeGuide(o){
  const now = Date.now();
  return {id: gid(), title: String(o.title || 'Untitled guide').trim().slice(0, 120), cls: String(o.cls || o.class || o.course || '').trim().slice(0, 60),
    exam: normDate(o.exam || o.exam_date || o.examDate || o.due), tags: normTags(o.tags), body: String(o.body || o.content || o.markdown || o.text || ''), quizzes: normQuizzes(o.quizzes), created: now, updated: now};
}
function parseFront(block){
  const o = {};
  block.split('\n').forEach(l => { const m = l.match(/^\s*([A-Za-z_ ]+?)\s*:\s*(.*)$/); if (m) o[m[1].trim().toLowerCase().replace(/\s+/g, '_')] = m[2].trim().replace(/^["']|["']$/g, ''); });
  return o;
}
function parseGuides(text, fileName){
  text = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const base = (fileName || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  // JSON: one guide, a list, or {guides: [...]}
  if (/^\s*[\[{]/.test(text)){
    try {
      const j = JSON.parse(text), arr = Array.isArray(j) ? j : Array.isArray(j.guides) ? j.guides : [j];
      const out = arr.filter(x => x && typeof x === 'object' && (x.body || x.content || x.markdown || x.text || x.title)).map(makeGuide);
      if (out.length) return out;
    } catch(e){}
  }
  // Markdown: each "---" front-matter block that names a title starts a new guide
  const fm = /(^|\n)---[ \t]*\n([\s\S]*?)\n---[ \t]*(\n|$)/g, starts = [];
  let m; while ((m = fm.exec(text))){ if (/^\s*title\s*:/mi.test(m[2])) starts.push({at: m.index + m[1].length, end: fm.lastIndex, meta: parseFront(m[2])}); }
  const pieces = starts.length ? starts.map((s, k) => ({meta: s.meta, body: text.slice(s.end, k + 1 < starts.length ? starts[k + 1].at : text.length)}))
    : [{meta: {}, body: text}];
  if (starts.length && starts[0].at > 0 && text.slice(0, starts[0].at).trim()) pieces.unshift({meta: {}, body: text.slice(0, starts[0].at)});
  return pieces.map(p => {
    let body = p.body.replace(/^\n+|\s+$/g, ''), title = p.meta.title;
    const h1 = body.match(/^#\s+(.+)\n?/);
    if (!title && h1) title = h1[1].trim();
    if (h1 && title && h1[1].trim().toLowerCase() === title.toLowerCase()) body = body.slice(h1[0].length).replace(/^\n+/, '');
    // practice quizzes can ride along at the end of a guide, each starting with a "quiz:" front-matter block
    const qAt = quizStart(body), quizzes = qAt >= 0 ? parseQuizzes(body.slice(qAt)) : [];
    if (qAt >= 0) body = body.slice(0, qAt).replace(/\s+$/, '');
    const g = makeGuide({...p.meta, title: title || base || 'Imported guide', body}); g.quizzes = quizzes;
    return g;
  }).filter(g => g.body.trim() || g.quizzes.length || g.title !== 'Imported guide');
}
function importGuides(list, replace){
  let added = 0, replaced = 0;
  list.forEach(g => {
    const same = replace && GUIDES.find(x => x.title.toLowerCase() === g.title.toLowerCase() && (x.cls || '').toLowerCase() === (g.cls || '').toLowerCase());
    if (same){ Object.assign(same, {body: g.body, exam: g.exam || same.exam, tags: g.tags.length ? g.tags : same.tags, updated: Date.now()}); if (g.quizzes.length) addQuizzes(same, g.quizzes, true); replaced++; }
    else { GUIDES.push(g); added++; if (g.quizzes.length) achBump('quizzes', g.quizzes.length); }
  });
  saveGuides(); if (added) achBump('guides', added);
  return {added, replaced};
}
function guideToMd(g){
  const fm = ['---', `title: ${g.title}`]; if (g.cls) fm.push(`class: ${g.cls}`); if (g.exam) fm.push(`exam: ${g.exam}`); if (g.tags.length) fm.push(`tags: ${g.tags.join(', ')}`); fm.push('---', '');
  return fm.join('\n') + g.body.replace(/\s+$/, '') + '\n' + guideQuizzes(g).map(q => '\n' + quizToText(q)).join('');
}
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'guide';

/* ---- the page: list → one guide → editor ---- */
function renderGuides(){
  const el = $('#guidesBody'); if (!el) return;
  if (!guidesReady){ el.innerHTML = '<p class="hint">Loading your guides…</p>'; return; }
  if (QR && (gEdit || gView !== QR.gid)) QR = null;
  if (QR) return renderQuizRun();
  if (gEdit) return renderGuideEditor();
  if (gView && guideById(gView)) return renderGuideView();
  gView = null;
  const classes = [...new Set(GUIDES.map(g => g.cls).filter(Boolean))].sort();
  const q = GF.q.trim().toLowerCase();
  const shown = GUIDES.filter(g => (GF.cls === 'all' || (GF.cls === '' ? !g.cls : g.cls === GF.cls)) && (!q || (g.title + ' ' + g.cls + ' ' + g.tags.join(' ') + ' ' + g.body).toLowerCase().includes(q)));
  const groups = {}; shown.forEach(g => (groups[g.cls || ''] || (groups[g.cls || ''] = [])).push(g));
  const order = Object.keys(groups).sort((a, b) => (a === '') - (b === '') || a.localeCompare(b));
  const card = g => {
    const p = guideProgress(g), mins = guideMinutes(g), ex = examText(g);
    return `<button class="g-card" data-gopen="${g.id}"><span class="g-card-top"><b>${esc(g.title)}</b>${ex ? `<em class="${examSoon(g) ? 'soon' : ''}">${ex}</em>` : ''}</span>
      ${g.tags.length ? `<span class="g-tags">${g.tags.map(t => `<i>${esc(t)}</i>`).join('')}</span>` : ''}
      ${p.total ? `<span class="g-prog"><span class="bar2"><i style="width:${p.done / p.total * 100}%"></i></span><small>${p.done}/${p.total} checked</small></span>` : ''}
      <small class="g-meta">${[p.qa ? `${p.qa} question${p.qa === 1 ? '' : 's'}` : '', (qs => qs.n ? `${qs.n} quiz${qs.n === 1 ? '' : 'zes'}${qs.best != null ? ` (avg best ${qs.best}%)` : ''}` : '')(quizSummary(g)), mins ? `${fmtMin(mins)} studied` : '', `edited ${new Date(g.updated).toLocaleDateString(undefined, {month:'short', day:'numeric'})}`].filter(Boolean).join(' · ')}</small></button>`;
  };
  el.innerHTML = `<div class="g-bar"><input id="gSearch" type="search" placeholder="Search guides" value="${esc(GF.q)}" aria-label="Search guides">
      <select id="gClass" aria-label="Class"><option value="all">All classes</option>${classes.map(c => `<option ${GF.cls === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}${GUIDES.some(g => !g.cls) ? `<option value="" ${GF.cls === '' ? 'selected' : ''}>No class</option>` : ''}</select>
      <span class="g-bar-sp"></span><button class="small-btn" data-ga="import">Import</button><button class="small-btn accent" data-ga="new">+ New guide</button></div>
    ${GUIDES.length ? (shown.length ? order.map(c => `<div class="g-group"><div class="h">${c ? esc(c) : 'No class'} <small class="pf-sub">${groups[c].length}</small></div><div class="g-grid">${groups[c].sort((a, b) => (a.exam || '9') .localeCompare(b.exam || '9') || b.updated - a.updated).map(card).join('')}</div></div>`).join('') : '<p class="hint">No guides match.</p>')
      : `<div class="card g-empty"><b>No study guides yet</b><p>Write one here, or import guides as Markdown, text or JSON files. Ask Claude to “make a Focus Bench study guide” on any topic, then import the file it gives you.</p><div class="g-empty-btns"><button class="small-btn accent" data-ga="new">+ New guide</button><button class="small-btn" data-ga="import">Import</button><button class="small-btn" data-ga="sample">Add a sample guide</button></div></div>`}`;
}
function renderGuideView(){
  requestAnimationFrame(fitGuideSide);
  const g = guideById(gView), r = mdRender(g.body), p = guideProgress(g), mins = guideMinutes(g), ex = examText(g), qs = quizSummary(g), tab = guideTab(g);
  // the title sits above two tabs: the guide itself, and its practice quizzes
  const top = `<div class="g-bar"><button class="small-btn" data-ga="back">← All guides</button><span class="g-bar-sp"></span>
      <button class="small-btn accent" data-ga="study">▶ Study this</button><button class="small-btn" data-ga="edit">Edit</button><button class="small-btn" data-ga="export">Export</button><button class="small-btn" data-ga="del">Delete</button></div>
    <header class="g-head g-top"><h2>${esc(g.title)}</h2><div class="g-sub">${g.cls ? `<span class="g-cls">${esc(g.cls)}</span>` : ''}${ex ? `<span class="g-ex${examSoon(g) ? ' soon' : ''}">${ex}</span>` : ''}${g.tags.map(t => `<i class="g-tag">${esc(t)}</i>`).join('')}</div></header>
    <div class="g-tabs" role="tablist" aria-label="Guide sections">
      <button role="tab" data-gtab="guide" aria-selected="${tab === 'guide'}">Guide</button>
      <button role="tab" data-gtab="quizzes" aria-selected="${tab === 'quizzes'}">Practice quizzes${qs.n ? `<span class="g-tab-n">${qs.n}</span>` : ''}</button></div>`;
  if (tab === 'quizzes'){ $('#guidesBody').innerHTML = top + quizPage(g); return; }
  $('#guidesBody').innerHTML = top + `
    <div class="g-view">
      <article class="card g-doc"><div class="g-md" data-gid="${g.id}">${r.html || '<p class="hint">This guide is empty. Click Edit to write it.</p>'}</div></article>
      <aside class="g-side">
        <div class="card"><div class="h first">Progress</div><div class="pf-kv">
          ${p.total ? `<span><b>${p.done}/${p.total}</b><small>checklist done</small></span>` : ''}${r.qn ? `<span><b>${r.qn}</b><small>questions</small></span>` : ''}<span><b>${mins ? fmtMin(mins) : '0m'}</b><small>studied</small></span>${qs.n ? `<span><b>${qs.best != null ? qs.best + '%' : qs.n}</b><small>${qs.best != null ? 'avg best quiz score' : `quiz${qs.n === 1 ? '' : 'zes'}`}</small></span>` : ''}</div>
          ${p.total ? `<span class="bar2 g-bigbar"><i style="width:${p.done / p.total * 100}%"></i></span>` : ''}
          ${r.qn ? `<div class="g-qa-btns"><button class="small-btn" data-ga="qa-open">Show all answers</button><button class="small-btn" data-ga="qa-close">Hide all</button></div>` : ''}
          ${p.total ? `<button class="link-btn" data-ga="uncheck">Uncheck everything</button>` : ''}</div>
        ${r.heads.length > 2 ? `<div class="card g-toc-card"><div class="h first">Contents</div><nav class="g-toc">${r.heads.map(h => `<a href="#${h.id}" data-gh="${h.id}" style="--lv:${h.lv}">${esc(h.text)}</a>`).join('')}</nav></div>` : ''}
      </aside>
    </div>`;
}
// keep the side panel inside the visible window, wherever the page is scrolled
function fitGuideSide(){
  const s = document.querySelector('#page-guides .g-side'); if (!s || $('#page-guides').hidden) return;
  if (getComputedStyle(s).position !== 'sticky'){ s.style.maxHeight = ''; return; }
  s.style.maxHeight = Math.max(240, innerHeight - Math.max(16, s.getBoundingClientRect().top) - 16) + 'px';
}
addEventListener('scroll', fitGuideSide, {passive: true}); addEventListener('resize', fitGuideSide);
const MD_HELP = `<details class="g-help"><summary>Formatting help</summary><div><code># Heading</code> <code>**bold**</code> <code>*italic*</code> <code>==highlight==</code> <code>- bullet</code> <code>1. numbered</code> <code>- [ ] checklist item</code> <code>&gt; tip box</code> <code>\`code\`</code> <code>| table | row |</code><br>Flashcards: a line starting <code>Q:</code> followed by a line starting <code>A:</code>. The answer stays hidden until clicked.</div></details>`;
function renderGuideEditor(){
  const g = gEdit;
  $('#guidesBody').innerHTML = `<div class="g-bar"><button class="small-btn" data-ga="cancel">Cancel</button><span class="g-bar-sp"></span><button class="small-btn accent" data-ga="save">Save guide</button></div>
    <div class="card g-ed">
      <div class="g-ed-meta"><label class="g-f-title">Title<input id="geTitle" maxlength="120" value="${esc(g.title)}" placeholder="ACCT 200 · Exam 2 review"></label>
        <label>Class<input id="geCls" maxlength="60" value="${esc(g.cls)}" placeholder="ACCT 200" list="geClsList"><datalist id="geClsList">${[...new Set(GUIDES.map(x => x.cls).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
        <label>Exam date<input id="geExam" type="date" value="${esc(g.exam)}"></label>
        <label class="g-f-tags">Tags<input id="geTags" value="${esc(g.tags.join(', '))}" placeholder="chapters 4–7, formulas"></label></div>
      <div class="g-tools" role="toolbar" aria-label="Formatting">${[['h','H','Heading'],['b','<b>B</b>','Bold'],['i','<i>I</i>','Italic'],['hl','<mark>H</mark>','Highlight'],['ul','• List','Bullet list'],['ol','1. List','Numbered list'],['chk','☐ Checklist','Checklist item'],['qa','Q&amp;A','Flashcard question'],['quote','❝ Tip','Tip box'],['tbl','Table','Table']].map(([k, l, t]) => `<button class="small-btn" data-gt="${k}" title="${t}">${l}</button>`).join('')}</div>
      <div class="g-ed-split"><textarea id="geBody" spellcheck="true" placeholder="Write your guide here.">${esc(g.body)}</textarea><div class="g-md g-prev" id="gePrev"></div></div>
      ${MD_HELP}
    </div>`;
  geUpdatePreview();
  $('#geTitle').focus();
}
function geUpdatePreview(){ const b = $('#geBody'), pv = $('#gePrev'); if (b && pv) pv.innerHTML = mdRender(b.value).html || '<p class="hint">Preview shows up here.</p>'; }
function geWrap(kind){
  const ta = $('#geBody'), a = ta.selectionStart, b = ta.selectionEnd, v = ta.value, sel = v.slice(a, b);
  const lineStart = v.lastIndexOf('\n', a - 1) + 1;
  const wrap = (l, r, ph) => { const t = sel || ph; ta.setRangeText(l + t + r, a, b, 'end'); if (!sel){ ta.selectionStart = a + l.length; ta.selectionEnd = a + l.length + t.length; } };
  const prefix = p => { const lines = (sel || 'Item').split('\n'), out = lines.map((x, k) => (typeof p === 'function' ? p(k) : p) + x).join('\n'); ta.setRangeText((a === lineStart ? '' : '\n') + out, a, b, 'end'); };
  ({h: () => prefix('## '), b: () => wrap('**', '**', 'bold text'), i: () => wrap('*', '*', 'italic text'), hl: () => wrap('==', '==', 'key term'),
    ul: () => prefix('- '), ol: () => prefix(k => `${k + 1}. `), chk: () => prefix('- [ ] '), quote: () => prefix('> '),
    qa: () => ta.setRangeText(`${a === lineStart ? '' : '\n'}\nQ: ${sel || 'Question?'}\nA: Answer\n`, a, b, 'end'),
    tbl: () => ta.setRangeText(`${a === lineStart ? '' : '\n'}\n| Term | Meaning |\n| --- | --- |\n| | |\n`, a, b, 'end')})[kind]();
  ta.focus(); geUpdatePreview();
}
function gEditorSave(){
  const t = $('#geTitle').value.trim();
  if (!t){ toast('Give the guide a title.'); $('#geTitle').focus(); return; }
  const isNew = !guideById(gEdit.id);
  Object.assign(gEdit, {title: t, cls: $('#geCls').value.trim(), exam: $('#geExam').value, tags: normTags($('#geTags').value), body: $('#geBody').value, updated: Date.now()});
  if (isNew){ GUIDES.push(gEdit); achBump('guides'); }
  else Object.assign(guideById(gEdit.id), gEdit);
  saveGuides(); gView = gEdit.id; gEdit = null; renderGuides(); renderGuideSlot(); toast('Guide saved');
}
function toggleCheck(g, lineNo, on){
  const L = g.body.split('\n'); if (!L[lineNo]) return;
  L[lineNo] = L[lineNo].replace(/\[( |x|X)\]/, on ? '[x]' : '[ ]');
  g.body = L.join('\n'); g.updated = Date.now(); saveGuides();
  const p = guideProgress(g);
  if (on && p.total && p.done === p.total){ if (!g.doneOnce){ g.doneOnce = 1; achBump('guideDone'); } toast(`Everything checked off in “${g.title}”.`); fx.burst(); }
}
function downloadText(name, text){
  const url = URL.createObjectURL(new Blob([text], {type: 'text/markdown'}));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function studyGuide(g){
  const t = $('#task'); t.value = guideTask(g); t.dispatchEvent(new Event('input', {bubbles: true})); t.dispatchEvent(new Event('change', {bubbles: true}));
  P.focusGuide = g.id; saveP(); achBump('guideStudy');
  showPage('focus'); renderGuideSlot();
  toast(`Task set to “${guideTask(g)}”. Press Start when you're ready.`);
}
const SAMPLE_GUIDE = `---
title: How study guides work
class: Focus Bench
tags: example
---
Study guides are written in **Markdown**. Import them as files, or write them here.

## Checklists
- [x] Open this sample
- [ ] Check off a box (it saves right away)
- [ ] Press **Study this** to time a session for this guide

## Flashcards
Q: What does a line starting with Q: make?
A: A flashcard. The answer stays hidden until you click it.

Q: Where do answers go?
A: On the line right after the question, starting with A:

## Everything else
> Tip boxes start with >, and ==highlights== use double equals signs.

| Syntax | Result |
| --- | --- |
| \`**bold**\` | **bold** |
| \`- [ ] item\` | a checklist item |

---
quiz: Sample quiz
---
1. Where do practice quizzes live?
a) In a separate tab
*b) Inside the study guide they belong to
c) In your notes
Why: Each guide has a Practice quizzes section below it, so everything for one class stays in one place.
Review: The Practice quizzes section of this guide

2. True or false: getting a question wrong shows what to review.
Answer: True
Why: Quizzes can include a Review line for each question.
Review: The quiz format in Import quiz

3. Which of these can you do after finishing a quiz? (select all)
*a) Retake the whole quiz
*b) Retry only the questions you missed
c) Change the answers you gave
Why: Your answers are locked in, but you can retake or practice the misses.
Review: The results screen
`;

/* ---- import dialog ---- */
function openImport(){
  gImportFound = [];
  $('#gImpBody').innerHTML = `<h3 id="gImpTitle">Import study guides</h3>
    <p class="hint">Markdown (.md), plain text (.txt) or JSON (.json). One file can hold several guides: start each with its own front matter block.</p>
    <div class="g-imp-row"><label class="small-btn accent g-file">Choose files<input type="file" id="gImpFile" accept=".md,.markdown,.txt,.json,text/markdown,text/plain,application/json" multiple hidden></label><span class="hint">or paste below</span></div>
    <textarea id="gImpText" placeholder="---\ntitle: ACCT 200 · Exam 2 review\nclass: ACCT 200\nexam: 2026-11-20\ntags: chapters 4–7\n---\n## Chapter 4\n- [ ] Know the accrual basis\nQ: What is an adjusting entry?\nA: …"></textarea>
    <label class="g-imp-chk"><input type="checkbox" id="gImpReplace" checked> Update guides with the same title and class instead of adding copies</label>
    <div id="gImpFound" class="g-imp-found"></div>
    <div class="g-imp-btns"><button class="small-btn" data-gi="cancel">Cancel</button><button class="small-btn accent" data-gi="go" disabled>Import</button></div>
    <details class="g-help"><summary>The format, for writing guides elsewhere</summary><pre>${esc(`---
title: Guide title            (required)
class: ACCT 200               (optional)
exam: 2026-11-20              (optional, YYYY-MM-DD)
tags: chapter 4, formulas     (optional, comma separated)
---
## Section heading
Normal text, **bold**, *italic*, ==highlight==
- bullet            1. numbered
- [ ] checklist item (- [x] for already done)
> tip box
| table | header |
| --- | --- |
Q: Flashcard question
A: Its answer

---
quiz: Practice quiz title     (optional: quizzes at the end
---                            go into this guide's quiz section)
1. Question
a) choice
*b) correct choice
Why: explanation
Review: what to study if you miss it`)}</pre></details>`;
  $('#gImpModal').hidden = false;
  const show = () => {
    const n = gImportFound.length, btn = $('#gImpModal [data-gi="go"]');
    $('#gImpFound').innerHTML = n ? `<b>${n} guide${n === 1 ? '' : 's'} found</b><ul>${gImportFound.map(g => { const p = guideProgress(g), ex = GUIDES.some(x => x.title.toLowerCase() === g.title.toLowerCase() && (x.cls || '').toLowerCase() === (g.cls || '').toLowerCase());
      return `<li><b>${esc(g.title)}</b>${g.cls ? ` · ${esc(g.cls)}` : ''}${g.exam ? ` · exam ${esc(g.exam)}` : ''}<small>${[p.total ? `${p.total} checklist items` : '', p.qa ? `${p.qa} questions` : '', ex ? 'already exists' : 'new'].filter(Boolean).join(' · ')}</small></li>`; }).join('')}</ul>` : '';
    btn.disabled = !n; btn.textContent = n ? `Import ${n} guide${n === 1 ? '' : 's'}` : 'Import';
  };
  $('#gImpText').oninput = () => { gImportFound = $('#gImpText').value.trim() ? parseGuides($('#gImpText').value) : []; show(); };
  $('#gImpFile').onchange = e => {
    const files = [...e.target.files]; if (!files.length) return;
    Promise.all(files.map(f => f.text().then(t => parseGuides(t, f.name)))).then(lists => { gImportFound = lists.flat(); $('#gImpText').value = ''; show(); if (!gImportFound.length) toast("Couldn't find a guide in that file."); });
  };
  setTimeout(() => $('#gImpText').focus(), 30);
}
$('#gImpModal').addEventListener('click', e => {
  if (e.target === $('#gImpModal') || e.target.closest('.x') || e.target.closest('[data-gi="cancel"]')){ $('#gImpModal').hidden = true; return; }
  if (e.target.closest('[data-gi="go"]')){
    const {added, replaced} = importGuides(gImportFound, $('#gImpReplace').checked);
    $('#gImpModal').hidden = true; gView = gImportFound.length === 1 ? (guideById(gImportFound[0].id) ? gImportFound[0].id : (GUIDES.find(x => x.title === gImportFound[0].title) || {}).id) : null;
    renderGuides(); renderGuideSlot();
    toast([added ? `Imported ${added} guide${added === 1 ? '' : 's'}` : '', replaced ? `updated ${replaced}` : ''].filter(Boolean).join(', ') + '.');
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#gImpModal').hidden = true; });

/* ---- events on the page ---- */
$('#page-guides').addEventListener('click', e => {
  const open = e.target.closest('[data-gopen]'); if (open){ gView = open.dataset.gopen; renderGuides(); window.scrollTo(0, 0); return; }
  const th = e.target.closest('[data-gh]'); if (th){ e.preventDefault(); const t = document.getElementById(th.dataset.gh); t && t.scrollIntoView({behavior: motion() === 'off' ? 'auto' : 'smooth', block: 'start'}); return; }
  const tool = e.target.closest('[data-gt]'); if (tool){ geWrap(tool.dataset.gt); return; }
  const b = e.target.closest('[data-ga]'); if (!b) return;
  const a = b.dataset.ga, g = gView && guideById(gView);
  if (a === 'new'){ gEdit = makeGuide({title: '', body: ''}); gEdit.title = ''; renderGuides(); }
  else if (a === 'import') openImport();
  else if (a === 'sample'){ importGuides(parseGuides(SAMPLE_GUIDE), false); renderGuides(); }
  else if (a === 'back'){ gView = null; renderGuides(); }
  else if (a === 'edit' && g){ gEdit = {...g, tags: [...g.tags]}; renderGuides(); }
  else if (a === 'cancel'){ gEdit = null; renderGuides(); }
  else if (a === 'save') gEditorSave();
  else if (a === 'study' && g) studyGuide(g);
  else if (a === 'export' && g){
    const md = guideToMd(g);
    if (window.top !== window){ try { navigator.clipboard.writeText(md).then(() => toast('Guide copied as Markdown.'), () => toast("Couldn't copy here.")); } catch(err){} }
    else { downloadText(`${slug(g.title)}.md`, md); toast(`Saved ${slug(g.title)}.md`); }
  }
  else if (a === 'del' && g){
    if (!b.dataset.sure){ b.dataset.sure = 1; b.textContent = 'Click again to delete'; b.classList.add('danger'); setTimeout(() => { if (b.isConnected){ delete b.dataset.sure; b.textContent = 'Delete'; b.classList.remove('danger'); } }, 3500); return; }
    GUIDES = GUIDES.filter(x => x.id !== g.id); if (P.focusGuide === g.id){ P.focusGuide = null; saveP(); }
    saveGuides(); gView = null; renderGuides(); renderGuideSlot(); toast('Guide deleted.');
  }
  else if ((a === 'qa-open' || a === 'qa-close')) document.querySelectorAll('#page-guides details.qa').forEach(d => d.open = a === 'qa-open');
  else if (a === 'uncheck' && g){ g.body = g.body.replace(/^(\s*([-*+]|\d+[.)])\s+)\[(x|X)\]/gm, '$1[ ]'); g.updated = Date.now(); saveGuides(); renderGuides(); }
});
$('#page-guides').addEventListener('input', e => {
  if (e.target.id === 'geBody'){ clearTimeout(geUpdatePreview.t); geUpdatePreview.t = setTimeout(geUpdatePreview, 150); }
  if (e.target.id === 'gSearch'){ GF.q = e.target.value; const pos = e.target.selectionStart; renderGuides(); const s = $('#gSearch'); s.focus(); s.setSelectionRange(pos, pos); }
});
$('#page-guides').addEventListener('change', e => {
  if (e.target.id === 'gClass'){ GF.cls = e.target.value; renderGuides(); }
  const c = e.target.closest('[data-gl]'); if (c){ const g = guideById(c.closest('[data-gid]').dataset.gid); if (g){ toggleCheck(g, +c.dataset.gl, c.checked); renderGuides(); } }
});
$('#page-guides').addEventListener('keydown', e => { if (e.target.id === 'geBody' && (e.ctrlKey || e.metaKey) && e.key === 's'){ e.preventDefault(); gEditorSave(); } });

/* ---- the guide you're studying, on the Focus page ---- */
function renderGuideSlot(){
  const el = $('#guideSlot'); if (!el) return;
  const g = P.focusGuide && guideById(P.focusGuide);
  if (!g){ el.innerHTML = ''; return; }
  const p = guideProgress(g), r = mdRender(g.body);
  el.innerHTML = `<div class="card g-slot"><div class="g-slot-head"><span class="h first">Study guide</span><button class="link-btn" data-gs="open">Open</button><button class="x" data-gs="close" aria-label="Close the guide">×</button></div>
    <b class="g-slot-title">${esc(g.title)}</b>${p.total ? `<span class="g-prog"><span class="bar2"><i style="width:${p.done / p.total * 100}%"></i></span><small>${p.done}/${p.total}</small></span>` : ''}
    <div class="g-md g-slot-md" data-gid="${g.id}">${r.html}</div></div>`;
}
$('#guideSlot').addEventListener('click', e => {
  const b = e.target.closest('[data-gs]'); if (!b) return;
  if (b.dataset.gs === 'close'){ P.focusGuide = null; saveP(); renderGuideSlot(); }
  else { gView = P.focusGuide; gEdit = null; showPage('guides'); }
});
$('#guideSlot').addEventListener('change', e => {
  const c = e.target.closest('[data-gl]'); if (!c) return;
  const g = guideById(c.closest('[data-gid]').dataset.gid); if (g){ toggleCheck(g, +c.dataset.gl, c.checked); renderGuideSlot(); }
});
loadGuides();

/* showcase picking on the Awards page */
$('#pane-awards').addEventListener('click', e => {
  const s = e.target.closest('[data-star]'); if (!s) return;
  const id = s.dataset.star; let sc = (R.showcase || myFeatured()).filter(x => ACH.u[x]);
  if (sc.includes(id)) sc = sc.filter(x => x !== id); else { if (sc.length >= 3) sc.shift(); sc.push(id); }
  R.showcase = sc; saveRanked(); renderAwards();
});
$('#pane-awards').addEventListener('click', e => { if (e.target.closest('[data-act="sc-auto"]')){ R.showcase = null; saveRanked(); renderAwards(); } });
function onPageShown(name){
  if (name === 'guides') renderGuides();
  if (name === 'profile'){ if (profWho == null){ showPage('ranked'); return; } renderProfilePage(); }
  if (name === 'leaders'){ renderLeaders(); if (!lbPts) ensureBotPoints(() => { if (!$('#page-leaders').hidden) renderLeaders(); }); }
  if (name === 'ranked'){ renderRanked(); computeRarity(() => { if (!$('#page-ranked').hidden) renderRanked(); }); }
  if (name === 'awards') computeRarity(() => { if (!$('#page-awards').hidden) renderAwards(); });
}

let lbPts = null;
loadRanked();
setInterval(() => {
  if (document.hidden) return;
  dailySim().then(ch => {
    if (!ch) return;
    if (!$('#page-ranked').hidden) renderRanked();
    if (!$('#page-leaders').hidden) renderLeaders();
    renderRankChip();
  });
}, 60000);

