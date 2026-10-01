// Shared helpers for tests that use the database.

import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "@/generated/prisma/client";

// A Prisma client connected to the TEST database, for test code that changes
// data directly. Vitest doesn't need this (its config already points the
// app's client at the test database), but Playwright's tests run in their
// own process, so they connect explicitly.
export function createTestDatabaseClient(): PrismaClient {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error("TEST_DATABASE_URL is not set (see .env.example).");
  }
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

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
