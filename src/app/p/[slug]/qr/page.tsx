import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { publicProjectUrl, qrImagePath } from "@/lib/app-url";
import {
  FONTS,
  coerceLexicon,
  coerceTheme,
  themeCssVars,
  themeScheme,
} from "@/lib/theme/project-theme";
import { coerceCopy, fillCopy } from "@/lib/theme/project-copy";
import Shut from "../shut";

/**
 * The participation link as a QR code, full screen, for a tablet at the door
 * or a second screen in the room. The link is printed under it for anyone
 * whose camera will not scan.
 *
 * Public, like the link itself. While the project is shut it says so instead,
 * as the participant page does, rather than show a code that leads nowhere.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await db.project.findUnique({
    where: { slug },
    select: { name: true },
  });
  return project ? { title: project.name } : {};
}

export default async function QrPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await db.project.findUnique({
    where: { slug },
    select: {
      name: true,
      openForParticipation: true,
      theme: true,
      lexicon: true,
      copy: true,
    },
  });
  if (!project) notFound();

  const theme = coerceTheme(project.theme);

  if (!project.openForParticipation) {
    const lexicon = coerceLexicon(project.lexicon);
    return (
      <Shut
        theme={theme}
        title={project.name}
        message={fillCopy(coerceCopy(project.copy).closedMessage, {
          noun: lexicon.noun,
          nounPlural: lexicon.nounPlural,
          project: project.name,
        })}
      />
    );
  }

  const url = publicProjectUrl(slug);

  return (
    <main
      data-theme={themeScheme(theme)}
      style={{
        ...themeCssVars(theme),
        backgroundColor: theme.void,
        color: theme.paper,
        fontFamily: FONTS[theme.font].stack,
      }}
      className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4 md:p-8"
    >
      <h1 className="text-center text-xl md:text-2xl">{project.name}</h1>
      {/* The image carries its own white quiet zone; the rounding only
          softens the card's corners, well outside the code. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- an SVG from our own route, already sized */}
      <img
        src={qrImagePath(slug)}
        alt={`QR code for ${url}`}
        className="aspect-square w-[min(72vmin,36rem)] rounded-lg"
      />
      <p className="break-all text-center text-sm" style={{ color: theme.dim }}>
        {url.replace(/^https?:\/\//, "")}
      </p>
    </main>
  );
}
