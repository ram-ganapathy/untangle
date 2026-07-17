import React, { useState, useRef } from "react";

// ————————————————————————————————————————————
// UNTANGLE — Replay (Pensieve) prototype
// A memory you keep replaying → sift each fragment into
// "what happened" (observable) vs "what you've added"
// (interpretation). Reality ends up shockingly short.
// ————————————————————————————————————————————

const DEMO = {
  headline: "The Tuesday meeting replay",
  fragments: [
    { id: "f1", text: "You suggested the timeline was too aggressive", layer: "happened", pattern: null, note: "Observable. You said words out loud. This is on the record." },
    { id: "f2", text: "Priya paused before responding", layer: "happened", pattern: null, note: "Observable. A pause happened. Its meaning is not part of the pause." },
    { id: "f3", text: "She thinks you don't get the bigger picture", layer: "added", pattern: "mind-reading", note: "You cannot observe her thoughts. This fragment was authored by you, after the meeting." },
    { id: "f4", text: "Everyone in the room noticed you fumble", layer: "added", pattern: "spotlight effect", note: "People track their own performance far more than yours. 'Everyone noticed' is almost never observable." },
    { id: "f5", text: "She said 'let's take that offline'", layer: "happened", pattern: null, note: "Observable. Five words. This is the entire evidence base for the next fragment." },
    { id: "f6", text: "'Take it offline' means she was annoyed", layer: "added", pattern: "interpretation", note: "One reading of five ambiguous words. It also means 'this deserves more time' in most workplaces." },
    { id: "f7", text: "You stumbled over your words for a moment", layer: "happened", pattern: null, note: "Observable, brief, and human. Note how short this is compared to how long it plays in the replay." },
    { id: "f8", text: "You've damaged how the team sees you", layer: "added", pattern: "fortune-telling", note: "A prediction dressed as a memory. Nothing in the observable record supports it yet." },
    { id: "f9", text: "The meeting moved on to the next item", layer: "happened", pattern: null, note: "Observable — and telling. The room moved on in seconds. Only the replay didn't." },
    { id: "f10", text: "The whole thing was a disaster", layer: "added", pattern: "global label", note: "A verdict, not an event. Verdicts feel like memories after enough replays." },
  ],
  keep: { text: "If it still nags in two days, ask Priya for ten minutes — offline, like she offered." },
};

async function analyzeMemory(input) {
  const prompt = `You are the analysis engine of "Untangle", an app that helps people stop replaying a past interaction by sifting the memory into observable fact vs added interpretation.

The user said: "${input}"

Respond with ONLY valid JSON, no markdown fences:
{
  "headline": "3-6 word name for this replay",
  "fragments": [
    { "id": "f1", "text": "short second-person restatement, max 14 words", "layer": "happened", "pattern": null, "note": "one calm sentence on why this is observable" },
    { "id": "f2", "text": "...", "layer": "added", "pattern": "mind-reading|spotlight effect|interpretation|fortune-telling|global label", "note": "one calm, non-judgemental sentence naming what was added" }
  ],
  "keep": { "text": "one small concrete action worth keeping from this memory, max 16 words" }
}

Rules: 6 to 10 fragments, in the order the user told them. "happened" = directly observable words or events. "added" = mind-reading, imagined judgements, predictions, or verdicts. Be honest and gentle, never dismissive. Include at least 3 of each layer if the input allows.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

export default function UntangleReplay() {
  const [stage, setStage] = useState("input"); // input | thinking | sift
  const [input, setInput] = useState("");
  const [data, setData] = useState(null);
  const [sifted, setSifted] = useState({});      // id -> true once placed
  const [overrides, setOverrides] = useState({}); // id -> "happened" | "added" (user corrections)
  const [expanded, setExpanded] = useState(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [err, setErr] = useState("");
  const recRef = useRef(null);

  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggleVoice = () => {
    if (listening) { recRef.current?.stop(); return; }
    try {
      const rec = new SR();
      rec.lang = "en-GB";
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (e) => {
        let finals = "", inter = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finals += r[0].transcript; else inter += r[0].transcript;
        }
        if (finals) setInput((p) => (p ? p + " " : "") + finals.trim());
        setInterim(inter);
      };
      rec.onend = () => { setListening(false); setInterim(""); };
      rec.onerror = () => { setListening(false); setInterim(""); };
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch { setListening(false); }
  };

  const run = async (useDemo) => {
    recRef.current?.stop();
    setErr(""); setSifted({}); setOverrides({}); setExpanded(null);
    if (useDemo) {
      setStage("thinking");
      setTimeout(() => { setData(DEMO); setStage("sift"); }, 1400);
      return;
    }
    if (!input.trim()) return;
    setStage("thinking");
    try {
      const result = await analyzeMemory(input.trim());
      if (!result?.fragments?.length) throw new Error("empty");
      setData(result);
      setStage("sift");
    } catch {
      setErr("Couldn't reach the analysis engine — showing the example instead.");
      setData(DEMO);
      setStage("sift");
    }
  };

  const layerOf = (f) => overrides[f.id] || f.layer;
  const sift = (id) => { setSifted((s) => ({ ...s, [id]: true })); setExpanded(null); };
  const siftAll = () => {
    const all = {};
    data.fragments.forEach((f) => { all[f.id] = true; });
    setSifted(all);
    setExpanded(null);
  };
  const moveFragment = (f) => {
    setOverrides((o) => ({ ...o, [f.id]: layerOf(f) === "happened" ? "added" : "happened" }));
  };
  const reset = () => { setStage("input"); setData(null); setInput(""); setErr(""); };

  const unsifted = data ? data.fragments.filter((f) => !sifted[f.id]) : [];
  const done = data && unsifted.length === 0;
  const happenedCount = data ? data.fragments.filter((f) => sifted[f.id] && layerOf(f) === "happened").length : 0;
  const addedCount = data ? data.fragments.filter((f) => sifted[f.id] && layerOf(f) === "added").length : 0;

  return (
    <div className="ur-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .ur-root {
          min-height: 100vh;
          background: radial-gradient(1200px 700px at 50% -10%, #1B2233 0%, #10141F 55%, #0C0F18 100%);
          color: #E8E6DF; font-family: 'Inter', sans-serif;
          display: flex; flex-direction: column; align-items: center;
          padding: 40px 20px 80px;
        }
        .ur-shell { width: 100%; max-width: 620px; }
        .ur-brand { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
        .ur-logo { font-family: 'Fraunces', serif; font-weight: 600; font-size: 22px; color: #E8E6DF; }
        .ur-tag { font-size: 12px; color: #8B93A7; letter-spacing: .04em; }

        .ur-hero { font-family: 'Fraunces', serif; font-weight: 500; font-size: clamp(26px, 5vw, 34px); line-height: 1.2; margin: 44px 0 10px; color: #F0EDE4; }
        .ur-sub { color: #8B93A7; font-size: 15px; line-height: 1.55; margin-bottom: 28px; }

        .ur-inputwrap { background: #171D2C; border: 1px solid #262E42; border-radius: 16px; padding: 16px; transition: border-color .25s; }
        .ur-inputwrap:focus-within { border-color: #44506E; }
        textarea.ur-ta { width: 100%; min-height: 110px; background: transparent; border: none; outline: none; resize: vertical; color: #E8E6DF; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6; }
        textarea.ur-ta::placeholder { color: #5B6478; }
        .ur-interim { color: #8B93A7; font-style: italic; font-size: 14px; min-height: 18px; }
        .ur-row { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; align-items: center; }
        .ur-btn { border: none; border-radius: 999px; padding: 11px 20px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: transform .15s, opacity .2s; }
        .ur-btn:active { transform: scale(.97); }
        .ur-primary { background: #8FB6D9; color: #0E1420; }
        .ur-primary:hover { opacity: .92; }
        .ur-ghost { background: transparent; color: #8B93A7; border: 1px solid #2B3348; }
        .ur-ghost:hover { color: #C6CBD9; border-color: #3D4763; }
        .ur-mic { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; border: 1px solid #2B3348; background: transparent; cursor: pointer; color: #A9B0C2; }
        .ur-mic.on { border-color: #8FB6D9; color: #8FB6D9; animation: ur-pulse 1.6s ease-in-out infinite; }
        @keyframes ur-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(143,182,217,.28); } 50% { box-shadow: 0 0 0 10px rgba(143,182,217,0); } }

        .ur-think { text-align: center; padding: 90px 0; }
        .ur-basin { width: 18px; height: 18px; border-radius: 50%; background: #8FB6D9; margin: 0 auto 22px; animation: ur-breathe 2.6s ease-in-out infinite; }
        @keyframes ur-breathe { 0%,100% { transform: scale(1); opacity: .55; } 50% { transform: scale(2.1); opacity: 1; } }
        .ur-thinktext { color: #8B93A7; font-size: 14px; letter-spacing: .03em; }

        .ur-diag { display: inline-flex; align-items: center; gap: 8px; background: #1B2233; border: 1px solid #2B3348; border-radius: 999px; padding: 6px 14px; font-size: 12px; color: #A9B0C2; letter-spacing: .05em; margin-bottom: 14px; }
        .ur-diag b { color: #8FB6D9; font-weight: 600; }
        .ur-head { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 500; margin: 0 0 8px; }
        .ur-instr { color: #8B93A7; font-size: 13.5px; line-height: 1.55; margin-bottom: 22px; }

        .ur-legend { display: flex; justify-content: space-between; font-size: 11px; letter-spacing: .1em; color: #5B6478; margin-bottom: 10px; font-weight: 600; }
        .ur-legend .l { color: #D9B98A; } .ur-legend .r { color: #7C89A8; }

        /* unsifted pile */
        .ur-pilecard {
          background: #1B2233; border: 1px solid #2B3348; border-radius: 14px;
          padding: 14px 16px; margin-bottom: 10px; cursor: pointer;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          transition: border-color .2s; animation: ur-drop .4s ease both;
        }
        .ur-pilecard:hover { border-color: #3D4763; }
        @keyframes ur-drop { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
        .ur-piletext { font-size: 14.5px; line-height: 1.5; color: #D8D6CE; }
        .ur-siftbtn { flex: none; font-size: 12px; font-weight: 600; color: #8FB6D9; border: 1px solid #33415C; border-radius: 999px; padding: 6px 14px; background: transparent; cursor: pointer; }
        .ur-siftbtn:hover { border-color: #8FB6D9; }

        /* sifted feed: left = happened (solid, warm), right = added (dashed, cool, translucent) */
        .ur-feed { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
        .ur-bubble {
          max-width: 82%; border-radius: 14px; padding: 12px 15px; cursor: pointer;
          font-size: 14px; line-height: 1.5; animation: ur-settle .45s ease both;
        }
        @keyframes ur-settle { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
        .ur-happened {
          align-self: flex-start; background: #241F17; border: 1px solid #4A3B26;
          border-left: 3px solid #D9B98A; color: #EDE4D3;
        }
        .ur-added {
          align-self: flex-end; background: rgba(28, 34, 51, .55); border: 1px dashed #39445F;
          border-right: 3px dashed #7C89A8; color: #A9B0C2; font-style: italic;
        }
        .ur-pattern { display: inline-block; font-style: normal; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .08em; color: #7C89A8; border: 1px solid #39445F; border-radius: 999px; padding: 2px 8px; margin-bottom: 7px; }
        .ur-note { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.07); font-size: 13px; font-style: normal; color: #A9B0C2; line-height: 1.55; animation: ur-fadein .25s ease; }
        @keyframes ur-fadein { from { opacity: 0; } to { opacity: 1; } }
        .ur-move { margin-top: 9px; background: transparent; border: none; color: #8FB6D9; font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; font-family: 'Inter', sans-serif; }

        .ur-tally {
          margin-top: 28px; background: #171D2C; border: 1px solid #262E42; border-radius: 16px;
          padding: 20px 22px; animation: ur-drop .5s ease both;
        }
        .ur-tallyrow { display: flex; gap: 24px; font-family: 'JetBrains Mono', monospace; font-size: 13px; margin-bottom: 12px; }
        .ur-tallyrow .h { color: #D9B98A; } .ur-tallyrow .a { color: #7C89A8; }
        .ur-verdict { font-family: 'Fraunces', serif; font-size: 19px; line-height: 1.45; color: #F0EDE4; }

        .ur-keep { margin-top: 14px; background: linear-gradient(160deg, #17251F, #131C1F); border: 1px solid #2E4A3E; border-radius: 16px; padding: 22px; animation: ur-drop .6s ease both; }
        .ur-keeplabel { font-size: 11px; letter-spacing: .12em; color: #7FA8A0; margin-bottom: 8px; font-weight: 600; }
        .ur-keeptext { font-family: 'Fraunces', serif; font-size: 20px; line-height: 1.4; color: #E9F0E9; }

        .ur-calm { margin-top: 26px; color: #8B93A7; font-size: 13px; text-align: center; }
        .ur-err { margin: 14px 0; color: #D8A25E; font-size: 13px; }
        .ur-footer { margin-top: 34px; display: flex; justify-content: center; gap: 10px; }

        @media (prefers-reduced-motion: reduce) {
          .ur-pilecard, .ur-bubble, .ur-tally, .ur-keep, .ur-basin, .ur-mic.on { animation: none !important; }
        }
      `}</style>

      <div className="ur-shell">
        <div className="ur-brand">
          <span className="ur-logo">Untangle</span>
          <span className="ur-tag">replay · sift the memory</span>
        </div>

        {stage === "input" && (
          <>
            <h1 className="ur-hero">Which moment keeps replaying?</h1>
            <p className="ur-sub">
              Tell it the way it plays in your head — the words, the looks, what you're sure they
              thought. Untangle will hold it still so you can sift it, piece by piece.
            </p>
            <div className="ur-inputwrap">
              <textarea
                className="ur-ta"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`"In Tuesday's meeting I said the timeline was too aggressive and Priya just paused and said 'let's take that offline' and I stumbled over my words and everyone noticed and now she definitely thinks I don't get the bigger picture…"`}
              />
              {interim && <div className="ur-interim">{interim}…</div>}
              <div className="ur-row">
                {SR && (
                  <button className={`ur-mic ${listening ? "on" : ""}`} onClick={toggleVoice} aria-label={listening ? "Stop listening" : "Speak the memory"}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="9" y="2" width="6" height="12" rx="3" />
                      <path d="M5 10a7 7 0 0 0 14 0" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </button>
                )}
                <button className="ur-btn ur-primary" onClick={() => run(false)}>Hold it still</button>
                <button className="ur-btn ur-ghost" onClick={() => run(true)}>Show me an example</button>
              </div>
            </div>
            {listening && <p className="ur-calm">Listening — tell it like it replays.</p>}
          </>
        )}

        {stage === "thinking" && (
          <div className="ur-think">
            <div className="ur-basin" />
            <div className="ur-thinktext">Holding the memory still…</div>
          </div>
        )}

        {stage === "sift" && data && (
          <>
            {err && <div className="ur-err">{err}</div>}
            <div className="ur-diag">Diagnosis: <b>Replay</b> · a real moment, looped and layered</div>
            <h2 className="ur-head">{data.headline}</h2>
            <p className="ur-instr">
              This is the memory as you carry it — fact and authorship fused together. Sift each
              fragment: what was observable settles <b style={{ color: "#D9B98A" }}>left</b>, what
              you've added drifts <b style={{ color: "#7C89A8" }}>right</b>. Tap any sifted piece to
              see why — and move it if the engine got it wrong.
            </p>

            {unsifted.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                {unsifted.map((f, i) => (
                  <div key={f.id} className="ur-pilecard" style={{ animationDelay: `${i * 0.06}s` }} onClick={() => sift(f.id)}>
                    <span className="ur-piletext">{f.text}</span>
                    <button className="ur-siftbtn" onClick={(e) => { e.stopPropagation(); sift(f.id); }}>sift</button>
                  </div>
                ))}
                {unsifted.length > 1 && (
                  <button className="ur-btn ur-ghost" style={{ marginTop: 4 }} onClick={siftAll}>Sift the rest</button>
                )}
              </div>
            )}

            {(happenedCount > 0 || addedCount > 0) && (
              <>
                <div className="ur-legend">
                  <span className="l">WHAT WAS SAID & DONE</span>
                  <span className="r">WHAT YOU'VE ADDED</span>
                </div>
                <div className="ur-feed">
                  {data.fragments.filter((f) => sifted[f.id]).map((f) => {
                    const layer = layerOf(f);
                    const open = expanded === f.id;
                    return (
                      <div
                        key={f.id}
                        className={`ur-bubble ${layer === "happened" ? "ur-happened" : "ur-added"}`}
                        onClick={() => setExpanded(open ? null : f.id)}
                      >
                        {layer === "added" && f.pattern && <span className="ur-pattern">{f.pattern}</span>}
                        <div>{f.text}</div>
                        {open && (
                          <div className="ur-note">
                            {f.note}
                            <div>
                              <button className="ur-move" onClick={(e) => { e.stopPropagation(); moveFragment(f); }}>
                                Not right? Move it {layer === "happened" ? "→ added" : "→ happened"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {done && (
              <>
                <div className="ur-tally">
                  <div className="ur-tallyrow">
                    <span className="h">observable: {happenedCount}</span>
                    <span className="a">authored by you: {addedCount}</span>
                  </div>
                  <div className="ur-verdict">
                    {addedCount > happenedCount
                      ? `The version you replay is mostly yours. ${happenedCount} fragments of record are carrying ${addedCount} fragments of authorship.`
                      : `Rare one — this memory is mostly record. Worth asking why it still loops.`}
                  </div>
                </div>
                <div className="ur-keep">
                  <div className="ur-keeplabel">WORTH KEEPING FROM THIS</div>
                  <div className="ur-keeptext">{data.keep?.text}</div>
                </div>
                <p className="ur-calm">The left column is what happened. The rest was drafting.</p>
              </>
            )}

            <div className="ur-footer">
              <button className="ur-btn ur-ghost" onClick={reset}>Sift another</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
