const $ = id => document.getElementById(id);
const page = document.body.dataset.page;
function message(text) { const el = $("message"); if (el) { el.textContent = text; el.hidden = false; } }
async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options });
  const data = await response.json();
  return { response, data };
}
async function init() {
  const { response, data: config } = await api("/api/config");
  if (!response.ok) throw new Error("本地服务暂时不可用，请确认后端已经启动。");
  if (page === "setup") {
    $("origin").textContent = config.baseURL;
    $("redirect").textContent = config.redirectURI;
    for (const button of document.querySelectorAll(".copy")) button.onclick = async () => {
      try { await navigator.clipboard.writeText($(button.dataset.copy).textContent); button.textContent = "已复制"; }
      catch { message("浏览器没有允许复制，请手动选中上面的地址。"); }
    };
    return;
  }
  if (page === "login") {
    $("status").textContent = config.googleConfigured ? "Google 已配置" : "等待 Google 配置";
    $("login").disabled = !config.googleConfigured;
    $("login-hint").textContent = config.googleConfigured
      ? "点击后会离开本页，前往 Google。配置正确与否仍需真实登录确认。"
      : "先按配置指南创建 OAuth 客户端，填入本地 .env，再重启服务。";
    const notice = new URLSearchParams(location.search).get("notice");
    if (notice === "login-required") message("个人信息页需要登录。你刚才的访问已被后端拦截。");
    if (notice === "signed-out") message("已退出当前会话。可以再次测试受保护接口，它现在应返回 401。");
    if (notice === "oauth-error" || new URLSearchParams(location.search).has("error")) {
      message("这次 Google 登录没有完成。可能是取消授权、测试用户或回调配置问题，请查看配置指南。");
    }
    const session = await api("/api/me");
    if (session.response.ok) { location.replace("/profile"); return; }
    $("login").onclick = async () => {
      $("login").disabled = true;
      $("login-hint").textContent = "正在向后端申请 Google 登录地址…";
      try {
        const { response, data } = await api("/api/auth/sign-in/social", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "google", callbackURL: "/profile", errorCallbackURL: "/?notice=oauth-error" }),
        });
        if (!response.ok || !data.url) throw new Error("无法发起 Google 登录，请检查后端配置并重试。");
        const destination = new URL(data.url);
        if (destination.origin !== "https://accounts.google.com") throw new Error("登录地址不符合预期，已停止跳转。");
        location.assign(destination.href);
      } catch (error) { message(error.message); $("login").disabled = false; $("login-hint").textContent = "未完成跳转，可以检查配置后重试。"; }
    };
  }
  if (page === "profile") {
    const { response, data } = await api("/api/me");
    if (response.status === 401) { location.replace("/?notice=login-required"); return; }
    if (!response.ok) throw new Error("暂时无法读取个人信息，请刷新重试。");
    $("name").textContent = data.user.name;
    $("email").textContent = data.user.email;
    $("user-id").textContent = data.user.id;
    $("verified").textContent = data.user.emailVerified ? "已验证" : "未验证";
    $("expires").textContent = new Date(data.expiresAt).toLocaleString("zh-CN");
    if (data.user.image) { $("avatar").src = data.user.image; $("avatar").hidden = false; }
    $("logout").onclick = async () => {
      $("logout").disabled = true;
      try {
        const { response } = await api("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        if (!response.ok) throw new Error("退出失败，当前登录状态尚未确认失效，请重试。");
        location.replace("/?notice=signed-out");
      } catch (error) { message(error.message); $("logout").disabled = false; }
    };
  }
}
if ($("private")) $("private").onclick = async () => {
  $("private").disabled = true;
  $("result").hidden = false;
  $("result").textContent = "正在向后端请求…";
  try {
    const { response, data } = await api("/api/private");
    $("result").textContent = "GET /api/private → HTTP " + response.status + "\n\n" + JSON.stringify(data, null, 2);
  } catch { $("result").textContent = "请求未完成，请检查本地服务。"; }
  finally { $("private").disabled = false; }
};
init().catch(error => message(error.message || "页面初始化失败，请刷新重试。"));
