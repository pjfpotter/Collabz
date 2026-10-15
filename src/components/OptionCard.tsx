// A choice from a list: a title with an optional one-line description
// (slice 10, #45, design decision 8). Used wherever someone picks tags.
//
//   <OptionCard
//     type="checkbox" name="qualities" value="quality-finisher"
//     title="Actually finishes the thing"
//     description="Ships it, even when it's broken."
//   />
//
// HOW IT WORKS: a real <input> (checkbox or radio) sits inside the label and
// is hidden with sr-only, so it stays focusable and a keyboard or screen
// reader uses it as normal. The card beside it is styled from the input's
// state with Tailwind's `peer` classes, so there is no JavaScript here and
// it works in a Server Component and in a plain form.
//
// The four states from the design:
//   default        a plain bordered card
//   selected       primary border and glow, plus a tick (so it isn't colour alone)
//   disabled       faded; used when the pick limit is reached
//   keyboard focus a visible outline (peer-focus-visible)

type OptionCardProps = {
  type: "checkbox" | "radio";
  name: string;
  value: string;
  title: string;
  description?: string;
  // Starts ticked. The form owns the state after that.
  defaultChecked?: boolean;
  // True when the limit is reached and this one can't be added.
  disabled?: boolean;
  // Why it's disabled, in the page's own words, e.g. "Limit reached. Let one
  // go first." Only shown when disabled.
  disabledNote?: string;
};

export function OptionCard({
  type,
  name,
  value,
  title,
  description,
  defaultChecked,
  disabled,
  disabledNote,
}: OptionCardProps) {
  return (
    <label className={disabled ? "block cursor-not-allowed" : "block cursor-pointer"}>
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        className={
          // Layout and the default look.
          "flex min-h-11 items-start gap-3 rounded-feature border border-line-strong bg-surface p-4 " +
          // Selected: peer-checked reacts to the hidden input being ticked.
          // The last class reaches INTO the card to show the tick, because
          // the tick is inside this span, not beside the input.
          "peer-checked:border-primary-text peer-checked:shadow-glow peer-checked:[&_[data-tick]]:flex " +
          // Keyboard focus ring.
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-text " +
          // Disabled (limit reached).
          "peer-disabled:opacity-60"
        }
      >
        {/* The tick: only visible when selected, so the selected state is
            never shown by colour alone. */}
        <span
          aria-hidden="true"
          data-tick=""
          className="mt-0.5 hidden h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary"
        >
          ✓
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-foreground">{title}</span>
          {description && <span className="block text-sm text-muted">{description}</span>}
          {disabled && disabledNote && (
            <span className="mt-1 block text-sm text-muted">{disabledNote}</span>
          )}
        </span>
      </span>
    </label>
  );
}
