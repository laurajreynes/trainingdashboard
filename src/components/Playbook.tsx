import { saveGroupNote } from "@/app/actions";

/**
 * The store's playbook and where it stands. Lives in the playbook:<store slug> group note:
 *   url | title | status | note
 * status: draft (grey), review (amber: awaiting approval), approved (green), shipped (green: the one people use).
 */
export type PlaybookInfo = { url: string; title: string; status: "draft" | "review" | "approved" | "shipped"; note: string };

export function parsePlaybook(body: string | null | undefined): PlaybookInfo | null {
  if (!body) return null;
  const [url = "", title = "", status = "draft", note = ""] = body.split("|").map((x) => x.trim());
  if (!url) return null;
  const st = (["draft", "review", "approved", "shipped"].includes(status) ? status : "draft") as PlaybookInfo["status"];
  return { url, title: title || "Playbook", status: st, note };
}

const LABEL: Record<PlaybookInfo["status"], string> = { draft: "Draft", review: "Awaiting approval", approved: "Approved", shipped: "In use" };

export function PlaybookCard({ storeSlug, body, editor, compact }: { storeSlug: string; body: string | null; editor: boolean; compact?: boolean }) {
  const pb = parsePlaybook(body);
  if (!pb && !editor) return null;
  return (
    <section className={`card playbook ${pb ? `pb-${pb.status}` : "pb-none"}`}>
      {pb ? (
        <div className="pbrow">
          <span className={`pblight pb-${pb.status}`} aria-hidden="true" />
          <div className="grow">
            <div className="pbtitle"><a href={pb.url} target="_blank" rel="noreferrer">{pb.title}</a></div>
            {pb.note && !compact && <div className="small muted">{pb.note}</div>}
          </div>
          <span className={`tag pbtag pb-${pb.status}`}>{LABEL[pb.status]}</span>
        </div>
      ) : <p className="empty">No playbook yet</p>}
      {editor && (
        <details className="quiet" style={{ marginTop: 8 }}>
          <summary className="small">{pb ? "Update status" : "Add the playbook"}</summary>
          <form action={saveGroupNote} style={{ marginTop: 6 }}>
            <input type="hidden" name="key" value={`playbook:${storeSlug}`} />
            <PlaybookEditor pb={pb} />
            <button className="btn sm ghost" style={{ marginTop: 4 }}>Save</button>
          </form>
        </details>
      )}
    </section>
  );
}

/** One line in the note; the form composes it from four fields so the status is a pick, not a typo. */
function PlaybookEditor({ pb }: { pb: PlaybookInfo | null }) {
  return (
    <>
      <div className="frow"><input type="url" name="pb_url" placeholder="https://" defaultValue={pb?.url || ""} required /><input type="text" name="pb_title" placeholder="Title" defaultValue={pb?.title || ""} /></div>
      <div className="frow" style={{ marginTop: 6 }}>
        <select name="pb_status" defaultValue={pb?.status || "review"}>
          <option value="draft">Draft</option><option value="review">Awaiting approval</option><option value="approved">Approved</option><option value="shipped">In use</option>
        </select>
        <input type="text" name="pb_note" placeholder="Who has it, what's next" defaultValue={pb?.note || ""} />
      </div>
      <input type="hidden" name="compose" value="playbook" />
    </>
  );
}
