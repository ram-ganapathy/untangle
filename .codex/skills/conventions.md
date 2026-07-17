# skills/conventions.md — Untangle engineering conventions

## Law 1: The agent never chats
No message bubbles from the agent anywhere in the product. Agent output is JSON
(per `agent/output-schemas.md`) that mutates the map, plus the short `note` strings
shown inside examination cards. If a feature seems to need the agent to "reply",
redesign the feature.

## Law 2: Fragments are objects with a lifecycle
`swirling → lifted → settled(record) | released(mist)`
Transitions are user actions, never automatic. Persist every transition immediately.

## Data model (Dexie tables)
```js
// db.js
spirals:   'id, updatedAt, state'        
// { id, title, diagnosis: 'replay'|'projection'|'rumination'|'deliberation',
//   state: 'open'|'settled', createdAt, updatedAt }

entries:   'id, spiralId, createdAt'      
// { id, spiralId, rawText, source: 'voice'|'text', createdAt }

fragments: 'id, spiralId, status'         
// { id, spiralId, entryId, text, layer: 'happened'|'added',   // replay
//   kind: 'trigger'|'fear', probability, evidence,             // projection
//   pattern, note, status: 'swirling'|'settled'|'released',
//   returnCount: 0, createdAt, resolvedAt }
```
One fragment shape, nullable per-type fields. Do not split into per-type tables.

## Agent harness
- Single module `src/agent/callAgent.js`: `callAgent(operation, payload)`
- System context for every call = concatenation of the three `agent/*.md` files
- Strip ``` fences before JSON.parse; on parse failure retry once with
  "Your last output was invalid JSON. Respond with ONLY the JSON object."
- Second failure → return demo/fallback data, console.error, never crash the UI

## Error & empty states
- STT unsupported → hide mic, no apology text
- Agent unreachable → banner: "Couldn't reach the engine — showing an example instead."
- Empty library → single line + one button: "Something looping? Pour it in."
- Never block the UI on a network call; always render optimistically where safe

## Structure
```
src/
  agent/    callAgent.js, prompts.js (loads agent/*.md)
  db/       db.js, spirals.js, fragments.js
  screens/  Home.jsx, NewSpiral.jsx, Basin.jsx, Cascade.jsx
  stt/      useSpeech.js
  demo/     demoData.js
reference/  untangle-basin.jsx, untangle-cascade.jsx
agent/      diagnosis-rubric.md, output-schemas.md, tone-constitution.md
```

## Privacy stance (also a demo line)
All thought data stays on-device in IndexedDB. The only network traffic is the
LLM call. No accounts, no analytics on thought content.
