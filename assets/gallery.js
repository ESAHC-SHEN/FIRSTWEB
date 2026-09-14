/* =========================================================
   言一 · 相片馆
   1. 缩略图模糊占位 + 解码后淡入
   2. 灯箱：从小图几何放大、滑动翻页、相邻大图预加载
   3. 照片压缩：全本地 canvas 处理，可调质量 / 长边 / 格式
   version beta 0.20
   ========================================================= */
(function () {
  'use strict';

  var YY = window.YY;
  var $ = YY.$, $$ = YY.$$;

  document.addEventListener('DOMContentLoaded', function () {

    /* =========================================================
       一、缩略图：解码完成后再淡入
       ========================================================= */
    var figures = $$('.pic');

    figures.forEach(function (fig) {
      var img = fig.querySelector('img');
      if (!img) return;

      var mark = function () { fig.classList.add('is-loaded'); };

      if (img.complete && img.naturalWidth) mark();
      else img.addEventListener('load', mark, { once: true });

      img.addEventListener('error', function () {
        var btn = fig.querySelector('.pic-btn');
        fig.classList.add('is-loaded');
        if (!btn) return;
        btn.style.cssText = 'display:grid;place-items:center;color:var(--text-2);font-size:13px;text-align:center;padding:20px';
        btn.textContent = '图片加载失败：请检查 photos/ 下的文件';
      }, { once: true });
    });

    /* =========================================================
       二、灯箱
       ========================================================= */
    var photos = figures.map(function (fig) {
      var img = fig.querySelector('img');
      var cap = fig.querySelector('.pic-cap');
      var placeEl = cap ? cap.querySelector('.place') : null;
      var title = '';
      if (cap) {
        var clone = cap.cloneNode(true);
        var p = clone.querySelector('.place');
        if (p) p.remove();
        title = clone.textContent.trim();
      }
      return {
        thumb: fig.dataset.thumb || (img && img.getAttribute('src')) || '',
        view: fig.dataset.view || fig.dataset.thumb || (img && img.getAttribute('src')) || '',
        original: fig.dataset.original || '',
        origSize: Number(fig.dataset.origSize || 0),
        viewSize: Number(fig.dataset.viewSize || 0),
        dim: fig.dataset.dim || '',
        alt: (img && img.alt) || title,
        title: title,
        place: placeEl ? placeEl.textContent.trim() : '',
        tile: img
      };
    });

    var lb = $('#lightbox');
    var lbImg = $('#lbImg');

    if (lb && lbImg && photos.length) {
      initLightbox();
    }

    initZip();
    YY.animate('.pic', 45);
    YY.animate('.gs', 60);

    function initLightbox() {
      var lbStage = $('#lbStage');
      var lbCap = $('#lbCap');
      var lbCount = $('#lbCount');
      var lbSize = $('#lbSize');
      var lbSep = $('#lbSep');
      var lbSep2 = $('#lbSep2');
      var lbLoader = $('#lbLoader');
      var lbClose = $('#lbClose');
      var lbPrev = $('#lbPrev');
      var lbNext = $('#lbNext');

      var current = 0;
      var isOpenFlag = false;
      var preloaded = {};
      var liveAnim = null;
      var reduce = YY.reduceMotion.matches;
      var lockCount = 0;

      if (photos.length <= 1) {
        lbPrev.style.display = 'none';
        lbNext.style.display = 'none';
      }

      function preload(i) {
        var p = photos[(i % photos.length + photos.length) % photos.length];
        if (!p || !p.view || preloaded[p.view]) return;
        preloaded[p.view] = true;
        var im = new Image();
        im.decoding = 'async';
        im.src = p.view;
      }

      function fillInfo(i) {
        var p = photos[i];
        lbCap.textContent = [p.title, p.place].filter(Boolean).join(' · ');
        lbCount.textContent = photos.length > 1 ? (i + 1) + ' / ' + photos.length : '';

        var sizeText = '';
        if (p.origSize && p.viewSize) sizeText = YY.fmtBytes(p.origSize) + ' → ' + YY.fmtBytes(p.viewSize);
        else if (p.viewSize) sizeText = YY.fmtBytes(p.viewSize);

        lbSize.textContent = sizeText;
        lbSize.style.display = sizeText ? '' : 'none';
        lbSep.style.display = sizeText ? '' : 'none';
        lbSep2.style.display = lbCount.textContent ? '' : 'none';
      }

      function show(i) {
        current = (i % photos.length + photos.length) % photos.length;
        var p = photos[current];

        lbLoader.classList.add('is-on');
        fillInfo(current);

        // 先用已缓存的小图顶上，再换成大图 —— 打开几乎没有等待
        lbImg.classList.add('is-loading');
        lbImg.alt = p.alt;
        if (lbImg.getAttribute('src') !== p.thumb) lbImg.src = p.thumb;

        var full = new Image();
        full.decoding = 'async';
        full.onload = function () {
          if (photos[current] !== p) return;
          lbImg.src = p.view;
          lbImg.classList.remove('is-loading');
          lbLoader.classList.remove('is-on');
        };
        full.onerror = function () {
          lbImg.classList.remove('is-loading');
          lbLoader.classList.remove('is-on');
          YY.toast('大图加载失败', 'warn');
        };
        full.src = p.view;

        preload(current + 1);
        preload(current - 1);
      }

      function geometry(from, to) {
        var sx = from.width / to.width;
        var sy = from.height / to.height;
        var dx = (from.left + from.width / 2) - (to.left + to.width / 2);
        var dy = (from.top + from.height / 2) - (to.top + to.height / 2);
        return { sx: sx, sy: sy, dx: dx, dy: dy };
      }

      function visible(rect) {
        return rect && rect.width > 4 && rect.height > 4 &&
               rect.bottom > 0 && rect.top < window.innerHeight &&
               rect.right > 0 && rect.left < window.innerWidth;
      }

      function zoomFrom(rect) {
        if (reduce || !visible(rect)) return;
        var to = lbImg.getBoundingClientRect();
        if (!to.width || !to.height) return;
        var m = geometry(rect, to);

        if (liveAnim) liveAnim.cancel();
        liveAnim = lbImg.animate([
          { transform: 'translate(' + m.dx + 'px,' + m.dy + 'px) scale(' + m.sx + ',' + m.sy + ')', opacity: .9, borderRadius: '16px' },
          { transform: 'translate(0,0) scale(1,1)', opacity: 1, borderRadius: '14px' }
        ], { duration: 440, easing: 'cubic-bezier(.22,1,.36,1)' });
      }

      function open(i, tile) {
        if (isOpenFlag) { show(i); return; }
        isOpenFlag = true;

        var rect = tile ? tile.getBoundingClientRect() : null;

        lbImg.src = '';
        show(i);
        lb.classList.add('is-open');
        lb.setAttribute('aria-hidden', 'false');
        YY.lockScroll(true);
        lockCount++;

        var run = function () { zoomFrom(rect); };
        if (lbImg.decode) {
          lbImg.decode().then(function () { requestAnimationFrame(run); }, function () { requestAnimationFrame(run); });
        } else {
          requestAnimationFrame(function () { requestAnimationFrame(run); });
        }
      }

      function close() {
        if (!isOpenFlag) return;
        isOpenFlag = false;

        var tile = photos[current] && photos[current].tile;
        var rect = tile ? tile.getBoundingClientRect() : null;

        var finish = function () {
          lb.classList.remove('is-open');
          lb.setAttribute('aria-hidden', 'true');
          lbImg.src = '';
          lbStage.style.transform = '';
          lbStage.style.opacity = '';
        };

        if (!reduce && visible(rect) && lbImg.getBoundingClientRect().width) {
          var to = lbImg.getBoundingClientRect();
          var m = geometry(rect, to);
          if (liveAnim) liveAnim.cancel();
          var a = lbImg.animate([
            { transform: 'translate(0,0) scale(1,1)', opacity: 1 },
            { transform: 'translate(' + m.dx + 'px,' + m.dy + 'px) scale(' + m.sx + ',' + m.sy + ')', opacity: .3 }
          ], { duration: 320, easing: 'cubic-bezier(.4,0,1,.6)' });
          lb.classList.remove('is-open');
          a.finished.then(finish, finish);
        } else {
          lb.classList.remove('is-open');
          finish();
        }

        if (lockCount > 0) { lockCount--; YY.lockScroll(false); }
      }

      function turn(dir) {
        if (photos.length < 2) return;
        show(current + dir);
        if (reduce) return;
        if (liveAnim) liveAnim.cancel();
        liveAnim = lbImg.animate([
          { opacity: 0, transform: 'translateX(' + (dir * 28) + 'px) scale(.985)' },
          { opacity: 1, transform: 'none' }
        ], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
      }

      figures.forEach(function (fig, i) {
        var btn = fig.querySelector('.pic-btn') || fig;
        btn.addEventListener('click', function () { open(i, fig.querySelector('img')); });
        // 悬停即预取大图：点开的一瞬间就是清晰的
        fig.addEventListener('pointerenter', function () { preload(i); }, { passive: true });
      });

      lbClose.addEventListener('click', close);
      lbPrev.addEventListener('click', function (e) { e.stopPropagation(); turn(-1); });
      lbNext.addEventListener('click', function (e) { e.stopPropagation(); turn(1); });
      lb.addEventListener('click', function (e) {
        if (e.target === lb || e.target === lbStage) close();
      });

      document.addEventListener('keydown', function (e) {
        if (!isOpenFlag) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') turn(-1);
        else if (e.key === 'ArrowRight') turn(1);
      });

      /* 手势：左右翻页 / 下滑关闭 */
      var g = null;
      lbStage.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        g = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: performance.now(), axis: '' };
        lbStage.style.transition = 'none';
      });

      lbStage.addEventListener('pointermove', function (e) {
        if (!g) return;
        g.dx = e.clientX - g.x;
        g.dy = e.clientY - g.y;
        if (!g.axis && (Math.abs(g.dx) > 7 || Math.abs(g.dy) > 7)) {
          g.axis = Math.abs(g.dy) > Math.abs(g.dx) ? 'y' : 'x';
        }
        if (g.axis === 'y') {
          lbStage.style.transform = 'translateY(' + Math.max(0, g.dy) + 'px)';
          lbStage.style.opacity = String(Math.max(.3, 1 - Math.abs(g.dy) / 420));
        } else if (g.axis === 'x' && photos.length > 1) {
          lbStage.style.transform = 'translateX(' + (g.dx * .34) + 'px)';
        }
      });

      function endGesture() {
        if (!g) return;
        var dx = g.dx, dy = g.dy, axis = g.axis, dt = Math.max(1, performance.now() - g.t);
        g = null;
        lbStage.style.transition = 'transform .34s cubic-bezier(.22,1,.36,1), opacity .3s';
        lbStage.style.transform = '';
        lbStage.style.opacity = '';

        if (axis === 'y' && dy > 104) { close(); return; }
        if (photos.length > 1 && axis === 'x' && Math.abs(dx) > 52) { turn(dx < 0 ? 1 : -1); return; }
        if (photos.length > 1 && axis === 'x' && Math.abs(dx) > 14 && dt < 240) { turn(dx < 0 ? 1 : -1); }
      }

      lbStage.addEventListener('pointerup', endGesture);
      lbStage.addEventListener('pointercancel', endGesture);
      lbStage.addEventListener('pointerleave', endGesture);
    }

    /* =========================================================
       三、照片压缩
       ========================================================= */
    function initZip() {
      var sheetEl = $('#zipSheet');
      var openBtn = $('#zipOpen');
      if (!sheetEl || !openBtn) return;

      var sheet = YY.sheet(sheetEl);
      var drop = $('#zipDrop');
      var input = $('#zipInput');
      var pick = $('#zipPick');
      var list = $('#zipList');
      var sum = $('#zipSum');
      var quality = $('#zipQuality');
      var qualityVal = $('#zipQualityVal');
      var edgeVal = $('#zipEdgeVal');
      var fmtVal = $('#zipFmtVal');

      var opts = { quality: 78, edge: 1920, fmt: 'auto' };
      var results = [];
      var busy = false;

      var WEBP_OK = (function () {
        try {
          var c = document.createElement('canvas');
          c.width = c.height = 1;
          return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        } catch (e) { return false; }
      })();

      function fmtLabel() {
        if (opts.fmt === 'auto') return WEBP_OK ? 'WebP' : 'JPEG';
        return opts.fmt === 'image/webp' ? 'WebP' : 'JPEG';
      }

      /* ---- 分段控件 ---- */
      var segEdge = YY.segmented($('#zipEdge'), function (btn) {
        opts.edge = Number(btn.dataset.edge);
        edgeVal.textContent = opts.edge ? opts.edge + ' px' : '原始尺寸';
      });
      YY.segmented($('#zipFmt'), function (btn) {
        opts.fmt = btn.dataset.fmt;
        fmtVal.textContent = fmtLabel();
      });
      fmtVal.textContent = fmtLabel();

      function paintSlider() {
        var pct = (opts.quality - 40) / (95 - 40) * 100;
        quality.style.setProperty('--fill-pct', Math.max(0, Math.min(100, pct)).toFixed(1) + '%');
        qualityVal.textContent = opts.quality + '%';
      }
      paintSlider();

      quality.addEventListener('input', function () {
        opts.quality = Number(quality.value);
        paintSlider();
        $$('.presets .chip').forEach(function (c) { c.classList.remove('is-on'); });
      });

      /* ---- 预设 ---- */
      $$('.presets .chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          $$('.presets .chip').forEach(function (c) { c.classList.remove('is-on'); });
          chip.classList.add('is-on');
          var key = chip.dataset.preset;
          var preset = key === 'sharp' ? { q: 90, e: 2560 }
                     : key === 'small' ? { q: 62, e: 1280 }
                     : { q: 78, e: 1920 };
          applyOpts(preset.q, preset.e);
        });
      });

      function applyOpts(q, e) {
        opts.quality = q;
        opts.edge = e;
        quality.value = String(q);
        paintSlider();
        edgeVal.textContent = e ? e + ' px' : '原始尺寸';
        if (segEdge) {
          var target = null;
          segEdge.items.forEach(function (b) { if (Number(b.dataset.edge) === e) target = b; });
          if (target) segEdge.select(target, true);
        }
      }

      /* ---- 打开 / 关闭 ---- */
      openBtn.addEventListener('click', function () { sheet.open(); });

      /* ---- 选择文件 ---- */
      pick.addEventListener('click', function (e) { e.stopPropagation(); input.click(); });
      drop.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        input.click();
      });
      input.addEventListener('change', function () {
        if (input.files && input.files.length) handleFiles(input.files);
        input.value = '';
      });

      ['dragenter', 'dragover'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
          e.preventDefault();
          drop.classList.add('is-over');
        });
      });
      drop.addEventListener('dragleave', function (e) {
        e.preventDefault();
        if (!drop.contains(e.relatedTarget)) drop.classList.remove('is-over');
      });
      drop.addEventListener('drop', function (e) {
        e.preventDefault();
        drop.classList.remove('is-over');
        var files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length) handleFiles(files);
      });
      // 拖到页面别处时，别让浏览器直接打开图片
      window.addEventListener('dragover', function (e) { e.preventDefault(); });
      window.addEventListener('drop', function (e) { e.preventDefault(); });

      /* ---- 压缩核心 ---- */
      function resolveType() {
        if (opts.fmt !== 'auto') return opts.fmt;
        return WEBP_OK ? 'image/webp' : 'image/jpeg';
      }

      function extOf(type) {
        if (type === 'image/webp') return 'webp';
        if (type === 'image/png') return 'png';
        if (type === 'image/jpeg') return 'jpg';
        return 'img';
      }

      function baseName(name) {
        return String(name || 'photo').replace(/\.[^./\\]+$/, '') || 'photo';
      }

      /* 逐步折半缩放：一次大比例 drawImage 会发糊，折半后边缘更干净 */
      function drawScaled(src, w0, h0, maxEdge, opaque) {
        var tw = w0, th = h0;
        if (maxEdge && Math.max(w0, h0) > maxEdge) {
          var s = maxEdge / Math.max(w0, h0);
          tw = Math.max(1, Math.round(w0 * s));
          th = Math.max(1, Math.round(h0 * s));
        }

        var cur = src, cw = w0, ch = h0;
        while (cw >= tw * 2 && ch >= th * 2) {
          var nw = Math.max(tw, Math.floor(cw / 2));
          var nh = Math.max(th, Math.floor(ch / 2));
          var c = document.createElement('canvas');
          c.width = nw; c.height = nh;
          var cx = c.getContext('2d');
          cx.imageSmoothingEnabled = true;
          cx.imageSmoothingQuality = 'high';
          cx.drawImage(cur, 0, 0, cw, ch, 0, 0, nw, nh);
          cur = c; cw = nw; ch = nh;
        }

        var out = document.createElement('canvas');
        out.width = tw; out.height = th;
        var octx = out.getContext('2d');
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = 'high';
        if (opaque) {                    // JPEG 不支持透明，先铺白底
          octx.fillStyle = '#ffffff';
          octx.fillRect(0, 0, tw, th);
        }
        octx.drawImage(cur, 0, 0, cw, ch, 0, 0, tw, th);
        return out;
      }

      function loadBitmap(file) {
        if (window.createImageBitmap) {
          return createImageBitmap(file, { imageOrientation: 'from-image' })
            .catch(function () { return createImageBitmap(file); });
        }
        return new Promise(function (resolve, reject) {
          var url = URL.createObjectURL(file);
          var im = new Image();
          im.onload = function () { URL.revokeObjectURL(url); resolve(im); };
          im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
          im.src = url;
        });
      }

      function canvasToBlob(canvas, type, q) {
        return new Promise(function (resolve) {
          canvas.toBlob(function (blob) { resolve(blob); }, type, q);
        });
      }

      function previewOf(canvas) {
        var size = 104;
        var c = document.createElement('canvas');
        var s = Math.min(canvas.width, canvas.height);
        c.width = c.height = size;
        var cx = c.getContext('2d');
        cx.drawImage(canvas, (canvas.width - s) / 2, (canvas.height - s) / 2, s, s, 0, 0, size, size);
        try { return c.toDataURL('image/webp', .5); } catch (e) { return c.toDataURL(); }
      }

      function fmtSummary() {
        if (!results.length) { sum.classList.remove('is-on'); return; }
        var before = results.reduce(function (a, r) { return a + r.before; }, 0);
        var after = results.reduce(function (a, r) { return a + r.after; }, 0);
        var saved = before ? Math.round((1 - after / before) * 100) : 0;
        sum.innerHTML = '共 <b>' + results.length + '</b> 张：' +
          YY.fmtBytes(before) + ' → <b>' + YY.fmtBytes(after) + '</b>，少 ' +
          YY.fmtBytes(before - after) + '（<b>' + saved + '%</b>）';
        sum.classList.add('is-on');
      }

      function clearResults() {
        results.forEach(function (r) { if (r.url) URL.revokeObjectURL(r.url); });
        results = [];
        list.textContent = '';
        sum.classList.remove('is-on');
      }

      function addPending(name) {
        var item = document.createElement('div');
        item.className = 'zip-item';

        var ph = document.createElement('span');
        ph.className = 'zip-thumb skeleton';

        var meta = document.createElement('div');
        meta.className = 'zip-meta';
        var nm = document.createElement('span');
        nm.className = 'zip-name';
        nm.textContent = name;
        var ln = document.createElement('span');
        ln.className = 'zip-line';
        ln.textContent = '正在压缩…';
        meta.appendChild(nm);
        meta.appendChild(ln);

        item.appendChild(ph);
        item.appendChild(meta);
        list.appendChild(item);
        return item;
      }

      function addResult(item, rec) {
        var img = document.createElement('img');
        img.className = 'zip-thumb';
        img.alt = '';
        img.src = rec.preview;

        var name = document.createElement('span');
        name.className = 'zip-name';
        name.textContent = rec.outName;

        var line = document.createElement('span');
        line.className = 'zip-line';
        line.innerHTML = YY.fmtBytes(rec.before) + ' → <em>' + YY.fmtBytes(rec.after) + '</em> · ' +
          rec.w + '×' + rec.h + ' · 省 ' + rec.saved + '%';

        var meta = document.createElement('div');
        meta.className = 'zip-meta';
        meta.appendChild(name);
        meta.appendChild(line);

        var dl = document.createElement('a');
        dl.className = 'btn btn--tint btn--sm zip-dl';
        dl.textContent = '下载';
        dl.href = rec.url;
        dl.download = rec.outName;

        item.textContent = '';
        item.appendChild(img);
        item.appendChild(meta);
        item.appendChild(dl);
      }

      function addFailed(item, msg) {
        item.textContent = '';
        var meta = document.createElement('div');
        meta.className = 'zip-meta';
        var name = document.createElement('span');
        name.className = 'zip-name';
        name.textContent = msg;
        var l = document.createElement('span');
        l.className = 'zip-line';
        l.textContent = '跳过：浏览器无法解码这个格式';
        meta.appendChild(name);
        meta.appendChild(l);
        item.appendChild(meta);
      }

      function handleFiles(fileList) {
        if (busy) { YY.toast('还在处理上一批，请稍候', 'warn'); return; }

        var files = Array.prototype.filter.call(fileList, function (f) {
          return /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name);
        }).slice(0, 30);

        if (!files.length) { YY.toast('请选择图片文件', 'warn'); return; }

        clearResults();
        busy = true;

        var i = 0;

        (function next() {
          if (i >= files.length) {
            busy = false;
            fmtSummary();
            if (results.length) YY.toast('压缩完成 · 共 ' + results.length + ' 张', 'ok');
            return;
          }

          var file = files[i++];
          var item = addPending(file.name);

          compressOne(file)
            .then(function (rec) {
              results.push(rec);
              addResult(item, rec);
              fmtSummary();
            })
            .catch(function () {
              addFailed(item, file.name);
            })
            .then(function () {
              // 让出一帧，长列表也不会卡住界面
              requestAnimationFrame(function () { setTimeout(next, 0); });
            });
        })();
      }

      function compressOne(file) {
        var type = resolveType();
        return loadBitmap(file).then(function (bmp) {
          var w0 = bmp.width || bmp.naturalWidth;
          var h0 = bmp.height || bmp.naturalHeight;
          var canvas = drawScaled(bmp, w0, h0, opts.edge, type === 'image/jpeg');
          if (bmp.close) { try { bmp.close(); } catch (e) {} }

          return canvasToBlob(canvas, type, opts.quality / 100).then(function (blob) {
            if (!blob) throw new Error('encode failed');
            var outType = (blob.type && blob.type.indexOf('image/') === 0) ? blob.type : type;
            return {
              before: file.size,
              after: blob.size,
              w: canvas.width,
              h: canvas.height,
              saved: file.size ? Math.max(0, Math.round((1 - blob.size / file.size) * 100)) : 0,
              outName: baseName(file.name) + '-compressed.' + extOf(outType),
              url: URL.createObjectURL(blob),
              preview: previewOf(canvas)
            };
          });
        });
      }
    }
  });
})();
