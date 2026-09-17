/* =========================================================
   言一 · 学习页
   番茄钟 / 待办清单 / 倒数日
   数据全部保存在 localStorage
   version beta 0.30
   ========================================================= */
(function () {
  'use strict';

  var YY = window.YY;
  var $ = YY.$, $$ = YY.$$;

  document.addEventListener('DOMContentLoaded', function () {
    initPomo();
    initTodo();
    initCountdown();
    YY.animate('.study > *', 70);
  });

  /* =========================================================
     一、番茄钟
     ========================================================= */
  function initPomo() {
    var card = $('#pomoCard');
    if (!card) return;

    var timeEl = $('#pomoTime');
    var stateEl = $('#pomoState');
    var prog = $('#pomoProg');
    var startBtn = $('#pomoStart');
    var resetBtn = $('#pomoReset');
    var customEl = $('#pomoCustom');
    var autoBtn = $('#pomoAuto');

    var R = 112;
    var CIRC = 2 * Math.PI * R;
    prog.style.strokeDasharray = CIRC.toFixed(2);
    prog.style.strokeDashoffset = '0';

    var STATS_KEY = 'yy-pomo-stats';
    var AUTO_KEY = 'yy-pomo-auto';

    var total = 25 * 60;   // 当前段总时长（秒）
    var left = total;      // 剩余（秒）
    var kind = 'focus';    // focus | break
    var running = false;
    var timer = null;
    var endAt = 0;

    var stats = loadStats();
    renderStats();

    /* ---- 存储 ---- */
    function loadStats() {
      var s = null;
      try { s = JSON.parse(localStorage.getItem(STATS_KEY) || 'null'); } catch (e) {}
      if (!s || typeof s !== 'object') s = { total: 0, mins: 0, days: {} };
      if (!s.days) s.days = {};
      return s;
    }
    function saveStats() {
      try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
    }
    function todayKey() {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function renderStats() {
      $('#pomoToday').textContent = stats.days[todayKey()] || 0;
      $('#pomoTotal').textContent = stats.total;
      $('#pomoMins').textContent = stats.mins;
    }

    /* ---- 自动连段开关 ---- */
    var auto = false;
    try { auto = localStorage.getItem(AUTO_KEY) === '1'; } catch (e) {}
    autoBtn.setAttribute('aria-checked', auto ? 'true' : 'false');
    autoBtn.addEventListener('click', function () {
      auto = !auto;
      autoBtn.setAttribute('aria-checked', auto ? 'true' : 'false');
      try { localStorage.setItem(AUTO_KEY, auto ? '1' : '0'); } catch (e) {}
    });

    /* ---- 模式分段控件 ---- */
    var seg = YY.segmented($('#pomoSeg'), function (btn) {
      setSegment(Number(btn.dataset.min), btn.dataset.kind);
    });

    customEl.addEventListener('change', applyCustom);
    customEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); applyCustom(); }
    });
    function applyCustom() {
      var m = Math.round(Number(customEl.value));
      if (!m || m < 1 || m > 180) { YY.toast('请输入 1–180 之间的分钟数', 'warn'); return; }
      setSegment(m, 'focus');
      YY.toast('已设为 ' + m + ' 分钟专注', 'ok');
    }

    function setSegment(min, k) {
      pause();
      total = min * 60;
      left = total;
      kind = k;
      card.classList.toggle('is-focus', k === 'focus');
      card.classList.toggle('is-break', k === 'break');
      render();
      stateEl.textContent = k === 'focus' ? '准备专注' : '休息一下';
    }

    /* ---- 渲染 ---- */
    function render() {
      var m = Math.floor(left / 60);
      var s = left % 60;
      timeEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      var frac = total > 0 ? left / total : 0;
      prog.style.strokeDashoffset = (CIRC * (1 - frac)).toFixed(2);
      document.title = (running ? timeEl.textContent + ' · ' : '') + '学习 · 言一';
    }

    /* ---- 计时 ---- */
    function tick() {
      left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      render();
      if (left <= 0) finish();
    }

    function start() {
      if (running) { pause(); return; }
      if (left <= 0) left = total;
      running = true;
      startBtn.textContent = '暂停';
      stateEl.textContent = kind === 'focus' ? '专注中…' : '休息中…';
      endAt = Date.now() + left * 1000;
      timer = setInterval(tick, 250);
    }

    function pause() {
      running = false;
      startBtn.textContent = left < total && left > 0 ? '继续' : '开始';
      if (timer) { clearInterval(timer); timer = null; }
      if (left > 0) stateEl.textContent = kind === 'focus' ? '准备专注' : '休息一下';
      render();
    }

    function finish() {
      pause();
      left = 0;
      render();
      chime();
      if (kind === 'focus') {
        stats.total += 1;
        stats.mins += Math.round(total / 60);
        var k = todayKey();
        stats.days[k] = (stats.days[k] || 0) + 1;
        saveStats();
        renderStats();
        YY.confettiBurst(window.innerWidth / 2, window.innerHeight / 3);
        YY.toast('专注完成，休息一下吧', 'ok', 3000);
      } else {
        YY.toast('休息结束', 'ok', 2600);
      }
      if (auto) {
        var items = seg ? seg.items : [];
        var next = null;
        if (kind === 'focus') {
          // 每 4 个番茄来一次长休
          next = (stats.total % 4 === 0) ? items[2] : items[1];
        } else {
          next = items[0];
        }
        if (next) { next.click(); start(); }
      }
    }

    /* 完成提示音：WebAudio 三声上行 */
    function chime() {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        var ctx = new AC();
        [523.25, 659.25, 783.99].forEach(function (f, i) {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.16);
          g.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + i * 0.16 + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.5);
          o.connect(g).connect(ctx.destination);
          o.start(ctx.currentTime + i * 0.16);
          o.stop(ctx.currentTime + i * 0.16 + 0.55);
        });
        setTimeout(function () { ctx.close(); }, 1500);
      } catch (e) {}
    }

    startBtn.addEventListener('click', start);
    resetBtn.addEventListener('click', function () { setSegment(Math.round(total / 60), kind); });

    // 离开页面时若正在计时，给个状态保留（时间本身不持久化，刷新即重置）
    render();
  }

  /* =========================================================
     二、待办清单
     ========================================================= */
  function initTodo() {
    var listEl = $('#todoList');
    if (!listEl) return;

    var input = $('#todoInput');
    var addBtn = $('#todoAdd');
    var countEl = $('#todoCount');
    var KEY = 'yy-todos';

    var todos = load();
    render();

    function load() {
      var t = null;
      try { t = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
      return Array.isArray(t) ? t : [];
    }
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(todos)); } catch (e) {}
    }

    function add() {
      var text = input.value.trim();
      if (!text) return;
      todos.unshift({ id: Date.now(), text: text, done: false });
      input.value = '';
      save();
      render();
    }

    addBtn.addEventListener('click', add);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); add(); }
    });

    listEl.addEventListener('click', function (e) {
      var item = e.target.closest('.todo');
      if (!item) return;
      var id = Number(item.dataset.id);
      if (e.target.closest('.todo-check')) {
        todos.forEach(function (t) { if (t.id === id) t.done = !t.done; });
        save(); render();
      } else if (e.target.closest('.todo-del')) {
        todos = todos.filter(function (t) { return t.id !== id; });
        save(); render();
        YY.toast('已删除', null, 1400);
      }
    });

    function render() {
      var undone = todos.filter(function (t) { return !t.done; }).length;
      countEl.textContent = todos.length ? ('还剩 ' + undone + ' 项') : '';
      if (!todos.length) {
        listEl.innerHTML = '<p class="todo-empty">还没有待办。写下今天最重要的一件小事吧。</p>';
        return;
      }
      listEl.innerHTML = todos.map(function (t) {
        return '<div class="todo' + (t.done ? ' is-done' : '') + '" data-id="' + t.id + '">'
          + '<button class="todo-check" type="button" aria-label="' + (t.done ? '标记为未完成' : '标记为完成') + '">'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>'
          + '</button>'
          + '<span class="todo-text"></span>'
          + '<button class="todo-del" type="button" aria-label="删除">'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
          + '</button>'
          + '</div>';
      }).join('');
      // 文本单独填充，避免注入
      $$('.todo', listEl).forEach(function (el, i) {
        el.querySelector('.todo-text').textContent = todos[i].text;
      });
    }
  }

  /* =========================================================
     三、倒数日
     ========================================================= */
  function initCountdown() {
    var listEl = $('#cdList');
    if (!listEl) return;

    var nameEl = $('#cdName');
    var dateEl = $('#cdDate');
    var addBtn = $('#cdAdd');
    var countEl = $('#cdCount');
    var KEY = 'yy-countdowns';

    var items = load();
    render();

    function load() {
      var t = null;
      try { t = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
      return Array.isArray(t) ? t : [];
    }
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    }

    function daysOf(dateStr) {
      var now = new Date();
      var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var target = new Date(dateStr + 'T00:00:00');
      return Math.round((target - today) / 86400000);
    }

    function add() {
      var name = nameEl.value.trim();
      var date = dateEl.value;
      if (!name) { YY.toast('先给这个日子起个名字', 'warn'); return; }
      if (!date) { YY.toast('选一个目标日期', 'warn'); return; }
      items.push({ id: Date.now(), name: name, date: date });
      nameEl.value = '';
      save();
      render();
    }

    addBtn.addEventListener('click', add);
    nameEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); add(); }
    });

    listEl.addEventListener('click', function (e) {
      var del = e.target.closest('.cd-del');
      if (!del) return;
      var id = Number(del.closest('.cd-item').dataset.id);
      items = items.filter(function (t) { return t.id !== id; });
      save(); render();
    });

    function render() {
      countEl.textContent = items.length ? (items.length + ' 个日子') : '';
      if (!items.length) {
        listEl.innerHTML = '<p class="cd-empty">还没有倒数日。考试、生日、纪念日，都可以放进来。</p>';
        return;
      }
      var sorted = items.slice().sort(function (a, b) {
        return Math.abs(daysOf(a.date)) - Math.abs(daysOf(b.date));
      });
      listEl.innerHTML = sorted.map(function (t) {
        var d = daysOf(t.date);
        var num, label, past = false;
        if (d > 0) { num = d; label = '天后'; }
        else if (d === 0) { num = '今'; label = '就是今天'; }
        else { num = Math.abs(d); label = '天前'; past = true; }
        var pretty = t.date.replace(/-/g, ' / ');
        return '<div class="cd-item' + (past ? ' is-past' : '') + '" data-id="' + t.id + '">'
          + '<span class="cd-days">' + num + '<small>' + label + '</small></span>'
          + '<span class="cd-info"><b></b><span>' + pretty + '</span></span>'
          + '<button class="cd-del" type="button" aria-label="删除">'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
          + '</button>'
          + '</div>';
      }).join('');
      $$('.cd-item', listEl).forEach(function (el, i) {
        el.querySelector('.cd-info b').textContent = sorted[i].name;
      });
    }
  }

})();
