// /people/[alias] - one person's profile (slice 4, #11, design decision 10).
//
// A Server Component. The part of the address after /people/ is a readable
// form of the person's alias (see aliasAddress.ts). It shows who they are,
// and for someone else's profile, why you match and whether you can connect.
//
// Only public things are shown: alias, silhouette, bio, course, tags. Never
// an email or a photo (rule B1).

import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getProfileLookup,
  type MatchView,
  type ProfileView,
  type RequestStatus,
} from "@/lib/cohort/profile";
import { SilhouetteStandIn } from "@/lib/cohort/SilhouetteStandIn";
import { requireFinishedProfile } from "@/lib/cohort/standIns";
// Slice 7 (#14): the photo, for the owner, admins and connected people only.
import { CourseMark } from "@/components/CourseMark";
import { textLinkClasses } from "@/components/formStyles";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { ReasonsList } from "@/components/ReasonsList";
import { ScoreBadge } from "@/components/ScoreBadge";
import { TagChip } from "@/components/TagChip";

import { ConnectButton } from "./ConnectButton";

export const metadata = {
  title: "Profile · Collabz",
};

// PageProps is a helper type Next.js generates for each route. In this
// version of Next.js `params` is a Promise, so it has to be awaited.
export default async function PersonProfilePage({
  params,
}: PageProps<"/people/[alias]">) {
  // Not signed in -> /signin. No finished profile -> /onboarding.
  const viewer = await requireFinishedProfile();

  const { alias } = await params;
  const lookup = await getProfileLookup(viewer.id, alias);

  if (lookup.kind === "not-found") {
    // Shows the standard "page not found" page. Covers an address nobody
    // has AND a suspended person, who is not visible.
    notFound();
  }

  return (
    // max-w-2xl on a phone-sized screen; wider (max-w-5xl) from the lg
    // breakpoint (1024px) so the two columns below have room.
    <main className="mx-auto w-full max-w-2xl px-4 py-8 lg:max-w-5xl">
      <p className="text-sm">
        <Link href="/people" className={textLinkClasses}>
          Back to the list
        </Link>
      </p>

      {/* Desktop layout (task 10.1, Desktop layouts board): who they are, the
          photo and "Why you match" in a left column; the bio and tags in a
          right one.

          WHY A GRID AND NOT TWO WRAPPERS: on a phone the order must stay
          header, photo, tags, match (one column, as before). A grid lets the
          tags box sit in the right column at lg while the HTML order is
          unchanged, so no reading order or test changes.

          The grid classes all start with lg:, so below 1024px this is just a
          normal stacked page. The last row is 1fr so the tall tags box adds
          its extra height under "Why you match", not between the header and
          the photo. */}
      <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-10">
        <div className="lg:col-start-1">
          <ProfileHeader profile={lookup.profile} />
        </div>

        {/* Slice 7 (#14): draws nothing for anyone not allowed to see it. */}
        <div className="lg:col-start-1">
          <ProfilePhoto alias={lookup.profile.alias} viewer={viewer} />
        </div>

        <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <TagGroups profile={lookup.profile} />
        </div>

        <div className="lg:col-start-1">
          {lookup.kind === "own" ? (
            <OwnProfileNote />
          ) : (
            <MatchSection address={lookup.profile.address} match={lookup.match} />
          )}
        </div>
      </div>
    </main>
  );
}

function ProfileHeader({ profile }: { profile: ProfileView }) {
  return (
    <div className="mt-4 flex items-center gap-4">
      <SilhouetteStandIn silhouette={profile.silhouette} size={72} />
      <div>
        {/* The alias wraps rather than being cut off, however long. */}
        <h1 className="text-4xl leading-tight [overflow-wrap:anywhere]">{profile.alias}</h1>
        <div className="mt-1">
          <CourseMark
            courseId={profile.courseId}
            name={profile.courseName ?? "No course"}
            variant="plain"
          />
        </div>
      </div>
    </div>
  );
}

// The bio and the tags, one heading per category in catalogue order.
function TagGroups({ profile }: { profile: ProfileView }) {
  return (
    // mt-4 at lg lines the bio up with the top of the header beside it.
    <section className="mt-6 lg:mt-4" aria-label="About this person">
      <p className="text-lg leading-7" data-testid="profile-bio">{profile.bio}</p>

      {profile.tagGroups.map((group) => (
        <div key={group.categoryId} className="mt-4">
          <h2 className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-muted">{group.categoryName}</h2>
          <ul className="mt-1 flex flex-wrap gap-2">
            {group.tagNames.map((tagName) => (
              <li key={tagName}>
                <TagChip>{tagName}</TagChip>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

// Your own profile: no breakdown and no Connect, just a way to edit it.
function OwnProfileNote() {
  return (
    <section className="mt-8 border-t border-line pt-4" data-testid="own-profile">
      <p>This is your profile, as other people see it.</p>
      <p className="mt-2">
        <Link href="/account" className={textLinkClasses}>
          Go to your account
        </Link>
      </p>
    </section>
  );
}

// Someone else's profile: the score, the reasons, and what you can do next.
function MatchSection({ address, match }: { address: string; match: MatchView }) {
  const { explanation } = match;

  return (
    <section className="mt-8 border-t border-line pt-4" aria-label="Why you match">
      <h2 className="text-3xl">Why you match</h2>

      {explanation === null ? (
        <p className="mt-2">There is no match score between you two yet.</p>
      ) : (
        <>
          <p className="mt-2 flex items-center gap-2" data-testid="match-score">
            Score with you:
            <ScoreBadge score={explanation.score} label="Score with you" />
          </p>
          <div className="mt-3">
            <ReasonsList groups={[{ sentences: explanation.sentences }]} />
          </div>
          {/* Shared skills and interests are "for information" only: they
              are not part of the score (rule B5). */}
          {explanation.sharedSkills.length > 0 && (
            <p className="mt-2 text-sm text-muted">
              Skills you share: {explanation.sharedSkills.join(", ")}
            </p>
          )}
          {explanation.sharedInterests.length > 0 && (
            <p className="text-sm text-muted">
              Interests you share: {explanation.sharedInterests.join(", ")}
            </p>
          )}
        </>
      )}

      {match.connectReason === "glitch" && (
        <p className="mt-4 font-bold text-glitch" data-testid="glitch-note">
          This person is your glitch match.
        </p>
      )}

      <ConnectArea address={address} match={match} />
    </section>
  );
}

function ConnectArea({ address, match }: { address: string; match: MatchView }) {
  // An existing request is shown INSTEAD of the button, so nobody is invited
  // to ask twice.
  if (match.requestStatus !== null) {
    return (
      <p className="mt-4 font-medium" data-testid="request-status">
        {requestStatusSentence(match.requestStatus)}
      </p>
    );
  }

  // Not in your top 5 and not your glitch match: no way to connect from here.
  if (match.connectReason === null) {
    return null;
  }

  return (
    <div className="mt-4">
      <ConnectButton address={address} />
    </div>
  );
}

function requestStatusSentence(status: RequestStatus): string {
  return status === "APPROVED"
    ? "You are connected."
    : "A connection request is waiting between you two.";
}
