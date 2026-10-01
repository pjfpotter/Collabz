// Shared helpers for tests that use the database.

import type { PrismaClient } from "@/generated/prisma/client";

// Deletes every row from the three catalogue tables, so each test starts from
// a known, empty state.
//
// The app itself never deletes catalogue rows (they're retired instead,
// rule B2). Deleting is fine here because this only ever runs against the
// test database (vitest.config.ts makes sure of that).
export async function emptyCatalogueTables(prisma: PrismaClient): Promise<void> {
  // Tags first: each tag points at a category, and the database refuses to
  // delete a category that still has tags.
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.course.deleteMany();
}
