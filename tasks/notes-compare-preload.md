# Compare Panel: Preload Raw Responses in Background

**Date:** Feb 23, 2026
**Status:** Recommended — discuss with Justin

## The Question

When the user opens the Compare panel ("Without UnitedTribes"), should the raw model search be preloaded in the background, or loaded on-demand when the tray opens?

## Recommendation: Preload in Background

### Why preloading wins

1. **The compare panel is the "aha" moment.** Its entire purpose is to make the value of UnitedTribes enhancement undeniable — "look what you get without us vs. with us." Making the user wait introduces friction at exactly the wrong moment. You want that comparison to land instantly and hit hard.

2. **The wait undermines the demo narrative.** When someone opens the tray and sees a loading spinner, they're thinking about the loading — not about the contrast between the two responses. A preloaded result lets their attention go straight to the content difference, which is the whole point.

3. **The idle time is free.** Once the main enhanced response arrives, the user is reading. That's dead time on the network side — perfect for quietly fetching the raw comparison in the background. By the time they finish reading and think "hmm, I wonder what plain ChatGPT would say," it's already there.

### Caveat

Every query fires an extra API call whether the user opens the tray or not. For a POC/demo that's totally fine — the experience matters more than the API cost. In production you'd want to think about that tradeoff.

### Optional UX touch

If you want the "freshness" signal without the wait, add a subtle timestamp like "Searched moments ago" in the compare panel — communicates it's real and live without making them sit through it.

## Implementation Approach

- After `handleBrokerComplete` fires (main enhanced response arrives), immediately kick off a background fetch to the raw/unenhanced endpoint for the same query.
- Store the raw response in state (e.g. `rawCompareResponse`).
- When Compare panel opens, show the preloaded result if available, or a brief loading state if still in flight.
- On new query or follow-up, clear and re-fetch the raw response in background.
