import "server-only";

/** The Chevrolet showroom appointment board (ressler-chevrolet.vercel.app) embeds its DriveCentric numbers in the page. */
export type BoardRow = { name: string; set: number; shown: number };
export type Board = { updatedAt: string | null; week: { label: string; rows: BoardRow[] }; mtd: { label: string; rows: BoardRow[] } };

const BOARDS: Record<string, string> = { chevrolet: "https://ressler-chevrolet.vercel.app/" };

export async function getBoard(slug: string): Promise<Board | null> {
  const url = BOARDS[slug]; if (!url) return null;
  try {
    const r = await fetch(url, { next: { revalidate: 1800 } });
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/<script[^>]*id="board-data"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) return null;
    const d = JSON.parse(m[1]) as Board;
    const clean = (rows: BoardRow[]) => (rows || []).map((x) => ({ name: x.name, set: +x.set || 0, shown: +x.shown || 0 })).filter((x) => !/^(JT|John)/i.test(x.name));
    return { updatedAt: d.updatedAt || null, week: { label: d.week?.label || "", rows: clean(d.week?.rows) }, mtd: { label: d.mtd?.label || "", rows: clean(d.mtd?.rows) } };
  } catch { return null; }
}
export const boardUrl = (slug: string) => BOARDS[slug] || null;
