// The filter form at the top of /people (slice 4, #11, design decision 8).
//
// This is a plain HTML form with `method="get"`. Pressing "Apply" makes the
// BROWSER build the address itself from the dropdowns, for example
// /people?course=software, and load that page. So there is no JavaScript
// here at all: it is a Server Component, and the form would still work with
// scripts switched off.
//
// The server then reads the filters back out of the address (parseFilters in
// src/lib/cohort/search.ts) and shows the matching people.

import Link from "next/link";

import type { FilterOption, FilterOptions, PeopleFilters } from "@/lib/cohort/search";

type PeopleFiltersProps = {
  // What each dropdown offers.
  options: FilterOptions;
  // The filters that are on now, so each dropdown shows its current choice.
  filters: PeopleFilters;
};

export function PeopleFilters({ options, filters }: PeopleFiltersProps) {
  return (
    <form
      method="get"
      action="/people"
      className="mt-4 flex flex-wrap items-end gap-3"
      aria-label="Filter people"
    >
      {/* The `name` on each dropdown is what appears in the address:
          ?course=...&skill=...&interest=... */}
      <FilterDropdown
        label="Course"
        name="course"
        options={options.courses}
        chosenId={filters.courseId}
      />
      <FilterDropdown
        label="Skill"
        name="skill"
        options={options.skills}
        chosenId={filters.skillTagId}
      />
      <FilterDropdown
        label="Interest"
        name="interest"
        options={options.interests}
        chosenId={filters.interestTagId}
      />

      <button type="submit" className="rounded border border-current/30 px-3 py-1">
        Apply
      </button>
      {/* "Clear" is just a link to the page with no query at all. */}
      <Link href="/people" className="py-1 underline underline-offset-4">
        Clear
      </Link>
    </form>
  );
}

type FilterDropdownProps = {
  label: string;
  name: string;
  options: FilterOption[];
  chosenId: string | null;
};

// One labelled dropdown, or NOTHING if it has no choices to offer.
//
// That second case is real: the Skills and Interests tags arrive with slice 2
// (#9). Until then those two lists are empty, and an empty dropdown would
// only confuse people. The page has to work before then (design 8).
function FilterDropdown({ label, name, options, chosenId }: FilterDropdownProps) {
  if (options.length === 0) {
    return null;
  }

  // The label and the dropdown are tied together by this id, so tapping the
  // word "Course" opens the list and a screen reader reads the two together.
  const id = `people-filter-${name}`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <select
        id={id}
        name={name}
        // `defaultValue` sets what is chosen when the page loads and then
        // leaves the dropdown alone, which is all a plain form needs.
        defaultValue={chosenId ?? ""}
        className="bg-background rounded border border-current/30 px-2 py-1"
      >
        {/* An empty value means "no filter" (see pickKnownId in search.ts). */}
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}
