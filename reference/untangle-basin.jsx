import React, { useState, useRef, useEffect } from "react";

// ————————————————————————————————————————————
// UNTANGLE — THE BASIN
// Graphical Pensieve for the Replay object type.
// A memory swirls as glowing wisps in a basin.
// Lift each wisp out. What happened settles into
// the record. What you added dissolves to mist.
// ————————————————————————————————————————————

const DEMO = {
  headline: "The Tuesday meeting replay",
  fragments: [
    { id: "f1", text: "You suggested the timeline was too aggressive", layer: "happened", pattern: null, note: "Observable. You said words out loud. This is on the record." },
    { id: "f2", text: "Priya paused before responding", layer: "happened", pattern: null, note: "Observable. A pause happened. Its meaning is not part of the pause." },
    { id: "f3", text: "She thinks you don't get the bigger picture", layer: "added", pattern: "mind-reading", note: "You cannot observe her thoughts. This fragment was authored by you, after the meeting." },
    { id: "f4", text: "Everyone in the room noticed you fumble", layer: "added", pattern: "spotlight effect", note: "People track their own performance far more than yours. 'Everyone noticed' is almost never observable." },
    { id: "f5", text: "She said 'let's take that offline'", layer: "happened", pattern: null, note: "Observable. Five words. This is the entire evidence base for the next wisp." },
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

Rules: 6 to 10 fragments. "happened" = directly observable words or events. "added" = mind-reading, imagined judgements, predictions, or verdicts. Be honest and gentle, never dismissive. Include at least 3 of each layer if the input allows.`;

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

export default function UntangleBasin() {
  const [stage, setStage] = useState("input"); // input | thinking | basin
  const [input, setInput] = useState("");
  const [data, setData] = useState(null);
  const [examining, setExamining] = useState(null);   // fragment id lifted out
  const [dissolving, setDissolving] = useState(null); // fragment id mid-mist
  const [placed, setPlaced] = useState({});           // id -> "happened" | "added"
  const [recordOrder, setRecordOrder] = useState([]); // happened ids in confirm order
  const [overrides, setOverrides] = useState({});     // id -> corrected layer
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [err, setErr] = useState("");
  const recRef = useRef(null);
  const basinRef = useRef(null);
  const orbRefs = useRef({});
  const orbParams = useRef({});

  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  // —— voice ——
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

  // —— run analysis ——
  const seedOrbs = (frags) => {
    const params = {};
    frags.forEach((f, i) => {
      params[f.id] = {
        theta: (i / frags.length) * Math.PI * 2 + Math.random() * 0.6,
        speed: 0.00025 + Math.random() * 0.00022,      // rad per ms
        rFrac: 0.34 + Math.random() * 0.42,            // fraction of basin radius
        wobA: 5 + Math.random() * 8,
        wobF: 0.0009 + Math.random() * 0.0008,
        wobP: Math.random() * Math.PI * 2,
      };
    });
    orbParams.current = params;
  };

  const run = async (useDemo) => {
    recRef.current?.stop();
    setErr(""); setPlaced({}); setRecordOrder([]); setOverrides({});
    setExamining(null); setDissolving(null);
    if (useDemo) {
      setStage("thinking");
      setTimeout(() => { seedOrbs(DEMO.fragments); setData(DEMO); setStage("basin"); }, 1400);
      return;
    }
    if (!input.trim()) return;
    setStage("thinking");
    try {
      const result = await analyzeMemory(input.trim());
      if (!result?.fragments?.length) throw new Error("empty");
      seedOrbs(result.fragments);
      setData(result);
      setStage("basin");
    } catch {
      setErr("Couldn't reach the analysis engine — showing the example instead.");
      seedOrbs(DEMO.fragments);
      setData(DEMO);
      setStage("basin");
    }
  };

  // —— orbit animation ——
  useEffect(() => {
    if (stage !== "basin" || !data) return;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = now - last;
      last = now;
      const basin = basinRef.current;
      if (basin) {
        const R = basin.clientWidth / 2;
        data.fragments.forEach((f) => {
          if (placed[f.id] || examining === f.id || dissolving === f.id) return;
          const p = orbParams.current[f.id];
          const el = orbRefs.current[f.id];
          if (!p || !el) return;
          p.theta += p.speed * dt;
          const wob = p.wobA * Math.sin(now * p.wobF + p.wobP);
          const r = p.rFrac * (R - 44) + wob;
          const x = R + r * Math.cos(p.theta) - 33;
          const y = R + r * Math.sin(p.theta) - 33;
          el.style.transform = `translate(${x}px, ${y}px)`;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) raf = requestAnimationFrame(tick);
    else {
      // static placement for reduced motion
      const basin = basinRef.current;
      if (basin) {
        const R = basin.clientWidth / 2;
        data.fragments.forEach((f) => {
          const p = orbParams.current[f.id];
          const el = orbRefs.current[f.id];
          if (!p || !el) return;
          const r = p.rFrac * (R - 44);
          el.style.transform = `translate(${R + r * Math.cos(p.theta) - 33}px, ${R + r * Math.sin(p.theta) - 33}px)`;
        });
      }
    }
    return () => cancelAnimationFrame(raf);
  }, [stage, data, placed, examining, dissolving]);

  // —— interactions ——
  const lift = (id) => {
    if (examining || dissolving) return;
    setExamining(id);
    // move orb to basin center
    const basin = basinRef.current;
    const el = orbRefs.current[id];
    if (basin && el) {
      const R = basin.clientWidth / 2;
      el.style.transform = `translate(${R - 33}px, ${R - 33}px) scale(1.45)`;
    }
  };

  const layerOf = (f) => overrides[f.id] || f.layer;

  const settle = (f) => {
    const layer = layerOf(f);
    if (layer === "happened") {
      setPlaced((p) => ({ ...p, [f.id]: "happened" }));
      setRecordOrder((r) => [...r, f.id]);
      setExamining(null);
    } else {
      setDissolving(f.id);
      setExamining(null);
      setTimeout(() => {
        setPlaced((p) => ({ ...p, [f.id]: "added" }));
        setDissolving(null);
      }, 850);
    }
  };

  const reset = () => { setStage("input"); setData(null); setInput(""); setErr(""); };

  const remaining = data ? data.fragments.filter((f) => !placed[f.id]).length : 0;
  const done = data && remaining === 0;
  const happenedCount = data ? data.fragments.filter((f) => placed[f.id] === "happened").length : 0;
  const addedCount = data ? data.fragments.filter((f) => placed[f.id] === "added").length : 0;
  const examFrag = data && examining ? data.fragments.find((f) => f.id === examining) : null;

  const orbLabel = (t) => {
    const words = t.split(" ").slice(0, 2).join(" ");
    return words.length > 14 ? words.slice(0, 13) + "…" : words + "…";
  };

  return (
    <div className="ub-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .ub-root {
          min-height: 100vh;
          background: radial-gradient(1200px 700px at 50% -10%, #1B2233 0%, #10141F 55%, #0C0F18 100%);
          color: #E8E6DF; font-family: 'Inter', sans-serif;
          display: flex; flex-direction: column; align-items: center;
          padding: 40px 20px 80px;
        }
        .ub-shell { width: 100%; max-width: 620px; }
        .ub-brand { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
        .ub-logo { font-family: 'Fraunces', serif; font-weight: 600; font-size: 22px; }
        .ub-tag { font-size: 12px; color: #8B93A7; letter-spacing: .04em; }

        .ub-hero { font-family: 'Fraunces', serif; font-weight: 500; font-size: clamp(26px, 5vw, 34px); line-height: 1.2; margin: 44px 0 10px; color: #F0EDE4; }
        .ub-sub { color: #8B93A7; font-size: 15px; line-height: 1.55; margin-bottom: 28px; }
        .ub-inputwrap { background: #171D2C; border: 1px solid #262E42; border-radius: 16px; padding: 16px; transition: border-color .25s; }
        .ub-inputwrap:focus-within { border-color: #44506E; }
        textarea.ub-ta { width: 100%; min-height: 110px; background: transparent; border: none; outline: none; resize: vertical; color: #E8E6DF; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6; }
        textarea.ub-ta::placeholder { color: #5B6478; }
        .ub-interim { color: #8B93A7; font-style: italic; font-size: 14px; min-height: 18px; }
        .ub-row { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; align-items: center; }
        .ub-btn { border: none; border-radius: 999px; padding: 11px 20px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: transform .15s, opacity .2s; }
        .ub-btn:active { transform: scale(.97); }
        .ub-primary { background: #8FB6D9; color: #0E1420; }
        .ub-primary:hover { opacity: .92; }
        .ub-ghost { background: transparent; color: #8B93A7; border: 1px solid #2B3348; }
        .ub-ghost:hover { color: #C6CBD9; border-color: #3D4763; }
        .ub-mic { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; border: 1px solid #2B3348; background: transparent; cursor: pointer; color: #A9B0C2; }
        .ub-mic.on { border-color: #8FB6D9; color: #8FB6D9; animation: ub-pulse 1.6s ease-in-out infinite; }
        @keyframes ub-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(143,182,217,.28); } 50% { box-shadow: 0 0 0 10px rgba(143,182,217,0); } }

        .ub-think { text-align: center; padding: 90px 0; }
        .ub-breath { width: 18px; height: 18px; border-radius: 50%; background: #8FB6D9; margin: 0 auto 22px; animation: ub-breathe 2.6s ease-in-out infinite; }
        @keyframes ub-breathe { 0%,100% { transform: scale(1); opacity: .55; } 50% { transform: scale(2.1); opacity: 1; } }
        .ub-thinktext { color: #8B93A7; font-size: 14px; letter-spacing: .03em; }

        .ub-diag { display: inline-flex; gap: 8px; background: #1B2233; border: 1px solid #2B3348; border-radius: 999px; padding: 6px 14px; font-size: 12px; color: #A9B0C2; letter-spacing: .05em; margin-bottom: 12px; }
        .ub-diag b { color: #8FB6D9; font-weight: 600; }
        .ub-head { font-family: 'Fraunces', serif; font-size: 25px; font-weight: 500; margin: 0 0 6px; }
        .ub-instr { color: #8B93A7; font-size: 13.5px; line-height: 1.55; margin-bottom: 18px; }

        /* ——— THE BASIN ——— */
        .ub-basinwrap { display: flex; justify-content: center; margin: 8px 0 4px; }
        .ub-basin {
          position: relative;
          width: min(88vw, 440px); height: min(88vw, 440px);
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 42%, rgba(143,182,217,.10), rgba(143,182,217,.03) 55%, transparent 72%),
            radial-gradient(circle at 50% 50%, #141B2B 0%, #10151F 68%, #0C0F18 100%);
          box-shadow:
            inset 0 0 60px rgba(20, 28, 48, .9),
            inset 0 0 18px rgba(143,182,217,.10),
            0 0 40px rgba(143,182,217,.05);
          border: 1px solid #232B3F;
          overflow: hidden;
        }
        .ub-swirl {
          position: absolute; inset: -20%;
          background: conic-gradient(from 0deg,
            transparent 0deg, rgba(143,182,217,.06) 40deg, transparent 90deg,
            rgba(216,185,138,.04) 150deg, transparent 200deg,
            rgba(143,182,217,.05) 280deg, transparent 340deg);
          animation: ub-spin 26s linear infinite;
          transition: opacity 1.5s;
        }
        .ub-swirl.calm { opacity: .18; animation-duration: 80s; }
        @keyframes ub-spin { to { transform: rotate(360deg); } }
        .ub-ring { position: absolute; border-radius: 50%; border: 1px solid rgba(143,182,217,.07); }
        .ub-ring.r1 { inset: 12%; } .ub-ring.r2 { inset: 27%; } .ub-ring.r3 { inset: 42%; }

        .ub-orb {
          position: absolute; top: 0; left: 0;
          width: 66px; height: 66px; border-radius: 50%;
          display: grid; place-items: center; text-align: center;
          cursor: pointer; will-change: transform;
          background: radial-gradient(circle at 38% 32%, rgba(232,230,223,.28), rgba(143,182,217,.16) 46%, rgba(143,182,217,.05) 72%, transparent);
          box-shadow: 0 0 18px rgba(143,182,217,.22), inset 0 0 10px rgba(232,230,223,.10);
          transition: box-shadow .3s, transform .7s cubic-bezier(.22,1,.36,1);
          font-size: 9.5px; color: #C6CBD9; letter-spacing: .02em; line-height: 1.25;
          padding: 6px; user-select: none;
        }
        .ub-orb:hover { box-shadow: 0 0 26px rgba(143,182,217,.4), inset 0 0 12px rgba(232,230,223,.16); }
        .ub-orb.lifted { z-index: 5; box-shadow: 0 0 40px rgba(232,230,223,.35); color: #F0EDE4; }
        .ub-orb.mist { animation: ub-mist .85s ease forwards; pointer-events: none; }
        @keyframes ub-mist {
          to { opacity: 0; filter: blur(10px); scale: 1.9; translate: 0 -46px; }
        }
        .ub-orb.gone { display: none; }

        .ub-hint { text-align: center; color: #5B6478; font-size: 12px; letter-spacing: .05em; margin: 10px 0 0; }

        /* examination card */
        .ub-exam {
          margin-top: 18px; background: #171D2C; border: 1px solid #33415C; border-radius: 16px;
          padding: 18px 20px; animation: ub-rise .35s ease both;
        }
        @keyframes ub-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .ub-examtext { font-size: 16px; line-height: 1.5; color: #EDEAE1; margin-bottom: 10px; }
        .ub-pattern { display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .08em; color: #7C89A8; border: 1px solid #39445F; border-radius: 999px; padding: 2px 8px; margin-bottom: 8px; }
        .ub-note { font-size: 13.5px; color: #A9B0C2; line-height: 1.6; margin-bottom: 14px; }
        .ub-examrow { display: flex; gap: 10px; flex-wrap: wrap; }
        .ub-settle { background: transparent; border: 1px solid #D9B98A; color: #D9B98A; border-radius: 999px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
        .ub-release { background: transparent; border: 1px dashed #7C89A8; color: #A9B0C2; border-radius: 999px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
        .ub-moveline { margin-top: 10px; }
        .ub-move { background: transparent; border: none; color: #8FB6D9; font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; font-family: 'Inter', sans-serif; }

        /* the record */
        .ub-record { margin-top: 26px; }
        .ub-recordlabel { font-size: 11px; letter-spacing: .12em; color: #D9B98A; font-weight: 600; margin-bottom: 10px; }
        .ub-stone {
          background: #241F17; border: 1px solid #4A3B26; border-left: 3px solid #D9B98A;
          border-radius: 12px; padding: 11px 14px; margin-bottom: 8px;
          font-size: 14px; color: #EDE4D3; line-height: 1.5; animation: ub-rise .4s ease both;
        }
        .ub-mistcount { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #5B6478; margin-top: 4px; letter-spacing: .04em; }

        .ub-tally { margin-top: 24px; background: #171D2C; border: 1px solid #262E42; border-radius: 16px; padding: 20px 22px; animation: ub-rise .5s ease both; }
        .ub-tallyrow { display: flex; gap: 24px; font-family: 'JetBrains Mono', monospace; font-size: 13px; margin-bottom: 12px; }
        .ub-tallyrow .h { color: #D9B98A; } .ub-tallyrow .a { color: #7C89A8; }
        .ub-verdict { font-family: 'Fraunces', serif; font-size: 19px; line-height: 1.45; color: #F0EDE4; }
        .ub-keep { margin-top: 14px; background: linear-gradient(160deg, #17251F, #131C1F); border: 1px solid #2E4A3E; border-radius: 16px; padding: 22px; animation: ub-rise .6s ease both; }
        .ub-keeplabel { font-size: 11px; letter-spacing: .12em; color: #7FA8A0; margin-bottom: 8px; font-weight: 600; }
        .ub-keeptext { font-family: 'Fraunces', serif; font-size: 20px; line-height: 1.4; color: #E9F0E9; }
        .ub-calm { margin-top: 24px; color: #8B93A7; font-size: 13px; text-align: center; }
        .ub-err { margin: 14px 0; color: #D8A25E; font-size: 13px; }
        .ub-footer { margin-top: 32px; display: flex; justify-content: center; }

        @media (prefers-reduced-motion: reduce) {
          .ub-swirl, .ub-breath, .ub-mic.on { animation: none !important; }
          .ub-orb { transition: none; }
          .ub-orb.mist { animation: none; opacity: 0; }
        }
      `}</style>

      <div className="ub-shell">
        <div className="ub-brand">
          <span className="ub-logo">Untangle</span>
          <span className="ub-tag">the basin · sift the memory</span>
        </div>

        {stage === "input" && (
          <>
            <h1 className="ub-hero">Which moment keeps replaying?</h1>
            <p className="ub-sub">
              Tell it the way it plays in your head — the words, the looks, what you're sure they
              thought. Untangle will pour it into the basin so you can sift it, wisp by wisp.
            </p>
            <div className="ub-inputwrap">
              <textarea
                className="ub-ta"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`"In Tuesday's meeting I said the timeline was too aggressive and Priya just paused and said 'let's take that offline' and I stumbled over my words and everyone noticed and now she definitely thinks I don't get the bigger picture…"`}
              />
              {interim && <div className="ub-interim">{interim}…</div>}
              <div className="ub-row">
                {SR && (
                  <button className={`ub-mic ${listening ? "on" : ""}`} onClick={toggleVoice} aria-label={listening ? "Stop listening" : "Speak the memory"}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="9" y="2" width="6" height="12" rx="3" />
                      <path d="M5 10a7 7 0 0 0 14 0" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </button>
                )}
                <button className="ub-btn ub-primary" onClick={() => run(false)}>Pour it in</button>
                <button className="ub-btn ub-ghost" onClick={() => run(true)}>Show me an example</button>
              </div>
            </div>
            {listening && <p className="ub-calm">Listening — tell it like it replays.</p>}
          </>
        )}

        {stage === "thinking" && (
          <div className="ub-think">
            <div className="ub-breath" />
            <div className="ub-thinktext">Pouring the memory into the basin…</div>
          </div>
        )}

        {stage === "basin" && data && (
          <>
            {err && <div className="ub-err">{err}</div>}
            <div className="ub-diag">Diagnosis: <b>Replay</b> · a real moment, looped and layered</div>
            <h2 className="ub-head">{data.headline}</h2>
            <p className="ub-instr">
              Your memory, held still. Each wisp is one fragment — fact and authorship swirling
              together. Lift one out to look at it properly.
            </p>

            {!done && (
              <div className="ub-basinwrap">
                <div className="ub-basin" ref={basinRef}>
                  <div className={`ub-swirl ${remaining <= 2 ? "calm" : ""}`} />
                  <div className="ub-ring r1" /><div className="ub-ring r2" /><div className="ub-ring r3" />
                  {data.fragments.map((f) => {
                    if (placed[f.id]) return null;
                    const cls =
                      dissolving === f.id ? "ub-orb mist" :
                      examining === f.id ? "ub-orb lifted" : "ub-orb";
                    return (
                      <div
                        key={f.id}
                        ref={(el) => { orbRefs.current[f.id] = el; }}
                        className={cls}
                        onClick={() => lift(f.id)}
                      >
                        <span>{orbLabel(f.text)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {!done && !examFrag && <p className="ub-hint">TAP A WISP TO LIFT IT OUT · {remaining} REMAINING</p>}

            {examFrag && (
              <div className="ub-exam">
                {layerOf(examFrag) === "added" && examFrag.pattern && (
                  <span className="ub-pattern">{examFrag.pattern}</span>
                )}
                <div className="ub-examtext">{examFrag.text}</div>
                <div className="ub-note">{examFrag.note}</div>
                <div className="ub-examrow">
                  {layerOf(examFrag) === "happened" ? (
                    <button className="ub-settle" onClick={() => settle(examFrag)}>It happened — set it in the record</button>
                  ) : (
                    <button className="ub-release" onClick={() => settle(examFrag)}>I added this — let it go to mist</button>
                  )}
                </div>
                <div className="ub-moveline">
                  <button className="ub-move" onClick={() => setOverrides((o) => ({ ...o, [examFrag.id]: layerOf(examFrag) === "happened" ? "added" : "happened" }))}>
                    Not right? It's actually {layerOf(examFrag) === "happened" ? "something I added" : "something that happened"}
                  </button>
                </div>
              </div>
            )}

            {recordOrder.length > 0 && (
              <div className="ub-record">
                <div className="ub-recordlabel">THE RECORD — WHAT ACTUALLY HAPPENED</div>
                {recordOrder.map((id) => {
                  const f = data.fragments.find((x) => x.id === id);
                  return <div key={id} className="ub-stone">{f.text}</div>;
                })}
                {addedCount > 0 && (
                  <div className="ub-mistcount">released to mist: {addedCount}</div>
                )}
              </div>
            )}

            {done && (
              <>
                <div className="ub-tally">
                  <div className="ub-tallyrow">
                    <span className="h">in the record: {happenedCount}</span>
                    <span className="a">gone to mist: {addedCount}</span>
                  </div>
                  <div className="ub-verdict">
                    {addedCount > happenedCount
                      ? `The basin is clear. ${happenedCount} fragments of record were carrying ${addedCount} wisps of authorship.`
                      : `The basin is clear — and this one was mostly record. Worth asking why it still loops.`}
                  </div>
                </div>
                <div className="ub-keep">
                  <div className="ub-keeplabel">WORTH KEEPING FROM THIS</div>
                  <div className="ub-keeptext">{data.keep?.text}</div>
                </div>
                <p className="ub-calm">The record stays. The mist was never yours to carry.</p>
              </>
            )}

            <div className="ub-footer">
              <button className="ub-btn ub-ghost" onClick={reset}>Pour in another</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
