/* =========================================================
   言一 · 天气
   首页天气模块（#wIcon）+ 天气页面（#wvBig）
   数据源：Open-Meteo（免费，无需 API Key）
   ========================================================= */
(function () {
  'use strict';

  const WMO = {
    0:  { t:'晴',           i:'☀️' },
    1:  { t:'晴间多云',     i:'🌤️' },
    2:  { t:'多云',         i:'⛅' },
    3:  { t:'阴',           i:'☁️' },
    45: { t:'雾',           i:'🌫️' },
    48: { t:'雾凇',         i:'🌫️' },
    51: { t:'小毛毛雨',     i:'🌦️' },
    53: { t:'毛毛雨',       i:'🌦️' },
    55: { t:'大毛毛雨',     i:'🌧️' },
    56: { t:'冻毛毛雨',     i:'🌨️' },
    57: { t:'冻毛毛雨',     i:'🌨️' },
    61: { t:'小雨',         i:'🌦️' },
    63: { t:'中雨',         i:'🌧️' },
    65: { t:'大雨',         i:'🌧️' },
    66: { t:'冻雨',         i:'🌨️' },
    67: { t:'冻雨',         i:'🌨️' },
    71: { t:'小雪',         i:'🌨️' },
    73: { t:'中雪',         i:'🌨️' },
    75: { t:'大雪',         i:'❄️' },
    77: { t:'雪粒',         i:'❄️' },
    80: { t:'小阵雨',       i:'🌦️' },
    81: { t:'阵雨',         i:'🌧️' },
    82: { t:'强阵雨',       i:'⛈️' },
    85: { t:'小阵雪',       i:'🌨️' },
    86: { t:'大阵雪',       i:'❄️' },
    95: { t:'雷阵雨',       i:'⛈️' },
    96: { t:'雷阵雨伴冰雹', i:'⛈️' },
    99: { t:'雷暴伴冰雹',   i:'⛈️' }
  };

  const WEEK = ['日','一','二','三','四','五','六'];

  const PRESETS = [
    { name:'北京', lat:39.9042, lon:116.4074 },
    { name:'上海', lat:31.2304, lon:121.4737 },
    { name:'杭州', lat:30.2741, lon:120.1551 },
    { name:'深圳', lat:22.5431, lon:114.0579 },
    { name:'广州', lat:23.1291, lon:113.2644 },
    { name:'成都', lat:30.5728, lon:104.0668 },
    { name:'西安', lat:34.3416, lon:108.9398 },
    { name:'武汉', lat:30.5928, lon:114.3055 },
    { name:'南京', lat:32.0603, lon:118.7969 },
    { name:'重庆', lat:29.5630, lon:106.5516 }
  ];

  const DEFAULT_PLACE = { name:'杭州', lat:30.2741, lon:120.1551 };
  const STORE_KEY = 'weather-place';

  let place = loadPlace();
  let lastData = null;

  function loadPlace() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (s && s.lat != null && s.lon != null) return s;
    } catch (e) {}
    return null;
  }

  function savePlace(p) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) {}
  }

  function info(code) { return WMO[code] || { t:'未知', i:'❔' }; }

  function fetchWeather(p) {
    const q = [
      'latitude=' + p.lat,
      'longitude=' + p.lon,
      'current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation',
      'hourly=temperature_2m,weather_code,precipitation_probability',
      'daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
      'timezone=auto',
      'forecast_days=7'
    ].join('&');

    return fetch('https://api.open-meteo.com/v1/forecast?' + q, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
  }

  /* =========================================================
     一、首页模块
     ========================================================= */
  const mod = {
    icon:  document.getElementById('wIcon'),
    main:  document.getElementById('wMain'),
    sub:   document.getElementById('wSub'),
    strip: document.getElementById('wStrip')
  };
  const hasMod = !!(mod.icon || mod.main);

  function renderModule(data, p) {
    if (!hasMod) return;
    const cur = data.current;
    const w = info(cur.weather_code);

    if (mod.icon) mod.icon.textContent = w.i;
    if (mod.main) mod.main.textContent = Math.round(cur.temperature_2m) + '°C ' + w.t;
    if (mod.sub) {
      mod.sub.textContent =
        p.name + ' · 体感 ' + Math.round(cur.apparent_temperature) + '°C · 湿度 ' +
        cur.relative_humidity_2m + '% · 风 ' + cur.wind_speed_10m + ' km/h';
    }

    if (mod.strip && data.daily) {
      const dd = data.daily;
      let html = '';
      for (let i = 0; i < Math.min(3, dd.time.length); i++) {
        const ww = info(dd.weather_code[i]);
        const label = i === 0 ? '今天' : (i === 1 ? '明天' : '后天');
        html += '<div class="w-day">'
              + '<span class="w-day-l">' + label + '</span>'
              + '<span class="w-day-i">' + ww.i + '</span>'
              + '<span class="w-day-t"><b>' + Math.round(dd.temperature_2m_max[i]) + '°</b>'
              + Math.round(dd.temperature_2m_min[i]) + '°</span>'
              + '</div>';
      }
      mod.strip.innerHTML = html;
    }
  }

  function renderModuleError() {
    if (!hasMod) return;
    if (mod.icon) mod.icon.textContent = '⚠️';
    if (mod.main) mod.main.textContent = '天气不可用';
    if (mod.sub)  mod.sub.textContent = '网络异常，点「详情」重试';
    if (mod.strip) mod.strip.innerHTML = '';
  }

  /* =========================================================
     二、详情页
     ========================================================= */
  const detail = {
    place:   document.getElementById('wvPlace'),
    big:     document.getElementById('wvBig'),
    icon:    document.getElementById('wvIcon'),
    desc:    document.getElementById('wvDesc'),
    facts:   document.getElementById('wvFacts'),
    hourly:  document.getElementById('wvHourly'),
    daily:   document.getElementById('wvDaily'),
    sun:     document.getElementById('wvSun'),
    chips:   document.getElementById('wvChips'),
    input:   document.getElementById('wvSearch'),
    results: document.getElementById('wvResults')
  };
  const hasDetail = !!detail.big;

  function fact(k, v) {
    return '<div class="fact"><b>' + v + '</b><span>' + k + '</span></div>';
  }

  function renderDetail(data, p) {
    if (!hasDetail) return;
    const cur = data.current;
    const w = info(cur.weather_code);

    detail.place.textContent = p.name;
    detail.icon.textContent = w.i;
    detail.big.textContent = Math.round(cur.temperature_2m) + '°';
    detail.desc.textContent = w.t;

    detail.facts.innerHTML =
      fact('体感', Math.round(cur.apparent_temperature) + '°') +
      fact('湿度', cur.relative_humidity_2m + '%') +
      fact('风速', cur.wind_speed_10m + ' km/h') +
      fact('降水', (cur.precipitation || 0) + ' mm');

    /* ---- 未来 24 小时 ---- */
    if (detail.hourly && data.hourly) {
      const hh = data.hourly;
      const now = new Date();
      let start = hh.time.findIndex(function (t) {
        const d = new Date(t);
        return d.getHours() === now.getHours() && d.getDate() === now.getDate();
      });
      if (start < 0) start = 0;

      let html = '';
      for (let i = start; i < Math.min(start + 24, hh.time.length); i++) {
        const t = new Date(hh.time[i]);
        const ww = info(hh.weather_code[i]);
        const isNow = i === start;
        html += '<div class="hr' + (isNow ? ' is-now' : '') + '">'
              + '<span class="hr-h">' + (isNow ? '现在' : t.getHours() + ' 时') + '</span>'
              + '<span class="hr-i">' + ww.i + '</span>'
              + '<span class="hr-t">' + Math.round(hh.temperature_2m[i]) + '°</span>'
              + '<span class="hr-p">' + (hh.precipitation_probability[i] != null
                                          ? hh.precipitation_probability[i] + '%' : '') + '</span>'
              + '</div>';
      }
      detail.hourly.innerHTML = html;
    }

    /* ---- 7 天 ---- */
    if (detail.daily && data.daily) {
      const dd = data.daily;
      const all = dd.temperature_2m_max.concat(dd.temperature_2m_min);
      const hi = Math.max.apply(null, all);
      const lo = Math.min.apply(null, all);
      const span = (hi - lo) || 1;

      let html = '';
      for (let i = 0; i < dd.time.length; i++) {
        const d = new Date(dd.time[i] + 'T00:00:00');
        const ww = info(dd.weather_code[i]);
        const label = i === 0 ? '今天' : (i === 1 ? '明天' : '周' + WEEK[d.getDay()]);
        const left  = ((dd.temperature_2m_min[i] - lo) / span) * 100;
        const width = ((dd.temperature_2m_max[i] - dd.temperature_2m_min[i]) / span) * 100;

        html += '<div class="dy">'
              + '<span class="dy-l">' + label + '</span>'
              + '<span class="dy-i" title="' + ww.t + '">' + ww.i + '</span>'
              + '<span class="dy-lo">' + Math.round(dd.temperature_2m_min[i]) + '°</span>'
              + '<span class="dy-bar"><i style="left:' + left + '%;width:' + width + '%"></i></span>'
              + '<span class="dy-hi">' + Math.round(dd.temperature_2m_max[i]) + '°</span>'
              + '<span class="dy-p">' + (dd.precipitation_probability_max[i] != null
                                          ? dd.precipitation_probability_max[i] + '%' : '') + '</span>'
              + '</div>';
      }
      detail.daily.innerHTML = html;

      if (detail.sun) {
        const s0 = dd.sunrise[0] ? dd.sunrise[0].slice(11, 16) : '--:--';
        const s1 = dd.sunset[0]  ? dd.sunset[0].slice(11, 16)  : '--:--';
        detail.sun.textContent = '日出 ' + s0 + ' · 日落 ' + s1;
      }
    }
  }

  /* ---- 预设城市 ---- */
  function buildChips() {
    if (!detail.chips) return;
    let html = '';
    PRESETS.forEach(function (p) {
      html += '<button class="chip" data-name="' + p.name + '" data-lat="' + p.lat +
              '" data-lon="' + p.lon + '">' + p.name + '</button>';
    });
    detail.chips.innerHTML = html;
  }

  function markActivePreset(name) {
    if (!detail.chips) return;
    detail.chips.querySelectorAll('.chip').forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.name === name);
    });
  }

  if (detail.chips) {
    detail.chips.addEventListener('click', function (e) {
      const b = e.target.closest('.chip');
      if (!b) return;
      load({ name: b.dataset.name, lat: Number(b.dataset.lat), lon: Number(b.dataset.lon) });
    });
  }

  /* ---- 搜索地区 ---- */
  let searchTimer = null;

  function doSearch(q) {
    if (!q) {
      if (detail.results) detail.results.innerHTML = '';
      return;
    }
    fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) +
          '&count=6&language=zh&format=json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!detail.results) return;
        const list = j.results || [];
        if (!list.length) {
          detail.results.innerHTML = '<p class="wv-empty">没找到这个地名</p>';
          return;
        }
        detail.results.innerHTML = list.map(function (r) {
          const sub = [r.admin1, r.country].filter(Boolean).join(' · ');
          return '<button class="wv-result" data-name="' + r.name + '" data-lat="' + r.latitude +
                 '" data-lon="' + r.longitude + '"><b>' + r.name + '</b><span>' + sub + '</span></button>';
        }).join('');
      })
      .catch(function () {
        if (detail.results) detail.results.innerHTML = '<p class="wv-empty">搜索失败，请稍后再试</p>';
      });
  }

  if (detail.input) {
    detail.input.addEventListener('input', function () {
      const q = detail.input.value.trim();
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { doSearch(q); }, 320);
    });
    detail.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (searchTimer) clearTimeout(searchTimer);
        doSearch(detail.input.value.trim());
      }
    });
  }

  if (detail.results) {
    detail.results.addEventListener('click', function (e) {
      const b = e.target.closest('.wv-result');
      if (!b) return;
      load({ name: b.dataset.name, lat: Number(b.dataset.lat), lon: Number(b.dataset.lon) });
      detail.results.innerHTML = '';
      detail.input.value = '';
    });
  }

  /* =========================================================
     三、加载
     ========================================================= */
  function load(p) {
    return fetchWeather(p)
      .then(function (data) {
        lastData = data;
        place = p;
        savePlace(p);
        renderModule(data, p);
        renderDetail(data, p);
        markActivePreset(p.name);
      })
      .catch(function () {
        renderModuleError();
      });
  }

  function boot() {
    if (!hasMod && !hasDetail) return;

    buildChips();

    // 详情页：优先用上次城市 / 默认城市（不用定位，避免每次弹权限）
    if (hasDetail && !hasMod) {
      load(place || DEFAULT_PLACE);
      setInterval(function () { load(place || DEFAULT_PLACE); }, 10 * 60 * 1000);
      return;
    }

    // 首页：首次访问尝试定位，失败回退
    if (!place && navigator.geolocation) {
      let settled = false;
      const timer = setTimeout(function () {
        if (!settled) { settled = true; load(DEFAULT_PLACE); }
      }, 4000);

      navigator.geolocation.getCurrentPosition(
        function (pos) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          load({ name:'当前位置', lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        function () {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          load(DEFAULT_PLACE);
        },
        { timeout: 3500, maximumAge: 600000 }
      );
    } else {
      load(place || DEFAULT_PLACE);
    }

    setInterval(function () { load(place || DEFAULT_PLACE); }, 10 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
