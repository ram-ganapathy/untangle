# Untangle

Untangle is a local-first PWA for stepping back from a thought spiral. Write or dictate the thought, and Untangle turns it into a small visual map. Replay, projection, rumination, and deliberation each have their own calm, tactile way to be held.

Built for a hackathon submission: focused, private, and usable without an account.

## What it does

- Captures a thought by text or Web Speech API dictation.
- Diagnoses Replay, Projection, Rumination, or Deliberation with the OpenAI Responses API.
- Maps each thought shape to its own interaction: Basin sifts replay, Cascade traces projection, Groove loosens rumination, and Scales weighs deliberation without deciding for the user.
- Saves spirals and their lifecycle entirely in IndexedDB, so reopening a map resumes exactly where it was left.
- Supports follow-up dumps: new fragments arrive and familiar thoughts return to play with a marker.
- Keeps original entries as a deliberately collapsed, read-only "What you poured in" section on every map.
- Presents the Home library as animated memory vials, including a warm, still "Held with care" vial for care-routed thoughts.
- Offers a contemplative all-thought night sky, built from every saved fragment.
- Includes a keyless demo mode and a safety rail for crisis language.

## Architecture

```mermaid
flowchart TD
  User[Person] --> UI[React PWA]
  UI --> Screens[Home | NewSpiral | Basin | Cascade | Groove | Scales | Sky]
  UI --> Speech[Web Speech API]
  Screens <--> DB[(Dexie / IndexedDB\nspirals | entries | fragments)]
  UI <--> Privacy[localStorage\npasscode hash | optional API key]
  Screens --> Agent[callAgent]
  Agent -->|no key| Demo[Built-in demo data]
  Agent -->|key present| OpenAI[OpenAI Responses API]
  Agent --> Safety[Safety rail]
  Safety --> Care[Care screen]
  UI --> SW[Service worker / cached app shell]
```

## How this was built

Untangle was built end-to-end in one shared Codex session, with human direction and acceptance decisions guiding milestones M0 through M16.

### Codex

The entire implementation was authored by Codex (`gpt-5.6-terra`). It scaffolded milestones from `AGENTS.md`, ported the reference prototypes onto the real data layer, and fixed issues found during manual testing, including Cascade ordering, interrupted-save recovery, lifted-wisp interaction, mobile speech continuity, and vial-label collisions. It generated the Home backdrop with `gpt-image-2` after a tool failure by falling back to the CLI, and ran a `/review` security audit with zero findings before push.

### GPT-5.6

In-app intelligence uses `gpt-5.6-luna` through the OpenAI Responses API directly from the browser.

See the [full build timeline and session stats](docs/build-session.html).

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. To use the live analysis engine, open the engine control on Home and paste an OpenAI API key. It stays in that browser and is sent only to OpenAI. Without a key, the built-in demo data still supports the full experience.

Useful commands:

```bash
npm test
npm run build
```

## Try these

- **Replay:** "I keep replaying yesterday's meeting because I stumbled over my words and now I'm sure everyone thinks I'm incompetent." -> **Basin**
- **Projection:** "What if I miss this deadline, get fired, and then lose my apartment?" -> **Cascade**
- **Rumination:** "Why do I always ruin good friendships, and what does it say about me that I keep doing this?" -> **Groove**
- **Deliberation:** "Should I accept the safer offer or take the role that pays less but could teach me more?" -> **Scales**

## PWA and privacy

Untangle registers an installable PWA service worker and caches its app shell. Thought data stays on-device in IndexedDB; the only network request is an optional OpenAI analysis call. Existing spirals remain available offline after the app has loaded once.

You can optionally add a local passcode as a privacy curtain for a shared laptop. It is not encryption: the passcode hash lives in localStorage and thought data lives in this browser's IndexedDB. Clearing Untangle site data removes both.

For a device check, install the production build in a Chromium browser, create a spiral, then enable airplane mode and reopen the library.

## Technology

React, Vite, vite-plugin-pwa, Dexie/IndexedDB, Web Speech API, the OpenAI Responses API with `gpt-5.6-luna` in-app, and Codex with `gpt-5.6-terra` for the build.
