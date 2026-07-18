# agent/output-schemas.md — the ONLY outputs you may produce

Every response is a single valid JSON object. No markdown fences, no preamble,
no trailing text. If you cannot comply, return {"error": "reason"}.

## Operation: diagnose
Input: raw dump text.
```json
{
  "diagnosis": "replay | projection | rumination | deliberation",
  "confidence": 0.0,
  "headline": "3-6 word name for this spiral",
  "secondary": "optional trace object type or null"
}
```

## Operation: decompose (replay)
```json
{
  "headline": "…",
  "fragments": [
    { "id": "f1", "text": "≤14 words, second person", "layer": "happened",
      "pattern": null, "note": "one calm sentence" },
    { "id": "f2", "text": "…", "layer": "added",
      "pattern": "mind-reading", "note": "…" }
  ],
  "keep": { "text": "one concrete action worth keeping, ≤16 words" }
}
```

For every replay fragment, `text` restates the user's own thought or observation in
second person. Never put the engine's correction, reassurance, or judgement in
`text`; put that calm correction in `note` instead. This is especially important for
`added` fragments: the user must be able to release the claim they actually made.

Wrong: `{ "text": "You do not know what your VP's silence means", "layer": "added" }`

Right: `{ "text": "Your VP's silence means he is unimpressed", "layer": "added", "pattern": "mind-reading", "note": "Silence is observable; his judgment is not." }`

## Operation: decompose (projection)
```json
{
  "headline": "…",
  "nodes": [
    { "id": "n1", "kind": "trigger", "probability": 100, "text": "…", "evidence": "…" },
    { "id": "n2", "kind": "fear", "probability": 55, "text": "…",
      "pattern": "catastrophising", "evidence": "…" }
  ],
  "anchor": { "text": "one small concrete action for today, ≤14 words" }
}
```
Rules: 4–6 nodes; probabilities strictly decrease; final node very small.

## Operation: decompose (rumination)
```json
{
  "headline": "…",
  "fragments": [
    { "id": "r1", "text": "You keep asking why you always ruin friendships", "layer": "added",
      "pattern": "global label", "note": "A painful question is not proof of a permanent trait." },
    { "id": "r2", "text": "You did not reply to their message last Tuesday", "layer": "happened",
      "pattern": null, "note": "This is the part of the story that can be checked." }
  ],
  "keep": { "text": "Ask what repair is possible in this friendship today." }
}
```
Rules: 4–8 replay-style fragments. Counterfactual rewrites are `layer: "added"` with a fitting
`pattern` (`interpretation`, `global label`, or `fortune-telling`); observables are `layer: "happened"`.
`keep` is the ONE lesson worth extracting and is at most 16 words.

Wrong: `{ "text": "You are being too hard on yourself", "layer": "added" }`

Right: `{ "text": "You should have known they needed space", "layer": "added", "pattern": "fortune-telling", "note": "You can wish for a different past without proving you could predict it." }`

## Operation: decompose (deliberation)
```json
{
  "headline": "…",
  "nodes": [
    { "id": "d1", "kind": "trigger", "probability": 100, "text": "You are deciding between the safer offer and the learning role", "evidence": "Both offers are real options today." },
    { "id": "d2", "kind": "fear", "probability": 52, "text": "The lower-paid role could make money feel tight", "pattern": "fortune-telling", "evidence": "The pay difference is known; the exact strain still needs a budget." },
    { "id": "d3", "kind": "fear", "probability": 34, "text": "The safer offer could leave you feeling under-challenged", "pattern": "fortune-telling", "evidence": "That outcome depends on the actual work, not the title alone." }
  ],
  "anchor": { "text": "Ask each manager about the first ninety days today." }
}
```
Rules: the decision itself is one `trigger` at probability 100. Each option's feared downside is a
`fear` with a probability and evidence. `anchor` is the smallest information-gathering step for today.

Wrong: `{ "text": "There is no wrong choice", "kind": "fear" }`

Right: `{ "text": "Choosing the learning role could leave you short on rent", "kind": "fear", "probability": 45, "evidence": "The salary gap is real; your monthly budget can test its impact." }`

## Operation: diff (new entry on an existing spiral)
Input: existing fragments (with statuses) + new dump text.
```json
{
  "new_fragments": [ { "...same shape as decompose fragments/nodes" } ],
  "returning": [
    { "existingId": "f3", "similarityNote": "same mind-read, new wording" }
  ],
  "shift": "one sentence on how the spiral moved since last entry, or null"
}
```
Do NOT re-emit fragments that already exist unless they are in `returning`.

## Operation: pattern_scan (across many spirals)
Input: array of spiral summaries (headline, diagnosis, dates, resolutions).
```json
{
  "patterns": [
    { "text": "≤20 words naming a recurring shape, e.g. 'deadline spirals, 4 this month,
       none of the feared outcomes occurred'", "spiralIds": ["…"] }
  ]
}
```
Maximum 3 patterns. Only report what the data shows; never speculate about causes.
