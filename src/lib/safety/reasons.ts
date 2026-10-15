// THE REASONS A REPORT CAN GIVE (slice 9, #16, design 5).
//
// People pick one of these; they never type their own. That keeps the
// moderation queue easy to scan and means no new free text in the app (the
// only free text is messages between connected people).
//
// WHY A LIST IN CODE AND NOT A DATABASE TABLE OR ENUM: Report.reason is plain
// text on purpose. Changing this list is then a one-line edit with no
// migration, and old reports keep the words they were made with.
//
// WHY isReportReason EXISTS: the form is built from this list, but a Server
// Action is a public address, so someone can post any text. reportUser calls
// isReportReason on the server and refuses anything not listed.

export const REPORT_REASONS = [
  "Inappropriate messages",
  "Harassment or bullying",
  "Inappropriate or offensive photo",
  "Fake or misleading profile",
  "Spam or unwanted contact",
  "Something else",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

// True only for a string that is exactly one of the listed reasons.
export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === "string" && (REPORT_REASONS as readonly string[]).includes(value);
}
