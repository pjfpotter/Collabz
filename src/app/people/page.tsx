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
import { SilhouetteStandIn, requireFinishedProfile } from "@/lib/cohort/standIns";

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
      <h1 className="text-3xl font-semibold">People</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Everyone in the cohort, best match with you first.
      </p>

      <PeopleFilters options={options} filters={filters} />

      {/* aria-live makes a screen reader read the new count out after the
          filters change, so it is clear that something happened. */}
      <p className="mt-6 text-sm" aria-live="polite" data-testid="people-count">
        {countSentence(people.length, hasAnyFilter(filters))}{" "}
        <Link href={`/graph${query}`} className="underline underline-offset-4">
          Show on the graph
        </Link>
      </p>

      {people.length === 0 ? (
        <NobodyMatches filtersAreOn={hasAnyFilter(filters)} />
      ) : (
        <ul className="mt-4 divide-y divide-current/20" data-testid="people-list">
          {people.map((person) => (
            // The address is unique per person, and unlike the database id it
            // is safe to appear in the page.
            <li key={person.address} className="py-4">
              <PersonRow person={person} />
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
    return <p className="mt-4">Nobody else has finished their profile yet.</p>;
  }
  return (
    <p className="mt-4" data-testid="nobody-matches">
      Nobody matches all of these filters.{" "}
      <Link href="/people" className="underline underline-offset-4">
        Clear the filters
      </Link>{" "}
      to see everyone.
    </p>
  );
}

// One person in the list. Only public things are shown: alias, silhouette,
// course, tags and the score with you. Never an email or a photo (rule B1).
function PersonRow({ person }: { person: PersonListing }) {
  return (
    <div className="flex items-start gap-3">
      <SilhouetteStandIn silhouette={person.silhouette} size={48} />

      <div className="min-w-0 flex-1">
        <p>
          <Link
            href={`/people/${person.address}`}
            className="font-semibold underline underline-offset-4"
          >
            {person.alias}
          </Link>
          {/* A badge, in words, for the people the viewer is allowed to send
              a connection request to. */}
          {person.isTopFive && <Badge>Top 5</Badge>}
          {person.isGlitch && <Badge>Glitch match</Badge>}
        </p>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {person.courseName ?? "No course"}
          {" · "}
          {person.scoreWithViewer === null
            ? "No score with you yet"
            : `Score with you: ${person.scoreWithViewer}`}
        </p>

        {/* Each line only appears if the person picked something in that
            category. Before slice 2 lands, nobody has, so neither shows. */}
        {person.skillNames.length > 0 && (
          <p className="mt-1 text-sm">Skills: {person.skillNames.join(", ")}</p>
        )}
        {person.interestNames.length > 0 && (
          <p className="text-sm">Interests: {person.interestNames.join(", ")}</p>
        )}
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-2 rounded border border-current/40 px-2 py-0.5 text-xs font-normal whitespace-nowrap">
      {children}
    </span>
  );
}
