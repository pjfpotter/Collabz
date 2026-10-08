// The one shared Prisma client the whole app uses to talk to the database.
// Import it anywhere on the server with:  import { prisma } from "@/lib/db";
//
// Why ONE shared client: each PrismaClient opens its own pool of database
// connections. In development, Next.js reloads our code every time a file is
// saved, and each reload would create a new client (and new connections)
// until Neon refuses any more. So we create the client once and keep reusing
// it (design decision 6).

import { PrismaNeon } from "@prisma/adapter-neon";
// The client is generated from prisma/schema.prisma by `prisma generate`
// into src/generated/prisma (Prisma 7 doesn't put it in node_modules).
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient(): PrismaClient {
  // DATABASE_URL is Neon's *pooled* URL. The app makes many short queries from
  // short-lived Vercel servers, and the pooler stops those using up all of
  // Neon's connections. (Migrations use DIRECT_URL instead, in prisma.config.ts.)
  // Next.js loads it from .env locally; on Vercel it comes from the project's
  // environment settings.
  const connectionString = process.env.DATABASE_URL;

  // Fail early with a helpful message, rather than a confusing connection
  // error later on.
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in (see README).",
    );
  }

  // The Neon adapter connects through Neon's serverless driver, which is
  // designed for serverless hosting like Vercel. It uses the WebSocket support
  // built into Node, so we don't need the extra `ws` package older guides mention.
  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({ adapter });
}

// `globalThis` is an object that survives Next.js's development reloads, so we
// park the client there. TypeScript doesn't know about our extra property,
// hence this typed view of it.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Reuse the client from a previous reload if there is one, otherwise make one.
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

// Only park it on globalThis in development. In production the code isn't
// reloaded, so each server instance simply keeps its own single client.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
