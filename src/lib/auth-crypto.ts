import crypto from "crypto";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE_NAME = "prop_auth_session";
export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET environment variable must be set in production.");
    }
    return "dev_fallback_auth_secret_key_32_characters_minimum_string_for_testing";
  }
  return secret;
}

export type SafeUser = {
  userId: number;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

export type SessionPayload = {
  userId: number;
  iat: number;
  exp: number;
};

/**
 * Normalizes email strings consistently: trimmed and lowercase.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validates password strength (minimum 8 characters, maximum 100).
 */
export function validatePassword(password: unknown): { valid: boolean; reason?: string } {
  if (typeof password !== "string") {
    return { valid: false, reason: "Password must be a string." };
  }
  if (password.length < 8) {
    return { valid: false, reason: "Password must be at least 8 characters long." };
  }
  if (password.length > 100) {
    return { valid: false, reason: "Password must not exceed 100 characters." };
  }
  return { valid: true };
}

/**
 * Validates registration input fields.
 */
export function validateRegistrationInput(name: unknown, email: unknown, password: unknown): {
  valid: boolean;
  reason?: string;
  normalizedEmail?: string;
  trimmedName?: string;
} {
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return { valid: false, reason: "Name must be between 2 and 100 characters." };
  }
  if (typeof email !== "string") {
    return { valid: false, reason: "Email is required." };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalized = normalizeEmail(email);
  if (!emailRegex.test(normalized) || normalized.length > 255) {
    return { valid: false, reason: "Please provide a valid email address." };
  }

  const passCheck = validatePassword(password);
  if (!passCheck.valid) {
    return { valid: false, reason: passCheck.reason };
  }

  return {
    valid: true,
    trimmedName: name.trim(),
    normalizedEmail: normalized,
  };
}

/**
 * Hashes a plain-text password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Strict bcrypt format regex ($2a$ or $2b$ with 2-digit cost parameter and 53-character base64 salt+hash)
// Rejects unsupported revisions such as $2x$ and legacy non-bcrypt formats
const BCRYPT_HASH_REGEX = /^\$2[ab]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/**
 * Verifies a plain-text password against a stored bcrypt hash.
 * Fails closed on missing input, malformed hashes, or non-bcrypt strings.
 */
export async function verifyPassword(password: unknown, storedHash: unknown): Promise<boolean> {
  if (
    typeof password !== "string" ||
    password.length === 0 ||
    typeof storedHash !== "string" ||
    storedHash.length === 0
  ) {
    return false;
  }

  // Reject any string that does not conform to the canonical bcrypt hash format
  if (!BCRYPT_HASH_REGEX.test(storedHash)) {
    return false;
  }

  try {
    return await bcrypt.compare(password, storedHash);
  } catch {
    return false;
  }
}

/**
 * Signs a session payload using HMAC-SHA256 and AUTH_SECRET.
 */
export function signSessionToken(payload: SessionPayload): string {
  const secret = getAuthSecret();
  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson, "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadBase64)
    .digest("base64url");

  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies a signed session token cryptographically.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadBase64, providedSignature] = parts;
  const secret = getAuthSecret();

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadBase64)
    .digest("base64url");

  const sigA = Buffer.from(providedSignature);
  const sigB = Buffer.from(expectedSignature);

  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const payload = JSON.parse(jsonStr) as SessionPayload;

    if (!payload || !Number.isSafeInteger(payload.userId) || payload.userId <= 0) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generates cookie configuration options for session cookies.
 */
export function getSessionCookieOptions(expires?: Date) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
    ...(expires ? { expires } : {}),
  };
}

/**
 * Creates a signed session token for a given user ID.
 */
export function createSessionForUser(userId: number): { token: string; expiresAt: Date } {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_DURATION_SECONDS;

  const payload: SessionPayload = {
    userId,
    iat: now,
    exp,
  };

  return {
    token: signSessionToken(payload),
    expiresAt: new Date(exp * 1000),
  };
}

/**
 * Validates anomaly review decision parameter.
 */
export function validateReviewDecision(decision: unknown): { valid: boolean; error?: string } {
  if (decision !== "CONFIRMED" && decision !== "DISMISSED") {
    return {
      valid: false,
      error: "Invalid review decision. Must be 'CONFIRMED' or 'DISMISSED'.",
    };
  }
  return { valid: true };
}
