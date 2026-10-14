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
import Nodemailer from "next-auth/providers/nodemailer";
// Switched off (see "To switch back to Resend" below):
// import Resend from "next-auth/providers/resend";
// import { sendViaResend } from "@/lib/auth/sendMagicLinkEmail";

import { gmailServer, sendViaGmail } from "@/lib/auth/sendMagicLinkEmail";
import { applyAdminList, mayFinishSignIn } from "@/lib/auth/signInRules";
import { prisma } from "@/lib/db";

// The Gmail account magic links are sent from (design decision 13).
// Read once here and handed to the provider below.
const gmailAccount = {
  user: process.env.GMAIL_USER,
  appPassword: process.env.GMAIL_APP_PASSWORD,
};

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

  // Use our own pages instead of Auth.js's built-in plain ones.
  // - signIn: where Auth.js sends anyone who needs to sign in.
  // - error:  where it sends people when a link fails, with ?error=<code>
  //   (e.g. "Verification" for a used or expired link, "AccessDenied" when
  //   our signIn callback below refuses a suspended account). /signin turns
  //   those codes into plain sentences.
  pages: {
    signIn: "/signin",
    error: "/signin",
  },

  callbacks: {
    // What auth() hands back about the signed-in person.
    //
    // By default Auth.js only includes their name, email and picture. We add
    // their user id, so getCurrentUser() can load the full, up-to-date User
    // row with it (src/lib/auth/session.ts).
    //
    // Why not put the whole User row on the session instead: auth() passes
    // the session through JSON, which turns dates (like suspendedAt) into
    // plain text. Loading the row ourselves keeps them real dates, and means
    // a suspension is seen the moment it happens.
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },

    // Runs twice for a magic link: when the link is REQUESTED (the sign-in
    // form is sent) and when it is USED (the link is opened). Returning false
    // refuses, and Auth.js sends the person to /signin?error=AccessDenied.
    //
    // We only refuse when the link is used. Why not at the request too: then
    // anyone could type an email into the form and learn from the answer
    // whether that account is suspended (design decision 6).
    async signIn({ user, email }) {
      const isJustRequestingALink = email?.verificationRequest === true;
      if (isJustRequestingALink || !user.email) {
        return true;
      }
      return mayFinishSignIn(user.email);
    },
  },

  events: {
    // Auth.js fires this once, right after it creates a new User row (the
    // first time an email opens a magic link). Emails on ADMIN_EMAILS become
    // admins here (design decision 5).
    async createUser({ user }) {
      if (user.id && user.email) {
        await applyAdminList(
          { id: user.id, email: user.email },
          process.env.ADMIN_EMAILS,
        );
      }
    },
  },

  providers: [
    // IN USE: magic links sent through a dedicated Gmail account (design
    // decision 13, 13 Oct 2026). Free, and needs no domain of our own.
    // - Auth.js's "Nodemailer" provider sends email through any mail server;
    //   we point it at Gmail's (see gmailServer()).
    // - GMAIL_USER is the account; GMAIL_APP_PASSWORD is an "app password"
    //   Google makes for it, NOT the account's normal password.
    // - EMAIL_FROM is that same Gmail address with a display name, e.g.
    //   "Collabz <collabz.signin@gmail.com>". Gmail replaces any other
    //   sender address with the account's own.
    // - Links expire after 24 hours, Auth.js's default, which the user-auth
    //   spec relies on ("Magic links are single-use and expire").
    Nodemailer({
      server: gmailServer(gmailAccount),
      from: process.env.EMAIL_FROM,
      // Our own email (wording, one retry, and the test inbox for pretend
      // students): see src/lib/auth/sendMagicLinkEmail.ts.
      sendVerificationRequest: ({ identifier, url, provider }) =>
        sendViaGmail({ to: identifier, url, from: provider.from }, gmailAccount),
    }),

    // SWITCHED OFF: sending through Resend (design decisions 8 and 13).
    // Resend delivers more reliably than Gmail, but without a verified domain
    // of our own it only delivers to the Resend account owner, so students
    // couldn't sign up. Kept here to switch back to once we have a domain.
    //
    // To switch back to Resend:
    //   1. Verify our domain in Resend (Resend dashboard -> Domains).
    //   2. Set AUTH_RESEND_KEY, and set EMAIL_FROM to an address on that
    //      domain, locally and in Vercel.
    //   3. Uncomment the block below, and the two Resend import lines at the
    //      top of this file.
    //   4. Delete (or comment out) the Nodemailer({...}) block above, and its
    //      import and the gmailAccount lines.
    //   5. Change EMAIL_PROVIDER_ID below from "nodemailer" to "resend".
    //   6. Run npm test and npm run test:e2e.
    // sendViaResend() itself is kept working and tested meanwhile.
    //
    // Resend({
    //   // The API key is read from AUTH_RESEND_KEY automatically (Auth.js
    //   // looks for AUTH_<PROVIDER>_KEY), so it never appears in the code.
    //   from: process.env.EMAIL_FROM,
    //   sendVerificationRequest: ({ identifier, url, provider }) =>
    //     sendViaResend({ to: identifier, url, from: provider.from }, provider.apiKey),
    // }),
  ],
});

// The name of the email provider above, which signIn() needs, e.g.
// signIn(EMAIL_PROVIDER_ID, { email }). It is also the last part of the
// magic link's address: /api/auth/callback/nodemailer.
// One constant, so switching provider is one change here (see step 5 above).
export const EMAIL_PROVIDER_ID = "nodemailer";
