// /people - PLACEHOLDER (foundation #7).
// Owner: slice 4, issue #11 (track 4). Replace this file with the real page.

import { PlaceholderPage } from "@/components/PlaceholderPage";

// Sets the browser tab title for this page.
export const metadata = {
  title: "People · Collabz",
};

export default function PeoplePage() {
  return (
    <PlaceholderPage
      title="People"
      slice={4}
      issue={11}
      willShow="Everyone in the cohort, with filters for course, skill and interest."
    />
  );
}
