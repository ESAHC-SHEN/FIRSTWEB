# 言一 · 个人网站

esahc-shen.github.io/FIRSTWEB

纯 HTML / CSS / 原生 JavaScript，无框架、无构建，GitHub Pages 托管。当前版本 **beta 0.40**。

## 页面

| 文件 | 内容 |
| --- | --- |
| `index.html` | 首页：时钟 + 天气双模块、每日一言条、五个专栏入口、打字机签名 |
| `articles.html` | 文章列表（按年份归档分组） |
| `article-*.html` | 文章页（排版模板：首字下沉、拉页引文、上下篇导航） |
| `notes.html` | 随笔 |
| `gallery.html` | 相片馆（LQIP、灯箱、本地压缩） |
| `calendar.html` | 日历（日/月/年视图、农历、节气、节日，全屏页无页脚） |
| `weather.html` | 天气详情（Open-Meteo，可切换城市） |
| `study.html` | 学习：番茄钟、待办、倒数日、知识库链接 |
| `play.html` | 娱乐：每日一言、WebAudio 白噪音、摸鱼四件套 |
| `about.html` | 关于：自我介绍、站点编年史、友邻（友情链接） |
| `404.html` | 自定义 404（GitHub Pages 自动生效） |

## 约定（改站前必读）

- **新增页面四件事**：① 所有页面的 `.nav-links` 加链接并写 `data-match`（底部 tabbar 保持 6 项以内，酌情）；② 页脚加 `.seal` 印章和 `© 2026 言一 · <a class="foot-link" href="about.html">关于</a>`；③ 引入 `assets/base.css` 与 `assets/app.js`；④ `<head>` 里加 description + Open Graph meta（复制现有页面改 title/description/url 即可）。
- **版本号三处同步**：`assets/app.js` 的 `VERSION` 常量、`assets/base.css` 头部注释、各页页脚硬编码文本。
- **节气主题色**：`app.js` 里的 `TONE_COLORS`（24 节气 × 8 候色）。改色直接改这张表，全站 `--accent` 随之变化。
- **写文章**：复制任一 `article-*.html`，正文首段加 `class="lede"`，改 `.article-nav` 上下篇；再到 `articles.html` 对应年份下复制 `.post` 卡片（新一年就新建一行 `.arch-year`）。
- **加友链**：`about.html` 的「友邻」板块复制一个 `.friend` 块，改名字、链接、`--fc` 颜色。
- **本地数据**（存于访问者浏览器，不上传）：番茄钟统计、待办、倒数日、主题、天气城市、浏览量缓存。

## .workbuddy

`.workbuddy/` 是 AI 助手的工作记忆目录，已在 `.gitignore` 中忽略，**不要提交**。
