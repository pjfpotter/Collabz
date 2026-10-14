// Tests for the admin tag functions (slice 8, #15, tasks 2.2 and 2.3) against
// the real test database: adding, renaming, retiring and the pairing rules.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { setTagPairings } from "@/lib/admin/pairings";
import {
  addTag,
  moveTag,
  renameTag,
  setTagRetired,
  updateTagDescription,
} from "@/lib/admin/tags";
import { getCatalogue } from "@/lib/catalogue";
import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson, createScore } from "../helpers/people";

beforeEach(async () => {
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("addTag", () => {
  it("adds an Energy tag last in its category, with id <category>-<name>", async () => {
    const problems = await addTag({
      categoryId: "energy",
      name: "Night Owl",
      description: "Does their best work after midnight.",
      pairedTagIds: [],
    });
    expect(problems).toEqual([]);

    const tag = await prisma.tag.findUniqueOrThrow({ where: { id: "energy-night-owl" } });
    expect(tag.name).toBe("Night Owl");
    expect(tag.categoryId).toBe("energy");
    expect(tag.order).toBe(13); // the seed has 12 Energy tags
  });

  it("refuses a name already used in the category, ignoring capitals", async () => {
    const problems = await addTag({
      categoryId: "energy",
      name: "sea captain",
      description: "Anything.",
      pairedTagIds: [],
    });
    expect(problems).toHaveLength(1);
    expect(await prisma.tag.count({ where: { categoryId: "energy" } })).toBe(12);
  });

  it("refuses an empty name, an empty description and an unknown category", async () => {
    const base = { categoryId: "energy", name: "X Tag", description: "Fine.", pairedTagIds: [] };
    expect(await addTag({ ...base, name: " " })).toHaveLength(1);
    expect(await addTag({ ...base, description: " " })).toHaveLength(1);
    expect(await addTag({ ...base, categoryId: "nope" })).toHaveLength(1);
  });

  it("adds a Seeking tag together with its pairing", async () => {
    const problems = await addTag({
      categoryId: "seeking",
      name: "Keeps Me Laughing",
      description: "Someone who makes the work fun.",
      pairedTagIds: ["qualities-knows-someone"],
    });
    expect(problems).toEqual([]);

    const pairings = await prisma.tagPairing.findMany({
      where: { seekingTagId: "seeking-keeps-me-laughing" },
    });
    expect(pairings.map((pairing) => pairing.qualityTagId)).toEqual([
      "qualities-knows-someone",
    ]);
  });

  it("adds a Quality tag paired from the other side", async () => {
    const problems = await addTag({
      categoryId: "qualities",
      name: "Always Laughing",
      description: "Makes everyone around them smile.",
      pairedTagIds: ["seeking-makes-it-real"],
    });
    expect(problems).toEqual([]);

    const pairing = await prisma.tagPairing.findUniqueOrThrow({
      where: {
        seekingTagId_qualityTagId: {
          seekingTagId: "seeking-makes-it-real",
          qualityTagId: "qualities-always-laughing",
        },
      },
    });
    expect(pairing).toBeTruthy();
  });

  it("refuses a Seeking tag with no pairing, and stores nothing", async () => {
    const tagsBefore = await prisma.tag.count();
    const problems = await addTag({
      categoryId: "seeking",
      name: "Keeps Me Laughing",
      description: "Someone who makes the work fun.",
      pairedTagIds: [],
    });
    expect(problems).toHaveLength(1);
    expect(await prisma.tag.count()).toBe(tagsBefore);
  });

  it("refuses a pairing with a tag from the wrong category or a retired tag", async () => {
    const base = {
      categoryId: "seeking",
      name: "Keeps Me Laughing",
      description: "Someone who makes the work fun.",
    };
    // A Seeking tag can't pair with an Energy tag.
    expect(await addTag({ ...base, pairedTagIds: ["energy-sea-captain"] })).toHaveLength(1);
    // Nor with a Quality tag that has been retired.
    await prisma.tag.update({
      where: { id: "qualities-knows-someone" },
      data: { retiredAt: new Date() },
    });
    expect(await addTag({ ...base, pairedTagIds: ["qualities-knows-someone"] })).toHaveLength(1);
    expect(await prisma.tag.findUnique({ where: { id: "seeking-keeps-me-laughing" } })).toBeNull();
  });

  it("refuses pairings for a category that has none", async () => {
    const problems = await addTag({
      categoryId: "energy",
      name: "Night Owl",
      description: "Does their best work after midnight.",
      pairedTagIds: ["qualities-knows-someone"],
    });
    expect(problems).toHaveLength(1);
  });
});

describe("renameTag", () => {
  it("keeps the id and every stored score", async () => {
    const anna = await createPerson(prisma, "anna", { tagIds: ["qualities-knows-someone"] });
    const ben = await createPerson(prisma, "ben", { tagIds: ["seeking-makes-money-happen"] });
    await createScore(prisma, anna, ben, 7);
    const scoresBefore = await prisma.edge.findMany();

    expect(await renameTag("qualities-knows-someone", "Knows Everyone")).toEqual([]);

    const tag = await prisma.tag.findUniqueOrThrow({ where: { id: "qualities-knows-someone" } });
    expect(tag.name).toBe("Knows Everyone");
    expect(await prisma.edge.findMany()).toEqual(scoresBefore);
  });

  it("refuses a name another tag in the category has", async () => {
    expect(await renameTag("energy-sea-captain", "giving mad inventor energy")).toHaveLength(1);
  });

  it("shows the new name on the catalogue in the same place", async () => {
    const before = (await getCatalogue()).find((category) => category.id === "energy");
    const index = before!.tags.findIndex((tag) => tag.id === "energy-sea-captain");

    await renameTag("energy-sea-captain", "Ship's Captain");

    const after = (await getCatalogue()).find((category) => category.id === "energy");
    expect(after!.tags[index]).toMatchObject({
      id: "energy-sea-captain",
      name: "Ship's Captain",
    });
  });
});

describe("updateTagDescription", () => {
  it("changes the description and refuses an empty one", async () => {
    expect(await updateTagDescription("energy-sea-captain", "New words.")).toEqual([]);
    const tag = await prisma.tag.findUniqueOrThrow({ where: { id: "energy-sea-captain" } });
    expect(tag.description).toBe("New words.");

    expect(await updateTagDescription("energy-sea-captain", "  ")).toHaveLength(1);
  });
});

describe("setTagRetired", () => {
  it("hides the tag from the catalogue but profiles that picked it keep it", async () => {
    const anna = await createPerson(prisma, "anna", { tagIds: ["energy-sea-captain"] });

    expect(await setTagRetired("energy-sea-captain", true)).toEqual([]);

    const energy = (await getCatalogue()).find((category) => category.id === "energy");
    expect(energy!.tags.map((tag) => tag.id)).not.toContain("energy-sea-captain");
    const picks = await prisma.profileTag.findMany({ where: { userId: anna } });
    expect(picks.map((pick) => pick.tagId)).toEqual(["energy-sea-captain"]);
  });

  it("brings the tag back when un-retired", async () => {
    await setTagRetired("energy-sea-captain", true);
    expect(await setTagRetired("energy-sea-captain", false)).toEqual([]);

    const energy = (await getCatalogue()).find((category) => category.id === "energy");
    expect(energy!.tags.map((tag) => tag.id)).toContain("energy-sea-captain");
  });
});

describe("moveTag", () => {
  it("swaps places with the neighbour inside its own category", async () => {
    const before = (await getCatalogue()).find((category) => category.id === "energy")!;
    const [first, second] = before.tags;

    expect(await moveTag(second.id, "up")).toEqual([]);

    const after = (await getCatalogue()).find((category) => category.id === "energy")!;
    expect(after.tags.slice(0, 2).map((tag) => tag.id)).toEqual([second.id, first.id]);
  });

  it("says so when the tag is already first or last", async () => {
    const energy = (await getCatalogue()).find((category) => category.id === "energy")!;
    expect(await moveTag(energy.tags[0].id, "up")).toHaveLength(1);
    expect(await moveTag(energy.tags[energy.tags.length - 1].id, "down")).toHaveLength(1);
  });
});

describe("setTagPairings", () => {
  it("replaces a Seeking tag's pairings", async () => {
    // Seeded: seeking-makes-money-happen <-> knows-someone, room-believes-it.
    expect(
      await setTagPairings("seeking-makes-money-happen", ["qualities-builds-with-hands"]),
    ).toEqual([]);

    const rows = await prisma.tagPairing.findMany({
      where: { seekingTagId: "seeking-makes-money-happen" },
    });
    expect(rows.map((row) => row.qualityTagId)).toEqual(["qualities-builds-with-hands"]);
  });

  it("replaces a Quality tag's pairings from its own side, leaving other tags' rows", async () => {
    const otherRowsBefore = await prisma.tagPairing.count({
      where: { qualityTagId: { not: "qualities-knows-someone" } },
    });

    expect(
      await setTagPairings("qualities-knows-someone", ["seeking-makes-it-real"]),
    ).toEqual([]);

    const own = await prisma.tagPairing.findMany({
      where: { qualityTagId: "qualities-knows-someone" },
    });
    expect(own.map((row) => row.seekingTagId)).toEqual(["seeking-makes-it-real"]);
    expect(
      await prisma.tagPairing.count({ where: { qualityTagId: { not: "qualities-knows-someone" } } }),
    ).toBe(otherRowsBefore);
  });

  it("accepts a tag ticked twice", async () => {
    expect(
      await setTagPairings("seeking-makes-it-real", [
        "qualities-builds-with-hands",
        "qualities-builds-with-hands",
      ]),
    ).toEqual([]);
  });

  it("refuses an empty list, a wrong-category tag and a non-pairing tag, changing nothing", async () => {
    const before = await prisma.tagPairing.findMany({ orderBy: [{ seekingTagId: "asc" }, { qualityTagId: "asc" }] });

    expect(await setTagPairings("seeking-makes-it-real", [])).toHaveLength(1);
    expect(await setTagPairings("seeking-makes-it-real", ["energy-sea-captain"])).toHaveLength(1);
    expect(await setTagPairings("energy-sea-captain", ["qualities-knows-someone"])).toHaveLength(1);

    const after = await prisma.tagPairing.findMany({ orderBy: [{ seekingTagId: "asc" }, { qualityTagId: "asc" }] });
    expect(after).toEqual(before);
  });
});
