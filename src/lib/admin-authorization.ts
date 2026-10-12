
import "server-only";

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export async function isAdmin(userId: number): Promise<boolean> {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { userId },
    select: { role: true },
  });

  return user?.role === "ADMIN";
}
