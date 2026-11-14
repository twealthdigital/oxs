/* contact: the picture strip, the form and the FAQ */
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- endless picture strip ---------- */
const car = document.getElementById('car');
if (car) {
  const track = car.querySelector('.car__track');
  const cap = document.getElementById('car-cap');
  const prods = [...document.querySelectorAll('.pcard')].map((c) => ({ name: c.dataset.name, price: c.dataset.price, img: c.dataset.img }));
  const N = prods.length;
  const items = [];
  // three copies side by side so it can wrap around without a gap
  for (let c = 0; c < 3; c++) {
    prods.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'car__item';
      b.dataset.g = c * N + i;
      if (c === 1) b.setAttribute('aria-label', `Show ${p.name}`);
      else { b.setAttribute('aria-hidden', 'true'); b.tabIndex = -1; }
      const im = new Image();
      im.src = p.img;
      im.alt = '';
      im.width = 640;
      im.height = 920;
      im.draggable = false;
      im.decoding = 'async';
      im.loading = 'lazy';
      b.append(im);
      track.append(b);
      items.push(b);
    });
  }

  const SPEED = reduced ? 0 : 30; // px per second
  let iw = 190, step = 216, setW = N * step, cw = 600;
  let pos = 0, vel = 0, anim = null, dragging = false, resumeAt = 0, activeI = -1;
  let visible = false, running = false, last = 0;
  const mod = (v) => ((v % setW) + setW) % setW;

  const measure = () => {
    iw = items[0].offsetWidth;
    step = iw + (parseFloat(getComputedStyle(track).columnGap) || 0);
    setW = N * step;
    cw = car.clientWidth;
  };

  const render = () => {
    const p = mod(pos);
    track.style.transform = `translate3d(${cw / 2 - iw / 2 - setW - p}px,0,0)`;
    let best = 1e9, bi = 0;
    for (let g = 0; g < items.length; g++) {
      const d = g * step - setW - p; // distance of this picture's centre from the middle
      const ad = Math.abs(d);
      if (ad > cw) continue;
      const t = Math.max(0, 1 - ad / (step * 1.25));
      items[g].style.transform = `scale(${(0.74 + 0.3 * t).toFixed(3)})`;
      items[g].style.opacity = (0.45 + 0.55 * t).toFixed(3);
      if (ad < best) { best = ad; bi = g % N; }
    }
    if (bi !== activeI) {
      activeI = bi;
      const pr = prods[bi];
      cap.innerHTML = '';
      cap.append(pr.name);
      const sp = document.createElement('span');
      sp.textContent = `$${pr.price}`;
      cap.append(sp);
    }
  };

  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (anim) {
      const t = Math.min(1, (now - anim.t0) / anim.d);
      pos = anim.from + (anim.to - anim.from) * (1 - Math.pow(1 - t, 3));
      if (t >= 1) { anim = null; pos = mod(pos); resumeAt = now + 2400; }
    } else if (!dragging) {
      if (Math.abs(vel) > 8) {
        pos += vel * dt;
        vel *= Math.exp(-dt * 3.2);
        resumeAt = now + 1800;
      } else {
        vel = 0;
        if (now > resumeAt) pos += SPEED * dt;
      }
    }
    render();
    if (visible) requestAnimationFrame(frame);
    else running = false;
  };
  const start = () => {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); }).observe(car);
  new ResizeObserver(() => { measure(); render(); }).observe(car);
  measure();
  render();

  // drag
  let sx = 0, sp = 0, lx = 0, lt = 0, moved = false, justDragged = false;
  const onMove = (e) => {
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 5) moved = true;
    if (!moved) return;
    pos = sp - dx;
    const now = performance.now();
    const dtm = Math.max(1, now - lt);
    vel = vel * 0.6 + (-(e.clientX - lx) / dtm * 1000) * 0.4;
    lx = e.clientX;
    lt = now;
  };
  const onUp = () => {
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerup', onUp);
    removeEventListener('pointercancel', onUp);
    dragging = false;
    if (moved) { justDragged = true; setTimeout(() => (justDragged = false), 60); }
    else vel = 0;
    resumeAt = performance.now() + 1800;
  };
  car.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    moved = false;
    anim = null;
    vel = 0;
    sx = lx = e.clientX;
    sp = pos;
    lt = performance.now();
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', onUp);
    addEventListener('pointercancel', onUp);
  });
  car.addEventListener('click', (e) => {
    if (justDragged) { e.stopPropagation(); e.preventDefault(); return; }
    const b = e.target.closest('.car__item');
    if (!b) return;
    const d = Number(b.dataset.g) * step - setW - mod(pos); // how far it is from the middle
    if (Math.abs(d) < 2) return;
    pos = mod(pos);
    anim = { from: pos, to: pos + d, t0: performance.now(), d: Math.min(900, 380 + Math.abs(d) * 0.8) };
    vel = 0;
    start();
  }, true);
}

/* ---------- contact form ---------- */
const form = document.getElementById('cform');
if (form) {
  const nameEl = form.elements.name;
  const emailEl = form.elements.email;
  const msgEl = form.elements.message;
  const send = form.querySelector('.cform__send');
  const status = form.querySelector('.cform__status');
  const errOf = (el) => form.querySelector(`.field__err[data-for="${el.id}"]`);

  form.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid') === 'true') {
      e.target.removeAttribute('aria-invalid');
      errOf(e.target).textContent = '';
    }
  });

  const check = () => {
    const bad = [];
    const mark = (el, msg) => { el.setAttribute('aria-invalid', 'true'); errOf(el).textContent = msg; bad.push(el); };
    [nameEl, emailEl, msgEl].forEach((el) => { el.removeAttribute('aria-invalid'); errOf(el).textContent = ''; });
    if (nameEl.value.trim().length < 2) mark(nameEl, 'Tell us your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailEl.value.trim())) mark(emailEl, 'Enter an email we can reply to.');
    if (msgEl.value.trim().length < 10) mark(msgEl, 'Write a few words so we can help.');
    return bad;
  };

  let busy = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const bad = check();
    status.textContent = '';
    status.classList.remove('is-err');
    if (bad.length) { bad[0].focus(); return; }
    busy = true;
    send.classList.add('is-sending');
    const endpoint = form.dataset.endpoint;
    let ok = true;
    try {
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ topic: form.elements.topic.value, name: nameEl.value.trim(), email: emailEl.value.trim(), message: msgEl.value.trim() }),
        });
        ok = res.ok;
      } else {
        await new Promise((r) => setTimeout(r, 900));
      }
    } catch (err) { ok = false; }
    send.classList.remove('is-sending');
    if (!ok) {
      status.textContent = 'That did not go through. Please try again.';
      status.classList.add('is-err');
      busy = false;
      return;
    }
    send.classList.add('is-sent');
    status.textContent = `Thanks, ${nameEl.value.trim().split(' ')[0]}. Your message is on its way.`;
    setTimeout(() => {
      form.reset();
      send.classList.remove('is-sent');
      busy = false;
    }, 3600);
  });
}

/* ---------- FAQ: one answer open at a time ---------- */
const faqItems = [...document.querySelectorAll('.faq__item')];
faqItems.forEach((it) => {
  const q = it.querySelector('.faq__q');
  q.addEventListener('click', () => {
    const open = q.getAttribute('aria-expanded') === 'true';
    faqItems.forEach((o) => {
      o.classList.remove('is-open');
      o.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
    });
    if (!open) {
      it.classList.add('is-open');
      q.setAttribute('aria-expanded', 'true');
    }
  });
});

/* ---------- FAQ: a second copy of the hero fan (face only), blowing a level 1 breeze ---------- */
const ffan = document.querySelector('.faqfan');
if (ffan) {
  const wide = matchMedia('(min-width: 1280px)');
  const cv = document.createElement('canvas');
  cv.className = 'faqfan__cv';
  ffan.prepend(cv);
  let api = null, loading = false, seen = false, running = false, lastT = 0;
  const dark = () => document.documentElement.dataset.theme === 'dark';
  const loop = (now) => {
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    api.update(dt);
    if (seen && wide.matches) requestAnimationFrame(loop);
    else running = false;
  };
  const go = () => {
    if (!api || running || !seen || !wide.matches) return;
    running = true;
    lastT = performance.now();
    requestAnimationFrame(loop);
  };
  const init = async () => {
    if (api || loading || !wide.matches) return;
    loading = true;
    const m = await import('./fan.js');
    api = m.createFan({ canvas: cv, isMobile: false, reduced, face: true });
    api.setLevel(1);
    api.setTheme(dark());
    if (reduced) api.update(0);
    go();
  };
  new IntersectionObserver(([en]) => { seen = en.isIntersecting; if (seen) { init(); go(); } }, { rootMargin: '200px' }).observe(ffan);
  wide.addEventListener('change', () => { if (wide.matches) { init(); if (api) api.resize(); go(); } });
  new ResizeObserver(() => { if (api) api.resize(); }).observe(ffan);
  new MutationObserver(() => { if (api) api.setTheme(dark()); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
