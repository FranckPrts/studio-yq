# yq-experiences

A multi-tenant companion to [YouQuantified](https://github.com/mindhiveproject/You-Quantified).
A research team (a *tenant*) sets up a project; participants open its link, design a
parameterizable p5 avatar, and the team stages pairs of avatars into a live
YouQuantified session, whose scores come back to a console and a leaderboard.

It grew out of **Planet Sync**, the single-tenant app that ran at CCN 2026 —
that one's record lives at
[mindhiveproject/nowadays-ccn-2026](https://github.com/mindhiveproject/nowadays-ccn-2026).

## Where data lives

- **Ours** (Postgres, via Prisma): people, sessions, invitations, projects, each
  project's look and wording, its p5 scripts, and an *encrypted* copy of the
  credentials that reach the tenant's Supabase.
- **The tenant's own Supabase**: participants, their avatars and the session
  scores — under anonymous auth and RLS that this app provisions. No participant
  data is ever stored here.

## Routes

| Path | Who | What |
| --- | --- | --- |
| `/e/[slug]` | Participants, no account | The experience itself |
| `/projects` | Signed-in members | Projects you belong to |
| `/projects/[slug]` | Members, by role | Overview, style & language, script & parameters, database |
| `/projects/[slug]/console` | Members; staging needs collaborator+ | Live avatar list, staging, latest scores |
| `/projects/[slug]/board` | Members | The leaderboard the room sees |
| `/admin/invitations` | Platform admins | People: invitations and administrators |
| `/invite/[token]`, `/signin` | Invitees, members | Registration is invite-only |

Roles, invitations and administrator recovery: [docs/administration.md](docs/administration.md).

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · Prisma 7 with `@prisma/adapter-pg`
· Postgres · Supabase (tenant side, OAuth + Management API) · p5 1.11.3 in a
sandboxed iframe · argon2id passwords, database-backed sessions · AES-256-GCM for
stored tenant credentials.

## Local development

Requires **Node 24** (`.nvmrc`) — Prisma 7 refuses older versions — and a local
Postgres.

```sh
nvm use
cp .env.example .env          # then fill it in; APP_MASTER_KEY: openssl rand -base64 32
npm install                   # also generates the Prisma client
npx prisma migrate dev        # creates the tables
npm run admin -- --email you@example.com   # first administrator, password printed once
npm run dev                   # http://localhost:3100
```

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server on port 3100 |
| `npm run build` | Generates the Prisma client, then builds |
| `npm run admin` | Create or recover a platform administrator |
| `npm run invite` | Create an invitation from the terminal |
| `npm run project:create` | Create a project from the terminal |
| `npm run visual:check` | Validate a visual's parameter declaration |
| `npm run connection:verify` | Prove a project's stored Supabase secret decrypts |

`/dev/sketch` and `/dev/primitives` are development benches; production serves
neither.

## Deployment

Production is **Vercel + Neon** (Neon added through the Vercel Marketplace).

- Vercel runs `npm run vercel-build`: generate the client, apply migrations, build.
  Migrations run on **production deployments only** — previews would otherwise
  migrate production's database. Set `MIGRATE_ON_BUILD=1` on a preview that has
  its own Neon branch.
- Environment variables:

  | Variable | |
  | --- | --- |
  | `DATABASE_URL` | Neon, **pooled** — the app at runtime (set by the integration) |
  | `DATABASE_URL_UNPOOLED` | Neon, direct — migrations (set by the integration) |
  | `APP_MASTER_KEY` | Production's own, never the local one. Keep a copy outside Vercel |
  | `SUPABASE_OAUTH_CLIENT_ID`, `SUPABASE_OAUTH_CLIENT_SECRET` | The Supabase OAuth app |
  | `SUPABASE_OAUTH_REDIRECT_URI` | `https://<domain>/api/connect/supabase/callback`, registered byte for byte |
  | `APP_BASE_URL` | `https://<domain>` — invitation links and OAuth redirects |

- The first production administrator is created from a trusted machine — see
  [docs/administration.md](docs/administration.md#in-production).
- If `APP_MASTER_KEY` is ever lost, set a new one: every Supabase connection then
  reads as **reconnect needed**, an owner reconnects it, and nothing in the
  tenant's Supabase is affected.
