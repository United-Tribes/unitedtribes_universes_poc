# Soundtrack Data Audit

**Date:** April 8, 2026
**Branch:** `jd/design-reskin-v3` at commit `6340ce7`
**S3 Base URL:** `http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data/`

### Files fetched from S3

| File | Size (bytes) | Status |
|------|-------------|--------|
| `bluenote/bluenote-universe.json` | 388,640 | OK |
| `bluenote/bluenote-response.json` | 24,606 | OK |
| `bluenote/artist-albums.json` | 2,094,207 | OK |
| `bluenote/rudy-van-gelder-albums.json` | 53,064 | OK |
| `gerwig/gerwig-universe.json` | 803,792 | OK |
| `gerwig/gerwig-response.json` | 16,606 | OK |
| `gerwig/artist-albums.json` | 754,730 | OK |
| `gerwig/mark-ronson-catalog.json` | 32,088 | OK |
| `gerwig/jon-brion-scores.json` | 28,151 | OK |
| `gerwig/alexandre-desplat-scores.json` | 66,616 | OK |
| `pattismith/pattismith-universe.json` | 654,582 | OK |
| `pattismith/pattismith-response.json` | 33,781 | OK |
| `pattismith/artist-albums.json` | 1,934,014 | OK |
| `pattismith/curated-enrichment.json` | 6,737 | OK |
| `pluribus/pluribus-universe.json` | 1,054,628 | OK |
| `pluribus/pluribus-response.json` | 120,979 | OK |
| `pluribus/artist-albums.json` | 922,720 | OK |
| `pluribus/dave-porter-scores.json` | 69,465 | OK |
| `pluribus/thomas-golubic-supervised.json` | 13,561 | OK |
| `sinners/sinners-universe.json` | 558,402 | OK |
| `sinners/sinners-response.json` | 21,363 | OK |
| `sinners/artist-albums.json` | 946,807 | OK |
| `sinners/ludwig-goransson-scores.json` | 142,759 | OK |
| `sinners/raphael-saadiq-catalog.json` | 74,723 | OK |

**End-state framing:** S3 will be the single source of truth for all soundtrack IDs. This audit maps what exists today across S3 data, local data copies, and App.jsx code constants to identify gaps and migration candidates.

---

## 2. Executive Summary

This audit covers 137 soundtrack-bearing entities across all 5 universes. The data architecture has three layers: (1) S3 JSON files fetched by `pull-data.sh`, (2) local copies in `src/data/`, and (3) hard-coded constants in `App.jsx` (`LOCAL_ALBUM_PATCHES`, `LOCAL_ENTITY_OVERRIDES`). The richest soundtrack data is in the `artist-albums.json` files, which contain per-artist album catalogs with Spotify IDs, YouTube playlist IDs, and per-track YouTube video IDs. Score/catalog files for composers provide additional structured data. The universe JSON files contain `sonic` arrays with individual track or album Spotify URLs but no YouTube playlist-level data.

The Blue Note and Patti Smith universes are music-artist-heavy (36 and 33 artists respectively) with deep album catalogs. Gerwig and Sinners are film-centric with composer score files. Pluribus is the most complex: a TV show universe with films, episodes, a composer (Dave Porter), a music supervisor (Thomas Golubic), and no performing artists in `artist-albums.json`.

### Totals by Universe

| Universe | Entities | Films | Shows | Episodes | Composers | Music Sup | Artists | With Soundtrack | With Spotify | With YT Playlist |
|----------|----------|-------|-------|----------|-----------|-----------|---------|-----------------|-------------|-----------------|
| bluenote | 39 | 1 | 1 | 0 | 0 | 0 | 36 | 36 | 36 | 36 |
| gerwig | 6 | 3 | 0 | 0 | 3 | 0 | 0 | 3 | 3 | 3 |
| pattismith | 43 | 8 | 0 | 0 | 0 | 0 | 33 | 19 | 19 | 9 |
| pluribus | 34 | 18 | 7 | 7 | 1 | 1 | 0 | 2 | 2 | 1 |
| sinners | 15 | 12 | 1 | 0 | 2 | 0 | 0 | 15 | 15 | 2 |
| **TOTAL** | **137** | | | | | | | **75** | **75** | **51** |

---

## 3. Coverage Matrix per Universe

### bluenote

| entity_type | title | has_soundtrack | spotify_album_id | yt_playlist_id | yt_tracks | notes |
|-------------|-------|----------------|------------------|----------------|-----------|-------|
| film | Elevator to the Gallows | no | `` | `` |  |  |
| tv_show | Blue Note Records | no | `` | `` |  |  |
| engineer | Rudy Van Gelder | no | `` | `` |  |  |
| artist | Andrew Hill | yes | `647o8vl4OD1sjvvhql3j...` | `PLUJ7V33M1wR0HsYG3F_...` | 87/87 | 11 albums in artist-albums; 11 with Spotify IDs; 11 with YT playlists; 87/87 tra... |
| artist | Art Blakey | yes | `5PzlTnVafjgt5RtjTdIK...` | `PLMNMmvIC2uGYzD05aNB...` | 108/118 | 15 albums in artist-albums; 15 with Spotify IDs; 15 with YT playlists; 108/118 t... |
| artist | Bill Evans | yes | `7y2ddYBwV1It5KNemqqQ...` | `PLbnJYtsl3xpiGnGIgOG...` | 112/120 | 12 albums in artist-albums; 12 with Spotify IDs; 12 with YT playlists; 112/120 t... |
| artist | Bobby Hutcherson | yes | `5142jRc6IrvsI7F6V7tU...` | `PLMAB89BlQ_blglYACG1...` | 67/67 | 10 albums in artist-albums; 10 with Spotify IDs; 10 with YT playlists; 67/67 tra... |
| artist | Bud Powell | yes | `34ImPCHsrSFkXUSkFfYq...` | `PLAm8hhjjIDrR6nn87TM...` | 64/64 | 6 albums in artist-albums; 6 with Spotify IDs; 6 with YT playlists; 64/64 tracks... |
| artist | Cannonball Adderley | yes | `3Wu0chxAm4GxSeRnIIf2...` | `PLTIb4fKCEAevQGcDKFI...` | 65/65 | 9 albums in artist-albums; 9 with Spotify IDs; 9 with YT playlists; 65/65 tracks... |
| artist | Charles Mingus | yes | `7pojWP7x9uEFSJgw765k...` | `PLs9zwqXsceUiF7cDayw...` | 95/99 | 12 albums in artist-albums; 12 with Spotify IDs; 12 with YT playlists; 95/99 tra... |
| artist | Charlie Parker | yes | `7LVNnSl6UhjkLepWoPLq...` | `PLhiKgYVYHcxC8KRQS7q...` | 184/321 | 9 albums in artist-albums; 9 with Spotify IDs; 9 with YT playlists; 184/321 trac... |
| artist | Clifford Brown | yes | `3158RZskTkHMhPvQICUe...` | `PLTLsNcUx1Q6lCh5_HGp...` | 76/76 | 7 albums in artist-albums; 7 with Spotify IDs; 7 with YT playlists; 76/76 tracks... |
| artist | Dexter Gordon | yes | `5nEJj9bjoarnzlS88NiW...` | `PLC7lO8dn3QxFjiG-5o1...` | 65/65 | 10 albums in artist-albums; 10 with Spotify IDs; 10 with YT playlists; 65/65 tra... |
| artist | Dizzy Gillespie | yes | `6uX5idggmNHPmH1FQmw1...` | `PLJsDyoE3PZSAt1cvujO...` | 145/152 | 10 albums in artist-albums; 10 with Spotify IDs; 10 with YT playlists; 145/152 t... |
| artist | Donald Byrd | yes | `3LG1c3DYgaEtCxea2z7Z...` | `OLAK5uy_ls7NqTV131-Q...` | 53/53 | 9 albums in artist-albums; 9 with Spotify IDs; 9 with YT playlists; 53/53 tracks... |
| artist | Duke Ellington | yes | `0t41BkcZayaAsa0FdRel...` | `OLAK5uy_khMwPzNhOvs7...` | 215/262 | 12 albums in artist-albums; 12 with Spotify IDs; 12 with YT playlists; 215/262 t... |
| artist | Elvin Jones | yes | `5JkyHalhn8Ml6KhwZBYf...` | `PLZGc_ONM98vBdWWLVFR...` | 62/62 | 9 albums in artist-albums; 9 with Spotify IDs; 9 with YT playlists; 62/62 tracks... |
| artist | Eric Dolphy | yes | `3PIVqZzL1PnrxFZDzuT1...` | `PLE59E566FD18327CA` | 26/26 | 4 albums in artist-albums; 4 with Spotify IDs; 4 with YT playlists; 26/26 tracks... |
| artist | Freddie Hubbard | yes | `4WF3FMkvyd8Ogh2Hz76C...` | `PLBJenJIJrq0z7hN8c9I...` | 80/80 | 12 albums in artist-albums; 12 with Spotify IDs; 12 with YT playlists; 80/80 tra... |
| artist | Grant Green | yes | `1RmoKOfLnMAafzhWRJCI...` | `PLzFqEh_mqdQDMNkeTkI...` | 62/62 | 10 albums in artist-albums; 10 with Spotify IDs; 10 with YT playlists; 62/62 tra... |
| artist | Hank Mobley | yes | `731OW49heGHCMrMOREHY...` | `PLg7mJ3BwdABJB42JDMr...` | 60/60 | 10 albums in artist-albums; 10 with Spotify IDs; 10 with YT playlists; 60/60 tra... |
| artist | Herbie Hancock | yes | `7huPJTTsWVt854oZkr88...` | `OLAK5uy_leRUjc1FeLNR...` | 107/107 | 15 albums in artist-albums; 15 with Spotify IDs; 15 with YT playlists; 107/107 t... |
| artist | Horace Silver | yes | `4LEnATSqKeANOJ0mLUAu...` | `OLAK5uy_maEHDCvs9peI...` | 114/114 | 15 albums in artist-albums; 15 with Spotify IDs; 15 with YT playlists; 114/114 t... |
| artist | Jackie McLean | yes | `7cDdrBZaImUjYGqkir7b...` | `PLb_GPRyrUSsXYsIubAI...` | 51/51 | 9 albums in artist-albums; 9 with Spotify IDs; 9 with YT playlists; 51/51 tracks... |
| artist | Jimmy Smith | yes | `6foGf3FKwBRFWQfpYSYz...` | `PL9nLSMROUv4kGcK-aGT...` | 73/73 | 10 albums in artist-albums; 10 with Spotify IDs; 10 with YT playlists; 73/73 tra... |
| artist | Joe Henderson | yes | `7mQGTuvmdp56DNz0AmMw...` | `PLUJ7V33M1wR0it7Ko4h...` | 72/72 | 10 albums in artist-albums; 10 with Spotify IDs; 10 with YT playlists; 72/72 tra... |
| artist | John Coltrane | yes | `2Z11cXWEa2qqYQBGkJrC...` | `PLKZWLu6q09LN0kEPS7O...` | 72/72 | 14 albums in artist-albums; 14 with Spotify IDs; 14 with YT playlists; 72/72 tra... |
| artist | Kenny Burrell | yes | `0hMuKAciHKinu4L3R4Oj...` | `PLSTZCafn5OqrScxlLKF...` | 83/89 | 8 albums in artist-albums; 8 with Spotify IDs; 8 with YT playlists; 83/89 tracks... |
| artist | Lee Morgan | yes | `1n1trPeeY9Q5H4eLbbHH...` | `PLMAB89BlQ_bnEB1BGBL...` | 80/80 | 12 albums in artist-albums; 12 with Spotify IDs; 12 with YT playlists; 80/80 tra... |
| artist | Max Roach | yes | `4gEIEXedj8RnSul4T46U...` | `OLAK5uy_mIh7OrFqfjA1...` | 49/49 | 8 albums in artist-albums; 8 with Spotify IDs; 8 with YT playlists; 49/49 tracks... |
| artist | McCoy Tyner | yes | `22HoIP0ai6Wikh4R8yM0...` | `PL4uSMmnYvnbJ3tg3EQu...` | 73/73 | 11 albums in artist-albums; 11 with Spotify IDs; 11 with YT playlists; 73/73 tra... |
| artist | Miles Davis | yes | `1weenld61qoidwYuZ1GE...` | `PLrhkpF1bKMG_D2sxTpx...` | 162/175 | 16 albums in artist-albums; 16 with Spotify IDs; 16 with YT playlists; 162/175 t... |
| artist | Norah Jones | yes | `3ArSFkv4OQOosOvYTrZN...` | `OLAK5uy_nXfC3wibt4VA...` | 111/143 | 9 albums in artist-albums; 9 with Spotify IDs; 9 with YT playlists; 111/143 trac... |
| artist | Paul Chambers | yes | `4wKkVSHqJDGjSAOfULYo...` | `OLAK5uy_mVv-2ztBmPk5...` | 32/32 | 5 albums in artist-albums; 5 with Spotify IDs; 5 with YT playlists; 32/32 tracks... |
| artist | Ron Carter | yes | `1bkTXNpG1x3bMpGpfhvo...` | `PLng2lpXRTGI0vD7WCXz...` | 61/61 | 10 albums in artist-albums; 10 with Spotify IDs; 10 with YT playlists; 61/61 tra... |
| artist | Sonny Rollins | yes | `2dtjLAwt7Cq763h6Aupy...` | `PLiHzq-TzyMjODQIrgwd...` | 84/87 | 11 albums in artist-albums; 11 with Spotify IDs; 11 with YT playlists; 84/87 tra... |
| artist | Thelonious Monk | yes | `5gWF47eGSbv4BOfxoFcQ...` | `PLs9zwqXsceUjhNRxJXu...` | 147/167 | 15 albums in artist-albums; 15 with Spotify IDs; 15 with YT playlists; 147/167 t... |
| artist | Tony Williams | yes | `6BWSXyptptsZmLlj3n8l...` | `PLXfSsRuFtVovNAJ8pkz...` | 70/70 | 8 albums in artist-albums; 8 with Spotify IDs; 8 with YT playlists; 70/70 tracks... |
| artist | Wayne Shorter | yes | `27Rl7A8jXEQOkIfUKOa6...` | `PLI6kLIhBBwmS-4V3eXa...` | 107/107 | 14 albums in artist-albums; 14 with Spotify IDs; 14 with YT playlists; 107/107 t... |

### gerwig

| entity_type | title | has_soundtrack | spotify_album_id | yt_playlist_id | yt_tracks | notes |
|-------------|-------|----------------|------------------|----------------|-----------|-------|
| film | Barbie | no | `` | `` |  |  |
| film | Lady Bird | no | `` | `` |  |  |
| film | Little Women | no | `` | `` |  |  |
| composer | Alexandre Desplat | yes | `6s9twOs9wMKOEluU5dkB...` | `PLkv-ZDBhPhZ1V9Mh6bU...` | 226/226 |/Users/j.d.heilprin/Desktop/unitedtribes-pocv2-jd/docs/soundtrack-audit-april-8-2026.md 11 albums in artist-albums; 11 with Spotify IDs; 11 with YT playlists; 226/226 t... |
| composer | Jon Brion | yes | `6jdfKgPpi6wchdjDSkH7...` | `OLAK5uy_lBpG_I2on3Ul...` | 74/97 | 6 albums in artist-albums; 6 with Spotify IDs; 5 with YT playlists; 74/97 tracks... |
| composer | Mark Ronson | yes | `62Qu5QoNx3De0p5qQT0u...` | `PLoM8BK906_HXh6FY4sm...` | 106/106 | 7 albums in artist-albums; 7 with Spotify IDs; 7 with YT playlists; 106/106 trac... |

### pattismith

| entity_type | title | has_soundtrack | spotify_album_id | yt_playlist_id | yt_tracks | notes |
|-------------|-------|----------------|------------------|----------------|-----------|-------|
| film | Charlie Parker | yes | `00tuL4qPxBs3w8S1BaG3...` | `` |  | sonic: OST |
| film | Herman Melville | yes | `00tuL4qPxBs3w8S1BaG3...` | `` |  | sonic: OST |
| film | Just Kids | yes | `00tuL4qPxBs3w8S1BaG3...` | `` |  | sonic: OST |
| film | MC5 | yes | `0kT4F2mSpvTk3stwiaES...` | `PLRQKT-Cu2_2Rm4hXiWx...` | 40/40 | 4 albums in artist-albums; 4 with Spotify IDs; 4 with YT playlists; 40/40 tracks... |
| film | Oscar Brown Jr. | yes | `00tuL4qPxBs3w8S1BaG3...` | `` |  | sonic: OST |
| film | The Stooges | yes | `3MANoCcmaHWeXSuWiO3i...` | `PLMxy067kbpQjCZaATEz...` | 60/60 | 5 albums in artist-albums; 5 with Spotify IDs; 5 with YT playlists; 60/60 tracks... |
| film | Vachel Lindsay | yes | `00tuL4qPxBs3w8S1BaG3...` | `` |  | sonic: OST |
| film | William Blake | yes | `00tuL4qPxBs3w8S1BaG3...` | `` |  | sonic: OST |
| engineer | Horses (song) | yes | `00tuL4qPxBs3w8S1BaG3...` | `` |  | sonic: OST |
| artist | Albert Ayler | yes | `0X7WwByQT7NxJNhb8iHJ...` | `OLAK5uy_knSPTni0vJjB...` | 40/42 | 7 albums in artist-albums; 7 with Spotify IDs; 7 with YT playlists; 40/42 tracks... |
| artist | Allen Lanier | no | `` | `` |  | sonic: ARTIST |
| artist | Andy Warhol | no | `` | `` |  | sonic: ARTIST |
| artist | Bruce Springsteen | yes | `43YIoHKSrEw2GJsWmhZI...` | `PLr7gpDHqxU8Cv-vy2aF...` | 163/165 | 14 albums in artist-albums; 14 with Spotify IDs; 14 with YT playlists; 163/165 t... |
| artist | Doors | no | `` | `` |  | sonic: ARTIST |
| artist | Ed Hansen | no | `` | `` |  | sonic: ARTIST |
| artist | Electric Lady Studios | no | `` | `` |  | sonic: ARTIST |
| artist | Harry | no | `` | `` |  | sonic: ARTIST |
| artist | Ivan Kral | no | `` | `` |  | sonic: VIDEO,ARTIST |
| artist | Jackson Smith | no | `` | `` |  | sonic: ARTIST |
| artist | Janet Hamill | no | `` | `` |  | sonic: ARTIST |
| artist | Jay Dee Daugherty | no | `` | `` |  | sonic: VIDEO,ARTIST |
| artist | Joan of Arc | no | `` | `` |  | sonic: ARTIST |
| artist | John Cale | yes | `6oNqOeW4FADs5D8fEXOT...` | `OLAK5uy_nvQWHaiV26Kp...` | 118/118 | 9 albums in artist-albums; 9 with Spotify IDs; 9 with YT playlists; 118/118 trac... |
| artist | John Lennon | yes | `0DFYbYCcHCEJPcN1hODG...` | `PLI6kLIhBBwmTlgyQIrg...` | 120/120 | 8 albums in artist-albums; 8 with Spotify IDs; 8 with YT playlists; 120/120 trac... |
| artist | Lenny Kay | no | `` | `` |  | sonic: ARTIST |
| artist | Michelangelo | no | `` | `` |  | sonic: ARTIST |
| artist | Nirvana | yes | `2guirTSEqLizK7j9i1MT...` | `OLAK5uy_nN3UV5AlNbRP...` | 134/145 | 7 albums in artist-albums; 7 with Spotify IDs; 7 with YT playlists; 134/145 trac... |
| artist | Odilon Redon | no | `` | `` |  | sonic: ARTIST |
| artist | Oliver Ray | no | `` | `` |  | sonic: ARTIST |
| artist | Patti Smith | yes | `0OeuSeP8wp8n8OuTqYb6...` | `PLNPGM2D7aODemAbR6hX...` | 137/140 | 11 albums in artist-albums; 11 with Spotify IDs; 11 with YT playlists; 137/140 t... |
| artist | Persian necklace | yes | `00tuL4qPxBs3w8S1BaG3...` | `` |  | sonic: OST |
| artist | Radio Ethiopia | no | `` | `` |  | sonic: ARTIST |
| artist | Richard Sohl | no | `` | `` |  | sonic: VIDEO,ARTIST |
| artist | Rolling Stones (song) | no | `` | `` |  | sonic: ARTIST |
| artist | Sam Shepard | no | `` | `` |  | sonic: VIDEO,ARTIST |
| artist | The Ramones | yes | `00tuL4qPxBs3w8S1BaG3...` | `` |  | sonic: OST |
| artist | Tom Verlaine | yes | `29ppQCPXvVWgJQXG4vkb...` | `PL2hTdNyFttDr92GHsgW...` | 89/91 | 8 albums in artist-albums; 8 with Spotify IDs; 8 with YT playlists; 89/91 tracks... |
| artist | Tom Verlaine (artist) | no | `` | `` |  | sonic: ARTIST |
| artist | Tony Shanahan | no | `` | `` |  | sonic: ARTIST |
| artist | Tosca | no | `` | `` |  | sonic: ARTIST |
| artist | Witt | no | `` | `` |  | sonic: ARTIST |
| artist | Wool Gathering | no | `` | `` |  | sonic: ARTIST |
| album | Horses | yes | `0OeuSeP8wp8n8OuTqYb6...` | `` |  | sonic: ALBUM |

### pluribus

| entity_type | title | has_soundtrack | spotify_album_id | yt_playlist_id | yt_tracks | notes |
|-------------|-------|----------------|------------------|----------------|-----------|-------|
| film | A Raisin in the Sun | no | `` | `` |  | sonic: FEATURED |
| film | Defending Your Life | no | `` | `` |  | sonic: FEATURED |
| film | El Camino | no | `` | `` |  | sonic: FEATURED |
| film | I Am Legend | no | `` | `` |  | sonic: FEATURED |
| film | Invasion of the Body Snatchers | no | `` | `` |  | sonic: FEATURED |
| film | Invasion of the Body Snatchers (1956) | no | `` | `` |  | sonic: FEATURED |
| film | Invasion of the Body Snatchers (1978) | no | `` | `` |  | sonic: FEATURED |
| film | Leaves of Grass | no | `` | `` |  | sonic: FEATURED |
| film | Ozymandias | no | `` | `` |  | sonic: FEATURED |
| film | Star Trek: First Contact | no | `` | `` |  | sonic: FEATURED |
| film | The Age of Miracles | no | `` | `` |  | sonic: FEATURED |
| film | The Omega Man | no | `` | `` |  | sonic: FEATURED |
| film | The Quiet Earth | no | `` | `` |  | sonic: FEATURED |
| film | The Shining | no | `` | `` |  | sonic: FEATURED |
| film | The Thing | no | `` | `` |  | sonic: FEATURED |
| film | The Truman Show | no | `` | `` |  | sonic: FEATURED |
| film | They Live | no | `` | `` |  | sonic: FEATURED |
| film | Village of the Damned | no | `` | `` |  | sonic: FEATURED |
| tv_show | Agents of S.H.I.E.L.D. | no | `` | `` |  | sonic: FEATURED |
| tv_show | Better Call Saul | no | `` | `` |  | sonic: FEATURED |
| tv_show | Breaking Bad | no | `` | `` |  | sonic: FEATURED |
| tv_show | Peacemaker | no | `` | `` |  | sonic: FEATURED |
| tv_show | Pluribus | yes | `33Ds6F0ADcFGqLWhEwLj...` | `` |  | sonic: OST,FEATURED |
| tv_show | The Twilight Zone | no | `` | `` |  | sonic: FEATURED |
| tv_show | The X-Files | no | `` | `` |  | sonic: FEATURED |
| tv_episode | Return of the Archons | no | `` | `` |  | sonic: FEATURED |
| tv_episode | The Twilight Zone: Eye of the Beholder ( | no | `` | `` |  | sonic: FEATURED |
| tv_episode | The Twilight Zone: Number 12 Looks Just  | no | `` | `` |  | sonic: FEATURED |
| tv_episode | The Twilight Zone: The Invaders (S2E15) | no | `` | `` |  | sonic: FEATURED |
| tv_episode | The Twilight Zone: The Monsters Are Due  | no | `` | `` |  | sonic: FEATURED |
| tv_episode | The Twilight Zone: Third from the Sun (S | no | `` | `` |  | sonic: FEATURED |
| tv_episode | This Side of Paradise | no | `` | `` |  | sonic: FEATURED |
| composer | Dave Porter | yes | `6vGrlVBMilC17KYggStD...` | `PLl4bPo2zEX90895cqrU...` | 245/245 | 11 albums in artist-albums; 11 with Spotify IDs; 11 with YT playlists; 245/245 t... |
| music_supervisor | Thomas Golubic | no | `` | `` |  | sonic: FEATURED |

### sinners

| entity_type | title | has_soundtrack | spotify_album_id | yt_playlist_id | yt_tracks | notes |
|-------------|-------|----------------|------------------|----------------|-----------|-------|
| film | Angel Heart | yes | `0zjAqh1Fr7XQWy1SlzGh...` | `` |  | sonic: OST |
| film | Black Panther | yes | `0zjAqh1Fr7XQWy1SlzGh...` | `` |  | sonic: OST |
| film | Black Panther: Wakanda Forever | yes | `0zjAqh1Fr7XQWy1SlzGh...` | `` |  | sonic: OST |
| film | Bram Stoker's Dracula | yes | `0zjAqh1Fr7XQWy1SlzGh...` | `` |  | sonic: OST |
| film | Creed | yes | `0zjAqh1Fr7XQWy1SlzGh...` | `` |  | sonic: OST |
| film | Eve's Bayou | yes | `0zjAqh1Fr7XQWy1SlzGh...` | `` |  | sonic: OST |
| film | Fruitvale Station | yes | `0zjAqh1Fr7XQWy1SlzGh...` | `` |  | sonic: OST |
| film | Get Out | yes | `0zjAqh1Fr7XQWy1SlzGh...` | `` |  | sonic: OST |
| film | Interview with the Vampire | yes | `0zjAqh1Fr7XQWy1SlzGh...` | `` |  | sonic: OST |
| film | Near Dark | yes | `0zjAqh1Fr7XQWy1SlzGh...` | `` |  | sonic: OST |
| film | Nosferatu | yes | `0zjAqh1Fr7XQWy1SlzGh...` | `` |  | sonic: OST |
| film | The Color Purple | yes | `0zjAqh1Fr7XQWy1SlzGh...` | `` |  | sonic: OST |
| tv_show | Midnight Mass | yes | `0zjAqh1Fr7XQWy1SlzGh...` | `` |  | sonic: OST |
| composer | Ludwig Göransson | yes | `6PQXsiHd4AjrAqhWLd5H...` | `PLeuk4c_cVcyrZLfQoWm...` | 100/100 | 5 albums in artist-albums; 5 with Spotify IDs; 5 with YT playlists; 100/100 trac... |
| composer | Raphael Saadiq | yes | `2Dfk3iSj303wZD28aXq5...` | `PLH_QLWlQVieXDrRTb0K...` | 229/241 | 28 albums in artist-albums; 28 with Spotify IDs; 19 with YT playlists; 229/241 t... |

---

## 4. People-to-Titles Cross-Reference

### Composers

| Person | Universe | Role | Score File | Albums | Linked Titles |
|--------|----------|------|------------|--------|---------------|
| Ludwig Goransson | sinners | composer | `sinners-ludwig-goransson-scores.json` | 28 | Creed (Original Motion Picture Score) (2015); Black Panther (Original Score) (2018); Venom (Original Motion Picture Soundtrack) (2018); Creed II (Score & Music from the Original Motion Picture) (2018); The Mandalorian: Chapter 1 (Original Score) (2019)... |
| Raphael Saadiq | sinners | composer | `sinners-raphael-saadiq-catalog.json` | 28 | Sinners (music/performer) |
| Dave Porter | pluribus | composer | `pluribus-dave-porter-scores.json` | 11 | Breaking Bad: Original Score from the Television Series (2012); Breaking Bad (Original Score from the Television Series), Vol. 2 (2013); Better Call Saul, Vol. 1 (Original Score from the TV Series) (2018); Better Call Saul, Vol. 2 (Original Score from the TV Series) (2022); Better Call Saul, Vol. 3 (Original Score from the TV Series) (2022)... |
| Jon Brion | gerwig | composer | `gerwig-jon-brion-scores.json` | 6 | Synecdoche, New York (Original Motion Picture Soundtrack); Lady Bird (Original Motion Picture Soundtrack) |
| Alexandre Desplat | gerwig | composer | `gerwig-alexandre-desplat-scores.json` | 11 | Gerwig: Little Women (Original Motion Picture Soundtrack). Also: Harry Potter and the Deathly Hallows, Pt. 1 (Original Motion Picture Soundtrack); The Tree of Life (Original Motion Picture Soundtrack); Harry Potter and the Deathly Hallows, Pt. 2 (Original Motion Picture Soundtrack)... |
| Mark Ronson | gerwig | composer | `gerwig-mark-ronson-catalog.json` | 7 | Barbie (Score from the Original Motion Picture Soundtrack) |

### Music Supervisors

| Person | Universe | Shows | In-Scope Titles |
|--------|----------|-------|-----------------|
| Thomas Golubic | pluribus | 19 total | In-scope: Breaking Bad, Better Call Saul, Pluribus, El Camino: A Breaking Bad Movie. Other: Silo, Your Honor, Halt and Catch Fire, Poker Face, Mayfair Witches... |

### Recording Engineers

| Person | Universe | File | Albums |
|--------|----------|------|--------|
| Rudy Van Gelder | bluenote | `rudy-van-gelder-albums.json` | 88 albums (88 Spotify, 87 YT playlists) |

### Performing Artists (in artist-albums.json)

| Universe | Artists | Total Albums | With Spotify | With YT Playlist | Tracks with YT IDs |
|----------|---------|-------------|-------------|-----------------|---------------------|
| bluenote | 44 | 433 | 433 | 433 | 3830/4127 |
| gerwig | 31 | 101 | 101 | 100 | 1505/1593 |
| pattismith | 33 | 315 | 315 | 314 | 3875/4174 |
| pluribus | 32 | 151 | 151 | 150 | 1800/1921 |
| sinners | 25 | 150 | 150 | 141 | 1934/1983 |

---

## 5. Drift Report (S3 vs Local)

Score/catalog files are all in sync. Universe JSON files show drift in all 5 universes:

| File | S3 (bytes) | Local (bytes) | Delta | Direction |
|------|-----------|--------------|-------|-----------|
| `bluenote-universe.json` | 388,640 | 617,011 | Local is 59% larger | Local has more data (likely local enrichments/patches merged) |
| `gerwig-universe.json` | 803,792 | 834,751 | Local is 3.9% larger | Minor drift |
| `pattismith-universe.json` | 654,582 | 952,218 | Local is 45% larger | Local has significantly more data |
| `pluribus-universe.json` | 1,054,628 | 1,018,716 | S3 is 3.5% larger | S3 has more data (recent harvester run?) |
| `pluribus-response.json` | 120,979 | 120,978 | 1 byte difference | Negligible — likely whitespace |
| `sinners-universe.json` | 558,402 | 558,158 | S3 is 244 bytes larger | Negligible — likely whitespace or single field |

**Files in sync:** All 5 `*-response.json` (except pluribus, 1 byte), all 5 `*-artist-albums.json`, all 9 score/catalog files.

**Key concern:** `bluenote-universe.json` and `pattismith-universe.json` local copies are substantially larger than S3. This suggests local-only enrichments that will be lost on the next `pull-data.sh` run unless pushed to S3 first.

---

## 6. Source-of-Truth Flags (IDs Only in Code)

These soundtrack IDs exist only in `App.jsx` constants and are **not** in any S3 data file. They are S3 migration candidates.

### LOCAL_ALBUM_PATCHES (line ~9719)

| Artist | Album | spotify_album_id | Notes |
|--------|-------|------------------|-------|
| Thelonious Monk | Thelonious Monk With John Coltrane | `5WqkiRiXHyiML0QkLjqooy` | Not in artist-albums.json. Empty tracks array. |

### LOCAL_ENTITY_OVERRIDES (line ~9734)

| Entity | Universe | sonic album_id | spotify_url | Notes |
|--------|----------|---------------|-------------|-------|
| The Hotel Chelsea | pattismith | `00tuL4qPxBs3w8S1BaG3Zv` | `https://open.spotify.com/album/00tuL4qPxBs3w8S1BaG3Zv` | 'Outside Society' by Patti Smith. Entity does not exist in S3 `pattismith-universe.json`. |

### CURATED_QUERY_RESPONSES (line ~820)

These contain editorial narratives with references to albums and artists but **no machine-readable soundtrack IDs** (no `spotify_album_id`, no `youtube_playlist_id`). The references are in prose form only. Not a migration candidate for structured data.

### LOCAL_ENTITY_PATCHES (line ~9674)

Contains only `type` corrections (e.g., `Bebop` from `film` to `theme`). **No soundtrack IDs.** Not a migration candidate.

---

## 7. Known Harvester Quirks

1. **Pattismith entity types are unreliable.** Many entities that should be `person`, `album`, `book`, or `place` are typed as `film` because the harvester's TMDB title search found a movie match. The `LOCAL_ENTITY_PATCHES` constant corrects some of these, but many remain (e.g., `Herman Melville`, `Just Kids`, `William Blake` are all typed `film`).

2. **Sinners entity type for 'Sinners' itself is `person`, not `film`.** The movie entity is mistyped, likely because TMDB returned a person result.

3. **Pluribus has duplicate entities.** `Invasion of the Body Snatchers` and `Invasion of the Body Snatchers (1978)` are separate entities for the same film. Similarly, multiple long-named Vince Gilligan entities appear to be parsing artifacts from the knowledge graph pipeline.

4. **Ludwig Goransson appears twice in sinners artist-albums.** Keys `Ludwig Goransson` (no diacritics) and `Ludwig Goransson` both exist, with 6 and 6 albums respectively (possibly overlapping). The universe JSON uses `Ludwig Goransson` with umlaut in the entity name but the artist-albums key doesn't always match.

5. **Score files have no YouTube playlist IDs.** The `ludwig-goransson-scores.json`, `raphael-saadiq-catalog.json`, `dave-porter-scores.json`, `jon-brion-scores.json`, and `alexandre-desplat-scores.json` files have Spotify album IDs but no YouTube playlist IDs and no per-track YouTube IDs. Only `artist-albums.json` has those.

6. **Rudy Van Gelder albums have 87/88 YouTube playlists** — one album (`Compulsion`) is missing a YouTube playlist.

7. **Score files have no `connection` field in many albums.** For Goransson, only albums with explicit Coogler connections are marked. Saadiq has no connections at all. This makes it hard to programmatically determine which score albums are relevant to the in-scope film/show.

8. **Gerwig artist-albums includes needle-drop artists (Dua Lipa, Billie Eilish, Nicki Minaj, etc.) but these are not in universe.json.** They appear only in artist-albums.json via the harvester's music extraction. The universe.json only lists Gerwig cast/crew/composers.

---

## 8. Open Questions for J.D.

1. **Bluenote/Pattismith universe drift:** Local copies are 45-59% larger than S3. Should these local enrichments be pushed to S3 before the next `pull-data.sh` run, or is the intent that S3 catches up via harvester runs?

2. **Pluribus films (18 entities) have no soundtrack data.** Films like The Thing, The Shining, The Truman Show, etc. are in the universe as influence entities but have zero Spotify/YouTube soundtrack IDs. Should these be backfilled, or are they out of scope for soundtrack surfacing?

3. **Sinners films (12 entities) have soundtrack data only via artist-albums.** Films like Black Panther, Creed, etc. don't have direct soundtrack album IDs on the entity — they rely on the composer score files having `connection` fields. Is this sufficient, or should the film entities themselves carry soundtrack IDs?

4. **Pattismith `film`-typed entities:** Should entities like `Herman Melville`, `Just Kids`, `Charlie Parker`, `Oscar Brown Jr.`, `The Stooges`, `Vachel Lindsay`, `William Blake` be excluded from this soundtrack audit? They're typed `film` in the data but are clearly books/people/bands. The patches only fix some of them.

5. **Hotel Chelsea in LOCAL_ENTITY_OVERRIDES:** When will this be migrated to S3? It carries a Spotify album_id (`00tuL4qPxBs3w8S1BaG3Zv` for 'Outside Society') that will be lost if someone removes the code constant.

6. **Thelonious Monk album patch:** The `Thelonious Monk With John Coltrane` album (Spotify ID `5WqkiRiXHyiML0QkLjqooy`) is in `LOCAL_ALBUM_PATCHES` but not in `artist-albums.json`. Should this be added to the S3 data?

7. **youtube_override_present column:** This requires a browser check to verify which entities have YouTube embed overrides applied at runtime. Marked as TODO throughout the CSV. Should this be audited separately?

8. **enriched-content-catalog.json (~24MB):** Skipped in this audit due to size. This file may contain additional soundtrack IDs not present in the universe or artist-albums files. Should it be audited separately?

9. **Gerwig needle-drop artists (Dua Lipa, Billie Eilish, etc.):** These appear in artist-albums.json but not in universe.json. Are they intended to surface in the app's soundtrack experience, or are they harvester artifacts?
