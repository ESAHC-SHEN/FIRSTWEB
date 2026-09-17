/* =========================================================
   言一 · 娱乐页
   一言 / 毒鸡汤 / 白噪音（WebAudio 本地合成）/ 摸鱼四件套
   version beta 0.30
   ========================================================= */
(function () {
  'use strict';

  var YY = window.YY;
  var $ = YY.$;

  document.addEventListener('DOMContentLoaded', function () {
    initQuote();
    initNoise();
    initToys();
    YY.animate('.play > *', 70);
  });

  /* =========================================================
     一、一言 / 毒鸡汤
     ========================================================= */
  function initQuote() {
    var card = $('#quoteCard');
    if (!card) return;

    var textEl = $('#quoteText');
    var fromEl = $('#quoteFrom');
    var nextBtn = $('#quoteNext');
    var copyBtn = $('#quoteCopy');
    var kind = 'hitokoto';

    // API 不可用时的本地兜底
    var FALLBACK = [
      { t: '凡是过往，皆为序章。', f: '莎士比亚《暴风雨》' },
      { t: '岁月不居，时节如流。', f: '孔融' },
      { t: '总之岁月漫长，然而值得等待。', f: '村上春树' },
      { t: '且视他人之疑目如盏盏鬼火，大胆地去走你的夜路。', f: '史铁生' },
      { t: '于浩歌狂热之际中寒，于天上看见深渊。', f: '鲁迅' },
      { t: '你要做一个不动声色的大人了。', f: '村上春树' },
      { t: '凌晨四点醒来，发现海棠花未眠。', f: '川端康成' },
      { t: '落在一个人一生中的雪，我们不能全部看见。', f: '刘亮程' },
      { t: '生活最佳状态是冷冷清清地风风火火。', f: '木心' },
      { t: '明确的爱，直接的厌恶，真诚的喜欢。', f: '黄永玉' }
    ];

    var SOUP = [
      '你以为有钱人很快乐吗？他们的快乐你根本想象不到。',
      '别灰心，人生就是这样起起落落落落落落落的。',
      '今天解决不了的事情，别着急，因为明天也解决不了。',
      '只要坚持，没有什么事情是搞不砸的。',
      '机会是留给有准备的人，但机会往往不认识你。',
      '有时候你不努力一下，都不知道什么叫绝望。',
      '失败并不可怕，可怕的是你还相信这句话。',
      '努力不一定成功，但不努力一定很舒服。',
      '你全力做到的最好，可能还不如别人的随便搞搞。',
      '世上无难事，只要肯放弃。',
      '比你优秀的人还在努力，那你努力还有什么用？',
      '人生就像蒲公英，看似自由，却身不由己——而且大概率落在水泥地上。',
      '每天叫醒我的不是梦想，是穷。',
      '书山有路勤为径，怪你没有富贵命。',
      '条条大路通罗马，可有人就住在罗马。'
    ];

    var lastIdx = -1;

    function setQuote(t, f) {
      card.classList.add('is-switching');
      setTimeout(function () {
        textEl.textContent = t;
        fromEl.textContent = f || '';
        card.classList.remove('is-switching');
      }, 240);
    }

    function pickLocal(list) {
      var i;
      do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === lastIdx);
      lastIdx = i;
      return list[i];
    }

    function next() {
      if (kind === 'soup') {
        setQuote(pickLocal(SOUP), '毒鸡汤');
        return;
      }
      nextBtn.disabled = true;
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 3600);
      fetch('https://v1.hitokoto.cn/?c=d&c=i&c=k', { signal: ctrl.signal, cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (j) {
          var from = j.from_who ? (j.from_who + '《' + j.from + '》') : (j.from ? '《' + j.from + '》' : '一言');
          setQuote(j.hitokoto, from);
        })
        .catch(function () {
          var q = pickLocal(FALLBACK);
          setQuote(q.t, q.f);
        })
        .finally(function () {
          clearTimeout(timer);
          nextBtn.disabled = false;
        });
    }

    YY.segmented($('#quoteSeg'), function (btn) {
      kind = btn.dataset.kind;
      next();
    });

    nextBtn.addEventListener('click', next);
    copyBtn.addEventListener('click', function () {
      var s = textEl.textContent + (fromEl.textContent ? ' —— ' + fromEl.textContent : '');
      YY.copy(s, '句子已复制');
    });

    next();
  }

  /* =========================================================
     二、白噪音（WebAudio 合成，无音频文件）
     ========================================================= */
  function initNoise() {
    var card = $('#noiseCard');
    if (!card) return;

    var btn = $('#noiseBtn');
    var vol = $('#noiseVol');
    var stateEl = $('#noiseState');

    var ctx = null;
    var source = null;
    var gain = null;
    var filter = null;
    var playing = false;
    var type = 'brown';

    var NAMES = { white: '白噪', pink: '粉噪', brown: '棕噪', rain: '雨声' };

    function makeBuffer(kind) {
      var len = ctx.sampleRate * 3;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      var i;
      if (kind === 'white') {
        for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } else if (kind === 'pink') {
        // Paul Kellet 粉噪近似
        var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (i = 0; i < len; i++) {
          var w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.0168980;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        }
      } else {
        // 棕噪 / 雨声底：布朗运动随机游走
        var last = 0;
        for (i = 0; i < len; i++) {
          var ww = Math.random() * 2 - 1;
          last = (last + 0.02 * ww) / 1.02;
          d[i] = last * 3.2;
        }
      }
      return buf;
    }

    function build() {
      if (source) { try { source.stop(); } catch (e) {} source.disconnect(); }
      source = ctx.createBufferSource();
      source.buffer = makeBuffer(type);
      source.loop = true;
      filter = ctx.createBiquadFilter();
      if (type === 'rain') {
        filter.type = 'bandpass';
        filter.frequency.value = 1100;
        filter.Q.value = 0.55;
      } else {
        filter.type = 'lowpass';
        filter.frequency.value = type === 'brown' ? 2400 : 20000;
      }
      source.connect(filter).connect(gain);
      source.start();
    }

    function ensureCtx() {
      if (ctx) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      gain = ctx.createGain();
      gain.gain.value = volume();
      gain.connect(ctx.destination);
    }

    function volume() {
      var v = Number(vol.value) / 100;
      return v * v * 0.9; // 感知音量近似
    }

    function play() {
      ensureCtx();
      if (ctx.state === 'suspended') ctx.resume();
      build();
      playing = true;
      card.classList.add('is-on');
      stateEl.textContent = NAMES[type] + ' · 播放中';
    }

    function stop() {
      playing = false;
      card.classList.remove('is-on');
      stateEl.textContent = '本地合成 · 不需要网络';
      if (ctx) ctx.suspend();
    }

    btn.addEventListener('click', function () {
      playing ? stop() : play();
    });

    YY.segmented($('#noiseSeg'), function (b) {
      type = b.dataset.noise;
      if (playing) { build(); stateEl.textContent = NAMES[type] + ' · 播放中'; }
    });

    function syncVolUI() {
      vol.style.setProperty('--fill-pct', vol.value + '%');
      if (gain) gain.gain.setTargetAtTime(volume(), ctx.currentTime, 0.05);
    }
    vol.addEventListener('input', syncVolUI);
    syncVolUI();
  }

  /* =========================================================
     三、摸鱼四件套
     ========================================================= */
  function initToys() {
    /* ---- 抛硬币 ---- */
    var coin = $('#coin');
    var coinBtn = $('#coinBtn');
    if (coin && coinBtn) {
      coinBtn.addEventListener('click', function () {
        coinBtn.disabled = true;
        coin.classList.remove('is-flip');
        void coin.offsetWidth;
        coin.classList.add('is-flip');
        setTimeout(function () {
          var head = Math.random() < 0.5;
          coin.textContent = head ? '正' : '反';
        }, 620);
        setTimeout(function () { coinBtn.disabled = false; }, 920);
      });
    }

    /* ---- 骰子 ---- */
    var die = $('#die');
    var dieBtn = $('#dieBtn');
    var FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    if (die && dieBtn) {
      dieBtn.addEventListener('click', function () {
        dieBtn.disabled = true;
        die.classList.remove('is-roll');
        void die.offsetWidth;
        die.classList.add('is-roll');
        var spins = 0;
        var roll = setInterval(function () {
          die.textContent = FACES[Math.floor(Math.random() * 6)];
          if (++spins >= 7) {
            clearInterval(roll);
            die.textContent = FACES[Math.floor(Math.random() * 6)];
            dieBtn.disabled = false;
          }
        }, 82);
      });
    }

    /* ---- 决定器 ---- */
    var opts = $('#pickOpts');
    var pickBtn = $('#pickBtn');
    var pickResult = $('#pickResult');
    if (opts && pickBtn && pickResult) {
      pickBtn.addEventListener('click', function () {
        var list = opts.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!list.length) { YY.toast('先写几个选项，一行一个', 'warn'); return; }
        pickBtn.disabled = true;
        pickResult.classList.add('is-spin');
        var n = 0;
        var spin = setInterval(function () {
          pickResult.textContent = list[Math.floor(Math.random() * list.length)];
          if (++n >= 12) {
            clearInterval(spin);
            var win = list[Math.floor(Math.random() * list.length)];
            pickResult.textContent = '就「' + win + '」了';
            pickResult.classList.remove('is-spin');
            pickBtn.disabled = false;
          }
        }, 68);
      });
    }

    /* ---- 答案之书 ---- */
    var bookBtn = $('#bookBtn');
    var bookResult = $('#bookResult');
    var ANSWERS = [
      '去做吧，别犹豫。', '再等等，时机未到。', '换个方向试试。',
      '先睡一觉，明天再想。', '答案是肯定的。', '暂时放下它。',
      '问问你身边最懂你的人。', '别想太多，先迈出一小步。',
      '这件事值得坚持。', '适可而止。', '跟着直觉走。',
      '现在不是最好的时候。', '大胆一点。', '保守一点。',
      '你其实已经知道答案了。', '顺其自然。', '再确认一次细节。',
      '会有好结果的。', '别急，慢慢来。', '就是现在。'
    ];
    if (bookBtn && bookResult) {
      var lastA = -1;
      bookBtn.addEventListener('click', function () {
        var i;
        do { i = Math.floor(Math.random() * ANSWERS.length); } while (i === lastA);
        lastA = i;
        bookResult.style.opacity = '0';
        setTimeout(function () {
          bookResult.textContent = '「' + ANSWERS[i] + '」';
          bookResult.style.transition = 'opacity .3s';
          bookResult.style.opacity = '1';
        }, 200);
      });
    }
  }

})();
