// /admin/reports - the moderation queue (slice 9, #16, design 7 and 8).
//
// A Server Component with plain forms, in the same style as /admin/users.
// Open reports come first, then resolved ones. Each open report has three
// separate buttons: suspend the reported person, remove their photo, and
// mark the report resolved. The page is only a list: every rule lives in
// src/lib/safety/reports.ts.

import { requireAdmin } from "@/lib/currentUser";
import { listReports, type ReportRow } from "@/lib/safety/reports";

import { AdminMenu } from "../AdminMenu";
import {
  adminButtonClasses,
  adminCardClasses,
  adminMetaClasses,
  adminProblemClasses,
} from "../adminStyles";
import {
  removeReportedPhotoAction,
  resolveReportAction,
  suspendReportedUserAction,
} from "./actions";

export const metadata = {
  title: "Reports · Admin · Collabz",
};

// Always read fresh, so a new report or a resolved one shows straight away.
export const dynamic = "force-dynamic";

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  // Admins only, and the FIRST line. For anyone else this stops the page
  // right here: a signed-out visitor is sent to /signin and a member sees
  // "page not found" (see requireAdmin in src/lib/currentUser.ts).
  await requireAdmin();

  const { problem } = await searchParams;
  const problemText = typeof problem === "string" ? problem : null;

  const reports = await listReports();
  const open = reports.filter((report) => report.status === "OPEN");
  const resolved = reports.filter((report) => report.status === "RESOLVED");

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <AdminMenu />

      <h1 className="mt-6 text-4xl">Reports</h1>
      <p className="mt-2 text-sm text-muted">
        Suspending and removing a photo are separate from resolving: finish
        with Resolve when you are done with a report.
      </p>

      {problemText && (
        <p role="alert" className={`mt-4 ${adminProblemClasses}`}>
          {problemText}
        </p>
      )}

      <h2 className="mt-6 text-2xl">Open ({open.length})</h2>
      {open.length === 0 ? (
        <p className="mt-2 text-sm text-muted" data-testid="no-open-reports">
          No open reports.
        </p>
      ) : (
        <ul className="mt-2 space-y-3" data-testid="open-reports">
          {open.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-2xl">Resolved ({resolved.length})</h2>
      {resolved.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing resolved yet.</p>
      ) : (
        <ul className="mt-2 space-y-3" data-testid="resolved-reports">
          {resolved.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </ul>
      )}
    </main>
  );
}

// "alias (email)", or just the email for someone with no profile yet.
function describePerson(alias: string | null, email: string): string {
  return alias ? `${alias} (${email})` : email;
}

function ReportCard({ report }: { report: ReportRow }) {
  const isOpen = report.status === "OPEN";

  return (
    <li className={adminCardClasses} data-testid="report-card">
      <p className="font-semibold">{report.reason}</p>
      <p className="mt-1 text-sm [overflow-wrap:anywhere]">
        <span className="text-muted">Reported: </span>
        {describePerson(report.reportedAlias, report.reportedEmail)}
      </p>
      <p className="text-sm [overflow-wrap:anywhere]">
        <span className="text-muted">By: </span>
        {describePerson(report.reporterAlias, report.reporterEmail)}
      </p>
      <p className={adminMetaClasses}>
        {report.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}
        {report.reportedHasPhoto && " · Has a photo"}
      </p>
      {/* Said in words, so it never relies on colour. */}
      {report.reportedSuspended && (
        <p className="text-sm font-bold text-danger">Already suspended</p>
      )}
      {!isOpen && report.resolvedByEmail && (
        <p className={adminMetaClasses}>Resolved by {report.resolvedByEmail}</p>
      )}

      {/* Only open reports can be acted on. Each form sends the report's id,
          never the person's: the server looks the person up. */}
      {isOpen && (
        <div className="mt-2 flex flex-wrap gap-2">
          {!report.reportedSuspended && (
            <form action={suspendReportedUserAction}>
              <input type="hidden" name="reportId" value={report.id} />
              <button type="submit" className={adminButtonClasses}>
                Suspend
              </button>
            </form>
          )}
          {report.reportedHasPhoto && (
            <form action={removeReportedPhotoAction}>
              <input type="hidden" name="reportId" value={report.id} />
              <button type="submit" className={adminButtonClasses}>
                Remove photo
              </button>
            </form>
          )}
          <form action={resolveReportAction}>
            <input type="hidden" name="reportId" value={report.id} />
            <button type="submit" className={adminButtonClasses}>
              Resolve
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
