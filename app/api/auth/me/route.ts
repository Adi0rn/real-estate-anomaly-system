import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          user: null,
          error: "Not authenticated.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "digest" in error) {
      const digest = (error as { digest?: unknown }).digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_")) {
        throw error;
      }
    }
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        user: null,
        error: "Failed to verify session.",
      },
      { status: 500 },
    );
  }
}
