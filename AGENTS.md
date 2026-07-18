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

### M8 — Privacy & presence (v1.1)
- "Erase this spiral" on every spiral screen (basin, cascade, waiting view):
  small text action with a one-step inline confirm (no browser confirm());
  deletes the spiral AND its entries and fragments in one Dexie transaction
- Home backdrop: dark starry-galaxy abstract (generated asset in /public,
  webp ≤250KB), shown at low opacity with a gradient fade to #10141F so text
  contrast is untouched; keep it near-black with sparse faint stars and dim nebula wisps; subtle variant ok on NewSpiral and Care, never behind
  the basin/cascade maps;
- Optional local passcode (no accounts by design): "Lock this space" on Home →
  set 4–6 digits, stored as a salted hash in localStorage, asked on every load.
  While unlocked: "change passcode" and "remove lock" (both require the current
  code). Lock screen: "forgot your passcode?" → the only reset is erasing saved
  spirals (type ERASE to confirm), then unlock to an empty library. README states
  plainly: privacy curtain for shared laptops, not encryption.
✅ Verify: erase leaves zero rows for that spiral in any table; home text stays
   legible over the backdrop; wrong passcode blocks, right one unlocks, data intact.

### M9 — Engine connection (BYOK)
- Engine status on Home, small line under the hero: "engine: demo examples" or
  "engine: live" depending on whether a key exists. Clicking it opens an inline
  connect panel: password input to paste an OpenAI API key, note "stays in this
  browser only, sent only to OpenAI"; Save validates the key with GET /v1/models
  (401 → "that key doesn't work") and stores it in localStorage untangle.apiKey
  (callAgent already reads it); "disconnect engine" removes it. Keyless use is
  never blocked — demo mode stays first-class.
- Honest demo content: when callAgent returns no-key demo data, tag the result
  (like the existing failure marker), persist demoEngine: true on that spiral, and
  show a quiet chip on its map — "demo example — connect the engine to map your own
  words" — linking back to the connect panel.
- README: replace the devtools localStorage instructions with the in-app flow.
✅ Verify: keyless spiral shows the demo chip; a bad key errors on save; a good key
   flips status to live and a new rant maps the user's own words.

### M10 — Rumination & deliberation engine support (bug fix — do first)
- Live-key gap: diagnose correctly returns rumination/deliberation, but
  output-schemas.md defines decompose only for replay/projection, so the model
  (correctly) returns {"error": …} and persistAnalysis saves the spiral with
  zero fragments and no closing card → Cascade renders empty and can never
  settle. The README "Try these" rants hit this. Fix all three sides:
- output-schemas.md: add decompose (rumination) — 4–8 replay-style fragments:
  counterfactual rewrites are layer added with a fitting pattern
  (interpretation / global label / fortune-telling), observables are happened;
  keep = the ONE lesson worth extracting, ≤16 words. Add decompose
  (deliberation) — nodes-style: the decision itself is kind trigger at 100,
  each option's feared downside is a fear with probability + evidence;
  anchor = the smallest info-gathering step today. Follow the existing
  wrong/right example convention: text restates the user's thought, never the
  engine's judgement.
- persistAnalysis: if decompose returns an {error} object, never persist an
  empty map — route through the engine-fallback path so no screen is blank.
- demoAgentFallback: extend diagnose heuristics to detect rumination
  ("why do I always", "if only", "should have") and deliberation
  ("should I … or") and add matching decompose fallbacks, so keyless demo
  reaches all four types (demo mode stays first-class).
✅ Verify: README's rumination and deliberation rants produce populated maps
   that can settle, with and without a key; replay/projection unchanged.

### M11 — Return flow unblocked (the moat must not be gated)
- Basin renders "Pour in another" only inside its isComplete branch, so an
  open replay spiral has no return door and users create duplicates from Home.
  Render the same link once at the bottom of the basin stage in open AND
  complete states (Cascade already does this). No new styles.
- saveToExistingSpiral filters diff.returning to settled/released fragments,
  silently dropping matches on still-swirling wisps. Split by status:
  settled/released keep going through returnFragment (revive + bump);
  swirling/lifted get updateFragment(id, { returnCount: current + 1 }) — plain
  field bump, no lifecycle transition, resolvedAt untouched. Ignore returning
  ids that don't match a fragment of this spiral. Do not touch
  fragmentLifecycle.js.
- Nudge on #/new (not add-mode): if open spirals exist, one .subtle line under
  the input — "Returning to a loop you've already mapped? Open it from your
  library and pour in another there." — linking to #/.
✅ Verify: an open basin shows the pour link; a follow-up dump marks matched
   swirling wisps "returned ×1" alongside new fragments and the shift line;
   settled wisps still revive to swirling exactly as before.

### M12 — The library of vials (mystical home)
- Replace the home library rows with a shelf of small glass vessels — memories
  in flasks: each spiral is a vial of luminous matter on the dark shelf.
  Pure CSS/SVG on the existing palette; no new dependencies, no new images.
- Type readable at a glance from the matter inside: replay = pale amber-white
  mist slowly swirling; projection = blue motes drifting downward;
  rumination = a thin ring endlessly looping; deliberation = two motes
  orbiting a shared centre. Open spirals animate gently; settled vials are
  still and clear with a faint calm glow. prefers-reduced-motion: static,
  state carried by glow alone.
- Each vial keeps title + last-touched as a small label beneath, links to
  #/spiral/<id>, keeps the erase icon; wraps on mobile; CSS animations only
  (no rAF here) and cheap enough for a dozen vials at once.
✅ Verify: four spirals of different types are tellable apart without reading
   labels; settled vs open obvious; reduced-motion static; mobile holds.

### M13 — Rumination screen: the Groove
- Dedicated screen replacing the labelled-Cascade stopgap for rumination
  (route from SpiralView; saved-state resume like basin/cascade). Metaphor:
  a worn circular groove around a central stone — the real event, which cannot
  be changed. Each counterfactual rewrite is a pale echo circling the groove;
  reuse the basin's rAF orbit approach, reduced-motion static placement.
- Lift an echo → examination card (existing card pattern): the rewrite, its
  pattern tag, the calm note. Two actions: "Keep as the lesson" (settled —
  crystallises into a bright keepsake beside the stone) and "Let it fade"
  (released — sinks into the dark). Card copy nudges that one lesson is
  enough; keeping a second is allowed, not encouraged.
- Consumes M10's rumination decompose; fragment lifecycle unchanged;
  spiral.closingText shows as the closing card once the groove stills.
✅ Verify: rumination rant (live and demo) lands in the Groove, full
   keep/fade pass settles the spiral, reload mid-pass resumes.

### M14 — Deliberation screen: the Scales
- Dedicated screen for deliberation (route from SpiralView). Metaphor: a
  softly tilting beam of light; the decision (trigger node) names the fulcrum;
  each option is a constellation side; factor nodes are stars examined via the
  card pattern and weighed to their side (settled); noise is released. Dim
  hollow stars at the fulcrum mark unknowns. The beam's tilt follows the
  weighed stars — gentle CSS transform, reduced-motion: static tilt.
- The app NEVER decides. End state = the visible tilt + the anchor card
  ("the smallest thing to find out first") once every star is weighed or
  released; spiral settles then. Consumes M10's deliberation decompose;
  lifecycle unchanged.
✅ Verify: deliberation rant (live and demo) lands in the Scales, weighing
   tilts the beam, completing settles the spiral, reload resumes.

### M15 — Look up (the night sky)
- A contemplative full-screen sky of EVERY fragment across ALL spirals — the
  user looks up at the whole of what they have poured out. This is an awe
  screen, not analysis: no axes, no labels, no legend, no tally, no chart.
- Entry point: one small action on Home at shelf level (not per-vial),
  labelled "Look up", route #/sky. Back = tap the brand or browser back.
- Every fragment ever recorded is a star (wisps, fears, echoes, factors —
  across every spiral, open or settled). Brightness follows lifecycle:
  swirling = alive, bright, faint flicker; settled = steady calm star;
  kept lessons (closing keeps count too if cheap, else settled happened
  fragments) = a touch warmer/brighter; released = barely-there ghost star
  or faint mist haze — once existed, no longer burning; returnCount ≥ 1 =
  a slow subtle pulse.
- Invisible clustering: fragments drift loosely toward a region by their
  spiral's diagnosis (replay / projection / rumination / deliberation) so the
  sky forms natural constellations — but NOTHING names the regions. Felt,
  not read. Positions seeded deterministically from fragment id so the sky
  is stable between visits.
- Technique: the existing star-field approach (positioned dots + CSS
  breathe/drift on the galaxy backdrop), driven by real fragment data.
  No dependencies, no canvas/WebGL, no force layouts. Must stay smooth at
  ~150 fragments; prefers-reduced-motion = fully static sky.
- Copy: one line only, fading out after a few seconds — "Every light is a
  thought you set down." Optional if cheap: tap a star → its text whispers
  in and fades, linking to its spiral. Nothing else on screen.
- A sparse sky (3 spirals) must still feel intentional — the backdrop's own
  faint stars fill the void; real fragments simply burn brighter than them.
✅ Verify: with 4+ spirals of mixed types and states, the sky shows distinct
   brightness classes and loose clustering with zero readable labels;
   reduced-motion static; sparse library still looks composed, not broken.

### M16 — What you poured in (original text access)
- Entries are already fully preserved in Dexie; there is just no UI path to
  them once a spiral is diagnosed (only SpiralView's waiting branch shows
  them). Returning days later, fragments alone can be too distilled to recall
  the rant. Surface the originals — but quietly: the map is the stepped-back
  view, and re-reading the rant must be a deliberate act, never the default.
- On every map screen (Basin, Cascade, and later Groove/Scales): a collapsed
  section at the very bottom of the stage — a small .subtle toggle reading
  "What you poured in · N entries". Expanding shows each entry as the
  existing .entry-preview blockquote with a short date line (and a mic note
  when source is voice), newest last, matching the order the spiral grew.
  Collapsed by default on every visit; no persistence of the open state.
- No editing, no deleting individual entries (erase-spiral already covers
  destruction); read-only sediment.
✅ Verify: a diagnosed spiral with 2+ entries shows the toggle on its map
   screen; expanded entries match what was typed/dictated, dated, in order;
   collapsed again on next visit.

## Out of scope (do not build)
Accounts, sync, notifications, sentiment-from-audio, sharing, theming.
(Rumination/Deliberation dedicated screens moved into scope as M13–M14.)
