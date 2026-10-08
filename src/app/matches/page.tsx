// /matches - PLACEHOLDER (foundation #7).
// Owner: slice 3, issue #10 (track 3). Replace this file with the real page.

import { PlaceholderPage } from "@/components/PlaceholderPage";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Matches · Collabz",
};

export default function MatchesPage() {
  return (
    <PlaceholderPage
      title="Matches"
      slice={3}
      issue={10}
      willShow="Your top 5 matches and your glitch match, with why you fit."
    />
  );
}
