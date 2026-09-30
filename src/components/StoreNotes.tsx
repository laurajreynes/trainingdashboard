import Link from "next/link";
import type { Store, StorePost } from "@/lib/types";
import { POST_KIND_LABEL } from "@/lib/types";
import { fmtDate } from "@/lib/fmt";
import { addStorePost, replyStorePost, deleteStorePost, storePostToTodo } from "@/app/actions";

const kindClass = (k: StorePost["kind"]) => (k === "question" ? "info" : k === "idea" ? "gold" : "");

function when(iso: string) {
  return fmtDate(new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Denver" }));
}

/** One post with Laura's reply controls. */
export function PostItem({ p, editor, storeLabel }: { p: StorePost; editor: boolean; storeLabel?: string }) {
  return (
    <li>
      <span className={`tag ${kindClass(p.kind)}`} style={{ marginTop: 2 }}>{POST_KIND_LABEL[p.kind]}</span>
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
    <section className="card" id="store-notes">
      <div className="cardhead">
        <h2>Notes from the store</h2>
        {open.length > 0 && <span className="tag info">{open.length} open</span>}
      </div>
      {flash === "posted" && <div className="notice small" style={{ marginBottom: 10 }}>Posted. Laura will see it on her dashboard.</div>}
      {flash === "badcode" && <div className="notice bad small" style={{ marginBottom: 10 }}>That store code didn&apos;t match.</div>}

      <details className="adder" open={posts.length === 0 && !editor}>
        <summary>Post a note, question, or idea</summary>
        <form action={addStorePost} className="body">
          <input type="hidden" name="store_id" value={store.id} />
          <input type="hidden" name="back" value={back} />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
          <div className="chips" style={{ marginBottom: 8 }}>
            {(["question", "idea", "note"] as const).map((k, i) => (
              <label key={k} className="chip"><input type="radio" name="kind" value={k} defaultChecked={i === 0} />{POST_KIND_LABEL[k]}</label>
            ))}
          </div>
          <div className="frow wide"><textarea name="body" required maxLength={4000} placeholder="Can we get the new hires in a role play next week? / Idea: post the appointment board at the tower / FYI we're short two BDC agents Saturday" style={{ minHeight: 70 }} /></div>
          <div className="frow">
            <input type="text" name="author" placeholder="Your name" maxLength={80} required={!editor} defaultValue={editor ? "Laura" : ""} />
            {codeRequired && !canPost && <input type="password" name="code" placeholder="Store code" required />}
            <button className="btn sm">Post</button>
          </div>
          <p className="faint small">Anyone with the hub link can read posts.</p>
        </form>
      </details>

      {posts.length > 0 ? (
        <ul className="list" style={{ marginTop: 12 }}>
          {open.map((p) => <PostItem key={p.id} p={p} editor={editor} />)}
          {rest.map((p) => <PostItem key={p.id} p={p} editor={editor} />)}
        </ul>
      ) : <p className="empty" style={{ marginTop: 10 }}>Nothing posted yet</p>}
    </section>
  );
}

/** Home page: open items across every store. */
export function OpenPosts({ posts, stores, editor }: { posts: StorePost[]; stores: Store[]; editor: boolean }) {
  const open = posts.filter((p) => p.status === "open");
  return (
    <section className="card">
      <div className="cardhead"><h2>From the stores</h2>{open.length > 0 && <span className="tag info">{open.length} open</span>}</div>
      {open.length ? (
        <ul className="list">
          {open.slice(0, 8).map((p) => {
            const st = stores.find((s) => s.id === p.store_id);
            return <PostItem key={p.id} p={p} editor={editor} storeLabel={st?.short_name} />;
          })}
        </ul>
      ) : <p className="empty">Nothing waiting on you. Managers can post from their store page.</p>}
      {open.length > 8 && <p className="small faint" style={{ marginTop: 8 }}>{open.length - 8} more on the store pages</p>}
      {stores.length > 0 && open.length === 0 && (
        <p className="faint small" style={{ marginTop: 6 }}>{stores.filter((s) => !s.is_bdc).map((s, i) => <span key={s.id}>{i ? " · " : ""}<Link href={`/s/${s.slug}#store-notes`}>{s.short_name}</Link></span>)}</p>
      )}
    </section>
  );
}
