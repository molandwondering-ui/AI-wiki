import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { createApp } from "../app.mjs";

async function fixture(t, configured = false) {
  const secret = randomBytes(32).toString("hex");
  const baseURL = "http://localhost:3000";
  const result = await createApp({ baseURL, secret, dbPath: ":memory:",
    clientId: configured ? "fixture.apps.googleusercontent.com" : "",
    clientSecret: configured ? "fixture-only-not-a-google-secret" : "" });
  const server = result.app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    result.database.close();
  });
  const request = (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { redirect: "manual", ...options });
  const post = (body, origin = baseURL) => ({ method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
  async function session(expiresAt) {
    const context = await result.auth.$context;
    const user = await context.internalAdapter.createUser({ name: "Fixture User", email: `${randomBytes(8).toString("hex")}@example.test`, emailVerified: true });
    const record = await context.internalAdapter.createSession(user.id, false, expiresAt ? { expiresAt } : undefined, true);
    const signature = createHmac("sha256", secret).update(record.token).digest("base64");
    const cookie = `${context.authCookies.sessionToken.name}=${encodeURIComponent(record.token + "." + signature)}`;
    return { cookie, user, record };
  }
  return { ...result, request, post, session };
}

test("missing configuration and unauthenticated requests remain safe", async t => {
  const f = await fixture(t);
  const config = await (await f.request("/api/config")).json();
  assert.equal(config.googleConfigured, false);
  assert.equal(config.redirectURI, "http://localhost:3000/api/auth/callback/google");
  assert.equal((await f.request("/api/auth/sign-in/social", f.post({ provider: "google" }))).status, 503);
  for (const path of ["/api/me", "/api/private"]) assert.equal((await f.request(path)).status, 401);
  for (const path of ["/profile", "/profile.html"]) assert.equal((await f.request(path)).status, 302);
  for (const path of ["/.env", "/data/auth.sqlite", "/server.mjs"]) assert.equal((await f.request(path)).status, 404);
});

test("Google authorization request uses state, PKCE and our exact callback", async t => {
  const f = await fixture(t, true);
  const response = await f.request("/api/auth/sign-in/social", f.post({ provider: "google", callbackURL: "/profile" }));
  assert.equal(response.status, 200);
  const url = new URL((await response.json()).url);
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:3000/api/auth/callback/google");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.ok(url.searchParams.get("code_challenge"));
  assert.ok(url.searchParams.get("state"));
  assert.ok(response.headers.get("set-cookie"));
  for (const scope of ["openid", "email", "profile"]) assert.ok(url.searchParams.get("scope").split(" ").includes(scope));
});

test("untrusted origin and external post-login redirect are rejected", async t => {
  const f = await fixture(t, true);
  assert.equal((await f.request("/api/auth/sign-in/social", f.post({ provider: "google", callbackURL: "/profile" }, "https://evil.example"))).status, 403);
  assert.equal((await f.request("/api/auth/sign-in/social", f.post({ provider: "google", callbackURL: "https://evil.example" }))).status, 403);
});

test("fixture session unlocks endpoints and logout revokes it", async t => {
  const f = await fixture(t);
  const { cookie, user, record } = await f.session();
  const headers = { Cookie: cookie };
  const me = await f.request("/api/me", { headers });
  assert.equal(me.status, 200);
  const body = await me.json();
  assert.equal(body.user.id, user.id);
  assert.equal(JSON.stringify(body).includes(record.token), false);
  assert.equal((await f.request("/api/private", { headers })).status, 200);
  assert.equal((await f.request("/profile", { headers })).status, 200);
  assert.equal((await f.request("/api/me", { headers: { Cookie: cookie + "tampered" } })).status, 401);
  const logout = f.post({});
  logout.headers.Cookie = cookie;
  assert.equal((await f.request("/api/auth/sign-out", logout)).status, 200);
  assert.equal((await f.request("/api/private", { headers })).status, 401);
});

test("expired sessions are rejected", async t => {
  const f = await fixture(t);
  const { cookie } = await f.session(new Date(Date.now() - 60_000));
  assert.equal((await f.request("/api/me", { headers: { Cookie: cookie } })).status, 401);
});
