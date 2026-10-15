// /account - your own account (slice 7, #14; account-management spec:
// "Account page").
//
// A Server Component. It shows, for the signed-in person:
//   - their email and course, with a way to change the course,
//   - with a finished profile: their alias, silhouette, picks and photo,
//   - without one (no onboarding yet): a pointer to /onboarding instead,
//   - Sign out.
//
// Not signed in -> /signin (spec: "Not signed in").

import Link from "next/link";
import { redirect } from "next/navigation";

import { getAccountProfile, type CategoryPicks } from "@/lib/account/accountProfile";
// Stand-ins for slice 2's bio and silhouettes: see src/lib/account/standIns.ts.
import { SilhouettePlaceholder } from "@/lib/account/SilhouettePlaceholder";
import { bioLines } from "@/lib/account/standIns";
import { getActiveCourses } from "@/lib/auth/courses";
import { getCurrentUser } from "@/lib/currentUser";

import { signOutFromAccount } from "./actions";
import { CourseForm } from "./CourseForm";
import { PhotoForm } from "./PhotoForm";
import { noticeClasses, secondaryButtonClasses, textLinkClasses } from "@/components/formStyles";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Account · Collabz",
};

export default async function AccountPage() {
  // The real signed-in user, or the dev switcher's pretend user where the
  // pretend cohort is on (slice 1).
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  const account = await getAccountProfile(user.id);
  const activeCourses = await getActiveCourses();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-4xl">Your account</h1>
      <p className="mt-2 text-muted">
        Signed in as <strong>{account.email}</strong>. Only you can see your email.
      </p>

      <section className="mt-8" aria-labelledby="course-heading">
        <h2 id="course-heading" className="text-3xl">
          Your course
        </h2>
        <CourseForm activeCourses={activeCourses} current={account.course} />
      </section>

      {account.profile ? (
        <>
          <section className="mt-8" aria-labelledby="profile-heading">
            <h2 id="profile-heading" className="text-3xl">
              Your profile
            </h2>
            <div className="mt-3 flex items-center gap-4">
              <SilhouettePlaceholder silhouette={account.profile.silhouette} />
              <div>
                <p className="font-display text-2xl leading-7 [overflow-wrap:anywhere]" data-testid="account-alias">
                  {account.profile.alias}
                </p>
                <Link href="/account/edit/silhouette" className={`text-sm ${textLinkClasses}`}>
                  Change silhouette
                </Link>
              </div>
            </div>
            {/* Built from the picks each time it's shown, never stored. */}
            {/* One paragraph per line of the bio, with a gap between each
                and the label ("Brings", "Looking for"…) in bold, so it's
                easy to scan. */}
            <div className="mt-4 space-y-3" data-testid="account-bio">
              {bioLines(namesByCategory(account.profile.picks)).map((line) => (
                <p key={line.label ?? "opening"}>
                  {line.label && <strong>{line.label}:</strong>} {line.text}
                </p>
              ))}
            </div>
            {/* The answers, set apart from the bio above: a small heading,
                then one card per category (a light border and padding all
                round, with a gap between cards), and each picked tag as a
                rounded "pill". Cards make each category read as its own
                thing; pills make separate picks read as separate items rather
                than one long comma-joined sentence. */}
            <h3 className="mt-6 text-xs font-bold tracking-[0.08em] text-muted uppercase">
              Your answers
            </h3>
            <dl className="mt-3 flex flex-col gap-3" data-testid="account-picks">
              {account.profile.picks.map((group) => (
                <div
                  key={group.categoryId}
                  className="rounded-feature border border-line bg-surface px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <dt className="font-semibold">{group.categoryName}</dt>
                    <Link
                      href={`/account/edit/${group.categoryId}`}
                      className={`shrink-0 text-sm ${textLinkClasses}`}
                      // Says WHICH thing is edited, for screen readers.
                      aria-label={`Edit ${group.categoryName}`}
                    >
                      Edit
                    </Link>
                  </div>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {group.tags.map((tag) => (
                      <span
                        key={tag.id}
                        // A retired tag gets a dashed outline, so it stands
                        // out at a glance as well as in words.
                        className={`inline-flex min-h-8 items-center rounded-full border px-3 text-sm ${
                          tag.retired
                            ? "border-dashed border-line-strong text-muted"
                            : "border-line bg-surface-2 text-foreground"
                        }`}
                      >
                        {tag.name}
                        {tag.retired && " (no longer offered)"}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-8" aria-labelledby="photo-heading">
            <h2 id="photo-heading" className="text-3xl">
              Your photo
            </h2>
            <PhotoForm userId={user.id} photoVersion={photoVersion(account.profile.photoKey)} />
          </section>
        </>
      ) : (
        // Spec "No profile yet": course and sign out still work, but there
        // are no answers to edit and nowhere to put a photo.
        <section className={`mt-8 ${noticeClasses}`} data-testid="no-profile">
          <p>
            You haven&apos;t set up your profile yet. Once you have, you can edit your
            answers and add a photo here.
          </p>
          <Link href="/onboarding" className={`mt-2 inline-block ${textLinkClasses}`}>
            Set up your profile
          </Link>
        </section>
      )}

      <form action={signOutFromAccount} className="mt-10">
        <button type="submit" className={secondaryButtonClasses}>
          Sign out
        </button>
      </form>
    </main>
  );
}

// The shape the bio wants: category id -> names of the picked tags.
function namesByCategory(picks: CategoryPicks[]): Record<string, string[]> {
  return Object.fromEntries(
    picks.map((group) => [group.categoryId, group.tags.map((tag) => tag.name)]),
  );
}

// A short label that changes whenever the photo does: the random part of
// its storage key (e.g. "3f2a….jpg"). It's added to the picture's address so
// the browser fetches a replaced photo instead of showing the old one.
// The key itself is useless to anyone else: photos are only ever served
// after the permission check.
function photoVersion(photoKey: string | null): string | null {
  return photoKey ? (photoKey.split("/").pop() ?? null) : null;
}
