// Tests for the stand-ins that read the database (slice 4, #11, task 2.3):
// getTopFive, explainMatch and sendConnectionRequest.
//
// profileBio has no database, so its tests are in tests/unit/profileBio.test.ts.
// requireFinishedProfile needs a real browser request (it reads a cookie and
// redirects), so the Playwright tests cover it.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  REQUESTS_NOT_SWITCHED_ON_MESSAGE,
  explainMatch,
  getTopFive,
  sendConnectionRequest,
} from "@/lib/cohort/standIns";
import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson, createScore } from "../helpers/people";

beforeEach(async () => {
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

afterAll(async () => {
  // No restoring here: tests/helpers/restoreDevData.ts puts the database
  // back once, after the whole test run.
  await prisma.$disconnect();
});

describe("getTopFive", () => {
  it("returns the five highest scores, highest first", async () => {
    const viewer = await createPerson(prisma, "viewer");
    // Seven other people, created in a jumbled order of score so the test
    // can't pass just because of the order rows were added in.
    const scores = { a: 3, b: 9, c: 1, d: 7, e: 5, f: 8, g: 2 };
    for (const [name, score] of Object.entries(scores)) {
      const other = await createPerson(prisma, name);
      await createScore(prisma, viewer, other, score);
    }

    const topFive = await getTopFive(viewer);

    expect(topFive).toEqual([
      { userId: "test-user-b", score: 9 },
      { userId: "test-user-f", score: 8 },
      { userId: "test-user-d", score: 7 },
      { userId: "test-user-e", score: 5 },
      { userId: "test-user-a", score: 3 },
    ]);
  });

  it("finds the viewer's scores whichever side of the pair they are stored on", async () => {
    // A pair is stored once, lower id first. "test-user-m" sits between
    // "test-user-a" and "test-user-z", so it is the second id in one row and
    // the first id in the other.
    const viewer = await createPerson(prisma, "m");
    const before = await createPerson(prisma, "a");
    const after = await createPerson(prisma, "z");
    await createScore(prisma, viewer, before, 4);
    await createScore(prisma, viewer, after, 6);

    const topFive = await getTopFive(viewer);

    expect(topFive.map((match) => match.userId)).toEqual([after, before]);
  });

  it("breaks a tie by who finished their profile first", async () => {
    const viewer = await createPerson(prisma, "viewer");
    // "late" has the lower id, so if ids decided the tie it would come
    // first. It must come second, because it finished later.
    const late = await createPerson(prisma, "a-late", {
      finishedAt: new Date("2026-02-02T00:00:00Z"),
    });
    const early = await createPerson(prisma, "b-early", {
      finishedAt: new Date("2026-01-01T00:00:00Z"),
    });
    await createScore(prisma, viewer, late, 5);
    await createScore(prisma, viewer, early, 5);

    const topFive = await getTopFive(viewer);

    expect(topFive.map((match) => match.userId)).toEqual([early, late]);
  });

  it("breaks a tie between people who finished at the same moment by user id", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const sameMoment = new Date("2026-01-01T00:00:00Z");
    const second = await createPerson(prisma, "b", { finishedAt: sameMoment });
    const first = await createPerson(prisma, "a", { finishedAt: sameMoment });
    await createScore(prisma, viewer, second, 5);
    await createScore(prisma, viewer, first, 5);

    const topFive = await getTopFive(viewer);

    expect(topFive.map((match) => match.userId)).toEqual([first, second]);
  });

  it("leaves out a suspended person, even with the best score", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const visible = await createPerson(prisma, "anna");
    const suspended = await createPerson(prisma, "sam", { suspended: true });
    await createScore(prisma, viewer, visible, 2);
    await createScore(prisma, viewer, suspended, 10);

    const topFive = await getTopFive(viewer);

    expect(topFive).toEqual([{ userId: visible, score: 2 }]);
  });

  it("returns three when only three other people exist", async () => {
    const viewer = await createPerson(prisma, "viewer");
    for (const name of ["a", "b", "c"]) {
      const other = await createPerson(prisma, name);
      await createScore(prisma, viewer, other, 1);
    }

    expect(await getTopFive(viewer)).toHaveLength(3);
  });

  it("returns an empty list for someone with no scores yet", async () => {
    const viewer = await createPerson(prisma, "viewer");

    expect(await getTopFive(viewer)).toEqual([]);
  });

  it("ignores scores between other people", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await createScore(prisma, viewer, anna, 1);
    // A much better score, but it isn't the viewer's.
    await createScore(prisma, anna, ben, 10);

    expect(await getTopFive(viewer)).toEqual([{ userId: anna, score: 1 }]);
  });
});

describe("explainMatch", () => {
  it("returns the stored score and one sentence for each part of it", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    // 2 complements (3 points each) + 1 overlap + 1 tension = 8.
    await createScore(prisma, anna, ben, 8, { complement: 2, overlap: 1, tension: 1 });

    const explanation = await explainMatch(anna, ben);

    expect(explanation?.score).toBe(8);
    expect(explanation?.sentences).toEqual([
      "Complement: 2. What one of you is looking for, the other brings.",
      "You share an Energy or a Vibe Diagnosis.",
      "Your Hero Stories differ.",
    ]);
  });

  it("says so plainly when every part is zero", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await createScore(prisma, anna, ben, 0, { complement: 0, overlap: 0, tension: 0 });

    const explanation = await explainMatch(anna, ben);

    expect(explanation?.sentences).toEqual([
      "Complement: 0. Neither of you is looking for what the other brings.",
      "You don't share an Energy or a Vibe Diagnosis.",
      "You have the same Hero Story.",
    ]);
  });

  it("says when both an Energy and a Vibe Diagnosis are shared", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await createScore(prisma, anna, ben, 2, { overlap: 2 });

    const explanation = await explainMatch(anna, ben);

    expect(explanation?.sentences).toContain("You share both an Energy and a Vibe Diagnosis.");
  });

  it("gives the same answer whichever way round the two people are passed", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await createScore(prisma, anna, ben, 4, { complement: 1, tension: 1 });

    expect(await explainMatch(ben, anna)).toEqual(await explainMatch(anna, ben));
  });

  it("returns null when no score is stored for the pair", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");

    expect(await explainMatch(anna, ben)).toBeNull();
  });

  it("lists the skills and interests both people picked, and only those", async () => {
    // The Skills and Interests categories arrive with slice 2 (#9), so this
    // test adds small ones of its own. emptyDatabase() removes them again.
    await prisma.category.create({
      data: { id: "skills", name: "Skills", pickMin: 1, pickMax: 4, order: 6 },
    });
    await prisma.category.create({
      data: { id: "interests", name: "Interests", pickMin: 1, pickMax: 4, order: 7 },
    });
    await prisma.tag.createMany({
      data: [
        { id: "skills-data", name: "Data", description: "", order: 1, categoryId: "skills" },
        { id: "skills-design", name: "Design", description: "", order: 2, categoryId: "skills" },
        { id: "interests-climate", name: "Climate", description: "", order: 1, categoryId: "interests" },
        { id: "interests-music", name: "Music", description: "", order: 2, categoryId: "interests" },
      ],
    });
    // Both picked Data and Climate. Only anna picked Design, only ben Music.
    // Both also picked the same Energy, which must NOT be listed: it is part
    // of the score, not "for information".
    const anna = await createPerson(prisma, "anna", {
      tagIds: ["skills-data", "skills-design", "interests-climate", "energy-mad-inventor"],
    });
    const ben = await createPerson(prisma, "ben", {
      tagIds: ["skills-data", "interests-climate", "interests-music", "energy-mad-inventor"],
    });
    await createScore(prisma, anna, ben, 1, { overlap: 1 });

    const explanation = await explainMatch(anna, ben);

    expect(explanation?.sharedSkills).toEqual(["Data"]);
    expect(explanation?.sharedInterests).toEqual(["Climate"]);
  });

  it("gives empty lists while the Skills and Interests categories don't exist", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await createScore(prisma, anna, ben, 1);

    const explanation = await explainMatch(anna, ben);

    expect(explanation?.sharedSkills).toEqual([]);
    expect(explanation?.sharedInterests).toEqual([]);
  });
});

describe("sendConnectionRequest", () => {
  it("answers that requests aren't switched on, and stores nothing", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");

    const result = await sendConnectionRequest(anna, ben);

    expect(result).toEqual({ sent: false, message: REQUESTS_NOT_SWITCHED_ON_MESSAGE });
    expect(await prisma.connectionRequest.count()).toBe(0);
  });
});
