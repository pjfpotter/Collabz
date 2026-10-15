// THE MODERATION QUEUE (slice 9, #16, design 7 and 8).
//
// What /admin/reports shows and does. Same shape as slice 8's admin
// functions: anything that changes something returns a list of plain-English
// problems, and an empty list means it worked.
//
// The three actions on a report are SEPARATE on purpose (spec: suspend,
// remove photo, or mark resolved). Suspending or removing a photo does not
// resolve the report by itself; the admin decides when they are finished.
//
// Every action here takes the REPORT's id and looks up who was reported on
// the server. The form never sends a user id, so an admin screen can't be
// forged into suspending someone who isn't in a report.
//
// Callers (the Server Actions) check the person is an admin first.

import { removePhoto, suspendUser } from "@/lib/admin/users";
import { prisma } from "@/lib/db";

// One card in the queue. Admins may see emails (the "never shown to other
// users" rule is about members), so both people appear as alias and email.
export type ReportRow = {
  id: string;
  status: "OPEN" | "RESOLVED";
  reason: string;
  createdAt: Date;
  reporterEmail: string;
  reporterAlias: string | null;
  reportedId: string;
  reportedEmail: string;
  reportedAlias: string | null;
  reportedSuspended: boolean;
  reportedHasPhoto: boolean;
  // Empty while the report is open.
  resolvedByEmail: string | null;
};

// Every report. Open ones come first, oldest first (the one waiting longest
// is at the top); resolved ones follow, newest first.
export async function listReports(): Promise<ReportRow[]> {
  const reports = await prisma.report.findMany({
    select: {
      id: true,
      status: true,
      reason: true,
      createdAt: true,
      reporter: { select: { email: true, profile: { select: { alias: true } } } },
      reported: {
        select: {
          id: true,
          email: true,
          suspendedAt: true,
          profile: { select: { alias: true, photoKey: true } },
        },
      },
      resolvedBy: { select: { email: true } },
    },
  });

  const rows: ReportRow[] = reports.map((report) => ({
    id: report.id,
    status: report.status,
    reason: report.reason,
    createdAt: report.createdAt,
    reporterEmail: report.reporter.email,
    reporterAlias: report.reporter.profile?.alias ?? null,
    reportedId: report.reported.id,
    reportedEmail: report.reported.email,
    reportedAlias: report.reported.profile?.alias ?? null,
    reportedSuspended: report.reported.suspendedAt !== null,
    reportedHasPhoto: report.reported.profile?.photoKey != null,
    resolvedByEmail: report.resolvedBy?.email ?? null,
  }));

  const open = rows
    .filter((row) => row.status === "OPEN")
    .sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime());
  const resolved = rows
    .filter((row) => row.status === "RESOLVED")
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
  return [...open, ...resolved];
}

// Marks a report resolved and records which admin did it. Resolving one that
// is already resolved changes nothing, so the FIRST resolver is kept.
export async function resolveReport(adminId: string, reportId: string): Promise<string[]> {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) {
    return ["That report doesn't exist."];
  }

  // `status: "OPEN"` in the filter means a second call matches nothing.
  await prisma.report.updateMany({
    where: { id: reportId, status: "OPEN" },
    data: { status: "RESOLVED", resolvedById: adminId },
  });
  return [];
}

// Suspends the person a report is about, using slice 8's suspendUser (so the
// scores are rescored and they can't suspend themselves out of a report).
export async function suspendReportedUser(adminId: string, reportId: string): Promise<string[]> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { reportedId: true },
  });
  if (!report) {
    return ["That report doesn't exist."];
  }
  return suspendUser(adminId, report.reportedId);
}

// Removes the photo of the person a report is about, using slice 8's
// removePhoto (which calls slice 7's removeProfilePhoto).
export async function removeReportedPhoto(reportId: string): Promise<string[]> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { reportedId: true },
  });
  if (!report) {
    return ["That report doesn't exist."];
  }
  return removePhoto(report.reportedId);
}
