"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS: Record<string, string[]> = {
  reflect: [
    "What did last month teach us, store by store?",
    "Where did my training time go last month?",
    "What should each store focus on this month?",
    "Who got left behind on the active initiatives?",
  ],
  track: [
    "Which goals are on pace and which aren't?",
    "Who hasn't been trained on the active initiatives yet?",
    "Which store looks like the biggest opportunity right now?",
    "What's slipping with manager commitments?",
  ],
  close: [
    "Where can we still pick up deals before month end?",
    "Who needs a push in the last stretch?",
    "What's the gap to goal at each store?",
    "What should I do at each store before the month closes?",
  ],
};

export function ChatClient({ initial, enabled, phase }: { initial: Msg[]; enabled: boolean; phase: string }) {
  const suggestions = SUGGESTIONS[phase] || SUGGESTIONS.track;
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy || !enabled) return;
    setInput("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", content: t }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: t }) });
      if (!res.ok || !res.body) {
        const err = await res.text();
        setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: err || "Something went wrong." }; return c; });
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        const snapshot = acc;
        setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: snapshot }; return c; });
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : "Something went wrong.";
      setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: err }; return c; });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat">
      {msgs.length === 0 && (
        <div className="suggest">
          {suggestions.map((s) => <button key={s} onClick={() => send(s)} disabled={!enabled}>{s}</button>)}
        </div>
      )}
      <div className="msgs">
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role} ${m.role === "assistant" && !m.content ? "thinking" : ""}`}>
            {m.content || "Thinking…"}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {msgs.length > 0 && !busy && (
        <div className="suggest">
          {suggestions.slice(0, 3).map((s) => <button key={s} onClick={() => send(s)} disabled={!enabled}>{s}</button>)}
        </div>
      )}
      <form className="chatform" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder={enabled ? "Ask about results, focus, or opportunity…" : "Sign in to ask"}
          disabled={!enabled || busy}
          rows={1}
        />
        <button className="btn gold" type="submit" disabled={!enabled || busy}>{busy ? "…" : "Ask"}</button>
      </form>
    </div>
  );
}
