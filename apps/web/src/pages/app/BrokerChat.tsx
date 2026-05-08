import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are a veteran independent heavy equipment broker with 20+ years closing deals across construction, mining, agriculture, and demolition. You have zero brand loyalty — your only goal is the right machine, right price, right deal.

Buyers: Cut through seller BS. Identify red flags. Recommend inspection points. Push for the best deal or walk away.
Sellers: Gather year, make, model, hours, condition, service history. Give realistic market pricing. Advise on positioning.
Scouts/Brokers: Share intel on market trends, arbitrage opportunities, and deal structuring.

Keep responses concise — 2-4 short paragraphs max.`;

interface Message { role: "user" | "assistant"; content: string; }

export default function BrokerChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1000, system: SYSTEM_PROMPT, messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "API error");
      const reply = data.content?.find((b: any) => b.type === "text")?.text;
      if (!reply) throw new Error("No response");
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setError(e.message ?? "Failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-mono">
      <div className="border-b border-gray-800 px-4 py-3 flex items-center gap-3 bg-gray-900">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
        <div>
          <div className="text-xs font-bold tracking-widest text-amber-500">EASYFINDER BROKER</div>
          <div className="text-[10px] text-gray-600 tracking-wider">20+ YRS · BUY / NEGOTIATE / WALK</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="m-auto text-center">
            <div className="text-4xl mb-3">⚙</div>
            <div className="text-xs text-gray-600 tracking-widest mb-4">HEAVY EQUIPMENT INTEL</div>
            {["2019 Cat 320, 4800hrs, $78k — buy or walk?","Red flags on high-hour excavators?","How do I negotiate at auction?"].map(q => (
              <button key={q} onClick={() => setInput(q)} className="block mx-auto mb-2 text-[11px] text-gray-600 border border-gray-800 px-3 py-1.5 rounded hover:border-amber-500 hover:text-amber-500 transition-colors bg-transparent">{q}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-amber-950/30 border border-amber-900/40 text-amber-100" : "bg-gray-900 border border-gray-800 text-gray-300"}`}>
              {m.role === "assistant" && <div className="text-[9px] text-amber-500 tracking-widest mb-1">BROKER</div>}
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="px-3 py-2 border border-gray-800 bg-gray-900 rounded text-[11px] text-amber-500 tracking-widest">ANALYZING...</div></div>}
        {error && <div className="text-center text-[11px] text-red-500">{error}</div>}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-gray-800 p-3 flex gap-2 bg-gray-900">
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Year, make, model, hours, condition..." rows={2} className="flex-1 bg-gray-950 border border-gray-800 text-gray-100 px-3 py-2 text-xs font-mono resize-none outline-none rounded focus:border-amber-500 transition-colors placeholder-gray-700" />
        <button onClick={sendMessage} disabled={loading || !input.trim()} className="px-4 text-[11px] font-bold tracking-widest rounded disabled:bg-gray-900 disabled:text-gray-700 bg-amber-500 text-gray-950 hover:bg-amber-400">SEND</button>
      </div>
    </div>
  );
}
