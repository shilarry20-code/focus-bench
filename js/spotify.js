/* ---------- Spotify ---------- */
// Spotify's embedded player, driven by Spotify's iFrame API. The published page runs inside
// Claude's viewer, which blocks embedded players, so there the saved links open Spotify instead.
const IN_VIEWER = window.top !== window, IS_FILE = location.protocol === 'file:';
// Spotify's player won't load in a page opened straight from a file (no website address),
// so by default a downloaded copy falls back to "Open in Spotify". The user can still try it.
const canEmbed = () => !IN_VIEWER && (!IS_FILE || !!P.music.tryFile);
const SP_HEIGHT = {compact:80, normal:152, large:352};
// Spotify's own study playlists (titles and covers checked against open.spotify.com)
const SP_SUGGEST = [
  {id:'37i9dQZF1DWZeKCadgRdKQ', name:'Deep Focus', note:'Ambient and post-rock', img:'https://i.scdn.co/image/ab67706f000000026020f2f6476db518ef747da4'},
  {id:'37i9dQZF1DWWQRwui0ExPn', name:'lofi beats', note:'Chill hip-hop beats', img:'https://i.scdn.co/image/ab67706f00000002266beb50b0032b0f140a749e'},
  {id:'37i9dQZF1DX4sWSpwq3LiO', name:'Peaceful Piano', note:'Calm solo piano', img:'https://i.scdn.co/image/ab67706f0000000270e1fb7db7b45809d6a80377'},
  {id:'37i9dQZF1DX9sIqqvKsjG8', name:'Instrumental Study', note:'Soft instrumentals', img:'https://i.scdn.co/image/ab67706f000000026cb530ab9aafafdaab62f4bb'},
  {id:'37i9dQZF1DX8NTLI2TtZa6', name:'Intense Studying', note:'Focused classical', img:'https://i.scdn.co/image/ab67706f00000002f87d8382976ebff84930bfc1'},
  {id:'37i9dQZF1DWXLeA8Omikj7', name:'Brain Food', note:'Electronic, no lyrics', img:'https://i.scdn.co/image/ab67706f00000002e9f13d8a7595736a0a8efa72'},
  {id:'37i9dQZF1DWV7EzJMK2FUI', name:'Jazz in the Background', note:'Mellow jazz', img:'https://i.scdn.co/image/ab67706f00000002472120b92edea982b5feb264'}
].map(x => ({...x, type:'playlist'}));
const TYPE_NAME = {playlist:'Playlist', album:'Album', track:'Song', episode:'Podcast episode', show:'Podcast', artist:'Artist'};
const MUSIC_NOTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
let spApi = null, spApiState = 'idle', spCtl = null, spStarted = false, spPaused = true, spWantPlay = false, spMountedKey = '', spOverride = null, spRename = null;
// older saves used a single on/off for breaks
if (P.music.breakMode == null){ P.music.breakMode = P.music.pauseBreak === false ? 'keep' : 'pause'; }
if (!P.music.byTag) P.music.byTag = {};
function parseSpotify(str){
  str = (str || '').trim();
  let m = /^spotify:(playlist|album|track|episode|show|artist):([A-Za-z0-9]{10,})$/i.exec(str);
  if (!m) m = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|episode|show|artist)\/([A-Za-z0-9]{10,})/i.exec(str);
  return m ? {type: m[1].toLowerCase(), id: m[2]} : null;
}
const spUri = it => `spotify:${it.type}:${it.id}`;
const spUrl = it => `https://open.spotify.com/${it.type}/${it.id}`;
const spItem = id => P.music.list.find(x => x.id === id) || null;
const spCurrent = () => P.music.list.find(x => x.id === P.music.current) || null;
const onBreak = () => S.phase !== 'focus';
// What should be in the player right now, and why
function spWanted(){
  const M = P.music;
  if (spOverride && spItem(spOverride)) return {it: spItem(spOverride), why: 'picked'};
  if (onBreak() && M.breakMode === 'switch' && spItem(M.breakId)) return {it: spItem(M.breakId), why: 'break'};
  if (spItem(M.byTag[P.tag])) return {it: spItem(M.byTag[P.tag]), why: 'activity'};
  return spCurrent() ? {it: spCurrent(), why: 'default'} : {it: null};
}
function coverHtml(it, cls){
  const hue = [...it.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 360, 7);
  const fall = `<span class="cv-fall" style="--h:${hue}">${MUSIC_NOTE}</span>`;
  return `<span class="${cls}">${fall}${it.img ? `<img src="${it.img}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
}
function loadSpotifyApi(){
  if (!canEmbed() || spApiState !== 'idle') return;
  spApiState = 'loading';
  window.onSpotifyIframeApiReady = api => { spApi = api; spApiState = 'ready'; spMountedKey = ''; mountPlayer(); };
  const sc = document.createElement('script');
  sc.src = 'https://open.spotify.com/embed/iframe-api/v1'; sc.async = true;
  sc.onerror = () => { spApiState = 'failed'; spMountedKey = ''; mountPlayer(); };
  document.head.appendChild(sc);
  setTimeout(() => { if (spApiState === 'loading'){ spApiState = 'failed'; spMountedKey = ''; mountPlayer(); } }, 10000);
}
function nowPlayingLabel(w){
  if (!w.it) return '';
  const why = w.why === 'break' ? 'break music' : w.why === 'activity' ? `for ${esc(P.tag)}` : '';
  return `${MUSIC_NOTE}<b>${esc(w.it.name)}</b>${why ? `<span>· ${why}</span>` : ''}`;
}
function mountPlayer(){
  const w = spWanted(), it = w.it, wrap = $('#spWrap'), open = $('#spOpen'), box = $('#spPlayer');
  wrap.hidden = !it;
  if (!it){ box.replaceChildren(); spCtl = null; spMountedKey = ''; return; }
  $('#spNow').innerHTML = nowPlayingLabel(w);
  if (!canEmbed()){
    box.hidden = true; open.hidden = false; open.href = spUrl(it); $('#spNow').hidden = true;
    open.innerHTML = `${MUSIC_NOTE}<span>Open ${esc(it.name)} in Spotify ↗</span>`;
    return;
  }
  $('#spNow').hidden = false; open.hidden = true; box.hidden = false;
  const h = SP_HEIGHT[P.music.size] || 152, key = it.id + '|' + h + '|' + spApiState;
  if (key === spMountedKey) return;
  if (spApiState === 'idle' || spApiState === 'loading'){ loadSpotifyApi(); if (spApiState === 'loading') return; }
  // same size and the controller exists: just switch what is loaded
  if (spCtl && spMountedKey.split('|')[1] == h && spApiState === 'ready'){
    const wasPlaying = !spPaused; spCtl.loadUri(spUri(it)); spStarted = false; spMountedKey = key;
    if (wasPlaying || spWantPlay){ spWantPlay = false; setTimeout(() => { try { spCtl.play(); spStarted = true; } catch(e){} }, 600); }
    return;
  }
  spMountedKey = key; spCtl = null; spStarted = false;
  const el = document.createElement('div'); box.replaceChildren(el);
  if (spApi){
    try {
      spApi.createController(el, {uri: spUri(it), width: '100%', height: h}, c => {
        spCtl = c;
        c.addListener('playback_update', e => { const d = e.data || {}; spPaused = !!d.isPaused; if (!d.isPaused || d.position > 0) spStarted = true; });
        if (spWantPlay){ spWantPlay = false; spPlay(); }
      });
      return;
    } catch(err){ spApiState = 'failed'; }
  }
  // fallback: plain embed, playable but without timer control
  const f = document.createElement('iframe');
  f.src = `https://open.spotify.com/embed/${it.type}/${it.id}`; f.height = h; f.loading = 'lazy';
  f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'; f.title = 'Spotify player';
  box.replaceChildren(f);
}
function spPlay(){
  if (!spCtl){ spWantPlay = !!spWanted().it; return; }
  try { spStarted ? spCtl.resume() : spCtl.play(); spStarted = true; } catch(e){}
}
function spPause(){ spWantPlay = false; if (spCtl) try { spCtl.pause(); } catch(e){} }
let musicPrev = {running:false, phase:'focus'};
function musicSync(){
  const prev = musicPrev; musicPrev = {running: S.running, phase: S.phase};
  if (prev.phase !== S.phase) spOverride = null;          // a new block goes back to the planned music
  if (!canEmbed()){ mountPlayer(); return; }
  const M = P.music, focusNow = S.running && S.phase === 'focus', wasFocus = prev.running && prev.phase === 'focus';
  const breakNow = S.running && onBreak(), wasBreak = prev.running && prev.phase !== 'focus';
  const wantPlay = (focusNow && !wasFocus && M.autoStart) || (breakNow && !wasBreak && M.breakMode === 'switch' && !!spItem(M.breakId));
  const wantPause = (breakNow && !wasBreak && M.breakMode === 'pause') || (!S.running && prev.running && M.pauseTimer);
  if (wantPause) spPause();
  if (wantPlay) spWantPlay = true;
  mountPlayer();               // switches playlists if needed, and starts them when spWantPlay is set
  if (wantPlay && spWantPlay){ spWantPlay = false; spPlay(); }
}
function renderMusic(){
  const M = P.music, w = spWanted(), playing = w.it ? w.it.id : null;
  const cards = M.list.map(it => spRename === it.id
    ? `<li class="sp-card renaming"><form class="sp-ren" data-id="${it.id}">${coverHtml(it, 'cv')}<input name="name" value="${esc(it.name)}" maxlength="40" aria-label="New name"><button class="small-btn" type="submit">Save</button><button class="small-btn" type="button" data-cancel>Cancel</button></form></li>`
    : `<li class="sp-card${it.id === playing ? ' on' : ''}"><button class="sp-pick" data-id="${it.id}" aria-pressed="${it.id === playing}" title="Play in the timer">${coverHtml(it, 'cv')}<span class="sp-meta"><b>${esc(it.name)}</b><small>${it.id === playing ? 'In the player' : TYPE_NAME[it.type] || 'Spotify'}</small></span></button>
        <span class="sp-acts"><button data-ren="${it.id}" aria-label="Rename ${esc(it.name)}" title="Rename">${PENCIL}</button><a href="${spUrl(it)}" target="_blank" rel="noopener" aria-label="Open ${esc(it.name)} in Spotify" title="Open in Spotify">↗</a><button data-del="${it.id}" aria-label="Remove ${esc(it.name)}" title="Remove">×</button></span></li>`).join('');
  $('#spList').innerHTML = cards || `<li class="sp-empty">Nothing here yet. Add one of Spotify's study playlists below, or paste a link.</li>`;
  const ids = new Set(M.list.map(x => x.id)), sug = SP_SUGGEST.filter(x => !ids.has(x.id));
  $('#spSuggestWrap').hidden = !sug.length;
  $('#spSuggest').innerHTML = sug.map(x => `<button class="sp-sug" data-sug="${x.id}" title="Add ${esc(x.name)}">${coverHtml(x, 'cv')}<b>${esc(x.name)}</b><small>${esc(x.note)}</small><span class="plus" aria-hidden="true">+</span></button>`).join('');
  // per-activity music
  const opts = sel => `<option value="">Your selected music</option>` + M.list.map(it => `<option value="${it.id}" ${it.id===sel?'selected':''}>${esc(it.name)}</option>`).join('');
  $('#spByTag').innerHTML = M.list.length ? P.tags.map(t => `<div class="row"><span class="sp-tag" style="--c:${actColor(t)}"><i></i>${esc(t)}</span><select data-tag="${esc(t)}" aria-label="Music for ${esc(t)}">${opts(M.byTag[t])}</select></div>`).join('') : '<p class="lead">Add some music first.</p>';
  // breaks
  $('#spBreakSeg').innerHTML = [['pause','Pause'],['keep','Keep playing'],['switch','Switch to…']].map(([v,l]) => `<button data-v="${v}" aria-pressed="${M.breakMode===v}">${l}</button>`).join('');
  $('#spBreakPickRow').hidden = M.breakMode !== 'switch';
  $('#spBreakPick').innerHTML = M.list.length ? M.list.map(it => `<option value="${it.id}" ${it.id===M.breakId?'selected':''}>${esc(it.name)}</option>`).join('') : '<option value="">Add some music first</option>';
  if (M.breakMode === 'switch' && !spItem(M.breakId) && M.list[0]) M.breakId = M.list[0].id;
  $('#spAuto').checked = M.autoStart; $('#spTimer').checked = M.pauseTimer;
  ['spAuto','spTimer'].forEach(id => $('#' + id).disabled = !canEmbed());
  $('#spSizeSeg').innerHTML = [['compact','Compact'],['normal','Normal'],['large','Large']].map(([v,l]) => `<button data-v="${v}" aria-pressed="${M.size===v}">${l}</button>`).join('');
  $('#spTry').hidden = !IS_FILE || IN_VIEWER;
  $('#spTry').textContent = P.music.tryFile ? 'Go back to the Open in Spotify button' : 'Try the built-in player anyway';
  $('#spNote').textContent = IS_FILE && !IN_VIEWER && !P.music.tryFile
    ? "Spotify's player doesn't load when Focus Desk is opened as a file from your computer, so your music opens in Spotify instead and the timer can't control it. Use the website version for the built-in player."
    : canEmbed()
    ? 'Full songs play when you are signed in to Spotify in this browser. If you are not, Spotify only plays 30-second previews. The timer controls this player, not the Spotify app on your computer or phone.'
    : "This page runs inside Claude's viewer, which doesn't allow embedded players, so your music opens in Spotify instead and the timer can't control it. Use the website version for the built-in player.";
  mountPlayer();
}
function addItem(it){
  achBump('music');
  P.music.list = P.music.list.filter(x => x.id !== it.id); P.music.list.push(it);
  if (!P.music.current) P.music.current = it.id;
  spOverride = it.id; P.music.current = it.id;
  saveP(); renderMusic(); toast(`Added ${it.name}.`);
}
function addMusic(){
  const raw = $('#spIn').value.trim();
  if (/spotify\.link\//i.test(raw)){ toast("Short spotify.link links can't be read. Open the link in a browser first, then copy the open.spotify.com address."); return; }
  if (/\/collection\/tracks/i.test(raw)){ toast("Liked Songs can't play outside Spotify. Add the songs to a public playlist and use that link."); return; }
  const it = parseSpotify(raw);
  if (!it){ toast("That doesn't look like a Spotify link. In Spotify, use Share, then Copy link."); return; }
  it.name = $('#spName').value.trim() || `${TYPE_NAME[it.type]} ${P.music.list.filter(x => x.type === it.type).length + 1}`;
  $('#spIn').value = ''; $('#spName').value = '';
  addItem(it);
}
$('#spAdd').onclick = addMusic;
$('#spIn').onkeydown = $('#spName').onkeydown = e => { if (e.key === 'Enter') addMusic(); };
$('#spSuggest').onclick = e => { const b = e.target.closest('[data-sug]'); if (!b) return; const x = SP_SUGGEST.find(s => s.id === b.dataset.sug); addItem({type:x.type, id:x.id, name:x.name, img:x.img}); };
$('#spList').onclick = e => {
  const d = e.target.closest('[data-del]'), pk = e.target.closest('.sp-pick'), rn = e.target.closest('[data-ren]');
  if (e.target.closest('[data-cancel]')){ spRename = null; renderMusic(); return; }
  if (d){
    const id = d.dataset.del, M = P.music;
    M.list = M.list.filter(x => x.id !== id);
    if (M.current === id) M.current = M.list[0] ? M.list[0].id : null;
    if (M.breakId === id) M.breakId = M.list[0] ? M.list[0].id : null;
    Object.keys(M.byTag).forEach(t => { if (M.byTag[t] === id) delete M.byTag[t]; });
    if (spOverride === id) spOverride = null;
    saveP(); renderMusic();
  }
  else if (rn){ spRename = rn.dataset.ren; renderMusic(); const i = $('#spList input[name="name"]'); i && (i.focus(), i.select()); }
  else if (pk){ P.music.current = pk.dataset.id; spOverride = pk.dataset.id; saveP(); renderMusic(); }
};
$('#spList').addEventListener('submit', e => {
  e.preventDefault(); const it = spItem(e.target.dataset.id), v = new FormData(e.target).get('name').trim();
  if (it && v) it.name = v; spRename = null; saveP(); renderMusic();
});
$('#spByTag').onchange = e => { const s = e.target.closest('[data-tag]'); if (!s) return; if (s.value) P.music.byTag[s.dataset.tag] = s.value; else delete P.music.byTag[s.dataset.tag]; spOverride = null; saveP(); renderMusic(); };
$('#spBreakSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; P.music.breakMode = b.dataset.v; if (b.dataset.v === 'switch' && !spItem(P.music.breakId) && P.music.list[0]) P.music.breakId = P.music.list[0].id; saveP(); renderMusic(); };
$('#spBreakPick').onchange = e => { P.music.breakId = e.target.value; saveP(); renderMusic(); };
$('#spTry').onclick = () => { P.music.tryFile = !P.music.tryFile; saveP(); spMountedKey = ''; renderMusic(); };
$('#spAuto').onchange = e => { P.music.autoStart = e.target.checked; saveP(); };
$('#spTimer').onchange = e => { P.music.pauseTimer = e.target.checked; saveP(); };
$('#spSizeSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; P.music.size = b.dataset.v; saveP(); renderMusic(); };
// changing the activity next to the timer switches to that activity's music
$('#tagSel').addEventListener('change', e => { P.tag = e.target.value; spOverride = null; renderMusic(); });

