import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/**
 * Delete all rows in reverse dependency order.
 * Update this list after each schema migration that adds new models.
 *
 * Current order (as of auth migration):
 *   Analysis → RefreshToken → Account → Product → User
 *
 * Before auth migration, only Analysis → Product exist.
 */
export async function clearDatabase(): Promise<void> {
  await prisma.analysis.deleteMany();
  await prisma.product.deleteMany();
  // After auth migration, add:
  // await prisma.refreshToken.deleteMany();
  // await prisma.account.deleteMany();
  // await prisma.product.deleteMany();
  // await prisma.user.deleteMany();
}
