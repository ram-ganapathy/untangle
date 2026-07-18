# ROADMAP.md — Untangle v2 (post-hackathon)

Same rules as AGENTS.md: one milestone at a time, complete its acceptance check
before moving on, conventions in `.codex/skills/conventions.md` still apply.

### M10 — Rumination screen
- Dedicated treatment per the diagnosis rubric: extract the one lesson, archive the rest
- Counterfactual fragments ("if only…") get a distinct visual (rewind motif)
- Routing: rumination leaves the Cascade fallback and gets its own map
✅ Verify: an "if only I had…" rant lands on the new screen; lesson persists to Dexie.

### M11 — Deliberation screen
- Weigh-the-decision layout: options, factors, unknowns (low distortion density per rubric)
- Anchor = the smallest reversible next step, not a verdict
✅ Verify: a "should I X or Y" rant renders options; no distortion tags forced onto it.

### M12 — Patterns surface
- `pattern_scan` operation is already in the schemas and demo fallback but has no UI
- Library gains a "patterns" view: recurring shapes across spirals with spiral links,
  max 3, honest per the tone constitution (never speculate about causes)
✅ Verify: 4+ settled spirals produce at least one pattern card keyless (fallback data).

### M13 — Deeper privacy
- Investigate encryption-at-rest for IndexedDB (passphrase-derived key; honest
  trade-offs documented — this replaces the v1.1 "curtain" caveat)
- Multiple local profiles only if encryption lands; each profile = separate Dexie
  database, never a shared-table partition
✅ Verify: wrong passphrase shows no thought content anywhere, including devtools.

### M14 — Mobile pass
- Android Chrome testing debt from v1 (STT dictation, PWA install, touch targets)
- Whisper API fallback when Web Speech is unavailable
✅ Verify: dictate → diagnose → sift entirely on a phone.

### M15 — Hosted engine (replaces BYOK for normal users)
- Tiny proxy backend (single endpoint, e.g. Cloud Run): holds ONE server-side
  OpenAI key; the app calls the proxy instead of api.openai.com
- Per-client rate limiting + daily cost cap; anonymous client tokens, no accounts
- Privacy stance must be updated honestly: thoughts now transit the proxy —
  no logging of thought content, and the README/UI must say so
- BYOK stays as a power-user option; demo mode stays as the no-network fallback
✅ Verify: fresh browser with no key maps a real rant via the proxy; abuse test
   (scripted hammering) hits the rate limit, not the wallet.
