import { prisma } from "../lib/db";

/**
 * Grants the admin role to an existing, email-verified account.
 *   npm run admin:promote -- you@example.com
 * The person signs up and verifies through the website first, so no password
 * is ever handled by this script.
 */
async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run admin:promote -- <email>");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No account for ${email}. Sign up on the website first.`);
  if (!user.emailVerifiedAt || user.status !== "active") throw new Error(`${email} must verify their email before becoming an admin.`);
  if (user.role === "admin") {
    console.log(`${email} is already an admin.`);
    return;
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { role: "admin" } }),
    prisma.auditLog.create({ data: { actorId: null, action: "user.role", targetType: "user", targetId: user.id, detail: `${user.role} → admin (command line)` } }),
  ]);
  console.log(`${email} is now an admin.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
