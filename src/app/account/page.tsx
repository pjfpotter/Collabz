// /account - PLACEHOLDER (foundation #7).
// Owner: slice 7, issue #14 (track 1). Replace this file with the real page.

import { PlaceholderPage } from "@/components/PlaceholderPage";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Account · Collabz",
};

export default function AccountPage() {
  return (
    <PlaceholderPage
      title="Account"
      slice={7}
      issue={14}
      willShow="Your own profile: edit your answers and add a photo."
    />
  );
}
