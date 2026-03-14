/**
 * Add 8 contemporary Blue Note artists to the universe and response JSON files.
 * Run: node scripts/add-contemporary-artists.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "src", "data");

const universePath = join(DATA_DIR, "bluenote-universe.json");
const responsePath = join(DATA_DIR, "bluenote-response.json");

// ─── New Artist Entities ─────────────────────────────────────────────────────

const NEW_ARTISTS = {
  "Robert Glasper": {
    type: "artist",
    emoji: "🎹",
    badge: "Verified Entity",
    subtitle: "Music Artist · contemporary jazz, neo-soul, jazz-rap",
    stats: [
      { value: "78", label: "Popularity" },
      { value: "contemporary jazz", label: "Genre" },
    ],
    tags: ["contemporary jazz", "neo-soul", "jazz-rap", "post-bop", "nu jazz"],
    avatarGradient: "linear-gradient(135deg, #2563eb, #60a5fa)",
    photoUrl:
      "https://www.bluenote.com/wp-content/uploads/sites/956/2019/03/RobertGlasper_MathieuBittonL1007533_sq.jpg",
    posterUrl: null,
    bio: [
      'Robert Glasper is arguably the most important bridge figure between jazz and hip-hop to emerge in the 21st century, a pianist and producer whose work on Blue Note Records has done more to dissolve the barriers between those traditions than perhaps any artist since Herbie Hancock\'s "Headhunters" era. Born in Houston, Texas, and raised on a diet of gospel, jazz, and hip-hop, Glasper made his Blue Note debut in 2005 with the acoustic trio album "Canvas," but it was the formation of the Robert Glasper Experiment — with bassist Derrick Hodge, saxophonist/vocoder player Casey Benjamin, and drummer Chris Dave — that set the stage for a seismic shift. His landmark 2012 album "Black Radio" landed at number one on the jazz chart, won the Grammy for Best R&B Album, and proved that jazz musicians could speak fluently in the language of hip-hop, neo-soul, and R&B without sacrificing the improvisatory heart of the music.',
      'Glasper\'s influence extends far beyond his own recordings. As a producer and collaborator, he has shaped albums by Kendrick Lamar, Mac Miller, Anderson .Paak, Common, and Brittany Howard, while his supergroups — Dinner Party (with Terrace Martin, Kamasi Washington, and 9th Wonder) and August Greene (with Common and Karriem Riggins) — have further expanded the jazz-hip-hop conversation. His 2015 acoustic return "Covered" proved he remained a formidable straight-ahead pianist, and his prolific 2024 output demonstrated that he shows no signs of slowing down. For Blue Note, Glasper represents the continuation of the label\'s long tradition of pushing jazz into dialogue with the popular music of its era — just as Art Blakey, Herbie Hancock, and Norah Jones did in their respective times.',
    ],
    quickViewGroups: [
      {
        label: "Videos",
        items: [
          {
            title: "NPR Tiny Desk Concert",
            meta: "Robert Glasper Experiment · NPR Music",
            video_id: "oGTVoX7AaRc",
            thumbnail: `https://i.ytimg.com/vi/oGTVoX7AaRc/hqdefault.jpg`,
          },
          {
            title: "Jazz Night in America",
            meta: "Robert Glasper · NPR",
            video_id: "Caxwob1iKX4",
            thumbnail: `https://i.ytimg.com/vi/Caxwob1iKX4/hqdefault.jpg`,
          },
          {
            title: "Don Was Interview",
            meta: "Robert Glasper · Blue Note Records",
            video_id: "JVpx14KFks8",
            thumbnail: `https://i.ytimg.com/vi/JVpx14KFks8/hqdefault.jpg`,
          },
        ],
      },
      {
        label: "Music",
        items: [
          {
            title: "Afro Blue (feat. Erykah Badu)",
            meta: "Black Radio · 2012",
            spotify_url:
              "https://open.spotify.com/track/4NsPgRPUf6xLb1EMN5UN3f",
          },
          {
            title: "Ah Yeah",
            meta: "Black Radio 2 · 2013",
            spotify_url:
              "https://open.spotify.com/track/3DWxJ48JYWqfprWdkMOJBe",
          },
          {
            title: "Levels (feat. Bilal)",
            meta: "Black Radio III · 2022",
            spotify_url:
              "https://open.spotify.com/track/2NzPKlNyOiGXqMAybqICq5",
          },
        ],
      },
    ],
    completeWorks: [
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Black Radio",
        role: "Artist · Blue Note Records",
        meta: "2012 · Grammy Winner: Best R&B Album",
        context:
          "Genre-defining fusion of jazz, hip-hop, and R&B featuring Erykah Badu, Lupe Fiasco, and Bilal.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2012,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Black Radio 2",
        role: "Artist · Blue Note Records",
        meta: "2013",
        context:
          "Star-studded sequel featuring Common, Jill Scott, Brandy, and Norah Jones.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2013,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Covered",
        role: "Artist · Blue Note Records",
        meta: "2015",
        context:
          "Return to acoustic trio format, recorded live at Capitol Studios. Covers of Radiohead, Joni Mitchell, and Musiq Soulchild.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2015,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Double Booked",
        role: "Artist · Blue Note Records",
        meta: "2009",
        context:
          "Split concept — acoustic trio on side A, debut of The Experiment on side B.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2009,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Black Radio III",
        role: "Artist · Blue Note Records",
        meta: "2022",
        context: "Third installment of the genre-crossing Black Radio series.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2022,
      },
    ],
    collaborators: [
      {
        name: "Derrick Hodge",
        role: "Bassist",
        projects: "Robert Glasper Experiment",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Erykah Badu",
        role: "Vocalist",
        projects: "Black Radio",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Kendrick Lamar",
        role: "Rapper/Producer",
        projects: "To Pimp a Butterfly",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Terrace Martin",
        role: "Producer/Saxophonist",
        projects: "Dinner Party",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Herbie Hancock",
        role: "Pianist/Mentor",
        projects: "Collaboration",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Common",
        role: "Rapper",
        projects: "August Greene",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Art Blakey",
        role: "Influence",
        projects: "Jazz Messengers tradition",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Chris Dave",
        role: "Drummer",
        projects: "Robert Glasper Experiment",
        projectCount: 1,
        photoUrl: null,
      },
    ],
    sonic: [
      {
        type: "Spotify",
        title: "Robert Glasper",
        meta: "Artist",
        spotify_url: "https://open.spotify.com/artist/5cM1PvItlR21WUyBnsdMcn",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
      },
    ],
    graphNodes: [
      { x: 200, y: 200, r: 18, label: "Robert Glasper", color: "#2563eb" },
      { x: 80, y: 100, r: 8, label: "Erykah Badu", color: "#7c3aed" },
      { x: 320, y: 100, r: 8, label: "Kendrick Lamar", color: "#7c3aed" },
      { x: 60, y: 250, r: 8, label: "Herbie Hancock", color: "#7c3aed" },
      { x: 340, y: 250, r: 8, label: "Terrace Martin", color: "#7c3aed" },
      { x: 120, y: 340, r: 8, label: "Common", color: "#7c3aed" },
      { x: 280, y: 340, r: 8, label: "Art Blakey", color: "#f59e0b" },
      { x: 200, y: 80, r: 8, label: "Black Radio", color: "#16803c" },
    ],
    graphEdges: [
      [200, 200, 80, 100],
      [200, 200, 320, 100],
      [200, 200, 60, 250],
      [200, 200, 340, 250],
      [200, 200, 120, 340],
      [200, 200, 280, 340],
      [200, 200, 200, 80],
    ],
    interviews: [
      {
        type: "Video",
        typeBadgeColor: "#dc2626",
        title: "Robert Glasper: What Jazz Means in 2024",
        meta: "Jazz Night in America · NPR",
        context:
          "Glasper discusses bridging jazz and hip-hop and the future of the music.",
        platform: "YouTube",
        platformColor: "#FF0000",
        icon: "▶",
        video_id: "Caxwob1iKX4",
        thumbnail: "https://i.ytimg.com/vi/Caxwob1iKX4/hqdefault.jpg",
      },
      {
        type: "Video",
        typeBadgeColor: "#dc2626",
        title: "Don Was Interviews Robert Glasper",
        meta: "Blue Note Records",
        context:
          "Blue Note president Don Was sits down with Glasper to talk about his journey.",
        platform: "YouTube",
        platformColor: "#FF0000",
        icon: "▶",
        video_id: "JVpx14KFks8",
        thumbnail: "https://i.ytimg.com/vi/JVpx14KFks8/hqdefault.jpg",
      },
      {
        type: "Video",
        typeBadgeColor: "#dc2626",
        title: "The Daily Show Interview",
        meta: "Comedy Central",
        context: "Glasper discusses Black Radio and jazz-hip-hop fusion.",
        platform: "YouTube",
        platformColor: "#FF0000",
        icon: "▶",
        video_id: "04s0phzbqNU",
        thumbnail: "https://i.ytimg.com/vi/04s0phzbqNU/hqdefault.jpg",
      },
    ],
  },

  "Bill Charlap": {
    type: "artist",
    emoji: "🎹",
    badge: "Verified Entity",
    subtitle: "Music Artist · mainstream jazz, piano jazz, standards",
    stats: [
      { value: "38", label: "Popularity" },
      { value: "mainstream jazz", label: "Genre" },
    ],
    tags: [
      "mainstream jazz",
      "piano jazz",
      "standards",
      "post-bop",
      "vocal jazz",
    ],
    avatarGradient: "linear-gradient(135deg, #0891b2, #22d3ee)",
    photoUrl:
      "https://www.bluenote.com/wp-content/uploads/sites/956/2019/03/BillCharlap_1a_sq_byCarolFriedman.jpg",
    posterUrl: null,
    bio: [
      'Bill Charlap is one of the most eloquent interpreters of the Great American Songbook working in jazz today, a pianist whose understated elegance, crystalline touch, and deep reverence for melody have earned him a place among the finest mainstream jazz pianists of his generation. Born into a musical household — his father was Broadway composer Moose Charlap, his mother the singer Sandy Stewart — Charlap absorbed the Songbook tradition from childhood and brought it to Blue Note Records with his 2000 breakthrough "Written in the Stars." In the years that followed, he produced a string of exquisitely crafted albums devoted to the works of Hoagy Carmichael ("Stardust"), Leonard Bernstein ("Somewhere"), and George Gershwin, each one a masterclass in taste, swing, and interpretive intelligence.',
      'The Bill Charlap Trio — with bassist Peter Washington and drummer Kenny Washington, together since 1997 — is one of the great working groups in modern jazz, a unit whose nearly three decades of telepathic interplay have produced some of the most satisfying piano trio recordings of the 21st century. Their Grammy-nominated "Live at the Village Vanguard" and the 2024 follow-up "And Then Again" capture the trio at its most spontaneous and intuitive. Beyond the trio, Charlap\'s Grammy-winning collaboration with Tony Bennett ("The Silver Lining: The Songs of Jerome Kern") and his duo recordings with his wife, the pianist Renee Rosnes, underscore his versatility and standing in the music.',
    ],
    quickViewGroups: [],
    completeWorks: [
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Written in the Stars",
        role: "Artist · Blue Note Records",
        meta: "2000",
        context:
          "Blue Note breakthrough; trio with Peter Washington and Kenny Washington.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2000,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Stardust",
        role: "Artist · Blue Note Records",
        meta: "2002",
        context: "The music of Hoagy Carmichael.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2002,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Somewhere: The Songs of Leonard Bernstein",
        role: "Artist · Blue Note Records",
        meta: "2004 · Grammy Nominated",
        context: "All-Bernstein program; one of his most acclaimed recordings.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2004,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Live at the Village Vanguard",
        role: "Artist · Blue Note Records",
        meta: "2007 · Grammy Nominated",
        context:
          "Trio captured live at the legendary club; peak interplay with Peter and Kenny Washington.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2007,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "And Then Again",
        role: "Artist · Blue Note Records",
        meta: "2024",
        context: "Second live Village Vanguard recording on Blue Note.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2024,
      },
    ],
    collaborators: [
      {
        name: "Peter Washington",
        role: "Bassist",
        projects: "Bill Charlap Trio",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Kenny Washington",
        role: "Drummer",
        projects: "Bill Charlap Trio",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Tony Bennett",
        role: "Vocalist",
        projects: "The Silver Lining",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Renee Rosnes",
        role: "Pianist",
        projects: "Double Portrait",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Wynton Marsalis",
        role: "Trumpeter",
        projects: "Village Vanguard duo",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Sandy Stewart",
        role: "Vocalist (mother)",
        projects: "Love Is Here to Stay",
        projectCount: 1,
        photoUrl: null,
      },
    ],
    sonic: [
      {
        type: "Spotify",
        title: "Bill Charlap",
        meta: "Artist",
        spotify_url: "https://open.spotify.com/artist/6bWOjlaBcMfbdPQlOg5jUx",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
      },
    ],
    graphNodes: [
      { x: 200, y: 200, r: 16, label: "Bill Charlap", color: "#0891b2" },
      { x: 80, y: 120, r: 8, label: "Peter Washington", color: "#7c3aed" },
      { x: 320, y: 120, r: 8, label: "Kenny Washington", color: "#7c3aed" },
      { x: 60, y: 280, r: 8, label: "Tony Bennett", color: "#7c3aed" },
      { x: 340, y: 280, r: 8, label: "Renee Rosnes", color: "#7c3aed" },
      { x: 200, y: 80, r: 8, label: "Village Vanguard", color: "#16803c" },
    ],
    graphEdges: [
      [200, 200, 80, 120],
      [200, 200, 320, 120],
      [200, 200, 60, 280],
      [200, 200, 340, 280],
      [200, 200, 200, 80],
    ],
    interviews: [
      {
        type: "Article",
        typeBadgeColor: "#16803c",
        title: "Bill Charlap: The Art of the Trio",
        meta: "JazzTimes",
        context:
          "Profile of Charlap's approach to the Great American Songbook and trio playing.",
        platform: "JazzTimes",
        platformColor: "#333",
        icon: "📰",
      },
      {
        type: "Article",
        typeBadgeColor: "#16803c",
        title: "Bill Charlap Returns to the Village Vanguard",
        meta: "DownBeat",
        context:
          "Interview ahead of the recording sessions for And Then Again.",
        platform: "DownBeat",
        platformColor: "#333",
        icon: "📰",
      },
    ],
  },

  "Gregory Porter": {
    type: "artist",
    emoji: "🎤",
    badge: "Verified Entity",
    subtitle: "Music Artist · vocal jazz, soul jazz, gospel jazz",
    stats: [
      { value: "72", label: "Popularity" },
      { value: "vocal jazz", label: "Genre" },
    ],
    tags: [
      "vocal jazz",
      "soul jazz",
      "gospel jazz",
      "neo-soul",
      "contemporary jazz",
    ],
    avatarGradient: "linear-gradient(135deg, #d97706, #fbbf24)",
    photoUrl:
      "https://www.bluenote.com/wp-content/uploads/sites/956/2019/03/GregoryPorter2047_byErikUmphery.jpg",
    posterUrl: null,
    bio: [
      'Gregory Porter is the most commanding male jazz vocalist to emerge since the turn of the millennium, a baritone of enormous warmth, power, and spiritual depth whose 2013 Blue Note debut "Liquid Spirit" announced the arrival of a singular talent. Born in Sacramento and raised in Bakersfield, California, where his mother Ruth was a minister, Porter absorbed gospel, soul, and the Nat King Cole records his mother treasured. A promising football career at San Diego State University was cut short by a shoulder injury, but that detour led him to the jazz clubs of San Diego, where mentors like saxophonist Kamau Kenyatta recognized the rare quality of his voice. By the time he signed with Blue Note, Porter had already released two acclaimed albums on Motema Music, but it was "Liquid Spirit" — perched atop the Billboard Jazz chart for a full year — that made him a global star and earned his first Grammy for Best Jazz Vocal Album.',
      'Porter followed that triumph with "Take Me to the Alley" (2016), which earned a second Grammy, and the deeply personal "Nat King Cole & Me" (2017), a tribute to the singer his mother loved most. His 2020 album "All Rise" found him addressing social upheaval with characteristic grace, while a 2023 holiday album, "Christmas Wish," earned a Grammy nomination in the pop category — testimony to his crossover appeal. With his trademark flat cap, his booming baritone, and a songwriting gift that channels the devotional intensity of gospel and the storytelling clarity of classic soul, Porter has become Blue Note\'s most commercially successful vocal artist in decades.',
    ],
    quickViewGroups: [],
    completeWorks: [
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Liquid Spirit",
        role: "Artist · Blue Note Records",
        meta: "2013 · Grammy Winner: Best Jazz Vocal Album",
        context:
          "#1 Jazz chart for 52 weeks; the album that made Porter a global star.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2013,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Take Me to the Alley",
        role: "Artist · Blue Note Records",
        meta: "2016 · Grammy Winner: Best Jazz Vocal Album",
        context: "Second Grammy; cemented Porter as the preeminent jazz vocalist.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2016,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Nat King Cole & Me",
        role: "Artist · Blue Note Records",
        meta: "2017",
        context:
          "Tribute to the singer his mother loved most; performed with orchestras worldwide.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2017,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "All Rise",
        role: "Artist · Blue Note Records",
        meta: "2020",
        context:
          "Original songwriting addressing social themes amid the pandemic.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2020,
      },
    ],
    collaborators: [
      {
        name: "Kamau Kenyatta",
        role: "Producer/Mentor",
        projects: "Liquid Spirit",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Disclosure",
        role: "Electronic Duo",
        projects: "Holding On",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Chip Crawford",
        role: "Pianist",
        projects: "Touring Band",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Norah Jones",
        role: "Blue Note labelmate",
        projects: "Blue Note Records",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Don Was",
        role: "Label President",
        projects: "Blue Note Records",
        projectCount: 1,
        photoUrl: null,
      },
    ],
    sonic: [
      {
        type: "Spotify",
        title: "Gregory Porter",
        meta: "Artist",
        spotify_url: "https://open.spotify.com/artist/06nevPmNVfWUXyZkccahL8",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
      },
    ],
    graphNodes: [
      { x: 200, y: 200, r: 16, label: "Gregory Porter", color: "#d97706" },
      { x: 80, y: 120, r: 8, label: "Kamau Kenyatta", color: "#7c3aed" },
      { x: 320, y: 120, r: 8, label: "Disclosure", color: "#7c3aed" },
      { x: 60, y: 280, r: 8, label: "Nat King Cole", color: "#f59e0b" },
      { x: 340, y: 280, r: 8, label: "Blue Note Records", color: "#3b6fa0" },
      { x: 200, y: 80, r: 8, label: "Liquid Spirit", color: "#16803c" },
    ],
    graphEdges: [
      [200, 200, 80, 120],
      [200, 200, 320, 120],
      [200, 200, 60, 280],
      [200, 200, 340, 280],
      [200, 200, 200, 80],
    ],
    interviews: [
      {
        type: "Article",
        typeBadgeColor: "#16803c",
        title: "Gregory Porter: The Voice of Blue Note",
        meta: "DownBeat",
        context:
          "Profile of Porter's journey from Bakersfield gospel to jazz stardom.",
        platform: "DownBeat",
        platformColor: "#333",
        icon: "📰",
      },
      {
        type: "Article",
        typeBadgeColor: "#16803c",
        title: "Gregory Porter on Nat King Cole and Legacy",
        meta: "NPR Music",
        context:
          "Interview about the Nat King Cole tribute album and his mother's influence.",
        platform: "NPR",
        platformColor: "#333",
        icon: "📰",
      },
    ],
  },

  "Ambrose Akinmusire": {
    type: "artist",
    emoji: "🎺",
    badge: "Verified Entity",
    subtitle: "Music Artist · avant-garde jazz, post-bop, contemporary jazz",
    stats: [
      { value: "35", label: "Popularity" },
      { value: "avant-garde jazz", label: "Genre" },
    ],
    tags: [
      "avant-garde jazz",
      "post-bop",
      "contemporary jazz",
      "modern creative",
      "chamber jazz",
    ],
    avatarGradient: "linear-gradient(135deg, #dc2626, #f87171)",
    photoUrl:
      "https://www.bluenote.com/wp-content/uploads/sites/956/2019/03/AmbroseAkinmusire_1898sq_byChristieHemmKlok.jpg",
    posterUrl: null,
    bio: [
      'Ambrose Akinmusire is the most distinctive and searching trumpeter to arrive on the jazz scene since the turn of the century, an artist whose work on Blue Note Records has consistently challenged assumptions about what the instrument and the idiom can express. Born in Oakland, California, Akinmusire came up through the Berkeley High School Jazz Ensemble, where saxophonist Steve Coleman spotted his talent during a workshop. Studies at the Manhattan School of Music and the Thelonious Monk Institute of Jazz sharpened his craft, and victories at both the Thelonious Monk International Jazz Competition and the Carmine Caruso International Jazz Trumpet Solo Competition in 2007 announced him as a force to be reckoned with. His 2011 Blue Note debut "When the Heart Emerges Glistening," co-produced with Jason Moran, introduced a young quintet of extraordinary empathy.',
      'What sets Akinmusire apart is his refusal to settle for the conventional role of jazz trumpet soloist. His tone can be luminous or ghostly, assertive or barely there, and his compositions are closer to tone poems than blowing vehicles. The quartet he has maintained with pianist Sam Harris, bassist Harish Raghavan, and drummer Justin Brown is one of the most cohesive working groups in contemporary jazz. His 2020 album "on the tender spot of every calloused moment" earned a Grammy nomination and stands as a pinnacle of intimate, emotionally transparent jazz. Now serving as Artistic Director of the Herbie Hancock Institute of Jazz Performance at UCLA, Akinmusire continues to push the music forward while honoring its deepest traditions.',
    ],
    quickViewGroups: [],
    completeWorks: [
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "When the Heart Emerges Glistening",
        role: "Artist · Blue Note Records",
        meta: "2011",
        context:
          "Blue Note debut; co-produced with Jason Moran. Quintet with Walter Smith III and Gerald Clayton.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2011,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "the imagined savior is far easier to paint",
        role: "Artist · Blue Note Records",
        meta: "2014",
        context:
          "Expanded palette with string quartet and vocalists Becca Stevens and Theo Bleckmann.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2014,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "A Rift in Decorum: Live at the Village Vanguard",
        role: "Artist · Blue Note Records",
        meta: "2017",
        context:
          "Double live album; 14 original compositions capturing the quartet at full flight.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2017,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "on the tender spot of every calloused moment",
        role: "Artist · Blue Note Records",
        meta: "2020 · Grammy Nominated",
        context:
          "Grammy-nominated; quartet at its most refined and emotionally transparent.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2020,
      },
    ],
    collaborators: [
      {
        name: "Sam Harris",
        role: "Pianist",
        projects: "Quartet",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Harish Raghavan",
        role: "Bassist",
        projects: "Quartet",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Justin Brown",
        role: "Drummer",
        projects: "Quartet",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Gerald Clayton",
        role: "Pianist",
        projects: "When the Heart Emerges Glistening",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Jason Moran",
        role: "Producer",
        projects: "When the Heart Emerges Glistening",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Walter Smith III",
        role: "Tenor Saxophonist",
        projects: "Early albums",
        projectCount: 1,
        photoUrl: null,
      },
    ],
    sonic: [
      {
        type: "Spotify",
        title: "Ambrose Akinmusire",
        meta: "Artist",
        spotify_url: "https://open.spotify.com/artist/4ai53dgSBGhQwcFtGyY1bF",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
      },
    ],
    graphNodes: [
      {
        x: 200,
        y: 200,
        r: 16,
        label: "Ambrose Akinmusire",
        color: "#dc2626",
      },
      { x: 80, y: 120, r: 8, label: "Sam Harris", color: "#7c3aed" },
      { x: 320, y: 120, r: 8, label: "Gerald Clayton", color: "#7c3aed" },
      { x: 60, y: 280, r: 8, label: "Jason Moran", color: "#7c3aed" },
      { x: 340, y: 280, r: 8, label: "Justin Brown", color: "#7c3aed" },
      { x: 200, y: 80, r: 8, label: "Village Vanguard", color: "#16803c" },
    ],
    graphEdges: [
      [200, 200, 80, 120],
      [200, 200, 320, 120],
      [200, 200, 60, 280],
      [200, 200, 340, 280],
      [200, 200, 200, 80],
    ],
    interviews: [
      {
        type: "Article",
        typeBadgeColor: "#16803c",
        title: "Ambrose Akinmusire: Trumpet as Poetry",
        meta: "NPR Music",
        context:
          "Profile of Akinmusire's unconventional approach to the trumpet.",
        platform: "NPR",
        platformColor: "#333",
        icon: "📰",
      },
      {
        type: "Article",
        typeBadgeColor: "#16803c",
        title: "The Quiet Radicalism of Ambrose Akinmusire",
        meta: "The New York Times",
        context:
          "Feature on the trumpeter's Village Vanguard residency and compositional ambitions.",
        platform: "NYT",
        platformColor: "#333",
        icon: "📰",
      },
    ],
  },

  "Jose James": {
    type: "artist",
    emoji: "🎤",
    badge: "Verified Entity",
    subtitle: "Music Artist · vocal jazz, neo-soul, jazz-soul",
    stats: [
      { value: "42", label: "Popularity" },
      { value: "vocal jazz", label: "Genre" },
    ],
    tags: [
      "vocal jazz",
      "neo-soul",
      "jazz-soul",
      "jazz-rap",
      "contemporary R&B",
    ],
    avatarGradient: "linear-gradient(135deg, #7c3aed, #c084fc)",
    photoUrl:
      "https://www.bluenote.com/wp-content/uploads/sites/956/2019/03/JoseJames_8522sq_by-cherry-chill-will.jpg",
    posterUrl: null,
    bio: [
      'Jose James is the rare jazz vocalist who has genuinely absorbed the vocabulary of hip-hop, soul, and electronic music without losing the improvisatory instincts and rhythmic sophistication that mark a true jazz singer. Born in Minneapolis to a Panamanian jazz saxophonist father, James grew up immersed in both the Minneapolis funk tradition of Prince and the jazz tradition of his father\'s record collection. After studying at the New School in New York, he released two albums on Gilles Peterson\'s Brownswood Recordings that established him as a jazz singer for the hip-hop generation. His 2013 Blue Note debut "No Beginning No End," produced in collaboration with bassist Pino Palladino and pianist Robert Glasper, was a revelation: a nocturnal blend of jazz, soul, and downtempo grooves that drew from J Dilla\'s production aesthetic as much as from Billie Holiday\'s phrasing.',
      'James\'s Blue Note tenure yielded five albums of remarkable range, from the rock-inflected "While You Were Sleeping" to the reverential "Yesterday I Had the Blues" — a Billie Holiday centennial tribute recorded with pianist Jason Moran, bassist John Patitucci, and drummer Eric Harland that ranks among the finest jazz vocal albums of the 2010s. His 2018 Bill Withers tribute "Lean on Me," produced by Blue Note president Don Was, demonstrated his ability to inhabit another artist\'s songbook while making it unmistakably his own. James\'s Blue Note years represent a body of work that redefined what a modern jazz vocalist could be — equally comfortable in a Vanguard basement and a Brooklyn warehouse.',
    ],
    quickViewGroups: [],
    completeWorks: [
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "No Beginning No End",
        role: "Artist · Blue Note Records",
        meta: "2013",
        context:
          "Blue Note breakthrough; produced with Pino Palladino and Robert Glasper.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2013,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Yesterday I Had the Blues: The Music of Billie Holiday",
        role: "Artist · Blue Note Records",
        meta: "2015",
        context:
          "Billie Holiday centennial tribute with Jason Moran, John Patitucci, Eric Harland. Produced by Don Was.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2015,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Lean on Me",
        role: "Artist · Blue Note Records",
        meta: "2018",
        context:
          "Bill Withers tribute; produced by Don Was at Capitol Studio B.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2018,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "While You Were Sleeping",
        role: "Artist · Blue Note Records",
        meta: "2014",
        context: "Rock/R&B/jazz hybrid exploring new sonic territory.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2014,
      },
    ],
    collaborators: [
      {
        name: "Robert Glasper",
        role: "Pianist/Producer",
        projects: "No Beginning No End",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Pino Palladino",
        role: "Bassist/Producer",
        projects: "No Beginning No End",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Jason Moran",
        role: "Pianist",
        projects: "Yesterday I Had the Blues",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Don Was",
        role: "Producer/Label President",
        projects: "Yesterday I Had the Blues, Lean on Me",
        projectCount: 2,
        photoUrl: null,
      },
      {
        name: "Chris Dave",
        role: "Drummer",
        projects: "No Beginning No End",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Eric Harland",
        role: "Drummer",
        projects: "Yesterday I Had the Blues",
        projectCount: 1,
        photoUrl: null,
      },
    ],
    sonic: [
      {
        type: "Spotify",
        title: "Jose James",
        meta: "Artist",
        spotify_url: "https://open.spotify.com/artist/2EidjxlPqUAGYIFCUvePbO",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
      },
    ],
    graphNodes: [
      { x: 200, y: 200, r: 16, label: "Jose James", color: "#7c3aed" },
      { x: 80, y: 120, r: 8, label: "Robert Glasper", color: "#2563eb" },
      { x: 320, y: 120, r: 8, label: "Don Was", color: "#3b6fa0" },
      { x: 60, y: 280, r: 8, label: "Jason Moran", color: "#7c3aed" },
      { x: 340, y: 280, r: 8, label: "Billie Holiday", color: "#f59e0b" },
      { x: 200, y: 80, r: 8, label: "Pino Palladino", color: "#7c3aed" },
    ],
    graphEdges: [
      [200, 200, 80, 120],
      [200, 200, 320, 120],
      [200, 200, 60, 280],
      [200, 200, 340, 280],
      [200, 200, 200, 80],
    ],
    interviews: [
      {
        type: "Article",
        typeBadgeColor: "#16803c",
        title: "Jose James: Jazz Singer for the Hip-Hop Generation",
        meta: "The Guardian",
        context:
          "Profile exploring James's fusion of jazz vocals with hip-hop and soul production.",
        platform: "The Guardian",
        platformColor: "#333",
        icon: "📰",
      },
      {
        type: "Article",
        typeBadgeColor: "#16803c",
        title: "Jose James on Billie Holiday and Blue Note",
        meta: "NPR Music",
        context:
          "Interview about the Yesterday I Had the Blues tribute album.",
        platform: "NPR",
        platformColor: "#333",
        icon: "📰",
      },
    ],
  },

  "Kandace Springs": {
    type: "artist",
    emoji: "🎤",
    badge: "Verified Entity",
    subtitle: "Music Artist · jazz-soul, vocal jazz, neo-soul",
    stats: [
      { value: "45", label: "Popularity" },
      { value: "jazz-soul", label: "Genre" },
    ],
    tags: [
      "jazz-soul",
      "vocal jazz",
      "neo-soul",
      "contemporary jazz",
      "jazz piano",
    ],
    avatarGradient: "linear-gradient(135deg, #be185d, #f472b6)",
    photoUrl:
      "https://www.bluenote.com/wp-content/uploads/sites/956/2019/03/KandaceSprings_1378_sq.jpg",
    posterUrl: null,
    bio: [
      'Kandace Springs is a singer, pianist, and songwriter whose smoky, supple voice and instinctive feel for the space between jazz, soul, and pop have made her one of the most appealing young artists on the Blue Note roster since she signed with the label in 2014. Born in Nashville, Tennessee, to session singer Scat Springs, she grew up surrounded by music but found her path gradually — parking cars at a Nashville hotel by day and singing in its lounge by night before Prince discovered her cover of Sam Smith\'s "Stay With Me" online and invited her to perform at Paisley Park. His endorsement — "a voice that could melt snow" — opened doors, and her 2016 Blue Note debut "Soul Eyes" revealed an already remarkably mature artist who could channel Norah Jones\'s intimacy, Roberta Flack\'s tenderness, and Nina Simone\'s intensity without sounding like any of them.',
      'Springs deepened her art across three Blue Note albums, moving from the jazz-soul fusion of "Soul Eyes" through the quiet-storm sophistication of "Indigo" (2018) to the ambitious covers album "The Women Who Raised Me" (2020), which paid tribute to the female vocalists — Ella Fitzgerald, Billie Holiday, Sade, Lauryn Hill, Carmen McRae, and others — who shaped her sensibility. Along the way, she collaborated with luminaries like Terence Blanchard, Christian McBride, Roy Hargrove, and David Sanborn. Springs represents the next chapter of the Blue Note vocal tradition — a Nashville-bred artist who brings the warmth of Southern soul, the sophistication of jazz harmony, and a quiet, unshakeable confidence to everything she sings.',
    ],
    quickViewGroups: [],
    completeWorks: [
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Soul Eyes",
        role: "Artist · Blue Note Records",
        meta: "2016",
        context:
          "Blue Note debut; mature synthesis of jazz, soul, pop, and Nashville roots.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2016,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Indigo",
        role: "Artist · Blue Note Records",
        meta: "2018",
        context: "Quiet-storm meets jazz poise; hip-hop swing with soulful depth.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2018,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "The Women Who Raised Me",
        role: "Artist · Blue Note Records",
        meta: "2020",
        context:
          "Covers of Ella Fitzgerald, Billie Holiday, Nina Simone, Roberta Flack, Sade, Norah Jones, and Lauryn Hill.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2020,
      },
    ],
    collaborators: [
      {
        name: "Prince",
        role: "Mentor",
        projects: "Paisley Park sessions",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Terence Blanchard",
        role: "Trumpeter",
        projects: "Collaboration",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Christian McBride",
        role: "Bassist",
        projects: "Collaboration",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Norah Jones",
        role: "Blue Note labelmate",
        projects: "The Women Who Raised Me",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "David Sanborn",
        role: "Saxophonist",
        projects: "Collaboration",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Don Was",
        role: "Label President",
        projects: "Blue Note Records",
        projectCount: 1,
        photoUrl: null,
      },
    ],
    sonic: [
      {
        type: "Spotify",
        title: "Kandace Springs",
        meta: "Artist",
        spotify_url: "https://open.spotify.com/artist/2R0MkqJMfMIGXYGR0fP3MZ",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
      },
    ],
    graphNodes: [
      { x: 200, y: 200, r: 16, label: "Kandace Springs", color: "#be185d" },
      { x: 80, y: 120, r: 8, label: "Prince", color: "#7c3aed" },
      { x: 320, y: 120, r: 8, label: "Norah Jones", color: "#7c3aed" },
      { x: 60, y: 280, r: 8, label: "Terence Blanchard", color: "#7c3aed" },
      { x: 340, y: 280, r: 8, label: "Nina Simone", color: "#f59e0b" },
      { x: 200, y: 80, r: 8, label: "Soul Eyes", color: "#16803c" },
    ],
    graphEdges: [
      [200, 200, 80, 120],
      [200, 200, 320, 120],
      [200, 200, 60, 280],
      [200, 200, 340, 280],
      [200, 200, 200, 80],
    ],
    interviews: [
      {
        type: "Article",
        typeBadgeColor: "#16803c",
        title: "Kandace Springs: Prince Said Her Voice Could Melt Snow",
        meta: "Rolling Stone",
        context:
          "Profile on Springs's journey from Nashville to Paisley Park to Blue Note.",
        platform: "Rolling Stone",
        platformColor: "#333",
        icon: "📰",
      },
      {
        type: "Article",
        typeBadgeColor: "#16803c",
        title: "The Women Who Raised Kandace Springs",
        meta: "JazzTimes",
        context:
          "Interview about the covers album celebrating her female musical influences.",
        platform: "JazzTimes",
        platformColor: "#333",
        icon: "📰",
      },
    ],
  },

  "Julian Lage": {
    type: "artist",
    emoji: "🎸",
    badge: "Verified Entity",
    subtitle: "Music Artist · contemporary jazz, jazz guitar, post-bop",
    stats: [
      { value: "48", label: "Popularity" },
      { value: "contemporary jazz", label: "Genre" },
    ],
    tags: [
      "contemporary jazz",
      "post-bop",
      "jazz guitar",
      "americana-jazz",
      "progressive jazz",
    ],
    avatarGradient: "linear-gradient(135deg, #059669, #34d399)",
    photoUrl:
      "https://www.bluenote.com/wp-content/uploads/sites/956/2021/03/JulianLage_10_byShervinLainez.jpg",
    posterUrl: null,
    bio: [
      'Julian Lage is one of the most imaginative and genre-fluid guitarists of his generation, a virtuoso whose work on Blue Note Records has established him as a leading voice in 21st-century jazz guitar. Born in 1987 in Santa Rosa, California, Lage was performing with Carlos Santana by age nine and appeared at the Grammy Awards at twelve. After studies at the San Francisco Conservatory of Music and Berklee College of Music, he came to wider attention as a protege of vibraphonist Gary Burton. His Blue Note debut "Squint" (2021), produced by partner and singer-songwriter Margaret Glaspy, was a taut, concise trio record with bassist Jorge Roeder and drummer Dave King that showcased his electric playing at its most kinetic.',
      'He deepened the palette on "View with a Room" (2022) by inviting guitar legend Bill Frisell into the ensemble, creating shimmering two-guitar tapestries, then shifted toward intimate acoustic textures on "Speak to Me" (2024), produced by Joe Henry. His 2026 album "Scenes from Above" introduced a fresh quartet with John Medeski on Hammond B3 organ. With each release, Lage has proven himself not merely a virtuoso but a restless musical thinker whose Blue Note catalog stands as one of the most compelling guitarist statements of the twenty-first century — equally comfortable in post-bop, Americana, classical counterpoint, and country blues.',
    ],
    quickViewGroups: [
      {
        label: "Videos",
        items: [
          {
            title: "Nothing Happens Here — Live at SFJAZZ",
            meta: "Julian Lage · SFJAZZ, 2024",
            video_id: "tO1wn9joxLM",
            thumbnail: "https://i.ytimg.com/vi/tO1wn9joxLM/hqdefault.jpg",
          },
          {
            title: "Speak to Me — Live Performance",
            meta: "Julian Lage · 2024",
            video_id: "uhE3RrzfZ5w",
            thumbnail: "https://i.ytimg.com/vi/uhE3RrzfZ5w/hqdefault.jpg",
          },
        ],
      },
    ],
    completeWorks: [
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Squint",
        role: "Artist · Blue Note Records",
        meta: "2021",
        context:
          "Blue Note debut; trio with Jorge Roeder and Dave King. 11 songs, 9 originals.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2021,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "View with a Room",
        role: "Artist · Blue Note Records",
        meta: "2022",
        context:
          "Added Bill Frisell on guitar; shimmering two-guitar textures with Roeder and King.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2022,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Speak to Me",
        role: "Artist · Blue Note Records",
        meta: "2024 · Grammy Nominated",
        context:
          "Produced by Joe Henry; expanded ensemble with Kris Davis and Levon Henry.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2024,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Scenes from Above",
        role: "Artist · Blue Note Records",
        meta: "2026",
        context:
          "New quartet with John Medeski on Hammond B3, Jorge Roeder, Kenny Wollesen.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2026,
      },
    ],
    collaborators: [
      {
        name: "Jorge Roeder",
        role: "Bassist",
        projects: "All Blue Note albums",
        projectCount: 5,
        photoUrl: null,
      },
      {
        name: "Dave King",
        role: "Drummer",
        projects: "Squint, View with a Room, Speak to Me",
        projectCount: 3,
        photoUrl: null,
      },
      {
        name: "Bill Frisell",
        role: "Guitarist",
        projects: "View with a Room",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "John Medeski",
        role: "Keyboardist",
        projects: "Scenes from Above",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Margaret Glaspy",
        role: "Producer/Singer-Songwriter",
        projects: "Squint",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Gary Burton",
        role: "Vibraphonist/Mentor",
        projects: "Generations, Next Generation",
        projectCount: 2,
        photoUrl: null,
      },
      {
        name: "Chris Eldridge",
        role: "Guitarist",
        projects: "Mount Royal",
        projectCount: 1,
        photoUrl: null,
      },
    ],
    sonic: [
      {
        type: "Spotify",
        title: "Julian Lage",
        meta: "Artist",
        spotify_url: "https://open.spotify.com/artist/0hoLkIdNdIYMQFTzGvknmu",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
      },
    ],
    graphNodes: [
      { x: 200, y: 200, r: 16, label: "Julian Lage", color: "#059669" },
      { x: 80, y: 100, r: 8, label: "Bill Frisell", color: "#7c3aed" },
      { x: 320, y: 100, r: 8, label: "John Medeski", color: "#7c3aed" },
      { x: 60, y: 250, r: 8, label: "Jorge Roeder", color: "#7c3aed" },
      { x: 340, y: 250, r: 8, label: "Dave King", color: "#7c3aed" },
      { x: 120, y: 340, r: 8, label: "Gary Burton", color: "#f59e0b" },
      { x: 280, y: 340, r: 8, label: "Margaret Glaspy", color: "#7c3aed" },
      { x: 200, y: 80, r: 8, label: "Squint", color: "#16803c" },
    ],
    graphEdges: [
      [200, 200, 80, 100],
      [200, 200, 320, 100],
      [200, 200, 60, 250],
      [200, 200, 340, 250],
      [200, 200, 120, 340],
      [200, 200, 280, 340],
      [200, 200, 200, 80],
    ],
    interviews: [
      {
        type: "Video",
        typeBadgeColor: "#dc2626",
        title: "Nothing Happens Here — Live at SFJAZZ",
        meta: "Julian Lage · SFJAZZ",
        context:
          "Live performance from the 2024 SFJAZZ season showcasing Lage's electric work.",
        platform: "YouTube",
        platformColor: "#FF0000",
        icon: "▶",
        video_id: "tO1wn9joxLM",
        thumbnail: "https://i.ytimg.com/vi/tO1wn9joxLM/hqdefault.jpg",
      },
      {
        type: "Article",
        typeBadgeColor: "#16803c",
        title: "Julian Lage: The Quiet Virtuoso",
        meta: "Grammy.com",
        context:
          "Interview about Speak to Me and his approach to Blue Note recordings.",
        platform: "Grammy.com",
        platformColor: "#333",
        icon: "📰",
      },
    ],
  },

  "Gerald Clayton": {
    type: "artist",
    emoji: "🎹",
    badge: "Verified Entity",
    subtitle: "Music Artist · post-bop, contemporary jazz, modern jazz piano",
    stats: [
      { value: "32", label: "Popularity" },
      { value: "post-bop", label: "Genre" },
    ],
    tags: [
      "post-bop",
      "contemporary jazz",
      "modern jazz piano",
      "chamber jazz",
      "avant-mainstream",
    ],
    avatarGradient: "linear-gradient(135deg, #6366f1, #a78bfa)",
    photoUrl:
      "https://www.bluenote.com/wp-content/uploads/sites/956/2020/03/GeraldClayton_2009081_n10_byOgata_sq.jpg",
    posterUrl: null,
    bio: [
      'Gerald Clayton is a pianist of uncommon poise and intellectual depth whose work on Blue Note Records has established him as one of the most vital creative forces in contemporary jazz. Born in 1984 in Utrecht, Netherlands, and raised in Los Angeles as the son of legendary bassist John Clayton, he absorbed the music from the inside — sitting in with his father\'s Clayton Brothers Quintet while still a teenager, studying with Billy Childs at USC, and later refining his craft under Kenny Barron at the Manhattan School of Music. His second-place finish at the 2006 Thelonious Monk International Jazz Piano Competition confirmed what the jazz world already sensed: here was a pianist of exceptional harmonic imagination and rhythmic command.',
      'Clayton\'s arrival at Blue Note in 2020 represented a natural homecoming. His debut, "Happening: Live at the Village Vanguard," captured the combustible interplay of his quintet and earned two Grammy nominations. The ravishing "Bells on Sand" (2022) revealed a more contemplative side, weaving in contributions from mentor Charles Lloyd, father John Clayton, and vocalist MARO. His third Blue Note album, "Ones & Twos" (2025), was a bold conceptual statement inspired by turntablism, featuring Joel Ross and Elena Pinderhughes. As musical director of The Blue Note Quintet — the all-star touring ensemble assembled to celebrate Blue Note\'s 85th anniversary — Clayton has become one of the label\'s most central creative forces.',
    ],
    quickViewGroups: [
      {
        label: "Videos",
        items: [
          {
            title: "Peace Invocation ft. Charles Lloyd",
            meta: "Gerald Clayton · Bells on Sand, 2022",
            video_id: "cHR6aeiFr3w",
            thumbnail: "https://i.ytimg.com/vi/cHR6aeiFr3w/hqdefault.jpg",
          },
        ],
      },
    ],
    completeWorks: [
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Happening: Live at the Village Vanguard",
        role: "Artist · Blue Note Records",
        meta: "2020 · 2x Grammy Nominated",
        context:
          "Blue Note debut. Live quintet with Logan Richardson, Walter Smith III. Two Grammy nominations.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2020,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Bells on Sand",
        role: "Artist · Blue Note Records",
        meta: "2022",
        context:
          "Studio album featuring Charles Lloyd (tenor sax), John Clayton (bass), Justin Brown (drums), MARO (vocals).",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2022,
      },
      {
        type: "Album",
        typeBadgeColor: "#7c3aed",
        title: "Ones & Twos",
        role: "Artist · Blue Note Records",
        meta: "2025 · Grammy Nominated",
        context:
          "Conceptual album inspired by turntablism. Joel Ross, Elena Pinderhughes, Marquis Hill, Kassa Overall.",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
        year: 2025,
      },
    ],
    collaborators: [
      {
        name: "Charles Lloyd",
        role: "Saxophonist/Mentor",
        projects: "Bells on Sand, touring",
        projectCount: 2,
        photoUrl: null,
      },
      {
        name: "John Clayton",
        role: "Bassist (father)",
        projects: "Bells on Sand, Clayton Brothers",
        projectCount: 2,
        photoUrl: null,
      },
      {
        name: "Ambrose Akinmusire",
        role: "Trumpeter",
        projects: "When the Heart Emerges Glistening",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Joel Ross",
        role: "Vibraphonist",
        projects: "Ones & Twos, Out Of/Into",
        projectCount: 2,
        photoUrl: null,
      },
      {
        name: "Kendrick Scott",
        role: "Drummer",
        projects: "Blue Note Quintet, Out Of/Into",
        projectCount: 2,
        photoUrl: null,
      },
      {
        name: "Walter Smith III",
        role: "Tenor Saxophonist",
        projects: "Happening: Live at the Village Vanguard",
        projectCount: 1,
        photoUrl: null,
      },
      {
        name: "Kenny Barron",
        role: "Pianist/Teacher",
        projects: "Manhattan School of Music",
        projectCount: 1,
        photoUrl: null,
      },
    ],
    sonic: [
      {
        type: "Spotify",
        title: "Gerald Clayton",
        meta: "Artist",
        spotify_url: "https://open.spotify.com/artist/4GYhfFkhavxqSGhniHMkNN",
        platform: "Spotify",
        platformColor: "#1DB954",
        icon: "🎵",
      },
    ],
    graphNodes: [
      { x: 200, y: 200, r: 16, label: "Gerald Clayton", color: "#6366f1" },
      { x: 80, y: 120, r: 8, label: "Charles Lloyd", color: "#7c3aed" },
      { x: 320, y: 120, r: 8, label: "John Clayton", color: "#7c3aed" },
      {
        x: 60,
        y: 280,
        r: 8,
        label: "Ambrose Akinmusire",
        color: "#dc2626",
      },
      { x: 340, y: 280, r: 8, label: "Joel Ross", color: "#7c3aed" },
      { x: 200, y: 80, r: 8, label: "Blue Note Quintet", color: "#3b6fa0" },
    ],
    graphEdges: [
      [200, 200, 80, 120],
      [200, 200, 320, 120],
      [200, 200, 60, 280],
      [200, 200, 340, 280],
      [200, 200, 200, 80],
    ],
    interviews: [
      {
        type: "Video",
        typeBadgeColor: "#dc2626",
        title: "Peace Invocation ft. Charles Lloyd",
        meta: "Gerald Clayton · Blue Note Records",
        context:
          "Performance from Bells on Sand featuring saxophone legend Charles Lloyd.",
        platform: "YouTube",
        platformColor: "#FF0000",
        icon: "▶",
        video_id: "cHR6aeiFr3w",
        thumbnail: "https://i.ytimg.com/vi/cHR6aeiFr3w/hqdefault.jpg",
      },
      {
        type: "Article",
        typeBadgeColor: "#16803c",
        title: "Gerald Clayton: Musical Director of the Blue Note Quintet",
        meta: "Blue Note Records",
        context:
          "Profile on Clayton's role leading the 85th anniversary touring ensemble.",
        platform: "Blue Note",
        platformColor: "#333",
        icon: "📰",
      },
    ],
  },
};

// ─── Discovery Group Cards ───────────────────────────────────────────────────

function makeDiscoveryCard(name, entity) {
  const genres = entity.tags.slice(0, 2).join(", ");
  return {
    type: "ARTIST",
    typeBadgeColor: "#7c3aed",
    title: name,
    meta: "Music Artist",
    context: entity.bio[0].slice(0, 150).replace(/[^.]*$/, "").trim() || entity.bio[0].slice(0, 150) + "...",
    platform: "Spotify",
    platformColor: "#1DB954",
    icon: entity.emoji,
    spotify_url: entity.sonic[0]?.spotify_url || "",
    photoUrl: entity.photoUrl,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

const universe = JSON.parse(readFileSync(universePath, "utf-8"));
const response = JSON.parse(readFileSync(responsePath, "utf-8"));

// 1. Add entities to universe JSON
let added = 0;
let skipped = 0;
for (const [name, entity] of Object.entries(NEW_ARTISTS)) {
  if (universe[name]) {
    console.log(`  SKIP: "${name}" already exists in universe`);
    skipped++;
  } else {
    universe[name] = entity;
    console.log(`  ADD:  "${name}" → universe`);
    added++;
  }
}
console.log(`\nUniverse: ${added} added, ${skipped} skipped (${Object.keys(universe).length} total entities)\n`);

// 2. Add cards to the "artists" discovery group in response JSON
const artistsGroup = response.discoveryGroups.find((g) => g.id === "artists");
if (!artistsGroup) {
  console.error("ERROR: Could not find 'artists' discovery group!");
  process.exit(1);
}

let cardsAdded = 0;
const cardsList = artistsGroup.cards || artistsGroup.items || [];
const existingTitles = new Set(cardsList.map((i) => i.title));
for (const [name, entity] of Object.entries(NEW_ARTISTS)) {
  if (existingTitles.has(name)) {
    console.log(`  SKIP: "${name}" already in artists discovery group`);
  } else {
    cardsList.push(makeDiscoveryCard(name, entity));
    console.log(`  ADD:  "${name}" → artists discovery group`);
    cardsAdded++;
  }
}
// Write back to whichever key was used
if (artistsGroup.cards) artistsGroup.cards = cardsList;
else artistsGroup.items = cardsList;

// Update discoveryCount
response.discoveryCount = response.discoveryGroups.reduce(
  (sum, g) => (g.cards || g.items || []).length + sum,
  0
);
console.log(
  `\nResponse: ${cardsAdded} cards added (${response.discoveryCount} total discovery items)\n`
);

// 3. Write updated files
writeFileSync(universePath, JSON.stringify(universe, null, 2), "utf-8");
console.log(`Wrote ${universePath}`);

writeFileSync(responsePath, JSON.stringify(response, null, 2), "utf-8");
console.log(`Wrote ${responsePath}`);

console.log("\nDone! Run `npm run build` to verify.");
