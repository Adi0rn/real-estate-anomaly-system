
import "server-only";

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export type ReviewDecision = "CONFIRMED" | "DISMISSED";

export async function reviewAnomaly(
  anomalyId: number,
  decision: ReviewDecision,
  adminUserId: number
) {
  if (!Number.isSafeInteger(anomalyId) || anomalyId <= 0) {
    throw new Error("Invalid anomaly ID");
  }

  if (!Number.isSafeInteger(adminUserId) || adminUserId <= 0) {
    throw new Error("Invalid admin user ID");
  }

  if (decision !== "CONFIRMED" && decision !== "DISMISSED") {
    throw new Error("Invalid review decision");
  }

  // This is an internal database operation, NOT an authorization check.
  // Only call it after verifying the authenticated user's ADMIN role.
  const updated = await prisma.$queryRaw<
    Array<{
      anomalyId: number;
      propertyId: number;
      status: string;
      reviewedBy: number | null;
      reviewedAt: Date | null;
    }>
  >`
    UPDATE "PropertyAnomaly"
    SET
      status = ${decision},
      "reviewedBy" = ${adminUserId},
      "reviewedAt" = NOW()
    WHERE "anomalyId" = ${anomalyId}
      AND status = 'PENDING'
    RETURNING
      "anomalyId",
      "propertyId",
      status,
      "reviewedBy",
      "reviewedAt"
  `;

  return updated[0] ?? null;
}
