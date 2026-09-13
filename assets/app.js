/* =========================================================
   言一 · 全站脚本
   主题 / 导航高亮 / 浏览量 / 版本号
   ========================================================= */
window.YY = (function () {
  'use strict';

  const VERSION = 'beta0.12';
  const root = document.documentElement;

  /* ---------- 1. 主题 ---------- */
  function initTheme() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ---------- 2. 导航高亮 ----------
     按 data-match（空格分隔多个文件名）匹配当前页面。
     calendar.html / weather.html 上「首页」也会亮。
     ------------------------------------ */
  function initNav() {
    const file = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      const raw = a.getAttribute('data-match') || a.getAttribute('href') || '';
      const list = raw.split(/\s+/).filter(Boolean);
      if (list.indexOf(file) >= 0) a.classList.add('is-active');
    });
  }

  /* ---------- 3. 浏览量 ----------
     Abacus 免费无 Key。它挂掉时回退到本地缓存并标记离线。
     换服务只改 PV_BASE。
     ------------------------------------ */
  const PV_BASE = 'https://abacus.jasoncameron.dev';
  const PV_NS   = 'yan-yi';

  function ymd(d) {
    return d.getFullYear()
      + String(d.getMonth() + 1).padStart(2, '0')
      + String(d.getDate()).padStart(2, '0');
  }

  function pvFetch(kind, key) {
    return fetch(PV_BASE + '/' + kind + '/' + PV_NS + '/' + encodeURIComponent(key),
                 { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (j) { return Number(j.value); });
  }

  function fmtNum(n) {
    if (n == null || isNaN(n)) return '—';
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function initPageviews() {
    const totalEl = document.getElementById('pvTotal');
    const todayEl = document.getElementById('pvToday');
    if (!totalEl && !todayEl) return;

    const dayKey = 'd-' + ymd(new Date());
    let cache = null;
    try { cache = JSON.parse(localStorage.getItem('pv') || 'null'); } catch (e) {}

    Promise.allSettled([pvFetch('hit', 'total'), pvFetch('hit', dayKey)])
      .then(function (res) {
        const total = res[0].status === 'fulfilled' ? res[0].value : null;
        const today = res[1].status === 'fulfilled' ? res[1].value : null;
        const live = (total != null && today != null);

        let showTotal = total, showToday = today, offline = false;

        if (!live) {
          if (cache && cache.day === dayKey) {
            if (showTotal == null) showTotal = cache.total;
            if (showToday == null) showToday = cache.today;
            offline = true;
          }
        } else {
          try {
            localStorage.setItem('pv',
              JSON.stringify({ total: total, today: today, day: dayKey }));
          } catch (e) {}
        }

        if (totalEl) totalEl.textContent = fmtNum(showTotal);
        if (todayEl) todayEl.textContent = fmtNum(showToday);

        if (offline) {
          document.querySelectorAll('.foot-stats .stat i').forEach(function (el) {
            el.classList.add('off');
            el.title = '计数服务暂时不可用，显示的是上次结果';
          });
        }
      });
  }

  /* ---------- 4. 版本号 / 年份 ---------- */
  function initMisc() {
    document.querySelectorAll('#siteVersion').forEach(function (el) {
      el.textContent = VERSION;
    });
    document.querySelectorAll('#year').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---------- 5. 入场动画 ---------- */
  function animate(selector, step) {
    document.querySelectorAll(selector).forEach(function (el, i) {
      el.style.animationDelay = Math.min(i, 9) * (step || 45) + 'ms';
      el.classList.add('enter');
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    initTheme();
    initNav();
    initPageviews();
    initMisc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  return {
    VERSION: VERSION,
    animate: animate,
    fmtNum: fmtNum
  };
})();
