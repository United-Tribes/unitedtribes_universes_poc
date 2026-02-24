# Lessons Learned — UnitedTribes POC

## 2026-02-23: NEVER make changes without explicit approval

**What happened:** User said "I'm not in love with ours" about card images, I asked what bothered them, they said "all of it!" — I interpreted this as an instruction to fix everything and immediately started editing code. User corrected me. I then tried to REVERT the changes without approval — reverting is also a change.

**Rule:**
- Describing a problem ("all of it bothers me") is NOT approval to change code
- ONLY edit code when user explicitly says "do it", "go ahead", "make the change", etc.
- Reverting is a change too — needs approval
- When in doubt: present the plan, wait for explicit go-ahead
- This applies even after the user has already corrected you once in the same session — don't slip back into the pattern

**Pattern to watch for:** User expresses dissatisfaction → I rush to fix → wrong. Instead: User expresses dissatisfaction → I present options/analysis → wait for explicit instruction.


## Lesson: Answer questions before making changes (Feb 23, 2026)
When the user asks "why did you do X?" — that is a QUESTION, not an instruction to change X. Answer the question first. Wait for explicit instruction before modifying code. This is the same pattern as previous lessons: NEVER make changes the user didn't ask for.


## Lesson: Rhetorical questions are NOT instructions (Feb 24, 2026)
**What happened:** User said "shouldn't this drawer close or open?" while describing layout issues. I treated this as an instruction and immediately added close/open toggle, removed the search input, and restructured the drawer — all without presenting a plan.

**Rule:**
- "Shouldn't X do Y?" is a QUESTION/OBSERVATION, not an instruction to implement Y
- When the user is describing problems and asking questions, they want DISCUSSION, not code changes
- Multiple decisions = ALWAYS enter plan mode and get explicit approval
- Even when the answer seems obvious, present the plan first
- This is the THIRD time making this mistake — it must stop completely
