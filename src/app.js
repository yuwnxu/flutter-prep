(function () {
  'use strict';
  var DATA = JSON.parse(document.getElementById('data').textContent);
  var PARTS = DATA.parts, STAGES = DATA.stages, QUIZ = DATA.quiz;
  var byId = {}; PARTS.forEach(function (p, i) { p.index = i; byId[p.id] = p; });
  var main = document.getElementById('main'), side = document.getElementById('side'), scrim = document.getElementById('scrim');
  var navEl = document.getElementById('nav'), searchEl = document.getElementById('search');

  /* ---------- безопасное хранилище ---------- */
  function load(key, def) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* хранилище недоступно */ } }
  var done = load('fp_done', {});
  var totalHours = PARTS.reduce(function (s, p) { return s + p.hours; }, 0);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function doneCount() { return PARTS.filter(function (p) { return done[p.id]; }).length; }
  function percent() { return Math.round(doneCount() / PARTS.length * 100); }

  /* ---------- боковое меню ---------- */
  function renderNav(current) {
    var h = '<a class="nav-home" href="#home"' + (current === 'home' ? ' aria-current="page"' : '') + '>План изучения</a>';
    STAGES.forEach(function (st) {
      var items = PARTS.filter(function (p) { return p.stage === st.n; });
      if (!items.length) return;
      h += '<div class="stage-title">' + esc(st.n + '. ' + st.title) + '</div>';
      items.forEach(function (p) {
        h += '<a class="nav-item" href="#' + p.id + '"' + (current === p.id ? ' aria-current="page"' : '') + '><span class="dot' + (done[p.id] ? ' on' : '') + '"></span><span>' + esc(p.title) + '</span></a>';
      });
    });
    h += '<div class="stage-title">Проверка</div><a class="nav-item" href="#quiz"' + (current === 'quiz' ? ' aria-current="page"' : '') + '><span class="dot"></span><span>Тренажёр</span></a>';
    navEl.innerHTML = h;
    document.getElementById('miniProgress').textContent = percent() + '%';
  }
  function openSide(v) { side.classList.toggle('open', v); scrim.classList.toggle('show', v); document.getElementById('menuBtn').setAttribute('aria-expanded', String(v)); }
  document.getElementById('menuBtn').addEventListener('click', function () { openSide(!side.classList.contains('open')); });
  scrim.addEventListener('click', function () { openSide(false); });
  navEl.addEventListener('click', function (e) { if (e.target.closest('a')) openSide(false); });

  /* ---------- главная: план ---------- */
  function ring(p) {
    var r = 50, c = 2 * Math.PI * r, off = c * (1 - p / 100);
    return '<div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="' + r + '" fill="none" stroke="#dcfbe8" stroke-width="12"/><circle cx="60" cy="60" r="' + r + '" fill="none" stroke="#00d95f" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><div><b>' + p + '%</b><small>готово</small></div></div>';
  }
  function renderHome() {
    var h = '<div class="hero"><div class="hero-in"><div><h1>Flutter к «Профессионалам»</h1><p>Подготовка к региональному чемпионату по компетенции «Разработка мобильных приложений»: от «что такое программирование» до разбора каждого спринта.</p></div>' + ring(percent()) + '</div></div><div class="col">';
    h += '<div class="facts"><div class="fact"><b>' + PARTS.length + '</b><span>тем в плане</span></div><div class="fact"><b>~' + totalHours + ' ч</b><span>на изучение</span></div><div class="fact"><b>100</b><span>баллов в задании</span></div><div class="fact"><b>6</b><span>спринтов, 18 часов</span></div></div>';
    h += '<h2 class="sec">План по этапам</h2><div class="road">';
    STAGES.forEach(function (st) {
      var items = PARTS.filter(function (p) { return p.stage === st.n; });
      if (!items.length) return;
      var hrs = items.reduce(function (s, p) { return s + p.hours; }, 0);
      h += '<section class="stage"><div class="stage-head"><div class="stage-no">' + st.n + '</div><div><h3>' + esc(st.title) + '</h3><p class="goal">' + esc(st.goal) + '</p></div><span class="hrs">' + hrs + ' ч</span></div><ul>';
      items.forEach(function (p) {
        h += '<li><a href="#' + p.id + '"><span class="dot' + (done[p.id] ? ' on' : '') + '"></span>' + esc(p.title) + '<em>' + p.hours + ' ч</em></a></li>';
      });
      h += '</ul><div class="practice"><b>Практика</b>' + esc(st.practice) + '</div></section>';
    });
    h += '</div><h2 class="sec">Как идти по плану</h2><div class="prose"><ul><li>Темы идут от простого к сложному. Следующий этап опирается на предыдущий.</li><li>После каждого этапа пройдите тренажёр и сделайте практическое задание.</li><li>Спринты 1–2 лучше отрепетировать с секундомером дважды: они задают фундамент для остальных.</li><li>Если вам удобно по два часа в день, весь план занимает около ' + Math.ceil(totalHours / 2 / 7) + ' недель вместе с практикой в запасе.</li></ul></div>';
    h += '<div class="row"><a class="cta green" href="#start">Начать с карты чемпионата</a><a class="cta" href="#quiz">Открыть тренажёр</a></div></div>';
    main.innerHTML = h;
  }

  /* ---------- статья ---------- */
  function renderPart(p) {
    var st = STAGES.filter(function (s) { return s.n === p.stage; })[0];
    var prev = PARTS[p.index - 1], next = PARTS[p.index + 1];
    var h = '<div class="col"><article><div class="crumb">Этап ' + p.stage + ' · ' + esc(st.title) + '</div><h1>' + esc(p.title) + '</h1><p class="lead">' + esc(p.lead) + '</p><div class="meta"><span class="chip">≈ ' + p.hours + ' ч</span><span class="chip">' + p.minutes + ' мин чтения</span></div><div class="toc" id="toc"></div><div class="prose" id="prose">' + p.html + '</div>';
    h += '<div class="done-bar"><label><input type="checkbox" id="doneBox"' + (done[p.id] ? ' checked' : '') + '> Тема изучена</label><div class="row" style="margin:0"><a class="cta green" href="#quiz-' + p.id + '">Проверить себя</a></div></div>';
    h += '<nav class="pager" aria-label="Соседние темы">' + (prev ? '<a href="#' + prev.id + '"><small>Назад</small>' + esc(prev.title) + '</a>' : '<a class="empty" aria-hidden="true"></a>') + (next ? '<a href="#' + next.id + '"><small>Дальше</small>' + esc(next.title) + '</a>' : '<a href="#quiz"><small>Дальше</small>Тренажёр</a>') + '</nav></article></div>';
    main.innerHTML = h;
    var prose = document.getElementById('prose');
    enhance(prose, p.id);
    document.getElementById('doneBox').addEventListener('change', function (e) { done[p.id] = e.target.checked; if (!e.target.checked) delete done[p.id]; save('fp_done', done); renderNav(p.id); });
  }
  function enhance(root, pid) {
    // таблицы в прокручиваемый контейнер
    root.querySelectorAll('table').forEach(function (t) { var w = document.createElement('div'); w.className = 'tablewrap'; t.parentNode.insertBefore(w, t); w.appendChild(t); });
    // блоки кода: подсветка и кнопка копирования
    root.querySelectorAll('pre').forEach(function (pre) {
      var code = pre.querySelector('code') || pre;
      var lang = (pre.className.match(/\b(dart|yaml|bash|xml|json)\b/) || [])[1];
      var w = document.createElement('div'); w.className = 'codewrap'; pre.parentNode.insertBefore(w, pre); w.appendChild(pre);
      if (lang) { code.className = 'language-' + lang; }
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
    // оглавление
    var heads = root.querySelectorAll('h2'), toc = document.getElementById('toc');
    if (heads.length > 2 && toc) {
      toc.innerHTML = '<b>На странице</b><div></div>';
      heads.forEach(function (hd) {
        var bt = document.createElement('button'); bt.type = 'button'; bt.textContent = hd.textContent;
        bt.addEventListener('click', function () { hd.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        toc.lastChild.appendChild(bt);
      });
    } else if (toc) { toc.remove(); }
    // интерактивные чек-листы
    var boxes = root.querySelectorAll('input[type="checkbox"]'), key = 'fp_chk_' + pid, saved = load(key, []);
    boxes.forEach(function (bx, i) {
      bx.disabled = false; bx.checked = saved.indexOf(i) >= 0;
      bx.addEventListener('change', function () {
        var arr = []; boxes.forEach(function (x, j) { if (x.checked) arr.push(j); }); save(key, arr);
      });
    });
  }

  /* ---------- тренажёр ---------- */
  var quiz = null;
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function startQuiz(partId) {
    var pool = partId ? QUIZ.filter(function (q) { return q.part === partId; }) : shuffle(QUIZ).slice(0, 10);
    quiz = { partId: partId, items: partId ? shuffle(pool) : pool, i: 0, score: 0, answered: false, missed: [] };
  }
  function renderQuiz(partId) {
    if (!quiz || quiz.partId !== (partId || null) || quiz.fresh) startQuiz(partId || null);
    quiz.fresh = false;
    if (partId && !quiz.items.length) {
      main.innerHTML = '<div class="col"><h1 class="sec" style="margin-top:0">Тренажёр</h1><p>По теме «' + esc(byId[partId].title) + '» пока нет вопросов.</p><a class="cta green" href="#quiz">Все вопросы</a></div>'; return;
    }
    if (quiz.i >= quiz.items.length) { return renderQuizEnd(); }
    var q = quiz.items[quiz.i], total = quiz.items.length;
    var title = partId ? 'Тема: ' + byId[partId].title : '10 случайных вопросов';
    var h = '<div class="col"><div class="crumb">Тренажёр</div><h1 style="font:700 clamp(22px,5vw,30px)/1.15 var(--f-display);margin:0 0 14px">' + esc(title) + '</h1><div class="bar"><i style="width:' + (quiz.i / total * 100) + '%"></i></div><div class="quiz-card"><div class="qnum">Вопрос ' + (quiz.i + 1) + ' из ' + total + '</div><div class="qtext">' + inline(q.q) + '</div><div class="opts">';
    q.o.forEach(function (o, k) { h += '<button class="opt" type="button" data-k="' + k + '">' + inline(o) + '</button>'; });
    h += '</div><div id="why"></div></div></div>';
    main.innerHTML = h;
    main.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        if (quiz.answered) return; quiz.answered = true;
        var k = +b.dataset.k, ok = k === q.a;
        if (ok) quiz.score++; else quiz.missed.push(q);
        main.querySelectorAll('.opt').forEach(function (x) { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        document.getElementById('why').innerHTML = '<div class="why"><b>' + (ok ? 'Верно. ' : 'Неверно. ') + '</b>' + inline(q.w) + '</div><div class="row"><button class="cta green" type="button" id="nextQ">' + (quiz.i + 1 >= total ? 'Показать результат' : 'Дальше') + '</button></div>';
        document.getElementById('nextQ').addEventListener('click', function () { quiz.i++; quiz.answered = false; renderQuiz(partId); window.scrollTo({ top: 0 }); });
      });
    });
  }
  function inline(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function renderQuizEnd() {
    var total = quiz.items.length, pc = Math.round(quiz.score / total * 100);
    var h = '<div class="col"><div class="crumb">Результат</div><div class="score">' + quiz.score + ' / ' + total + '</div><p class="lead">' + (pc >= 80 ? 'Отличный результат. Можно идти дальше.' : pc >= 50 ? 'Неплохо. Просмотрите темы с ошибками.' : 'Вернитесь к теории и попробуйте снова.') + '</p>';
    if (quiz.missed.length) {
      var seen = {}; h += '<h2 class="sec" style="margin-top:20px">Повторить</h2><div class="results">';
      quiz.missed.forEach(function (q) { if (seen[q.part]) return; seen[q.part] = 1; h += '<a href="#' + q.part + '"><b>' + esc(byId[q.part].title) + '</b><small>' + inline(q.q) + '</small></a>'; });
      h += '</div>';
    }
    h += '<div class="row"><button class="cta green" type="button" id="again">Ещё раз</button><a class="cta" href="#home">К плану</a></div></div>';
    main.innerHTML = h;
    document.getElementById('again').addEventListener('click', function () { var pid = quiz.partId; quiz = null; renderQuiz(pid); });
  }

  /* ---------- поиск ---------- */
  function renderSearch(q) {
    var ql = q.toLowerCase(), res = [];
    PARTS.forEach(function (p) {
      var i = p.text.toLowerCase().indexOf(ql), inTitle = p.title.toLowerCase().indexOf(ql) >= 0;
      if (i >= 0 || inTitle) {
        var from = Math.max(0, i - 60), snip = i >= 0 ? p.text.slice(from, i + q.length + 90).replace(/\s+/g, ' ') : p.lead;
        res.push({ p: p, snip: snip, w: inTitle ? 0 : 1 });
      }
    });
    res.sort(function (a, b) { return a.w - b.w; });
    var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    var h = '<div class="col"><div class="crumb">Поиск</div><h1 style="font:700 clamp(22px,5vw,30px)/1.15 var(--f-display);margin:0 0 14px">«' + esc(q) + '»: ' + res.length + '</h1><div class="results">';
    res.forEach(function (r) { h += '<a href="#' + r.p.id + '"><b>' + esc(r.p.title) + '</b><small>…' + esc(r.snip).replace(re, '<mark>$1</mark>') + '…</small></a>'; });
    if (!res.length) h += '<p>Ничего не найдено. Попробуйте другое слово.</p>';
    main.innerHTML = h + '</div></div>';
  }
  searchEl.addEventListener('input', function () {
    var q = searchEl.value.trim();
    if (q.length >= 2) renderSearch(q); else route();
  });

  /* ---------- маршрутизация ---------- */
  function route() {
    var id = location.hash.replace('#', '') || 'home';
    var cur = id;
    if (id === 'home') renderHome();
    else if (id === 'quiz') { quiz = null; renderQuiz(null); cur = 'quiz'; }
    else if (id.indexOf('quiz-') === 0 && byId[id.slice(5)]) { quiz = null; renderQuiz(id.slice(5)); cur = id.slice(5); }
    else if (byId[id]) renderPart(byId[id]);
    else { cur = 'home'; renderHome(); }
    renderNav(cur);
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', function () { searchEl.value = ''; route(); });
  route();
})();
