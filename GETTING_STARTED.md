# Getting Started — UnitedTribes Universes POC

## Prerequisites

- **Node.js** v18+ (v22 recommended)
- **npm** (comes with Node.js)

## Setup

```bash
# Clone the repo
git clone https://github.com/United-Tribes/unitedtribes_universes_poc.git
cd unitedtribes_universes_poc

# Install dependencies
npm install

# Start dev server
npm run dev
```

The dev server runs at `http://localhost:5173/universes-poc/` by default.

No environment variables or API keys are needed — all universe data is currently hardcoded in the app.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |

## Branch Workflow

1. Work on your own branch (e.g. `dev/colleague`)
2. Commit and push to your branch
3. Open a Pull Request to `main` when ready for review
4. Justin reviews and merges to `main`

```bash
# Switch to your branch
git checkout dev/colleague

# Make changes, then commit and push
git add .
git commit -m "Description of changes"
git push origin dev/colleague
```

## Project Structure

```
unitedtribes_universes_poc/
├── index.html              # HTML entry point
├── vite.config.js          # Vite config (base: '/universes-poc/' for S3 deploy)
├── package.json            # Dependencies (React 19, Vite 7)
├── src/
│   ├── main.jsx            # React entry — mounts <App />
│   ├── App.jsx             # Main app — all screens and universe data
│   └── PluribusComps.jsx   # Pluribus universe components (reference)
├── API_COVERAGE_FINDINGS.md
├── PLANNING_KNOWLEDGE_GRAPH_GAPS.md
└── SESSION_RESUME.md
```

### How the app works

- **`App.jsx`** is the single-file app containing all screens and all universe definitions (Pluribus, Blue Note, Patti Smith, Greta Gerwig).
- The app has 6 screens: **Home → Thinking → Response → Constellation → Entity Detail → Library**.
- Each "universe" defines its own theme colors, entity data, and content. Switching universes swaps the entire visual identity.
- Navigation between screens is managed via React state — no router needed.

### Note on `vite.config.js`

The `base: '/universes-poc/'` setting is for S3 deployment. It doesn't affect local development — `npm run dev` works as-is. Don't change this unless you're changing the deploy path.
