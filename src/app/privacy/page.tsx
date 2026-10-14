// /privacy - the data policy (slice 1, #8, design decision 10).
//
// Accepted at sign-up, together with the Terms & Conditions. The user-auth
// spec ("Terms & Conditions and data policy pages") says it must cover what
// personal data we hold (including photos and messages), who can see it, and
// when and by whom it is deleted. Anyone can read it without signing in.
//
// Written by the team in plain English for a course project, and read by the
// team before going live (task 5.3). It is not legal advice.
//
// If you change what the app stores or shows, update this page too.
//
// Owner: slice 1 (#8).

import Link from "next/link";

import { LegalPage } from "@/components/LegalPage";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Data policy · Collabz",
};

// The facts most likely to change, in one place (values from task 5.1).
const DELETION_DATE = "26 November 2026";
const CONTACT_EMAIL = "tomhazz@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalPage title="Data policy" lastUpdated="13 October 2026">
      <p>
        Collabz is a student project, run for the live test of our bootcamp
        course. It matches software and business students by the things they
        pick about themselves. This page explains what we keep about you, who
        can see it, and when we delete it.
      </p>

      <h2>Who runs Collabz</h2>
      <p>
        Collabz is built and run by five students on the course. Two of them,
        Patrick and Tom, are the admins: they look after the app and its data.
        Questions about your data go to Tom at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>What we keep about you</h2>
      <ul>
        <li>
          <strong>Your email address</strong>, so we can send you sign-in links.
          There are no passwords.
        </li>
        <li>
          <strong>Your course</strong>, and the date you accepted this policy
          and the Terms &amp; Conditions.
        </li>
        <li>
          <strong>Your profile</strong>: the answers you pick from lists while
          setting up (for example your energy, qualities, skills and
          interests), and the alias and silhouette the app gives you. You never
          type anything into your profile, so it only holds choices from our
          lists.
        </li>
        <li>
          <strong>A photo, only if you add one.</strong>
        </li>
        <li>
          <strong>Match scores</strong> the app works out between you and every
          other student, from your picks.
        </li>
        <li>
          <strong>Connection requests</strong> you send and receive, and
          whether they were accepted.
        </li>
        <li>
          <strong>Messages</strong> you send to people you&apos;ve connected
          with.
        </li>
        <li>
          <strong>Blocks and reports</strong>: who you block, and any report
          you make about someone (with the reason you chose).
        </li>
        <li>
          <strong>Sign-in records</strong>: a cookie that keeps you signed in,
          and a matching record on our side. It is only used for signing in.
        </li>
      </ul>
      <p>
        If you ask for a sign-in link but never finish signing up, we keep
        your email address until the deletion date below, like everyone
        else&apos;s.
      </p>

      <h2>Why we keep it</h2>
      <p>
        Only to run Collabz for the live test: to sign you in, to match you
        with other students, to let you connect and message, and to keep
        people safe. We don&apos;t sell it, share it for advertising, or use
        it for anything else.
      </p>

      <h2>Who can see what</h2>
      <ul>
        <li>
          <strong>Other students</strong> see your alias, your silhouette, your
          course, your picks and a short description made from them, on the
          graph and in search. They never see your email address.
        </li>
        <li>
          <strong>Your photo and your messages</strong> are only seen by people
          you have connected with, which means you both agreed. Your photo is
          never shown on the graph or in search.
        </li>
        <li>
          <strong>The admins (Patrick and Tom)</strong> can see everything
          above, so they can look after the app and deal with reports.
        </li>
      </ul>

      <h2>Where it is stored</h2>
      <p>
        Your data is stored with the services that run Collabz: Neon (our
        database), Vercel (which runs the app) and Resend (which sends the
        sign-in emails, so it sees your email address). Each keeps it only to
        provide its service to us.
      </p>

      <h2>When it is deleted</h2>
      <p>
        <strong>
          The admins will delete all accounts and everything listed above at
          the end of the course, on {DELETION_DATE}.
        </strong>{" "}
        If you want your data deleted sooner, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the
        address you signed up with, and we&apos;ll delete it.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us what we hold about you, ask us to correct it, or ask us
        to delete it, at any time, using the email above.
      </p>

      <p>
        See also the <Link href="/terms">Terms &amp; Conditions</Link>.
      </p>
    </LegalPage>
  );
}
