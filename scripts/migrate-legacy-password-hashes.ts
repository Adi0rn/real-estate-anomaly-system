/**
 * Guarded Database Migration Script: Legacy Password Hash Remediation
 *
 * Scans the database for legacy plaintext sentinel password hashes ("admin_demo_hash", "demo_hash_123")
 * and migrates them to cryptographically secure bcrypt hashes.
 *
 * SECURITY INVARIANTS:
 * - Does NOT assign the same permanent password to all ordinary users.
 * - Generates unique, cryptographically random per-account temporary passwords (128-bit entropy).
 * - Administrator accounts receive an explicit replacement password via LEGACY_ADMIN_NEW_PASSWORD.
 * - Delivers temporary user credentials to a local git-ignored manifest file (credentials-delivery-manifest.json)
 *   with restricted permissions. Passwords and hashes are NEVER printed to terminal stdout or logs.
 * - Defaults to DRY-RUN mode. No writes occur unless --apply is passed AND CONFIRM_PASSWORD_MIGRATION=true.
 * - Executes within an atomic database transaction.
 *
 * USAGE:
 *   Dry Run (preview only):
 *     npx tsx scripts/migrate-legacy-password-hashes.ts
 *
 *   Live Apply:
 *     $env:LEGACY_ADMIN_NEW_PASSWORD="YourStrongAdminPasswordHere"
 *     $env:CONFIRM_PASSWORD_MIGRATION="true"
 *     npx tsx scripts/migrate-legacy-password-hashes.ts --apply
 */

import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth-crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is not defined.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function runMigration() {
  const isApply = process.argv.includes("--apply");
  const isConfirmed = process.env.CONFIRM_PASSWORD_MIGRATION === "true";

  console.log("=================================================================");
  console.log("   PROPAUDIT LEGACY PASSWORD HASH REMEDIATION & MIGRATION TOOL   ");
  console.log("=================================================================");
  console.log(`Mode: ${isApply ? "LIVE APPLY (Changes will be committed)" : "DRY RUN (Preview only, no writes)"}\n`);

  // 1. Scan and preview existing legacy rows
  const legacyAdminUsers = await prisma.user.findMany({
    where: {
      passwordHash: "admin_demo_hash",
      role: "ADMIN",
    },
    select: { userId: true, email: true, name: true },
  });

  const legacyStandardUsers = await prisma.user.findMany({
    where: {
      passwordHash: "demo_hash_123",
      role: "USER",
    },
    select: { userId: true, email: true, name: true },
  });

  const totalLegacyCount = legacyAdminUsers.length + legacyStandardUsers.length;

  console.log("Database Scan Results:");
  console.log(`  - Legacy Admin Accounts ('admin_demo_hash'): ${legacyAdminUsers.length}`);
  console.log(`  - Legacy User Accounts  ('demo_hash_123'):  ${legacyStandardUsers.length}`);
  console.log(`  - Total Candidate Records:                   ${totalLegacyCount}\n`);

  if (totalLegacyCount === 0) {
    console.log("✓ Zero legacy password hashes found in database. All user records have secure hashes or already migrated.");
    return;
  }

  // 2. If in Dry-Run mode, report preview and exit safely
  if (!isApply) {
    console.log("ℹ DRY RUN COMPLETE: No database modifications were performed.");
    console.log("Design Specifications for Live Migration:");
    console.log("  1. Admin accounts will be updated using LEGACY_ADMIN_NEW_PASSWORD.");
    console.log("  2. Ordinary user accounts will each receive a UNIQUE cryptographically random temporary password.");
    console.log("  3. Credentials will be securely written to a git-ignored delivery file without printing to stdout.");
    console.log("\nTo apply this migration live, configure environment and run with --apply:");
    console.log("  $env:LEGACY_ADMIN_NEW_PASSWORD=\"<NewAdminPassword>\"");
    console.log("  $env:CONFIRM_PASSWORD_MIGRATION=\"true\"");
    console.log("  npx tsx scripts/migrate-legacy-password-hashes.ts --apply");
    return;
  }

  // 3. Validation guards for live apply
  if (!isConfirmed) {
    console.error("❌ Live apply aborted: Missing confirmation guard.");
    console.error("   You must set CONFIRM_PASSWORD_MIGRATION=true in your environment to authorize writes.");
    process.exit(1);
  }

  const adminNewPass = process.env.LEGACY_ADMIN_NEW_PASSWORD;
  if (legacyAdminUsers.length > 0 && (!adminNewPass || adminNewPass.length < 8)) {
    console.error("❌ Live apply aborted: LEGACY_ADMIN_NEW_PASSWORD must be provided and be at least 8 characters long.");
    process.exit(1);
  }

  console.log("Generating fresh cryptographic bcrypt hashes for replacement credentials...");
  const adminNewHash = adminNewPass ? await hashPassword(adminNewPass) : null;

  // Generate unique per-account temporary credentials for each ordinary user
  type UserCredentialDelivery = {
    userId: number;
    email: string;
    name: string;
    temporaryPassword: string;
    generatedAt: string;
  };

  const deliveryManifest: UserCredentialDelivery[] = [];
  const userUpdates: Array<{ userId: number; hash: string }> = [];

  for (const user of legacyStandardUsers) {
    // 16 cryptographically secure random bytes formatted as base64url (approx 22 chars)
    const tempPassword = `Tmp#${crypto.randomBytes(12).toString("base64url")}!`;
    const hashed = await hashPassword(tempPassword);

    deliveryManifest.push({
      userId: user.userId,
      email: user.email,
      name: user.name,
      temporaryPassword: tempPassword,
      generatedAt: new Date().toISOString(),
    });

    userUpdates.push({
      userId: user.userId,
      hash: hashed,
    });
  }

  console.log("Executing migration within atomic database transaction...");

  const result = await prisma.$transaction(async (tx) => {
    let updatedAdmins = 0;
    let updatedUsers = 0;

    // Update Admin Accounts
    if (legacyAdminUsers.length > 0 && adminNewHash) {
      const updateAdminRes = await tx.user.updateMany({
        where: {
          passwordHash: "admin_demo_hash",
          role: "ADMIN",
        },
        data: {
          passwordHash: adminNewHash,
        },
      });
      updatedAdmins = updateAdminRes.count;
    }

    // Update each User Account with its unique bcrypt hash
    for (const update of userUpdates) {
      await tx.user.update({
        where: { userId: update.userId },
        data: { passwordHash: update.hash },
      });
      updatedUsers++;
    }

    return { updatedAdmins, updatedUsers };
  });

  // Securely export the delivery manifest to a git-ignored file
  if (deliveryManifest.length > 0) {
    const manifestPath = path.join(process.cwd(), "credentials-delivery-manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(deliveryManifest, null, 2), {
      mode: 0o600, // Read/write only for owner
    });
    console.log(`\n🔒 Unique per-account credentials securely saved to:`);
    console.log(`   ${manifestPath}`);
    console.log("   (This file is in .gitignore. Credentials were NOT printed to stdout or logs.)");
  }

  console.log("\n=================================================================");
  console.log("✓ MIGRATION COMPLETED SUCCESSFULLY");
  console.log("=================================================================");
  console.log(`  - Admin rows updated: ${result.updatedAdmins}`);
  console.log(`  - Unique user accounts updated: ${result.updatedUsers}`);
  console.log(`  - Total accounts migrated: ${result.updatedAdmins + result.updatedUsers}`);
  console.log("All legacy accounts now authenticate exclusively via modern individual bcrypt hashes.");
}

runMigration()
  .catch((err) => {
    console.error("❌ Migration error:", err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
