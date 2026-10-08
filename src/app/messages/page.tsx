// /messages - PLACEHOLDER (foundation #7).
// Owner: slice 6, issue #13 (track 5). Replace this file with the real page.

import { PlaceholderPage } from "@/components/PlaceholderPage";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Messages · Collabz",
};

export default function MessagesPage() {
  return (
    <PlaceholderPage
      title="Messages"
      slice={6}
      issue={13}
      willShow="Your conversations with the people you've connected with."
    />
  );
}
