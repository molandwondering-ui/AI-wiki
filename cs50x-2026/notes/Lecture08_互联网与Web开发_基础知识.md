# CS50x Lecture 8：互联网与 Web 开发基础知识

> 核心问题：当你在浏览器输入一个网址并按下回车，计算机究竟怎样找到服务器、取回网页并把它显示出来？

## 0. 阅读说明与资料来源

本文以仓库中的 Lecture 8 原始材料为主：

- **[P：Lecture 8 官方幻灯片](../slides/lecture8.pdf)**：术语、协议格式和课堂示例的主要来源。文中的 `P:p.17` 表示 PDF 第 17 页。
- **[T：Lecture 8 英文讲稿](../transcripts/lecture8.txt)**：用于补充老师在课堂上的类比、解释和演示过程。
- **[S：Lecture 8 示例源码](../source/src8/)**：用于说明 HTML、CSS、JavaScript 和表单最终怎样写成代码。
- **补充说明**：为了避免课堂简化造成误解，本文加入了少量网络基础知识；这部分会明确标成“补充”。

引用优先级是：**幻灯片 P / 示例源码 S > 讲稿 T > 本文补充说明**。

Lecture 8 的标题是 “HTML, CSS, JavaScript”，但前半段先介绍互联网和 Web 协议。因为只有先理解“浏览器怎样拿到文件”，后面的网页代码才不会变成孤立语法。

## 1. 一张图看懂：输入网址后发生了什么

```text
你输入 https://www.example.com/search?q=cat
                    │
                    ▼
1. 浏览器拆解 URL
   协议=https，主机名=www.example.com，路径=/search，查询参数=q=cat
                    │
                    ▼
2. DNS 查询
   www.example.com  ──翻译──>  服务器 IP 地址
                    │
                    ▼
3. 建立连接
   IP 找到“哪台机器”，TCP 端口 443 找到“机器上的 HTTPS 服务”
                    │
                    ▼
4. HTTPS 通信
   先用 TLS 建立加密连接，再发送 HTTP 请求
                    │
                    ▼
5. 服务器返回 HTTP 响应
   状态码 + 响应头 + HTML 内容
                    │
                    ▼
6. 浏览器解析 HTML
   遇到 CSS、JavaScript、图片等地址时，再发出更多 HTTP 请求
                    │
                    ▼
7. 浏览器绘制页面并运行 JavaScript
```

先记住一句话：

> **DNS 找地址，IP 找设备，端口找服务，HTTP 规定怎样问答，HTML/CSS/JavaScript 决定网页的内容、样式和行为。**

**来源：** P:p.9–40、p.43–116；T 中 TCP/IP、DNS、HTTP 与网页开发部分。

## 2. Internet、network、router、packet

### 2.1 Network：网络

**网络（network）**是一组能够互相传输数据的设备。家里的手机、电脑和路由器可以组成一个局域网；学校、公司也有自己的网络。

**互联网（Internet）**不是某一台巨大计算机，而是许多网络互相连接形成的“网络之网”。

### 2.2 Packet：数据包

网络通常不会把一张大图片或一段视频当作不可分割的整体发送，而是拆成较小的**数据包（packet）**。

可以把 packet 想成信封：

- 信封外面有来源地址和目的地址；
- 信封里面装着一小段数据；
- 大文件可以拆进多个信封，到达后再重新组合。

这只是帮助理解的类比。真实 packet 是按协议排列的一串二进制位。

### 2.3 Router：路由器

**路由器（router）**负责把 packet 从一个网络转发到另一个网络。

它不需要提前知道整条旅程的每一步，更像快递中转站：根据目的地址和路由表，决定下一站把数据交给谁。途中可能经过多个路由器，也不保证所有 packet 都走完全相同的路径。

```text
你的电脑 → 家庭路由器 → 运营商路由器 → 更多中间路由器 → 网站服务器
```

**容易混淆：**

- Wi-Fi 是设备连接局域网的一种无线方式；
- 家庭“无线路由器”通常把路由器、交换机、无线接入点、DHCP 和 DNS 转发等功能装进同一个盒子；
- Internet 指全球互联网络，不等于 Wi-Fi。

**来源：** P:p.5–8；T 中 ARPANET、routers 与 packet 课堂演示。

## 3. Protocol 与 TCP/IP

**协议（protocol）**是一组通信双方共同遵守的规则。它会规定：

- 数据按照什么格式排列；
- 谁先发送什么；
- 收到后怎样回答；
- 出错或丢失时怎样处理。

课堂用“握手”类比人类协议：如果双方对动作顺序有共同预期，交流就能进行。

**TCP/IP**不是一个单独协议，而是常被一起称呼的一组核心协议：

- **IP（Internet Protocol）**主要解决“数据要送到哪台设备”；
- **TCP（Transmission Control Protocol）**主要解决“数据交给哪个应用，以及怎样可靠、有序地传输”。

**来源：** P:p.9；T 中 “TCP and IP solve two different problems” 一段。

## 4. IP、IPv4 与 IPv6

### 4.1 IP address：IP 地址

**IP 地址**是网络层用来标识通信端点的数值地址。路由器依据目的 IP，逐步把 packet 转发到目标网络。

课堂把 IP 地址类比成现实世界的邮寄地址：

```text
目的 IP：告诉网络这封“信”要送到哪里
来源 IP：让接收方知道应该把回复送回哪里
```

IP packet 的头部因此包含 `Source Address` 和 `Destination Address`。

### 4.2 IPv4

**IPv4** 地址长度为 32 bit，常写成四段十进制数：

```text
192.0.2.10
```

每段占 8 bit，所以范围为 0–255：

```text
4 段 × 8 bit = 32 bit
理论组合数 = 2³² ≈ 43 亿
```

### 4.3 IPv6

**IPv6** 地址长度为 128 bit，地址空间远大于 IPv4，通常用十六进制和冒号书写：

```text
2001:db8::1
```

IPv4 和 IPv6 目前长期共存，迁移不是一夜完成的。

> **补充：课堂简化。** 讲稿为了建立直觉，说每台设备有唯一 IP。现实中，家庭设备常使用 `192.168.x.x`、`10.x.x.x` 等私有 IPv4 地址，并通过 NAT 共享一个公网 IPv4。因此“IP 用来标识和寻址”是核心结论，但“每台设备都有全球唯一公网 IPv4”并不总成立。

**来源：** P:p.10–12；T 中 IP address、IPv4 32 bit、IPv6 128 bit 与 packet header 的讲解。

## 5. TCP、端口与可靠传输

### 5.1 为什么有 IP 还需要端口

一台服务器可以同时运行网页、邮件、聊天等多个服务。IP 只能大致找到“哪台设备”，还需要**端口号（port number）**找到“设备上的哪个服务”。

```text
IP 地址 = 一栋楼的地址
端口号  = 楼里的房间号
```

课堂强调的常见端口：

| 服务 | 常见默认端口 |
|---|---:|
| HTTP | 80 |
| HTTPS | 443 |
| Lecture 8 的本地 `http-server` | 8080 |

一次 TCP 通信会同时使用来源端口和目的端口。浏览器通常临时选择一个来源端口，服务器则监听约定的服务端口。

### 5.2 TCP 怎样帮助可靠传输

TCP 会把较大的数据拆成适合传输的片段，并利用序号、确认与重传等机制：

1. **sequence number（序列号）**：帮助接收方恢复顺序；
2. **acknowledgment（确认）**：告诉发送方哪些数据已经收到；
3. **retransmission（重传）**：数据丢失时再次发送；
4. **port（端口）**：把数据交给正确应用。

所以 TCP 不只负责“房间号”，还提供面向连接、可靠且有序的字节流。

### 5.3 IP 与 TCP 的分工

| 问题 | 主要由谁解决 |
|---|---|
| packet 发往哪台设备 | IP 地址 |
| 设备上的哪个应用接收 | TCP 端口 |
| 多个片段怎样排序 | TCP 序列号 |
| 片段丢失怎么办 | TCP 确认与重传 |
| 中间下一跳走哪里 | router 根据路由信息决定 |

**来源：** P:p.13–16；T 中 ports、80/443、TCP header、sequence number 和猫图片分包示例。

## 6. 域名、主机名与 FQDN

### 6.1 Domain name：域名

**域名（domain name）**是便于人记忆的层级化名称，例如：

```text
example.com
harvard.edu
```

域名不是服务器本身，也不是 IP 地址。域名需要注册，并通过 DNS 记录指向相应的服务器或其他名称。

### 6.2 拆解 `www.example.com`

```text
www  .  example  .  com
│         │          │
主机名    注册域名    顶级域 TLD
```

- **TLD（Top-Level Domain，顶级域）**：最右边的 `.com`、`.edu`、`.org` 等；
- **注册域名**：通常所说的 `example.com`；
- **hostname（主机名）**：这里是 `www`，用于区分同一域名下的不同主机或服务；
- **FQDN（Fully Qualified Domain Name，完全限定域名）**：完整写出的层级名称，如 `www.example.com`。

严格的 DNS 表示中，FQDN 最后还可以有一个代表根的点：`www.example.com.`；日常使用时通常省略。

> **注意：** `www` 只是常见名称，不是网站必须使用的固定前缀，也不保证只对应一台物理服务器。

### 6.3 域名怎样获得

课堂给出的流程是：

1. 通过 registrar（域名注册商）租用域名的使用权；
2. 准备承载网站的服务器；
3. 配置 DNS，让域名能够解析到服务器。

购买域名并不等于自动拥有网页内容，也不等于已经有服务器。

**来源：** P:p.17–19、p.23–33；T 中 domain name、registrar、FQDN、TLD 和 hostname 的讲解。

## 7. DNS 与 DNS 服务器

### 7.1 DNS 是什么

**DNS（Domain Name System，域名系统）**负责把域名转换成网络通信所需的信息，最常见的是查询 IP 地址：

```text
www.example.com  ──DNS 查询──>  93.184.216.34（示意）
```

课堂把 DNS 类比成“域名—IP”的两列表格。这个类比能说明功能，但不能理解成全世界只有一台服务器保存一张总表。

### 7.2 DNS server 是什么

**DNS 服务器**是参与接收、转发或回答 DNS 查询的服务器。DNS 是一个分层、分布式系统。

浏览器需要解析域名时，通常先询问系统配置的**递归解析器（recursive resolver）**。它可能使用缓存直接回答；如果没有答案，再代表客户端向 DNS 层级继续查询。

一个简化过程是：

```text
浏览器 / 操作系统缓存
        ↓ 没有答案
本地或公共递归 DNS 解析器
        ↓
根 DNS 服务器：告诉它去哪里找 .com
        ↓
.com 的 TLD DNS 服务器：告诉它去哪里找 example.com
        ↓
example.com 的权威 DNS 服务器：给出 www 的记录
        ↓
结果逐级返回并缓存
```

### 7.3 三类 DNS 角色

| 角色 | 做什么 |
|---|---|
| 递归解析器 | 接受用户查询，代替用户寻找最终答案，并缓存结果 |
| 根 / TLD DNS 服务器 | 指引查询去正确的下一层 |
| 权威 DNS 服务器 | 保存某个域名区域的正式 DNS 记录并给出权威答案 |

课堂明确介绍了本地 DNS、根服务器、分层查询和缓存；上表对不同服务器角色的命名属于补充整理。

### 7.4 常见 DNS 记录（补充）

| 记录 | 作用 |
|---|---|
| `A` | 名称指向 IPv4 地址 |
| `AAAA` | 名称指向 IPv6 地址 |
| `CNAME` | 一个名称指向另一个名称 |
| `MX` | 指定接收邮件的服务器 |

DNS 的职责是“查到地址或其他记录”，它本身不负责传输网页内容。

**来源：** P:p.17–19；T 中 DNS 两列表类比、local DNS、root servers、hierarchical、recursive 与 cached 的讲解；DNS 角色和记录类型为补充。

## 8. DHCP：设备怎样自动拿到网络配置

**DHCP（Dynamic Host Configuration Protocol，动态主机配置协议）**让设备加入网络后自动获得必要配置。

典型信息包括：

- 设备在当前网络中的 IP 地址；
- 默认网关，也就是数据离开本地网络时通常先交给哪个路由器；
- DNS 服务器地址；
- 子网相关配置和租期。

```text
设备加入 Wi-Fi
  → “我该使用什么网络配置？”
  → DHCP 服务器分配 IP，并告诉设备网关与 DNS
```

**DNS 与 DHCP 的区别：**

| DNS | DHCP |
|---|---|
| 回答“这个域名对应什么？” | 回答“我加入网络后该怎样配置？” |
| 常见结果是 IP 或其他 DNS 记录 | 常见结果是本机 IP、网关、DNS 等 |
| 访问域名时会用到 | 设备接入网络时会用到 |

家用环境中，DHCP 服务往往也由“路由器盒子”提供，但这是设备集成了多个功能，不代表 DHCP 就是路由。

**来源：** P:p.20；T 中设备启动后询问 IP、router address 与 DNS server 的讲解。

## 9. URL：网页地址的完整结构

**URL（Uniform Resource Locator）**描述资源在哪里以及怎样访问它。

以这个地址为例：

```text
https://www.example.com:443/folder/file.html?q=cat&lang=zh
└─┬─┘   └──────┬───────┘└┬┘└────────┬───────┘└──────┬─────┘
scheme       hostname    port       path           query
```

| 部分 | 示例 | 含义 |
|---|---|---|
| scheme | `https` | 使用什么协议/方案 |
| hostname / FQDN | `www.example.com` | 要访问的主机名称 |
| port | `443` | 服务端口；默认端口通常省略 |
| path | `/folder/file.html` | 请求服务器上的哪个资源 |
| query string | `?q=cat&lang=zh` | 随请求附带的键值参数 |

其中 query string 由多个参数组成：

```text
q=cat
lang=zh
```

参数之间用 `&` 分隔，键和值用 `=` 连接。

**容易混淆：**

- 域名只是 URL 的一部分；
- URL 还可以包含 scheme、端口、路径、查询参数和片段；
- `https://example.com` 是 URL，`example.com` 是域名。

**来源：** P:p.23–34、p.64–66；T 中 URL、scheme、hostname、TLD、path 与 GET 参数的讲解。

## 10. HTTP、HTTPS、request 与 response

### 10.1 HTTP

**HTTP（Hypertext Transfer Protocol）**规定 Web 客户端与服务器怎样请求和返回资源。

- 浏览器通常是 **client（客户端）**；
- 提供网页或数据的计算机程序是 **server（服务器）**；
- client 发出 **request（请求）**；
- server 返回 **response（响应）**。

课堂请求示例：

```http
GET / HTTP/2
Host: www.harvard.edu
```

含义：

- `GET`：请求读取资源；
- `/`：请求网站根路径；
- `HTTP/2`：使用的 HTTP 版本；
- `Host`：要访问的主机名，同一服务器可能托管多个域名。

课堂响应示例：

```http
HTTP/2 200
Content-Type: text/html
```

含义：

- `200`：请求成功；
- `Content-Type: text/html`：响应正文是 HTML。

### 10.2 HTTPS

**HTTPS**可以理解为“通过 TLS 加密和认证的 HTTP”。

它主要带来：

- **加密**：途中观察者难以直接读取内容；
- **完整性**：内容被篡改时能够被发现；
- **身份认证**：浏览器通过证书检查自己连接的服务器身份。

HTTPS 不表示网站内容一定真实、无病毒或值得信任；它主要保证连接本身的安全属性。

### 10.3 一个网页为什么会有很多 HTTP 请求

服务器第一次常只返回 HTML。浏览器解析后发现：

- `<link>` 引用 CSS；
- `<script>` 引用 JavaScript；
- `<img>` 引用图片；
- `<video>` 引用视频；

浏览器会为这些资源继续发送请求。所以“打开一个页面”可能产生几十次甚至更多 HTTP 请求。

**来源：** P:p.21–22、p.34–39；T 中 HTTP/HTTPS、request/response、developer tools 与多次请求的演示；TLS 三项性质为补充说明。

## 11. GET、POST 与状态码

### 11.1 GET 与 POST

- **GET**：通常用于读取资源；表单数据常出现在 URL 查询参数里。
- **POST**：通常用于把数据放在请求正文中，常用于提交会改变服务器状态的数据。

它们的差别不能简单理解为“GET 不安全、POST 安全”。是否加密取决于有没有使用 HTTPS；POST 的内容虽然不显示在地址栏里，但没有 HTTPS 时仍可能被途中读取。

### 11.2 常见 HTTP 状态码

| 范围 | 大意 | 课堂例子 |
|---|---|---|
| 2xx | 成功 | `200 OK` |
| 3xx | 重定向或缓存 | `301`、`302`、`304`、`307` |
| 4xx | 客户端请求问题 | `401`、`403`、`404`、`418` |
| 5xx | 服务器端问题 | `500`、`503` |

几个最常见的：

- `200 OK`：成功；
- `301 Moved Permanently`：资源永久移动，响应通常带 `Location`；
- `403 Forbidden`：服务器理解请求，但拒绝访问；
- `404 Not Found`：找不到所请求资源；
- `500 Internal Server Error`：服务器内部出错；
- `503 Service Unavailable`：服务暂时不可用。

课堂用 `curl` 和浏览器开发者工具直接查看请求、响应、状态码与重定向。

**来源：** P:p.34–42；T 中 curl、safetyschool.org、developer tools 和 HTTP 状态码演示。

## 12. HTML：描述网页结构

**HTML（HyperText Markup Language）**是标记语言，用标签描述内容的结构和语义，不是通用编程语言。

Lecture 8 的 [`hello0.html`](../source/src8/hello0.html)：

```html
<!DOCTYPE html>

<html lang="en">
    <head>
        <title>hello, title</title>
    </head>
    <body>
        hello, body
    </body>
</html>
```

逐项理解：

- `<!DOCTYPE html>`：声明使用现代 HTML；
- `<html lang="en">`：页面根元素，`lang` 是属性；
- `<head>`：页面元数据；
- `<title>`：浏览器标签页标题；
- `<body>`：用户在页面主体中看到的内容。

### 12.1 Tag、element、attribute

- **tag（标签）**：如 `<a>`、`</a>`；
- **element（元素）**：开始标签、内容、结束标签构成的整体；
- **attribute（属性）**：写在开始标签上，为元素提供额外信息。

[`link0.html`](../source/src8/link0.html) 中：

```html
Visit <a href="image.html">Harvard</a>.
```

- `a` 是链接元素；
- `href` 属性指定目标 URL；
- `Harvard` 是用户看到并可点击的文字。

### 12.2 DOM

浏览器解析 HTML 后，会在内存中建立 **DOM（Document Object Model，文档对象模型）**。可以把它理解成一棵元素树：

```text
html
├── head
│   └── title
└── body
    └── form
        ├── input
        └── button
```

JavaScript 可以查询、修改这棵树，因此网页才能在加载后继续变化。

**来源：** P:p.43–74；S:`hello0.html`、`link0.html` 及同目录其他 HTML 示例；DOM 的树形解释为补充整理。

## 13. 表单、query parameters 与正则校验

### 13.1 GET 表单怎样变成 URL

Lecture 8 的 [`search1.html`](../source/src8/search1.html)：

```html
<form action="https://www.google.com/search" method="get">
    <input autocomplete="off" autofocus name="q"
           placeholder="Query" type="search">
    <button>Google Search</button>
</form>
```

关键属性：

- `action`：表单提交到哪里；
- `method="get"`：使用 GET；
- `name="q"`：把输入值命名为参数 `q`；
- `type="search"`：搜索输入框；
- `autofocus`：页面打开时自动聚焦。

如果输入 `cats`，浏览器会访问类似：

```text
https://www.google.com/search?q=cats
```

这段代码只实现了搜索**前端**，真正查找网页的是 Google 的后端。

### 13.2 Regular expression：正则表达式

**正则表达式（regular expression / regex）**用一套紧凑语法描述字符串模式，常用于输入校验。

[`register2.html`](../source/src8/register2.html) 使用：

```html
<input name="phone"
       pattern="\d{3}-\d{3}-\d{4}"
       placeholder="Phone">
```

模式可拆成：

- `\d{3}`：3 个数字；
- `-`：一个连字符；
- `\d{3}`：再 3 个数字；
- `-\d{4}`：连字符和最后 4 个数字。

所以它匹配类似 `617-555-0100` 的格式。

前端校验主要改善用户体验，不能代替后端校验。用户可以绕过浏览器规则直接发送请求，所以服务器仍必须检查输入。

**来源：** P:p.64–74；T 中 Google search、front end/back end、query parameter 与 regex 的讲解；S:`search0.html`、`search1.html`、`register0.html`–`register2.html`。

## 14. CSS：控制网页样式

**CSS（Cascading Style Sheets）**控制网页的颜色、字号、间距、布局等表现。

一条 CSS 规则由 selector 和 declarations 组成：

```css
.large {
    font-size: large;
}
```

- `.large`：**selector（选择器）**，选中 class 为 `large` 的元素；
- `font-size`：**property（属性）**；
- `large`：该属性的 **value（值）**。

Lecture 8 的 [`home7.css`](../source/src8/home7.css)：

```css
.centered {
    text-align: center;
}

.large {
    font-size: large;
}
```

HTML 中通过 class 使用这些规则：

```html
<body class="centered">
    <header class="large">
        John Harvard
    </header>
</body>
```

常见选择器：

| 写法 | 选择什么 |
|---|---|
| `p` | 所有 `<p>` 元素 |
| `.note` | 所有 `class="note"` 的元素，可重复使用 |
| `#title` | `id="title"` 的元素，页面中应保持唯一 |

**源码注意：** 当前 [`home7.html`](../source/src8/home7.html) 写的是 `href="home5.css"`，而同目录实际提供的是 `home7.css`。实际运行时外链文件名必须和存在的 CSS 文件一致，否则样式不会加载。这不影响它所演示的 `<link rel="stylesheet">` 概念。

Bootstrap 之类的 **CSS framework（CSS 框架）**提供现成的样式和组件，让开发者不用从零设计每一个细节；[`bootstrap.html`](../source/src8/bootstrap.html) 是课堂示例。

**来源：** P:p.75–87；T 中 CSS、selector、property、class、id 和 Bootstrap 的讲解；S:`home7.html`、`home7.css`、`link3.html`、`bootstrap.html`。

## 15. JavaScript：让页面产生行为

**JavaScript**是运行在浏览器中的编程语言，可以：

- 读取和修改 DOM；
- 响应点击、输入、提交等事件；
- 改变页面内容和样式；
- 与服务器继续交换数据。

Lecture 8 的 [`hello4.html`](../source/src8/hello4.html) 用：

```html
<script src="hello4.js"></script>
```

加载 [`hello4.js`](../source/src8/hello4.js)。核心逻辑是：

```javascript
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('form').addEventListener('submit', function(e) {
        alert('hello, ' + document.querySelector('#name').value);
        e.preventDefault();
    });
});
```

逐步理解：

1. `DOMContentLoaded`：等 HTML 被解析完成；
2. `document.querySelector('form')`：从 DOM 中找到表单；
3. `addEventListener('submit', ...)`：监听提交事件；
4. `document.querySelector('#name').value`：读取 id 为 `name` 的输入值；
5. `alert(...)`：弹出问候；
6. `e.preventDefault()`：阻止表单执行默认提交行为。

所以三者分工可以概括为：

| 技术 | 回答的问题 |
|---|---|
| HTML | 页面里有什么、结构是什么 |
| CSS | 这些内容长什么样、怎样布局 |
| JavaScript | 用户操作后会发生什么 |

**来源：** P:p.88–116；T 中 JavaScript、events 和 DOM 操作的演示；S:`hello4.html`、`hello4.js`、`autocomplete.html`、`geolocation.html`。

## 16. Client、Server、Front end、Back end

这些词描述的是角色，不一定代表四台不同机器：

- **client**：发起请求的一方，例如浏览器；
- **server**：接受请求并提供资源或服务的一方；
- **front end**：用户直接看到和交互的界面，常用 HTML/CSS/JavaScript；
- **back end**：处理业务逻辑、数据、权限和数据库等的服务器端部分。

课堂 Google 搜索表示例非常典型：

```text
自己写的 search1.html
        │  前端把输入组成 ?q=cats
        ▼
Google 的搜索 URL
        │
        ▼
Google 后端查找数据并返回结果
```

前端和后端不是“哪个更高级”，而是解决不同位置的问题。

**来源：** T 中 server/client 定义及 Google 表单的 front end/back end 讲解；S:`search0.html`、`search1.html`。

## 17. 把整条链路重新走一遍

假设访问：

```text
https://www.example.com/products?id=42
```

1. 设备接入网络时，DHCP 通常已经提供本机 IP、默认网关和 DNS 地址。
2. 浏览器识别 scheme 是 HTTPS，主机名是 `www.example.com`，路径是 `/products`。
3. 系统通过 DNS 把主机名解析为 IP；缓存命中时不必从头查询。
4. 浏览器根据 IP 找到服务器，并连接 TCP 443 端口。
5. 浏览器与服务器建立 TLS 安全连接。
6. 浏览器发送带有路径和主机信息的 HTTP GET 请求；`id=42` 是查询参数。
7. 服务器后端读取请求，找到商品 42，返回状态码、响应头和 HTML。
8. 浏览器把 HTML 解析成 DOM。
9. 浏览器继续请求 HTML 引用的 CSS、JavaScript、图片等资源。
10. CSS 参与页面样式计算，浏览器绘制页面，JavaScript 注册事件并让页面可交互。

其中任何一层出问题，表现都可能是“网页打不开”：

| 现象 | 可能检查 |
|---|---|
| 域名无法解析 | DNS 配置或 DNS 记录 |
| IP 可达但服务拒绝连接 | 端口、服务进程或防火墙 |
| 返回 404 | URL path 或服务器路由 |
| 返回 500 | 后端内部错误 |
| HTML 有内容但没有样式 | CSS URL、文件名或加载失败 |
| 页面显示但点击无反应 | JavaScript 加载或运行错误 |

## 18. 最容易混淆的概念

| 概念 A | 概念 B | 核心区别 |
|---|---|---|
| Internet | Web | Internet 是底层互联网络；Web 是运行在其上的一种服务 |
| IP 地址 | 域名 | IP 用于网络寻址；域名便于人记忆，需要 DNS 解析 |
| IP 地址 | 端口 | IP 找设备；端口找设备上的应用 |
| DNS | DHCP | DNS 查询名称；DHCP 下发本机网络配置 |
| 域名 | URL | 域名只是 URL 的组成部分 |
| HTTP | HTTPS | HTTPS 是在 TLS 安全连接上使用 HTTP |
| HTML | CSS | HTML 管结构和语义；CSS 管表现 |
| CSS | JavaScript | CSS 主要描述样式；JavaScript 编写行为和逻辑 |
| client/server | front end/back end | 前者强调通信角色；后者强调系统功能分层 |
| GET | POST | GET 偏读取且参数常在 URL；POST 偏提交且数据常在正文 |

## 19. 小白自测

1. 为什么只知道域名还不能直接把 packet 发给服务器？
2. IP 地址和端口号分别解决什么问题？
3. DNS 服务器是不是只有一台？为什么需要分层和缓存？
4. DHCP 通常会给新接入网络的设备哪些信息？
5. `https://www.example.com/search?q=cat` 中，scheme、hostname、path 和 query 分别是什么？
6. HTTP 404 和 500 的错误责任范围有什么不同？
7. 为什么打开一个网页可能产生几十个 HTTP 请求？
8. HTML、CSS、JavaScript 各自负责什么？
9. 为什么前端 `pattern` 校验不能代替后端校验？
10. 在 `search1.html` 中，`name="q"` 怎样变成 URL 中的 `q=cats`？

如果能不用背诵、而是沿着“名称 → 地址 → 连接 → 请求 → 响应 → 渲染”的链路回答这些问题，就已经掌握了本讲的基础框架。

## 20. 来源索引

### 课程原始材料

- [Lecture 8 幻灯片：HTML, CSS, JavaScript](../slides/lecture8.pdf)
- [Lecture 8 英文讲稿](../transcripts/lecture8.txt)
- [Lecture 8 全部示例源码](../source/src8/)

### 本文重点引用的源码

- HTML 骨架：[`hello0.html`](../source/src8/hello0.html)
- 链接：[`link0.html`](../source/src8/link0.html)、[`link3.html`](../source/src8/link3.html)
- GET 搜索表单：[`search0.html`](../source/src8/search0.html)、[`search1.html`](../source/src8/search1.html)
- 表单与正则校验：[`register0.html`](../source/src8/register0.html)、[`register1.html`](../source/src8/register1.html)、[`register2.html`](../source/src8/register2.html)
- CSS：[`home7.html`](../source/src8/home7.html)、[`home7.css`](../source/src8/home7.css)
- JavaScript 事件：[`hello4.html`](../source/src8/hello4.html)、[`hello4.js`](../source/src8/hello4.js)
- 更完整的交互：[`autocomplete.html`](../source/src8/autocomplete.html)、[`geolocation.html`](../source/src8/geolocation.html)

### 页码导航

- Internet、router、TCP/IP：P:p.5–9
- IP、TCP、ports、packet：P:p.10–16
- DNS、FQDN、DHCP：P:p.17–20
- HTTP、HTTPS、URL、请求响应、状态码：P:p.21–42
- HTML 与表单：P:p.43–74
- CSS：P:p.75–87
- JavaScript：P:p.88–116
