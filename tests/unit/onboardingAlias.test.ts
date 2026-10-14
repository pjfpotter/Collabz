// Tests for src/lib/profile/alias.ts (slice 2, #9, task 3.3).
// One test per scenario in the spec's "Generated alias is unique"
// requirement, plus the Roman numerals underneath.

import { describe, expect, it } from "vitest";

import {
  FALLBACK_ENERGY_WORD,
  FALLBACK_VIBE_WORD,
  baseAlias,
  generateAlias,
  toRoman,
} from "@/lib/profile/alias";

describe("baseAlias", () => {
  // Spec scenario: "Alias from the user's own tags"
  it('builds "The Feral Sea Captain" from the two alias words', () => {
    expect(baseAlias("Feral", "Sea Captain")).toBe("The Feral Sea Captain");
  });

  // Spec scenario: "A tag has no alias word"
  it("uses a fallback word when a tag has none", () => {
    expect(baseAlias(null, "Sea Captain")).toBe(`The ${FALLBACK_VIBE_WORD} Sea Captain`);
    expect(baseAlias("Feral", undefined)).toBe(`The Feral ${FALLBACK_ENERGY_WORD}`);
    // A word that is only spaces counts as missing.
    expect(baseAlias("  ", "")).toBe(`The ${FALLBACK_VIBE_WORD} ${FALLBACK_ENERGY_WORD}`);
  });
});

describe("generateAlias", () => {
  const base = "The Feral Sea Captain";

  it("returns the base when nobody has it", () => {
    expect(generateAlias(base, [])).toBe(base);
    // Someone with a different alias doesn't count.
    expect(generateAlias(base, ["The Feral Gremlin"])).toBe(base);
  });

  // Spec scenario: "Two users would get the same alias"
  it('adds "II" when the base is taken', () => {
    expect(generateAlias(base, [base])).toBe(`${base} II`);
  });

  it('goes on to "III" when II is taken too', () => {
    expect(generateAlias(base, [base, `${base} II`])).toBe(`${base} III`);
  });

  it("fills the first gap rather than always counting up", () => {
    // II is free again (say, the alias was from a profile that was removed).
    expect(generateAlias(base, [base, `${base} III`])).toBe(`${base} II`);
  });
});

describe("toRoman", () => {
  it("writes the numbers aliases will actually use", () => {
    expect([2, 3, 4, 5, 9, 10, 14, 40, 90, 400, 1994].map(toRoman)).toEqual([
      "II",
      "III",
      "IV",
      "V",
      "IX",
      "X",
      "XIV",
      "XL",
      "XC",
      "CD",
      "MCMXCIV",
    ]);
  });

  it("refuses numbers it can't write", () => {
    expect(() => toRoman(0)).toThrow();
    expect(() => toRoman(2.5)).toThrow();
  });
});
