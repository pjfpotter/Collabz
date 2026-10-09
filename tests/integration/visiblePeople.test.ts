// Tests for getVisiblePeople (slice 4, #11, task 2.1): the one rule for who
// appears on the graph, in the people list and on a profile page.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { getVisiblePeople } from "@/lib/cohort/visiblePeople";
import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson } from "../helpers/people";

describe("getVisiblePeople", () => {
  beforeEach(async () => {
    await emptyDatabase(prisma);
    // People point at a course and pick tags, so the catalogue comes first.
    await seedCatalogue(prisma);
  });

  afterAll(async () => {
    // No restoring here: tests/helpers/restoreDevData.ts puts the database
    // back once, after the whole test run.
    await prisma.$disconnect();
  });

  it("returns people who have finished their profile and aren't suspended", async () => {
    await createPerson(prisma, "anna");
    await createPerson(prisma, "ben");

    const people = await getVisiblePeople();

    expect(people.map((person) => person.alias)).toEqual(["The Test anna", "The Test ben"]);
  });

  it("leaves out a suspended person", async () => {
    await createPerson(prisma, "anna");
    await createPerson(prisma, "sam", { suspended: true });

    const people = await getVisiblePeople();

    expect(people.map((person) => person.alias)).toEqual(["The Test anna"]);
  });

  it("leaves out someone who hasn't finished their profile", async () => {
    await createPerson(prisma, "anna");
    await createPerson(prisma, "una", { finishedAt: null });

    const people = await getVisiblePeople();

    expect(people.map((person) => person.alias)).toEqual(["The Test anna"]);
  });

  it("leaves out a user who has no profile at all", async () => {
    await createPerson(prisma, "anna");
    await prisma.user.create({ data: { email: "nobody@cohort-test.test" } });

    const people = await getVisiblePeople();

    expect(people).toHaveLength(1);
  });

  it("gives each person's alias, silhouette, course and finish date", async () => {
    const finishedAt = new Date("2026-03-04T05:06:07Z");
    const annaId = await createPerson(prisma, "anna", { courseId: "business", finishedAt });

    const [anna] = await getVisiblePeople();

    expect(anna).toMatchObject({
      userId: annaId,
      alias: "The Test anna",
      silhouette: "silhouette-01",
      courseId: "business",
      courseName: "Business",
      completedAt: finishedAt,
    });
  });

  it("gives each person's tags in catalogue order, whatever order they were picked in", async () => {
    // Picked "backwards": Energy before Hero Story. In the catalogue, Hero
    // Story comes first.
    await createPerson(prisma, "anna", {
      tagIds: ["energy-mad-inventor", "hero-story-corporate-escapee"],
    });

    const [anna] = await getVisiblePeople();

    expect(anna.tags.map((tag) => tag.categoryId)).toEqual(["hero-story", "energy"]);
    expect(anna.tags.map((tag) => tag.id)).toEqual([
      "hero-story-corporate-escapee",
      "energy-mad-inventor",
    ]);
  });

  it("keeps a tag that has since been retired", async () => {
    // A retired tag is no longer offered, but stays on profiles that already
    // have it (admin spec).
    await createPerson(prisma, "anna", { tagIds: ["energy-mad-inventor"] });
    await prisma.tag.update({
      where: { id: "energy-mad-inventor" },
      data: { retiredAt: new Date() },
    });

    const [anna] = await getVisiblePeople();

    expect(anna.tags.map((tag) => tag.id)).toEqual(["energy-mad-inventor"]);
  });

  it("never includes an email address", async () => {
    await createPerson(prisma, "anna", { tagIds: ["energy-mad-inventor"] });

    const people = await getVisiblePeople();

    // Turning the whole result into text catches an email hiding anywhere in
    // it, not only in a field called "email".
    const everything = JSON.stringify(people);
    expect(everything).not.toContain("@");
    expect(everything).not.toContain("email");
  });
});
