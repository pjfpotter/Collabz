// Tests for aliasToAddress and findPersonByAddress (slice 4, #11, task 2.2):
// how an alias becomes the last part of a /people/... address, and how the
// profile page finds the person again from that address.

import { describe, expect, it } from "vitest";

import { aliasToAddress, findPersonByAddress } from "@/lib/cohort/aliasAddress";

describe("aliasToAddress", () => {
  it("lower-cases the alias and turns spaces into dashes", () => {
    expect(aliasToAddress("The Feral Sea Captain")).toBe("the-feral-sea-captain");
  });

  it("keeps a Roman numeral on the end, in lower case", () => {
    // Slice 2 adds "II", "III"... when an alias is already taken.
    expect(aliasToAddress("The Feral Sea Captain II")).toBe("the-feral-sea-captain-ii");
  });

  it("keeps a hyphen that is already in the alias as one dash", () => {
    expect(aliasToAddress("The Main-Character Hermit")).toBe("the-main-character-hermit");
  });

  it("keeps numbers", () => {
    // The pretend cohort's aliases end in a number.
    expect(aliasToAddress("The Pretend Mad Inventor 07")).toBe("the-pretend-mad-inventor-07");
  });

  it("turns punctuation into a dash and never leaves two dashes in a row", () => {
    expect(aliasToAddress("The \"It's Complicated\" -- Hermit!")).toBe(
      "the-it-s-complicated-hermit",
    );
  });

  it("removes dashes from the start and the end", () => {
    expect(aliasToAddress("  !The Hermit?  ")).toBe("the-hermit");
  });

  it("gives an address with nothing in it that needs escaping", () => {
    // encodeURIComponent changes anything a browser would have to escape
    // (a space becomes %20). If it changes nothing, the address is clean.
    const address = aliasToAddress("The Deadline-Driven Golden Retriever III");

    expect(encodeURIComponent(address)).toBe(address);
  });

  // The alias words slice 2 (#9) plans, copied from its design.md (decision
  // 4). They aren't in the database yet (Tag.aliasWord is empty until #9
  // lands), which is why they are written out here. An alias is
  // "The " + a Vibe word + " " + an Energy word.
  const vibeWords = [
    "Main-Character",
    "Chaotic",
    "Retrograde",
    "Visionary",
    "Feral",
    "Recovering",
    "Vibes-Based",
    "Deadline-Driven",
    "Overthinking",
    "Starcrossed",
    "Complicated",
    "Villainous",
  ];
  const energyWords = [
    "Inventor",
    "Planner",
    "Escape Artist",
    "Mastermind",
    "Sea Captain",
    "Gremlin",
    "Hermit",
    "Golden Retriever",
    "Plot Twist",
    "Project Mum",
    "Mad Scientist",
    "Chosen One",
  ];

  it("gives a different address for every planned alias, numbered or not", () => {
    // Every Vibe word with every Energy word, each on its own and with "II"
    // and "III" on the end: 12 x 12 x 3 = 432 aliases.
    const aliases: string[] = [];
    for (const vibeWord of vibeWords) {
      for (const energyWord of energyWords) {
        const base = `The ${vibeWord} ${energyWord}`;
        aliases.push(base, `${base} II`, `${base} III`);
      }
    }

    // A Set throws away duplicates. So if two aliases gave the same address,
    // the set would end up smaller than the list.
    const addresses = new Set(aliases.map(aliasToAddress));

    expect(aliases).toHaveLength(432);
    expect(addresses.size).toBe(432);
  });
});

describe("findPersonByAddress", () => {
  const people = [
    { alias: "The Feral Sea Captain", note: "first" },
    { alias: "The Feral Sea Captain II", note: "second" },
    { alias: "The Chaotic Hermit", note: "third" },
  ];

  it("finds the person whose alias gives that address", () => {
    expect(findPersonByAddress(people, "the-chaotic-hermit")?.note).toBe("third");
  });

  it("tells a numbered alias apart from the one without a number", () => {
    expect(findPersonByAddress(people, "the-feral-sea-captain")?.note).toBe("first");
    expect(findPersonByAddress(people, "the-feral-sea-captain-ii")?.note).toBe("second");
  });

  it("still finds them when the address is typed with capitals", () => {
    expect(findPersonByAddress(people, "The-Chaotic-Hermit")?.note).toBe("third");
  });

  it("returns null when nobody has that address", () => {
    expect(findPersonByAddress(people, "the-missing-person")).toBeNull();
  });

  it("returns null for an address with no letters or numbers", () => {
    expect(findPersonByAddress(people, "---")).toBeNull();
  });

  it("returns the first person if two aliases give the same address", () => {
    // Can't happen with the planned words (see the test above), but this is
    // the documented behaviour if an admin later adds clashing ones.
    const clashing = [
      { alias: "The Main-Character Hermit", note: "first" },
      { alias: "The Main Character Hermit", note: "second" },
    ];

    expect(findPersonByAddress(clashing, "the-main-character-hermit")?.note).toBe("first");
  });
});
