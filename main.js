/* RT Properties – interactions. No dependencies. */
(function () {
  'use strict';
  const doc = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - t, 3);

  /* ---------- nav ---------- */
  const nav = document.querySelector('.nav');
  const hero = document.querySelector('.hero-wrap');
  const burger = document.querySelector('.burger');
  if (burger) burger.addEventListener('click', () => {
    document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', document.body.classList.contains('menu-open'));
  });
  document.querySelectorAll('.mobile-menu a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));

  /* ---------- hero: blur to focus, driven by scroll ---------- */
  function heroFrame() {
    const y = window.scrollY, vh = window.innerHeight;
    if (!hero) { if (nav) nav.classList.toggle('scrolled', y > 24); return; }
    const pinned = hero.offsetHeight - vh;                    // distance the hero stays pinned
    if (nav) nav.classList.toggle('scrolled', y > pinned + vh * 0.5);
    const p = reduce ? 1 : clamp(y / (pinned * 0.7), 0, 1);  // blur → focus over the first 70% of the pin
    const e = ease(p);
    doc.style.setProperty('--hero-blur', (18 * (1 - e)).toFixed(2) + 'px');
    doc.style.setProperty('--hero-bright', (0.7 + 0.3 * e).toFixed(3));
    doc.style.setProperty('--hero-scale', (1.08 - 0.08 * e).toFixed(4));
    doc.style.setProperty('--hero-title-y', (e * 80).toFixed(1) + 'px');
    doc.style.setProperty('--hero-title-o', clamp(1 - p * 1.6, 0, 1).toFixed(3));
    doc.style.setProperty('--hero-ui', clamp((p - 0.45) / 0.4, 0, 1).toFixed(3));
    // nav colour: dark while on the hero
    if (nav) nav.classList.toggle('on-dark', y < pinned + vh * 0.5);
  }

  /* ---------- parallax band + wordmark ---------- */
  const bands = [...document.querySelectorAll('.band .media')];
  const wordmark = document.querySelector('.wordmark');
  function parallaxFrame() {
    if (reduce) return;
    const vh = window.innerHeight;
    bands.forEach(m => {
      const r = m.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const t = (r.top + r.height / 2 - vh / 2) / vh;       // -1 .. 1
      m.style.transform = 'translate3d(0,' + (t * -40).toFixed(1) + 'px,0)';
    });
    if (wordmark) {
      const r = wordmark.getBoundingClientRect();
      if (r.top < vh) {
        const t = clamp((vh - r.top) / vh, 0, 1);
        wordmark.style.transform = 'translate3d(' + (-t * 6).toFixed(2) + '%,0,0)';
      }
    }
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { heroFrame(); parallaxFrame(); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  heroFrame(); parallaxFrame();

  /* ---------- sticky columns taller than the screen ---------- */
  // A sticky column that is taller than the viewport would keep its top cut off.
  // In that case it sticks by its bottom edge, so everything in it gets seen once.
  const stickies = [...document.querySelectorAll('.feature .sticky, .pbody .sticky')];
  function fitSticky() {
    const navH = nav ? nav.offsetHeight : 0, vh = window.innerHeight;
    stickies.forEach(el => {
      if (getComputedStyle(el).position !== 'sticky') { el.style.top = ''; return; }
      const h = el.offsetHeight;
      el.style.top = (h + navH + 48 > vh) ? (vh - h - 24) + 'px' : '';
    });
  }
  window.addEventListener('resize', fitSticky);
  window.addEventListener('load', fitSticky);
  fitSticky();

  /* ---------- reveals ---------- */
  // A fully clipped element counts as invisible to IntersectionObserver, so .clip elements are
  // observed through their parent and revealed when the parent enters the viewport.
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const targets = en.target._revealTargets || [en.target];
      targets.forEach(t => t.classList.add('in'));
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  document.querySelectorAll('.reveal, .line-draw').forEach(el => io.observe(el));
  document.querySelectorAll('.clip').forEach(el => {
    const host = el.parentElement;
    (host._revealTargets = host._revealTargets || []).push(el);
    io.observe(host);
  });

  /* ---------- word-by-word statement ---------- */
  document.querySelectorAll('.words').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => '<span>' + w + '</span>').join(' ');
    const spans = [...el.querySelectorAll('span')];
    const wio = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      spans.forEach((s, i) => setTimeout(() => s.classList.add('in'), reduce ? 0 : i * 45));
      wio.disconnect();
    }, { threshold: 0.4 });
    wio.observe(el);
  });

  /* ---------- counters ---------- */
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    el.textContent = reduce ? target : '0';
    const cio = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      const t0 = performance.now(), dur = 900;
      (function step(now) {
        const p = ease(clamp((now - t0) / dur, 0, 1));
        el.textContent = Math.round(target * p);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
      cio.disconnect();
    }, { threshold: 0.6 });
    cio.observe(el);
  });

  /* ---------- collection cards: click for data ---------- */
  const cards = [...document.querySelectorAll('.card[data-panel]')];
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  cards.forEach(card => {
    const ph = card.querySelector('.ph');
    const link = card.dataset.href;
    if (fine) {
      card.addEventListener('mouseenter', () => card.classList.add('open'));
      card.addEventListener('mouseleave', () => card.classList.remove('open'));
      ph.addEventListener('click', () => { if (link) location.href = link; });
    } else {
      ph.addEventListener('click', e => {
        if (!card.classList.contains('open')) {
          e.preventDefault();
          cards.forEach(c => c.classList.remove('open'));
          card.classList.add('open');
        } else if (link) location.href = link;
      });
    }
  });
  // stagger cards in
  cards.forEach((c, i) => c.classList.add('reveal', 'd' + Math.min(i % 2 + 1, 4)));
  cards.forEach(c => io.observe(c));

  /* ---------- lightbox ---------- */
  const lb = document.querySelector('.lightbox');
  if (lb) {
    const imgs = [...document.querySelectorAll('[data-lightbox]')];
    const img = lb.querySelector('img'), cap = lb.querySelector('.cap');
    let i = 0;
    const show = n => { i = (n + imgs.length) % imgs.length; img.src = imgs[i].dataset.lightbox; cap.textContent = imgs[i].dataset.caption || ''; lb.classList.add('on'); document.body.style.overflow = 'hidden'; };
    const hide = () => { lb.classList.remove('on'); document.body.style.overflow = ''; };
    imgs.forEach((el, n) => el.addEventListener('click', e => { e.preventDefault(); show(n); }));
    lb.querySelector('.x').addEventListener('click', hide);
    lb.querySelector('.pv').addEventListener('click', () => show(i - 1));
    lb.querySelector('.nx').addEventListener('click', () => show(i + 1));
    lb.addEventListener('click', e => { if (e.target === lb) hide(); });
    document.addEventListener('keydown', e => { if (!lb.classList.contains('on')) return; if (e.key === 'Escape') hide(); if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); });
  }

  /* ---------- enquiry form ---------- */
  const form = document.querySelector('form.form');
  if (form) {
    form.addEventListener('submit', async e => {
      if (form.hasAttribute('data-preview')) {               // preview builds: nothing is sent
        e.preventDefault();
        const ok = form.parentElement.querySelector('.form-ok');
        form.style.display = 'none';
        if (ok) { ok.textContent = 'Preview only: the enquiry form is not connected yet, so nothing was sent.'; ok.style.display = 'block'; }
        return;
      }
      if (!form.hasAttribute('data-netlify')) return;        // plain mailto / other handler
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() });
        if (!res.ok) throw new Error(res.status);
        form.style.display = 'none';
        const ok = form.parentElement.querySelector('.form-ok'); if (ok) ok.style.display = 'block';
      } catch (err) {
        // Netlify forms only work on the deployed site; fall back to e-mail
        const mail = form.dataset.mail || '';
        const fd = new FormData(form);
        const body = [...fd.entries()].filter(([k]) => k !== 'form-name' && k !== 'bot-field').map(([k, v]) => k + ': ' + v).join('\n');
        location.href = 'mailto:' + mail + '?subject=' + encodeURIComponent('Enquiry: ' + (fd.get('property') || 'RT Properties')) + '&body=' + encodeURIComponent(body);
        btn.disabled = false;
      }
    });
  }
  // property page CTA preselects the property in the contact form
  const params = new URLSearchParams(location.search);
  const sel = document.querySelector('select[name=property]');
  if (sel && params.get('property')) sel.value = params.get('property');
})();
