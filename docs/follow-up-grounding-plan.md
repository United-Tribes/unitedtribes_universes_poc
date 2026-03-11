# Follow-Up Question Grounding — Implementation Plan

> **Status:** Draft for review
> **Date:** Mar 9, 2026
> **Author:** Justin + Claude
> **Reviewer:** JD

---

## Problem

When the LLM generates responses, it often suggests follow-up questions like "To delve deeper, you might explore..." These suggestions are **not grounded in KG data** — the LLM freely invents topics that may have little or no data behind them. When a user clicks one of these follow-ups, the resulting response can be thin, hallucinated, or off-topic because the graph doesn't have rich information about the suggested topic.

### What we tried

We attempted adding a "section 11" to `buildKGContext()` that instructed the LLM to only suggest follow-ups about topics in the provided data. This **degraded overall response quality** — the prompt was already long (~2,000 tokens of KG context), and adding follow-up instructions with entity lists pushed the LLM toward shorter, worse narratives.

---

## Proposed Approach: Client-Side Suggestion Chips

Instead of asking the LLM to generate grounded follow-ups (prompt-side), generate them **locally from the KG data already loaded in the browser**. This guarantees every suggestion maps to rich data, adds zero prompt overhead, and is instant.

### How it works

1. **After each response renders**, generate 3-4 follow-up suggestion chips based on:
   - The **current query intent** (via existing `getIntentDirective` categories: CAST/CREW/MUSIC/INFLUENCES/THEMES)
   - The **entities mentioned in the response** (already parsed by `linkEntities`)
   - The **entity types and topics NOT yet explored** in the conversation

2. **Context-aware rotation** — suggest topics the user *hasn't* asked about yet:
   | If user asked about... | Suggest exploring... |
   |------------------------|---------------------|
   | Cast / characters | Influences, music, themes |
   | Music / sonic | Cast connections, literary influences |
   | Influences / films | Thematic parallels, episode moments |
   | Themes | Specific characters, specific influences |
   | General / overview | Cast, music, key influences |

3. **Suggestion templates** — each chip is built from real entity names + a question frame:
   ```
   "How did {influence} shape Pluribus?" → picks from Key Influences group
   "What role does {person} play behind the scenes?" → picks from crew entities
   "How does the theme of {theme} evolve across episodes?" → picks from theme data
   "What music defines {episode_title}?" → picks from episode + songs data
   "How does {character}'s story connect to {influence}?" → cross-entity suggestion
   ```

4. **Data sources** (all already loaded client-side):
   - `entities` object — 87 entities with types, bios, relationships
   - `responseData.discoveryGroups` — Key Influences (35), Cast (29), BTS (8), Music (12)
   - `responseData.themeVideos` — 10 themes with character moments
   - `responseData.songs` — 34 needle drops by episode
   - `responseData.episodes` — 9 episodes with themes, cast, music

### Integration with JD's existing chip UI

JD has already built a system that extracts follow-up suggestions from the LLM narrative and renders them as clickable chips. The proposed approach would:

- **Replace the source** of those chips (KG-generated instead of LLM-extracted)
- **Keep the same chip UI** JD has built — `NextQuestions` component or equivalent
- **Keep the same click behavior** — clicking a chip fires it as a follow-up query via `handleFollowUp`

**Key question for JD:** How are follow-ups currently extracted from the LLM response on your branch? Is it regex parsing of the narrative text, or a structured field from the broker API? This determines how cleanly we can swap the source.

### Suggested component structure

```jsx
function SuggestedFollowUps({ query, entities, responseData, onFollowUp, followUpResponses }) {
  const suggestions = useMemo(() => {
    // 1. Detect what the user already asked about
    const askedTopics = [query, ...followUpResponses.map(f => f.query)];
    const intent = getIntentDirective(query); // reuse existing classifier

    // 2. Build candidate pool from KG data (exclude already-discussed topics)
    const candidates = buildCandidateQuestions(entities, responseData, intent, askedTopics);

    // 3. Pick 3-4 diverse suggestions (different types/categories)
    return pickDiverse(candidates, 4);
  }, [query, entities, responseData, followUpResponses]);

  if (!suggestions.length) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
      {suggestions.map((s, i) => (
        <button key={i} onClick={() => onFollowUp(s.text)}
          style={{ /* chip styles */ }}>
          {s.text}
          {s.category && <span style={{ opacity: 0.6 }}>{s.category}</span>}
        </button>
      ))}
    </div>
  );
}
```

### Placement in response flow

Render the suggestion chips **below the narrative text, above the discovery cards** — in the same position where follow-up response bubbles appear. When the user clicks a chip, it becomes a follow-up query and the chips disappear (replaced by the new response).

---

## What this does NOT change

- **LLM prompt** (`buildKGContext`) — no changes, keeps current 10 sections
- **Follow-up handling** (`handleFollowUp`) — same flow, chips just pre-fill the input
- **Response rendering** — narrative text stays the same
- **Broker API** — no API changes needed

## Open questions for JD

1. **Your chip extraction**: How does your branch currently pull follow-ups from the LLM response? Should we keep that as a fallback alongside KG-generated chips?
2. **Chip styling**: Should KG-generated chips look different from LLM-suggested ones (e.g., a small icon or label indicating "Explore" vs "Suggested")?
3. **Position**: Below narrative / above discovery cards — or somewhere else?
4. **Count**: 3-4 chips feel right? More feels cluttered, fewer feels sparse.
5. **Cross-entity suggestions**: The richest follow-ups connect two entities (e.g., "How does Carol Sturka's immunity connect to Village of the Damned?"). These require knowing which entities are thematically related. Worth the complexity or keep it simple with single-entity questions?

---

## Implementation estimate

- `buildCandidateQuestions()` function: ~80 lines (reads entities, groups, themes, songs, episodes)
- `pickDiverse()` function: ~20 lines (ensures variety across categories)
- `SuggestedFollowUps` component: ~40 lines (renders chips, handles click)
- Wire into `ResponseScreen`: ~5 lines
- Total: ~150 lines, contained change, no prompt or API modifications
