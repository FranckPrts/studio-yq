import { formatScore } from "@/lib/board";
import { joinNames, ordinal, type Person, type PersonStats } from "./people";

/**
 * What one participant's {placeholders} become. Plain strings — the renderer
 * escapes them — and empty where there is nothing to say, so a sentence about
 * scores belongs inside {#runs}…{/runs}.
 */
export function emailValues(
  person: Person,
  stats: PersonStats,
  context: {
    project: string;
    noun: string;
    nounPlural: string;
    /** Names of the declaration's `text` parameters — their answers become placeholders. */
    answerKeys: string[];
  },
): Record<string, string> {
  const values: Record<string, string> = {
    name: joinNames(person.names),
    noun: context.noun,
    nounPlural: context.nounPlural,
    project: context.project,
    runs: String(stats.runs),
    partners: String(stats.partners),
    best_score: stats.best !== null ? formatScore(stats.best) : "",
    avg_score: stats.average !== null ? formatScore(stats.average) : "",
    percentile: stats.percentile !== null ? ordinal(stats.percentile) : "",
    top_strategy: stats.topStrategy,
  };
  // An answer from whichever of their avatars has one, oldest first. Built-in
  // keys win, so a parameter named `name` cannot replace the avatar's name.
  for (const key of context.answerKeys) {
    if (key in values) continue;
    values[key] = person.avatars.map((a) => a.answers[key]?.trim()).find(Boolean) ?? "";
  }
  return values;
}
