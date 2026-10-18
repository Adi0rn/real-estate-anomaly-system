import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  normalizeEmail,
  verifyPassword,
  createSessionForUser,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/src/lib/auth";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});

const prisma = new PrismaClient({ adapter });

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Request body must be an object." },
        { status: 400 },
      );
    }

    const { email, password } = body as Record<string, unknown>;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 },
      );
    }

    const normalized = normalizeEmail(email);

    // Look up user in database
    const user = await prisma.user.findUnique({
      where: { email: normalized },
    });

    // If user not found, return generic error
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }

    // Verify password against passwordHash
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }

    // Issue signed session token
    const { token, expiresAt } = createSessionForUser(user.userId);

    const safeProfile = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user: safeProfile,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt));

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed. Please verify database availability." },
      { status: 500 },
    );
  }
}
