/* =========================================================
   言一 · 全站脚本
   主题 / 导航高亮 / 浏览量 / 全屏视图 / 版本号
   ========================================================= */
window.YY = (function () {
  'use strict';

  const VERSION = 'beta0.11';

  /* ---------- 1. 主题 ---------- */
  const root = document.documentElement;

  function initTheme() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ---------- 2. 导航高亮（按文件名自动判断，不用手写） ---------- */
  function initNav() {
    let file = location.pathname.split('/').pop() || 'index.html';
    if (file === '') file = 'index.html';
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      const href = a.getAttribute('href');
      if (href === file) a.classList.add('is-active');
    });
  }

  /* ---------- 3. 全屏视图开关 ---------- */
  const openHooks = {};

  function closeViews() {
    document.querySelectorAll('.view.is-open').forEach(function (v) {
      v.classList.remove('is-open');
      v.setAttribute('aria-hidden', 'true');
    });
    document.documentElement.style.overflow = '';
  }

  function openView(name, opts) {
    const target = document.getElementById('view-' + name);
    if (!target) return;

    closeViews();
    target.classList.add('is-open');
    target.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';

    if (!(opts && opts.silent)) {
      if (location.hash !== '#' + name) {
        try { history.pushState(null, '', '#' + name); } catch (e) {}
      }
    }

    // 等布局完成后再通知，这样测量高度才是准的
    requestAnimationFrame(function () {
      const fn = openHooks[name];
      if (fn) fn();
    });
  }

  function onViewOpen(name, fn) { openHooks[name] = fn; }

  function viewIsOpen(name) {
    const v = document.getElementById('view-' + name);
    return !!(v && v.classList.contains('is-open'));
  }

  function initViewKeys() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      const anyOpen = document.querySelector('.view.is-open');
      if (anyOpen) {
        closeViews();
        try { history.replaceState(null, '', location.pathname); } catch (err) {}
      }
    });

    window.addEventListener('hashchange', function () {
      const h = location.hash.replace('#', '');
      if (h === 'calendar' || h === 'weather') openView(h, { silent: true });
      else closeViews();
    });
  }

  /* ---------- 4. 浏览量 ----------
     用 Abacus 这个免费无 Key 的计数服务。
     它是第三方的，可能限流或挂掉 —— 挂掉时回退到本地缓存并标「离线」。
     想换服务：只改 PV_BASE 和 parsePv() 就行。
     -------------------------------------------------------- */
  const PV_BASE = 'https://abacus.jasoncameron.dev';
  const PV_NS   = 'yan-yi';

  function ymd(d) {
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }

  function pv(path) {
    return fetch(PV_BASE + '/' + path + '/' + PV_NS, { cache: 'no-store' })
      .catch(function () {
        return fetch(PV_BASE + '/' + path.replace(/^(hit|get)\//, '$1/') , { cache: 'no-store' });
      });
  }

  // 自增：/hit/{ns}/{key}  ·  只读：/get/{ns}/{key}
  function pvFetch(kind, key) {
    return fetch(PV_BASE + '/' + kind + '/' + PV_NS + '/' + encodeURIComponent(key), { cache: 'no-store' })
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
            localStorage.setItem('pv', JSON.stringify({ total: total, today: today, day: dayKey }));
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

  /* ---------- 5. 版本号 / 年份 / 入场动画 ---------- */
  function initMisc() {
    document.querySelectorAll('#siteVersion').forEach(function (el) {
      el.textContent = VERSION;
    });
    document.querySelectorAll('#year').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

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
    initViewKeys();
    initPageviews();
    initMisc();

    // 直接带 #calendar / #weather 打开时自动展开
    const h = location.hash.replace('#', '');
    if (h === 'calendar' || h === 'weather') openView(h, { silent: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  return {
    VERSION: VERSION,
    openView: openView,
    closeView: closeViews,
    viewIsOpen: viewIsOpen,
    onViewOpen: onViewOpen,
    animate: animate,
    fmtNum: fmtNum
  };
})();
