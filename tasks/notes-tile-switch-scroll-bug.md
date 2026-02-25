# Bug: Tile Switch Clips Top of Selected Card

## The Problem
On the HomeScreen, when a universe tile is selected, the selected card expands (footer collapses, art fills the space) and a `scrollIntoView` call on the explore panel below smoothly scrolls the page down. This works perfectly on first selection from a fresh page load.

**But:** if you click a different universe tile without reloading the page, the top of the newly selected card gets clipped off. You have to reload the homepage to get the correct behavior again.

## Root Cause
The `scrollIntoView({ behavior: "smooth", block: "center" })` on the explore panel (`exploreRef`) scrolls the outer container (the HomeScreen div with `overflowY: "auto"`) down to center the panel. On first selection, scroll starts at 0, so the result looks good. On subsequent selections, the scroll compounds — it fires again from an already-scrolled position, pushing the tile grid further up and clipping the selected card.

Additionally, `paddingTop: selected ? 40 : 0` on the grid container was added to create breathing room above tiles when selected. This transitions from 0 to 40 on first selection (null -> value), but when switching between tiles, `selected` stays truthy so paddingTop stays at 40 — no transition, no re-adjustment.

## Key Constraint
**Pluribus must NOT change.** The current Pluribus selection behavior (scroll position, explore panel layout with hero bug + pathway pills + search input) is exactly right. Any fix must preserve Pluribus behavior while fixing the other 4 tiles.

## What We Tried (Feb 25, 2026)

### Attempt 1: Scroll grid into view instead of explore panel
- Changed `scrollIntoView` target from `exploreRef` to a new `gridRef` on the tile grid container
- Used `block: "start"` to anchor the grid at the top of the viewport
- **Result:** Didn't fix the clipping. Also changed scroll behavior for Pluribus (unwanted).

### Attempt 2: Reset scrollTop to 0 before scrollIntoView
- Added `homeContainerRef` on the outer HomeScreen div
- In the `selectedUniverse` useEffect, set `homeContainerRef.current.scrollTop = 0` before the `scrollIntoView`
- **Result:** Still clipped. The scrollIntoView fires after the reset and pushes things up again. The fundamental issue is that `scrollIntoView({ block: "center" })` on the explore panel always pushes the grid too high.

### Attempt 3: Replace scrollIntoView with calculated scroll (Claude's approach)
- Removed `scrollIntoView` entirely
- Added `data-tile-grid` and `data-explore-panel` attributes
- On tile click: instant `scrollTo({ top: 0, behavior: "instant" })` to reset
- In useEffect after re-render: `requestAnimationFrame` → calculate `tileGrid.offsetTop - 20` → `container.scrollTo({ top: targetScroll, behavior: "smooth" })`
- **Result:** Fixed the switching bug, but the fixed 20px offset above the tile grid was too aggressive — clipped the top of cards on both fresh load and switching. Tried increasing to 60px — still not quite right, and critically, it changed the Pluribus scroll behavior (which must stay as-is).

### Attempt 4: Reduce container top padding
- Changed outer HomeScreen container padding from `60px` top to `30px` top
- **Result:** Did not help with the scroll-based clipping. The scroll calculation overrides any static padding.

## All attempts reverted — code is back to commit `68cdb56`.

## What Might Work (Untried Ideas)

1. **Per-universe scroll strategy**: Keep `scrollIntoView` for Pluribus (it works). For non-Pluribus tiles, use the calculated scroll approach anchored to the tile grid. This avoids changing Pluribus behavior.

2. **Deselect-then-reselect on switch**: When clicking a new tile while another is selected, briefly set `selectedUniverse` to `null` (one tick), then set the new value. This resets paddingTop (40 -> 0 -> 40) and causes the scrollIntoView to behave like a fresh selection. Risk: might cause a visible flash.

3. **Only scrollIntoView on first selection**: Track whether this is the first selection vs a switch. On first selection (from null), use scrollIntoView as today. On switch (from one tile to another), don't scroll at all — just update the selection in place without moving the page.

4. **Separate scroll logic for the outer container**: Instead of scrollIntoView on a child, directly set `scrollTop` on the outer container to a calculated value that accounts for the tile grid height + explore panel.

## Relevant Code Locations (in src/App.jsx)
- **HomeScreen function:** line ~812
- **scrollIntoView useEffect:** lines ~829-835
- **Outer container (scroll container):** line ~963, has `overflowY: "auto"`, `height: calc(100vh - 49px)`, `padding: 60px 24px 80px 12px`
- **Grid container:** line ~1003, has `overflow: "visible"`, `paddingTop: selected ? 40 : 0`
- **Tile click handler:** line ~1025, sets `selectedUniverse` and clears `query`
- **Pluribus explore panel:** line ~1217, `ref={exploreRef}`
- **Non-Pluribus explore panel:** line ~1384, `ref={exploreRef}`
