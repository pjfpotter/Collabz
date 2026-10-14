// /admin/users - list users, suspend and unsuspend (slice 8, #15).
//
// A Server Component with plain forms. "Remove photo" only appears for
// people who have one, and calls slice 7's removeProfilePhoto through
// removePhoto() in src/lib/admin/users.ts.

import { listUsers } from "@/lib/admin/users";
import { requireAdmin } from "@/lib/currentUser";

import { AdminMenu } from "../AdminMenu";
import { removePhotoAction, suspendUserAction, unsuspendUserAction } from "./actions";

export const metadata = {
  title: "Users · Admin · Collabz",
};

// Always read fresh, so a suspension shows straight away.
export const dynamic = "force-dynamic";

const BUTTON = "rounded border border-current px-3 py-1";

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  // Admins only, and the FIRST line. We keep the admin so we can leave out
  // the Suspend button on their own row.
  const admin = await requireAdmin();

  const { problem } = await searchParams;
  const problemText = typeof problem === "string" ? problem : null;

  const users = await listUsers();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <AdminMenu />

      <h1 className="mt-6 text-3xl font-semibold">Users</h1>
      <p className="mt-2 text-sm">
        A suspended person can&apos;t sign in and disappears from the graph and
        search. Suspending is reversible and deletes nothing.
      </p>

      {problemText && (
        <p role="alert" className="mt-4 rounded border border-current p-3 text-sm">
          {problemText}
        </p>
      )}

      <p className="mt-4 text-sm">{users.length} users</p>

      {/* One card per user rather than a wide table, so it fits a phone. */}
      <ul className="mt-2 space-y-3">
        {users.map((user) => {
          const suspended = user.suspendedAt !== null;
          const isYou = user.id === admin.id;

          return (
            <li
              key={user.id}
              className={`rounded border border-current/30 p-3 ${suspended ? "opacity-70" : ""}`}
            >
              <p className="break-all font-semibold">
                {user.email}
                {isYou && <span className="font-normal"> (you)</span>}
              </p>
              <p className="text-sm">
                {user.alias ?? "No profile yet"} · {user.courseName ?? "No course"} ·{" "}
                {user.role === "ADMIN" ? "Admin" : "Member"}
                {user.hasPhoto && " · Has a photo"}
              </p>
              {suspended && <p className="text-sm font-semibold">Suspended</p>}

              <div className="mt-2 flex flex-wrap gap-2">
                {!isYou && (
                  <form action={suspended ? unsuspendUserAction : suspendUserAction}>
                    <input type="hidden" name="id" value={user.id} />
                    <button type="submit" className={BUTTON}>
                      {suspended ? "Unsuspend" : "Suspend"}
                    </button>
                  </form>
                )}

                {/* Anyone with a photo, including you: removing a photo is
                    not the dangerous action that suspending yourself is. */}
                {user.hasPhoto && (
                  <form action={removePhotoAction}>
                    <input type="hidden" name="id" value={user.id} />
                    <button type="submit" className={BUTTON}>
                      Remove photo
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
