(function () {
  'use strict';
  var DATA = JSON.parse(document.getElementById('data').textContent);
  var PARTS = DATA.parts, STAGES = DATA.stages, QUIZ = DATA.quiz, USERS = DATA.users, EX = DATA.exercises || [], SK = DATA.skills || {};
  var byId = {}; PARTS.forEach(function (p, i) { p.index = i; byId[p.id] = p; });
  var qById = {}; QUIZ.forEach(function (q) { qById[q.id] = q; });
  var exById = {}; EX.forEach(function (e) { exById[e.id] = e; });
  var main = document.getElementById('main'), side = document.getElementById('side'), scrim = document.getElementById('scrim');
  var navEl = document.getElementById('nav'), searchEl = document.getElementById('search');
  var totalHours = PARTS.reduce(function (s, p) { return s + p.hours; }, 0);

  /* =============== утилиты =============== */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inline(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function $(id) { return document.getElementById(id); }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDur(ms) { ms = Math.max(0, Math.round(ms / 1000)); var h = Math.floor(ms / 3600), m = Math.floor(ms % 3600 / 60), s = ms % 60; return two(h) + ':' + two(m) + ':' + two(s); }
  function fmtShort(ms) { var m = Math.round(ms / 60000); var h = Math.floor(m / 60); return h ? h + ' ч ' + (m % 60 ? m % 60 + ' мин' : '') : m + ' мин'; }
  function fmtDate(ts) { var d = new Date(ts); return two(d.getDate()) + '-' + two(d.getMonth() + 1) + '-' + d.getFullYear() + ' ' + two(d.getHours()) + ':' + two(d.getMinutes()); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* хранилище недоступно */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ничего */ } }

  // SHA-256 для проверки входа (без внешних библиотек)
  function sha256(str) {
    var mw = Math.pow(2, 32), K = [], H = [], i, j, primes = [], cand = 2;
    while (primes.length < 64) { var ok = true; for (j = 0; j < primes.length; j++) { if (cand % primes[j] === 0) { ok = false; break; } } if (ok) primes.push(cand); cand++; }
    for (i = 0; i < 64; i++) { K[i] = (Math.pow(primes[i], 1 / 3) % 1) * mw | 0; if (i < 8) H[i] = (Math.pow(primes[i], 1 / 2) % 1) * mw | 0; }
    var bytes = [], u = unescape(encodeURIComponent(str));
    for (i = 0; i < u.length; i++) bytes.push(u.charCodeAt(i));
    var bitLen = bytes.length * 8; bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (bitLen >>> (i * 8)) & 255);
    function rr(n, x) { return (x >>> n) | (x << (32 - n)); }
    for (var off = 0; off < bytes.length; off += 64) {
      var w = [];
      for (i = 0; i < 64; i++) {
        if (i < 16) w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
        else { var s0 = rr(7, w[i - 15]) ^ rr(18, w[i - 15]) ^ (w[i - 15] >>> 3), s1 = rr(17, w[i - 2]) ^ rr(19, w[i - 2]) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      }
      var a = H.slice();
      for (i = 0; i < 64; i++) {
        var S1 = rr(6, a[4]) ^ rr(11, a[4]) ^ rr(25, a[4]), ch = (a[4] & a[5]) ^ (~a[4] & a[6]), t1 = (a[7] + S1 + ch + K[i] + w[i]) | 0;
        var S0 = rr(2, a[0]) ^ rr(13, a[0]) ^ rr(22, a[0]), mj = (a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]), t2 = (S0 + mj) | 0;
        a = [(t1 + t2) | 0, a[0], a[1], a[2], (a[3] + t1) | 0, a[4], a[5], a[6]];
      }
      for (i = 0; i < 8; i++) H[i] = (H[i] + a[i]) | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }

  /* =============== пользователь и хранилище =============== */
  var user = null; // имя пользователя
  function uk(k) { return 'fp:' + user + ':' + k; }
  function ud(k, def) { try { var v = lsGet(uk(k)); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function us(k, v) { lsSet(uk(k), JSON.stringify(v)); markDirty(); }
  function role() { return user && USERS[user] ? USERS[user].role : null; }
  function doneMap() { return ud('done', {}); }
  function percent() { var d = doneMap(); return Math.round(PARTS.filter(function (p) { return d[p.id]; }).length / PARTS.length * 100); }

  /* =============== онлайн-синхронизация (Supabase, чистый REST) =============== */
  var SB = DATA.config || {}, EMAIL_DOMAIN = '@flutter-prep.app';
  function online() { return !!(SB.url && SB.anonKey); }
  var auth = null; // { access_token, refresh_token, expires_at, id, username }
  var syncStatus = 'idle', pushTimer = null, pushing = false, lastPull = 0;
  function saveAuth() { if (auth) lsSet('fp_auth', JSON.stringify(auth)); else lsDel('fp_auth'); }
  function setStatus(st) {
    syncStatus = st;
    var el = $('syncState'); if (!el) return;
    var map = { idle: ['', ''], saving: ['Сохраняю…', 'busy'], ok: ['Сохранено в облаке', 'ok'], offline: ['Нет связи, сохранено на устройстве', 'bad'], local: ['Локальный режим', ''] };
    el.textContent = map[st][0]; el.className = 'sync ' + map[st][1];
  }
  function sbReq(method, path, body, token, extra) {
    // ключ sb_publishable_... не JWT: он идёт только в apikey, а Authorization добавляем лишь с токеном пользователя
    var headers = { apikey: SB.anonKey, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (extra) Object.keys(extra).forEach(function (k) { headers[k] = extra[k]; });
    return fetch(SB.url.replace(/\/+$/, '') + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
      return r.text().then(function (t) { var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { /* не JSON */ } if (!r.ok) { var err = new Error((j && (j.msg || j.error_description || j.message)) || ('HTTP ' + r.status)); err.status = r.status; throw err; } return j; });
    });
  }
  function applyTokens(j, username) {
    auth = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, id: j.user && j.user.id || (auth && auth.id), username: username || (auth && auth.username) };
    saveAuth();
  }
  function signIn(username, password) {
    return sbReq('POST', '/auth/v1/token?grant_type=password', { email: username + EMAIL_DOMAIN, password: password }).then(function (j) { applyTokens(j, username); });
  }
  function getToken() {
    if (!auth) return Promise.reject(new Error('no auth'));
    if (auth.expires_at - 60000 > Date.now()) return Promise.resolve(auth.access_token);
    return sbReq('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: auth.refresh_token }).then(function (j) { applyTokens(j); return auth.access_token; });
  }
  function blob() {
    var out = exportData().data, live = simState();
    out.simcur = live || null;
    return out;
  }
  function markDirty() {
    if (!online() || !auth || !user) return;
    lsSet(uk('dirty'), '1');
    clearTimeout(pushTimer); pushTimer = setTimeout(push, 1500); setStatus('saving');
  }
  function push() {
    if (!online() || !auth || pushing) { if (pushing) { clearTimeout(pushTimer); pushTimer = setTimeout(push, 1500); } return Promise.resolve(); }
    pushing = true;
    var now = new Date().toISOString();
    return getToken().then(function (t) {
      return sbReq('POST', '/rest/v1/user_data?on_conflict=user_id', { user_id: auth.id, username: user, data: blob(), updated_at: now }, t, { Prefer: 'resolution=merge-duplicates,return=minimal' });
    }).then(function () { lsSet(uk('syncedAt'), now); lsDel(uk('dirty')); setStatus('ok'); }, function (e) {
      setStatus('offline'); clearTimeout(pushTimer); pushTimer = setTimeout(push, 15000);
      if (e && e.status === 401) { /* сессия истекла: при следующем запуске потребуется вход */ }
    }).then(function () { pushing = false; });
  }
  function mergeInto(remote) {
    // у устройства есть несохранённые правки: они главнее, но симуляции объединяем, а лучший результат теста берём максимальный
    var local = blob(), out = local;
    var ids = {}; (local.sims || []).forEach(function (x) { ids[x.id] = 1; });
    (remote.sims || []).forEach(function (x) { if (!ids[x.id]) (out.sims = out.sims || []).push(x); });
    if (out.sims) out.sims.sort(function (a, b) { return a.date - b.date; });
    var ex = out.ex || {}; Object.keys(remote.ex || {}).forEach(function (k) { if (!ex[k] || (remote.ex[k].ok && !ex[k].ok)) ex[k] = remote.ex[k]; }); out.ex = ex;
    var q = out.quiz || {}; Object.keys(remote.quiz || {}).forEach(function (k) { if (!q[k] || remote.quiz[k].best > q[k].best) q[k] = remote.quiz[k]; }); out.quiz = q;
    return out;
  }
  function applyBlob(data) {
    Object.keys(data).forEach(function (k) { if (k === 'simcur') { if (data.simcur && !lsGet(uk('simcur'))) lsSet(uk('simcur'), JSON.stringify(data.simcur)); return; } lsSet(uk(k), JSON.stringify(data[k])); });
  }
  function pull() {
    if (!online() || !auth) return Promise.resolve();
    return getToken().then(function (t) { return sbReq('GET', '/rest/v1/user_data?user_id=eq.' + encodeURIComponent(auth.id) + '&select=data,updated_at', null, t); }).then(function (rows) {
      lastPull = Date.now();
      var dirty = !!lsGet(uk('dirty'));
      if (!rows || !rows.length) { return push(); }
      var r = rows[0], seen = lsGet(uk('syncedAt'));
      if (dirty) { applyBlob(mergeInto(r.data || {})); return push(); }
      if (!seen || r.updated_at > seen) applyBlob(r.data || {});
      lsSet(uk('syncedAt'), r.updated_at); setStatus('ok');
    }).catch(function (e) {
      if (e && (e.status === 400 || e.status === 401) && /refresh|token|JWT|expired/i.test(e.message || '')) { auth = null; saveAuth(); user = null; showLogin('Сессия истекла, войдите снова'); return; }
      setStatus('offline');
    });
  }
  function listStudents() {
    return getToken().then(function (t) { return sbReq('GET', '/rest/v1/user_data?select=username,data,updated_at&username=neq.' + encodeURIComponent(user) + '&order=updated_at.desc', null, t); });
  }

  /* =============== вход =============== */
  var loginEl = $('login');
  function showLogin(msg) {
    document.body.classList.add('locked');
    loginEl.hidden = false;
    loginEl.innerHTML = '<form class="login-card" id="loginForm" autocomplete="on"><div class="logo big">F</div><h1>Flutter к Профессионалам</h1><p class="muted">Войдите, чтобы сохранялся прогресс.</p>' +
      '<label for="lu">Логин</label><input id="lu" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required>' +
      '<label for="lp">Пароль</label><input id="lp" name="password" type="password" autocomplete="current-password" required>' +
      '<div class="login-err" id="lerr" role="alert">' + esc(msg || '') + '</div><button class="cta green" type="submit">Войти</button></form>';
    $('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var u = $('lu').value.trim().toLowerCase(), p = $('lp').value, rec = USERS[u], btn = loginEl.querySelector('button[type=submit]');
      if (online()) {
        if (!rec) { $('lerr').textContent = 'Неверный логин или пароль'; return; }
        btn.disabled = true; btn.textContent = 'Вхожу…';
        signIn(u, p).then(function () { startApp(u); }, function (err) {
          btn.disabled = false; btn.textContent = 'Войти';
          $('lerr').textContent = err && err.status === 400 ? 'Неверный логин или пароль' : 'Не удалось войти: проверьте интернет и попробуйте снова';
        });
        return;
      }
      if (rec && rec.hash && sha256('fp1:' + u + ':' + p) === rec.hash) { lsSet('fp_session', u); startApp(u); }
      else $('lerr').textContent = 'Неверный логин или пароль';
    });
    setTimeout(function () { var f = $('lu'); if (f) f.focus(); }, 50);
  }
  function logout() {
    var done = function () { stopTicker(); lsDel('fp_session'); auth = null; saveAuth(); user = null; showLogin(); };
    if (online() && auth && lsGet(uk('dirty'))) { push().then(done); } else done();
  }

  /* =============== боковое меню =============== */
  function renderNav(current) {
    var done = doneMap();
    var h = '<a class="nav-home" href="#home"' + (current === 'home' ? ' aria-current="page"' : '') + '>План изучения</a>';
    STAGES.forEach(function (st) {
      var items = PARTS.filter(function (p) { return p.stage === st.n; });
      if (!items.length) return;
      h += '<div class="stage-title">' + esc(st.n + '. ' + st.title) + '</div>';
      items.forEach(function (p) {
        h += '<a class="nav-item" href="#' + p.id + '"' + (current === p.id ? ' aria-current="page"' : '') + '><span class="dot' + (done[p.id] ? ' on' : '') + '"></span><span>' + esc(p.title) + '</span></a>';
      });
    });
    h += '<div class="stage-title">Инструменты</div>';
    [['simulation', 'Симуляция'], ['practice', 'Упражнения'], ['quiz', 'Тесты'], ['profile', 'Профиль и данные']].concat(role() === 'mentor' ? [['student', 'Данные студента']] : []).forEach(function (it) {
      h += '<a class="nav-item" href="#' + it[0] + '"' + (current === it[0] ? ' aria-current="page"' : '') + '><span class="dot tool"></span><span>' + it[1] + '</span></a>';
    });
    h += '<div class="side-user"><span>' + esc(USERS[user].name) + ' · ' + esc(user) + '</span><button type="button" class="linkbtn" id="logoutBtn">Выйти</button><span id="syncState" class="sync"></span></div>';
    navEl.innerHTML = h;
    $('logoutBtn').addEventListener('click', logout);
    setStatus(online() ? syncStatus : 'local');
    $('miniProgress').textContent = percent() + '%';
  }
  function openSide(v) { side.classList.toggle('open', v); scrim.classList.toggle('show', v); $('menuBtn').setAttribute('aria-expanded', String(v)); }
  $('menuBtn').addEventListener('click', function () { openSide(!side.classList.contains('open')); });
  scrim.addEventListener('click', function () { openSide(false); });
  navEl.addEventListener('click', function (e) { if (e.target.closest('a')) openSide(false); });

  /* =============== главная =============== */
  function ring(p) {
    var r = 50, c = 2 * Math.PI * r, off = c * (1 - p / 100);
    return '<div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="' + r + '" fill="none" stroke="#dcfbe8" stroke-width="12"/><circle cx="60" cy="60" r="' + r + '" fill="none" stroke="#00d95f" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><div><b>' + p + '%</b><small>готово</small></div></div>';
  }
  function daysLeft() {
    var s = (ud('settings', {}) || {}).exam; if (!s) return null;
    var d = new Date(s + 'T00:00:00'), now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((d - now) / 86400000);
  }
  function quizStats() {
    var q = ud('quiz', {}), keys = Object.keys(q), best = 0;
    keys.forEach(function (k) { best += q[k].best; });
    return { parts: keys.length, avg: keys.length ? Math.round(best / keys.length) : 0 };
  }
  function renderHome() {
    var done = doneMap(), sims = ud('sims', []), qs = quizStats(), dl = daysLeft();
    var next = PARTS.filter(function (p) { return !done[p.id]; })[0];
    var h = '<div class="hero"><div class="hero-in"><div><h1>Flutter к «Профессионалам»</h1><p>Подготовка к региональному чемпионату «Разработка мобильных приложений»: от «что такое программирование» до разбора каждого спринта.</p></div>' + ring(percent()) + '</div></div><div class="col">';
    h += '<div class="facts">' +
      '<div class="fact"><b>' + PARTS.filter(function (p) { return done[p.id]; }).length + '/' + PARTS.length + '</b><span>тем изучено</span></div>' +
      '<div class="fact"><b>' + (qs.parts ? qs.avg + '%' : '—') + '</b><span>средний результат тестов</span></div>' +
      '<div class="fact"><b>' + EX.filter(function (e) { return exDone(e.id); }).length + '/' + EX.length + '</b><span><a href="#practice">упражнений выполнено</a></span></div>' +
      '<div class="fact"><b>' + sims.length + '</b><span>симуляций пройдено</span></div>' +
      '<div class="fact"><b>' + (dl === null ? '—' : dl >= 0 ? dl : 0) + '</b><span>' + (dl === null ? '<a href="#profile">задайте дату чемпионата</a>' : 'дней до чемпионата') + '</span></div></div>';
    h += '<div class="row">' + (next ? '<a class="cta green" href="#' + next.id + '">Продолжить: ' + esc(next.title) + '</a>' : '<a class="cta green" href="#simulation">Все темы пройдены. К симуляции</a>') + '<a class="cta" href="#simulation">Симуляция</a></div>';
    h += '<h2 class="sec">План по этапам</h2><div class="road">';
    STAGES.forEach(function (st) {
      var items = PARTS.filter(function (p) { return p.stage === st.n; });
      if (!items.length) return;
      var hrs = items.reduce(function (s, p) { return s + p.hours; }, 0);
      var cnt = items.filter(function (p) { return done[p.id]; }).length;
      h += '<section class="stage"><div class="stage-head"><div class="stage-no">' + st.n + '</div><div><h3>' + esc(st.title) + '</h3><p class="goal">' + esc(st.goal) + '</p></div><span class="hrs">' + cnt + '/' + items.length + ' · ' + hrs + ' ч</span></div><ul>';
      items.forEach(function (p) {
        h += '<li><a href="#' + p.id + '"><span class="dot' + (done[p.id] ? ' on' : '') + '"></span>' + esc(p.title) + '<em>' + p.hours + ' ч</em></a></li>';
      });
      h += '</ul><div class="practice"><b>Практика</b>' + esc(st.practice) + '</div></section>';
    });
    h += '</div><h2 class="sec">Как идти по плану</h2><div class="prose"><ul><li>Читайте темы по порядку: каждая раскрывается по подтемам, а в конце есть тест и место для заметок.</li><li>Отмечайте «Тема изучена» только после теста выше 70%.</li><li>Раз в неделю проходите <a href="#simulation">симуляцию</a>, записывайте непонятное и повторяйте по списку.</li><li>Если вам удобно по два часа в день, весь план занимает около ' + Math.ceil(totalHours / 2 / 7) + ' недель.</li></ul></div></div>';
    main.innerHTML = h;
  }

  /* =============== упражнения =============== */
  function exState() { return ud('ex', {}); }
  function exDone(id) { var e = exState()[id]; return !!(e && e.ok); }
  function exMark(id, ok) {
    var m = exState(), r = m[id] || { tries: 0 };
    r.tries = (r.tries || 0) + 1; if (ok) { r.ok = true; r.at = Date.now(); }
    m[id] = r; us('ex', m);
  }
  function exOf(partId) { return EX.filter(function (e) { return e.part === partId; }); }
  function exProgress(partId) { var l = exOf(partId); return { done: l.filter(function (e) { return exDone(e.id); }).length, total: l.length }; }
  function skillProgress(partId, k) {
    var l = exOf(partId).filter(function (e) { return e.skill === k; });
    return { done: l.filter(function (e) { return exDone(e.id); }).length, total: l.length };
  }
  function norm(v) { return String(v).replace(/\s+/g, ' ').trim(); }
  var TYPE_NAMES = { fill: 'Заполните пропуски', predict: 'Что выведет код?', bug: 'Найдите ошибку', order: 'Расставьте по порядку', write: 'Напишите код' };
  function hl(code) { try { if (window.hljs && window.hljs.getLanguage && window.hljs.getLanguage('dart')) return window.hljs.highlight(code, { language: 'dart' }).value; } catch (e) { /* без подсветки */ } return esc(code); }

  function renderExercise(e, root) {
    var st = exState()[e.id] || {};
    var card = document.createElement('div'); card.className = 'ex-card' + (st.ok ? ' solved' : ''); card.dataset.id = e.id;
    var head = '<div class="ex-head"><span class="tag ex-' + e.t + '">' + TYPE_NAMES[e.t] + '</span><b class="ex-title">' + esc(e.title) + '</b><span class="ex-st" data-st>' + (st.ok ? '✓ выполнено' : (st.tries ? 'попыток: ' + st.tries : '')) + '</span></div>';
    var body = '', hintBtn = e.hint || (e.hints && e.hints.length) ? '<button type="button" class="mini" data-act="hint">Подсказка</button>' : '';
    if (e.t === 'fill') {
      var code = esc(e.code).replace(/\[\[(\d+)\]\]/g, function (_, n) {
        var longest = Math.max.apply(null, e.answers[n - 1].map(function (a) { return a.length; }));
        return '<input class="blank" data-n="' + n + '" style="width:' + (Math.max(longest, 3) + 2) + 'ch" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="Пропуск ' + n + '">';
      });
      body = '<pre class="ex-code wrap">' + code + '</pre><div class="row"><button type="button" class="cta green sm" data-act="check">Проверить</button>' + hintBtn + '<button type="button" class="mini" data-act="reveal">Показать ответ</button><button type="button" class="mini" data-act="reset">Сбросить</button></div>';
    } else if (e.t === 'predict') {
      var lines = e.answer[0].split('\n').length;
      body = '<pre class="ex-code"><code>' + hl(e.code) + '</code></pre><label class="small" for="' + e.id + '-in"><b>Что появится в консоли?</b> Каждая строка вывода на отдельной строке.</label><textarea id="' + e.id + '-in" class="ex-in" rows="' + Math.max(2, lines) + '" spellcheck="false" autocapitalize="none"></textarea><div class="row"><button type="button" class="cta green sm" data-act="check">Проверить</button>' + hintBtn + '<button type="button" class="mini" data-act="reveal">Показать ответ</button><button type="button" class="mini" data-act="reset">Сбросить</button></div>';
    } else if (e.t === 'bug') {
      var ls = e.code.split('\n');
      body = '<p class="small"><b>Нажмите на строку, в которой ошибка.</b></p><div class="bugcode">' + ls.map(function (l, i) { return '<button type="button" class="codeline" data-n="' + (i + 1) + '"><i>' + (i + 1) + '</i><span>' + esc(l || ' ') + '</span></button>'; }).join('') + '</div><div class="row">' + hintBtn + '<button type="button" class="mini" data-act="reveal">Показать ответ</button></div>';
    } else if (e.t === 'order') {
      var order = shuffle(e.lines.map(function (_, i) { return i; }));
      var tries = 0; while (order.every(function (v, i) { return v === i; }) && tries++ < 10) order = shuffle(order);
      card._order = order;
      body = '<p class="small">' + esc(e.intro || 'Расставьте строки в правильном порядке.') + '</p><ol class="ordlist" data-ord></ol><div class="row"><button type="button" class="cta green sm" data-act="check">Проверить</button>' + hintBtn + '<button type="button" class="mini" data-act="reveal">Показать ответ</button><button type="button" class="mini" data-act="reset">Сбросить</button></div>';
    } else if (e.t === 'write') {
      var drafts = ud('exd', {});
      body = '<p class="ex-prompt">' + inline(e.prompt).replace(/\n/g, '<br>') + '</p><textarea id="' + e.id + '-code" class="ex-in code" rows="' + Math.min(18, Math.max(7, e.starter.split('\n').length + 3)) + '" spellcheck="false" autocapitalize="none" autocorrect="off" aria-label="Ваш код">' + esc(drafts[e.id] != null ? drafts[e.id] : e.starter) + '</textarea>' +
        '<div class="row"><button type="button" class="cta green sm" data-act="check">Проверить по ключевым словам</button>' + hintBtn + '<button type="button" class="mini" data-act="solution">Показать решение</button><button type="button" class="mini" data-act="dartpad">Открыть DartPad</button><button type="button" class="mini" data-act="resetcode">Сбросить код</button></div>' +
        '<label class="selfok"><input type="checkbox" data-act="self"' + (st.ok ? ' checked' : '') + '> Я запустила код в DartPad (или на телефоне), и он работает</label>';
    }
    card.innerHTML = head + '<div class="ex-body">' + body + '</div><div class="ex-feed" aria-live="polite"></div>';
    root.appendChild(card);
    var feed = card.querySelector('.ex-feed'), revealed = false, hintIdx = 0;
    function setFeed(html, cls) { feed.className = 'ex-feed ' + (cls || ''); feed.innerHTML = html; }
    function finish(ok) {
      exMark(e.id, ok);
      var s2 = exState()[e.id] || {};
      card.querySelector('[data-st]').textContent = s2.ok ? '✓ выполнено' : 'попыток: ' + s2.tries;
      card.classList.toggle('solved', !!s2.ok);
      refreshPanels();
    }
    function whyHtml() { return e.why ? '<div class="why">' + inline(e.why) + '</div>' : ''; }
    function drawOrder() {
      var ol = card.querySelector('[data-ord]'); if (!ol) return;
      ol.innerHTML = card._order.map(function (idx, pos) { return '<li><code>' + esc(e.lines[idx]) + '</code><span class="ordbtns"><button type="button" class="mini" data-mv="-1" data-pos="' + pos + '" aria-label="Вверх"' + (pos === 0 ? ' disabled' : '') + '>↑</button><button type="button" class="mini" data-mv="1" data-pos="' + pos + '" aria-label="Вниз"' + (pos === card._order.length - 1 ? ' disabled' : '') + '>↓</button></span></li>'; }).join('');
    }
    if (e.t === 'order') drawOrder();
    card.addEventListener('click', function (ev) {
      var mv = ev.target.closest('[data-mv]');
      if (mv && e.t === 'order') { var pos = +mv.dataset.pos, d = +mv.dataset.mv, o = card._order, t = o[pos]; o[pos] = o[pos + d]; o[pos + d] = t; drawOrder(); return; }
      var line = ev.target.closest('.codeline');
      if (line && e.t === 'bug' && !revealed) {
        var n = +line.dataset.n, okLines = Array.isArray(e.line) ? e.line : [e.line], ok = okLines.indexOf(n) >= 0;
        card.querySelectorAll('.codeline').forEach(function (b) { b.classList.remove('bad', 'good'); });
        line.classList.add(ok ? 'good' : 'bad');
        if (ok) okLines.forEach(function (x) { var b = card.querySelector('.codeline[data-n="' + x + '"]'); if (b) b.classList.add('good'); });
        finish(ok); setFeed(ok ? '<b>Верно!</b>' + whyHtml() : '<b>Не эта строка.</b> Перечитайте код построчно и попробуйте ещё раз.', ok ? 'okf' : 'badf');
        return;
      }
      var b = ev.target.closest('[data-act]'); if (!b || b.type === 'checkbox') return;
      var act = b.dataset.act;
      if (act === 'hint') {
        if (e.t === 'write' && e.hints && e.hints.length) { var h = e.hints[Math.min(hintIdx, e.hints.length - 1)]; setFeed('<b>Подсказка ' + (Math.min(hintIdx, e.hints.length - 1) + 1) + ' из ' + e.hints.length + ':</b> ' + inline(h), 'hintf'); hintIdx++; }
        else setFeed('<b>Подсказка:</b> ' + inline(e.hint || ''), 'hintf');
      } else if (act === 'check') {
        if (e.t === 'fill') {
          if (revealed) { setFeed('Ответ уже показан. Нажмите «Сбросить» и попробуйте сами.', 'hintf'); return; }
          var all = true;
          card.querySelectorAll('.blank').forEach(function (inp) {
            var accepted = e.answers[inp.dataset.n - 1].map(norm), good = accepted.indexOf(norm(inp.value)) >= 0;
            inp.classList.toggle('ok', good); inp.classList.toggle('bad', !good); if (!good) all = false;
          });
          finish(all); setFeed(all ? '<b>Верно!</b>' + whyHtml() : '<b>Есть ошибки.</b> Красные пропуски нужно исправить. Регистр букв важен.', all ? 'okf' : 'badf');
        } else if (e.t === 'predict') {
          if (revealed) { setFeed('Ответ уже показан.', 'hintf'); return; }
          var val = card.querySelector('.ex-in').value.split('\n').map(norm).join('\n').trim();
          var good2 = e.answer.some(function (a) { return a.split('\n').map(norm).join('\n').trim() === val; });
          finish(good2); setFeed(good2 ? '<b>Верно!</b>' + whyHtml() : '<b>Не совпало.</b> Пройдите код по шагам и запишите значения. Каждый вывод print на новой строке.', good2 ? 'okf' : 'badf');
        } else if (e.t === 'order') {
          if (revealed) { setFeed('Ответ уже показан. Нажмите «Сбросить» и попробуйте сами.', 'hintf'); return; }
          var good3 = card._order.every(function (v, i) { return v === i; });
          finish(good3); setFeed(good3 ? '<b>Верно!</b>' + whyHtml() : '<b>Порядок неверный.</b> Подумайте, что должно произойти раньше.', good3 ? 'okf' : 'badf');
        } else if (e.t === 'write') {
          var code2 = card.querySelector('.ex-in').value, res = e.checks.map(function (c) { var okk = false; try { okk = new RegExp(c.re).test(code2); } catch (x) { okk = false; } return { l: c.label, ok: okk }; });
          var all2 = res.every(function (r) { return r.ok; });
          var dr = ud('exd', {}); dr[e.id] = code2; us('exd', dr);
          finish(all2);
          setFeed('<ul class="checks">' + res.map(function (r) { return '<li class="' + (r.ok ? 'y' : 'n') + '">' + (r.ok ? '✓ ' : '✗ ') + esc(r.l) + '</li>'; }).join('') + '</ul>' + (all2 ? '<b>Все проверки пройдены.</b> Теперь запустите код в DartPad, чтобы убедиться, что он работает. Эта проверка смотрит только на ключевые слова.' : '<b>Не все проверки пройдены.</b> Исправьте код и нажмите ещё раз или откройте подсказку.'), all2 ? 'okf' : 'badf');
        }
      } else if (act === 'reveal') {
        revealed = true;
        if (e.t === 'fill') { card.querySelectorAll('.blank').forEach(function (inp) { inp.value = e.answers[inp.dataset.n - 1][0]; inp.disabled = true; inp.classList.remove('bad', 'ok'); }); }
        else if (e.t === 'predict') { card.querySelector('.ex-in').value = e.answer[0]; card.querySelector('.ex-in').disabled = true; }
        else if (e.t === 'bug') { (Array.isArray(e.line) ? e.line : [e.line]).forEach(function (x) { var bb = card.querySelector('.codeline[data-n="' + x + '"]'); if (bb) bb.classList.add('good'); }); }
        else if (e.t === 'order') { card._order = e.lines.map(function (_, i) { return i; }); drawOrder(); }
        setFeed('<b>Ответ показан</b> (в выполненные не засчитывается).' + whyHtml(), 'hintf');
      } else if (act === 'reset') {
        revealed = false; setFeed('', '');
        card.querySelectorAll('.blank').forEach(function (inp) { inp.value = ''; inp.disabled = false; inp.classList.remove('ok', 'bad'); });
        if (e.t === 'predict') { var ta = card.querySelector('.ex-in'); ta.value = ''; ta.disabled = false; }
        if (e.t === 'bug') card.querySelectorAll('.codeline').forEach(function (bb) { bb.classList.remove('good', 'bad'); });
        if (e.t === 'order') { var o2 = shuffle(e.lines.map(function (_, i) { return i; })), t2 = 0; while (o2.every(function (v, i) { return v === i; }) && t2++ < 10) o2 = shuffle(o2); card._order = o2; drawOrder(); }
      } else if (act === 'solution') {
        setFeed('<b>Решение:</b><pre class="ex-code"><code>' + hl(e.solution) + '</code></pre>' + whyHtml(), 'hintf');
      } else if (act === 'resetcode') {
        card.querySelector('.ex-in').value = e.starter; var d2 = ud('exd', {}); delete d2[e.id]; us('exd', d2);
      } else if (act === 'dartpad') {
        var txt = card.querySelector('.ex-in').value;
        try { navigator.clipboard.writeText(txt).then(function () { setFeed('Код скопирован. В открывшемся DartPad вставьте его (Ctrl+V) вместо примера и нажмите Run. Для кода с виджетами Flutter выберите в DartPad режим Flutter.', 'hintf'); }, function () { setFeed('Не удалось скопировать автоматически: выделите код в поле и скопируйте вручную.', 'hintf'); }); } catch (x) { setFeed('Выделите код в поле и скопируйте вручную.', 'hintf'); }
        window.open('https://dartpad.dev/', '_blank', 'noopener');
      }
    });
    var self = card.querySelector('[data-act="self"]');
    if (self) self.addEventListener('change', function () { if (self.checked) { var m = exState(), r = m[e.id] || { tries: 0 }; r.ok = true; r.at = Date.now(); r.self = true; m[e.id] = r; us('ex', m); card.classList.add('solved'); card.querySelector('[data-st]').textContent = '✓ выполнено'; refreshPanels(); } });
    var ed = card.querySelector('textarea.ex-in.code');
    if (ed) { var tmr; ed.addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(function () { var dd = ud('exd', {}); dd[e.id] = ed.value; us('exd', dd); }, 500); }); ed.addEventListener('keydown', function (k) { if (k.key === 'Tab') { k.preventDefault(); var st0 = ed.selectionStart; ed.value = ed.value.slice(0, st0) + '  ' + ed.value.slice(ed.selectionEnd); ed.selectionStart = ed.selectionEnd = st0 + 2; } }); }
  }

  var panelRefreshers = [];
  function refreshPanels() { panelRefreshers.forEach(function (f) { f(); }); renderNavQuiet(); }
  function renderNavQuiet() { var d = $('miniProgress'); if (d) d.textContent = percent() + '%'; }

  // Панель «Практика» для темы: карта навыков и упражнения
  function mountPractice(el, partId) {
    var list = exOf(partId), skills = SK[partId] || [];
    if (!list.length) { el.innerHTML = '<p class="muted">Для этой темы упражнений пока нет.</p>'; return; }
    el.innerHTML = '<div class="skillmap" data-map></div><div data-skills></div>';
    var mapEl = el.querySelector('[data-map]'), wrap = el.querySelector('[data-skills]');
    skills.forEach(function (sk, i) {
      var k = i + 1, items = list.filter(function (e) { return e.skill === k; });
      if (!items.length) return;
      var d = document.createElement('details'); d.className = 'skill'; d.dataset.k = k;
      d.innerHTML = '<summary><span class="sk-t">' + inline(sk) + '</span><span class="sk-p" data-p></span></summary><div class="sk-body"></div>';
      var body = d.querySelector('.sk-body'); items.forEach(function (e) { renderExercise(e, body); });
      wrap.appendChild(d);
    });
    function draw() {
      var mastered = 0, total = 0, rows = '';
      skills.forEach(function (sk, i) {
        var p = skillProgress(partId, i + 1); if (!p.total) return; total++;
        var ok = p.done === p.total; if (ok) mastered++;
        rows += '<div class="sk-row' + (ok ? ' ok' : '') + '"><span class="dot' + (ok ? ' on' : '') + '"></span><span class="sk-name">' + inline(sk) + '</span><span class="sk-num">' + p.done + '/' + p.total + '</span></div>';
        var det = wrap.querySelector('details.skill[data-k="' + (i + 1) + '"] [data-p]'); if (det) det.textContent = ok ? 'Освоено ✓' : p.done + ' из ' + p.total;
      });
      mapEl.innerHTML = '<div class="sk-head"><b>Карта навыков</b><span>' + mastered + ' из ' + total + ' освоено</span></div>' + rows + '<p class="muted small">Навык считается освоенным, когда выполнены все его упражнения. Если упражнение не получается, откройте подсказку, посмотрите решение и вернитесь к нему позже.</p>';
    }
    draw(); panelRefreshers.push(draw);
    var first = wrap.querySelector('details.skill:not(.ok)'); if (first) first.open = true;
  }

  function renderPracticeHub() {
    panelRefreshers = [];
    var parts = PARTS.filter(function (p) { return exOf(p.id).length; });
    var tot = EX.length, done = EX.filter(function (e) { return exDone(e.id); }).length;
    var h = '<div class="col"><div class="crumb">Тренажёр</div><h1 class="h1s">Упражнения</h1><p class="lead">Практика на деле: пропуски в коде, «что выведет код», поиск ошибки, расстановка строк и написание своего кода. Выполнено ' + done + ' из ' + tot + '.</p>';
    h += '<div class="row"><button type="button" class="cta green" id="exRand">Случайное невыполненное</button></div><div id="exOne" style="margin-top:14px"></div>';
    h += '<h2 class="sec">По темам</h2><div class="plist">';
    parts.forEach(function (p) {
      var pr = exProgress(p.id), pc = Math.round(pr.done / pr.total * 100);
      h += '<a class="pitem" href="#practice-' + p.id + '"><span class="pt">' + esc(p.title) + '</span><span class="pm">' + pr.done + ' из ' + pr.total + '</span><span class="pbar"><i style="width:' + pc + '%"></i></span></a>';
    });
    h += '</div></div>';
    main.innerHTML = h;
    $('exRand').addEventListener('click', function () {
      var left = EX.filter(function (e) { return !exDone(e.id); }); var box = $('exOne'); box.innerHTML = '';
      if (!left.length) { box.innerHTML = '<p class="lead">Все упражнения выполнены. Отличная работа!</p>'; return; }
      var e = left[Math.floor(Math.random() * left.length)];
      box.innerHTML = '<p class="muted small">Тема: <a href="#' + e.part + '">' + esc(byId[e.part].title) + '</a></p>'; renderExercise(e, box); box.scrollIntoView({ behavior: 'smooth' });
    });
  }
  function renderPracticePart(p) {
    panelRefreshers = [];
    main.innerHTML = '<div class="col"><div class="crumb"><a href="#practice">Упражнения</a> · ' + esc(p.title) + '</div><h1 class="h1s">Практика: ' + esc(p.title) + '</h1><p class="lead">Цель: после упражнений уметь делать всё из списка навыков. <a href="#' + p.id + '">Открыть теорию</a></p><div id="pm"></div></div>';
    mountPractice($('pm'), p.id);
  }

  /* =============== тест (общий движок) =============== */
  function mountQuiz(el, ids, opts) {
    opts = opts || {};
    var st = { items: shuffle(ids), i: 0, score: 0, missed: [] };
    function record(q, ok) {
      var wrong = ud('wrong', []), idx = wrong.indexOf(q.id);
      if (ok && idx >= 0) wrong.splice(idx, 1);
      if (!ok && idx < 0) wrong.push(q.id);
      us('wrong', wrong);
    }
    function finish() {
      var total = st.items.length, pc = total ? Math.round(st.score / total * 100) : 0;
      if (opts.partId) {
        var res = ud('quiz', {}), r = res[opts.partId] || { best: 0, attempts: 0 };
        r.best = Math.max(r.best, pc); r.last = pc; r.attempts++; r.at = Date.now(); res[opts.partId] = r; us('quiz', res);
      }
      var h = '<div class="quiz-card"><div class="qnum">Результат</div><div class="score">' + st.score + ' / ' + total + '</div><p class="lead">' + (pc >= 80 ? 'Отличный результат.' : pc >= 50 ? 'Неплохо. Повторите подтемы с ошибками.' : 'Вернитесь к теории и попробуйте снова.') + '</p>';
      if (st.missed.length) {
        var seen = {}; h += '<div class="results">';
        st.missed.forEach(function (q) { if (seen[q.part]) return; seen[q.part] = 1; h += '<a href="#' + q.part + '"><b>Повторить: ' + esc(byId[q.part].title) + '</b><small>' + inline(q.q) + '</small></a>'; });
        h += '</div>';
      }
      h += '<div class="row"><button type="button" class="cta green" id="qAgain">Пройти ещё раз</button></div></div>';
      el.innerHTML = h;
      $('qAgain').addEventListener('click', function () { st = { items: shuffle(ids), i: 0, score: 0, missed: [] }; step(); });
      if (opts.onFinish) opts.onFinish(pc);
    }
    function step() {
      if (st.i >= st.items.length) return finish();
      var q = qById[st.items[st.i]], total = st.items.length;
      var order = shuffle(q.o.map(function (_, k) { return k; }));
      var h = '<div class="quiz-card"><div class="bar"><i style="width:' + (st.i / total * 100) + '%"></i></div><div class="qnum">Вопрос ' + (st.i + 1) + ' из ' + total + '</div><div class="qtext">' + inline(q.q) + '</div><div class="opts">';
      order.forEach(function (k) { h += '<button class="opt" type="button" data-k="' + k + '">' + inline(q.o[k]) + '</button>'; });
      h += '</div><div class="qfeed"></div></div>';
      el.innerHTML = h;
      var answered = false;
      el.querySelectorAll('.opt').forEach(function (b) {
        b.addEventListener('click', function () {
          if (answered) return; answered = true;
          var ok = +b.dataset.k === q.a;
          if (ok) st.score++; else st.missed.push(q);
          record(q, ok);
          el.querySelectorAll('.opt').forEach(function (x) { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add('right'); });
          if (!ok) b.classList.add('wrong');
          el.querySelector('.qfeed').innerHTML = '<div class="why"><b>' + (ok ? 'Верно. ' : 'Неверно. ') + '</b>' + inline(q.w) + '</div><div class="row"><button class="cta green" type="button" id="qNext">' + (st.i + 1 >= total ? 'Показать результат' : 'Дальше') + '</button></div>';
          $('qNext').addEventListener('click', function () { st.i++; step(); });
        });
      });
    }
    step();
  }

  /* =============== статья =============== */
  function renderPart(p) {
    var st = STAGES.filter(function (s) { return s.n === p.stage; })[0];
    var prev = PARTS[p.index - 1], next = PARTS[p.index + 1], done = doneMap(), qr = ud('quiz', {})[p.id];
    var qids = QUIZ.filter(function (q) { return q.part === p.id; }).map(function (q) { return q.id; });
    var h = '<div class="col"><article><div class="crumb">Этап ' + p.stage + ' · ' + esc(st.title) + '</div><h1>' + esc(p.title) + '</h1><p class="lead">' + esc(p.lead) + '</p><div class="meta"><span class="chip">≈ ' + p.hours + ' ч</span><span class="chip">' + p.minutes + ' мин чтения</span>' + (qr ? '<span class="chip ok">Тест: ' + qr.best + '%</span>' : '') + (exOf(p.id).length ? '<span class="chip' + (exProgress(p.id).done === exProgress(p.id).total ? ' ok' : '') + '">Упражнения: ' + exProgress(p.id).done + '/' + exProgress(p.id).total + '</span>' : '') + '</div>';
    h += '<div class="toc" id="toc"></div><div class="row tools"><button class="mini" type="button" id="expAll">Развернуть все</button><button class="mini" type="button" id="colAll">Свернуть все</button></div><div class="prose" id="prose">' + p.html + '</div>';
    if (exOf(p.id).length) h += '<section class="block" id="practiceBlock"><h2 class="blk">Практика: научитесь на деле</h2><p class="muted">Прочитать мало, нужно потренироваться. Выполните упражнения по каждому навыку: после них вы сможете всё из списка «Что нужно уметь».</p><div id="practiceMount"></div></section>';
    if (qids.length) h += '<section class="block" id="quizBlock"><h2 class="blk">Проверь себя</h2><p class="muted">' + qids.length + ' вопросов по теме. Ответы сохраняются: ошибки попадут в «Мои ошибки» в тренажёре.</p><div id="quizMount"></div></section>';
    h += '<section class="block"><h2 class="blk">Мои заметки по теме</h2><textarea id="topicNote" class="note-area" rows="4" placeholder="Что непонятно, что запомнить, примеры из своего кода…" aria-label="Заметки по теме"></textarea><div class="muted small" id="noteSaved">Сохраняется автоматически</div></section>';
    h += '<div class="done-bar"><label><input type="checkbox" id="doneBox"' + (done[p.id] ? ' checked' : '') + '> Тема изучена</label>' + (exOf(p.id).length ? '<a class="cta" href="#practiceBlock" id="toPractice">К практике</a>' : '') + (qids.length ? '<a class="cta green" href="#quizBlock" id="toQuiz">К тесту</a>' : '') + '</div>';
    h += '<nav class="pager" aria-label="Соседние темы">' + (prev ? '<a href="#' + prev.id + '"><small>Назад</small>' + esc(prev.title) + '</a>' : '<a class="empty" aria-hidden="true"></a>') + (next ? '<a href="#' + next.id + '"><small>Дальше</small>' + esc(next.title) + '</a>' : '<a href="#simulation"><small>Дальше</small>Симуляция</a>') + '</nav></article></div>';
    main.innerHTML = h;
    enhance($('prose'), p.id);
    panelRefreshers = [];
    if (exOf(p.id).length) mountPractice($('practiceMount'), p.id);
    if (qids.length) mountQuiz($('quizMount'), qids, { partId: p.id });
    var notes = ud('notes', {}), ta = $('topicNote'), timer;
    ta.value = notes[p.id] || '';
    ta.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { var n = ud('notes', {}); n[p.id] = ta.value; us('notes', n); $('noteSaved').textContent = 'Сохранено'; }, 400);
    });
    $('doneBox').addEventListener('change', function (e) { var d = doneMap(); if (e.target.checked) d[p.id] = 1; else delete d[p.id]; us('done', d); renderNav(p.id); });
    var tp = $('toPractice'); if (tp) tp.addEventListener('click', function (e) { e.preventDefault(); $('practiceBlock').scrollIntoView({ behavior: 'smooth' }); });
    var tq = $('toQuiz'); if (tq) tq.addEventListener('click', function (e) { e.preventDefault(); $('quizBlock').scrollIntoView({ behavior: 'smooth' }); });
  }
  function enhance(root, pid) {
    root.querySelectorAll('table').forEach(function (t) { var w = document.createElement('div'); w.className = 'tablewrap'; t.parentNode.insertBefore(w, t); w.appendChild(t); });
    root.querySelectorAll('pre').forEach(function (pre) {
      var code = pre.querySelector('code') || pre;
      var lang = (pre.className.match(/\b(dart|yaml|bash|xml|json)\b/) || [])[1];
      var w = document.createElement('div'); w.className = 'codewrap'; pre.parentNode.insertBefore(w, pre); w.appendChild(pre);
      if (lang) code.className = 'language-' + lang;
      if (window.hljs && lang) { try { window.hljs.highlightElement(code); } catch (e) { /* без подсветки */ } }
      var b = document.createElement('button'); b.className = 'copy'; b.type = 'button'; b.textContent = 'Копировать';
      b.addEventListener('click', function () {
        var text = code.textContent;
        function ok() { b.textContent = 'Готово'; setTimeout(function () { b.textContent = 'Копировать'; }, 1400); }
        function fallback() { var r = document.createRange(); r.selectNodeContents(code); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Выделено'; }
        try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
      });
      w.appendChild(b);
    });
    // подтемы: каждый h2 становится раскрывающимся блоком
    var kids = Array.prototype.slice.call(root.childNodes), frag = document.createDocumentFragment(), cur = null, secs = [];
    kids.forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === 'H2') {
        cur = document.createElement('details'); cur.className = 'sub';
        var sm = document.createElement('summary'); sm.appendChild(n); cur.appendChild(sm);
        var body = document.createElement('div'); body.className = 'sub-body'; cur.appendChild(body); cur._body = body;
        frag.appendChild(cur); secs.push(cur);
      } else if (cur) cur._body.appendChild(n); else frag.appendChild(n);
    });
    root.innerHTML = ''; root.appendChild(frag);
    if (secs[0]) secs[0].open = true;
    var toc = $('toc');
    if (secs.length > 2) {
      toc.innerHTML = '<b>Подтемы</b><div></div>';
      secs.forEach(function (d) {
        var bt = document.createElement('button'); bt.type = 'button'; bt.textContent = d.querySelector('h2').textContent;
        bt.addEventListener('click', function () { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        toc.lastChild.appendChild(bt);
      });
    } else toc.remove();
    $('expAll').addEventListener('click', function () { secs.forEach(function (d) { d.open = true; }); });
    $('colAll').addEventListener('click', function () { secs.forEach(function (d) { d.open = false; }); });
    // чек-листы
    var boxes = root.querySelectorAll('input[type="checkbox"]'), key = 'chk_' + pid, saved = ud(key, []);
    boxes.forEach(function (bx, i) {
      bx.disabled = false; bx.checked = saved.indexOf(i) >= 0;
      bx.addEventListener('change', function () { var arr = []; boxes.forEach(function (x, j) { if (x.checked) arr.push(j); }); us(key, arr); });
    });
  }

  /* =============== тренажёр =============== */
  function renderQuizHub() {
    var wrong = ud('wrong', []).filter(function (id) { return qById[id]; }), res = ud('quiz', {});
    var h = '<div class="col"><div class="crumb">Тренажёр</div><h1 class="h1s">Тесты</h1><p class="lead">Всего вопросов: ' + QUIZ.length + '. Тест по каждой теме лежит в конце самой темы, а здесь можно потренироваться вперемешку и разобрать ошибки. Практику с кодом ищите в разделе <a href="#practice">Упражнения</a>.</p>';
    h += '<div class="modes"><button class="mode" type="button" data-m="rand"><b>10 случайных</b><span>со всех тем</span></button><button class="mode" type="button" data-m="wrong"' + (wrong.length ? '' : ' disabled') + '><b>Мои ошибки</b><span>' + wrong.length + ' вопросов к повторению</span></button>';
    STAGES.forEach(function (s) { if (QUIZ.some(function (q) { return byId[q.part].stage === s.n; })) h += '<button class="mode" type="button" data-m="st' + s.n + '"><b>Этап ' + s.n + '</b><span>' + esc(s.title) + '</span></button>'; });
    h += '</div><div id="hubMount" style="margin-top:16px"></div>';
    h += '<h2 class="sec">Результаты по темам</h2><div class="tablewrap"><table class="plain"><thead><tr><th>Тема</th><th>Лучший</th><th>Попыток</th></tr></thead><tbody>';
    PARTS.forEach(function (p) { var r = res[p.id]; if (QUIZ.some(function (q) { return q.part === p.id; })) h += '<tr><td><a href="#' + p.id + '">' + esc(p.title) + '</a></td><td>' + (r ? r.best + '%' : '—') + '</td><td>' + (r ? r.attempts : 0) + '</td></tr>'; });
    h += '</tbody></table></div></div>';
    main.innerHTML = h;
    main.querySelectorAll('.mode').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = b.dataset.m, ids;
        if (m === 'rand') ids = shuffle(QUIZ).slice(0, 10).map(function (q) { return q.id; });
        else if (m === 'wrong') ids = shuffle(wrong).slice(0, 15);
        else { var n = +m.slice(2); ids = shuffle(QUIZ.filter(function (q) { return byId[q.part].stage === n; })).slice(0, 12).map(function (q) { return q.id; }); }
        mountQuiz($('hubMount'), ids, {}); $('hubMount').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /* =============== симуляция =============== */
  var ticker = null, wakeLock = null;
  function simState() { return ud('simcur', null); }
  function simSave(s) { if (s) us('simcur', s); else lsDel(uk('simcur')); }
  function remaining(s) { return s.status === 'running' ? s.endAt - Date.now() : s.remaining; }
  function elapsed(s) { return s.planned - Math.max(0, remaining(s)); }
  function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null; } releaseWake(); document.title = baseTitle; $('miniTimer').hidden = true; }
  var baseTitle = document.title;
  function requestWake() { try { if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; l.addEventListener('release', function () { wakeLock = null; }); }, function () { /* отказ — не страшно */ }); } catch (e) { /* ничего */ } }
  function releaseWake() { try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) { /* ничего */ } }
  function beep() {
    try {
      var C = window.AudioContext || window.webkitAudioContext, ctx = new C();
      [0, 0.35, 0.7].forEach(function (d) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.2; o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.2); });
    } catch (e) { /* звук недоступен */ }
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* ничего */ }
  }
  function tick() {
    var s = simState();
    if (!s || s.status !== 'running') { if (!s || s.status !== 'running') { /* ничего */ } }
    if (!s) { stopTicker(); return; }
    var rem = remaining(s), disp = $('simDisplay');
    if (s.status === 'running') {
      document.title = fmtDur(rem) + ' · симуляция';
      var mt = $('miniTimer'); mt.hidden = false; mt.textContent = fmtDur(rem);
      if (rem <= 0) { s.status = 'finished'; s.remaining = 0; s.finishedAt = Date.now(); simSave(s); beep(); stopTicker(); if (location.hash === '#simulation') renderSim(); else { $('miniTimer').hidden = true; } return; }
    }
    if (disp) { disp.textContent = fmtDur(rem); var bar = $('simBar'); if (bar) bar.style.width = Math.min(100, Math.max(0, elapsed(s) / s.planned * 100)) + '%'; var el = $('simElapsed'); if (el) el.textContent = fmtDur(elapsed(s)); }
  }
  function ensureTicker() {
    var s = simState();
    if (s && s.status === 'running') { if (!ticker) ticker = setInterval(tick, 250); requestWake(); tick(); }
    else { if (ticker) { clearInterval(ticker); ticker = null; } releaseWake(); document.title = baseTitle; $('miniTimer').hidden = true; }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && user) { ensureTicker(); } });

  var NOTE_TYPES = { unclear: 'Не поняла', forgot: 'Забыла', error: 'Ошибка', idea: 'Идея' };
  function simNum() { return ud('sims', []).length + 1; }

  function renderSim() {
    var s = simState(), h = '<div class="col"><div class="crumb">Инструменты</div><h1 class="h1s">Симуляция</h1>';
    if (!s) {
      h += '<p class="lead">Запустите таймер на нужное время, во время работы записывайте, что непонятно или что забыли. В конце симуляция сохранится в историю с датой, заметками и оценкой.</p>';
      h += '<section class="block"><h2 class="blk">Настройка таймера</h2><div class="presets" id="presets">' +
        [['Спринт 1', 90], ['Спринт 2', 70], ['Спринты 3–5', 60], ['Спринт 6', 180], ['20 мин', 20]].map(function (p) { return '<button type="button" class="chipbtn" data-min="' + p[1] + '">' + p[0] + ' · ' + fmtShort(p[1] * 60000) + '</button>'; }).join('') + '</div>' +
        '<div class="timeform"><div><label for="sH">Часы</label><input id="sH" type="number" min="0" max="18" value="1" inputmode="numeric"></div><div><label for="sM">Минуты</label><input id="sM" type="number" min="0" max="59" value="30" inputmode="numeric"></div></div>' +
        '<label for="sT">Название (необязательно)</label><input id="sT" type="text" maxlength="60" placeholder="Например: Спринт 1, UIKit">' +
        '<div class="row"><button class="cta green" type="button" id="simStart">Запустить симуляцию</button></div></section>';
    } else {
      var rem = remaining(s), status = s.status;
      h += '<p class="lead">' + esc(s.title || 'Симуляция ' + simNum()) + ' · начата ' + fmtDate(s.startedAt) + '</p>';
      h += '<section class="block timer-block ' + status + '"><div class="sim-display" id="simDisplay" aria-live="off">' + fmtDur(rem) + '</div><div class="muted center">осталось · прошло <span id="simElapsed">' + fmtDur(elapsed(s)) + '</span> из ' + fmtShort(s.planned) + '</div><div class="bar big"><i id="simBar" style="width:' + Math.min(100, elapsed(s) / s.planned * 100) + '%"></i></div>';
      if (status !== 'finished') {
        h += '<div class="row center"><button class="cta green" type="button" id="simPause">' + (status === 'running' ? 'Пауза' : 'Продолжить') + '</button><button class="cta" type="button" id="sim5p">+5 мин</button><button class="cta" type="button" id="sim5m">−5 мин</button></div><div class="row center"><button class="cta ghost" type="button" id="simFinish">Завершить досрочно</button><button class="cta ghost" type="button" id="simReset">Сбросить</button></div><div class="confirm" id="simConfirm" hidden></div>';
      } else h += '<p class="center"><b>Время вышло.</b> Заполните оценку и сохраните симуляцию.</p>';
      h += '</section>';
      h += '<section class="block"><h2 class="blk">Заметки во время симуляции</h2><div class="noteform"><div class="timeform"><div><label for="nType">Тип</label><select id="nType">' + Object.keys(NOTE_TYPES).map(function (k) { return '<option value="' + k + '">' + NOTE_TYPES[k] + '</option>'; }).join('') + '</select></div><div><label for="nTopic">Тема (необязательно)</label><select id="nTopic"><option value="">—</option>' + PARTS.map(function (p) { return '<option value="' + p.id + '">' + esc(p.title) + '</option>'; }).join('') + '</select></div></div><label for="nText">Что непонятно или что забыла</label><textarea id="nText" rows="3" placeholder="Например: не помню, как получить хэш коммита"></textarea><div class="row"><button class="cta green" type="button" id="nAdd">Добавить заметку</button></div></div><div id="noteList"></div></section>';
      if (status === 'finished') h += saveFormHtml(s);
    }
    h += '<h2 class="sec">История симуляций</h2><div id="simHistory"></div></div>';
    main.innerHTML = h;
    bindSim(s);
    renderHistory();
    if (s) renderNotes(s);
    ensureTicker();
  }
  function saveFormHtml(s) {
    return '<section class="block save-block" id="saveBlock"><h2 class="blk">Сохранить симуляцию</h2><label for="svName">Название</label><input id="svName" value="' + esc(s.title || 'Симуляция ' + simNum()) + '" maxlength="60"><div class="timeform"><div><label for="svScore">Набрано баллов</label><input id="svScore" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0"></div><div><label for="svMax">Из</label><input id="svMax" type="number" min="1" step="0.01" value="100" inputmode="decimal"></div></div><label>Моя оценка</label><div class="stars" id="svStars" role="radiogroup" aria-label="Оценка от 1 до 5">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" class="star" data-n="' + n + '" role="radio" aria-checked="false" aria-label="' + n + '">★</button>'; }).join('') + '</div><label for="svComment">Выводы: что получилось, что улучшить</label><textarea id="svComment" rows="3"></textarea><div class="row"><button class="cta green" type="button" id="svSave">Сохранить в историю</button></div></section>';
  }
  function bindSim(s) {
    if (!s) {
      var presets = $('presets');
      presets.addEventListener('click', function (e) { var b = e.target.closest('[data-min]'); if (!b) return; var m = +b.dataset.min; $('sH').value = Math.floor(m / 60); $('sM').value = m % 60; if (!$('sT').value) $('sT').value = b.textContent.split(' · ')[0]; });
      $('simStart').addEventListener('click', function () {
        var ms = ((+$('sH').value || 0) * 60 + (+$('sM').value || 0)) * 60000;
        if (ms <= 0) { $('sM').focus(); return; }
        var now = Date.now();
        simSave({ status: 'running', title: $('sT').value.trim(), planned: ms, startedAt: now, endAt: now + ms, notes: [] });
        renderSim();
      });
      return;
    }
    var pb = $('simPause');
    if (pb) {
      pb.addEventListener('click', function () { var c = simState(); if (c.status === 'running') { c.remaining = c.endAt - Date.now(); c.status = 'paused'; } else { c.endAt = Date.now() + c.remaining; c.status = 'running'; } simSave(c); renderSim(); });
      $('sim5p').addEventListener('click', function () { var c = simState(); c.planned += 300000; if (c.status === 'running') c.endAt += 300000; else c.remaining += 300000; simSave(c); tick(); });
      $('sim5m').addEventListener('click', function () { var c = simState(), r = remaining(c); if (r <= 300000) return; c.planned -= 300000; if (c.status === 'running') c.endAt -= 300000; else c.remaining -= 300000; simSave(c); tick(); });
      $('simFinish').addEventListener('click', function () { askConfirm('Завершить симуляцию досрочно и перейти к оценке?', function () { var c = simState(); c.remaining = Math.max(0, remaining(c)); c.status = 'finished'; c.finishedAt = Date.now(); simSave(c); stopTicker(); renderSim(); }); });
      $('simReset').addEventListener('click', function () { askConfirm('Сбросить симуляцию без сохранения? Заметки будут потеряны.', function () { simSave(null); stopTicker(); renderSim(); }); });
    }
    $('nAdd').addEventListener('click', addNote);
    $('nText').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote(); });
    function addNote() {
      var t = $('nText').value.trim(); if (!t) { $('nText').focus(); return; }
      var c = simState(); c.notes.push({ id: Date.now() + '-' + c.notes.length, at: elapsed(c), type: $('nType').value, topic: $('nTopic').value, text: t, resolved: false });
      simSave(c); $('nText').value = ''; renderNotes(c); $('nText').focus();
    }
    if (s.status === 'finished') {
      var rating = 0;
      $('svStars').addEventListener('click', function (e) {
        var b = e.target.closest('.star'); if (!b) return; rating = +b.dataset.n;
        $('svStars').querySelectorAll('.star').forEach(function (x) { var on = +x.dataset.n <= rating; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(+x.dataset.n === rating)); });
      });
      $('svSave').addEventListener('click', function () {
        var c = simState(), sims = ud('sims', []);
        var score = $('svScore').value === '' ? null : +$('svScore').value, max = +$('svMax').value || 100;
        sims.push({ id: String(Date.now()), n: sims.length + 1, name: $('svName').value.trim() || 'Симуляция ' + (sims.length + 1), date: c.startedAt, planned: c.planned, spent: elapsed(c), score: score, max: max, rating: rating, comment: $('svComment').value.trim(), notes: c.notes });
        us('sims', sims); simSave(null); stopTicker(); renderSim();
      });
    }
  }
  function askConfirm(text, yes) {
    var box = $('simConfirm'); box.hidden = false;
    box.innerHTML = '<span>' + esc(text) + '</span><button type="button" class="cta" id="cfYes">Да</button><button type="button" class="cta ghost" id="cfNo">Нет</button>';
    $('cfYes').addEventListener('click', yes); $('cfNo').addEventListener('click', function () { box.hidden = true; });
  }
  function noteHtml(n, del) {
    var tp = n.topic && byId[n.topic] ? ' · <a href="#' + n.topic + '">' + esc(byId[n.topic].title) + '</a>' : '';
    return '<li class="note ' + n.type + '"><div class="note-h"><span class="tag ' + n.type + '">' + NOTE_TYPES[n.type] + '</span><span class="muted small">' + fmtDur(n.at).slice(0, 5) + tp + '</span>' + (del ? '<button type="button" class="linkbtn" data-del="' + esc(n.id) + '">Удалить</button>' : '') + '</div><div>' + esc(n.text).replace(/\n/g, '<br>') + '</div></li>';
  }
  function renderNotes(s) {
    var el = $('noteList'); if (!el) return;
    el.innerHTML = s.notes.length ? '<ul class="notes">' + s.notes.slice().reverse().map(function (n) { return noteHtml(n, true); }).join('') + '</ul>' : '<p class="muted">Заметок пока нет.</p>';
    el.onclick = function (e) { var b = e.target.closest('[data-del]'); if (!b) return; var c = simState(); c.notes = c.notes.filter(function (n) { return n.id !== b.dataset.del; }); simSave(c); renderNotes(c); };
  }
  function chart(sims) {
    var pts = sims.filter(function (x) { return x.score !== null && x.score !== undefined; }).map(function (x) { return Math.round(x.score / x.max * 100); });
    if (pts.length < 2) return '';
    var W = 320, H = 120, pad = 24, step = (W - pad * 2) / (pts.length - 1), path = '', dots = '';
    pts.forEach(function (v, i) { var x = pad + i * step, y = H - pad - (v / 100) * (H - pad * 2); path += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); dots += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="#00d95f" stroke="#0a1f13" stroke-width="2"/><text x="' + x.toFixed(1) + '" y="' + (y - 9).toFixed(1) + '" font-size="10" text-anchor="middle" fill="#0a1f13" font-weight="700">' + v + '</text>'; });
    return '<div class="chartbox"><b class="small">Результаты, % от максимума</b><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="График результатов симуляций"><line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" stroke="#cfeedb"/><line x1="' + pad + '" y1="' + pad + '" x2="' + (W - pad) + '" y2="' + pad + '" stroke="#cfeedb" stroke-dasharray="3 3"/><text x="2" y="' + (pad + 3) + '" font-size="9" fill="#476355">100</text><text x="6" y="' + (H - pad + 3) + '" font-size="9" fill="#476355">0</text><path d="' + path + '" fill="none" stroke="#0a1f13" stroke-width="2.5"/>' + dots + '</svg></div>';
  }
  function historyHtml(sims, readonly) {
    if (!sims.length) return '<p class="muted">Пока нет сохранённых симуляций. После первой симуляции здесь появится карточка с датой, заметками и оценкой.</p>';
    var h = chart(sims), unresolved = [];
    sims.forEach(function (s) { s.notes.forEach(function (n) { if (!n.resolved) unresolved.push({ s: s, n: n }); }); });
    if (unresolved.length) {
      h += '<section class="block"><h2 class="blk">Повторить (' + unresolved.length + ')</h2><p class="muted small">Заметки из всех симуляций, которые ещё не разобраны.' + (readonly ? '' : ' Отметьте галочкой, когда разберётесь.') + '</p><ul class="notes">' + unresolved.map(function (u) {
        return '<li class="note ' + u.n.type + '"><label class="rep">' + (readonly ? '' : '<input type="checkbox" data-res="' + esc(u.s.id) + '|' + esc(u.n.id) + '">') + '<span><span class="tag ' + u.n.type + '">' + NOTE_TYPES[u.n.type] + '</span> ' + esc(u.n.text) + '<span class="muted small"> · ' + esc(u.s.name) + (u.n.topic && byId[u.n.topic] ? ' · <a href="#' + u.n.topic + '">' + esc(byId[u.n.topic].title) + '</a>' : '') + '</span></span></label></li>';
      }).join('') + '</ul></section>';
    }
    h += '<div class="hist">' + sims.slice().reverse().map(function (s) {
      var pc = s.score !== null && s.score !== undefined ? Math.round(s.score / s.max * 100) : null;
      return '<details class="simcard"><summary><span class="sc-title">' + esc(s.name) + '</span><span class="sc-meta">' + fmtDate(s.date) + ' · ' + fmtShort(s.spent) + (pc !== null ? ' · <b>' + s.score + '/' + s.max + '</b>' : '') + (s.rating ? ' · ' + '★'.repeat(s.rating) : '') + '</span></summary><div class="sc-body">' +
        '<div class="facts small"><div class="fact"><b>' + fmtShort(s.planned) + '</b><span>запланировано</span></div><div class="fact"><b>' + fmtShort(s.spent) + '</b><span>потрачено</span></div><div class="fact"><b>' + (pc !== null ? pc + '%' : '—') + '</b><span>результат</span></div><div class="fact"><b>' + (s.rating ? s.rating + '/5' : '—') + '</b><span>моя оценка</span></div></div>' +
        (s.comment ? '<p><b>Выводы:</b> ' + esc(s.comment).replace(/\n/g, '<br>') + '</p>' : '') +
        '<h3 class="h3s">Заметки (' + s.notes.length + ')</h3>' + (s.notes.length ? '<ul class="notes">' + s.notes.map(function (n) { return noteHtml(n, false); }).join('') + '</ul>' : '<p class="muted">Без заметок.</p>') +
        (readonly ? '' : '<div class="row"><button class="linkbtn" type="button" data-rm="' + esc(s.id) + '">Удалить симуляцию</button></div>') + '</div></details>';
    }).join('') + '</div>';
    return h;
  }
  function renderHistory() {
    var el = $('simHistory'); if (!el) return;
    el.innerHTML = historyHtml(ud('sims', []), false);
    el.onclick = function (e) {
      var rm = e.target.closest('[data-rm]');
      if (rm) {
        if (rm.dataset.sure) { us('sims', ud('sims', []).filter(function (s) { return s.id !== rm.dataset.rm; })); renderHistory(); }
        else { rm.dataset.sure = '1'; rm.textContent = 'Нажмите ещё раз, чтобы удалить'; }
      }
    };
    el.onchange = function (e) {
      var r = e.target.closest('[data-res]'); if (!r) return;
      var p = r.dataset.res.split('|'), sims = ud('sims', []);
      sims.forEach(function (s) { if (s.id === p[0]) s.notes.forEach(function (n) { if (n.id === p[1]) n.resolved = r.checked; }); });
      us('sims', sims); setTimeout(renderHistory, 250);
    };
  }

  /* =============== профиль, экспорт и импорт =============== */
  function exportData() {
    var out = { v: 1, app: 'flutter-prep', user: user, exportedAt: Date.now(), data: {} };
    ['done', 'quiz', 'wrong', 'notes', 'sims', 'settings', 'ex', 'exd'].forEach(function (k) { out.data[k] = ud(k, k === 'wrong' || k === 'sims' ? [] : {}); });
    PARTS.forEach(function (p) { var c = ud('chk_' + p.id, null); if (c) out.data['chk_' + p.id] = c; });
    return out;
  }
  function parseImport(text) {
    var o = JSON.parse(text);
    if (!o || o.app !== 'flutter-prep' || !o.data) throw new Error('Это не файл экспорта этого сайта');
    return o;
  }
  function renderProfile() {
    var st = ud('settings', {}), isM = role() === 'mentor';
    var h = '<div class="col"><div class="crumb">Инструменты</div><h1 class="h1s">Профиль и данные</h1><p class="lead">Вы вошли как <b>' + esc(USERS[user].name) + '</b> (' + esc(user) + ', ' + (isM ? 'наставник' : 'студент') + ').</p>';
    h += '<section class="block"><h2 class="blk">Дата чемпионата</h2><label for="exam">Когда региональный этап?</label><input id="exam" type="date" value="' + esc(st.exam || '') + '"><div class="muted small" id="examInfo"></div></section>';
    h += '<section class="block"><h2 class="blk">Резервная копия</h2><p class="muted">Прогресс хранится в браузере на этом устройстве. Чтобы перенести его на другое устройство или показать наставнику, сохраните файл.</p><div class="row"><button class="cta green" type="button" id="exBtn">Скачать файл с данными</button><button class="cta" type="button" id="exCopy">Скопировать как текст</button></div><div class="muted small" id="exInfo"></div></section>';
    if (!isM) h += '<section class="block"><h2 class="blk">Восстановить из файла</h2><p class="muted">Нужно только если вы хотите вернуть данные из скачанной копии. Данные из файла заменят текущие.</p><label for="imFile">Файл .json</label><input id="imFile" type="file" accept="application/json,.json"><label for="imText">или вставьте текст</label><textarea id="imText" rows="3" placeholder="Вставьте содержимое файла"></textarea><div class="row"><button class="cta green" type="button" id="imBtn">Восстановить</button></div><div class="muted small" id="imInfo" role="status"></div></section>';
    h += '<section class="block"><h2 class="blk">Синхронизация</h2><p class="muted">' + (online() ? 'Данные автоматически сохраняются в облаке после каждого действия и подтягиваются при входе с любого устройства.' : 'Онлайн-режим не настроен: данные хранятся только в этом браузере.') + (isM ? ' Ваши страницы «Данные студента» обновляются сами.' : ' Наставник видит ваш прогресс онлайн.') + '</p><div class="row"><button class="cta" type="button" id="syncNow"' + (online() ? '' : ' disabled') + '>Синхронизировать сейчас</button></div></section>';
    h += '<section class="block"><h2 class="blk">Выход</h2><div class="row"><button class="cta" type="button" id="loPro">Выйти из аккаунта</button></div></section></div>';
    main.innerHTML = h;
    $('exam').addEventListener('change', function () { var s = ud('settings', {}); s.exam = $('exam').value; us('settings', s); var d = daysLeft(); $('examInfo').textContent = d === null ? '' : d >= 0 ? 'Осталось дней: ' + d : 'Дата уже прошла'; });
    var d0 = daysLeft(); if (d0 !== null) $('examInfo').textContent = d0 >= 0 ? 'Осталось дней: ' + d0 : 'Дата уже прошла';
    $('exBtn').addEventListener('click', function () {
      var text = JSON.stringify(exportData(), null, 1), d = new Date();
      try {
        var a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        a.href = url; a.download = 'flutter-prep-' + user + '-' + d.getFullYear() + two(d.getMonth() + 1) + two(d.getDate()) + '.json';
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        $('exInfo').textContent = 'Файл сохранён (проверьте папку «Загрузки»). Если не скачался, нажмите «Скопировать как текст».';
      } catch (e) { $('exInfo').textContent = 'Не удалось скачать файл. Используйте «Скопировать как текст».'; }
    });
    $('exCopy').addEventListener('click', function () {
      var text = JSON.stringify(exportData());
      try { navigator.clipboard.writeText(text).then(function () { $('exInfo').textContent = 'Скопировано. Отправьте текст наставнику или вставьте на другом устройстве.'; }, function () { $('exInfo').textContent = 'Не удалось скопировать. Используйте скачивание файла.'; }); } catch (e) { $('exInfo').textContent = 'Не удалось скопировать. Используйте скачивание файла.'; }
    });
    var sn = $('syncNow'); if (sn) sn.addEventListener('click', function () { setStatus('saving'); lsSet(uk('dirty'), '1'); push().then(function () { return pull(); }).then(function () { renderNav('profile'); }); });
    if (!isM) {
      $('imFile').addEventListener('change', function () { var f = $('imFile').files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { $('imText').value = String(r.result); }; r.readAsText(f); });
      var armed = false;
      $('imBtn').addEventListener('click', function () {
        var info = $('imInfo'), o;
        try { o = parseImport($('imText').value); } catch (e) { info.textContent = 'Не получилось прочитать данные: ' + e.message; return; }
        if (!armed) { armed = true; $('imBtn').textContent = 'Нажмите ещё раз: данные будут заменены'; return; }
        Object.keys(o.data).forEach(function (k) { us(k, o.data[k]); });
        armed = false; $('imBtn').textContent = 'Восстановить'; info.textContent = 'Готово. Данные восстановлены.'; renderNav('profile');
      });
    }
    $('loPro').addEventListener('click', logout);
  }
  var studentTimer = null;
  function studentHtml(row) {
    var d = row.data || {}, done = d.done || {}, quiz = d.quiz || {}, sims = d.sims || [], notes = d.notes || {}, live = d.simcur;
    var cnt = PARTS.filter(function (p) { return done[p.id]; }).length;
    var h = '<h2 class="sec" style="margin-top:8px">' + esc(row.username) + '</h2><p class="muted">Данные обновлены ' + fmtDate(Date.parse(row.updated_at)) + '. Страница обновляется сама каждые 15 секунд.</p>';
    if (live) {
      var rem = live.status === 'running' ? live.endAt - Date.now() : live.remaining;
      h += '<section class="block live"><h2 class="blk">Сейчас идёт симуляция</h2><p><b>' + esc(live.title || 'Без названия') + '</b> · ' + (live.status === 'running' ? 'идёт, осталось ' + fmtDur(rem) : live.status === 'paused' ? 'на паузе, осталось ' + fmtDur(rem) : 'время вышло, ждёт оценки') + ' · заметок: ' + (live.notes || []).length + '</p>' + ((live.notes || []).length ? '<ul class="notes">' + live.notes.map(function (n) { return noteHtml(n, false); }).join('') + '</ul>' : '') + '</section>';
    }
    h += '<div class="facts"><div class="fact"><b>' + Math.round(cnt / PARTS.length * 100) + '%</b><span>изучено (' + cnt + ' из ' + PARTS.length + ')</span></div><div class="fact"><b>' + Object.keys(quiz).length + '</b><span>тестов пройдено</span></div><div class="fact"><b>' + Object.keys(d.ex || {}).filter(function (k) { return d.ex[k].ok; }).length + '/' + EX.length + '</b><span>упражнений</span></div><div class="fact"><b>' + sims.length + '</b><span>симуляций</span></div><div class="fact"><b>' + ((d.settings && d.settings.exam) ? esc(d.settings.exam) : '—') + '</b><span>дата чемпионата</span></div></div>';
    h += '<h2 class="sec">Темы</h2><div class="tablewrap"><table class="plain"><thead><tr><th>Тема</th><th>Изучена</th><th>Тест</th><th>Упражнения</th><th>Заметка</th></tr></thead><tbody>' + PARTS.map(function (p) { var q = quiz[p.id], ex = d.ex || {}, el = EX.filter(function (e) { return e.part === p.id; }), ed = el.filter(function (e) { return ex[e.id] && ex[e.id].ok; }).length; return '<tr><td>' + esc(p.title) + '</td><td>' + (done[p.id] ? '✓' : '—') + '</td><td>' + (q ? q.best + '% (' + q.attempts + ')' : '—') + '</td><td>' + (el.length ? ed + '/' + el.length : '—') + '</td><td>' + (notes[p.id] ? esc(notes[p.id]).slice(0, 160) : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    h += '<h2 class="sec">Симуляции</h2>' + historyHtml(sims, true);
    return h;
  }
  function renderStudent() {
    var head = '<div class="col"><div class="crumb">Наставник</div><h1 class="h1s">Данные студента</h1>';
    if (!online()) { main.innerHTML = head + '<p class="lead">Онлайн-режим не настроен, поэтому данные студента недоступны.</p></div>'; return; }
    main.innerHTML = head + '<div id="stuBody"><p class="muted">Загружаю…</p></div><div class="row"><button class="cta" type="button" id="stuRefresh">Обновить сейчас</button></div></div>';
    function load() {
      listStudents().then(function (rows) {
        var el = $('stuBody'); if (!el) return;
        var open = {}; el.querySelectorAll('details.simcard[open]').forEach(function (d) { open[d.querySelector('.sc-title').textContent] = 1; });
        el.innerHTML = rows.length ? rows.map(studentHtml).join('') : '<p class="lead">Студент ещё ни разу не входил или не сохранил данные.</p>';
        el.querySelectorAll('details.simcard').forEach(function (d) { if (open[d.querySelector('.sc-title').textContent]) d.open = true; });
      }, function (e) { var el = $('stuBody'); if (el) el.innerHTML = '<p class="lead">Не удалось загрузить данные: ' + esc(e.message) + '</p>'; });
    }
    load(); $('stuRefresh').addEventListener('click', load);
    clearInterval(studentTimer); studentTimer = setInterval(function () { if (location.hash === '#student') load(); else clearInterval(studentTimer); }, 15000);
  }

  /* =============== поиск =============== */
  function renderSearch(q) {
    var ql = q.toLowerCase(), res = [];
    PARTS.forEach(function (p) {
      var i = p.text.toLowerCase().indexOf(ql), inTitle = p.title.toLowerCase().indexOf(ql) >= 0;
      if (i >= 0 || inTitle) { var from = Math.max(0, i - 60); res.push({ p: p, snip: i >= 0 ? p.text.slice(from, i + q.length + 90).replace(/\s+/g, ' ') : p.lead, w: inTitle ? 0 : 1 }); }
    });
    res.sort(function (a, b) { return a.w - b.w; });
    var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    var h = '<div class="col"><div class="crumb">Поиск</div><h1 class="h1s">«' + esc(q) + '»: ' + res.length + '</h1><div class="results">';
    res.forEach(function (r) { h += '<a href="#' + r.p.id + '"><b>' + esc(r.p.title) + '</b><small>…' + esc(r.snip).replace(re, '<mark>$1</mark>') + '…</small></a>'; });
    if (!res.length) h += '<p>Ничего не найдено. Попробуйте другое слово.</p>';
    main.innerHTML = h + '</div></div>';
  }
  searchEl.addEventListener('input', function () { var q = searchEl.value.trim(); if (q.length >= 2) renderSearch(q); else route(); });

  /* =============== маршрутизация и запуск =============== */
  function route() {
    if (!user) return;
    clearInterval(studentTimer); panelRefreshers = [];
    var id = location.hash.replace('#', '') || 'home', cur = id;
    if (id === 'home') renderHome();
    else if (id === 'quiz') renderQuizHub();
    else if (id === 'practice') { renderPracticeHub(); }
    else if (id.indexOf('practice-') === 0 && byId[id.slice(9)]) { renderPracticePart(byId[id.slice(9)]); cur = 'practice'; }
    else if (id === 'simulation') renderSim();
    else if (id === 'profile') renderProfile();
    else if (id === 'student' && role() === 'mentor') renderStudent();
    else if (byId[id]) renderPart(byId[id]);
    else { cur = 'home'; renderHome(); }
    renderNav(cur);
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', function () { searchEl.value = ''; route(); });
  $('miniTimer').addEventListener('click', function () { location.hash = 'simulation'; });

  function startApp(u) {
    user = u;
    document.body.classList.remove('locked'); loginEl.hidden = true; loginEl.innerHTML = '';
    try {
      var old = lsGet('fp_done');
      if (old && role() === 'student' && !lsGet(uk('done'))) { lsSet(uk('done'), old); lsDel('fp_done'); }
    } catch (e) { /* ничего */ }
    var go = function () { route(); ensureTicker(); };
    if (online() && auth) {
      main.innerHTML = '<div class="col"><p class="muted">Загружаю данные из облака…</p></div>';
      var timeout = new Promise(function (res) { setTimeout(res, 8000); });
      Promise.race([pull(), timeout]).then(go, go);
    } else go();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden || !user || !online() || !auth || lsGet(uk('dirty')) || Date.now() - lastPull < 20000) return;
    pull().then(function () { if ((location.hash || '#home') === '#home') route(); });
  });
  var savedAuth = null;
  if (online()) { try { savedAuth = JSON.parse(lsGet('fp_auth') || 'null'); } catch (e) { savedAuth = null; } }
  if (online()) {
    if (savedAuth && USERS[savedAuth.username]) { auth = savedAuth; startApp(savedAuth.username); } else showLogin();
  } else {
    var saved = lsGet('fp_session');
    if (saved && USERS[saved]) startApp(saved); else showLogin();
  }
})();
