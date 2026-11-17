/* ---------- audio ---------- */
let AC = null, master = null;
function ac(){
  try {
    if (!AC){ AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.connect(AC.destination); }
    if (AC.state === 'suspended') AC.resume();
  } catch(e){}
  return AC;
}
function tone(f, type, t0, dur, vol, f2){
  if (vol <= 0) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
function chime(kind){
  if (kind === 'none' || !ac()) return;
  const v = +P.volume, t = AC.currentTime + 0.03;
  if (v <= 0) return;
  if (kind === 'bell') for (let i = 0; i < 3; i++){ const s = t + i * .7; tone(880,'sine',s,1.8,.45*v); tone(1318.5,'sine',s,1.3,.18*v); tone(2637,'sine',s,.5,.05*v); }
  if (kind === 'wood') for (let i = 0; i < 3; i++){ const s = t + i * .45; tone(1250,'triangle',s,.09,.7*v,700); tone(1250,'triangle',s+.14,.09,.7*v,700); }
  if (kind === 'digital') for (let i = 0; i < 4; i++){ const s = t + Math.floor(i/2)*.6 + (i%2)*.16; tone(1046,'square',s,.11,.13*v); }
  if (kind === 'rise'){ tone(392,'triangle',t,1.5,.4*v,784); tone(587,'sine',t+.35,1.5,.22*v,1174); tone(784,'sine',t+.7,1.6,.15*v,1568); }
}
function tickSound(){ if (!AC || P.volume <= 0) return; tone(2200,'square',AC.currentTime+.01,.018,.035*P.volume); }

const bufCache = {};
function noiseBuf(kind){
  if (bufCache[kind]) return bufCache[kind];
  // Generate a long stretch of noise plus a little extra, then blend the extra
  // into the start so the loop point is seamless (no gap, no click, no dip).
  const sr = AC.sampleRate, len = sr * 20, fade = Math.floor(sr * 0.5);
  const raw = new Float32Array(len + fade);
  let last = 0, b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (let i = 0; i < raw.length; i++){
    const w = Math.random() * 2 - 1;
    if (kind === 'white') raw[i] = w * .35;
    else if (kind === 'brown'){ last = (last + .02 * w) / 1.02; raw[i] = last * 3.5; }
    else { b0=.99886*b0+w*.0555179; b1=.99332*b1+w*.0750759; b2=.969*b2+w*.153852; b3=.8665*b3+w*.3104856; b4=.55*b4+w*.5329522; b5=-.7616*b5-w*.016898; raw[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11; b6=w*.115926; }
  }
  const b = AC.createBuffer(1, len, sr), d = b.getChannelData(0);
  d.set(raw.subarray(0, len));
  // Equal-power crossfade: the sample after d[len-1] is raw[len], so the first
  // samples are mostly raw[len..] and gradually hand over to the original start.
  for (let i = 0; i < fade; i++){
    const k = i / fade, a = Math.sin(k * Math.PI / 2), c = Math.cos(k * Math.PI / 2);
    d[i] = raw[i] * a + raw[len + i] * c;
  }
  return bufCache[kind] = b;
}
/* ---------- rain & thunder synthesis ---------- */
// Everything here is pure math on sample arrays so it can run in a background
// worker; the timer never stalls while a storm is being built.
function stormLib(){
  const TAU = Math.PI * 2, rnd = Math.random;
  const panG = p => [Math.cos(p * Math.PI / 2), Math.sin(p * Math.PI / 2)];

  // Rain: a wide, decorrelated stereo wash, thousands of tiny impact ticks and
  // soft patter on leaves and roofs, all noise-based so nothing sounds pitched.
  // Rendered once as a 30 s stereo loop with a seamless crossfade.
  function rain(sr){
    const len = Math.floor(sr * 30), fade = Math.floor(sr * 1.5), N = len + fade;
    const L = new Float32Array(N), R = new Float32Array(N);
    const G = new Float32Array((N >> 7) + 2);
    for (let k = 0; k < G.length; k++){ const t = k * 128 / sr; G[k] = 1 + .10 * Math.sin(TAU * t / 11.3) + .07 * Math.sin(TAU * t / 5.1 + 1.3) + .04 * Math.sin(TAU * t / 2.3 + .4); }
    // 1. the wash: pink noise band-limited 350 Hz – 5.5 kHz, a little air on top, a little low body
    const aHP = Math.exp(-TAU * 350 / sr), aLP = 1 - Math.exp(-TAU * 5500 / sr), aHS = Math.exp(-TAU * 6500 / sr), aLo = 1 - Math.exp(-TAU * 180 / sr);
    for (const ch of [L, R]){
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0, hp=0, hpx=0, l1=0, l2=0, hs=0, hsx=0, br=0, lo=0;
      for (let i = 0; i < N; i++){
        const w = rnd() * 2 - 1;
        b0=.99886*b0+w*.0555179; b1=.99332*b1+w*.0750759; b2=.969*b2+w*.153852; b3=.8665*b3+w*.3104856; b4=.55*b4+w*.5329522; b5=-.7616*b5-w*.016898;
        const p = (b0+b1+b2+b3+b4+b5+b6+w*.5362) * .11; b6 = w * .115926;
        hp = aHP * (hp + p - hpx); hpx = p;
        l1 += aLP * (hp - l1); l2 += aLP * (l1 - l2);
        hs = aHS * (hs + w - hsx); hsx = w;
        br = (br + .02 * w) / 1.02; lo += aLo * (br * 3.5 - lo);
        ch[i] = (l2 + hs * .06 + lo * .3) * G[i >> 7];
      }
    }
    // 2. impact ticks: very short bright noise bursts, most of them faint and far away
    for (let k = 0, cnt = 30 * 650; k < cnt; k++){
      const s = Math.floor(rnd() * N), n = Math.floor(sr * (.0006 + rnd() * .0028));
      const amp = (.02 + .45 * Math.pow(rnd(), 5)) * G[s >> 7], [gl, gr] = panG(rnd());
      const dm = Math.exp(-4 / n); let e = amp, prev = 0;
      for (let j = 0; j < n && s + j < N; j++){ const w = rnd() * 2 - 1, v = (w - prev) * e; prev = w; L[s+j] += v * gl; R[s+j] += v * gr; e *= dm; }
    }
    // 3. patter on leaves and roofing: short, soft, darker noise bursts (no pitched tones)
    for (let k = 0, cnt = 30 * 220; k < cnt; k++){
      const s = Math.floor(rnd() * N), n = Math.floor(sr * (.004 + rnd() * .012));
      const fc = 900 + rnd() * 2600, aF = 1 - Math.exp(-TAU * fc / sr);
      const amp = (.03 + .25 * Math.pow(rnd(), 4)) * G[s >> 7], [gl, gr] = panG(rnd()), dm = Math.exp(-5 / n);
      let e = amp, f1 = 0, f2 = 0;
      for (let j = 0; j < n && s + j < N; j++){ const w = rnd() * 2 - 1; f1 += aF * (w - f1); f2 += aF * (f1 - f2); const v = f2 * e * Math.min(1, j / 24); L[s+j] += v * gl; R[s+j] += v * gr; e *= dm; }
    }
    // normalise, soften peaks, crossfade the loop seam
    let sum = 0, cnt = 0; for (let i = 0; i < N; i += 7){ sum += L[i] * L[i] + R[i] * R[i]; cnt += 2; }
    const scale = .2 / Math.sqrt(sum / cnt), out = [];
    for (const ch of [L, R]){
      const d = new Float32Array(len);
      for (let i = 0; i < N; i++) ch[i] = Math.tanh(ch[i] * scale);
      d.set(ch.subarray(0, len));
      for (let i = 0; i < fade; i++){ const k = i / fade; d[i] = ch[i] * Math.sin(k * Math.PI / 2) + ch[len + i] * Math.cos(k * Math.PI / 2); }
      out.push(d);
    }
    return [out];
  }

  // Thunder: each strike is new. It has a distance (near strikes crack before the
  // boom, far ones are muffled low rumbles), several overlapping rolls, a low-pass
  // that closes as the sound travels, and a slow random "grumble".
  function thunder(sr){
    const dist = rnd(), T = 8 + rnd() * 7 + dist * 3, n = Math.floor(sr * T);
    const L = new Float32Array(n), R = new Float32Array(n);
    const onset = .03 + dist * .5, K = 3 + Math.floor(rnd() * 5), rolls = [];
    for (let k = 0; k < K; k++){
      const t = k === 0 ? onset : onset + .2 + Math.pow(rnd(), 1.4) * T * .5, pan = k === 0 ? .3 + rnd() * .4 : rnd();
      rolls.push({t, a: k === 0 ? 1 : (.3 + rnd() * .7) * Math.exp(-(t - onset) / (T * .45)), att: .04 + dist * .4 + rnd() * .2, tau: .7 + rnd() * 1.6 + dist * 1.2, gl: Math.cos(pan * Math.PI / 2), gr: Math.sin(pan * Math.PI / 2)});
    }
    const fStart = 1100 - dist * 800, fEnd = 130 - dist * 60, fTau = T * .22;
    const amA = 1 - Math.exp(-TAU * 3 / sr), amNorm = .577 * Math.sqrt(amA / (2 - amA));
    let l1=0,l2=0,r1=0,r2=0,lm=0,rm=0,am=0,a1=0,a2=0,comp=1,eL=0,eR=0,peak=0;
    for (let i = 0; i < n; i++){
      if ((i & 31) === 0){
        const t = i / sr, fc = fEnd + (fStart - fEnd) * Math.exp(-t / fTau);
        a1 = 1 - Math.exp(-TAU * fc / sr); a2 = 1 - Math.exp(-TAU * Math.min(fc * 3, 4000) / sr); comp = 1 / Math.sqrt(a1);
        eL = 0; eR = 0;
        for (const r of rolls){ const x = t - r.t; if (x < 0) continue; const s = x < r.att ? (x / r.att) * (x / r.att) : Math.exp(-(x - r.att) / r.tau); eL += r.a * s * r.gl; eR += r.a * s * r.gr; }
      }
      am += amA * ((rnd() * 2 - 1) - am);
      const mod = Math.max(.15, 1 + .5 * am / amNorm);
      const c = rnd() * 2 - 1, nl = .8 * c + .6 * (rnd() * 2 - 1), nr = .8 * c + .6 * (rnd() * 2 - 1);
      l1 += a1 * (nl - l1); l2 += a1 * (l1 - l2); lm += a2 * (nl - lm);
      r1 += a1 * (nr - r1); r2 += a1 * (r1 - r2); rm += a2 * (nr - rm);
      L[i] = (l2 + .15 * lm) * comp * eL * mod;
      R[i] = (r2 + .15 * rm) * comp * eR * mod;
      const m = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (m > peak) peak = m;
    }
    for (let i = 0; i < n; i++){ L[i] /= peak; R[i] /= peak; }
    // the crack of a near strike: a ragged tear of bright bursts right before the boom
    if (dist < .4){
      const strength = 1 - dist / .4, bursts = 5 + Math.floor(rnd() * 7), aLP = 1 - Math.exp(-TAU * 6000 / sr);
      for (let j = 0; j < bursts; j++){
        const s = Math.floor(sr * (onset * .2 + rnd() * .35)), dur = .02 + rnd() * .12, cnt = Math.floor(sr * dur * 4);
        const amp = strength * (.25 + rnd() * .6), [gl, gr] = panG(.3 + rnd() * .4), dm = Math.exp(-1 / (sr * dur));
        let prev = 0, lp = 0, e = amp;
        for (let k = 0; k < cnt && s + k < n; k++){ const w = rnd() * 2 - 1; lp += aLP * ((w - prev) - lp); prev = w; const v = lp * e; L[s+k] += v * gl; R[s+k] += v * gr; e *= dm; }
      }
    }
    const level = .95 - dist * .5, tail = Math.floor(sr * 1.2);
    for (let i = 0; i < n; i++){ const f = i > n - tail ? (n - i) / tail : 1; L[i] = Math.tanh(L[i] * level) * f; R[i] = Math.tanh(R[i] * level) * f; }
    return [[L, R]];
  }
  return {rain, thunder};
}

let synthWorker = null, synthId = 0;
const synthWaits = {};
try {
  const code = `const LIB=(${stormLib.toString()})();onmessage=e=>{const{id,kind,sr}=e.data;const bufs=LIB[kind](sr);postMessage({id,bufs},bufs.flat().map(a=>a.buffer));};`;
  synthWorker = new Worker(URL.createObjectURL(new Blob([code], {type: 'text/javascript'})));
  synthWorker.onmessage = e => { const w = synthWaits[e.data.id]; delete synthWaits[e.data.id]; w && w(e.data.bufs); };
  synthWorker.onerror = () => { synthWorker = null; Object.keys(synthWaits).forEach(id => { const w = synthWaits[id]; delete synthWaits[id]; w(null); }); };
} catch(e){ synthWorker = null; }
// Returns a promise of AudioBuffers. Falls back to rendering on the page if workers are blocked.
function synth(kind){
  const sr = AC.sampleRate;
  const toBuffers = bufs => bufs.map(chs => { const b = AC.createBuffer(chs.length, chs[0].length, sr); chs.forEach((c, i) => b.copyToChannel ? b.copyToChannel(c, i) : b.getChannelData(i).set(c)); return b; });
  const local = () => toBuffers(stormLib()[kind](sr));
  if (!synthWorker) return new Promise(res => setTimeout(() => res(local()), 30));
  return new Promise(res => { const id = ++synthId; synthWaits[id] = bufs => res(bufs ? toBuffers(bufs) : local()); synthWorker.postMessage({id, kind, sr}); });
}
function cached(kind){ return bufCache[kind] || (bufCache[kind] = synth(kind)); }

const THUNDER_GAP = {rare: [70, 160], some: [25, 75], often: [10, 35]};
let nextStrike = null;
async function playThunder(){
  if (!ac()) return;
  achBump('thunder');
  const p = nextStrike || synth('thunder');
  nextStrike = synth('thunder');           // render the following strike ahead of time
  const [buf] = await p;
  const s = AC.createBufferSource(), g = AC.createGain();
  s.buffer = buf; g.gain.value = 1.5; s.connect(g);
  fx.lightning();
  const delay = motion() === 'full' ? .35 + Math.random() * 1.1 : 0;   // light arrives before sound
  if (amb){ g.connect(amb.g); amb.srcs.push(s); }
  else { const tmp = AC.createGain(); tmp.gain.value = Math.max(.15, P.ambVol) * .7; g.connect(tmp); tmp.connect(ambBus()); }
  s.start(AC.currentTime + delay);
}
function scheduleThunder(a, first){
  if (amb !== a || a.type !== 'storm') return;
  clearTimeout(a.thunder);
  if (!nextStrike) nextStrike = synth('thunder');
  const [lo, hi] = THUNDER_GAP[P.thunder] || THUNDER_GAP.some;
  const wait = first ? 6 + Math.random() * 12 : lo + Math.random() * (hi - lo);
  a.thunder = setTimeout(() => { if (amb === a){ playThunder(); scheduleThunder(a); } }, wait * 1000);
}
let bus = null;
function ambBus(){
  if (bus) return bus;
  bus = AC.createDynamicsCompressor();
  bus.threshold.value = -12; bus.knee.value = 8; bus.ratio.value = 4; bus.attack.value = .01; bus.release.value = .4;
  bus.connect(master); return bus;
}

let amb = null, ambPreview = false;
function prewarm(){ if ((P.ambient === 'rain' || P.ambient === 'storm') && ac()){ cached('rain'); } }
function startAmb(type){
  const g = AC.createGain(); g.gain.value = 0; g.connect(ambBus());
  const a = {type, g, srcs: [], timers: []};
  amb = a;
  const loopSrc = buf => { const s = AC.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(g); s.start(); a.srcs.push(s); };
  if (type === 'rain' || type === 'storm'){
    cached('rain').then(([rainB]) => { if (amb !== a) return; loopSrc(rainB); });
  }
  else loopSrc(noiseBuf(type));
  g.gain.setTargetAtTime(P.ambVol * .7, AC.currentTime, type === 'rain' || type === 'storm' ? 1.2 : .4);
  if (type === 'storm') scheduleThunder(a, true);
}
function stopAmb(){
  if (!amb) return; const a = amb; amb = null;
  clearTimeout(a.thunder); a.timers.forEach(clearTimeout);
  a.g.gain.setTargetAtTime(0, AC.currentTime, .25);
  setTimeout(() => { a.srcs.forEach(s => { try { s.stop(); } catch(e){} }); a.g.disconnect(); }, 1500);
}
function updateAmbient(){
  const want = P.ambient !== 'off' && (ambPreview || (S.running && (!P.ambFocusOnly || S.phase === 'focus')));
  $('#ambPreview').textContent = ambPreview ? 'Stop preview' : 'Preview';
  if (!want || !AC){ stopAmb(); return; }
  if (S.running && S.phase === 'focus') achSet('amb', P.ambient);
  if (amb && amb.type === P.ambient){ amb.g.gain.setTargetAtTime(P.ambVol * .7, AC.currentTime, .1); return; }
  stopAmb(); startAmb(P.ambient);
}

