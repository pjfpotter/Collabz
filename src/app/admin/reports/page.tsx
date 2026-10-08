// /admin/reports - PLACEHOLDER (foundation #7).
// Owner: slice 9, issue #16 (track 3). Replace this file with the real page.

import { PlaceholderPage } from "@/components/PlaceholderPage";
import { requireAdmin } from "@/lib/currentUser";

export const metadata = {
  title: "Reports · Collabz",
};

export default async function AdminReportsPage() {
  // Admins only. For anyone else this line stops the page right here: a
  // signed-out visitor is sent to /signin and a member sees "page not found"
  // (see requireAdmin in src/lib/currentUser.ts). KEEP this call as the
  // first line when you replace the placeholder.
  await requireAdmin();

  return (
    <PlaceholderPage
      title="Reports"
      slice={9}
      issue={16}
      willShow="The moderation queue: reports to review, with suspend, remove photo and resolve."
    />
  );
}
