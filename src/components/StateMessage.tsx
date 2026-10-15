// The "nothing here / that didn't work" boxes (slice 10, #45, design
// decision 8): an empty list, an error, a missing page.
//
//   <StateMessage title="Nobody matches that mix">
//     Try fewer filters.
//   </StateMessage>
//
// The WORDS always come from the page, so each page keeps its own copy and
// this component only decides how it looks. tone="error" is announced to
// screen readers straight away (role="alert"); the others are quiet.
//
// `action` is an optional link or button shown under the words.

import type { ReactNode } from "react";

type StateMessageProps = {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: "empty" | "error";
};

export function StateMessage({ title, children, action, tone = "empty" }: StateMessageProps) {
  const isError = tone === "error";

  return (
    <section
      role={isError ? "alert" : undefined}
      className={
        "rounded-feature border bg-surface p-6 " +
        (isError ? "border-danger" : "border-line")
      }
    >
      <h2 className={"text-2xl " + (isError ? "text-danger" : "text-foreground")}>{title}</h2>
      {children && <div className="mt-2 text-base leading-6 text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}
