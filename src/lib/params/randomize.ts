/**
 * A fresh, random starting point for every control a participant can turn —
 * the "randomize" button the tenant may switch on for the tune screen.
 *
 * Draws across what the participant can actually reach (the truncation, not
 * the domain), and each value goes back through `coerce`, so a randomized
 * avatar is always one the participant could have made by hand: on-step,
 * in range, and within a multiselect's min/max.
 *
 * Answers are left alone. A `text` value is something the participant wrote,
 * not a setting, and the button is about where the avatar starts.
 */

import { coerce, type ParamValues } from "./coerce";
import { effectiveRange, isNumeric, type Parameter } from "./types";

/** `Math.random` by default; injectable so a test can pin the draw. */
export type Rng = () => number;

function pick<T>(items: T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

function shuffled<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function randomizeValues(
  parameters: Parameter[],
  current: ParamValues,
  rng: Rng = Math.random,
): ParamValues {
  const out: ParamValues = { ...current };
  for (const param of parameters) {
    if (param.type === "text") continue;

    if (isNumeric(param)) {
      const { min, max } = effectiveRange(param);
      out[param.name] = coerce(param, min + rng() * (max - min));
    } else if (param.type === "toggle") {
      out[param.name] = rng() < 0.5;
    } else if (param.type === "select") {
      if (param.options.length) {
        out[param.name] = pick(param.options, rng).value;
      }
    } else {
      // multiselect: a count the declaration allows, then that many options.
      const values = param.options.map((o) => o.value);
      const low = Math.min(param.minSelected ?? 0, values.length);
      const high = Math.min(param.maxSelected ?? values.length, values.length);
      const count = low + Math.floor(rng() * (Math.max(high, low) - low + 1));
      out[param.name] = coerce(param, shuffled(values, rng).slice(0, count));
    }
  }
  return out;
}
