"use server";
// The Server Actions behind /admin/reports (slice 9, #16, design 7).
//
// EVERY action calls requireAdmin() as its first line, because a Server
// Action is a public address anyone can post to. The form sends the REPORT's
// id and nothing else; who was reported is looked up on the server
// (src/lib/safety/reports.ts).
//
// After a change we refresh the pages that list people, so a suspended user
// vanishes from the graph and search straight away.

import { requireAdmin } from "@/lib/currentUser";
import {
  removeReportedPhoto,
  resolveReport,
  suspendReportedUser,
} from "@/lib/safety/reports";

import { redirectBack } from "../redirectBack";

const PAGE = "/admin/reports";
// Same refresh list as /admin/users: a suspension or removed photo shows on
// these pages too.
const REFRESH = ["/graph", "/people", "/matches", "/admin/users"];

export async function suspendReportedUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "");
  redirectBack(PAGE, REFRESH, await suspendReportedUser(admin.id, reportId));
}

export async function removeReportedPhotoAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "");
  redirectBack(PAGE, REFRESH, await removeReportedPhoto(reportId));
}

export async function resolveReportAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "");
  redirectBack(PAGE, REFRESH, await resolveReport(admin.id, reportId));
}
