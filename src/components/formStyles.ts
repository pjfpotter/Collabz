// The look of form controls, written once (slice 10, #45, design decision 1).
//
// These are plain strings of Tailwind classes, shared so every form in the
// app (sign up, sign in, account, admin, messages) has the same inputs and
// buttons without copying a long class list into each file:
//
//   <input className={inputClasses} />
//   <button className={primaryButtonClasses}>Save</button>
//
// WHY STRINGS AND NOT A COMPONENT: the forms are written in many shapes
// (client forms, server forms, a select, a checkbox), and a class string
// fits all of them without hiding the element you are looking at.
//
// What the classes guarantee (visual-design spec):
// - min-h-11 is 44px, the smallest comfortable touch target;
// - borders use line-strong, which has the 3:1 contrast controls need;
// - the focus ring only shows for keyboard users (focus-visible).

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-text";

// A text box or a <select>.
export const inputClasses =
  `min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-foreground ${focusRing}`;

// The main action on a form: the brand fill.
export const primaryButtonClasses =
  `min-h-11 rounded-control bg-primary px-4 font-bold text-on-primary hover:shadow-glow ` +
  `disabled:opacity-60 disabled:hover:shadow-none ${focusRing}`;

// A quieter action next to the main one: just a bordered button.
export const secondaryButtonClasses =
  `min-h-11 rounded-control border border-line-strong bg-surface px-4 font-medium text-foreground ` +
  `hover:bg-surface-2 disabled:opacity-60 ${focusRing}`;

// A problem message under a field. Always written as words, so it never
// relies on its colour alone.
export const errorTextClasses = "text-sm font-medium text-danger";

// A boxed message: "check your email", a sign-in problem.
export const noticeClasses = "rounded-feature border border-line bg-surface p-4";

// A link inside body text.
export const textLinkClasses = `text-primary-text underline underline-offset-4 ${focusRing}`;

// A tick box (the box itself; wrap it with its label in a min-h-11 row).
export const checkboxClasses = `h-5 w-5 shrink-0 accent-primary-text ${focusRing}`;
