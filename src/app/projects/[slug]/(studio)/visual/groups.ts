import type { Parameter, ParameterType } from "@/lib/params/types";

/**
 * Where a participant meets each parameter, which is how the list is grouped.
 * Membership is derived, never stored: changing a parameter's type or ticking
 * "additional" moves its card to the group it now belongs to. Order inside a
 * group is declaration order, which is also the order on screen.
 */
export type Group = {
  key: string;
  title: string;
  blurb: string;
  holds: (p: Parameter) => boolean;
  /** What "add" offers here, and what a parameter added here starts with. */
  types: ParameterType[];
  patch?: Partial<Parameter>;
};

const CONTROL_TYPES: ParameterType[] = [
  "continuous",
  "discrete",
  "select",
  "multiselect",
  "toggle",
];

export const GROUPS: Group[] = [
  {
    key: "questions",
    title: "questions screen",
    blurb:
      "Asked before tuning. Stored as the participant's answers; the sketch never draws them.",
    holds: (p) => p.type === "text",
    types: ["text"],
  },
  {
    key: "main",
    title: "tune screen · main controls",
    blurb:
      "The controls that make the avatar theirs, shown first. Indented ones only work while the toggle they hang from is on.",
    holds: (p) => p.type !== "text" && !p.advanced,
    types: CONTROL_TYPES,
  },
  {
    key: "additional",
    title: "tune screen · additional parameters",
    blurb:
      "Below the main controls, under a folded “additional parameters” heading — for tuning how the avatar is staged.",
    holds: (p) => p.type !== "text" && !!p.advanced,
    types: CONTROL_TYPES,
    patch: { advanced: true },
  },
];
