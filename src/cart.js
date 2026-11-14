// cart: header button + count dot, fly-to-cart animation, and the side drawer that comes out of the cart button
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const panel = document.getElementById('cart');
const back = document.getElementById('cart-back');
const listWrap = document.getElementById('cart-body');
const subEl = document.getElementById('cart-sub');
const nEl = document.getElementById('cart-n');
const closeBtn = document.getElementById('cart-close');
const checkout = document.getElementById('cart-checkout');
const clearBtn = document.getElementById('cart-clear');
const keepBtn = document.getElementById('cart-keep');
const heads = [...document.querySelectorAll('.cartbtn')];
const KEY = 'oxs-cart';

const money = (n) => '$' + n.toLocaleString('en-US');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IC = {
  minus: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>',
  plus: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>',
  trash: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  cart: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>',
};

// products come straight from the shop cards
const catalog = {};
document.querySelectorAll('.pcard').forEach((card) => {
  const d = card.dataset;
  catalog[d.id] = { id: d.id, name: d.name, price: Number(d.price), img: d.img };
});

let items = [];
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
  items = saved.filter((s) => catalog[s.id]).map((s) => ({ ...catalog[s.id], qty: Math.min(99, Math.max(1, s.qty | 0)) }));
} catch (e) {}
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(items.map((i) => ({ id: i.id, qty: i.qty })))); } catch (e) {}
};

// the dot counts different products, so one product added ten times is still 1
function badges() {
  const n = items.length;
  heads.forEach((h) => {
    h.classList.toggle('has-items', n > 0);
    h.querySelector('.cartbtn__dot').textContent = n;
    h.setAttribute('aria-label', n ? `Open cart, ${n} different ${n === 1 ? 'product' : 'products'}` : 'Open cart');
  });
}
function bump(dotChanged) {
  heads.forEach((h) => {
    h.classList.remove('bump', 'bump-dot');
    void h.offsetWidth;
    h.classList.add('bump');
    if (dotChanged) h.classList.add('bump-dot');
  });
}

/* ---------- drawer content ---------- */
const rowHTML = (it, fresh) => `
  <li class="citem${fresh ? ' is-new' : ''}" data-id="${esc(it.id)}">
    <span class="citem__thumb"><img src="${esc(it.img)}" alt="" onerror="this.remove()" /></span>
    <div class="citem__mid">
      <h3>${esc(it.name)}</h3>
      <span class="citem__unit">${money(it.price)} each</span>
      <div class="qty">
        <button type="button" data-act="dec" aria-label="Decrease quantity of ${esc(it.name)}">${IC.minus}</button>
        <b class="qty__n" aria-live="polite">${it.qty}</b>
        <button type="button" data-act="inc" aria-label="Increase quantity of ${esc(it.name)}">${IC.plus}</button>
      </div>
    </div>
    <div class="citem__end">
      <b class="citem__line">${money(it.price * it.qty)}</b>
      <button type="button" class="citem__rm" data-act="rm" aria-label="Remove ${esc(it.name)} from cart">${IC.trash}</button>
    </div>
  </li>`;

function totals() {
  const qty = items.reduce((a, i) => a + i.qty, 0);
  nEl.textContent = qty ? `${qty} ${qty === 1 ? 'item' : 'items'}` : '';
  subEl.textContent = money(items.reduce((a, i) => a + i.price * i.qty, 0));
}
function render(freshId) {
  panel.classList.toggle('is-empty', !items.length);
  listWrap.innerHTML = items.length
    ? `<ul class="cart__list">${items.map((i) => rowHTML(i, i.id === freshId)).join('')}</ul>`
    : `<div class="cart__empty"><span class="cart__empty-ic">${IC.cart}</span><h3>Your cart is empty</h3><p>Pick a fan from the shop and it will show up here.</p><button class="btn btn--blue" type="button" data-act="shop"><span>Browse the shop</span></button></div>`;
  totals();
}

function change(id, d) {
  const it = items.find((i) => i.id === id);
  if (!it) return;
  const q = it.qty + d;
  if (q < 1) return remove(id);
  it.qty = Math.min(99, q);
  save();
  const li = listWrap.querySelector(`.citem[data-id="${id}"]`);
  if (li) {
    li.querySelector('.qty__n').textContent = it.qty;
    li.querySelector('.citem__line').textContent = money(it.price * it.qty);
  }
  totals();
}
function remove(id) {
  const li = listWrap.querySelector(`.citem[data-id="${id}"]`);
  const done = () => {
    items = items.filter((i) => i.id !== id);
    save();
    badges();
    render();
  };
  if (!li || reduced) return done();
  li.style.height = li.offsetHeight + 'px';
  void li.offsetHeight;
  li.classList.add('is-out');
  setTimeout(done, 340);
}

listWrap.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const li = b.closest('.citem');
  const act = b.dataset.act;
  if (act === 'inc') change(li.dataset.id, 1);
  else if (act === 'dec') change(li.dataset.id, -1);
  else if (act === 'rm') remove(li.dataset.id);
  else if (act === 'shop') close(() => document.getElementById('shop').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }));
});
clearBtn.addEventListener('click', () => {
  items = [];
  save();
  badges();
  render();
});
keepBtn.addEventListener('click', () => close());
closeBtn.addEventListener('click', () => close());
back.addEventListener('click', () => close());
let coT;
checkout.addEventListener('click', () => {
  const s = checkout.querySelector('span');
  s.textContent = 'Checkout coming soon';
  clearTimeout(coT);
  coT = setTimeout(() => (s.textContent = 'Checkout'), 2200);
});

/* ---------- open / close: out of the cart button, drops, then opens ---------- */
let isOpen = false;
let origin = null;
let lastFocus = null;

// whichever header cart button is on screen right now (the normal header or the sticky one)
function pickCart() {
  return (
    heads.find((h) => {
      const r = h.getBoundingClientRect();
      return r.width && r.bottom > 8 && r.top < innerHeight - 8 && getComputedStyle(h).visibility !== 'hidden';
    }) || heads[0]
  );
}
function frames(btn) {
  const b = btn.getBoundingClientRect();
  const pw = panel.offsetWidth;
  const ph = panel.offsetHeight;
  const L = Math.max(0, b.left - (innerWidth - pw));
  const R = Math.max(0, innerWidth - b.right);
  const T = Math.max(0, b.top);
  const B = Math.max(0, ph - b.bottom);
  const r = b.height / 2;
  const rr = `round ${r}px ${r}px ${r}px ${r}px`;
  const cs = getComputedStyle(root);
  const blue = cs.getPropertyValue('--btn').trim() || '#1f5bff';
  const surface = getComputedStyle(panel).getPropertyValue('--surface').trim() || '#ffffff';
  const corner = innerWidth <= 768 ? '0px 0px 0px 0px' : '28px 0px 0px 28px';
  return [
    { clipPath: `inset(${T}px ${R}px ${B}px ${L}px ${rr})`, backgroundColor: blue, offset: 0, easing: 'cubic-bezier(.3,1.35,.5,1)' }, // the button
    { clipPath: `inset(${T}px ${R}px ${Math.max(0, B - 96)}px ${L}px ${rr})`, backgroundColor: blue, offset: 0.3, easing: 'cubic-bezier(.7,0,.2,1)' }, // dropped out
    { clipPath: `inset(0px 0px 0px 0px round ${corner})`, backgroundColor: surface, offset: 1 }, // full panel
  ];
}

function open() {
  if (isOpen) return;
  isOpen = true;
  lastFocus = document.activeElement;
  origin = pickCart();
  origin.setAttribute('aria-expanded', 'true');
  render();
  root.classList.add('cart-open');
  panel.classList.add('show');
  panel.removeAttribute('aria-hidden');
  back.classList.add('show');
  if (reduced) {
    panel.classList.add('in');
    closeBtn.focus({ preventScroll: true });
    return;
  }
  panel.animate(frames(origin), { duration: 950 });
  setTimeout(() => isOpen && panel.classList.add('in'), 420);
  setTimeout(() => isOpen && closeBtn.focus({ preventScroll: true }), 700);
}

function close(cb) {
  if (!isOpen) return cb && cb();
  isOpen = false;
  panel.classList.remove('in');
  back.classList.remove('show');
  const finish = () => {
    panel.classList.remove('show');
    panel.setAttribute('aria-hidden', 'true');
    root.classList.remove('cart-open');
    origin.setAttribute('aria-expanded', 'false');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    if (cb) cb();
  };
  if (reduced) return finish();
  const a = panel.animate(frames(origin), { duration: 720, direction: 'reverse', delay: 140, fill: 'both' });
  a.onfinish = () => {
    finish();
    a.cancel();
  };
}

heads.forEach((h) => h.addEventListener('click', open));
addEventListener('keydown', (e) => {
  if (!isOpen) return;
  if (e.key === 'Escape') return close();
  if (e.key !== 'Tab') return;
  const f = [...panel.querySelectorAll('button:not([disabled])')].filter((el) => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0];
  const last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* ---------- add to cart: the picture flies to the cart, then the cart updates ---------- */
function addItem(id) {
  const p = catalog[id];
  const it = items.find((i) => i.id === id);
  const isNew = !it;
  if (it) it.qty = Math.min(99, it.qty + 1);
  else items.push({ ...p, qty: 1 });
  save();
  badges();
  bump(isNew);
}

function fly(card, done) {
  const target = pickCart().querySelector('.cartbtn__ic').getBoundingClientRect();
  const area = card.querySelector('.pcard__img').getBoundingClientRect();
  const size = Math.max(60, Math.min(120, area.width * 0.6));
  const sx = area.left + area.width / 2 - size / 2;
  const sy = area.top + area.height / 2 - size / 2;
  const dx = target.left + target.width / 2 - size / 2 - sx;
  const dy = target.top + target.height / 2 - size / 2 - sy;
  const el = document.createElement('div');
  el.className = 'fly';
  el.style.cssText = `width:${size}px;height:${size}px;left:${sx}px;top:${sy}px`;
  const pic = card.querySelector('.pcard__img img');
  if (pic) {
    const im = new Image();
    im.src = pic.currentSrc || pic.src;
    im.alt = '';
    el.appendChild(im);
  } else el.classList.add('fly--ph');
  document.body.appendChild(el);
  const a = el.animate(
    [
      { transform: 'translate(0px,0px) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.35}px,${dy * 0.35 - 90}px) scale(.8)`, opacity: 1, offset: 0.38 },
      { transform: `translate(${dx}px,${dy}px) scale(.16)`, opacity: 0.75 },
    ],
    { duration: 800, easing: 'cubic-bezier(.45,0,.25,1)' }
  );
  a.onfinish = () => {
    el.remove();
    done();
  };
}

document.querySelectorAll('.pcard__add').forEach((b) =>
  b.addEventListener('click', () => {
    const card = b.closest('.pcard');
    b.classList.add('is-added');
    b.setAttribute('aria-label', 'Added to cart');
    clearTimeout(b._t);
    b._t = setTimeout(() => {
      b.classList.remove('is-added');
      b.setAttribute('aria-label', b.dataset.label);
    }, 1900);
    const id = card.dataset.id;
    if (reduced) addItem(id);
    else fly(card, () => addItem(id));
  })
);

badges();
render();
