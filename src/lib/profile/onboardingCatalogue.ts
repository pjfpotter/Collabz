// Loads what the onboarding steps need from the catalogue (slice 2, #9,
// design decision 1): every active category in order, with its pick limits
// and its active tags.
//
// WHY NOT getCatalogue() FROM src/lib/catalogue.ts: that one feeds the
// /catalogue page and deliberately returns only names and descriptions.
// Onboarding also needs the pick limits, and the server needs each tag's
// alias word, so it has its own query rather than widening a shared one.

import { prisma } from "@/lib/db";

export type OnboardingTag = {
  id: string;
  name: string;
  description: string;
  // Only Energy and Vibe Diagnosis tags have one (see alias.ts).
  aliasWord: string | null;
};

export type OnboardingCategory = {
  id: string;
  name: string;
  pickMin: number;
  pickMax: number;
  tags: OnboardingTag[];
};

// Retired categories and tags are left out: onboarding only offers what is
// in use (spec: "Retired tags are not offered"). The steps follow
// Category.order, so a category an admin adds later appears as a new step
// without any code changing.
export async function getOnboardingCatalogue(): Promise<OnboardingCategory[]> {
  return prisma.category.findMany({
    where: { retiredAt: null },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      pickMin: true,
      pickMax: true,
      tags: {
        where: { retiredAt: null },
        orderBy: { order: "asc" },
        select: { id: true, name: true, description: true, aliasWord: true },
      },
    },
  });
}
