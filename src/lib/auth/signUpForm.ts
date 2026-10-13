// The rules for the sign-up form (slice 1, #8).
//
// The user-auth spec says no account counts as created until the person has
// given an email, chosen a course and accepted the Terms & Conditions and
// data policy. These rules are checked TWICE:
//   1. on /signup, before the magic link is sent, and
//   2. on /signup/finish, before course and terms are saved.
// The second check matters because the answers travel inside the magic link
// (design decision 3), and anyone can edit a link before opening it.
//
// It is a plain function with no database or page code, so the tests can
// try every case quickly.
//
// Owner: slice 1 (#8).

// What the person filled in. Form fields always arrive as text, so the page
// turns the tick box into true/false before calling us.
export type SignUpAnswers = {
  email: string;
  courseId: string;
  acceptedTerms: boolean;
};

// Which field a problem belongs to, so the page can show the message right
// next to that field.
export type SignUpField = "email" | "courseId" | "acceptedTerms";

export type SignUpProblem = {
  field: SignUpField;
  message: string;
};

// A deliberately loose email check: some text, an @, more text, a dot, more
// text, and no spaces. Why loose: the magic link itself is the real test (if
// the address is wrong, no email arrives). This only catches obvious typos,
// like a missing @, before we ask Resend to send anything.
const LOOKS_LIKE_AN_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns every problem with the answers. An empty list means "all good".
//
// `activeCourseIds` are the courses currently offered (not retired). The page
// reads them from the database and passes them in, so this function never
// talks to the database itself.
//
// Why return ALL the problems at once, not just the first: on a phone it is
// annoying to fix one thing, submit, and only then be told about the next.
export function checkSignUpForm(
  answers: SignUpAnswers,
  activeCourseIds: string[],
): SignUpProblem[] {
  const problems: SignUpProblem[] = [];

  const emailProblem = checkEmailAddress(answers.email);
  if (emailProblem) {
    problems.push({ field: "email", message: emailProblem });
  }

  if (answers.courseId === "") {
    problems.push({ field: "courseId", message: "Choose your course." });
  } else if (!activeCourseIds.includes(answers.courseId)) {
    // Either a retired course, or a made-up id from an edited link.
    // The person can fix both the same way: by picking from the list.
    problems.push({
      field: "courseId",
      message: "That course isn't available. Choose one from the list.",
    });
  }

  if (!answers.acceptedTerms) {
    problems.push({
      field: "acceptedTerms",
      message: "Accept the Terms & Conditions and data policy to sign up.",
    });
  }

  return problems;
}

// Turns the list of problems into "field -> message", which is easier for a
// form to use: { email: "Enter your email address.", courseId: "..." }.
export function problemsByField(
  problems: SignUpProblem[],
): Partial<Record<SignUpField, string>> {
  const byField: Partial<Record<SignUpField, string>> = {};
  for (const problem of problems) {
    byField[problem.field] = problem.message;
  }
  return byField;
}

// What's wrong with this email address, or null if nothing is.
//
// Used by checkSignUpForm above, and on its own by the sign-in form, which
// only asks for an email. One rule in one place, so the two forms can never
// disagree about what counts as an email address.
export function checkEmailAddress(rawEmail: string): string | null {
  const email = rawEmail.trim();
  if (email === "") {
    return "Enter your email address.";
  }
  if (!LOOKS_LIKE_AN_EMAIL.test(email)) {
    return "That doesn't look like an email address. Check for typos.";
  }
  return null;
}
