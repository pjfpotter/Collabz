// REPORTING SOMEONE (slice 9, #16, design 5 and 6).
//
// Stores one OPEN report for an admin to review at /admin/reports. Same shape
// as blockUser and slice 8's admin functions: it returns a list of
// plain-English problems, and an empty list means the report was stored.
//
// Reporting does NOT hide anyone or close anything. That is what Block is for;
// a person may want to do one, the other, or both.

import { prisma } from "@/lib/db";

import { isReportReason } from "./reasons";

export async function reportUser(
  reporterId: string,
  reportedId: string,
  reason: string,
): Promise<string[]> {
  // Checked here, not just by the form, because a Server Action is a public
  // address (see reasons.ts).
  if (reporterId === reportedId) {
    return ["You can't report yourself."];
  }
  if (!isReportReason(reason)) {
    return ["Choose a reason from the list."];
  }

  const reported = await prisma.user.findUnique({
    where: { id: reportedId },
    select: { id: true },
  });
  if (!reported) {
    return ["That person could not be found."];
  }

  // One OPEN report per reporter and person (design 6). It stops one person
  // flooding the queue, and a new report is allowed once an admin has
  // resolved the first, so a genuine second problem isn't lost.
  const alreadyOpen = await prisma.report.count({
    where: { reporterId, reportedId, status: "OPEN" },
  });
  if (alreadyOpen > 0) {
    return ["You've already reported this person. An admin will look at it."];
  }

  await prisma.report.create({ data: { reporterId, reportedId, reason } });
  return [];
}
