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

## P0 Issues for Justin — BLOCKING Demo Quality

These two issues are the highest-priority blockers for making the C&C lobby demo-ready. Both require changes on the API/KG side — the client has been pushed as far as it can go with workarounds.

---

### P0 #1: Follow-Up Chips — Broker API Not Returning FOLLOW_UPS

**The problem:** The per-person inline conversation system (cast + creator cards on the C&C lobby) requests follow-up chip suggestions from the broker API via a `FOLLOW_UPS: Q1? | Q2? | Q3?` format at the end of each response. The API is **consistently ignoring this instruction** — it does not return the FOLLOW_UPS line in its responses. This forces the client to fall back to client-side chip generation that is fundamentally inadequate.

**Why this matters — the commerce thesis:** Follow-up chips are the primary discovery mechanism. They're what turns a static bio into a conversation. The entire C&C lobby is built around **DISCOVER → EXPLORE → ENGAGE → CONSUME → TRANSACT**. Without smart chips, users hit a dead end after reading the bio. The chips ARE the engagement layer — they're what make this feel like an LLM, not a website. Without them, the chain breaks at ENGAGE and the whole thing feels like a brochure.

**Why client-side fallbacks are fundamentally broken:**

1. **Regex can't understand content.** The current fallback parses the API response with regex looking for capitalized multi-word phrases (show titles, proper nouns). Every response mentions the same handful of Gilligan-universe titles — Breaking Bad, Better Call Saul, Pluribus. So every person's chips end up being "Gordon and Breaking Bad?" "Dave and Breaking Bad?" "Rhea and Better Call Saul?" — the same recycled titles in a formulaic `${firstName} and ${title}?` template.

2. **No understanding of what was actually said.** A good chip asks about the interesting thread the user would want to pull on. If the response says "Seehorn won a Golden Globe for her portrayal of Carol Sturka," a good chip would be "What was Rhea's Golden Globe speech about?" or "How did winning the Globe change things for Rhea?" Only an LLM can generate that kind of contextual follow-up — regex sees "Golden Globe" and generates "Rhea and Golden Globe?" which is flat and unimaginative.

3. **Repetitive across all people.** Because the KG context overlaps heavily (they all worked on the same shows), regex extraction finds the same entities for everyone. The chips look identical from person to person. This is the opposite of the personalized, contextual experience we're building.

4. **Repetitive across conversation turns.** Even with deduplication, the pool of extractable topics is so small that after 2-3 turns of conversation, the client has nothing new to suggest. The chips start repeating or fall back to completely generic questions.

**What we need from the API — two options:**

**Option A (preferred — no extra API calls):**
- The broker API should return follow-up suggestions as part of every response
- Format: `FOLLOW_UPS: Question one? | Question two? | Question three?` appended to the narrative
- 3 questions, pipe-separated, each under 8 words
- Questions must be specific to what was just said in THIS response, not generic
- Questions should vary — never repeat entities/topics already covered in prior conversation turns
- The prompt already includes this instruction but the underlying LLM is not complying — may need to be a **system-level instruction** or **structured output enforcement** rather than a user prompt suffix
- **Prompt engineering note:** Instructions at the END of long prompts are frequently dropped by LLMs. Moving FOLLOW_UPS to the TOP of the prompt and making it structural (requiring a specific output format like `RESPONSE: ... CHIPS: ...`) may force compliance without any API changes

**Option B (reliable but doubles API calls):**
- After each bio or conversation response loads, fire a short dedicated second call: "You just told us [summary] about [person]. Suggest 3 specific, varied follow-up questions a curious fan would ask next."
- This is reliable because the LLM actually understands the content it just generated
- Downside: doubles API calls — 12 extra for initial bios, plus 1 per conversation response
- Should only be used if Option A cannot be made to work

**Where it fires in the codebase:** There are 4 total chip generation points in App.jsx:
1. **Creator bio load** — useEffect that fires when "Explore the Creators" opens. Search for `"BEYOND GILLIGAN"` to find the prompt.
2. **Cast bio load** — useEffect that fires when "Explore the Cast" opens. Search for `"CAREER:"` to find the prompt.
3. **Creator inline conversation** — `handleCreatorCardAsk()` function. Search for that name.
4. **Cast inline conversation** — `handleCastCardAsk()` function. Search for that name.

All 4 include the `FOLLOW_UPS:` instruction in their prompts and have parsing logic that looks for the pipe-separated format. All 4 fall back to the regex extraction when the API doesn't comply.

**Current workaround:** Client-side regex extraction of titles/topics from response text, with formulaic chip templates. Produces repetitive, non-contextual chips that undermine the LLM feel. **Not acceptable for demo.**

---

### P0 #2: Career / Non-Pluribus Work Not Surfacing from KG

**The problem:** This affects both sides of the Cast & Creators page. Creator bios ask for a "BEYOND GILLIGAN" section; cast bios ask for a "CAREER" section. Both are supposed to highlight each person's work *outside* Pluribus and the Gilligan universe — their broader career, their other credits, what else they've done. The API responses are either vague, repeat Gilligan/Pluribus work, or return nothing useful.

**Why this matters:** The discovery thesis depends on showing users what ELSE these people have done. If every bio just talks about Pluribus and Breaking Bad, we're not discovering anything — we're just confirming what the user already knows. The "Beyond Gilligan" / "Career" section is supposed to be the moment where the user says "Oh, I didn't know Dave Porter scored Godzilla" or "Wait, Miriam Shor was in Hedwig?" That's the discovery → commerce moment. Without it, every person on the page feels the same.

**CREATORS — what we know exists but isn't surfacing:**
- **Gordon Smith** — career prior to Gilligan, other writing/directing credits
- **Dave Porter** — scored Godzilla: King of the Monsters, The Blacklist, and other film/TV projects
- **Thomas Golubic** — music supervised The Walking Dead, Six Feet Under, Halt and Catch Fire, Nurse Jackie — one of the most prolific music supervisors in TV history
- **Alison Tatlock** — other TV writing credits beyond BCS
- **Jenn Carroll** — writing credits beyond BCS
- **Marshall Adams** — cinematography credits on other series/films

**CAST — what we know exists but isn't surfacing:**
- **Rhea Seehorn** — Better Call Saul (Kim Wexler), Whitney, Franklin & Bash, extensive theater career
- **Karolina Wydra** — True Blood, House M.D., Agents of S.H.I.E.L.D., European film career
- **Samba Schutte** — Our Flag Means Death, NCIS, stand-up comedy, Dutch-Surinamese background
- **Carlos-Manuel Vesga** — major Colombian film/TV career, international work
- **Miriam Shor** — Younger, Hedwig and the Angry Inch, Sweeney Todd on Broadway
- **John Cena** — Peacemaker, The Suicide Squad, Trainwreck, Bumblebee, WWE career (16x world champion)

**Root cause:** The KG entity data for both crew AND cast is thin on non-Pluribus/non-Gilligan work. `completeWorks` is empty for most crew members, and cast bios are brief. The prompt includes seed examples to nudge the LLM's general knowledge, but the broker API anchors heavily on the KG context and won't go beyond it.

**What we need (one or both):**
1. **Enriched KG data** — `completeWorks` populated with non-Gilligan/non-Pluribus credits for both cast and crew. This is the best long-term fix because it makes the data durable and verifiable.
2. **Broker API configured to blend KG + general knowledge** — When KG data is sparse for a well-known person, the API should be willing to draw on the LLM's general knowledge (with appropriate confidence framing). Right now it seems to treat KG context as the ceiling rather than the floor.

**Where it fires in the codebase:**
- Creator bio enrichment useEffect in App.jsx — search for `"BEYOND GILLIGAN"` to find the prompt
- Cast bio enrichment useEffect — search for `"CAREER:"` to find the prompt
- Both use staggered per-person API calls (300ms between requests)

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
