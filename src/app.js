(function () {
  'use strict';
  var DATA = JSON.parse(document.getElementById('data').textContent);
  var PARTS = DATA.parts, STAGES = DATA.stages, QUIZ = DATA.quiz, USERS = DATA.users;
  var byId = {}; PARTS.forEach(function (p, i) { p.index = i; byId[p.id] = p; });
  var qById = {}; QUIZ.forEach(function (q) { qById[q.id] = q; });
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
  function us(k, v) { lsSet(uk(k), JSON.stringify(v)); }
  function role() { return user && USERS[user] ? USERS[user].role : null; }
  function doneMap() { return ud('done', {}); }
  function percent() { var d = doneMap(); return Math.round(PARTS.filter(function (p) { return d[p.id]; }).length / PARTS.length * 100); }

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
      var u = $('lu').value.trim().toLowerCase(), p = $('lp').value;
      var rec = USERS[u];
      if (rec && sha256('fp1:' + u + ':' + p) === rec.hash) { lsSet('fp_session', u); startApp(u); }
      else $('lerr').textContent = 'Неверный логин или пароль';
    });
    setTimeout(function () { var f = $('lu'); if (f) f.focus(); }, 50);
  }
  function logout() { stopTicker(); lsDel('fp_session'); user = null; showLogin(); }

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
    [['simulation', 'Симуляция'], ['quiz', 'Тренажёр'], ['profile', 'Профиль и данные']].concat(role() === 'mentor' ? [['student', 'Данные студента']] : []).forEach(function (it) {
      h += '<a class="nav-item" href="#' + it[0] + '"' + (current === it[0] ? ' aria-current="page"' : '') + '><span class="dot tool"></span><span>' + it[1] + '</span></a>';
    });
    h += '<div class="side-user"><span>' + esc(USERS[user].name) + ' · ' + esc(user) + '</span><button type="button" class="linkbtn" id="logoutBtn">Выйти</button></div>';
    navEl.innerHTML = h;
    $('logoutBtn').addEventListener('click', logout);
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
    var h = '<div class="col"><article><div class="crumb">Этап ' + p.stage + ' · ' + esc(st.title) + '</div><h1>' + esc(p.title) + '</h1><p class="lead">' + esc(p.lead) + '</p><div class="meta"><span class="chip">≈ ' + p.hours + ' ч</span><span class="chip">' + p.minutes + ' мин чтения</span>' + (qr ? '<span class="chip ok">Тест: ' + qr.best + '%</span>' : '') + '</div>';
    h += '<div class="toc" id="toc"></div><div class="row tools"><button class="mini" type="button" id="expAll">Развернуть все</button><button class="mini" type="button" id="colAll">Свернуть все</button></div><div class="prose" id="prose">' + p.html + '</div>';
    if (qids.length) h += '<section class="block" id="quizBlock"><h2 class="blk">Проверь себя</h2><p class="muted">' + qids.length + ' вопросов по теме. Ответы сохраняются: ошибки попадут в «Мои ошибки» в тренажёре.</p><div id="quizMount"></div></section>';
    h += '<section class="block"><h2 class="blk">Мои заметки по теме</h2><textarea id="topicNote" class="note-area" rows="4" placeholder="Что непонятно, что запомнить, примеры из своего кода…" aria-label="Заметки по теме"></textarea><div class="muted small" id="noteSaved">Сохраняется автоматически</div></section>';
    h += '<div class="done-bar"><label><input type="checkbox" id="doneBox"' + (done[p.id] ? ' checked' : '') + '> Тема изучена</label>' + (qids.length ? '<a class="cta green" href="#quizBlock" id="toQuiz">К тесту</a>' : '') + '</div>';
    h += '<nav class="pager" aria-label="Соседние темы">' + (prev ? '<a href="#' + prev.id + '"><small>Назад</small>' + esc(prev.title) + '</a>' : '<a class="empty" aria-hidden="true"></a>') + (next ? '<a href="#' + next.id + '"><small>Дальше</small>' + esc(next.title) + '</a>' : '<a href="#simulation"><small>Дальше</small>Симуляция</a>') + '</nav></article></div>';
    main.innerHTML = h;
    enhance($('prose'), p.id);
    if (qids.length) mountQuiz($('quizMount'), qids, { partId: p.id });
    var notes = ud('notes', {}), ta = $('topicNote'), timer;
    ta.value = notes[p.id] || '';
    ta.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { var n = ud('notes', {}); n[p.id] = ta.value; us('notes', n); $('noteSaved').textContent = 'Сохранено'; }, 400);
    });
    $('doneBox').addEventListener('change', function (e) { var d = doneMap(); if (e.target.checked) d[p.id] = 1; else delete d[p.id]; us('done', d); renderNav(p.id); });
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
    var h = '<div class="col"><div class="crumb">Тренажёр</div><h1 class="h1s">Проверка знаний</h1><p class="lead">Всего вопросов: ' + QUIZ.length + '. Тест по каждой теме лежит в конце самой темы, а здесь можно потренироваться вперемешку и разобрать ошибки.</p>';
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
    ['done', 'quiz', 'wrong', 'notes', 'sims', 'settings'].forEach(function (k) { out.data[k] = ud(k, k === 'wrong' || k === 'sims' ? [] : {}); });
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
    h += '<section class="block"><h2 class="blk">' + (isM ? 'Загрузить данные студента' : 'Восстановить из файла') + '</h2><p class="muted">' + (isM ? 'Выберите файл, который прислала студентка. Данные появятся на странице «Данные студента», ваш прогресс не изменится.' : 'Данные из файла заменят текущие на этом устройстве.') + '</p><label for="imFile">Файл .json</label><input id="imFile" type="file" accept="application/json,.json"><label for="imText">или вставьте текст</label><textarea id="imText" rows="3" placeholder="Вставьте содержимое файла"></textarea><div class="row"><button class="cta green" type="button" id="imBtn">' + (isM ? 'Загрузить' : 'Восстановить') + '</button></div><div class="muted small" id="imInfo" role="status"></div></section>';
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
    $('imFile').addEventListener('change', function () { var f = $('imFile').files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { $('imText').value = String(r.result); }; r.readAsText(f); });
    var armed = false;
    $('imBtn').addEventListener('click', function () {
      var info = $('imInfo'), o;
      try { o = parseImport($('imText').value); } catch (e) { info.textContent = 'Не получилось прочитать данные: ' + e.message; return; }
      if (isM) { us('student', { importedAt: Date.now(), from: o.user, exportedAt: o.exportedAt, data: o.data }); info.textContent = 'Данные загружены. Откройте «Данные студента».'; return; }
      if (!armed) { armed = true; $('imBtn').textContent = 'Нажмите ещё раз: данные будут заменены'; return; }
      Object.keys(o.data).forEach(function (k) { us(k, o.data[k]); });
      armed = false; $('imBtn').textContent = 'Восстановить'; info.textContent = 'Готово. Данные восстановлены.'; renderNav('profile');
    });
    $('loPro').addEventListener('click', logout);
  }
  function renderStudent() {
    var snap = ud('student', null);
    var h = '<div class="col"><div class="crumb">Наставник</div><h1 class="h1s">Данные студента</h1>';
    if (!snap) { main.innerHTML = h + '<p class="lead">Данные ещё не загружены. Попросите студентку скачать файл на странице «Профиль и данные» и загрузите его там же.</p><a class="cta green" href="#profile">Загрузить файл</a></div>'; return; }
    var d = snap.data, done = d.done || {}, quiz = d.quiz || {}, sims = d.sims || [], notes = d.notes || {};
    var cnt = PARTS.filter(function (p) { return done[p.id]; }).length;
    h += '<p class="lead">Файл от ' + esc(snap.from || '—') + ', сформирован ' + fmtDate(snap.exportedAt) + ', загружен ' + fmtDate(snap.importedAt) + '.</p>';
    h += '<div class="facts"><div class="fact"><b>' + Math.round(cnt / PARTS.length * 100) + '%</b><span>изучено (' + cnt + ' из ' + PARTS.length + ')</span></div><div class="fact"><b>' + Object.keys(quiz).length + '</b><span>тестов пройдено</span></div><div class="fact"><b>' + sims.length + '</b><span>симуляций</span></div><div class="fact"><b>' + ((d.settings && d.settings.exam) ? esc(d.settings.exam) : '—') + '</b><span>дата чемпионата</span></div></div>';
    h += '<h2 class="sec">Темы</h2><div class="tablewrap"><table class="plain"><thead><tr><th>Тема</th><th>Изучена</th><th>Тест</th><th>Заметка</th></tr></thead><tbody>' + PARTS.map(function (p) { var q = quiz[p.id]; return '<tr><td>' + esc(p.title) + '</td><td>' + (done[p.id] ? '✓' : '—') + '</td><td>' + (q ? q.best + '% (' + q.attempts + ')' : '—') + '</td><td>' + (notes[p.id] ? esc(notes[p.id]).slice(0, 160) : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    h += '<h2 class="sec">Симуляции</h2>' + historyHtml(sims, true) + '</div>';
    main.innerHTML = h;
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
    var id = location.hash.replace('#', '') || 'home', cur = id;
    if (id === 'home') renderHome();
    else if (id === 'quiz') renderQuizHub();
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
    // перенос прогресса из версии без входа (один раз, только для студента)
    try {
      var old = lsGet('fp_done');
      if (old && role() === 'student' && !lsGet(uk('done'))) { lsSet(uk('done'), old); lsDel('fp_done'); }
    } catch (e) { /* ничего */ }
    route(); ensureTicker();
  }
  var saved = lsGet('fp_session');
  if (saved && USERS[saved]) startApp(saved); else showLogin();
})();
