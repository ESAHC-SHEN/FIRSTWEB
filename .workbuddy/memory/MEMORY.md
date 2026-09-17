# FIRSTWEB 项目约定

- 站点：言一个人静态网站，纯 HTML/CSS/原生 JS，无构建，GitHub Pages 托管
- 设计系统：assets/base.css（Liquid Glass 令牌），全站脚本 assets/app.js，全局命名空间 window.YY
- 每页结构固定：顶部 .topnav（桌面导航 .nav-links）+ 底部 .tabbar（移动端）+ 页脚 .site-footer（含 .seal 印章 + #siteVersion）
- 新增页面时必须：①导航与 tabbar 加链接并写 data-match；②页脚加印章；③引入 assets/base.css 与 assets/app.js
- 版本号：app.js 的 VERSION 常量 + base.css 头部注释 + 各页 footer 硬编码三处同步
- 写文章：复制 article-whitespace.html 模板，正文首段加 class="lede"（首字下沉），改 .article-nav 上下篇；列表页 articles.html 复制 .post 卡片；新文件名加入各页「文章」data-match
- 本地存储键：theme / weather-place / yy-pomo-stats / yy-todos / yy-countdowns / pv
- 用户偏好：静态站优先，不引入框架与构建工具；文章用静态页而非在线编辑器
- 用户背景线索：在备考六级、关注税务/审计（知识库链接方向）
