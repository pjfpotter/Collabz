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

// Deletes every row from EVERY table, so each test starts from a known,
// empty state.
//
// The app itself never deletes catalogue rows (they're retired instead,
// rule B2). Deleting is fine here because this only ever runs against the
// test database (vitest.config.mts makes sure of that).
//
// THE ORDER MATTERS. Our tables have no "delete what points at me too" rule,
// so the database refuses to delete a row while another row still points at
// it (see the shared rules in prisma/schema.prisma). So we always delete the
// row that does the pointing first, and the row it points at afterwards:
// messages before their conversation, a profile's tags before the profile,
// everything about a user before the user, and the catalogue last because
// profiles point at tags and users point at courses.
//
// If you add a table to schema.prisma, add it here too, above whatever it
// points at. tests/integration/schema.test.ts fails if a table is missed.
export async function emptyDatabase(prisma: PrismaClient): Promise<void> {
  // Messaging: a message points at its conversation and its sender.
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();

  // Connecting and safety: each of these only points at users.
  await prisma.connectionRequest.deleteMany();
  await prisma.block.deleteMany();
  await prisma.report.deleteMany();

  // Matching: scores and glitch matches only point at users.
  await prisma.glitchMatch.deleteMany();
  await prisma.edge.deleteMany();

  // Profiles: a picked tag points at its profile (and at a tag), and a
  // profile points at its user.
  await prisma.profileTag.deleteMany();
  await prisma.profile.deleteMany();

  // Auth.js sign-in records. Deleting a user would remove their accounts and
  // sessions anyway (they are the one exception with a cascade rule), but
  // verification tokens belong to no user, so they need their own line.
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verificationToken.deleteMany();

  // Users: nothing points at them any more.
  await prisma.user.deleteMany();

  // The catalogue. Pairings point at tags, tags point at their category, and
  // (before the line above) users pointed at courses.
  await prisma.tagPairing.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.course.deleteMany();
}
