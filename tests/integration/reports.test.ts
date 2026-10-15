// Tests for the moderation queue's logic (slice 9, #16, task 3.1), against
// the test database. anna reports ben unless a test says otherwise.

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

// Slice 7's photo helper is replaced: we only care WHETHER it is reached.
vi.mock("@/lib/account/photos", () => ({ removeProfilePhoto: vi.fn(async () => {}) }));

import { removeProfilePhoto } from "@/lib/account/photos";
import {
  listReports,
  removeReportedPhoto,
  resolveReport,
  suspendReportedUser,
} from "@/lib/safety/reports";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson } from "../helpers/people";

beforeEach(async () => {
  vi.mocked(removeProfilePhoto).mockClear();
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function addReport(
  reporterId: string,
  reportedId: string,
  options: { status?: "OPEN" | "RESOLVED"; createdAt?: Date } = {},
) {
  return prisma.report.create({
    data: {
      reporterId,
      reportedId,
      reason: "Inappropriate messages",
      status: options.status ?? "OPEN",
      createdAt: options.createdAt ?? new Date(),
    },
  });
}

async function makeAdmin() {
  const admin = await prisma.user.create({
    data: { id: "test-user-admin", email: "admin@cohort-test.test", role: "ADMIN" },
  });
  return admin.id;
}

describe("listReports", () => {
  it("shows reporter, reported person, reason and state", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben", { suspended: true });
    await addReport(anna, ben);

    const [row] = await listReports();

    expect(row).toMatchObject({
      status: "OPEN",
      reason: "Inappropriate messages",
      reporterEmail: "anna@cohort-test.test",
      reporterAlias: "The Test anna",
      reportedId: ben,
      reportedEmail: "ben@cohort-test.test",
      reportedAlias: "The Test ben",
      reportedSuspended: true,
      reportedHasPhoto: false,
      resolvedByEmail: null,
    });
  });

  it("puts open reports first (oldest first), then resolved (newest first)", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    const cara = await createPerson(prisma, "cara");
    const day = (n: number) => new Date(`2026-10-0${n}T10:00:00Z`);
    const resolvedOld = await addReport(anna, ben, { status: "RESOLVED", createdAt: day(1) });
    const openNew = await addReport(anna, cara, { createdAt: day(5) });
    const resolvedNew = await addReport(cara, ben, { status: "RESOLVED", createdAt: day(4) });
    const openOld = await addReport(ben, cara, { createdAt: day(2) });

    const ids = (await listReports()).map((row) => row.id);

    expect(ids).toEqual([openOld.id, openNew.id, resolvedNew.id, resolvedOld.id]);
  });
});

describe("resolveReport", () => {
  it("sets RESOLVED and records the admin, and keeps the first resolver", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    const report = await addReport(anna, ben);
    const adminId = await makeAdmin();
    const secondAdmin = await prisma.user.create({
      data: { id: "test-user-admin2", email: "admin2@cohort-test.test", role: "ADMIN" },
    });

    expect(await resolveReport(adminId, report.id)).toEqual([]);
    expect(await resolveReport(secondAdmin.id, report.id)).toEqual([]);

    const stored = await prisma.report.findUniqueOrThrow({ where: { id: report.id } });
    expect(stored.status).toBe("RESOLVED");
    expect(stored.resolvedById).toBe(adminId);
  });

  it("refuses a report that doesn't exist", async () => {
    const adminId = await makeAdmin();

    expect(await resolveReport(adminId, "nope")).toEqual(["That report doesn't exist."]);
  });
});

describe("suspending and removing a photo from a report", () => {
  it("suspends the reported person, and leaves the report open", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    const report = await addReport(anna, ben);
    const adminId = await makeAdmin();

    expect(await suspendReportedUser(adminId, report.id)).toEqual([]);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: ben } });
    expect(user.suspendedAt).not.toBeNull();
    const stored = await prisma.report.findUniqueOrThrow({ where: { id: report.id } });
    expect(stored.status).toBe("OPEN");
  });

  it("won't let an admin suspend themselves through a report about them", async () => {
    const anna = await createPerson(prisma, "anna");
    const adminId = await makeAdmin();
    const report = await addReport(anna, adminId);

    const problems = await suspendReportedUser(adminId, report.id);

    expect(problems).toEqual(["You can't suspend your own account."]);
  });

  it("removes the reported person's photo through slice 7's helper", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    const report = await addReport(anna, ben);

    expect(await removeReportedPhoto(report.id)).toEqual([]);

    expect(removeProfilePhoto).toHaveBeenCalledWith(ben);
  });

  it("refuses a report that doesn't exist, for both", async () => {
    const adminId = await makeAdmin();

    expect(await suspendReportedUser(adminId, "nope")).toHaveLength(1);
    expect(await removeReportedPhoto("nope")).toHaveLength(1);
    expect(removeProfilePhoto).not.toHaveBeenCalled();
  });
});
