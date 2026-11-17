/* ---------- motion & visual effects ---------- */
// Full: rolling digits, smooth ring with a glowing tip, breathing breaks, on-screen rain,
// lightning, and confetti when a focus block ends. Subtle: digits, ring and pops only. Off: static.
const motion = () => P.motion || 'full';
let lastTime = {text:'', unit:'', mode:''};
function setTimeText(f, up){
  const el = $('#time'), m = motion(), prev = lastTime;
  if (prev.text === f.text && prev.unit === f.unit && prev.mode === m) return;
  lastTime = {text: f.text, unit: f.unit, mode: m};
  const unit = f.unit ? `<small>${f.unit}</small>` : '';
  if (m === 'off' || prev.text.length !== f.text.length || prev.mode !== m){ el.innerHTML = [...f.text].map(c => `<span class="dg">${c}</span>`).join('') + unit; return; }
  el.innerHTML = [...f.text].map((c, i) => `<span class="dg${c !== prev.text[i] && /\d/.test(c) ? (up ? ' roll-up' : ' roll-dn') : ''}">${c}</span>`).join('') + unit;
}
function drawProgress(fr, smooth){
  arc.style.transition = smooth ? 'none' : '';
  arc.style.strokeDashoffset = C * (1 - fr);
  $('#barFill').style.transition = smooth ? 'none' : '';
  $('#barFill').style.width = (fr * 100) + '%';
  const k = $('#knob'), show = motion() !== 'off' && fr > 0.002 && fr < 0.9995;
  k.style.display = show ? '' : 'none';
  if (show){ const a = fr * Math.PI * 2; k.setAttribute('cx', 160 + 128 * Math.sin(a)); k.setAttribute('cy', 160 - 128 * Math.cos(a)); k.setAttribute('r', (RINGS[P.ring] || 14) / 2 + 3); }
}
function cssVar(n){ return getComputedStyle(document.body).getPropertyValue(n).trim(); }

const fx = (() => {
  const back = $('#fxBack'), front = $('#fxFront'), bx = back.getContext('2d'), fxx = front.getContext('2d');
  let W = 0, H = 0, drops = [], parts = [], flash = 0, flashes = [], last = performance.now(), dirty = false;
  const SLANT = .16;
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    for (const [c, x] of [[back, bx], [front, fxx]]){ c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
  }
  addEventListener('resize', resize); resize();
  const raining = () => motion() === 'full' && amb && (amb.type === 'rain' || amb.type === 'storm');
  const newDrop = top => ({x: Math.random() * (W + H * SLANT), y: top ? Math.random() * H : -40 - Math.random() * 120, v: 900 + Math.random() * 600, len: 14 + Math.random() * 16, w: .7 + Math.random() * .8, a: .07 + Math.random() * .15});
  function tick(){
    const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
    const wantRain = raining(), target = wantRain ? Math.round(W * H / (amb.type === 'storm' ? 4800 : 7000)) : 0;
    flashes = flashes.filter(f => { if (now >= f.t){ flash = Math.max(flash, f.a); return false; } return true; });
    if (!wantRain && !drops.length && !parts.length && flash <= 0){ if (dirty){ bx.clearRect(0, 0, W, H); fxx.clearRect(0, 0, W, H); dirty = false; } return; }
    dirty = true;
    // rain, behind the cards
    bx.clearRect(0, 0, W, H);
    while (drops.length < target) drops.push(newDrop(true));
    bx.strokeStyle = cssVar('--ink'); bx.lineCap = 'round';
    for (let i = drops.length - 1; i >= 0; i--){
      const d = drops[i]; d.y += d.v * dt; d.x -= d.v * dt * SLANT;
      if (d.y - d.len > H){ if (drops.length > target) drops.splice(i, 1); else Object.assign(d, newDrop(false)); continue; }
      bx.globalAlpha = d.a * (wantRain ? 1 : .6); bx.lineWidth = d.w;
      bx.beginPath(); bx.moveTo(d.x, d.y); bx.lineTo(d.x + d.len * SLANT, d.y - d.len); bx.stroke();
    }
    if (!wantRain) drops = drops.filter(d => d.y < H * .6);   // let the last drops fall away
    // confetti and lightning, in front
    fxx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--){
      const p = parts[i]; p.life -= dt;
      if (p.life <= 0 || p.y > H + 20){ parts.splice(i, 1); continue; }
      p.vy += 820 * dt; p.vx *= .985; p.vy *= .985; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
      fxx.globalAlpha = Math.min(1, p.life / .6); fxx.fillStyle = p.c;
      fxx.save(); fxx.translate(p.x, p.y); fxx.rotate(p.rot); fxx.scale(1, Math.cos(p.rot * 2.3));
      p.round ? (fxx.beginPath(), fxx.arc(0, 0, p.s * .45, 0, 7), fxx.fill()) : fxx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      fxx.restore();
    }
    if (flash > 0){ fxx.globalAlpha = flash; fxx.fillStyle = isDark() ? '#dce6ff' : '#ffffff'; fxx.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 4); }
    fxx.globalAlpha = 1;
  }
  function burst(){
    if (motion() !== 'full') return;
    const r = $('.dial-wrap').getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const pal = [cssVar('--accent'), cssVar('--rest'), ...SERIES[isDark() ? 'dark' : 'light'].slice(0, 5)];
    for (let i = 0; i < 140; i++){
      const a = Math.random() * Math.PI * 2, sp = 380 + Math.random() * 620;
      parts.push({x: cx + Math.cos(a) * r.width * .3, y: cy + Math.sin(a) * r.height * .3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 320, rot: Math.random() * 6, spin: (Math.random() - .5) * 14, s: 6 + Math.random() * 7, c: pal[i % pal.length], life: 1.6 + Math.random() * 1.2, round: Math.random() < .25});
    }
  }
  function lightning(){
    if (motion() !== 'full') return;
    const t = performance.now(), peak = isDark() ? .32 : .5;
    flashes.push({t, a: peak}, {t: t + 170 + Math.random() * 120, a: peak * (.5 + Math.random() * .4)});
  }
  return {tick, burst, lightning};
})();
function popDial(){
  if (motion() === 'off') return;
  const d = $('.dial-wrap'); d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop');
}
function moveTabInk(){}
addEventListener('resize', moveTabInk);
$('.dial-wrap').addEventListener('animationend', e => { if (e.animationName === 'pop') e.currentTarget.classList.remove('pop'); });
// started on the next frame, after the whole script (including the sound engine) has loaded
requestAnimationFrame(function frame(){
  requestAnimationFrame(frame);
  if (document.hidden) return;
  try {
    if (S.running && motion() !== 'off') drawProgress(frac(), true);
    fx.tick();
  } catch(e){}
});

