// /admin - the admin area's home (slice 8, #15).
//
// Admins only. The sections themselves are linked from the menu.
// /admin/reports belongs to slice 9 (#16).

import { requireAdmin } from "@/lib/currentUser";

import { AdminMenu } from "./AdminMenu";

export const metadata = {
  title: "Admin · Collabz",
};

export default async function AdminPage() {
  // Admins only. For anyone else this line stops the page right here: a
  // signed-out visitor is sent to /signin and a member sees "page not found"
  // (see requireAdmin in src/lib/currentUser.ts). It stays the FIRST line.
  await requireAdmin();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <AdminMenu />

      <h1 className="mt-6 text-4xl">Admin</h1>

      <p className="mt-4 text-lg text-muted">
        Keep the lists up to date without editing the database by hand.
      </p>

      <ul className="mt-6 list-disc space-y-2 pl-5">
        <li>
          <strong>Categories &amp; tags:</strong> rename, reorder or retire them.
        </li>
        <li>
          <strong>Courses:</strong> add, rename, reorder or retire them.
        </li>
        <li>
          <strong>Users:</strong> suspend someone or remove their photo.
        </li>
      </ul>

      <p className="mt-6 text-sm text-muted">
        Nothing is ever deleted. Retiring something hides it from new choices, and
        everyone who already has it keeps it.
      </p>
    </main>
  );
}
