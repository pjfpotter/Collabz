// /onboarding - build your profile by picking from lists (slice 2, #9).
//
// A Server Component: it decides who may be here, loads the catalogue, and
// hands it to the step-by-step wizard, which runs in the browser.
//
// - Not signed in            -> /signin
// - Profile already finished -> /onboarding/done (spec: "Finished user is
//                               not onboarded twice")
// - Otherwise                -> the wizard

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/currentUser";
import { getOnboardingCatalogue } from "@/lib/profile/onboardingCatalogue";
import { hasFinishedOnboarding } from "@/lib/profile/onboardingRedirect";

import { OnboardingWizard } from "./OnboardingWizard";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Onboarding · Collabz",
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  if (await hasFinishedOnboarding(user.id)) {
    redirect("/onboarding/done");
  }

  const catalogue = await getOnboardingCatalogue();
  // Only what the browser needs: the alias words stay on the server, where
  // the alias is worked out.
  const categories = catalogue.map((category) => ({
    id: category.id,
    name: category.name,
    pickMin: category.pickMin,
    pickMax: category.pickMax,
    tags: category.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      description: tag.description,
    })),
  }));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-semibold">Build your profile</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        No typing: just pick what sounds like you. It takes about two minutes.
      </p>
      <div className="mt-8">
        <OnboardingWizard categories={categories} />
      </div>
    </main>
  );
}
