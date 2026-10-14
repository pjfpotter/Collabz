// Builds a person's bio from the tags they picked (slice 2, #9, design
// decision 5). For example:
//
//   The Corporate Escapee, giving Sea Captain Energy. Brings: actually
//   finishes the thing and says the hard thing kindly. Looking for: someone
//   who finishes what I start. Skills: Back-end and Data. Into: Climate.
//
// Only tag names are used: there's no free text anywhere in a profile (B1).
// The bio is worked out each time it's shown and never stored, so a tag an
// admin renames shows up straight away.
//
// Pure functions, no database: the caller loads the tag names. This file
// imports nothing, so browser components can use it too.

// The categories the bio knows, by their seeded ids. A category it doesn't
// know (say, one an admin adds later) is simply left out, so it can't break
// the bio.
//
// Vibe Diagnosis isn't in the bio on purpose: it already shapes the alias,
// and the spec's list of bio categories doesn't include it.
const HERO_STORY = "hero-story";
const ENERGY = "energy";
const QUALITIES = "qualities";
const SEEKING = "seeking";
const SKILLS = "skills";
const INTERESTS = "interests";

// One line of the bio. `label` is "Brings", "Looking for", "Skills" or
// "Into"; the opening line has none. Pages that want the labels in bold, or
// a gap between lines (as /account does), use these; others use generateBio.
export type BioLine = { label: string | null; text: string };

// `tagsByCategory` maps a category id to the NAMES of the tags picked there:
//   { "hero-story": ["The Late Bloomer"],
//     "energy": ["Giving Sea Captain Energy"],
//     "qualities": ["Says the hard thing kindly"] }
export function generateBioLines(tagsByCategory: Record<string, string[]>): BioLine[] {
  const lines: BioLine[] = [];

  // The opening line: Hero Story and Energy. Both are pick-exactly-one, so
  // the first name is the only one.
  const heroStory = tagsByCategory[HERO_STORY]?.[0];
  const energy = tagsByCategory[ENERGY]?.[0];
  if (heroStory && energy) {
    // Energy names already read as a phrase ("Giving Sea Captain Energy"),
    // so a lower-case first letter lets them follow the comma.
    lines.push({ label: null, text: `${heroStory}, ${lowerFirst(energy)}.` });
  } else if (heroStory || energy) {
    // Shouldn't happen for a finished profile, but a page must never show
    // "undefined" because one is missing.
    lines.push({ label: null, text: `${heroStory ?? energy}.` });
  }

  // The labelled lines, in this order.
  // [category id, label, lower-case the first letter of each name?]
  // Qualities and Seeking names are phrases that sit mid-sentence; Skills and
  // Interests are proper names like "Back-end" and keep their capitals.
  const labelled: [string, string, boolean][] = [
    [QUALITIES, "Brings", true],
    [SEEKING, "Looking for", true],
    [SKILLS, "Skills", false],
    [INTERESTS, "Into", false],
  ];
  for (const [categoryId, label, lower] of labelled) {
    const names = tagsByCategory[categoryId] ?? [];
    if (names.length === 0) {
      continue; // nothing picked here: leave the line out
    }
    const shown = lower ? names.map(lowerFirst) : names;
    lines.push({ label, text: `${joinAsList(shown)}.` });
  }

  return lines;
}

// The same bio as one paragraph: "Label: text" for each labelled line.
export function generateBio(tagsByCategory: Record<string, string[]>): string {
  return generateBioLines(tagsByCategory)
    .map((line) => (line.label ? `${line.label}: ${line.text}` : line.text))
    .join(" ");
}

// "a", "a and b", "a, b and c" (no comma before "and", as in the design).
export function joinAsList(items: string[]): string {
  if (items.length <= 1) {
    return items.join("");
  }
  const allButLast = items.slice(0, -1);
  const last = items[items.length - 1];
  return `${allButLast.join(", ")} and ${last}`;
}

// "Says the hard thing kindly" -> "says the hard thing kindly".
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
