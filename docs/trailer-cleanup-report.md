# Trailer-Row Cleanup Report

Catalog cleanup applied on **May 1, 2026** (commit `519ce13`) to all rows whose 
title contained `Official Trailer`. This report is generated from the pre-cleanup 
catalog state (commit `e5ee7d8`) so Justin can see exactly what was done 
and which entries still need harvester-side attention.

**Total trailer-decorated rows processed: 109** &mdash; resolved into:
- **26 MERGE**: trailer row had a clean-twin with valid screen-type → migrated trailer's sources into the clean row, deleted trailer row
- **20 RENAME+RETYPE**: orphan + mis-typed as song/album → stripped decoration + retyped to film (or tv-series via `Season N`/`Series` heuristic)
- **62 RENAME-ONLY**: orphan + already correctly typed → stripped decoration only

**🚨 STILL BROKEN (19 rows)** — RENAME+RETYPE rows that have no media data. They render in modals as cards but clicking leads to dead-end empty modals because there's no actual film/show data attached. **These need harvester-side TMDB enrichment** (poster, overview, year), or removal if the harvester deems them noise.

---

## 🚨 Still broken — need TMDB enrichment by harvester

(19 rows. These were `type=song` placeholders for trailer references; we retyped them to `film` or `tv-series` and stripped the decoration, but they have no media data so clicking them leads to an empty modal. Each needs the harvester to attach TMDB poster + overview + year, or to be deleted if not actually relevant.)

| Renamed to | Retyped as | Original title | Creator |
|---|---|---|---|
| `American Horror Story` | `film` | `American Horror Story Official Trailer` | FX |
| `Bad Santa` | `film` | `Bad Santa Official Trailer` | Dimension Films |
| `Bus Stop` | `film` | `Bus Stop Official Trailer 1956` | Joshua Logan |
| `CQ` | `film` | `CQ Official Trailer` | Roman Coppola |
| `Damsel` | `film` | `Damsel Official Trailer` | Netflix |
| `East of Eden` | `film` | `East of Eden Official Trailer` | Elia Kazan |
| `Enola Holmes` | `film` | `Enola Holmes Official Trailer` | Netflix |
| `Fargo Season 1` | `tv-series` | `Fargo Season 1 Official Trailer` | FX |
| `Final Destination` | `film` | `Final Destination Official Trailer 2000` | New Line Cinema |
| `G.I. Jane` | `film` | `G.I. Jane Official Trailer` | Hollywood Pictures |
| `Ghostbusters: Afterlife` | `film` | `Ghostbusters: Afterlife Official Trailer` | Sony Pictures |
| `Giant` | `film` | `Giant Official Trailer` | Warner Bros |
| `Heroes Season 1` | `tv-series` | `Heroes Season 1 Official Trailer` | NBC |
| `Outbreak` | `film` | `Outbreak Official Trailer` | Warner Bros- Viral epidemic containment |
| `Sling Blade` | `film` | `Sling Blade Official Trailer` | Miramax |
| `The Godfather Part III` | `film` | `The Godfather Part III Official Trailer` | Paramount Pictures |
| `The Town` | `film` | `The Town Official Trailer` | Warner Bros |
| `Violent Night` | `film` | `Violent Night Official Trailer` | Universal Pictures |
| `Wind River` | `film` | `Wind River Official Trailer` | The Weinstein Company |

---

## ✅ Merged (26 rows — sources migrated into clean twin, trailer row deleted)

These trailer rows had a clean-twin row already in the catalog with a valid screen type (`film`/`tv-series`/`documentary`/`short-film`). The cleanup migrated the trailer row's source tags into the clean row and deleted the trailer row entirely. **No further action needed** — the clean twin carries forward.

| Trailer row (deleted) | Trailer type | Clean twin (kept) | Twin type | Twin sources |
|---|---|---|---|---|
| `Annihilation - Official Trailer` | `song` | `Annihilation` | `film` | 103 |
| `Arrival - Official Trailer` | `song` | `Arrival` | `film` | 92 |
| `Casino Royale - Official Trailer` | `song` | `Casino Royale` | `film` | 12 |
| `Cast Away - Official Trailer` | `film` | `Cast Away` | `film` | 39 |
| `Children of Men - Official Trailer` | `song` | `Children of Men` | `film` | 53 |
| `Close Encounters of the Third Kind - Official Trailer` | `song` | `Close Encounters of the Third Kind` | `film` | 24 |
| `Coherence - Official Trailer` | `song` | `Coherence` | `film` | 5 |
| `Contagion - Official Trailer` | `film` | `Contagion` | `film` | 11 |
| `Eternal Sunshine of the Spotless Mind - Official Trailer` | `song` | `Eternal Sunshine of the Spotless Mind` | `film` | 58 |
| `Glass Onion - Official Trailer` | `song` | `Glass Onion` | `film` | 7 |
| `Goldfinger - Official Trailer` | `song` | `Goldfinger` | `film` | 11 |
| `I Am Legend - Official Trailer` | `song` | `I Am Legend` | `film` | 52 |
| `Interstellar - Official Trailer` | `song` | `Interstellar` | `film` | 44 |
| `Invasion of the Body Snatchers - Official Trailer` | `song` | `Invasion of the Body Snatchers` | `film` | 164 |
| `Knives Out - Official Trailer` | `song` | `Knives Out` | `film` | 11 |
| `No Hard Feelings Official Trailer` | `film` | `No Hard Feelings` | `film` | 1 |
| `Primer - Official Trailer` | `song` | `Primer` | `film` | 6 |
| `Shine a Light Official Trailer` | `documentary` | `Shine a Light` | `film` | 1 |
| `Solaris - Official Trailer` | `song` | `Solaris` | `film` | 49 |
| `The Last of Us - Official Trailer` | `song` | `The Last of Us` | `tv-series` | 60 |
| `The Matrix - Official Trailer` | `film` | `The Matrix` | `film` | 50 |
| `The Outsiders Official Trailer` | `film` | `The Outsiders` | `film` | 2 |
| `The Road - Official Trailer` | `song` | `The Road` | `film` | 45 |
| `The Strain - Official Trailer` | `song` | `The Strain` | `tv-series` | 5 |
| `The Thing - Official Trailer` | `song` | `The Thing` | `film` | 74 |
| `Thunderball - Official Trailer` | `song` | `Thunderball` | `film` | 5 |

---

## ✏️ Renamed + retyped (20 rows)

Orphan trailer rows (no clean twin) that were mis-typed by the harvester as `song`/`album`/etc. Cleanup stripped the decoration and retyped to `film` (or `tv-series` when title matched `Season N`/`Series`/`Episode`). **The 16 in the STILL BROKEN section above need TMDB enrichment**; the rest below have at least the YouTube trailer URL attached so they're functional.

| Was | Now | Old type → new type | Creator |
|---|---|---|---|
| `American Horror Story Official Trailer` | `American Horror Story` | `song` → `film` | FX |
| `Bad Santa Official Trailer` | `Bad Santa` | `song` → `film` | Dimension Films |
| `Bus Stop Official Trailer 1956` | `Bus Stop` | `song` → `film` | Joshua Logan |
| `CQ Official Trailer` | `CQ` | `song` → `film` | Roman Coppola |
| `Damsel Official Trailer` | `Damsel` | `song` → `film` | Netflix |
| `Do Revenge Official Trailer` | `Do Revenge` | `song` → `film` | Netflix |
| `East of Eden Official Trailer` | `East of Eden` | `song` → `film` | Elia Kazan |
| `Enola Holmes Official Trailer` | `Enola Holmes` | `song` → `film` | Netflix |
| `Fargo Season 1 Official Trailer` | `Fargo Season 1` | `song` → `tv-series` | FX |
| `Final Destination Official Trailer 2000` | `Final Destination` | `song` → `film` | New Line Cinema |
| `G.I. Jane Official Trailer` | `G.I. Jane` | `song` → `film` | Hollywood Pictures |
| `Ghostbusters: Afterlife Official Trailer` | `Ghostbusters: Afterlife` | `song` → `film` | Sony Pictures |
| `Giant Official Trailer` | `Giant` | `song` → `film` | Warner Bros |
| `Heroes Season 1 Official Trailer` | `Heroes Season 1` | `song` → `tv-series` | NBC |
| `Outbreak Official Trailer` | `Outbreak` | `song` → `film` | Warner Bros- Viral epidemic containment |
| `Sling Blade Official Trailer` | `Sling Blade` | `song` → `film` | Miramax |
| `The Godfather Part III Official Trailer` | `The Godfather Part III` | `song` → `film` | Paramount Pictures |
| `The Town Official Trailer` | `The Town` | `song` → `film` | Warner Bros |
| `Violent Night Official Trailer` | `Violent Night` | `song` → `film` | Universal Pictures |
| `Wind River Official Trailer` | `Wind River` | `song` → `film` | The Weinstein Company |

---

## 🪶 Renamed only — already correctly typed (62 rows)

Orphan trailer rows that already had a valid screen-type (mostly `film`); cleanup just stripped the `Official Trailer` decoration from the title. Type unchanged. **No further action needed** — these were just cosmetically dirty.

| Was | Now | Type | Creator |
|---|---|---|---|
| `11 Harrowhouse Official Trailer` | `11 Harrowhouse` | `film` | Aram Avakian |
| `A Face in the Crowd Official Trailer` | `A Face in the Crowd` | `film` | Elia Kazan |
| `A Streetcar Named Desire Official Trailer` | `A Streetcar Named Desire` | `film` | Elia Kazan |
| `American Hustle Official Trailer` | `American Hustle` | `film` | David O. Russell |
| `Atlantic City Official Trailer` | `Atlantic City` | `film` | Louis Malle |
| `Bernie Official Trailer` | `Bernie` | `film` | Millennium Entertainment |
| `Big Trouble in Little China Official Trailer` | `Big Trouble in Little China` | `film` | John Carpenter |
| `Cape Fear 1991 Official Trailer` | `Cape Fear 1991` | `film` | Martin Scorsese |
| `Chernobyl Official Trailer` | `Chernobyl` | `film` | HBO- Technical procedural drama |
| `Cincinnati Kid Official Trailer` | `Cincinnati Kid` | `film` | Norman Jewison |
| `Cosmos: A Spacetime Odyssey Official Trailer` | `Cosmos: A Spacetime Odyssey` | `film` | Fox (documentary-series) - Neil deGrasse Tyson |
| `Down to the Bone Official Trailer` | `Down to the Bone` | `film` | Debra Granik |
| `Dune Part Two Official Trailer` | `Dune Part Two` | `film` | Denis Villeneuve |
| `Evita Official Trailer` | `Evita` | `film` | Alan Parker |
| `Fantastic Mr Fox Official Trailer` | `Fantastic Mr Fox` | `film` | Wes Anderson |
| `Flesh and Bone Official Trailer` | `Flesh and Bone` | `tv-series` | Starz |
| `Hancock Official Trailer` | `Hancock` | `film` | Sony Pictures |
| `Hannibal Series Official Trailer` | `Hannibal Series` | `tv-series` | NBC |
| `Hell's Angels Official Trailer` | `Hell's Angels` | `film` | Howard Hughes |
| `Hot Fuzz Official Trailer` | `Hot Fuzz` | `film` | Edgar Wright |
| `Inherent Vice Official Trailer` | `Inherent Vice` | `film` | Paul Thomas Anderson |
| `Inkheart Official Trailer` | `Inkheart` | `film` | New Line Cinema |
| `Love Streams Official Trailer` | `Love Streams` | `film` | John Cassavetes |
| `Marathon Man Official Trailer` | `Marathon Man` | `film` | John Schlesinger |
| `Meet Joe Black Official Trailer` | `Meet Joe Black` | `film` | Martin Brest |
| `Midnight Express Official Trailer` | `Midnight Express` | `film` | Alan Parker |
| `Moonstruck Official Trailer` | `Moonstruck` | `film` | Norman Jewison |
| `Morvern Callar Official Trailer` | `Morvern Callar` | `film` | Lynne Ramsay |
| `My Country My Country Official Trailer` | `My Country My Country` | `documentary` | Laura Poitras |
| `Pickup on South Street Official Trailer` | `Pickup on South Street` | `film` | Samuel Fuller |
| `Prince of the City Official Trailer` | `Prince of the City` | `film` | Sidney Lumet |
| `Q&A Official Trailer` | `Q&A` | `film` | Sidney Lumet |
| `Reaper Series Official Trailer` | `Reaper Series` | `tv-series` | ABC |
| `Red Sparrow Official Trailer` | `Red Sparrow` | `film` | Francis Lawrence |
| `Rumble Fish Official Trailer` | `Rumble Fish` | `film` | Francis Ford Coppola |
| `Scent of a Woman Official Trailer` | `Scent of a Woman` | `film` | Martin Brest |
| `Seems Like Old Times Official Trailer` | `Seems Like Old Times` | `film` | Jay Sandrich |
| `Serpico Official Trailer` | `Serpico` | `film` | Sidney Lumet |
| `Shoot the Moon Official Trailer` | `Shoot the Moon` | `film` | Alan Parker |
| `Sweet Smell of Success Official Trailer` | `Sweet Smell of Success` | `film` | Alexander Mackendrick |
| `The Affair Official Trailer` | `The Affair` | `tv-series` | Showtime |
| `The Book of Boba Fett Series Official Trailer` | `The Book of Boba Fett Series` | `tv-series` | Disney+ |
| `The Fall Official Trailer` | `The Fall` | `tv-series` | BBC |
| `The Fly 1986 Official Trailer` | `The Fly 1986` | `film` | 20th Century Fox |
| `The Godfather Official Trailer` | `The Godfather` | `film` | Francis Ford Coppola |
| `The Hunger Games: Mockingjay Part 1 Official Trailer` | `The Hunger Games: Mockingjay Part 1` | `film` | Francis Lawrence |
| `The Hunger Games: Mockingjay Part 2 Official Trailer` | `The Hunger Games: Mockingjay Part 2` | `film` | Francis Lawrence |
| `The Infiltrator Official Trailer` | `The Infiltrator` | `film` | Brad Furman |
| `The Iron Claw Official Trailer` | `The Iron Claw` | `film` | Sean Durkin |
| `The Life of David Gale Official Trailer` | `The Life of David Gale` | `film` | Alan Parker |
| `The Number 23 Official Trailer` | `The Number 23` | `film` | New Line Cinema |
| `The Parallax View Official Trailer` | `The Parallax View` | `film` | Alan J. Pakula |
| `The Sandlot Official Trailer` | `The Sandlot` | `film` | David Mickey Evans |
| `The Silence of the Lambs Official Trailer` | `The Silence of the Lambs` | `film` | Jonathan Demme |
| `The Strain Season 1 Official Trailer` | `The Strain Season 1` | `tv-series` | FX |
| `The Verdict Official Trailer` | `The Verdict` | `film` | Sidney Lumet |
| `The War Room Official Trailer` | `The War Room` | `documentary` | Criterion Collection |
| `Top Gun Maverick Official Trailer` | `Top Gun Maverick` | `film` | Joseph Kosinski |
| `Total Eclipse Official Trailer` | `Total Eclipse` | `film` | Agnieszka Holland |
| `Tucker The Man and His Dream Official Trailer` | `Tucker The Man and His Dream` | `film` | Francis Ford Coppola |
| `We Need to Talk About Kevin Official Trailer` | `We Need to Talk About Kevin` | `film` | Lynne Ramsay |
| `White Christmas Official Trailer` | `White Christmas` | `film` | Michael Curtiz |

---

## How to make this cleanup obsolete (harvester-side)

When the harvester encounters a movie/show trailer URL, prefer to **attach the trailer as a `youtube` field on the existing clean-titled film/tv-series row** rather than creating a separate `X Official Trailer` row of type `song`. That sidesteps this entire cleanup pass — there's nothing to merge or rename if the trailer never gets its own row.

_Auto-generated by `scripts/generate-trailer-cleanup-report.py` from catalog states at `e5ee7d8` (pre-cleanup) and `HEAD` (post-cleanup)._
