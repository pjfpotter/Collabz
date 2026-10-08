// /onboarding - PLACEHOLDER (foundation #7).
// Owner: slice 2, issue #9 (track 2). Replace this file with the real page.

import { PlaceholderPage } from "@/components/PlaceholderPage";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Onboarding · Collabz",
};

export default function OnboardingPage() {
  return (
    <PlaceholderPage
      title="Onboarding"
      slice={2}
      issue={9}
      willShow="Build your profile by picking tags from lists, with no typing."
    />
  );
}
