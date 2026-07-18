# AGENTS.md — Untangle build instructions

## What this is
Untangle is a thought-visualisation PWA for overthinkers. A user voice/text-dumps a
spiral; the in-app agent diagnoses it (Replay | Projection | Rumination | Deliberation)
and decomposes it into fragments the user manipulates visually (lift, settle, release).
The agent NEVER chats. Its output is JSON mutations to the map. See `.codex/skills/conventions.md`.

## Stack (do not deviate without asking)
- Vite + React, single-page PWA
- Dexie.js over IndexedDB for all storage (no backend, no accounts)
- OpenAI API for the agent calls; Whisper or Web Speech API for STT
- Plain CSS (co-located) following `.codex/skills/design-tokens.md`
- Reference implementations in `/reference` — match them, don't redesign

## Working agreements (credit efficiency — respect these)
1. Work ONE task at a time. Complete its acceptance check before moving on.
2. Do not refactor previous milestones unless a task requires it.
3. Do not re-read the whole repo each session; read AGENTS.md + the current milestone's files.
4. Prefer editing the reference prototypes over writing screens from scratch.
5. No new dependencies without listing why in one line first.
6. If a task is ambiguous, make the smallest reasonable assumption and note it in a comment.

## Milestones

### M0 — Scaffold
- Vite React app, PWA plugin configured (manifest: name "Untangle", dark theme colour #10141F, icons placeholder)
- Dexie schema created per `.codex/skills/conventions.md`
- Routes/views: Home (spiral library), NewSpiral (input), SpiralView (map)
✅ Verify: `npm run dev` renders Home; Dexie tables visible in devtools.

### M1 — Data layer
- CRUD for spirals, entries, fragments per the schemas in conventions
- Fragment lifecycle transitions as pure functions with unit-testable logic
✅ Verify: create → add entry → add fragments → transition fragment → reload page → state persists.

### M2 — Input capture
- Text input (from reference prototypes' input stage)
- STT: Web Speech API with live interim transcript; graceful hide if unsupported
- "Show me an example" path using demo data (keep for the demo video)
✅ Verify: dictate a sentence on Android Chrome; text lands in the entry.

### M3 — Agent harness
- Use a browser fetch agent harness against the OpenAI Responses API (gpt-5.6-luna, high reasoning effort)
- Read the API key from VITE_OPENAI_API_KEY or localStorage key untangle.apiKey; no key uses demo fallback
- One `callAgent(operation, payload)` module; system context = the three files in `agent/`
- Operations: diagnose, decompose, diff, pattern_scan (schemas in `agent/output-schemas.md`)
- JSON parse with fence-stripping; on failure retry once, then fall back to demo data + console.error
✅ Verify: paste a rant in a test page → valid diagnosis + fragments JSON logged.

### M4 — Basin screen (Replay)
- Port `/reference/untangle-basin.jsx` onto real data layer
- Lift → examine → settle-to-record / release-to-mist, persisting lifecycle to Dexie
✅ Verify: full sift of demo memory; reload mid-sift resumes correctly.

### M5 — Cascade screen (Projection)
- Port `/reference/untangle-cascade.jsx` onto real data layer
- Diagnosis routes automatically: Replay → Basin, Projection → Cascade
  (Rumination/Deliberation → Cascade for now, labelled; full screens are post-hackathon)
✅ Verify: fired-spiral rant routes to Cascade; Tuesday-meeting rant routes to Basin.

### M6 — Return visit (THE moat feature — do not cut)
- Reopening a spiral shows its map in saved state
- New dump on an existing spiral → `diff` operation → new fragments animate in;
  returning fragments get a "returned ×N" marker
- Home = spiral library: title, diagnosis chip, state (open/settled), last touched
✅ Verify: settle a spiral, add a new dump next day (fake the clock), see diff behaviour.

### M7 — Polish + safety
- Safety rail wired per `agent/tone-constitution.md` (blocking, tested)
- PWA install flow verified on windows laptop; offline browse of past spirals works
- Empty states and error states per conventions
✅ Verify: install to home screen on camera; airplane mode → library still opens.

## Out of scope (do not build)
Accounts, sync, notifications, sentiment-from-audio, Rumination/Deliberation
dedicated screens, sharing, theming.
