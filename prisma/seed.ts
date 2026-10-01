// Fills the catalogue tables (Category, Tag, Course) from prisma/seed-data.ts.
//
// Two ways this file is used:
// 1. As Prisma's seed command: `npx prisma db seed` (set up in prisma.config.ts).
//    The Vercel build runs this on every deploy.
// 2. By the tests, which import seedCatalogue() and call it with a client
//    connected to the test database (design decision 5).
//
// It is safe to run any number of times: it only ADDS rows whose id isn't in
// the table yet, and never changes or deletes existing rows. So a tag renamed
// in the database keeps its new name after a re-seed (Patrick's decision).

// Loads .env when run on a laptop. On Vercel the variables are already set.
import "dotenv/config";

import type { PrismaClient } from "../src/generated/prisma/client";
import { seedCategories, seedCourses } from "./seed-data";

// How many new rows each table got. Useful in the log, and in tests (a second
// run should create 0 of everything).
export type SeedResult = {
  categoriesCreated: number;
  tagsCreated: number;
  coursesCreated: number;
};

export async function seedCatalogue(prisma: PrismaClient): Promise<SeedResult> {
  // Categories first: every tag points at a category, so the database would
  // refuse a tag whose category doesn't exist yet.
  //
  // `order` comes from each item's position in its list (first = 1), so the
  // display order is exactly the order written in seed-data.ts.
  const categories = await prisma.category.createMany({
    data: seedCategories.map((category, index) => ({
      id: category.id,
      name: category.name,
      pickMin: category.pickMin,
      pickMax: category.pickMax,
      order: index + 1,
    })),
    // The key line: skip any row whose id already exists instead of failing
    // or overwriting it. This is what makes re-seeding safe.
    skipDuplicates: true,
  });

  // Turn the nested lists (categories containing tags) into one flat list of
  // tag rows, each knowing its category and its position within it.
  const tagRows = seedCategories.flatMap((category) =>
    category.tags.map((tag, index) => ({
      id: tag.id,
      categoryId: category.id,
      name: tag.name,
      description: tag.description,
      order: index + 1,
    })),
  );

  const tags = await prisma.tag.createMany({
    data: tagRows,
    skipDuplicates: true,
  });

  const courses = await prisma.course.createMany({
    data: seedCourses.map((course, index) => ({
      id: course.id,
      name: course.name,
      order: index + 1,
    })),
    skipDuplicates: true,
  });

  return {
    categoriesCreated: categories.count,
    tagsCreated: tags.count,
    coursesCreated: courses.count,
  };
}

// Runs the seed when this file is started as a command (`prisma db seed`
// runs `tsx prisma/seed.ts`), but NOT when a test imports seedCatalogue.
// We tell the two apart by the name of the file Node was asked to run.
async function main() {
  // Imported here, not at the top, so tests that only import seedCatalogue
  // don't create the app's shared client (they bring their own).
  const { prisma } = await import("../src/lib/db");

  try {
    const result = await seedCatalogue(prisma);
    console.log(
      `Seed done. New rows: ${result.categoriesCreated} categories, ` +
        `${result.tagsCreated} tags, ${result.coursesCreated} courses ` +
        `(existing rows are left as they are).`,
    );
  } finally {
    // Close the database connection so the command can exit.
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((error) => {
    console.error("Seed failed:", error);
    // A non-zero exit code makes the Vercel build stop, so a broken seed
    // never gets deployed (design decision 7).
    process.exit(1);
  });
}
