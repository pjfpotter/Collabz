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
import { SilhouetteStandIn, requireFinishedProfile } from "@/lib/cohort/standIns";

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
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <p className="text-sm">
        <Link href="/people" className="underline underline-offset-4">
          Back to the list
        </Link>
      </p>

      <ProfileHeader profile={lookup.profile} />
      <TagGroups profile={lookup.profile} />

      {lookup.kind === "own" ? (
        <OwnProfileNote />
      ) : (
        <MatchSection address={lookup.profile.address} match={lookup.match} />
      )}
    </main>
  );
}

function ProfileHeader({ profile }: { profile: ProfileView }) {
  return (
    <div className="mt-4 flex items-center gap-4">
      <SilhouetteStandIn silhouette={profile.silhouette} size={72} />
      <div>
        <h1 className="text-3xl font-semibold">{profile.alias}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{profile.courseName ?? "No course"}</p>
      </div>
    </div>
  );
}

// The bio and the tags, one heading per category in catalogue order.
function TagGroups({ profile }: { profile: ProfileView }) {
  return (
    <section className="mt-6" aria-label="About this person">
      <p data-testid="profile-bio">{profile.bio}</p>

      {profile.tagGroups.map((group) => (
        <div key={group.categoryId} className="mt-4">
          <h2 className="text-sm font-semibold">{group.categoryName}</h2>
          <ul className="mt-1 flex flex-wrap gap-2">
            {group.tagNames.map((tagName) => (
              <li key={tagName} className="rounded border border-current/40 px-2 py-0.5 text-sm">
                {tagName}
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
    <section className="mt-8 border-t border-current/20 pt-4" data-testid="own-profile">
      <p>This is your profile, as other people see it.</p>
      <p className="mt-2">
        <Link href="/account" className="underline underline-offset-4">
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
    <section className="mt-8 border-t border-current/20 pt-4" aria-label="Why you match">
      <h2 className="text-xl font-semibold">Why you match</h2>

      {explanation === null ? (
        <p className="mt-2">There is no match score between you two yet.</p>
      ) : (
        <>
          <p className="mt-2" data-testid="match-score">
            Score with you: {explanation.score}
          </p>
          <ul className="mt-2 list-disc pl-5">
            {explanation.sentences.map((sentence) => (
              <li key={sentence}>{sentence}</li>
            ))}
          </ul>
          {/* Shared skills and interests are "for information" only: they
              are not part of the score (rule B5). */}
          {explanation.sharedSkills.length > 0 && (
            <p className="mt-2 text-sm">Skills you share: {explanation.sharedSkills.join(", ")}</p>
          )}
          {explanation.sharedInterests.length > 0 && (
            <p className="text-sm">
              Interests you share: {explanation.sharedInterests.join(", ")}
            </p>
          )}
        </>
      )}

      {match.connectReason === "glitch" && (
        <p className="mt-4 font-semibold" data-testid="glitch-note">
          This person is your glitch match.
        </p>
      )}

      <ConnectArea address={address} match={match} />
    </section>
  );
}

// One of: the Connect button, the status of an existing request, or nothing.
function ConnectArea({ address, match }: { address: string; match: MatchView }) {
  // An existing request is shown INSTEAD of the button, so nobody is invited
  // to ask twice.
  if (match.requestStatus !== null) {
    return (
      <p className="mt-4" data-testid="request-status">
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
