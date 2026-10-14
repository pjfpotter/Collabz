// A person's public profile card: silhouette, alias, bio, skills and
// interests (slice 2, #9, design decision 9).
//
// SHARED COMPONENT. /onboarding/done uses it now; the profile page (slice 4)
// and the account page (slice 7) can show the same card at join-up (#17).
//
// WHAT IT CAN'T SHOW, ON PURPOSE: there's no prop for an email or a photo.
// "Strangers never see your email" (B1) and "photos only after a permission
// check" (B3) are then built into the card itself: nobody can pass one in
// by accident.

import type { BioLine } from "@/lib/profile/bio";

import { Silhouette } from "./Silhouette";

export type ProfileCardProps = {
  alias: string;
  silhouetteId: string;
  // From generateBioLines() (src/lib/profile/bio.ts).
  bioLines: BioLine[];
  // Tag names, in catalogue order.
  skills: string[];
  interests: string[];
  // The course name ("Software"), if the page wants to show it.
  course?: string | null;
};

export function ProfileCard({
  alias,
  silhouetteId,
  bioLines,
  skills,
  interests,
  course,
}: ProfileCardProps) {
  return (
    <article
      className="rounded-lg border border-current/15 p-5"
      aria-labelledby="profile-card-alias"
      data-testid="profile-card"
    >
      <div className="flex items-center gap-4">
        <Silhouette silhouetteId={silhouetteId} size={72} />
        <div>
          <h2 id="profile-card-alias" className="text-2xl font-semibold" data-testid="profile-alias">
            {alias}
          </h2>
          {course && <p className="text-sm text-zinc-600 dark:text-zinc-400">{course}</p>}
        </div>
      </div>

      {/* The bio: one paragraph per line, labels in bold, so it's easy to
          scan (the same layout as /account). */}
      <div className="mt-4 space-y-2" data-testid="profile-bio">
        {bioLines.map((line) => (
          <p key={line.label ?? "opening"}>
            {line.label && <strong>{line.label}:</strong>} {line.text}
          </p>
        ))}
      </div>

      <TagList heading="Skills" names={skills} testId="profile-skills" />
      <TagList heading="Interests" names={interests} testId="profile-interests" />
    </article>
  );
}

// One small heading and its tags as rounded "pills". Left out when empty.
function TagList({ heading, names, testId }: { heading: string; names: string[]; testId: string }) {
  if (names.length === 0) {
    return null;
  }
  return (
    <section className="mt-4">
      <h3 className="text-sm font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400">
        {heading}
      </h3>
      <ul className="mt-2 flex flex-wrap gap-2" data-testid={testId}>
        {names.map((name) => (
          <li key={name} className="rounded-full border border-current/20 bg-current/5 px-3 py-1 text-sm">
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}
