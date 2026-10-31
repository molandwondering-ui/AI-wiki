import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createApp } from "./app.mjs";

const root = fileURLToPath(new URL("./", import.meta.url));
const envFile = root + ".env";
if (!existsSync(envFile)) {
  writeFileSync(envFile, readFileSync(root + ".env.example", "utf8")
    .replace("BETTER_AUTH_SECRET=", "BETTER_AUTH_SECRET=" + randomBytes(32).toString("hex")),
  { mode: 0o600, flag: "wx" });
}
dotenv.config({ path: envFile, quiet: true });
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("请在 .env 设置 BETTER_AUTH_SECRET（至少 32 个随机字符）；不要使用示例密码。");
}
const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const url = new URL(baseURL);
if (url.protocol !== "http:" || url.hostname !== "localhost" || url.pathname !== "/" || url.search || url.hash) {
  throw new Error("这是本地学习 Demo：BETTER_AUTH_URL 应为 http://localhost:端口。");
}
mkdirSync(root + "data", { recursive: true, mode: 0o700 });
const { app, database, googleConfigured } = await createApp({
  baseURL: url.origin,
  secret: process.env.BETTER_AUTH_SECRET,
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  dbPath: root + "data/auth.sqlite",
});
const server = app.listen(Number(url.port || 80), "127.0.0.1", () => {
  console.log("Google Login Lab:", url.origin);
  console.log("Google OAuth:", googleConfigured ? "已配置；请在浏览器验证真实登录。" : "待配置；打开页面中的配置指南。");
});
server.on("error", error => {
  console.error(error.code === "EADDRINUSE" ? "端口已被占用。请在 .env 更改 BETTER_AUTH_URL 的端口，并同步修改 Google 回调地址。" : error.message);
  database.close();
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  server.close(() => { database.close(); process.exit(0); });
});
