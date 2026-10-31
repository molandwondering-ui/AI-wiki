# 登录与注册：从产品流程到 Google OAuth

这组教程回答一个问题：**用户点了“使用 Google 登录”，网站是怎么知道他是谁，并在刷新后继续认出他的？**

## 阅读顺序

| 顺序 | 内容 | 你会弄懂什么 |
| --- | --- | --- |
| 1 | [基础概念](basics.md) | 注册与登录、客户端与服务端、Cookie 与 session、JavaScript 与 Node.js |
| 2 | [Google 登录图文教程](google-login.md) | 对照真实截图，追踪网页、本站后端与 Google 的交互 |
| 3 | [交互教程说明](tutorial/README.md) | 下载并打开 `tutorial/index.html`，逐步点击流程、完成自测 |
| 4 | [运行 Google 登录 Demo](demo/README.md) | 启动前后端，配置 Google 客户端，体验登录、个人信息、接口鉴权与退出 |

GitHub 可以直接显示本专题的 Markdown 和截图；`tutorial/index.html` 在 GitHub 文件页显示为源码，下载后用浏览器打开才能体验交互。Demo 包含后端，需要 Node.js 启动，不能靠双击 HTML 运行。

## 资料范围

- 真实网站案例：2026-10-25 观察的 [Better Auth Dashboard](https://dash.better-auth.com/sign-in)。只观察到登录前和跳转 Google 的部分，没有完成授权。
- [脱敏网络证据](tutorial/network-evidence.json) 区分了实际记录与记录工具的限制。
- 本地 Demo：使用 Better Auth、Express、SQLite；测试覆盖授权请求参数与会话检查，不代表真实 Google 登录已经验证。
- 源材料整理自此前的登录注册学习与 Demo。图文教程保留原始观察日期，控制台菜单和线上页面后续可能变化。

## 目录

```text
login-registration/
├── README.md            # 阅读入口
├── basics.md            # 基础概念与产品设计要点
├── google-login.md      # GitHub 上可直接阅读的图文教程
├── tutorial/            # 离线交互教程、原始截图、脱敏证据
└── demo/                # 可以在本机运行的 Google 登录项目
```
