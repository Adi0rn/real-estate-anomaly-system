import "server-only";

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
  SafeUser,
} from "./auth-crypto";

export * from "./auth-crypto";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});

const prisma = new PrismaClient({ adapter });

/**
 * Extracts session token from a NextRequest, Request, or Next.js cookies().
 */
export async function extractSessionToken(request?: Request | NextRequest): Promise<string | null> {
  if (request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));

      if (match) {
        return decodeURIComponent(match.substring(SESSION_COOKIE_NAME.length + 1));
      }
    }
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    return cookie ? cookie.value : null;
  } catch {
    return null;
  }
}

/**
 * Server-only authentication helper:
 * Verifies session token cryptographically AND queries user's CURRENT role from database.
 * Never trusts client-supplied headers, parameters, or localStorage.
 */
export async function getCurrentUser(request?: Request | NextRequest): Promise<SafeUser | null> {
  try {
    const token = await extractSessionToken(request);
    if (!token) return null;

    const payload = verifySessionToken(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({
      where: { userId: payload.userId },
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return user ?? null;
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "digest" in error) {
      const digest = (error as { digest?: unknown }).digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_")) {
        throw error;
      }
    }
    console.error("Authentication verification error:", error);
    return null;
  }
}

/**
 * Enforces authenticated ADMIN role.
 * Returns { authorized: true, user } on success, or { authorized: false, error, status } on failure.
 */
export async function requireAdmin(request?: Request | NextRequest): Promise<
  | { authorized: true; user: SafeUser }
  | { authorized: false; error: string; status: number }
> {
  const user = await getCurrentUser(request);

  if (!user) {
    return {
      authorized: false,
      error: "Authentication required.",
      status: 401,
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false,
      error: "Administrator authorization required.",
      status: 403,
    };
  }

  return {
    authorized: true,
    user,
  };
}
