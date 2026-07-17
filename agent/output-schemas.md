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
