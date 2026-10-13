// The Auth.js set-up: how people sign in to Collabz (slice 1, #8).
//
// Auth.js (the `next-auth` package, version 5) handles the fiddly, security-
// sensitive parts of magic-link sign-in for us: making a one-time token,
// emailing a link that contains it, checking the token when the link is
// opened, and keeping the person signed in with a session cookie.
//
// This file only CONFIGURES Auth.js. It exports four things the rest of the
// app uses (the names are Auth.js's own):
//   - handlers: answers the requests under /api/auth/* (the magic link points
//               there). Used once, in src/app/api/auth/[...nextauth]/route.ts.
//   - auth:     "who is signed in?" Used inside getCurrentUser() in
//               src/lib/currentUser.ts. Other tracks call getCurrentUser(),
//               never auth() directly.
//   - signIn:   sends a magic link (called from the sign-up and sign-in forms).
//   - signOut:  ends the session (called from the Sign out button).
//
// Why this file lives at src/auth.ts: it is where the Auth.js docs put it,
// so anything you read online about Auth.js v5 matches what you see here.
//
// Owner: slice 1 (#8).

import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";

import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The adapter is how Auth.js reads and writes our database: it stores users
  // in `User`, magic-link tokens in `VerificationToken` and sessions in
  // `Session` (the foundation, #7, created those tables for us).
  //
  // We pass our one shared client from src/lib/db.ts, so Auth.js uses the
  // same Neon connection as the rest of the app. The adapter was written for
  // a client at `@prisma/client`, while Prisma 7 generates ours into
  // src/generated/prisma. TypeScript accepts it as it is (checked 13 Oct
  // 2026), and slice 1's task 1.3 checks it works by signing in for real.
  //
  // When a new person signs in, Auth.js asks the adapter to create a User
  // with only an email (no name or picture), and the adapter lets our
  // database make the id. That fits our User table, which has no `name` or
  // `image` columns on purpose (foundation #7, design decision 3).
  adapter: PrismaAdapter(prisma),

  // Keep each session as a row in the `Session` table, not only in a signed
  // cookie. Why: the row is checked against the user on every request, so if
  // an admin suspends someone, they are signed out on their very next page
  // (design decision 1). Database sessions are already Auth.js's default when
  // there's an adapter; we say it out loud so nobody has to know that.
  session: { strategy: "database" },

  providers: [
    // Magic links, sent by email through Resend.
    // - The API key is read from AUTH_RESEND_KEY automatically (Auth.js looks
    //   for AUTH_<PROVIDER>_KEY), so it never appears in the code.
    // - `from` is the sender address, e.g. "Collabz <login@ourdomain>".
    //   It must be on a domain verified in Resend, or Resend refuses to send.
    // - Links expire after 24 hours, Auth.js's default, which the user-auth
    //   spec relies on ("Magic links are single-use and expire").
    Resend({
      from: process.env.EMAIL_FROM,
    }),
  ],
});
