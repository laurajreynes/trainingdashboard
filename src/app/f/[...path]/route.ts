import { NextResponse } from "next/server";
import { db, configured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Opens a file kept in the private bucket by handing out a short-lived signed link. */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  if (!configured()) return new NextResponse("Not configured", { status: 500 });
  const { path } = await ctx.params;
  const key = path.map(decodeURIComponent).join("/");
  if (!key.startsWith("files/") || key.includes("..")) return new NextResponse("Not found", { status: 404 });
  const r = await db().storage.from("examples").createSignedUrl(key, 60 * 10);
  if (r.error || !r.data?.signedUrl) return new NextResponse("Not found", { status: 404 });
  // Office files open in the browser's viewer instead of downloading; PDFs and images render on their own.
  if (/\.(docx?|pptx?|xlsx?)$/i.test(key)) return NextResponse.redirect(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(r.data.signedUrl)}`, 302);
  return NextResponse.redirect(r.data.signedUrl, 302);
}
