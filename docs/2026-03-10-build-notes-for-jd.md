# Build Notes for JD — March 10, 2026

Today's build covers 4 areas: editorial intelligence improvements, new entity linking, podcast audio playback, and multi-universe video analysis processing. All pushed to main on both repos. KG synced (41,643 total relationships).

---

## 1. Editorial Headlines + Intent-Aware Sources

**The problem:** The broker API returns a narrative with a truncated first sentence as the "headline" — often cut mid-word or missing context. Source citations were also sometimes generic (episode recaps) instead of topically relevant.

**What changed:**

- **`generateEditorialHeadline()`** — New function that replaces the broker's truncated headline with a query-aware editorial headline grounded in KG entity data. When you ask about Rhea Seehorn, you get "Rhea Seehorn — Golden Globe Winner, Star of Pluribus" instead of "Rhea Seehorn is an American actress who..."

- **Intent-aware source fallback** — When no entities directly match the query, the system now classifies query intent (MUSIC, CREW, CAST, THEMES, INFLUENCES) and injects the most relevant entities *first* before falling back to the Pluribus anchor. Ask about "the music" and sources prioritize Dave Porter and Thomas Golubic content. Ask about "the cast" and Rhea Seehorn sources come first. Previously all fallback queries got generic Pluribus episode recaps.

- **"John Cena as John Cena" fix** — Self-playing actors (where actor name = character name) no longer show the redundant "as themselves" headline pattern.

**Where you'll see it:**
- Response screen: the bold headline above the narrative text
- Sources section: more relevant citations when queries don't mention specific names

---

## 2. New Entity Linking + Episode Expansion

**New linkable entities (click to see popover):**
- **Kim Wexler** — Better Call Saul character, played by Rhea Seehorn (promoted to tier 2, enriched)
- **Saul Goodman** — Breaking Bad / Better Call Saul character, played by Bob Odenkirk (promoted to tier 2, enriched)
- **Golden Globe** / **Golden Globes** — Award entity with subtitle "Rhea Seehorn, Best Actress - Drama (2026)"
- **Critics' Choice** — Award entity with same context
- **HDP** — Now linkable as episode (minimum title length lowered to 3 chars). HDP expansion ("Human Derived Protein") is grounded in LLM context to prevent hallucination.

**Episode reference expansion:**
- When the LLM narrative mentions "Episode 7", it now renders as **"Episode 7: The Gap"** — the full title is appended and the reference is clickable, navigating directly to the Episode Detail screen.
- Works for all 9 episodes (e.g., "Episode 3" → "Episode 3: Grenade")

**Episode data restored:**
- All 9 episodes restored to `pluribus-response.json` (were accidentally lost during a re-assembly run — the `buildEpisodes()` issue documented in the gotchas)

**Where you'll see it:**
- Any narrative that mentions Kim Wexler, Saul Goodman, Golden Globe, Critics' Choice, or HDP now has clickable entity links
- Episode references in narratives are expanded with full titles and navigate to episode detail on click

---

## 3. Podcast Audio Playback (S3 Registry Integration)

Shanan uploaded 47 audio podcasts to S3. 19 are Pluribus-specific: 9 full official podcast episodes (one per episode), 8 bonus cast/crew interviews, and 2 standalone interviews (Rhea Seehorn on Fresh Air, Vince Gilligan on The Business).

**Where you'll see it:**

- **Entity Popovers** — Click on an entity that has a matching podcast (e.g., Miriam Shor, Rhea Seehorn, Vince Gilligan) and you'll see a new gold **podcast card** below any existing YouTube videos. The card has a waveform icon and "PODCAST" badge.

- **Audio Modal** — Click a podcast card and a new audio modal opens with an HTML5 audio player. Narrower than the video modal (480px vs 640px, no video frame needed) with a gold waveform visualization. Audio plays directly from S3.

- **Source Citations** — When you ask a question about someone who has a matching podcast (e.g., "Tell me about Miriam Shor"), the podcast appears in the Sources section below the response with a gold "Podcast" badge and play icon. Click to open the audio modal.

- **Source Popover** — Click a podcast citation and the source popover shows podcast artwork (waveform bars), a gold "Podcast" badge, and a gold "Listen to Podcast" button instead of "Watch on YouTube".

**Entity-to-podcast matching is automatic:**
- Bonus episodes: parsed from title (e.g., "S1E3Bonus:Miriam Shor" → matches "Miriam Shor" entity)
- Standalone interviews: fuzzy matched against entity names (e.g., "Star Of 'Pluribus' Rhea Seehorn" → matches "Rhea Seehorn")
- Full episodes: mapped to episode numbers for future Episode Detail integration

**Pluribus podcast entries (19 total):**

| Type | Count | Examples |
|------|-------|---------|
| Full podcast episodes | 9 | S1E1Full:We Is Us through S1E9Full:La Chica o El Mundo |
| Bonus interviews | 8 | Nito Larioza, Marshall Adams, Miriam Shor, Zetna Fuentes, Mark Hansen, Jennifer Bryan, Paul Donachie, The Sound Team |
| Standalone interviews | 2 | Rhea Seehorn (Fresh Air), Vince Gilligan (The Business) |

**Design details:**
- Gold accent (`#f5b800`) for all podcast UI — consistent with brand
- Waveform bar visualization (navy background) instead of YouTube thumbnail
- "PODCAST" badge in gold vs "Video" badge in green
- Audio player styled for dark-mode appearance on navy background

---

## 4. Video Analysis Pipeline — 582 Videos Across 7 Universes

Processed the full JDsVideos folder (820 source directories) through the harvester's `process-video-analysis.mjs` pipeline, correctly separated by universe. The 101 baseline directories (already in KG from January) were excluded. 137 directories were excluded by content (Beatles, Tupac, Amy Winehouse, AC/DC, Joe Rogan, Baz Luhrmann, etc. — same exclusions Shanan applied).

**Output on main:** `harvester/data/video-analysis-kg-by-universe/`

| Universe | Videos Processed | Relationships Generated |
|----------|-----------------|------------------------|
| Pluribus | 131 | 8,435 |
| Sinners | 184 | 10,898 |
| Greta Gerwig | 107 | 5,976 |
| Blue Note | 96 | 4,770 |
| Patti Smith | 36 | 1,689 |
| Bob Dylan | 18 | 1,176 |
| Breaking Bad | 10 | 749 |
| **Total** | **582** | **~33,700** |

**KG Sync triggered:** `POST /v2/sync-harvester` — +21 new relationships (41,643 total). The video analysis JSONs for non-Pluribus universes are on main, ready for Shanan's multi-universe ingestion.

---

## 5. Follow-Up Question Grounding Plan

Wrote a plan for improving follow-up question relevance using client-side suggestion chips generated from KG data (not LLM prompt modifications — that approach was tried first but degraded response quality). The plan is at `docs/follow-up-grounding-plan.md` — waiting for JD's review on how this integrates with the existing chip extraction in his branch.

---

## How to Test

1. `npm run dev` in the POC repo
2. Ask **"Who is Kim Wexler?"** → headline should be editorial (not truncated), Kim Wexler should be a clickable entity link
3. Ask **"Tell me about the music"** → sources should prioritize Dave Porter / Thomas Golubic content, not generic episode recaps
4. Look for **"Episode 7: The Gap"** in any narrative that mentions Episode 7 — should be clickable
5. Click **Miriam Shor** → popover shows YouTube videos + gold podcast card → click card → audio plays
6. Click **Rhea Seehorn** → Fresh Air interview podcast appears
7. Ask **"Tell me about Miriam Shor"** → Sources section includes podcast with gold badge and play button
8. Verify YouTube videos still work normally (no regression)

## What's Next

- JD to review follow-up grounding plan (`docs/follow-up-grounding-plan.md`)
- Shanan to ingest multi-universe video analysis JSONs for Sinners, Greta Gerwig, Blue Note, Patti Smith, Bob Dylan, Breaking Bad
- Episode Detail screen could surface full podcast episode + bonus interview per episode (data already mapped via `podcastsByEpisode`)
- Deploy POC to S3 (`bash deploy.sh`)
