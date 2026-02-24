# Claude Code Workflow Rules — UnitedTribes POC

## Workflow Orchestration

### 1. Plan Before Building
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity
- Before modifying any file, read the current state first and confirm what needs to change — don't assume you know what the code looks like

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution
- Before modifying any file, use a subagent to read the current state and confirm what needs to change

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review `tasks/lessons.md` at session start for relevant project context

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
- **Before saying a visual change is done, verify the actual rendered output at the correct URL in the browser. Do not rely on reading the code — confirm what the browser actually renders. If you cannot open a browser, tell the user exactly what to check and don't declare it fixed until they confirm.**
- When told something isn't working visually, DO NOT repeat "it's fixed" — instead, show the exact code that controls the behavior, explain why it should work, and if the user says it still doesn't work, debug deeper rather than re-asserting
- **After any merge or structural change, verify API response parity.** Submit the same test query on both ports (5173 and 5174) and confirm responses have the same quality (entity count, discovery count, prose richness). If your version returns fallback messages like "I don't have detailed information" while the reference version returns rich content, something is broken — debug immediately.

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Track Progress**: Check off items as completed, add new items as discovered
3. **Lessons Learned**: After any mistake or correction, immediately add to `tasks/lessons.md`

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Commit Early, Commit Often**: Commit working changes immediately before starting new work. Never let uncommitted changes accumulate. Always `cp App.jsx PluribusComps.jsx` before every commit.
- **Show, Don't Tell**: When the user reports a visual bug, show the actual code causing it. Don't just say "I fixed it." Show the before code, the after code, and explain what changed.

## Project-Specific Rules — NEVER VIOLATE

### Branch Strategy
- **`main`** is the stable baseline. v0.9 (commit `a3f8774`) is currently locked there. Only push to `main` when features are complete and tested.
- **`jd/design-reskin`** is the active development branch. ALL new work happens here. Merge to `main` when ready.
- **`phase2-data-extraction`** is Justin's feature branch for new content rendering components. He will PR into `main` for review.
- **`justin/poc-reference`** is a frozen snapshot. NEVER merge it into `main`. NEVER delete it. Use `git show justin/poc-reference:<filename>` to reference it.
- When Justin PRs content components into `main`, review every line to make sure nothing conflicts with your screens before merging.

### Server Boundaries
- **Port 5173 is the reference baseline. NEVER touch it.** Never kill processes on 5173. Never restart it. Never cd into its directory. Never modify its files. Port 5173 is READ ONLY.
- **Port 5174 is J.D.'s working copy.** ALL work happens here, served from `~/Desktop/unitedtribes-pocv2-jd/` on branch `jd/design-reskin`.
- **The correct URL is `localhost:5174/jd-universes-poc/`.** Do not create additional URL routes. Do not serve changes at `/universes-poc/`. One URL path only.

### Design Bible & Project Docs
- The v2.8 design bible is the absolute specification for all visual decisions. It lives in the repo at `docs/v2.8.4-design-bible.html` — read it directly from there.
- When implementing any visual component, read the bible's CSS FIRST. Copy values exactly. Do not approximate.
- If in doubt about any visual detail, check the bible before guessing.
- **Key project documents are in the `docs/` folder. Read these at session start:**
  - `docs/v2.8.4-design-bible.html` — THE visual specification (600-line HTML/CSS prototype)
  - `docs/claude-code-implementation-guide.md` — technical spec for reskinning
  - `docs/claude-session-handoff.md` — project context, history, and design rules
  - `docs/collaboration-guide.md` — Justin's rules for working on the same codebase
  - `docs/selective-merge-2f5aec5.md` — rationale for v0.8 merge decisions (template for future merges)

### Git Discipline
- Before starting any new task, run `git status` and confirm working tree is clean
- After completing any task, immediately:
  ```bash
  cp src/App.jsx src/PluribusComps.jsx
  npm run build
  git add src/App.jsx src/PluribusComps.jsx
  git commit -m "descriptive message"
  git push origin jd/design-reskin
  ```
- Never make changes on top of uncommitted work
- If a change breaks things, `git stash` or `git checkout` immediately — don't layer fixes on top of broken state
- **Update the version tracker** (`pocv2-jd-design-reskin-versions.html`) for every version bump. Every commit or group of related commits should be documented with: version tag, date, description, detailed change list, and commit hash. Do not let commits accumulate undocumented.

### Selective Merge Workflow
When porting changes from Justin's branch or `main`:
1. **Read the diff first.** Use a subagent to analyze what Justin changed and identify each discrete change.
2. **Classify each change as TAKE, REJECT, or ADAPT.** Evaluate whether each change conflicts with our design decisions (warm palette, inline follow-ups, omnipresent InputDock, left-aligned layout, etc.).
3. **Document the decision.** Create a merge decision doc in `docs/` explaining what was taken, what was rejected, and why — following the pattern in `docs/selective-merge-2f5aec5.md`.
4. **Never blindly merge.** Justin's branch may introduce styling, layout, or behavioral changes that undo our design work. Every line must be reviewed.
5. **After merging, verify API response parity.** Submit the same query on both versions and confirm response quality matches.

### API & Backend
- Do not modify API endpoints, keys, or backend configurations without explicit permission
- If responses differ between versions, the first step is always to diff the API configuration — check `.env` files, API URLs, request headers, and request body format. Do not guess.
- Never change environment variables or .env files without confirming with the user first
- **Response quality is a P0 concern.** If your version returns "I don't have detailed information" fallbacks while the reference returns rich responses with entities and discoveries for the same query, treat this as a critical bug. Debug the API pipeline immediately.

---

## Component Integration Plan (Phase 3)

### What's Coming
Justin is building content rendering components in `components/content/` that parse a new structured `content` field from the broker API. These components are minimally styled — J.D. applies the design system on top.

### Components to Expect
```
components/content/
├── ContentRenderer.jsx      — Orchestrator: takes API response, renders sections in order
├── NarrativeSection.jsx     — Renders a text paragraph
├── MediaCallout.jsx         — Renders YouTube/Spotify embed or article link
├── ConnectionHighlight.jsx  — Renders tappable entity card, fires onTap callback
├── NextQuestions.jsx         — Renders suggestion chips, fires onSelect callback
├── ResponseHeader.jsx       — Renders headline + summary
└── index.js                 — Barrel export
```

### Callback Wiring (CRITICAL)
- **`onFollowUp(queryString)`** → Feed into the existing `handleFollowUp` inline threading pipeline. This must NOT trigger a page refresh or ThinkingScreen reload. It must behave identically to a follow-up submitted via the InputDock — inline threading, model-switch preservation, collapsible ThreadEntries.
- **`onEntityTap(entityName)`** → Open the QuickView drawer for that entity. Same behavior as clicking entity links in the response prose.

### ResponseScreen Layout Order
```
┌─────────────────────────────────┐
│  ResponseHeader                 │  headline + summary
│  (relationship to existing      │
│  "Enhanced Discovery" badge TBD)│
├─────────────────────────────────┤
│  Content Sections (in order)    │  prose at 740px max-width, left-aligned
│  ├── NarrativeSection           │
│  ├── ConnectionHighlight        │  ← INLINE between paragraphs
│  ├── NarrativeSection           │
│  ├── MediaCallout               │  ← design TBD
│  └── NarrativeSection           │
├─────────────────────────────────┤
│  NextQuestions                   │  ← BETWEEN prose and Discovery
│  (suggestion chips)             │    Discovery section takes continuous
│                                 │    input from queries and responses
├─────────────────────────────────┤
│  AI-Curated Discovery           │  full-width discovery cards, cast,
│  (cards, cast, music)           │  music — existing carousel system
├─────────────────────────────────┤
│  InputDock (fixed bottom)       │  omnipresent, feeds handleFollowUp
└─────────────────────────────────┘
```

### Design Items — TBD (Do NOT Finalize)
These require design decisions before implementation:
1. **MediaCallout** embed sizing and style — do not finalize
2. **ConnectionHighlight** card design — use Justin's minimal styling as placeholder
3. **ResponseHeader** REPLACES the top of the response area — confirmed by Justin

### Fallback Behavior
If `apiResponse.content` is missing, `ContentRenderer` falls back to `apiResponse.narrative` as plain text. This is the current rendering path — preserve existing EntityTag auto-linking behavior exactly.

---

## Current State (update as versions progress)
- **Current version:** v0.9 (commit `a3f8774`) — locked on `main`
- **Active branch:** `jd/design-reskin`
- **Open P0 issues:**
  1. SideNav navigation destroys search state — clicking any SideNav item on ResponseScreen loses all query/response/discovery state
  2. Raw/unenhanced compare responses — need vanilla endpoints for Perplexity/Gemini
  3. UnitedTribes logo/header font doesn't match v2.8 bible
  4. Discovery card sizing inconsistency between filter states (All vs TV)
- **Open P1 issues:**
  1. Entity animations use hardcoded placeholders — wire to actual entity data
  2. Entity click should toggle QuickView drawer (currently only opens, no toggle)
  3. Preload raw compare responses in background after main response arrives
