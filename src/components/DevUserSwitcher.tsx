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
// Slice 10 (#45) restyled it as the "dev strip": a dashed orange band above
// the real navigation bar, so nobody mistakes it for product UI. Only the
// look changed; the form, its route and who it offers are as before.
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
      <DevStrip>
        <p className="text-sm">
          Dev sign-in: no pretend users yet. Run <code>npm run seed:fake</code>.
        </p>
      </DevStrip>
    );
  }

  return (
    <DevStrip>
      <form
        action="/api/dev/sign-in-as"
        method="post"
        // min-w-0 and max-w-full let the form shrink to the screen. Without
        // them a flex item won't be narrower than its content, and the
        // longest pretend alias in the list would push the page wider than
        // a phone.
        className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm"
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
          className="min-h-11 min-w-0 max-w-full rounded-control border border-line-strong bg-surface px-2 text-foreground"
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
          className="min-h-11 rounded-control border border-line-strong bg-surface px-3 font-medium text-foreground hover:bg-surface-2"
        >
          Switch
        </button>
      </form>
    </DevStrip>
  );
}

// The dashed orange band the switcher sits in. Dashed and orange on purpose:
// it is the one part of the page that is NOT product UI, and it must look
// that way. business-text is the orange that is readable as words on both
// themes; the border uses the brighter business fill.
function DevStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b-2 border-dashed border-business bg-surface-2 text-business-text">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-1">
        <span className="rounded-control border border-business px-1.5 text-xs font-bold tracking-wider">
          DEV
        </span>
        {children}
      </div>
    </div>
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
