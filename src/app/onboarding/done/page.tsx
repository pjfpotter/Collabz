// /onboarding/done - your finished profile (slice 2, #9, design decision 9).
//
// The success screen after onboarding, and where /onboarding sends anyone
// who has already finished. Shows the same card other people will see:
// alias, silhouette, bio, skills and interests. Never the email or a photo.

import Link from "next/link";

import { ProfileCard } from "@/components/ProfileCard";
import { redirectIfOnboardingIncomplete } from "@/lib/profile/onboardingRedirect";
import { getProfileCard } from "@/lib/profile/profileCardData";

export const metadata = {
  title: "Your profile · Collabz",
};

export default async function OnboardingDonePage() {
  // Not signed in -> /signin; not finished -> /onboarding.
  const user = await redirectIfOnboardingIncomplete();

  // The helper above has just checked the profile is finished, so this
  // finds it. `!` tells TypeScript we know it isn't null.
  const card = (await getProfileCard(user.id))!;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-semibold">You&apos;re in</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        This is how other people will see you. You can change your answers from your account.
      </p>

      <div className="mt-6">
        <ProfileCard {...card} />
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <Link href="/graph" className="rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900">
          See who you match with
        </Link>
        <Link href="/account" className="rounded border border-current/40 px-4 py-2">
          Your account
        </Link>
      </div>
    </main>
  );
}
