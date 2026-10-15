// "HOW IT WORKS" AS PLAIN TEXT (landing-page-demo, spec: "The demo does not
// depend on motion").
//
// The animated demo shows these same four steps. They are ALSO written out
// here so that anyone who can't or doesn't want to watch an animation (screen
// reader, reduced motion, slow phone) gets the whole idea from the words.
//
// A Server Component with no state: it only draws the list.

import { HOW_IT_WORKS_STEPS } from "./demoCast";

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading" className="mt-16">
      <h2 id="how-it-works-heading" className="text-3xl">
        How it works
      </h2>

      {/* An <ol> so assistive technology reads "list, 4 items" and the order
          is part of the meaning. The number badge is a plain number in the
          markup, not a CSS counter: it is easier to read and can't go
          missing. It is aria-hidden because the list already announces
          the position. */}
      <ol className="mt-6 grid gap-4 sm:grid-cols-2">
        {HOW_IT_WORKS_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-feature border border-line bg-surface p-5"
          >
            <p className="flex items-center gap-3 text-xl font-bold">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-base text-on-primary"
              >
                {index + 1}
              </span>
              {step.title}
            </p>
            <p className="mt-3 text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
