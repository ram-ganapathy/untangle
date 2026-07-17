# skills/design-tokens.md — Untangle visual system

The two files in `/reference` are the source of truth. This file names the system so
every new screen matches them.

## Mood
2am, but safe. Deep night, candle-warm reality, cool translucent imagination.
Sparse is correct — resist adding decoration.

## Palette
| Token | Hex | Use |
|---|---|---|
| night-deep | #0C0F18 | page background (bottom of radial) |
| night | #10141F | page background base |
| night-raised | #171D2C | cards, input surfaces |
| night-edge | #262E42 | default borders |
| night-edge-hover | #3D4763 | hover borders |
| ink | #E8E6DF | primary text |
| ink-dim | #8B93A7 | secondary text |
| ink-faint | #5B6478 | hints, placeholders |
| ember | #E8926B | Projection accent (fear heat), primary CTA on Cascade |
| reality-amber | #D9B98A | "happened" / record / stones |
| mist-blue | #7C89A8 | "added" / authored fragments |
| basin-glow | #8FB6D9 | Basin accent, primary CTA on Replay |
| keep-green | #7FA8A0 | anchor / "worth keeping" cards |

Background is always the radial: `radial-gradient(1200px 700px at 50% -10%, #1B2233, #10141F 55%, #0C0F18)`.

## Typography
- Display: **Fraunces** (500–600) — headlines, verdicts, keep-cards only
- Body/UI: **Inter** (400–600)
- Data: **JetBrains Mono** — probabilities, tallies, tags, counters
Never introduce another face.

## Shape & motion
- Radii: cards 14–16px, pills/buttons 999px
- Motion vocabulary (reuse, don't invent): drop-in (translateY -14 → 0, staggered),
  rise (exam cards, +10 → 0), mist (blur + scale + float up, ~850ms),
  breathe (thinking state), pulse (mic listening)
- Always honour `prefers-reduced-motion`.

## Component vocabulary (use these names in code)
- **wisp** — orbiting fragment orb in the Basin
- **stone** — settled "happened" fragment (amber, solid, left-accent border)
- **mist** — released "added" fragment (dissolves; only a counter remains)
- **cascade card** — Projection domino with probability + temperature colour
- **anchor / keep card** — green closing card ("what's actually yours to do")
- **diagnosis chip** — pill above every map naming the object type
- **record** — the list of stones under the basin

## Copy rules
- Second person, present tense, calm. Never clinical, never cheerleading.
- Buttons say what happens: "Set it in the record", "Let it go to mist", "Lay it out".
- No exclamation marks anywhere in the product.
