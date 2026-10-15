// /matches - your top 5 matches and your glitch match, with why you fit
// (slice 3, #10, design decision 9).
//
// A Server Component that only reads. The one exception is that it makes sure
// you have a glitch match (see getMatchesPage). Everyone is shown by alias and
// silhouette only: never an email, never a photo (rule B1).

import { requireFinishedProfile } from "@/lib/cohort/standIns";
import { getMatchesPage } from "@/lib/matching/matchesPage";

import { MatchCard } from "./MatchCard";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Matches · Collabz",
};

export default async function MatchesPage() {
  // Not signed in -> /signin. No finished profile -> /onboarding.
  //
  // This is slice 4's stand-in for slice 2's redirectIfOnboardingIncomplete(),
  // which is not merged yet. Join-up (#17) swaps it, in one place.
  const viewer = await requireFinishedProfile();

  const { topFive, glitch } = await getMatchesPage(viewer.id);

  return (
    // Wider from lg (1024px): the cards have room for the reasons to sit on
    // fewer, longer lines (Desktop layouts board).
    <main className="mx-auto w-full max-w-2xl px-4 py-8 lg:max-w-4xl">
      <h1 className="text-4xl">Matches</h1>
      <p className="mt-2 text-muted">
        Your five best fits, and one surprise. You can ask any of them to connect.
      </p>

      <section className="mt-8" aria-labelledby="top-five-heading">
        <h2 id="top-five-heading" className="text-3xl">
          Your top 5
        </h2>

        {topFive.length === 0 ? (
          <p className="mt-3" data-testid="no-matches">
            Nobody else has finished their profile yet, so there is nobody to match
            you with. Check back soon.
          </p>
        ) : (
          <ol className="mt-3 space-y-4" data-testid="top-five-list">
            {topFive.map((card, index) => (
              <li key={card.address}>
                <MatchCard card={card} kind="top" rank={index + 1} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-10" aria-labelledby="glitch-heading">
        <h2 id="glitch-heading" className="text-3xl">
          Your surprise match
        </h2>
        <p className="mt-1 text-sm text-muted">
          Picked at random, and never one of your top 5. Sometimes the best
          conversation is the one you didn&apos;t see coming.
        </p>

        {glitch === null ? (
          <p className="mt-3" data-testid="no-glitch">
            Your surprise match appears once a few more people have joined.
          </p>
        ) : (
          <div className="mt-3" data-testid="glitch-match">
            <MatchCard card={glitch} kind="glitch" />
          </div>
        )}
      </section>
    </main>
  );
}
