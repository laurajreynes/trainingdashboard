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
  return NextResponse.redirect(r.data.signedUrl, 302);
}
