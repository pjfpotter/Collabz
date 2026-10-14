// Builds a person's public alias, e.g. "The Feral Sea Captain" (slice 2, #9,
// design decision 4).
//
// The alias is "The" + the alias word of their Vibe Diagnosis tag + the alias
// word of their Energy tag. The words are stored on the tags (Tag.aliasWord),
// so they live with the data and an admin can change them.
//
// If the alias is taken, a Roman numeral goes on the end: "... II", "... III".
// The alias is set once, when onboarding finishes, and never changes.
//
// Everything here is a pure function. Checking which aliases are taken is the
// caller's job (the onboarding route), so these can be tested without a
// database.

// Used when a tag has no alias word, e.g. one an admin added later without
// giving it one. The person still gets a readable alias.
export const FALLBACK_VIBE_WORD = "Mysterious";
export const FALLBACK_ENERGY_WORD = "Collaborator";

// "The <vibe word> <energy word>", before any numbering.
// Takes the words (or null/undefined when a tag has none), not the tags, so
// the caller decides where the words come from.
export function baseAlias(
  vibeWord: string | null | undefined,
  energyWord: string | null | undefined,
): string {
  // `?.trim()` so a word that is only spaces counts as missing too.
  const vibe = vibeWord?.trim() || FALLBACK_VIBE_WORD;
  const energy = energyWord?.trim() || FALLBACK_ENERGY_WORD;
  return `The ${vibe} ${energy}`;
}

// Turns a whole number into Roman numerals: 2 -> "II", 4 -> "IV", 14 -> "XIV".
//
// How it works: go through the values from biggest to smallest, and take each
// one away as many times as it fits, writing its letters each time. The pairs
// like 900 "CM" and 4 "IV" are in the list so we never write "IIII".
export function toRoman(value: number): string {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`toRoman needs a whole number of 1 or more, got ${value}`);
  }

  const numerals: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let remaining = value;
  let result = "";
  for (const [amount, letters] of numerals) {
    while (remaining >= amount) {
      result += letters;
      remaining -= amount;
    }
  }
  return result;
}

// The first free alias: the base itself, then "base II", "base III" and so on.
//
// `takenAliases` is every alias already in use that could clash (the route
// passes the ones that start with the base). There's no "I": the first
// person simply gets the plain base, so the second is "II".
export function generateAlias(base: string, takenAliases: Iterable<string>): string {
  const taken = new Set(takenAliases);
  if (!taken.has(base)) {
    return base;
  }

  // Start at 2 and count up until a free one turns up. This always ends,
  // because `taken` has a fixed number of entries.
  let number = 2;
  while (taken.has(`${base} ${toRoman(number)}`)) {
    number += 1;
  }
  return `${base} ${toRoman(number)}`;
}
