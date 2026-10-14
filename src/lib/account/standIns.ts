// ===========================================================================
// STAND-INS FOR SLICE 2 (onboarding, #9). REPLACE WHEN SLICE 2 LANDS.
// ===========================================================================
//
// Slice 7 (#14) lets people edit their onboarding answers, but slice 2,
// which builds the onboarding pieces, isn't built yet. Tom decided (14 Oct
// 2026) to build editing now with stand-ins that follow slice 2's APPROVED
// design (openspec/changes/9-onboarding/design.md), so that swapping them is
// a matter of changing imports, not behaviour.
//
// Everything slice 7 borrows from slice 2 is in this file or listed here:
//
// | Stand-in here              | Follows #9 design | Replace with (slice 2)                    |
// |----------------------------|-------------------|-------------------------------------------|
// | checkEditedPicks()         | decision 3        | validateOnboardingAnswers(), per category |
// | bioStandIn(), bioLines()   | decision 5        | generateBio()                             |
// | SILHOUETTE_IDS             | decision 7        | src/lib/profile/silhouettes.ts            |
// | SilhouettePlaceholder      | decision 7        | the real SVG silhouettes                  |
// |   (SilhouettePlaceholder.tsx, next to this file: it's a React component)  |
// | PickStepStandIn            | decision 2        | PickStep                                  |
// |   (src/app/account/edit/PickStepStandIn.tsx)                             |
//
// Join-up (#17), or whoever builds slice 2: swap each one, then delete the
// stand-in. The README's "Stand-ins" note has the same list.
//
// Owner: slice 7 (#14), until slice 2 replaces these.

// ---------------------------------------------------------------------------
// The categories, as seeded (prisma/seed-data.ts)
// ---------------------------------------------------------------------------

const HERO_STORY = "hero-story";
const ENERGY = "energy";
const QUALITIES = "qualities";
const SEEKING = "seeking";
// Seeded by slice 2. Until then nobody has picks in them, and the bio simply
// leaves those sentences out.
const SKILLS = "skills";
const INTERESTS = "interests";

// ---------------------------------------------------------------------------
// checkEditedPicks (stand-in for validateOnboardingAnswers, #9 decision 3)
// ---------------------------------------------------------------------------

// One category, as the edit screen sees it (src/lib/account/editCatalogue.ts).
export type EditableCategory = {
  id: string;
  name: string;
  pickMin: number;
  pickMax: number;
  tags: {
    id: string;
    name: string;
    description: string;
    // Retired after this person picked it: shown so it can be removed, but
    // it can't be picked again once it's gone.
    retired: boolean;
  }[];
};

// What's wrong with these picks for this category, or null if nothing is.
// The same rules as onboarding (account-management spec: "Edited answers
// follow the onboarding rules"):
//   - between the category's pickMin and pickMax picks,
//   - each pick only once,
//   - only tags that belong to this category,
//   - a retired tag only if the person already had it.
//
// `alreadyPicked` is what they had in this category before the edit.
export function checkEditedPicks(
  picks: string[],
  category: EditableCategory,
  alreadyPicked: string[],
): string | null {
  if (new Set(picks).size !== picks.length) {
    return "Each tag can only be picked once.";
  }

  for (const tagId of picks) {
    const tag = category.tags.find((candidate) => candidate.id === tagId);
    if (!tag) {
      // Another category's tag, or an id that doesn't exist (e.g. from an
      // edited request, since the page only ever offers this category's).
      return `That isn't one of the ${category.name} choices.`;
    }
    if (tag.retired && !alreadyPicked.includes(tagId)) {
      return `"${tag.name}" is no longer offered, so it can't be picked again.`;
    }
  }

  if (picks.length < category.pickMin || picks.length > category.pickMax) {
    return limitMessage(category);
  }
  return null;
}

// "Pick exactly 1." or "Pick between 1 and 4."
export function limitMessage(category: Pick<EditableCategory, "pickMin" | "pickMax">): string {
  if (category.pickMin === category.pickMax) {
    return `Pick exactly ${category.pickMin}.`;
  }
  return `Pick between ${category.pickMin} and ${category.pickMax}.`;
}

// ---------------------------------------------------------------------------
// bioStandIn (stand-in for generateBio, #9 decision 5)
// ---------------------------------------------------------------------------

// Plain sentences built only from the names of the tags the person picked.
// There's no free text anywhere in a profile (rule B1). Computed each time
// it's shown, never stored, so a renamed tag shows up straight away.
//
// `tagsByCategory` maps a category id to the NAMES of the picked tags, e.g.
//   { "hero-story": ["The Late Bloomer"],
//     "energy": ["Giving Sea Captain Energy"],
//     "qualities": ["Says the hard thing kindly"] }
// gives
//   "The Late Bloomer, giving Sea Captain Energy. Brings: says the hard thing kindly."
//
// Vibe Diagnosis isn't in the bio: slice 2's design leaves it out because it
// already shapes the alias. Categories it doesn't know are ignored, so one
// an admin adds later can't break it.
export function bioStandIn(tagsByCategory: Record<string, string[]>): string {
  return bioLines(tagsByCategory)
    .map((line) => (line.label ? `${line.label}: ${line.text}` : line.text))
    .join(" ");
}

// One line of the bio. `label` is "Brings", "Looking for", "Skills" or
// "Into"; the opening line has none.
export type BioLine = { label: string | null; text: string };

// The same bio as bioStandIn, as separate lines, so a page can lay it out
// with a gap between each and the labels in bold (as /account does), e.g.
//   { label: null, text: "The Late Bloomer, giving Sea Captain Energy." }
//   { label: "Brings", text: "says the hard thing kindly." }
// bioStandIn joins these into one paragraph, so the two always agree.
export function bioLines(tagsByCategory: Record<string, string[]>): BioLine[] {
  const lines: BioLine[] = [];

  const heroStory = tagsByCategory[HERO_STORY]?.[0];
  const energy = tagsByCategory[ENERGY]?.[0];
  if (heroStory && energy) {
    // Energy tags already read as a phrase ("Giving Sea Captain Energy").
    lines.push({ label: null, text: `${heroStory}, ${lowerFirst(energy)}.` });
  } else if (heroStory || energy) {
    lines.push({ label: null, text: `${heroStory ?? energy}.` });
  }

  const labelled: [string, string, boolean][] = [
    // [category id, label, lower-case the first letter of each name?]
    [QUALITIES, "Brings", true],
    [SEEKING, "Looking for", true],
    [SKILLS, "Skills", false],
    [INTERESTS, "Into", false],
  ];
  for (const [categoryId, label, lower] of labelled) {
    const names = tagsByCategory[categoryId] ?? [];
    if (names.length > 0) {
      lines.push({ label, text: `${joinAsList(lower ? names.map(lowerFirst) : names)}.` });
    }
  }

  return lines;
}

// "a", "a and b", "a, b and c"
function joinAsList(items: string[]): string {
  if (items.length <= 1) {
    return items.join("");
  }
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// "Says the hard thing kindly" -> "says the hard thing kindly", to sit
// mid-sentence.
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

// ---------------------------------------------------------------------------
// Silhouettes (stand-in for slice 2's silhouettes.ts, #9 decision 7)
// ---------------------------------------------------------------------------

// The 12 silhouette ids slice 2's design names. Profile.silhouette stores one
// of these. Slice 2 adds the pictures (public/silhouettes/*.svg) and labels.
export const SILHOUETTE_IDS = Array.from(
  { length: 12 },
  (_, index) => `silhouette-${String(index + 1).padStart(2, "0")}`,
);

// The edit screen treats the silhouette like a category with exactly one
// pick, so one screen and one set of rules covers both.
export const SILHOUETTE_CATEGORY_ID = "silhouette";

export function silhouetteCategory(): EditableCategory {
  return {
    id: SILHOUETTE_CATEGORY_ID,
    name: "Silhouette",
    pickMin: 1,
    pickMax: 1,
    tags: SILHOUETTE_IDS.map((id, index) => ({
      id,
      name: `Silhouette ${index + 1}`,
      description: "",
      retired: false,
    })),
  };
}
