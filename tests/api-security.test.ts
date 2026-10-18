import test from "node:test";
import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";

test("API Security: Unauthenticated access to GET /api/anomalies is blocked", async () => {
  const res = await fetch(`${BASE_URL}/api/anomalies`);
  assert.equal(res.status, 401, "Expected 401 Unauthorized");
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /authentication required/i);
});

test("API Security: Forged session cookie access to GET /api/anomalies is blocked", async () => {
  const res = await fetch(`${BASE_URL}/api/anomalies`, {
    headers: {
      Cookie: "prop_session=tampered.token.here",
    },
  });
  assert.equal(res.status, 401, "Expected 401 Unauthorized");
  const data = await res.json();
  assert.equal(data.success, false);
});

test("API Security: Unauthenticated access to PATCH /api/admin/anomalies/1/review is blocked", async () => {
  const res = await fetch(`${BASE_URL}/api/admin/anomalies/1/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "CONFIRMED" }),
  });
  assert.equal(res.status, 401, "Expected 401 Unauthorized");
  const data = await res.json();
  assert.equal(data.success, false);
});

test("API Validation: PATCH /api/admin/anomalies with invalid ID returns 400", async () => {
  const res = await fetch(`${BASE_URL}/api/admin/anomalies/invalid-id/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "CONFIRMED" }),
  });
  assert.equal(res.status, 400, "Expected 400 Bad Request");
  const data = await res.json();
  assert.equal(data.success, false);
});

test("API Auth: GET /api/auth/me returns unauthenticated for anonymous user", async () => {
  const res = await fetch(`${BASE_URL}/api/auth/me`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.authenticated, false);
  assert.equal(data.user, null);
});

test("API Auth: POST /api/auth/login validates required fields", async () => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "", password: "" }),
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /required/i);
});

test("API Auth: POST /api/auth/login rejects non-existent credentials generically", async () => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nonexistent_safe_user_test@example.com", password: "Password123!" }),
  });
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /invalid email or password/i);
});

test("API Auth: POST /api/auth/register validates email format and password strength without writing", async () => {
  // Invalid email
  const res1 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email: "invalid-email", password: "ValidPassword123!" }),
  });
  assert.equal(res1.status, 400);
  const data1 = await res1.json();
  assert.equal(data1.success, false);

  // Weak password (< 8 chars)
  const res2 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email: "test@example.com", password: "short" }),
  });
  assert.equal(res2.status, 400);
  const data2 = await res2.json();
  assert.equal(data2.success, false);
});

test("API Auth: POST /api/auth/logout sets expired cookie", async () => {
  const res = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
  });
  assert.equal(res.status, 200);
  const setCookie = res.headers.get("set-cookie");
  assert.ok(setCookie, "Expected set-cookie header on logout");
  assert.match(setCookie, /prop_auth_session=/);
  assert.match(setCookie, /Max-Age=0|expires=/i);
});
