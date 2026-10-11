import type { Parameter } from "@/lib/params/types";
import { emailLabel, type EmailQuestion } from "@/lib/projects/participant-details";
import { GROUPS } from "./groups";

/** The declaration, grouped the way the builder groups it, for those who can look but not edit. */
export default function ParameterList({
  parameters,
  email,
  optionalMarker,
}: {
  parameters: Parameter[];
  /** The project's email question, when it is switched on. */
  email: EmailQuestion | null;
  optionalMarker: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map((group) => {
        const members = parameters.filter(group.holds);
        const withEmail = group.key === "questions" && !!email;
        return (
          <section key={group.key} className="flex flex-col gap-3 border border-paper/15 p-4">
            <header className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-sm text-paper">{group.title}</h3>
                <span className="shrink-0 text-xs text-dim">
                  {members.length + (withEmail ? 1 : 0)}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-dim">{group.blurb}</p>
            </header>
            {members.length === 0 && !withEmail ? (
              <p className="text-[11px] text-dim/70">none</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {members.map((p) => (
                  <li
                    key={p.name}
                    className={`border-b border-paper/10 pb-2 ${p.enabledBy ? "ml-5 border-l pl-4" : ""}`}
                  >
                    {p.label || p.name}{" "}
                    <span className="text-dim">
                      · {p.name} · {p.type}
                    </span>
                    {p.enabledBy && (
                      <span className="block text-[11px] text-dim">
                        ↳ only while{" "}
                        {parameters.find((q) => q.name === p.enabledBy)?.label ||
                          p.enabledBy}{" "}
                        is on
                      </span>
                    )}
                  </li>
                ))}
                {withEmail && (
                  <li className="border-b border-paper/10 pb-2">
                    {emailLabel(email, optionalMarker)}{" "}
                    <span className="text-dim">· email · kept private</span>
                  </li>
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
