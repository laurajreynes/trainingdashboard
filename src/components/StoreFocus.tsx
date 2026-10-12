import { Desc } from "@/components/Desc";
import { saveGroupNote } from "@/app/actions";

/** The short "What I'm focused on" block at the top of a store page: the same words the GM got in the email. */
export function StoreFocus({ storeId, body, editor }: { storeId: string; body: string | null; editor: boolean }) {
  if (!body && !editor) return null;
  return (
    <section className="card focusblock">
      <div className="cardhead"><h2>What I&apos;m focused on</h2></div>
      {body ? <Desc text={body} /> : <p className="empty">Nothing written yet</p>}
      {editor && (
        <details className="quiet" style={{ marginTop: 8 }}>
          <summary className="small">Edit</summary>
          <form action={saveGroupNote} style={{ marginTop: 6 }}>
            <input type="hidden" name="key" value={`focus:${storeId}`} />
            <textarea name="body" defaultValue={body || ""} placeholder="Three or four plain lines. What you're working on here, what's next, what you're watching." style={{ minHeight: 90 }} />
            <button className="btn sm ghost" style={{ marginTop: 4 }}>Save</button>
          </form>
        </details>
      )}
    </section>
  );
}
