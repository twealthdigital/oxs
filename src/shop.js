/* shop pagination: 3 per page on mobile, 6 per page on tablet and desktop.
   on tablet and desktop the pager only shows once there are more than 6 products */
const wrap = document.querySelector('.cards');
if (wrap) {
  const cards = [...wrap.querySelectorAll('.pcard')];
  const mq = matchMedia('(max-width: 768px)');
  const pager = document.createElement('nav');
  pager.className = 'pager';
  pager.setAttribute('aria-label', 'Shop pages');
  pager.hidden = true;
  wrap.after(pager);
  const arrow = (d) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let page = 0;

  const size = () => (mq.matches ? 3 : 6);
  const pages = () => Math.max(1, Math.ceil(cards.length / size()));

  function draw(scroll) {
    const n = pages();
    page = Math.min(page, n - 1);
    const s = size();
    cards.forEach((c, i) => {
      const on = i >= page * s && i < (page + 1) * s;
      const wasOff = c.classList.contains('is-off');
      c.classList.toggle('is-off', !on);
      if (on) {
        c.classList.add('in'); // cards that were never on screen must not stay invisible
        if (wasOff && scroll && !reduced) {
          c.classList.remove('page-in');
          void c.offsetWidth;
          c.classList.add('page-in');
        }
      }
    });
    // mobile always pages; tablet and desktop only when there are more than 6 products
    const show = n > 1 && (mq.matches || cards.length > 6);
    if (!show) {
      cards.forEach((c) => c.classList.remove('is-off'));
      pager.hidden = true;
      return;
    }
    pager.hidden = false;
    pager.innerHTML =
      `<button type="button" class="pager__b pager__arrow" data-go="${page - 1}" aria-label="Previous page"${page === 0 ? ' disabled' : ''}>${arrow('M15 5l-7 7 7 7')}</button>` +
      Array.from({ length: n }, (_, i) =>
        `<button type="button" class="pager__b${i === page ? ' is-on' : ''}" data-go="${i}" aria-label="Page ${i + 1}"${i === page ? ' aria-current="page"' : ''}>${i + 1}</button>`
      ).join('') +
      `<button type="button" class="pager__b pager__arrow" data-go="${page + 1}" aria-label="Next page"${page === n - 1 ? ' disabled' : ''}>${arrow('M9 5l7 7-7 7')}</button>`;
    if (scroll && wrap.getBoundingClientRect().top < 70) {
      wrap.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
  }

  pager.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (!b || b.disabled) return;
    page = Number(b.dataset.go);
    draw(true);
    pager.querySelector('.is-on')?.focus({ preventScroll: true });
  });
  mq.addEventListener('change', () => { page = 0; draw(false); });
  draw(false);
}
