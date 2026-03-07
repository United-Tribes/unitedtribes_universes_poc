# v1.5.3 — Cast & Creators Lobby: Conversations, Cascading Bios, and the LLM Discovery Model

**Date:** March 6, 2026
**Branch:** `jd/design-reskin-v3`
**Repo:** `United-Tribes/unitedtribes_universes_poc`
**Port:** 5174
**Commits:** `499b919` → `f872964` (18 commits)

---

## What This Version Accomplishes

v1.5.3 transforms the Cast & Creators lobby from a static grid of names into an **LLM-powered discovery surface**. The thesis: content should materialize from the Knowledge Graph, not load like a website. Every person on this page — cast and creators alike — now has a living, conversational card where users can explore, ask questions, and follow threads.

This is the first implementation of the **per-person inline conversation model** — the idea that you may never need to leave the lobby page because the lobby itself is the discovery engine.

---

## What We Built

### Lobby Redesign
- **Dual spotlight layout**: Vince Gilligan (creator) and Rhea Seehorn (lead) anchoring the page
- **Warm palette** (`C`): cream bg `#f0ece4`, navy `#1a2744`, gold `#f5b800`, link blue `#1565c0`, app green `#16803c`
- **Hybrid intro**: Reliable client-side text establishing the ensemble + single dynamic API sentence appended for freshness. First-sentence extraction prevents runaway LLM output.
- **"Explore the Creators" / "Explore the Cast"** — two gateway chips that expand independently. Only one active at a time, but content is preserved when you switch between them (no re-fetching).

### Creator Profiles (6 people, grouped)
- **Gordon Smith** (Gilligan's Right Hand) — Executive Producer, Writer & Director
- **Dave Porter** (Music & Sound) — Composer
- **Thomas Golubic** (Music & Sound) — Music Supervisor
- **Alison Tatlock** (Writers' Room) — Executive Producer & Writer
- **Jenn Carroll** (Writers' Room) — Co-Executive Producer & Writer
- **Marshall Adams** (Visual Identity) — Cinematographer

Each creator gets:
- **3-section bio from API**: ON PLURIBUS / GILLIGAN UNIVERSE / BEYOND GILLIGAN
- **Cascading reveal**: 300ms stagger between API calls, content materializes person by person
- **Follow-up chips**: Generated from the response content (not hardcoded)
- **Inline ask bar**: Matches Rhea Seehorn cast detail page exactly — gold border, `borderRadius: 20`, `askPulse` animation
- **Per-person conversation thread**: Full conversation history with thinking indicator, response, and follow-up chips per response
- **"Dig deeper on [Full Name]"** link to future detail page

### Cast Profiles (6 people)
- **Rhea Seehorn** as Carol Sturka — Lead
- **Karolina Wydra** as Zosia — Key Cast
- **Samba Schutte** — Key Cast
- **Carlos-Manuel Vesga** as Manousos Oviedo — Key Cast
- **Miriam Shor** as Helen L. Umstead — Key Cast
- **John Cena** as Himself (HDP commercial cameo, Episode 6) — Guest Star

Same treatment as creators:
- **2-section bio from API**: ON PLURIBUS / CAREER
- Cascading reveal, follow-up chips, inline ask bar, per-person conversations
- Photo fallback chain: `photoUrl` → `posterUrl` → initials avatar

### Conversation System
- **LobbyThinkingIndicator**: Cycling KG step text with gold strobe animation (used in both bio loading and inline conversations)
- **Per-person state isolation**: Each person has their own conversation array, input state, and loading state
- **Conversation context**: Each follow-up includes the person's bio, prior conversation history (last 2 turns), and KG context
- **Chip styling matches Rhea page exactly**: `C.bg2` background, `C.border` border, `borderRadius: 18`, gold star prefix, hover to `#fffdf5` with gold border

### Independent Expand/Collapse
- `lobbyExpanded: { cast: bool, creators: bool }` — each section toggles independently
- Only one section highlighted at a time (the active one gets gold border + cream background)
- **State preserved**: Switching from Creators to Cast and back preserves all loaded bios, conversations, chips, and ask bar input. No re-fetching.
- Fixed a bug where the bio fetch guard checked `?.bio` (which is `null` when 3-section parsing succeeds) instead of checking for the actual parsed sections

---

## Known Issues & P0s for Justin

### P0: Follow-Up Chips — Broker API Not Returning FOLLOW_UPS

**The problem:** Every prompt asks the broker API to end with `FOLLOW_UPS: Q1? | Q2? | Q3?`. The API consistently ignores this instruction. The client falls back to generating chips from the response text using regex, which is fundamentally broken:

- **Regex can't understand content.** It matches capitalized phrases, which are always the same Gilligan-universe titles. Every person gets "X and Breaking Bad?" chips.
- **No understanding of what was actually said.** If the response mentions a Golden Globe win, a good chip would ask about the acceptance speech. Regex can't do that.
- **Repetitive across all people.** The KG context overlaps heavily, so regex finds the same entities for everyone.

**Why this matters:** The chips ARE the engagement layer. They're what turns a bio into a conversation and makes this feel like an LLM, not a website. Without smart chips, the DISCOVER → EXPLORE → ENGAGE → CONSUME → TRANSACT chain breaks at ENGAGE.

**Two fix options:**

1. **Option A (preferred):** Make the broker API return FOLLOW_UPS as part of every response. The prompt instruction may need to move to a system-level instruction or use structured output enforcement — instructions at the end of long prompts are frequently dropped by LLMs.

2. **Option B (reliable but expensive):** After each response, fire a short dedicated second API call: "You just told us [summary] about [person]. Suggest 3 specific follow-up questions." Doubles API calls but guarantees quality.

**Where it fires:** 4 chip generation points in App.jsx — search for "FOLLOW_UPS:" to find all of them. `handleCastCardAsk()`, `handleCreatorCardAsk()`, creator bio useEffect, cast bio useEffect.

### P0: Career / Non-Pluribus Work Not Surfacing

**The problem:** Creator bios ask for "BEYOND GILLIGAN" and cast bios ask for "CAREER" sections. Both are supposed to highlight work outside Pluribus/Gilligan. The API either returns vague text, repeats Gilligan/Pluribus work, or returns nothing useful.

**What we know exists but isn't surfacing:**
- Dave Porter — Godzilla: King of the Monsters, The Blacklist
- Thomas Golubic — The Walking Dead, Six Feet Under, Halt and Catch Fire, Nurse Jackie
- Rhea Seehorn — Better Call Saul (Kim Wexler), Whitney, Franklin & Bash, theater
- Karolina Wydra — True Blood, House M.D., Agents of S.H.I.E.L.D.
- Samba Schutte — Our Flag Means Death, NCIS, Dutch-Surinamese background
- Miriam Shor — Younger, Hedwig and the Angry Inch, Sweeney Todd on Broadway
- John Cena — Peacemaker, The Suicide Squad, Trainwreck, WWE career

**Root cause:** KG entity data is thin on non-Pluribus/non-Gilligan work. `completeWorks` is empty for most people. The prompt seeds examples but the broker API anchors too heavily on KG context.

**What we need:** Either enriched KG data (`completeWorks` populated) or the broker API configured to blend KG facts with broader LLM knowledge when KG data is sparse. This is critical for the discovery thesis — users should discover what ELSE these people have done.

---

## Saved for Later

- **Gilligan timeline strip**: Horizontal career chronology (X-Files → Breaking Bad → BCS → El Camino → Pluribus). Code preserved in git history. Would work well on crew detail pages.
- **Rat-a-tat streaming**: Content streaming word-by-word for an even more LLM-like feel
- **Work cards / relationship cards**: Structured content cards within conversation threads
- **Deep dive modals**: J.D. is considering modals instead of separate detail pages for cast/creators
- **Sonic connection**: Music-linked discovery from within person cards

---

## Architecture Notes

### Key State Variables
```
lobbyExpanded: { cast: bool, creators: bool }  // independent expand/collapse
lobbyExplore: string | null                     // compat layer for castPathAskRef
creatorBios: { [name]: { pluribus, gilliganUniverse, beyondGilligan, followUps, loading, error } }
castBios: { [name]: { onPluribus, career, followUps, loading, error } }
creatorCardConvo: { [name]: [{ query, response, loading, error, followUps }] }
castCardConvo: { [name]: [{ query, response, loading, error, followUps }] }
creatorCardInput: { [name]: string }
castCardInput: { [name]: string }
```

### API Pattern
- Bio enrichment: One `POST /v2/broker` call per person, staggered 300ms
- Inline conversation: One `POST /v2/broker` call per question, scoped to person with full conversation context
- Hybrid intro: Client-side foundation + one API call for a single dynamic sentence

### Key Code Locations (search terms for App.jsx)
- `CREATOR_PROFILES` — creator data constant
- `CAST_PROFILES` — cast data constant
- `handleCreatorCardAsk` — creator inline conversation handler
- `handleCastCardAsk` — cast inline conversation handler
- `lobbyExpanded` — expand/collapse state
- `FOLLOW_UPS:` — chip parsing logic (4 instances)
- `ON PLURIBUS:` — bio section parsing
- `BEYOND GILLIGAN:` — creator career section
- `LobbyThinkingIndicator` — thinking animation component
- `data-explore-creators` / `data-explore-cast` — gateway chip elements

---

## Commit Log

```
f872964  P0 tracker: expanded FOLLOW_UPS detail — why client-side chips fail, two fix options for Justin
96c0d27  Version tracker: update commit hash 14a8ca6
14a8ca6  Independent expand/collapse for Cast & Creators sections — state preserved across toggles
ba0c7ed  P0 tracker: expand career/non-Pluribus work issue to cover both cast AND creators
ece2b56  P0 tracker: Beyond Gilligan / Career bios not pulling non-Gilligan work from KG
c72b717  Version tracker: update commit hash 2077115
2077115  Cast profiles with cascading bios, inline conversations, P0 chips tracker
c68389c  Version tracker: update commit hash ad10f48
ad10f48  Hybrid lobby intro: reliable client-side foundation + dynamic API detail
038f90b  Version tracker: update commit hash 87c6f62
87c6f62  API-driven creator bios with 3-section structure and cascading reveals
a7b26f0  Version tracker: update commit hash 2631bf0
2631bf0  Per-creator chips, ask bars, and inline conversations on creators cards
22d4749  Version tracker: update commit hash c6e1d44
c6e1d44  Structured creator profiles, LLM-like polish
95020ed  Version tracker: update commit hash 4f68954
4f68954  Path convos, people-focused prompts, gentle eased scroll
59ea49c  Version tracker: update commit hash c0c4595
c0c4595  Explore paths: API-driven intro slugs for cast & creators
682f18f  Version tracker: update commit hash 1dd7089
1dd7089  Lobby conversation thread: inline ask bar, thinking pill, popover routing
e6f1096  Lobby: path chips gate cast/crew grids, fix cast photos, Golden Globe badge
76727e7  Lobby redesign: dual spotlight, warm palette, API intro, compact cast grid
2e1480e  Cast view transitions: slower fade-out (350ms) + fade-in (1s) for LLM-like feel
499b919  v1.5.3: version bump + tracker card
```
