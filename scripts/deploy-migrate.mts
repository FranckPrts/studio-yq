/**
 * Applies pending migrations as part of a Vercel build — production only.
 *
 * Preview deployments share whatever database their environment points at,
 * and by default that is production's. Letting a preview build run `migrate
 * deploy` would apply a branch's unreviewed migration to live data, so they
 * skip it — unless `MIGRATE_ON_BUILD=1` says the preview has a database of its
 * own (a Neon preview branch), where migrating is exactly what you want.
 *
 * A failed migration fails the build: deploying code against a schema it does
 * not match is worse than not deploying.
 *
 *   npm run vercel-build   (Vercel runs this instead of `build`)
 */
import { spawnSync } from "node:child_process";

const environment = process.env.VERCEL_ENV;
const forced = process.env.MIGRATE_ON_BUILD === "1";

if (environment && environment !== "production" && !forced) {
  console.log(
    `[deploy-migrate] skipped for ${environment} — set MIGRATE_ON_BUILD=1 if this deployment has its own database.`,
  );
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
