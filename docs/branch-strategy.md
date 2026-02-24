# Branch Strategy: Frontend Development

> **Date:** February 24, 2026
> **Repo:** `United-Tribes/unitedtribes_universes_poc`
> **From:** Justin
> **Updated with J.D.'s branch workflow:** February 24, 2026

---

## What Changed

Your build is now the primary build. `main` is yours to push to.

Justin's POC build has been preserved as a reference on a separate branch (`justin/poc-reference`) and will not be merged into `main`. It's there if anyone needs to look back at how conversational memory, the broker API integration, or the original screen flows were implemented.

Your v0.9 work (commit `a3f8774` on `jd/design-reskin`) has been pushed to `main` as the stable baseline. Active development continues on `jd/design-reskin`, which merges to `main` when features are ready.

---

## Current Branch Layout

| Branch | Status | Purpose |
|--------|--------|---------|
| `main` | **Stable baseline (v0.9)** | Locked releases. Push here when features are complete and tested. |
| `jd/design-reskin` | **Active development** | J.D.'s working branch. All new work happens here. Merge to `main` when ready. |
| `phase2-data-extraction` | Justin's feature branch | New content rendering components. PRs into `main` for J.D. to review. |
| `justin/poc-reference` | Frozen reference | Justin's build with conversational memory docs. Do not merge or delete. |
| `dev/colleague` | Available if needed | Can be used as additional working branch. |
| `phase2-data-extraction` | Can be ignored | Justin's old working branch, identical to `main` before your changes. |

---

## How to Work Going Forward

### Your workflow (design/presentation)
1. Work on `jd/design-reskin` — this is your active development branch
2. Merge to `main` when features are ready and tested
3. `main` is your stable build — keep it clean

### When Justin adds content rendering components
Justin will:
1. Pull your latest `main`
2. Create a feature branch (e.g., `phase2-data-extraction`)
3. Build components in a new `components/content/` directory — no changes to your existing files
4. PR back into `main` for you to review

Since his work lives in a new directory and yours lives in your screen/layout files, there should be no merge conflicts.

### If you need to reference Justin's old implementation

The conversational memory architecture, broker API integration patterns, and LLM test findings are documented on `justin/poc-reference`:

- `CLAUDE.md` — Has sections on conversational memory (two-tier system), LLM comparison results, and entity resolution status
- `CONVERSATIONAL_MEMORY_API_INTEGRATION.md` — Documents how the frontend wraps queries in conversation context before sending to the broker API

To view without switching branches:
```bash
git show justin/poc-reference:CLAUDE.md
git show justin/poc-reference:CONVERSATIONAL_MEMORY_API_INTEGRATION.md
```

---

## Rules
1. **Do not merge `justin/poc-reference` into `main`** — it's a snapshot, not a working branch
2. **Do not delete `justin/poc-reference`** — it's the team's reference for the original POC implementation
3. **`main` is yours** — push your stable, tested work there with confidence
4. When Justin PRs his content components into `main`, review to make sure nothing conflicts with your screens before merging
5. **`jd/design-reskin` is the active working branch** — all development happens here, not directly on `main`
