# Blue Note Album Inventory

**Source:** `src/data/blueNoteAlbums.json` (from `united-tribes-collaborative` repo)
**As of:** March 15, 2026

## Summary

- **118 total albums** in the database
- **83 with Spotify album IDs** (playable in AlbumPlayerModal)
- **35 missing Spotify IDs** (need to be looked up)
- **7 with YouTube playlist URLs** (in blueNoteAlbums.json)
- **3 with hardcoded YouTube track data** (individual video IDs in App.jsx ALBUM_YOUTUBE_TRACKS)
- **8 album cover images** downloaded to `public/assets/album-covers/`

---

## YouTube Playlist Albums (7 albums with YouTube URLs in data)

| Album | Artist | Year | YouTube Playlist |
|-------|--------|------|-----------------|
| Blue Train | John Coltrane | 1957 | PLKZWLu6q09LN0kEPS7OkuCoNfnWdDqqRM |
| A Love Supreme | John Coltrane | 1965 | OLAK5uy_n7bQ72Ttj3lYTwm9A1zDsM0IkQb5SXixc |
| Giant Steps | John Coltrane | 1960 | PLL-NbN8uTOihKYroltnyjB3X6pQkVccfe |
| Genius of Modern Music Volume 1 | Thelonious Monk | 1947 | (in data) |
| Thelonious Monk Quartet with John Coltrane at Carnegie Hall | Thelonious Monk Quartet | 1957 | (in data) |
| Thelonious Monk Trio | Thelonious Monk | 1954 | (in data) |
| The Genius of Modern Music | Thelonious Monk | 1947 | (in data) |

## YouTube Track Data (3 albums with individual video IDs in ALBUM_YOUTUBE_TRACKS)

These have per-track YouTube video IDs hardcoded in App.jsx, enabling the 60/40 split player with track-by-track navigation:

**Blue Train** (5 tracks): Blue Train, Moment's Notice, Locomotion, I'm Old Fashioned, Lazy Bird
**A Love Supreme** (4 tracks): Pt. I Acknowledgement, Pt. II Resolution, Pt. III Pursuance, Pt. IV Psalm
**Giant Steps** (7 tracks): Giant Steps, Cousin Mary, Countdown, Spiral, Syeeda's Song Flute, Naima, Mr. P.C.

---

## Album Cover Images (8 files in `public/assets/album-covers/`)

- a-love-supreme-1965.jpg
- blue-train-1957.jpg
- maiden-voyage-1965.jpg
- moanin-1958.jpg
- sidewinder-1963.jpg
- song-for-my-father-1964.jpg
- speak-no-evil-1964.jpg
- the-cooker-1957.jpg

**110 albums have NO cover image.** Justin's collaborative repo only had these 8.

---

## Full Album List (118 albums)

### With Spotify ID (83 albums — playable)

| # | Album | Artist | Year | Spotify ID |
|---|-------|--------|------|-----------|
| 1 | Blue Train | John Coltrane | 1957 | 2Z11cXWE |
| 2 | A Love Supreme | John Coltrane | 1965 | 7Eoz7hJv |
| 3 | Giant Steps | John Coltrane | 1960 | 7cZ6oBx0 |
| 4 | Kind of Blue | Miles Davis | 1959 | 1weenld6 |
| 5 | Walkin' | Miles Davis | 1954 | 7nFwdPkE |
| 6 | Moanin' | Art Blakey | 1958 | 2D4kqfmU |
| 7 | The Big Beat | Art Blakey | 1960 | 7Bt7AQSn |
| 8 | A Night at Birdland Volume 1 | Art Blakey | 1954 | 00kSJu1s |
| 9 | Song for My Father | Horace Silver | 1964 | 4LEnATSq |
| 10 | Blowin' the Blues Away | Horace Silver | 1959 | 5gqHv0Wy |
| 11 | Finger Poppin' | Horace Silver | 1959 | 3buPlC7V |
| 12 | The Sidewinder | Lee Morgan | 1963 | 3d6tzNMy |
| 13 | The Cooker | Lee Morgan | 1957 | 47AT8h8V |
| 14 | Cornbread | Lee Morgan | 1965 | 5aY4PliF |
| 15 | Speak No Evil | Wayne Shorter | 1964 | 0UhFHMnS |
| 16 | Night Dreamer | Wayne Shorter | 1964 | 2lcz9fPw |
| 17 | Juju | Wayne Shorter | 1964 | 46VoobaZ |
| 18 | Maiden Voyage | Herbie Hancock | 1965 | 4PMwCdbT |
| 19 | Takin' Off | Herbie Hancock | 1962 | 6TylsbZ1 |
| 20 | Empyrean Isles | Herbie Hancock | 1964 | 11TXHm0x |
| 21 | Genius of Modern Music Volume 1 | Thelonious Monk | 1947 | 3dw9k0UH |
| 22 | Monk Quartet w/ Coltrane at Carnegie Hall | Thelonious Monk Quartet | 1957 | 7AOFwOsk |
| 23 | Thelonious Monk Trio | Thelonious Monk | 1954 | 0mPCuxih |
| 24 | Volume 1 | Sonny Rollins | 1956 | 69vyomdG |
| 25 | Volume 2 | Sonny Rollins | 1957 | 69vyomdG |
| 26 | Memorial Album | Clifford Brown | 1956 | 5ZhKPGum |
| 27 | The Amazing Bud Powell Volume 1 | Bud Powell | 1951 | 4JZpydaQ |
| 28 | The Amazing Bud Powell Volume 2 | Bud Powell | 1953 | 0g89pAOt |
| 29 | Doin' Allright | Dexter Gordon | 1961 | 5HSURQb3 |
| 30 | Go! | Dexter Gordon | 1962 | 5nEJj9bj |
| 31 | Our Man in Paris | Dexter Gordon | 1963 | 1igojJAX |
| 32 | Grant's First Stand | Grant Green | 1961 | 3qhhNNKk |
| 33 | Idle Moments | Grant Green | 1963 | 1lDtUlOP |
| 34 | Page One | Joe Henderson | 1963 | 7mQGTuvm |
| 35 | Point of Departure | Andrew Hill | 1964 | 647o8vl4 |
| 36 | Out to Lunch! | Eric Dolphy | 1964 | 3PIVqZzL |
| 37 | The Shape of Jazz to Come | Ornette Coleman | 1959 | 2iPH3iUm |
| 38 | Mingus Ah Um | Charles Mingus | 1959 | 7pojWP7x |
| 39 | Waltz for Debby | Bill Evans | 1961 | 34IpO0C1 |
| 40 | The Real McCoy | McCoy Tyner | 1967 | 22HoIP0a |
| 41 | The Sermon | Jimmy Smith | 1958 | 6foGf3FK |
| 42 | Bird and Diz | Charlie Parker & Dizzy Gillespie | 1950 | 7fqJuMTD |
| 43 | Charlie Parker with Strings | Charlie Parker | 1950 | 1Oi0R0x1 |
| 44 | The Genius of Modern Music | Thelonious Monk | 1947 | 6DRjwkPa |
| 45 | Such Sweet Thunder | Duke Ellington Orchestra | 1957 | 1weenld6 |
| 46 | Ellington at Newport | Duke Ellington Orchestra | 1956 | 1weenld6 |
| 47 | Money Jungle | Duke Ellington Trio | 1962 | 2QJyDqHO |
| 48 | Midnight Blue | Kenny Burrell | 1963 | 1uSzUDw4 |
| 49 | Guitar Forms | Kenny Burrell | 1965 | 16Wq2YvX |
| 50 | Blue Lights | Kenny Burrell | 1958 | 3t3ekgaW |
| 51 | The Complete RCA Victor Recordings | Dizzy Gillespie | 1995 | 6V4LqrfF |
| 52 | Dizzy in Greece | Dizzy Gillespie | 1957 | 3pAE2BGZ |
| 53 | Sonny Side Up | Dizzy Gillespie, Rollins & Stitt | 1957 | 7v1gY2Fh |
| 54 | Virtuoso | Joe Pass | 1974 | 49JWwwpm |
| 55 | For Django | Joe Pass | 1964 | 52hlifh2 |
| 56 | Intercontinental | Joe Pass | 1970 | 2zdmAZyb |
| 57 | Kenny Drew And His Progressive Piano | Kenny Drew | 1956 | 3xelKHGo |
| 58 | This is New | Kenny Drew | 2010 | 3HTS4XPP |
| 59 | Four Classic Albums (Remastered) | Kenny Drew | 2013 | 0DLP5YTF |
| 60 | Bass On Top | Paul Chambers Quartet | 2014 | 0lNA6SIC |
| 61 | The Upright Jazz Bass Groove | Paul Chambers | 2013 | 7cmWrOKK |
| 62 | Classic Chambers, Vol. 4: Bass on Top | Paul Chambers | 2013 | 1ICFqvUp |
| 63 | Loud Jazz | John Scofield | 1987 | 3xgsHdNw |
| 64 | Blue Matter | John Scofield | 1986 | 0FJnmv6G |
| 65 | Hand Jive | John Scofield | 1993 | 01MeOXVO |
| 66 | Jazz Workshop (Live Boston '76) | Pat Metheny | 1976 | 14P2EGZf |
| 67 | Bright Size Life | Pat Metheny | 1976 | 1wyaHGxX |
| 68 | Pat Metheny Group | Pat Metheny Group | 1978 | 4TC69U5H |
| 69 | The Trumpet Artistry Of Chet Baker | Chet Baker | 1955 | 7HFvgWxt |
| 70 | Chet Baker Sings | Chet Baker | 1956 | 5JJ779nr |
| 71 | My Funny Valentine | Chet Baker | 1958 | 2aRY7rbW |
| 72 | Notes From New York | Bill Charlap Trio | 2016 | 1ljvVXm0 |
| 73 | All Through The Night | Bill Charlap | 2010 | 28aHCJEr |
| 74 | Love Is Here To Stay | Bill Charlap | 2011 | 3aZfHPZv |
| 75 | Drums Around The World | Philly Joe Jones | 1992 | 481MjZxf |
| 76 | Jazz Drummer Jones, Vol. 6 | Philly Joe Jones | 2013 | 2OU0lUx1 |
| 77 | Philly Joe's Beat (1961 Birdland) | Philly Joe Jones | 1961 | 57oyLSko |
| 78 | In the Wee Small Hours | Frank Sinatra | 1955 | 3GmwKB1t |
| 79 | Songs for Swingin' Lovers! | Frank Sinatra | 1956 | 4kca7vXd |
| 80 | Come Fly with Me | Frank Sinatra | 1958 | 66v9QmjA |
| 81 | Soul Station | Hank Mobley | 1960 | 731OW49h |
| 82 | Roll Call | Hank Mobley | 1960 | 2wXfYEZK |
| 83 | Workout | Hank Mobley | 1961 | 0ho5QwQE |

### Missing Spotify ID (35 albums — NOT playable yet)

| # | Album | Artist | Year |
|---|-------|--------|------|
| 1 | Bags' Groove | Miles Davis | 1957 |
| 2 | The Stylings of Silver | Horace Silver | 1957 |
| 3 | Newk's Time | Sonny Rollins | 1959 |
| 4 | New Star on the Horizon | Clifford Brown | 1953 |
| 5 | Clifford Brown & Max Roach | Clifford Brown | 1954 |
| 6 | Bud Powell's Moods | Bud Powell | 1955 |
| 7 | Green Street | Grant Green | 1961 |
| 8 | Byrd in Flight | Donald Byrd | 1960 |
| 9 | Free Form | Donald Byrd | 1961 |
| 10 | A New Perspective | Donald Byrd | 1963 |
| 11 | Bluesnik | Jackie McLean | 1961 |
| 12 | Let Freedom Ring | Jackie McLean | 1962 |
| 13 | One Step Beyond | Jackie McLean | 1963 |
| 14 | Open Sesame | Freddie Hubbard | 1960 |
| 15 | Hub-Tones | Freddie Hubbard | 1962 |
| 16 | Ready for Freddie | Freddie Hubbard | 1961 |
| 17 | In 'N Out | Joe Henderson | 1964 |
| 18 | Inner Urge | Joe Henderson | 1964 |
| 19 | Black Fire | Andrew Hill | 1963 |
| 20 | Judgment! | Andrew Hill | 1964 |
| 21 | Outward Bound | Eric Dolphy | 1960 |
| 22 | Far Cry | Eric Dolphy | 1960 |
| 23 | Life Time | Tony Williams | 1964 |
| 24 | Spring | Tony Williams | 1965 |
| 25 | Emergency! | Tony Williams | 1969 |
| 26 | Change of the Century | Ornette Coleman | 1959 |
| 27 | This Is Our Music | Ornette Coleman | 1960 |
| 28 | The Black Saint and the Sinner Lady | Charles Mingus | 1963 |
| 29 | Blues & Roots | Charles Mingus | 1959 |
| 30 | Portrait in Jazz | Bill Evans | 1959 |
| 31 | Sunday at the Village Vanguard | Bill Evans | 1961 |
| 32 | Tender Moments | McCoy Tyner | 1967 |
| 33 | Expansions | McCoy Tyner | 1968 |
| 34 | House Party | Jimmy Smith | 1958 |
| 35 | Home Cookin' | Jimmy Smith | 1958 |

---

## Data Quality Notes

- Some Spotify IDs appear duplicated (e.g., Sonny Rollins Vol 1 and Vol 2 share `69vyomdG`; Duke Ellington albums share `1weenld6` which is actually Kind of Blue)
- Album cover images only exist for 8 of 118 albums — the rest would need SML API or manual sourcing
- YouTube track data (individual video IDs) only exists for 3 albums — the rest fall back to playlist embed or have no YouTube at all
- Several albums are not actually Blue Note releases (Kind of Blue is Columbia, Giant Steps is Atlantic, Frank Sinatra is Capitol) — they're included because the artists are connected to Blue Note
