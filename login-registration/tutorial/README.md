# 跟着一次 Google 登录，读懂客户端、服务端与 Token

打开 [图文交互教程](index.html)。这是独立 HTML 文件，截图已经嵌入，可离线阅读；流程图支持逐步点击，并提供一个自测题。

## 内容

- 登录页与 Google 页面真实截图；Sign In / Sign Up 的页内切换对比。
- 浏览器、网站后端与 Google 的三方职责。
- 本次实际观察的登录请求及 redirect_uri、state、PKCE 参数。
- 授权码、Google token、本站 session Cookie 的区别。
- 用浏览器 Network 追请求，以及在自己的代码里查找处理入口的方法。

## 证据与范围

观察日期：2026-10-25。案例：https://dash.better-auth.com/sign-in

本次使用独立、未登录的浏览器，未输入个人账号、未完成 Google 授权或创建账户。现场观察与依据官方文档讲解的登录后半程已在教程中分开标注。没有检查网站部署、数据库和服务端源码，因此没有声称数出它的服务器或实例数量。

[脱敏网络证据](network-evidence.json) 只保留路径、方法、状态及适合公开的参数；不提供原始 HAR。截图保存在 assets/，有原始页面图和便于阅读的裁切版。教程地址栏为根据实际 URL 补绘，不是浏览器原生地址栏截图。

官方参考：

- https://www.better-auth.com/docs/authentication/google
- https://www.better-auth.com/docs/concepts/session-management
- https://www.better-auth.com/docs/concepts/cookies
- https://developers.google.com/identity/openid-connect/openid-connect
- https://www.rfc-editor.org/rfc/rfc7636#section-4

文档抓取时显示 Better Auth 1.7.12，不能据此推断 Dashboard 的部署版本。

## 验证

已在 Chromium 中检查 1440px 桌面与 390px 手机宽度，页面无横向溢出；3 张截图全部加载。8 个流程步骤、前进后退按钮和自测反馈均已检查。教程无需联网加载脚本、字体或图片。
