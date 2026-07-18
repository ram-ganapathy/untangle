# Untangle

Untangle is a local-first PWA for stepping back from a thought spiral. Write or dictate the thought, and Untangle turns it into a small visual map: a replay can be sifted into what happened and what was added; a projection can be traced through its feared chain.

The app is designed for a hackathon submission: focused, private, and usable without an account.

## What it does

- Captures a thought by text or Web Speech API dictation.
- Diagnoses Replay, Projection, Rumination, or Deliberation and creates a map with the OpenAI Responses API.
- Lets people lift, settle, or release replay fragments in the Basin; projection fears can be expanded and released in the Cascade.
- Saves spirals and their lifecycle entirely in IndexedDB, so returning to a spiral resumes its saved state.
- Supports follow-up dumps: new fragments arrive and familiar ones return to play with a marker.
- Includes a keyless demo mode and a safety rail for crisis language.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. To use the live analysis engine, set `VITE_OPENAI_API_KEY` in a local `.env` file or set `localStorage['untangle.apiKey']` in the browser. Without a key, the app uses its built-in demo data so the full interaction can still be explored.

Useful commands:

```bash
npm test
npm run build
```

## PWA and privacy

Untangle registers an installable PWA service worker and caches its app shell. Thought data stays on-device in IndexedDB; the only network request is an optional OpenAI analysis call. Existing spirals remain available offline after the app has loaded once.

For the final device check, install the production build in a Chromium browser, create a spiral, then enable airplane mode and reopen the library.

## Technology

React, Vite, vite-plugin-pwa, Dexie/IndexedDB, Web Speech API, and the OpenAI Responses API.
