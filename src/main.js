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

const buttons = [...document.querySelectorAll('.speed button')];
buttons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const level = Number(btn.dataset.level);
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    fan.setLevel(level);
    wind.setLevel(level);
  });
});

addEventListener('keydown', (e) => {
  if (['0', '1', '2', '3'].includes(e.key)) buttons[Number(e.key)].click();
});

let timer;
const onResize = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fan.resize();
    wind.measure();
  }, 150);
};
addEventListener('resize', onResize);
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
