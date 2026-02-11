import { useState, useEffect, useRef, useMemo } from "react";

const SCREENS = {
  HOME: "home",
  THINKING: "thinking",
  RESPONSE: "response",
  CONSTELLATION: "constellation",
  ENTITY_DETAIL: "entity_detail",
  LIBRARY: "library",
};

// --- Palette matched to screenshot ---
const T = {
  bg: "#ffffff",
  bgCard: "#ffffff",
  bgElevated: "#f3f4f6",
  bgHover: "#e5e7eb",
  border: "#e5e7eb",
  borderLight: "#d1d5db",
  text: "#1a2744",
  textMuted: "#4b5563",
  textDim: "#9ca3af",
  blue: "#2563eb",
  blueDark: "#1d4ed8",
  blueLight: "rgba(37,99,235,0.12)",
  blueBorder: "rgba(37,99,235,0.2)",
  gold: "#f5b800",
  goldBg: "rgba(245,184,0,0.14)",
  goldBorder: "rgba(245,184,0,0.3)",
  green: "#16803c",
  greenBg: "rgba(22,128,60,0.12)",
  greenBorder: "rgba(22,128,60,0.22)",
  queryBg: "#1a2744",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)",
  shadowHover: "0 2px 8px rgba(0,0,0,0.06), 0 10px 28px rgba(0,0,0,0.05)",
};

// --- Entity Data Store ---
const ENTITIES = {
  "Vince Gilligan": {
    type: "person",
    emoji: "🎬",
    badge: "Verified Entity",
    subtitle: "Creator, Writer, Director, Producer",
    stats: [
      { value: "5", label: "Series" },
      { value: "16", label: "Emmys" },
      { value: "35+", label: "Years Active" },
      { value: "4", label: "Media Types" },
    ],
    tags: ["Born: Feb 10, 1967", "Richmond, Virginia", "Active: 1989–present"],
    avatarGradient: "linear-gradient(135deg, #3b6fa0, #4a82b8)",
    bio: [
      'Vince Gilligan began his career in the writers\' room of The X-Files, where he wrote or co-wrote 30 episodes across six seasons — developing a signature ability to blend genre tension with deep character work. His episode "Drive" featured Bryan Cranston as a desperate man forcing a hostage to drive west, a performance that planted the seed for their later collaboration.',
      "In 2008, he created Breaking Bad, which ran for five seasons and won 16 Primetime Emmy Awards. The show's exploration of moral compromise and identity transformation became a cultural touchstone, redefining what was possible in serialized television. Its prequel, Better Call Saul (co-created with Peter Gould), expanded the universe over six additional seasons.",
      "His latest project, Pluribus (Apple TV+, 2024), represents a return to the science fiction he first explored on The X-Files — but now filtered through two decades of experience building worlds where identity is never stable and consequences are never avoidable.",
    ],
    quickViewGroups: [
      {
        label: "TV & Film",
        items: [
          { title: "Breaking Bad", meta: "Creator · 2008–2013 · 16 Emmys", platform: "Netflix", platformColor: "#e50914" },
          { title: "Pluribus", meta: "Creator · 2024–present", platform: "Apple TV+", platformColor: "#555" },
          { title: "Better Call Saul", meta: "Co-Creator · 2015–2022", platform: "AMC+", platformColor: "#1a6fe3" },
        ],
        total: 8,
      },
      {
        label: "Interviews & Talks",
        items: [
          { title: "SXSW 2026 Keynote", meta: "Mar 13, 2026 · Austin, TX", platform: "Tickets", platformColor: "#f5b800" },
          { title: "The Watch Podcast", meta: "Pluribus deep dive · 2024", platform: "Spotify", platformColor: "#1db954" },
          { title: "Fresh Air with Terry Gross", meta: "NPR · Career retrospective", platform: "Listen", platformColor: "#2563eb" },
        ],
        total: 7,
      },
      {
        label: "Articles & Analysis",
        items: [
          { title: "Pluribus Is a 600-Year-Old Lie", meta: "Poggy · Video essay · 28 min", platform: "▶ Watch", platformColor: "#2563eb" },
          { title: "The Mind Behind the Hive", meta: "The Atlantic · Long read", platform: "Read", platformColor: "#555" },
          { title: "From Meth to Mind Control", meta: "Vulture · 2024", platform: "Read", platformColor: "#555" },
        ],
        total: 6,
      },
      {
        label: "Music of Pluribus",
        items: [
          { title: "Pluribus OST", meta: "Trent Reznor & Atticus Ross", platform: "Spotify", platformColor: "#1db954" },
          { title: "Music for Airports", meta: "Brian Eno · 1978 · The ambient blueprint", platform: "Spotify", platformColor: "#1db954" },
          { title: "The Isolation Mix", meta: "Knowledge graph playlist · 12 tracks", platform: "Spotify", platformColor: "#1db954" },
        ],
        total: 6,
      },
    ],
    completeWorks: [
      { type: "CREATOR", typeBadgeColor: "#16803c", title: "Pluribus", meta: "2024–present · Apple TV+", context: "Return to sci-fi after two decades — the Hive Mind saga", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "16 EMMYS", typeBadgeColor: "#f5b800", title: "Breaking Bad", meta: "Creator · 2008–2013", context: "The show that redefined prestige television", platform: "Netflix", platformColor: "#e50914", icon: "📺" },
      { type: "CO-CREATOR", typeBadgeColor: "#16803c", title: "Better Call Saul", meta: "2015–2022 · w/ Peter Gould", context: "Expanded the BB universe with patience and precision", platform: "AMC+", platformColor: "#1a6fe3", icon: "📺" },
      { type: "WRITER/DIR", typeBadgeColor: "#16803c", title: "El Camino", meta: "2019 · Film", context: "Jesse Pinkman's escape — Gilligan's feature debut", platform: "Netflix", platformColor: "#e50914", icon: "🎬" },
      { type: "WRITER", typeBadgeColor: "#16803c", title: 'X-Files: "Pusher"', meta: "S3E17 · Mind control", context: "The episode that planted the Pluribus seed", platform: "Hulu", platformColor: "#1ce783", icon: "📺" },
      { type: "WRITER", typeBadgeColor: "#16803c", title: 'X-Files: "Drive"', meta: "S6E2 · Proto-Walter White", context: "Bryan Cranston's audition for a future partnership", platform: "Hulu", platformColor: "#1ce783", icon: "📺" },
      { type: "WRITER", typeBadgeColor: "#16803c", title: 'X-Files: "Bad Blood"', meta: "S5E12 · Fan favorite", context: "Rashomon-style comedy — showed Gilligan's range", platform: "Hulu", platformColor: "#1ce783", icon: "📺" },
      { type: "EARLY", typeBadgeColor: "#555", title: "Wilder Napalm", meta: "1993 · Screenwriter", context: "First screenplay — pyrokinesis and sibling rivalry", platform: "Archive", platformColor: "#555", icon: "🎬" },
    ],
    inspirations: [
      { type: "FILM", typeBadgeColor: "#16803c", title: "Body Snatchers (1956)", meta: '"THE wellspring for Pluribus"', context: "The fear that people around you aren't who they seem", price: "$0.99", platform: "Peacock", platformColor: "#555", icon: "🎬" },
      { type: "FILM", typeBadgeColor: "#16803c", title: "The Thing (1982)", meta: "Isolation, paranoia, identity", context: "Template for 'who can you trust?' — Carpenter's masterpiece", platform: "Peacock", platformColor: "#555", icon: "🎬" },
      { type: "TZ", typeBadgeColor: "#4b5563", title: "Third from the Sun", meta: "Named the protagonist", context: "Gilligan corrected its scientific error in Pluribus", platform: "Paramount+", platformColor: "#0064ff", icon: "📺" },
      { type: "NOVEL", typeBadgeColor: "#16803c", title: "We (1924)", meta: "Zamyatin · The first dystopia", context: "Collective erasure of self — before Orwell, before Huxley", price: "$14.99", icon: "📖" },
      { type: "NOVEL", typeBadgeColor: "#16803c", title: "I Am Legend", meta: "Matheson · 1954", context: "The last human in a world that's moved on", price: "$11.99", icon: "📖" },
      { type: "NOVEL", typeBadgeColor: "#16803c", title: "Solaris", meta: "Lem · Alien consciousness", context: "An intelligence that mirrors your deepest fears", price: "$12.99", icon: "📖" },
    ],
    collaborators: [
      { name: "Bryan Cranston", role: "Lead Actor · Walter White", projects: "Breaking Bad, El Camino", projectCount: 2 },
      { name: "Aaron Paul", role: "Lead Actor · Jesse Pinkman", projects: "Breaking Bad, El Camino", projectCount: 2 },
      { name: "Rhea Seehorn", role: "Lead Actor · Kim Wexler", projects: "Better Call Saul, Pluribus", projectCount: 2 },
      { name: "Bob Odenkirk", role: "Lead Actor · Saul Goodman", projects: "Breaking Bad, Better Call Saul", projectCount: 2 },
      { name: "Peter Gould", role: "Co-Creator · Writer", projects: "Breaking Bad, Better Call Saul", projectCount: 2 },
      { name: "Trent Reznor", role: "Composer · Score", projects: "Pluribus", projectCount: 1 },
      { name: "Atticus Ross", role: "Composer · Score", projects: "Pluribus", projectCount: 1 },
      { name: "Thomas Schnauz", role: "Writer · Director · Producer", projects: "Breaking Bad, BCS, Pluribus", projectCount: 3 },
    ],
    themes: [
      { title: "Moral Decay", description: "From Walter White's slow-motion fall to the Hive Mind's seductive erasure of choice — Gilligan keeps asking: at what point does compromise become identity?", works: ["Breaking Bad", "Pluribus", "El Camino"] },
      { title: "Identity", description: "Heisenberg. Saul Goodman. The assimilated citizens of Pluribus. Every Gilligan character is haunted by the question of who they really are.", works: ["Breaking Bad", "Better Call Saul", "Pluribus"] },
      { title: "Consequences", description: "Actions in Gilligan's universe ripple outward for years. A chemistry teacher's first cook leads to a body count.", works: ["Breaking Bad", "El Camino", "Pluribus"] },
      { title: "Isolation", description: "The desert. The compound. The town that can't call for help. Gilligan strips his characters of connection to see what's left.", works: ["Breaking Bad", "Pluribus", "X-Files"] },
      { title: "Transformation", description: "Mr. White becomes Heisenberg. Jimmy becomes Saul. The townspeople become the Hive. Gilligan's work is about the irreversibility of change.", works: ["Breaking Bad", "Better Call Saul", "Pluribus"] },
    ],
    interviews: [
      { type: "EVENT", typeBadgeColor: "#f5b800", title: "SXSW 2026 Keynote", meta: "Mar 13 · Austin, TX", context: "First public talk since Pluribus S1 finale aired", platform: "Tickets", platformColor: "#f5b800", icon: "🎤" },
      { type: "PODCAST", typeBadgeColor: "#8a3ab9", title: "The Watch", meta: "Pluribus deep dive · 2024", context: "Reveals the Body Snatchers connection for the first time", platform: "Spotify", platformColor: "#1db954", icon: "🎙" },
      { type: "INTERVIEW", typeBadgeColor: "#2563eb", title: "Fresh Air", meta: "NPR · Terry Gross", context: "Career retrospective — X-Files through Pluribus", platform: "Listen", platformColor: "#2563eb", icon: "🎙" },
      { type: "PODCAST", typeBadgeColor: "#8a3ab9", title: "WTF with Marc Maron", meta: "Breaking Bad era · 2013", context: "Candid on creative doubt and the BB writers' room", platform: "Listen", platformColor: "#2563eb", icon: "🎙" },
      { type: "PANEL", typeBadgeColor: "#555", title: "PaleyFest 2024", meta: "Pluribus cast & crew", context: "Full cast panel with live audience Q&A", platform: "YouTube", platformColor: "#ff0000", icon: "🎤" },
    ],
    articles: [
      { type: "VIDEO", typeBadgeColor: "#991b1b", title: "Pluribus Is a 600-Year-Old Lie", meta: "Poggy · 28 min", context: "Decodes hidden references and the Kepler-22b distance clue", platform: "▶ Watch", platformColor: "#2563eb", icon: "📺" },
      { type: "PROFILE", typeBadgeColor: "#555", title: "The Mind Behind the Hive", meta: "The Atlantic · 2024", context: "Definitive profile — childhood fears to cultural phenomenon", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "ANALYSIS", typeBadgeColor: "#555", title: "From Meth to Mind Control", meta: "Vulture · Long read", context: "How Breaking Bad's moral engine powers Pluribus", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "ACADEMIC", typeBadgeColor: "#16803c", title: "Moral Architecture in BB", meta: "Journal of Film Studies", context: "Scholarly analysis of consequence structures in Gilligan's work", platform: "Read", platformColor: "#555", icon: "📄" },
    ],
    sonic: [
      { type: "SCORE", typeBadgeColor: "#7c3aed", title: "Pluribus OST", meta: "Trent Reznor & Atticus Ross", context: "Isolationist ambient meets synth horror", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
      { type: "OST", typeBadgeColor: "#7c3aed", title: "Breaking Bad OST", meta: "Dave Porter", context: "The sound of the desert — tension through restraint", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
      { type: "PLAYLIST", typeBadgeColor: "#f5b800", title: "The Isolation Mix", meta: "Auto-generated · 12 tracks", context: "Knowledge graph playlist — the emotional arc of Pluribus", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
      { type: "NEEDLE DROP", typeBadgeColor: "#555", title: "Baby Blue", meta: "Badfinger · BB finale", context: "The perfect goodbye — Walt's last moment of honesty", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
    ],
    graphNodes: [
      { label: "Vince Gilligan", x: 400, y: 110, r: 26, color: "#2563eb", bold: true },
      { label: "Breaking Bad", x: 200, y: 60, r: 18, color: "#16803c" },
      { label: "Pluribus", x: 580, y: 70, r: 20, color: "#f5b800" },
      { label: "X-Files", x: 160, y: 140, r: 15, color: "#2563eb" },
      { label: "Moral Decay", x: 300, y: 180, r: 13, color: "#f5b800" },
      { label: "Identity", x: 500, y: 170, r: 13, color: "#f5b800" },
      { label: "The Thing", x: 640, y: 140, r: 14, color: "#c0392b" },
    ],
    graphEdges: [
      [400,110,200,60],[400,110,580,70],[400,110,160,140],[400,110,300,180],[400,110,500,170],[400,110,640,140],[200,60,160,140],[580,70,640,140],
    ],
  },
  "Breaking Bad": {
    type: "show",
    emoji: "📺",
    badge: "Verified Entity",
    subtitle: "TV Series · Drama · AMC (2008–2013)",
    stats: [
      { value: "16", label: "Emmys" },
      { value: "62", label: "Episodes" },
      { value: "5", label: "Seasons" },
      { value: "9.5", label: "IMDb" },
    ],
    tags: ["2008–2013", "AMC", "Created by Vince Gilligan", "Albuquerque, NM"],
    avatarGradient: "linear-gradient(135deg, #2a7a4a, #35905a)",
    bio: [
      "Breaking Bad follows Walter White (Bryan Cranston), a high school chemistry teacher diagnosed with terminal lung cancer, who turns to manufacturing methamphetamine to secure his family's financial future. What begins as a desperate act of survival becomes a descent into moral darkness — a transformation from Mr. White to the drug lord Heisenberg.",
      "Over five seasons, the show earned 16 Primetime Emmy Awards including four for Outstanding Drama Series, and is widely regarded as one of the greatest television series ever made. Its unflinching examination of consequences, pride, and the American Dream redefined what serialized drama could achieve.",
      "The show spawned a prequel series (Better Call Saul), a sequel film (El Camino), and influenced a generation of prestige television. Its cultural impact extends into music, fashion, tourism in Albuquerque, and the broader conversation about antiheroes in fiction.",
    ],
    quickViewGroups: [
      {
        label: "Where to Watch",
        items: [
          { title: "All 5 Seasons", meta: "Complete series · 62 episodes", platform: "Netflix", platformColor: "#e50914" },
          { title: "Buy Complete Series", meta: "Digital purchase", platform: "Apple TV", platformColor: "#555" },
          { title: "Buy on Blu-ray", meta: "Collector's Edition", platform: "$49.99", platformColor: "#555" },
        ],
        total: 5,
      },
      {
        label: "The Extended Universe",
        items: [
          { title: "Better Call Saul", meta: "Prequel · 6 seasons · 2015–2022", platform: "AMC+", platformColor: "#1a6fe3" },
          { title: "El Camino", meta: "Sequel film · 2019", platform: "Netflix", platformColor: "#e50914" },
          { title: "Pluribus", meta: "Gilligan's latest · 2024–", platform: "Apple TV+", platformColor: "#555" },
        ],
        total: 3,
      },
      {
        label: "Podcasts & Companion",
        items: [
          { title: "Breaking Bad Insider Podcast", meta: "Official · Gilligan & cast", platform: "Apple", platformColor: "#8a3ab9" },
          { title: "The Rewatchables", meta: "Ozymandias episode", platform: "Spotify", platformColor: "#1db954" },
          { title: "Bald Move: BB", meta: "Episode-by-episode analysis", platform: "Listen", platformColor: "#2563eb" },
        ],
        total: 8,
      },
      {
        label: "Articles & Analysis",
        items: [
          { title: "The Moral Universe of Walter White", meta: "The New Yorker · Emily Nussbaum", platform: "Read", platformColor: "#555" },
          { title: "How BB Changed TV Forever", meta: "Vulture · 10th Anniversary", platform: "Read", platformColor: "#555" },
          { title: "The Chemistry of Breaking Bad", meta: "ACS · Fact-checking the science", platform: "Read", platformColor: "#555" },
        ],
        total: 9,
      },
    ],
    completeWorks: [
      { type: "S1", typeBadgeColor: "#16803c", title: "Season 1", meta: "2008 · 7 episodes · The beginning", context: "A chemistry teacher gets a diagnosis and makes a choice", platform: "Netflix", platformColor: "#e50914", icon: "📺" },
      { type: "S2", typeBadgeColor: "#16803c", title: "Season 2", meta: "2009 · 13 episodes · Escalation", context: "The plane crash, the bathtub — consequences multiply", platform: "Netflix", platformColor: "#e50914", icon: "📺" },
      { type: "S3", typeBadgeColor: "#16803c", title: "Season 3", meta: "2010 · 13 episodes · The Cousins", context: "The cartel arrives — Walt's world gets much bigger", platform: "Netflix", platformColor: "#e50914", icon: "📺" },
      { type: "S4", typeBadgeColor: "#f5b800", title: "Season 4", meta: "2011 · 13 episodes · Gus Fring", context: "The chess match — Walt vs. the most dangerous man in ABQ", platform: "Netflix", platformColor: "#e50914", icon: "📺" },
      { type: "S5", typeBadgeColor: "#16803c", title: "Season 5", meta: "2012–2013 · 16 episodes · Endgame", context: "Ozymandias, Felina — the greatest final run in TV history", platform: "Netflix", platformColor: "#e50914", icon: "📺" },
      { type: "PREQUEL", typeBadgeColor: "#16803c", title: "Better Call Saul", meta: "2015–2022 · 6 seasons", context: "How Jimmy McGill became Saul Goodman — and what it cost", platform: "AMC+", platformColor: "#1a6fe3", icon: "📺" },
      { type: "SEQUEL", typeBadgeColor: "#16803c", title: "El Camino", meta: "2019 · Jesse's escape", context: "Jesse Pinkman finally gets to drive away from it all", platform: "Netflix", platformColor: "#e50914", icon: "🎬" },
    ],
    inspirations: [
      { type: "FILM", typeBadgeColor: "#16803c", title: "Scarface (1983)", meta: "The rise-and-fall blueprint", context: "Walt literally watches it — the poster hangs in his house", platform: "Peacock", platformColor: "#555", icon: "🎬" },
      { type: "FILM", typeBadgeColor: "#16803c", title: "The Godfather", meta: "Family, power, corruption", context: "The template for 'I did it for the family' self-deception", platform: "Paramount+", platformColor: "#0064ff", icon: "🎬" },
      { type: "TV", typeBadgeColor: "#7c3aed", title: "The Sopranos", meta: "The antihero template", context: "Proved audiences would follow a monster for six seasons", platform: "Max", platformColor: "#8a3ab9", icon: "📺" },
      { type: "TV", typeBadgeColor: "#7c3aed", title: "The Shield", meta: "Moral compromise in law", context: "Vic Mackey showed that a corrupt lead could sustain a series", platform: "Hulu", platformColor: "#1ce783", icon: "📺" },
      { type: "FILM", typeBadgeColor: "#16803c", title: "No Country for Old Men", meta: "Coen Bros · Southwest noir", context: "The desert as moral landscape — violence without soundtrack", platform: "Paramount+", platformColor: "#0064ff", icon: "🎬" },
      { type: "NOVEL", typeBadgeColor: "#16803c", title: "Crime and Punishment", meta: "Dostoevsky · Moral spiral", context: "A brilliant mind rationalizes the unforgivable", price: "$10.99", icon: "📖" },
    ],
    collaborators: [
      { name: "Bryan Cranston", role: "Walter White · Lead · 4× Emmy", projects: "All 5 seasons, El Camino", projectCount: 6 },
      { name: "Aaron Paul", role: "Jesse Pinkman · Lead · 3× Emmy", projects: "All 5 seasons, El Camino", projectCount: 6 },
      { name: "Anna Gunn", role: "Skyler White · 2× Emmy", projects: "All 5 seasons", projectCount: 5 },
      { name: "Dean Norris", role: "Hank Schrader", projects: "All 5 seasons", projectCount: 5 },
      { name: "Bob Odenkirk", role: "Saul Goodman → Better Call Saul", projects: "Seasons 2–5, BCS", projectCount: 4 },
      { name: "Giancarlo Esposito", role: "Gus Fring · The Chicken Man", projects: "Seasons 2–4, BCS", projectCount: 4 },
      { name: "Jonathan Banks", role: "Mike Ehrmantraut", projects: "Seasons 2–5, BCS, El Camino", projectCount: 5 },
      { name: "Dave Porter", role: "Composer · Original score", projects: "All 5 seasons, BCS", projectCount: 6 },
    ],
    themes: [
      { title: "Moral Decay", description: "Walter White's transformation from sympathetic teacher to ruthless drug lord is the definitive TV exploration of incremental moral compromise.", works: ["Pilot", "Ozymandias", "Felina"] },
      { title: "Pride & Ego", description: "\"I did it for me. I liked it. I was good at it.\" Walt's fatal flaw was never cancer — it was the pride that made him refuse charity and choose empire.", works: ["Gray Matter", "Say My Name", "Felina"] },
      { title: "Consequences", description: "Every action ripples. A bathtub dissolves through a floor. A missing eyeball resurfaces for two seasons. Gilligan never lets anything go.", works: ["Seasons 1–5", "El Camino"] },
      { title: "The American Dream", description: "A brilliant man, underpaid and underappreciated, takes control of his destiny. BB is a dark inversion of bootstrap mythology.", works: ["Gray Matter", "Buyout", "Ozymandias"] },
      { title: "Family", description: "Everything Walt does is 'for the family' — until it isn't. The show systematically dismantles this justification across five seasons.", works: ["Pilot", "Crawl Space", "Felina"] },
    ],
    interviews: [
      { type: "PODCAST", typeBadgeColor: "#8a3ab9", title: "BB Insider Podcast", meta: "Official · Every episode", context: "Gilligan and the writers break down each episode as it aired", platform: "Apple", platformColor: "#8a3ab9", icon: "🎙" },
      { type: "PODCAST", typeBadgeColor: "#8a3ab9", title: "The Rewatchables", meta: "Ozymandias deep dive", context: "Bill Simmons crew on the greatest episode of television", platform: "Spotify", platformColor: "#1db954", icon: "🎙" },
      { type: "INTERVIEW", typeBadgeColor: "#2563eb", title: "Cast Reunion (2023)", meta: "10th anniversary · Sony", context: "Cranston, Paul, Gunn, and Norris together for the first time since", platform: "YouTube", platformColor: "#ff0000", icon: "🎤" },
      { type: "PANEL", typeBadgeColor: "#555", title: "PaleyFest 2013", meta: "Series finale panel", context: "Audience reactions to the ending — filmed live", platform: "YouTube", platformColor: "#ff0000", icon: "🎤" },
      { type: "PODCAST", typeBadgeColor: "#8a3ab9", title: "Bald Move: Ozymandias", meta: "Best episode ever?", context: "Frame-by-frame analysis of the pivotal episode", platform: "Listen", platformColor: "#2563eb", icon: "🎙" },
    ],
    articles: [
      { type: "ESSAY", typeBadgeColor: "#555", title: "The Moral Universe of Walter White", meta: "The New Yorker", context: "Emily Nussbaum's defining piece on TV antiheroes", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "ANALYSIS", typeBadgeColor: "#555", title: "How BB Changed TV Forever", meta: "Vulture · 10th Anniversary", context: "The Netflix binge effect and BB's second-life phenomenon", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "VIDEO", typeBadgeColor: "#991b1b", title: "The Cinematography of BB", meta: "Every Frame a Painting", context: "How the camera tells the story Gilligan won't say out loud", platform: "▶ Watch", platformColor: "#2563eb", icon: "📺" },
      { type: "ACADEMIC", typeBadgeColor: "#16803c", title: "The Chemistry of BB", meta: "American Chemical Society", context: "Real chemists fact-check Walt's methods — mostly right", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "REVIEW", typeBadgeColor: "#555", title: "Ozymandias: Peak TV", meta: "AV Club · Retrospective", context: "Why this single episode became the benchmark for the medium", platform: "Read", platformColor: "#555", icon: "📄" },
    ],
    sonic: [
      { type: "OST", typeBadgeColor: "#7c3aed", title: "Breaking Bad OST", meta: "Dave Porter · Complete score", context: "Minimalist tension — the sound of the desert and dread", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
      { type: "NEEDLE DROP", typeBadgeColor: "#555", title: "Baby Blue", meta: "Badfinger · Series finale", context: "Walt's last moment of honesty — the perfect goodbye", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
      { type: "NEEDLE DROP", typeBadgeColor: "#555", title: "Crystal Blue Persuasion", meta: "Tommy James · S5 montage", context: "The meth empire at its peak — ironic pop perfection", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
      { type: "NEEDLE DROP", typeBadgeColor: "#555", title: "DLZ", meta: "TV on the Radio · S2 opening", context: "Walt steps out of the shadows — 'this is beginning to feel like the dawn of a loser forever'", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
      { type: "PLAYLIST", typeBadgeColor: "#f5b800", title: "BB: The Complete Playlist", meta: "Every song from the series", context: "All 67 needle drops in chronological order", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
    ],
    graphNodes: [
      { label: "Breaking Bad", x: 400, y: 110, r: 28, color: "#16803c", bold: true },
      { label: "Vince Gilligan", x: 220, y: 55, r: 20, color: "#2563eb" },
      { label: "Better Call Saul", x: 580, y: 60, r: 18, color: "#f5b800" },
      { label: "Bryan Cranston", x: 160, y: 155, r: 16, color: "#2563eb" },
      { label: "Moral Decay", x: 320, y: 185, r: 13, color: "#f5b800" },
      { label: "Scarface", x: 530, y: 165, r: 14, color: "#c0392b" },
      { label: "El Camino", x: 620, y: 140, r: 15, color: "#c0392b" },
    ],
    graphEdges: [
      [400,110,220,55],[400,110,580,60],[400,110,160,155],[400,110,320,185],[400,110,530,165],[400,110,620,140],[220,55,580,60],[580,60,620,140],
    ],
  },
  "Invasion of the Body Snatchers": {
    type: "film",
    emoji: "🎬",
    badge: "Verified Entity",
    subtitle: "Film · 1956 · Dir. Don Siegel",
    stats: [
      { value: "1956", label: "Release" },
      { value: "80", label: "Minutes" },
      { value: "98%", label: "Rotten Tomatoes" },
      { value: "7.7", label: "IMDb" },
    ],
    tags: ["Dir: Don Siegel", "Allied Artists Pictures", "Sci-Fi / Horror"],
    avatarGradient: "linear-gradient(135deg, #1e40af, #3b82f6)",
    bio: [
      "Invasion of the Body Snatchers (1956) is the film Vince Gilligan has called \"THE wellspring\" for Pluribus — a Cold War parable about alien seed pods that replace sleeping humans with emotionless duplicates. Directed by Don Siegel and based on Jack Finney's 1955 novel The Body Snatchers, the film transforms a small California town into a crucible of paranoia where the people you love might no longer be the people you love.",
      "The film's power lies in what it doesn't show. There are no ray guns, no flying saucers, no alien landscapes. The horror is entirely social — the moment you realize your neighbor's smile is slightly wrong, that your wife's eyes have lost something you can't name. This emphasis on subtle behavioral wrongness over spectacle became the template Gilligan would follow in Pluribus.",
      "Remade in 1978 (with Donald Sutherland's iconic final scream), 1993, and 2007, the original remains the definitive version. Its influence stretches from The Thing to The Stepford Wives to Get Out — any story where assimilation is the monster. For Pluribus, it provided the central question: what happens when the invasion isn't violent but seductive?",
    ],
    quickViewGroups: [
      {
        label: "Watch & Read",
        items: [
          { title: "Invasion of the Body Snatchers", meta: "1956 · Dir. Don Siegel · 80 min", platform: "Prime", platformColor: "#00a8e1" },
          { title: "Body Snatchers (1978 Remake)", meta: "Dir. Philip Kaufman · Donald Sutherland", platform: "Prime", platformColor: "#00a8e1" },
          { title: "The Body Snatchers (Novel)", meta: "Jack Finney · 1955 · The source", platform: "$12.99", platformColor: "#555" },
        ],
        total: 5,
      },
      {
        label: "Legacy & Influence",
        items: [
          { title: "Pluribus", meta: "Gilligan's spiritual successor · 2024", platform: "Apple TV+", platformColor: "#555" },
          { title: "Get Out", meta: "Jordan Peele · 2017 · The modern heir", platform: "Peacock", platformColor: "#555" },
          { title: "The Thing", meta: "Carpenter's companion piece · 1982", platform: "Peacock", platformColor: "#555" },
        ],
        total: 8,
      },
      {
        label: "Analysis",
        items: [
          { title: "The Pod People as Metaphor", meta: "Criterion · Video essay", platform: "▶ Watch", platformColor: "#2563eb" },
          { title: "How Body Snatchers Built Pluribus", meta: "The Ringer · 2024", platform: "Read", platformColor: "#555" },
          { title: "Cold War Cinema & Conformity", meta: "Academic · Film Quarterly", platform: "Read", platformColor: "#555" },
        ],
        total: 6,
      },
    ],
    completeWorks: [
      { type: "ORIGINAL", typeBadgeColor: "#16803c", title: "Invasion of the Body Snatchers", meta: "1956 · Dir. Don Siegel · 80 min", context: "The original — small-town paranoia as existential horror", platform: "Prime", platformColor: "#00a8e1", icon: "🎬" },
      { type: "REMAKE", typeBadgeColor: "#16803c", title: "Invasion of the Body Snatchers", meta: "1978 · Dir. Philip Kaufman", context: "Urban paranoia — Sutherland's final scream is cinema history", platform: "Prime", platformColor: "#00a8e1", icon: "🎬" },
      { type: "REMAKE", typeBadgeColor: "#16803c", title: "Body Snatchers", meta: "1993 · Dir. Abel Ferrara", context: "Military base setting — conformity as chain of command", platform: "Tubi", platformColor: "#555", icon: "🎬" },
      { type: "REMAKE", typeBadgeColor: "#16803c", title: "The Invasion", meta: "2007 · Nicole Kidman · Daniel Craig", context: "Pharmaceutical angle — the most divisive version", platform: "Max", platformColor: "#002be7", icon: "🎬" },
      { type: "SOURCE", typeBadgeColor: "#16803c", title: "The Body Snatchers", meta: "Jack Finney · 1955 · Novel", context: "The serialized novel that started it all — first published in Collier's", platform: "$12.99", platformColor: "#555", icon: "📖" },
    ],
    inspirations: [
      { type: "NOVEL", typeBadgeColor: "#16803c", title: "The Body Snatchers", meta: "Jack Finney · 1955", context: "Finney's serial gave Siegel everything — the pods, the town, the creeping dread", platform: "$12.99", platformColor: "#555", icon: "📖" },
      { type: "FILM", typeBadgeColor: "#16803c", title: "The Thing from Another World", meta: "1951 · Hawks/Nyby", context: "Alien infiltration as ensemble paranoia — the direct precursor", platform: "Prime", platformColor: "#00a8e1", icon: "🎬" },
      { type: "CONTEXT", typeBadgeColor: "#7c3aed", title: "McCarthyism & Red Scare", meta: "1950s America", context: "The political paranoia that made body-snatching resonate as metaphor", icon: "📖" },
      { type: "FILM", typeBadgeColor: "#16803c", title: "The Day the Earth Stood Still", meta: "1951 · Robert Wise", context: "Aliens as mirror for human failing — Siegel inverted its optimism", platform: "Prime", platformColor: "#00a8e1", icon: "🎬" },
    ],
    collaborators: [
      { name: "Don Siegel", role: "Director", projects: "Invasion of the Body Snatchers", projectCount: 1 },
      { name: "Jack Finney", role: "Source Author", projects: "The Body Snatchers (novel)", projectCount: 1 },
      { name: "Kevin McCarthy", role: "Lead Actor · Dr. Miles Bennell", projects: "Invasion of the Body Snatchers", projectCount: 1 },
      { name: "Dana Wynter", role: "Lead Actor · Becky Driscoll", projects: "Invasion of the Body Snatchers", projectCount: 1 },
      { name: "Philip Kaufman", role: "Director · 1978 Remake", projects: "Invasion of the Body Snatchers (1978)", projectCount: 1 },
      { name: "Donald Sutherland", role: "Lead Actor · 1978 version", projects: "Invasion of the Body Snatchers (1978)", projectCount: 1 },
    ],
    themes: [
      { title: "Conformity as Horror", description: "The pods don't destroy — they replace. The terror isn't death but sameness. You'll still walk and talk, but everything that made you you is gone.", works: ["Body Snatchers (1956)", "Body Snatchers (1978)", "Pluribus"] },
      { title: "Paranoia & Trust", description: "How do you know the person beside you is real? The film turns every relationship into a question mark — and Pluribus inherits this directly.", works: ["Body Snatchers (1956)", "The Thing", "Pluribus"] },
      { title: "Sleep as Vulnerability", description: "You can only resist if you stay awake. Sleep — the most human need — becomes the mechanism of erasure.", works: ["Body Snatchers (1956)", "Nightmare on Elm Street"] },
      { title: "The Seduction of Surrender", description: "The pods offer peace. No more anxiety, no more pain. The film's most disturbing idea: what if losing yourself feels like relief?", works: ["Body Snatchers (1956)", "Body Snatchers (1978)", "Pluribus"] },
    ],
    interviews: [
      { type: "COMMENTARY", typeBadgeColor: "#f5b800", title: "Don Siegel on Body Snatchers", meta: "Criterion Collection · Audio commentary", context: "Siegel discusses the studio's interference with the original ending", platform: "Criterion", platformColor: "#555", icon: "🎙" },
      { type: "PODCAST", typeBadgeColor: "#8a3ab9", title: "Blank Check: Body Snatchers", meta: "Griffin & David · Siegel miniseries", context: "Deep dive into the production and its cultural afterlife", platform: "Spotify", platformColor: "#1db954", icon: "🎙" },
      { type: "INTERVIEW", typeBadgeColor: "#2563eb", title: "Gilligan on Body Snatchers", meta: "The Watch · 2024", context: "\"This is THE wellspring. Everything in Pluribus starts here.\"", platform: "Spotify", platformColor: "#1db954", icon: "🎙" },
      { type: "DOC", typeBadgeColor: "#555", title: "The Paranoia Collection", meta: "Criterion · 2019", context: "Booklet essay contextualizing the film in Cold War cinema", platform: "Criterion", platformColor: "#555", icon: "📄" },
    ],
    articles: [
      { type: "VIDEO", typeBadgeColor: "#991b1b", title: "The Pod People as Metaphor", meta: "Criterion · 22 min", context: "Definitive video essay on the film's allegorical readings", platform: "▶ Watch", platformColor: "#2563eb", icon: "📺" },
      { type: "ESSAY", typeBadgeColor: "#555", title: "How Body Snatchers Built Pluribus", meta: "The Ringer · 2024", context: "Traces the direct line from Siegel's film to Gilligan's show", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "ACADEMIC", typeBadgeColor: "#16803c", title: "Cold War Cinema & Conformity", meta: "Film Quarterly · Peer-reviewed", context: "Scholarly analysis of the film as political allegory", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "ESSAY", typeBadgeColor: "#555", title: "Four Body Snatchers, Four Americas", meta: "Vulture · 2024", context: "How each remake reflects its era's anxieties", platform: "Read", platformColor: "#555", icon: "📄" },
    ],
    sonic: [
      { type: "SCORE", typeBadgeColor: "#7c3aed", title: "Body Snatchers (1956) Score", meta: "Carmen Dragon", context: "Orchestral tension — the sound of 1950s paranoia", platform: "YouTube", platformColor: "#ff0000", icon: "🎵" },
      { type: "SCORE", typeBadgeColor: "#7c3aed", title: "Body Snatchers (1978) Score", meta: "Denny Zeitlin", context: "Jazz-inflected ambient horror — influenced the Pluribus OST", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
    ],
    graphNodes: [
      { label: "Body Snatchers", x: 400, y: 110, r: 26, color: "#7c3aed", bold: true },
      { label: "Pluribus", x: 220, y: 55, r: 20, color: "#f5b800" },
      { label: "The Thing", x: 580, y: 70, r: 18, color: "#c0392b" },
      { label: "Get Out", x: 160, y: 155, r: 15, color: "#c0392b" },
      { label: "Conformity", x: 320, y: 185, r: 13, color: "#f5b800" },
      { label: "Paranoia", x: 500, y: 170, r: 13, color: "#f5b800" },
      { label: "Vince Gilligan", x: 640, y: 140, r: 16, color: "#2563eb" },
    ],
    graphEdges: [
      [400,110,220,55],[400,110,580,70],[400,110,160,155],[400,110,320,185],[400,110,500,170],[400,110,640,140],[220,55,640,140],[580,70,500,170],
    ],
  },
  "Carol Sturka": {
    type: "character",
    emoji: "👤",
    badge: "Verified Entity",
    subtitle: "Protagonist · Pluribus · Played by Rhea Seehorn",
    stats: [
      { value: "S1–S2", label: "Seasons" },
      { value: "Novelist", label: "Occupation" },
      { value: "Albuquerque", label: "Location" },
      { value: "Immune", label: "Status" },
    ],
    tags: ["Pluribus · Apple TV+", "Played by Rhea Seehorn", "Albuquerque, New Mexico"],
    avatarGradient: "linear-gradient(135deg, #b91c1c, #dc2626)",
    bio: [
      "Carol Sturka is a wildly successful but deeply discontented romantasy novelist from Albuquerque, New Mexico — author of the bestselling Winds of Wycaro series. In public she's charismatic and professional; in private she calls her own work \"mindless crap.\" She's sardonic, volatile, profane, and empathetic underneath it all — a curmudgeon who values human life even as she pushes everyone away.",
      "When an alien virus transforms nearly all of humanity into a peaceful, content hive mind called the Others, Carol is one of only 13 people on Earth who are immune. Her wife and manager Helen dies from head trauma shortly after being infected. Alone in a world of enforced happiness, Carol is terrified, furious, and determined to reverse the Joining — even as the Others cheerfully accommodate her every wish and promise they'll eventually find a way to assimilate her too.",
      "What makes Carol dangerous to the Others isn't strength or strategy — it's her refusal to be happy about any of this. Her sarcasm and volcanic outbursts ripple through the hive mind and inadvertently cause deaths globally, which horrifies her. Rhea Seehorn described her as a 'reluctant hero' whose anger is both 'a flaw and a superpower' — the kind of rage that, bottled up for a lifetime, culminates in requesting delivery of an atom bomb.",
    ],
    quickViewGroups: [
      {
        label: "Character Essentials",
        items: [
          { title: "Pluribus", meta: "Carol Sturka · Protagonist · S1–present", platform: "Apple TV+", platformColor: "#555" },
          { title: "Winds of Wycaro", meta: "Carol's bestselling romantasy series", platform: "Apple Books", platformColor: "#555" },
          { title: "Rhea Seehorn", meta: "Actor · Golden Globe & Critics' Choice winner", platform: "Profile", platformColor: "#c0392b" },
        ],
        total: 5,
      },
      {
        label: "Key Episodes",
        items: [
          { title: "S1E1: \"We Is Us\"", meta: "The Joining happens. Carol's world ends.", platform: "Apple TV+", platformColor: "#555" },
          { title: "S1E4: \"Please, Carol\"", meta: "Carol tests the Others' honesty at the expense of her ego", platform: "Apple TV+", platformColor: "#555" },
          { title: "S1E9: \"La Chica o El Mundo\"", meta: "Manousos arrives. Carol visits the last best place.", platform: "Apple TV+", platformColor: "#555" },
        ],
        total: 10,
      },
      {
        label: "Analysis",
        items: [
          { title: "Pluribus Explained", meta: "Variety · Gilligan + Seehorn interview", platform: "Read", platformColor: "#555" },
          { title: "Seehorn on Carol's Rage", meta: "Deadline · Finale interview", platform: "Read", platformColor: "#555" },
          { title: "Two Authors Talk Pluribus", meta: "Ministry of Pop Culture", platform: "Read", platformColor: "#555" },
        ],
        total: 8,
      },
    ],
    completeWorks: [
      { type: "PREMIERE", typeBadgeColor: "#f5b800", title: "S1E1: \"We Is Us\"", meta: "56 min · Dir. Vince Gilligan", context: "An astronomer's discovery turns the planet upside-down. Carol is at a book signing when the world seizes up — everyone except her. Helen dies. Carol is alone.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "EPISODE", typeBadgeColor: "#16803c", title: "S1E2: \"Pirate Lady\"", meta: "63 min", context: "A curiously familiar face introduces Carol to the bizarre new normal. A gathering in Europe brings strangers together and causes friction.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "EPISODE", typeBadgeColor: "#16803c", title: "S1E3: \"Grenade\"", meta: "43 min", context: "The Others just want to help — which infuriates Carol. A heart-to-heart conversation ends with a bang.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "TURNING", typeBadgeColor: "#16803c", title: "S1E4: \"Please, Carol\"", meta: "46 min", context: "Carol tests the boundaries of this weirdly honest world at the expense of her ego. Far away, Manousos learns he's not alone.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "EPISODE", typeBadgeColor: "#16803c", title: "S1E5: \"Got Milk\"", meta: "46 min", context: "Carol doubles down on her investigation — loneliness be damned. Howls in the night reveal a new source of danger.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "PIVOTAL", typeBadgeColor: "#991b1b", title: "S1E6: \"HDP\"", meta: "50 min", context: "Carol shares a horrific discovery and learns new truths. Mr. Diabaté lives life to the fullest in Sin City.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "EPISODE", typeBadgeColor: "#16803c", title: "S1E7: \"The Gap\"", meta: "46 min", context: "Manousos begins a dangerous trek to meet Carol. Returning from Las Vegas, Carol gets creative with her rebellion.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "EPISODE", typeBadgeColor: "#16803c", title: "S1E8: \"Charm Offensive\"", meta: "43 min", context: "Carol takes a different tack with the Others and discovers more than she anticipated. Manousos awakens in unfamiliar surroundings.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "FINALE", typeBadgeColor: "#7c3aed", title: "S1E9: \"La Chica o El Mundo\"", meta: "57 min", context: "Manousos arrives in Albuquerque and complications ensue. Carol visits the last best place on Earth. The atom bomb arrives.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
    ],
    inspirations: [
      { type: "CHARACTER", typeBadgeColor: "#c0392b", title: "Dr. Miles Bennell", meta: "Invasion of the Body Snatchers · 1956", context: "The original lone holdout against a world of pod people — Carol is his spiritual descendant in a gentler apocalypse", platform: "Peacock", platformColor: "#555", icon: "🎬" },
      { type: "CHARACTER", typeBadgeColor: "#16803c", title: "Kim Wexler", meta: "Better Call Saul", context: "Gilligan wrote Carol specifically for Seehorn after seeing what she built with Kim — they share 'wary intelligence' but Carol is more volatile", platform: "AMC+", platformColor: "#1a6fe3", icon: "📺" },
      { type: "CHARACTER", typeBadgeColor: "#7c3aed", title: "Will Sturka", meta: "The Twilight Zone · \"Third from the Sun\" · 1960", context: "Carol's surname is a direct homage — a scientist who intercepts a signal from space and tries to escape an alien threat", platform: "Paramount+", platformColor: "#0064ff", icon: "📺" },
      { type: "CHARACTER", typeBadgeColor: "#f5b800", title: "Carol Burnett", meta: "Better Call Saul guest star", context: "Carol's first name honors Burnett, whom Gilligan worked with in BCS S6 — a nod to resilient, multifaceted women", platform: "AMC+", platformColor: "#1a6fe3", icon: "📺" },
      { type: "FILM", typeBadgeColor: "#16803c", title: "Coherence (2013)", meta: "Dir. James Ward Byrkit", context: "Roger Ebert's review cited Coherence as a less obvious influence on Pluribus's reality-bending paranoia", platform: "Tubi", platformColor: "#ff4500", icon: "🎬" },
    ],
    collaborators: [
      { name: "Helen L. Umstead", role: "Wife & manager · Dies in The Joining", projects: "Miriam Shor · Carol's anchor and greatest loss", projectCount: 9 },
      { name: "Zosia", role: "Others liaison · Carol's chaperone", projects: "Karolina Wydra · An emanation of the hive mind assigned to Carol", projectCount: 9 },
      { name: "Manousos Oviedo", role: "Immune · Lives in Paraguay", projects: "Carlos Manuel Vesga · Refuses all contact with Others until S1E7", projectCount: 7 },
      { name: "Koumba Diabaté", role: "Immune · Hedonist", projects: "Samba Schutte · Lives life to the fullest in post-Joining Sin City", projectCount: 5 },
      { name: "T'ika", role: "Immune", projects: "Elena Estér", projectCount: 4 },
    ],
    themes: [
      { title: "Individuality vs. The Collective", description: "The core tension of Pluribus: the Others offer peace, happiness, and connection at the cost of selfhood. Carol is the most miserable person on Earth — and the only one who thinks that's worth fighting for.", works: ["We Is Us", "Please, Carol", "Body Snatchers"] },
      { title: "Grief as Resistance", description: "Helen's death drives everything. Carol's refusal to accept the Joining is inseparable from her refusal to accept that Helen is gone. Her rage and her grief are the same thing — and both make her immune to the promise of painless existence.", works: ["We Is Us", "Grenade", "La Chica o El Mundo"] },
      { title: "Art vs. Entertainment", description: "Carol despises her own bestselling novels even as millions love them. The show opens with fandom worship and closes with an atom bomb — asking whether the things that make people happy are the same things that matter.", works: ["We Is Us", "Pirate Lady", "Charm Offensive"] },
      { title: "The Cost of Anger", description: "Carol's sarcasm and outbursts ripple through the interconnected hive mind and inadvertently cause deaths globally. Her rage is her superpower and her greatest liability — the thing that keeps her human and the thing that makes her dangerous.", works: ["Grenade", "HDP", "The Gap"] },
    ],
    interviews: [
      { type: "INTERVIEW", typeBadgeColor: "#2563eb", title: "Pluribus Explained", meta: "Variety · Gilligan + Seehorn", context: "The definitive deep-dive: Gilligan reads the original Breaking Bad review, then explains the grinning apocalypse", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "INTERVIEW", typeBadgeColor: "#2563eb", title: "Seehorn on Carol's 'Passionate Rage'", meta: "Deadline · S1 finale", context: "On the atom bomb: 'Completely normal response to a breakup, don't you think?' Plus the circular journey from pilot to finale.", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "AUDIO", typeBadgeColor: "#8a3ab9", title: "Fresh Air: Seehorn on Team Carol", meta: "NPR · Dec 2025", context: "Seehorn on anger as a necessary emotion, researching romance novelists at The Ripped Bodice, and changing her own name from Deborah", platform: "Listen", platformColor: "#2563eb", icon: "🎙" },
      { type: "REVIEW", typeBadgeColor: "#555", title: "Loneliness Is the Price of an Easy Life", meta: "NPR · Nov 2025", context: "Gilligan's genius: marbling brutality, humanity and humor into a single creation. Carol's side-eye is 'deeply entertaining.'", platform: "Read", platformColor: "#555", icon: "📄" },
    ],
    articles: [
      { type: "REVIEW", typeBadgeColor: "#f5b800", title: "The Television Event of the Year", meta: "Roger Ebert · Nov 2025", context: "Body Snatchers to Coherence — the genre DNA. Plus: Carol at the book signing, the bar scene, the seizing bodies, the world on fire.", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "ESSAY", typeBadgeColor: "#555", title: "Why Carol Is a Romance Author", meta: "SlashFilm · Dec 2025", context: "Gilligan: 'Screenwriters are boring. Romance authors just seem more colorful, fun, and interesting.' The real reason behind the character's profession.", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "ANALYSIS", typeBadgeColor: "#991b1b", title: "Two Authors Talk About Pluribus", meta: "Ministry of Pop Culture · Jan 2026", context: "A novelist and nonfiction writer debate whether Carol's career makes her uniquely qualified to save humanity — and whether Zosia ever feels fully human.", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "WIKI", typeBadgeColor: "#555", title: "Carol Sturka — Character Profile", meta: "Heroes Wiki", context: "Full character analysis: the curmudgeon, the reluctant hero, the fandom backlash, and the comparison to Walter White's likability double standard.", platform: "Read", platformColor: "#555", icon: "📄" },
    ],
    sonic: [
      { type: "VOLUME", typeBadgeColor: "#7c3aed", title: "Pluribus: Vol. 1 (Soundtrack)", meta: "Nov 2025 · Milan Records", context: "The first half of the Season 1 score — released alongside the series premiere", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
      { type: "VOLUME", typeBadgeColor: "#7c3aed", title: "Pluribus: Vol. 2 (Soundtrack)", meta: "Dec 2025 · Milan Records", context: "The second half — released on finale day, December 26", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
      { type: "SINGLE", typeBadgeColor: "#555", title: "Main Title Theme", meta: "Released Nov 7, 2025", context: "The first piece of Pluribus music released — dropped as a digital single on premiere day", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
    ],
    graphNodes: [
      { label: "Carol Sturka", x: 400, y: 110, r: 26, color: "#c0392b", bold: true },
      { label: "Helen", x: 220, y: 55, r: 16, color: "#c0392b" },
      { label: "Zosia", x: 580, y: 65, r: 16, color: "#7c3aed" },
      { label: "The Others", x: 170, y: 150, r: 15, color: "#c0392b" },
      { label: "Albuquerque", x: 530, y: 160, r: 15, color: "#f5b800" },
      { label: "Manousos", x: 400, y: 195, r: 14, color: "#16803c" },
      { label: "Body Snatchers", x: 640, y: 140, r: 14, color: "#7c3aed" },
    ],
    graphEdges: [
      [400,110,220,55],[400,110,580,65],[400,110,170,150],[400,110,530,160],[400,110,400,195],[400,110,640,140],[220,55,170,150],[530,160,170,150],[580,65,530,160],
    ],
  },
  "Zosia": {
    type: "character",
    emoji: "👤",
    badge: "Verified Entity",
    subtitle: "The Others' Liaison · Pluribus · Played by Karolina Wydra",
    stats: [
      { value: "7/9", label: "Episodes" },
      { value: "Polish", label: "Origin" },
      { value: "Gdańsk", label: "Hometown" },
      { value: "Joined", label: "Status" },
    ],
    tags: ["Pluribus · Apple TV+", "Played by Karolina Wydra", "The Others"],
    avatarGradient: "linear-gradient(135deg, #7c3aed, #a855f7)",
    bio: [
      "Zosia is a Polish woman sent by the Others to serve as Carol Sturka's chaperone and liaison to the hive mind — and the secondary antagonist of Pluribus Season 1. She was chosen specifically because she physically resembles Raban, the male love interest from Carol's Winds of Wycaro novels, a character Carol originally conceived as a woman but rewrote as male to be more commercial.",
      "Before the Joining, Zosia grew up in or near Gdańsk, Poland, in what she describes as an economically disadvantaged background. She remembers watching ships leave the harbor and eating mango ice cream from a cart in her neighborhood. She had at least one serious romantic partner who died long before the Joining. At the time of the outbreak, she was in Tangier, Morocco for unknown reasons.",
      "Zosia doesn't feel anger, anxiety, or pain — she has the memory of those things but doesn't experience them. Yet she isn't a robot. As Carol pushes her to use 'I' instead of 'we,' Zosia begins exhibiting traces of genuine individuality — wistful when recalling her childhood, uncertain about her own age, and eventually initiating a kiss that becomes the show's most debated moment. By the finale, she and Carol are on opposing sides, sharing a piercing look of sorrow as Carol returns to Manousos with an atom bomb.",
    ],
    quickViewGroups: [
      {
        label: "Character Essentials",
        items: [
          { title: "Pluribus", meta: "Zosia · The Others' Liaison · S1", platform: "Apple TV+", platformColor: "#555" },
          { title: "Karolina Wydra", meta: "Actor · Breakout role after 5-year hiatus", platform: "Profile", platformColor: "#7c3aed" },
          { title: "The Others", meta: "7 billion people as one hive mind", platform: "Concept", platformColor: "#c0392b" },
        ],
        total: 5,
      },
      {
        label: "Key Episodes",
        items: [
          { title: "S1E2: \"Pirate Lady\"", meta: "First appearance — Carol calls her 'pirate lady'", platform: "Apple TV+", platformColor: "#555" },
          { title: "S1E8: \"Charm Offensive\"", meta: "The kiss. The mango ice cream. The 'I.'", platform: "Apple TV+", platformColor: "#555" },
          { title: "S1E9: \"La Chica o El Mundo\"", meta: "The betrayal revealed. Carol and Zosia part ways.", platform: "Apple TV+", platformColor: "#555" },
        ],
        total: 7,
      },
      {
        label: "Analysis",
        items: [
          { title: "Wydra Unpacks the Kiss", meta: "Variety · Episode 8 deep dive", platform: "Read", platformColor: "#555" },
          { title: "Zosia's Memories & Season 2", meta: "Collider · Charm Offensive analysis", platform: "Read", platformColor: "#555" },
          { title: "Wydra's Triumphant Return", meta: "Deadline · Career profile", platform: "Read", platformColor: "#555" },
        ],
        total: 6,
      },
    ],
    completeWorks: [
      { type: "INTRO", typeBadgeColor: "#f5b800", title: "S1E2: \"Pirate Lady\"", meta: "63 min", context: "Zosia appears covered in dirt, sent from Tangier. Carol never asks her name — just calls her 'pirate lady' because she resembles Raban, the pirate from her novels.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "EPISODE", typeBadgeColor: "#16803c", title: "S1E3: \"Grenade\"", meta: "43 min", context: "Zosia brings Carol a literal hand grenade after Carol sarcastically requests one. She reveals the Others stored Helen's memories before the Joining.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "EPISODE", typeBadgeColor: "#16803c", title: "S1E5: \"Got Milk\"", meta: "46 min", context: "Carol doubles down on investigation. Zosia remains present, accommodating, unflappable — which only infuriates Carol more.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "TURNING", typeBadgeColor: "#16803c", title: "S1E7: \"The Gap\"", meta: "46 min", context: "After 40 days of Carol's isolation, Zosia returns. Carol collapses into her arms — a dam of emotion breaks. Their reconciliation is desperate and raw.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "PIVOTAL", typeBadgeColor: "#991b1b", title: "S1E8: \"Charm Offensive\"", meta: "43 min", context: "Croquet, couples massage, stargazing — then the rebuilt diner, Carol's unraveling, and the kiss. Zosia uses 'I' for the first time while recalling mango ice cream in Gdańsk.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "FINALE", typeBadgeColor: "#7c3aed", title: "S1E9: \"La Chica o El Mundo\"", meta: "57 min", context: "Zosia reveals the Others can assimilate Carol within months using Helen's frozen eggs. Carol returns to Manousos. They share a final, piercing look.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
    ],
    inspirations: [
      { type: "CHARACTER", typeBadgeColor: "#c0392b", title: "Raban", meta: "Winds of Wycaro · Carol's fiction", context: "Zosia was chosen because she resembles the love interest Carol originally wrote as a woman but made male for commercial reasons", platform: "Apple Books", platformColor: "#555", icon: "📖" },
      { type: "CONCEPT", typeBadgeColor: "#7c3aed", title: "The Sosia", meta: "Amphitruo · Plautus", context: "In Romance languages, 'sosia' means doppelgänger — from the same classical source. Zosia is Carol's literary double made flesh.", platform: "Etymology", platformColor: "#555", icon: "📖" },
      { type: "CHARACTER", typeBadgeColor: "#16803c", title: "The Body Snatchers", meta: "Invasion of the Body Snatchers · 1956/1978", context: "The smiling, helpful replacements who insist everything is fine — but Zosia may be developing beyond her programming", platform: "Prime", platformColor: "#00a8e1", icon: "🎬" },
      { type: "CHARACTER", typeBadgeColor: "#f5b800", title: "Ava", meta: "Ex Machina · 2014", context: "An artificial being whose expressions of love may be genuine or calculated — the audience can never be sure", platform: "Prime", platformColor: "#00a8e1", icon: "🎬" },
    ],
    collaborators: [
      { name: "Carol Sturka", role: "Charge · Romantic interest", projects: "Rhea Seehorn · From chaperone to lover to adversary", projectCount: 9 },
      { name: "The Others", role: "Hive mind · 7 billion strong", projects: "Zosia speaks for them all — but is she starting to speak for herself?", projectCount: 9 },
      { name: "Helen L. Umstead", role: "Carol's late wife", projects: "Miriam Shor · Zosia helps bury Helen. The Others stored her memories.", projectCount: 3 },
      { name: "Koumba Diabaté", role: "Immune · Reveals Zosia's name", projects: "Samba Schutte · Carol learns Zosia's real name from Koumba", projectCount: 2 },
      { name: "Manousos Oviedo", role: "Immune · Carol's ally", projects: "Carlos Manuel Vesga · Sees Zosia as the enemy Carol is sleeping with", projectCount: 3 },
    ],
    themes: [
      { title: "Love vs. Manipulation", description: "Is Zosia's affection genuine, or is the hive mind engineering Carol's emotional submission? Wydra insists it's real love; Carol can never be sure. The show refuses to answer.", works: ["Charm Offensive", "La Chica o El Mundo"] },
      { title: "The 'I' vs. the 'We'", description: "Carol demands Zosia use personal pronouns. When Zosia finally says 'I love it' — and later recalls her childhood in the first person — it may be the most revolutionary act in the series.", works: ["Please, Carol", "Charm Offensive"] },
      { title: "Consent Under Duress", description: "The kiss mirrors the Joining itself — initiated by the Others on someone who hasn't fully agreed. Fans connected it to Carol's conversion therapy backstory: someone who knows what it means to have your will overridden.", works: ["Charm Offensive", "We Is Us"] },
      { title: "Memory as Identity", description: "Zosia has memories of pain but doesn't feel pain. She recalls Gdańsk with genuine wistfulness. If memory is what makes us human, Zosia is closer to personhood than the Others want to admit.", works: ["Charm Offensive", "Pirate Lady"] },
    ],
    interviews: [
      { type: "INTERVIEW", typeBadgeColor: "#2563eb", title: "Wydra Rejects the 'M'-Word", meta: "Variety · Dec 2025", context: "On whether Zosia is manipulating Carol: 'To Zosia, it's not manipulation. But if you ask Karolina, of course it's manipulation.'", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "INTERVIEW", typeBadgeColor: "#2563eb", title: "Wydra's Triumphant Return", meta: "Deadline · Jan 2026", context: "Cast after a 5-year hiatus, found through outdated agency records. On Season 2: 'I have the same questions as you do.'", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "INTERVIEW", typeBadgeColor: "#2563eb", title: "Pluribus Breakout", meta: "THR · Nov 2025", context: "On playing a global collective: 'It's too big to imagine playing the whole world.' Meditation to find serenity. Body work to remove tension.", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "PODCAST", typeBadgeColor: "#8a3ab9", title: "Pluribus Official Podcast: Zosia", meta: "Apple Podcasts", context: "Wydra on Zosia's evolving agency, the 'I' pronoun shift, and what the mango ice cream scene really means.", platform: "Listen", platformColor: "#2563eb", icon: "🎙" },
    ],
    articles: [
      { type: "ANALYSIS", typeBadgeColor: "#555", title: "Charm Offensive's Secret Revelation", meta: "Winter Is Coming · Dec 2025", context: "The mango ice cream scene as the key to reversing the Joining — Zosia briefly separating from the hive to speak as herself.", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "ANALYSIS", typeBadgeColor: "#991b1b", title: "Zosia's Memories & Season 2", meta: "Collider · Dec 2025", context: "The closer Zosia gets to Carol, the more individual she becomes. What that means for the Others' cohesion.", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "ESSAY", typeBadgeColor: "#555", title: "The Ending Explained", meta: "No Film School · Dec 2025", context: "Zosia was picked because she looks like a character Carol wrote as a woman but published as a man. The layers of projection and desire.", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "ESSAY", typeBadgeColor: "#555", title: "Stursia: The Ship That Launched a Thousand Debates", meta: "Fan discourse · Dec 2025", context: "The ship name for Carol × Zosia — and why the fandom can't agree on whether to root for them.", platform: "Read", platformColor: "#555", icon: "📄" },
    ],
    sonic: [
      { type: "VOLUME", typeBadgeColor: "#7c3aed", title: "Pluribus: Vol. 2 (Soundtrack)", meta: "Dec 2025 · Milan Records", context: "Contains the score from 'Charm Offensive' — the most emotionally complex episode of the season", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
    ],
    graphNodes: [
      { label: "Zosia", x: 400, y: 110, r: 26, color: "#7c3aed", bold: true },
      { label: "Carol Sturka", x: 220, y: 55, r: 16, color: "#c0392b" },
      { label: "The Others", x: 580, y: 65, r: 16, color: "#c0392b" },
      { label: "Raban", x: 170, y: 150, r: 15, color: "#f5b800" },
      { label: "Helen", x: 530, y: 160, r: 14, color: "#c0392b" },
      { label: "Gdańsk", x: 400, y: 195, r: 14, color: "#16803c" },
      { label: "Manousos", x: 640, y: 140, r: 14, color: "#16803c" },
    ],
    graphEdges: [
      [400,110,220,55],[400,110,580,65],[400,110,170,150],[400,110,530,160],[400,110,400,195],[400,110,640,140],[220,55,580,65],[220,55,530,160],
    ],
  },
  "Manousos Oviedo": {
    type: "character",
    emoji: "👤",
    badge: "Verified Entity",
    subtitle: "Deuteragonist · Pluribus · Played by Carlos-Manuel Vesga",
    stats: [
      { value: "6/9", label: "Episodes" },
      { value: "Colombian", label: "Origin" },
      { value: "Asunción", label: "Location" },
      { value: "Immune", label: "Status" },
    ],
    tags: ["Pluribus · Apple TV+", "Played by Carlos-Manuel Vesga", "Asunción, Paraguay"],
    avatarGradient: "linear-gradient(135deg, #16803c, #22c55e)",
    bio: [
      "Manousos Oviedo is a Colombian-born self-storage manager living in Asunción, Paraguay — one of the 13 people on Earth immune to the Joining, and the deuteragonist of Pluribus. He wasn't discovered until 33 hours after the outbreak. Unlike Carol, who reluctantly accepts help from the Others, Manousos refuses everything: food, transport, medical care. He'd rather eat dog food than take a single thing from them.",
      "A migrant who left Colombia and rebuilt his life in Paraguay, Manousos has already lost his world once. The Joining asks him to lose it again. His rage is different from Carol's — less sardonic, more elemental. He surrounds himself with anchors of his Paraguayan life: banknotes, a Club Olimpia football shirt, a yellowing car he loves like a friend. When the Others offer to transport the car, he sets it on fire rather than let them touch it.",
      "Manousos teaches himself English on the long, brutal journey from Paraguay to Albuquerque so he can speak directly to Carol — the woman whose VHS tape inspired him to stop hiding. But when he arrives, he finds a different Carol: one who's fallen for Zosia and no longer wants to fight. He calls her a traitor. By the finale, she returns to his side with an atom bomb, but the trust between them is fractured. His question defines the season: 'Do you want to save the world, or save your girl?'",
    ],
    quickViewGroups: [
      {
        label: "Character Essentials",
        items: [
          { title: "Pluribus", meta: "Manousos Oviedo · Deuteragonist · S1", platform: "Apple TV+", platformColor: "#555" },
          { title: "Carlos-Manuel Vesga", meta: "Actor · Cast from 710 auditions", platform: "Profile", platformColor: "#16803c" },
          { title: "The Immune", meta: "13 people worldwide unaffected by the Joining", platform: "Concept", platformColor: "#f5b800" },
        ],
        total: 5,
      },
      {
        label: "Key Episodes",
        items: [
          { title: "S1E4: \"Please, Carol\"", meta: "First appearance — alone in the storage facility, refusing everything", platform: "Apple TV+", platformColor: "#555" },
          { title: "S1E7: \"The Gap\"", meta: "The solo journey. The car fire. Teaching himself English.", platform: "Apple TV+", platformColor: "#555" },
          { title: "S1E9: \"La Chica o El Mundo\"", meta: "Arrives in Albuquerque. 'The girl or the world?'", platform: "Apple TV+", platformColor: "#555" },
        ],
        total: 6,
      },
      {
        label: "Analysis",
        items: [
          { title: "Vesga on the 'Horrible' Road Trip", meta: "Collider · Episode 7 interview", platform: "Read", platformColor: "#555" },
          { title: "Vesga Breaks Down the Betrayal", meta: "THR · Finale interview", platform: "Read", platformColor: "#555" },
          { title: "An Immigrant at the Heart of Pluribus", meta: "Asunción Times · Jan 2026", platform: "Read", platformColor: "#555" },
        ],
        total: 6,
      },
    ],
    completeWorks: [
      { type: "VOICE", typeBadgeColor: "#f5b800", title: "S1E3: \"Grenade\"", meta: "43 min · Voice only", context: "Carol's first phone call with Manousos. He insults her and hangs up. He doesn't speak English yet.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "INTRO", typeBadgeColor: "#16803c", title: "S1E4: \"Please, Carol\"", meta: "46 min", context: "First on-screen appearance. Alone in his storage facility in Asunción, refusing food from the Others. A resolute individual learns he's not alone.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "EPISODE", typeBadgeColor: "#16803c", title: "S1E6: \"HDP\"", meta: "50 min", context: "Scanning dead radio bands. The mysterious signal at 8.613.0 kHz. Carol's VHS tape arrives. He sees his mother — but it's not her anymore. He drives away.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "PIVOTAL", typeBadgeColor: "#16803c", title: "S1E7: \"The Gap\"", meta: "46 min · Dir. Adam Bernstein", context: "The solo journey: siphoning gas, rejecting rides, teaching himself English, setting his beloved car on fire. Nearly dies. Wakes in a Panama hospital furious the Others saved him.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "EPISODE", typeBadgeColor: "#16803c", title: "S1E8: \"Charm Offensive\"", meta: "43 min", context: "Manousos awakens in unfamiliar surroundings. Threatens a doctor with a knife. Demands a financial accounting so he can leave owing nothing.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
      { type: "FINALE", typeBadgeColor: "#7c3aed", title: "S1E9: \"La Chica o El Mundo\"", meta: "57 min", context: "Arrives at Carol's house. Experiments on the Others, triggers global seizures. Carol fires a warning shot at him. Then she comes back — with an atom bomb.", platform: "Apple TV+", platformColor: "#555", icon: "📺" },
    ],
    inspirations: [
      { type: "CHARACTER", typeBadgeColor: "#c0392b", title: "Mike Ehrmantraut", meta: "Breaking Bad / Better Call Saul", context: "A code of honor so rigid it's almost self-destructive — Vesga's performance echoes the quiet moral gravity Jonathan Banks brought to Mike", platform: "AMC+", platformColor: "#1a6fe3", icon: "📺" },
      { type: "CHARACTER", typeBadgeColor: "#16803c", title: "Neville", meta: "I Am Legend · 2007/1954", context: "The last person refusing to accept the new world — but where Neville fights monsters, Manousos fights helpers", platform: "Max", platformColor: "#002be7", icon: "🎬" },
      { type: "CONCEPT", typeBadgeColor: "#f5b800", title: "The Immigrant Experience", meta: "Vesga's interpretation", context: "'Migrating means leaving stuff behind. He's already lost his world once. His motivation is: Hell no, not again.'", platform: "Theme", platformColor: "#555", icon: "📖" },
      { type: "FILM", typeBadgeColor: "#7c3aed", title: "The Hijacking of Flight 601", meta: "Netflix · 2024", context: "Vesga's breakout before Pluribus — the role that put him on Gilligan's radar as an actor who communicates through restraint", platform: "Netflix", platformColor: "#e50914", icon: "📺" },
    ],
    collaborators: [
      { name: "Carol Sturka", role: "Ally · Complicated trust", projects: "Rhea Seehorn · 'Do you want to save the world, or save your girl?'", projectCount: 4 },
      { name: "Zosia", role: "Adversary by proxy", projects: "Karolina Wydra · The woman Carol chose over the mission", projectCount: 3 },
      { name: "Maternal Other", role: "Mother · Joined", projects: "Soledad Campos · She's so nice — and that's how he knows it's not his mother", projectCount: 2 },
      { name: "Koumba Diabaté", role: "Fellow immune", projects: "Samba Schutte · Hedonist approach contrasts Manousos' asceticism", projectCount: 2 },
    ],
    themes: [
      { title: "Refusal as Resistance", description: "Manousos won't take food, water, transport, or medical care from the Others. Every refusal is a declaration of sovereignty. 'I'd rather eat dog food.' His resistance is total, physical, and furious.", works: ["Please, Carol", "The Gap", "Charm Offensive"] },
      { title: "Migration & Loss", description: "A Colombian immigrant in Paraguay, Manousos has already survived the destruction of one world. The Joining asks him to lose everything again. 'Hell no. Not this time, not again.' His immigrant experience is the source of his strength.", works: ["The Gap", "HDP", "La Chica o El Mundo"] },
      { title: "Trust vs. Betrayal", description: "Manousos travels thousands of miles to reach Carol based on a VHS tape. When he arrives, she's sleeping with the enemy. His question — 'La chica o el mundo?' — is the season's moral fulcrum.", works: ["La Chica o El Mundo"] },
      { title: "Communication Across Distance", description: "Manousos doesn't speak English at the start. He teaches himself on the road so he can speak directly to Carol. Language itself becomes an act of will — refusing the Others' offer to translate, building connection on his own terms.", works: ["Grenade", "The Gap", "La Chica o El Mundo"] },
    ],
    interviews: [
      { type: "INTERVIEW", typeBadgeColor: "#2563eb", title: "The 'Horrible' Road Trip", meta: "Collider · Dec 2025", context: "On Episode 7: carrying scenes alone with no dialogue, the car fire, and why 'I'd rather eat dog food' defines Manousos.", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "INTERVIEW", typeBadgeColor: "#2563eb", title: "Vesga Breaks Down the Betrayal", meta: "THR · Dec 2025", context: "On Carol: 'You sent me this video saying we're on the same side. Now you're having an affair with one of them. You're a traitor.'", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "INTERVIEW", typeBadgeColor: "#2563eb", title: "Finding Manousos", meta: "Gold Derby · Dec 2025", context: "On the physical demands, the shifting camera perspectives, and committing fully to every shot — close-up or wide.", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "PROFILE", typeBadgeColor: "#555", title: "An Immigrant in Asunción", meta: "Asunción Times · Jan 2026", context: "Vesga's Colombian heritage as the skeleton key to Manousos. 'The immigrant knows which battles matter because he's fought the most fundamental one.'", platform: "Read", platformColor: "#555", icon: "📄" },
    ],
    articles: [
      { type: "INTERVIEW", typeBadgeColor: "#2563eb", title: "Finale Writers on Manousos & Carol", meta: "Deadline · Dec 2025", context: "Cast from 710 auditions. 'Carol is a first-class citizen. Manousos is a fifth-class citizen. Their motivations are completely different.'", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "ANALYSIS", typeBadgeColor: "#555", title: "The Car Fire Scene", meta: "Collider · Dec 2025", context: "'The car has a personality. It's like a faithful friend. Before you put one finger on it, I'm going to torch the damn thing.'", platform: "Read", platformColor: "#555", icon: "📄" },
      { type: "WIKI", typeBadgeColor: "#555", title: "Manousos Oviedo — Character Profile", meta: "Pluribus Wiki", context: "Complete biography: the storage facility, the radio signal at 8.613.0 kHz, the journey, the experiments on the Others.", platform: "Read", platformColor: "#555", icon: "📄" },
    ],
    sonic: [
      { type: "VOLUME", typeBadgeColor: "#7c3aed", title: "Pluribus: Vol. 2 (Soundtrack)", meta: "Dec 2025 · Milan Records", context: "Contains the Episode 7 score — Manousos' solo journey, the car fire, the jungle trek", platform: "Spotify", platformColor: "#1db954", icon: "🎵" },
    ],
    graphNodes: [
      { label: "Manousos", x: 400, y: 110, r: 26, color: "#16803c", bold: true },
      { label: "Carol Sturka", x: 220, y: 55, r: 16, color: "#c0392b" },
      { label: "Zosia", x: 580, y: 65, r: 16, color: "#7c3aed" },
      { label: "Paraguay", x: 170, y: 150, r: 15, color: "#f5b800" },
      { label: "The Others", x: 530, y: 160, r: 15, color: "#c0392b" },
      { label: "The Yellow Car", x: 400, y: 195, r: 14, color: "#f5b800" },
      { label: "8.613.0 kHz", x: 640, y: 140, r: 14, color: "#2563eb" },
    ],
    graphEdges: [
      [400,110,220,55],[400,110,580,65],[400,110,170,150],[400,110,530,160],[400,110,400,195],[400,110,640,140],[220,55,580,65],[170,150,530,160],
    ],
  },
};

// --- UNITED TRIBES Logo matching colleague's site ---
function Logo({ size = "md" }) {
  const fontSize = size === "lg" ? 22 : 13;
  return (
    <div style={{ display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
      <span
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize,
          fontWeight: 800,
          color: "#1a2744",
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        UNITED
      </span>
      <span
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize,
          fontWeight: 800,
          color: "#f5b800",
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        TRIBES
      </span>
    </div>
  );
}

function SideNav({ active, onNavigate, libraryCount = 0 }) {
  const items = [
    { id: "universe", icon: "◎", label: "Universe" },
    { id: "characters", icon: "◉", label: "Characters" },
    { id: "episodes", icon: "▣", label: "Episodes" },
    { id: "sonic", icon: "♪", label: "Sonic Layer" },
    { id: "explore", icon: "⊕", label: "Explore" },
    { id: "themes", icon: "◈", label: "Themes" },
    { id: "library", icon: "▤", label: "Library" },
  ];
  return (
    <nav
      style={{
        width: 68,
        minHeight: "100%",
        background: T.bgCard,
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 16,
        gap: 4,
        flexShrink: 0,
      }}
    >
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === "universe") onNavigate(SCREENS.CONSTELLATION);
              if (item.id === "explore") onNavigate(SCREENS.RESPONSE);
              if (item.id === "library") onNavigate(SCREENS.LIBRARY);
            }}
            style={{
              width: 54,
              height: 54,
              border: "none",
              borderRadius: 10,
              background: isActive ? T.blueLight : "transparent",
              color: isActive ? T.blue : T.textMuted,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              gap: 3,
              transition: "all 0.2s",
              position: "relative",
            }}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: "0.04em", fontFamily: "'DM Sans', sans-serif" }}>
              {item.label}
            </span>
            {item.id === "library" && libraryCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 5,
                  right: 5,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  background: T.blue,
                  color: "#fff",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                }}
              >
                {libraryCount}
              </div>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function Chip({ children, active, onClick, variant = "default" }) {
  const styles = {
    default: {
      background: active ? T.blueLight : T.bgCard,
      border: `1px solid ${active ? T.blueBorder : T.border}`,
      color: active ? T.blue : T.textMuted,
    },
    blue: {
      background: T.blueLight,
      border: `1px solid ${T.blueBorder}`,
      color: T.blue,
    },
    gold: {
      background: T.goldBg,
      border: `1px solid ${T.goldBorder}`,
      color: T.gold,
    },
  };
  return (
    <button
      onClick={onClick}
      style={{
        ...styles[variant],
        padding: "6px 14px",
        borderRadius: 20,
        fontSize: 12.5,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function EntityTag({ children, onClick }) {
  return (
    <span
      onClick={onClick}
      style={{
        color: T.blue,
        textDecoration: "underline",
        textDecorationColor: T.blueBorder,
        textUnderlineOffset: 3,
        cursor: "pointer",
        fontWeight: 600,
        transition: "all 0.15s",
      }}
    >
      {children}
    </span>
  );
}

function LibraryCounter({ count }) {
  return count > 0 ? (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        fontWeight: 600,
        color: T.blue,
        background: `${T.blue}0c`,
        border: `1px solid ${T.blue}22`,
        padding: "4px 11px",
        borderRadius: 8,
        transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: 13 }}>📚</span>
      <span>{count}</span>
    </div>
  ) : null;
}

function ModelSelector() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("claude");
  const models = [
    { id: "claude", name: "Claude", provider: "Anthropic", dot: "#2563eb" },
    { id: "nova", name: "Amazon Nova Pro", provider: "Amazon Bedrock", dot: "#ff9900" },
    { id: "llama", name: "Llama 3.3 70B", provider: "Meta Llama", dot: "#2563eb" },
    { id: "mistral", name: "Mistral Large 3", provider: "Mistral AI", dot: "#16803c" },
  ];
  const current = models.find((m) => m.id === selected);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12.5,
          color: T.textMuted,
          background: T.bgElevated,
          border: `1px solid ${T.border}`,
          padding: "5px 12px 5px 14px",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: current.dot, flexShrink: 0 }} />
        {current.name}
        <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 2 }}>▼</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              width: 220,
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              zIndex: 100,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                color: T.textDim,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                padding: "12px 16px 6px",
              }}
            >
              Select AI Model
            </div>
            {models.map((m) => (
              <div
                key={m.id}
                onClick={() => { setSelected(m.id); setOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  cursor: "pointer",
                  background: selected === m.id ? T.blueLight : "transparent",
                  transition: "background 0.1s",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: T.text }}>
                    {m.name}
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim }}>
                    {m.provider}
                  </div>
                </div>
                {selected === m.id && (
                  <span style={{ color: T.blue, fontSize: 14, fontWeight: 700 }}>✓</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EnhancedBadge({ count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11.5,
          fontWeight: 600,
          color: T.text,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold }} />
        Enhanced Discovery
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11.5,
          fontWeight: 600,
          color: T.blue,
          background: T.blueLight,
          border: `1px solid ${T.blueBorder}`,
          padding: "4px 12px",
          borderRadius: 14,
        }}
      >
        + {count} discoveries in this response
      </span>
    </div>
  );
}

// ==========================================================
//  SCREEN 1: HOME — Universe Selector + Explore Panel
// ==========================================================
function HomeScreen({ onNavigate, spoilerFree, setSpoilerFree }) {
  const [hovered, setHovered] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedUniverse, setSelectedUniverse] = useState(null);
  const [query, setQuery] = useState("");
  const exploreRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  useEffect(() => {
    if (selectedUniverse && exploreRef.current) {
      setTimeout(() => {
        exploreRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [selectedUniverse]);

  const handleSubmit = () => {
    onNavigate(SCREENS.THINKING);
  };

  const universes = [
    {
      id: "bluenote",
      title: "Blue Note Records",
      subtitle: "The Sound of Cool",
      gradient: "linear-gradient(160deg, #3b6fa0 0%, #4a82b8 100%)",
      textColor: "#fff",
      subColor: "rgba(255,255,255,0.7)",
      image: "🎵",
      exploreName: "Blue Note Records",
      exploreDescription: "Explore the artists, albums, and cultural legacy that defined modern jazz",
      placeholder: "What made Blue Note's recording approach revolutionary?",
      chips: [
        "How did Rudy Van Gelder shape the Blue Note sound?",
        "Connect Art Blakey to modern jazz",
        "Which Blue Note albums influenced hip-hop?",
        "Map the hard bop family tree",
      ],
    },
    {
      id: "pattismith",
      title: "Patti Smith: Just Kids",
      subtitle: "Punk, Poetry, Chelsea Hotel",
      gradient: "linear-gradient(160deg, #a03a5a 0%, #b84a6a 100%)",
      textColor: "#fff",
      subColor: "rgba(255,255,255,0.7)",
      image: "📖",
      exploreName: "Patti Smith: Just Kids",
      exploreDescription: "Trace the connections between punk, poetry, and the New York art scene",
      placeholder: "How did Patti Smith and Robert Mapplethorpe influence each other?",
      chips: [
        "Map the Chelsea Hotel creative network",
        "What literature shaped Patti Smith's lyrics?",
        "Connect punk to the Beat poets",
        "Which artists emerged from this scene?",
      ],
    },
    {
      id: "gerwig",
      title: "Greta Gerwig",
      subtitle: "The Director's Lens",
      gradient: "linear-gradient(160deg, #9a8040 0%, #b89850 100%)",
      textColor: "#fff",
      subColor: "rgba(255,255,255,0.7)",
      image: "🎬",
      exploreName: "Greta Gerwig",
      exploreDescription: "Discover the films, books, and music that define Gerwig's creative universe",
      placeholder: "What are the literary influences behind Lady Bird?",
      chips: [
        "How does Gerwig reference the French New Wave?",
        "What books shaped Little Women's adaptation?",
        "Connect Gerwig to the mumblecore movement",
        "Which composers define her soundtracks?",
      ],
    },
    {
      id: "pluribus",
      title: "Pluribus",
      subtitle: "The Hive Mind Universe",
      gradient: "linear-gradient(160deg, #2a7a4a 0%, #35905a 100%)",
      textColor: "#fff",
      subColor: "rgba(255,255,255,0.7)",
      image: "🌐",
      featured: true,
      exploreName: "Pluribus",
      exploreDescription: "Ask anything — discover connections across film, music, books, and podcasts",
      placeholder: "Who created Pluribus and what inspired it?",
      chips: [
        "What music inspired the show's tone?",
        "Trace the line from X-Files to Pluribus",
        "Which books share Pluribus' themes?",
        "Show me the Vince Gilligan universe",
      ],
    },
  ];

  const selected = universes.find((u) => u.id === selectedUniverse);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 40px 80px",
        position: "relative",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 48,
        }}
      >
        <Logo size="lg" />
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            color: T.textMuted,
            fontSize: 16,
            marginTop: 14,
            textAlign: "center",
          }}
        >
          Choose a universe to explore
        </p>
      </div>

      {/* Universe Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
          maxWidth: 960,
          width: "100%",
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s",
        }}
      >
        {universes.map((u) => {
          const isSelected = selectedUniverse === u.id;
          const isHover = hovered === u.id;
          return (
            <div
              key={u.id}
              onMouseEnter={() => setHovered(u.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                setSelectedUniverse(u.id);
                setQuery("");
              }}
              style={{
                background: u.gradient,
                borderRadius: 14,
                padding: 28,
                minHeight: 240,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                cursor: "pointer",
                border: isSelected
                  ? "2px solid rgba(255,255,255,0.5)"
                  : `1px solid ${isHover ? "rgba(255,255,255,0.2)" : "transparent"}`,
                transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
                transform: isHover ? "translateY(-4px)" : "none",
                boxShadow: isSelected
                  ? "0 4px 20px rgba(0,0,0,0.15)"
                  : isHover
                  ? T.shadowHover
                  : T.shadow,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "42%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: 64,
                  opacity: 0.25,
                }}
              >
                {u.image}
              </div>
              {u.featured && !isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    background: "rgba(255,255,255,0.2)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    color: "#fff",
                    fontSize: 10,
                    padding: "4px 10px",
                    borderRadius: 10,
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Featured
                </div>
              )}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    background: "rgba(255,255,255,0.25)",
                    border: "1px solid rgba(255,255,255,0.4)",
                    color: "#fff",
                    fontSize: 10,
                    padding: "4px 10px",
                    borderRadius: 10,
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Selected
                </div>
              )}
              <h3
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 22,
                  fontWeight: 600,
                  color: u.textColor,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {u.title}
              </h3>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: u.subColor,
                  margin: "8px 0 0",
                }}
              >
                {u.subtitle}
              </p>
            </div>
          );
        })}
      </div>

      {/* Explore Panel — appears below cards when a universe is selected */}
      {selected && (
        <div
          ref={exploreRef}
          style={{
            maxWidth: 960,
            width: "100%",
            marginTop: 36,
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "40px 48px",
            boxShadow: T.shadow,
            animation: "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 28,
                fontWeight: 600,
                color: T.text,
                margin: "0 0 8px",
              }}
            >
              Explore {selected.exploreName}
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: T.textMuted,
                fontSize: 15,
              }}
            >
              {selected.exploreDescription}
            </p>

            {/* Spoiler Toggle — Pluribus only */}
            {selected.id === "pluribus" && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 14,
                  marginTop: 16,
                  background: T.bgElevated,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "10px 20px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: T.text,
                  }}
                >
                  Finished Season 1?
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      color: spoilerFree ? T.text : T.textDim,
                      fontWeight: spoilerFree ? 600 : 400,
                    }}
                  >
                    No (Spoiler-Free)
                  </span>
                  <div
                    onClick={() => setSpoilerFree(!spoilerFree)}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: spoilerFree ? T.border : T.blue,
                      cursor: "pointer",
                      position: "relative",
                      transition: "background 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "#fff",
                        position: "absolute",
                        top: 3,
                        left: spoilerFree ? 3 : 23,
                        transition: "left 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      color: !spoilerFree ? T.text : T.textDim,
                      fontWeight: !spoilerFree ? 600 : 400,
                    }}
                  >
                    Yes (Unlock All)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Search input */}
          <div style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={selected.placeholder}
              style={{
                width: "100%",
                padding: "16px 56px 16px 20px",
                borderRadius: 12,
                border: `1px solid ${T.borderLight}`,
                background: T.bg,
                color: T.text,
                fontSize: 15,
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
                boxSizing: "border-box",
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
              }}
            />
            <button
              onClick={handleSubmit}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 38,
                height: 38,
                borderRadius: 10,
                border: "none",
                background: T.queryBg,
                color: "#fff",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              →
            </button>
          </div>

          {/* Starter chips */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 20,
              justifyContent: "center",
              maxWidth: 640,
              margin: "20px auto 0",
            }}
          >
            {selected.chips.map((chip) => (
              <Chip key={chip} onClick={() => setQuery(chip)}>
                {chip}
              </Chip>
            ))}
          </div>

          {/* Model indicator */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            <ModelSelector />
          </div>
        </div>
      )}

      {/* Footer */}
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: T.textDim,
          fontSize: 12,
          marginTop: 40,
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.6s 0.5s",
        }}
      >
        Powered by UnitedTribes Knowledge Graph · Authorized content partnerships
      </p>
    </div>
  );
}

// ==========================================================
//  SCREEN 3: THINKING
// ==========================================================
function ThinkingScreen({ onNavigate }) {
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [entityCount, setEntityCount] = useState(0);
  const [mediaCount, setMediaCount] = useState(0);

  const steps = [
    { label: "Connecting to UnitedTribes Knowledge Graph", detail: "Pluribus universe loaded" },
    { label: "Scanning cross-media relationships", detail: "Film, music, books, podcasts" },
    { label: "Resolving entities", detail: "16 verified entities found" },
    { label: "Mapping cross-media connections", detail: "4 media types connected" },
    { label: "Verifying source authority", detail: "All sources from authorized partnerships" },
    { label: "Generating response", detail: "Confidence Score: 94%" },
  ];

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
    const interval = setInterval(() => {
      setStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(() => onNavigate(SCREENS.RESPONSE), 800);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (step >= 2) {
      let c = 0;
      const i = setInterval(() => { c++; setEntityCount(Math.min(c, 16)); if (c >= 16) clearInterval(i); }, 50);
      return () => clearInterval(i);
    }
  }, [step >= 2]);

  useEffect(() => {
    if (step >= 3) {
      let c = 0;
      const i = setInterval(() => { c++; setMediaCount(Math.min(c, 4)); if (c >= 4) clearInterval(i); }, 150);
      return () => clearInterval(i);
    }
  }, [step >= 3]);

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg }}>
      <SideNav active="explore" onNavigate={onNavigate} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 56,
            borderBottom: `1px solid ${T.border}`,
            background: T.bgCard,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <Logo />
          <ModelSelector />
          <button
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: T.textMuted,
              background: T.bgCard,
              padding: "6px 16px",
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            + New chat
          </button>
        </header>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.4s",
          }}
        >
          {/* Query bubble */}
          <div
            style={{
              background: T.queryBg,
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 17,
              fontWeight: 500,
              padding: "14px 28px",
              borderRadius: 24,
              marginBottom: 40,
              maxWidth: 480,
              textAlign: "center",
            }}
          >
            Who created Pluribus and what inspired it?
          </div>

          {/* Thinking card */}
          <div
            style={{
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: "28px 36px",
              maxWidth: 520,
              width: "100%",
              boxShadow: T.shadow,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: T.gold,
                  animation: "pulse 1.2s infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.text,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Enhanced Discovery
              </span>
            </div>

            <div
              style={{
                height: 3,
                background: T.bgElevated,
                borderRadius: 2,
                marginBottom: 24,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: `linear-gradient(90deg, ${T.blue}, ${T.blueDark})`,
                  borderRadius: 2,
                  width: `${((step + 1) / steps.length) * 100}%`,
                  transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {steps.map((s, i) => {
                const isVisible = i <= step;
                const isCurrent = i === step;
                const isComplete = i < step;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? "translateY(0)" : "translateY(8px)",
                      transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: isComplete ? T.greenBg : isCurrent ? T.blueLight : T.bgElevated,
                        border: `1.5px solid ${isComplete ? T.green : isCurrent ? T.blue : T.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: isComplete ? T.green : T.blue,
                        flexShrink: 0,
                        marginTop: 1,
                        transition: "all 0.3s",
                      }}
                    >
                      {isComplete ? "✓" : isCurrent ? "●" : ""}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 13.5,
                          color: isCurrent ? T.text : isComplete ? T.textMuted : T.textDim,
                          fontWeight: isCurrent ? 500 : 400,
                        }}
                      >
                        {s.label}
                      </div>
                      {isVisible && (
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11.5,
                            color: isComplete ? T.textDim : T.blue,
                            marginTop: 2,
                          }}
                        >
                          {s.detail}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Counters */}
          <div
            style={{
              display: "flex",
              gap: 24,
              marginTop: 28,
              opacity: step >= 2 ? 1 : 0,
              transition: "opacity 0.4s",
            }}
          >
            {[
              { label: "Discoveries", value: entityCount, color: T.blue },
              { label: "Media Types", value: mediaCount, color: T.blue },
              { label: "Confidence", value: step >= 5 ? "94%" : "—", color: T.green },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: T.bgCard,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "16px 24px",
                  textAlign: "center",
                  minWidth: 120,
                  boxShadow: T.shadow,
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: stat.color,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 10,
                    fontWeight: 600,
                    color: T.textDim,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginTop: 6,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 18,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              color: T.textDim,
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: step >= 4 ? 1 : 0,
              transition: "opacity 0.4s",
            }}
          >
            <span style={{ color: T.green }}>●</span>
            All data from authorized content partnerships
          </div>
        </div>
      </div>
    </div>
  );
}


// ==========================================================
//  SHARED: Discovery Card (dark, media-rich)
// ==========================================================
function DiscoveryCard({ type, typeBadgeColor, title, meta, context, platform, platformColor, price, icon, spoiler, spoilerFree, library, toggleLibrary, onCardClick }) {
  const isLocked = spoiler && spoilerFree;
  const inLibrary = library && library.has(title);

  const handleClick = () => {
    if (isLocked || !onCardClick) return;
    onCardClick({ type, title, meta, context, platform, platformColor, price, icon });
  };

  return (
    <div
      onClick={handleClick}
      style={{
        minWidth: 185,
        maxWidth: 205,
        background: T.queryBg,
        borderRadius: 12,
        overflow: "hidden",
        cursor: isLocked ? "default" : "pointer",
        flexShrink: 0,
        transition: "all 0.2s",
        border: isLocked ? "1px solid rgba(255,255,255,0.12)" : inLibrary ? `1px solid ${T.blue}44` : "1px solid rgba(255,255,255,0.06)",
        position: "relative",
        borderLeft: inLibrary && !isLocked ? `3px solid ${T.blue}` : undefined,
      }}
    >
      {/* Spoiler lock overlay */}
      {isLocked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(26,32,44,0.85)",
            backdropFilter: "blur(8px)",
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.7 }}>🔒</div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
              textAlign: "center",
              padding: "0 16px",
              lineHeight: 1.4,
            }}
          >
            Finish S1 to unlock
          </div>
          {spoiler === "S1" && (
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginTop: 6,
                background: "rgba(255,255,255,0.08)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              S1 Spoiler
            </div>
          )}
        </div>
      )}

      <div
        style={{
          height: 105,
          background: `linear-gradient(135deg, ${T.queryBg}, #2a3548)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontSize: 34,
          opacity: isLocked ? 0.3 : 0.85,
          filter: isLocked ? "blur(3px)" : "none",
          transition: "all 0.3s",
        }}
      >
        {icon}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: typeBadgeColor || T.blue,
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: 4,
          }}
        >
          {type}
        </div>
      </div>
      <div
        style={{
          padding: "11px 13px",
          filter: isLocked ? "blur(4px)" : "none",
          opacity: isLocked ? 0.3 : 1,
          transition: "all 0.3s",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13.5,
            fontWeight: 600,
            color: "#fff",
            lineHeight: 1.3,
            marginBottom: 3,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
            marginBottom: context ? 5 : 9,
          }}
        >
          {meta}
        </div>
        {context && (
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 10.5,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.4,
              marginBottom: 9,
            }}
          >
            {context}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {platform && (
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9.5,
                fontWeight: 700,
                color: "#fff",
                background: platformColor || T.blue,
                padding: "3px 8px",
                borderRadius: 4,
              }}
            >
              {platform}
            </span>
          )}
          {price && (
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9.5,
                fontWeight: 700,
                color: "#fff",
                background: "#f5b800",
                padding: "3px 8px",
                borderRadius: 4,
              }}
            >
              {price}
            </span>
          )}
        </div>
      </div>

      {/* Spoiler badge on unlocked spoiler cards */}
      {spoiler && !spoilerFree && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 8,
            fontWeight: 700,
            color: "rgba(255,255,255,0.5)",
            background: "rgba(255,255,255,0.1)",
            padding: "2px 7px",
            borderRadius: 4,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            zIndex: 2,
          }}
        >
          S1 Spoiler
        </div>
      )}

      {/* Add to library button */}
      {toggleLibrary && !isLocked && (
        <div
          onClick={(e) => { e.stopPropagation(); toggleLibrary(title); }}
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            width: 24,
            height: 24,
            borderRadius: 6,
            background: inLibrary ? T.blue : "rgba(255,255,255,0.1)",
            border: inLibrary ? "none" : "1px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            zIndex: 2,
            fontSize: 13,
            color: inLibrary ? "#fff" : "rgba(255,255,255,0.5)",
            fontWeight: 700,
          }}
        >
          {inLibrary ? "✓" : "+"}
        </div>
      )}
    </div>
  );
}

// ==========================================================
//  SHARED: AI-Curated Discovery Header
// ==========================================================
function AICuratedHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 4, minHeight: 32, borderRadius: 2, background: "#c0392b", flexShrink: 0 }} />
        <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>
          AI-Curated Discovery
        </h2>
      </div>
      <div
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 9.5, fontWeight: 800,
          textTransform: "uppercase", letterSpacing: "1px",
          border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 12px",
        }}
      >
        <span style={{ color: "#1a2744" }}>POWERED BY UNITED</span><span style={{ color: "#f5b800" }}>TRIBES</span>
      </div>
    </div>
  );
}

// ==========================================================
//  SHARED: Song Tile (for episode music section)
// ==========================================================
function SongTile({ title, artist, isPlaying, onPlay, artColor }) {
  return (
    <div
      onClick={onPlay}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 14px", background: isPlaying ? T.queryBg : T.bgCard,
        border: `1px solid ${isPlaying ? "rgba(255,255,255,0.1)" : T.border}`,
        borderRadius: 10, cursor: "pointer", transition: "all 0.2s", minWidth: 0,
      }}
    >
      <div
        style={{
          width: 42, height: 42, borderRadius: 6, flexShrink: 0,
          background: artColor || "linear-gradient(135deg, #374151, #6b7280)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", fontSize: 18,
        }}
      >
        🎵
        <div style={{
          position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%",
          background: "#c0392b", border: "2px solid #fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 7, color: "#fff",
        }}>
          ▶
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: isPlaying ? "#fff" : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, color: isPlaying ? "rgba(255,255,255,0.5)" : T.textMuted }}>
          {artist}
        </div>
      </div>
      <div
        style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "#16803c", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, flexShrink: 0,
        }}
      >
        ▶
      </div>
    </div>
  );
}

// ==========================================================
//  SHARED: Now Playing Bar (expandable with scrub + skip)
// ==========================================================
function NowPlayingBar({ song, artist, context, timestamp, onClose, onNext, onPrev, onWatchVideo }) {
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const progressRef = useRef(null);

  // Simulate playback progress
  useEffect(() => {
    if (!playing || !song) return;
    const interval = setInterval(() => {
      setProgress(p => p >= 100 ? 0 : p + 0.3);
    }, 100);
    return () => clearInterval(interval);
  }, [playing, song]);

  // Reset progress on song change
  useEffect(() => {
    setProgress(0);
    setPlaying(true);
  }, [song]);

  if (!song) return null;

  const handleScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setProgress(pct);
  };

  return (
    <div
      style={{
        position: "fixed", bottom: 60, left: 68, right: 0,
        background: T.queryBg, zIndex: 50,
        transition: "all 0.3s ease",
      }}
    >
      {/* Scrub bar */}
      <div
        onClick={handleScrub}
        style={{
          height: 3, background: "rgba(255,255,255,0.1)", cursor: "pointer",
          position: "relative",
        }}
      >
        <div style={{
          height: "100%", background: "#16803c", width: `${progress}%`,
          transition: "width 0.1s linear", borderRadius: "0 1.5px 1.5px 0",
        }} />
        <div style={{
          position: "absolute", top: -4, left: `${progress}%`, width: 10, height: 10,
          borderRadius: "50%", background: "#16803c", transform: "translateX(-50%)",
          boxShadow: "0 0 4px rgba(22,128,60,0.5)", opacity: 0.9,
        }} />
      </div>

      {/* Main controls row */}
      <div
        style={{
          height: 52, display: "flex",
          alignItems: "center", justifyContent: "space-between",
          padding: "0 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16803c" }} />

          {/* Skip / play controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 4 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onPrev && onPrev(); }}
              style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.5)",
                cursor: "pointer", fontSize: 11, padding: "4px 6px",
              }}
            >
              ⏮
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setPlaying(!playing); }}
              style={{
                background: "none", border: "none", color: "#fff",
                cursor: "pointer", fontSize: 14, padding: "4px 6px",
              }}
            >
              {playing ? "⏸" : "▶"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onNext && onNext(); }}
              style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.5)",
                cursor: "pointer", fontSize: 11, padding: "4px 6px",
              }}
            >
              ⏭
            </button>
          </div>

          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 600, color: "#fff" }}>
            {song}
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.blue, fontWeight: 500 }}>
            · {artist}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, fontWeight: 600,
              color: "#fff", background: expanded ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.12)",
              border: "none", padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            📋 How it's used
          </button>
          <button
            onClick={() => onWatchVideo && onWatchVideo()}
            style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, fontWeight: 600,
              color: "#fff", background: "rgba(255,255,255,0.12)",
              border: "none", padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            ▶ Watch Video
          </button>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>
            via UMG
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.4)",
              cursor: "pointer", fontSize: 16, marginLeft: 4,
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Expanded: IN THE EPISODE context */}
      {expanded && context && (
        <div style={{ padding: "0 20px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 9.5, fontWeight: 700,
            color: "#c0392b", textTransform: "uppercase", letterSpacing: "0.08em",
            marginTop: 12, marginBottom: 8,
          }}>
            IN THE EPISODE
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
            {context}
            {timestamp && (
              <span
                onClick={() => onWatchVideo && onWatchVideo()}
                style={{ color: "#16803c", fontWeight: 600, marginLeft: 2, cursor: "pointer" }}
              >
                ⏱ {timestamp} Watch the scene →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
//  SHARED: Video Modal
// ==========================================================
function VideoModal({ title, subtitle, onClose }) {
  if (!title) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, background: T.queryBg, borderRadius: 14,
          overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px",
        }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: "#fff" }}>
            {title}{subtitle ? ` — ${subtitle}` : ""}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.5)",
              cursor: "pointer", fontSize: 20, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Video area */}
        <div
          style={{
            width: "100%", aspectRatio: "16/9", background: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, color: "#fff",
              border: "2px solid rgba(255,255,255,0.2)",
            }}
          >
            ▶
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 18px",
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.45)",
        }}>
          Official video · via UMG / Vevo · Would open in streaming player
        </div>
      </div>
    </div>
  );
}

// ==========================================================
//  SHARED: Reading Modal (articles, books, essays)
// ==========================================================
function ReadingModal({ title, meta, context, platform, platformColor, price, icon, onClose }) {
  if (!title) return null;
  const isBook = icon === "📖";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520, maxHeight: "80vh", background: T.bgCard, borderRadius: 14,
          overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 0", flexShrink: 0,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 16, flex: 1 }}>
              <div style={{
                width: isBook ? 70 : 56, height: isBook ? 100 : 56, borderRadius: isBook ? 4 : 10, flexShrink: 0,
                background: isBook
                  ? "linear-gradient(145deg, #1e3a5f, #2a5a8a)"
                  : "linear-gradient(145deg, #374151, #4b5563)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isBook ? 28 : 24, boxShadow: isBook ? "3px 3px 8px rgba(0,0,0,0.15)" : "none",
              }}>
                {icon}
              </div>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
                  {title}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.textMuted, marginTop: 4 }}>
                  {meta}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {platform && (
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, fontWeight: 700,
                      color: "#fff", background: platformColor || T.blue,
                      padding: "3px 10px", borderRadius: 4,
                    }}>
                      {platform}
                    </span>
                  )}
                  {price && (
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, fontWeight: 700,
                      color: "#fff", background: "#f5b800",
                      padding: "3px 10px", borderRadius: 4,
                    }}>
                      {price}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", color: T.textDim,
                cursor: "pointer", fontSize: 22, lineHeight: 1, flexShrink: 0, marginLeft: 8,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: T.border, margin: "18px 24px 0" }} />

        {/* Content area */}
        <div style={{ padding: "18px 24px", overflowY: "auto", flex: 1 }}>
          {/* Why this matters */}
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 9.5, fontWeight: 700,
            color: "#c0392b", textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: 10,
          }}>
            {isBook ? "WHY THIS BOOK MATTERS" : "WHY THIS MATTERS"}
          </div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, lineHeight: 1.75,
            color: T.text, marginBottom: 20,
          }}>
            {context}
          </div>

          {/* Connection to Pluribus */}
          <div style={{
            padding: "14px 16px", background: T.bgElevated, borderRadius: 10,
            border: `1px solid ${T.border}`, marginBottom: 16,
          }}>
            <div style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 9.5, fontWeight: 700,
              color: T.blue, textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 8,
            }}>
              CONNECTION TO PLURIBUS
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, lineHeight: 1.65, color: T.textMuted }}>
              {isBook
                ? `This work is part of the literary DNA that feeds directly into Pluribus's themes of identity, consciousness, and what it means to be human in a world that has moved beyond individuality.`
                : `Referenced in the UnitedTribes Knowledge Graph as a verified influence on or analysis of Vince Gilligan's creative universe.`
              }
            </div>
          </div>

          {/* Source attribution */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim,
          }}>
            <span style={{ fontSize: 13 }}>{icon}</span>
            <span>Powered by UnitedTribes Knowledge Graph</span>
          </div>
        </div>

        {/* Footer action */}
        <div style={{
          padding: "14px 24px", borderTop: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
        }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim }}>
            {isBook ? "Purchase links are affiliate-free" : "Opens in external reader"}
          </span>
          <button style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
            color: "#fff", background: T.blue, border: "none",
            padding: "8px 20px", borderRadius: 8, cursor: "pointer",
          }}>
            {price ? `Buy · ${price}` : platform ? `Open on ${platform}` : "Read more"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
//  SHARED: Contextual Discovery Group
// ==========================================================
function DiscoveryGroup({ accentColor, title, description, children }) {
  return (
    <div style={{ marginBottom: 34 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div
          style={{
            width: 4,
            minHeight: 44,
            borderRadius: 2,
            background: accentColor,
            flexShrink: 0,
            marginTop: 2,
          }}
        />
        <div>
          <h3
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: T.text,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: T.textMuted,
              margin: "4px 0 0",
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 8,
          paddingLeft: 18,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ==========================================================
//  SHARED: Entity Quick View Panel
// ==========================================================
function EntityQuickView({ entity, onClose, onNavigate, onViewDetail, library, toggleLibrary }) {
  if (!entity) return null;
  const data = ENTITIES[entity];
  if (!data) return null;

  const mediaGroups = data.quickViewGroups;
  const totalItems = mediaGroups.reduce((sum, g) => sum + (g.total || g.items.length), 0);

  return (
    <div
      style={{
        width: 390,
        borderLeft: `1px solid ${T.border}`,
        background: T.bgCard,
        overflowY: "auto",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 22px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          background: T.bgCard,
          zIndex: 2,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 19,
                fontWeight: 700,
                color: T.text,
              }}
            >
              {entity}
            </div>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                color: T.green,
                background: T.greenBg,
                padding: "3px 8px",
                borderRadius: 6,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                border: `1px solid ${T.greenBorder}`,
              }}
            >
              Verified
            </span>
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12.5,
              color: T.textMuted,
              marginTop: 4,
            }}
          >
            {data.subtitle} · {totalItems} media items
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: T.textMuted,
            cursor: "pointer",
            fontSize: 20,
            padding: "0 4px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Action bar */}
      <div
        style={{
          padding: "12px 22px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          gap: 8,
        }}
      >
        <button
          onClick={() => onViewDetail(entity)}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: T.blue,
            background: T.blueLight,
            border: `1px solid ${T.blueBorder}`,
            padding: "7px 14px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Full Profile →
        </button>
        <button
          onClick={() => onNavigate(SCREENS.CONSTELLATION)}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: T.textMuted,
            background: T.bgElevated,
            border: `1px solid ${T.border}`,
            padding: "7px 14px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          View in Constellation
        </button>
      </div>

      {/* Media groups */}
      <div style={{ padding: "16px 22px", flex: 1 }}>
        {mediaGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 22 }}>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10.5,
                fontWeight: 700,
                color: T.textDim,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{group.label}</span>
              <span style={{ color: T.blue, fontWeight: 600, fontSize: 10, cursor: "pointer" }}>
                {group.total && group.total > group.items.length
                  ? `${group.items.length} of ${group.total}`
                  : `${group.items.length} items`}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {group.items.map((item) => {
                const itemInLibrary = library && library.has(item.title);
                return (
                <div
                  key={item.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 13px",
                    background: T.bgElevated,
                    border: `1px solid ${itemInLibrary ? `${T.blue}33` : T.border}`,
                    borderLeft: itemInLibrary ? `3px solid ${T.blue}` : `1px solid ${itemInLibrary ? `${T.blue}33` : T.border}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        color: T.textDim,
                        marginTop: 1,
                      }}
                    >
                      {item.meta}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: "#fff",
                      background: item.platformColor,
                      padding: "3px 8px",
                      borderRadius: 4,
                      flexShrink: 0,
                      marginLeft: 10,
                    }}
                  >
                    {item.platform}
                  </span>
                  {toggleLibrary && (
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleLibrary(item.title); }}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 5,
                        background: itemInLibrary ? T.blue : T.bg,
                        border: itemInLibrary ? "none" : `1px solid ${T.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        flexShrink: 0,
                        marginLeft: 8,
                        fontSize: 12,
                        color: itemInLibrary ? "#fff" : T.textDim,
                        fontWeight: 700,
                      }}
                    >
                      {itemInLibrary ? "✓" : "+"}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Source footer */}
      <div
        style={{
          padding: "12px 22px",
          borderTop: `1px solid ${T.border}`,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          color: T.textDim,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ color: T.green }}>●</span>
        Sourced from authorized partnerships
      </div>
    </div>
  );
}


// ==========================================================
//  SCREEN 3: RESPONSE — Contextual Discovery Experience
// ==========================================================
function ResponseScreen({ onNavigate, onSelectEntity, spoilerFree, library, toggleLibrary }) {
  const [loaded, setLoaded] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [quickViewEntity, setQuickViewEntity] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [videoModal, setVideoModal] = useState(null);
  const [readingModal, setReadingModal] = useState(null);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  const openQuickView = (entity) => {
    setShowCompare(false);
    setQuickViewEntity(entity);
  };

  const viewDetail = (entity) => {
    onSelectEntity(entity);
    onNavigate(SCREENS.ENTITY_DETAIL);
  };

  const songs = [
    { title: "It's the End of the World as We Know It", artist: "R.E.M.", artColor: "linear-gradient(135deg, #2563eb, #1e40af)", context: "Opens the episode. Carol drives through empty Albuquerque streets as the Others' emergency broadcast plays. The irony lands differently when everyone's smiling.", timestamp: "0:45" },
    { title: "Tarzan Boy", artist: "Baltimora", artColor: "linear-gradient(135deg, #16803c, #0d5c2b)", context: "The Others have rebuilt a shopping mall. Carol watches them dance in perfect unison. She almost laughs.", timestamp: "8:12" },
    { title: "I Will Survive", artist: "Gloria Gaynor", artColor: "linear-gradient(135deg, #7c3aed, #6d28d9)", context: "Carol's ringtone. Her phone rings in the empty house. She stares at Helen's name on the screen.", timestamp: "14:30" },
    { title: "Born to Be Wild", artist: "Steppenwolf", artColor: "linear-gradient(135deg, #c0392b, #991b1b)", context: "Manousos's introduction. He drives his yellow car across the Chaco, windows down, refusing to stop at any checkpoint.", timestamp: "17:55" },
    { title: "Georgia on My Mind", artist: "Ray Charles", artColor: "linear-gradient(135deg, #16803c, #0d5c2b)", context: "Carol finds a working jukebox in an abandoned bar. She plays this and sits alone, drinking. The first moment she lets herself grieve.", timestamp: "28:40" },
    { title: "Hot in Herre", artist: "Nelly", artColor: "linear-gradient(135deg, #7c3aed, #5b21b6)", context: "The Others throw Carol a party. Every song she's ever loved, played in sequence. It's terrifying.", timestamp: "33:15" },
    { title: "I'm Alright", artist: "Kenny Loggins", artColor: "linear-gradient(135deg, #2563eb, #1d4ed8)", context: "End credits. After everything — the bar, the grief, the party — this plays over black. Pure Gilligan.", timestamp: "48:20" },
    { title: "Aquarius / Sunshine In", artist: "MARO & NASAYA", artColor: "linear-gradient(135deg, #16803c, #0d5c2b)", context: "The Others' anthem. They sing it in every language simultaneously. Beautiful and deeply unsettling.", timestamp: "38:50" },
  ];

  const handleNextSong = () => {
    if (nowPlaying !== null) setNowPlaying((nowPlaying + 1) % songs.length);
  };
  const handlePrevSong = () => {
    if (nowPlaying !== null) setNowPlaying(nowPlaying === 0 ? songs.length - 1 : nowPlaying - 1);
  };

  const handleCardClick = (card) => {
    const videoTypes = ["ANALYSIS", "VIDEO", "SCORE", "AMBIENT", "INFLUENCE", "PLAYLIST", "OST", "NEEDLE DROP"];
    const readTypes = ["NOVEL", "BOOK", "DYSTOPIA", "PROFILE", "ACADEMIC", "ESSAY", "ARTICLE"];
    const t = (card.type || "").toUpperCase();
    if (videoTypes.includes(t) || (card.platform && card.platform.includes("Watch"))) {
      setVideoModal({ title: card.title, subtitle: card.meta });
    } else if (readTypes.includes(t) || card.icon === "📖" || card.icon === "📄") {
      setReadingModal(card);
    } else if (t === "FILM" || t === "TV" || t === "TZ" || t === "CAREER" || t === "16 EMMYS" || t === "EPISODE") {
      setVideoModal({ title: card.title, subtitle: card.meta });
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg }}>
      <SideNav active="explore" onNavigate={onNavigate} libraryCount={library ? library.size : 0} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header
          style={{
            height: 56,
            borderBottom: `1px solid ${T.border}`,
            background: T.bgCard,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
          }}
        >
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => {
                setShowCompare(!showCompare);
                setQuickViewEntity(null);
              }}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12.5,
                color: showCompare ? T.blue : T.textMuted,
                background: showCompare ? T.blueLight : T.bgCard,
                border: `1px solid ${showCompare ? T.blueBorder : T.border}`,
                padding: "6px 14px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              ⟷ Compare Response
            </button>
            <ModelSelector />
          </div>
        </header>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* ===== Main response column ===== */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "28px 36px",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.5s",
            }}
          >
            {/* Query bubble */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
              <div
                style={{
                  background: T.queryBg,
                  color: "#fff",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 16,
                  fontWeight: 500,
                  padding: "12px 24px",
                  borderRadius: 22,
                }}
              >
                Who created Pluribus and what inspired it?
              </div>
            </div>

            {/* Spoiler-free banner */}
            {spoilerFree && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  background: `${T.blue}0a`,
                  border: `1px solid ${T.blueBorder}`,
                  borderRadius: 10,
                  marginBottom: 20,
                  maxWidth: 700,
                }}
              >
                <span style={{ fontSize: 15 }}>🛡️</span>
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, fontWeight: 600, color: T.blue }}>
                    Spoiler-Free Mode
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                    Some content is hidden or redacted to protect your Season 1 experience. 3 cards locked.
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Discovery header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Enhanced Discovery
                </span>
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
                  color: T.gold, background: T.goldBg, border: `1px solid ${T.goldBorder}`,
                  padding: "4px 12px", borderRadius: 20, display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <span style={{ fontSize: 11 }}>✦</span> 16 DISCOVERIES IN THIS RESPONSE
              </div>
            </div>

            {/* Response prose */}
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                lineHeight: 1.8,
                color: T.text,
                maxWidth: 700,
              }}
            >
              <p style={{ margin: "0 0 18px" }}>
                <strong>Pluribus</strong> was created by{" "}
                <EntityTag onClick={() => openQuickView("Vince Gilligan")}>Vince Gilligan</EntityTag>,
                the visionary behind{" "}
                <EntityTag onClick={() => openQuickView("Breaking Bad")}>Breaking Bad</EntityTag> (2008–2013, 16 Emmys),{" "}
                <EntityTag onClick={() => openQuickView("Breaking Bad")}>Better Call Saul</EntityTag> (2015–2022), and{" "}
                <EntityTag>El Camino</EntityTag> (2019). He began his career writing 30 episodes of{" "}
                <EntityTag>The X-Files</EntityTag>, including "<EntityTag>Pusher</EntityTag>" — the seed for Pluribus's
                mind-control themes.
              </p>

              <p style={{ margin: "0 0 18px" }}>
                The show's inspirations run deep. Gilligan cited{" "}
                <EntityTag onClick={() => openQuickView("Invasion of the Body Snatchers")}>Invasion of the Body Snatchers</EntityTag> (1956) as{" "}
                <em>"THE wellspring for Pluribus"</em> — the fear that people around you aren't who they
                seem. He pulled from <EntityTag>The Thing</EntityTag>,{" "}
                <EntityTag>Village of the Damned</EntityTag>, and{" "}
                <EntityTag>The Quiet Earth</EntityTag> for isolation and paranoia.
              </p>

              {/* Spoiler paragraph — redacted in spoiler-free mode */}
              {spoilerFree ? (
                <div
                  style={{
                    margin: "0 0 18px",
                    padding: "14px 18px",
                    background: T.bgElevated,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 16, opacity: 0.5 }}>🔒</span>
                  <div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: T.textMuted }}>
                      Plot details hidden
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.textDim, marginTop: 2 }}>
                      This section reveals key S1 connections between character names, distances, and body counts. Finish Season 1 to unlock.
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ margin: "0 0 18px" }}>
                  Crucially, Gilligan named his protagonist after{" "}
                  <EntityTag>William Sturka</EntityTag> from the 1960{" "}
                  <EntityTag>Twilight Zone</EntityTag> episode "<EntityTag>Third from the Sun</EntityTag>"
                  — then <em>corrected</em> its scientific error: the original said Earth was "11 million
                  miles" away. In Pluribus, the signal comes from <strong>600 light-years</strong> — the
                  real distance to <EntityTag>Kepler-22b</EntityTag>. And 11 million? That became the body
                  count. <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim }}>[Source: Poggy Analysis]</span>
                </p>
              )}

              <p style={{ margin: "0 0 18px" }}>
                The literary DNA goes deeper: <EntityTag>Zamyatin</EntityTag>'s{" "}
                <EntityTag>We</EntityTag> (1924) — <em>the first dystopia</em>, before Orwell —{" "}
                <EntityTag>Matheson</EntityTag>'s <EntityTag>I Am Legend</EntityTag>, and the{" "}
                <EntityTag>Borg</EntityTag> collective all feed into:{" "}
                <em>What if losing yourself felt like relief?</em>
              </p>
            </div>

            {/* ========== AI-Curated Discovery ========== */}
            <div style={{ marginTop: 40 }}>
              <AICuratedHeader />

              {/* Group 1: Gilligan's Inspirations */}
              <DiscoveryGroup
                accentColor="#c0392b"
                title="Gilligan's Inspirations"
                description='The films, books, and episodes Gilligan specifically cited — from the 1956 "wellspring" to the Twilight Zone episode that named his protagonist.'
              >
                <DiscoveryCard type="ANALYSIS" typeBadgeColor="#991b1b" title="Pluribus Is a 600-Year-Old Lie" meta="Poggy · 28 min" context="Decodes Gilligan's hidden references and the 600-light-year clue" platform="▶ Watch" platformColor="#2563eb" icon="📺" spoiler="S1" spoilerFree={spoilerFree} library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
                <DiscoveryCard type="FILM" typeBadgeColor="#16803c" title="Body Snatchers (1956)" meta={'"THE wellspring"'} context="Gilligan called this the single biggest influence on Pluribus" price="$0.99" platform="Peacock" platformColor="#555" icon="🎬" library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
                <DiscoveryCard type="FILM" typeBadgeColor="#16803c" title="The Thing (1982)" meta="Letterboxd #2" context="Template for isolation, paranoia, and 'who can you trust?'" platform="Peacock" platformColor="#555" icon="🎬" library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
                <DiscoveryCard type="TZ" typeBadgeColor="#4b5563" title="Third from the Sun" meta="Twilight Zone · 1960" context="Named the protagonist — then corrected its scientific error" platform="Paramount+" platformColor="#0064ff" icon="📺" spoiler="S1" spoilerFree={spoilerFree} library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
                <DiscoveryCard type="BOOK" typeBadgeColor="#16803c" title="We (1924)" meta="Zamyatin" context="The first dystopia, before Orwell — collective erasure of self" price="$14.99" icon="📖" library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
                <DiscoveryCard type="FILM" typeBadgeColor="#16803c" title="Village of the Damned" meta="1960 · Wyndham" context="Children with hive-mind powers — a direct Pluribus ancestor" platform="Tubi" platformColor="#ff4500" icon="🎬" library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
              </DiscoveryGroup>

              {/* Group 2: The Gilligan Universe */}
              <DiscoveryGroup
                accentColor={T.blue}
                title="The Gilligan Universe"
                description="Everything Gilligan created before Pluribus — the shows that built the skills, the characters, and the reputation."
              >
                <DiscoveryCard type="16 EMMYS" typeBadgeColor={T.gold} title="Breaking Bad" meta="2008–2013" context="Proved Gilligan could sustain a 5-season moral spiral" platform="Netflix" platformColor="#e50914" icon="📺" library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
                <DiscoveryCard type="TV" typeBadgeColor="#16803c" title="Better Call Saul" meta="2015–2022" context="Deepened the universe — patience and slow-burn mastery" platform="AMC+" platformColor="#1a6fe3" icon="📺" library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
                <DiscoveryCard type="FILM" typeBadgeColor="#16803c" title="El Camino" meta="2019 · Netflix" context="Jesse's escape — Gilligan's first feature as director" platform="Netflix" platformColor="#e50914" icon="🎬" library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
                <DiscoveryCard type="CAREER" typeBadgeColor="#16803c" title='X-Files: "Pusher"' meta="S3E17 · The seed" context="Mind control episode that planted the Pluribus concept" platform="Hulu" platformColor="#1ce783" icon="📺" library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
              </DiscoveryGroup>

              {/* ===== Episode Music Section ===== */}
              <div style={{ marginBottom: 34 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 4, minHeight: 44, borderRadius: 2, background: "#7c3aed", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🎧</span> Episode 7 — "The Gap"
                      </h3>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.textMuted, margin: "4px 0 0", lineHeight: 1.5 }}>
                        Thomas Golubić's needle drops — every song chosen to mirror Carol's emotional state as she realizes what the Joining really means.
                      </p>
                    </div>
                  </div>
                  <button
                    style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700,
                      color: "#fff", background: "#16803c",
                      border: "none", padding: "8px 18px", borderRadius: 8, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                    }}
                  >
                    ▶ Play All
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, paddingLeft: 18 }}>
                  {songs.map((s, i) => (
                    <SongTile
                      key={i}
                      title={s.title}
                      artist={s.artist}
                      artColor={s.artColor}
                      isPlaying={nowPlaying === i}
                      onPlay={() => setNowPlaying(nowPlaying === i ? null : i)}
                    />
                  ))}
                </div>
              </div>

              {/* Group 3: Literary Roots */}
              <DiscoveryGroup
                accentColor={T.green}
                title="Literary Roots"
                description="The novels and philosophical works that underpin the Hive Mind concept and Pluribus's themes of identity dissolution."
              >
                <DiscoveryCard type="NOVEL" typeBadgeColor="#16803c" title="Solaris" meta="Stanisław Lem · 1961" context="An alien intelligence that mirrors your deepest fears back at you" price="$12.99" icon="📖" library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
                <DiscoveryCard type="NOVEL" typeBadgeColor="#16803c" title="Blindsight" meta="Peter Watts · 2006" context="Consciousness as evolutionary accident — what if awareness is the bug?" price="$15.99" icon="📖" library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
                <DiscoveryCard type="NOVEL" typeBadgeColor="#16803c" title="I Am Legend" meta="Matheson · 1954" context="The last human in a world that's moved on without him" price="$11.99" icon="📖" library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
                <DiscoveryCard type="DYSTOPIA" typeBadgeColor="#16803c" title="We" meta="Zamyatin · 1924" context="The glass city where privacy is abolished — Orwell's source" price="$14.99" icon="📖" library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
                <DiscoveryCard type="NOVEL" typeBadgeColor="#16803c" title="The Quiet Earth" meta="Craig Harrison · 1981" context="Waking up alone after everyone else has vanished" price="$9.99" icon="📖" library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
              </DiscoveryGroup>

            </div>

            {/* Follow-up input */}
            <div style={{ marginTop: 16, maxWidth: 640, paddingBottom: 40 }}>
              <input
                type="text"
                placeholder="Ask a follow-up about Pluribus..."
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 12,
                  border: `1px solid ${T.border}`,
                  background: T.bgCard,
                  color: T.text,
                  fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif",
                  outline: "none",
                  boxSizing: "border-box",
                  boxShadow: T.shadow,
                }}
              />
            </div>
          </div>

          {/* ===== Entity Quick View Panel ===== */}
          {quickViewEntity && (
            <EntityQuickView
              entity={quickViewEntity}
              onClose={() => setQuickViewEntity(null)}
              onNavigate={onNavigate}
              onViewDetail={viewDetail}
              library={library}
              toggleLibrary={toggleLibrary}
            />
          )}

          {/* ===== Compare Panel ===== */}
          {showCompare && (
            <div
              style={{
                width: 360,
                borderLeft: `1px solid ${T.border}`,
                background: T.bgCard,
                overflowY: "auto",
                flexShrink: 0,
                padding: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: T.text }}>
                  Compare Response
                </span>
                <button
                  onClick={() => setShowCompare(false)}
                  style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 18 }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.textDim }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Raw Claude 3.5 Sonnet
                  </span>
                </div>
                <div
                  style={{
                    background: T.bgElevated,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: 16,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13.5,
                    lineHeight: 1.65,
                    color: T.textMuted,
                  }}
                >
                  Vince Gilligan created Pluribus. It is a science fiction television series that premiered on Apple TV+ in 2024. The show follows a small town that discovers an alien presence has been slowly infiltrating their community. Gilligan has cited various influences including classic sci-fi films and his own earlier work on The X-Files. The show has received generally positive reviews.
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: T.textDim, marginTop: 8, display: "flex", gap: 16, fontWeight: 500 }}>
                  <span>0 entities</span><span>0 cross-media links</span><span>No actions</span>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.gold }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, fontWeight: 600, color: T.gold, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    UnitedTribes Enhanced
                  </span>
                </div>
                <div
                  style={{
                    background: T.goldBg,
                    border: `1px solid ${T.goldBorder}`,
                    borderRadius: 10,
                    padding: 16,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13.5,
                    lineHeight: 1.65,
                    color: T.text,
                  }}
                >
                  Rich response with <span style={{ color: T.blue, fontWeight: 700 }}>16 verified entities</span>, cross-media connections spanning film, literature, and music, plus actionable discovery links from authorized partnerships.
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: T.green, marginTop: 8, display: "flex", gap: 16, fontWeight: 600 }}>
                  <span>16 entities</span><span>4 media types</span><span>6 actions</span>
                </div>
              </div>

              <div
                style={{
                  marginTop: 28,
                  padding: 16,
                  background: T.bgElevated,
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                }}
              >
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                  Enhancement Summary
                </div>
                {[
                  { label: "Verified Entities", raw: "0", enhanced: "16" },
                  { label: "Media Types", raw: "1", enhanced: "4" },
                  { label: "Actionable Links", raw: "0", enhanced: "6" },
                  { label: "Source Authority", raw: "Unverified", enhanced: "Authorized" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: `1px solid ${T.border}40`,
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: T.textMuted }}>{stat.label}</span>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <span style={{ color: T.textDim }}>{stat.raw}</span>
                      <span style={{ color: T.textDim }}>→</span>
                      <span style={{ color: T.green, fontWeight: 700 }}>{stat.enhanced}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Now Playing Bar */}
      {nowPlaying !== null && (
        <NowPlayingBar
          song={songs[nowPlaying].title}
          artist={songs[nowPlaying].artist}
          context={songs[nowPlaying].context}
          timestamp={songs[nowPlaying].timestamp}
          onClose={() => setNowPlaying(null)}
          onNext={handleNextSong}
          onPrev={handlePrevSong}
          onWatchVideo={() => setVideoModal({ title: songs[nowPlaying].title, subtitle: songs[nowPlaying].artist })}
        />
      )}

      {/* Video Modal */}
      {videoModal && (
        <VideoModal
          title={videoModal.title}
          subtitle={videoModal.subtitle}
          onClose={() => setVideoModal(null)}
        />
      )}

      {/* Reading Modal */}
      {readingModal && (
        <ReadingModal
          {...readingModal}
          onClose={() => setReadingModal(null)}
        />
      )}
    </div>
  );
}

//  SCREEN 5: CONSTELLATION
// ==========================================================
function ConstellationScreen({ onNavigate, onSelectEntity }) {
  const [loaded, setLoaded] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredPath, setHoveredPath] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  // --- Pathways data model ---
  // Map leaf IDs to ENTITIES keys
  const leafEntityMap = {
    bb: "Breaking Bad",
    bcs: null,
    xfiles: null,
    bodysnatch: "Invasion of the Body Snatchers",
    thing: null,
    borg: null,
    carol: "Carol Sturka",
    zosia: "Zosia",
    manousos: "Manousos Oviedo",
  };

  const handleLeafClick = (leafId) => {
    const entityName = leafEntityMap[leafId];
    if (entityName && onSelectEntity) {
      onSelectEntity(entityName);
      onNavigate(SCREENS.ENTITY_DETAIL);
    }
  };

  const hub = { id: "hub", label: "PLURIBUS", sublabel: "UNIVERSE", x: 480, y: 270, r: 48 };

  const pathways = [
    {
      id: "auteur",
      label: "The Auteur Path",
      sublabel: "Gilligan Universe",
      color: "#2a9d5c",
      leafBg: "#e8f5ee",
      leafBorder: "#2a9d5c",
      x: 270, y: 270, r: 28,
      angle: Math.PI,
      description: "Every show, film, and episode Gilligan created — the skills and storytelling instincts that made Pluribus possible.",
      leaves: [
        { id: "bb", label: "Breaking Bad", x: 95, y: 150, r: 18, context: "16 Emmys · The moral spiral" },
        { id: "bcs", label: "Better Call Saul", x: 80, y: 270, r: 18, context: "Patience as a storytelling weapon" },
        { id: "xfiles", label: "X-Files", x: 95, y: 390, r: 18, context: "\"Pusher\" planted the seed" },
      ],
    },
    {
      id: "scifi",
      label: "The Sci-Fi Path",
      sublabel: "The Hive Mind",
      color: "#2563eb",
      leafBg: "#eff6ff",
      leafBorder: "#2563eb",
      x: 670, y: 130, r: 28,
      angle: -0.55,
      description: "The films, novels, and concepts that feed directly into Pluribus's core premise — collective consciousness and identity erasure.",
      leaves: [
        { id: "bodysnatch", label: "Invasion of the\nBody Snatchers", x: 835, y: 55, r: 18, context: "\"THE wellspring\" — Gilligan" },
        { id: "thing", label: "The Thing", x: 848, y: 148, r: 18, context: "Isolation + paranoia template" },
        { id: "borg", label: "The Borg", x: 835, y: 235, r: 18, context: "Collective as seductive threat" },
      ],
    },
    {
      id: "actor",
      label: "The Character Path",
      sublabel: "Carol Sturka",
      color: "#c0392b",
      leafBg: "#fef2f2",
      leafBorder: "#c0392b",
      x: 665, y: 400, r: 28,
      angle: 0.55,
      description: "Carol Sturka — the misanthropic novelist immune to the Joining. Her character arc, key relationships, and the fictional DNA that shaped her.",
      leaves: [
        { id: "carol", label: "Carol Sturka", x: 830, y: 325, r: 18, context: "Reluctant hero of the Joining" },
        { id: "zosia", label: "Zosia", x: 845, y: 410, r: 18, context: "The Others' liaison to Carol" },
        { id: "manousos", label: "Manousos", x: 830, y: 490, r: 18, context: "The man who refused everything" },
      ],
    },
  ];

  // --- Curved path helper ---
  function curvePath(x1, y1, x2, y2, curvature = 0.3) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const cx = x1 + dx * 0.5 - dy * curvature;
    const cy = y1 + dy * 0.5 + dx * curvature;
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  }

  // --- Sparkle positions ---
  const sparkles = [
    { x: 90, y: 80, s: 8 }, { x: 320, y: 50, s: 6 }, { x: 680, y: 40, s: 7 },
    { x: 830, y: 280, s: 6 }, { x: 750, y: 500, s: 8 }, { x: 150, y: 460, s: 7 },
    { x: 450, y: 520, s: 5 }, { x: 50, y: 180, s: 5 },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg }}>
      <SideNav active="universe" onNavigate={onNavigate} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 56,
            borderBottom: `1px solid ${T.border}`,
            background: T.bgCard,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
          }}
        >
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: T.text,
              }}
            >
              Pathways View
            </div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10.5,
                color: T.textDim,
                background: T.bgElevated,
                border: `1px solid ${T.border}`,
                padding: "3px 10px",
                borderRadius: 6,
              }}
            >
              3 pathways · 9 entities
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <ModelSelector />
            <button
              onClick={() => setAssistantOpen(!assistantOpen)}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12.5,
                color: assistantOpen ? T.blue : T.textMuted,
                background: assistantOpen ? T.blueLight : T.bgCard,
                border: `1px solid ${assistantOpen ? T.blueBorder : T.border}`,
                padding: "6px 14px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              ◎ Guide
            </button>
          </div>
        </header>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* ===== Main pathways canvas ===== */}
          <div
            style={{
              flex: 1,
              position: "relative",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.8s",
              background: "#ffffff",
              overflow: "hidden",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              paddingTop: 20,
            }}
          >
            {/* Background network texture */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08 }}>
              {Array.from({ length: 24 }, (_, i) => {
                const x1 = Math.random() * 900;
                const y1 = Math.random() * 560;
                const x2 = x1 + (Math.random() - 0.5) * 200;
                const y2 = y1 + (Math.random() - 0.5) * 200;
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={T.blue} strokeWidth={0.8} />;
              })}
              {Array.from({ length: 16 }, (_, i) => {
                const cx = Math.random() * 900;
                const cy = Math.random() * 560;
                return <circle key={`d${i}`} cx={cx} cy={cy} r={2} fill={T.blue} opacity={0.3} />;
              })}
            </svg>

            {/* Centered graph container */}
            <div style={{ position: "relative", width: 960, height: 560, flexShrink: 0 }}>

            {/* Sparkle stars */}
            {sparkles.map((sp, i) => (
              <div
                key={`sp${i}`}
                style={{
                  position: "absolute",
                  left: sp.x,
                  top: sp.y,
                  width: sp.s,
                  height: sp.s,
                  opacity: 0.2,
                  fontSize: sp.s + 4,
                  lineHeight: 1,
                  pointerEvents: "none",
                }}
              >
                ✦
              </div>
            ))}

            {/* SVG curves */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              <defs>
                {pathways.map((p) => (
                  <linearGradient key={`g-${p.id}`} id={`grad-${p.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={T.textDim} stopOpacity={0.15} />
                    <stop offset="50%" stopColor={p.color} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={p.color} stopOpacity={0.3} />
                  </linearGradient>
                ))}
              </defs>

              {/* Hub → Pathway curves */}
              {pathways.map((p) => {
                const hl = hoveredPath === p.id || selectedPath === p.id;
                return (
                  <path
                    key={`hp-${p.id}`}
                    d={curvePath(hub.x, hub.y, p.x, p.y, 0.15)}
                    stroke={p.color}
                    strokeWidth={hl ? 3 : 2}
                    fill="none"
                    opacity={hl ? 0.8 : 0.3}
                    style={{ transition: "all 0.3s" }}
                  />
                );
              })}

              {/* Pathway → Leaf curves */}
              {pathways.map((p) =>
                p.leaves.map((leaf) => {
                  const hl = hoveredPath === p.id || selectedPath === p.id || hoveredNode === leaf.id;
                  return (
                    <path
                      key={`pl-${leaf.id}`}
                      d={curvePath(p.x, p.y, leaf.x, leaf.y, 0.12)}
                      stroke={p.color}
                      strokeWidth={hl ? 2.5 : 1.5}
                      fill="none"
                      opacity={hl ? 0.7 : 0.25}
                      style={{ transition: "all 0.3s" }}
                    />
                  );
                })
              )}
            </svg>

            {/* Central hub */}
            <div
              style={{
                position: "absolute",
                left: hub.x - hub.r,
                top: hub.y - hub.r,
                width: hub.r * 2,
                height: hub.r * 2,
                borderRadius: "50%",
                background: "linear-gradient(145deg, #ffffff, #f0f0f0)",
                border: "3px solid rgba(0,0,0,0.06)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,0.8)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 5,
                cursor: "default",
              }}
            >
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, fontWeight: 700, color: T.text, letterSpacing: "0.08em", lineHeight: 1.1 }}>
                {hub.label}
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 8, fontWeight: 600, color: T.textDim, letterSpacing: "0.06em" }}>
                {hub.sublabel}
              </div>
            </div>

            {/* Pathway nodes */}
            {pathways.map((p) => {
              const hl = hoveredPath === p.id || selectedPath === p.id;
              return (
                <div
                  key={p.id}
                  onMouseEnter={() => setHoveredPath(p.id)}
                  onMouseLeave={() => setHoveredPath(null)}
                  onClick={() => setSelectedPath(selectedPath === p.id ? null : p.id)}
                  style={{
                    position: "absolute",
                    left: p.x - (hl ? 90 : 80),
                    top: p.y - (hl ? 22 : 18),
                    width: hl ? 180 : 160,
                    padding: "8px 14px",
                    borderRadius: 20,
                    background: hl ? p.color : p.leafBg,
                    border: `2px solid ${p.color}`,
                    boxShadow: hl
                      ? `0 8px 28px ${p.color}35, 0 2px 6px ${p.color}20`
                      : `0 4px 16px ${p.color}18, 0 1px 4px rgba(0,0,0,0.06)`,
                    cursor: "pointer",
                    zIndex: 6,
                    textAlign: "center",
                    transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                    transform: hl ? "scale(1.05) translateY(-2px)" : "scale(1)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: hl ? "#fff" : T.text,
                      lineHeight: 1.2,
                    }}
                  >
                    {p.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 9.5,
                      color: hl ? "rgba(255,255,255,0.8)" : T.textDim,
                      marginTop: 1,
                    }}
                  >
                    ({p.sublabel})
                  </div>
                </div>
              );
            })}

            {/* Leaf nodes */}
            {pathways.map((p) =>
              p.leaves.map((leaf) => {
                const hl = hoveredNode === leaf.id || hoveredPath === p.id || selectedPath === p.id;
                return (
                  <div
                    key={leaf.id}
                    onMouseEnter={() => setHoveredNode(leaf.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => handleLeafClick(leaf.id)}
                    style={{
                      position: "absolute",
                      left: leaf.x - 62,
                      top: leaf.y - 18,
                      minWidth: 124,
                      maxWidth: 160,
                      padding: "8px 14px",
                      borderRadius: 14,
                      background: hl ? p.leafBg : `${p.leafBg}cc`,
                      border: `1.5px solid ${hl ? p.leafBorder : `${p.leafBorder}40`}`,
                      boxShadow: hl
                        ? `0 6px 22px ${p.color}28, 0 2px 6px ${p.color}15`
                        : `0 3px 12px ${p.color}12, 0 1px 3px rgba(0,0,0,0.05)`,
                      cursor: leafEntityMap[leaf.id] ? "pointer" : "default",
                      zIndex: hl ? 8 : 3,
                      textAlign: "center",
                      transition: "all 0.3s",
                      transform: hl ? "scale(1.05) translateY(-3px)" : "scale(1)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.text,
                        lineHeight: 1.3,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {leaf.label}
                    </div>
                    {hl && leaf.context && (
                      <div
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 10,
                          fontStyle: "italic",
                          color: T.textMuted,
                          marginTop: 3,
                        }}
                      >
                        {leaf.context}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Legend */}
            <div
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                display: "flex",
                gap: 16,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                fontWeight: 500,
                background: "rgba(255,255,255,0.9)",
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                backdropFilter: "blur(8px)",
              }}
            >
              {pathways.map((p) => (
                <div
                  key={p.id}
                  style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}
                  onMouseEnter={() => setHoveredPath(p.id)}
                  onMouseLeave={() => setHoveredPath(null)}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                  <span style={{ color: T.textMuted }}>{p.label}</span>
                </div>
              ))}
            </div>

            {/* Title */}
            <div
              style={{
                position: "absolute",
                top: 20,
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
              }}
            >
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: T.text }}>
                Pathways View
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                How everything connects to the Pluribus universe
              </div>
            </div>
            </div>
          </div>

          {/* ===== Sidebar: pathway detail or guide ===== */}
          {assistantOpen && (
            <div
              style={{
                width: 320,
                borderLeft: `1px solid ${T.border}`,
                background: T.bgCard,
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                overflowY: "auto",
              }}
            >
              {selectedPath ? (() => {
                const p = pathways.find((pw) => pw.id === selectedPath);
                return (
                  <>
                    <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, fontWeight: 600, color: T.text }}>
                          {p.label}
                        </div>
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                        {p.sublabel}
                      </div>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
                        {p.description}
                      </p>
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                        Entities in this pathway
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {p.leaves.map((leaf) => (
                          <div
                            key={leaf.id}
                            onClick={() => handleLeafClick(leaf.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "10px 14px",
                              background: T.bgElevated,
                              border: `1px solid ${T.border}`,
                              borderLeft: `3px solid ${p.color}`,
                              borderRadius: 8,
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 600, color: T.text }}>
                                {leaf.label.replace("\n", " ")}
                              </div>
                              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, fontStyle: "italic", color: T.textMuted, marginTop: 2 }}>
                                {leaf.context}
                              </div>
                            </div>
                            <span style={{ color: T.textDim, fontSize: 14 }}>→</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding: "0 20px 20px" }}>
                      <button
                        onClick={() => setSelectedPath(null)}
                        style={{
                          width: "100%",
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 12.5,
                          color: T.textMuted,
                          background: T.bgElevated,
                          border: `1px solid ${T.border}`,
                          padding: "8px",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        ← Back to Guide
                      </button>
                    </div>
                  </>
                );
              })() : (
                <>
                  <div style={{ padding: "18px 20px", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, fontWeight: 600, color: T.text }}>
                      Pluribus Guide
                    </div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.textMuted, margin: "8px 0 0", lineHeight: 1.5 }}>
                      Click a pathway to explore its connections, or ask a question below.
                    </p>
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                      Pathways
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {pathways.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPath(p.id)}
                          onMouseEnter={() => setHoveredPath(p.id)}
                          onMouseLeave={() => setHoveredPath(null)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "10px 14px",
                            background: T.bgElevated,
                            border: `1px solid ${T.border}`,
                            borderLeft: `3px solid ${p.color}`,
                            borderRadius: 8,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 600, color: T.text }}>
                              {p.label}
                            </div>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim }}>
                              {p.sublabel} · {p.leaves.length} entities
                            </div>
                          </div>
                          <span style={{ color: T.textDim, fontSize: 14 }}>→</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: "8px 20px" }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                      Try asking
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {["How does the Auteur Path connect to Pluribus?", "What sci-fi influenced the Hive Mind?", "Who is Carol Sturka?", "Which themes run across all pathways?"].map((q) => (
                        <button
                          key={q}
                          onClick={() => onNavigate(SCREENS.RESPONSE)}
                          style={{
                            background: T.bgElevated,
                            border: `1px solid ${T.border}`,
                            borderRadius: 8,
                            padding: "10px 14px",
                            color: T.text,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12.5,
                            textAlign: "left",
                            cursor: "pointer",
                            lineHeight: 1.4,
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ padding: 16, borderTop: `1px solid ${T.border}` }}>
                    <input
                      type="text"
                      placeholder="Ask anything about Pluribus..."
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: 10,
                        border: `1px solid ${T.border}`,
                        background: T.bgElevated,
                        color: T.text,
                        fontSize: 13,
                        fontFamily: "'DM Sans', sans-serif",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================================
//  SCREEN 6: ENTITY DETAIL — Full Knowledge Graph Record
// ==========================================================

function CollaboratorRow({ name, role, projects, projectCount }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: T.blueLight,
            border: `1px solid ${T.blueBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: T.blue,
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            flexShrink: 0,
          }}
        >
          {name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: T.text }}>
            {name}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.textMuted, marginTop: 1 }}>
            {role}
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: T.textDim }}>
          {projects}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: T.blue, fontWeight: 600, marginTop: 2 }}>
          {projectCount} projects
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ title, description, works }) {
  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 18,
        cursor: "pointer",
        boxShadow: T.shadow,
        flex: 1,
        minWidth: 200,
      }}
    >
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 15,
          fontWeight: 700,
          color: T.text,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: T.textMuted,
          lineHeight: 1.6,
          marginBottom: 10,
        }}
      >
        {description}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {works.map((w) => (
          <span
            key={w}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 10.5,
              fontWeight: 600,
              color: T.blue,
              background: T.blueLight,
              border: `1px solid ${T.blueBorder}`,
              padding: "3px 9px",
              borderRadius: 6,
            }}
          >
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}


// ==========================================================
//  SCREEN 5: ENTITY DETAIL — Full Knowledge Graph Record
// ==========================================================
function EntityDetailScreen({ onNavigate, entityName, onSelectEntity, library, toggleLibrary }) {
  const [loaded, setLoaded] = useState(false);
  const [videoModal, setVideoModal] = useState(null);
  const [readingModal, setReadingModal] = useState(null);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  const name = entityName || "Vince Gilligan";
  const data = ENTITIES[name];
  if (!data) return null;

  const handleCardClick = (card) => {
    const videoTypes = ["ANALYSIS", "VIDEO", "SCORE", "AMBIENT", "INFLUENCE", "PLAYLIST", "OST", "NEEDLE DROP"];
    const readTypes = ["NOVEL", "BOOK", "DYSTOPIA", "PROFILE", "ACADEMIC", "ESSAY", "ARTICLE", "COMMENTARY"];
    const t = (card.type || "").toUpperCase();
    if (videoTypes.includes(t) || (card.platform && card.platform.includes("Watch"))) {
      setVideoModal({ title: card.title, subtitle: card.meta });
    } else if (readTypes.includes(t) || card.icon === "📖" || card.icon === "📄") {
      setReadingModal(card);
    } else {
      setVideoModal({ title: card.title, subtitle: card.meta });
    }
  };

  const detailGroupLabels = {
    person: {
      works: { title: "The Complete Works", desc: `Every project ${name.split(" ").pop()} created, wrote, or directed — organized by role.` },
      inspirations: { title: `${name.split(" ").pop()}'s Inspirations`, desc: `The films, books, and ideas ${name.split(" ").pop()} has cited as direct influences.` },
      collaborators: { title: "The Collaborator Network", desc: `The recurring creative partners across ${name.split(" ").pop()}'s career.` },
      themes: { title: "Thematic Through-Lines", desc: `The ideas ${name.split(" ").pop()} keeps returning to across decades of work.` },
      interviews: { title: "Interviews, Talks & Appearances", desc: `Conversations with and about ${name.split(" ").pop()}.` },
      articles: { title: "Articles & Analysis", desc: `Profiles, video essays, and critical analysis.` },
      sonic: { title: "The Sonic DNA", desc: `The music of ${name.split(" ").pop()}'s universes.` },
    },
    show: {
      works: { title: "Seasons & Extended Universe", desc: `Every season, spinoff, and continuation of ${name}.` },
      inspirations: { title: "Influences & Predecessors", desc: `The films, shows, and books that paved the way for ${name}.` },
      collaborators: { title: "Cast & Key Crew", desc: `The actors, writers, and producers who brought ${name} to life.` },
      themes: { title: "Thematic Through-Lines", desc: `The ideas ${name} explores across its run.` },
      interviews: { title: "Podcasts & Companion Content", desc: `Official podcasts, panels, and behind-the-scenes conversations.` },
      articles: { title: "Articles & Analysis", desc: `Reviews, essays, and critical analysis of ${name}.` },
      sonic: { title: "The Soundtrack", desc: `Original score, needle drops, and the complete musical identity of ${name}.` },
    },
    film: {
      works: { title: "Versions & Adaptations", desc: `Every version, remake, and adaptation of ${name}.` },
      inspirations: { title: "Influences & Predecessors", desc: `The films, books, and cultural forces that shaped ${name}.` },
      collaborators: { title: "Cast & Crew", desc: `The filmmakers and actors who brought ${name} to life.` },
      themes: { title: "Thematic Through-Lines", desc: `The ideas ${name} explores and the works it influenced.` },
      interviews: { title: "Commentary & Conversations", desc: `Director commentaries, podcasts, and behind-the-scenes material.` },
      articles: { title: "Articles & Analysis", desc: `Essays, video essays, and critical analysis of ${name}.` },
      sonic: { title: "The Score", desc: `The musical identity of ${name} and its remakes.` },
    },
    character: {
      works: { title: "Character Arc", desc: `The key episodes and moments that define ${name}'s journey.` },
      inspirations: { title: "Character DNA", desc: `The fictional predecessors and influences that shaped ${name}.` },
      collaborators: { title: "Relationships", desc: `The people in ${name}'s world — and what happened to them.` },
      themes: { title: "Thematic Through-Lines", desc: `The ideas ${name}'s story explores across the series.` },
      interviews: { title: "Behind the Character", desc: `How the creators and actors built ${name}.` },
      articles: { title: "Articles & Analysis", desc: `Essays, video essays, and critical analysis of ${name}.` },
      sonic: { title: "The Sonic Identity", desc: `The music that defines ${name}'s presence on screen.` },
    },
  };

  const labels = detailGroupLabels[data.type] || detailGroupLabels.person;

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg }}>
      <SideNav active="characters" onNavigate={onNavigate}  libraryCount={library ? library.size : 0} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 56,
            borderBottom: `1px solid ${T.border}`,
            background: T.bgCard,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Logo />
            <span style={{ color: T.textDim, fontSize: 13 }}>/</span>
            <span
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.blue, cursor: "pointer", fontWeight: 500 }}
              onClick={() => onNavigate(SCREENS.CONSTELLATION)}
            >
              Pluribus Universe
            </span>
            <span style={{ color: T.textDim, fontSize: 13 }}>/</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.text, fontWeight: 600 }}>
              {name}
            </span>
          </div>
          <ModelSelector />
        </header>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "36px 48px",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.5s",
          }}
        >
          {/* ===== Hero Header ===== */}
          <div style={{ display: "flex", gap: 32, marginBottom: 36 }}>
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: 16,
                background: data.avatarGradient,
                border: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 56,
                flexShrink: 0,
                boxShadow: T.shadow,
              }}
            >
              {data.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 36, fontWeight: 700, color: T.text, margin: 0 }}>
                  {name}
                </h1>
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.green,
                    background: T.greenBg,
                    padding: "4px 10px",
                    borderRadius: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    border: `1px solid ${T.greenBorder}`,
                  }}
                >
                  {data.badge}
                </span>
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: T.textMuted, margin: "0 0 14px" }}>
                {data.subtitle}
              </p>
              <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                {data.stats.map((stat) => (
                  <div key={stat.label} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: T.blue, lineHeight: 1 }}>
                      {stat.value}
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 3 }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {data.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      color: T.textMuted,
                      background: T.bgElevated,
                      padding: "5px 12px",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      fontWeight: 500,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ===== Biography ===== */}
          <section style={{ marginBottom: 40, maxWidth: 760 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, lineHeight: 1.8, color: T.textMuted }}>
              {data.bio.map((para, i) => (
                <p key={i} style={{ margin: i < data.bio.length - 1 ? "0 0 14px" : "0" }}>
                  {para}
                </p>
              ))}
            </div>
          </section>

          {/* ===== Complete Works / Seasons ===== */}
          <DiscoveryGroup accentColor={T.blue} title={labels.works.title} description={labels.works.desc}>
            {data.completeWorks.map((w) => (
              <DiscoveryCard key={w.title} {...w} library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
            ))}
          </DiscoveryGroup>

          {/* ===== Inspirations ===== */}
          <DiscoveryGroup accentColor="#c0392b" title={labels.inspirations.title} description={labels.inspirations.desc}>
            {data.inspirations.map((w) => (
              <DiscoveryCard key={w.title} {...w} library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
            ))}
          </DiscoveryGroup>

          {/* ===== Collaborators ===== */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
              <div style={{ width: 4, minHeight: 44, borderRadius: 2, background: "#7c3aed", flexShrink: 0, marginTop: 2 }} />
              <div>
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
                  {labels.collaborators.title}
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.textMuted, margin: "4px 0 0" }}>
                  {labels.collaborators.desc}
                </p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, paddingLeft: 18 }}>
              {data.collaborators.map((c) => (
                <CollaboratorRow key={c.name} {...c} />
              ))}
            </div>
          </div>

          {/* ===== Themes ===== */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
              <div style={{ width: 4, minHeight: 44, borderRadius: 2, background: T.gold, flexShrink: 0, marginTop: 2 }} />
              <div>
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
                  {labels.themes.title}
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.textMuted, margin: "4px 0 0" }}>
                  {labels.themes.desc}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, paddingLeft: 18, overflowX: "auto", paddingBottom: 8 }}>
              {data.themes.map((t) => (
                <ThemeCard key={t.title} {...t} />
              ))}
            </div>
          </div>

          {/* ===== Interviews ===== */}
          <DiscoveryGroup accentColor="#2563eb" title={labels.interviews.title} description={labels.interviews.desc}>
            {data.interviews.map((w) => (
              <DiscoveryCard key={w.title} {...w} library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
            ))}
          </DiscoveryGroup>

          {/* ===== Articles ===== */}
          <DiscoveryGroup accentColor="#16803c" title={labels.articles.title} description={labels.articles.desc}>
            {data.articles.map((w) => (
              <DiscoveryCard key={w.title} {...w} library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
            ))}
          </DiscoveryGroup>

          {/* ===== Sonic ===== */}
          <DiscoveryGroup accentColor="#7c3aed" title={labels.sonic.title} description={labels.sonic.desc}>
            {data.sonic.map((w) => (
              <DiscoveryCard key={w.title} {...w} library={library} toggleLibrary={toggleLibrary} onCardClick={handleCardClick} />
            ))}
          </DiscoveryGroup>

          {/* ===== Mini Constellation ===== */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
              <div style={{ width: 4, minHeight: 44, borderRadius: 2, background: T.text, flexShrink: 0, marginTop: 2 }} />
              <div>
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
                  In the Knowledge Graph
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.textMuted, margin: "4px 0 0" }}>
                  {name}'s position in the UnitedTribes knowledge graph — {" "}
                  <span
                    style={{ color: T.blue, cursor: "pointer", fontWeight: 600 }}
                    onClick={() => onNavigate(SCREENS.CONSTELLATION)}
                  >
                    Open full constellation →
                  </span>
                </p>
              </div>
            </div>
            <div
              style={{
                marginLeft: 18,
                height: 280,
                background: T.bgCard,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                position: "relative",
                overflow: "hidden",
                boxShadow: T.shadow,
              }}
            >
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                {data.graphEdges.map(([x1, y1, x2, y2], i) => {
                  const sx = (x1 - 120) / 600 * 55 + 10;
                  const sy = (y1 + 40) / 280 * 100;
                  const ex = (x2 - 120) / 600 * 55 + 10;
                  const ey = (y2 + 40) / 280 * 100;
                  return (
                    <line key={i} x1={`${sx}%`} y1={`${sy}%`} x2={`${ex}%`} y2={`${ey}%`} stroke={T.border} strokeWidth={1.2} opacity={0.45} />
                  );
                })}
              </svg>
              {data.graphNodes.map((node) => {
                const cx = (node.x - 120) / 600 * 55 + 10;
                const cy = (node.y + 40) / 280 * 100;
                const displayR = node.bold ? 30 : 22;
                return (
                  <div
                    key={node.label}
                    style={{
                      position: "absolute",
                      left: `${cx}%`,
                      top: `${cy}%`,
                      transform: "translate(-50%, -50%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: displayR * 2,
                        height: displayR * 2,
                        borderRadius: "50%",
                        background: node.color + "30",
                        border: `2px solid ${node.color}55`,
                        boxShadow: `0 0 12px ${node.color}18`,
                      }}
                    />
                    <div
                      style={{
                        marginTop: 6,
                        whiteSpace: "nowrap",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: node.bold ? 12 : 10.5,
                        color: node.bold ? T.text : T.textMuted,
                        fontWeight: node.bold ? 700 : 500,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {node.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== Source Footer ===== */}
          <div
            style={{
              padding: "16px 22px",
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: T.textDim,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 50,
              boxShadow: T.shadow,
              fontWeight: 500,
            }}
          >
            <span style={{ color: T.green }}>●</span>
            Data sourced from authorized content partnerships with Universal Music Group & Harper Collins · UnitedTribes Knowledge Graph v2.1
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {videoModal && (
        <VideoModal
          title={videoModal.title}
          subtitle={videoModal.subtitle}
          onClose={() => setVideoModal(null)}
        />
      )}

      {/* Reading Modal */}
      {readingModal && (
        <ReadingModal
          {...readingModal}
          onClose={() => setReadingModal(null)}
        />
      )}
    </div>
  );
}

// ==========================================================
//  MAIN APP
// ==========================================================
// ==========================================================
//  SCREEN 6: LIBRARY
// ==========================================================
function LibraryScreen({ onNavigate, library, toggleLibrary }) {
  // Build a lookup of all known items across entities and response cards
  const allItems = useMemo(() => {
    const items = [];
    Object.entries(ENTITIES).forEach(([entityName, data]) => {
      const sections = ["completeWorks", "inspirations", "interviews", "articles", "sonic"];
      sections.forEach((section) => {
        if (data[section]) {
          data[section].forEach((item) => {
            items.push({ ...item, source: entityName, section });
          });
        }
      });
    });
    return items;
  }, []);

  // Filter to only saved items
  const savedItems = allItems.filter((item) => library.has(item.title));

  // Group by media type
  const groups = useMemo(() => {
    const typeMap = {
      "TV & Film": [],
      "Music": [],
      "Books": [],
      "Articles & Analysis": [],
      "Interviews & Talks": [],
    };
    savedItems.forEach((item) => {
      const icon = item.icon;
      if (icon === "🎵") typeMap["Music"].push(item);
      else if (icon === "📖") typeMap["Books"].push(item);
      else if (icon === "📄") typeMap["Articles & Analysis"].push(item);
      else if (icon === "🎙" || icon === "🎤") typeMap["Interviews & Talks"].push(item);
      else typeMap["TV & Film"].push(item);
    });
    return Object.entries(typeMap).filter(([, items]) => items.length > 0);
  }, [savedItems]);

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg }}>
      <SideNav active="library" onNavigate={onNavigate} libraryCount={library.size} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 56,
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            background: T.bgCard,
            flexShrink: 0,
          }}
        >
          <Logo />
          <ModelSelector />
        </header>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "40px 48px 80px",
          }}
        >
          {/* Page header */}
          <div style={{ maxWidth: 800, marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>📚</span>
              <h1
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 28,
                  fontWeight: 700,
                  color: T.text,
                  margin: 0,
                }}
              >
                My Library
              </h1>
              {library.size > 0 && (
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.blue,
                    background: T.blueLight,
                    padding: "3px 10px",
                    borderRadius: 6,
                  }}
                >
                  {library.size} {library.size === 1 ? "item" : "items"}
                </span>
              )}
            </div>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 15,
                color: T.textMuted,
                lineHeight: 1.6,
              }}
            >
              Content you've saved while exploring. Everything here links back to its source in the knowledge graph.
            </p>
          </div>

          {/* Empty state */}
          {library.size === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 40px",
                maxWidth: 480,
                margin: "0 auto",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 20, opacity: 0.4 }}>📚</div>
              <h3
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 20,
                  fontWeight: 600,
                  color: T.text,
                  marginBottom: 10,
                }}
              >
                Your library is empty
              </h3>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  color: T.textMuted,
                  lineHeight: 1.6,
                  marginBottom: 24,
                }}
              >
                Tap the + button on any film, book, album, or article to save it here. Your library builds as you explore — a personal map of everything that caught your attention.
              </p>
              <button
                onClick={() => onNavigate(SCREENS.RESPONSE)}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  background: T.blue,
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                Start Exploring
              </button>
            </div>
          )}

          {/* Grouped saved items */}
          {groups.map(([groupLabel, items]) => (
            <div key={groupLabel} style={{ marginBottom: 36, maxWidth: 800 }}>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.textDim,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>{groupLabel}</span>
                <span style={{ fontWeight: 500, color: T.blue }}>{items.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((item) => (
                  <div
                    key={item.title}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: T.bgCard,
                      border: `1px solid ${T.border}`,
                      borderLeft: `3px solid ${T.blue}`,
                      borderRadius: 10,
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 20, marginRight: 14, flexShrink: 0 }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 14,
                          fontWeight: 600,
                          color: T.text,
                          marginBottom: 2,
                        }}
                      >
                        {item.title}
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.textDim }}>
                        {item.meta}
                      </div>
                      {item.context && (
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11.5,
                            fontStyle: "italic",
                            color: T.textMuted,
                            marginTop: 3,
                          }}
                        >
                          {item.context}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                      {item.platform && (
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#fff",
                            background: item.platformColor || T.blue,
                            padding: "3px 9px",
                            borderRadius: 4,
                          }}
                        >
                          {item.platform}
                        </span>
                      )}
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 10,
                          fontWeight: 600,
                          color: T.textDim,
                          background: T.bgElevated,
                          padding: "3px 8px",
                          borderRadius: 4,
                          border: `1px solid ${T.border}`,
                        }}
                      >
                        via {item.source}
                      </span>
                      <div
                        onClick={() => toggleLibrary(item.title)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: "transparent",
                          border: `1px solid ${T.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          fontSize: 13,
                          color: T.textDim,
                        }}
                        title="Remove from library"
                      >
                        ✕
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [selectedEntity, setSelectedEntity] = useState("Vince Gilligan");
  const [spoilerFree, setSpoilerFree] = useState(true);
  const [library, setLibrary] = useState(new Set());

  const toggleLibrary = (title) => {
    setLibrary((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const handleSelectEntity = (name) => {
    setSelectedEntity(name);
  };

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #ffffff; overflow: hidden; }
        input::placeholder { color: ${T.textDim}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          gap: 3,
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: 4,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        {[
          { id: SCREENS.HOME, label: "1. Home" },
          { id: SCREENS.THINKING, label: "2. Thinking" },
          { id: SCREENS.RESPONSE, label: "3. Response" },
          { id: SCREENS.CONSTELLATION, label: "4. Constellation" },
          { id: SCREENS.ENTITY_DETAIL, label: "5. Detail" },
          { id: SCREENS.LIBRARY, label: "6. Library" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setScreen(s.id)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: screen === s.id ? T.queryBg : "transparent",
              color: screen === s.id ? "#fff" : T.textMuted,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        ))}

        {/* Entity toggle for Detail screen */}
        {screen === SCREENS.ENTITY_DETAIL && (
          <div style={{ display: "flex", gap: 2, marginLeft: 8, borderLeft: `1px solid ${T.border}`, paddingLeft: 8 }}>
            {Object.keys(ENTITIES).map((eName) => (
              <button
                key={eName}
                onClick={() => setSelectedEntity(eName)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: selectedEntity === eName ? T.blue : "transparent",
                  color: selectedEntity === eName ? "#fff" : T.textMuted,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {eName}
              </button>
            ))}
          </div>
        )}
      </div>

      {screen === SCREENS.HOME && <HomeScreen onNavigate={setScreen} spoilerFree={spoilerFree} setSpoilerFree={setSpoilerFree} />}
      {screen === SCREENS.THINKING && <ThinkingScreen onNavigate={setScreen} />}
      {screen === SCREENS.RESPONSE && <ResponseScreen onNavigate={setScreen} onSelectEntity={handleSelectEntity} spoilerFree={spoilerFree} library={library} toggleLibrary={toggleLibrary} />}
      {screen === SCREENS.CONSTELLATION && <ConstellationScreen onNavigate={setScreen} onSelectEntity={handleSelectEntity} />}
      {screen === SCREENS.ENTITY_DETAIL && <EntityDetailScreen onNavigate={setScreen} entityName={selectedEntity} onSelectEntity={handleSelectEntity} library={library} toggleLibrary={toggleLibrary} />}
      {screen === SCREENS.LIBRARY && <LibraryScreen onNavigate={setScreen} library={library} toggleLibrary={toggleLibrary} />}
    </div>
  );
}
