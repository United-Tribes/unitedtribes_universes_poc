# Conversational Memory — API Integration Notes

> **For:** Backend API developer (entity resolution / broker API)
> **From:** Frontend (Universes POC)
> **Date:** February 23, 2026

---

## Summary

The Universes POC frontend now wraps all user queries in conversation context before sending them to the broker API. This means the `query` field in `POST /v2/broker` (and all model-specific endpoints) **no longer contains raw user questions** — it contains structured prompts with universe framing, previous Q&A, and the actual current question.

Your query preprocessor and entity extraction need to account for this, or they'll try to extract entities from the entire context block instead of just the user's current question.

---

## What the API Now Receives

### First Question (no prior context)

```
You are answering questions about the Pluribus universe (Vince Gilligan's Apple TV+
sci-fi series exploring collective consciousness, identity, and human connection).
Focus your answer on the show Pluribus, its creators, cast, themes, cultural
connections, and influences.

User question: What's the deal with Zosia in Pluribus?
```

**Key marker:** `User question:` precedes the actual question.

### Follow-Up (one prior question in context)

```
You are answering questions about the Pluribus universe (Vince Gilligan's Apple TV+
sci-fi series exploring collective consciousness, identity, and human connection).
Focus your answer on the show Pluribus, its creators, cast, themes, cultural
connections, and influences.

The user previously asked: "What's the deal with Zosia in Pluribus?"

Now they are asking a follow-up question. Answer in the context of their previous
question.

Follow-up question: Who's the lead actress? She's amazing
```

**Key marker:** `Follow-up question:` precedes the actual question.

### Deep Follow-Up Chain (multiple prior turns)

```
You are answering questions about the Pluribus universe (Vince Gilligan's Apple TV+
sci-fi series exploring collective consciousness, identity, and human connection).
Focus your answer on the show Pluribus, its creators, cast, themes, cultural
connections, and influences.

Original question: "What's the deal with Zosia in Pluribus?"

Original answer: "Zosia emerges as one of the most enigmatic and thematically
pivotal characters in Pluribus (2024–), Vince Gilligan's Apple TV+ sci-fi series
exploring collective consciousness, identity, and human connection..."

Follow-up Q: "What about the ACEBABY theory?"
Follow-up A: "The ACEBABY theory suggests that Zosia might be carrying Carol's
baby, subverting the series' themes of disembodiment..."

Follow-up Q: "Is that confirmed?"
Follow-up A: "Gilligan has remained coy about the theory..."

New follow-up question: "Who plays her?"

Answer the follow-up question using the conversation context above. Be specific
and avoid repeating information already provided.
```

**Key marker:** `New follow-up question:` precedes the actual question. Prior turns use `Follow-up Q:` / `Follow-up A:` labels.

---

## What This Means for Entity Resolution

### 1. Extract Entities from the Current Question Only

The query preprocessor should identify and isolate the user's current question before running entity extraction. Look for these markers (in priority order):

1. `New follow-up question: "..."` — deep follow-up chain
2. `Follow-up question: ...` — single follow-up
3. `User question: ...` — first question

If none of these markers are present, treat the entire query as the user's question (backward compatibility with raw queries).

### 2. Entity Names from Prior Turns Will Pollute Extraction

Previous Q&A contains entity names ("Zosia", "Pluribus", "Carol") that are relevant to the conversation but may not be what the user is currently asking about. Example:

- Context mentions "Zosia", "Pluribus", "ACEBABY", "Carol"
- User's actual question: "Who plays her?"
- Correct entity to extract: None from the question itself — but the LLM should resolve "her" → "Zosia" → "Karolina Wydra" using the conversation context

**Recommended approach:**
- Run entity extraction on the **current question only** for direct graph lookups
- Pass the **full context** to the LLM intent classification so it can resolve pronouns and references ("her", "the lead actress", "that show")

### 3. The "Lead Actress" Case — Why This Matters

In our LLM comparison test (8 questions x 5 models), the query "Who's the lead actress? She's amazing" **failed for ALL 5 models** because there's no entity name in the question. With conversation memory:

1. Frontend sends the full context (previous Pluribus question + "Who's the lead actress?")
2. LLM intent classification sees the Pluribus context and resolves "lead actress" → "Rhea Seehorn"
3. Entity matcher validates "Rhea Seehorn" against the knowledge graph
4. Graph returns 1,173 relationships → rich narrative generated

This is the handoff between frontend memory and backend resolution. The LLM needs the full context to resolve the reference, but entity validation should focus on what it resolved to.

### 4. Universe Framing Is Always Present

Every query — even first questions — starts with `"You are answering questions about the [universe] universe..."`. This is NOT a user interrogative prefix. The query preprocessor should not strip it. It provides domain context for the LLM.

### 5. Token Budget

With conversation context, the `query` field can be 1,000–2,000+ tokens (vs. a single sentence for raw queries). Ensure:
- LLM intent classification calls can handle longer inputs
- No truncation happens before entity extraction
- The sliding window keeps it bounded: only the last 3 follow-ups are included, with answers truncated (800 chars for original answer, 400 chars for follow-up answers)

---

## Recommended Preprocessing Logic

```python
def extract_current_question(query: str) -> tuple[str, str]:
    """
    Returns (current_question, full_context).
    - current_question: just what the user is asking now (for entity extraction)
    - full_context: everything (for LLM intent classification)
    """
    # Check for deep follow-up marker
    if 'New follow-up question:' in query:
        parts = query.split('New follow-up question:')
        return parts[-1].strip().strip('"'), query

    # Check for single follow-up marker
    if 'Follow-up question:' in query:
        parts = query.split('Follow-up question:')
        return parts[-1].strip(), query

    # Check for first question marker
    if 'User question:' in query:
        parts = query.split('User question:')
        return parts[-1].strip(), query

    # No markers — raw query (backward compatible)
    return query, query
```

This is pseudocode to illustrate the approach — adapt to fit your preprocessor architecture.

---

## Testing Checklist

These scenarios should work after integration:

| Scenario | Query Received | Expected Entity Extraction |
|----------|---------------|---------------------------|
| First question | `"...User question: What's the deal with Zosia?"` | "Zosia" |
| Follow-up with pronoun | `"...previously asked about Zosia...Follow-up question: Who plays her?"` | LLM resolves "her" → "Karolina Wydra" |
| Follow-up with no entity | `"...previously asked about Pluribus...Follow-up question: Who's the lead actress?"` | LLM resolves "lead actress" → "Rhea Seehorn" |
| Deep chain | `"...Original Q about Zosia...Follow-ups about ACEBABY...New follow-up question: Is it confirmed?"` | LLM uses context, no entity needed |
| Raw query (no wrapper) | `"Tell me about Art Blakey"` | "Art Blakey" (backward compatible) |

---

## Questions / Open Items

1. **Should the API parse conversation markers or should the frontend send structured data?** Currently the frontend sends one big string in the `query` field. An alternative would be sending structured JSON like `{"current_question": "...", "conversation_history": [...]}`. The structured approach is cleaner but requires an API contract change.

2. **Should entity extraction run on resolved references?** When the LLM resolves "lead actress" → "Rhea Seehorn", should that resolved name go through the entity matcher for validation, or should the LLM's resolution be trusted directly?

3. **Cache key considerations** — follow-up queries with different conversation contexts should NOT hit the same cache entry as the raw question. The cache key should include some hash of the conversation context.
