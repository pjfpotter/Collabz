// /admin - PLACEHOLDER (foundation #7).
// Owner: slice 8, issue #15 (track 2). Replace this file with the real page.
//
// Slice 8 owns /admin and everything under it EXCEPT /admin/reports, which
// belongs to slice 9 (the moderation queue).

import { PlaceholderPage } from "@/components/PlaceholderPage";
import { requireAdmin } from "@/lib/currentUser";

export const metadata = {
  title: "Admin · Collabz",
};

export default async function AdminPage() {
  // Admins only. For anyone else this line stops the page right here: a
  // signed-out visitor is sent to /signin and a member sees "page not found"
  // (see requireAdmin in src/lib/currentUser.ts). KEEP this call as the
  // first line when you replace the placeholder.
  await requireAdmin();

  return (
    <PlaceholderPage
      title="Admin"
      slice={8}
      issue={15}
      willShow="Manage categories, tags, courses and users."
    />
  );
}
