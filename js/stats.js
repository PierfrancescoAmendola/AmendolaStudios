/* Amendola Studios — anonymous visit counter and hidden stats panel.

   Counting: every page load adds one "view"; the first load of the day on a
   browser also adds one "visitor". Only aggregate numbers are stored, through
   the free Abacus counter API (no cookies, no personal data).

   Hidden panel: click the big infinity mark in the hero 5 times quickly. */
(function () {
  'use strict';

  var API = 'https://abacus.jasoncameron.dev';
  var NS = 'amendolastudios-pfa';
  var DAYS = 30;
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  // Calendar day in Italian time, so "today" matches the owner's day.
  function dayKey(date) {
    var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    return parts.replace(/-/g, '');
  }

  function hit(key) { return fetch(API + '/hit/' + NS + '/' + key, { keepalive: true }).catch(function () {}); }
  function get(key) {
    return fetch(API + '/get/' + NS + '/' + key)
      .then(function (r) { return r.ok ? r.json() : { value: 0 }; })
      .then(function (j) { return Math.max(0, j.value || 0); })
      .catch(function () { return null; });
  }

  /* ---------- Counting ---------- */

  function track() {
    if (isLocal || store('as-nostats') === '1') return;
    var today = dayKey(new Date());
    hit('views');
    hit('v-' + today);
    if (store('as-seen') !== today) {
      store('as-seen', today);
      hit('visitors');
      hit('u-' + today);
    }
  }

  /* ---------- Panel ---------- */

  var panel;

  function fmt(n) { return n == null ? '—' : n.toLocaleString('it-IT'); }
  function fmt1(n) { return n == null ? '—' : n.toLocaleString('it-IT', { maximumFractionDigits: 1 }); }

  function build() {
    panel = document.createElement('dialog');
    panel.className = 'stats';
    panel.setAttribute('aria-labelledby', 'statsTitle');
    panel.innerHTML =
      '<div class="stats-inner">' +
        '<header class="stats-head">' +
          '<div><p class="stats-kicker">Area riservata</p><h2 id="statsTitle">Statistiche del sito</h2></div>' +
          '<button type="button" class="round stats-close" aria-label="Chiudi"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '</header>' +
        '<p class="stats-status" role="status">Carico i dati…</p>' +
        '<div class="stats-grid">' +
          '<div class="stat stat--wide"><span class="stat-label">Visitatori unici, da sempre</span><span class="stat-value" data-k="visitors">—</span><span class="stat-sub"><span data-k="views">—</span> visualizzazioni di pagina</span></div>' +
          '<div class="stat"><span class="stat-label">Oggi</span><span class="stat-value" data-k="todayU">—</span><span class="stat-sub"><span data-k="todayV">—</span> visualizzazioni</span></div>' +
          '<div class="stat"><span class="stat-label">Media al giorno</span><span class="stat-value" data-k="avgU">—</span><span class="stat-sub" data-k="spanText">visitatori</span></div>' +
          '<div class="stat"><span class="stat-label">Ultimi 7 giorni</span><span class="stat-value" data-k="weekU">—</span><span class="stat-sub"><span data-k="weekV">—</span> visualizzazioni</span></div>' +
          '<div class="stat"><span class="stat-label">Pagine per visitatore</span><span class="stat-value" data-k="ppv">—</span><span class="stat-sub">media da sempre</span></div>' +
        '</div>' +
        '<section class="stats-chart" aria-label="Visitatori negli ultimi 30 giorni">' +
          '<div class="stats-chart-head"><h3>Ultimi 30 giorni</h3><span class="legend"><i class="sw sw-u"></i>Visitatori <i class="sw sw-v"></i>Visualizzazioni</span></div>' +
          '<div class="bars" id="statsBars"></div>' +
          '<div class="bars-axis"><span data-k="from"></span><span>oggi</span></div>' +
        '</section>' +
        '<footer class="stats-foot">' +
          '<label class="switch"><input type="checkbox" id="statsMe"><span class="switch-ui" aria-hidden="true"></span><span>Non contare le mie visite su questo dispositivo</span></label>' +
          '<p>Solo conteggi anonimi e aggregati, nessun cookie. Un visitatore è un browser contato una volta al giorno.</p>' +
        '</footer>' +
      '</div>';
    document.body.appendChild(panel);

    panel.querySelector('.stats-close').addEventListener('click', close);
    panel.addEventListener('click', function (e) { if (e.target === panel) close(); });
    panel.addEventListener('cancel', function (e) { e.preventDefault(); close(); });

    var me = panel.querySelector('#statsMe');
    me.checked = store('as-nostats') === '1';
    me.addEventListener('change', function () { store('as-nostats', me.checked ? '1' : null); });
  }

  function set(k, v) { panel.querySelectorAll('[data-k="' + k + '"]').forEach(function (n) { n.textContent = v; }); }

  function load() {
    var status = panel.querySelector('.stats-status');
    status.textContent = isLocal ? 'Anteprima locale: le visite da qui non vengono contate. Carico i dati…' : 'Carico i dati…';

    var days = [];
    for (var i = DAYS - 1; i >= 0; i--) days.push(dayKey(new Date(Date.now() - i * 86400000)));

    var keys = ['views', 'visitors'];
    days.forEach(function (d) { keys.push('u-' + d, 'v-' + d); });

    // Small batches keep the free API happy.
    var out = {};
    var chain = Promise.resolve();
    for (var b = 0; b < keys.length; b += 8) {
      (function (batch) {
        chain = chain.then(function () {
          return Promise.all(batch.map(function (k) { return get(k).then(function (v) { out[k] = v; }); }));
        });
      })(keys.slice(b, b + 8));
    }

    chain.then(function () {
      if (out.views == null && out.visitors == null) {
        status.textContent = 'Impossibile raggiungere il servizio di statistiche. Riprova tra poco.';
        return;
      }
      var u = days.map(function (d) { return out['u-' + d] || 0; });
      var v = days.map(function (d) { return out['v-' + d] || 0; });
      var first = u.findIndex(function (x, i) { return x > 0 || v[i] > 0; });
      var span = first === -1 ? 1 : DAYS - first;
      var sum = function (a) { return a.reduce(function (s, x) { return s + x; }, 0); };

      set('visitors', fmt(out.visitors));
      set('views', fmt(out.views));
      set('todayU', fmt(u[DAYS - 1]));
      set('todayV', fmt(v[DAYS - 1]));
      set('avgU', fmt1(sum(u.slice(DAYS - span)) / span));
      set('spanText', span === 1 ? 'visitatori, solo oggi finora' : 'visitatori, ultimi ' + span + ' giorni');
      set('weekU', fmt(sum(u.slice(-7))));
      set('weekV', fmt(sum(v.slice(-7))));
      set('ppv', out.visitors ? fmt1(out.views / out.visitors) : '—');
      set('from', new Date(Date.now() - (DAYS - 1) * 86400000).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }));

      var max = Math.max.apply(null, v.concat(u, [1]));
      var bars = panel.querySelector('#statsBars');
      bars.innerHTML = '';
      days.forEach(function (d, i) {
        var label = new Date(Date.now() - (DAYS - 1 - i) * 86400000).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
        var col = document.createElement('div');
        col.className = 'bar';
        col.title = label + ': ' + u[i] + ' visitatori, ' + v[i] + ' visualizzazioni';
        col.innerHTML = '<span class="bar-v" style="height:' + (v[i] / max * 100) + '%"></span><span class="bar-u" style="height:' + (u[i] / max * 100) + '%;transition-delay:' + (i * 18) + 'ms"></span>';
        bars.appendChild(col);
      });
      requestAnimationFrame(function () { bars.classList.add('grown'); });
      status.textContent = 'Aggiornato alle ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + '.';
    });
  }

  function open() {
    if (!panel) build();
    if (panel.open) return;
    panel.showModal();
    document.documentElement.classList.add('stats-open');
    load();
  }
  function close() {
    panel.classList.add('closing');
    setTimeout(function () {
      panel.classList.remove('closing');
      panel.close();
      document.documentElement.classList.remove('stats-open');
      var bars = panel.querySelector('#statsBars');
      if (bars) bars.classList.remove('grown');
    }, 220);
  }

  /* ---------- Secret trigger: 5 quick clicks on the hero infinity ---------- */

  function arm() {
    var mark = document.querySelector('.hero-mark svg');
    if (!mark) return;
    var clicks = [];
    mark.addEventListener('click', function () {
      var now = Date.now();
      clicks = clicks.filter(function (t) { return now - t < 2500; });
      clicks.push(now);
      mark.classList.remove('tap'); void mark.getBoundingClientRect(); mark.classList.add('tap');
      if (clicks.length >= 5) { clicks = []; open(); }
    });
  }

  track();
  arm();
})();
