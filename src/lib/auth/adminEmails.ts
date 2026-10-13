// Who becomes an admin when they first sign up (slice 1, #8).
//
// The first admins can't be made through the app, because there is no admin
// yet to make them. Instead, the deployment's ADMIN_EMAILS setting lists
// their emails, and anyone on that list gets the admin role the moment their
// account is created (user-auth spec: "First admins come from the
// deployment's settings"). Keeping the list in the settings, not the code,
// means nobody's email address is ever committed to the repo.
//
// Owner: slice 1 (#8).

// Is `email` on the admin list?
//
// `list` is the raw ADMIN_EMAILS value: emails separated by commas, e.g.
// "patrick@example.com, Tom@Example.com". It is passed in, rather than read
// from process.env here, so the tests can try any list without touching the
// real environment.
//
// Spaces around each email and capital letters are ignored, because both are
// easy to type by accident into Vercel's settings, and a typo there would
// silently leave us with no admin at all.
export function isAdminEmail(email: string, list: string | undefined): boolean {
  // No list (the variable isn't set) means nobody is an admin.
  if (!list) {
    return false;
  }

  const wanted = normaliseEmail(email);

  // Split "a@x.com, b@y.com" into ["a@x.com", "b@y.com"], tidy each one,
  // and drop empty pieces (e.g. from a trailing comma: "a@x.com,").
  const adminEmails = list
    .split(",")
    .map(normaliseEmail)
    .filter((adminEmail) => adminEmail !== "");

  return adminEmails.includes(wanted);
}

// "  Tom@Example.com " -> "tom@example.com".
// Email addresses aren't case-sensitive in practice, and Auth.js stores them
// in lower case, so we compare them in lower case too.
function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
