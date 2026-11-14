const POWER = [0, 0.35, 0.68, 1];
const STREAKS = { desktop: [0, 6, 12, 22], mobile: [0, 3, 6, 9] };

export const SETTINGS = {
  swingDeg: 9,
  skewDeg: 7,
  pushPx: 26,
  letterDeg: 14,
  gustSpeed: 1,
  springK: 70,
  springC: 8,
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

function gust(t, p) {
  const n =
    (Math.sin(t * 1.1 + p) + 0.7 * Math.sin(t * 2.3 + p * 1.9) + 0.5 * Math.sin(t * 0.37 + p * 0.6)) / 2.2;
  const u = (n + 1) / 2;
  return u * u * (3 - 2 * u);
}

function spring(s, target, dt) {
  s.v += (SETTINGS.springK * (target - s.x) - SETTINGS.springC * s.v) * dt;
  s.x += s.v * dt;
}

export function splitLetters() {
  document.querySelectorAll('[data-split]').forEach((line) => {
    const text = line.textContent;
    line.textContent = '';
    line.setAttribute('aria-hidden', 'true');
    for (const ch of text) {
      const s = document.createElement('span');
      s.className = 'ch glitch';
      s.dataset.text = ch;
      s.textContent = ch;
      s.style.setProperty('--d', (-Math.random() * 3).toFixed(2) + 's');
      line.appendChild(s);
    }
  });
}

export function createWind({ layout, isMobile, reduced }) {
  const root = document.documentElement;
  const hero = document.getElementById('hero');
  const counts = isMobile ? STREAKS.mobile : STREAKS.desktop;
  const flutter = !isMobile;
  const dir = isMobile ? { x: -0.82, y: 0.57 } : { x: -1, y: 0 };
  const ang = Math.atan2(-dir.y, -dir.x);

  let power = 0;
  let target = 0;
  let level = 0;
  let wt = 0;
  let lastG = -1;
  let settled = true;

  const items = [...document.querySelectorAll('[data-wind]')].map((el) => {
    const chars = [...el.querySelectorAll('.ch')];
    return {
      el,
      phase: rand(0, 100),
      freq: rand(0.85, 1.25),
      infl: 1,
      rot: { x: 0, v: 0 },
      skew: { x: 0, v: 0 },
      push: { x: 0, v: 0 },
      letters: chars.map((c, i) => ({
        el: c,
        f: chars.length > 1 ? Math.pow(i / (chars.length - 1), 1.2) : 0,
        phase: rand(0, 100),
      })),
    };
  });

  const box = document.getElementById('streaks');
  const streaks = Array.from({ length: counts[3] }, () => {
    const el = document.createElement('i');
    box.appendChild(el);
    return { el, on: false, x: 0, x0: 0, y: 0, y0: 0, len: 0, v: 0, total: 1, ph: 0 };
  });

  function measure() {
    const hr = hero.getBoundingClientRect();
    const diag = Math.hypot(hr.width, hr.height);
    items.forEach((it) => {
      it.el.style.transform = '';
      const r = it.el.getBoundingClientRect();
      const cx = r.left - hr.left + r.width / 2;
      const cy = r.top - hr.top + r.height / 2;
      const d = Math.hypot(cx - layout.x, cy - layout.y) / diag;
      it.infl = 0.35 + 0.95 * (1 - clamp(d * 1.4, 0, 1));
    });
    settled = false;
  }

  function spawn(s) {
    s.len = rand(70, 230);
    const off = rand(-1, 1) * layout.r * 0.9;
    const ox = layout.x + dir.x * (layout.r * 0.3 + s.len) - dir.y * off;
    const oy = layout.y + dir.y * (layout.r * 0.3 + s.len) + dir.x * off;
    s.x = ox;
    s.y = oy;
    s.x0 = ox;
    s.y0 = oy;
    s.total = isMobile ? layout.h * 0.85 : ox + s.len;
    s.v = rand(0.7, 1.2) * (380 + 900 * power);
    s.ph = rand(0, 6.28);
    s.el.style.width = s.len + 'px';
    s.el.className = Math.random() < 0.28 ? 'red' : '';
    s.on = true;
  }

  function updateStreaks(dt) {
    const want = counts[level];
    let on = 0;
    for (const s of streaks) if (s.on) on++;
    for (const s of streaks) {
      if (!s.on) {
        if (on < want && Math.random() < dt * 8) {
          spawn(s);
          on++;
        }
        continue;
      }
      s.x += dir.x * s.v * dt;
      s.y += dir.y * s.v * dt;
      const prog = clamp(Math.hypot(s.x - s.x0, s.y - s.y0) / s.total, 0, 1);
      const a = Math.min(1, prog * 8) * (1 - prog) * 0.85;
      const wob = Math.sin(prog * 7 + s.ph) * 9 * power;
      s.el.style.opacity = a.toFixed(2);
      s.el.style.transform = `translate3d(${s.x.toFixed(0)}px,${(s.y + wob).toFixed(0)}px,0) rotate(${ang.toFixed(3)}rad)`;
      if (prog >= 1 || s.x < -s.len || s.y > layout.h + s.len) {
        s.on = false;
        s.el.style.opacity = '0';
      }
    }
  }

  function clearAll() {
    items.forEach((it) => {
      it.el.style.transform = '';
      it.letters.forEach((L) => (L.el.style.transform = ''));
    });
  }

  function update(dt) {
    const rate = target > power ? 1.8 : 5;
    power += (target - power) * (1 - Math.exp(-dt * rate));
    if (Math.abs(target - power) < 0.0005) power = target;

    const g = 0.15 + 0.85 * power;
    if (Math.abs(g - lastG) > 0.01) {
      root.style.setProperty('--g', g.toFixed(2));
      lastG = g;
    }

    updateStreaks(dt);
    if (settled) return;

    wt += dt * SETTINGS.gustSpeed * (0.9 + power * 1.2);
    let rest = true;

    for (const it of items) {
      const gu = gust(wt * it.freq, it.phase);
      const w = power * it.infl * (0.2 + 0.8 * gu);
      spring(it.rot, w * SETTINGS.swingDeg, dt);
      spring(it.skew, -w * SETTINGS.skewDeg, dt);
      spring(it.push, -w * SETTINGS.pushPx, dt);
      it.el.style.transform = `translate3d(${it.push.x.toFixed(1)}px,0,0) rotate(${it.rot.x.toFixed(2)}deg) skewX(${it.skew.x.toFixed(2)}deg)`;

      if (Math.abs(it.rot.x) + Math.abs(it.rot.v) + Math.abs(it.push.x) * 0.1 > 0.03) rest = false;

      if (flutter) {
        for (const L of it.letters) {
          const gl = gust(wt * 1.35 * it.freq, L.phase);
          const a = power * it.infl * L.f * (0.2 + 0.8 * gl);
          L.el.style.transform = `translate3d(${(-a * 10).toFixed(1)}px,0,0) rotate(${(a * SETTINGS.letterDeg).toFixed(2)}deg) skewX(${(-a * SETTINGS.letterDeg * 0.7).toFixed(2)}deg)`;
        }
      }
    }

    if (power === 0 && rest) {
      clearAll();
      settled = true;
    }
  }

  function setLevel(l) {
    level = l;
    target = POWER[l];
    settled = false;
  }

  const glitchEls = [...document.querySelectorAll('.ch')];
  function scheduleBurst() {
    const gap = rand(700, 1600) * (1 - 0.75 * power) + 120;
    setTimeout(() => {
      if (!document.hidden) {
        const n = 1 + Math.floor(power * 3);
        for (let i = 0; i < n; i++) {
          const el = glitchEls[Math.floor(Math.random() * glitchEls.length)];
          el.classList.add('hit');
          setTimeout(() => el.classList.remove('hit'), rand(90, 170));
        }
      }
      scheduleBurst();
    }, gap);
  }
  if (!reduced) scheduleBurst();

  return { update, setLevel, measure };
}
