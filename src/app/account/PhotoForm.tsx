"use client";
// "Your photo" on /account: show it, upload or replace it, remove it
// (slice 7, #14, design decisions 2 and 4).
//
// A Client Component because choosing a file and sending it happens in the
// browser. It posts to /api/account/photo, the same way slice 5's Approve
// button posts to its route, and then asks Next.js to redraw the page.
//
// The browser checks the size and type first, only to give a quick message.
// The server checks the file's actual bytes again, and that's the check that
// counts.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorTextClasses, primaryButtonClasses, secondaryButtonClasses } from "@/components/formStyles";

// Same limit and types as src/lib/account/photoRules.ts. Repeated here
// because this file runs in the browser, which can't import server code.
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type PhotoFormProps = {
  userId: string;
  // Changes whenever the photo changes, so the browser fetches the new one.
  // Null means no photo.
  photoVersion: string | null;
};

type PhotoState =
  | { step: "ready" }
  | { step: "sending" }
  | { step: "problem"; message: string };

export function PhotoForm({ userId, photoVersion }: PhotoFormProps) {
  const router = useRouter();
  const [state, setState] = useState<PhotoState>({ step: "ready" });
  const busy = state.step === "sending";

  async function upload(file: File) {
    // Quick checks, so nobody waits for a 10 MB upload to be refused.
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setState({ step: "problem", message: "Choose a JPEG, PNG or WebP photo." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({
        step: "problem",
        message: "That photo is bigger than 4 MB. Choose a smaller one, or a screenshot of it.",
      });
      return;
    }

    const body = new FormData();
    body.append("photo", file);
    await send("POST", body);
  }

  async function send(method: "POST" | "DELETE", body?: FormData) {
    setState({ step: "sending" });
    try {
      const response = await fetch("/api/account/photo", { method, body });
      const answer: { message?: string } = await response.json();
      if (!response.ok) {
        setState({
          step: "problem",
          message: answer.message ?? "Something went wrong. Please try again.",
        });
        return;
      }
      setState({ step: "ready" });
      // Redraw the page on the server, so it shows the new photo (or none).
      router.refresh();
    } catch {
      setState({ step: "problem", message: "Something went wrong. Please try again." });
    }
  }

  return (
    <div className="mt-3">
      {photoVersion ? (
        // A plain <img>, not Next.js's <Image>: <Image> would copy the photo
        // into a shared cache, and photos must stay private (design
        // decision 8). The ?v= makes the browser load a replaced photo.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/account/photo/${userId}?v=${photoVersion}`}
          alt="Your photo"
          className="h-32 w-32 rounded-card border border-line object-cover"
          data-testid="own-photo"
        />
      ) : (
        <p className="text-sm text-muted">
          No photo yet. It&apos;s optional, and only people you connect with can see it.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className={`inline-flex cursor-pointer items-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary-text ${primaryButtonClasses}`}>
          {photoVersion ? "Replace photo" : "Add a photo"}
          <input
            type="file"
            name="photo"
            accept={ACCEPTED_TYPES.join(",")}
            disabled={busy}
            // Visually hidden: the label above is the button people tap.
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Clear it, so choosing the same file again still triggers this.
              event.target.value = "";
              if (file) {
                void upload(file);
              }
            }}
          />
        </label>

        {photoVersion && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void send("DELETE")}
            className={secondaryButtonClasses}
          >
            Remove photo
          </button>
        )}
      </div>

      <p className="mt-2 text-sm text-muted">
        JPEG, PNG or WebP, up to 4 MB.
      </p>
      {state.step === "sending" && (
        <p role="status" className="mt-2 text-sm text-muted">
          Saving…
        </p>
      )}
      {state.step === "problem" && (
        <p role="alert" className={`mt-2 ${errorTextClasses}`} data-testid="photo-problem">
          {state.message}
        </p>
      )}
    </div>
  );
}
