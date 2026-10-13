// /terms - the Terms & Conditions (slice 1, #8, design decision 10).
//
// Accepted at sign-up, together with the data policy (/privacy). Anyone can
// read it without signing in (user-auth spec: "Terms & Conditions and data
// policy pages").
//
// Written by the team in plain English for a course project, and read by the
// team before going live (task 5.3). It is not legal advice.
//
// Owner: slice 1 (#8).

import Link from "next/link";

import { LegalPage } from "@/components/LegalPage";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Terms & Conditions · Collabz",
};

// The facts most likely to change, in one place (values from task 5.1).
const END_DATE = "26 November 2026";
const CONTACT_EMAIL = "tomhazz@gmail.com";

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" lastUpdated="13 October 2026">
      <p>
        By signing up to Collabz you agree to these terms and to our{" "}
        <Link href="/privacy">data policy</Link>. They&apos;re short, and
        we&apos;ve kept them in plain English.
      </p>

      <h2>What Collabz is</h2>
      <p>
        Collabz is a student project for our bootcamp course. It helps software
        and business students on the course find people to work with, matched
        by the things they pick about themselves. It runs for the course&apos;s
        live test and closes at the end of the course, on {END_DATE}.
      </p>

      <h2>Who can use it</h2>
      <ul>
        <li>Students taking part in the course&apos;s live test.</li>
        <li>One account each, signed up with your own email address.</li>
        <li>Choose the course you are actually on.</li>
      </ul>

      <h2>How to behave</h2>
      <p>
        Be kind and respectful. Messages are the only place you can write your
        own words, so in them please don&apos;t:
      </p>
      <ul>
        <li>harass, threaten or bully anyone;</li>
        <li>send anything hateful, sexual or offensive;</li>
        <li>share other people&apos;s personal details;</li>
        <li>pretend to be someone else, or spam people.</li>
      </ul>
      <p>
        If you upload a photo, it must be of you, and appropriate for a course
        setting.
      </p>

      <h2>Keeping each other safe</h2>
      <p>
        You can block anyone, and report anyone who breaks these terms. The
        admins (Patrick and Tom) read every report. They can remove a photo or
        suspend an account, and a suspended account can&apos;t sign in.
      </p>

      <h2>No guarantees</h2>
      <p>
        Collabz is a student project. We do our best to keep it working and
        your data safe, but we can&apos;t promise it will always be available,
        or that every match will be a good one. Please use your own judgement
        when meeting and working with people.
      </p>

      <h2>Changes and questions</h2>
      <p>
        If we change these terms in a way that matters, we&apos;ll tell you in
        the app. Questions go to Tom at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
