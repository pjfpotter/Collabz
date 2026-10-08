// Reads the tag catalogue from the database, ready to display.
// Used by the /catalogue page (src/app/catalogue/page.tsx).
//
// Why this lives in its own function rather than inside the page: the page
// stays simple, and the tests can check the query (order, hiding retired
// rows) without needing a browser (design decision 2).

import { prisma } from "@/lib/db";

// The shape the page receives. Only the fields it actually shows, so a later
// change to the tables (e.g. new columns) doesn't leak into the page.
export type CatalogueTag = {
  id: string;
  name: string;
  description: string;
};

export type CatalogueCategory = {
  id: string;
  name: string;
  tags: CatalogueTag[];
};

// Returns every category that isn't retired, in display order, each with its
// tags that aren't retired, also in display order.
//
// "Retired" means `retiredAt` has a date in it. Retired rows stay in the
// database (other tables may point at them) but are no longer shown.
export async function getCatalogue(): Promise<CatalogueCategory[]> {
  return prisma.category.findMany({
    where: { retiredAt: null },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      // Prisma fetches each category's tags in the same query, filtered and
      // sorted here, so we don't need a separate query per category.
      tags: {
        where: { retiredAt: null },
        orderBy: { order: "asc" },
        select: { id: true, name: true, description: true },
      },
    },
  });
}
