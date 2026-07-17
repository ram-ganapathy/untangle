import React, { useState, useRef, useEffect } from "react";

// ————————————————————————————————————————————
// UNTANGLE — Projection Cascade prototype
// Voice/text rant → Claude decomposes into a catastrophe
// chain → dominoes with descending probability → user
// releases nodes → one actionable anchor remains.
// ————————————————————————————————————————————

const DEMO = {
  headline: "The missed deadline spiral",
  nodes: [
    { id: "n1", kind: "trigger", probability: 100, text: "You're behind on Friday's deliverable", evidence: "This part is real — it already happened. It's the only node with weight." },
    { id: "n2", kind: "fear", probability: 55, text: "Your manager will be visibly unhappy", evidence: "Possible, but managers see slipped deadlines weekly. Most respond to a heads-up, not the slip itself." },
    { id: "n3", kind: "fear", probability: 12, text: "It goes into your performance review", evidence: "One late deliverable rarely reaches a review unless it's a pattern. You'd usually get feedback first." },
    { id: "n4", kind: "fear", probability: 2, text: "You get fired for it", evidence: "Firing over a single deadline, with no warning, is vanishingly rare — and there'd be many steps before it." },
    { id: "n5", kind: "fear", probability: 0.3, text: "You can't pay the mortgage and lose the house", evidence: "This requires every previous step to happen, plus months of no income and no fallback. The chain has already collapsed by here." },
  ],
  anchor: { text: "Message your manager today with a revised date." },
};

// temperature: hot ember at top → cool night-blue at bottom
function tempColor(i, n) {
  const t = n <= 1 ? 0 : i / (n - 1);
  const hue = 18 + t * 192;        // 18 (ember) → 210 (cool)
  const sat = 62 - t * 24;
  const light = 63 - t * 6;
  return `hsl(${hue} ${sat}% ${light}%)`;
}

async function analyzeSpiral(input) {
  const prompt = `You are the analysis engine of "Untangle", an app that helps overthinkers see a catastrophising spiral from the outside.

The user said: "${input}"

Decompose it into a Projection cascade: an ordered chain from the real trigger to the imagined worst case.

Respond with ONLY valid JSON, no markdown fences:
{
  "headline": "3-6 word name for this spiral",
  "nodes": [
    { "id": "n1", "kind": "trigger", "probability": 100, "text": "short second-person restatement, max 12 words", "evidence": "one calm sentence" },
    { "id": "n2", "kind": "fear", "probability": 40, "text": "...", "evidence": "one calm honest sentence explaining the estimate" }
  ],
  "anchor": { "text": "one small concrete action the user can take today, max 14 words" }
}

Rules: 4 to 6 nodes total. First node is kind "trigger" with probability 100 (it is real or already happened). Every later node is kind "fear" with a cumulative probability that strictly decreases down the chain. The final node is the worst-case catastrophe with a very small probability. Be honest and grounded, never dismissive.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export default function UntangleCascade() {
  const [stage, setStage] = useState("input"); // input | thinking | map
  const [input, setInput] = useState("");
  const [data, setData] = useState(null);
  const [released, setReleased] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [err, setErr] = useState("");
  const recRef = useRef(null);

  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggleVoice = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    try {
      const rec = new SR();
      rec.lang = "en-GB";
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (e) => {
        let finals = "";
        let inter = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finals += r[0].transcript;
          else inter += r[0].transcript;
        }
        if (finals) setInput((prev) => (prev ? prev + " " : "") + finals.trim());
        setInterim(inter);
      };
      rec.onend = () => { setListening(false); setInterim(""); };
      rec.onerror = () => { setListening(false); setInterim(""); };
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const run = async (useDemo) => {
    recRef.current?.stop();
    setErr("");
    setReleased({});
    setExpanded(null);
    if (useDemo) {
      setStage("thinking");
      setTimeout(() => { setData(DEMO); setStage("map"); }, 1400);
      return;
    }
    if (!input.trim()) return;
    setStage("thinking");
    try {
      const result = await analyzeSpiral(input.trim());
      if (!result?.nodes?.length) throw new Error("empty");
      setData(result);
      setStage("map");
    } catch (e) {
      setErr("Couldn't reach the analysis engine — showing the example instead.");
      setData(DEMO);
      setStage("map");
    }
  };

  const release = (id) => {
    setReleased((r) => ({ ...r, [id]: true }));
    setExpanded(null);
  };

  const reset = () => { setStage("input"); setData(null); setInput(""); setErr(""); };

  const fearNodes = data ? data.nodes.filter((n) => n.kind === "fear") : [];
  const allReleased = fearNodes.length > 0 && fearNodes.every((n) => released[n.id]);
  const releasedCount = fearNodes.filter((n) => released[n.id]).length;

  return (
    <div className="ut-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .ut-root {
          min-height: 100vh;
          background: radial-gradient(1200px 700px at 50% -10%, #1B2233 0%, #10141F 55%, #0C0F18 100%);
          color: #E8E6DF;
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px 80px;
        }
        .ut-shell { width: 100%; max-width: 620px; }

        .ut-brand {
          display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px;
        }
        .ut-logo {
          font-family: 'Fraunces', serif; font-weight: 600; font-size: 22px;
          letter-spacing: 0.01em; color: #E8E6DF;
        }
        .ut-tag { font-size: 12px; color: #8B93A7; letter-spacing: 0.04em; }

        .ut-hero {
          font-family: 'Fraunces', serif; font-weight: 500;
          font-size: clamp(26px, 5vw, 34px); line-height: 1.2;
          margin: 44px 0 10px; color: #F0EDE4;
        }
        .ut-sub { color: #8B93A7; font-size: 15px; line-height: 1.55; margin-bottom: 28px; }

        .ut-inputwrap {
          background: #171D2C; border: 1px solid #262E42; border-radius: 16px;
          padding: 16px; transition: border-color .25s;
        }
        .ut-inputwrap:focus-within { border-color: #44506E; }
        textarea.ut-ta {
          width: 100%; min-height: 110px; background: transparent; border: none; outline: none;
          resize: vertical; color: #E8E6DF; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6;
        }
        textarea.ut-ta::placeholder { color: #5B6478; }
        .ut-interim { color: #8B93A7; font-style: italic; font-size: 14px; min-height: 18px; }

        .ut-row { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; align-items: center; }
        .ut-btn {
          border: none; border-radius: 999px; padding: 11px 20px; font-size: 14px; font-weight: 600;
          cursor: pointer; font-family: 'Inter', sans-serif; transition: transform .15s, opacity .2s;
        }
        .ut-btn:active { transform: scale(.97); }
        .ut-primary { background: #E8926B; color: #1A130E; }
        .ut-primary:hover { opacity: .92; }
        .ut-ghost { background: transparent; color: #8B93A7; border: 1px solid #2B3348; }
        .ut-ghost:hover { color: #C6CBD9; border-color: #3D4763; }
        .ut-mic {
          width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center;
          border: 1px solid #2B3348; background: transparent; cursor: pointer; color: #A9B0C2;
        }
        .ut-mic.on {
          border-color: #E8926B; color: #E8926B;
          animation: ut-pulse 1.6s ease-in-out infinite;
        }
        @keyframes ut-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(232,146,107,.28); }
          50% { box-shadow: 0 0 0 10px rgba(232,146,107,0); }
        }

        .ut-think { text-align: center; padding: 90px 0; }
        .ut-breath {
          width: 18px; height: 18px; border-radius: 50%; background: #E8926B; margin: 0 auto 22px;
          animation: ut-breathe 2.6s ease-in-out infinite;
        }
        @keyframes ut-breathe {
          0%,100% { transform: scale(1); opacity: .55; }
          50% { transform: scale(2.1); opacity: 1; }
        }
        .ut-thinktext { color: #8B93A7; font-size: 14px; letter-spacing: .03em; }

        .ut-diag {
          display: inline-flex; align-items: center; gap: 8px;
          background: #1B2233; border: 1px solid #2B3348; border-radius: 999px;
          padding: 6px 14px; font-size: 12px; color: #A9B0C2; letter-spacing: .05em;
          margin-bottom: 14px;
        }
        .ut-diag b { color: #E8926B; font-weight: 600; }
        .ut-head { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 500; margin: 0 0 26px; }

        .ut-card {
          background: #171D2C; border: 1px solid #262E42; border-radius: 14px;
          padding: 16px 18px; cursor: pointer; position: relative;
          transition: border-color .2s, transform .2s, opacity .5s, filter .5s;
          animation: ut-drop .5s ease both;
        }
        .ut-card:hover { border-color: #3D4763; }
        @keyframes ut-drop {
          from { opacity: 0; transform: translateY(-14px); }
          to { opacity: 1; transform: none; }
        }
        .ut-card.gone {
          opacity: 0; filter: blur(6px); transform: translateY(-20px) scale(.97);
          pointer-events: none; position: absolute; inset: 0;
        }
        .ut-cardtop { display: flex; align-items: baseline; gap: 14px; }
        .ut-prob {
          font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 500;
          min-width: 74px;
        }
        .ut-probsub {
          font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #5B6478;
          display: block; letter-spacing: .06em; margin-top: 2px;
        }
        .ut-text { font-size: 15px; line-height: 1.5; color: #E2E0D8; }
        .ut-bar { height: 3px; border-radius: 2px; background: #232B3F; margin-top: 12px; overflow: hidden; }
        .ut-fill { height: 100%; border-radius: 2px; transition: width .8s ease; }

        .ut-expand { margin-top: 14px; padding-top: 14px; border-top: 1px solid #232B3F; animation: ut-fadein .3s ease; }
        @keyframes ut-fadein { from { opacity: 0; } to { opacity: 1; } }
        .ut-evidence { font-size: 13.5px; color: #A9B0C2; line-height: 1.6; margin-bottom: 12px; }
        .ut-release {
          background: transparent; border: 1px solid; border-radius: 999px;
          padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif;
        }

        .ut-connector {
          display: flex; align-items: center; gap: 8px; padding: 4px 0 4px 30px;
          color: #4A526A; font-size: 11px; letter-spacing: .08em;
        }
        .ut-line { width: 1px; height: 22px; background: #2B3348; margin-left: 6px; }

        .ut-releasedline {
          padding: 10px 18px; color: #5B6478; font-size: 12.5px;
          font-family: 'JetBrains Mono', monospace; letter-spacing: .03em;
          animation: ut-fadein .5s ease;
        }

        .ut-anchor {
          margin-top: 30px; background: linear-gradient(160deg, #17251F, #131C1F);
          border: 1px solid #2E4A3E; border-radius: 16px; padding: 22px;
          animation: ut-drop .6s ease both;
        }
        .ut-anchorlabel { font-size: 11px; letter-spacing: .12em; color: #7FA8A0; margin-bottom: 8px; font-weight: 600; }
        .ut-anchortext { font-family: 'Fraunces', serif; font-size: 20px; line-height: 1.4; color: #E9F0E9; }

        .ut-calm { margin-top: 26px; color: #8B93A7; font-size: 13px; text-align: center; }
        .ut-err { margin: 14px 0; color: #D8A25E; font-size: 13px; }
        .ut-footer { margin-top: 34px; display: flex; justify-content: center; }

        @media (prefers-reduced-motion: reduce) {
          .ut-card, .ut-anchor, .ut-breath, .ut-mic.on { animation: none !important; }
          .ut-card, .ut-fill { transition: none !important; }
        }
      `}</style>

      <div className="ut-shell">
        <div className="ut-brand">
          <span className="ut-logo">Untangle</span>
          <span className="ut-tag">see the spiral from outside</span>
        </div>

        {stage === "input" && (
          <>
            <h1 className="ut-hero">What's looping tonight?</h1>
            <p className="ut-sub">
              Say it or type it, exactly as messy as it is in your head. Untangle will lay the
              chain out in front of you — then you decide what to keep.
            </p>
            <div className="ut-inputwrap">
              <textarea
                className="ut-ta"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`"I'm behind on the deadline and my manager is going to be furious and it'll end up in my review and honestly if I get fired I don't know how we'd pay the mortgage…"`}
              />
              {interim && <div className="ut-interim">{interim}…</div>}
              <div className="ut-row">
                {SR && (
                  <button className={`ut-mic ${listening ? "on" : ""}`} onClick={toggleVoice} aria-label={listening ? "Stop listening" : "Speak your thought"}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="9" y="2" width="6" height="12" rx="3" />
                      <path d="M5 10a7 7 0 0 0 14 0" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </button>
                )}
                <button className="ut-btn ut-primary" onClick={() => run(false)}>Lay it out</button>
                <button className="ut-btn ut-ghost" onClick={() => run(true)}>Show me an example</button>
              </div>
            </div>
            {listening && <p className="ut-calm">Listening — take your time.</p>}
          </>
        )}

        {stage === "thinking" && (
          <div className="ut-think">
            <div className="ut-breath" />
            <div className="ut-thinktext">Untangling the chain…</div>
          </div>
        )}

        {stage === "map" && data && (
          <>
            {err && <div className="ut-err">{err}</div>}
            <div className="ut-diag">
              Diagnosis: <b>Projection</b> · an imagined future, not a memory
            </div>
            <h2 className="ut-head">{data.headline}</h2>

            <div>
              {data.nodes.map((node, i) => {
                const color = tempColor(i, data.nodes.length);
                const isGone = released[node.id];
                const isOpen = expanded === node.id;
                const isTrigger = node.kind === "trigger";
                return (
                  <div key={node.id} style={{ position: "relative" }}>
                    {i > 0 && !isGone && (
                      <div className="ut-connector">
                        <div className="ut-line" /> <span>then, you fear…</span>
                      </div>
                    )}
                    {isGone ? (
                      <div className="ut-releasedline">released · was {node.probability}% likely</div>
                    ) : (
                      <div
                        className="ut-card"
                        style={{
                          animationDelay: `${i * 0.18}s`,
                          borderLeft: `3px solid ${color}`,
                        }}
                        onClick={() => setExpanded(isOpen ? null : node.id)}
                      >
                        <div className="ut-cardtop">
                          <div>
                            <span className="ut-prob" style={{ color }}>
                              {node.probability < 1 ? node.probability : Math.round(node.probability)}%
                            </span>
                            <span className="ut-probsub">{isTrigger ? "REAL" : "LIKELY"}</span>
                          </div>
                          <div className="ut-text">{node.text}</div>
                        </div>
                        <div className="ut-bar">
                          <div className="ut-fill" style={{ width: `${Math.max(node.probability, 1.5)}%`, background: color }} />
                        </div>
                        {isOpen && (
                          <div className="ut-expand">
                            <div className="ut-evidence">{node.evidence}</div>
                            {!isTrigger && (
                              <button
                                className="ut-release"
                                style={{ borderColor: color, color }}
                                onClick={(e) => { e.stopPropagation(); release(node.id); }}
                              >
                                Release this one
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {releasedCount > 0 && (
              <div className="ut-anchor">
                <div className="ut-anchorlabel">WHAT'S ACTUALLY YOURS TO DO</div>
                <div className="ut-anchortext">{data.anchor?.text}</div>
              </div>
            )}

            {allReleased && (
              <p className="ut-calm">
                The chain is down to the one thing that's real. That's the whole practice.
              </p>
            )}

            <div className="ut-footer">
              <button className="ut-btn ut-ghost" onClick={reset}>Start another</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
