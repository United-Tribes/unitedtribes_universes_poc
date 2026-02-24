# Frontend Integration Briefing: Content Rendering Components

> **Date:** February 24, 2026
> **From:** Justin
> **For:** Frontend colleague working on Universes POC design
> **Full work plan:** `llm-test/RESPONSE_QUALITY_WORK_PLAN.md`
> **Updated with J.D.'s integration decisions:** February 24, 2026

---

## What's Happening

We're improving the quality of API responses from the UnitedTribes broker API. The API now returns a new `content` field alongside the existing `narrative` field. This `content` field contains structured, typed content blocks — text paragraphs, YouTube/Spotify embeds, entity cards, and follow-up question suggestions — that the frontend can render as a rich, interactive response instead of a plain text wall.

## How We've Split the Work

The frontend work is split into two layers to avoid conflicts and let us work in parallel:

**Justin (data/logic layer):**
- Builds a set of self-contained React components in `components/content/`
- These components parse the API's `content` field and render each section type
- They are minimally styled — just enough CSS to be functional (iframe dimensions, basic flex layout)
- They expose callbacks (`onFollowUp`, `onEntityTap`) but don't know about routing or app state

**You (design/presentation layer):**
- Import Justin's components into your screen designs
- Apply your design system — typography, colors, spacing, layout, dark/light theme
- Wire the callbacks to your navigation and query submission flows
- Decide where `ResponseHeader`, content sections, and `NextQuestions` sit in your layouts

This means **you don't need to understand the API response structure** and **Justin doesn't make design decisions**. No shared files, clean merges.

---

## The API Response (What's New)

The broker API (`POST /v2/broker`, `/v2/broker-gpt`, etc.) now returns a `content` field alongside the existing `narrative`. Here's what it looks like:

```json
{
  "narrative": "Plain text narrative (unchanged, still works as before)...",
  "content": {
    "headline": "Pluribus: The Twilight Zone's Spiritual Successor",
    "summary": "Vince Gilligan's sci-fi series draws heavily from classic horror and The Twilight Zone, using themes of conformity and identity loss.",
    "sections": [
      {
        "type": "narrative",
        "text": "A paragraph of the response text..."
      },
      {
        "type": "media_callout",
        "media_type": "youtube",
        "url": "https://youtube.com/...",
        "title": "The Twilight Zone: Eye of the Beholder",
        "context": "See the episode that most directly inspired Pluribus's central theme",
        "timestamp": 122
      },
      {
        "type": "narrative",
        "text": "Another paragraph continuing the story..."
      },
      {
        "type": "connection_highlight",
        "entity": "Invasion of the Body Snatchers",
        "relationship": "Influenced Pluribus's themes of paranoia and conformity",
        "follow_up_query": "Tell me about Invasion of the Body Snatchers' influence on Pluribus"
      },
      {
        "type": "media_callout",
        "media_type": "spotify",
        "url": "spotify:track:xxxxx",
        "title": "Moment's Notice",
        "context": "The track that captures the tension of the Hive Mind reveal"
      }
    ],
    "next_questions": [
      {
        "text": "What were the key influences on Pluribus?",
        "reason": "10 influence connections in the knowledge graph"
      },
      {
        "text": "How does Pluribus connect to Breaking Bad?",
        "reason": "233 shared relationships through Vince Gilligan"
      }
    ]
  },
  "connections": { ... },
  "recommendations": { ... }
}
```

**Key points:**
- `sections` is an ordered array — render them in sequence, top to bottom
- Three section types: `narrative` (text), `media_callout` (embeddable media), `connection_highlight` (tappable entity card)
- `next_questions` go below the response as suggestion chips
- If `content` is missing, fall back to rendering `narrative` as plain text

---

## The Components You'll Receive

Justin will deliver a `components/content/` directory with these components:

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

### Props and Callbacks

| Component | Props In | Callbacks Out |
|-----------|----------|---------------|
| `ContentRenderer` | `apiResponse` (full API JSON) | `onFollowUp(queryString)`, `onEntityTap(entityName)` |
| `NarrativeSection` | `text` | — |
| `MediaCallout` | `media_type`, `url`, `title`, `context`, `timestamp?` | — |
| `ConnectionHighlight` | `entity`, `relationship`, `follow_up_query`, `image_url?` | `onTap(follow_up_query)` |
| `NextQuestions` | `questions[]` (each: `text`, `reason`) | `onSelect(questionText)` |
| `ResponseHeader` | `headline`, `summary` | — |

### How to Use Them

The simplest integration:

```jsx
import { ContentRenderer } from '../components/content';

function ResponseScreen({ apiResponse, onSubmitQuery, onNavigateToEntity }) {
  return (
    <div className={styles.yourResponseLayout}>
      <ContentRenderer
        apiResponse={apiResponse}
        onFollowUp={(query) => onSubmitQuery(query)}
        onEntityTap={(entity) => onNavigateToEntity(entity)}
      />
    </div>
  );
}
```

Or use the sub-components individually if you want more layout control:

```jsx
import {
  ResponseHeader,
  NarrativeSection,
  MediaCallout,
  ConnectionHighlight,
  NextQuestions
} from '../components/content';

function ResponseScreen({ apiResponse }) {
  const { content } = apiResponse;

  return (
    <div className={styles.yourLayout}>
      <ResponseHeader
        headline={content.headline}
        summary={content.summary}
      />

      {content.sections.map((section, i) => {
        switch (section.type) {
          case 'narrative':
            return <NarrativeSection key={i} text={section.text} />;
          case 'media_callout':
            return <MediaCallout key={i} {...section} />;
          case 'connection_highlight':
            return (
              <ConnectionHighlight
                key={i}
                {...section}
                onTap={(query) => handleFollowUp(query)}
              />
            );
        }
      })}

      <NextQuestions
        questions={content.next_questions}
        onSelect={(query) => handleFollowUp(query)}
      />
    </div>
  );
}
```

---

## What You Need to Do

### 1. Apply Your Design System
Justin's components have minimal styling (functional only). You wrap them or override their styles with your design system:
- Typography for narrative text, headlines, summaries
- Colors and theming (dark/light)
- Spacing and layout within your screen designs
- Card styles for `ConnectionHighlight` and `MediaCallout`
- Chip/button styles for `NextQuestions`

### 2. Wire Callbacks to Your Navigation
The components fire two callbacks that you connect to your app:
- **`onFollowUp(queryString)`** — User tapped a next question or follow-up suggestion. **This must feed into the existing `handleFollowUp` inline threading pipeline — NOT trigger a page refresh or ThinkingScreen reload.** The v0.9 architecture preserves conversation context with inline threading, model-switch preservation, and collapsible ThreadEntries. `onFollowUp` should behave identically to a follow-up submitted via the InputDock.
- **`onEntityTap(entityName)`** — User tapped an entity card. Open the QuickView drawer for that entity (same behavior as clicking entity links in the response prose).

### 3. Layout Placement (J.D.'s Decisions)

The ResponseScreen layout order is:

```
┌─────────────────────────────────┐
│  ResponseHeader                 │  ← headline + summary (TBD: relationship
│  (headline + summary)           │    to existing "Enhanced Discovery" badge)
├─────────────────────────────────┤
│  Content Sections (in order)    │  ← prose constrained to 740px max-width
│  ├── NarrativeSection           │    left-aligned (not centered)
│  ├── ConnectionHighlight        │  ← INLINE between paragraphs, not in
│  ├── NarrativeSection           │    discovery carousel below
│  ├── MediaCallout               │  ← design TBD (sizing, embed style)
│  └── NarrativeSection           │
├─────────────────────────────────┤
│  NextQuestions                   │  ← sits BETWEEN response prose and
│  (suggestion chips)             │    AI-Curated Discovery. Discovery section
│                                 │    takes continuous input from queries
│                                 │    and responses, so it updates as the
│                                 │    conversation evolves.
├─────────────────────────────────┤
│  AI-Curated Discovery           │  ← full-width discovery cards, cast,
│  (cards, cast, music, etc.)     │    music — existing carousel system.
│                                 │    Updated by query/response context.
├─────────────────────────────────┤
│  InputDock (fixed bottom)       │  ← omnipresent, feeds handleFollowUp
└─────────────────────────────────┘
```

**Key layout decisions:**
- **NextQuestions** sit just below the response prose, ABOVE the AI-Curated Discovery section. This allows the discovery section to continuously take input from queries and responses — it updates as the conversation evolves.
- **ConnectionHighlight cards** appear inline between paragraphs (embedded callouts within the prose flow), NOT in the discovery carousel area. The full discovery carousel with images, badges, "Watch Trailer" buttons, and "Verified" tags remains as its own section below.
- **MediaCallout** sizing and embed design are TBD — do not finalize styling yet.
- **ConnectionHighlight** card design is TBD — do not finalize styling yet. Use Justin's minimal functional styling until design is determined.
- **ResponseHeader** relationship to the existing "Enhanced Discovery" badge area is TBD.

### 4. Handle the Fallback Case
If `apiResponse.content` is missing (older API, error, edge case), `ContentRenderer` will automatically fall back to rendering `apiResponse.narrative` as plain text. Make sure this still looks acceptable in your design. **This is the current rendering path — the existing ResponseScreen already renders `narrative` as prose with EntityTag auto-linking. The fallback should preserve this existing behavior exactly.**

---

## Design Items: TBD (Do Not Finalize Yet)

These items require design decisions before Claude Code should implement them:

1. **MediaCallout embed sizing and style** — YouTube and Spotify embeds appear inline in prose. Sizing (full prose-width? smaller with text wrap?), aspect ratio, and whether Spotify embeds match the existing Music & Sonic design language are all undecided.
2. **ConnectionHighlight card design** — These appear inline between paragraphs. Visual treatment (border, background, icon, typography) has not been designed yet. Use Justin's minimal functional styling as placeholder.
3. **ResponseHeader vs Enhanced Discovery badge** — Whether the new `headline` + `summary` replaces the current "Enhanced Discovery" / discovery counter pill area or sits alongside it needs to be decided.

---

## Merge Strategy

- Justin's work lives entirely in `components/content/` — a new directory
- Your work lives in your existing screen/layout files
- The integration point is your `import` statements — you pull in Justin's components
- No shared files = no merge conflicts

---

## Timeline

1. **Now:** Justin is building the components against mock data
2. **When components are ready:** Justin hands off `components/content/` to you
3. **You integrate:** Import into your screens, apply design, wire callbacks
4. **Then:** We connect to the live API and test together (Phase 4)

You can start thinking about your layout and design for the response screen now. The mock data files (which Justin will share) show what the `content` field looks like for different query types — rich responses, moderate responses, sparse responses, and the no-content fallback.

---

## Questions?

If anything about the component contract (props, callbacks, section types) doesn't work for your design, flag it early so we can adjust before both sides build against it.
