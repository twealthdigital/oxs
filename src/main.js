import './style.css';
import { createFan } from './fan.js';
import { createWind, splitLetters } from './wind.js';

const isMobile = matchMedia('(max-width: 768px)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

splitLetters();

const fan = createFan({ canvas: document.getElementById('fan-canvas'), isMobile, reduced });
const wind = createWind({ layout: fan.layout, isMobile, reduced, getFacing: fan.getFacing });
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

// nav: the active pill stretches over to the clicked item, then settles on it (main header and sticky header)
const rectOf = (a) => ({ l: a.offsetLeft, w: a.offsetWidth, t: a.offsetTop, h: a.offsetHeight });
function makePill(navEl) {
  const pill = navEl.querySelector('.nav__pill');
  const items = [...navEl.querySelectorAll('a')];
  let timer;
  const place = (l, w, t, h) => {
    pill.style.left = l + 'px';
    pill.style.width = w + 'px';
    pill.style.top = t + 'px';
    pill.style.height = h + 'px';
  };
  const snap = () => {
    const cur = navEl.querySelector('[aria-current]');
    if (!cur) return;
    const r = rectOf(cur);
    pill.classList.add('instant');
    place(r.l, r.w, r.t, r.h);
    pill.offsetWidth;
    pill.classList.remove('instant');
  };
  const move = (a) => {
    const from = navEl.querySelector('[aria-current]');
    if (from === a) return;
    const o = rectOf(from);
    const n = rectOf(a);
    from.removeAttribute('aria-current');
    a.setAttribute('aria-current', 'page');
    const l = Math.min(o.l, n.l);
    const r = Math.max(o.l + o.w, n.l + n.w);
    place(l, r - l, n.t, n.h); // stretch across both
    clearTimeout(timer);
    timer = setTimeout(() => place(n.l, n.w, n.t, n.h), 220); // then drag to the new item
  };
  return { items, snap, move };
}
const mainNav = makePill(document.querySelector('.nav'));
const topNav = makePill(document.querySelector('.topnav'));
const snap = () => { mainNav.snap(); topNav.snap(); };
let spyLock = 0;

// make one nav item the current one in both headers
function activate(i) {
  mainNav.move(mainNav.items[i]);
  topNav.move(topNav.items[i]);
}

// clicking a link scrolls to its section when it has one
function go(e, index) {
  const href = e.currentTarget.getAttribute('href');
  e.preventDefault();
  spyLock = performance.now() + 1000;
  activate(index);
  const target = href && href.length > 1 ? document.querySelector(href) : null;
  if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}
mainNav.items.forEach((a, i) => a.addEventListener('click', (e) => go(e, i)));
topNav.items.forEach((a, i) => a.addEventListener('click', (e) => go(e, i)));
document.querySelectorAll('.logo').forEach((a) => a.addEventListener('click', (e) => go(e, 0)));
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

// knob and fan only matter while the hero is on screen
let heroOn = true;
const knobWrap = document.getElementById('knob-wrap');
new IntersectionObserver(
  ([en]) => {
    heroOn = en.isIntersecting;
    knobWrap.classList.toggle('is-away', en.intersectionRatio < 0.4);
  },
  { threshold: [0, 0.4, 1] }
).observe(document.getElementById('hero'));

// fade sections in as they scroll into view
const io = new IntersectionObserver(
  (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
  { threshold: 0.12 }
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 1 / 20);
  last = now;
  if (heroOn) fan.update(dt);
  wind.update(dt);
  requestAnimationFrame(loop);
}
if (reduced) fan.update(0);
else requestAnimationFrame(loop);

// mobile: once the page scrolls past the first screen's top, the bottom nav detaches into a floating bar
let navTimer;
const mainHeader = document.querySelector('.header');
const shopEl = document.getElementById('shop');
const topbar = document.getElementById('topbar');
function onScroll() {
  // the first header scrolls away with the hero; once it is out of sight the full sticky header drops down
  const stuck = scrollY > mainHeader.offsetHeight;
  if (stuck !== root.classList.contains('is-stuck')) {
    root.classList.toggle('is-stuck', stuck);
    topbar.setAttribute('aria-hidden', String(!stuck));
    if (stuck) topNav.snap();
    topbar.querySelectorAll('a').forEach((a) => (stuck ? a.removeAttribute('tabindex') : a.setAttribute('tabindex', '-1')));
  }
  // highlight the section in view
  if (performance.now() > spyLock) {
    const inShop = shopEl.getBoundingClientRect().top < innerHeight * 0.5;
    activate(inShop ? 1 : 0);
  }
  const on = scrollY > 40;
  if (on === root.classList.contains('is-scrolled')) return;
  root.classList.toggle('is-scrolled', on);
  clearTimeout(navTimer);
  navTimer = setTimeout(snap, 450);
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();
