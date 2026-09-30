import Link from "next/link";
import type { Store, StorePost } from "@/lib/types";
import { POST_KIND_LABEL } from "@/lib/types";
import { fmtDate } from "@/lib/fmt";
import { addStorePost, replyStorePost, deleteStorePost, storePostToTodo } from "@/app/actions";

const kindClass = (k: StorePost["kind"]) => (k === "question" ? "info" : k === "idea" ? "gold" : "");


/* Small inline icons so they match the type and work in light and dark */
export function IconQuestion({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" /><circle cx="12" cy="17.5" r="0.6" fill="currentColor" />
    </svg>
  );
}
export function IconBulb({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6" /><path d="M10 21.5h4" /><path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.3 1 2.1V17h6v-.8c0-.8.4-1.5 1-2.1a6.5 6.5 0 0 0-4-11.6z" />
    </svg>
  );
}
export function IconNote({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16v12l-4 4H4z" /><path d="M16 20v-4h4" /><path d="M8 9h8M8 13h5" />
    </svg>
  );
}
const KIND_ICON = { question: IconQuestion, idea: IconBulb, note: IconNote } as const;

function KindTag({ k }: { k: StorePost["kind"] }) {
  const I = KIND_ICON[k];
  return <span className={`tag kindtag ${kindClass(k)}`} style={{ marginTop: 2 }}><I size={12} />{POST_KIND_LABEL[k]}</span>;
}

function NotesTitle({ open }: { open: number }) {
  return (
    <div className="cardhead">
      <h2 className="noteshead"><span className="notesicons"><IconBulb size={18} /><IconQuestion size={18} /></span>Store notes</h2>
      {open > 0 && <span className="tag info">{open} open</span>}
    </div>
  );
}

function when(iso: string) {
  return fmtDate(new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Denver" }));
}

/** One post with Laura's reply controls. */
export function PostItem({ p, editor, storeLabel }: { p: StorePost; editor: boolean; storeLabel?: string }) {
  return (
    <li>
      <KindTag k={p.kind} />
      <div className="grow">
        <div className="pre">{p.body}</div>
        <div className="meta">{p.author} · {when(p.created_at)}{storeLabel ? ` · ${storeLabel}` : ""}{p.status === "closed" ? " · closed" : ""}</div>
        {p.reply && (
          <div className="reply">
            <span className="eyebrow">Laura</span>
            <div className="pre small">{p.reply}</div>
          </div>
        )}
        {editor && (
          <details className="quiet" style={{ borderTop: 0, marginTop: 4, paddingTop: 0 }}>
            <summary>{p.reply ? "Edit reply" : "Reply"}</summary>
            <form action={replyStorePost} style={{ marginTop: 6 }}>
              <input type="hidden" name="id" value={p.id} />
              <textarea name="reply" defaultValue={p.reply || ""} placeholder="Your answer, visible to the store" style={{ minHeight: 60 }} />
              <div className="inline" style={{ marginTop: 6 }}>
                <select name="status" defaultValue={p.status === "open" ? "answered" : p.status} style={{ width: "auto", padding: "3px 6px", fontSize: 12 }}>
                  <option value="answered">Answered</option>
                  <option value="open">Keep open</option>
                  <option value="closed">Close</option>
                </select>
                <button className="btn sm">Save</button>
              </div>
            </form>
            <div className="inline" style={{ marginTop: 6 }}>
              <form action={storePostToTodo}><input type="hidden" name="id" value={p.id} /><button className="btn sm ghost">Make it a to-do</button></form>
              <form action={deleteStorePost}><input type="hidden" name="id" value={p.id} /><button className="btn sm danger">Delete</button></form>
            </div>
          </details>
        )}
      </div>
    </li>
  );
}

export function StoreNotes({ store, posts, editor, canPost, codeRequired, back, flash }: {
  store: Store; posts: StorePost[]; editor: boolean; canPost: boolean; codeRequired: boolean; back: string;
  flash?: "posted" | "badcode";
}) {
  const open = posts.filter((p) => p.status === "open");
  const rest = posts.filter((p) => p.status !== "open").slice(0, 6);
  return (
    <section className="card storenotes" id="store-notes">
      <NotesTitle open={open.length} />
      {flash === "posted" && <div className="notice small" style={{ marginBottom: 10 }}>Got it. Laura will see this on her dashboard.</div>}
      {flash === "badcode" && <div className="notice bad small" style={{ marginBottom: 10 }}>That store code didn&apos;t match.</div>}

      <details className="notesform" open={!editor}>
        <summary>{editor ? "Post a note" : "Got a question or an idea? Drop it here."}</summary>
        <form action={addStorePost}>
          <input type="hidden" name="store_id" value={store.id} />
          <input type="hidden" name="back" value={back} />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
          <div className="kindpick" role="radiogroup" aria-label="Type of note">
            {(["question", "idea", "note"] as const).map((k, i) => {
              const I = KIND_ICON[k];
              return (
                <label key={k} className={`kindopt k-${k}`}>
                  <input type="radio" name="kind" value={k} defaultChecked={i === 0} />
                  <I size={20} /><span>{POST_KIND_LABEL[k]}</span>
                </label>
              );
            })}
          </div>
          <div className="frow wide"><textarea name="body" required maxLength={4000} placeholder="Can we role play with the new hires next week? · Idea: put the appointment board up at the tower · Heads up, we're short two BDC agents Saturday" style={{ minHeight: 70 }} /></div>
          <div className="frow">
            <input type="text" name="author" placeholder="Your name" maxLength={80} required={!editor} defaultValue={editor ? "Laura" : ""} />
            {codeRequired && !canPost && <input type="password" name="code" placeholder="Store code" required />}
            <button className="btn gold sm">Post</button>
          </div>
          <p className="faint small">Anyone with the hub link can read these.</p>
        </form>
      </details>

      {posts.length > 0 ? (
        <ul className="list" style={{ marginTop: 12 }}>
          {open.map((p) => <PostItem key={p.id} p={p} editor={editor} />)}
          {rest.map((p) => <PostItem key={p.id} p={p} editor={editor} />)}
        </ul>
      ) : null}
    </section>
  );
}

/** Home page: open items across every store. */
export function OpenPosts({ posts, stores, editor }: { posts: StorePost[]; stores: Store[]; editor: boolean }) {
  const open = posts.filter((p) => p.status === "open");
  return (
    <section className="card">
      <NotesTitle open={open.length} />
      {open.length ? (
        <ul className="list">
          {open.slice(0, 8).map((p) => {
            const st = stores.find((s) => s.id === p.store_id);
            return <PostItem key={p.id} p={p} editor={editor} storeLabel={st?.short_name} />;
          })}
        </ul>
      ) : <p className="empty">Nothing waiting on you. GMs and managers post from their store page.</p>}
      {open.length > 8 && <p className="small faint" style={{ marginTop: 8 }}>{open.length - 8} more on the store pages</p>}
      {stores.length > 0 && open.length === 0 && (
        <p className="faint small" style={{ marginTop: 6 }}>{stores.filter((s) => !s.is_bdc).map((s, i) => <span key={s.id}>{i ? " · " : ""}<Link href={`/s/${s.slug}#store-notes`}>{s.short_name}</Link></span>)}</p>
      )}
    </section>
  );
}
