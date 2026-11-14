/* contact: a little fan that spins faster as you write, the form, and the FAQ */
const form = document.getElementById('cform');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (form) {
  const blades = document.getElementById('cfan-blades');
  const nameEl = form.elements.name;
  const emailEl = form.elements.email;
  const msgEl = form.elements.message;
  const send = form.querySelector('.cform__send');
  const status = form.querySelector('.cform__status');
  const errOf = (el) => form.querySelector(`.field__err[data-for="${el.id}"]`);

  // spinning fan: angle and speed ease toward a target that grows with what has been typed
  let ang = 0, spd = 20, target = 20, boost = 0, visible = false, running = false, last = 0;
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    spd += (target + boost - spd) * (1 - Math.exp(-dt * 3));
    ang = (ang + spd * dt) % 360;
    blades.setAttribute('transform', `rotate(${ang.toFixed(1)} 100 100)`);
    boost = Math.max(0, boost - dt * 900);
    if (visible) requestAnimationFrame(frame);
    else running = false;
  };
  const start = () => {
    if (reduced || running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible) start();
  }).observe(form);
  const retarget = () => {
    const n = nameEl.value.length + emailEl.value.length + msgEl.value.length;
    target = 20 + (Math.min(n, 150) / 150) * 430;
  };
  form.addEventListener('input', (e) => {
    retarget();
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
    boost = 1400;
    start();
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
      retarget();
      send.classList.remove('is-sent');
      busy = false;
    }, 3600);
  });
}

// FAQ: one answer open at a time
const items = [...document.querySelectorAll('.faq__item')];
items.forEach((it) => {
  const q = it.querySelector('.faq__q');
  q.addEventListener('click', () => {
    const open = q.getAttribute('aria-expanded') === 'true';
    items.forEach((o) => {
      o.classList.remove('is-open');
      o.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
    });
    if (!open) {
      it.classList.add('is-open');
      q.setAttribute('aria-expanded', 'true');
    }
  });
});
