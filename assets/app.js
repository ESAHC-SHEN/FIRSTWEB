/* =========================================================
   言一 · 全站脚本
   主题 / 导航 / 揭示动画 / 浮层 / 浏览量 / 版本号
   墨点涟漪 / Logo 彩带彩蛋
   version beta 0.30
   ========================================================= */
window.YY = (function () {
  'use strict';

  const VERSION = 'beta 0.30';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- 0. 小工具 ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function fmtBytes(n) {
    if (n == null || isNaN(n)) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    return (n / 1048576).toFixed(n < 10485760 ? 2 : 1) + ' MB';
  }

  function fmtNum(n) {
    if (n == null || isNaN(n)) return '—';
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function raf(fn) {
    let queued = false, lastArgs = null;
    return function () {
      lastArgs = arguments;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        fn.apply(null, lastArgs);
      });
    };
  }

  /* ---------- 1. 主题 ---------- */
  function initTheme() {
    const btn = $('#themeToggle');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      const apply = function () {
        root.dataset.theme = next;
        try { localStorage.setItem('theme', next); } catch (err) {}
      };

      // 从按钮位置扩散的圆形揭示（iOS 风格）
      if (document.startViewTransition && !reduceMotion.matches) {
        const r = btn.getBoundingClientRect();
        root.style.setProperty('--vt-x', (r.left + r.width / 2) + 'px');
        root.style.setProperty('--vt-y', (r.top + r.height / 2) + 'px');
        root.classList.add('theme-vt');
        const t = document.startViewTransition(apply);
        t.finished.finally(function () { root.classList.remove('theme-vt'); });
      } else {
        apply();
      }
    });
  }

  /* ---------- 2. 导航 ---------- */
  const navState = { pill: null, links: [], active: null };

  function initNav() {
    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    // 高亮：顶部导航 + 底部标签栏
    $$('.nav-links a, .tabbar a, .tab').forEach(function (a) {
      const raw = a.getAttribute('data-match') || a.getAttribute('href') || '';
      const list = raw.toLowerCase().split(/\s+/).filter(Boolean);
      if (list.indexOf(file) >= 0) a.classList.add('is-active');
      if (file === '' && list.indexOf('index.html') >= 0) a.classList.add('is-active');
    });

    const nav = $('#topnav');
    const wrap = $('.nav-links');
    const pill = $('.nav-pill');

    if (wrap && pill) {
      navState.pill = pill;
      navState.links = $$('a', wrap);
      navState.active = $('a.is-active', wrap) || navState.links[0] || null;
      movePill(navState.active, true);

      navState.links.forEach(function (a) {
        a.addEventListener('pointerenter', function () { movePill(a); });
        a.addEventListener('focus', function () { movePill(a); });
      });
      wrap.addEventListener('pointerleave', function () { movePill(navState.active); });
      window.addEventListener('resize', raf(function () { movePill(navState.active, true); }));

      // 字体加载完成后重新量一次，避免宽度偏移
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { movePill(navState.active, true); });
      }
    }

    // 滚动状态 + 顶部进度
    const progress = $('.nav-progress');
    const onScroll = raf(function () {
      const y = window.scrollY || 0;
      if (nav) nav.classList.toggle('is-solid', y > 6);
      if (progress) {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.setProperty('--p', Math.min(1, y / max).toFixed(4));
      }
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function movePill(link, instant) {
    const pill = navState.pill;
    if (!pill || !link) return;
    if (instant) pill.style.transition = 'none';
    pill.style.width = link.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + link.offsetLeft + 'px)';
    if (instant) {
      void pill.offsetWidth;
      pill.style.transition = '';
      requestAnimationFrame(function () { pill.classList.add('is-ready'); });
    }
  }

  /* ---------- 3. 揭示动画 ---------- */
  let io = null;

  function getIO() {
    if (io) return io;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        el.classList.add('is-in');
        // 动画结束后摘掉 class：避免 fill 状态把 hover 的 transform 顶掉
        el.addEventListener('animationend', function () {
          el.classList.remove('reveal', 'is-in');
          el.style.removeProperty('--d');
        }, { once: true });
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    return io;
  }

  function animate(selector, step, ctx) {
    const els = typeof selector === 'string' ? $$(selector, ctx) : Array.prototype.slice.call(selector);
    if (reduceMotion.matches) return els;
    els.forEach(function (el, i) {
      el.style.setProperty('--d', Math.min(i, 10) * (step || 55) + 'ms');
      el.classList.add('reveal');
      getIO().observe(el);
    });
    return els;
  }

  /* ---------- 3b. 分段控件（滑动指示块） ---------- */
  function segmented(el, onChange) {
    if (!el) return null;
    const thumb = $('.seg-thumb', el);
    const items = $$('.seg-item', el);

    function sync() {
      const on = $('.seg-item.is-on', el);
      if (!on || !thumb) return;
      thumb.style.width = on.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + on.offsetLeft + 'px)';
      thumb.classList.add('is-ready');
    }

    function select(btn, silent) {
      if (!btn) return;
      items.forEach(function (x) {
        const on = x === btn;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      sync();
      if (!silent && onChange) onChange(btn);
    }

    items.forEach(function (b) {
      b.addEventListener('click', function () { select(b); });
    });

    requestAnimationFrame(sync);
    window.addEventListener('resize', raf(sync));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);

    return { sync: sync, select: select, items: items };
  }

  /* ---------- 4. 指针高光 ---------- */
  function initSpotlight() {
    const handler = raf(function (target, x, y) {
      const r = target.getBoundingClientRect();
      target.style.setProperty('--mx', (x - r.left) + 'px');
      target.style.setProperty('--my', (y - r.top) + 'px');
    });

    document.addEventListener('pointermove', function (e) {
      const el = e.target.closest && e.target.closest('.spot');
      if (!el) return;
      handler(el, e.clientX, e.clientY);
    }, { passive: true });
  }

  /* ---------- 5. Toast ---------- */
  function toastHost() {
    let host = $('.toast-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toast-host';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    return host;
  }

  function toast(msg, kind, ms) {
    const host = toastHost();
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    el.textContent = msg;
    host.appendChild(el);
    const life = ms || 2200;
    setTimeout(function () {
      el.classList.add('is-out');
      el.addEventListener('animationend', function () { el.remove(); });
      setTimeout(function () { el.remove(); }, 500);
    }, life);
    return el;
  }

  /* ---------- 6. Sheet ---------- */
  function sheet(el) {
    if (!el || el.__yySheet) return el && el.__yySheet;
    const api = { open: open, close: close, toggle: toggle, isOpen: isOpen };
    el.__yySheet = api;

    const backdrop = $('.sheet-backdrop', el);
    const panel = $('.sheet-panel', el);
    const grab = $('.sheet-grab', el);
    let lastFocus = null;
    let drag = null;

    if (backdrop) backdrop.addEventListener('click', close);
    $$('[data-sheet-close]', el).forEach(function (b) { b.addEventListener('click', close); });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
    });

    // 下拉关闭（移动端手感）
    if (grab && panel) {
      grab.addEventListener('pointerdown', function (e) {
        drag = { y: e.clientY, dy: 0 };
        el.classList.add('is-dragging');
        grab.setPointerCapture(e.pointerId);
      });
      grab.addEventListener('pointermove', function (e) {
        if (!drag) return;
        drag.dy = Math.max(0, e.clientY - drag.y);
        panel.style.transform = 'translateY(' + drag.dy + 'px)';
      });
      const end = function () {
        if (!drag) return;
        const dy = drag.dy;
        drag = null;
        el.classList.remove('is-dragging');
        panel.style.transform = '';
        if (dy > 90) close();
      };
      grab.addEventListener('pointerup', end);
      grab.addEventListener('pointercancel', end);
    }

    function isOpen() { return el.classList.contains('is-open'); }

    function open() {
      lastFocus = document.activeElement;
      lockScroll(true);
      el.classList.add('is-open');
      el.setAttribute('aria-hidden', 'false');
      const focusable = $('button, [href], input, select, textarea', panel || el);
      if (focusable && !reduceMotion.matches) setTimeout(function () { focusable.focus({ preventScroll: true }); }, 260);
      el.dispatchEvent(new CustomEvent('sheet:open'));
    }

    function close() {
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
      lockScroll(false);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      el.dispatchEvent(new CustomEvent('sheet:close'));
    }

    function toggle() { isOpen() ? close() : open(); }

    return api;
  }

  let lockCount = 0;
  function lockScroll(on) {
    lockCount = Math.max(0, lockCount + (on ? 1 : -1));
    if (on && lockCount === 1) {
      const sbw = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (sbw > 0) document.body.style.paddingRight = sbw + 'px';
    } else if (lockCount === 0) {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  }

  /* ---------- 7. 复制 ---------- */
  function copy(text, okMsg) {
    const done = function () { toast(okMsg || '已复制', 'ok'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else { fallback(); }

    function fallback() {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        done();
      } catch (e) { toast('复制失败，请手动选择', 'warn'); }
    }
  }

  function initCopyables() {
    $$('[data-copy]').forEach(function (el) {
      el.addEventListener('click', function () { copy(el.getAttribute('data-copy'), '邮箱已复制'); });
    });
  }

  /* ---------- 8. 浏览量 ---------- */
  const PV_BASE = 'https://abacus.jasoncameron.dev';
  const PV_NS = 'yan-yi';

  function ymd(d) {
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }

  function pvFetch(kind, key) {
    return fetch(PV_BASE + '/' + kind + '/' + PV_NS + '/' + encodeURIComponent(key), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (j) { return Number(j.value); });
  }

  function initPageviews() {
    const totalEl = $('#pvTotal');
    const todayEl = $('#pvToday');
    if (!totalEl && !todayEl) return;

    const dayKey = 'd-' + ymd(new Date());
    let cache = null;
    try { cache = JSON.parse(localStorage.getItem('pv') || 'null'); } catch (e) {}

    Promise.allSettled([pvFetch('hit', 'total'), pvFetch('hit', dayKey)]).then(function (res) {
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
        try { localStorage.setItem('pv', JSON.stringify({ total: total, today: today, day: dayKey })); } catch (e) {}
      }

      if (totalEl) totalEl.textContent = fmtNum(showTotal);
      if (todayEl) todayEl.textContent = fmtNum(showToday);

      if (offline) {
        $$('.foot-stats .stat i').forEach(function (el) {
          el.classList.add('off');
          el.title = '计数服务暂时不可用，显示的是上次结果';
        });
      }
    });
  }

  /* ---------- 9. 版本号 ---------- */
  function initMisc() {
    $$('#siteVersion').forEach(function (el) { el.textContent = VERSION; });
    $$('#year').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- 10. 页面间过渡（浏览器支持时） ---------- */
  function initPageTransition() {
    // 跨文档 View Transition 由 CSS 的 @view-transition 接管；
    // 这里只做「加载中」的轻量反馈，避免点击到渲染之间的空白感。
    window.addEventListener('pageshow', function () {
      root.classList.remove('is-leaving');
    });
  }

  /* ---------- 11. 墨点涟漪（点击空白处留下一枚小墨点） ---------- */
  function initInk() {
    if (reduceMotion.matches) return;
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    let last = 0;
    document.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      const now = performance.now();
      if (now - last < 90) return; // 连续点击时别太密
      last = now;
      const dot = document.createElement('i');
      dot.className = 'ink';
      dot.style.left = e.clientX + 'px';
      dot.style.top = e.clientY + 'px';
      document.body.appendChild(dot);
      dot.addEventListener('animationend', function () { dot.remove(); }, { once: true });
      setTimeout(function () { dot.remove(); }, 900);
    }, { passive: true });
  }

  /* ---------- 12. Logo 彩蛋：2 秒内连点 5 次「言」放一把彩带 ---------- */
  function confettiBurst(x, y) {
    if (reduceMotion.matches) return;
    const colors = ['#0A84FF', '#40C8E0', '#BF5AF2', '#FF375F', '#FF9F0A', '#30D158', '#FFD60A'];
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('i');
      p.className = 'confetti';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      const ang = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 150;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist * 0.75 - 46;
      const rot = (Math.random() - 0.5) * 640;
      const dur = 750 + Math.random() * 550;
      p.animate([
        { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) rotate(' + rot + 'deg)', opacity: 0 }
      ], { duration: dur, easing: 'cubic-bezier(.16,.84,.36,1)' }).onfinish = function () { p.remove(); };
      setTimeout(function () { p.remove(); }, dur + 120);
    }
  }

  function initBrandEgg() {
    const mark = $('.brand-mark');
    if (!mark) return;
    let clicks = [];
    mark.addEventListener('click', function () {
      const now = performance.now();
      clicks = clicks.filter(function (t) { return now - t < 2000; });
      clicks.push(now);
      if (clicks.length >= 5) {
        clicks = [];
        const r = mark.getBoundingClientRect();
        confettiBurst(r.left + r.width / 2, r.top + r.height / 2);
        toast('发现彩蛋：言一出没', 'ok');
      }
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    initTheme();
    initNav();
    initSpotlight();
    initCopyables();
    initPageviews();
    initMisc();
    initPageTransition();
    initInk();
    initBrandEgg();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  return {
    VERSION: VERSION,
    $: $,
    $$: $$,
    animate: animate,
    segmented: segmented,
    fmtNum: fmtNum,
    fmtBytes: fmtBytes,
    toast: toast,
    sheet: sheet,
    copy: copy,
    raf: raf,
    lockScroll: lockScroll,
    confettiBurst: confettiBurst,
    reduceMotion: reduceMotion
  };
})();
