"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import AvatarCanvas from "@/components/AvatarCanvas";
import AvatarControls from "@/components/AvatarControls";
import { coerceAll, defaults, renderValues } from "@/lib/params/coerce";
import type { ParamValues } from "@/lib/params/coerce";
import type { Parameter, ParameterValue } from "@/lib/params/types";
import {
  ensureParticipant,
  spokeClient,
} from "@/lib/spoke/browser-client";
import {
  avatarName,
  myAvatars,
  normalizeAvatar,
  saveAvatar,
  splitValues,
  type Avatar,
} from "@/lib/spoke/avatars";
import { myEmail, normalizeEmail, saveEmail } from "@/lib/spoke/contacts";
import { myRuns, type MyRuns } from "@/lib/spoke/results";
import { formatScore, summarizeAvatar } from "@/lib/board";
import {
  emailLabel,
  isPlausibleEmail,
  MAX_EMAIL_LENGTH,
  type EmailQuestion,
} from "@/lib/projects/participant-details";
import {
  FONTS,
  themeCssVars,
  themeScheme,
  type ProjectLexicon,
  type ProjectTheme,
} from "@/lib/theme/project-theme";
import { fillCopy, type ProjectCopy } from "@/lib/theme/project-copy";
import { NavLink, type Nav } from "./nav";

export type Step =
  | "intro"
  | "questions"
  | "tune"
  | "done"
  | "list"
  // Pages of their own (`/results`, `/conclusion`). Steps only in the
  // preview, which shows them in place rather than leaving its frame.
  | "results"
  | "conclusion";

/** Made-up avatars and runs, for the preview's list and results screens. */
export type ExperienceSample = {
  avatars: { id: string; name: string }[];
  runs: MyRuns;
};

/**
 * Scores land once a run, minutes apart, and are not in the realtime
 * publication — the board's ten-second poll, and only while the list is on
 * screen.
 */
const RUNS_POLL_MS = 10_000;

/**
 * The participant runtime — `PlanetEditor` and the CCN star list generalized.
 *
 * The flow it inherits: answer, then tune, then done, with the canvas mounted
 * once and never unmounted between steps, so the avatar comes into being rather
 * than appearing. What changes is that every question and every control now
 * comes from the project's declaration instead of from six hardcoded sliders.
 *
 * A participant may make as many avatars as they like. Once they have one,
 * their list is home: tap one to tune it, make another, or go to their results
 * or the conclusion — each a page of its own.
 */
export default function ParticipantExperience({
  slug,
  projectName,
  theme,
  lexicon,
  supabaseUrl,
  publishableKey,
  code,
  scriptVersion,
  parameters,
  copy,
  conclusionOpen,
  email = null,
  preview = false,
  sample,
  step: stepProp,
  onStepChange,
}: {
  slug: string;
  projectName: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  supabaseUrl: string;
  publishableKey: string;
  code: string;
  scriptVersion: number;
  parameters: Parameter[];
  copy: ProjectCopy;
  /** Whether the conclusion is published, and so linked from the list. */
  conclusionOpen: boolean;
  /**
   * The email question, when the project asks one and the tenant's database
   * can store the answer. Kept out of `values` entirely: an address is about
   * the person, so it must never reach `answers`, `{name}` or the sketch.
   */
  email?: EmailQuestion | null;
  /**
   * The participant-frontend preview: the same page, with no anonymous sign-in
   * and a save that writes nothing, so a tenant can walk through it without
   * leaving participants — or rows — behind in their Supabase.
   */
  preview?: boolean;
  /**
   * Made-up avatars and runs for the preview's list and results screens. Only
   * ever shown there: the questions and tuning screens stay a first visit's.
   */
  sample?: ExperienceSample;
  /** Controlled step, for the preview's screen tabs. */
  step?: Step;
  onStepChange?: (step: Step) => void;
}) {
  const questions = useMemo(
    () => parameters.filter((p) => p.type === "text"),
    [parameters],
  );

  const [values, setValues] = useState<ParamValues>(() =>
    coerceAll(parameters, defaults(parameters)),
  );
  const hasQuestions = questions.length > 0 || !!email;
  const asksEmail = !!email;
  const firstStep: Step = hasQuestions ? "questions" : "tune";
  // Returning participants skip the welcome: the effect below moves them
  // straight to their list once their avatars are found.
  const [ownStep, setOwnStep] = useState<Step>(
    copy.introEnabled ? "intro" : firstStep,
  );
  const step = stepProp ?? ownStep;
  function setStep(next: Step) {
    setOwnStep(next);
    onStepChange?.(next);
  }
  // Theirs, oldest first. Empty in the preview, which lists `sample` instead.
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  // The one being tuned; null while a new one is being made.
  const [avatarId, setAvatarId] = useState<string | null>(null);
  // The name as stored, so a blank answer can keep an anonymous name it was
  // already given rather than drawing a new one on every save.
  const storedName = avatars.find((a) => a.id === avatarId)?.name ?? null;
  const [runs, setRuns] = useState<MyRuns | null>(null);
  const [status, setStatus] = useState<"starting" | "ready" | "error">(
    preview ? "ready" : "starting",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const clientRef = useRef<SupabaseClient | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Sign in anonymously, then find the avatars this identity already made — so
  // returning to the experience lands on them rather than starting again.
  useEffect(() => {
    if (preview) return;
    let cancelled = false;

    async function start() {
      const client = spokeClient(supabaseUrl, publishableKey);
      clientRef.current = client;

      const session = await ensureParticipant(client);
      if (cancelled) return;
      if ("error" in session) {
        setError(session.error);
        setStatus("error");
        return;
      }
      userIdRef.current = session.userId;

      try {
        const mine = await myAvatars(client, session.userId, parameters);
        if (cancelled) return;
        setAvatars(mine);
        if (mine.length > 0) setStep("list");
      } catch {
        // A read failure is not fatal — they can still make a new one.
      }
      if (asksEmail) {
        try {
          const stored = await myEmail(client, session.userId);
          if (!cancelled && stored) setEmailValue(stored);
        } catch {
          // Nor is this: they can type it again.
        }
      }
      if (!cancelled) setStatus("ready");
    }

    void start();
    return () => {
      cancelled = true;
    };
    // `setStep` is recreated each render but only ever sets state and reports.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, supabaseUrl, publishableKey, parameters, asksEmail]);

  const sketchParams = useMemo(
    () => renderValues(parameters, values),
    [parameters, values],
  );

  function set(name: string, value: ParameterValue) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  // The list reads runs for each avatar's best.
  const showsRuns = step === "list";
  // Screens about all of theirs at once, where no one avatar is on show.
  const offCanvas = showsRuns || step === "results" || step === "conclusion";
  // Results and the conclusion are pages; the preview steps to them instead.
  const nav: Nav = preview
    ? { onNavigate: (to) => setStep(to === "home" ? "list" : to) }
    : { slug };
  const avatarIdsKey = avatars.map((a) => a.id).join(",");
  useEffect(() => {
    const client = clientRef.current;
    if (preview || !showsRuns || !client) return;
    let cancelled = false;
    const ids = avatarIdsKey ? avatarIdsKey.split(",") : [];

    const load = async () => {
      try {
        const next = await myRuns(client, ids);
        if (cancelled) return;
        setRuns(next);
      } catch (e) {
        // Keep showing the last good runs; the list's summaries simply wait
        // for the next poll. The message is for whoever is debugging.
        console.warn("[spoke] results read failed:", e);
      }
    };

    void load();
    const poll = setInterval(load, RUNS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [preview, showsRuns, avatarIdsKey]);

  const sampleAvatars = useMemo(
    () => sample?.avatars.map((a) => normalizeAvatar(a, parameters)) ?? [],
    [sample, parameters],
  );
  const listed = preview ? sampleAvatars : avatars;
  const shownRuns = preview ? (sample?.runs ?? null) : runs;
  // An avatar saved with a blank name, or one no longer in the list.
  const unnamed = `unnamed ${lexicon.noun}`;

  /** From the list: tune one they already have. */
  function openAvatar(avatar: Avatar) {
    setAvatarId(avatar.id);
    setValues(coerceAll(parameters, { ...avatar.params, ...avatar.answers }));
    setError(null);
    setStep("tune");
  }

  /**
   * Another avatar, same person: the declaration's defaults again, but the
   * email address stays — it belongs to them, not to any one avatar.
   */
  function newAvatar() {
    setAvatarId(null);
    setValues(coerceAll(parameters, defaults(parameters)));
    setError(null);
    setStep(firstStep);
  }

  // Back walks the flow in reverse — tune, questions, list — skipping any step
  // this project or visit doesn't have. A first visit has no list to return to.
  const tuneBack: Step | null = hasQuestions
    ? "questions"
    : avatars.length > 0
      ? "list"
      : null;

  /**
   * Whether the email field would pass the questions form. A returning
   * participant skips that form, so a project that started requiring an address
   * after they first saved would otherwise never ask them for it.
   */
  function emailSettled(): boolean {
    if (!email) return true;
    const typed = normalizeEmail(emailValue);
    return typed ? isPlausibleEmail(typed) : !email.required;
  }

  async function save() {
    if (!emailSettled()) {
      // Back to the field, where the browser's own validation explains it.
      setStep("questions");
      return;
    }
    if (preview) {
      // Walk on as if it saved; the id only switches the button to "save
      // changes", exactly as a real first save would.
      setAvatarId("preview");
      setStep("done");
      return;
    }
    const client = clientRef.current;
    if (!client) return;
    setSaving(true);
    setError(null);
    try {
      const { answers, params } = splitValues(parameters, values);
      const name = avatarName(
        questions[0] ? String(values[questions[0].name] ?? "") : "",
        storedName,
        lexicon.noun,
      );
      const saved = await saveAvatar(
        client,
        avatarId,
        { name, answers, params },
        parameters,
      );
      setAvatarId(saved.id);
      setAvatars((prev) =>
        prev.some((a) => a.id === saved.id)
          ? prev.map((a) => (a.id === saved.id ? saved : a))
          : [...prev, saved],
      );

      if (email && userIdRef.current) {
        try {
          await saveEmail(client, userIdRef.current, emailValue);
        } catch {
          // The avatar is safe; only the address needs another go, and saving
          // again retries exactly that.
          setError(
            `Your ${lexicon.noun} is saved, but your email address couldn’t be. Try saving once more.`,
          );
          return;
        }
      }
      setStep("done");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Try once more.",
      );
    } finally {
      setSaving(false);
    }
  }

  const nameValue = questions[0] ? String(values[questions[0].name] ?? "") : "";
  // Plain text in, plain text out: React escapes it, so tenant wording can
  // never become markup on this page.
  const t = (key: Exclude<keyof ProjectCopy, "introEnabled">) =>
    fillCopy(copy[key], {
      noun: lexicon.noun,
      nounPlural: lexicon.nounPlural,
      name: nameValue.trim(),
      project: projectName,
    });

  const style = {
    ...themeCssVars(theme),
    backgroundColor: theme.void,
    color: theme.paper,
    fontFamily: FONTS[theme.font].stack,
  } as React.CSSProperties;

  return (
    // Side by side from tablet width up: the avatar fills the left, the
    // controls sit in a column on the right, so tuning never scrolls the
    // avatar out of view. Stacked on a phone, where there is no room for both.
    <main
      data-theme={themeScheme(theme)}
      style={style}
      className="flex min-h-screen flex-col md:h-screen md:flex-row md:overflow-hidden"
    >
      {/* Mounted once for the life of the page. Re-mounting between steps would
          restart the sketch, and the avatar would blink rather than persist. */}
      <div className="relative h-[45vh] w-full shrink-0 md:h-full md:w-auto md:flex-1">
        <AvatarCanvas
          key={scriptVersion}
          code={code}
          params={sketchParams}
          /* Held at 0 until the participant's own values have arrived, so the
             avatar fades in as *theirs*. Rendering the declaration's defaults
             at full strength would show a stranger's avatar and then swap it.
             Back to 0 on the list, which is about all of theirs: the names
             carry that screen, and the one tapped next fades in. */
          host={{ intensity: status === "ready" && !offCanvas ? 1 : 0 }}
          className="h-full w-full"
        />
        {status === "starting" && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-6">
            <p className="text-xs" style={{ color: theme.dim }}>
              {t("loading")}
            </p>
          </div>
        )}
      </div>

      <div className="flex w-full flex-1 flex-col md:h-full md:w-[28rem] md:flex-none md:overflow-y-auto md:border-l md:border-dim/20">
        {/* `my-auto` centres short steps (welcome, questions) and falls back to
            the top when the controls overflow, so nothing is ever clipped. */}
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-6 md:my-auto">
        {status === "error" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm">This experience can’t start right now.</p>
            <p className="text-xs" style={{ color: theme.dim }}>
              {error}
            </p>
          </div>
        )}

        {status === "ready" && step === "intro" && (
          <div className="flex flex-col gap-4">
            <h1 className="text-sm">{t("introTitle")}</h1>
            <p
              className="whitespace-pre-line text-xs leading-relaxed"
              style={{ color: theme.dim }}
            >
              {t("introBody")}
            </p>
            <button
              type="button"
              onClick={() => setStep(firstStep)}
              className="self-start text-sm underline underline-offset-4"
              autoFocus
            >
              {t("introButton")}
            </button>
          </div>
        )}

        {status === "ready" && step === "questions" && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("tune");
            }}
          >
            {questions.map((q) => (
              <label key={q.name} className="flex flex-col gap-2">
                <span className="text-sm">{q.label}</span>
                <input
                  className="term-input border-b"
                  style={{ borderColor: `${theme.dim}55` }}
                  value={String(values[q.name] ?? "")}
                  placeholder={
                    q.type === "text" ? (q.placeholder ?? "") : undefined
                  }
                  maxLength={q.type === "text" ? q.maxLength : undefined}
                  onChange={(e) => set(q.name, e.target.value)}
                  autoFocus={q === questions[0]}
                />
              </label>
            ))}
            {email && (
              <label className="flex flex-col gap-2">
                <span className="text-sm">
                  {emailLabel(email, t("optionalMarker"))}
                </span>
                {/* `type="email"` and `required` make the browser hold the
                    form until the address is plausible — no message of ours
                    to translate, and the right keyboard on a phone. */}
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  className="term-input border-b"
                  style={{ borderColor: `${theme.dim}55` }}
                  value={emailValue}
                  placeholder={email.placeholder}
                  maxLength={MAX_EMAIL_LENGTH}
                  required={email.required}
                  onChange={(e) => setEmailValue(e.target.value)}
                  autoFocus={questions.length === 0}
                />
                <span className="text-xs leading-relaxed" style={{ color: theme.dim }}>
                  {email.purpose}
                </span>
              </label>
            )}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                className="text-sm underline underline-offset-4"
              >
                {t("nextButton")}
              </button>
              {avatars.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStep("list")}
                  className="text-xs underline-offset-4 hover:underline"
                  style={{ color: theme.dim }}
                >
                  {t("backButton")}
                </button>
              )}
            </div>
          </form>
        )}

        {status === "ready" && step === "tune" && (
          <>
            <AvatarControls
              parameters={parameters}
              values={values}
              onChange={set}
            />
            {error && (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            )}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="text-sm underline underline-offset-4 disabled:no-underline"
                style={saving ? { color: theme.dim } : undefined}
              >
                {saving ? "saving…" : avatarId ? t("saveChangesButton") : t("saveButton")}
              </button>
              {tuneBack && (
                <button
                  type="button"
                  onClick={() => setStep(tuneBack)}
                  className="text-xs underline-offset-4 hover:underline"
                  style={{ color: theme.dim }}
                >
                  {t("backButton")}
                </button>
              )}
            </div>
          </>
        )}

        {status === "ready" && step === "done" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">{t("savedTitle")}</p>
            <p
              className="whitespace-pre-line text-xs leading-relaxed"
              style={{ color: theme.dim }}
            >
              {t("savedBody")}
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setStep("tune")}
                className="text-sm underline underline-offset-4"
              >
                {t("keepTuningButton")}
              </button>
              <button
                type="button"
                onClick={() => setStep("list")}
                className="text-sm underline underline-offset-4"
              >
                {t("listButton")}
              </button>
            </div>
          </div>
        )}

        {status === "ready" && step === "list" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-sm">{t("listTitle")}</h1>
              <p
                className="whitespace-pre-line text-xs leading-relaxed"
                style={{ color: theme.dim }}
              >
                {t("listBody")}
              </p>
            </div>
            <div>
              <ul>
                {listed.map((avatar) => {
                  const { runs: count, best } = summarizeAvatar(
                    shownRuns?.scores ?? [],
                    avatar.id,
                  );
                  return (
                    <li key={avatar.id}>
                      <div aria-hidden className="term-rule text-dim/40" />
                      <button
                        type="button"
                        onClick={() => openAvatar(avatar)}
                        className="flex w-full items-baseline gap-4 py-4 text-left transition-opacity hover:opacity-80"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {avatar.name || unnamed}
                        </span>
                        {/* Blank until runs have loaded, rather than claiming none. */}
                        <span
                          className="shrink-0 text-xs tabular-nums"
                          style={{ color: theme.dim }}
                        >
                          {shownRuns === null
                            ? ""
                            : best === null
                              ? "no runs yet"
                              : `best ${formatScore(best)} · ${count} ${count === 1 ? "run" : "runs"}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div aria-hidden className="term-rule text-dim/40" />
            </div>
            {/* Results and the conclusion first: everyone should find their
                way to them. Making another is the quieter choice under them. */}
            <div className="flex flex-col items-start gap-3">
              <NavLink nav={nav} to="results" className="text-sm underline underline-offset-4">
                {t("resultsButton")}
              </NavLink>
              {conclusionOpen && (
                <NavLink nav={nav} to="conclusion" className="text-sm underline underline-offset-4">
                  {t("conclusionButton")}
                </NavLink>
              )}
              <button
                type="button"
                onClick={newAvatar}
                className="text-sm underline-offset-4 hover:underline"
                style={{ color: theme.dim }}
              >
                {t("newButton")}
              </button>
            </div>
          </div>
        )}

        </div>
      </div>
    </main>
  );
}
