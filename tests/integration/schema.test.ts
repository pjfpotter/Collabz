// Tests for the rules the DATABASE itself enforces (foundation #7, task 1.8).
//
// These aren't testing our code so much as checking that schema.prisma says
// what we think it says. Each rule below is one that other tracks rely on
// without re-checking it themselves, so if someone edits the schema and
// loosens one by accident, a test here should fail.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { countRowsInEveryTable, emptyDatabase } from "../helpers/database";

// Makes a user with a finished profile. `name` only needs to be different for
// each user in a test; it ends up in the email and the alias.
async function createUserWithProfile(name: string) {
  return prisma.user.create({
    data: {
      email: `${name}@schema-test.test`,
      courseId: "software",
      profile: {
        create: {
          alias: `The Test ${name}`,
          silhouette: "silhouette-01",
          completedAt: new Date(),
        },
      },
    },
  });
}

describe("database rules", () => {
  beforeEach(async () => {
    await emptyDatabase(prisma);
    // Users point at a course and profiles pick tags, so the catalogue has to
    // be there first.
    await seedCatalogue(prisma);
  });

  afterAll(async () => {
    await emptyDatabase(prisma);
    await seedCatalogue(prisma);
    await prisma.$disconnect();
  });

  it("refuses two profiles with the same alias", async () => {
    await createUserWithProfile("anna");
    const second = await prisma.user.create({
      data: { email: "ben@schema-test.test" },
    });

    // Same alias as anna's. The unique rule on Profile.alias must reject it.
    await expect(
      prisma.profile.create({
        data: {
          userId: second.id,
          alias: "The Test anna",
          silhouette: "silhouette-02",
        },
      }),
    ).rejects.toThrow();
  });

  it("refuses a second score for the same pair", async () => {
    const anna = await createUserWithProfile("anna");
    const ben = await createUserWithProfile("ben");
    const pair = { userAId: anna.id, userBId: ben.id };
    const parts = { score: 4, complement: 1, overlap: 0, tension: 1 };

    await prisma.edge.create({ data: { ...pair, ...parts } });

    await expect(
      prisma.edge.create({ data: { ...pair, ...parts } }),
    ).rejects.toThrow();
  });

  it("refuses a second conversation for the same pair", async () => {
    const anna = await createUserWithProfile("anna");
    const ben = await createUserWithProfile("ben");
    const pair = { userAId: anna.id, userBId: ben.id };

    await prisma.conversation.create({ data: pair });

    await expect(prisma.conversation.create({ data: pair })).rejects.toThrow();
  });

  it("refuses to delete a tag that a profile uses", async () => {
    const anna = await createUserWithProfile("anna");
    await prisma.profileTag.create({
      data: { userId: anna.id, tagId: "energy-sea-captain" },
    });

    // This is the safety net behind "tags are retired, never deleted" (B2).
    await expect(
      prisma.tag.delete({ where: { id: "energy-sea-captain" } }),
    ).rejects.toThrow();
  });

  // emptyDatabase() lists the tables by hand, in a careful order. This test
  // puts a row in EVERY table and then checks two things: that there really
  // was a row in every table (so a newly added table can't be forgotten
  // here), and that emptyDatabase() leaves every table empty without the
  // database refusing any of the deletes.
  it("emptyDatabase empties every table, including ones added later", async () => {
    const anna = await createUserWithProfile("anna");
    const ben = await createUserWithProfile("ben");

    await prisma.profileTag.create({
      data: { userId: anna.id, tagId: "energy-sea-captain" },
    });
    // Any Seeking tag and any Quality tag will do; we only need a row.
    const seekingTag = await prisma.tag.findFirstOrThrow({
      where: { categoryId: "seeking" },
    });
    const qualityTag = await prisma.tag.findFirstOrThrow({
      where: { categoryId: "qualities" },
    });
    await prisma.tagPairing.create({
      data: { seekingTagId: seekingTag.id, qualityTagId: qualityTag.id },
    });
    await prisma.edge.create({
      data: {
        userAId: anna.id,
        userBId: ben.id,
        score: 4,
        complement: 1,
        overlap: 0,
        tension: 1,
      },
    });
    await prisma.glitchMatch.create({
      data: { userId: anna.id, matchedUserId: ben.id },
    });
    await prisma.connectionRequest.create({
      data: { fromUserId: anna.id, toUserId: ben.id },
    });
    const conversation = await prisma.conversation.create({
      data: { userAId: anna.id, userBId: ben.id },
    });
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: anna.id,
        body: "Hello",
      },
    });
    await prisma.block.create({
      data: { blockerId: ben.id, blockedId: anna.id },
    });
    await prisma.report.create({
      data: { reporterId: ben.id, reportedId: anna.id, reason: "Test reason" },
    });
    await prisma.account.create({
      data: {
        userId: anna.id,
        type: "oauth",
        provider: "test-provider",
        providerAccountId: "anna-1",
      },
    });
    await prisma.session.create({
      data: {
        userId: anna.id,
        sessionToken: "test-session-token",
        expires: new Date(),
      },
    });
    await prisma.verificationToken.create({
      data: {
        identifier: "anna@schema-test.test",
        token: "test-token",
        expires: new Date(),
      },
    });

    const before = await countRowsInEveryTable(prisma);
    const emptyBefore = Object.keys(before).filter((table) => before[table] === 0);
    // If this fails, a table was added to schema.prisma: give it a row above
    // AND a deleteMany() line in emptyDatabase().
    expect(emptyBefore).toEqual([]);

    await emptyDatabase(prisma);

    const after = await countRowsInEveryTable(prisma);
    const stillFull = Object.keys(after).filter((table) => after[table] > 0);
    expect(stillFull).toEqual([]);
  });
});
