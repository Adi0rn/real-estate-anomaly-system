import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireAdmin } from "@/src/lib/auth";
import { reviewAnomaly, ReviewDecision } from "@/src/lib/anomaly-review";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const anomalyId = Number(id);

    // Validate Anomaly ID
    if (!Number.isInteger(anomalyId) || anomalyId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid anomaly ID." },
        { status: 400 },
      );
    }

    // Require verified authenticated ADMIN
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status },
      );
    }

    // Parse & validate request body
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

    const { decision } = body as Record<string, unknown>;

    if (decision !== "CONFIRMED" && decision !== "DISMISSED") {
      return NextResponse.json(
        { success: false, error: "Invalid review decision. Must be 'CONFIRMED' or 'DISMISSED'." },
        { status: 400 },
      );
    }

    // Check if the anomaly exists
    const existingAnomaly = await prisma.propertyAnomaly.findUnique({
      where: { anomalyId },
      select: { anomalyId: true, status: true },
    });

    if (!existingAnomaly) {
      return NextResponse.json(
        { success: false, error: "Anomaly not found." },
        { status: 404 },
      );
    }

    // Check if already reviewed
    if (existingAnomaly.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: `Anomaly #${anomalyId} has already been reviewed (status: ${existingAnomaly.status}).`,
        },
        { status: 409 },
      );
    }

    // Execute review using verified server-authenticated admin ID
    const updated = await reviewAnomaly(
      anomalyId,
      decision as ReviewDecision,
      authCheck.user.userId,
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to apply review decision to anomaly." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Anomaly #${anomalyId} successfully marked as ${decision}.`,
      anomaly: updated,
    });
  } catch (error) {
    console.error("Anomaly review error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during anomaly review." },
      { status: 500 },
    );
  }
}
