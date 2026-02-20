# Pluribus Universes POC — Getting Started

## Setup

```bash
git clone https://github.com/United-Tribes/unitedtribes_universes_poc.git
cd unitedtribes_universes_poc
git checkout dev/colleague
npm install
npm run dev
```

The app will be running at http://localhost:5173

## Branch Strategy

There are three branches:

- **`main`** — The stable, production-ready branch. This is where both streams of work merge together. Deployments come from here.
- **`dev/colleague`** — Your starting point. Create feature branches off this for your work, then PR back into `main` when ready.
- **`phase2-data-extraction`** — Justin's active development branch. He merges into `main` separately.

### Merge Conflict Warning

The entire app lives in a single file (`src/App.jsx`, ~7,300 lines). If you and Justin are editing different sections of the same file, git will likely produce merge conflicts when both branches merge into `main`. To minimize this:

- **Work on different screens** — coordinate with Justin on who's touching what
- **Commit often** — smaller, focused commits are easier to merge than large ones
- **Pull from `main` regularly** — keep your branch up to date so conflicts don't pile up: `git checkout dev/colleague && git pull origin main`
- **When conflicts happen** — they'll be in `App.jsx`. Resolve carefully, then remember to copy the resolved version to `PluribusComps.jsx`

## Key Things to Know

- Read `CLAUDE.md` in the repo root — it's the complete architecture guide for Claude Code (design system, all 11 screens, data model, conventions)
- The entire app is **one file**: `src/App.jsx` (~7,300 lines)
- `PluribusComps.jsx` must always be an identical copy of `App.jsx`
- All styles are inline (no CSS files) — this is intentional
- Palette: navy `#1a2744`, gold `#f5b800`, neutral white — don't drift from this

## Running in Claude Code

Just open the repo in Claude Code — it will automatically read `CLAUDE.md` and have full context on the architecture, all 11 screens, the data model, the theme color system, and the editorial conventions.

## Data Files

- `src/data/pluribus-response.json` — songs, episodes, cast, crew, themes
- `src/data/pluribus-universe.json` — 56 entities from knowledge graph
- `public/images/manual/` — headshot images for cast/crew

## API

- **Base URL:** `https://166ws8jk15.execute-api.us-east-1.amazonaws.com/prod`
- **Broker:** `POST /v2/broker` with `{"query": "..."}` — AI narrative generation
- **Entities:** `GET /entities/{name}` — entity details (URL-encode names)
