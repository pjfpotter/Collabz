// Tests for `npm run seed:fake` (foundation #7, task 3.4), against the real
// test database. One test per scenario in the pretend-cohort spec
// (openspec/specs/pretend-cohort/spec.md).
//
// What the cohort CONTAINS (who is in the top 5, that scores add up...) is
// checked without a database in tests/unit/pretendCohort.build.test.ts. These
// tests are about SAVING it: that it lands in the database, is safe to
// repeat, and refuses to run where it shouldn't.

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { seedPretendCohort } from "../../prisma/seed-fake";
import { countRowsInEveryTable, emptyDatabase } from "../helpers/database";

describe("seedPretendCohort", () => {
  beforeEach(async () => {
    await emptyDatabase(prisma);
    await seedCatalogue(prisma);

    // Switched on, as on a laptop with PRETEND_COHORT="on" in .env.
    vi.stubEnv("PRETEND_COHORT", "on");
    vi.stubEnv("VERCEL_ENV", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    // No restoring here: tests/helpers/restoreDevData.ts puts the database
    // back once, after the whole test run.
    await prisma.$disconnect();
  });

  // Spec: "Cohort loaded into an empty development database" and
  // "Requests, conversations, a block and a report exist"
  it("loads the whole cohort into a database that has only the catalogue", async () => {
    const result = await seedPretendCohort(prisma);

    expect(result).toMatchObject({
      usersCreated: 32,
      profilesCreated: 30,
      edgesCreated: 435,
      glitchMatchesCreated: 30,
      connectionRequestsCreated: 14,
      conversationsCreated: 4,
      blocksCreated: 1,
      reportsCreated: 1,
    });

    expect(await prisma.user.count({ where: { courseId: "software" } })).toBe(16);
    expect(await prisma.user.count({ where: { courseId: "business" } })).toBe(16);
    expect(await prisma.user.count({ where: { role: "ADMIN" } })).toBe(1);
    expect(await prisma.user.count({ where: { suspendedAt: { not: null } } })).toBe(1);
    expect(await prisma.user.count({ where: { profile: null } })).toBe(2);
    expect(await prisma.profile.count({ where: { completedAt: { not: null } } })).toBe(30);
    expect(await prisma.conversation.count({ where: { closedAt: { not: null } } })).toBe(1);
    expect(await prisma.report.count({ where: { status: "OPEN" } })).toBe(1);
  });

  // Spec: "Profiles follow the catalogue's rules"
  it("gives every profile picks inside each category's limits", async () => {
    await seedPretendCohort(prisma);

    const categories = await prisma.category.findMany();
    const profiles = await prisma.profile.findMany({
      include: { tags: { include: { tag: true } } },
    });

    for (const profile of profiles) {
      for (const category of categories) {
        const picksInCategory = profile.tags.filter(
          (profileTag) => profileTag.tag.categoryId === category.id,
        );
        expect(picksInCategory.length).toBeGreaterThanOrEqual(category.pickMin);
        expect(picksInCategory.length).toBeLessThanOrEqual(category.pickMax);
      }
    }
  });

  it("never gives a profile a retired tag", async () => {
    // Retire a whole handful of tags BEFORE the cohort is built.
    const retired = ["energy-sea-captain", "energy-mad-inventor", "energy-wise-hermit"];
    await prisma.tag.updateMany({
      where: { id: { in: retired } },
      data: { retiredAt: new Date() },
    });

    await seedPretendCohort(prisma);

    expect(await prisma.profileTag.count({ where: { tagId: { in: retired } } })).toBe(0);
  });

  // Spec: "Run twice"
  it("creates nothing and changes nothing on a second run", async () => {
    await seedPretendCohort(prisma);
    const before = await countRowsInEveryTable(prisma);

    const secondRun = await seedPretendCohort(prisma);

    // Every "created" number in the result is 0...
    expect(Object.values(secondRun).every((count) => count === 0)).toBe(true);
    // ...and every table has exactly as many rows as before.
    expect(await countRowsInEveryTable(prisma)).toEqual(before);
  });

  // Spec: "Changes made while developing survive"
  it("keeps a request that was approved by hand", async () => {
    await seedPretendCohort(prisma);
    const pending = await prisma.connectionRequest.findFirstOrThrow({
      where: { status: "PENDING" },
    });
    await prisma.connectionRequest.update({
      where: { id: pending.id },
      data: { status: "APPROVED" },
    });

    await seedPretendCohort(prisma);

    const after = await prisma.connectionRequest.findUniqueOrThrow({
      where: { id: pending.id },
    });
    expect(after.status).toBe("APPROVED");
  });

  // Spec: "A category added later is filled in"
  it("fills in a category that was added to the catalogue afterwards", async () => {
    await seedPretendCohort(prisma);
    const picksBefore = await prisma.profileTag.count();

    // What slice 2 (#9) will do later: add a Skills category.
    await prisma.category.create({
      data: { id: "skills", name: "Skills", pickMin: 1, pickMax: 4, order: 6 },
    });
    await prisma.tag.createMany({
      data: ["Front-end", "Back-end", "Data", "Design", "Marketing", "Finance"].map(
        (name, index) => ({
          id: `skills-${name.toLowerCase()}`,
          categoryId: "skills",
          name,
          description: `${name} (test tag)`,
          order: index + 1,
        }),
      ),
    });

    const result = await seedPretendCohort(prisma);

    // Every one of the 30 profiles now has 1 to 4 skills...
    const profiles = await prisma.profile.findMany({
      include: { tags: { include: { tag: true } } },
    });
    for (const profile of profiles) {
      const skills = profile.tags.filter(
        (profileTag) => profileTag.tag.categoryId === "skills",
      );
      expect(skills.length).toBeGreaterThanOrEqual(1);
      expect(skills.length).toBeLessThanOrEqual(4);
    }
    // ...and those new skills are the ONLY picks that were added: nobody
    // gained an extra Energy or Quality along the way.
    expect(await prisma.profileTag.count()).toBe(picksBefore + result.profileTagsCreated);
    expect(
      await prisma.profileTag.count({ where: { tag: { categoryId: "skills" } } }),
    ).toBe(result.profileTagsCreated);
  });

  // Spec: "Telling pretend users from real ones"
  it("can be told apart from a real user by id or email alone", async () => {
    await seedPretendCohort(prisma);
    await prisma.user.create({ data: { email: "real.student@example.test" } });

    const byId = await prisma.user.count({ where: { id: { startsWith: "pretend-user-" } } });
    const byEmail = await prisma.user.count({
      where: { email: { endsWith: "@collabz.test" } },
    });

    expect(await prisma.user.count()).toBe(33);
    expect(byId).toBe(32);
    expect(byEmail).toBe(32);
  });

  // Spec: "Not switched on"
  it("refuses, and creates nothing, when the pretend cohort is switched off", async () => {
    vi.stubEnv("PRETEND_COHORT", undefined);

    await expect(seedPretendCohort(prisma)).rejects.toThrow(/switched off/);

    expect(await prisma.user.count()).toBe(0);
  });

  // Spec: "Production"
  it("refuses, and creates nothing, on the production deployment", async () => {
    // Switched on by mistake in Vercel's Production settings.
    vi.stubEnv("PRETEND_COHORT", "on");
    vi.stubEnv("VERCEL_ENV", "production");

    await expect(seedPretendCohort(prisma)).rejects.toThrow(/production/);

    expect(await prisma.user.count()).toBe(0);
  });

  it("refuses with a helpful message when the catalogue hasn't been seeded", async () => {
    await emptyDatabase(prisma);

    await expect(seedPretendCohort(prisma)).rejects.toThrow(/npx prisma db seed/);

    expect(await prisma.user.count()).toBe(0);
  });
});
