# Items for Justin — Data Pipeline / KG Fixes

> Collecting items as we go. Will be turned into a polished doc when ready.

## 1. Character descriptions for all entities
- `JD_CHARACTER_DESCS` and `CHARACTER_DESCS` only have manual descriptions for 7 leads (Carol Sturka, Zosia, Helen, Davis Taffler, Koumba Diabaté, Mr. Diabaté, Manousos Oviedo)
- `actorCharacterMap` in response data has 40+ character mappings — but no descriptions
- Need `charDesc` for ALL cast, creators, themes, inspirations, and music entities
- These appear on hover in both Cast & Creators drawer and Universe & Map (Pluribus Directory) drawer

## 2. Remove hallucinated characters
- Cate Blanchett and other actors who are NOT in Pluribus still appear in the universe graph
- These need to be cleaned from the KG data

## 3. People→hub connections for Influences, Music, Themes
- Currently people (cast/crew) only connect to Cast or Creators hubs in the graph
- Influences, Music, and Themes hubs connect to non-person entities only
- This means the filter pills for those 3 pathways show (0) people in the Pluribus Directory
- Need edges connecting relevant people to these hubs so filtering works dynamically

## 4. All 5 pathways should be dynamic from KG
- Pathway entities and relationships should come from the knowledge graph, not be hardcoded

## 5. Significant actors/creators too small in the map
- People like Manousos (Carlos-Manuel Vesga) and Dave Porter show up as tiny nodes
- Their node size should reflect their importance to the show
- Likely a tier/size issue in the graph data — these should be featured or at least large nodes
