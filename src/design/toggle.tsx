import { choiceClass } from "./button";
import { cx, type Size } from "./tokens";

/**
 * The toggle — the word `on` or `off`, underlined when on.
 *
 * Not a sliding pill. There is no sliding pill anywhere in this interface, and
 * adding one would be the first rounded, animated thing on the page. A
 * `role="switch"` button carries the same semantics to assistive tech as any
 * fancier control would, and the participant controls already render exactly
 * this.
 *
 * `on` / `off` are ours rather than the tenant's — interface words, not content,
 * per `docs/participant-styling.md`. `labels` exists for the day they become
 * copy fields, not for restyling.
 */

export type SwitchProps = {
  /** Names the switch for assistive tech when no visible label sits beside it. */
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  size?: Size;
  labels?: { on: string; off: string };
  /**
   * Posts the state in a plain form submission, for a switch that lives inside
   * a server-action form. The switch itself stays controlled — this only mirrors
   * its value into something `FormData` can see.
   */
  name?: string;
  /** What `name` posts. Defaults match the string booleans the actions parse. */
  onValue?: string;
  offValue?: string;
  className?: string;
};

export function Switch({
  label,
  checked,
  onChange,
  disabled = false,
  size = "sm",
  labels = { on: "on", off: "off" },
  name,
  onValue = "true",
  offValue = "false",
  className,
}: SwitchProps) {
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          choiceClass(checked, false, size),
          disabled && "cursor-not-allowed",
          className,
        )}
      >
        {checked ? labels.on : labels.off}
      </button>
      {name && (
        <input type="hidden" name={name} value={checked ? onValue : offValue} />
      )}
    </>
  );
}

/**
 * `label : on` — the switch with its name in front, the shape the participant
 * control rows use. Kept separate from `Switch` so a switch sitting in a table
 * cell or beside a sentence does not inherit a layout it does not want.
 */
export type SwitchRowProps = SwitchProps & {
  /** Shown. `label` is still what assistive tech reads. */
  text?: string;
};

export function SwitchRow({ text, className, ...rest }: SwitchRowProps) {
  return (
    <div className={cx("flex items-center gap-2 py-1.5", className)}>
      <span className="shrink-0 text-sm text-dim">{text ?? rest.label}</span>
      <span className="shrink-0 text-sm text-dim">:</span>
      <Switch {...rest} />
    </div>
  );
}
