// The dev "sign in as…" switcher shown in the nav bar (foundation #7,
// design decision 7).
//
// It lists the pretend students. Pick one, press "Switch", and the whole app
// treats you as that person until you pick someone else or "Signed out".
// It is how we test every feature before real sign-in (slice 1) exists.
//
// DEV ONLY. Where the pretend cohort is switched off, and always on the live
// site, this component draws nothing at all.
//
// This is a Server Component (it runs on the server, like a page), which is
// why it can read the database directly. The form needs no JavaScript in the
// browser: pressing the button is an ordinary form post to
// src/app/api/dev/sign-in-as/route.ts.
//
// Join-up (#17) deletes this file when real sign-in replaces it.

import { getCurrentUser } from "@/lib/currentUser";
import { prisma } from "@/lib/db";
import { PRETEND_USER_ID_PREFIX, isPretendCohortEnabled } from "@/lib/pretendCohort";

export async function DevUserSwitcher() {
  if (!isPretendCohortEnabled()) {
    return null;
  }

  // Only pretend users are ever offered, even if real students exist in this
  // database: the switcher must never be a way to become a real person.
  const pretendUsers = await prisma.user.findMany({
    where: { id: { startsWith: PRETEND_USER_ID_PREFIX } },
    orderBy: { id: "asc" },
    include: { profile: true, course: true },
  });
  // Reading who is signed in reads a cookie. That also tells Next.js this
  // page is different for each visitor, so it draws it fresh on every request
  // instead of once when the site is built.
  const currentUser = await getCurrentUser();

  // The switch is on but nobody has loaded the cohort into this database yet.
  if (pretendUsers.length === 0) {
    return (
      <p className="text-sm">
        Dev sign-in: no pretend users yet. Run <code>npm run seed:fake</code>.
      </p>
    );
  }

  return (
    <form
      action="/api/dev/sign-in-as"
      method="post"
      className="flex flex-wrap items-center gap-2 text-sm"
    >
      {/* A <label> tied to the list, so screen readers announce what it is. */}
      <label htmlFor="dev-user-switcher" className="font-medium">
        Dev sign-in as
      </label>

      <select
        id="dev-user-switcher"
        name="userId"
        // Shows who you are signed in as right now ("" is "Signed out").
        // `key` makes React rebuild the list when that changes, so the
        // selected option always matches after switching.
        key={currentUser?.id ?? "signed-out"}
        defaultValue={currentUser?.id ?? ""}
        // max-w-full keeps a long alias from pushing the page wider than a
        // phone screen.
        className="max-w-full rounded border border-current/30 bg-background px-2 py-1"
      >
        <option value="">Signed out</option>
        {pretendUsers.map((user) => (
          <option key={user.id} value={user.id}>
            {describeUser(user)}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="rounded border border-current/30 px-2 py-1 font-medium"
      >
        Switch
      </button>
    </form>
  );
}

// The text for one option in the list, e.g.
//   "02 · The Pretend Sea Captain 02 · Business"
//   "01 · The Pretend Mad Inventor 01 · Software · admin"
//   "31 · (no profile yet) · Software"
// Everything a tester needs to pick the right kind of person at a glance.
function describeUser(user: {
  id: string;
  role: string;
  suspendedAt: Date | null;
  profile: { alias: string } | null;
  course: { name: string } | null;
}): string {
  // "pretend-user-07" -> "07"
  const number = user.id.slice(PRETEND_USER_ID_PREFIX.length);

  const parts = [number, user.profile?.alias ?? "(no profile yet)"];
  if (user.course) parts.push(user.course.name);
  if (user.role === "ADMIN") parts.push("admin");
  if (user.suspendedAt) parts.push("suspended");

  return parts.join(" · ");
}
