// Tests for slugify() (slice 8, #15, task 1.1).

import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/admin/slugify";

describe("slugify", () => {
  it("lowercases and joins words with dashes", () => {
    expect(slugify("Sea Captain")).toBe("sea-captain");
  });

  it("turns punctuation and repeated spaces into a single dash", () => {
    expect(slugify("Rock  &  Roll!")).toBe("rock-roll");
  });

  it("drops accents", () => {
    expect(slugify("Café Société")).toBe("cafe-societe");
  });

  it("trims dashes from both ends", () => {
    expect(slugify("  --Games--  ")).toBe("games");
  });

  it("keeps digits", () => {
    expect(slugify("Web 3")).toBe("web-3");
  });

  it("rejects a name with nothing usable in it", () => {
    expect(slugify("")).toBeNull();
    expect(slugify("   ")).toBeNull();
    expect(slugify("!!!")).toBeNull();
  });
});
