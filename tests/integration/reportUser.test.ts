// Tests for reporting a person (slice 9, #16, task 2.2), against the test
// database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { REPORT_REASONS } from "@/lib/safety/reasons";
import { reportUser } from "@/lib/safety/reportUser";

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

describe("reportUser", () => {
  it("stores an OPEN report with the reason picked", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");

    expect(await reportUser(anna, ben, REPORT_REASONS[0])).toEqual([]);

    const reports = await prisma.report.findMany();
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      reporterId: anna,
      reportedId: ben,
      reason: REPORT_REASONS[0],
      status: "OPEN",
      resolvedById: null,
    });
  });

  it("refuses a missing reason or one that isn't on the list, and stores nothing", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");

    expect(await reportUser(anna, ben, "")).toEqual(["Choose a reason from the list."]);
    expect(await reportUser(anna, ben, "Because")).toEqual(["Choose a reason from the list."]);

    expect(await prisma.report.count()).toBe(0);
  });

  it("refuses reporting yourself", async () => {
    const anna = await createPerson(prisma, "anna");

    expect(await reportUser(anna, anna, REPORT_REASONS[0])).toEqual([
      "You can't report yourself.",
    ]);
    expect(await prisma.report.count()).toBe(0);
  });

  it("refuses a person who doesn't exist", async () => {
    const anna = await createPerson(prisma, "anna");

    const problems = await reportUser(anna, "test-user-nobody", REPORT_REASONS[0]);

    expect(problems).toHaveLength(1);
    expect(await prisma.report.count()).toBe(0);
  });

  it("refuses a second report while the first is open, whatever the reason", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await reportUser(anna, ben, REPORT_REASONS[0]);

    const problems = await reportUser(anna, ben, REPORT_REASONS[1]);

    expect(problems).toHaveLength(1);
    expect(await prisma.report.count()).toBe(1);
  });

  it("allows a new report once the first has been resolved", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await reportUser(anna, ben, REPORT_REASONS[0]);
    await prisma.report.updateMany({ data: { status: "RESOLVED" } });

    expect(await reportUser(anna, ben, REPORT_REASONS[1])).toEqual([]);

    expect(await prisma.report.count()).toBe(2);
  });

  it("lets two different people report the same person", async () => {
    const anna = await createPerson(prisma, "anna");
    const cara = await createPerson(prisma, "cara");
    const ben = await createPerson(prisma, "ben");

    expect(await reportUser(anna, ben, REPORT_REASONS[0])).toEqual([]);
    expect(await reportUser(cara, ben, REPORT_REASONS[0])).toEqual([]);

    expect(await prisma.report.count()).toBe(2);
  });
});
