// A read-only tag, such as a skill or an interest on a profile (slice 10,
// #45, design decision 8).
//
//   <TagChip>Back-end</TagChip>
//
// For tags you can CHOOSE, use OptionCard instead.

import type { ReactNode } from "react";

export function TagChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-8 items-center rounded-full border border-line bg-surface-2 px-3 text-sm text-foreground">
      {children}
    </span>
  );
}
