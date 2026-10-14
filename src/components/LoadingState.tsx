// What shows while a page's content is on its way (slice 10, #45, design
// decision 8): a few grey rounded shapes where the content will be. Shapes
// only, no spinner, as the design asks.
//
//   <LoadingState label="Loading your matches" />
//
// `label` is read out by a screen reader (role="status") and never shown.
// The pulse is switched off by the reduced-motion rule in globals.css, so
// someone who asked for less motion sees still shapes.

type LoadingStateProps = {
  label: string;
  // How many placeholder rows to draw.
  rows?: number;
};

export function LoadingState({ label, rows = 3 }: LoadingStateProps) {
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="h-20 animate-pulse rounded-feature bg-surface-2"
        />
      ))}
    </div>
  );
}
