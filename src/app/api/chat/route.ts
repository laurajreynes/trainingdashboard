import Anthropic from "@anthropic-ai/sdk";
import { isEditor } from "@/lib/auth";
import { buildHubContext } from "@/lib/context";
import { getChat } from "@/lib/data";
import { db } from "@/lib/supabase";
import { monthPhase, PHASE_LABEL } from "@/lib/month";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `You are the analyst inside the Ressler Training Hub, a tool the group's sales trainer uses to track training initiatives, store visits, staff progress, goals, to-dos, manager commitments, and wins across Ressler Chevrolet (with Danhof and Belgrade), Toyota of Bozeman, Gallatin Subaru, Livingston Motor Company, and the shared Chevy/Toyota sales BDC.

You answer questions about what the data shows: where training time has gone, who has and hasn't been trained on what, which goals are moving, which stores or people look like the next opportunity, what's slipping, and what to do next. Ground every claim in the hub data you're given. When the data is thin, say so plainly and say what would need to be logged to answer well. Don't invent people, numbers, or visits.

Voice: direct, practical, human. Lead with the answer. Short paragraphs, plain lists when comparing. No em dashes. No filler. You may use trainer notes in your reasoning; when you quote them, keep it brief and useful. Today's date is {today}.`;

export async function POST(req: Request) {
  const open = process.env.CHAT_PUBLIC === "true";
  if (!open && !(await isEditor())) {
    return new Response("Sign in with the trainer passcode to use the assistant.", { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY is not set on the server.", { status: 500 });
  }
  const { message } = (await req.json()) as { message?: string };
  const text = (message || "").trim();
  if (!text) return new Response("Empty message", { status: 400 });

  const [context, history] = await Promise.all([buildHubContext(), getChat(20)]);
  await db().from("chat_messages").insert({ role: "user", content: text });

  const client = new Anthropic();
  const phase = monthPhase();
  const todayLabel = new Date().toLocaleDateString("en-US", { timeZone: "America/Denver", weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const today = `${todayLabel} (day ${phase.day} of ${phase.daysInMonth}; month phase: ${PHASE_LABEL[phase.phase]}. Reflect and set = days 1-3, look back and set focus. Track = days 4-20, check activities and pace. Close strong = day 21 on, push appointments and deals. Match your emphasis to the phase unless asked otherwise.)`;
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: text },
  ];

  const stream = client.messages.stream({
    model: process.env.CHAT_MODEL || "claude-sonnet-5-5",
    max_tokens: 1500,
    system: [
      { type: "text", text: SYSTEM.replace("{today}", today) },
      { type: "text", text: `HUB DATA\n\n${context}`, cache_control: { type: "ephemeral" } },
    ],
    messages,
  });

  const encoder = new TextEncoder();
  let full = "";
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            full += ev.delta.text;
            controller.enqueue(encoder.encode(ev.delta.text));
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        controller.enqueue(encoder.encode(`\n\n[error: ${msg}]`));
      } finally {
        if (full.trim()) await db().from("chat_messages").insert({ role: "assistant", content: full });
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
