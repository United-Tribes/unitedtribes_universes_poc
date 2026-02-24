# Claude Code Master Briefing — UnitedTribes POC
> **Date:** February 24, 2026
> **Consolidates:** Workflow rules, branch strategy, frontend integration plan
> **Latest update:** Justin's component/branch clarifications (Feb 24 evening)

---

## Part 1: Workflow Orchestration

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
- **After any merge or structural change, verify API response parity.** Submit the same test query and confirm responses have the same quality (entity count, discovery count, prose richness). If your version returns fallback messages like "I don't have detailed information" while the reference version returns rich content, something is broken — debug immediately.

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

### Task Management
1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Track Progress**: Check off items as completed, add new items as discovered
3. **Lessons Learned**: After any mistake or correction, immediately add to `tasks/lessons.md`

### Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Commit Early, Commit Often**: Commit working changes immediately before starting new work. Never let uncommitted changes accumulate. Always `cp App.jsx PluribusComps.jsx` before every commit. (Note: this mirror rule does NOT apply to Justin's content components in `components/content/` — they are a separate directory.)
- **Show, Don't Tell**: When the user reports a visual bug, show the actual code causing it. Don't just say "I fixed it." Show the before code, the after code, and explain what changed.

---

## Part 2: Branch Strategy

### Current State
v0.9 (commit `a3f8774`) on `jd/design-reskin` needs to be pushed to `main` as the stable baseline. This has NOT happened yet — it is the immediate first task. After that, active development continues on `jd/design-reskin`.

### Branch Layout

| Branch | Status | Purpose |
|--------|--------|---------|
| `main` | **Stable baseline** | Push here when features are complete and tested. Will contain v0.9 once pushed. |
| `jd/design-reskin` | **Active development** | J.D.'s working branch. ALL new work happens here. Merge to `main` when ready. |
| `phase2-data-extraction` | **Justin's component branch** | Where Justin is building content rendering components. Will PR into `main` when ready. |
| `justin/poc-reference` | Frozen reference | Justin's original build with conversational memory docs. NEVER merge or delete. |
| `dev/colleague` | Available if needed | Can be used as additional working branch. |

### Rules
1. **Do not merge `justin/poc-reference` into `main`** — it's a frozen snapshot, not a working branch
2. **Do not delete `justin/poc-reference`** — it's the team's reference for the original POC implementation
3. **`main` is J.D.'s stable build** — push tested work there with confidence
4. **`jd/design-reskin` is the active working branch** — all development happens here, not directly on `main`
5. When Justin PRs his content components into `main`, review every line to make sure nothing conflicts with your screens before merging

### Reference Docs on `justin/poc-reference`
To view without switching branches:
```bash
git show justin/poc-reference:CLAUDE.md
git show justin/poc-reference:CONVERSATIONAL_MEMORY_API_INTEGRATION.md
```

---

## Part 3: Project-Specific Rules — NEVER VIOLATE

### Server Boundaries
- **Port 5173 is the reference baseline. NEVER touch it.** Never kill processes on 5173. Never restart it. Never cd into its directory. Never modify its files. Port 5173 is READ ONLY.
- **Port 5174 is J.D.'s working copy.** ALL work happens here, served from `~/Desktop/unitedtribes-pocv2-jd/` on branch `jd/design-reskin`.
- **The correct URL is `localhost:5174/jd-universes-poc/`.** Do not create additional URL routes. Do not serve changes at `/universes-poc/`. One URL path only.

### Design Bible & Project Docs
- The v2.8 design bible is the absolute specification for all visual decisions. It lives in the repo at `docs/v2.8.4-design-bible.html` — read it directly from there.
- When implementing any visual component, read the bible's CSS FIRST. Copy values exactly. Do not approximate.
- If in doubt about any visual detail, check the bible before guessing.
- **Key project documents in `docs/` — read at session start:**
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
1. **Read the diff first.** Use a subagent to analyze what changed and identify each discrete change.
2. **Classify each change as TAKE, REJECT, or ADAPT.** Evaluate whether each change conflicts with our design decisions (warm palette, inline follow-ups, omnipresent InputDock, left-aligned layout, etc.).
3. **Document the decision.** Create a merge decision doc in `docs/` explaining what was taken, what was rejected, and why — following the pattern in `docs/selective-merge-2f5aec5.md`.
4. **Never blindly merge.** Justin's branch may introduce styling, layout, or behavioral changes that undo our design work. Every line must be reviewed.
5. **After merging, verify API response parity.**

### API & Backend
- Do not modify API endpoints, keys, or backend configurations without explicit permission
- If responses differ between versions, the first step is always to diff the API configuration — check `.env` files, API URLs, request headers, and request body format. Do not guess.
- Never change environment variables or .env files without confirming with the user first
- **Response quality is a P0 concern.** If your version returns "I don't have detailed information" fallbacks while the reference returns rich responses with entities and discoveries for the same query, treat this as a critical bug. Debug the API pipeline immediately.

---

## Part 4: Component Integration Plan

### Status
Justin is building content rendering components on the `phase2-data-extraction` branch. **Components are NOT ready for integration yet.** Justin is waiting for Phase 3 API work to complete so he can test against real responses. He will hand off components + live API together so we're not wiring things up twice.

**Preview available:** Append `?test=content` to the URL to see all 4 mock scenarios (rich, moderate, sparse, no-content fallback).

### What's Coming from the API
The broker API (`POST /v2/broker`, `/v2/broker-gpt`, etc.) will return a new `content` field alongside the existing `narrative`:

```json
{
  "narrative": "Plain text narrative (unchanged, still works)...",
  "content": {
    "headline": "Pluribus: The Twilight Zone's Spiritual Successor",
    "summary": "Vince Gilligan's sci-fi series draws heavily from...",
    "sections": [
      { "type": "narrative", "text": "A paragraph..." },
      { "type": "media_callout", "media_type": "youtube", "url": "...", "title": "...", "context": "..." },
      { "type": "narrative", "text": "Another paragraph..." },
      { "type": "connection_highlight", "entity": "...", "relationship": "...", "follow_up_query": "..." },
      { "type": "media_callout", "media_type": "spotify", "url": "...", "title": "...", "context": "..." }
    ],
    "next_questions": [
      { "text": "What were the key influences?", "reason": "10 connections in knowledge graph" }
    ]
  }
}
```

- `sections` is an ordered array — render in sequence, top to bottom
- Three section types: `narrative` (text), `media_callout` (YouTube/Spotify/article embed), `connection_highlight` (tappable entity card)
- If `content` is missing, fall back to `narrative` as plain text

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

All components are individually exported — use `ContentRenderer` as-is, or pull out any piece and place it yourself.

The `PluribusComps.jsx` mirror rule does NOT apply to these components — they live in their own directory, not in App.jsx.

### Callback Wiring (CRITICAL)
- **`onFollowUp(queryString)`** → Feed into the existing `handleFollowUp` inline threading pipeline. This is a simple callback hook — NOT a page refresh. It must behave identically to a follow-up submitted via the InputDock: inline threading, model-switch preservation, collapsible ThreadEntries all preserved.
- **`onEntityTap(entityName)`** → Open the QuickView drawer for that entity. Same behavior as clicking entity links in the response prose.

### ResponseScreen Layout Order

```
┌─────────────────────────────────┐
│  ResponseHeader                 │  REPLACES the top of the response area.
│  (headline + summary)           │  This is the new response header.
├─────────────────────────────────┤
│  Content Sections (in order)    │  Prose at 740px max-width, left-aligned.
│  ├── NarrativeSection           │
│  ├── ConnectionHighlight        │  ← INLINE between paragraphs.
│  ├── NarrativeSection           │    Contextual callouts woven into response.
│  ├── MediaCallout               │    Different from discovery carousel cards.
│  └── NarrativeSection           │
├─────────────────────────────────┤
│  NextQuestions                   │  ← BETWEEN prose and Discovery.
│  (suggestion chips)             │    Discovery section takes continuous input
│                                 │    from queries and responses — updates as
│                                 │    conversation evolves.
├─────────────────────────────────┤
│  AI-Curated Discovery           │  Full-width discovery cards, cast, music.
│  (cards, cast, music)           │  Existing carousel system with images,
│                                 │  badges, Watch Trailer, Verified tags.
├─────────────────────────────────┤
│  InputDock (fixed bottom)       │  Omnipresent, feeds handleFollowUp.
└─────────────────────────────────┘
```

**Key layout decisions (confirmed by Justin):**
- **ResponseHeader** replaces the top of the response area — it IS the new header for structured content responses.
- **ConnectionHighlight** cards appear inline between paragraphs. They are contextual callouts woven into the response — NOT the same as discovery carousel cards below. Two different purposes: inline contextual callouts vs. browse/explore.
- **NextQuestions** sit between prose and AI-Curated Discovery. Can be imported independently and placed wherever makes sense.
- **MediaCallout** — Justin built the logic (video ID extraction, embed URLs, YouTube/Spotify/article handling). Sizing and design are J.D.'s call. TBD.

### Design Items — TBD (Do NOT Finalize Yet)
1. **MediaCallout** embed sizing and visual style — full prose-width? Constrained? Match Music & Sonic design language? J.D.'s decision.
2. **ConnectionHighlight** card visual design — border, background, icon, typography. Use Justin's minimal functional styling as placeholder until designed.

### Fallback Behavior
If `apiResponse.content` is missing, `ContentRenderer` falls back to `apiResponse.narrative` as plain text. This is the current rendering path — the existing ResponseScreen already renders `narrative` with EntityTag auto-linking. The fallback must preserve this existing behavior exactly.

---

## Part 5: Current State

- **Current version:** v0.9 (commit `a3f8774`)
- **Stable branch:** `main` (v0.9 needs to be pushed here — immediate first task)
- **Active development:** `jd/design-reskin`
- **Justin's components:** `phase2-data-extraction` (not ready yet — waiting for Phase 3 API)

### Open P0 Issues
1. SideNav navigation destroys search state — clicking any SideNav item on ResponseScreen loses all query/response/discovery state
2. Raw/unenhanced compare responses — need vanilla endpoints for Perplexity/Gemini
3. UnitedTribes logo/header font doesn't match v2.8 bible
4. Discovery card sizing inconsistency between filter states (All vs TV)

### Open P1 Issues
1. Entity animations use hardcoded placeholders — wire to actual entity data from knowledge graph
2. Entity click should toggle QuickView drawer (currently only opens, requires close button)
3. Preload raw compare responses in background after main response arrives
