"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AvatarCanvas from "@/components/AvatarCanvas";
import { MAX_STRATEGY_LENGTH } from "@/lib/board";
import { renderValues } from "@/lib/params/coerce";
import {
  hueDegrees,
  isNumeric,
  type NumericParameter,
  type Parameter,
} from "@/lib/params/types";
import { normalizeAvatar, type Avatar } from "@/lib/spoke/avatars";
import type { ProjectLexicon } from "@/lib/theme/project-theme";
import {
  deleteScoreAction,
  stageAction,
  unstageAllAction,
  updateScoreAction,
} from "./actions";

const MAX_STAGED = 2;
const SCORE_POLL_MS = 10_000;

type Score = {
  id: string;
  yq_session_id: string;
  avatar_a_id: string;
  avatar_b_id: string;
  score: number;
  duration: number | null;
  strategy: string | null;
  recorded_at: string;
};

/**
 * A cheap stand-in for a live sketch, built from the declaration's own hue
 * parameters. One iframe per row is out of the question — browsers cap WebGL
 * contexts at around sixteen — so rows get a gradient and the selected avatar
 * gets the real thing in the preview.
 */
function Swatch({
  avatar,
  hues,
  noun,
}: {
  avatar: Avatar;
  hues: NumericParameter[];
  noun: string;
}) {
  if (hues.length === 0) {
    return (
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-paper/20 text-[10px] text-dim"
      >
        {(avatar.name || noun).slice(0, 1).toUpperCase()}
      </span>
    );
  }
  const stops = hues.slice(0, 2).map((p) => {
    const deg = hueDegrees(p, Number(avatar.params[p.name] ?? p.default));
    return `hsl(${deg.toFixed(0)} 80% 60%)`;
  });
  const [inner, outer = inner] = stops;
  return (
    <span
      aria-hidden
      className="h-8 w-8 shrink-0 rounded-full"
      style={{ background: `radial-gradient(circle, ${inner} 0%, ${outer} 70%, transparent 72%)` }}
    />
  );
}

function ago(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * One session the scene recorded. Collaborators can click it open to type in
 * the pair's strategy — the reason the editor leads with that field — or to
 * correct the numbers; deleting asks once more, with "keep it" focused so a
 * stray Enter cannot finish the job.
 */
function ScoreRow({
  score: s,
  names,
  slug,
  canOperate,
  onSaved,
  onDeleted,
}: {
  score: Score;
  names: string;
  slug: string;
  canOperate: boolean;
  onSaved: (next: Score) => void;
  onDeleted: (id: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const strategyRef = useRef<HTMLTextAreaElement>(null);

  // Caret at the end, so adding to what is there is one keystroke away.
  useEffect(() => {
    const el = strategyRef.current;
    if (mode !== "edit" || !el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [mode]);

  function show(next: typeof mode) {
    setError(null);
    setMode(next);
  }

  function save(form: HTMLFormElement) {
    const data = new FormData(form);
    data.set("slug", slug);
    data.set("id", s.id);
    startTransition(async () => {
      const result = await updateScoreAction(data);
      if (result.error || !result.saved) {
        setError(result.error ?? "Nothing was saved.");
        return;
      }
      onSaved({ ...s, ...result.saved });
      setMode("view");
    });
  }

  function remove() {
    const data = new FormData();
    data.set("slug", slug);
    data.set("id", s.id);
    startTransition(async () => {
      const result = await deleteScoreAction(data);
      if (result.error) setError(result.error);
      else onDeleted(s.id);
    });
  }

  const meta = (
    <>
      {Number(s.score).toFixed(1)}
      {s.duration != null && ` · ${Number(s.duration).toFixed(1)}s`}
      {" · "}
      {ago(s.recorded_at)}
    </>
  );

  if (mode === "confirm") {
    return (
      <li className="flex flex-col gap-2 border-b border-paper/10 bg-paper/5 px-2 py-2">
        <p>
          Delete {names} · {Number(s.score).toFixed(1)}? It comes off the board,
          and cannot be undone.
        </p>
        {error && (
          <p role="alert" className="text-amber-400/90">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            autoFocus
            disabled={pending}
            onClick={() => show("view")}
            className="text-dim underline-offset-4 hover:text-paper hover:underline"
          >
            keep it
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="text-amber-400 underline-offset-4 hover:underline disabled:opacity-50"
          >
            {pending ? "deleting…" : "delete for good"}
          </button>
        </div>
      </li>
    );
  }

  if (mode === "edit") {
    return (
      <li className="border-b border-paper/10 bg-paper/5 px-2 py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(e.currentTarget);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !pending) show("view");
          }}
          className="flex flex-col gap-3"
        >
          <p className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">{names}</span>
            <span className="shrink-0 text-dim">{ago(s.recorded_at)}</span>
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-dim">strategy</span>
            <textarea
              ref={strategyRef}
              name="strategy"
              rows={3}
              maxLength={MAX_STRATEGY_LENGTH}
              defaultValue={s.strategy ?? ""}
              placeholder="What the pair say they tried, in their words."
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              className="term-input resize-y border-b border-paper/20 text-sm leading-relaxed"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-dim">score</span>
              <input
                name="score"
                type="number"
                step="any"
                required
                defaultValue={s.score}
                className="term-input border-b border-paper/20"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-dim">duration · seconds</span>
              <input
                name="duration"
                type="number"
                step="any"
                min={0}
                defaultValue={s.duration ?? ""}
                className="term-input border-b border-paper/20"
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="text-amber-400/90">
              {error}
            </p>
          )}
          <div className="flex items-baseline justify-between gap-4">
            <button
              type="button"
              disabled={pending}
              onClick={() => show("confirm")}
              className="text-dim underline-offset-4 hover:text-amber-400 hover:underline"
            >
              delete…
            </button>
            <div className="flex gap-4">
              <button
                type="button"
                disabled={pending}
                onClick={() => show("view")}
                className="text-dim underline-offset-4 hover:text-paper hover:underline"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="underline-offset-4 hover:underline disabled:opacity-50"
              >
                {pending ? "saving…" : "save"}
              </button>
            </div>
          </div>
        </form>
      </li>
    );
  }

  const summary = (
    <>
      <span className="block truncate">{names}</span>
      {s.strategy ? (
        <span className="mt-0.5 line-clamp-3 text-dim">{s.strategy}</span>
      ) : (
        canOperate && <span className="mt-0.5 block text-dim/60">no strategy yet</span>
      )}
    </>
  );

  return (
    <li className="group flex items-start gap-3 border-b border-paper/10 py-1.5">
      {canOperate ? (
        <button
          type="button"
          onClick={() => show("edit")}
          title="Edit this session"
          className="min-w-0 flex-1 text-left"
        >
          {summary}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{summary}</div>
      )}
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-dim">{meta}</span>
        {canOperate && (
          // Revealed on hover or keyboard focus; a click on the row itself
          // opens the editor, which has its own way to delete.
          <span className="flex gap-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => show("edit")}
              className="text-dim underline-offset-4 hover:text-paper hover:underline"
            >
              edit
            </button>
            <button
              type="button"
              onClick={() => show("confirm")}
              className="text-dim underline-offset-4 hover:text-amber-400 hover:underline"
            >
              delete
            </button>
          </span>
        )}
      </div>
    </li>
  );
}

export default function OpsConsole({
  slug,
  projectUrl,
  publishableKey,
  parameters,
  code,
  scriptVersion,
  lexicon,
  canOperate,
}: {
  slug: string;
  projectUrl: string;
  publishableKey: string;
  parameters: Parameter[];
  code: string | null;
  scriptVersion: number | null;
  lexicon: ProjectLexicon;
  canOperate: boolean;
}) {
  const [avatars, setAvatars] = useState<Map<string, Avatar>>(new Map());
  const [scores, setScores] = useState<Score[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const clientRef = useRef<SupabaseClient | null>(null);

  const hues = useMemo(
    () =>
      parameters.filter(
        (p): p is NumericParameter => isNumeric(p) && p.display === "hue",
      ),
    [parameters],
  );

  useEffect(() => {
    // Its own client, with no persisted session: an operator watching the room
    // must not take out an anonymous participant identity by doing so. Reads
    // and Realtime work on the publishable key alone, because provisioning made
    // both tables readable to it.
    const client = createClient(projectUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    clientRef.current = client;
    let cancelled = false;

    async function loadAvatars() {
      const { data, error } = await client
        .from("avatars")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setLive("offline");
        return;
      }
      setAvatars(
        new Map((data ?? []).map((row) => {
          const a = normalizeAvatar(row, parameters);
          return [a.id, a];
        })),
      );
    }

    async function loadScores() {
      const { data } = await client
        .from("session_scores")
        .select("id,yq_session_id,avatar_a_id,avatar_b_id,score,duration,strategy,recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(50);
      if (!cancelled && data) setScores(data as Score[]);
    }

    void loadAvatars();
    void loadScores();

    // Avatars change constantly during an event and are in the realtime
    // publication; scores arrive once a run, minutes apart, and are not — a
    // ten-second poll is plenty and needs no schema change.
    const channel = client
      .channel(`ops-${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "avatars" },
        (payload) => {
          setAvatars((prev) => {
            const next = new Map(prev);
            if (payload.eventType === "DELETE") {
              const id = (payload.old as { id?: string }).id;
              if (id) next.delete(id);
            } else {
              const a = normalizeAvatar(payload.new, parameters);
              next.set(a.id, a);
            }
            return next;
          });
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") setLive("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setLive("offline");
      });

    const poll = setInterval(loadScores, SCORE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
      void client.removeChannel(channel);
    };
  }, [projectUrl, publishableKey, parameters, slug]);

  const list = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return [...avatars.values()]
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [avatars, filter]);

  // Staged in the order the scene will read them: first staged, first shown.
  const staged = useMemo(
    () =>
      [...avatars.values()]
        .filter((a) => a.is_staged)
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at)),
    [avatars],
  );

  const current = selected ? avatars.get(selected) ?? null : null;
  const previewParams = useMemo(
    () => (current ? renderValues(parameters, current.params) : {}),
    [current, parameters],
  );
  const nameOf = (id: string) => avatars.get(id)?.name || "(unnamed)";

  function stage(avatar: Avatar, on: boolean) {
    setError(null);
    const form = new FormData();
    form.set("slug", slug);
    form.set("id", avatar.id);
    form.set("staged", on ? "true" : "false");
    startTransition(async () => {
      const result = await stageAction(form);
      if (result.error) setError(result.error);
    });
  }

  function clearStage() {
    setError(null);
    const form = new FormData();
    form.set("slug", slug);
    startTransition(async () => {
      const result = await unstageAllAction(form);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xs text-dim">
              on stage · {staged.length} of {MAX_STAGED}
            </h2>
            <span className="text-[11px] text-dim">
              <span
                className={
                  live === "live"
                    ? "text-emerald-400"
                    : live === "offline"
                      ? "text-red-400"
                      : ""
                }
              >
                ●
              </span>{" "}
              {live}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: MAX_STAGED }, (_, i) => {
              const a = staged[i];
              return (
                <div
                  key={i}
                  className="flex min-h-14 items-center gap-3 rounded border border-paper/15 p-3"
                >
                  {a ? (
                    <>
                      <Swatch avatar={a} hues={hues} noun={lexicon.noun} />
                      <button
                        type="button"
                        onClick={() => setSelected(a.id)}
                        className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
                      >
                        {a.name || "(unnamed)"}
                      </button>
                      {canOperate && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => stage(a, false)}
                          className="shrink-0 text-xs text-dim underline-offset-4 hover:text-paper hover:underline"
                        >
                          take off
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-dim">empty</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[11px] leading-relaxed text-dim">
              The scene reads these two and clears them itself when a run ends —
              so a pair can leave the stage without anyone here touching it.
            </p>
            {canOperate && staged.length > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={clearStage}
                className="shrink-0 text-xs text-dim underline-offset-4 hover:text-paper hover:underline"
              >
                clear stage
              </button>
            )}
          </div>

          {error && (
            <p role="alert" className="text-xs text-amber-400/90">
              {error}
            </p>
          )}
        </section>

        {/* Side by side from desktop width: who has made one, and what has
            happened since. */}
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xs text-dim">
                {lexicon.nounPlural} · {avatars.size}
              </h2>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="search by name"
                className="term-input w-40 border-b border-paper/20 text-xs"
              />
            </div>

            {list.length === 0 ? (
              <p className="text-xs text-dim">
                {avatars.size === 0
                  ? `No ${lexicon.nounPlural} yet. They appear here as participants save them.`
                  : "Nothing matches."}
              </p>
            ) : (
              <ul className="flex flex-col">
                {list.map((a) => {
                  const full = !a.is_staged && staged.length >= MAX_STAGED;
                  return (
                    <li
                      key={a.id}
                      className={`flex items-center gap-3 border-b border-paper/10 py-2 ${
                        selected === a.id ? "bg-paper/5" : ""
                      }`}
                    >
                      <Swatch avatar={a} hues={hues} noun={lexicon.noun} />
                      <button
                        type="button"
                        onClick={() => setSelected(a.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-sm">
                          {a.name || "(unnamed)"}
                          {a.is_staged && <span className="text-emerald-400"> · on stage</span>}
                        </span>
                        <span className="text-[11px] text-dim">
                          {ago(a.created_at)}
                          {a.updated_at !== a.created_at && ` · edited ${ago(a.updated_at)}`}
                        </span>
                      </button>
                      {canOperate && (
                        <button
                          type="button"
                          disabled={pending || full}
                          title={full ? "Two are already on stage" : undefined}
                          onClick={() => stage(a, !a.is_staged)}
                          className="shrink-0 text-xs text-dim underline-offset-4 hover:text-paper hover:underline disabled:opacity-30 disabled:no-underline"
                        >
                          {a.is_staged ? "take off" : "stage"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xs text-dim">latest scores</h2>
              {canOperate && scores.length > 0 && (
                <span className="text-[11px] text-dim">click one to add its strategy</span>
              )}
            </div>
            {scores.length === 0 ? (
              <p className="text-xs text-dim">
                None yet. The scene writes one when each run ends.
              </p>
            ) : (
              <ul className="flex flex-col text-xs">
                {scores.map((s) => (
                  <ScoreRow
                    key={s.id}
                    score={s}
                    names={`${nameOf(s.avatar_a_id)} × ${nameOf(s.avatar_b_id)}`}
                    slug={slug}
                    canOperate={canOperate}
                    onSaved={(next) =>
                      setScores((prev) => prev.map((x) => (x.id === next.id ? next : x)))
                    }
                    onDeleted={(id) => setScores((prev) => prev.filter((x) => x.id !== id))}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Pinned, so selecting someone far down the list still shows them. */}
      <aside className="flex w-full flex-col gap-6 lg:sticky lg:top-8 lg:w-[22rem] lg:shrink-0 lg:self-start">
        <section className="flex flex-col gap-2">
          <h2 className="text-xs text-dim">preview</h2>
          <div className="relative aspect-square w-full overflow-hidden rounded border border-paper/10 bg-void">
            {current && code ? (
              <AvatarCanvas
                key={`${scriptVersion}-${current.id}`}
                code={code}
                params={previewParams}
                className="h-full w-full"
              />
            ) : (
              <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-dim">
                Select a {lexicon.noun} to see it as the participant made it.
              </p>
            )}
          </div>
          {current && (
            <div className="flex flex-col gap-1 text-xs">
              <p className="text-sm">{current.name || "(unnamed)"}</p>
              {Object.entries(current.answers).map(([k, v]) => (
                <p key={k} className="text-dim">
                  {k}: {v || "—"}
                </p>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
