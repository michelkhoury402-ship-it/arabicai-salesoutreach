import { useState } from "react";

const RESEARCHER_PROMPT = `You are a B2B research analyst. Research the target company using web search. Return ONLY valid JSON, no markdown, no backticks:
{
  "industry": "one word or short phrase",
  "facts": [
    "Fact 1 — one punchy line, max 15 words",
    "Fact 2 — ...", "Fact 3 — ...", "Fact 4 — ...", "Fact 5 — ...",
    "Fact 6 — ...", "Fact 7 — ...", "Fact 8 — ...", "Fact 9 — ...", "Fact 10 — ..."
  ],
  "competitors": [
    "Competitor 1", "Competitor 2", "Competitor 3", "Competitor 4", "Competitor 5",
    "Competitor 6", "Competitor 7", "Competitor 8", "Competitor 9", "Competitor 10"
  ]
}
Facts: each is a standalone salesperson insight — size, revenue, products, leadership, news, MENA presence, digital strategy, language/content needs, growth signals, AI initiatives.
Competitors: return exactly 10 real named competitors or close industry peers. Mix direct competitors, regional players, and global players in the same space.`;

const STRATEGIST_PROMPT = `You are a senior sales strategist for arabic.ai — MENA's most advanced Arabic AI company. Pronoia LLM outperforms GPT-4o, DeepSeek-V3, Cohere on Arabic. $15M Series A. Founded by Nour Al Hassan (CEO).

5 streams:
1. AGENTIC PLATFORM + LLM (Pronoia): Arabic-first autonomous AI agents — contracts, reports, chatbots, document processing. On-prem/cloud/hybrid. Best for: finance, healthcare, legal, government, media.
2. CONTENT LAB: Arabic/bilingual content studio — events, reports, social, PR, SEO, scriptwriting, design, AI agents. Expo 2023 Doha. Best for: media, government comms, marketing, events.
3. UREED: MENA's largest freelance marketplace — 80,000+ vetted freelancers, 150+ industries. Best for: companies outsourcing content, tech, creative work.
4. TARJAMA: MENA's #1 translation & localization — 2B+ words, ISO-certified, 100+ language pairs. Clients: Noon (45% cost cut), OSN (30% viewership up). Best for: any enterprise communicating in Arabic.
5. SCREENS: World leader in Arabic dubbing & subtitling. Lebanon 1991, acquired 2022. 11 studios. 40+ language pairs. Best for: broadcasters, streaming, film, gaming, OTT.

Return ONLY valid JSON, no markdown, no backticks:
{
  "recommended_streams": ["stream name — one line why"],
  "pain_points": ["Pain point 1 — one line", "Pain point 2 — one line", "Pain point 3 — one line"],
  "tone": "formal | consultative | direct | warm",
  "tone_rationale": "one line explaining why",
  "seniority": "senior or junior",
  "cta": "exact CTA — senior: strategic meeting with Nour Al Hassan (CEO). Junior: demo or intro call.",
  "hooks": [
    "Hook A — one punchy opener angle specific to this company",
    "Hook B — different angle, competitor or market-focused",
    "Hook C — pain-point led angle",
    "Hook D — recency or news-led angle"
  ]
}`;

const CHANNELS = [
  { id: "linkedin", label: "LinkedIn DM", icon: "💼", desc: "Short & punchy, max 5 sentences" },
  { id: "cold_email", label: "Cold Email", icon: "📧", desc: "First touch, structured & clear" },
  { id: "followup", label: "Follow-up Email", icon: "🔁", desc: "Assumes no reply to first email" },
  { id: "call", label: "Cold Call Script", icon: "📞", desc: "Natural spoken language" },
];

const WRITER_PROMPTS = {
  linkedin: `Write 3 LinkedIn DM variants. Each max 5 sentences, punchy, different structure. Return ONLY valid JSON: {"variants": ["Variant A", "Variant B", "Variant C"]}`,
  cold_email: `Write 3 cold email variants with different openings. Return ONLY valid JSON: {"variants": [{"subject": "...", "body": "..."}, {"subject": "...", "body": "..."}, {"subject": "...", "body": "..."}]}`,
  followup: `Write 3 follow-up email variants (no reply assumed). Return ONLY valid JSON: {"variants": [{"subject": "...", "body": "..."}, {"subject": "...", "body": "..."}, {"subject": "...", "body": "..."}]}`,
  call: `Write 3 cold call script variants with different openings. Return ONLY valid JSON: {"variants": ["Script A", "Script B", "Script C"]}`,
};

const TONE_COLORS = {
  formal: { bg: "rgba(99,102,241,0.2)", text: "#a5b4fc", label: "🎩 Formal" },
  consultative: { bg: "rgba(245,158,11,0.2)", text: "#fcd34d", label: "🤝 Consultative" },
  direct: { bg: "rgba(239,68,68,0.2)", text: "#fca5a5", label: "⚡ Direct" },
  warm: { bg: "rgba(52,211,153,0.2)", text: "#6ee7b7", label: "☀️ Warm" },
};

async function callClaude(system, user, useSearch = false, maxTokens = 1500) {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  };
  if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("");
  if (!text) throw new Error("Empty");
  const m = text.replace(/```json\n?|```\n?/g, "").trim().match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON");
  return JSON.parse(m[0]);
}

function CopyBtn({ text }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ fontSize: 11, padding: "3px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: c ? "#6ee7b7" : "rgba(255,255,255,0.4)", cursor: "pointer" }}>
      {c ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Badge({ label, status }) {
  const s = {
    done: { bg: "rgba(52,211,153,0.15)", c: "#6ee7b7", pre: "✓ " },
    active: { bg: "rgba(124,58,237,0.2)", c: "#c4b5fd", pre: "⟳ " },
    waiting: { bg: "rgba(255,255,255,0.04)", c: "rgba(255,255,255,0.25)", pre: "" },
  }[status] || {};
  return <span style={{ background: s.bg, color: s.c, fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20 }}>{s.pre}{label}</span>;
}

export default function App() {
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phase, setPhase] = useState("idle");
  const [research, setResearch] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [selectedComps, setSelectedComps] = useState([]);
  const [selectedHook, setSelectedHook] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [variants, setVariants] = useState(null);
  const [activeVariant, setActiveVariant] = useState(0);
  const [error, setError] = useState("");

  const toggleComp = (c) => {
    setSelectedComps(prev => {
      if (prev.includes(c)) return prev.filter(x => x !== c);
      if (prev.length >= 3) return prev;
      return [...prev, c];
    });
  };

  const runResearchAndStrategy = async () => {
    if (!company || !jobTitle) return;
    setPhase("researching"); setError(""); setResearch(null); setStrategy(null); setVariants(null);
    setSelectedHook(null); setSelectedChannel(null); setSelectedComps([]);
    try {
      const r = await callClaude(RESEARCHER_PROMPT, `Company: ${company}\nContact: ${contact || "unknown"}\nTitle: ${jobTitle}`, true, 1400);
      setResearch(r);
      setPhase("strategizing");
      const s = await callClaude(STRATEGIST_PROMPT, `Research:\n${JSON.stringify(r)}\nJob title: ${jobTitle}`, false, 1200);
      setStrategy(s);
      setPhase("selecting");
    } catch (e) {
      setError("Research failed. Please try again.");
      setPhase("idle");
    }
  };

  const runWriter = async () => {
    if (selectedHook === null || !selectedChannel || selectedComps.length < 2) return;
    setPhase("writing"); setError(""); setVariants(null);
    try {
      const hook = strategy.hooks[selectedHook];
      const compList = selectedComps.join(" and ");
      const system = `You are an expert B2B copywriter for arabic.ai. Rules: use the hook provided, name-drop these specific competitors naturally: "${compList}" (use the exact phrasing "companies like ${compList} are already working with us"), match the tone exactly, use the exact CTA, reference something specific from research. ${WRITER_PROMPTS[selectedChannel]}`;
      const result = await callClaude(system, `Research: ${JSON.stringify(research)}\nStrategy: ${JSON.stringify(strategy)}\nChosen hook: "${hook}"\nContact: ${contact || "the contact"}\nTitle: ${jobTitle}\nCompany: ${company}`, false, 3000);
      setVariants(result.variants);
      setActiveVariant(0);
      setPhase("done");
    } catch (e) {
      setError("Message generation failed. Please try again.");
      setPhase("selecting");
    }
  };

  const isRunning = ["researching", "strategizing", "writing"].includes(phase);
  const tc = strategy ? TONE_COLORS[strategy.tone] || TONE_COLORS.warm : null;
  const currentChannel = CHANNELS.find(c => c.id === selectedChannel);
  const canGenerate = selectedHook !== null && selectedChannel && selectedComps.length >= 2 && phase !== "writing";

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#1a1a4e,#24243e)", padding: "28px 16px" }}>

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 50, padding: "5px 16px", marginBottom: 10 }}>
          <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: 13 }}>arabic.ai</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>Outreach Generator</span>
        </div>
        <h1 style={{ color: "white", fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Sales Outreach Generator</h1>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>Research → Strategy → Customize → Generate</p>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: 20 }}>
        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>STEP 1 — TARGET</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          {[["TARGET COMPANY *", company, setCompany, "e.g. MBC Group, stc, OSN...", "1/-1"],
            ["CONTACT NAME", contact, setContact, "e.g. Ahmed Al-Rashid", null],
            ["JOB TITLE *", jobTitle, setJobTitle, "e.g. VP Digital Transformation", null]
          ].map(([label, val, set, ph, span]) => (
            <div key={label} style={{ gridColumn: span || "auto" }}>
              <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>{label}</label>
              <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: 10, padding: "10px 13px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
        {isRunning && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Badge label="RESEARCHER" status={phase === "researching" ? "active" : ["strategizing","selecting","writing","done"].includes(phase) ? "done" : "waiting"} />
            <Badge label="STRATEGIST" status={phase === "strategizing" ? "active" : ["selecting","writing","done"].includes(phase) ? "done" : "waiting"} />
          </div>
        )}
        <button onClick={runResearchAndStrategy} disabled={isRunning || !company || !jobTitle}
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", cursor: !isRunning && company && jobTitle ? "pointer" : "not-allowed",
            background: !isRunning && company && jobTitle ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.07)",
            color: "white", fontWeight: 700, fontSize: 14 }}>
          {phase === "idle" || phase === "done" || phase === "selecting" ? "🔍 Research & Strategize"
            : phase === "researching" ? "🔍 Researching..." : "🧠 Building strategy..."}
        </button>
        {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 10, textAlign: "center" }}>{error}</p>}
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {research && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <Badge label="RESEARCHER" status="done" />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{research.industry}</span>
            </div>
            {research.facts?.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}>
                <span style={{ color: "#7c3aed", fontWeight: 800, fontSize: 12, minWidth: 18 }}>{i + 1}.</span>
                <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        )}

        {research?.competitors && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: 20, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>STEP 2 — PICK COMPETITORS TO NAME-DROP</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: selectedComps.length >= 2 ? "#6ee7b7" : "#fcd34d" }}>
                {selectedComps.length}/3 selected {selectedComps.length < 2 ? "(pick at least 2)" : "✓"}
              </span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 12px" }}>Choose 2–3 competitors to mention in your outreach. These will be name-dropped as social proof.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {research.competitors?.map((c, i) => {
                const sel = selectedComps.includes(c);
                const maxed = selectedComps.length >= 3 && !sel;
                return (
                  <button key={i} onClick={() => !maxed && toggleComp(c)} disabled={maxed}
                    style={{ padding: "7px 16px", borderRadius: 20, border: "1px solid", cursor: maxed ? "not-allowed" : "pointer", transition: "all 0.15s", fontSize: 13, fontWeight: 600,
                      borderColor: sel ? "#6ee7b7" : "rgba(255,255,255,0.12)",
                      background: sel ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)",
                      color: sel ? "#6ee7b7" : maxed ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)" }}>
                    {sel && "✓ "}{c}
                  </button>
                );
              })}
            </div>
            {selectedComps.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Will name-drop:</span>
                {selectedComps.map((c, i) => (
                  <span key={i} style={{ background: "rgba(52,211,153,0.12)", color: "#6ee7b7", fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 20 }}>{c}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {strategy && (
          <div style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 16, padding: 20, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <Badge label="STRATEGIST" status="done" />
              {tc && <span style={{ background: tc.bg, color: tc.text, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{tc.label}</span>}
              <span style={{ background: strategy.seniority === "senior" ? "rgba(250,204,21,0.15)" : "rgba(52,211,153,0.15)", color: strategy.seniority === "senior" ? "#fde68a" : "#6ee7b7", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                {strategy.seniority === "senior" ? "👔 Senior — CEO Meeting" : "🤝 Standard — Demo"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>STREAMS TO LEAD WITH</div>
                {strategy.recommended_streams?.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                    <span style={{ color: "#7c3aed", fontWeight: 800 }}>→</span>
                    <span style={{ color: "#c4b5fd", fontSize: 13 }}>{s}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>PAIN POINTS TO HIT</div>
                {strategy.pain_points?.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                    <span style={{ color: "#f87171", fontWeight: 800 }}>•</span>
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "10px 14px" }}>
              {tc && <span style={{ background: tc.bg, color: tc.text, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, marginRight: 8 }}>{tc.label}</span>}
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{strategy.tone_rationale}</span>
            </div>
          </div>
        )}

        {strategy && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: 20, marginBottom: 14 }}>
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>STEP 3 — PICK YOUR HOOK & CHANNEL</div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>🎣 Choose a hook</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {strategy.hooks?.map((h, i) => (
                  <div key={i} onClick={() => setSelectedHook(i)}
                    style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "11px 14px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                      border: `1px solid ${selectedHook === i ? "#7c3aed" : "rgba(255,255,255,0.08)"}`,
                      background: selectedHook === i ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.02)" }}>
                    <span style={{ fontWeight: 800, fontSize: 12, minWidth: 20, paddingTop: 1, color: selectedHook === i ? "#c4b5fd" : "rgba(255,255,255,0.25)" }}>{["A","B","C","D"][i]}</span>
                    <span style={{ fontSize: 13, lineHeight: 1.55, color: selectedHook === i ? "#e2e8f0" : "rgba(255,255,255,0.5)" }}>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>📡 Choose a channel</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {CHANNELS.map(ch => (
                  <div key={ch.id} onClick={() => setSelectedChannel(ch.id)}
                    style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                      border: `1px solid ${selectedChannel === ch.id ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                      background: selectedChannel === ch.id ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.02)" }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{ch.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: selectedChannel === ch.id ? "#fcd34d" : "rgba(255,255,255,0.65)", marginBottom: 2 }}>{ch.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{ch.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {selectedComps.length < 2 && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "8px 14px", marginBottom: 12 }}>
                <span style={{ color: "#fcd34d", fontSize: 12 }}>⚠️ Please select at least 2 competitors above before generating.</span>
              </div>
            )}

            <button onClick={runWriter} disabled={!canGenerate}
              style={{ width: "100%", padding: 13, borderRadius: 10, border: "none", cursor: canGenerate ? "pointer" : "not-allowed", transition: "all 0.2s",
                background: canGenerate ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.07)",
                color: "white", fontWeight: 700, fontSize: 14 }}>
              {phase === "writing" ? "✍️ Writing 3 variants..."
                : canGenerate ? `✍️ Generate ${currentChannel?.label} with Hook ${["A","B","C","D"][selectedHook]}`
                : "✍️ Complete selections above to generate"}
            </button>
          </div>
        )}

        {variants && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <Badge label="WRITER" status="done" />
              <span style={{ background: "rgba(245,158,11,0.12)", color: "#fcd34d", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{currentChannel?.icon} {currentChannel?.label}</span>
              <span style={{ background: "rgba(124,58,237,0.15)", color: "#c4b5fd", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Hook {["A","B","C","D"][selectedHook]}</span>
              {selectedComps.map((c, i) => (
                <span key={i} style={{ background: "rgba(52,211,153,0.1)", color: "#6ee7b7", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{c}</span>
              ))}
              <button onClick={() => { setVariants(null); setPhase("selecting"); }}
                style={{ marginLeft: "auto", fontSize: 11, padding: "3px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.35)", cursor: "pointer" }}>
                ← Change
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {variants.map((_, i) => (
                <button key={i} onClick={() => setActiveVariant(i)}
                  style={{ padding: "6px 20px", borderRadius: 8, border: "1px solid", cursor: "pointer",
                    borderColor: activeVariant === i ? "#f59e0b" : "rgba(255,255,255,0.08)",
                    background: activeVariant === i ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.03)",
                    color: activeVariant === i ? "#fcd34d" : "rgba(255,255,255,0.35)", fontWeight: 700, fontSize: 13 }}>
                  Option {["A","B","C"][i]}
                </button>
              ))}
            </div>

            {(() => {
              const v = variants[activeVariant];
              const isObj = typeof v === "object";
              const text = isObj ? v.body : v;
              const subject = isObj ? v.subject : null;
              return (
                <div>
                  {subject && (
                    <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>SUBJECT</div>
                      <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>{subject}</div>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700 }}>MESSAGE</div>
                    <CopyBtn text={subject ? `Subject: ${subject}\n\n${text}` : text} />
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 1.85, margin: 0, whiteSpace: "pre-wrap" }}>{text}</p>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
