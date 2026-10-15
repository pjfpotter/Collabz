// The look shared by every admin page (slice 10, #45, group 9.2).
//
// The admin pages are lists of cards with small forms inside, so these
// strings are built on the shared form styles (src/components/formStyles.ts)
// rather than inventing a second look. Defined once here so the four admin
// pages and TagCard can't drift apart.

import {
  errorTextClasses,
  inputClasses,
  noticeClasses,
  secondaryButtonClasses,
} from "@/components/formStyles";

// Every admin button (Rename, Move up, Retire, Suspend ...). The shared
// secondary look: 44px high, bordered, with a visible keyboard focus ring.
export const adminButtonClasses = secondaryButtonClasses;

// A text box that sits beside its button in a row. min-w-0 lets it shrink
// below its natural width, so a long name never pushes the page sideways.
export const adminRowInputClasses = `min-w-0 flex-1 ${inputClasses}`;

// One card in a list (a course, a user, a tag, a category).
export const adminCardClasses = "rounded-feature border border-line bg-surface p-4";

// "A change was refused" box. The words carry the meaning, the colour only
// helps (errorTextClasses).
export const adminProblemClasses = `${noticeClasses} ${errorTextClasses}`;

// "Done" / information box.
export const adminNoteClasses = `${noticeClasses} text-sm`;

// Small grey ids and counts under a name. Long ids break instead of
// stretching the page on a phone.
export const adminMetaClasses = "text-xs text-muted [overflow-wrap:anywhere]";
