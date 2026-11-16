"use client";

import { useEffect, useState } from "react";
import { Button, FIELD } from "@/design";
import type { Person } from "@/lib/report/people";
import { FONTS, type ProjectTheme } from "@/lib/theme/project-theme";

/**
 * Saved pictures of the map, kept with a name and a note — so the map can be
 * photographed, the project's colours or mini-script changed, and photographed
 * again to compare. Each is exactly what the map showed when it was taken,
 * anyone ringed included.
 */

type Snapshot = {
  id: string;
  name: string;
  note: string;
  look: ProjectTheme;
  scriptKey: string;
  highlight: string | null;
  width: number;
  height: number;
  createdAt: string;
  url: string;
};

const apiUrl = (slug: string) => `/api/projects/${encodeURIComponent(slug)}/report/snapshots`;

const sameLook = (a: ProjectTheme, b: ProjectTheme) =>
  a.void === b.void && a.paper === b.paper && a.dim === b.dim && a.font === b.font;

const fontLabel = (font: ProjectTheme["font"]) => FONTS[font]?.label ?? font;

/** "mini:3" → "mini-script v3", "main:4" → "main script v4". */
function scriptLabel(key: string) {
  const [source, version] = key.split(":");
  return `${source === "mini" ? "mini-script" : "main script"} v${version}`;
}

async function errorOf(res: Response) {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `Failed (${res.status}).`;
  } catch {
    return `Failed (${res.status}).`;
  }
}

export default function Snapshots({
  slug,
  canEdit,
  look,
  scriptKey,
  people,
  highlight,
  ready,
  take,
}: {
  slug: string;
  canEdit: boolean;
  /** The project's look now — what a new snapshot will be drawn in. */
  look: ProjectTheme;
  scriptKey: string;
  people: Person[];
  /** Who is ringed on the map now, for the default name. */
  highlight: string | null;
  /** False while the map is still missing pictures. */
  ready: boolean;
  /** The map as it is on screen, as a picture. */
  take: () => Promise<{ blob: Blob; width: number; height: number } | null>;
}) {
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [taking, setTaking] = useState(false);
  const [takeError, setTakeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl(slug))
      .then(async (res) => {
        if (!res.ok) throw new Error(await errorOf(res));
        return (await res.json()) as { snapshots: Snapshot[] };
      })
      .then(
        (body) => !cancelled && setSnapshots(body.snapshots),
        (error: Error) => {
          if (cancelled) return;
          setListError(error.message);
          setSnapshots([]);
        },
      );
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const namesOf = (owner: string | null) =>
    owner ? (people.find((p) => p.owner === owner)?.names.join(" · ") ?? null) : null;

  // No participant's name in it: a name is saved on our side, and who is
  // ringed is kept only as their id, looked up when shown.
  const defaultName = `${fontLabel(look.font)} · ${look.void} / ${look.paper}${highlight ? " · ringed" : ""}`;

  async function onTake() {
    setTaking(true);
    setTakeError(null);
    try {
      const picture = await take();
      if (!picture) throw new Error("The map isn't drawn yet.");
      const form = new FormData();
      form.set("image", picture.blob, "map");
      form.set("name", name.trim() || defaultName);
      form.set("look", JSON.stringify(look));
      form.set("scriptKey", scriptKey);
      form.set("width", String(picture.width));
      form.set("height", String(picture.height));
      if (highlight) form.set("highlight", highlight);
      const res = await fetch(apiUrl(slug), { method: "POST", body: form });
      if (!res.ok) throw new Error(await errorOf(res));
      const { snapshot } = (await res.json()) as { snapshot: Snapshot };
      setSnapshots((prev) => [snapshot, ...(prev ?? [])]);
      setName("");
    } catch (error) {
      setTakeError((error as Error).message);
    } finally {
      setTaking(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 border-t border-paper/10 pt-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm text-paper">snapshots</h2>
        <p className="max-w-prose text-[11px] leading-relaxed text-dim">
          Save the map as it is shown — its colours, type, and anyone ringed —
          with a name and a note. Change the project&rsquo;s colours or
          mini-script, come back, and take another to compare.
        </p>
      </div>

      {canEdit && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && ready && !taking) void onTake();
              }}
              placeholder={defaultName}
              maxLength={120}
              aria-label="Snapshot name"
              className={`${FIELD} w-full max-w-sm text-xs`}
            />
            <Button
              variant="boxed"
              size="xs"
              onClick={() => void onTake()}
              disabled={!ready}
              pending={taking}
            >
              take snapshot
            </Button>
            {!ready && (
              <span className="text-[11px] text-dim">waiting for every mini-avatar</span>
            )}
          </div>
          {takeError && (
            <p role="alert" className="text-xs text-danger">
              Couldn&rsquo;t save the snapshot: {takeError}
            </p>
          )}
        </div>
      )}

      {listError && (
        <p role="alert" className="text-xs text-danger">
          Couldn&rsquo;t load snapshots: {listError}
        </p>
      )}
      {snapshots === null ? (
        <p className="text-[11px] text-dim">Loading snapshots…</p>
      ) : snapshots.length === 0 ? (
        <p className="text-[11px] text-dim">
          No snapshots yet{canEdit ? "." : " — a collaborator can take one."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {snapshots.map((s) => (
            <SnapshotCard
              key={s.id}
              slug={slug}
              snapshot={s}
              canEdit={canEdit}
              ringed={namesOf(s.highlight)}
              current={sameLook(s.look, look)}
              onChange={(next) =>
                setSnapshots((prev) => prev?.map((p) => (p.id === next.id ? next : p)) ?? null)
              }
              onDelete={() =>
                setSnapshots((prev) => prev?.filter((p) => p.id !== s.id) ?? null)
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SnapshotCard({
  slug,
  snapshot,
  canEdit,
  ringed,
  current,
  onChange,
  onDelete,
}: {
  slug: string;
  snapshot: Snapshot;
  canEdit: boolean;
  ringed: string | null;
  /** Drawn in the project's colours and type as they are now. */
  current: boolean;
  onChange: (next: Snapshot) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(snapshot.name);
  const [note, setNote] = useState(snapshot.note);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | string>("idle");
  const [confirming, setConfirming] = useState(false);

  async function save(patch: { name?: string; note?: string }) {
    setStatus("saving");
    const res = await fetch(`${apiUrl(slug)}/${snapshot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => null);
    if (!res?.ok) {
      setStatus(res ? await errorOf(res) : "Couldn't reach the server.");
      return;
    }
    const { snapshot: next } = (await res.json()) as { snapshot: Snapshot };
    onChange(next);
    setName(next.name);
    setNote(next.note);
    setStatus("saved");
  }

  function onNameBlur() {
    if (!name.trim()) return setName(snapshot.name);
    if (name.trim() !== snapshot.name) void save({ name });
  }
  function onNoteBlur() {
    if (note.trim() !== snapshot.note) void save({ note });
  }

  async function remove() {
    const res = await fetch(`${apiUrl(slug)}/${snapshot.id}`, { method: "DELETE" }).catch(
      () => null,
    );
    if (res?.ok) return onDelete();
    setConfirming(false);
    setStatus(res ? await errorOf(res) : "Couldn't reach the server.");
  }

  const { look } = snapshot;
  const taken = new Date(snapshot.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <li className="flex flex-col gap-2">
      <a href={snapshot.url} target="_blank" rel="noreferrer" title="Open full size">
        {/* eslint-disable-next-line @next/next/no-img-element -- our own saved picture, served as is */}
        <img
          src={snapshot.url}
          alt={snapshot.name}
          width={snapshot.width}
          height={snapshot.height}
          loading="lazy"
          className="h-auto w-full rounded"
          style={{ background: look.void }}
        />
      </a>

      {canEdit ? (
        <>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={onNameBlur}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            maxLength={120}
            aria-label="Name"
            className={`${FIELD} text-xs`}
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={onNoteBlur}
            maxLength={4000}
            rows={2}
            placeholder="a note — what changed, what to keep"
            aria-label="Note"
            className={`${FIELD} resize-y text-xs leading-relaxed`}
          />
        </>
      ) : (
        <>
          <p className="text-xs text-paper">{snapshot.name}</p>
          {snapshot.note && (
            <p className="text-xs leading-relaxed whitespace-pre-wrap text-dim">{snapshot.note}</p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-dim">
        <span className="flex items-center gap-1" title={`${look.void} · ${look.paper} · ${look.dim}`}>
          {[look.void, look.paper, look.dim].map((c, i) => (
            <span
              key={i}
              className="inline-block size-3 rounded-full border border-paper/20"
              style={{ background: c }}
            />
          ))}
          <span className="ml-1">{fontLabel(look.font)}</span>
        </span>
        <span>{current ? "current colours" : "colours since changed"}</span>
        <span>{scriptLabel(snapshot.scriptKey)}</span>
        {snapshot.highlight && <span>ringed: {ringed ?? "someone no longer in the room"}</span>}
        <span>{taken}</span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px]">
        <a
          href={`${snapshot.url}?download=1`}
          className="text-dim underline-offset-4 hover:text-paper hover:underline"
        >
          download
        </a>
        {canEdit &&
          (confirming ? (
            <span className="flex items-center gap-3">
              <span className="text-dim">delete this snapshot?</span>
              <button
                type="button"
                onClick={() => void remove()}
                className="text-danger underline-offset-4 hover:underline"
              >
                delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-dim underline-offset-4 hover:text-paper hover:underline"
              >
                keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-dim underline-offset-4 hover:text-danger hover:underline"
            >
              delete
            </button>
          ))}
        {status !== "idle" && (
          <span
            role={status === "saving" || status === "saved" ? undefined : "alert"}
            className={status === "saving" || status === "saved" ? "text-dim" : "text-danger"}
          >
            {status === "saving" ? "saving…" : status === "saved" ? "saved" : status}
          </span>
        )}
      </div>
    </li>
  );
}
