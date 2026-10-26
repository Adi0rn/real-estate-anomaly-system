import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEmail,
  validatePassword,
  validateRegistrationInput,
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  createSessionForUser,
  validateReviewDecision,
} from "../src/lib/auth-crypto";

test("Email normalization", () => {
  assert.equal(normalizeEmail("  USER@Example.COM  "), "user@example.com");
  assert.equal(normalizeEmail("admin@Test.Org"), "admin@test.org");
});

test("Password strength validation", () => {
  assert.equal(validatePassword("short").valid, false);
  assert.equal(validatePassword("").valid, false);
  assert.equal(validatePassword(null).valid, false);
  assert.equal(validatePassword("validPassword123").valid, true);
  assert.equal(validatePassword("a".repeat(101)).valid, false);
});

test("Registration input validation", () => {
  // Valid registration
  const valid = validateRegistrationInput("Arjun Mehta", "  Arjun@Example.COM ", "strongPass123");
  assert.equal(valid.valid, true);
  assert.equal(valid.trimmedName, "Arjun Mehta");
  assert.equal(valid.normalizedEmail, "arjun@example.com");

  // Invalid names
  assert.equal(validateRegistrationInput("A", "arjun@example.com", "strongPass123").valid, false);
  assert.equal(validateRegistrationInput("   ", "arjun@example.com", "strongPass123").valid, false);

  // Invalid emails
  assert.equal(validateRegistrationInput("Arjun Mehta", "invalid-email", "strongPass123").valid, false);
  assert.equal(validateRegistrationInput("Arjun Mehta", "missing-domain@", "strongPass123").valid, false);

  // Invalid password
  assert.equal(validateRegistrationInput("Arjun Mehta", "arjun@example.com", "short").valid, false);
});

test("Password hashing and bcrypt verification", async () => {
  const plainPassword = "SuperSecretPassword#2026";
  const hash = await hashPassword(plainPassword);

  assert.ok(hash.startsWith("$2a$") || hash.startsWith("$2b$"));
  assert.notEqual(hash, plainPassword);

  // Correct password must match
  const isValid = await verifyPassword(plainPassword, hash);
  assert.equal(isValid, true);

  // Wrong password must be rejected
  const isInvalid = await verifyPassword("WrongPassword#2026", hash);
  assert.equal(isInvalid, false);

  // Empty password must be rejected
  const isEmpty = await verifyPassword("", hash);
  assert.equal(isEmpty, false);
});

test("Strict rejection of legacy demo placeholder hashes and non-bcrypt strings", async () => {
  // Demo placeholder strings must NEVER match, even if provided as the password itself
  assert.equal(await verifyPassword("admin123", "admin_demo_hash"), false);
  assert.equal(await verifyPassword("admin", "admin_demo_hash"), false);
  assert.equal(await verifyPassword("admin_demo_hash", "admin_demo_hash"), false);
  assert.equal(await verifyPassword("password123", "demo_hash_123"), false);
  assert.equal(await verifyPassword("demo_hash_123", "demo_hash_123"), false);

  // Empty values
  assert.equal(await verifyPassword("", "admin_demo_hash"), false);
  assert.equal(await verifyPassword("admin123", ""), false);
  assert.equal(await verifyPassword("", ""), false);

  // Arbitrary non-bcrypt strings must fail closed
  assert.equal(await verifyPassword("secret", "plain_text_password"), false);
  assert.equal(await verifyPassword("secret", "md5:5f4dcc3b5aa765d61d8327deb882cf99"), false);
  assert.equal(await verifyPassword("secret", "sha256:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"), false);

  // Unsupported salt revisions/prefixes ($2x, $2y, $2c, $1, $5, $6) must be strictly rejected
  assert.equal(await verifyPassword("secret", "$2x$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"), false);
  assert.equal(await verifyPassword("secret", "$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"), false);
  assert.equal(await verifyPassword("secret", "$2c$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"), false);
  assert.equal(await verifyPassword("secret", "$1$salt$N9qo8uLOickgx2ZMRZoMye"), false);
  assert.equal(await verifyPassword("secret", "$5$rounds=5000$saltsalt$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68L"), false);
  assert.equal(await verifyPassword("secret", "$6$rounds=5000$saltsalt$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68L"), false);

  // Malformed bcrypt strings (invalid length, bad chars, corrupt salt, truncated)
  assert.equal(await verifyPassword("secret", "$2a$10$short"), false);
  assert.equal(await verifyPassword("secret", "$2a$99$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"), false);
  assert.equal(await verifyPassword("secret", "$2a$10$invalid!characters!in!the!hash!string!12345678901234567890"), false);
  assert.equal(await verifyPassword("secret", "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhW"), false); // 1 char short
  assert.equal(await verifyPassword("secret", "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWyy"), false); // 1 char too long
});

test("Session token signing and cryptographic verification", () => {
  const userId = 42;
  const { token, expiresAt } = createSessionForUser(userId);

  assert.ok(token.includes("."));
  assert.ok(expiresAt.getTime() > Date.now());

  // Verifying valid token
  const payload = verifySessionToken(token);
  assert.ok(payload !== null);
  assert.equal(payload.userId, 42);

  // Tampered payload must be rejected
  const [b64Payload, signature] = token.split(".");
  const decodedJson = JSON.parse(Buffer.from(b64Payload, "base64url").toString());
  decodedJson.userId = 1; // Attempt to elevate to user 1
  const tamperedPayloadB64 = Buffer.from(JSON.stringify(decodedJson)).toString("base64url");
  const tamperedToken = `${tamperedPayloadB64}.${signature}`;

  assert.equal(verifySessionToken(tamperedToken), null);

  // Tampered signature must be rejected
  const tamperedSigToken = `${b64Payload}.invalidSignatureHere`;
  assert.equal(verifySessionToken(tamperedSigToken), null);

  // Expired token must be rejected
  const expiredPayload = {
    userId: 42,
    iat: Math.floor(Date.now() / 1000) - 3600,
    exp: Math.floor(Date.now() / 1000) - 60, // 60 seconds ago
  };
  const expiredToken = signSessionToken(expiredPayload);
  assert.equal(verifySessionToken(expiredToken), null);
});

test("Anomaly review decision validation", () => {
  assert.equal(validateReviewDecision("CONFIRMED").valid, true);
  assert.equal(validateReviewDecision("DISMISSED").valid, true);
  assert.equal(validateReviewDecision("APPROVED").valid, false);
  assert.equal(validateReviewDecision("REJECTED").valid, false);
  assert.equal(validateReviewDecision("").valid, false);
  assert.equal(validateReviewDecision(null).valid, false);
  assert.equal(validateReviewDecision(123).valid, false);
});

test("Role enforcement check", () => {
  // Pure role enforcement logic
  const checkRole = (user: { role: string } | null): { allowed: boolean; status: number } => {
    if (!user) return { allowed: false, status: 401 };
    if (user.role !== "ADMIN") return { allowed: false, status: 403 };
    return { allowed: true, status: 200 };
  };

  assert.deepEqual(checkRole(null), { allowed: false, status: 401 });
  assert.deepEqual(checkRole({ role: "USER" }), { allowed: false, status: 403 });
  assert.deepEqual(checkRole({ role: "GUEST" }), { allowed: false, status: 403 });
  assert.deepEqual(checkRole({ role: "ADMIN" }), { allowed: true, status: 200 });
});
