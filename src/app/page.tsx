// The home page ("/").
//
// landing-page-demo: the first thing the cohort sees after scanning the QR
// code, so it has to say what Collabz is. The page is written in plain words
// first (promise, buttons, four steps); the animated demo goes between the
// promise and the steps in group 2 and only ever repeats what the words say.
//
// Everything here is static except the main button, which asks who is signed
// in (see LandingActions). The page reads NOTHING from the database.

import Link from "next/link";

import { textLinkClasses } from "@/components/formStyles";
import { DemoCaption } from "@/components/landing/DemoCaption";
import { DemoScene } from "@/components/landing/DemoScene";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingActions } from "@/components/landing/LandingActions";

export default function Home() {
  return (
    // max-w-4xl: wide enough for the two-column step list on a desktop; px-4
    // keeps a gap at the edges on a phone (design decision 10).
    <main className="mx-auto w-full max-w-4xl px-4 py-12">
      <h1 className="text-5xl leading-none sm:text-6xl">
        Collab<span className="italic text-primary-text">z</span>
      </h1>

      <p className="mt-4 max-w-xl text-xl text-foreground">
        Find people to work with by chemistry, not CVs.
      </p>
      <p className="mt-3 max-w-xl text-lg text-muted">
        Collabz matches students on the software and business courses by the
        things they pick, so the right pair finds each other before the project
        starts.
      </p>

      <LandingActions />

      {/* The picture of the idea, between the buttons and the words. It only
          repeats what HowItWorks says. The finished picture is the default;
          landing.css adds the motion on top. */}
      <div className="mt-12">
        <DemoScene />
        {/* Names the step on screen while the picture plays. Hidden when
            nothing is animating, because the list below says the same. */}
        <DemoCaption />
      </div>

      <HowItWorks />

      <p className="mt-12">
        <Link href="/catalogue" className={textLinkClasses}>
          See the tag catalogue
        </Link>
      </p>
    </main>
  );
}
