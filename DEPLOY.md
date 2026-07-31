# Deploying PokéChase to Railway

Goal: hosted site with **auto-deploy on every push to `main`**, a persistent
volume for the SQLite catalog, and the daily price refresh running in-app.

The repo is already prepared: `railway.json` (migrations run on boot,
healthcheck on `/api/v1/meta`), an in-app scheduler (`ENABLE_DAILY_INGEST=1`
runs the full pipeline daily at 21:05 UTC), and `npm run ingest:bootstrap`
for the one-time data load.

## One-time setup (~15 minutes, mostly waiting)

1. **Create the project**
   - Sign in at https://railway.app with your GitHub account.
   - New Project → **Deploy from GitHub repo** → select `lewlian/PokeChase`
     (grant Railway access to the repo when prompted).
   - The first build starts automatically. From now on **every push to
     `main` redeploys** — that's the default, nothing to configure.

2. **Attach a volume** (persistent disk for the database)
   - On the service: right-click (or ⌘K) → **Attach volume**.
   - Mount path: `/data` · size: 5 GB is plenty for years of snapshots.

3. **Set environment variables** (service → Variables):

   | Variable | Value | Why |
   |---|---|---|
   | `POKECHASE_DB_PATH` | `/data/pokechase.db` | put the DB on the volume |
   | `ENABLE_DAILY_INGEST` | `1` | in-app daily refresh at 21:05 UTC |
   | `PRICECHARTING_TOKEN` | *(optional)* | graded prices, when you subscribe |

   (The repo ships a Dockerfile — Node 22 and 7-Zip are baked into the
   image, so no NIXPACKS_* variables are needed.)

   Saving variables triggers a redeploy — wait for it to go green. The site
   is now live but **empty** (no data yet).

4. **Bootstrap the data** (one time)
   - Install the CLI locally: `npm i -g @railway/cli`, then `railway login`
     and `railway link` (pick the project/service) from the repo folder.
   - Open a shell **inside the running service**: `railway ssh`
   - Run: `npm run ingest:bootstrap`
     (~15 min: catalog → JP sets → prices → contents → logos → 1-year
     history backfill → chase rankings.)

5. **Get your URL**
   - Service → Settings → Networking → **Generate Domain** →
     `something.up.railway.app` (custom domains can be added there too).

Done. Verify: the homepage shows real stats and "Prices updated" with
today's date; `/api/v1/meta` returns counts.

> Troubleshooting (all hit and solved during initial setup):
> - Build log shows Node 18 / `npm ci` lockfile errors → you're building a
>   stale commit. "Redeploy" reruns that same commit; use "Deploy latest
>   commit" or push to `main`.
> - Healthcheck "service unavailable" → set the `PORT=3000` service
>   variable (Dockerfile deploys don't get one injected; the probe targets
>   whatever PORT says).
> - Deploy log ends after "migrations applied" → historical; migrations
>   now run in-app on DB open, boot is just `next start`.
> - Deployment green but domain says "Application failed to respond" →
>   domain target port must be 3000, and the domain must be attached to
>   the service that actually deployed (retry attempts can leave a stale
>   service holding the domain). Decisive test from `railway ssh`:
>   `node -e "fetch('http://localhost:3000/api/v1/meta').then(r=>r.text()).then(console.log)"`

## Day-2 notes

- **Auto-deploy**: push to `main` → Railway builds & swaps automatically.
  The database lives on the volume and survives every deploy.
- **Daily refresh**: runs inside the web service (see
  `src/lib/ingest-scheduler.ts`); check service logs for
  `[ingest-scheduler]` lines, and the `job_runs` table for history.
- **Local vs hosted**: your Mac's launchd job and the hosted scheduler are
  independent — each refreshes its own copy. Feel free to remove the local
  one (`launchctl unload ~/Library/LaunchAgents/com.pokechase.daily.plist`)
  if you only care about the hosted site.
- **Cost**: Hobby plan ($5/mo incl. usage credit) fits this comfortably.
- **Supabase (later)**: accounts/portfolio will add `SUPABASE_URL` +
  `SUPABASE_ANON_KEY` env vars here; user data lives in Supabase while the
  catalog stays on the volume. Nothing about this setup changes.
