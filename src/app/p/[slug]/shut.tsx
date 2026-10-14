import type { ReactNode } from "react";
import { FONTS, themeCssVars, themeScheme, type ProjectTheme } from "@/lib/theme/project-theme";

/**
 * What a participant meets when the project is not taking them: shut, or open
 * but incomplete. Shared with the participant-frontend preview, so what a
 * tenant previews is this component rather than a copy of it. `children` sit
 * under the message — the way on to the conclusion, once a closed project has
 * published it.
 */
export default function Shut({
  theme,
  title,
  message,
  children,
}: {
  theme: ProjectTheme;
  title: string;
  message: string;
  children?: ReactNode;
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
      className="flex min-h-screen items-center justify-center p-8"
    >
      <div className="max-w-sm">
        <h1 className="text-sm">{title}</h1>
        <p className="mt-2 whitespace-pre-line text-xs" style={{ color: theme.dim }}>
          {message}
        </p>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </main>
  );
}
