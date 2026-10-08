"use strict";
/* ---------- starfield ---------- */
const cv = document.getElementById('stars'), ctx = cv.getContext('2d');
let stars = [], shoot = null;
function sky() {
  cv.width = innerWidth; cv.height = innerHeight;
  stars = Array.from({ length: Math.min(240, innerWidth / 5) }, () => ({
    x: Math.random() * cv.width, y: Math.random() * cv.height * .9,
    r: Math.random() * 1.6 + .3, p: Math.random() * 6.28, s: .5 + Math.random() * 1.5
  }));
}
addEventListener('resize', sky); sky();
(function loop() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  for (const s of stars) {
    s.p += .02 * s.s;
    ctx.globalAlpha = .4 + .6 * Math.abs(Math.sin(s.p));
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (!shoot && Math.random() < .006)
    shoot = { x: Math.random() * cv.width * .8, y: Math.random() * 200, vx: 6 + Math.random() * 4, vy: 2 + Math.random() * 2, life: 1 };
  if (shoot) {
    shoot.x += shoot.vx; shoot.y += shoot.vy; shoot.life -= .02;
    ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, shoot.life)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - 70, shoot.y - 28); ctx.stroke();
    if (shoot.life <= 0) shoot = null;
  }
  requestAnimationFrame(loop);
})();

/* ---------- sleep ---------- */
const toMin = v => { const [a, b] = v.split(':').map(Number); return a * 60 + b; };
const fmt = m => {
  m = ((m % 1440) + 1440) % 1440;
  let h = Math.floor(m / 60), mm = m % 60;
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${h}:${String(mm).padStart(2, '0')} ${ap}`;
};
const dur = h => `${Math.floor(h / 60)}h ${h % 60}m`;

document.getElementById('calcA').onclick = () => {
  const w = toMin(document.getElementById('wakeA').value || '07:00');
  const out = document.getElementById('outA'); out.innerHTML = '';
  [6, 5, 4, 3].forEach((c, i) => {
    const bed = w - (c * 90 + 15), total = c * 90 + 15;
    const d = document.createElement('div');
    d.className = 'bed' + (i === 1 ? ' best' : '');
    d.innerHTML = `<div><strong>${fmt(bed)}</strong><br><small>${dur(total)} in bed · ${c} × 90 min + 15 to fall asleep${i === 1 ? ' · ⭐ recommended' : ''}</small></div><span class="cycles">${c} cycles</span>`;
    out.appendChild(d);
  });
};
document.getElementById('calcA').click();

document.getElementById('calcB').onclick = () => {
  const bed = toMin(document.getElementById('bedB').value);
  const wake = toMin(document.getElementById('wakeB').value);
  let total = (wake - bed + 1440) % 1440; if (total === 0) total = 1440;
  const eff = Math.max(0, total - 15), full = Math.floor(eff / 90), rem = eff % 90;
  const dist = Math.min(rem, 90 - rem);
  let word, why;
  if (total < 180) { word = 'Bad'; why = 'Under 3h in bed — not enough for even 2 full cycles.'; }
  else if (dist <= 7 && full >= 5) { word = 'Excellent'; why = `${full} full cycles with only ${dist} min off a boundary. Ideal range.`; }
  else if (dist <= 7 && full >= 4) { word = 'Excellent'; why = `${full} full cycles, ${dist} min off boundary. Great alignment.`; }
  else if (dist <= 15 && full >= 4) { word = 'Good'; why = `${full} cycles + ${rem} min extra. Close to a clean wake point.`; }
  else if (full >= 4 && dist <= 25) { word = 'Good'; why = `${full} cycles, ${dist} min from boundary. Solid night.`; }
  else if (full >= 3) { word = 'Fair'; why = `${full} cycles but ${dist} min from boundary — expect some grogginess.`; }
  else { word = 'Bad'; why = `Only ~${full} full cycles in ${dur(total)}. Consider an earlier bedtime.`; }
  document.getElementById('outB').innerHTML =
    `<div class="rating ${word}"><div class="word">${word}</div>
     <div style="color:var(--ink)">${dur(total)} in bed · ~${full} full 90-min cycles · ${rem} min over</div>
     <div style="color:var(--muted);font-size:.87rem;margin-top:.35rem">${why} (−15 min to fall asleep assumed.)</div></div>`;
};

/* ---------- focus timer ---------- */
const card = document.getElementById('focusCard'), clock = document.getElementById('clock'),
  modeEl = document.getElementById('mode'), arc = document.getElementById('arc'),
  badge = document.getElementById('focusBadge'), doneEl = document.getElementById('done');
let mode = 'work', remain = 45 * 60, timer = null, total = 45 * 60, done = 0;
const C = 578;

function paint() {
  const m = Math.floor(remain / 60), s = remain % 60;
  clock.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  modeEl.textContent = mode === 'work' ? 'Work' : 'Break';
  card.dataset.mode = mode;
  badge.textContent = mode === 'work' ? 'Work · Red' : 'Break · Green';
  arc.style.stroke = mode === 'work' ? '#ff5d5d' : '#3ddc84';
  arc.style.strokeDashoffset = C * (1 - (total ? remain / total : 0));
  document.title = `${clock.textContent} ${mode === 'work' ? '· Focus' : '· Break'} — Night Wellness Hub`;
}

// ONLY sound left in the app: short ring when the pomodoro switches mode.
let AC = null;
function chime(f = 880) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    AC.resume();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(.25, AC.currentTime + .05);
    g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + 1.2);
    o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + 1.3);
  } catch (e) {}
}

function switchMode() {
  if (mode === 'work') {
    mode = 'break'; done++; doneEl.textContent = done;
    remain = (+document.getElementById('breakMin').value || 15) * 60;
    chime(660);
  } else {
    mode = 'work';
    remain = (+document.getElementById('workMin').value || 45) * 60;
    chime(880);
  }
  total = remain; paint();
}

function tick() { if (remain > 0) { remain--; paint(); if (remain === 0) switchMode(); } else switchMode(); }

document.getElementById('startBtn').onclick = () => {
  total = (mode === 'work' ? (+workMin.value || 45) : (+breakMin.value || 15)) * 60;
  if (remain > total || remain <= 0) remain = total;
  clearInterval(timer); timer = setInterval(tick, 1000); paint();
};
document.getElementById('pauseBtn').onclick = () => { clearInterval(timer); timer = null; };
document.getElementById('resetBtn').onclick = () => {
  clearInterval(timer); timer = null; mode = 'work';
  remain = (+workMin.value || 45) * 60; total = remain; paint();
};
document.getElementById('skipBtn').onclick = () => { switchMode(); };
workMin.onchange = () => { if (mode === 'work' && !timer) { remain = (+workMin.value || 45) * 60; total = remain; paint(); } };
breakMin.onchange = () => { if (mode === 'break' && !timer) { remain = (+breakMin.value || 15) * 60; total = remain; paint(); } };
document.querySelectorAll('.chip').forEach(ch => ch.onclick = () => {
  document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
  ch.setAttribute('aria-pressed', 'true');
  breakMin.value = ch.dataset.break;
  if (mode === 'break' && !timer) { remain = (+breakMin.value) * 60; total = remain; paint(); }
});
paint();
