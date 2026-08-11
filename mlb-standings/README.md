# MLB Standings

It's a fully client-side single-page app: the browser pulls live data straight
from the public [MLB StatsAPI](https://statsapi.mlb.com) and renders a dense
standings grid, so there's no backend to run.

## What it shows

Five views, selected via `?tab=`:

| Tab       | `?tab=`      | Grouping                                              |
| --------- | ------------ | ---------------------------------------------------- |
| All       | _(none)_     | Selected team on its own row, then everyone by rank  |
| League    | `league`     | National League / American League                    |
| Divisions | `division`   | Six divisions                                        |
| Wildcard  | `wildcard`   | Division leaders + wildcard field, per league        |
| Playoffs  | `playoffs`   | _(placeholder — was never implemented on the original)_ |

`?teamId=<id>` picks the "current" team (default `119`, the Dodgers). On the
**All** tab that team is pulled out on top and a second table lists its
remaining games with opponent records and probable pitchers.

Columns: Record, Home, Away, GB (games back), E (elimination number), Rem
(games remaining), RS/RA/Dif (runs), A500/B500 (record vs winning / losing
teams), T (strength of remaining schedule), Streak (last 20 W/L), and the
team's Next game (live score if in progress).

## Data sources

Four StatsAPI endpoints, fetched in parallel on load:

- `standings` — team records and rankings
- `schedule` (last ~30 days → Nov 10) — for streaks and toughness
- `schedule` (today → Dec 31, for the current team) — remaining games + probable pitchers
- `schedule` (today, `hydrate=linescore`) — live in-progress games

## Project layout

- `src/lib/mlb/types.ts` — StatsAPI response typings
- `src/lib/mlb/models.ts` — `Team`, `Game`, `RemainingGame`, `formatDate`
- `src/lib/mlb/standings.ts` — fetching, assembling, and grouping the data
- `src/routes/+page.svelte` — tabs and tables
- `src/app.css` — styles (a faithful copy of the original `screen.css`)

## Develop

```bash
npm install
npm run dev
```

## Build

Produces a static SPA in `build/` (via `@sveltejs/adapter-static`):

```bash
npm run build
```

To serve it under a subpath (the original lived at `/mlb/`):

```bash
BASE_PATH=/mlb npm run build
```

All internal links use SvelteKit's `base`, so they follow `BASE_PATH`
automatically.
