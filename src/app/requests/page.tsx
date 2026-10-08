// /requests - PLACEHOLDER (foundation #7).
// Owner: slice 5, issue #12 (track 5). Replace this file with the real page.

import { PlaceholderPage } from "@/components/PlaceholderPage";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Requests · Collabz",
};

export default function RequestsPage() {
  return (
    <PlaceholderPage
      title="Requests"
      slice={5}
      issue={12}
      willShow="Connection requests you've sent and received, to approve or decline."
    />
  );
}
