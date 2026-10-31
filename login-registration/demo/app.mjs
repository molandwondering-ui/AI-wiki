import express from "express";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { fileURLToPath } from "node:url";

const publicDir = fileURLToPath(new URL("./public/", import.meta.url));

// The same server delivers the web page and the API. No cross-origin setup is needed.
export async function createApp({ baseURL, secret, clientId, clientSecret, dbPath }) {
  const googleConfigured = Boolean(
    clientId?.endsWith(".apps.googleusercontent.com") && clientSecret
  );
  const database = new Database(dbPath);
  const options = {
    appName: "Google Login Lab",
    baseURL,
    secret,
    database,
    trustedOrigins: [baseURL],
    socialProviders: googleConfigured
      ? { google: { clientId, clientSecret } }
      : {},
    session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60 },
  };
  // Automatic migrations are convenient for this local demo, not a deployment policy.
  const { runMigrations } = await getMigrations(options);
  await runMigrations();
  const auth = betterAuth(options);

  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set("Referrer-Policy", "no-referrer");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://*.googleusercontent.com; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'");
    if (req.path.startsWith("/api/") || req.path === "/profile") {
      res.set("Cache-Control", "no-store");
    }
    next();
  });
  app.get("/api/config", (_req, res) => res.json({
    googleConfigured,
    baseURL,
    redirectURI: baseURL + "/api/auth/callback/google",
  }));
  // This demo only accepts browser mutations from its own page, even before login.
  app.use("/api", (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin && req.headers.origin !== baseURL) {
      return res.status(403).json({ code: "INVALID_ORIGIN", message: "请求来自未允许的网站。" });
    }
    next();
  });
  // Give a useful error instead of trying to authenticate with placeholder credentials.
  app.post("/api/auth/sign-in/social", (_req, res, next) => {
    if (!googleConfigured) {
      return res.status(503).json({ code: "GOOGLE_NOT_CONFIGURED", message: "请先填写本地 .env 中的 Google 凭据并重启服务。" });
    }
    next();
  });
  // Mount BEFORE any body parser: Better Auth must read the original request body.
  app.all("/api/auth/*splat", toNodeHandler(auth));

  async function requireSession(req, res, next) {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) {
      if (req.path === "/profile") return res.redirect("/?notice=login-required");
      return res.status(401).json({ code: "UNAUTHORIZED", message: "尚未登录，后端拒绝返回受保护的数据。" });
    }
    res.locals.session = session;
    next();
  }
  app.get("/api/me", requireSession, (_req, res) => {
    const { user, session } = res.locals.session;
    // Only send display fields. Never expose Google access/refresh tokens or a session token.
    res.json({
      user: { id: user.id, name: user.name, email: user.email, image: user.image, emailVerified: user.emailVerified },
      expiresAt: session.expiresAt,
    });
  });
  app.get("/api/private", requireSession, (_req, res) => res.json({
    message: "你已通过后端的登录检查。这条数据只有有效会话才能读取。",
    owner: res.locals.session.user.name,
    checkedAt: new Date().toISOString(),
  }));
  app.get("/profile", requireSession, (_req, res) => res.sendFile(publicDir + "/profile.html"));
  // profile.html itself is also protected; static middleware never serves it directly.
  app.get("/profile.html", (_req, res) => res.redirect("/profile"));
  app.use(express.static(publicDir, { dotfiles: "deny" }));
  app.use((_req, res) => res.status(404).json({ message: "没有这个页面或接口。" }));
  app.use((error, _req, res, _next) => {
    console.error("Request failed:", error.name); // Do not log callback URLs, tokens or headers.
    res.status(500).json({ message: "服务暂时出错，请稍后重试。" });
  });
  return { app, database, auth, googleConfigured };
}
