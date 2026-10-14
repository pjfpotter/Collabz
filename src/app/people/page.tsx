// /people - everyone in the cohort as a list, with filters (slice 4, #11,
// design decision 8).
//
// A Server Component. It reads the filters from the page address, loads the
// people, and sends back finished HTML. The filters are an ordinary form (see
// PeopleFilters.tsx), so this page needs no browser JavaScript at all.

import Link from "next/link";

import {
  filterPeople,
  filtersToQuery,
  getFilterOptions,
  getPeopleForViewer,
  hasAnyFilter,
  parseFilters,
  type PersonListing,
} from "@/lib/cohort/search";
import { requireFinishedProfile } from "@/lib/cohort/standIns";

import { textLinkClasses } from "@/components/formStyles";
import { PersonRow } from "@/components/PersonRow";
import { StateMessage } from "@/components/StateMessage";
import { TagChip } from "@/components/TagChip";

import { PeopleFilters } from "./PeopleFilters";

// Sets the browser tab title for this page.
export const metadata = {
  title: "People · Collabz",
};

// PageProps is a helper type Next.js generates for each route. In this
// version of Next.js `searchParams` (the ?course=... part of the address) is
// a Promise, so it has to be awaited.
export default async function PeoplePage({ searchParams }: PageProps<"/people">) {
  // Not signed in -> /signin. No finished profile -> /onboarding.
  const viewer = await requireFinishedProfile();

  const options = await getFilterOptions();
  // Anything in the address that isn't a real course or tag is ignored here.
  const filters = parseFilters(await searchParams, options);

  const everyone = await getPeopleForViewer(viewer.id);
  const people = filterPeople(everyone, filters);

  // The same filters, as the query part of an address, for the link to the
  // graph. Empty text when no filter is on.
  const query = filtersToQuery(filters);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-4xl">People</h1>
      <p className="mt-2 text-muted">
        Everyone in the cohort, best match with you first.
      </p>

      <PeopleFilters options={options} filters={filters} />

      {/* aria-live makes a screen reader read the new count out after the
          filters change, so it is clear that something happened. */}
      <p className="mt-6 text-sm" aria-live="polite" data-testid="people-count">
        {countSentence(people.length, hasAnyFilter(filters))}{" "}
        <Link href={`/graph${query}`} className={textLinkClasses}>
          Show on the graph
        </Link>
      </p>

      {people.length === 0 ? (
        <NobodyMatches filtersAreOn={hasAnyFilter(filters)} />
      ) : (
        <ul className="mt-4 divide-y divide-line" data-testid="people-list">
          {people.map((person) => (
            // The address is unique per person, and unlike the database id it
            // is safe to appear in the page.
            <li key={person.address} className="py-4">
              <PersonListItem person={person} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

// "28 people" / "1 person matches" / "Nobody matches": the line above the
// list.
function countSentence(count: number, filtersAreOn: boolean): string {
  const people = count === 1 ? "1 person" : `${count} people`;
  if (!filtersAreOn) {
    return `${people}.`;
  }
  return count === 1 ? `${people} matches these filters.` : `${people} match these filters.`;
}

// What the page shows in place of the list when it is empty.
function NobodyMatches({ filtersAreOn }: { filtersAreOn: boolean }) {
  if (!filtersAreOn) {
    // No filters and still nobody: the viewer is the only finished profile.
    return (
      <div className="mt-4">
        <StateMessage title="Nobody else has finished their profile yet." />
      </div>
    );
  }
  return (
    <div className="mt-4" data-testid="nobody-matches">
      <StateMessage title="Nobody matches all of these filters.">
        <Link href="/people" className={textLinkClasses}>
          Clear the filters
        </Link>{" "}
        to see everyone.
      </StateMessage>
    </div>
  );
}

// One person in the list. Only public things are shown: alias, silhouette,
// course, tags and the score with you. Never an email or a photo (rule B1).
// One person in the list. Drawn by the shared PersonRow (alias that wraps,
// silhouette, course shape and name, score). The page only adds what is
// specific to this list: the Top 5 / Glitch match words, and the skills and
// interests lines.
function PersonListItem({ person }: { person: PersonListing }) {
  return (
    <PersonRow
      alias={person.alias}
      silhouette={person.silhouette}
      courseId={person.courseId}
      courseName={person.courseName ?? "No course"}
      score={person.scoreWithViewer ?? undefined}
      scoreLabel="Score with you"
      href={`/people/${person.address}`}
    >
      {/* A badge, in words, for the people the viewer is allowed to send a
          connection request to. */}
      {(person.isTopFive || person.isGlitch) && (
        <p className="mt-2 flex flex-wrap gap-2">
          {person.isTopFive && <TagChip>Top 5</TagChip>}
          {person.isGlitch && <TagChip>Glitch match</TagChip>}
        </p>
      )}

      {person.scoreWithViewer === null && (
        <p className="mt-1 text-sm text-muted">No score with you yet</p>
      )}

      {/* Each line only appears if the person picked something in that
          category. Before slice 2 lands, nobody has, so neither shows. */}
      {person.skillNames.length > 0 && (
        <p className="mt-2 text-sm text-muted">Skills: {person.skillNames.join(", ")}</p>
      )}
      {person.interestNames.length > 0 && (
        <p className="text-sm text-muted">Interests: {person.interestNames.join(", ")}</p>
      )}
    </PersonRow>
  );
}
