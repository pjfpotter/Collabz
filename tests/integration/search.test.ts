// Tests for the parts of people search that read the database (slice 4, #11,
// tasks 5.1 and 5.2): what the dropdowns offer, and the list for one viewer.
// The filter rules themselves are tested without a database in
// tests/unit/search.test.ts.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { getFilterOptions, getPeopleForViewer } from "@/lib/cohort/search";
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

describe("getFilterOptions", () => {
  it("offers both courses, and every seeded skill and interest", async () => {
    const options = await getFilterOptions();

    expect(options.courses.map((course) => course.name)).toEqual(["Software", "Business"]);
    // Slice 2 (#9) seeds Skills and Interests, 12 tags each, in seed order.
    expect(options.skills).toHaveLength(12);
    expect(options.skills.slice(0, 3)).toEqual([
      { id: "skills-front-end", name: "Front-end" },
      { id: "skills-back-end", name: "Back-end" },
      { id: "skills-data", name: "Data" },
    ]);
    expect(options.interests).toHaveLength(12);
    expect(options.interests[0]).toEqual({ id: "interests-climate", name: "Climate" });
  });

  it("leaves out a retired tag and a retired course", async () => {
    await prisma.tag.update({ where: { id: "skills-design" }, data: { retiredAt: new Date() } });
    await prisma.course.update({ where: { id: "business" }, data: { retiredAt: new Date() } });

    const options = await getFilterOptions();

    expect(options.skills.map((skill) => skill.name)).not.toContain("Design");
    expect(options.skills).toHaveLength(11);
    expect(options.courses.map((course) => course.name)).toEqual(["Software"]);
  });
});

describe("getPeopleForViewer", () => {
  it("lists everyone except the viewer, best match first, then A to Z", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const zed = await createPerson(prisma, "zed");
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await createScore(prisma, viewer, zed, 9);
    // Anna and ben tie, so they come out in alphabetical order.
    await createScore(prisma, viewer, ben, 4);
    await createScore(prisma, viewer, anna, 4);

    const listings = await getPeopleForViewer(viewer);

    expect(listings.map((person) => person.alias)).toEqual([
      "The Test zed",
      "The Test anna",
      "The Test ben",
    ]);
    expect(listings.map((person) => person.scoreWithViewer)).toEqual([9, 4, 4]);
  });

  it("puts someone with no score yet last, without a score", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const scored = await createPerson(prisma, "zed");
    await createPerson(prisma, "anna");
    await createScore(prisma, viewer, scored, 0);

    const listings = await getPeopleForViewer(viewer);

    expect(listings.map((person) => person.alias)).toEqual(["The Test zed", "The Test anna"]);
    expect(listings[1].scoreWithViewer).toBeNull();
  });

  it("leaves out suspended people and people who haven't finished their profile", async () => {
    const viewer = await createPerson(prisma, "viewer");
    await createPerson(prisma, "anna");
    await createPerson(prisma, "sam", { suspended: true });
    await createPerson(prisma, "una", { finishedAt: null });

    const listings = await getPeopleForViewer(viewer);

    expect(listings.map((person) => person.alias)).toEqual(["The Test anna"]);
  });

  it("marks the viewer's top 5 and glitch match, and gives each person's address", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await createScore(prisma, viewer, anna, 5);
    await prisma.glitchMatch.create({ data: { userId: viewer, matchedUserId: ben } });

    const listings = await getPeopleForViewer(viewer);
    const byAlias = Object.fromEntries(listings.map((person) => [person.alias, person]));

    expect(byAlias["The Test anna"]).toMatchObject({
      address: "the-test-anna",
      isTopFive: true,
      isGlitch: false,
    });
    // Ben has no score with the viewer, so he isn't in the top 5.
    expect(byAlias["The Test ben"]).toMatchObject({
      address: "the-test-ben",
      isTopFive: false,
      isGlitch: true,
    });
  });

  it("gives each person's skills and interests by name", async () => {
    const viewer = await createPerson(prisma, "viewer");
    await createPerson(prisma, "anna", {
      tagIds: ["skills-design", "skills-data", "interests-climate", "energy-mad-inventor"],
    });

    const [anna] = await getPeopleForViewer(viewer);

    // In catalogue order (Data before Design), and without the Energy tag.
    expect(anna.skillNames).toEqual(["Data", "Design"]);
    expect(anna.interestNames).toEqual(["Climate"]);
  });
});
