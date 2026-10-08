// TURNING AN ALIAS INTO A PAGE ADDRESS (slice 4, #11, design decision 7).
//
// Everyone's profile page lives at /people/<something>. That "something" is
// worked out from their alias:
//
//   "The Feral Sea Captain II"  ->  "the-feral-sea-captain-ii"
//
// WHY NOT PUT THE ALIAS ITSELF IN THE ADDRESS: a space in an address turns
// into "%20", which is ugly to share and easy to break when copied.
//
// WHY NOT STORE THE ADDRESS IN THE DATABASE: it is worked out from the alias,
// so a stored copy could only ever go out of date. It would also be a change
// to the shared schema, for nothing.
//
// WHY NOT USE THE DATABASE USER ID: an address is visible to everyone, and
// the alias is the only identity a person has agreed to make public.

// Turns an alias into the last part of a page address.
//
// - everything becomes lower case
// - every run of characters that isn't a-z or 0-9 becomes ONE dash
// - dashes at the very start and end are removed
//
// Only plain a-z and 0-9 are kept. Our alias words are all plain English, so
// nothing is lost. An accented letter such as "é" would become a dash.
export function aliasToAddress(alias: string): string {
  return alias
    .toLowerCase()
    // [^a-z0-9] means "any character that is NOT a-z or 0-9", and the +
    // means "one or more in a row", so "Sea  -  Captain" gets one dash.
    .replace(/[^a-z0-9]+/g, "-")
    // ^-+ is "dashes at the start", -+$ is "dashes at the end".
    .replace(/^-+|-+$/g, "");
}

// Finds the person whose alias gives this address, or null if nobody does.
//
// It works on any list of things that have an alias, so the same function
// serves the profile page and the tests. `<Person extends { alias: string }>`
// is TypeScript for "whatever type you pass in, as long as it has an alias,
// and you get the same type back".
//
// The address is passed through aliasToAddress() too, so "The-Feral-Sea-
// Captain" typed by hand still finds the right person.
//
// If two aliases ever gave the same address, the first one in the list wins.
// That can't happen with the planned alias words (a unit test checks every
// combination), but admins may add words later (noted for slice 8).
export function findPersonByAddress<Person extends { alias: string }>(
  people: Person[],
  address: string,
): Person | null {
  const wantedAddress = aliasToAddress(address);

  // An address with no letters or numbers at all ("---") matches nobody.
  if (wantedAddress === "") {
    return null;
  }

  for (const person of people) {
    if (aliasToAddress(person.alias) === wantedAddress) {
      return person;
    }
  }
  return null;
}
