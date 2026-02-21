# Selective Merge: Justin's Commit 2f5aec5

**Date:** Feb 21, 2026
**Source commit:** [`2f5aec5`](https://github.com/United-Tribes/unitedtribes_universes_poc/tree/2f5aec5) on `main`
**Target branch:** `jd/design-reskin`
**Decision:** Selective cherry-pick (NOT a full merge)

---

## Why Not a Full Merge

Justin's commit `2f5aec5` changed 694 lines in App.jsx, primarily in the ResponseScreen (lines 2867–3465). Our `jd/design-reskin` branch has extensive styling changes in exactly these same lines from v0.5 through v0.7 (Enhanced Discovery pills, query bubbles, prose typography, discovery group descriptions, drawer-aware layout, card sizing). A full merge would produce massive conflicts in every section we've reskinned, with high risk of accidentally reverting our design work or pulling in behavior we don't want.

Additionally, the majority of Justin's changes implement a follow-up query system that J.D. evaluated on `localhost:5173` and decided not to adopt — our existing inline follow-up approach (persistent InputDock, inline response appending, no state loss) provides a better UX.

---

## Justin's Full Changelog (from his instructions)

1. **Follow-up input moved** — now right below the narrative prose instead of at the bottom after all content
2. **Follow-ups trigger full refresh** — typing a follow-up goes through full ThinkingScreen animation → broker API → fresh ResponseScreen (instead of appending inline)
3. **Query-aware discovery reordering** — AI-Curated Discovery groups reorder based on what the user asked. Music questions promote Needle Drops to the top with a "MOST RELEVANT" badge. Cast/crew/influence questions reorder their respective groups first.
4. **Featured Music card tray removed** — those cards had no functionality, replaced by promoting the interactive Needle Drops section for music queries

### Areas of App.jsx touched by Justin:
- `QUERY_INTENTS` constant (~line 2645)
- `ResponseScreen` function (~lines 2867–3465) — follow-up input, discovery groups, needle drops rendering
- `ThinkingScreen` function (~lines 1054–1140) — new `previousQuery` prop for conversation context
- `App` component (~lines 7350–7580) — `previousQuery` state, updated `handleQuerySubmit`

### Also added:
- `.gitignore` file
- `COLLABORATION_GUIDE.md`

---

## What We TOOK (and adapted)

### 1. QUERY_INTENTS constant
**Lines ported:** Justin's lines 2645–2671
**What it does:** Defines 5 intent types (MUSIC, CAST, CREW, INFLUENCES, THEMES) with keyword arrays and preferred group ordering. Enables the app to understand what kind of question the user asked.
**Adaptation:** None — pure data, no styling. Inserted verbatim before the broker transformer section.

### 2. classifyQueryIntent() function
**Lines ported:** Justin's lines 2673–2706
**What it does:** Scores a query against each intent's keywords, boosts scores by scanning broker narrative for reinforcing terms, returns the best match if threshold (≥1 keyword hit) is met.
**Adaptation:** None — pure logic function.

### 3. getQueryAwareGroups() function
**Lines ported:** Justin's lines 2708–2724
**What it does:** Takes query + brokerResponse + responseData, classifies intent, reorders discovery groups according to intent's preferred order, preserves any groups not in the order list.
**Adaptation:** None — pure logic function.

### 4. "MOST RELEVANT" badge on discovery groups
**Lines ported:** Justin's lines 3392–3401 (group titles) and 3282–3291 (needle drops title)
**What it does:** Shows a small gold "MOST RELEVANT" pill badge on the first reordered group and on the Needle Drops heading when it's a music query.
**Adaptation:** Changed font from `'DM Mono', monospace` to our system font stack. Kept the gold color scheme as-is (uses T.gold which we already have).

### 5. AICuratedHeader subtitle prop
**Lines ported:** Justin's lines 1708–1721
**What it does:** Adds an optional `subtitle` prop to the AICuratedHeader component. When a query intent is detected, it shows an italic subtitle like "Exploring the sonic world of Pluribus" under the "AI-Curated Discovery" heading.
**Adaptation:** Changed font from `'DM Sans', sans-serif` to our system font stack.

### 6. Discovery group reordering in ResponseScreen
**Lines ported:** Justin's line 3263 (getQueryAwareGroups call) and line 3378 (group filter)
**What it does:** Replaces static group rendering with query-aware reordered groups. Also filters out the "music" group (Featured Music card tray) in addition to "literary".
**Adaptation:** Integrated with our existing styled group rendering (16px/450 weight descriptions, dc-wrap/dc-row patterns, fade gradients).

### 7. Needle Drops promotion for music queries
**Lines ported:** Justin's lines 3264, 3377
**What it does:** When query intent is MUSIC, renders the Needle Drops section BEFORE the discovery groups instead of after.
**Adaptation:** Integrated with our existing styled needle drops section.

---

## What We REJECTED (and why)

### 1. Follow-up input relocation
**Justin's change:** Moved the follow-up input from the bottom of the page to right below the narrative prose.
**Why rejected:** Our design uses a persistent InputDock fixed at the bottom of the viewport (implemented in v0.4). This is always visible, always accessible, and doesn't require scrolling to find. It also doesn't interfere with the content flow. The InputDock approach is superior UX — the user always knows where to type.

### 2. Follow-up full refresh (ThinkingScreen re-trigger)
**Justin's change:** Follow-up queries now go through the full ThinkingScreen animation → broker API → fresh ResponseScreen, replacing the previous response entirely.
**Why rejected:** Our inline follow-up approach preserves context — the user can see their original query, the original response, and all follow-up Q&A in a threaded conversation. Justin's approach loses the previous response entirely, which means the user can't compare or reference earlier answers. Our approach also feels faster since it doesn't require a full screen transition.

### 3. previousQuery state in App component
**Justin's change:** Added `previousQuery` state to pass conversation context to ThinkingScreen.
**Why rejected:** This is specifically tied to the full-refresh follow-up behavior we rejected. Our inline follow-ups don't need this state since context is preserved visually in the thread.

### 4. ThinkingScreen previousQuery prop
**Justin's change:** ThinkingScreen now accepts a `previousQuery` prop to show "Follow-up to: [previous query]" context.
**Why rejected:** Same reason — tied to the full-refresh behavior. Our follow-ups don't transition through ThinkingScreen.

---

## Conflict Avoidance Strategy

Instead of merging `main` into `jd/design-reskin` (which would produce ~20+ conflicts in restyled code), we surgically ported only the new functionality by:

1. Reading Justin's updated code from `~/Desktop/unitedtribes_universes_poc/src/App.jsx`
2. Copying the pure-logic functions verbatim (QUERY_INTENTS, classifyQueryIntent, getQueryAwareGroups)
3. Adapting the UI elements (badges, subtitle) to our warm theme/font stack
4. Integrating the reordering call into our existing ResponseScreen rendering code

This preserves all of our v0.5–v0.7 design reskin work while gaining Justin's query-aware intelligence.

---

## Files Changed

| File | Change |
|------|--------|
| `src/App.jsx` | Added QUERY_INTENTS, classifyQueryIntent(), getQueryAwareGroups(); updated AICuratedHeader with subtitle prop; updated ResponseScreen discovery rendering with reordering + MOST RELEVANT badges; filtered out "music" group |
| `src/PluribusComps.jsx` | Mirror copy of App.jsx |
| `docs/selective-merge-2f5aec5.md` | This document |
| `pocv2-jd-design-reskin-versions.html` | v0.8 version card with full changelog |

---

## Testing Checklist

- [ ] General query (e.g. "Who created Pluribus?"): groups in default order, no MOST RELEVANT badge
- [ ] Music query (e.g. "What music is in Pluribus?"): Needle Drops promoted to top with MOST RELEVANT badge, subtitle shows "Exploring the sonic world of Pluribus"
- [ ] Cast query (e.g. "Who are the actors?"): Cast group first with MOST RELEVANT badge
- [ ] Crew query (e.g. "Who created this show?"): Crew group first with MOST RELEVANT badge
- [ ] Influence query (e.g. "What inspired Pluribus?"): Inspirations group first with MOST RELEVANT badge
- [ ] Follow-up queries still work inline (no full refresh)
- [ ] InputDock still fixed at bottom
- [ ] All v0.7 styling preserved (Enhanced Discovery pills, query bubbles, prose weight)
