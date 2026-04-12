# Soundtrack Inventory Audit

> Generated: 2026-04-08 · For JD's soundtrack initiative
> Source files: `src/data/enriched-content-catalog.json` (1,833 catalog soundtracks), `data/universes/<u>/artist-albums.json` (5 universes), `src/data/<u>-universe.json` (5 universe entity files)

## TL;DR

- **69 top-level film/show entities** across 5 universes (47 real + 22 concept/theme/book entities patched to non-film types at runtime via LOCAL_ENTITY_PATCHES)
- **Catalog has 1,833 film/tv/documentary entries with Spotify soundtrack data** — but **zero have YouTube playlist data**
- **Harvester has 79 soundtrack-titled albums** across all 5 universes — **78/79 have YouTube playlist IDs**, **75/79 have full per-track YouTube IDs**

## Coverage of universe top-level film/show entities

Excludes 22 LOCAL_ENTITY_PATCHES entities (themes/concepts/books — not real soundtrack candidates).

| Universe | Films/shows | with Spotify (catalog) | with Spotify (harvester) | with YT playlist | with full per-track YT | NO data anywhere |
|---|---:|---:|---:|---:|---:|---:|
| bluenote | 2 | 0 | 1 | 1 | 1 | 1 |
| pluribus | 28 | 12 | 3 | 3 | 3 | 16 |
| sinners | 13 | 10 | 3 | 3 | 3 | 3 |
| gerwig | 3 | 3 | 3 | 2 | 2 | 0 |
| pattismith | 1 | 0 | 0 | 0 | 0 | 1 |
| **TOTAL** | **47** | **25** | **10** | **9** | **9** | **21** |

## Real gaps — 21 universe films/shows with NO soundtrack data anywhere

Excludes the 22 patched concept entities (Bebop, Free Jazz, Ozymandias, hive mind, etc.) which are not films and should not have soundtracks.

Some entries below are also non-soundtrack candidates: TV episode-level entries (Twilight Zone individual episodes), labels (Blue Note Records), places (Albuquerque, New Mexico). I left them in so JD can decide which to skip.

| Universe | Title | Type |
|---|---|---|
| bluenote | Blue Note Records | show |
| pluribus | Invasion of the Body Snatchers | film |
| pluribus | Invasion of the Body Snatchers (1978) | film |
| pluribus | Star Trek: First Contact | film |
| pluribus | Agents of S.H.I.E.L.D. | show |
| pluribus | Albuquerque, New Mexico | film |
| pluribus | Defending Your Life | film |
| pluribus | Invasion of the Body Snatchers (1956) | film |
| pluribus | Return of the Archons | film |
| pluribus | The Quiet Earth | film |
| pluribus | The Twilight Zone | show |
| pluribus | The Twilight Zone: Eye of the Beholder (S2E6) | film |
| pluribus | The Twilight Zone: Number 12 Looks Just Like You (S5E17) | film |
| pluribus | The Twilight Zone: The Invaders (S2E15) | film |
| pluribus | The Twilight Zone: The Monsters Are Due on Maple Street (S1E22) | film |
| pluribus | The Twilight Zone: Third from the Sun (S1E14) | film |
| pluribus | This Side of Paradise | film |
| sinners | Angel Heart | film |
| sinners | Eve's Bayou | film |
| sinners | Near Dark | film |
| pattismith | MC5 | film |

## Data quality flags — 0 catalog soundtrack(s) flagged WRONG_PREFIX

Catalog entries where the soundtrack album title does NOT word-prefix-match the film title. These are likely harvester pipeline errors where Spotify search matched against the wrong album.


Same class of bug as #22 (wrong TMDB posters fixed via LOCAL_ENTITY_PATCHES). Harvester pipeline fix would prevent more from being added; data fix would clear the existing wrong field. Note: this is the underlying cause of the "Borgias soundtrack on Pluribus' The Borg theme entity" contamination we observed during #22 testing.

## Per-universe inventory (top-level films/shows)

Legend: ✅ has data · ⬜ missing · 🚩 quality flag · 🎯 has full YouTube coverage

### bluenote (2 films/shows)

| Title | Type | Catalog Spotify | Harvester Spotify | YT Playlist | Per-track YT | Notes |
|---|---|:-:|:-:|:-:|:-:|---|
| 🎯 Elevator to the Gallows | film | ⬜ | ✅ | ✅ | ✅ | harv: Ascenseur pour l'échafaud |
| Blue Note Records | show | ⬜ | ⬜ | ⬜ | ⬜ |  |

### pluribus (28 films/shows)

| Title | Type | Catalog Spotify | Harvester Spotify | YT Playlist | Per-track YT | Notes |
|---|---|:-:|:-:|:-:|:-:|---|
| 🎯 Better Call Saul | show | ✅ | ✅ | ✅ | ✅ | cat: Better Call Saul Soundtrack (Inspired) · harv: Better Call Saul, Vol. 1 (Original Score from the  |
| 🎯 Breaking Bad | show | ✅ | ✅ | ✅ | ✅ | harv: Breaking Bad: Original Score from the Television S |
| El Camino | film | ✅ | ⬜ | ⬜ | ⬜ | cat: El Camino Invisible (Original Motion Picture Sound |
| Peacemaker | show | ✅ | ⬜ | ⬜ | ⬜ | cat: Peacemaker (Soundtrack from the HBO® Max Original  |
| 🎯 Pluribus | show | ✅ | ✅ | ✅ | ✅ | cat: Pluribus (Apple Original Series Soundtrack) · harv: Pluribus: Volume 1 (Apple Original Series Score) |
| The Omega Man | film | ✅ | ⬜ | ⬜ | ⬜ | cat: The Omega Man (Original Motion Picture Soundtrack) |
| The Shining | film | ✅ | ⬜ | ⬜ | ⬜ | cat: The Shining (Selections from the Original Motion P |
| The Thing | film | ✅ | ⬜ | ⬜ | ⬜ | cat: The Thing (Original Motion Picture Soundtrack) |
| The Truman Show | film | ✅ | ⬜ | ⬜ | ⬜ | cat: The Truman Show (Original Motion Picture Soundtrac |
| The X-Files | show | ✅ | ⬜ | ⬜ | ⬜ | cat: The X-Files - The Score |
| They Live | film | ✅ | ⬜ | ⬜ | ⬜ | cat: They Live - Expanded Original Motion Picture Sound |
| Village of the Damned | film | ✅ | ⬜ | ⬜ | ⬜ | cat: Village Of The Damned (Original Motion Picture Sou |
| Agents of S.H.I.E.L.D. | show | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Albuquerque, New Mexico | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Defending Your Life | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Invasion of the Body Snatchers | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Invasion of the Body Snatchers (1956) | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Invasion of the Body Snatchers (1978) | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Return of the Archons | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Star Trek: First Contact | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| The Quiet Earth | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| The Twilight Zone | show | ⬜ | ⬜ | ⬜ | ⬜ |  |
| The Twilight Zone: Eye of the Beholder (S2E6) | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| The Twilight Zone: Number 12 Looks Just Like You (S5E17) | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| The Twilight Zone: The Invaders (S2E15) | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| The Twilight Zone: The Monsters Are Due on Maple Street (S1E22) | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| The Twilight Zone: Third from the Sun (S1E14) | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| This Side of Paradise | film | ⬜ | ⬜ | ⬜ | ⬜ |  |

### sinners (13 films/shows)

| Title | Type | Catalog Spotify | Harvester Spotify | YT Playlist | Per-track YT | Notes |
|---|---|:-:|:-:|:-:|:-:|---|
| 🎯 Black Panther | film | ✅ | ✅ | ✅ | ✅ | harv: Black Panther (Original Score) |
| 🎯 Black Panther: Wakanda Forever | film | ✅ | ✅ | ✅ | ✅ | harv: Black Panther: Wakanda Forever (Original Score) |
| Bram Stoker's Dracula | film | ✅ | ⬜ | ⬜ | ⬜ | cat: Bram Stoker's Dracula: Original Motion Picture Sou |
| 🎯 Creed | film | ✅ | ✅ | ✅ | ✅ | cat: CREED: Original Motion Picture Soundtrack · harv: Creed (Original Motion Picture Score) |
| Fruitvale Station | film | ✅ | ⬜ | ⬜ | ⬜ | cat: Fruitvale Station (Original Motion Picture Soundtr |
| Get Out | film | ✅ | ⬜ | ⬜ | ⬜ | cat: Get Out (Original Motion Picture Soundtrack) |
| Interview with the Vampire | film | ✅ | ⬜ | ⬜ | ⬜ | cat: Interview with the Vampire (Original Television Se |
| Midnight Mass | show | ✅ | ⬜ | ⬜ | ⬜ | cat: Midnight Mass: S1 (Soundtrack from the Netflix Ser |
| Nosferatu | film | ✅ | ⬜ | ⬜ | ⬜ | cat: Nosferatu (Original Motion Picture Soundtrack) |
| The Color Purple | film | ✅ | ⬜ | ⬜ | ⬜ | cat: The Color Purple (Original Motion Picture Soundtra |
| Angel Heart | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Eve's Bayou | film | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Near Dark | film | ⬜ | ⬜ | ⬜ | ⬜ |  |

### gerwig (3 films/shows)

| Title | Type | Catalog Spotify | Harvester Spotify | YT Playlist | Per-track YT | Notes |
|---|---|:-:|:-:|:-:|:-:|---|
| 🎯 Barbie | film | ✅ | ✅ | ✅ | ✅ | harv: Barbie (Score from the Original Motion Picture Sou |
| Lady Bird | film | ✅ | ✅ | ⬜ | 0/23 | harv: Lady Bird (Original Motion Picture Soundtrack) |
| 🎯 Little Women | film | ✅ | ✅ | ✅ | ✅ | harv: Little Women (Original Motion Picture Soundtrack) |

### pattismith (1 films/shows)

| Title | Type | Catalog Spotify | Harvester Spotify | YT Playlist | Per-track YT | Notes |
|---|---|:-:|:-:|:-:|:-:|---|
| MC5 | film | ⬜ | ⬜ | ⬜ | ⬜ |  |

## All harvester soundtrack-titled albums

Every album in `data/universes/<u>/artist-albums.json` whose title matches `/soundtrack|score|original motion picture|inspired by/i`. 79 total.

These are the soundtracks we already have GOOD data on (Spotify + per-track YouTube). Many are NOT linked to a top-level universe film entity — they're composer discography. JD may want to surface some of these via new film entities or alias mappings.

| Universe | Composer | Album | Spotify | YT Playlist | Tracks | YT/total |
|---|---|---|:-:|:-:|---:|---|
| bluenote | Duke Ellington | Anatomy of a Murder | ✅ | ✅ | 25 | 25/25 |
| bluenote | Miles Davis | Ascenseur pour l'échafaud | ✅ | ✅ | 27 | 27/27 |
| bluenote | Miles Davis | Miles Ahead (Original Motion Picture Soundtrack) | ✅ | ✅ | 24 | 23/24 |
| gerwig | Alexandre Desplat | Argo (Original Motion Picture Soundtrack) | ✅ | ✅ | 17 | 17/17 |
| gerwig | Alexandre Desplat | Guillermo del Toro's Pinocchio (Soundtrack From The Netflix Film) | ✅ | ✅ | 41 | 41/41 |
| gerwig | Alexandre Desplat | Harry Potter and the Deathly Hallows, Pt. 1 (Original Motion Picture Soundtrack) | ✅ | ✅ | 29 | 29/29 |
| gerwig | Alexandre Desplat | Harry Potter and the Deathly Hallows, Pt. 2 (Original Motion Picture Soundtrack) | ✅ | ✅ | 25 | 25/25 |
| gerwig | Alexandre Desplat | Isle Of Dogs (Original Score) | ✅ | ✅ | 15 | 15/15 |
| gerwig | Alexandre Desplat | Little Women (Original Motion Picture Soundtrack) | ✅ | ✅ | 26 | 26/26 |
| gerwig | Alexandre Desplat | Moonrise Kingdom (Original Score) | ✅ | ✅ | 6 | 6/6 |
| gerwig | Alexandre Desplat | The Grand Budapest Hotel (Original Soundtrack) | ✅ | ✅ | 32 | 32/32 |
| gerwig | Alexandre Desplat | The Imitation Game (Original Motion Picture Soundtrack) | ✅ | ✅ | 21 | 21/21 |
| gerwig | Alexandre Desplat | The Shape Of Water (From "The Shape Of Water" Soundtrack) | ✅ | ✅ | 1 | 1/1 |
| gerwig | Alexandre Desplat | The Tree of Life (Original Motion Picture Soundtrack) | ✅ | ✅ | 13 | 13/13 |
| gerwig | Jon Brion | L'AMOUR OUF (Original Motion Picture Soundtrack) | ✅ | ✅ | 12 | 12/12 |
| gerwig | Jon Brion | Lady Bird (Original Motion Picture Soundtrack) | ✅ | ⬜ | 23 | 0/23 |
| gerwig | Jon Brion | Le grand bain (Musique originale du film) | ✅ | ✅ | 18 | 18/18 |
| gerwig | Jon Brion | Synecdoche, New York (Original Motion Picture Soundtrack) | ✅ | ✅ | 19 | 19/19 |
| gerwig | Jon Brion | Wilson (Original Motion Picture Score) | ✅ | ✅ | 14 | 14/14 |
| gerwig | Mark Ronson | Barbie (Score from the Original Motion Picture Soundtrack) | ✅ | ✅ | 19 | 19/19 |
| gerwig | Mark Ronson | Mortdecai (Original Motion Picture Soundtrack) | ✅ | ✅ | 18 | 18/18 |
| pluribus | Dave Porter | Better Call Saul, Vol. 1 (Original Score from the TV Series) | ✅ | ✅ | 21 | 21/21 |
| pluribus | Dave Porter | Better Call Saul, Vol. 2 (Original Score from the TV Series) | ✅ | ✅ | 19 | 19/19 |
| pluribus | Dave Porter | Better Call Saul, Vol. 3 (Original Score from the TV Series) | ✅ | ✅ | 25 | 25/25 |
| pluribus | Dave Porter | Breaking Bad (Original Score from the Television Series), Vol. 2 | ✅ | ✅ | 20 | 20/20 |
| pluribus | Dave Porter | Breaking Bad: Original Score from the Television Series | ✅ | ✅ | 20 | 20/20 |
| pluribus | Dave Porter | Echo (Original Soundtrack) | ✅ | ✅ | 22 | 22/22 |
| pluribus | Dave Porter | Pluribus: Volume 1 (Apple Original Series Score) | ✅ | ✅ | 23 | 23/23 |
| pluribus | Dave Porter | Pluribus: Volume 2 (Apple Original Series Score) | ✅ | ✅ | 24 | 24/24 |
| pluribus | Dave Porter | Preacher (Original Television Soundtrack) | ✅ | ✅ | 15 | 15/15 |
| pluribus | Dave Porter | The Blacklist (Original Score from the Television Series) | ✅ | ✅ | 26 | 26/26 |
| pluribus | Dave Porter | The Disaster Artist (Original Motion Picture Soundtrack) | ✅ | ✅ | 30 | 30/30 |
| pluribus | Henry Mancini | A Warm Shade of Ivory | ✅ | ✅ | 11 | 11/11 |
| pluribus | Henry Mancini | Breakfast at Tiffany's | ✅ | ✅ | 12 | 12/12 |
| pluribus | Henry Mancini | Dear Heart and Other Songs About Love | ✅ | ✅ | 12 | 12/12 |
| pluribus | Henry Mancini | Hatari! | ✅ | ✅ | 10 | 10/10 |
| pluribus | Henry Mancini | Peter Gunn | ✅ | ✅ | 15 | 13/15 |
| pluribus | Henry Mancini | The Pink Panther - Original Soundtrack | ✅ | ✅ | 12 | 12/12 |
| sinners | Ludwig Goransson | Bad Trip (Music from the Netflix Film) | ✅ | ✅ | 18 | 18/18 |
| sinners | Ludwig Goransson | Black Panther (Original Score) | ✅ | ✅ | 28 | 28/28 |
| sinners | Ludwig Goransson | Black Panther: Wakanda Forever (Original Score) | ✅ | ✅ | 26 | 26/26 |
| sinners | Ludwig Goransson | Central Intelligence (Original Motion Picture Soundtrack) | ✅ | ✅ | 30 | 24/30 |
| sinners | Ludwig Goransson | Creed (Original Motion Picture Score) | ✅ | ✅ | 21 | 21/21 |
| sinners | Ludwig Goransson | Creed II (Score & Music from the Original Motion Picture) | ✅ | ✅ | 17 | 17/17 |
| sinners | Ludwig Goransson | Death Wish (Original Motion Picture Soundtrack) | ✅ | ✅ | 20 | 20/20 |
| sinners | Ludwig Goransson | Everything, Everything (Original Motion Picture Score) | ✅ | ✅ | 20 | 20/20 |
| sinners | Ludwig Goransson | Oppenheimer (Original Motion Picture Soundtrack) | ✅ | ✅ | 24 | 24/24 |
| sinners | Ludwig Goransson | Sinners (Original Motion Picture Score) | ✅ | ✅ | 19 | 19/19 |
| sinners | Ludwig Goransson | Slice (Original Motion Picture Soundtrack) | ✅ | ✅ | 22 | 22/22 |
| sinners | Ludwig Goransson | The Book of Boba Fett: Vol. 1 (Chapters 1-4) [Original Soundtrack] | ✅ | ✅ | 17 | 17/17 |
| sinners | Ludwig Goransson | The Book of Boba Fett: Vol. 2 (Chapters 5-7) [Original Soundtrack] | ✅ | ✅ | 20 | 20/20 |
| sinners | Ludwig Goransson | The Mandalorian: Chapter 1 (Original Score) | ✅ | ✅ | 9 | 9/9 |
| sinners | Ludwig Goransson | The Mandalorian: Chapter 2 (Original Score) | ✅ | ✅ | 8 | 8/8 |
| sinners | Ludwig Goransson | The Mandalorian: Chapter 3 (Original Score) | ✅ | ✅ | 7 | 7/7 |
| sinners | Ludwig Goransson | The Mandalorian: Chapter 4 (Original Score) | ✅ | ✅ | 8 | 8/8 |
| sinners | Ludwig Goransson | The Mandalorian: Chapter 5 (Original Score) | ✅ | ✅ | 8 | 8/8 |
| sinners | Ludwig Goransson | The Mandalorian: Chapter 6 (Original Score) | ✅ | ✅ | 11 | 11/11 |
| sinners | Ludwig Goransson | The Mandalorian: Chapter 7 (Original Score) | ✅ | ✅ | 8 | 8/8 |
| sinners | Ludwig Goransson | The Mandalorian: Chapter 8 (Original Score) | ✅ | ✅ | 11 | 11/11 |
| sinners | Ludwig Goransson | The Mandalorian: Season 2 - Vol. 1 (Chapters 9-12) [Original Score] | ✅ | ✅ | 13 | 13/13 |
| sinners | Ludwig Goransson | The Mandalorian: Season 2 - Vol. 2 (Chapters 13-16) [Original Score] | ✅ | ✅ | 16 | 16/16 |
| sinners | Ludwig Goransson | The Mandalorian: Season 3 - Vol. 1 (Chapters 17-20) [Original Score] | ✅ | ✅ | 19 | 19/19 |
| sinners | Ludwig Goransson | The Mandalorian: Season 3 - Vol. 2 (Chapters 21-24) [Original Score] | ✅ | ✅ | 16 | 16/16 |
| sinners | Ludwig Goransson | Turning Red (Original Motion Picture Soundtrack) | ✅ | ✅ | 33 | 33/33 |
| sinners | Ludwig Goransson | Turning Red (Original Score) | ✅ | ✅ | 24 | 24/24 |
| sinners | Ludwig Goransson | Venom (Original Motion Picture Soundtrack) | ✅ | ✅ | 18 | 18/18 |
| sinners | Ludwig Göransson | Black Panther (Original Score) | ✅ | ✅ | 28 | 28/28 |
| sinners | Ludwig Göransson | Oppenheimer (Original Motion Picture Soundtrack) | ✅ | ✅ | 24 | 24/24 |
| sinners | Ludwig Göransson | Sinners (Original Motion Picture Score) | ✅ | ✅ | 19 | 19/19 |
| sinners | Ludwig Göransson | Tenet (Original Motion Picture Soundtrack) [Deluxe Edition] | ✅ | ✅ | 20 | 20/20 |
| sinners | Ludwig Göransson | The Mandalorian: Chapter 1 (Original Score) | ✅ | ✅ | 9 | 9/9 |
| sinners | Raphael Saadiq | Freaky Tales (Original Motion Picture Soundtrack) | ✅ | ✅ | 11 | 11/11 |
| sinners | Raphael Saadiq | From Scratch (Soundtrack from the Netflix Series) | ✅ | ✅ | 33 | 33/33 |
| sinners | Raphael Saadiq | If It's Good (from Insecure: Music From The HBO Original Series, Season 4) | ✅ | ✅ | 1 | 1/1 |
| sinners | Raphael Saadiq | L.A.'s Finest: Season One (Original Score from the Television Series) | ✅ | ✅ | 31 | 31/31 |
| sinners | Raphael Saadiq | Marvel's Moon Girl and Devil Dinosaur (Original Soundtrack) | ✅ | ✅ | 24 | 24/24 |
| sinners | Raphael Saadiq | Marvel's Moon Girl and Devil Dinosaur: Season 2 (Original Soundtrack) | ✅ | ✅ | 12 | 12/12 |
| sinners | Raphael Saadiq | Marvel's Moon Girl and Devil Dinosaur: Season 2 - Vol. 2 (Original Soundtrack) | ✅ | ✅ | 14 | 14/14 |
| sinners | Raphael Saadiq | Step (The Motion Picture Score) | ✅ | ✅ | 17 | 17/17 |

## Methodology

1. **Section A** (universe coverage) walks the 5 universe JSONs for entities with `type ∈ {film, tv-series, documentary, show}`. For each, looks up:
   - `catalog_by_title[title]` → first matching item with `soundtrack` field
   - Harvester `artist-albums.json` → first album whose title starts with the entity title at a word boundary AND matches the soundtrack regex
   - Excludes the 22 LOCAL_ENTITY_PATCHES entities (themes/concepts/books), since they're not films at runtime
2. **Section B** (all harvester soundtracks) walks all 5 harvester `artist-albums.json` files and surfaces every album whose title matches the soundtrack regex, regardless of whether it links to a universe film entity.
3. **Quality flags**: catalog soundtracks where the album title does not word-prefix-match the film title — likely a harvester pipeline error.

## Companion CSV

A CSV with one row per universe film/show entity is at `soundtrack-audit-2026-04-08.csv` in this same directory. Sortable/filterable in any spreadsheet app.
