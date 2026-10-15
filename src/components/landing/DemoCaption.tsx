// THE STEP CAPTION UNDER THE DEMO (landing-page-demo, group 2, task 2.3).
//
// While the picture plays, this line says which of the four steps is on screen
// ("Pick", "Match", "Request", "Talk") and repeats that step's sentence.
//
// WHY THE WORDS COME FROM THE SAME ARRAY AS THE LIST: HOW_IT_WORKS_STEPS in
// demoCast.ts feeds both this caption and HowItWorks. The caption can't say
// anything the list doesn't (spec: "Nothing is said only by motion").
//
// WHY IT IS HIDDEN BY DEFAULT: the list below the picture already carries
// these exact words for everyone. Showing the caption as well, with no
// animation running, would just read the same text twice. So landing.css sets
// `.demo-caption { display: none }` and only un-hides the captions inside
// "prefers-reduced-motion: no-preference", where they take turns on the same
// 16-second loop as the picture.
//
// WHY NOT THE HTML `hidden` ATTRIBUTE: Tailwind's base styles force
// `[hidden] { display: none !important }`, so CSS could never un-hide it.
// (With ALL CSS switched off the four captions show one under the other,
// which is harmless: same words as the list, and a screen reader skips them.)
//
// WHY aria-hidden: a screen reader reaches the list in a moment, so reading a
// caption that appears and disappears every few seconds would only be noise.
//
// A Server Component with no state: the timing is all in CSS.

import "./landing.css";
import { HOW_IT_WORKS_STEPS } from "./demoCast";

export function DemoCaption() {
  return (
    // All four captions sit in the SAME grid cell (see landing.css), so the
    // box keeps the height of the tallest one and the page doesn't jump
    // when the caption changes.
    <div aria-hidden="true" className="demo-caption-stack mx-auto mt-4 max-w-md text-center">
      {HOW_IT_WORKS_STEPS.map((step, index) => (
        <p
          key={step.title}
          // demo-caption-1 .. demo-caption-4: landing.css gives each its own
          // window in the timeline. Numbered from 1 to match the list.
          className={`demo-caption demo-caption-${index + 1} text-base text-muted`}
        >
          <strong className="text-foreground">
            {index + 1}. {step.title}.
          </strong>{" "}
          {step.text}
        </p>
      ))}
    </div>
  );
}
