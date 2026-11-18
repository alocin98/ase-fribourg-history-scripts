// HTML/SVG animations for the right-hand side of the slides.
// `data` is assets/predict.json: the real POST /predict response for assets/img/page.jpg.
import { el, S, pct, timers, level, LEVEL } from '../util.js';

const I = 'assets/img/';
const PAGE_W = 1280, PAGE_H = 926;
const box = (style = {}) => el('div', { style: { position: 'absolute', ...style } });
const show = (node, flag) => node.classList.toggle('hidden', !flag);
const shot = () => document.body.classList.contains('shot');
function img(src, style = {}) { return el('img', { src, style: { display: 'block', ...style }, draggable: 'false' }); }
const chip = c => {
  const L = LEVEL[level(c)];
  return el('span', { class: 'chip', style: { background: L.chip, color: L.text }, text: pct(c) });
};
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Endless loop over n items (one tick every `ms`); in ?shot mode it only shows item 0. */
function cycle(T, n, ms, fn) {
  if (shot()) { fn(0); return; }
  let i = 0;
  const tick = () => { fn(i); i = (i + 1) % n; T.after(ms, tick); };
  tick();
}

/** The page image with one absolutely positioned box per transcribed line. */
function pageView(data, W) {
  const s = W / PAGE_W, H = Math.round(PAGE_H * s);
  const wrap = el('div', { style: { position: 'relative', width: W + 'px', height: H + 'px', overflow: 'hidden', borderRadius: '6px' } });
  wrap.append(img(I + 'page.jpg', { width: W + 'px', height: H + 'px' }));
  const boxes = data.lines.map(l => {
    const [x0, y0, x1, y1] = l.bbox;
    const b = el('div', { class: 'lbox', style: { left: x0 * s + 'px', top: y0 * s + 'px', width: (x1 - x0) * s + 'px', height: (y1 - y0) * s + 'px', borderColor: LEVEL[level(l.confidence)].stroke } });
    wrap.append(b);
    return b;
  });
  return { wrap, boxes, s, H };
}

/** One line of the page, cut out of the image with CSS (its bbox, scaled to height h). */
function lineCrop(line, h) {
  const [x0, y0, x1, y1] = line.bbox;
  const k = h / (y1 - y0);
  return el('div', { style: {
    width: Math.round((x1 - x0) * k) + 'px', height: h + 'px', backgroundImage: `url(${I}page.jpg)`,
    backgroundSize: `${PAGE_W * k}px ${PAGE_H * k}px`, backgroundPosition: `${-x0 * k}px ${-y0 * k}px`,
    borderRadius: '6px', border: '1px solid var(--line)', flex: 'none',
  } });
}

// ------------------------------------------------------------------ title / thanks: the page being read
export function scan(host, data) {
  const pv = pageView(data, 900);
  const card = el('div', { class: 'card', style: { position: 'absolute', left: '20px', top: '40px', padding: '14px' } }, pv.wrap);
  const txt = el('div', { class: 'card', style: { position: 'absolute', left: '20px', right: '0', top: (pv.H + 88) + 'px', padding: '18px 22px', display: 'flex', gap: '16px', alignItems: 'center', fontSize: '25px', minHeight: '76px' } });
  host.append(card, txt);
  const T = timers();
  const n = data.lines.length;
  const paint = i => {
    pv.boxes.forEach((b, j) => { b.classList.toggle('on', j <= i || shot()); b.classList.toggle('act', j === i); });
    const l = data.lines[i];
    txt.replaceChildren(el('span', { class: 'muted', style: { fontSize: '20px', width: '60px' }, text: `${l.index} / ${n}` }), el('span', { style: { flex: 1 }, text: l.text }), chip(l.confidence));
  };
  return {
    enter() { T.clear(); cycle(T, n, 1300, paint); },
    leave() { T.clear(); },
  };
}

// ------------------------------------------------------------------ demo: the four screens of the app
export function demo(host, data) {
  const win = el('div', { class: 'card', style: { position: 'absolute', left: '10px', right: '0', top: '20px', height: '760px', overflow: 'hidden', padding: 0 } });
  const bar = el('div', { style: { height: '54px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 20px', background: '#f3f2ee' } },
    ['#ef6a5e', '#f5bf4f', '#61c554'].map(c => el('i', { style: { width: '14px', height: '14px', borderRadius: '50%', background: c } })));
  const url = el('div', { class: 'mono', style: { marginLeft: '18px', fontSize: '18px', background: '#fff', border: '1px solid var(--line)', padding: '4px 16px', borderRadius: '999px', color: 'var(--ink2)' } });
  bar.append(url);
  const body = el('div', { style: { position: 'absolute', top: '54px', left: 0, right: 0, bottom: 0 } });
  win.append(bar, body);
  host.append(win);
  const screen = () => el('div', { class: 'pop', style: { position: 'absolute', inset: '0', padding: '26px 30px' } });

  // 1 · documents + new document dialog + ZIP upload
  const s1 = screen();
  const docs = el('div', {}, el('div', { style: { fontSize: '30px', fontWeight: 700, marginBottom: '18px' }, text: 'Documents' }),
    el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } },
      ['Letters, vol. 1', 'Diary 1912'].map(t => el('div', { class: 'card', style: { padding: '18px', fontSize: '22px' } }, el('b', { text: t }), el('div', { class: 'muted', style: { fontSize: '18px' }, text: 'example document' })))));
  const dialog = el('div', { class: 'card pop', style: { position: 'absolute', left: '150px', right: '150px', top: '170px', padding: '26px', boxShadow: '0 20px 50px rgba(0,0,0,.18)' } });
  const fill = el('div', { style: { height: '100%', width: '0%', background: 'var(--blue)', transition: 'width 1.6s ease' } });
  dialog.append(el('div', { style: { fontSize: '26px', fontWeight: 700, marginBottom: '14px' }, text: 'Create new document' }),
    el('div', { class: 'field', text: 'Test pages' }), el('div', { class: 'field muted', text: '20 handwritten pages, 20 writers' }),
    el('div', { style: { border: '2px dashed var(--axis)', borderRadius: '12px', padding: '20px', marginTop: '14px', textAlign: 'center', fontSize: '21px', color: 'var(--ink2)' } },
      el('div', { html: '<b>pages.zip</b> · drop a ZIP of PNG / JPG pages' }),
      el('div', { style: { height: '10px', background: '#ecebe5', borderRadius: '5px', overflow: 'hidden', marginTop: '12px' } }, fill)),
    el('div', { class: 'btn', style: { marginTop: '16px' }, text: 'Create' }));
  s1.append(docs, dialog);

  // 2 · page list + preview
  const s2 = screen();
  const thumbs = ['0052-1', '0083-2', '0164-3', '0179-4', '0193-6'];
  const list = el('div', { style: { position: 'absolute', left: '30px', top: '26px', width: '200px', display: 'flex', flexDirection: 'column', gap: '10px' } },
    el('div', { style: { fontSize: '24px', fontWeight: 700 }, text: 'Test pages' }),
    el('div', { class: 'pagerow sel', text: 'Page 1' }),
    thumbs.map((t, i) => el('div', { class: 'pagerow' }, img(I + `thumb-${t}.jpg`, { width: '44px', height: '46px', objectFit: 'cover', borderRadius: '4px' }), `Page ${i + 2}`)));
  const prev = el('div', { class: 'card', style: { position: 'absolute', left: '260px', right: '30px', top: '26px', padding: '12px' } }, img(I + 'page.jpg', { width: '100%' }));
  const tbtn = el('div', { class: 'btn', style: { position: 'absolute', right: '30px', bottom: '30px' }, text: 'Transcribe' });
  s2.append(list, prev, tbtn);

  // 3 · job running
  const s3 = screen();
  const status = el('span', { class: 'pill', text: 'queued' });
  const prog = el('div', { style: { height: '100%', width: '0%', background: 'var(--blue)', transition: 'width 2.4s linear' } });
  s3.append(el('div', { class: 'card', style: { position: 'absolute', left: '130px', right: '130px', top: '200px', padding: '30px' } },
    el('div', { style: { fontSize: '26px', fontWeight: 700, marginBottom: '12px' }, text: 'Transcribing “Test pages”' }),
    el('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', fontSize: '21px', color: 'var(--ink2)' } }, 'Job status:', status),
    el('div', { style: { height: '14px', background: '#ecebe5', borderRadius: '7px', overflow: 'hidden', margin: '20px 0 10px' } }, prog),
    el('div', { class: 'muted', style: { fontSize: '19px' }, text: 'about 35 s per page on CPU · pages already done are skipped' })));

  // 4 · result
  const s4 = screen();
  const pv = pageView(data, 440);
  pv.boxes.forEach(b => b.classList.add('on'));
  const lines = el('div', { style: { position: 'absolute', left: '500px', right: '24px', top: '26px', display: 'flex', flexDirection: 'column', gap: '6px' } },
    el('div', { style: { fontSize: '19px', marginBottom: '6px', color: 'var(--ink2)' }, html: `Page 1 · confidence <b>${pct(mean(data.lines.map(l => l.confidence)))}</b>` }),
    data.lines.map(l => el('div', { style: { display: 'flex', gap: '10px', alignItems: 'baseline', fontSize: '17px', lineHeight: 1.3 } },
      el('span', { class: 'muted', style: { width: '18px', flex: 'none' }, text: l.index }), el('span', { style: { flex: 1 }, text: l.text }), chip(l.confidence))));
  s4.append(el('div', { class: 'card', style: { position: 'absolute', left: '30px', top: '26px', padding: '8px' } }, pv.wrap), lines);

  const screens = [s1, s2, s3, s4];
  const urls = ['/app/documents', '/app/documents/…', '/app/documents/…', '/app/documents/…'];
  body.append(...screens);
  const T = timers();
  return {
    step(n) {
      T.clear();
      screens.forEach((s, i) => show(s, n === i + 1));
      url.textContent = 'manuscript-ai.coffee-journal.com' + urls[n - 1];
      show(dialog, n === 1);
      fill.style.width = '0%';
      if (n === 1) T.after(500, () => { fill.style.width = '100%'; });
      prog.style.width = '0%';
      status.textContent = 'queued';
      status.className = 'pill';
      if (n === 3) {
        T.after(500, () => { status.textContent = 'in_progress'; status.className = 'pill blue'; prog.style.width = '100%'; });
        T.after(3000, () => { status.textContent = 'completed'; status.className = 'pill green'; });
      }
    },
    leave() { T.clear(); },
  };
}

// ------------------------------------------------------------------ architecture
export function arch(host) {
  const svg = S('svg', { viewBox: '0 0 940 820', width: 940, height: 820 });
  const node = (x, y, w, h, title, sub, color) => {
    const g = S('g', { class: 'anode' });
    g.append(S('rect', { x, y, width: w, height: h, rx: 16, fill: '#fff', stroke: color, 'stroke-width': 3 }),
      S('text', { x: x + 22, y: y + 42, 'font-size': 28, 'font-weight': 700, fill: 'var(--ink)' }, title));
    sub.forEach((t, i) => g.append(S('text', { x: x + 22, y: y + 76 + i * 28, 'font-size': 20, fill: 'var(--ink2)' }, t)));
    svg.append(g);
    return g;
  };
  const arrow = (d, label, lx, ly) => {
    const g = S('g', { class: 'aedge' });
    g.append(S('path', { d, fill: 'none', stroke: 'var(--axis)', 'stroke-width': 3, 'marker-end': 'url(#ah)' }));
    if (label) g.append(S('text', { x: lx, y: ly, 'font-size': 19, fill: 'var(--ink2)', 'font-family': 'var(--mono)' }, label));
    svg.append(g);
    return { g, d };
  };
  svg.append(S('defs', {}, S('marker', { id: 'ah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
    S('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--axis)' }))));
  const boundary = S('g', { class: 'anode' });
  boundary.append(S('rect', { x: 10, y: 172, width: 920, height: 600, rx: 22, fill: 'rgba(42,120,214,.04)', stroke: 'var(--blue)', 'stroke-width': 2, 'stroke-dasharray': '10 8' }),
    S('text', { x: 34, y: 756, 'font-size': 20, fill: 'var(--blue)', 'font-weight': 650 }, 'Docker containers · built and deployed by Coolify from GitHub'));
  svg.append(boundary);
  const browser = node(330, 10, 280, 110, 'Browser', ['historian'], 'var(--ink2)');
  const traefik = node(40, 196, 860, 70, 'Traefik', [], 'var(--blue)');
  traefik.append(S('text', { x: 190, y: 238, 'font-size': 20, fill: 'var(--ink2)' }, 'HTTPS (Let’s Encrypt) · manuscript-ai.coffee-journal.com'));
  const fe = node(40, 330, 380, 150, 'Frontend', ['React SPA · TypeScript', 'nginx, port 80'], 'var(--orange)');
  const be = node(520, 330, 380, 150, 'Backend', ['FastAPI, under /api', 'port 8000'], 'var(--green)');
  const db = node(520, 560, 180, 150, 'PostgreSQL', ['16 · users,', 'docs, jobs'], 'var(--green)');
  const vol = node(720, 560, 180, 150, 'Volume', ['/data/', 'documents'], 'var(--green)');
  const ml = node(40, 560, 380, 150, 'ML backend', ['FastAPI · POST /predict', 'Kraken BLLA + TrOCR'], 'var(--violet)');
  const eB = arrow('M470,120 L470,192', null);
  const eF = arrow('M230,266 L230,326', '/', 244, 304);
  const eBe = arrow('M710,266 L710,326', '/api', 724, 304);
  const eDb = arrow('M610,480 L610,556', null);
  const eVol = arrow('M810,480 L810,556', null);
  const eMl = arrow('M520,450 C470,450 470,610 424,610', 'HTTP', 440, 520);
  // packets: one request travelling browser → traefik → backend → ML backend
  const packets = S('g', { class: 'anode' });
  const route = 'M470,120 L470,231 L710,231 L710,450 C 650,450 470,450 470,530 C470,610 450,610 424,610';
  [0, 1.2, 2.4].forEach(b => {
    const c = S('circle', { r: 9, fill: 'var(--blue)' });
    c.append(S('animateMotion', { dur: '3.6s', begin: b + 's', repeatCount: 'indefinite', path: route }));
    packets.append(c);
  });
  svg.append(packets);
  host.append(svg);
  const parts = [[fe, eF], [be, db, vol, eDb, eVol, eBe], [ml, eMl], [boundary, traefik, eB, packets]];
  return {
    step(n) {
      parts.forEach((p, i) => p.forEach(x => (x.g || x).classList.toggle('dim', n < i + 1)));
      browser.classList.remove('dim');
      [fe, be, ml].forEach((x, i) => x.classList.toggle('hl', n === i + 1));
    },
  };
}

// ------------------------------------------------------------------ the model: BLLA then TrOCR
export function pipeline(host, data) {
  const pv = pageView(data, 800);
  const card = el('div', { class: 'card', style: { position: 'absolute', left: '60px', top: '50px', padding: '12px' } }, pv.wrap);
  const badge = el('div', { class: 'pill violet pop', style: { position: 'absolute', left: '60px', top: '0', fontSize: '21px' }, html: `BLLA: <b>${data.n_fragments}</b> fragments → <b>${data.lines.length}</b> lines` });
  const strip = el('div', { class: 'card pop', style: { position: 'absolute', left: '20px', right: '0', top: (pv.H + 90) + 'px', padding: '14px 20px' } });
  const full = el('div', { class: 'card pop', style: { position: 'absolute', left: '60px', right: '40px', top: '60px', padding: '24px 28px', boxShadow: '0 20px 50px rgba(0,0,0,.16)', fontSize: '22px', lineHeight: 1.5 } },
    el('div', { class: 'kicker', style: { fontSize: '17px', marginBottom: '10px' }, text: 'Text of the whole page · TrOCR' }),
    data.lines.map(l => el('div', { text: l.text })));
  const cap = el('div', { class: 'figcap pop', style: { position: 'absolute', left: '60px', top: (pv.H + 90) + 'px' }, text: `Input: one scanned page, ${PAGE_W} × ${PAGE_H} px` });
  host.append(card, badge, strip, full, cap);
  const T = timers();
  const read = i => {
    const l = data.lines[i];
    pv.boxes.forEach((b, j) => { b.classList.add('on'); b.classList.toggle('act', j === i); });
    strip.replaceChildren(
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } }, lineCrop(l, 50), el('span', { class: 'muted', style: { fontSize: '19px' }, text: `line ${l.index}` })),
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px', fontSize: '23px' } }, el('span', { class: 'pill violet', text: 'TrOCR →' }), el('span', { style: { flex: 1 }, text: l.text })));
  };
  return {
    step(n) {
      T.clear();
      show(cap, n === 1);
      show(badge, n >= 2);
      show(strip, n >= 3);
      show(full, n >= 4);
      pv.boxes.forEach(b => b.classList.remove('act'));
      if (n === 2) pv.boxes.forEach((b, i) => { b.classList.remove('on'); T.after(150 + i * 160, () => b.classList.add('on')); });
      else pv.boxes.forEach(b => b.classList.toggle('on', n >= 2));
      if (n === 3) cycle(T, data.lines.length, 1500, read);
      if (n === 4) read(0);
    },
    leave() { T.clear(); },
  };
}

// ------------------------------------------------------------------ backend: sequence diagram
export function backend(host) {
  const svg = S('svg', { viewBox: '0 0 940 820', width: 940, height: 820 });
  svg.append(S('defs', {}, S('marker', { id: 'sq', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
    S('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--ink2)' }))));
  const X = [100, 360, 610, 850];
  const heads = [['Frontend', 'var(--orange)'], ['Backend', 'var(--green)'], ['DB + disk', 'var(--green)'], ['ML backend', 'var(--violet)']];
  heads.forEach(([t, c], i) => {
    svg.append(S('line', { x1: X[i], y1: 70, x2: X[i], y2: 812, stroke: 'var(--line)', 'stroke-width': 2, 'stroke-dasharray': '6 6' }),
      S('rect', { x: X[i] - 88, y: 10, width: 176, height: 58, rx: 12, fill: '#fff', stroke: c, 'stroke-width': 3 }),
      S('text', { x: X[i], y: 47, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 700 }, t));
  });
  const msg = (a, b, y, label, ret = false) => {
    const g = S('g', { class: 'pop' });
    const x1 = X[a], x2 = X[b];
    if (a === b) {
      g.append(S('path', { d: `M${x1},${y - 10} h40 v24 h-36`, fill: 'none', stroke: 'var(--ink2)', 'stroke-width': 2.5, 'marker-end': 'url(#sq)' }),
        S('text', { x: x1 + 52, y: y + 8, 'font-size': 19, fill: 'var(--ink2)' }, label));
    } else {
      const dir = x2 > x1 ? 1 : -1;
      g.append(S('line', { x1: x1 + dir * 6, y1: y, x2: x2 - dir * 8, y2: y, stroke: 'var(--ink2)', 'stroke-width': 2.5, 'stroke-dasharray': ret ? '7 6' : null, 'marker-end': 'url(#sq)' }),
        S('text', { x: (x1 + x2) / 2, y: y - 10, 'text-anchor': 'middle', 'font-size': 19, fill: ret ? 'var(--ink2)' : 'var(--ink)', 'font-family': ret ? null : 'var(--mono)' }, label));
    }
    svg.append(g);
    return g;
  };
  const section = (y, t) => {
    const g = S('g', { class: 'pop' }, S('text', { x: 4, y: y - 8, 'font-size': 17, 'font-weight': 700, fill: 'var(--blue)', 'letter-spacing': '.06em' }, t));
    svg.append(g);
    return g;
  };
  const groups = [
    [],
    [section(112, 'LOGIN'), msg(0, 1, 140, 'POST /api/login'), msg(1, 2, 182, 'check hash, create session'), msg(1, 0, 224, 'session cookie + CSRF token', true)],
    [section(276, 'UPLOAD'), msg(0, 1, 304, 'POST /api/documents/{id}  (ZIP)'), msg(1, 1, 346, 'safe paths? images only? size?'), msg(1, 2, 400, 'pages/ on disk + rows'), msg(1, 0, 442, 'document with its pages', true)],
    [section(494, 'TRANSCRIPTION'), msg(0, 1, 522, 'POST /api/transcriptions/document/{id}'), msg(1, 0, 564, '202 · job_id, status “queued”', true),
      msg(1, 3, 606, 'POST /predict  (each page)'), msg(3, 1, 648, 'text, lines, boxes, confidences', true), msg(1, 2, 690, 'save lines'),
      msg(0, 1, 740, 'GET /api/transcriptions/jobs/{id}'), msg(1, 0, 782, 'in_progress → completed', true)],
  ];
  const layers = el('div', { class: 'card pop', style: { position: 'absolute', left: '170px', right: '120px', top: '230px', padding: '26px 30px' } },
    el('div', { style: { fontSize: '24px', fontWeight: 700, marginBottom: '16px' }, text: 'Inside the backend' }),
    ['<b>routes</b> · validate the request (Pydantic schemas)', '<b>repositories</b> · read and write the database', '<b>models</b> · SQLAlchemy tables, Alembic migrations'].map((h, i) =>
      el('div', { style: { display: 'flex', gap: '14px', alignItems: 'center', fontSize: '22px', margin: '10px 0', color: 'var(--ink2)' } },
        el('span', { class: 'pill green', text: String(i + 1) }), el('span', { html: h }))));
  host.append(svg, layers);
  return {
    step(n) {
      show(layers, n === 1);
      groups.forEach((g, i) => g.forEach(x => show(x, n >= i + 1)));
    },
  };
}

// ------------------------------------------------------------------ ML backend: request, response, confidence, constraints
export function mlapi(host, data) {
  const l1 = data.lines[0];
  const req = el('div', { class: 'card code pop', style: { position: 'absolute', left: '10px', right: '0', top: '0' } },
    el('div', { html: '<span class="c">$</span> curl -F "file=@english_page_test.jpg" <span class="k">ml-backend</span>/predict' }),
    el('div', { class: 'c', style: { marginTop: '8px' }, text: '# 1 worker · models loaded at start · 37.9 s for this page on CPU' }));
  const q = s => `<span class="s">"${s}"</span>`;
  const shortText = data.text.split('\n')[0];
  const res = el('div', { class: 'card code pop', style: { position: 'absolute', left: '10px', right: '0', top: '138px' }, html:
    `{<br>&nbsp;&nbsp;<span class="k">"text"</span>: ${q(shortText.slice(0, 44) + ' …')},<br>` +
    `&nbsp;&nbsp;<span class="k">"lines"</span>: [<br>` +
    `&nbsp;&nbsp;&nbsp;&nbsp;{ <span class="k">"index"</span>: 1, <span class="k">"text"</span>: ${q(l1.text.slice(0, 30) + ' …')},<br>` +
    `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k hl-box">"bbox"</span>: [${l1.bbox.join(', ')}],<br>` +
    `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="k hl-conf">"confidence"</span>: ${l1.confidence.toFixed(3)}, <span class="k hl-conf">"words"</span>: [ … ] },<br>` +
    `&nbsp;&nbsp;&nbsp;&nbsp;<span class="c">… ${data.lines.length - 1} more lines</span><br>&nbsp;&nbsp;],<br>` +
    `&nbsp;&nbsp;<span class="k">"n_fragments"</span>: ${data.n_fragments}, <span class="k">"image_size"</span>: [${data.image_size.join(', ')}],<br>` +
    `&nbsp;&nbsp;<span class="k">"models"</span>: { ${q('kraken-blla (default)')}, ${q('trocr-small-handwritten')} }<br>}` });
  const words = el('div', { class: 'card pop', style: { position: 'absolute', left: '10px', right: '0', top: '560px', padding: '20px 24px' } },
    el('div', { style: { fontSize: '20px', color: 'var(--ink2)', marginBottom: '12px' }, html: `Line 1 · <b>${pct(l1.confidence)}</b> · confidence = mean of the token probabilities <span class="mono">1/n · Σ pᵢ</span>` }),
    el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px 10px', alignItems: 'center' } },
      l1.words.map(w => el('span', { class: 'word', style: { borderColor: LEVEL[level(w.confidence)].stroke } }, w.text, chip(w.confidence)))));
  const tiles = [
    ['torch 2.4', 'kraken 5.3 needs torch 2.4, but transformers won’t load <code>.bin</code> weights with torch &lt; 2.6 → TrOCR <b>safetensors</b> revision, pinned by commit'],
    ['MKLDNN=0', 'with oneDNN, BLLA was killed (out of memory) in a 4 GB Docker VM; peak now ≈ 3.4 GB'],
    ['MAX_ASPECT 1.4', 'wider images (e.g. a single line) are padded with white before BLLA; boxes stay in the original image'],
    ['offline image', 'TrOCR weights are downloaded at build time; the container runs without network'],
  ];
  const cons = el('div', { class: 'pop', style: { position: 'absolute', left: '10px', right: '0', top: '138px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' } },
    tiles.map(([t, d]) => el('div', { class: 'card', style: { padding: '24px' } }, el('div', { class: 'mono', style: { fontSize: '26px', fontWeight: 700, background: 'none', padding: 0 }, text: t }),
      el('div', { style: { fontSize: '21px', lineHeight: 1.45, color: 'var(--ink2)', marginTop: '12px' }, html: d }))));
  host.append(req, res, words, cons);
  return {
    step(n) {
      show(req, true);
      show(res, n >= 2 && n < 4);
      res.classList.toggle('show-box', n === 2);
      res.classList.toggle('show-conf', n === 3);
      show(words, n === 3);
      show(cons, n >= 4);
    },
  };
}

// ------------------------------------------------------------------ frontend: the document page
export function frontend(host, data) {
  const pv = pageView(data, 470);
  const pageConf = mean(data.lines.map(l => l.confidence));
  const app = el('div', { class: 'card', style: { position: 'absolute', left: '0', right: '0', top: '20px', height: '760px', padding: '24px', overflow: 'hidden' } });
  const head = el('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' } },
    el('div', { style: { fontSize: '28px', fontWeight: 700, flex: 1 }, text: 'Test pages' }));
  const docConf = el('span', { class: 'pop', style: { fontSize: '18px', color: 'var(--ink2)' }, html: `Document · confidence <b>${pct(pageConf)}</b>` });
  const tbtn = el('div', { class: 'btn pop', text: 'Transcribe page' });
  head.append(docConf, tbtn);
  const pageCard = el('div', { class: 'card', style: { position: 'absolute', left: '24px', top: '84px', padding: '8px' } }, pv.wrap);
  const rows = data.lines.map((l, i) => el('div', { class: 'tline' }, el('span', { class: 'muted', style: { width: '20px', flex: 'none' }, text: l.index }), el('span', { style: { flex: 1 }, text: l.text }), chip(l.confidence)));
  const list = el('div', { class: 'pop', style: { position: 'absolute', left: '520px', right: '20px', top: '84px', display: 'flex', flexDirection: 'column', gap: '2px' } },
    el('div', { style: { fontSize: '18px', color: 'var(--ink2)', margin: '0 0 8px 8px' }, html: `Page 1 · confidence <b>${pct(pageConf)}</b>` }), rows);
  const empty = el('div', { class: 'muted pop', style: { position: 'absolute', left: '540px', top: '120px', fontSize: '22px' }, text: 'Not transcribed yet.' });
  const legend = el('div', { class: 'legend pop', style: { position: 'absolute', left: '24px', top: (84 + pv.H + 40) + 'px', fontSize: '19px' } },
    [['high', '≥ 90%'], ['medium', '70–89%'], ['low', '< 70%']].map(([k, t]) => el('span', {}, el('i', { style: { background: LEVEL[k].stroke } }), t)));
  // line dialog: the lowest-confidence line, with its snippet and its words
  const worst = data.lines.reduce((a, b) => (b.confidence < a.confidence ? b : a));
  const dlg = el('div', { class: 'card pop', style: { position: 'absolute', left: '40px', right: '40px', top: '210px', padding: '26px', boxShadow: '0 24px 60px rgba(0,0,0,.22)' } },
    el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: 700, marginBottom: '14px' } }, `Line ${worst.index}`, chip(worst.confidence)),
    lineCrop(worst, 58),
    el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px 10px', marginTop: '18px' } },
      worst.words.map(w => el('span', { class: 'word', style: { borderColor: LEVEL[level(w.confidence)].stroke } }, w.text, chip(w.confidence)))),
    el('div', { class: 'muted', style: { fontSize: '18px', marginTop: '14px' }, html: 'Written: “very much like <b>shadows</b> – only <b>hard</b> and with luminous edges –”. The model read “shareholders” and “heard”: both are marked red.' }));
  app.append(head, pageCard, list, empty, legend);
  host.append(app, dlg);
  const T = timers();
  const hover = i => {
    rows.forEach((r, j) => r.classList.toggle('act', j === i));
    pv.boxes.forEach((b, j) => b.classList.toggle('act', j === i));
  };
  return {
    step(n) {
      T.clear();
      show(tbtn, n === 1);
      show(empty, n === 1);
      show(list, n >= 2);
      show(docConf, n >= 2);
      show(legend, n >= 2);
      show(dlg, n >= 4);
      pv.boxes.forEach(b => b.classList.toggle('on', n >= 2));
      hover(-1);
      if (n === 3) cycle(T, data.lines.length, 1200, hover);
      if (n === 4) hover(worst.index - 1);
    },
    leave() { T.clear(); },
  };
}

// ------------------------------------------------------------------ user stories: issue → sub-issues → DoD
export function stories(host) {
  const issue = el('div', { class: 'card pop', style: { position: 'absolute', left: '0', top: '10px', width: '440px', padding: '24px' } },
    el('div', { style: { display: 'flex', gap: '8px', marginBottom: '12px' } }, el('span', { class: 'pill violet', text: 'User Story' }), el('span', { class: 'pill', text: 'mvp' })),
    el('div', { style: { fontSize: '25px', fontWeight: 700, lineHeight: 1.25 }, html: 'ML / App: Page transcription <span class="muted">#19</span>' }));
  const parts = [['User story', 'As a user, I want …'], ['Description', 'what each layer does'], ['Acceptance tests', 'steps a reviewer clicks through']].map(([t, d]) =>
    el('div', { class: 'pop', style: { marginTop: '16px', borderLeft: '4px solid var(--blue)', paddingLeft: '14px' } },
      el('div', { style: { fontSize: '21px', fontWeight: 700 }, text: t }), el('div', { class: 'muted', style: { fontSize: '19px' }, text: d })));
  issue.append(...parts);
  const subs = [['Frontend', 'Add button transcription', 40], ['Backend', 'Transcription', 41], ['ML', 'Transcription', 42], ['Frontend', 'Display transcription results', 51], ['Webapp', 'Wire up ml backend with webapp backend', 62]];
  const color = { Frontend: 'orange', Backend: 'green', ML: 'violet', Webapp: 'blue' };
  const subBox = el('div', { class: 'pop', style: { position: 'absolute', left: '500px', right: '0', top: '10px', display: 'flex', flexDirection: 'column', gap: '12px' } },
    el('div', { style: { fontSize: '20px', color: 'var(--ink2)' }, html: 'Sub-issues <b>5 / 5</b> closed' }),
    subs.map(([k, t, n]) => el('div', { class: 'card', style: { padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'center', fontSize: '19px' } },
      el('span', { class: 'done-dot', text: '✓' }), el('span', { class: 'pill ' + color[k], style: { fontSize: '16px' }, text: k }), el('span', { style: { flex: 1 }, text: t }), el('span', { class: 'muted', text: '#' + n }))));
  const arrows = S('svg', { class: 'pop', viewBox: '0 0 60 380', width: 60, height: 380, style: 'position:absolute;left:440px;top:40px' },
    S('path', { d: 'M4,150 C30,150 30,40 56,40 M4,150 C30,150 30,330 56,330', fill: 'none', stroke: 'var(--axis)', 'stroke-width': 3 }));
  const dodItems = [['Testing', 'automated tests where it makes sense; current tests pass'], ['Review', 'by at least one other person, tested locally by the reviewer'],
    ['Docs', 'documentation, readme and agent files updated'], ['Deployment', 'deployed on dev and manually smoke tested']];
  const dod = el('div', { class: 'card pop', style: { position: 'absolute', left: '0', right: '0', top: '470px', padding: '24px 28px' } },
    el('div', { style: { fontSize: '24px', fontWeight: 700, marginBottom: '12px' }, text: 'Definition of Done' }),
    el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 30px' } },
      dodItems.map(([t, d]) => el('div', { class: 'dod', style: { display: 'flex', gap: '12px', fontSize: '20px', lineHeight: 1.35 } },
        el('span', { class: 'done-dot', text: '✓' }), el('span', { html: `<b>${t}</b><br><span class="muted">${d}</span>` })))));
  host.append(issue, arrows, subBox, dod);
  const T = timers();
  return {
    step(n) {
      T.clear();
      show(issue, n >= 1);
      parts.forEach(p => show(p, n >= 2));
      show(arrows, n >= 3);
      show(subBox, n >= 3);
      show(dod, n >= 4);
      const ticks = [...dod.querySelectorAll('.dod')];
      ticks.forEach(t => t.classList.remove('ok'));
      if (n >= 4) ticks.forEach((t, i) => T.after(300 + i * 350, () => t.classList.add('ok')));
    },
    leave() { T.clear(); },
  };
}

// ------------------------------------------------------------------ the example issue (screenshot kept from our slides)
export function storyshot(host) {
  const W = 920, s = W / 928;
  const wrap = el('div', { style: { position: 'absolute', left: '10px', top: '90px', width: W + 'px', height: Math.round(617 * s) + 'px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,.18)' } },
    img(I + 'story.jpg', { width: W + 'px' }));
  const hl = el('div', { class: 'spot' });
  wrap.append(hl);
  host.append(wrap);
  const R = [null, [120, 168], [178, 395], [404, 546]];
  return {
    step(n) {
      const [y0, y1] = R[n];
      Object.assign(hl.style, { top: (y0 * s) + 'px', height: ((y1 - y0) * s) + 'px' });
    },
  };
}

// ------------------------------------------------------------------ road to the MVP (mockup + sub-issues kept from our slides)
export function mvp(host) {
  const mock = el('div', { class: 'card pop', style: { position: 'absolute', left: '10px', right: '0', top: '0', padding: '14px' } },
    img(I + 'mvp-mockups.svg', { width: '100%' }), el('div', { class: 'figcap', style: { marginTop: '6px' }, text: 'MVP mockup (documents/mvp-mockups.svg)' }));
  const board = el('div', { class: 'pop', style: { position: 'absolute', left: '10px', right: '0', top: '40px' } },
    el('div', { style: { borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,.18)' } }, img(I + 'track.jpg', { width: '100%' })),
    el('div', { class: 'figcap', style: { marginTop: '8px' }, text: 'GitHub project board, filtered on label:"User Story"' }));
  const rel = [['7.10.2026', 'PR #32, #34'], ['13.10.2026', 'PR #49'], ['22.10.2026', 'PR #60']];
  const line = el('div', { class: 'pop', style: { position: 'absolute', left: '10px', right: '0', top: '560px', height: '260px' } });
  line.append(el('div', { style: { position: 'absolute', left: '30px', right: '30px', top: '150px', height: '4px', background: 'var(--axis)' } }),
    el('div', { style: { fontSize: '22px', fontWeight: 700, color: 'var(--ink)' }, text: 'dev → main: production deployments' }));
  rel.forEach(([d, p], i) => line.append(el('div', { style: { position: 'absolute', left: (60 + i * 300) + 'px', top: '118px', width: '240px' } },
    el('div', { style: { width: '30px', height: '30px', borderRadius: '50%', background: 'var(--green)', border: '5px solid #fff', boxShadow: '0 0 0 2px var(--green)', marginTop: '9px' } }),
    el('div', { style: { fontSize: '26px', fontWeight: 700, marginTop: '16px' }, text: d }), el('div', { class: 'muted', style: { fontSize: '19px' }, text: p }))));
  host.append(mock, board, line);
  return {
    step(n) {
      show(mock, n === 1);
      show(board, n >= 2);
      show(line, n >= 3);
    },
  };
}

// ------------------------------------------------------------------ git workflow (our sketch, redrawn)
export function gitflow(host) {
  const svg = S('svg', { viewBox: '0 0 940 820', width: 940, height: 820 });
  svg.append(S('defs', {}, S('marker', { id: 'gh', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
    S('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--red)' }))));
  const MAIN = 110, DEV = 330, FEAT = 500;
  const lane = (y, name, c) => svg.append(S('line', { x1: 40, y1: y, x2: 900, y2: y, stroke: c, 'stroke-width': 6, 'stroke-linecap': 'round' }),
    S('text', { x: 40, y: y - 20, 'font-size': 26, 'font-weight': 700, 'font-family': 'var(--mono)', fill: c }, name));
  lane(MAIN, 'main', 'var(--ink)');
  lane(DEV, 'dev', 'var(--blue)');
  const draw = (d, c, w = 6, marker = false) => {
    const p = S('path', { d, fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', class: 'draw', 'marker-end': marker ? 'url(#gh)' : null });
    svg.append(p);
    return p;
  };
  const feat = draw(`M150,${DEV} C190,${DEV} 190,${FEAT} 260,${FEAT} L520,${FEAT}`, 'var(--orange)');
  const featLbl = S('text', { x: 270, y: FEAT + 46, 'font-size': 24, 'font-family': 'var(--mono)', fill: 'var(--orange)', class: 'pop' }, 'feat/{my-feature}');
  const commits = [300, 380, 460].map(x => S('circle', { cx: x, cy: FEAT, r: 11, fill: '#fff', stroke: 'var(--orange)', 'stroke-width': 5, class: 'pop' }));
  svg.append(featLbl, S('circle', { cx: 150, cy: DEV, r: 12, fill: '#fff', stroke: 'var(--blue)', 'stroke-width': 5 }), ...commits);
  // PR card
  const pr = S('g', { class: 'pop' });
  pr.append(S('rect', { x: 560, y: 410, width: 360, height: 290, rx: 16, fill: '#fff', stroke: 'var(--line)', 'stroke-width': 2 }),
    S('text', { x: 584, y: 448, 'font-size': 22, 'font-weight': 700 }, 'Pull request → dev'),
    S('text', { x: 584, y: 482, 'font-size': 18, 'font-weight': 700, fill: 'var(--blue)' }, 'AUTOMATIC CHECKS'));
  ['format check', 'lint check', 'tests', 'build check (Docker)'].forEach((t, i) => pr.append(S('text', { x: 590, y: 514 + i * 30, 'font-size': 20, fill: 'var(--ink2)' }, '✓  ' + t)));
  pr.append(S('text', { x: 590, y: 634, 'font-size': 19, fill: 'var(--muted)' }, '○  (planned) e2e smoke tests'),
    S('text', { x: 584, y: 672, 'font-size': 18, 'font-weight': 700, fill: 'var(--green)' }, 'MANUAL: approved by a teammate ✓'));
  const merge = draw(`M520,${FEAT} C560,${FEAT} 560,${DEV} 600,${DEV}`, 'var(--orange)', 6, false);
  const mergeDot = S('circle', { cx: 600, cy: DEV, r: 12, fill: 'var(--orange)', class: 'pop' });
  const devDeploy = S('g', { class: 'pop' }, S('rect', { x: 360, y: 250, width: 380, height: 50, rx: 25, fill: 'var(--blue-soft)' }),
    S('text', { x: 550, y: 282, 'text-anchor': 'middle', 'font-size': 19, fill: '#1b5aa6', 'font-family': 'var(--mono)' }, 'manuscript-ai-dev.coffee-journal.com'));
  const tue = draw(`M790,${DEV - 10} L790,${MAIN + 14}`, 'var(--red)', 5, true);
  const tueLbl = S('g', { class: 'pop' }, S('text', { x: 806, y: 196, 'font-size': 22, 'font-weight': 700, fill: 'var(--red)' }, 'Tuesday'),
    S('text', { x: 806, y: 224, 'font-size': 22, 'font-weight': 700, fill: 'var(--red)' }, 'evening'));
  const prodDeploy = S('g', { class: 'pop' }, S('rect', { x: 200, y: 24, width: 400, height: 50, rx: 25, fill: 'var(--green-soft)' }),
    S('text', { x: 400, y: 56, 'text-anchor': 'middle', 'font-size': 19, fill: 'var(--green)', 'font-family': 'var(--mono)' }, 'manuscript-ai.coffee-journal.com'));
  svg.append(pr, merge, mergeDot, devDeploy, tue, tueLbl, prodDeploy);
  host.append(svg);
  const T = timers();
  const setDraw = (p, on) => { const L = p.getTotalLength ? p.getTotalLength() : 1000; p.style.strokeDasharray = L; p.style.strokeDashoffset = on ? 0 : L; };
  return {
    step(n) {
      T.clear();
      setDraw(feat, n >= 1);
      show(featLbl, n >= 1);
      commits.forEach((c, i) => { show(c, false); if (n >= 1) T.after(500 + i * 250, () => show(c, true)); });
      show(pr, n >= 2);
      setDraw(merge, n >= 3);
      show(mergeDot, n >= 3);
      show(devDeploy, n >= 3);
      setDraw(tue, n >= 4);
      show(tueLbl, n >= 4);
      show(prodDeploy, n >= 4);
    },
    leave() { T.clear(); },
  };
}

// ------------------------------------------------------------------ outlook: the final pipeline
export function roadmap(host) {
  const row = (top, title, sub, state) => {
    const r = el('div', { class: 'card road ' + state, style: { position: 'absolute', left: '10px', width: '440px', top: top + 'px', padding: '18px 22px' } },
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, el('span', { class: 'pill ' + (state === 'done' ? 'green' : 'blue'), text: state === 'done' ? 'MVP ✓' : 'next' }),
        el('b', { style: { fontSize: '23px' }, text: title })),
      el('div', { class: 'muted', style: { fontSize: '19px', marginTop: '6px' }, text: sub }));
    host.append(r);
    return r;
  };
  const up = row(10, 'Upload scans', 'ZIP of pages · preview', 'done');
  const seg = row(140, 'Find the lines', 'Kraken BLLA', 'done');
  const tr = row(270, 'Transcribe', 'TrOCR · confidence per line and word', 'done');
  const ex = row(400, 'Extract information', 'LLM on the transcribed text', 'next');
  const vw = row(530, 'Explore', 'text, entities and image, linked', 'next');
  host.append(S('svg', { viewBox: '0 0 40 640', width: 40, height: 640, style: 'position:absolute;left:210px;top:20px;z-index:-1' },
    S('line', { x1: 20, y1: 0, x2: 20, y2: 600, stroke: 'var(--axis)', 'stroke-width': 4, 'stroke-dasharray': '2 10', 'stroke-linecap': 'round' })));
  const side = (top, html) => {
    const s = el('div', { class: 'card pop', style: { position: 'absolute', left: '500px', right: '0', top: top + 'px', padding: '18px 22px', fontSize: '20px', lineHeight: 1.4 }, html });
    host.append(s);
    return s;
  };
  const ents = side(420, '<b>Entities</b><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">' +
    ['names', 'dates'].map(t => `<span class="pill blue">${t}</span>`).join('') + '</div><div class="muted" style="margin-top:8px">shown next to the text, with a short description</div>');
  const models = side(200, '<b>Choose the model</b><div style="display:flex;gap:8px;margin-top:10px"><span class="pill violet">model A</span><span class="pill violet">model B</span><span class="pill violet">model C</span></div><div class="muted" style="margin-top:8px">2 improved variants + a benchmark (#35, #36)</div>');
  const iiif = side(10, '<b>IIIF + S3 / MinIO</b><div class="muted" style="margin-top:6px">images served with IIIF URLs, stored in a bucket · draft PR #55 (#37, #39)</div>');
  const e2e = el('div', { class: 'pop', style: { position: 'absolute', left: '0', right: '0', top: '680px', border: '2px dashed var(--blue)', borderRadius: '18px', padding: '20px 24px', fontSize: '21px' } },
    el('b', { text: 'End-to-end and API tests' }), el('span', { class: 'muted', text: ' · the whole chain checked on every PR (#54)' }));
  host.append(e2e);
  return {
    step(n) {
      [up, seg, tr].forEach(r => r.classList.remove('dim'));
      ex.classList.toggle('dim', n < 1); vw.classList.toggle('dim', n < 1);
      show(ents, n >= 1);
      show(models, n >= 2);
      tr.classList.toggle('hl', n === 2);
      show(iiif, n >= 3);
      up.classList.toggle('hl', n === 3);
      show(e2e, n >= 4);
    },
  };
}
