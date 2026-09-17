# 言一 · FIRSTWEB

个人静态网站：文章、随笔、相片馆、日历、天气、学习、娱乐。
纯 HTML / CSS / 原生 JS，无构建步骤，任意静态托管（GitHub Pages 等）即可运行。

仓库地址：esahc-shen.github.io/FIRSTWEB

## 页面一览

| 文件 | 内容 |
| --- | --- |
| `index.html` | 首页：个人卡、时钟/天气模块、一言条、五个专栏入口 |
| `articles.html` | 文章列表 |
| `article-*.html` | 文章正文（排版模板：首字下沉、引文、分隔线、上下篇导航） |
| `notes.html` | 随笔碎片 |
| `gallery.html` | 相片馆：缩略图 + 灯箱 + 本地照片压缩 |
| `calendar.html` | 日历：日/月/年三级视图，农历、节气、节日 |
| `weather.html` | 天气：实时 + 24 小时 + 7 天，Open-Meteo 数据源 |
| `study.html` | 学习：番茄钟、待办、倒数日（localStorage）、知识库链接 |
| `play.html` | 娱乐：一言/毒鸡汤、WebAudio 白噪音、摸鱼四件套 |

## 目录结构

```
assets/   base.css（设计系统）+ app.js（全站脚本）+ 各页面脚本
photos/   相片馆图片：*-thumb.webp（缩略图）/ *-view.webp（灯箱大图）/ 原图
avatar.png
```

## 怎么加一篇新文章

1. 复制 `article-whitespace.html` 为 `article-你的标题.html`；
2. 改掉 `<title>`、`eyebrow`、标题、meta 信息、封面图与正文；
3. 正文第一个 `<p>` 加 `class="lede"` 可获得首字下沉；
4. 修改文末 `.article-nav` 的上一篇/下一篇链接；
5. 在 `articles.html` 里复制一个 `<a class="post">` 卡片，指向新文章；
6. 把新文件名加进所有页面导航里「文章」链接的 `data-match`（保持高亮）。

## 数据说明

- 天气：Open-Meteo（免费，无需 Key），城市选择存 `localStorage: weather-place`
- 一言：hitokoto.cn，失败时回退本地句库
- 番茄钟/待办/倒数日：分别存 `yy-pomo-stats` / `yy-todos` / `yy-countdowns`
- 浏览量：abacus.jasoncameron.dev，离线时显示上次缓存

## 彩蛋

- 2 秒内连点 5 次导航栏的「言」印章 → 彩带
- 点击页面任意处会留下一枚小墨点（仅鼠标设备，`prefers-reduced-motion` 时自动关闭）

version beta 0.30
