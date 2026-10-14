// Tests for saving an edited category (slice 7, #14, task 4.2).
// Spec: "Account page" ("Edit a Seeking tag") and "Edited answers follow the
// onboarding rules".

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { saveCategoryEdit } from "@/lib/account/editAnswers";
import { getEditableCategory } from "@/lib/account/editCatalogue";
import { prisma } from "@/lib/db";
import { orderUserPair } from "@/lib/userPair";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson, createScore } from "../helpers/people";

// The first few real tags in a category, as seeded.
async function tagsIn(categoryId: string): Promise<string[]> {
  const tags = await prisma.tag.findMany({ where: { categoryId }, orderBy: { order: "asc" } });
  return tags.map((tag) => tag.id);
}

// This person's picked tag ids in one category.
async function picksIn(userId: string, categoryId: string): Promise<string[]> {
  const rows = await prisma.profileTag.findMany({
    where: { userId, tag: { categoryId } },
    orderBy: { tagId: "asc" },
  });
  return rows.map((row) => row.tagId);
}

const noRescore = async () => {};

let qualities: string[];
let seeking: string[];
let me: string;

beforeEach(async () => {
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
  qualities = await tagsIn("qualities");
  seeking = await tagsIn("seeking");
  me = await createPerson(prisma, "me", { tagIds: [qualities[0], seeking[0]] });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("saveCategoryEdit", () => {
  // Spec: "Edit a Seeking tag".
  it("replaces the picks in that category only", async () => {
    expect(await saveCategoryEdit(me, "seeking", [seeking[1]], noRescore)).toEqual({ ok: true });

    expect(await picksIn(me, "seeking")).toEqual([seeking[1]]);
    expect(await picksIn(me, "qualities")).toEqual([qualities[0]]);
  });

  it("leaves the alias, requests and conversations alone", async () => {
    const other = await createPerson(prisma, "other");
    await prisma.connectionRequest.create({
      data: { fromUserId: me, toUserId: other, status: "APPROVED" },
    });
    await prisma.conversation.create({ data: orderUserPair(me, other) });

    await saveCategoryEdit(me, "seeking", [seeking[1]], noRescore);

    const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: me } });
    expect(profile.alias).toBe("The Test me");
    expect(await prisma.connectionRequest.count()).toBe(1);
    expect(await prisma.conversation.count()).toBe(1);
  });

  // Real scoring (slice 3): this person's scores are worked out again;
  // other pairs' scores don't change.
  it("rescores this person, and nobody else's scores change", async () => {
    const other = await createPerson(prisma, "other", { tagIds: [qualities[1], seeking[1]] });
    const third = await createPerson(prisma, "third", { tagIds: [qualities[2], seeking[2]] });
    // Made-up scores the real formula would never give.
    await createScore(prisma, me, other, 99);
    await createScore(prisma, other, third, 77);

    await saveCategoryEdit(me, "seeking", [seeking[1]]);

    const myEdge = await prisma.edge.findUniqueOrThrow({
      where: { userAId_userBId: orderUserPair(me, other) },
    });
    expect(myEdge.score).not.toBe(99);
    const otherEdge = await prisma.edge.findUniqueOrThrow({
      where: { userAId_userBId: orderUserPair(other, third) },
    });
    expect(otherEdge.score).toBe(77);
  });

  // Spec: "Pick limit kept".
  it("refuses picks outside the limits, saving nothing and not rescoring", async () => {
    const rescore = vi.fn(noRescore);

    const result = await saveCategoryEdit(me, "qualities", [], rescore);

    expect(result).toEqual({ ok: false, problem: "Pick between 1 and 4." });
    expect(await picksIn(me, "qualities")).toEqual([qualities[0]]);
    expect(rescore).not.toHaveBeenCalled();
  });

  // Spec: "Tag from another category refused".
  it("refuses a tag from another category", async () => {
    const result = await saveCategoryEdit(me, "seeking", [qualities[1]], noRescore);

    expect(result.ok).toBe(false);
    expect(await picksIn(me, "seeking")).toEqual([seeking[0]]);
  });

  // Spec: "Retired tag kept but not offered".
  it("keeps a retired tag until it's removed, then won't take it back", async () => {
    await prisma.tag.update({ where: { id: seeking[0] }, data: { retiredAt: new Date() } });

    // Shown on the edit screen, because they have it.
    const toEdit = await getEditableCategory("seeking", me);
    expect(toEdit?.category.tags.find((tag) => tag.id === seeking[0])?.retired).toBe(true);

    // Keeping it alongside a new pick is fine.
    expect((await saveCategoryEdit(me, "seeking", [seeking[0], seeking[1]], noRescore)).ok).toBe(true);
    // Removing it is fine.
    expect((await saveCategoryEdit(me, "seeking", [seeking[1]], noRescore)).ok).toBe(true);
    // Picking it again is not.
    const again = await saveCategoryEdit(me, "seeking", [seeking[0]], noRescore);
    expect(again.ok).toBe(false);
    expect(await picksIn(me, "seeking")).toEqual([seeking[1]]);
  });

  it("changes the silhouette", async () => {
    expect((await saveCategoryEdit(me, "silhouette", ["silhouette-07"], noRescore)).ok).toBe(true);
    const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: me } });
    expect(profile.silhouette).toBe("silhouette-07");
  });

  it("keeps the edit even if rescoring fails", async () => {
    const failingRescore = async () => {
      throw new Error("scoring is broken");
    };
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await saveCategoryEdit(me, "seeking", [seeking[1]], failingRescore)).toEqual({ ok: true });
    expect(await picksIn(me, "seeking")).toEqual([seeking[1]]);
  });

  it("refuses someone without a finished profile", async () => {
    const unfinished = await createPerson(prisma, "unfinished", { finishedAt: null });
    expect((await saveCategoryEdit(unfinished, "seeking", [seeking[1]], noRescore)).ok).toBe(false);
  });
});
