// Turns a name an admin typed into a readable id (slice 8, #15, design 3).
//
//   "Sea Captain"   -> "sea-captain"
//   "  Café & Co. " -> "cafe-co"
//
// Why ids come from the name at all: the seeded catalogue uses readable ids
// like "energy-sea-captain" (rule B2), the same on every database, so a row's
// id tells you what it is. An id is made ONCE, when the row is added, and a
// later rename never changes it.
//
// Returns null when nothing usable is left (an empty name, or only symbols
// like "!!!"), so the caller can ask for a proper name instead of storing "".
//
// Owner: slice 8 (#15).

export function slugify(name: string): string | null {
  const slug = name
    // "NFD" splits an accented letter into the plain letter plus a separate
    // accent mark ("é" -> "e" + "´"), so the next line can drop the accent.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // Any run of characters that aren't a letter or digit becomes one dash.
    .replace(/[^a-z0-9]+/g, "-")
    // No dash at the very start or end.
    .replace(/^-+|-+$/g, "");

  return slug === "" ? null : slug;
}
