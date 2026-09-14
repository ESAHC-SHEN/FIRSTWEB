/* =========================================================
   言一 · 日历
   农历 / 干支 / 节气 / 节日 引擎
   + 首页日期模块（若存在 #modClock）
   + 日历页面（若存在 #calScroller）
   version beta 0.20
   ---------------------------------------------------------
   本次修正：
   1. 日 / 月 / 年 三级视图互相堆叠（hidden 被 flex 类覆盖）→ 用
      .cal-level[hidden]{display:none!important} + JS 显式切换。
   2. 首屏一次性渲染 73 个月 × 42 格导致卡顿 → 面板窗口化（只渲染
      可视区 ±2 个面板），农历换算加缓存，滚动同步改为 rAF。
   3. 选中日期时下方内容错位 → 详情卡改为浮层，不改变日历可用高度。
   ========================================================= */
(function () {
  'use strict';

  /* =========================================================
     一、农历数据表（1900 – 2100）
     低 4 位 = 闰月月份；0x10000 位 = 闰月天数；
     4–15 位 = 1–12 月大/小
     ========================================================= */
  const LUNAR_INFO = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d260,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a4d0,0x0d150,0x0f252,
    0x0d520
  ];

  const GAN    = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const ZHI    = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const ANIMAL = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
  const LMON   = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
  const WEEK   = ['日','一','二','三','四','五','六'];

  function leapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf; }
  function leapDays(y) {
    if (!leapMonth(y)) return 0;
    return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29;
  }
  function monthDays(y, m) {
    return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29;
  }
  function yearDays(y) {
    let sum = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) {
      sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
    }
    return sum + leapDays(y);
  }

  /* 逐年累计天数前缀和：公历 → 农历 由「循环 126 年」变成「二分查找」 */
  const YEAR_ACC = (function () {
    const arr = new Array(202);
    let acc = 0;
    for (let y = 1900; y <= 2100; y++) { arr[y - 1900] = acc; acc += yearDays(y); }
    arr[201] = acc;
    return arr;
  })();

  function lunarYearOfOffset(offset) {
    let lo = 0, hi = 200;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (YEAR_ACC[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    return 1900 + lo;
  }

  function computeSolarToLunar(y, m, d) {
    let offset = (Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000;
    if (offset < 0) return { year: 1900, month: 1, day: 1, isLeap: false };

    const lYear = lunarYearOfOffset(offset);
    offset -= YEAR_ACC[lYear - 1900];

    const leap = leapMonth(lYear);
    let isLeap = false;
    let i, temp = 0;

    for (i = 1; i < 13 && offset > 0; i++) {
      if (leap > 0 && i === leap + 1 && !isLeap) {
        --i;
        isLeap = true;
        temp = leapDays(lYear);
      } else {
        temp = monthDays(lYear, i);
      }
      if (isLeap && i === leap + 1) isLeap = false;
      offset -= temp;
    }

    if (offset === 0 && leap > 0 && i === leap + 1) {
      if (isLeap) { isLeap = false; } else { isLeap = true; --i; }
    }
    if (offset < 0) { offset += temp; --i; }

    return { year: lYear, month: i, day: offset + 1, isLeap: isLeap };
  }

  const lunarCache = new Map();
  function solarToLunar(y, m, d) {
    const key = y * 10000 + m * 100 + d;
    let v = lunarCache.get(key);
    if (v === undefined) {
      v = computeSolarToLunar(y, m, d);
      // 简易容量控制，避免长时间停留导致的无界增长
      if (lunarCache.size > 4000) lunarCache.clear();
      lunarCache.set(key, v);
    }
    return v;
  }

  function lunarDayName(d) {
    const pre = ['初','十','廿','三'];
    const num = ['一','二','三','四','五','六','七','八','九','十'];
    if (d === 10) return '初十';
    if (d === 20) return '二十';
    if (d === 30) return '三十';
    return pre[Math.floor((d - 1) / 10)] + num[(d - 1) % 10];
  }

  function ganzhi(y) {
    const i = ((y - 4) % 60 + 60) % 60;
    return {
      gan:    GAN[i % 10],
      zhi:    ZHI[i % 12],
      animal: ANIMAL[i % 12]
    };
  }

  /* =========================================================
     二、二十四节气（寿星公式）
     日 = [Y×0.2422 + C] − [Y/4]，Y = 年份后两位
     ========================================================= */
  const TERMS = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨',
                 '立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑',
                 '白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];

  const TERM_C = [5.4055,20.12,3.87,18.73,5.63,20.646,4.81,20.1,
                  5.52,21.04,5.678,21.37,7.108,22.83,7.5,23.13,
                  7.646,23.042,8.318,23.438,7.438,22.36,7.18,21.94];

  // 已知偏差可在此手改，例如 '2026-2': 4
  const TERM_FIX = {};

  function termDay(year, n) {
    const fix = TERM_FIX[year + '-' + n];
    if (fix) return fix;
    const yy = year % 100;
    return Math.floor(yy * 0.2422 + TERM_C[n]) - Math.floor(yy / 4);
  }

  function termOfDate(date) {
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    if (d === termDay(y, m * 2))     return TERMS[m * 2];
    if (d === termDay(y, m * 2 + 1)) return TERMS[m * 2 + 1];
    return '';
  }

  /* =========================================================
     三、节日
     农历和公历节日自动算。
     调休安排（放假 / 补班）每年由国务院公布，公式算不出来，
     需要精确显示时手填 HOLIDAY_PLAN。
     ========================================================= */
  const SOLAR_FEST = {
    '1-1':'元旦', '2-14':'情人节', '3-8':'妇女节', '3-12':'植树节',
    '4-1':'愚人节', '5-1':'劳动节', '5-4':'青年节', '6-1':'儿童节',
    '7-1':'建党节', '8-1':'建军节', '9-10':'教师节', '10-1':'国庆节',
    '11-8':'记者节', '12-4':'宪法日', '12-24':'平安夜', '12-25':'圣诞节'
  };

  const LUNAR_FEST = {
    '1-1':'春节', '1-15':'元宵节', '2-2':'龙抬头', '5-5':'端午节',
    '7-7':'七夕', '7-15':'中元节', '8-15':'中秋节', '9-9':'重阳节',
    '12-8':'腊八节', '12-23':'小年'
  };

  const HOLIDAY_PLAN = {
    // '2025-10-01': { name:'国庆节', off:true  },
    // '2025-10-11': { name:'补班',   off:false },
  };

  function pad(n) { return String(n).padStart(2, '0'); }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
  }

  const factsCache = new Map();

  /* 与「今天」无关的部分：缓存复用，避免重复换算 */
  function dayFacts(date) {
    const key = dayKey(date);
    let v = factsCache.get(key);
    if (v) return v;

    const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
    const l = solarToLunar(y, m + 1, d);
    const term = termOfDate(date);

    let fest = SOLAR_FEST[(m + 1) + '-' + d] || '';
    const lk = l.month + '-' + l.day;
    if (!l.isLeap && LUNAR_FEST[lk]) fest = LUNAR_FEST[lk];

    // 除夕：次日为正月初一
    const next = new Date(y, m, d + 1);
    const nl = solarToLunar(next.getFullYear(), next.getMonth() + 1, next.getDate());
    if (!nl.isLeap && nl.month === 1 && nl.day === 1) fest = '除夕';

    if (term === '清明') fest = '清明节';

    const plan = HOLIDAY_PLAN[key] || null;
    if (plan && plan.name) fest = plan.name;

    let label;
    if (fest) label = fest;
    else if (term) label = term;
    else if (l.day === 1) label = (l.isLeap ? '闰' : '') + LMON[l.month - 1] + '月';
    else label = lunarDayName(l.day);

    v = { lunar: l, term: term, fest: fest, plan: plan, label: label };
    if (factsCache.size > 4000) factsCache.clear();
    factsCache.set(key, v);
    return v;
  }

  function dayInfo(date, today) {
    const f = dayFacts(date);
    return {
      date: date,
      lunar: f.lunar,
      term: f.term,
      fest: f.fest,
      plan: f.plan,
      isToday: today ? sameDay(date, today) : false,
      label: f.label
    };
  }

  function nextTerm(today) {
    for (let k = 1; k <= 32; k++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + k);
      const t = termOfDate(d);
      if (t) return { name: t, days: k, date: d };
    }
    return null;
  }

  function nextFest(today) {
    for (let k = 1; k <= 200; k++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + k);
      const info = dayInfo(d, today);
      if (info.fest) return { name: info.fest, days: k, date: d };
    }
    return null;
  }

  function dayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
  }
  function daysInYear(y) {
    return ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365;
  }
  function isoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  /* =========================================================
     四、首页日期模块（#modClock 存在时启用）
     ========================================================= */
  function initHome() {
    const el = {
      clock: document.getElementById('modClock'),
      date:  document.getElementById('modDate'),
      lunar: document.getElementById('modLunar'),
      tags:  document.getElementById('modTags')
    };
    if (!el.clock && !el.date) return;

    let lastDay = '';

    function render() {
      const now = new Date();

      if (el.clock) {
        el.clock.textContent =
          pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
      }

      // 日期 / 农历 / 标签 每天只需重算一次
      const k = dayKey(now);
      if (k === lastDay) return;
      lastDay = k;

      const gz = ganzhi(now.getFullYear());
      const l = solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());

      if (el.date) {
        el.date.textContent =
          now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日' +
          ' 星期' + WEEK[now.getDay()];
      }

      if (el.lunar) {
        el.lunar.textContent =
          '农历' + gz.gan + gz.zhi + '年 ' +
          (l.isLeap ? '闰' : '') + LMON[l.month - 1] + '月' +
          (l.day === 1 ? '' : lunarDayName(l.day)) +
          ' · ' + gz.animal + '年';
      }

      if (el.tags) {
        const cur = dayInfo(now, now);
        const nt = nextTerm(now);
        const nf = nextFest(now);
        const parts = [];

        if (cur.fest) parts.push('<span class="tag tag--fest">今天 ' + cur.fest + '</span>');
        else if (cur.term) parts.push('<span class="tag tag--2">今天 ' + cur.term + '</span>');

        if (nt) parts.push('<span class="tag tag--2">' + nt.name + ' · ' + nt.days + ' 天后</span>');
        if (nf) parts.push('<span class="tag tag--fest">' + nf.name + ' · ' + nf.days + ' 天后</span>');

        el.tags.innerHTML = parts.join('');
      }
    }

    render();
    setInterval(render, 1000);
  }

  /* =========================================================
     五、日历页面（#calScroller 存在时启用）
     ========================================================= */
  function initCalendarPage() {
    const scroller   = document.getElementById('calScroller');
    const levelDay   = document.getElementById('calLevelDay');
    const levelMon   = document.getElementById('calLevelMonth');
    const levelYear  = document.getElementById('calLevelYear');
    const monthsWrap = document.getElementById('calMonths');
    const yearsWrap  = document.getElementById('calYears');
    const titleBtn   = document.getElementById('calTitle');
    const todayBtn   = document.getElementById('calToday');
    const segWrap    = document.getElementById('calSeg');
    const segThumb   = segWrap ? segWrap.querySelector('.seg-thumb') : null;
    const segItems   = segWrap ? Array.prototype.slice.call(segWrap.querySelectorAll('.seg-item')) : [];
    const detail     = document.getElementById('calDetail');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const baseYear  = today.getFullYear();
    const baseMonth = today.getMonth();

    const BACK = 60, FWD = 60;          // 前后各 5 年
    const YEARS = { from: 1901, to: 2100 };
    const RENDER_RADIUS = 2;            // 只渲染可视面板 ±2

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let level = 'day';
    let monthKeys = [];
    let slots = [];
    let htmlCache = new Map();
    let activeIndex = BACK;
    let activeYear = baseYear;
    let activeMonth = baseMonth;
    let selected = null;
    let drag = null;
    let dragged = false;
    let settleTimer = null;
    let tweenId = 0;

    /* ---------- 月份窗口 ---------- */
    function buildMonthKeys(cy, cm) {
      monthKeys = [];
      for (let i = -BACK; i <= FWD; i++) {
        const d = new Date(cy, cm + i, 1);
        monthKeys.push({ y: d.getFullYear(), m: d.getMonth() });
      }
    }

    function indexOfMonth(y, m) {
      for (let i = 0; i < monthKeys.length; i++) {
        if (monthKeys[i].y === y && monthKeys[i].m === m) return i;
      }
      return -1;
    }

    /* ---------- 面板构造（带缓存） ---------- */
    function panelHTML(y, m) {
      const key = y + '-' + m;
      let html = htmlCache.get(key);
      if (html) return html;

      const startPad = new Date(y, m, 1).getDay();
      const dim = new Date(y, m + 1, 0).getDate();

      const out = [];
      for (let i = 0; i < startPad; i++) out.push('<span class="cal-cell is-out"></span>');

      for (let d = 1; d <= dim; d++) {
        const date = new Date(y, m, d);
        const info = dayInfo(date, today);
        const wd = date.getDay();
        const cls = ['cal-cell'];
        if (info.isToday) cls.push('is-today');
        if (wd === 0 || wd === 6) cls.push('is-weekend');
        if (info.fest) cls.push('is-fest');
        else if (info.term) cls.push('is-term');
        if (info.plan && info.plan.off === false) cls.push('is-work');

        out.push(
          '<div class="' + cls.join(' ') + '" data-date="' + dayKey(date) + '"' +
          ' role="gridcell" tabindex="-1" aria-label="' + (m + 1) + ' 月 ' + d + ' 日 ' + info.label + '">' +
          '<b>' + d + '</b><i>' + info.label + '</i></div>'
        );
      }

      const total = startPad + dim;
      for (let i = total; i < 42; i++) out.push('<span class="cal-cell is-out"></span>');

      html = out.join('');
      if (htmlCache.size > 400) htmlCache.clear();
      htmlCache.set(key, html);
      return html;
    }

    function buildSlots() {
      scroller.textContent = '';
      const frag = document.createDocumentFragment();
      slots = [];
      for (let i = 0; i < monthKeys.length; i++) {
        const d = document.createElement('div');
        d.className = 'cal-panel';
        d.dataset.i = String(i);
        frag.appendChild(d);
        slots.push(d);
      }
      scroller.appendChild(frag);
      windowFrom = windowTo = -1;
    }

    /* 目标月份不在当前 ±5 年窗口里时，以它为中心重建窗口 */
    function recenterTo(y, m) {
      buildMonthKeys(y, m);
      buildSlots();
      htmlCache = new Map();
      activeIndex = BACK;
      activeYear = y;
      activeMonth = m;
      const h = panelHeight();
      if (h) scroller.scrollTop = BACK * h;
      renderWindow(BACK);
    }

    let windowFrom = -1, windowTo = -1;

    /* 只填充可视窗口，其余面板保持空白 —— 73 个月也只需要 ~210 个节点 */
    function renderWindow(idx) {
      const from = Math.max(0, idx - RENDER_RADIUS);
      const to = Math.min(slots.length - 1, idx + RENDER_RADIUS);
      if (from === windowFrom && to === windowTo) return;

      for (let i = windowFrom; i <= windowTo; i++) {
        if (i < 0 || i >= slots.length) continue;
        if (i >= from && i <= to) continue;
        const s = slots[i];
        if (s.dataset.filled) { s.innerHTML = ''; s.dataset.filled = ''; }
      }

      for (let i = from; i <= to; i++) {
        const s = slots[i];
        if (s.dataset.filled) continue;
        s.innerHTML = panelHTML(monthKeys[i].y, monthKeys[i].m);
        s.dataset.filled = '1';
      }

      windowFrom = from;
      windowTo = to;
      paintSelection(false);
    }

    /* 选中态不写进面板缓存里，避免复用旧 HTML 时串味 */
    function paintSelection(pop) {
      const prev = scroller.querySelector('.cal-cell.is-selected');
      if (prev) prev.classList.remove('is-selected');
      if (!selected) return;
      const cell = scroller.querySelector('.cal-cell[data-date="' + dayKey(selected) + '"]');
      if (!cell) return;
      cell.classList.add('is-selected');
      if (pop) {
        cell.classList.remove('pop');
        void cell.offsetWidth;
        cell.classList.add('pop');
      }
    }

    function panelHeight() { return scroller.clientHeight || 0; }

    /* ---------- 标题 / 分段控件 ---------- */
    function setTitle(t) { if (titleBtn) titleBtn.textContent = t; }

    function syncSeg() {
      segItems.forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.level === level);
        b.setAttribute('aria-selected', b.dataset.level === level ? 'true' : 'false');
      });
      if (segThumb && segWrap) {
        const on = segWrap.querySelector('.seg-item.is-on');
        if (on) {
          segThumb.style.width = on.offsetWidth + 'px';
          segThumb.style.transform = 'translateX(' + on.offsetLeft + 'px)';
          segThumb.classList.add('is-ready');
        }
      }
    }

    function syncTitle() {
      if (level === 'day') setTitle(activeYear + ' 年 ' + (activeMonth + 1) + ' 月');
      else if (level === 'month') setTitle(activeYear + ' 年');
      else setTitle('选择年份');
    }

    /* ---------- 滚动定位 ---------- */
    function cancelTween() { tweenId++; }

    function tweenTo(target, duration) {
      cancelTween();
      const id = tweenId;
      const start = scroller.scrollTop;
      const dist = target - start;
      if (Math.abs(dist) < 1) { scroller.scrollTop = target; return; }
      const t0 = performance.now();
      const dur = duration || Math.min(560, Math.max(260, Math.abs(dist) * 0.55));

      (function step(now) {
        if (id !== tweenId) return;
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        scroller.scrollTop = start + dist * e;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }

    function withSnapOff(fn) {
      scroller.style.scrollSnapType = 'none';
      clearTimeout(settleTimer);
      fn();
    }
    function restoreSnapSoon() {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(function () { scroller.style.scrollSnapType = ''; }, 90);
    }

    function goToIndex(i, smooth) {
      i = Math.max(0, Math.min(slots.length - 1, i));
      activeIndex = i;
      renderWindow(i);
      syncFromIndex();

      const h = panelHeight();
      if (!h) return;                       // 视图不可见时，切回日视图会重新定位
      const top = i * h;

      if (smooth && !reduceMotion.matches) {
        withSnapOff(function () { tweenTo(top); });
        restoreSnapSoon();
      } else {
        cancelTween();
        scroller.scrollTop = top;
      }
    }

    function syncFromIndex() {
      const k = monthKeys[activeIndex];
      if (!k) return;
      activeYear = k.y;
      activeMonth = k.m;
      if (level === 'day') syncTitle();
    }

    /* ---------- 三级视图 ---------- */
    function setLevel(next, opts) {
      opts = opts || {};
      if (level === next && !opts.force) return;
      level = next;

      levelDay.hidden  = next !== 'day';
      levelMon.hidden  = next !== 'month';
      levelYear.hidden = next !== 'year';

      if (detail && next !== 'day') hideDetail();

      if (next === 'day') {
        // 无论从哪条路径回到日视图，索引都必须跟着 activeYear / activeMonth 走
        const i = indexOfMonth(activeYear, activeMonth);
        if (i < 0) recenterTo(activeYear, activeMonth);
        else {
          activeIndex = i;
          renderWindow(i);
        }
        syncTitle();
        requestAnimationFrame(function () {
          layoutDay();
          revealLevel(levelDay);
        });
      } else if (next === 'month') {
        syncTitle();
        buildMonthLevel();
        revealLevel(levelMon);
      } else {
        syncTitle();
        buildYearLevel();
        revealLevel(levelYear);
      }
      syncSeg();
    }

    function revealLevel(el) {
      if (!el || reduceMotion.matches) return;
      el.classList.remove('anim-in');
      void el.offsetWidth;
      el.classList.add('anim-in');
    }

    /* 视图切换后重新计算滚动位置（隐藏时 clientHeight 为 0） */
    function layoutDay() {
      const h = panelHeight();
      if (!h || level !== 'day') return;
      cancelTween();
      scroller.scrollTop = activeIndex * h;
      renderWindow(activeIndex);
    }

    function buildMonthLevel() {
      let html = '';
      for (let m = 0; m < 12; m++) {
        html += '<button class="month-cell' + (m === activeMonth ? ' is-on' : '') +
                '" type="button" data-month="' + m + '" style="--i:' + m + '">' +
                '<span class="month-cell-t">' + (m + 1) + ' 月</span>' +
                miniMonth(activeYear, m) +
                '</button>';
      }
      monthsWrap.innerHTML = html;
      requestAnimationFrame(function () {
        const on = monthsWrap.querySelector('.month-cell.is-on');
        if (on) {
          monthsWrap.scrollTop = Math.max(0, on.offsetTop - monthsWrap.clientHeight / 2 + on.offsetHeight / 2);
        }
      });
    }

    function miniMonth(y, m) {
      const startPad = new Date(y, m, 1).getDay();
      const dim = new Date(y, m + 1, 0).getDate();
      let s = '<span class="mini-grid">';
      for (let i = 0; i < startPad; i++) s += '<span class="mini-d is-out"></span>';
      for (let d = 1; d <= dim; d++) {
        const date = new Date(y, m, d);
        const info = dayInfo(date, today);
        const cls = ['mini-d'];
        if (info.fest) cls.push('is-fest');
        else if (info.term) cls.push('is-term');
        if (info.isToday) cls.push('is-today');
        if (selected && sameDay(date, selected)) cls.push('is-selected');
        s += '<span class="' + cls.join(' ') + '">' + d + '</span>';
      }
      return s + '</span>';
    }

    function buildYearLevel() {
      let html = '';
      for (let y = YEARS.from; y <= YEARS.to; y++) {
        html += '<button class="year-cell' + (y === activeYear ? ' is-on' : '') +
                '" type="button" data-year="' + y + '">' + y + '</button>';
      }
      yearsWrap.innerHTML = html;
      // 手动定位，避免 scrollIntoView 把整页也带走
      requestAnimationFrame(function () {
        const on = yearsWrap.querySelector('.year-cell.is-on');
        if (on) yearsWrap.scrollTop = Math.max(0, on.offsetTop - yearsWrap.clientHeight / 2 + on.offsetHeight / 2);
      });
    }

    /* ---------- 选中日期 ---------- */
    function selectDate(date, opts) {
      opts = opts || {};
      selected = date;

      // 跨月：先切到对应月份
      let target = indexOfMonth(date.getFullYear(), date.getMonth());
      if (target < 0) {
        recenterTo(date.getFullYear(), date.getMonth());
        target = BACK;
      }

      if (target !== activeIndex) {
        activeIndex = target;
        activeYear = date.getFullYear();
        activeMonth = date.getMonth();
        const h = panelHeight();
        if (h) {
          cancelTween();
          scroller.scrollTop = target * h;
          restoreSnapSoon();
        }
      }

      renderWindow(activeIndex);
      syncTitle();
      syncSeg();
      paintSelection(!opts.silent);
      renderDetail(date);
    }

    function factRow(label, value, cls) {
      return '<div class="cd-fact' + (cls ? ' ' + cls : '') + '">' +
             '<b>' + value + '</b><span>' + label + '</span></div>';
    }

    function renderDetail(date) {
      if (!detail) return;
      const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
      const f = dayFacts(date);
      const gz = ganzhi(y);
      const diff = Math.round((date - today) / 86400000);

      const el = {
        day:   document.getElementById('cdDay'),
        full:  document.getElementById('cdFull'),
        lunar: document.getElementById('cdLunar'),
        chips: document.getElementById('cdChips'),
        facts: document.getElementById('cdFacts')
      };
      if (!el.full) return;

      if (el.day) el.day.textContent = String(d);
      el.full.textContent = y + ' 年 ' + (m + 1) + ' 月 ' + d + ' 日 · 星期' + WEEK[date.getDay()];
      if (el.lunar) {
        el.lunar.textContent =
          gz.gan + gz.zhi + gz.animal + '年 ' +
          (f.lunar.isLeap ? '闰' : '') + LMON[f.lunar.month - 1] + '月' + lunarDayName(f.lunar.day);
      }

      if (el.chips) {
        const chips = [];
        if (diff === 0) chips.push('<span class="tag">今天</span>');
        else if (diff > 0) chips.push('<span class="tag tag--gray">' + diff + ' 天后</span>');
        else chips.push('<span class="tag tag--gray">' + (-diff) + ' 天前</span>');
        if (f.fest) chips.push('<span class="tag tag--fest">' + f.fest + '</span>');
        if (f.term) chips.push('<span class="tag tag--2">' + f.term + '</span>');
        if (f.plan && f.plan.off === false) chips.push('<span class="tag tag--3">补班</span>');
        el.chips.innerHTML = chips.join('');
      }

      if (el.facts) {
        el.facts.innerHTML =
          factRow('农历', (f.lunar.isLeap ? '闰' : '') + LMON[f.lunar.month - 1] + '月' + lunarDayName(f.lunar.day)) +
          factRow('干支', gz.gan + gz.zhi + ' · ' + gz.animal) +
          factRow('今年第', dayOfYear(date) + ' / ' + daysInYear(y) + ' 天') +
          factRow('第几周', '第 ' + isoWeek(date) + ' 周');
      }

      detail.classList.add('is-open');
      detail.setAttribute('aria-hidden', 'false');
    }

    function hideDetail() {
      if (!detail) return;
      detail.classList.remove('is-open');
      detail.setAttribute('aria-hidden', 'true');
      selected = null;
      paintSelection(false);
    }

    /* ---------- 事件 ---------- */
    if (titleBtn) {
      titleBtn.addEventListener('click', function () {
        if (level === 'day') setLevel('month');
        else if (level === 'month') setLevel('year');
      });
    }

    segItems.forEach(function (btn) {
      btn.addEventListener('click', function () { setLevel(btn.dataset.level); });
    });

    monthsWrap.addEventListener('click', function (e) {
      const btn = e.target.closest('.month-cell');
      if (!btn) return;
      activeMonth = Number(btn.dataset.month);
      setLevel('day');
    });

    yearsWrap.addEventListener('click', function (e) {
      const btn = e.target.closest('.year-cell');
      if (!btn) return;
      const y = Number(btn.dataset.year);
      if (indexOfMonth(y, activeMonth) < 0) recenterTo(y, activeMonth);
      else activeYear = y;
      setLevel('month');
    });

    if (todayBtn) {
      todayBtn.addEventListener('click', function () {
        activeYear = baseYear;
        activeMonth = baseMonth;
        setLevel('day', { force: true });
        requestAnimationFrame(function () {
          goToIndex(indexOfMonth(baseYear, baseMonth) >= 0 ? indexOfMonth(baseYear, baseMonth) : BACK, true);
          selectDate(today);
        });
      });
    }

    if (detail) {
      const closeBtn = document.getElementById('cdClose');
      if (closeBtn) closeBtn.addEventListener('click', hideDetail);
      const prevBtn = document.getElementById('cdPrev');
      const nextBtn = document.getElementById('cdNext');
      const curBtn  = document.getElementById('cdToday');
      if (prevBtn) prevBtn.addEventListener('click', function () {
        if (selected) selectDate(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() - 1));
      });
      if (nextBtn) nextBtn.addEventListener('click', function () {
        if (selected) selectDate(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + 1));
      });
      if (curBtn) curBtn.addEventListener('click', function () {
        setLevel('day', { force: true });
        requestAnimationFrame(function () { goToIndex(BACK, true); });
        selectDate(today);
      });
    }

    /* 点击日期 */
    scroller.addEventListener('click', function (e) {
      if (dragged) return;
      const cell = e.target.closest('.cal-cell');
      if (!cell || cell.classList.contains('is-out') || !cell.dataset.date) return;
      const parts = cell.dataset.date.split('-').map(Number);
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      // 再点一次同一天 = 收起详情
      if (selected && sameDay(date, selected) && detail && detail.classList.contains('is-open')) {
        hideDetail();
        return;
      }
      selectDate(date);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && detail && detail.classList.contains('is-open')) hideDetail();
    });

    /* 鼠标拖动翻月（带惯性） */
    scroller.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      cancelTween();
      drag = { y: e.clientY, top: scroller.scrollTop, moved: false, last: e.clientY, time: performance.now(), v: 0 };
      dragged = false;
      scroller.classList.add('is-dragging');
      scroller.style.scrollSnapType = 'none';
      try { scroller.setPointerCapture(e.pointerId); } catch (err) {}
    });

    scroller.addEventListener('pointermove', function (e) {
      if (!drag) return;
      const dy = e.clientY - drag.y;
      if (Math.abs(dy) > 4) { drag.moved = true; dragged = true; }
      if (!drag.moved) return;

      const now = performance.now();
      const dt = Math.max(1, now - drag.time);
      drag.v = (e.clientY - drag.last) / dt;
      drag.last = e.clientY;
      drag.time = now;
      scroller.scrollTop = drag.top - dy;
    });

    function endDrag() {
      if (!drag) return;
      const d = drag;
      drag = null;
      scroller.classList.remove('is-dragging');

      if (!d.moved) { scroller.style.scrollSnapType = ''; return; }

      const h = panelHeight() || 1;
      const projection = d.v * 160;
      const raw = (scroller.scrollTop - projection) / h;
      let idx = Math.round(raw);
      idx = Math.max(0, Math.min(slots.length - 1, idx));

      const top = idx * h;
      const dist = Math.abs(top - scroller.scrollTop);
      tweenTo(top, Math.min(620, Math.max(220, dist * 0.6)));
      activeIndex = idx;
      renderWindow(idx);
      const k = monthKeys[idx];
      if (k) { activeYear = k.y; activeMonth = k.m; syncTitle(); }
      restoreSnapSoon();
      setTimeout(function () { dragged = false; }, 380);
    }

    scroller.addEventListener('pointerup', endDrag);
    scroller.addEventListener('pointercancel', endDrag);
    scroller.addEventListener('pointerleave', function () { if (drag) endDrag(); });

    /* 触摸 / 滚轮：让原生滚动 + snap 处理，只在结束时同步一次 */
    scroller.addEventListener('touchstart', cancelTween, { passive: true });
    scroller.addEventListener('wheel', function () { cancelTween(); restoreSnapSoon(); }, { passive: true });

    const onScroll = window.YY && window.YY.raf ? window.YY.raf(syncScroll) : syncScroll;
    function syncScroll() {
      if (drag || level !== 'day') return;
      const h = panelHeight();
      if (!h) return;
      const idx = Math.max(0, Math.min(slots.length - 1, Math.round(scroller.scrollTop / h)));
      if (idx !== activeIndex) {
        activeIndex = idx;
        renderWindow(idx);
        syncFromIndex();
      } else {
        renderWindow(idx);
      }
    }
    scroller.addEventListener('scroll', onScroll, { passive: true });

    /* 键盘 */
    scroller.setAttribute('tabindex', '0');
    scroller.addEventListener('keydown', function (e) {
      const map = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1, PageUp: -1, PageDown: 1 };
      if (e.key in map) {
        e.preventDefault();
        goToIndex(activeIndex + map[e.key], true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToIndex(0, true);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToIndex(slots.length - 1, true);
      }
    });

    const onResize = (window.YY && window.YY.raf ? window.YY.raf(layoutDay) : layoutDay);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', function () { setTimeout(layoutDay, 240); });

    /* ---------- 初始化 ---------- */
    buildMonthKeys(baseYear, baseMonth);
    buildSlots();
    requestAnimationFrame(function () {
      layoutDay();
      syncTitle();
      syncSeg();
      // 首次进入：今天带一圈选中态，但不弹详情
      selected = today;
      paintSelection(false);
      if (!reduceMotion.matches) levelDay.classList.add('anim-in');
    });
  }

  /* =========================================================
     六、启动
     ========================================================= */
  initHome();
  if (document.getElementById('calScroller')) initCalendarPage();

  // 供外部使用
  window.YYCal = {
    solarToLunar: solarToLunar,
    termOfDate: termOfDate,
    dayInfo: dayInfo,
    ganzhi: ganzhi,
    lunarDayName: lunarDayName
  };

})();
