import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  validateRegistrationInput,
  hashPassword,
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

    const { name, email, password } = body as Record<string, unknown>;

    const validation = validateRegistrationInput(name, email, password);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.reason },
        { status: 400 },
      );
    }

    const { trimmedName, normalizedEmail } = validation;

    // Check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail! },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists." },
        { status: 409 },
      );
    }

    // Securely hash password using bcrypt
    const passwordHash = await hashPassword(password as string);

    // Register user: Always assign 'USER' role, never client-supplied role
    const newUser = await prisma.user.create({
      data: {
        name: trimmedName!,
        email: normalizedEmail!,
        passwordHash,
        role: "USER",
      },
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Create session cookie
    const { token, expiresAt } = createSessionForUser(newUser.userId);

    const response = NextResponse.json(
      {
        success: true,
        message: "Registration successful.",
        user: newUser,
      },
      { status: 201 },
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt));

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Registration failed. Please check database connection." },
      { status: 500 },
    );
  }
}
