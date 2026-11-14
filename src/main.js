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
