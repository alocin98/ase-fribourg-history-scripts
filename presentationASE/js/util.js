// Small helpers shared by the slides: DOM/SVG builders, number format, tweens, timers.

export const SVGNS = 'http://www.w3.org/2000/svg';

export function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  setProps(e, props);
  for (const c of children.flat()) if (c != null) e.append(c instanceof Node ? c : document.createTextNode(c));
  return e;
}

export function S(tag, props = {}, ...children) {
  const e = document.createElementNS(SVGNS, tag);
  setProps(e, props);
  for (const c of children.flat()) if (c != null) e.append(c instanceof Node ? c : document.createTextNode(c));
  return e;
}

function setProps(e, props) {
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
}

/** 0.8990 -> "90%": same rounding as the app (Math.round of the percentage). */
export const pct = c => Math.round(c * 100) + '%';

export const ease = {
  out: t => 1 - Math.pow(1 - t, 3),
  inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  linear: t => t,
};

// ?shot (headless screenshots): tweens and timers jump to their end state
const shotMode = () => document.body.classList.contains('shot');

/** requestAnimationFrame tween; returns a cancel function. */
export function tween(dur, onUpdate, { easing = ease.out, onDone } = {}) {
  if (shotMode()) { onUpdate(1, 1); if (onDone) onDone(); return () => {}; }
  let raf, t0;
  const frame = t => {
    if (t0 == null) t0 = t;
    const k = Math.min(1, (t - t0) / dur);
    onUpdate(easing(k), k);
    if (k < 1) raf = requestAnimationFrame(frame);
    else if (onDone) onDone();
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

/** A group of timeouts/tweens that can be cancelled together when a slide is left. */
export function timers() {
  let ids = [], cancels = [];
  return {
    after(ms, fn) { if (shotMode()) fn(); else ids.push(setTimeout(fn, ms)); },
    tween(dur, fn, opts) { cancels.push(tween(dur, fn, opts)); },
    clear() { ids.forEach(clearTimeout); cancels.forEach(c => c()); ids = []; cancels = []; },
  };
}

/** Count a number up inside an element. */
export function countUp(T, node, from, to, dur, fmt = v => Math.round(v)) {
  T.tween(dur, k => { node.textContent = fmt(from + (to - from) * k); });
}

/** Hover tooltip positioned inside a host element (stage coordinates are scaled). */
export function tooltip(host) {
  const tip = el('div', { class: 'tip' });
  host.append(tip);
  return {
    show(html, evt) {
      tip.innerHTML = html;
      const r = host.getBoundingClientRect();
      const s = r.width / host.offsetWidth || 1;
      tip.style.left = ((evt.clientX - r.left) / s + 16) + 'px';
      tip.style.top = ((evt.clientY - r.top) / s - 10) + 'px';
      tip.style.opacity = 1;
    },
    hide() { tip.style.opacity = 0; },
  };
}

export function on(node, cls, flag) { node.classList.toggle(cls, !!flag); }

// Confidence bands of the app (webapp/frontend/.../transcriptionLines.ts): green >= 90, orange 70-89, red < 70.
export function level(c) {
  const p = Math.round(c * 100);
  return p >= 90 ? 'high' : p >= 70 ? 'medium' : 'low';
}
export const LEVEL = {
  high: { stroke: '#10b981', chip: '#ecfdf5', text: '#047857' },
  medium: { stroke: '#f59e0b', chip: '#fffbeb', text: '#b45309' },
  low: { stroke: '#ef4444', chip: '#fef2f2', text: '#b91c1c' },
};

export async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.json();
}
