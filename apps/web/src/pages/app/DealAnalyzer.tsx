import { useState, useRef, useEffect } from "react";
import { evaluateDeal, brokerChat, DealEvalInput, DealEvalResult, BrokerMessage } from "../../lib/api";

const CATEGORIES = [
  "Excavator", "Dozer", "Wheel Loader", "Backhoe", "Motor Grader",
  "Compactor", "Telehandler", "Skid Steer", "Crane", "Other",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV",
  "NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN",
  "TX","UT","VT","VA","WA","WV","WI","WY",
];

const REC_CONFIG = {
  BUY:       { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.3)",  label: "BUY"       },
  NEGOTIATE: { color: "#f5c518", bg: "rgba(245,197,24,0.1)", border: "rgba(245,197,24,0.3)", label: "NEGOTIATE" },
  WALK:      { color: "#ef4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.3)",  label: "WALK"      },
};

const parseListingText = (text: string): Partial<DealEvalInput> => {
  const out: Partial<DealEvalInput> = {};
  const num = (pattern: RegExp) => {
    const m = text.match(pattern);
    return m ? parseFloat(m[1].replace(/,/g, "")) : undefined;
  };

  const price = num(/\$\s?([\d,]+)/);
  if (price) out.price = price;

  const hours = num(/([\d,]+)\s*(?:hrs?|hours)/i);
  if (hours) out.hours = hours;

  const year = num(/\b((?:19|20)\d{2})\b/);
  if (year) out.year = year;

  const stateMatch = text.match(/\b([A-Z]{2})\b/g);
  if (stateMatch) {
    const found = stateMatch.find(s => US_STATES.includes(s));
    if (found) out.state = found;
  }

  for (const cat of CATEGORIES) {
    if (text.toLowerCase().includes(cat.toLowerCase())) {
      out.category = cat;
      break;
    }
  }

  const titleMatch = text.match(/^(.{10,80}?)(?:\n|$)/);
  if (titleMatch) out.title = titleMatch[1].trim();

  if (/dealer/i.test(text)) out.sellerType = "dealer";
  else if (/auction/i.test(text)) out.sellerType = "auction";
  if (/inspection report/i.test(text)) out.hasInspectionReport = true;
  if (/service history|service records/i.test(text)) out.hasServiceHistory = true;

  return out;
};

const ScoreBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ fontSize: 12, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 1, fontFamily: "monospace" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb", fontFamily: "monospace" }}>{value}</span>
    </div>
    <div style={{ height: 6, background: "#1e2024" }}>
      <div style={{ height: "100%", width: `${value}%`, background: color, transition: "width 0.8s ease" }} />
    </div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 2, marginBottom: 6, fontFamily: "monospace" }}>{label}</label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#0d0f12", border: "1px solid #2a2d33",
  color: "#e5e7eb", padding: "10px 14px", fontSize: 14, outline: "none",
};

export const DealAnalyzer = () => {
  const [pasteText, setPasteText] = useState("");
  const [form, setForm] = useState<DealEvalInput>({ title: "", operable: true, category: "Excavator" });
  const [result, setResult] = useState<DealEvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"paste" | "manual">("paste");
  const [parsed, setParsed] = useState(false);
  const [messages, setMessages] = useState<BrokerMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleParse = () => {
    if (!pasteText.trim()) return;
    const extracted = parseListingText(pasteText);
    setForm(prev => ({ ...prev, ...extracted, title: extracted.title || prev.title || pasteText.slice(0, 60) }));
    setParsed(true);
    setTab("manual");
  };

  const handleEvaluate = async () => {
    if (!form.title?.trim()) { setError("Title is required."); return; }
    setLoading(true); setError(null); setResult(null); setMessages([]);
    try {
      const res = await evaluateDeal(form);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed.");
    } finally { setLoading(false); }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: BrokerMessage = { role: "user", content: chatInput.trim() };
    const next = [...messages, userMsg];
    setMessages(next); setChatInput(""); setChatLoading(true); setChatError(null);
    try {
      const res = await brokerChat(next, form);
      const raw = res.messages?.[0]?.content;
      const text = typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
      setMessages([...next, { role: "assistant", content: text }]);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Chat failed.");
    } finally { setChatLoading(false); }
  };

  const rec = result ? REC_CONFIG[result.recommendation] : null;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#e5e7eb", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ borderBottom: "2px solid #f5c518", paddingBottom: 20, marginBottom: 32 }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: "#f5c518", letterSpacing: 1, lineHeight: 1, marginBottom: 4 }}>Deal Analyzer</h1>
        <p style={{ fontSize: 13, color: "#6b7280", fontFamily: "monospace", letterSpacing: 1 }}>PASTE A LISTING · SCORE IT · BUY / NEGOTIATE / WALK</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1fr" : "1fr", gap: 24 }}>
        <div>
          <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid #2a2d33" }}>
            {(["paste", "manual"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "10px 20px", fontSize: 12, fontFamily: "monospace", textTransform: "uppercase" as const,
                letterSpacing: 2, cursor: "pointer", border: "none",
                borderBottom: tab === t ? "2px solid #f5c518" : "2px solid transparent",
                background: "transparent", color: tab === t ? "#f5c518" : "#6b7280", marginBottom: -1,
              }}>{t === "paste" ? "Paste Listing" : "Details"}</button>
            ))}
          </div>

          {tab === "paste" && (
            <div>
              <Field label="Paste listing text from any site">
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                  placeholder={"Paste the full listing from IronPlanet, MachineryTrader, RitchieBros, GovPlanet, or any auction site...\n\nExample:\n2018 CAT 320 Excavator\n4,200 Hours · $85,000\nTX · Dealer · Inspection report available"}
                  rows={12} style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.6 }} />
              </Field>
              <button onClick={handleParse} disabled={!pasteText.trim()} style={{
                background: "#f5c518", color: "#0a0a0a", border: "none", padding: "12px 28px",
                fontSize: 13, fontWeight: 700, fontFamily: "monospace", textTransform: "uppercase" as const,
                letterSpacing: 2, cursor: pasteText.trim() ? "pointer" : "not-allowed",
                opacity: pasteText.trim() ? 1 : 0.4, width: "100%",
              }}>{parsed ? "Re-parse Listing" : "Parse Listing →"}</button>
              {parsed && <p style={{ marginTop: 10, fontSize: 12, color: "#22c55e", fontFamily: "monospace" }}>✓ Parsed — switch to Details to review & score</p>}
            </div>
          )}

          {tab === "manual" && (
            <div>
              <Field label="Machine Title *">
                <input value={form.title || ""} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. 2018 CAT 320 Excavator" style={inputStyle} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Price ($)">
                  <input type="number" value={form.price ?? ""} onChange={e => setForm(p => ({ ...p, price: e.target.value ? Number(e.target.value) : null }))} placeholder="85000" style={inputStyle} />
                </Field>
                <Field label="Hours">
                  <input type="number" value={form.hours ?? ""} onChange={e => setForm(p => ({ ...p, hours: e.target.value ? Number(e.target.value) : null }))} placeholder="4200" style={inputStyle} />
                </Field>
                <Field label="Year">
                  <input type="number" value={form.year ?? ""} onChange={e => setForm(p => ({ ...p, year: e.target.value ? Number(e.target.value) : undefined }))} placeholder="2018" style={inputStyle} />
                </Field>
                <Field label="State">
                  <select value={form.state ?? ""} onChange={e => setForm(p => ({ ...p, state: e.target.value || undefined }))} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">— Select —</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Category">
                  <select value={form.category ?? ""} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Seller Type">
                  <select value={form.sellerType ?? ""} onChange={e => setForm(p => ({ ...p, sellerType: (e.target.value || undefined) as any }))} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">— Unknown —</option>
                    <option value="dealer">Dealer</option>
                    <option value="auction">Auction</option>
                    <option value="private">Private</option>
                  </select>
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                {([["Operable","operable"],["Inspection Report","hasInspectionReport"],["Service History","hasServiceHistory"],["Verified Seller","verifiedSeller"],["Shipping Available","shippingAvailable"]] as [string, keyof DealEvalInput][]).map(([label, key]) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9ca3af", cursor: "pointer" }}>
                    <input type="checkbox" checked={Boolean((form as any)[key])} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} style={{ accentColor: "#f5c518", width: 16, height: 16 }} />
                    {label}
                  </label>
                ))}
              </div>
              {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#ef4444", fontFamily: "monospace" }}>{error}</div>}
              <button onClick={handleEvaluate} disabled={loading} style={{
                background: loading ? "#2a2d33" : "#f5c518", color: loading ? "#6b7280" : "#0a0a0a",
                border: "none", padding: "14px 28px", fontSize: 13, fontWeight: 700, fontFamily: "monospace",
                textTransform: "uppercase" as const, letterSpacing: 2, cursor: loading ? "not-allowed" : "pointer", width: "100%",
              }}>{loading ? "Scoring..." : "Score This Deal →"}</button>
            </div>
          )}
        </div>

        {result && rec && (
          <div>
            <div style={{ background: rec.bg, border: `1px solid ${rec.border}`, padding: 28, marginBottom: 20 }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 3, marginBottom: 8 }}>Recommendation</div>
              <div style={{ fontSize: 64, fontWeight: 900, color: rec.color, lineHeight: 1, letterSpacing: 2 }}>{rec.label}</div>
              <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 1 }}>Total Score</div>
                  <div style={{ fontSize: 40, fontWeight: 900, color: "#e5e7eb", lineHeight: 1.1 }}>{result.score.total}<span style={{ fontSize: 18, color: "#6b7280" }}>/100</span></div>
                </div>
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 1 }}>Confidence</div>
                  <div style={{ fontSize: 40, fontWeight: 900, color: "#e5e7eb", lineHeight: 1.1 }}>{result.score.confidenceScore}<span style={{ fontSize: 18, color: "#6b7280" }}>%</span></div>
                </div>
              </div>
            </div>

            <div style={{ background: "#16181c", border: "1px solid #2a2d33", padding: 24, marginBottom: 20 }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 3, marginBottom: 16 }}>Score Breakdown</div>
              <ScoreBar label="Deal" value={result.score.breakdown.deal} color="#f5c518" />
              <ScoreBar label="Usage" value={result.score.breakdown.usage} color="#3b82f6" />
              <ScoreBar label="Risk" value={result.score.breakdown.risk} color="#22c55e" />
              <ScoreBar label="Speed" value={result.score.breakdown.speed} color="#a855f7" />
            </div>

            {result.score.reasons.length > 0 && (
              <div style={{ background: "#16181c", border: "1px solid #2a2d33", padding: 24, marginBottom: 20 }}>
                <div style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 3, marginBottom: 14 }}>Analysis</div>
                {result.score.reasons.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: "#9ca3af", lineHeight: 1.5 }}>
                    <span style={{ color: "#f5c518", flexShrink: 0 }}>→</span><span>{r.message}</span>
                  </div>
                ))}
              </div>
            )}

            {result.score.flags.length > 0 && (
              <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", padding: "14px 20px", marginBottom: 20 }}>
                <div style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 2, marginBottom: 8 }}>Flags</div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                  {result.score.flags.map(f => (
                    <span key={f} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "3px 10px", fontSize: 11, fontFamily: "monospace", letterSpacing: 1 }}>{f}</span>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => { setResult(null); setMessages([]); setForm({ title: "", operable: true, category: "Excavator" }); setPasteText(""); setParsed(false); setTab("paste"); }} style={{
              background: "transparent", border: "1px solid #2a2d33", color: "#6b7280", padding: "10px 20px",
              fontSize: 12, fontFamily: "monospace", textTransform: "uppercase" as const, letterSpacing: 2, cursor: "pointer", width: "100%",
            }}>← Analyze Another Listing</button>
          </div>
        )}
      </div>

      {result && (
        <div style={{ marginTop: 32, background: "#16181c", border: "1px solid #2a2d33", borderTop: "2px solid #f5c518" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #2a2d33", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#f5c518", letterSpacing: 1 }}>AI Broker</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280", letterSpacing: 2, textTransform: "uppercase" as const }}>20 years heavy equipment experience</div>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", padding: "4px 12px" }}>● ONLINE</div>
          </div>

          {messages.length === 0 && (
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1d21" }}>
              <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 12, fontFamily: "monospace", textTransform: "uppercase" as const, letterSpacing: 2 }}>Suggested Questions</p>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                {["What's a fair counter-offer?","What are the biggest risks here?","What should I inspect first?","What's the FMV for this machine?"].map(q => (
                  <button key={q} onClick={() => setChatInput(q)} style={{ background: "#0d0f12", border: "1px solid #2a2d33", color: "#9ca3af", padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>{q}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ maxHeight: 360, overflowY: "auto", padding: "16px 24px" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 20, display: "flex", flexDirection: "column" as const, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: "#4b5563", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 1 }}>{m.role === "user" ? "You" : "AI Broker"}</div>
                <div style={{ maxWidth: "80%", padding: "12px 16px", fontSize: 13, lineHeight: 1.6, background: m.role === "user" ? "rgba(245,197,24,0.1)" : "#0d0f12", border: m.role === "user" ? "1px solid rgba(245,197,24,0.2)" : "1px solid #2a2d33", color: "#e5e7eb", whiteSpace: "pre-wrap" as const }}>
                  {typeof m.content === "string" ? (() => {
                    try {
                      const p = JSON.parse(m.content);
                      return (
                        <div>
                          {p.recommendation && <div style={{ fontSize: 28, fontWeight: 900, color: REC_CONFIG[p.recommendation as keyof typeof REC_CONFIG]?.color ?? "#f5c518", marginBottom: 8 }}>{p.recommendation}</div>}
                          {p.reasoning && <p style={{ marginBottom: 8 }}>{p.reasoning}</p>}
                          {p.fmv_estimate && <p style={{ color: "#9ca3af", fontSize: 12 }}>FMV: <strong style={{ color: "#e5e7eb" }}>${p.fmv_estimate.toLocaleString()}</strong></p>}
                          {p.price_delta_percent != null && <p style={{ color: "#9ca3af", fontSize: 12 }}>Price Delta: <strong style={{ color: "#e5e7eb" }}>{p.price_delta_percent > 0 ? "+" : ""}{p.price_delta_percent}%</strong></p>}
                          {p.risk_factors?.length > 0 && <div style={{ marginTop: 8 }}><p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }}>Risk Factors</p>{p.risk_factors.map((r: string, i: number) => <p key={i} style={{ fontSize: 12, color: "#9ca3af" }}>→ {r}</p>)}</div>}
                          {p.negotiation_plan?.length > 0 && <div style={{ marginTop: 8 }}><p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }}>Negotiation Plan</p>{p.negotiation_plan.map((rnd: any) => <div key={rnd.round} style={{ marginBottom: 6, paddingLeft: 8, borderLeft: "2px solid #f5c518" }}><p style={{ fontSize: 12, color: "#f5c518" }}>Round {rnd.round}: ${rnd.offer?.toLocaleString()}</p><p style={{ fontSize: 12, color: "#9ca3af" }}>{rnd.rationale}</p></div>)}</div>}
                          {p.market_context && <p style={{ marginTop: 8, fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>{p.market_context}</p>}
                        </div>
                      );
                    } catch { return m.content; }
                  })() : JSON.stringify(m.content, null, 2)}
                </div>
              </div>
            ))}
            {chatLoading && <div style={{ color: "#4b5563", fontSize: 12, fontFamily: "monospace" }}>● Broker is thinking...</div>}
            {chatError && <p style={{ color: "#ef4444", fontSize: 12, fontFamily: "monospace" }}>{chatError}</p>}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: "16px 24px", borderTop: "1px solid #2a2d33", display: "flex", gap: 12 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
              placeholder="Ask the broker anything about this deal..."
              style={{ ...inputStyle, flex: 1 }} disabled={chatLoading} />
            <button onClick={handleChat} disabled={!chatInput.trim() || chatLoading} style={{
              background: chatInput.trim() && !chatLoading ? "#f5c518" : "#2a2d33",
              color: chatInput.trim() && !chatLoading ? "#0a0a0a" : "#4b5563",
              border: "none", padding: "10px 24px", fontSize: 12, fontWeight: 700, fontFamily: "monospace",
              textTransform: "uppercase" as const, letterSpacing: 1,
              cursor: chatInput.trim() && !chatLoading ? "pointer" : "not-allowed", flexShrink: 0,
            }}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};
