// /signup - PLACEHOLDER (foundation #7).
// Owner: slice 1, issue #8 (track 1). Replace this file with the real page.

import { PlaceholderPage } from "@/components/PlaceholderPage";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Sign up · Collabz",
};

export default function SignUpPage() {
  return (
    <PlaceholderPage
      title="Sign up"
      slice={1}
      issue={8}
      willShow="Create an account with an emailed magic link, choosing your course and accepting the terms."
    />
  );
}
