import { isEditor } from "@/lib/auth";
import { getChat } from "@/lib/data";
import { clearChat } from "@/app/actions";
import { ChatClient } from "@/components/ChatClient";
import { monthPhase } from "@/lib/month";

export const dynamic = "force-dynamic";

export default async function Chat() {
  const [editor, history] = await Promise.all([isEditor(), getChat(60)]);
  const open = process.env.CHAT_PUBLIC === "true";
  const canAsk = editor || open;
  const keyed = Boolean(process.env.ANTHROPIC_API_KEY);
  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Ask the hub</div>
          <h1>Where has training been, and where should it go?</h1>
          <div className="sub small">Answers come from the visits, rosters, goals, to-dos, and wins logged here. Thin data gets a thin answer.</div>
        </div>
        {editor && history.length > 0 && <form action={clearChat}><button className="btn ghost sm">Clear history</button></form>}
      </div>
      {!keyed && <div className="notice bad" style={{ marginBottom: 14 }}>The assistant needs <code>ANTHROPIC_API_KEY</code> set in Vercel.</div>}
      {!canAsk && <div className="notice" style={{ marginBottom: 14 }}>Sign in with the trainer passcode to ask questions.</div>}
      <ChatClient initial={history.map((m) => ({ role: m.role, content: m.content }))} enabled={canAsk && keyed} phase={monthPhase().phase} />
    </>
  );
}
