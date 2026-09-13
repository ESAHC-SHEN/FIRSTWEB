/* =========================================================
   言一 · 日历
   农历 / 干支 / 节气 / 节日 引擎  +  首页日期模块  +  日历视图
   ========================================================= */
(function () {
  'use strict';

  const YY = window.YY;

  /* =========================================================
     一、农历数据表（1900 – 2100，标准表）
     每一年一个十六进制数：
       低 4 位  = 闰月月份（0 = 无闰月）
       0x10000 位 = 闰月天数（1 = 30 天 / 0 = 29 天）
       第 4–15 位  = 1–12 月是大月（30 天）还是小月（29 天）
     ========================================================= */
  const LUNAR_INFO = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x122b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
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

  /* ---- 公历 → 农历 ---- */
  function solarToLunar(y, m, d) {
    let offset = (Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000;
    let i, temp = 0;

    for (i = 1900; i < 2101 && offset > 0; i++) {
      temp = yearDays(i);
      offset -= temp;
    }
    if (offset < 0) { offset += temp; i--; }

    const lYear = i;
    const leap = leapMonth(lYear);
    let isLeap = false;

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

  function lunarDayName(d) {
    const pre = ['初','十','廿','三'];
    const num = ['一','二','三','四','五','六','七','八','九','十'];
    if (d === 10) return '初十';
    if (d === 20) return '二十';
    if (d === 30) return '三十';
    return pre[Math.floor((d - 1) / 10)] + num[(d - 1) % 10];
  }

  function ganzhi(y) {
    const i = (y - 4) % 60;
    return { gan: GAN[((i % 10) + 10) % 10], zhi: ZHI[((i % 12) + 12) % 12], animal: ANIMAL[((i % 12) + 12) % 12] };
  }

  /* =========================================================
     二、二十四节气
     用「寿星公式」：日 = [Y×0.2422 + C] − [Y/4]
     Y = 年份后两位，C 为 21 世纪的常数。
     已知少数年份有 ±1 天偏差，如有需要可在 TERM_FIX 里手改。
     ========================================================= */
  const TERMS = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨',
                 '立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑',
                 '白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];

  const TERM_C = [5.4055,20.12,3.87,18.73,5.63,20.646,4.81,20.1,
                  5.52,21.04,5.678,21.37,7.108,22.83,7.5,23.13,
                  7.646,23.042,8.318,23.438,7.438,22.36,7.18,21.94];

  // 例外修正：{ '年份-节气序号': 正确日 }
  const TERM_FIX = {
    // '2026-2': 4,
  };

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
     ▸ 公历固定节日 + 农历节日都自动算。
     ▸ 「调休安排」（哪天放假、哪天补班）每年由国务院公布，
       公式算不出来。要精确显示放假/补班，请在下面 HOLIDAY_PLAN
       里手填，格式：'2025-10-01': { name:'国庆节', off:true }
       不填也不影响节日名和放假日期提示。
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
    // '2025-10-01': { name:'国庆节', off:true },
    // '2025-10-11': { name:'补班', off:false },
  };

  function pad(n) { return String(n).padStart(2, '0'); }
  function key(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  /* ---- 一天的完整信息 ---- */
  function dayInfo(date, today) {
    const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
    const l = solarToLunar(y, m + 1, d);
    const term = termOfDate(date);

    let fest = SOLAR_FEST[(m + 1) + '-' + d] || '';
    const lk = l.month + '-' + l.day;
    if (!l.isLeap && LUNAR_FEST[lk]) fest = LUNAR_FEST[lk];

    // 除夕：明天是正月初一
    const next = new Date(y, m, d + 1);
    const nl = solarToLunar(next.getFullYear(), next.getMonth() + 1, next.getDate());
    if (!nl.isLeap && nl.month === 1 && nl.day === 1) fest = '除夕';

    // 清明是节气，也是法定节日
    if (term === '清明') fest = '清明节';

    const plan = HOLIDAY_PLAN[key(date)] || null;
    if (plan && plan.name) fest = plan.name;

    let label;
    if (fest) label = fest;
    else if (term) label = term;
    else if (l.day === 1) label = (l.isLeap ? '闰' : '') + LMON[l.month - 1] + '月';
    else label = lunarDayName(l.day);

    return {
      date: date,
      lunar: l,
      term: term,
      fest: fest,
      plan: plan,
      isToday: today ? sameDay(date, today) : false,
      label: label
    };
  }

  /* ---- 找下一个节气 / 下一个节日 ---- */
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

  /* =========================================================
     四、首页日期模块
     ========================================================= */
  const el = {
    clock:  document.getElementById('modClock'),
    date:   document.getElementById('modDate'),
    lunar:  document.getElementById('modLunar'),
    tags:   document.getElementById('modTags')
  };

  function renderToday() {
    const now = new Date();
    if (el.clock) {
      el.clock.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    }

    if (!el.date && !el.lunar) return;

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
        (l.day === 1 ? '' : '') +
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

  /* =========================================================
     五、日历视图：日 → 月 → 年 三级缩放 + 上下拖动
     ========================================================= */
  const scroller = document.getElementById('calScroller');
  const levelDay = document.getElementById('calLevelDay');
  const levelMon = document.getElementById('calLevelMonth');
  const levelYear = document.getElementById('calLevelYear');
  const monthsWrap = document.getElementById('calMonths');
  const yearsWrap = document.getElementById('calYears');
  const titleBtn = document.getElementById('calTitle');

  if (!scroller || !titleBtn) return;

  const today = new Date();
  const baseYear = today.getFullYear();
  const baseMonth = today.getMonth();

  const BACK = 36;
  const FWD  = 36;

  let level = 'day';
  let activeYear = baseYear;
  let activeMonth = baseMonth;
  let activeIndex = BACK;
  let snapTimer = null;
  let dragged = false;

  const monthKeys = [];
  for (let i = -BACK; i <= FWD; i++) {
    const d = new Date(baseYear, baseMonth + i, 1);
    monthKeys.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  /* ---- 生成一个月面板 ---- */
  function buildPanel(y, m) {
    const first = new Date(y, m, 1);
    const padCount = first.getDay();
    const dim = new Date(y, m + 1, 0).getDate();

    let html = '';
    for (let i = 0; i < padCount; i++) html += '<span class="cal-cell is-out"></span>';

    for (let d = 1; d <= dim; d++) {
      const date = new Date(y, m, d);
      const info = dayInfo(date, today);
      const cls = ['cal-cell'];
      if (info.isToday) cls.push('is-today');
      if (date.getDay() === 0 || date.getDay() === 6) cls.push('is-weekend');
      if (info.fest) cls.push('is-fest');
      else if (info.term) cls.push('is-term');
      if (info.plan && info.plan.off === false) cls.push('is-work');
      html += '<div class="' + cls.join(' ') + '" title="' + info.label + '">'
            + '<b>' + d + '</b><i>' + info.label + '</i></div>';
    }

    const total = padCount + dim;
    for (let i = total; i < 42; i++) html += '<span class="cal-cell is-out"></span>';

    const panel = document.createElement('div');
    panel.className = 'cal-panel';
    panel.dataset.year = y;
    panel.dataset.month = m;
    panel.innerHTML = html;
    return panel;
  }

  /* ---- 生成缩略月（月视图用） ---- */
  function miniMonth(y, m) {
    const first = new Date(y, m, 1);
    const padCount = first.getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    let s = '<span class="mini-grid">';
    for (let i = 0; i < padCount; i++) s += '<span class="mini-d is-out"></span>';
    for (let d = 1; d <= dim; d++) {
      const date = new Date(y, m, d);
      const info = dayInfo(date, today);
      const cls = ['mini-d'];
      if (info.fest) cls.push('is-fest');
      else if (info.term) cls.push('is-term');
      if (info.isToday) cls.push('is-today');
      s += '<span class="' + cls.join(' ') + '">' + d + '</span>';
    }
    return s + '</span>';
  }

  /* ---- 构建整个日视图 ---- */
  (function buildDayLevel() {
    const frag = document.createDocumentFragment();
    monthKeys.forEach(function (k) {
      frag.appendChild(buildPanel(k.year, k.month));
    });
    scroller.appendChild(frag);
  })();

  function panelHeight() {
    return scroller.clientHeight || 1;
  }

  function panelAt(i) {
    return scroller.children[i];
  }

  function scrollToIndex(i, smooth) {
    const max = scroller.children.length - 1;
    i = Math.max(0, Math.min(max, i));
    activeIndex = i;
    const top = i * panelHeight();
    if (smooth && !prefersReduced()) scroller.scrollTo({ top: top, behavior: 'smooth' });
    else scroller.scrollTop = top;
    syncFromIndex();
  }

  function prefersReduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function syncFromIndex() {
    const p = panelAt(activeIndex);
    if (!p) return;
    activeYear = Number(p.dataset.year);
    activeMonth = Number(p.dataset.month);
    if (level === 'day') setTitle(activeYear + ' 年 ' + (activeMonth + 1) + ' 月');
  }

  function indexOfMonth(y, m) {
    for (let i = 0; i < monthKeys.length; i++) {
      if (monthKeys[i].year === y && monthKeys[i].month === m) return i;
    }
    return -1;
  }

  /* ---- 标题 ---- */
  function setTitle(t) { titleBtn.textContent = t; }

  /* ---- 级别切换 ---- */
  function setLevel(next) {
    level = next;
    levelDay.hidden = next !== 'day';
    levelMon.hidden = next !== 'month';
    levelYear.hidden = next !== 'year';

    if (next === 'day') {
      setTitle(activeYear + ' 年 ' + (activeMonth + 1) + ' 月');
      requestAnimationFrame(function () {
        const i = indexOfMonth(activeYear, activeMonth);
        if (i >= 0) scrollToIndex(i, false);
      });
    } else if (next === 'month') {
      setTitle(activeYear + ' 年');
      buildMonthLevel();
      const on = monthsWrap.querySelector('.month-cell.is-on');
      if (on) requestAnimationFrame(function () { on.scrollIntoView({ block: 'nearest' }); });
    } else {
      setTitle('选择年份');
      buildYearLevel();
      const on = yearsWrap.querySelector('.year-cell.is-on');
      if (on) requestAnimationFrame(function () { on.scrollIntoView({ block: 'center' }); });
    }
  }

  function buildMonthLevel() {
    let html = '';
    for (let m = 0; m < 12; m++) {
      html += '<button class="month-cell' + (m === activeMonth ? ' is-on' : '') + '" data-month="' + m + '">'
            + '<span class="month-cell-t">' + (m + 1) + ' 月</span>'
            + miniMonth(activeYear, m)
            + '</button>';
    }
    monthsWrap.innerHTML = html;
  }

  function buildYearLevel() {
    let html = '';
    for (let y = 1901; y <= 2100; y++) {
      html += '<button class="year-cell' + (y === activeYear ? ' is-on' : '') + '" data-year="' + y + '">' + y + '</button>';
    }
    yearsWrap.innerHTML = html;
  }

  /* ---- 标题点击：逐级放大 ---- */
  titleBtn.addEventListener('click', function () {
    if (level === 'day') setLevel('month');
    else if (level === 'month') setLevel('year');
  });

  /* ---- 月视图点击 ---- */
  monthsWrap.addEventListener('click', function (e) {
    const btn = e.target.closest('.month-cell');
    if (!btn) return;
    activeMonth = Number(btn.dataset.month);
    setLevel('day');
  });

  /* ---- 年视图点击 ---- */
  yearsWrap.addEventListener('click', function (e) {
    const btn = e.target.closest('.year-cell');
    if (!btn) return;
    activeYear = Number(btn.dataset.year);
    setLevel('month');
  });

  /* ---- 回到今天 ---- */
  const todayBtn = document.getElementById('calToday');
  if (todayBtn) {
    todayBtn.addEventListener('click', function () {
      activeYear = baseYear;
      activeMonth = baseMonth;
      setLevel('day');
    });
  }

  /* ---- 返回 ---- */
  const backBtn = document.getElementById('calBack');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      if (level === 'day') YY.closeView();
      else if (level === 'month') setLevel('day');
      else setLevel('month');
    });
  }

  /* ---- 鼠标拖动翻月 ---- */
  let drag = null;

  scroller.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { y: e.clientY, top: scroller.scrollTop, moved: false };
    dragged = false;
    scroller.classList.add('is-dragging');
    scroller.style.scrollSnapType = 'none';
    try { scroller.setPointerCapture(e.pointerId); } catch (err) {}
  });

  scroller.addEventListener('pointermove', function (e) {
    if (!drag) return;
    const dy = e.clientY - drag.y;
    if (Math.abs(dy) > 3) { drag.moved = true; dragged = true; }
    if (drag.moved) scroller.scrollTop = drag.top - dy;
  });

  function endDrag() {
    if (!drag) return;
    const wasMoved = drag.moved;
    drag = null;
    scroller.classList.remove('is-dragging');
    scroller.style.scrollSnapType = '';
    if (wasMoved) {
      const h = panelHeight();
      const idx = Math.round(scroller.scrollTop / h);
      scrollToIndex(idx, true);
      setTimeout(function () { dragged = false; }, 400);
    }
  }

  scroller.addEventListener('pointerup', endDrag);
  scroller.addEventListener('pointercancel', endDrag);
  scroller.addEventListener('pointerleave', function () { if (drag) endDrag(); });

  /* ---- 触摸/滚轮滚动时同步标题（防抖） ---- */
  scroller.addEventListener('scroll', function () {
    if (drag) return;
    if (snapTimer) clearTimeout(snapTimer);
    snapTimer = setTimeout(function () {
      const h = panelHeight();
      const idx = Math.round(scroller.scrollTop / h);
      if (idx !== activeIndex) {
        activeIndex = Math.max(0, Math.min(scroller.children.length - 1, idx));
        syncFromIndex();
      }
    }, 90);
  }, { passive: true });

  /* ---- 窗口尺寸变化时重新对齐 ---- */
  window.addEventListener('resize', function () {
    if (level !== 'day') return;
    scroller.scrollTop = activeIndex * panelHeight();
  });

  /* ---- 打开视图时对齐到当前月 ---- */
  YY.onViewOpen('calendar', function () {
    level = 'day';
    levelDay.hidden = false;
    levelMon.hidden = true;
    levelYear.hidden = true;
    requestAnimationFrame(function () {
      const i = indexOfMonth(activeYear, activeMonth);
      scrollToIndex(i >= 0 ? i : BACK, false);
    });
  });

  /* =========================================================
     六、启动时钟
     ========================================================= */
  renderToday();
  setInterval(renderToday, 1000);

})();
