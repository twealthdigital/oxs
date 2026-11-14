const POWER = [0, 0.35, 0.68, 1];
const STREAKS = { desktop: [0, 8, 16, 28], mobile: [0, 3, 6, 9] };

export const SETTINGS = {
  swingDeg: 5,
  skewDeg: 4,
  pushPx: 16,
  letterDeg: 9,
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
      s.className = 'ch';
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      line.appendChild(s);
    }
  });
}

/*
  The fan sits behind the hero and blows outwards.
  Desktop: the fan is centred, so content on its left is pushed left and content on its right is pushed right.
  Mobile: the fan sits top-right and everything is pushed down-left.
*/
export function createWind({ layout, isMobile, reduced, getFacing = () => 0 }) {
  const hero = document.getElementById('hero');
  const counts = isMobile ? STREAKS.mobile : STREAKS.desktop;
  const flutter = !isMobile;
  const mobileDir = { x: -0.82, y: 0.57 };

  let power = 0;
  let target = 0;
  let level = 0;
  let wt = 0;
  let settled = true;
  let facing = 0;

  const items = [...document.querySelectorAll('[data-wind]')].map((el) => {
    const chars = [...el.querySelectorAll('.ch')];
    return {
      el,
      side: -1,
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
    return { el, on: false, x: 0, x0: 0, y: 0, y0: 0, len: 0, v: 0, total: 1, ph: 0, dx: -1, dy: 0 };
  });

  function measure() {
    const hr = hero.getBoundingClientRect();
    const diag = Math.hypot(hr.width, hr.height);
    items.forEach((it) => {
      it.el.style.transform = '';
      const r = it.el.getBoundingClientRect();
      const cx = r.left - hr.left + r.width / 2;
      const cy = r.top - hr.top + r.height / 2;
      it.side = isMobile ? -1 : cx < layout.x ? -1 : 1;
      const d = Math.hypot(cx - layout.x, cy - layout.y) / diag;
      it.infl = 0.4 + 0.9 * (1 - clamp(d * 1.3, 0, 1));
    });
    settled = false;
  }

  function spawn(s) {
    s.len = rand(70, 230);
    if (isMobile) {
      s.dx = mobileDir.x;
      s.dy = mobileDir.y;
    } else {
      s.dx = Math.random() < 0.5 + 0.3 * facing ? 1 : -1;
      s.dy = 0;
    }
    const spread = Math.min(layout.r, layout.h * 0.42) * 0.95;
    const off = rand(-1, 1) * spread;
    const lead = layout.r * 0.3 + s.len;
    s.x = layout.x + s.dx * lead - s.dy * off;
    s.y = layout.y + s.dy * lead + s.dx * off;
    s.x0 = s.x;
    s.y0 = s.y;
    s.total = isMobile
      ? layout.h * 0.85
      : (s.dx < 0 ? s.x : layout.w - s.x) + s.len;
    s.v = rand(0.7, 1.2) * (380 + 900 * power) * (isMobile ? 1 : 0.85 + 0.3 * Math.max(0, facing * s.dx));
    s.ph = rand(0, 6.28);
    s.el.style.width = s.len + 'px';
    s.el.className = Math.random() < 0.3 ? 'navy' : '';
    s.el.dataset.ang = Math.atan2(-s.dy, -s.dx).toFixed(3);
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
      s.x += s.dx * s.v * dt;
      s.y += s.dy * s.v * dt;
      const prog = clamp(Math.hypot(s.x - s.x0, s.y - s.y0) / s.total, 0, 1);
      const a = Math.min(1, prog * 8) * (1 - prog) * 0.85;
      const wob = Math.sin(prog * 7 + s.ph) * 9 * power;
      s.el.style.opacity = a.toFixed(2);
      s.el.style.transform = `translate3d(${s.x.toFixed(0)}px,${(s.y + wob).toFixed(0)}px,0) rotate(${s.el.dataset.ang}rad)`;
      if (prog >= 1 || s.x < -s.len || s.x > layout.w + s.len || s.y > layout.h + s.len) {
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

    if (!isMobile) facing += (getFacing() - facing) * (1 - Math.exp(-dt * 4));
    updateStreaks(dt);
    if (settled) return;

    wt += dt * SETTINGS.gustSpeed * (0.9 + power * 1.2);
    let rest = true;

    for (const it of items) {
      const gu = gust(wt * it.freq, it.phase);
      // the side the fan is facing gets the strongest breeze; the other side still feels a gentler one
      const aim = isMobile ? 1 : 0.7 + 0.5 * clamp(facing * it.side, -1, 1);
      const w = power * it.infl * aim * (0.2 + 0.8 * gu);
      const sd = it.side;
      spring(it.rot, -sd * w * SETTINGS.swingDeg, dt);
      spring(it.skew, sd * w * SETTINGS.skewDeg, dt);
      spring(it.push, sd * w * SETTINGS.pushPx * (isMobile ? 0.4 : 1), dt);
      it.el.style.transform = `translate3d(${it.push.x.toFixed(1)}px,0,0) rotate(${it.rot.x.toFixed(2)}deg) skewX(${it.skew.x.toFixed(2)}deg)`;

      if (Math.abs(it.rot.x) + Math.abs(it.rot.v) + Math.abs(it.push.x) * 0.1 > 0.03) rest = false;

      if (flutter) {
        for (const L of it.letters) {
          const gl = gust(wt * 1.35 * it.freq, L.phase);
          const a = power * it.infl * aim * L.f * (0.2 + 0.8 * gl);
          L.el.style.transform = `translate3d(${(sd * a * 10).toFixed(1)}px,0,0) rotate(${(-sd * a * SETTINGS.letterDeg).toFixed(2)}deg) skewX(${(sd * a * SETTINGS.letterDeg * 0.7).toFixed(2)}deg)`;
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

  return { update, setLevel, measure };
}
