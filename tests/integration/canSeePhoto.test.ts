// Tests for canSeePhoto, the rule for who may see a photo (slice 7, #14,
// task 1.4). One test per case in design decision 3 and the spec's
// "Optional photo, private until connected" scenarios.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { canSeePhoto } from "@/lib/account/photoRules";
import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson } from "../helpers/people";

// What getCurrentUser() would hand canSeePhoto for this person.
async function asViewer(userId: string) {
  return prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, role: true } });
}

async function connect(fromUserId: string, toUserId: string) {
  await prisma.connectionRequest.create({ data: { fromUserId, toUserId, status: "APPROVED" } });
}

let owner: string;
let other: string;

beforeEach(async () => {
  await emptyDatabase(prisma);
  // createPerson needs the courses from the catalogue.
  await seedCatalogue(prisma);
  owner = await createPerson(prisma, "owner");
  other = await createPerson(prisma, "other");
});

afterAll(async () => {
  // No restoring here: tests/helpers/restoreDevData.ts puts the database
  // back once, after the whole test run.
  await prisma.$disconnect();
});

describe("canSeePhoto", () => {
  it("lets the owner see their own photo", async () => {
    expect(await canSeePhoto(await asViewer(owner), owner)).toBe(true);
  });

  it("lets an admin see anyone's photo", async () => {
    await prisma.user.update({ where: { id: other }, data: { role: "ADMIN" } });
    expect(await canSeePhoto(await asViewer(other), owner)).toBe(true);
  });

  it("lets someone connected see it, whoever sent the request", async () => {
    await connect(other, owner);
    expect(await canSeePhoto(await asViewer(other), owner)).toBe(true);
    expect(await canSeePhoto(await asViewer(owner), other)).toBe(true);
  });

  // Spec: "Stranger cannot see photo".
  it("refuses a stranger", async () => {
    expect(await canSeePhoto(await asViewer(other), owner)).toBe(false);
  });

  it("refuses someone whose request is still waiting", async () => {
    await prisma.connectionRequest.create({
      data: { fromUserId: other, toUserId: owner, status: "PENDING" },
    });
    expect(await canSeePhoto(await asViewer(other), owner)).toBe(false);
  });

  it("refuses someone whose request was declined", async () => {
    await prisma.connectionRequest.create({
      data: { fromUserId: other, toUserId: owner, status: "DECLINED" },
    });
    expect(await canSeePhoto(await asViewer(other), owner)).toBe(false);
  });

  // Spec: "Blocked after connecting". Either person's block hides it.
  it("refuses a connected person once either of them blocks the other", async () => {
    await connect(other, owner);
    await prisma.block.create({ data: { blockerId: owner, blockedId: other } });

    expect(await canSeePhoto(await asViewer(other), owner)).toBe(false);
    expect(await canSeePhoto(await asViewer(owner), other)).toBe(false);
  });

  it("refuses nobody signed in", async () => {
    expect(await canSeePhoto(null, owner)).toBe(false);
  });
});
