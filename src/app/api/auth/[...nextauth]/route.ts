// Every address under /api/auth/* (slice 1, #8).
//
// Auth.js answers these itself: sending a magic link, the link coming back
// (/api/auth/callback/resend), signing out, and reading the session.
// The [...nextauth] folder name is Next.js's "catch-all" route: it matches
// /api/auth/ followed by anything, so this one file covers them all.
//
// We only hand the requests over. All the settings are in src/auth.ts.

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
