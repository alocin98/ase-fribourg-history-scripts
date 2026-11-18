// Slide engine: 1920x1080 stage scaled to the window, steps inside each slide, notes, deep links.
import { VIZ } from './viz/index.js';
import { json } from './util.js';

const stage = document.getElementById('stage');
const slides = [...stage.querySelectorAll('.slide')];
const notesBox = document.getElementById('notes');
const helpBox = document.getElementById('help');
const DATA = await json('assets/predict.json');

let idx = 0, step = 0;
// errors land in <body data-err> so headless checks (tools/check.sh) can read them
const noteErr = m => { document.body.dataset.err = (document.body.dataset.err || '') + m + '; '; };
addEventListener('error', e => noteErr(e.message));
addEventListener('unhandledrejection', e => noteErr(String(e.reason)));
// ?shot: no CSS transitions (headless screenshots) · ?dbg: verbose scenes
if (location.search.includes('shot')) document.body.classList.add('shot');
if (location.search.includes('dbg')) window.__dbg = true;
// ?presenter: second window with notes, next slide and timer, kept in sync with the main one
const PRESENTER = location.search.includes('presenter');
if (PRESENTER) document.body.classList.add('presenter');
const bc = 'BroadcastChannel' in window ? new BroadcastChannel('manuscript-ai-deck') : null;
const t0 = Date.now();

// ---------- scale ----------
function fit() {
  const w = PRESENTER ? innerWidth * 0.6 : innerWidth;
  const s = Math.min(w / 1920, innerHeight / 1080);
  stage.style.left = PRESENTER ? (w / 2 + 10) + 'px' : '50%';
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  window.__stageScale = s;
  window.dispatchEvent(new Event('stage-resize'));
}
stage.style.position = 'absolute';
stage.style.top = '50%';
addEventListener('resize', fit);
fit();

// ---------- chrome ----------
const sections = [...new Set(slides.map(s => s.dataset.section).filter(Boolean))];
const topbar = document.getElementById('topbar');
const chips = sections.map(name => {
  const c = document.createElement('span');
  c.className = 'sec';
  c.textContent = name;
  topbar.append(c);
  return c;
});
topbar.insertAdjacentHTML('beforeend', '<span class="spacer"></span><span class="who">Group 6 · Manuscript AI</span>');
const progress = document.getElementById('progress');
const pageno = document.getElementById('pageno');

slides.forEach(s => {
  s.steps = Math.max(0, ...[...s.querySelectorAll('[data-step]')].map(e => +e.dataset.step));
});

function vizOf(s) {
  if (s.viz === undefined) {
    const name = s.dataset.viz;
    const host = s.querySelector('.viz');
    s.viz = name && VIZ[name] ? VIZ[name](host, DATA, s) : null;
    if (name && !VIZ[name]) console.warn('unknown viz', name);
  }
  return s.viz;
}

function applyStep() {
  const s = slides[idx];
  s.querySelectorAll('[data-step]').forEach(e => {
    const k = +e.dataset.step;
    e.classList.toggle('on', step >= k);
    e.classList.toggle('current', step === k);
  });
  const v = vizOf(s);
  if (v && v.step) v.step(step);
}

function show(newIdx, newStep, remote = false) {
  newIdx = Math.max(0, Math.min(slides.length - 1, newIdx));
  const changed = newIdx !== idx || !slides[idx].classList.contains('active');
  if (changed) {
    const old = slides[idx];
    if (old.classList.contains('active')) {
      old.classList.remove('active');
      const v = old.viz;
      if (v && v.leave) v.leave();
    }
    idx = newIdx;
    slides[idx].classList.add('active');
    const v = vizOf(slides[idx]);
    step = Math.max(0, Math.min(slides[idx].steps, newStep));
    if (v && v.enter) v.enter(step);
  } else {
    step = Math.max(0, Math.min(slides[idx].steps, newStep));
  }
  applyStep();

  const sec = slides[idx].dataset.section;
  const secIdx = sections.indexOf(sec);
  chips.forEach((c, i) => {
    c.classList.toggle('active', i === secIdx);
    c.classList.toggle('done', secIdx >= 0 && i < secIdx);
  });
  topbar.style.visibility = slides[idx].dataset.chrome === 'off' ? 'hidden' : 'visible';
  progress.style.width = (100 * (idx + 1) / slides.length) + '%';
  pageno.textContent = `${idx + 1} / ${slides.length}`;
  const n = slides[idx].querySelector('.notes');
  const nxt = slides[idx + 1] && slides[idx + 1].querySelector('h1, h2');
  notesBox.innerHTML = `<h4>Notes · slide ${idx + 1} / ${slides.length} · step ${step} / ${slides[idx].steps}</h4>` + (n ? n.innerHTML : '') +
    (PRESENTER ? `<div class="next">Next: ${nxt ? nxt.textContent : '—'}</div><div class="timer" id="timer"></div>` : '');
  if (bc && !remote) bc.postMessage({ idx, step });
  history.replaceState(null, '', `#${idx + 1}` + (step > 1 ? `.${step}` : ''));
}

function next() {
  if (step < slides[idx].steps) show(idx, step + 1);
  else if (idx < slides.length - 1) show(idx + 1, 1);
}
function prev() {
  if (step > 1) show(idx, step - 1);
  else if (idx > 0) show(idx - 1, slides[idx - 1].steps);
}

let digits = '';
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(k) && !(k === 'Enter' && digits)) { e.preventDefault(); next(); }
  else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
  else if (k === 'ArrowDown') { e.preventDefault(); show(idx + 1, slides[Math.min(idx + 1, slides.length - 1)].steps); }
  else if (k === 'ArrowUp') { e.preventDefault(); show(idx - 1, slides[Math.max(idx - 1, 0)].steps); }
  else if (k === 'Home') show(0, 1);
  else if (k === 'End') show(slides.length - 1, 1);
  else if (k === 'f' || k === 'F') {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen();
  }
  else if (k === 'n' || k === 'N') notesBox.classList.toggle('show');
  else if (k === 'p' || k === 'P') window.open(location.pathname + '?presenter' + location.hash, 'presenter', 'width=1500,height=820');
  else if (k === 'h' || k === '?') helpBox.classList.toggle('show');
  else if (/^[0-9]$/.test(k)) { digits += k; }
  else if (k === 'Enter' && digits) { show(+digits - 1, 1); digits = ''; }
  else if (k === 'Escape') { digits = ''; notesBox.classList.remove('show'); helpBox.classList.remove('show'); }
  if (!/^[0-9]$/.test(k) && k !== 'Enter') digits = '';
});

stage.addEventListener('click', e => {
  if (e.target.closest('input, button, a, .interactive')) return;
  next();
});

if (bc) bc.onmessage = e => show(e.data.idx, e.data.step, true);
if (PRESENTER) setInterval(() => {
  const t = document.getElementById('timer');
  const s = Math.floor((Date.now() - t0) / 1000);
  if (t) t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}, 1000);

const m = location.hash.match(/^#(\d+)(?:\.(\d+))?/);
show(m ? +m[1] - 1 : 0, m && m[2] ? +m[2] : 1);
setTimeout(() => { const h = document.getElementById('hint'); if (h) h.style.opacity = 0; }, 6000);

