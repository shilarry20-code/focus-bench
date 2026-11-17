/* ---------- practice quizzes: each study guide can hold quizzes you import and take ---------- */
// A quiz lives on its guide (g.quizzes), so it saves, backs up, exports and deletes with the guide.
// Quiz = {id, title, questions, created, updated, best, last, tries, lastAt}
// Question = {type: 'mc' | 'tf' | 'multi' | 'short', q, choices, correct: [indexes], answer, why, review}
// Loaded before guides.js; everything here runs only when called, after every script has loaded.

let QR = null;          // the quiz being taken: {gid, qid, list, i, picked, done, res, full, short}
let qImportFound = [], qImportGuide = null;
const qid = () => 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const guideQuizzes = g => Array.isArray(g.quizzes) ? g.quizzes : (g.quizzes = []);
const LETTERS = 'ABCDEFGH';

/* ---- reading quizzes: text (made by Claude or by hand) or JSON ---- */
const QZ_FORMAT = `---
quiz: Chapter 4 practice
---
1. What does an adjusting entry do?
a) Records cash received from customers
*b) Updates accounts at the end of a period
c) Closes the books for the year
Why: Under accrual accounting, adjusting entries bring revenues and expenses up to date.
Review: Chapter 4, adjusting entries

2. True or false: Prepaid rent is an asset.
Answer: True
Why: It is paid now but used up in future periods.
Review: Chapter 4, prepaid expenses

3. Which of these are current assets? (select all)
*a) Cash
*b) Accounts receivable
c) Equipment
Why: Current assets are used or turned into cash within a year.
Review: Chapter 5, classified balance sheet

4. What is the accounting equation?
Answer: Assets = Liabilities + Equity
Why: It always balances.
Review: Chapter 1`;

const QZ_CLAUDE = `Make a practice quiz I can import into my Focus Bench study app. Use exactly this plain-text format, inside one code block (or as a .md file):

${QZ_FORMAT}

Rules:
- Start each quiz with the --- / quiz: Title / --- block. Several quizzes can go one after another.
- Number every question (1. 2. 3.).
- Multiple choice: letter the choices a) b) c) d) and put * directly in front of the correct letter, like *b). Mark several with * for a "select all" question.
- True/false or short answer: no choices, just an "Answer:" line.
- Give every question a "Why:" line explaining the answer, and a "Review:" line saying exactly what to review if I get it wrong (chapter, section, or topic).
- No other text inside the code block.

The quiz should be on: `;

// Front-matter blocks found line by line, so a "---" divider between questions is just a divider.
function frontBlocks(text, keyRe){
  const L = text.split('\n'), out = [];
  for (let i = 0; i < L.length; i++){
    if (!/^\s*---\s*$/.test(L[i])) continue;
    let j = i + 1; const meta = {};
    while (j < L.length && j - i <= 8){ const m = L[j].match(/^\s*([A-Za-z_ ]+?)\s*:\s*(.*)$/); if (!m) break; meta[m[1].trim().toLowerCase().replace(/\s+/g, '_')] = m[2].trim().replace(/^["']|["']$/g, ''); j++; }
    if (j < L.length && j > i + 1 && /^\s*---\s*$/.test(L[j]) && Object.keys(meta).some(k => keyRe.test(k))){ out.push({line: i, end: j + 1, meta}); i = j; }
  }
  return {lines: L, blocks: out};
}
// Where the first quiz starts inside a guide file (so guides can carry their quizzes), or -1.
function quizStart(text){
  const {lines, blocks} = frontBlocks(text, /^quiz$/);
  return blocks.length ? lines.slice(0, blocks[0].line).join('\n').length + (blocks[0].line ? 1 : 0) : -1;
}
function parseQuizzes(text, fileName){
  text = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const base = (fileName || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  if (/^\s*[\[{]/.test(text)){
    try {
      const j = JSON.parse(text);
      const arr = Array.isArray(j) ? (j.length && j[0] && (j[0].questions || j[0].quiz) ? j : [{questions: j}]) : Array.isArray(j.quizzes) ? j.quizzes : [j];
      const out = arr.map(x => normQuiz(x, base)).filter(Boolean);
      if (out.length) return out;
    } catch(e){}
  }
  const {lines, blocks} = frontBlocks(text, /^(quiz|title)$/);
  const pieces = blocks.length ? blocks.map((b, k) => ({meta: b.meta, body: lines.slice(b.end, k + 1 < blocks.length ? blocks[k + 1].line : lines.length)}))
    : [{meta: {}, body: lines}];
  if (blocks.length && blocks[0].line > 0 && lines.slice(0, blocks[0].line).some(l => /^\s*(Q(uestion)?\s*)?\d+\s*[.):]\s+\S/i.test(l))) pieces.unshift({meta: {}, body: lines.slice(0, blocks[0].line)});
  return pieces.map(p => {
    let title = p.meta.quiz || p.meta.title || '';
    const body = p.body.slice();
    const h = body.findIndex(l => /^\s*#{1,3}\s+\S/.test(l));
    if (h >= 0 && !body.slice(0, h).some(l => l.trim())){ if (!title) title = body[h].replace(/^\s*#+\s+/, '').trim(); body.splice(h, 1); }
    return normQuiz({title: title || base || 'Practice quiz', questions: parseQuestions(body)}, base);
  }).filter(Boolean);
}
function parseQuestions(L){
  const qs = []; let cur = null, field = null;
  const startRe = /^\s*(?:Q(?:uestion)?\s*)?(\d+)\s*[.):]\s+(.*)$|^\s*Q\s*[:.)]\s+(.*)$/i;
  const choiceRe = /^\s*(?:[-+]\s+|\*\s+)?(\*|✅|✓)?\s*\(?([a-hA-H])[).]\s+(.*?)\s*(\(correct\)|✅|✓|\*)?\s*$/;
  const tfRe = /^\s*(?:[-+]\s+|\*\s+)?(\*|✅|✓)?\s*(True|False)\s*(\(correct\)|✅|✓|\*)?\s*$/i;
  const metaRe = /^\s*(Correct answer|Answer|Ans|Correct|A|Why|Explanation|Because|Reason|Review|Study|See)\s*:\s*(.*)$/i;
  const flush = () => { if (cur) qs.push(cur); cur = null; field = null; };
  for (const raw of L){
    const line = raw.replace(/\*\*/g, '');
    if (!line.trim() || /^\s*(---|\*\*\*|___)\s*$/.test(line) || /^\s*(```|~~~)/.test(line) || /^\s*#{1,6}\s/.test(line)){ field = null; continue; }
    let m = line.match(metaRe);
    if (m && cur){
      const k = m[1].toLowerCase(), v = m[2].trim();
      if (/^(why|explanation|because|reason)$/.test(k)){ cur.why = v; field = 'why'; }
      else if (/^(review|study|see)$/.test(k)){ cur.review = v; field = 'review'; }
      else { cur.ans = v; field = null; }
      continue;
    }
    if (cur && (m = line.match(choiceRe)) && (cur.choices.length || cur.q.length) && m[2].toLowerCase() === 'abcdefgh'[cur.choices.length]){
      cur.choices.push(m[3].trim()); if (m[1] || m[4]) cur.marked.push(cur.choices.length - 1); field = null; continue;
    }
    if (cur && !cur.choices.length && (m = line.match(tfRe))){ cur.tf.push({t: m[2], on: !!(m[1] || m[3])}); field = null; continue; }
    if ((m = line.match(startRe))){ flush(); cur = {q: [(m[2] != null ? m[2] : m[3]).trim()], choices: [], marked: [], tf: [], ans: '', why: '', review: ''}; continue; }
    if (!cur) continue;
    if (field){ cur[field] += ' ' + line.trim(); continue; }
    if (!cur.choices.length) cur.q.push(line.trim());
  }
  flush();
  return qs.map(x => {
    const q = x.q.filter(Boolean).join('\n'), out = {q, why: x.why, review: x.review};
    if (!q) return null;
    if (x.tf.length && !x.choices.length){ x.choices = ['True', 'False']; const on = x.tf.find(t => t.on); if (on) x.marked = [/^t/i.test(on.t) ? 0 : 1]; }
    if (x.choices.length){
      let correct = x.marked.slice();
      if (!correct.length && x.ans) correct = ansToIdx(x.ans, x.choices);
      correct = [...new Set(correct)].sort((a, b) => a - b);
      if (!correct.length) return null;
      const tf = x.choices.length === 2 && /^true$/i.test(x.choices[0]) && /^false$/i.test(x.choices[1]);
      return {...out, type: correct.length > 1 ? 'multi' : tf ? 'tf' : 'mc', choices: x.choices, correct};
    }
    if (!x.ans) return null;
    if (/^(true|false|t|f)\.?$/i.test(x.ans.trim())) return {...out, type: 'tf', choices: ['True', 'False'], correct: [/^t/i.test(x.ans.trim()) ? 0 : 1]};
    return {...out, type: 'short', answer: x.ans};
  }).filter(Boolean);
}
// "b", "b)", "B and D", "a, c", or the text of the choice itself
function ansToIdx(a, choices){
  const s = String(a).trim();
  if (/^\(?[a-h]\)?(\s*(,|and|&)\s*\(?[a-h]\)?)*\.?$/i.test(s)) return [...new Set(s.match(/[a-h](?![a-z])/gi).map(c => c.toLowerCase().charCodeAt(0) - 97))].filter(i => i < choices.length);
  const m = s.match(/^\(?([a-h])[).]\s+(.*)$/i); if (m && m[1].toLowerCase().charCodeAt(0) - 97 < choices.length) return [m[1].toLowerCase().charCodeAt(0) - 97];
  const k = choices.findIndex(c => normAns(c) === normAns(s)); return k >= 0 ? [k] : [];
}
function normQuestion(x){
  if (!x || typeof x !== 'object') return null;
  const q = String(x.q || x.question || x.prompt || x.text || '').trim(); if (!q) return null;
  const out = {q, why: String(x.why || x.explanation || x.reason || '').trim(), review: String(x.review || x.study || x.topic || '').trim()};
  let ch = x.choices || x.options || x.answers;
  if (ch && !Array.isArray(ch) && typeof ch === 'object') ch = Object.values(ch);
  if (Array.isArray(ch) && ch.length >= 2){
    ch = ch.map(c => String(c && typeof c === 'object' ? (c.text || c.label || '') : c).replace(/^\(?[a-h][).]\s+/i, '').trim()).slice(0, 8);
    let a = x.correct != null ? x.correct : x.answer != null ? x.answer : x.correctAnswer;
    if (typeof a === 'boolean') a = a ? 'True' : 'False';
    let correct = (Array.isArray(a) ? a : [a]).flatMap(v => typeof v === 'number' ? (v >= 0 && v < ch.length ? [v] : []) : v == null ? [] : ansToIdx(v, ch));
    correct = [...new Set(correct)].sort((p, q2) => p - q2);
    if (!correct.length) return null;
    const tf = ch.length === 2 && /^true$/i.test(ch[0]) && /^false$/i.test(ch[1]);
    return {...out, type: correct.length > 1 ? 'multi' : tf ? 'tf' : 'mc', choices: ch, correct};
  }
  const a = x.answer != null ? x.answer : x.correct;
  if (typeof a === 'boolean') return {...out, type: 'tf', choices: ['True', 'False'], correct: [a ? 0 : 1]};
  if (a == null || String(a).trim() === '') return null;
  if (/^(true|false)$/i.test(String(a).trim())) return {...out, type: 'tf', choices: ['True', 'False'], correct: [/^t/i.test(String(a).trim()) ? 0 : 1]};
  return {...out, type: 'short', answer: String(a).trim()};
}
function normQuiz(o, base){
  if (!o || typeof o !== 'object') return null;
  const raw = Array.isArray(o.questions) ? o.questions : [];
  // questions parsed from text are already in shape; JSON ones go through normQuestion
  const ready = x => x && ((x.type === 'short' && typeof x.answer === 'string' && x.answer.trim()) || (['mc', 'tf', 'multi'].includes(x.type) && Array.isArray(x.choices) && Array.isArray(x.correct) && x.correct.length && x.correct.every(i => Number.isInteger(i) && i >= 0 && i < x.choices.length))) && typeof x.q === 'string';
  const questions = raw.map(x => ready(x) ? {type: x.type, q: x.q, choices: x.choices, correct: x.correct, answer: x.answer, why: x.why || '', review: x.review || ''} : normQuestion(x)).filter(Boolean).slice(0, 300);
  if (!questions.length) return null;
  const now = Date.now();
  return {id: o.id && typeof o.id === 'string' ? o.id : qid(), title: String(o.title || o.quiz || o.name || base || 'Practice quiz').trim().slice(0, 120), questions,
    created: +o.created || now, updated: +o.updated || now, best: o.best != null ? +o.best : null, last: o.last != null ? +o.last : null, tries: +o.tries || 0, lastAt: +o.lastAt || 0};
}
function normQuizzes(v){ return Array.isArray(v) ? v.map(x => normQuiz(x)).filter(Boolean) : []; }

/* ---- writing quizzes back out, in the same text format ---- */
function quizToText(qz){
  const out = ['---', `quiz: ${qz.title}`, '---'];
  qz.questions.forEach((x, k) => {
    out.push('', `${k + 1}. ${x.q}`);
    if (x.type === 'short') out.push(`Answer: ${x.answer}`);
    else if (x.type === 'tf') out.push(`Answer: ${x.choices[x.correct[0]]}`);
    else x.choices.forEach((c, i) => out.push(`${x.correct.includes(i) ? '*' : ''}${'abcdefgh'[i]}) ${c}`));
    if (x.why) out.push(`Why: ${x.why}`);
    if (x.review) out.push(`Review: ${x.review}`);
  });
  return out.join('\n') + '\n';
}
// add quizzes to a guide; with replace, a quiz with the same title gets the new questions and keeps its scores
function addQuizzes(g, list, replace){
  const qs = guideQuizzes(g); let added = 0, replaced = 0;
  list.forEach(qz => {
    const same = replace && qs.find(x => x.title.toLowerCase() === qz.title.toLowerCase());
    if (same){ same.questions = qz.questions; same.updated = Date.now(); replaced++; }
    else { qs.push({...qz, id: qs.some(x => x.id === qz.id) ? qid() : qz.id}); added++; }
  });
  g.updated = Date.now();
  if (added) achBump('quizzes', added);
  return {added, replaced};
}

/* ---- the quizzes section of a guide ---- */
const pctText = v => v == null ? '–' : `${Math.round(v)}%`;
function agoText(t){
  if (!t) return '';
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const n = Math.round((d0 - new Date(new Date(t).setHours(0, 0, 0, 0))) / 864e5);
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 7 ? `${n} days ago` : new Date(t).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}
function quizSummary(g){
  const qs = guideQuizzes(g), tried = qs.filter(q => q.best != null);
  return {n: qs.length, best: tried.length ? Math.round(tried.reduce((s, q) => s + q.best, 0) / tried.length) : null};
}
function quizSection(g){
  const qs = guideQuizzes(g);
  const row = qz => `<div class="g-qz-row"><div class="g-qz-info"><b>${esc(qz.title)}</b><small>${[`${qz.questions.length} question${qz.questions.length === 1 ? '' : 's'}`,
      qz.tries ? `best ${pctText(qz.best)}` : 'not taken yet', qz.tries ? `last ${pctText(qz.last)}` : '', qz.tries ? `${qz.tries} attempt${qz.tries === 1 ? '' : 's'}` : '', qz.lastAt ? agoText(qz.lastAt) : ''].filter(Boolean).join(' · ')}</small>
      ${qz.tries ? `<span class="bar2 g-qz-bar"><i style="width:${qz.best}%"></i></span>` : ''}</div>
    <div class="g-qz-btns"><button class="small-btn accent" data-qz="take" data-q="${qz.id}">${qz.tries ? 'Retake' : 'Take'}</button><button class="small-btn" data-qz="export" data-q="${qz.id}">Export</button><button class="small-btn" data-qz="del" data-q="${qz.id}">Delete</button></div></div>`;
  return `<section class="card g-quizzes" id="gQuizzes"><div class="g-qz-head"><div class="h first">Practice quizzes</div><span class="g-bar-sp"></span><button class="small-btn accent" data-qz="import">Import quiz</button></div>
    ${qs.length ? `<div class="g-qz-list">${qs.map(row).join('')}</div>`
      : `<p class="hint">No quizzes for this guide yet. Ask Claude for a practice quiz (Import quiz → “Instructions for Claude” has a prompt you can copy), then import the file or paste the text.</p>`}</section>`;
}

/* ---- importing into a guide ---- */
function openQuizImport(g){
  qImportFound = []; qImportGuide = g.id;
  $('#gImpBody').innerHTML = `<h3 id="gImpTitle">Import practice quizzes</h3>
    <p class="hint">Into <b>${esc(g.title)}</b>. Text (.md, .txt) or JSON. One file can hold several quizzes: start each with its own <code>---</code> / <code>quiz: Title</code> / <code>---</code> block.</p>
    <div class="g-imp-row"><label class="small-btn accent g-file">Choose files<input type="file" id="gImpFile" accept=".md,.markdown,.txt,.json,text/markdown,text/plain,application/json" multiple hidden></label><span class="hint">or paste below</span></div>
    <textarea id="gImpText" placeholder="${esc(QZ_FORMAT.split('\n').slice(0, 9).join('\n'))}\n…"></textarea>
    <label class="g-imp-chk"><input type="checkbox" id="gImpReplace" checked> Update quizzes with the same title instead of adding copies (keeps your scores)</label>
    <div id="gImpFound" class="g-imp-found"></div>
    <div class="g-imp-btns"><button class="small-btn" data-gi="cancel">Cancel</button><button class="small-btn accent" data-qi="go" disabled>Import</button></div>
    <details class="g-help" open><summary>Instructions for Claude</summary><p>Copy this, add your topic at the end, and send it to Claude. Then import what it gives you.</p>
      <button class="small-btn" data-qi="copy">Copy instructions</button></details>
    <details class="g-help"><summary>The format</summary><pre>${esc(QZ_FORMAT)}</pre>
      <p>Put <code>*</code> in front of the right choice's letter. Mark several for a “select all” question. True/false and short-answer questions use an <code>Answer:</code> line instead of choices. <code>Why:</code> and <code>Review:</code> are optional but shown after you answer.</p></details>`;
  $('#gImpModal').hidden = false;
  const show = () => {
    const n = qImportFound.length, qn = qImportFound.reduce((s, q) => s + q.questions.length, 0), btn = $('#gImpModal [data-qi="go"]');
    const have = guideQuizzes(guideById(qImportGuide) || {quizzes: []});
    $('#gImpFound').innerHTML = n ? `<b>${n} quiz${n === 1 ? '' : 'zes'} found · ${qn} question${qn === 1 ? '' : 's'}</b><ul>${qImportFound.map(qz => {
        const types = {}; qz.questions.forEach(x => types[x.type] = (types[x.type] || 0) + 1);
        const tn = {mc: 'multiple choice', tf: 'true/false', multi: 'select all', short: 'short answer'};
        const ex = have.some(x => x.title.toLowerCase() === qz.title.toLowerCase());
        return `<li><b>${esc(qz.title)}</b><small>${[`${qz.questions.length} questions`, Object.entries(types).map(([t, c]) => `${c} ${tn[t]}`).join(', '), ex ? 'already exists' : 'new'].join(' · ')}</small></li>`; }).join('')}</ul>` : '';
    btn.disabled = !n; btn.textContent = n ? `Import ${n} quiz${n === 1 ? '' : 'zes'}` : 'Import';
  };
  $('#gImpText').oninput = () => { qImportFound = $('#gImpText').value.trim() ? parseQuizzes($('#gImpText').value) : []; show(); };
  $('#gImpFile').onchange = e => {
    const files = [...e.target.files]; if (!files.length) return;
    Promise.all(files.map(f => f.text().then(t => parseQuizzes(t, f.name)))).then(lists => { qImportFound = lists.flat(); $('#gImpText').value = ''; show(); if (!qImportFound.length) toast("Couldn't find a quiz in that file."); });
  };
  setTimeout(() => $('#gImpText').focus(), 30);
}
$('#gImpModal').addEventListener('click', e => {
  if (e.target.closest('[data-qi="copy"]')){
    try { navigator.clipboard.writeText(QZ_CLAUDE).then(() => toast('Instructions copied. Add your topic and send it to Claude.'), () => toast("Couldn't copy here.")); } catch(err){ toast("Couldn't copy here."); }
    return;
  }
  if (!e.target.closest('[data-qi="go"]')) return;
  const g = guideById(qImportGuide); if (!g) return;
  const {added, replaced} = addQuizzes(g, qImportFound, $('#gImpReplace').checked);
  saveGuides(); $('#gImpModal').hidden = true; renderGuides();
  toast([added ? `Imported ${added} quiz${added === 1 ? '' : 'zes'}` : '', replaced ? `updated ${replaced}` : ''].filter(Boolean).join(', ') + '.');
  requestAnimationFrame(() => { const s = $('#gQuizzes'); s && s.scrollIntoView({block: 'nearest'}); });
});

/* ---- taking a quiz ---- */
function startQuiz(g, qz, only){
  const list = only && only.length ? only.slice() : qz.questions.map((_, k) => k);
  QR = {gid: g.id, qid: qz.id, list, i: 0, picked: [], done: false, res: [], full: !(only && only.length), short: ''};
  renderGuides(); window.scrollTo(0, 0);
}
function quizNow(){
  const g = QR && guideById(QR.gid), qz = g && guideQuizzes(g).find(x => x.id === QR.qid);
  return qz ? {g, qz} : null;
}
const normAns = s => String(s).toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9.%$=+\-]+/g, ' ').replace(/\b(the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();
const choiceLabel = (x, i) => x.type === 'tf' ? x.choices[i] : `${LETTERS[i]}) ${x.choices[i]}`;
function qInline(s){ return String(s || '').split('\n').map(mdInline).join('<br>'); }
function renderQuizRun(){
  const cur = quizNow(); if (!cur){ QR = null; return renderGuides(); }
  const {g, qz} = cur;
  if (QR.i >= QR.list.length) return renderQuizResults(g, qz);
  const x = qz.questions[QR.list[QR.i]], n = QR.list.length, right = QR.res.filter(r => r.ok).length, r = QR.done ? QR.res[QR.res.length - 1] : null;
  let body = '';
  if (x.type === 'short'){
    body = `<div class="qz-short"><input id="qzShort" type="text" autocomplete="off" placeholder="Type your answer" value="${esc(QR.short)}" ${QR.done || QR.reveal ? 'disabled' : ''}>
      ${QR.done || QR.reveal ? '' : `<button class="small-btn accent" data-qz="check">Check</button><button class="small-btn" data-qz="reveal">I don't know</button>`}</div>`;
    if (QR.reveal && !QR.done) body += `<div class="qz-fb"><b>The answer:</b> ${qInline(x.answer)}<div class="qz-self"><span>Did you get it?</span><button class="small-btn qz-yes" data-qz="self" data-ok="1">I got it right</button><button class="small-btn qz-no" data-qz="self" data-ok="0">I got it wrong</button></div></div>`;
  } else {
    body = `<div class="qz-choices${x.type === 'multi' ? ' multi' : ''}">${x.choices.map((c, i) => {
      const on = QR.picked.includes(i), cls = QR.done ? (x.correct.includes(i) ? ' right' : on ? ' wrong' : ' dim') : on ? ' on' : '';
      return `<button class="qz-ch${cls}" data-qz="pick" data-i="${i}" ${QR.done ? 'disabled' : ''} aria-pressed="${on}"><span class="qz-l">${x.type === 'tf' ? (i ? 'F' : 'T') : LETTERS[i]}</span><span class="qz-t">${qInline(c)}</span>${QR.done && x.correct.includes(i) ? '<span class="qz-mark">✓</span>' : QR.done && on ? '<span class="qz-mark">✗</span>' : ''}</button>`; }).join('')}</div>
      ${x.type === 'multi' && !QR.done ? `<div class="qz-row"><small class="hint">Select all that apply.</small><span class="g-bar-sp"></span><button class="small-btn accent" data-qz="check" ${QR.picked.length ? '' : 'disabled'}>Check</button></div>` : ''}`;
  }
  if (r){
    const ans = x.type === 'short' ? qInline(x.answer) : x.correct.map(i => esc(choiceLabel(x, i))).join(', ');
    body += `<div class="qz-fb ${r.ok ? 'ok' : 'bad'}"><b>${r.ok ? 'Correct.' : 'Not quite.'}</b>${r.ok && x.type !== 'short' ? '' : ` The answer is <b>${ans}</b>.`}
      ${x.why ? `<p>${qInline(x.why)}</p>` : ''}${!r.ok && x.review ? `<p class="qz-rev"><b>Review:</b> ${qInline(x.review)}</p>` : ''}</div>
      <div class="qz-row"><span class="g-bar-sp"></span><button class="small-btn accent" data-qz="next" id="qzNext">${QR.i + 1 < n ? 'Next question →' : 'See results'}</button></div>`;
  }
  $('#guidesBody').innerHTML = `<div class="g-bar"><button class="small-btn" data-qz="quit">← Back to guide</button><span class="g-bar-sp"></span><span class="qz-count">${right} of ${QR.res.length} right so far</span></div>
    <div class="card qz-run"><div class="qz-top"><div><b>${esc(qz.title)}</b><small>${esc(g.title)}${QR.full ? '' : ' · missed questions only'}</small></div><span class="qz-num">${QR.i + 1} / ${n}</span></div>
      <span class="bar2 qz-bar"><i style="width:${(QR.i + (QR.done ? 1 : 0)) / n * 100}%"></i></span>
      <div class="qz-q">${qInline(x.q)}</div>${body}
      <p class="qz-keys hint">${x.type === 'short' ? 'Enter to check.' : `Keys: ${x.type === 'tf' ? 'T / F' : `A–${LETTERS[x.choices.length - 1]}`}${x.type === 'multi' ? ' to select' : ' to answer'}, Enter for ${QR.done ? 'next' : x.type === 'multi' ? 'check' : 'next'}.`}</p></div>`;
  if (x.type === 'short' && !QR.done && !QR.reveal){ const s = $('#qzShort'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  else if (QR.done) $('#qzNext').focus();
}
function quizAnswer(ok, given){
  const cur = quizNow(); if (!cur || QR.done) return;
  QR.res.push({k: QR.list[QR.i], ok, given}); QR.done = true; renderQuizRun();
}
function quizPick(i){
  const cur = quizNow(); if (!cur || QR.done) return;
  const x = cur.qz.questions[QR.list[QR.i]]; if (x.type === 'short' || i >= x.choices.length) return;
  if (x.type === 'multi'){ QR.picked = QR.picked.includes(i) ? QR.picked.filter(v => v !== i) : [...QR.picked, i]; renderQuizRun(); return; }
  QR.picked = [i]; quizAnswer(x.correct.includes(i), [i]);
}
function quizCheck(){
  const cur = quizNow(); if (!cur || QR.done) return;
  const x = cur.qz.questions[QR.list[QR.i]];
  if (x.type === 'multi'){ if (!QR.picked.length) return; const p = QR.picked.slice().sort((a, b) => a - b); quizAnswer(p.length === x.correct.length && p.every((v, k) => v === x.correct[k]), p); return; }
  if (x.type !== 'short') return;
  const v = ($('#qzShort') || {}).value || ''; QR.short = v;
  if (!v.trim()){ $('#qzShort').focus(); return; }
  if (normAns(v) === normAns(x.answer)) quizAnswer(true, v);
  else { QR.reveal = true; renderQuizRun(); }
}
function quizNext(){
  if (!QR || !QR.done) return;
  QR.i++; QR.picked = []; QR.done = false; QR.short = ''; QR.reveal = false;
  if (QR.i >= QR.list.length) quizFinish();
  renderQuizRun(); window.scrollTo(0, 0);
}
function quizFinish(){
  const cur = quizNow(); if (!cur || QR.saved) return;
  QR.saved = true;
  const {g, qz} = cur, pct = QR.res.filter(r => r.ok).length / QR.res.length * 100;
  if (!QR.full) return;
  QR.prevBest = qz.best;
  qz.last = pct; qz.best = qz.best == null ? pct : Math.max(qz.best, pct); qz.tries = (qz.tries || 0) + 1; qz.lastAt = Date.now();
  saveGuides();
  if (pct === 100){ achBump('quizPerfect'); fx.burst(); }
}
function renderQuizResults(g, qz){
  const right = QR.res.filter(r => r.ok).length, n = QR.res.length, pct = Math.round(right / n * 100);
  const missed = QR.res.filter(r => !r.ok), newBest = QR.full && QR.prevBest != null && pct > QR.prevBest;
  const reviews = [...new Set(missed.map(r => qz.questions[r.k].review).filter(Boolean))];
  const given = (x, r) => x.type === 'short' ? (String(r.given || '').trim() ? esc(r.given) : '<em>no answer</em>') : r.given.map(i => esc(choiceLabel(x, i))).join(', ');
  const correctOf = x => x.type === 'short' ? qInline(x.answer) : x.correct.map(i => esc(choiceLabel(x, i))).join(', ');
  $('#guidesBody').innerHTML = `<div class="g-bar"><button class="small-btn" data-qz="quit">← Back to guide</button></div>
    <div class="card qz-run qz-res"><div class="qz-top"><div><b>${esc(qz.title)}</b><small>${esc(g.title)}${QR.full ? '' : ' · missed questions only'}</small></div></div>
      <div class="qz-score ${pct === 100 ? 'ok' : pct < 60 ? 'bad' : ''}"><b>${right} / ${n}</b><span>${pct}%</span></div>
      <p class="hint qz-score-sub">${QR.full ? [newBest ? 'New best!' : '', `Best ${pctText(qz.best)}`, `${qz.tries} attempt${qz.tries === 1 ? '' : 's'}`].filter(Boolean).join(' · ') : 'Practice round on the ones you missed. It doesn’t change your best score.'}</p>
      <div class="qz-row qz-res-btns"><button class="small-btn accent" data-qz="retake">Retake the whole quiz</button>${missed.length ? `<button class="small-btn" data-qz="retry">Retry the ${missed.length} missed</button>` : ''}<button class="small-btn" data-qz="quit">Back to guide</button></div>
      ${reviews.length ? `<div class="qz-revlist"><div class="h">What to review</div><ul>${reviews.map(t => `<li>${qInline(t)}</li>`).join('')}</ul></div>` : ''}
      ${missed.length ? `<div class="h">Questions you missed</div>${missed.map(r => { const x = qz.questions[r.k]; return `<div class="qz-miss"><div class="qz-miss-q"><span class="qz-l">${r.k + 1}</span><div>${qInline(x.q)}</div></div>
          <p><span class="neg">Your answer:</span> ${given(x, r)}</p><p><span class="pos">Correct:</span> ${correctOf(x)}</p>${x.why ? `<p class="hint">${qInline(x.why)}</p>` : ''}${x.review ? `<p class="qz-rev"><b>Review:</b> ${qInline(x.review)}</p>` : ''}</div>`; }).join('')}`
        : '<p class="qz-perfect">Every question right.</p>'}</div>`;
}

/* ---- events ---- */
$('#page-guides').addEventListener('click', e => {
  const b = e.target.closest('[data-qz]'); if (!b) return;
  const a = b.dataset.qz, g = gView && guideById(gView), qz = g && b.dataset.q && guideQuizzes(g).find(x => x.id === b.dataset.q);
  if (a === 'import' && g) openQuizImport(g);
  else if (a === 'take' && qz) startQuiz(g, qz);
  else if (a === 'export' && qz){
    const txt = quizToText(qz), name = `${slug(qz.title)}.md`;
    if (window.top !== window){ try { navigator.clipboard.writeText(txt).then(() => toast('Quiz copied as text.'), () => toast("Couldn't copy here.")); } catch(err){} }
    else { downloadText(name, txt); toast(`Saved ${name}`); }
  }
  else if (a === 'del' && qz){
    if (!b.dataset.sure){ b.dataset.sure = 1; b.textContent = 'Click again'; b.classList.add('danger'); setTimeout(() => { if (b.isConnected){ delete b.dataset.sure; b.textContent = 'Delete'; b.classList.remove('danger'); } }, 3500); return; }
    g.quizzes = guideQuizzes(g).filter(x => x.id !== qz.id); g.updated = Date.now(); saveGuides(); renderGuides(); toast('Quiz deleted.');
  }
  else if (a === 'quizzes'){ const s = $('#gQuizzes'); s && s.scrollIntoView({behavior: motion() === 'off' ? 'auto' : 'smooth', block: 'start'}); }
  else if (a === 'pick') quizPick(+b.dataset.i);
  else if (a === 'check') quizCheck();
  else if (a === 'reveal'){ QR.short = ($('#qzShort') || {}).value || ''; QR.reveal = true; renderQuizRun(); }
  else if (a === 'self') quizAnswer(b.dataset.ok === '1', QR.short);
  else if (a === 'next') quizNext();
  else if (a === 'quit'){ if (QR) gView = QR.gid; QR = null; renderGuides(); requestAnimationFrame(() => { const s = $('#gQuizzes'); s && s.scrollIntoView({block: 'start'}); }); }
  else if (a === 'retake' || a === 'retry'){ const cur = quizNow(); if (cur) startQuiz(cur.g, cur.qz, a === 'retry' ? QR.res.filter(r => !r.ok).map(r => r.k) : null); }
});
$('#page-guides').addEventListener('keydown', e => { if (e.target.id === 'qzShort' && e.key === 'Enter'){ e.preventDefault(); quizCheck(); } });
// While a quiz is on screen, letters/numbers answer and Enter moves on, instead of the timer's shortcuts.
addEventListener('keydown', e => {
  if (!QR || $('#page-guides').hidden || !$('#gImpModal').hidden || e.metaKey || e.ctrlKey || e.altKey || e.target.matches('input, textarea, select')) return;
  const cur = quizNow(); if (!cur || QR.i >= QR.list.length) return;
  const x = cur.qz.questions[QR.list[QR.i]], k = e.key.toLowerCase();
  let i = -1;
  if (x.type === 'tf' && (k === 't' || k === 'f')) i = k === 't' ? 0 : 1;
  else if (x.type !== 'short' && /^[a-h]$/.test(k)) i = k.charCodeAt(0) - 97;
  else if (x.type !== 'short' && /^[1-8]$/.test(k)) i = +k - 1;
  if (i >= 0 || /^[1-9a-h]$/.test(k)){ e.preventDefault(); e.stopPropagation(); if (i >= 0 && x.choices && i < x.choices.length) quizPick(i); return; }
  if (k === 'enter'){
    if (e.target.closest('button') && !e.target.closest('[data-qz="next"]')) return;
    e.preventDefault(); e.stopPropagation();
    if (QR.done) quizNext(); else if (x.type === 'multi') quizCheck();
  }
}, true);
