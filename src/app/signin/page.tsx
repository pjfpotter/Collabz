// /signin - PLACEHOLDER (foundation #7).
// Owner: slice 1, issue #8 (track 1). Replace this file with the real page.

import { PlaceholderPage } from "@/components/PlaceholderPage";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Sign in · Collabz",
};

export default function SignInPage() {
  return (
    <PlaceholderPage
      title="Sign in"
      slice={1}
      issue={8}
      willShow="Sign in to an existing account with an emailed magic link."
    />
  );
}
