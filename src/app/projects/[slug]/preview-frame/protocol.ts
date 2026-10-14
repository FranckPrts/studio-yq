/**
 * Messages between the participant-frontend editor and its preview iframe.
 * Same origin both ways; each side checks origin and source before reading.
 */

export type PreviewScreen =
  | "intro"
  | "questions"
  | "tune"
  | "done"
  | "list"
  | "results"
  | "conclusion"
  | "conclusionEmpty"
  | "conclusionPending"
  | "closed"
  | "notReady"
  | "board"
  | "boardEmpty";

/**
 * Editor → preview. Drafts are unsaved and unvalidated; the preview coerces.
 * `conclusion` is sent only by the conclusion's editor — absent, the preview
 * keeps the saved one. `played` picks whether the conclusion is read by
 * someone with scored runs or by a visitor with no avatar.
 */
export type ToPreview =
  | {
      type: "yq-preview:draft";
      theme: unknown;
      lexicon: unknown;
      copy: unknown;
      conclusion?: unknown;
    }
  | { type: "yq-preview:show"; screen: PreviewScreen }
  | { type: "yq-preview:reader"; played: boolean };

/** Preview → editor. */
export type FromPreview =
  | { type: "yq-preview:ready"; hasScript: boolean; hasQuestions: boolean }
  | { type: "yq-preview:screen"; screen: PreviewScreen };
