// Mock API responses for testing ContentRenderer
// Modeled after real Pluribus broker API responses

export const mockRichResponse = {
  narrative: "Pluribus features a rich musical landscape composed by Hrishikesh Hirway, blending jazz-inflected scoring with curated needle drops that mirror the show's themes of identity and connection.",
  content: {
    headline: "The Music of Pluribus",
    summary: "Hrishikesh Hirway's score blends jazz, ambient textures, and curated needle drops to reflect the show's exploration of identity and parallel lives.",
    sections: [
      {
        type: "narrative",
        text: "Hrishikesh Hirway, best known as the creator of Song Exploder, composed the original score for Pluribus. His approach layers piano-driven melodies with ambient electronics, creating a sonic palette that shifts between warmth and unease as characters navigate fractured realities."
      },
      {
        type: "media_callout",
        media_type: "youtube",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title: "Pluribus - Main Title Theme",
        context: "The opening theme establishes the show's tone with overlapping piano lines that slowly diverge, mirroring the branching timelines of the narrative."
      },
      {
        type: "narrative",
        text: "Beyond the original score, Pluribus makes striking use of licensed music. A standout moment in Episode 3 pairs a pivotal scene with Coltrane's 'A Love Supreme,' drawing a direct line between the show's spiritual themes and jazz's tradition of transcendence."
      },
      {
        type: "media_callout",
        media_type: "spotify",
        url: "https://open.spotify.com/track/0CLbmkYmQIWiEwnsbOkLpd",
        title: "A Love Supreme, Pt. 1 - Acknowledgement",
        context: "Featured in Episode 3 during the reality-shift sequence. Coltrane's ascending saxophone motif underscores the protagonist's moment of clarity."
      },
      {
        type: "narrative",
        text: "The musical choices in Pluribus consistently reinforce the thematic connections between its characters and the broader cultural web the show inhabits."
      },
      {
        type: "connection_highlight",
        entity: "The Twilight Zone",
        relationship: "Shared DNA: both series use music as a portal between realities, with Rod Serling's show pioneering the technique Pluribus updates for modern audiences.",
        follow_up_query: "How does Pluribus compare to The Twilight Zone?",
        image_url: null
      },
      {
        type: "connection_highlight",
        entity: "Invasion of the Body Snatchers",
        relationship: "Thematic sibling: questions of identity, doubles, and the uncanny. Pluribus's score echoes the paranoid tension of the 1978 film's soundscape.",
        follow_up_query: "What are the connections between Pluribus and Invasion of the Body Snatchers?"
      }
    ],
    next_questions: [
      { text: "What role does jazz play across all episodes?", reason: "Dive deeper into the jazz needle drops" },
      { text: "Tell me about Hrishikesh Hirway's other work", reason: "Explore the composer's background" }
    ]
  }
};

export const mockModerateResponse = {
  narrative: "Rhea Seehorn's performance in Pluribus draws on her celebrated work as Kim Wexler in Better Call Saul, bringing a similar blend of composure and concealed vulnerability to a very different genre.",
  content: {
    headline: "Rhea Seehorn in Pluribus",
    summary: "Seehorn brings her trademark precision and emotional restraint to Pluribus, crafting a performance that rewards close attention.",
    sections: [
      {
        type: "narrative",
        text: "In Pluribus, Rhea Seehorn plays a character navigating multiple versions of her own life. Her performance is defined by micro-expressions and carefully modulated vocal shifts that signal which 'version' of the character we're watching, often before the script makes it explicit."
      },
      {
        type: "narrative",
        text: "This technique echoes her work as Kim Wexler, where subtle physical choices - the angle of her posture, the timing of a glance - carried enormous narrative weight. In Pluribus, these skills are deployed in a sci-fi context that amplifies their impact."
      },
      {
        type: "connection_highlight",
        entity: "Better Call Saul",
        relationship: "Seehorn's six seasons as Kim Wexler established her as a master of restrained, detail-rich performance. Pluribus gives her a canvas to apply those skills in an entirely new genre.",
        follow_up_query: "How does Kim Wexler compare to Seehorn's Pluribus character?"
      }
    ],
    next_questions: [
      { text: "Who else is in the cast of Pluribus?", reason: "Explore the full ensemble" },
      { text: "What other shows has the Pluribus cast appeared in?", reason: "Map the cast's career connections" }
    ]
  }
};

export const mockSparseResponse = {
  narrative: "I don't have specific information about that topic in the Pluribus universe. You might try rephrasing your question.",
  content: {
    headline: "No Specific Results",
    summary: "I couldn't find detailed information matching your query in the Pluribus knowledge base.",
    sections: [
      {
        type: "narrative",
        text: "The Pluribus universe data doesn't contain a direct match for your query. This could mean the topic isn't covered in the current dataset, or the question might benefit from different phrasing."
      }
    ],
    next_questions: [
      { text: "What music is featured in Pluribus?", reason: "Try a broader music-focused question" },
      { text: "Who are the main cast members of Pluribus?", reason: "Start with the core ensemble" }
    ]
  }
};

export const mockNoContentResponse = {
  narrative: "Pluribus is a genre-bending television series that weaves together elements of science fiction, psychological drama, and musical storytelling. Created with an ensemble cast and a richly layered soundtrack, the show explores themes of identity, connection, and the roads not taken.",
  connections: [
    { entity: "The Twilight Zone", type: "thematic_influence" },
    { entity: "John Coltrane", type: "musical_reference" }
  ]
};
