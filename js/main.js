/* Amendola Studios — interactions.
   No dependencies. Content comes from js/content.js (window.AS_CONTENT). */
(function () {
  'use strict';

  var C = window.AS_CONTENT;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ARROW = '<svg class="arr" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var PLUS = function (size) {
    return '<svg class="plus" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg>';
  };

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (html != null) node.innerHTML = html;
    return node;
  }

  /* ---------- Language ---------- */

  var lang = (function () {
    try {
      var saved = localStorage.getItem('as-lang');
      if (saved === 'it' || saved === 'en') return saved;
    } catch (e) { /* storage unavailable */ }
    var nav = (navigator.language || 'it').toLowerCase();
    return nav.indexOf('it') === 0 ? 'it' : 'en';
  })();

  function t(key) { return C.ui[lang][key]; }
  function L(obj) { return obj[lang]; }

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t('metaTitle');
    var desc = $('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('metaDesc'));

    $$('[data-i18n]').forEach(function (node) { node.textContent = t(node.getAttribute('data-i18n')); });
    $$('[data-i18n-attr]').forEach(function (node) {
      node.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var parts = pair.split(':');
        node.setAttribute(parts[0].trim(), t(parts[1].trim()));
      });
    });
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
    $('.lang').setAttribute('data-active', lang);

    renderAppTexts();
    renderServices();
    renderSteps();
    renderLab();
    renderPhotoTexts();
    renderFacts();
    renderTimeline();
  }

  // Fade the copy out, swap the language while it is invisible, then let it settle back in.
  var swapTimer = null;
  function switchLang(next) {
    lang = next;
    try { localStorage.setItem('as-lang', lang); } catch (e) { /* ignore */ }
    var root = document.documentElement;
    $('.lang').setAttribute('data-active', lang);
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
    if (reduceMotion) { applyLang(); return; }
    clearTimeout(swapTimer);
    root.classList.add('i18n-anim');
    void root.offsetWidth; // commit the transition before fading out
    root.classList.add('i18n-out');
    swapTimer = setTimeout(function () {
      applyLang();
      void root.offsetWidth; // new text starts hidden, then fades in
      root.classList.remove('i18n-out');
      swapTimer = setTimeout(function () { root.classList.remove('i18n-anim'); }, 400);
    }, 240);
  }

  $$('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.lang === lang) return;
      switchLang(b.dataset.lang);
    });
  });

  /* ---------- Autoplay helper: pauses when tab hidden or element offscreen ---------- */

  function autoplay(target, ms, tick) {
    var visible = false, stopped = reduceMotion, timer = null;
    function sync() {
      var run = visible && !stopped && !document.hidden;
      if (run && !timer) timer = setInterval(tick, ms);
      if (!run && timer) { clearInterval(timer); timer = null; }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; sync(); }, { threshold: 0.25 }).observe(target);
    } else { visible = true; }
    document.addEventListener('visibilitychange', sync);
    sync();
    return { stop: function () { stopped = true; sync(); }, get stopped() { return stopped; } };
  }

  /* ---------- Apps showcase ---------- */

  var appList = $('#appList'), phone = $('#phone'), glowWrap = $('#stageGlow');
  var appIndex = 0;

  C.apps.forEach(function (a, i) {
    var li = el('li');
    li.innerHTML =
      '<button type="button" class="app-btn" aria-pressed="false" data-i="' + i + '">' +
        '<span class="num">' + pad(i + 1) + '</span>' +
        '<img src="assets/apps/' + a.slug + '-icon.png" alt="" width="44" height="44" loading="lazy">' +
        '<span class="meta"><span class="name">' + a.name + '</span><span class="cat i18n-dyn"></span></span>' + ARROW +
      '</button>';
    appList.appendChild(li);

    phone.appendChild(el('img', { src: 'assets/apps/' + a.slug + '-shot.jpg', alt: '', width: '600', height: '1299', loading: 'lazy', decoding: 'async' }));
    glowWrap.appendChild(el('img', { class: 'stage-glow', src: 'assets/apps/' + a.slug + '-icon.png', alt: '', 'aria-hidden': 'true' }));
  });

  function renderAppTexts() {
    $$('.app-btn', appList).forEach(function (b, i) {
      var a = C.apps[i];
      $('.cat', b).textContent = L(a.cat) + ' · ' + a.year;
    });
    $$('img', phone).forEach(function (img, i) { img.alt = t('shotOf') + C.apps[i].name; });
    $('#stageDesc').textContent = L(C.apps[appIndex].desc);
  }

  function selectApp(i) {
    appIndex = i;
    var a = C.apps[i];
    $$('.app-btn', appList).forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === i)); });
    $$('img', phone).forEach(function (img, j) {
      img.classList.toggle('on', j === i);
      img.classList.toggle('before', j < i);
    });
    $$('.stage-glow', glowWrap).forEach(function (img, j) { img.classList.toggle('on', j === i); });
    $('#stageIcon').src = 'assets/apps/' + a.slug + '-icon.png';
    $('#stageName').textContent = a.name;
    $('#stageDesc').textContent = L(a.desc);
    $('#stageLink').href = a.url;
    $('#stageCount').textContent = pad(i + 1) + ' / ' + pad(C.apps.length);
    var info = $('#stageInfo');
    info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
  }

  var appAuto = autoplay($('.stage'), 4200, function () { selectApp((appIndex + 1) % C.apps.length); });
  appList.addEventListener('click', function (e) {
    var b = e.target.closest('.app-btn');
    if (!b) return;
    appAuto.stop();
    selectApp(Number(b.dataset.i));
  });

  /* ---------- Services accordion ---------- */

  var svcOpen = 0;
  function renderServices() {
    var root = $('#services');
    root.innerHTML = '';
    C.services.forEach(function (s, i) {
      var open = i === svcOpen;
      var item = el('div', { class: 'acc-item' });
      item.innerHTML =
        '<h3 style="margin:0"><button type="button" class="acc-btn" aria-expanded="' + open + '" aria-controls="svc-' + i + '" id="svc-btn-' + i + '">' +
          '<span class="num">' + pad(i + 1) + '</span><span class="title"></span>' + PLUS(28) +
        '</button></h3>' +
        '<div class="acc-panel' + (open ? ' open' : '') + '" id="svc-' + i + '" role="region" aria-labelledby="svc-btn-' + i + '"><div>' +
          '<div class="acc-body"><p class="text"></p><p class="stack"></p></div>' +
        '</div></div>';
      $('.title', item).textContent = L(s.title);
      $('.text', item).textContent = L(s.text);
      $('.stack', item).textContent = s.stack;
      root.appendChild(item);
    });
  }
  $('#services').addEventListener('click', function (e) {
    var b = e.target.closest('.acc-btn');
    if (!b) return;
    var i = Number(b.id.replace('svc-btn-', ''));
    svcOpen = svcOpen === i ? -1 : i;
    $$('.acc-btn', this).forEach(function (btn, j) {
      var open = j === svcOpen;
      btn.setAttribute('aria-expanded', String(open));
      $('#svc-' + j).classList.toggle('open', open);
    });
  });

  /* ---------- Method loop ---------- */

  var loop = $('#loop'), step = 0;
  C.steps.forEach(function (s, i) {
    var left = (s.x / 6) + '%', top = (s.y / 3) + '%';
    var below = s.y >= 150;
    var node = el('button', { type: 'button', class: 'node', 'data-i': i, 'aria-pressed': 'false', style: 'left:' + left + ';top:' + top }, pad(i + 1));
    var label = el('span', { class: 'node-label i18n-dyn', 'aria-hidden': 'true', style: 'left:' + left + ';top:calc(' + top + (below ? ' + 32px)' : ' - 50px)') });
    loop.appendChild(node);
    loop.appendChild(label);
  });

  function renderSteps() {
    $$('.node', loop).forEach(function (n, i) { n.setAttribute('aria-label', t('phase') + ' ' + pad(i + 1) + ': ' + L(C.steps[i].title)); });
    $$('.node-label', loop).forEach(function (n, i) { n.textContent = L(C.steps[i].title); });
    selectStep(step);
  }
  function selectStep(i) {
    step = i;
    $$('.node', loop).forEach(function (n, j) { n.setAttribute('aria-pressed', String(j === i)); });
    $$('.node-label', loop).forEach(function (n, j) { n.classList.toggle('on', j === i); });
    $('#phaseLabel').textContent = t('phase') + ' ' + pad(i + 1) + ' ' + t('of') + ' ' + pad(C.steps.length);
    $('#phaseTitle').textContent = L(C.steps[i].title);
    $('#phaseText').textContent = L(C.steps[i].text);
  }
  var stepAuto = autoplay(loop, 2600, function () { selectStep((step + 1) % C.steps.length); });
  loop.addEventListener('click', function (e) {
    var n = e.target.closest('.node');
    if (!n) return;
    stepAuto.stop();
    selectStep(Number(n.dataset.i));
  });

  /* ---------- Lab rows ---------- */

  var labOpen = -1;
  function renderLab() {
    var root = $('#labRows');
    root.innerHTML = '';
    C.lab.forEach(function (r, i) {
      var open = i === labOpen;
      var li = el('li');
      li.innerHTML =
        '<button type="button" class="row-btn" aria-expanded="' + open + '" aria-controls="lab-' + i + '">' +
          '<span class="num">' + pad(i + 1) + '</span><span class="name"></span><span class="kind"></span><span class="stack"></span>' +
          '<span class="year">' + r.year + '</span>' + PLUS(20) +
        '</button>' +
        '<div class="acc-panel' + (open ? ' open' : '') + '" id="lab-' + i + '"><div><p class="row-meta"></p><p class="row-desc"></p></div></div>';
      $('.name', li).textContent = L(r.name);
      $('.kind', li).textContent = L(r.kind);
      $('.stack', li).textContent = L(r.stack);
      $('.row-desc', li).textContent = L(r.desc);
      $('.row-meta', li).textContent = L(r.stack) + ' · ' + r.year;
      root.appendChild(li);
    });
  }
  $('#labRows').addEventListener('click', function (e) {
    var b = e.target.closest('.row-btn');
    if (!b) return;
    var i = $$('.row-btn', this).indexOf(b);
    labOpen = labOpen === i ? -1 : i;
    $$('.row-btn', this).forEach(function (btn, j) {
      btn.setAttribute('aria-expanded', String(j === labOpen));
      $('#lab-' + j).classList.toggle('open', j === labOpen);
    });
  });

  /* ---------- Photo gallery ---------- */

  var slides = $('#slides'), bars = $('#bars'), photo = 0;
  C.photos.forEach(function (p, i) {
    slides.appendChild(el('img', { src: p.src, alt: '', style: 'object-position:' + p.pos, loading: i === 0 ? 'eager' : 'lazy', decoding: 'async' }));
    bars.appendChild(el('button', { type: 'button', 'data-i': i }, '<span class="track"><span class="fill"></span></span>'));
  });

  function renderPhotoTexts() {
    $$('img', slides).forEach(function (img, i) { img.alt = L(C.photos[i].alt); });
    $$('button', bars).forEach(function (b, i) { b.setAttribute('aria-label', t('photo') + ' ' + (i + 1) + ': ' + L(C.photos[i].cap)); });
    $('#photoCap').textContent = L(C.photos[photo].cap);
  }

  var photoAuto;
  function selectPhoto(i) {
    photo = (i + C.photos.length) % C.photos.length;
    $$('img', slides).forEach(function (img, j) { img.classList.toggle('on', j === photo); });
    $$('button', bars).forEach(function (b, j) {
      var fill = $('.fill', b);
      b.setAttribute('aria-current', String(j === photo));
      fill.classList.remove('run');
      fill.classList.toggle('done', j < photo || (j === photo && photoAuto && photoAuto.stopped));
      if (j === photo && photoAuto && !photoAuto.stopped) { void fill.offsetWidth; fill.classList.add('run'); }
    });
    $('#photoCap').textContent = L(C.photos[photo].cap);
  }
  photoAuto = autoplay($('#gallery'), 5000, function () { selectPhoto(photo + 1); });
  function manualPhoto(i) { photoAuto.stop(); selectPhoto(i); }
  bars.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) manualPhoto(Number(b.dataset.i)); });
  $('#photoPrev').addEventListener('click', function () { manualPhoto(photo - 1); });
  $('#photoNext').addEventListener('click', function () { manualPhoto(photo + 1); });

  // Swipe on touch screens.
  (function () {
    var x0 = null;
    var g = $('#gallery');
    g.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    g.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) manualPhoto(photo + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  })();

  /* ---------- Facts & timeline ---------- */

  function renderFacts() {
    var root = $('#facts');
    root.innerHTML = '';
    C.facts.forEach(function (f) {
      var d = el('div', { class: 'i18n-dyn' });
      d.appendChild(el('dt')).textContent = L(f.k);
      d.appendChild(el('dd')).textContent = L(f.v);
      root.appendChild(d);
    });
  }

  function renderTimeline() {
    var root = $('#timeline');
    var scroll = root.scrollLeft;
    root.innerHTML = '';
    C.timeline.forEach(function (x, i) {
      var li = el('li', { class: 'i18n-dyn' + (i === C.timeline.length - 1 ? ' last' : '') });
      li.appendChild(el('span', { class: 'year' })).textContent = x.year;
      li.appendChild(el('span', { class: 'title' })).textContent = L(x.title);
      li.appendChild(el('span', { class: 'text' })).textContent = L(x.text);
      root.appendChild(li);
    });
    root.scrollLeft = scroll;
  }

  // Drag to scroll the timeline with a mouse.
  (function () {
    var tl = $('#timeline'), down = false, startX = 0, startScroll = 0, moved = false;
    tl.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startScroll = tl.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; tl.classList.add('dragging'); }
      tl.scrollLeft = startScroll - dx;
    });
    window.addEventListener('pointerup', function () { down = false; tl.classList.remove('dragging'); });
    tl.addEventListener('click', function (e) { if (moved) e.preventDefault(); }, true);
  })();

  /* ---------- Mobile menu ---------- */

  (function () {
    var btn = $('.menu-btn'), menu = $('#menu'), closeTimer = null;
    function setOpen(open) {
      clearTimeout(closeTimer);
      btn.setAttribute('aria-expanded', String(open));
      if (open) {
        menu.hidden = false;
        void menu.offsetWidth;
        menu.classList.add('open');
      } else {
        menu.classList.remove('open');
        closeTimer = setTimeout(function () { menu.hidden = true; }, 350);
      }
    }
    btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setOpen(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (btn.getAttribute('aria-expanded') === 'true' && !e.target.closest('.site-header')) setOpen(false);
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', function (m) { if (m.matches) setOpen(false); });
  })();

  /* ---------- Contact form: opens the visitor's mail app with the message prefilled ---------- */

  (function () {
    var form = $('#contactForm'), note = $('#formNote');
    var fields = $('#formFields'), sent = $('#formSent');
    var fName = form.elements.namedItem('name'), fEmail = form.elements.namedItem('email'), fMsg = form.elements.namedItem('message');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = fName.value.trim(), email = fEmail.value.trim(), msg = fMsg.value.trim();
      [fName, fEmail, fMsg].forEach(function (f) { f.removeAttribute('aria-invalid'); });
      if (!name || !email || !msg) {
        note.textContent = t('fMissing');
        [fName, fEmail, fMsg].forEach(function (f) { if (!f.value.trim()) f.setAttribute('aria-invalid', 'true'); });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        note.textContent = t('fBadEmail');
        fEmail.setAttribute('aria-invalid', 'true');
        return;
      }
      note.textContent = '';
      var subject = t('mailSubject') + ' ' + name;
      var body = msg + '\n\n' + name + '\n' + email;
      window.location.href = 'mailto:checcofran717@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      fields.hidden = true;
      sent.hidden = false;
      sent.focus();
    });
    $('#formReset').addEventListener('click', function () {
      form.reset();
      sent.hidden = true;
      fields.hidden = false;
      fName.focus();
    });
  })();

  /* ---------- Scroll progress (nav logo) and reveal on scroll ---------- */

  (function () {
    var root = document.documentElement, ticking = false;
    function update() {
      var max = root.scrollHeight - root.clientHeight;
      root.style.setProperty('--sp', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  })();

  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.rv').forEach(function (n) { io.observe(n); });
  } else {
    $$('.rv').forEach(function (n) { n.classList.add('in'); });
  }

  /* ---------- Boot ---------- */

  applyLang();
  selectApp(0);
  selectPhoto(0);
})();
