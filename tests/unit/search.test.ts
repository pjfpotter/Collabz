// Tests for the people filters (slice 4, #11, task 5.1): reading them from
// the page address, applying them, and writing them back into an address.
// None of this needs a database.

import { describe, expect, it } from "vitest";

import {
  describeFilters,
  filterPeople,
  filtersToQuery,
  hasAnyFilter,
  parseFilters,
  type FilterOptions,
  type PeopleFilters,
} from "@/lib/cohort/search";

// What the dropdowns offer in these tests. A retired course or tag would
// simply not be in these lists, which is how "retired" is tested below.
const options: FilterOptions = {
  courses: [
    { id: "software", name: "Software" },
    { id: "business", name: "Business" },
  ],
  skills: [
    { id: "skills-data", name: "Data" },
    { id: "skills-design", name: "Design" },
  ],
  interests: [
    { id: "interests-climate", name: "Climate" },
    { id: "interests-music", name: "Music" },
  ],
};

const noFilters: PeopleFilters = { courseId: null, skillTagId: null, interestTagId: null };

describe("parseFilters", () => {
  it("has no filters on when the address has no query", () => {
    expect(parseFilters({}, options)).toEqual(noFilters);
  });

  it("reads each filter from the address", () => {
    const filters = parseFilters(
      { course: "software", skill: "skills-data", interest: "interests-climate" },
      options,
    );

    expect(filters).toEqual({
      courseId: "software",
      skillTagId: "skills-data",
      interestTagId: "interests-climate",
    });
  });

  it("reads one filter and leaves the others off", () => {
    expect(parseFilters({ skill: "skills-design" }, options)).toEqual({
      ...noFilters,
      skillTagId: "skills-design",
    });
  });

  it("treats the dropdown's empty 'Any' choice as no filter", () => {
    // A plain GET form sends every dropdown, so "Any" arrives as ?course=
    expect(parseFilters({ course: "", skill: "", interest: "" }, options)).toEqual(noFilters);
  });

  it("ignores a value it doesn't recognise", () => {
    expect(parseFilters({ course: "astronomy" }, options)).toEqual(noFilters);
  });

  it("ignores a retired tag, which is no longer among the options", () => {
    // "skills-fax" was once offered. An old shared link still names it.
    expect(parseFilters({ skill: "skills-fax" }, options)).toEqual(noFilters);
  });

  it("ignores a real id put in the wrong slot", () => {
    // A skill is not an interest, and a tag is not a course.
    expect(parseFilters({ interest: "skills-data", course: "skills-data" }, options)).toEqual(
      noFilters,
    );
  });

  it("keeps the filters it recognises when another one is wrong", () => {
    expect(parseFilters({ course: "business", skill: "nonsense" }, options)).toEqual({
      ...noFilters,
      courseId: "business",
    });
  });

  it("uses the first value when a name appears twice in the address", () => {
    expect(parseFilters({ course: ["business", "software"] }, options).courseId).toBe("business");
  });

  it("offers no skill or interest filter while those categories don't exist", () => {
    // Before slice 2 lands, both lists are empty, so nothing can match.
    const beforeSliceTwo: FilterOptions = { ...options, skills: [], interests: [] };

    expect(
      parseFilters({ skill: "skills-data", interest: "interests-climate" }, beforeSliceTwo),
    ).toEqual(noFilters);
  });
});

// Four people covering each combination the tests need.
const people = [
  { name: "anna", courseId: "software", tags: tags("skills-data", "interests-climate") },
  { name: "ben", courseId: "software", tags: tags("skills-design", "interests-climate") },
  { name: "cara", courseId: "business", tags: tags("skills-data", "interests-music") },
  { name: "dev", courseId: "business", tags: tags("skills-data", "interests-climate") },
];

// Builds a person's tag list from tag ids. The category is the part of the id
// before the first dash, as in the real catalogue.
function tags(...ids: string[]) {
  return ids.map((id) => ({ id, name: id, categoryId: id.split("-")[0] }));
}

const namesOf = (list: { name: string }[]) => list.map((person) => person.name);

describe("filterPeople", () => {
  it("returns everyone when no filter is on", () => {
    expect(namesOf(filterPeople(people, noFilters))).toEqual(["anna", "ben", "cara", "dev"]);
  });

  it("filters by course alone", () => {
    const result = filterPeople(people, { ...noFilters, courseId: "business" });

    expect(namesOf(result)).toEqual(["cara", "dev"]);
  });

  it("filters by skill alone", () => {
    const result = filterPeople(people, { ...noFilters, skillTagId: "skills-data" });

    expect(namesOf(result)).toEqual(["anna", "cara", "dev"]);
  });

  it("filters by interest alone", () => {
    const result = filterPeople(people, { ...noFilters, interestTagId: "interests-climate" });

    expect(namesOf(result)).toEqual(["anna", "ben", "dev"]);
  });

  it("needs a person to fit all three filters at once", () => {
    const result = filterPeople(people, {
      courseId: "business",
      skillTagId: "skills-data",
      interestTagId: "interests-climate",
    });

    // Cara fits the course and the skill but not the interest.
    expect(namesOf(result)).toEqual(["dev"]);
  });

  it("returns nobody when no one fits", () => {
    const result = filterPeople(people, {
      courseId: "software",
      skillTagId: "skills-design",
      interestTagId: "interests-music",
    });

    expect(result).toEqual([]);
  });

  it("leaves out someone with no course when a course is chosen", () => {
    const noCourse = [{ name: "eve", courseId: null, tags: tags("skills-data") }];

    expect(filterPeople(noCourse, { ...noFilters, courseId: "software" })).toEqual([]);
    // ...but they are still listed when no course filter is on.
    expect(filterPeople(noCourse, noFilters)).toHaveLength(1);
  });

  it("keeps the order it was given", () => {
    const reversed = [...people].reverse();

    expect(namesOf(filterPeople(reversed, { ...noFilters, courseId: "software" }))).toEqual([
      "ben",
      "anna",
    ]);
  });
});

describe("hasAnyFilter", () => {
  it("is false with no filters and true with any one of them", () => {
    expect(hasAnyFilter(noFilters)).toBe(false);
    expect(hasAnyFilter({ ...noFilters, courseId: "software" })).toBe(true);
    expect(hasAnyFilter({ ...noFilters, skillTagId: "skills-data" })).toBe(true);
    expect(hasAnyFilter({ ...noFilters, interestTagId: "interests-music" })).toBe(true);
  });
});

describe("filtersToQuery", () => {
  it("is empty when no filter is on, so the link is just /people or /graph", () => {
    expect(filtersToQuery(noFilters)).toBe("");
  });

  it("writes only the filters that are on", () => {
    expect(filtersToQuery({ ...noFilters, courseId: "business" })).toBe("?course=business");
  });

  it("writes all three, and reading them back gives the same filters", () => {
    const filters: PeopleFilters = {
      courseId: "software",
      skillTagId: "skills-data",
      interestTagId: "interests-climate",
    };

    const query = filtersToQuery(filters);

    expect(query).toBe("?course=software&skill=skills-data&interest=interests-climate");
    // Round trip: turn the query back into the object a page would receive.
    const asSearchParams = Object.fromEntries(new URLSearchParams(query));
    expect(parseFilters(asSearchParams, options)).toEqual(filters);
  });
});

describe("describeFilters", () => {
  it("is empty when no filter is on", () => {
    expect(describeFilters(noFilters, options)).toEqual([]);
  });

  it("names each filter that is on, using the names people see", () => {
    const descriptions = describeFilters(
      { courseId: "business", skillTagId: "skills-data", interestTagId: null },
      options,
    );

    expect(descriptions).toEqual(["Course: Business", "Skill: Data"]);
  });
});
