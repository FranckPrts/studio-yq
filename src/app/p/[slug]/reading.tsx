import "server-only";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  coerceLexicon,
  coerceTheme,
  type ProjectLexicon,
  type ProjectTheme,
} from "@/lib/theme/project-theme";
import { coerceCopy, fillCopy, type ProjectCopy } from "@/lib/theme/project-copy";
import {
  coerceConclusionPage,
  type ConclusionPage,
} from "@/lib/report/conclusion-template";
import Shut from "./shut";

/**
 * The door to the pages a participant comes back to read: results and the
 * conclusion. An unknown slug 404s, as on the participant page, but closing a
 * project does not shut these: closed only stops new and edited avatars, and
 * the conclusion is published after the event, once the doors are closed.
 * Reading needs only the database, not a script.
 */

export type ReadingProject = {
  name: string;
  theme: ProjectTheme;
  lexicon: ProjectLexicon;
  copy: ProjectCopy;
  conclusion: ConclusionPage;
  supabaseUrl: string;
  publishableKey: string;
  /** Published by the people running it, once the event is over. */
  conclusionOpen: boolean;
};

export async function readingMetadata(slug: string): Promise<Metadata> {
  const project = await db.project.findUnique({
    where: { slug },
    select: { name: true },
  });
  return project ? { title: project.name } : {};
}

export async function loadReadingProject(
  slug: string,
): Promise<{ project: ReadingProject } | { shut: ReactElement }> {
  const project = await db.project.findUnique({
    where: { slug },
    select: {
      name: true,
      conclusionPublishedAt: true,
      theme: true,
      lexicon: true,
      copy: true,
      conclusionPage: true,
      connection: {
        select: { projectUrl: true, publishableKey: true, provisionedAt: true },
      },
    },
  });
  if (!project) notFound();

  const theme = coerceTheme(project.theme);
  const lexicon = coerceLexicon(project.lexicon);
  const copy = coerceCopy(project.copy);
  const vars = {
    noun: lexicon.noun,
    nounPlural: lexicon.nounPlural,
    project: project.name,
  };

  const connection = project.connection;
  if (
    !connection?.projectUrl ||
    !connection.publishableKey ||
    !connection.provisionedAt
  ) {
    return {
      shut: (
        <Shut
          theme={theme}
          title={project.name}
          message={fillCopy(copy.notReadyMessage, vars)}
        />
      ),
    };
  }

  return {
    project: {
      name: project.name,
      theme,
      lexicon,
      copy,
      conclusion: coerceConclusionPage(project.conclusionPage),
      supabaseUrl: connection.projectUrl,
      publishableKey: connection.publishableKey,
      conclusionOpen: project.conclusionPublishedAt !== null,
    },
  };
}
