// PEOPLE SEARCH: the filters and the list (slice 4, #11, design decision 8).
//
// The /people page lists everyone, and can narrow the list by course, by one
// skill and by one interest. The chosen filters live in the page ADDRESS:
//
//   /people?course=software&skill=skills-data&interest=interests-climate
//
// WHY THE ADDRESS, and not something remembered in the browser: the filter
// then survives a refresh and the back button, can be shared as a link, and
// can be handed to /graph unchanged ("Show on the graph").
//
// ONE PICK PER FILTER, COMBINED WITH "AND": a person must fit the course AND
// the skill AND the interest. Three dropdowns are easy on a phone, and there
// is never a question of whether two skills mean "both" or "either".
//
// This file has four parts:
//   1. getFilterOptions()  - what the three dropdowns offer (reads the database)
//   2. parseFilters()      - the address's query becomes checked filters
//   3. filterPeople()      - keeps the people who fit
//   4. getPeopleForViewer() - the list itself, with each person's score with you

import { getCatalogue } from "@/lib/catalogue";
import { prisma } from "@/lib/db";

import { aliasToAddress } from "./aliasAddress";
import { getTopFive } from "./standIns";
import { getVisiblePeople, type VisiblePerson } from "./visiblePeople";

// The catalogue category ids the skill and interest dropdowns are filled
// from. These categories arrive with slice 2 (#9). Until then they don't
// exist, both lists are empty, and the page hides those two dropdowns.
const SKILLS_CATEGORY_ID = "skills";
const INTERESTS_CATEGORY_ID = "interests";

// The names used in the page address: /people?course=...&skill=...&interest=...
const COURSE_PARAM = "course";
const SKILL_PARAM = "skill";
const INTEREST_PARAM = "interest";

// ---------------------------------------------------------------------------
// 1. getFilterOptions
// ---------------------------------------------------------------------------

// One choice in a dropdown.
export type FilterOption = {
  id: string;
  name: string;
};

// Everything the three dropdowns can offer.
export type FilterOptions = {
  courses: FilterOption[];
  skills: FilterOption[];
  interests: FilterOption[];
};

// Loads what the dropdowns offer: the courses and the skill and interest tags
// that are in use. Retired ones are left out, so nobody can pick one.
export async function getFilterOptions(): Promise<FilterOptions> {
  const courses = await prisma.course.findMany({
    where: { retiredAt: null },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });

  // getCatalogue() already returns only active categories and tags, in
  // display order, so there is no second rule to keep in step here.
  const catalogue = await getCatalogue();
  const tagsIn = (categoryId: string): FilterOption[] => {
    const category = catalogue.find((candidate) => candidate.id === categoryId);
    // No such category yet: an empty list, which hides the dropdown.
    if (!category) return [];
    return category.tags.map((tag) => ({ id: tag.id, name: tag.name }));
  };

  return {
    courses,
    skills: tagsIn(SKILLS_CATEGORY_ID),
    interests: tagsIn(INTERESTS_CATEGORY_ID),
  };
}

// ---------------------------------------------------------------------------
// 2. parseFilters
// ---------------------------------------------------------------------------

// The filters that are on. Null means "any".
export type PeopleFilters = {
  courseId: string | null;
  skillTagId: string | null;
  interestTagId: string | null;
};

// What Next.js hands a page for the query part of its address. A value is
// text, or a list of text if the same name appears twice (?course=a&course=b),
// or missing.
export type SearchParams = Record<string, string | string[] | undefined>;

// Turns the address's query into filters we can trust.
//
// The address is typed by, or can be edited by, anyone. So every value is
// checked against what the dropdowns actually offer, and ANYTHING ELSE IS
// IGNORED: a made-up course, a retired tag, a skill id put in the interest
// slot. Ignoring is kinder than an error page, because the usual cause is an
// old shared link to a tag that has since been retired.
export function parseFilters(searchParams: SearchParams, options: FilterOptions): PeopleFilters {
  return {
    courseId: pickKnownId(searchParams[COURSE_PARAM], options.courses),
    skillTagId: pickKnownId(searchParams[SKILL_PARAM], options.skills),
    interestTagId: pickKnownId(searchParams[INTEREST_PARAM], options.interests),
  };
}

// Returns the value if it is the id of one of the options, otherwise null.
function pickKnownId(value: string | string[] | undefined, options: FilterOption[]): string | null {
  // If the same name appears twice in the address, only the first counts.
  const text = Array.isArray(value) ? value[0] : value;
  // Missing, or the dropdown's "Any" choice, whose value is empty text.
  if (!text) return null;

  const isKnown = options.some((option) => option.id === text);
  return isKnown ? text : null;
}

// True when at least one filter is on.
export function hasAnyFilter(filters: PeopleFilters): boolean {
  return (
    filters.courseId !== null || filters.skillTagId !== null || filters.interestTagId !== null
  );
}

// Turns filters back into the query part of an address, e.g.
// "?course=software&skill=skills-data", or "" when no filter is on. Used for
// the links that carry the filters between /people and /graph.
export function filtersToQuery(filters: PeopleFilters): string {
  // URLSearchParams builds the text and escapes anything that needs it.
  const query = new URLSearchParams();
  if (filters.courseId) query.set(COURSE_PARAM, filters.courseId);
  if (filters.skillTagId) query.set(SKILL_PARAM, filters.skillTagId);
  if (filters.interestTagId) query.set(INTEREST_PARAM, filters.interestTagId);

  const text = query.toString();
  return text === "" ? "" : `?${text}`;
}

// The filters that are on, in words, for showing on the page: for example
// ["Course: Software", "Skill: Data"]. Empty when no filter is on.
export function describeFilters(filters: PeopleFilters, options: FilterOptions): string[] {
  const nameOf = (id: string | null, list: FilterOption[]) =>
    list.find((option) => option.id === id)?.name;

  const descriptions: string[] = [];
  const course = nameOf(filters.courseId, options.courses);
  const skill = nameOf(filters.skillTagId, options.skills);
  const interest = nameOf(filters.interestTagId, options.interests);
  if (course) descriptions.push(`Course: ${course}`);
  if (skill) descriptions.push(`Skill: ${skill}`);
  if (interest) descriptions.push(`Interest: ${interest}`);
  return descriptions;
}

// ---------------------------------------------------------------------------
// 3. filterPeople
// ---------------------------------------------------------------------------

// Keeps the people who fit EVERY filter that is on. With no filter on,
// everyone is kept.
//
// It works on anything that has a course and tags, so the same function
// serves the people list and the graph. `<Person extends ...>` is TypeScript
// for "whatever you pass in, as long as it has these two fields, and you get
// the same type back".
export function filterPeople<Person extends Pick<VisiblePerson, "courseId" | "tags">>(
  people: Person[],
  filters: PeopleFilters,
): Person[] {
  return people.filter((person) => {
    if (filters.courseId !== null && person.courseId !== filters.courseId) {
      return false;
    }
    if (filters.skillTagId !== null && !hasTag(person, filters.skillTagId)) {
      return false;
    }
    if (filters.interestTagId !== null && !hasTag(person, filters.interestTagId)) {
      return false;
    }
    return true;
  });
}

function hasTag(person: Pick<VisiblePerson, "tags">, tagId: string): boolean {
  return person.tags.some((tag) => tag.id === tagId);
}

// ---------------------------------------------------------------------------
// 4. getPeopleForViewer
// ---------------------------------------------------------------------------

// One row of the people list: a visible person, plus what they are to the
// person looking.
export type PersonListing = VisiblePerson & {
  // Their profile address, e.g. "the-feral-sea-captain". Link to
  // /people/<address>.
  address: string;
  // Null if no score is stored between the two yet.
  scoreWithViewer: number | null;
  isTopFive: boolean;
  isGlitch: boolean;
  // The names of the skills and interests they picked, ready to show.
  skillNames: string[];
  interestNames: string[];
};

// Returns everyone the viewer can see EXCEPT THEMSELVES, best match first.
//
// Order: highest score with the viewer first, then A to Z by alias. People
// with no score yet come last.
//
// The result still contains each person's database id (it is a
// VisiblePerson). That is fine on the server, but a page must only put the
// alias, the address and the other display fields on screen.
export async function getPeopleForViewer(viewerId: string): Promise<PersonListing[]> {
  const people = await getVisiblePeople();

  // The viewer's scores. A pair is stored once, lower id first, so the viewer
  // can be on either side of the row.
  const edges = await prisma.edge.findMany({
    where: { OR: [{ userAId: viewerId }, { userBId: viewerId }] },
    select: { userAId: true, userBId: true, score: true },
  });
  const scoreByUserId = new Map<string, number>();
  for (const edge of edges) {
    const otherUserId = edge.userAId === viewerId ? edge.userBId : edge.userAId;
    scoreByUserId.set(otherUserId, edge.score);
  }

  const topFive = await getTopFive(viewerId);
  const topFiveIds = new Set(topFive.map((match) => match.userId));

  const glitch = await prisma.glitchMatch.findUnique({
    where: { userId: viewerId },
    select: { matchedUserId: true },
  });

  const listings: PersonListing[] = people
    // You don't list yourself among the people you could connect with.
    .filter((person) => person.userId !== viewerId)
    .map((person) => ({
      ...person,
      address: aliasToAddress(person.alias),
      scoreWithViewer: scoreByUserId.get(person.userId) ?? null,
      isTopFive: topFiveIds.has(person.userId),
      isGlitch: person.userId === glitch?.matchedUserId,
      skillNames: person.tags
        .filter((tag) => tag.categoryId === SKILLS_CATEGORY_ID)
        .map((tag) => tag.name),
      interestNames: person.tags
        .filter((tag) => tag.categoryId === INTERESTS_CATEGORY_ID)
        .map((tag) => tag.name),
    }));

  listings.sort((first, second) => {
    // -1 stands in for "no score", so those people sort below a score of 0.
    const firstScore = first.scoreWithViewer ?? -1;
    const secondScore = second.scoreWithViewer ?? -1;
    if (firstScore !== secondScore) {
      return secondScore - firstScore;
    }
    return first.alias.localeCompare(second.alias);
  });

  return listings;
}
