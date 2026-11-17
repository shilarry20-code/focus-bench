/* ---------- practice quizzes: each study guide can hold quizzes you import and take ---------- */
// A quiz lives on its guide (g.quizzes), so it saves, backs up, exports and deletes with the guide.
// Quiz = {id, title, questions, pick, shuffle, prevSet, created, updated, best, last, tries, lastAt}
//   A quiz is a bank: each attempt draws `pick` questions (0 = all, empty = 10), favoring unseen and missed ones.
// Question = {id, type: 'mc' | 'tf' | 'multi' | 'short', q, choices, correct: [indexes], answer, why, review, st}
//   st = {seen, right, lastOk, last}: how this question has gone for you, kept when the quiz is edited.
// Loaded before guides.js; everything here runs only when called, after every script has loaded.

let QR = null;          // the quiz being taken: {gid, qid, list, perms, i, picked, done, res, full, short}
let QE = null;          // the quiz being written or edited (see the editor section)
let qImportFound = [], qImportGuide = null;
const qid = () => 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const qqid = () => 'x' + Math.random().toString(36).slice(2, 10);
const guideQuizzes = g => Array.isArray(g.quizzes) ? g.quizzes : (g.quizzes = []);
const LETTERS = 'ABCDEFGH';

/* ---- reading quizzes: text (made by Claude or by hand) or JSON ---- */
const QZ_FORMAT = `---
quiz: Chapter 4 practice
pick: 10
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
- Write a question bank of about 30 questions (more is fine) covering the whole topic, with a mix of question types and difficulty. Each attempt in the app draws a random set from the bank, so every attempt is different.
- Start each quiz with the --- / quiz: Title / pick: 10 / --- block. pick is how many questions each attempt draws (use "all" for every question). Several quizzes can go one after another.
- Number every question (1. 2. 3.).
- Multiple choice: letter the choices a) b) c) d) and put * directly in front of the correct letter, like *b). Mark several with * for a "select all" question.
- True/false or short answer: no choices, just an "Answer:" line.
- Give every question a "Why:" line explaining the answer, and a "Review:" line saying exactly what to review if I get it wrong (chapter, section, or topic).
- Don't repeat the same question with different wording; make each question test something distinct.
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
    return normQuiz({title: title || base || 'Practice quiz', questions: parseQuestions(body), pick: p.meta.pick != null ? p.meta.pick : p.meta.questions_per_attempt, shuffle: p.meta.shuffle}, base);
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
  const questions = raw.map(x => {
    const q = ready(x) ? {type: x.type, q: x.q, choices: x.choices, correct: x.correct, answer: x.answer, why: x.why || '', review: x.review || ''} : normQuestion(x);
    if (!q) return null;
    q.id = x && typeof x.id === 'string' ? x.id : qqid();
    if (x && x.st && typeof x.st === 'object') q.st = {seen: +x.st.seen || 0, right: +x.st.right || 0, lastOk: typeof x.st.lastOk === 'boolean' ? x.st.lastOk : null, last: +x.st.last || 0};
    return q;
  }).filter(Boolean).slice(0, 300);
  if (!questions.length) return null;
  const now = Date.now();
  return {id: o.id && typeof o.id === 'string' ? o.id : qid(), title: String(o.title || o.quiz || o.name || base || 'Practice quiz').trim().slice(0, 120), questions,
    pick: parsePick(o.pick != null ? o.pick : o.questionsPerAttempt), shuffle: !(o.shuffle === false || /^(no|false|off|0)$/i.test(String(o.shuffle == null ? '' : o.shuffle).trim())),
    prevSet: Array.isArray(o.prevSet) ? o.prevSet.filter(v => typeof v === 'string') : [],
    created: +o.created || now, updated: +o.updated || now, best: o.best != null ? +o.best : null, last: o.last != null ? +o.last : null, tries: +o.tries || 0, lastAt: +o.lastAt || 0};
}
// questions per attempt: a number, 0 for "all", or null for the default (10)
function parsePick(v){
  if (v == null || String(v).trim() === '') return null;
  if (/^(all|every|0)$/i.test(String(v).trim())) return 0;
  const n = parseInt(v, 10); return n > 0 ? Math.min(n, 300) : null;
}
const perAttempt = qz => { const n = qz.questions.length; return qz.pick === 0 ? n : Math.min(qz.pick || 10, n); };
// when a quiz's questions are replaced (editing, re-importing), questions with the same text keep their id and history
function carryStats(oldQs, newQs){
  const by = new Map(); (oldQs || []).forEach(x => by.set(normAns(x.q), x));
  const used = new Set();
  newQs.forEach(x => { const o = by.get(normAns(x.q)) || (x.id && (oldQs || []).find(y => y.id === x.id)); if (o && !used.has(o.id)){ used.add(o.id); x.id = o.id; if (o.st) x.st = o.st; } else if (!x.id || used.has(x.id)) x.id = qqid(); });
  return newQs;
}
function normQuizzes(v){ return Array.isArray(v) ? v.map(x => normQuiz(x)).filter(Boolean) : []; }

/* ---- writing quizzes back out, in the same text format ---- */
function quizToText(qz){
  const out = ['---', `quiz: ${qz.title}`];
  if (qz.pick != null) out.push(`pick: ${qz.pick === 0 ? 'all' : qz.pick}`);
  if (qz.shuffle === false) out.push('shuffle: no');
  out.push('---');
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
    if (same){ same.questions = carryStats(same.questions, qz.questions); if (qz.pick != null) same.pick = qz.pick; same.updated = Date.now(); replaced++; }
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
// which tab a guide is showing: 'guide' or 'quizzes', remembered per guide
const guideTab = g => (P.gTabs && P.gTabs[g.id]) === 'quizzes' ? 'quizzes' : 'guide';
function setGuideTab(id, t){
  const m = P.gTabs || (P.gTabs = {});
  if (t === 'quizzes') m[id] = t; else delete m[id];
  Object.keys(m).forEach(k => { if (!guideById(k)) delete m[k]; });
  saveP();
}
function quizPage(g){
  const qs = guideQuizzes(g), sm = quizSummary(g), tries = qs.reduce((n, q) => n + (q.tries || 0), 0), qn = qs.reduce((n, q) => n + q.questions.length, 0);
  const card = qz => {
    const n = qz.questions.length, per = perAttempt(qz), seen = qz.questions.filter(x => x.st && x.st.seen).length, missed = qz.questions.filter(x => x.st && x.st.lastOk === false).length;
    return `<div class="card g-qz-card"><div class="g-qz-info"><b>${esc(qz.title)}</b>
      <small>${[per < n ? `Bank of ${n} questions · ${per} per attempt` : `${n} question${n === 1 ? '' : 's'}`, qz.tries ? `${qz.tries} attempt${qz.tries === 1 ? '' : 's'}` : 'not taken yet', qz.lastAt ? `last taken ${agoText(qz.lastAt)}` : ''].filter(Boolean).join(' · ')}</small>
      ${seen ? `<small>${seen} of ${n} seen${missed ? ` · <span class="neg">${missed} still missed</span>` : ' · none missed right now'}</small>` : ''}</div>
    ${qz.tries ? `<div class="g-qz-scores"><span><b class="${qz.best === 100 ? 'pos' : ''}">${pctText(qz.best)}</b><small>best</small></span><span><b>${pctText(qz.last)}</b><small>last</small></span></div>
      <span class="bar2 g-qz-bar"><i style="width:${qz.best}%"></i></span>` : ''}
    <div class="g-qz-btns"><button class="small-btn accent" data-qz="take" data-q="${qz.id}">${qz.tries ? 'Retake' : 'Take quiz'}</button><span class="g-bar-sp"></span><button class="small-btn" data-qz="edit" data-q="${qz.id}">Edit</button><button class="small-btn" data-qz="export" data-q="${qz.id}">Export</button><button class="small-btn" data-qz="del" data-q="${qz.id}">Delete</button></div></div>`; };
  return `<div class="g-qz-page">
    <div class="g-qz-top">${qs.length ? `<div class="pf-kv g-qz-sum"><span><b>${qs.length}</b><small>quiz${qs.length === 1 ? '' : 'zes'} · ${qn} questions</small></span><span><b>${sm.best != null ? sm.best + '%' : '–'}</b><small>average best score</small></span><span><b>${tries}</b><small>attempt${tries === 1 ? '' : 's'}</small></span></div>` : '<span class="g-bar-sp"></span>'}
      <div class="g-qz-new"><button class="small-btn" data-qz="new">+ New quiz</button><button class="small-btn accent" data-qz="import">Import quiz</button></div></div>
    ${qs.length ? `<div class="g-qz-grid">${qs.map(card).join('')}</div>`
      : `<div class="card g-empty"><b>No practice quizzes yet</b><p>Write one yourself, or ask Claude for a question bank on this guide's topic and import the file it gives you. <b>Import quiz</b> has instructions you can copy straight to Claude.</p><div class="g-empty-btns"><button class="small-btn" data-qz="new">+ New quiz</button><button class="small-btn accent" data-qz="import">Import quiz</button></div></div>`}
  </div>`;
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
      <p><code>pick:</code> is how many questions each attempt draws from the bank (or <code>all</code>). Leave it out for 10. Put <code>*</code> in front of the right choice's letter. Mark several for a “select all” question. True/false and short-answer questions use an <code>Answer:</code> line instead of choices. <code>Why:</code> and <code>Review:</code> are optional but shown after you answer.</p></details>`;
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
  saveGuides(); $('#gImpModal').hidden = true; setGuideTab(g.id, 'quizzes'); renderGuides(); window.scrollTo(0, 0);
  toast([added ? `Imported ${added} quiz${added === 1 ? '' : 'zes'}` : '', replaced ? `updated ${replaced}` : ''].filter(Boolean).join(', ') + '.');
});

/* ---- taking a quiz ---- */
function shuffled(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// Draw an attempt from the bank: unseen and recently missed questions are likeliest, ones you keep getting right
// show up less (never zero), and last attempt's set is avoided when the bank is big enough.
function drawQuestions(qz){
  const n = qz.questions.length, k = perAttempt(qz), prev = new Set(qz.prevSet || []);
  const keyed = qz.questions.map((x, i) => {
    const st = x.st || {};
    let w = !st.seen ? 4 : st.lastOk === false ? 5 : 0.4 + 2 * (1 - Math.min(st.right || 0, st.seen) / st.seen);
    if (prev.has(x.id)) w *= n >= 2 * k ? 0.1 : n > k ? 0.5 : 1;
    return {i, key: Math.pow(Math.random(), 1 / w)};
  });
  return shuffled(keyed.sort((a, b) => b.key - a.key).slice(0, k).map(o => o.i));
}
// Choices are shuffled unless the quiz says not to, it's true/false, or a choice points at the others
// ("All of the above", "Both A and B"), in which case that question keeps its order.
const POINTS_AT_OTHERS = /\b(above|below|of these|of the preceding)\b|\b(both|neither)\b|^\(?[a-h]\)?\s*(,|and|&|or)\s*\(?[a-h]\)?(\W|$)|\b[a-h] (and|or) [a-h]\b/i;
function choicePerm(qz, x){
  const ids = (x.choices || []).map((_, i) => i);
  if (qz.shuffle === false || x.type === 'tf' || x.type === 'short' || x.choices.some(c => POINTS_AT_OTHERS.test(c))) return ids;
  return shuffled(ids);
}
function startQuiz(g, qz, only){
  const full = !(only && only.length), list = full ? drawQuestions(qz) : only.slice(), perms = {};
  list.forEach(k => { perms[k] = choicePerm(qz, qz.questions[k]); });
  if (full){ qz.prevSet = list.map(k => qz.questions[k].id); saveGuides(); }
  QR = {gid: g.id, qid: qz.id, list, perms, bank: qz.questions.length, i: 0, picked: [], done: false, res: [], full, short: ''};
  renderGuides(); window.scrollTo(0, 0);
}
// the order and letters a question's choices were shown in during this attempt
const permOf = k => (QR && QR.perms && QR.perms[k]) || null;
function shownLabel(k, x, i){ if (x.type === 'tf') return x.choices[i]; const p = permOf(k); return `${LETTERS[p ? p.indexOf(i) : i]}) ${x.choices[i]}`; }
function inShownOrder(k, arr){ const p = permOf(k); return p ? arr.slice().sort((a, b) => p.indexOf(a) - p.indexOf(b)) : arr.slice(); }
function quizNow(){
  const g = QR && guideById(QR.gid), qz = g && guideQuizzes(g).find(x => x.id === QR.qid);
  return qz ? {g, qz} : null;
}
const normAns = s => String(s).toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9.%$=+\-]+/g, ' ').replace(/\b(the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();
function qInline(s){ return String(s || '').split('\n').map(mdInline).join('<br>'); }
function renderQuizRun(){
  const cur = quizNow(); if (!cur){ QR = null; return renderGuides(); }
  const {g, qz} = cur;
  if (QR.i >= QR.list.length) return renderQuizResults(g, qz);
  const qk = QR.list[QR.i], x = qz.questions[qk], n = QR.list.length, right = QR.res.filter(r => r.ok).length, r = QR.done ? QR.res[QR.res.length - 1] : null;
  const order = permOf(qk) || x.choices.map((_, i) => i);
  let body = '';
  if (x.type === 'short'){
    body = `<div class="qz-short"><input id="qzShort" type="text" autocomplete="off" placeholder="Type your answer" value="${esc(QR.short)}" ${QR.done || QR.reveal ? 'disabled' : ''}>
      ${QR.done || QR.reveal ? '' : `<button class="small-btn accent" data-qz="check">Check</button><button class="small-btn" data-qz="reveal">I don't know</button>`}</div>`;
    if (QR.reveal && !QR.done) body += `<div class="qz-fb"><b>The answer:</b> ${qInline(x.answer)}<div class="qz-self"><span>Did you get it?</span><button class="small-btn qz-yes" data-qz="self" data-ok="1">I got it right</button><button class="small-btn qz-no" data-qz="self" data-ok="0">I got it wrong</button></div></div>`;
  } else {
    body = `<div class="qz-choices${x.type === 'multi' ? ' multi' : ''}">${order.map((i, d) => {
      const c = x.choices[i], on = QR.picked.includes(i), cls = QR.done ? (x.correct.includes(i) ? ' right' : on ? ' wrong' : ' dim') : on ? ' on' : '';
      return `<button class="qz-ch${cls}" data-qz="pick" data-i="${i}" ${QR.done ? 'disabled' : ''} aria-pressed="${on}"><span class="qz-l">${x.type === 'tf' ? (i ? 'F' : 'T') : LETTERS[d]}</span><span class="qz-t">${qInline(c)}</span>${QR.done && x.correct.includes(i) ? '<span class="qz-mark">✓</span>' : QR.done && on ? '<span class="qz-mark">✗</span>' : ''}</button>`; }).join('')}</div>
      ${x.type === 'multi' && !QR.done ? `<div class="qz-row"><small class="hint">Select all that apply.</small><span class="g-bar-sp"></span><button class="small-btn accent" data-qz="check" ${QR.picked.length ? '' : 'disabled'}>Check</button></div>` : ''}`;
  }
  if (r){
    const ans = x.type === 'short' ? qInline(x.answer) : inShownOrder(qk, x.correct).map(i => esc(shownLabel(qk, x, i))).join(', ');
    body += `<div class="qz-fb ${r.ok ? 'ok' : 'bad'}"><b>${r.ok ? 'Correct.' : 'Not quite.'}</b>${r.ok && x.type !== 'short' ? '' : ` The answer is <b>${ans}</b>.`}
      ${x.why ? `<p>${qInline(x.why)}</p>` : ''}${!r.ok && x.review ? `<p class="qz-rev"><b>Review:</b> ${qInline(x.review)}</p>` : ''}</div>
      <div class="qz-row"><span class="g-bar-sp"></span><button class="small-btn accent" data-qz="next" id="qzNext">${QR.i + 1 < n ? 'Next question →' : 'See results'}</button></div>`;
  }
  $('#guidesBody').innerHTML = `<div class="g-bar"><button class="small-btn" data-qz="quit">← Back to quizzes</button><span class="g-bar-sp"></span><span class="qz-count">${right} of ${QR.res.length} right so far</span></div>
    <div class="card qz-run"><div class="qz-top"><div><b>${esc(qz.title)}</b><small>${esc(g.title)}${QR.full ? (QR.bank > n ? ` · ${n} of ${QR.bank} questions this time` : '') : ' · missed questions only'}</small></div><span class="qz-num">${QR.i + 1} / ${n}</span></div>
      <span class="bar2 qz-bar"><i style="width:${(QR.i + (QR.done ? 1 : 0)) / n * 100}%"></i></span>
      <div class="qz-q">${qInline(x.q)}</div>${body}
      <p class="qz-keys hint">${x.type === 'short' ? 'Enter to check.' : `Keys: ${x.type === 'tf' ? 'T / F' : `A–${LETTERS[x.choices.length - 1]}`}${x.type === 'multi' ? ' to select' : ' to answer'}, Enter for ${QR.done ? 'next' : x.type === 'multi' ? 'check' : 'next'}.`}</p></div>`;
  if (x.type === 'short' && !QR.done && !QR.reveal){ const s = $('#qzShort'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  else if (QR.done) $('#qzNext').focus();
}
function quizAnswer(ok, given){
  const cur = quizNow(); if (!cur || QR.done) return;
  const x = cur.qz.questions[QR.list[QR.i]], st = x.st || (x.st = {seen: 0, right: 0, lastOk: null, last: 0});
  st.seen++; if (ok) st.right++; st.lastOk = ok; st.last = Date.now(); saveGuides();
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
  const given = (x, r) => x.type === 'short' ? (String(r.given || '').trim() ? esc(r.given) : '<em>no answer</em>') : inShownOrder(r.k, r.given).map(i => esc(shownLabel(r.k, x, i))).join(', ');
  const correctOf = (x, r) => x.type === 'short' ? qInline(x.answer) : inShownOrder(r.k, x.correct).map(i => esc(shownLabel(r.k, x, i))).join(', ');
  $('#guidesBody').innerHTML = `<div class="g-bar"><button class="small-btn" data-qz="quit">← Back to quizzes</button></div>
    <div class="card qz-run qz-res"><div class="qz-top"><div><b>${esc(qz.title)}</b><small>${esc(g.title)}${QR.full ? (QR.bank > n ? ` · ${n} drawn from a bank of ${QR.bank}` : '') : ' · missed questions only'}</small></div></div>
      <div class="qz-score ${pct === 100 ? 'ok' : pct < 60 ? 'bad' : ''}"><b>${right} / ${n}</b><span>${pct}%</span></div>
      <p class="hint qz-score-sub">${QR.full ? [newBest ? 'New best!' : '', `Best ${pctText(qz.best)}`, `${qz.tries} attempt${qz.tries === 1 ? '' : 's'}`].filter(Boolean).join(' · ') : 'Practice round on the ones you missed. It doesn’t change your best score.'}</p>
      <div class="qz-row qz-res-btns"><button class="small-btn accent" data-qz="retake">Retake the whole quiz</button>${missed.length ? `<button class="small-btn" data-qz="retry">Retry the ${missed.length} missed</button>` : ''}<button class="small-btn" data-qz="copy">Copy results</button><button class="small-btn" data-qz="quit">Back to quizzes</button></div>
      <div class="qz-copybox" id="qzCopyBox" hidden><p class="hint">Copying isn't allowed here. Select the text below and copy it yourself.</p><textarea readonly></textarea></div>
      ${reviews.length ? `<div class="qz-revlist"><div class="h">What to review</div><ul>${reviews.map(t => `<li>${qInline(t)}</li>`).join('')}</ul></div>` : ''}
      ${missed.length ? `<div class="h">Questions you missed</div>${missed.map(r => { const x = qz.questions[r.k]; return `<div class="qz-miss"><div class="qz-miss-q"><span class="qz-l">${QR.res.indexOf(r) + 1}</span><div>${qInline(x.q)}</div></div>
          <p><span class="neg">Your answer:</span> ${given(x, r)}</p><p><span class="pos">Correct:</span> ${correctOf(x, r)}</p>${x.why ? `<p class="hint">${qInline(x.why)}</p>` : ''}${x.review ? `<p class="qz-rev"><b>Review:</b> ${qInline(x.review)}</p>` : ''}</div>`; }).join('')}`
        : '<p class="qz-perfect">Every question right.</p>'}</div>`;
}

/* ---- copying results as plain text, to paste into Claude or anywhere else ---- */
const plain = s => String(s || '').replace(/\s*\n\s*/g, ' / ').trim();
function quizResultsText(){
  const cur = quizNow(); if (!cur) return '';
  const {g, qz} = cur, right = QR.res.filter(r => r.ok).length, n = QR.res.length;
  const ansText = (x, r) => x.type === 'short' ? (String(r.given || '').trim() ? plain(r.given) : '(no answer)') : inShownOrder(r.k, r.given).map(i => plain(shownLabel(r.k, x, i))).join(', ');
  const correctText = (x, r) => x.type === 'short' ? plain(x.answer) : inShownOrder(r.k, x.correct).map(i => plain(shownLabel(r.k, x, i))).join(', ');
  const L = [`Practice quiz results: ${qz.title}`, `Study guide: ${g.title}${g.cls ? ` (${g.cls})` : ''}`,
    `Score: ${right}/${n} (${Math.round(right / n * 100)}%)${QR.full && QR.bank > n ? ` · ${n} questions drawn from a bank of ${QR.bank}` : ''}${QR.full ? ` · best ${pctText(qz.best)} · attempt ${qz.tries}` : ' · retry of missed questions only'}`,
    `Taken: ${new Date().toLocaleString(undefined, {month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'})}`];
  const reviews = [...new Set(QR.res.filter(r => !r.ok).map(r => qz.questions[r.k].review).filter(Boolean))];
  if (reviews.length) L.push('', 'What to review:', ...reviews.map(t => `- ${plain(t)}`));
  L.push('', 'Questions:');
  QR.res.forEach((r, k) => {
    const x = qz.questions[r.k];
    L.push('', `${k + 1}. [${r.ok ? 'RIGHT' : 'WRONG'}] ${plain(x.q)}`);
    if (x.type !== 'short' && x.type !== 'tf') L.push(`   Choices: ${(permOf(r.k) || x.choices.map((_, i) => i)).map((i, d) => `${LETTERS[d]}) ${plain(x.choices[i])}`).join('  ')}`);
    L.push(`   My answer: ${ansText(x, r)}`);
    if (!r.ok) L.push(`   Correct answer: ${correctText(x, r)}`);
    if (!r.ok && x.review) L.push(`   Review: ${plain(x.review)}`);
  });
  return L.join('\n') + '\n';
}
function copyQuizResults(){
  const t = quizResultsText(); if (!t) return;
  const fallback = () => { const box = $('#qzCopyBox'); if (!box) return; box.hidden = false; const ta = box.querySelector('textarea'); ta.value = t; ta.focus(); ta.select(); toast('Select the text and copy it.'); };
  try { navigator.clipboard.writeText(t).then(() => toast('Results copied. Paste them anywhere.'), fallback); } catch(e){ fallback(); }
}

/* ---- writing and editing quizzes ---- */
// QE = {gid, id (null for a new quiz), title, pick, shuffle, qs (working copies), mode: 'form' | 'text', text, dirty, errs, textWarn}
const QTYPES = [['mc', 'Multiple choice'], ['tf', 'True / false'], ['multi', 'Select all that apply'], ['short', 'Short answer']];
const blankQ = () => ({id: qqid(), type: 'mc', q: '', choices: ['', '', '', ''], correct: [], answer: '', why: '', review: ''});
const workCopy = x => ({...x, choices: x.choices ? x.choices.slice() : [], correct: x.correct ? x.correct.slice() : [], answer: x.answer || '', why: x.why || '', review: x.review || ''});
function openQuizEditor(g, qz){
  QR = null;
  QE = {gid: g.id, id: qz ? qz.id : null, title: qz ? qz.title : '', pick: qz ? qz.pick : null, shuffle: qz ? qz.shuffle !== false : true,
    qs: qz ? qz.questions.map(workCopy) : [blankQ()], mode: 'form', text: '', dirty: false, errs: {}, textWarn: 0};
  renderGuides(); window.scrollTo(0, 0);
  if (!qz) setTimeout(() => { const t = $('#qeTitle'); t && t.focus(); }, 30);
}
function setQType(x, t){
  if (x.type === t) return;
  const from = x.type, chosen = (x.correct || []).map(i => (x.choices[i] || '').trim()).filter(Boolean);
  if (t === 'short'){ x.answer = x.answer || chosen.join(', '); x.choices = []; x.correct = []; }
  else if (t === 'tf'){ x.choices = ['True', 'False']; x.correct = from === 'short' && /^(true|false)$/i.test(x.answer.trim()) ? [/^t/i.test(x.answer.trim()) ? 0 : 1] : chosen.length === 1 && /^(true|false)$/i.test(chosen[0]) ? [/^t/i.test(chosen[0]) ? 0 : 1] : []; }
  else if (from === 'tf' || from === 'short'){ x.choices = from === 'short' && x.answer.trim() ? [x.answer.trim(), '', '', ''] : ['', '', '', '']; x.correct = from === 'short' && x.answer.trim() ? [0] : []; }
  else if (t === 'mc') x.correct = x.correct.slice(0, 1);
  x.type = t;
}
// tidy the working questions into real ones; returns {qs, errs} with errors by question position
function cleanQuestions(list){
  const out = [], errs = {};
  list.forEach((x, k) => {
    const q = String(x.q || '').trim(), filled = (x.choices || []).some(c => String(c).trim()) && x.type !== 'tf';
    if (!q && !filled && !String(x.answer || '').trim() && !(x.why || '').trim() && !(x.review || '').trim()) return;  // an untouched blank: skip it
    const y = {id: x.id || qqid(), type: x.type, q, why: String(x.why || '').trim(), review: String(x.review || '').trim()};
    if (x.st) y.st = x.st;
    let err = !q ? 'Write the question.' : '';
    if (x.type === 'short'){ y.answer = String(x.answer || '').trim(); if (!err && !y.answer) err = 'Write the correct answer.'; }
    else if (x.type === 'tf'){ y.choices = ['True', 'False']; y.correct = x.correct.filter(i => i === 0 || i === 1).slice(0, 1); if (!err && !y.correct.length) err = 'Pick True or False.'; }
    else {
      const keep = x.choices.map((c, i) => ({c: String(c).trim(), i})).filter(o => o.c);
      y.choices = keep.map(o => o.c).slice(0, 8);
      y.correct = keep.map((o, j) => x.correct.includes(o.i) ? j : -1).filter(j => j >= 0 && j < 8);
      if (x.type === 'mc') y.correct = y.correct.slice(0, 1);
      if (!err && y.choices.length < 2) err = 'Add at least two choices.';
      else if (!err && !y.correct.length) err = x.type === 'multi' ? 'Tick at least one correct answer.' : 'Tick the correct answer.';
    }
    if (err) errs[k] = err; else out.push(y);
  });
  return {qs: out, errs};
}
const questionStarts = t => String(t || '').split('\n').filter(l => /^\s*(?:\*\*)?\s*(?:Q(?:uestion)?\s*)?\d+\s*[.):]\s+\S|^\s*Q\s*[:.)]\s+\S/i.test(l)).length;
// the editor's questions as text, in order; unfinished ones are written as far as they go, so switching loses nothing
function qeToText(){
  const L = ['---', `quiz: ${QE.title.trim() || 'Untitled quiz'}`, `pick: ${QE.pick === 0 ? 'all' : QE.pick || 10}`];
  if (!QE.shuffle) L.push('shuffle: no');
  L.push('---');
  let num = 0;
  QE.qs.forEach(x => {
    const q = String(x.q || '').trim(), choices = x.type === 'mc' || x.type === 'multi' ? x.choices.map((c, i) => ({c: String(c).trim(), i})).filter(o => o.c) : [];
    if (!q && !choices.length && !String(x.answer || '').trim()) return;
    L.push('', `${++num}. ${q}`);
    if (x.type === 'short') L.push(`Answer: ${String(x.answer || '').trim()}`);
    else if (x.type === 'tf') L.push(`Answer: ${x.correct.length ? x.choices[x.correct[0]] : ''}`);
    else choices.forEach((o, j) => L.push(`${x.correct.includes(o.i) ? '*' : ''}${'abcdefgh'[j]}) ${o.c}`));
    if (String(x.why || '').trim()) L.push(`Why: ${x.why.trim()}`);
    if (String(x.review || '').trim()) L.push(`Review: ${x.review.trim()}`);
  });
  return L.join('\n') + '\n';
}
// read the text box back into the editor; returns false if questions would be lost and the user hasn't confirmed
function qeFromText(force){
  const parsed = parseQuizzes(QE.text)[0], found = parsed ? parsed.questions.length : 0, starts = questionStarts(QE.text);
  if (!parsed){ QE.textWarn = -1; return false; }
  if (found < starts && !force){ QE.textWarn = starts - found; return false; }
  QE.title = parsed.title; QE.pick = parsed.pick; QE.shuffle = parsed.shuffle;
  QE.qs = carryStats(QE.qs, parsed.questions).map(workCopy);
  QE.textWarn = 0; return true;
}
function renderQuizEditor(){
  const g = guideById(QE.gid); if (!g){ QE = null; return renderGuides(); }
  const n = QE.qs.length, pickN = QE.pick === 0 ? '' : (QE.pick || 10);
  const bar = `<div class="g-bar"><button class="small-btn" data-qe="cancel">${QE.dirty ? 'Cancel' : '← Back to quizzes'}</button><span class="g-bar-sp"></span><button class="small-btn accent" data-qe="save">Save quiz</button></div>`;
  const modes = `<div class="seg qe-mode"><button data-qe="mode" data-m="form" aria-pressed="${QE.mode === 'form'}">Questions</button><button data-qe="mode" data-m="text" aria-pressed="${QE.mode === 'text'}">Edit as text</button></div>`;
  const head = `<div class="qe-head"><h2>${QE.id ? 'Edit quiz' : 'New quiz'}</h2><small class="hint">in ${esc(g.title)}</small><span class="g-bar-sp"></span>${modes}</div>`;
  if (QE.mode === 'text'){
    const warn = QE.textWarn === -1 ? "Couldn't find any questions in the text." : QE.textWarn > 0 ? `${QE.textWarn} question${QE.textWarn === 1 ? '' : 's'} can't be read yet (usually a missing correct answer, marked with * or an Answer: line). Fix ${QE.textWarn === 1 ? 'it' : 'them'}, or click again to leave ${QE.textWarn === 1 ? 'it' : 'them'} out.` : '';
    $('#guidesBody').innerHTML = bar + head + `<div class="card qe-textcard"><p class="hint">Same format as importing. The top block holds the title and settings; <code>pick:</code> is questions per attempt (or <code>all</code>).</p>
      <textarea id="qeText" class="qe-text" spellcheck="true">${esc(QE.text)}</textarea><p class="hint" id="qeTextCount">${qeTextCount()}</p>
      ${warn ? `<p class="qe-err">${warn}</p>` : ''}
      <details class="g-help"><summary>The format</summary><pre>${esc(QZ_FORMAT)}</pre></details></div>`;
    return;
  }
  const qcard = (x, k) => {
    const err = QE.errs[k], choiceRows = x.type === 'mc' || x.type === 'multi' ? `<div class="qe-chs">${x.choices.map((c, i) => `<div class="qe-ch"><input type="${x.type === 'multi' ? 'checkbox' : 'radio'}" name="qc${k}" data-qf="correct" data-c="${i}" ${x.correct.includes(i) ? 'checked' : ''} aria-label="Correct answer ${LETTERS[i]}">
        <span class="qz-l">${LETTERS[i]}</span><input type="text" data-qf="choice" data-c="${i}" value="${esc(c)}" placeholder="Choice ${LETTERS[i]}">${x.choices.length > 2 ? `<button class="qe-x" data-qe="rmch" data-c="${i}" aria-label="Remove choice ${LETTERS[i]}">×</button>` : ''}</div>`).join('')}
        <div class="qe-row">${x.choices.length < 8 ? `<button class="link-btn" data-qe="addch">+ Add choice</button>` : ''}<small class="hint">${x.type === 'multi' ? 'Tick every correct answer.' : 'Pick the correct answer.'}</small></div></div>`
      : x.type === 'tf' ? `<div class="qe-tf">${['True', 'False'].map((t, i) => `<label class="qe-tfopt"><input type="radio" name="qc${k}" data-qf="correct" data-c="${i}" ${x.correct.includes(i) ? 'checked' : ''}> ${t}</label>`).join('')}<small class="hint">Pick the correct answer.</small></div>`
      : `<div class="qe-short"><input type="text" data-qf="answer" value="${esc(x.answer)}" placeholder="Correct answer"><small class="hint">An exact match is marked right automatically; otherwise you see the answer and mark yourself.</small></div>`;
    return `<div class="card qe-q${err ? ' err' : ''}" data-qi="${k}" id="qe-q${k}">
      <div class="qe-qhead"><span class="qz-l">${k + 1}</span><select data-qf="type" aria-label="Question type">${QTYPES.map(([v, l]) => `<option value="${v}" ${x.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        ${x.st && x.st.seen ? `<small class="hint qe-stat">${x.st.right}/${x.st.seen} right</small>` : ''}<span class="g-bar-sp"></span>
        <button class="small-btn" data-qe="up" ${k ? '' : 'disabled'} aria-label="Move up">↑</button><button class="small-btn" data-qe="down" ${k < n - 1 ? '' : 'disabled'} aria-label="Move down">↓</button><button class="small-btn" data-qe="dup">Duplicate</button><button class="small-btn" data-qe="delq">Delete</button></div>
      <textarea data-qf="q" rows="2" placeholder="Question">${esc(x.q)}</textarea>
      ${choiceRows}
      <div class="qe-notes"><label>Why <small>(shown after answering)</small><input type="text" data-qf="why" value="${esc(x.why)}" placeholder="Explain the answer"></label>
        <label>Review <small>(shown when you miss it)</small><input type="text" data-qf="review" value="${esc(x.review)}" placeholder="e.g. Chapter 4, adjusting entries"></label></div>
      ${err ? `<p class="qe-err">${esc(err)}</p>` : ''}</div>`;
  };
  $('#guidesBody').innerHTML = bar + head + `
    <div class="card qe-set"><label class="qe-title">Quiz title<input type="text" id="qeTitle" maxlength="120" value="${esc(QE.title)}" placeholder="e.g. Chapter 5 practice"></label>
      <div class="qe-opts"><label>Questions per attempt<input type="number" id="qePick" min="1" max="300" value="${pickN}" ${QE.pick === 0 ? 'disabled' : ''}></label>
        <label class="qe-chk"><input type="checkbox" id="qeAll" ${QE.pick === 0 ? 'checked' : ''}> Use every question each time</label>
        <label class="qe-chk"><input type="checkbox" id="qeShuffle" ${QE.shuffle ? 'checked' : ''}> Shuffle answer choices</label></div>
      <p class="hint" id="qePickHint">${qePickHint()}</p></div>
    <div class="qe-list">${QE.qs.map(qcard).join('')}</div>
    <div class="qe-foot"><button class="small-btn accent" data-qe="add">+ Add question</button><span class="hint">${n} question${n === 1 ? '' : 's'}</span><span class="g-bar-sp"></span><button class="small-btn accent" data-qe="save">Save quiz</button></div>`;
}
function qePickHint(){
  const n = QE.qs.filter(x => String(x.q || '').trim()).length || QE.qs.length, per = QE.pick === 0 ? n : Math.min(QE.pick || 10, n);
  return QE.pick === 0 ? `Every attempt uses all ${n} question${n === 1 ? '' : 's'}, in a new order.`
    : per < n ? `Each attempt draws ${per} of the ${n} questions, favoring ones you haven't seen or got wrong.`
    : `The bank has ${n} question${n === 1 ? '' : 's'}, so each attempt uses all of them in a new order. Add more than ${per} to get different questions each time.`;
}
function qeTextCount(){
  const p = parseQuizzes(QE.text)[0], n = p ? p.questions.length : 0;
  return n ? `${n} question${n === 1 ? '' : 's'} found${p.title ? ` in “${esc(p.title)}”` : ''}.` : 'No questions found yet.';
}
function qeSave(){
  const g = guideById(QE.gid); if (!g) return;
  if (QE.mode === 'text' && !qeFromText(QE.textWarn > 0)){ renderQuizEditor(); toast(QE.textWarn === -1 ? "Couldn't find any questions in the text." : 'Some questions can’t be read. Click Save again to leave them out.'); QE.textWarn = QE.textWarn > 0 ? QE.textWarn : 0; return; }
  const title = QE.title.trim();
  if (!title){ if (QE.mode === 'text'){ QE.mode = 'form'; renderQuizEditor(); } toast('Give the quiz a title.'); $('#qeTitle').focus(); return; }
  const {qs, errs} = cleanQuestions(QE.qs);
  QE.errs = errs;
  const bad = Object.keys(errs);
  if (bad.length){ QE.mode = 'form'; renderQuizEditor(); toast(`${bad.length} question${bad.length === 1 ? ' needs' : 's need'} fixing (marked in red).`); const el = document.getElementById('qe-q' + bad[0]); el && el.scrollIntoView({block: 'center'}); return; }
  if (!qs.length){ toast('Add at least one question.'); return; }
  const quizzes = guideQuizzes(g), now = Date.now(), old = QE.id && quizzes.find(x => x.id === QE.id);
  if (old){
    Object.assign(old, {title, pick: QE.pick, shuffle: QE.shuffle, questions: qs, updated: now});
    old.prevSet = (old.prevSet || []).filter(id => qs.some(x => x.id === id));
  } else {
    quizzes.push({id: qid(), title, questions: qs, pick: QE.pick, shuffle: QE.shuffle, prevSet: [], created: now, updated: now, best: null, last: null, tries: 0, lastAt: 0});
    achBump('quizzes');
  }
  g.updated = now; saveGuides();
  QE = null; setGuideTab(g.id, 'quizzes'); renderGuides(); window.scrollTo(0, 0);
  toast(old ? 'Quiz saved.' : `Quiz created with ${qs.length} question${qs.length === 1 ? '' : 's'}.`);
}
function qeFocus(k, sel){ requestAnimationFrame(() => { const c = document.getElementById('qe-q' + k); if (!c) return; c.scrollIntoView({block: 'nearest'}); const f = c.querySelector(sel || 'textarea'); f && f.focus(); }); }
$('#page-guides').addEventListener('click', e => {
  const b = e.target.closest('[data-qe]'); if (!b || !QE) return;
  const a = b.dataset.qe, card = b.closest('[data-qi]'), k = card ? +card.dataset.qi : -1, x = k >= 0 ? QE.qs[k] : null;
  if (a === 'save') return qeSave();
  if (a === 'cancel'){
    if (QE.dirty && !b.dataset.sure){ b.dataset.sure = 1; b.textContent = 'Discard changes?'; b.classList.add('danger'); setTimeout(() => { if (b.isConnected){ delete b.dataset.sure; b.textContent = 'Cancel'; b.classList.remove('danger'); } }, 3500); return; }
    const gid = QE.gid; QE = null; setGuideTab(gid, 'quizzes'); renderGuides(); window.scrollTo(0, 0); return;
  }
  if (a === 'mode'){
    const m = b.dataset.m; if (m === QE.mode){ return; }
    if (m === 'text'){ QE.text = qeToText(); QE.mode = 'text'; QE.textWarn = 0; QE.errs = {}; renderQuizEditor(); return; }
    if (qeFromText(QE.textWarn > 0)){ QE.mode = 'form'; QE.errs = {}; }
    renderQuizEditor(); return;
  }
  QE.dirty = true;
  if (a === 'add'){ QE.qs.push(blankQ()); renderQuizEditor(); qeFocus(QE.qs.length - 1); return; }
  if (!x) return;
  if (a === 'addch'){ x.choices.push(''); renderQuizEditor(); qeFocus(k, `[data-qf="choice"][data-c="${x.choices.length - 1}"]`); }
  else if (a === 'rmch'){ const c = +b.dataset.c; x.choices.splice(c, 1); x.correct = x.correct.filter(i => i !== c).map(i => i > c ? i - 1 : i); renderQuizEditor(); }
  else if (a === 'up' || a === 'down'){ const j = a === 'up' ? k - 1 : k + 1; if (j < 0 || j >= QE.qs.length) return; [QE.qs[k], QE.qs[j]] = [QE.qs[j], QE.qs[k]]; QE.errs = {}; renderQuizEditor(); qeFocus(j, `[data-qe="${a}"]`); }
  else if (a === 'dup'){ const y = workCopy(x); y.id = qqid(); delete y.st; QE.qs.splice(k + 1, 0, y); QE.errs = {}; renderQuizEditor(); qeFocus(k + 1); }
  else if (a === 'delq'){
    if (!b.dataset.sure && (x.q.trim() || x.choices.some(c => c.trim()))){ b.dataset.sure = 1; b.textContent = 'Click again'; b.classList.add('danger'); setTimeout(() => { if (b.isConnected){ delete b.dataset.sure; b.textContent = 'Delete'; b.classList.remove('danger'); } }, 3500); return; }
    QE.qs.splice(k, 1); if (!QE.qs.length) QE.qs.push(blankQ()); QE.errs = {}; renderQuizEditor();
  }
});
$('#page-guides').addEventListener('input', e => {
  if (!QE) return;
  const t = e.target;
  if (t.id === 'qeTitle'){ QE.title = t.value; QE.dirty = true; return; }
  if (t.id === 'qePick'){ QE.pick = parsePick(t.value) || null; QE.dirty = true; $('#qePickHint').textContent = qePickHint(); return; }
  if (t.id === 'qeText'){ QE.text = t.value; QE.dirty = true; QE.textWarn = 0; clearTimeout(qeTextCount.t); qeTextCount.t = setTimeout(() => { const c = $('#qeTextCount'); if (c) c.innerHTML = qeTextCount(); }, 200); return; }
  const card = t.closest('[data-qi]'), f = t.dataset.qf; if (!card || !f) return;
  const x = QE.qs[+card.dataset.qi]; QE.dirty = true;
  if (f === 'q' || f === 'why' || f === 'review' || f === 'answer') x[f] = t.value;
  else if (f === 'choice') x.choices[+t.dataset.c] = t.value;
});
$('#page-guides').addEventListener('change', e => {
  if (!QE) return;
  const t = e.target;
  if (t.id === 'qeAll'){ QE.pick = t.checked ? 0 : null; QE.dirty = true; renderQuizEditor(); return; }
  if (t.id === 'qeShuffle'){ QE.shuffle = t.checked; QE.dirty = true; return; }
  const card = t.closest('[data-qi]'), f = t.dataset.qf; if (!card || !f) return;
  const k = +card.dataset.qi, x = QE.qs[k]; QE.dirty = true;
  if (f === 'type'){ setQType(x, t.value); delete QE.errs[k]; renderQuizEditor(); qeFocus(k, '[data-qf="type"]'); }
  else if (f === 'correct'){
    const c = +t.dataset.c;
    if (x.type === 'multi') x.correct = t.checked ? [...new Set([...x.correct, c])].sort((p, q) => p - q) : x.correct.filter(i => i !== c);
    else x.correct = [c];
    if (QE.errs[k]){ delete QE.errs[k]; card.classList.remove('err'); const m = card.querySelector('.qe-err'); m && m.remove(); }
  }
});
// Ctrl/Cmd+S saves the quiz
$('#page-guides').addEventListener('keydown', e => { if (QE && (e.ctrlKey || e.metaKey) && e.key === 's'){ e.preventDefault(); qeSave(); } });

/* ---- events ---- */
$('#page-guides').addEventListener('click', e => {
  const b = e.target.closest('[data-qz]'); if (!b) return;
  const a = b.dataset.qz, g = gView && guideById(gView), qz = g && b.dataset.q && guideQuizzes(g).find(x => x.id === b.dataset.q);
  if (a === 'import' && g) openQuizImport(g);
  else if (a === 'take' && qz) startQuiz(g, qz);
  else if (a === 'new' && g) openQuizEditor(g, null);
  else if (a === 'edit' && qz) openQuizEditor(g, qz);
  else if (a === 'export' && qz){
    const txt = quizToText(qz), name = `${slug(qz.title)}.md`;
    if (window.top !== window){ try { navigator.clipboard.writeText(txt).then(() => toast('Quiz copied as text.'), () => toast("Couldn't copy here.")); } catch(err){} }
    else { downloadText(name, txt); toast(`Saved ${name}`); }
  }
  else if (a === 'del' && qz){
    if (!b.dataset.sure){ b.dataset.sure = 1; b.textContent = 'Click again'; b.classList.add('danger'); setTimeout(() => { if (b.isConnected){ delete b.dataset.sure; b.textContent = 'Delete'; b.classList.remove('danger'); } }, 3500); return; }
    g.quizzes = guideQuizzes(g).filter(x => x.id !== qz.id); g.updated = Date.now(); saveGuides(); renderGuides(); toast('Quiz deleted.');
  }
  else if (a === 'pick') quizPick(+b.dataset.i);
  else if (a === 'check') quizCheck();
  else if (a === 'reveal'){ QR.short = ($('#qzShort') || {}).value || ''; QR.reveal = true; renderQuizRun(); }
  else if (a === 'self') quizAnswer(b.dataset.ok === '1', QR.short);
  else if (a === 'next') quizNext();
  else if (a === 'quit'){ if (QR){ gView = QR.gid; setGuideTab(QR.gid, 'quizzes'); } QR = null; renderGuides(); window.scrollTo(0, 0); }
  else if (a === 'copy') copyQuizResults();
  else if (a === 'retake' || a === 'retry'){ const cur = quizNow(); if (cur) startQuiz(cur.g, cur.qz, a === 'retry' ? QR.res.filter(r => !r.ok).map(r => r.k) : null); }
});
$('#page-guides').addEventListener('click', e => {
  const t = e.target.closest('[data-gtab]'); if (!t || !gView) return;
  setGuideTab(gView, t.dataset.gtab); renderGuides();
  const b = document.querySelector(`#page-guides [data-gtab="${t.dataset.gtab}"]`); b && b.focus();
});
$('#page-guides').addEventListener('keydown', e => {
  const t = e.target.closest('[data-gtab]'); if (!t || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  e.preventDefault(); const next = t.dataset.gtab === 'guide' ? 'quizzes' : 'guide';
  setGuideTab(gView, next); renderGuides(); const b = document.querySelector(`#page-guides [data-gtab="${next}"]`); b && b.focus();
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
  if (i >= 0 || /^[1-9a-h]$/.test(k)){ e.preventDefault(); e.stopPropagation(); if (i >= 0 && x.choices && i < x.choices.length){ const p = permOf(QR.list[QR.i]); quizPick(p ? p[i] : i); } return; }
  if (k === 'enter'){
    if (e.target.closest('button') && !e.target.closest('[data-qz="next"]')) return;
    e.preventDefault(); e.stopPropagation();
    if (QR.done) quizNext(); else if (x.type === 'multi') quizCheck();
  }
}, true);
