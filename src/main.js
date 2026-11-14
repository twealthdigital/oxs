import './style.css';
import { createFan } from './fan.js';
import { createWind, splitLetters } from './wind.js';

const isMobile = matchMedia('(max-width: 768px)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

splitLetters();

const fan = createFan({ canvas: document.getElementById('fan-canvas'), isMobile, reduced });
const wind = createWind({ layout: fan.layout, isMobile, reduced });
wind.measure();
document.fonts.ready.then(() => wind.measure());

// rotary knob: each press turns it a quarter clockwise: OFF -> 1 -> 2 -> 3 -> OFF
const wrap = document.getElementById('knob-wrap');
const knob = document.getElementById('knob');
const cap = document.getElementById('knob-cap');
const NAMES = ['off', 'speed 1', 'speed 2', 'speed 3'];
let turn = 0;

function applyTurn() {
  const level = turn % 4;
  cap.style.setProperty('--r', `${-135 + 90 * turn}deg`);
  wrap.dataset.level = level;
  knob.setAttribute('aria-label', `Fan speed: ${NAMES[level]}. Press to change.`);
  fan.setLevel(level);
  wind.setLevel(level);
}
knob.addEventListener('click', () => {
  turn += 1;
  applyTurn();
});
addEventListener('keydown', (e) => {
  if (!['0', '1', '2', '3'].includes(e.key)) return;
  turn += (Number(e.key) - (turn % 4) + 4) % 4;
  applyTurn();
});
applyTurn();

// nav: the active pill stretches over to the clicked item, then settles on it
const nav = document.querySelector('.nav');
const pill = nav.querySelector('.nav__pill');
const links = [...nav.querySelectorAll('a')];
const rectOf = (a) => ({ l: a.offsetLeft, w: a.offsetWidth, t: a.offsetTop, h: a.offsetHeight });
const place = (l, w, t, h) => {
  pill.style.left = l + 'px';
  pill.style.width = w + 'px';
  pill.style.top = t + 'px';
  pill.style.height = h + 'px';
};
const snap = () => {
  const r = rectOf(nav.querySelector('[aria-current]'));
  pill.classList.add('instant');
  place(r.l, r.w, r.t, r.h);
  pill.offsetWidth;
  pill.classList.remove('instant');
};
let pillTimer;
links.forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const from = nav.querySelector('[aria-current]');
    if (from === a) return;
    const o = rectOf(from);
    const n = rectOf(a);
    from.removeAttribute('aria-current');
    a.setAttribute('aria-current', 'page');
    const l = Math.min(o.l, n.l);
    const r = Math.max(o.l + o.w, n.l + n.w);
    place(l, r - l, n.t, n.h); // stretch across both
    clearTimeout(pillTimer);
    pillTimer = setTimeout(() => place(n.l, n.w, n.t, n.h), 220); // then drag to the new item
  })
);
snap();
document.fonts.ready.then(snap);
addEventListener('resize', snap);

// theme switch
const root = document.documentElement;
const themeBtn = document.getElementById('theme');
const themeMeta = document.querySelector('meta[name="theme-color"]');
function setTheme(dark, save) {
  if (dark) root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  themeBtn.setAttribute('aria-checked', String(dark));
  themeMeta.content = dark ? '#060f2b' : '#ffffff';
  fan.setTheme(dark);
  if (save) {
    try { localStorage.setItem('oxs-theme', dark ? 'dark' : 'light'); } catch (e) {}
  }
}
themeBtn.addEventListener('click', () => setTheme(root.dataset.theme !== 'dark', true));
setTheme(root.dataset.theme === 'dark', false);

// mobile bottom fade rises only as far as the CTA buttons
const cta = document.querySelector('.cta');
function setFade() {
  const r = cta.getBoundingClientRect();
  root.style.setProperty('--fade-h', Math.max(180, innerHeight - r.bottom + 8) + 'px');
}
setFade();
document.fonts.ready.then(setFade);
addEventListener('load', setFade);
addEventListener('resize', setFade);

// count-up stats
document.querySelectorAll('[data-count]').forEach((el) => {
  const to = Number(el.dataset.count);
  const dec = Number(el.dataset.dec || 0);
  if (reduced) return void (el.textContent = to.toFixed(dec));
  const t0 = performance.now() + 250;
  const run = (now) => {
    const p = Math.min(1, Math.max(0, (now - t0) / 1800));
    el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(dec);
    if (p < 1) requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
});

let timer;
addEventListener('resize', () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fan.resize();
    wind.measure();
  }, 150);
});
addEventListener('load', () => wind.measure());

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 1 / 20);
  last = now;
  fan.update(dt);
  wind.update(dt);
  requestAnimationFrame(loop);
}
if (reduced) fan.update(0);
else requestAnimationFrame(loop);

// mobile: once the page scrolls past the first screen's top, the bottom nav detaches into a floating bar
let navTimer;
function onScroll() {
  const on = scrollY > 40;
  if (on === root.classList.contains('is-scrolled')) return;
  root.classList.toggle('is-scrolled', on);
  clearTimeout(navTimer);
  navTimer = setTimeout(snap, 450);
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();
