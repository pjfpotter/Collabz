// Tests for the admin user functions (slice 8, #15, task 3.1) against the
// real test database: suspend, unsuspend, the self-suspend refusal, and the
// users list.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { listUsers, suspendUser, unsuspendUser } from "@/lib/admin/users";
import { getVisiblePeople } from "@/lib/cohort/visiblePeople";
import { prisma } from "@/lib/db";
import { rescoreEveryone } from "@/lib/matching";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson } from "../helpers/people";

beforeEach(async () => {
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Three finished people, all scored against each other (3 pairs).
async function makeThreePeople() {
  const admin = await createPerson(prisma, "admin");
  await prisma.user.update({ where: { id: admin }, data: { role: "ADMIN" } });
  const anna = await createPerson(prisma, "anna");
  const ben = await createPerson(prisma, "ben");
  await rescoreEveryone();
  return { admin, anna, ben };
}

async function edgesInvolving(userId: string): Promise<number> {
  return prisma.edge.count({ where: { OR: [{ userAId: userId }, { userBId: userId }] } });
}

describe("suspendUser", () => {
  it("hides the user, removes their scores and keeps everyone else's", async () => {
    const { admin, anna, ben } = await makeThreePeople();
    expect(await prisma.edge.count()).toBe(3);

    expect(await suspendUser(admin, anna)).toEqual([]);

    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: anna } });
    expect(reloaded.suspendedAt).not.toBeNull();
    expect(await edgesInvolving(anna)).toBe(0);
    // The admin-ben pair is untouched.
    expect(await prisma.edge.count()).toBe(1);

    const visible = await getVisiblePeople();
    expect(visible.map((person) => person.alias)).not.toContain("The Test anna");
    expect(visible).toHaveLength(2);
    expect(ben).toBeTruthy();
  });

  it("refuses to let an admin suspend themselves, and changes nothing", async () => {
    const { admin } = await makeThreePeople();
    const edgesBefore = await prisma.edge.count();

    const problems = await suspendUser(admin, admin);

    expect(problems).toHaveLength(1);
    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: admin } });
    expect(reloaded.suspendedAt).toBeNull();
    expect(await prisma.edge.count()).toBe(edgesBefore);
  });

  it("refuses a user that doesn't exist", async () => {
    const { admin } = await makeThreePeople();
    expect(await suspendUser(admin, "nobody")).toHaveLength(1);
  });

  it("keeps the original date when suspending someone already suspended", async () => {
    const { admin, anna } = await makeThreePeople();
    await suspendUser(admin, anna);
    const first = await prisma.user.findUniqueOrThrow({ where: { id: anna } });

    await suspendUser(admin, anna);

    const second = await prisma.user.findUniqueOrThrow({ where: { id: anna } });
    expect(second.suspendedAt).toEqual(first.suspendedAt);
  });
});

describe("unsuspendUser", () => {
  it("brings the user back into the graph and their scores", async () => {
    const { admin, anna } = await makeThreePeople();
    await suspendUser(admin, anna);

    expect(await unsuspendUser(anna)).toEqual([]);

    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: anna } });
    expect(reloaded.suspendedAt).toBeNull();
    expect(await prisma.edge.count()).toBe(3);
    const visible = await getVisiblePeople();
    expect(visible.map((person) => person.alias)).toContain("The Test anna");
  });
});

describe("listUsers", () => {
  it("lists everyone with email, course, role, alias, suspension and photo", async () => {
    const { admin, anna } = await makeThreePeople();
    await prisma.profile.update({ where: { userId: anna }, data: { photoKey: "photos/x.jpg" } });
    await prisma.user.create({ data: { id: "no-profile", email: "new@example.com" } });
    await suspendUser(admin, anna);

    const rows = await listUsers();

    expect(rows).toHaveLength(4);
    const annaRow = rows.find((row) => row.id === anna)!;
    expect(annaRow).toMatchObject({
      email: "anna@cohort-test.test",
      role: "MEMBER",
      courseName: "Software",
      alias: "The Test anna",
      hasPhoto: true,
    });
    expect(annaRow.suspendedAt).not.toBeNull();
    expect(rows.find((row) => row.id === admin)!.role).toBe("ADMIN");
    const newRow = rows.find((row) => row.id === "no-profile")!;
    expect(newRow).toMatchObject({ alias: null, courseName: null, hasPhoto: false });
  });
});
