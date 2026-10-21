import type { ReactNode } from "react";
import LegalLinks from "./legal-links";
import { FONTS, themeCssVars, themeScheme, type ProjectTheme } from "@/lib/theme/project-theme";

/**
 * The frame of the pages a participant comes back to read — results and the
 * conclusion. The participant page's palette and type, without its canvas:
 * these pages are about every one of their avatars at once, and skipping the
 * sketch spares a phone the p5 bundle just to read a list.
 */
export default function PageShell({
  theme,
  children,
}: {
  theme: ProjectTheme;
  children: ReactNode;
}) {
  return (
    <main
      data-theme={themeScheme(theme)}
      style={{
        ...themeCssVars(theme),
        backgroundColor: theme.void,
        color: theme.paper,
        fontFamily: FONTS[theme.font].stack,
      }}
      className="min-h-dvh"
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 pb-16 pt-10">
        {children}
        <LegalLinks dim={theme.dim} />
      </div>
    </main>
  );
}
