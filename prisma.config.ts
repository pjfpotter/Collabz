// Settings for the Prisma command-line tool (`npx prisma ...`).
// Prisma 7 moved these out of schema.prisma into this file.
// Docs: https://www.prisma.io/docs/orm/reference/prisma-config-reference
//
// Note: this file is only used by the CLI (migrate, generate, db seed).
// The running app connects separately, in src/lib/db.ts.

// Prisma 7 no longer reads .env by itself, so we load it here.
// On Vercel there is no .env file; the variables come from Vercel's settings.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    // What `npx prisma db seed` runs. tsx runs a TypeScript file directly,
    // without a separate build step.
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    // DIRECT_URL, not the pooled DATABASE_URL: migrations change the table
    // structure, which needs a direct connection to the database. Neon's
    // pooler is built for the app's many short queries (design decision 6).
    //
    // We use process.env rather than Prisma's env() helper because env()
    // throws when the variable is missing, and `prisma generate` should still
    // work on a machine with no .env (it doesn't need a database).
    url: process.env["DIRECT_URL"],
  },
});
