"use client";
// The step-by-step onboarding (slice 2, #9, design decision 1).
//
// One step per screen: one per category (in catalogue order), then the
// silhouette, then a summary with "Finish". The picks are kept here, in the
// browser, and sent ONCE at the end to POST /api/onboarding.
//
// WHY ONE SAVE AT THE END: a profile is either finished or doesn't exist, so
// the database never holds a half-made profile that matching or the graph
// would have to work around. The cost: refreshing the page mid-way loses the
// picks. Onboarding takes about two minutes, so that was accepted.
//
// WHY ONE STEP PER SCREEN: people use this on phones, and twelve tags with
// descriptions already fill a phone screen.

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Silhouette } from "@/components/Silhouette";
import { SILHOUETTE_STEP, type AnswerProblem } from "@/lib/profile/validateAnswers";

import { PickStep, type PickStepCategory } from "./PickStep";
import { SilhouetteStep } from "./SilhouetteStep";

type OnboardingWizardProps = {
  categories: PickStepCategory[];
};

export function OnboardingWizard({ categories }: OnboardingWizardProps) {
  const router = useRouter();

  // Which screen is showing: 0..categories.length-1 are the categories, then
  // the silhouette, then the summary.
  const silhouetteIndex = categories.length;
  const summaryIndex = categories.length + 1;
  const totalSteps = categories.length + 1; // the summary isn't counted
  const [stepIndex, setStepIndex] = useState(0);

  // The picks so far: category id -> tag ids.
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [silhouetteId, setSilhouetteId] = useState<string | null>(null);

  // What the server said was wrong, and whether a save is under way.
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function goTo(index: number) {
    setStepIndex(index);
    // Start each step at the top: on a phone the Next button is at the
    // bottom of a long list.
    window.scrollTo({ top: 0 });
  }

  // Can this step be left forwards? (Spec: "Cannot skip a category".)
  function stepIsDone(index: number): boolean {
    if (index < categories.length) {
      const category = categories[index];
      const count = (picks[category.id] ?? []).length;
      return count >= category.pickMin && count <= category.pickMax;
    }
    if (index === silhouetteIndex) {
      return silhouetteId !== null;
    }
    return true;
  }

  async function finish() {
    setSaving(true);
    setProblem(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks, silhouetteId }),
      });

      // 200 = saved. 409 = already finished (say, in another tab). Either
      // way their profile is done, so show it.
      if (response.ok || response.status === 409) {
        router.push("/onboarding/done");
        // router.refresh() makes the server pages load fresh data, rather
        // than an earlier copy from before the profile existed.
        router.refresh();
        return;
      }

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        problems?: AnswerProblem[];
      };
      // 400: send them back to the first step with a problem, and say why.
      // Usually it's a tag an admin retired while they were picking.
      const first = body.problems?.[0];
      if (first) {
        const index =
          first.step === SILHOUETTE_STEP
            ? silhouetteIndex
            : categories.findIndex((category) => category.id === first.step);
        if (index >= 0) {
          goTo(index);
        }
        setProblem(first.message);
      } else {
        setProblem(body.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setProblem("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  // The heading for the current screen.
  let title = "Check your answers";
  if (stepIndex < categories.length) {
    title = categories[stepIndex].name;
  } else if (stepIndex === silhouetteIndex) {
    title = "Pick a silhouette";
  }

  return (
    <div>
      {stepIndex < summaryIndex && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400" data-testid="step-counter">
          Step {stepIndex + 1} of {totalSteps}
        </p>
      )}
      <h2 className="mt-1 text-2xl font-semibold" data-testid="step-title">
        {title}
      </h2>

      {problem && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400" data-testid="onboarding-problem">
          {problem}
        </p>
      )}

      <div className="mt-4">
        {stepIndex < categories.length && (
          <PickStep
            // `key` makes React start fresh for each category, rather than
            // reusing the previous step's buttons.
            key={categories[stepIndex].id}
            category={categories[stepIndex]}
            picked={picks[categories[stepIndex].id] ?? []}
            onChange={(picked) => setPicks({ ...picks, [categories[stepIndex].id]: picked })}
          />
        )}

        {stepIndex === silhouetteIndex && (
          <SilhouetteStep picked={silhouetteId} onChange={setSilhouetteId} />
        )}

        {stepIndex === summaryIndex && (
          <Summary categories={categories} picks={picks} silhouetteId={silhouetteId} onEdit={goTo} />
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(stepIndex - 1)}
          disabled={stepIndex === 0 || saving}
          className="rounded border border-current/40 px-4 py-2 disabled:opacity-40"
        >
          Back
        </button>

        {stepIndex < summaryIndex ? (
          <button
            type="button"
            onClick={() => goTo(stepIndex + 1)}
            disabled={!stepIsDone(stepIndex)}
            className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            disabled={saving}
            className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? "Saving…" : "Finish"}
          </button>
        )}
      </div>
    </div>
  );
}

// The summary screen: every answer, each with a "Change" link back to its
// step.
function Summary({
  categories,
  picks,
  silhouetteId,
  onEdit,
}: {
  categories: PickStepCategory[];
  picks: Record<string, string[]>;
  silhouetteId: string | null;
  onEdit: (index: number) => void;
}) {
  return (
    <dl className="flex flex-col gap-3" data-testid="onboarding-summary">
      {categories.map((category, index) => {
        const names = (picks[category.id] ?? []).map(
          (tagId) => category.tags.find((tag) => tag.id === tagId)?.name ?? tagId,
        );
        return (
          <SummaryRow key={category.id} label={category.name} onChange={() => onEdit(index)}>
            {names.join(", ")}
          </SummaryRow>
        );
      })}
      <SummaryRow label="Silhouette" onChange={() => onEdit(categories.length)}>
        {silhouetteId && <Silhouette silhouetteId={silhouetteId} size={40} />}
      </SummaryRow>
    </dl>
  );
}

function SummaryRow({
  label,
  onChange,
  children,
}: {
  label: string;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-current/15 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <dt className="font-semibold">{label}</dt>
        <button
          type="button"
          onClick={onChange}
          className="shrink-0 text-sm underline underline-offset-4"
          aria-label={`Change ${label}`}
        >
          Change
        </button>
      </div>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
