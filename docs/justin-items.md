# Items for Justin — Data Pipeline / KG Fixes

> **Important:** For all of these changes, do NOT change the animation, the resizing behavior when the drawer opens/closes, or the repositioning of the graph when the drawer opens/closes. None of the existing design or interaction behavior should change — these are data and KG fixes only.

## 1. Character descriptions for all entities in both drawers
- On both the Cast & Creators screen and J.D.'s Universe tab, there is a People button on the far right margin that opens a drawer
- Each person in the drawer shows a description on hover/click
- Currently only 7 leads have descriptions, and they're hardcoded
- The objective is to have every cast, creator, or anything in there have a short description that is pulled from the knowledge graph
- Need dynamic `charDesc` from the knowledge graph for every person that appears in either drawer — cast, creators, and anyone else

## 2. Remove hallucinated characters and update with dynamic characters in each of the categories
- In J.D.'s Universe, Cate Blanchett and other actors who are NOT in Pluribus still appear in the universe graph
- These need to be cleaned from the KG data
- Furthermore, anytime there is an additional character added, a creator added, a theme added, an inspiration added, or music added, they need to dynamically show up in the visualization in J.D.'s Universe

## 3. In the Universe and Map, J.D.'s Tab — People→hub connections for Influences, Music, Themes
- The drawer has filter pills for each pathway: All, Cast, Creator, Influence, Music, Theme
- Clicking a constellation hub on the map (or a pill in the drawer) filters the people list to that pathway
- Cast and Creators work correctly — clicking either shows the relevant people
- Influences, Music, and Themes show (0) — no people appear because the KG has no edges connecting people to those hubs
- Need to add edges in the KG connecting relevant people to the Influences, Music, and Themes hubs so they show up when filtered
- When these edges are added, they should both update the universe visualization and automatically populate the drawer

## 4. All 5 pathways should be dynamic from KG
- The 5 constellation pathways (Cast, Creators, Music, Influences, Themes) and their entities should be driven by the knowledge graph, not hardcoded
- The visualization and the drawer must stay in sync — if an entity appears on the map, it should appear in the drawer, and vice versa
- Every entity that appears in the drawer must have a short description pulled from the knowledge graph

## 5. Node sizing in the map — significant people or entities are too small
- Most cast and creators should appear at roughly the same size, with only minor players being smaller
- Currently many significant people (e.g., Manousos/Carlos-Manuel Vesga, Dave Porter) show up as tiny, nearly hidden nodes
- Node size should reflect importance to the show — these are not minor players and shouldn't look like it

## 6. Rename hub labels in J.D.'s Universe tab only
- Claude Code attempted this change multiple times but was unable to do it without breaking Justin's Universe Network tab. The hub labels are generated in shared code (`adapters.js`) that feeds both tabs, and scoping the rename to only J.D.'s tab required changes across multiple shared files that introduced side effects each time.
- Change the 5 pathway hub labels — J.D.'s Universe tab only, do NOT change Justin's Universe Network tab
- New labels (no spaces around the pipe):
  - `Cast of Pluribus` → `Pluribus|Cast`
  - `Creators of Pluribus` → `Pluribus|Creators`
  - `Music from Pluribus` → `Pluribus|Music`
  - `Influences on Pluribus` → `Pluribus|Influences`
  - `Themes of Pluribus` → `Pluribus|Themes`
- No spaces around the pipe character
- Labels should appear bold and prominent but not larger — they don't necessarily need to be any bolder, but must appear at least in the weight and size they currently are
- No changes to font size or color — same styling as current labels
