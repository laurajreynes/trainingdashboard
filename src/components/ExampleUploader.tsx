"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createExampleUpload, addExample } from "@/app/actions";

type Opt = { id: string; name: string; sub?: string };
type Props = {
  people: Opt[];
  initiatives: Opt[];
  stores: Opt[];
  themes: string[];
  defaults?: { personIds?: string[]; initiativeId?: string; storeId?: string; theme?: string };
  compact?: boolean;
};

type Item = { file: File; preview: string; status: "queued" | "uploading" | "done" | "error"; error?: string };

const MAX_EDGE = 1800;

/** Shrink big screenshots in the browser so uploads are quick and the gallery stays fast. */
async function shrink(file: File): Promise<{ blob: Blob; type: string; width: number; height: number }> {
  if (file.type === "image/gif") return { blob: file, type: file.type, width: 0, height: 0 };
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } catch { return { blob: file, type: file.type || "image/jpeg", width: 0, height: 0 }; }
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const tryType = async (t: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, t, q));
  // WebP keeps text screenshots crisp at a small size; fall back to JPEG for old browsers
  let blob = await tryType("image/webp", 0.88);
  let type = "image/webp";
  if (!blob || blob.type !== "image/webp") { blob = await tryType("image/jpeg", 0.88); type = "image/jpeg"; }
  if (!blob) return { blob: file, type: file.type || "image/jpeg", width: w, height: h };
  // If shrinking didn't help (tiny PNG), keep the original
  if (scale === 1 && blob.size >= file.size && file.type in { "image/png": 1, "image/jpeg": 1, "image/webp": 1 }) return { blob: file, type: file.type, width: w, height: h };
  return { blob, type, width: w, height: h };
}

export function ExampleUploader({ people, initiatives, stores, themes, defaults, compact }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [kind, setKind] = useState<"good" | "opportunity" | "pattern">("good");
  const [theme, setTheme] = useState(defaults?.theme || "");
  const [initiativeId, setInitiativeId] = useState(defaults?.initiativeId || "");
  const [storeId, setStoreId] = useState(defaults?.storeId || "");
  const [personIds, setPersonIds] = useState<string[]>(defaults?.personIds || []);
  const [caption, setCaption] = useState("");
  const [takenOn, setTakenOn] = useState("");
  const [personQuery, setPersonQuery] = useState("");
  const [open, setOpen] = useState(!compact);
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setOpen(true);
    setItems((prev) => [...prev, ...list.map((file) => ({ file, preview: URL.createObjectURL(file), status: "queued" as const }))]);
  }, []);

  // Paste a screenshot anywhere on the page
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith("image/"));
      if (files.length) { e.preventDefault(); addFiles(files); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.preview)), [items]);

  const visiblePeople = people.filter((p) => !personQuery || p.name.toLowerCase().includes(personQuery.toLowerCase()) || (p.sub || "").toLowerCase().includes(personQuery.toLowerCase()));
  const togglePerson = (id: string) => setPersonIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);

  async function upload() {
    if (!items.length || busy) return;
    setBusy(true);
    let n = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.status === "done") continue;
      setItems((cur) => cur.map((x, j) => j === i ? { ...x, status: "uploading" } : x));
      try {
        const { blob, type, width, height } = await shrink(it.file);
        const { path, signedUrl } = await createExampleUpload(type);
        const res = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": type, "x-upsert": "false", "cache-control": "max-age=31536000" }, body: blob });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        await addExample({
          path, contentType: type, width: width || null, height: height || null,
          caption: caption || null, kind, theme: theme || null, initiativeId: initiativeId || null, storeId: storeId || null,
          personIds, takenOn: takenOn || null,
        });
        n++;
        setItems((cur) => cur.map((x, j) => j === i ? { ...x, status: "done" } : x));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed";
        setItems((cur) => cur.map((x, j) => j === i ? { ...x, status: "error", error: msg } : x));
      }
    }
    setBusy(false);
    setDone(n);
    if (n) {
      setItems((cur) => cur.filter((x) => x.status !== "done"));
      setCaption("");
      router.refresh();
    }
  }

  return (
    <div className="uploader">
      <div
        ref={zoneRef}
        className="dropzone"
        onDragOver={(e) => { e.preventDefault(); zoneRef.current?.classList.add("over"); }}
        onDragLeave={() => zoneRef.current?.classList.remove("over")}
        onDrop={(e) => { e.preventDefault(); zoneRef.current?.classList.remove("over"); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
        <strong>Add screenshots</strong>
        <span className="muted small">Tap to pick, drag them here, or paste one from your clipboard</span>
      </div>

      {done > 0 && items.length === 0 && <div className="notice small" style={{ marginTop: 8 }}>{done} added.</div>}

      {items.length > 0 && (
        <div className="thumbs" style={{ marginTop: 10 }}>
          {items.map((it, i) => (
            <div key={i} className={`thumb ${it.status}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.preview} alt="" />
              {it.status === "uploading" && <span className="badge">Uploading…</span>}
              {it.status === "error" && <span className="badge bad" title={it.error}>Failed</span>}
              {it.status === "queued" && !busy && <button type="button" className="thumbx" onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))} aria-label="Remove">×</button>}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="upmeta">
          <div className="kindpick" style={{ marginTop: 10 }}>
            {(["good", "opportunity", "pattern"] as const).map((k) => (
              <label key={k} className={`kindopt k-${k} ${kind === k ? "on" : ""}`}>
                <input type="radio" name="ex_kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
                <span>{k === "good" ? "Good example" : k === "opportunity" ? "Opportunity" : "Pattern"}</span>
              </label>
            ))}
          </div>
          <div className="frow">
            <label className="f">Theme
              <input type="text" list="ex-themes" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Appointment offer, trade handling, follow-up text…" />
              <datalist id="ex-themes">{themes.map((t) => <option key={t} value={t} />)}</datalist>
            </label>
            <label className="f">Initiative
              <select value={initiativeId} onChange={(e) => setInitiativeId(e.target.value)}>
                <option value="">None</option>
                {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </label>
            <label className="f">Store
              <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                <option value="">Any</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="f">Date<input type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} /></label>
          </div>
          <label className="f">Who&apos;s in it
            <input type="text" value={personQuery} onChange={(e) => setPersonQuery(e.target.value)} placeholder="Type a name to filter" style={{ marginBottom: 6 }} />
          </label>
          <div className="chips" style={{ maxHeight: 130, overflowY: "auto", marginBottom: 10 }}>
            {personIds.filter((id) => !visiblePeople.some((p) => p.id === id)).map((id) => {
              const p = people.find((x) => x.id === id);
              return p ? <label key={id} className="chip"><input type="checkbox" checked onChange={() => togglePerson(id)} />{p.name}</label> : null;
            })}
            {visiblePeople.map((p) => (
              <label key={p.id} className="chip"><input type="checkbox" checked={personIds.includes(p.id)} onChange={() => togglePerson(p.id)} />{p.name}{p.sub ? <span className="faint"> {p.sub}</span> : null}</label>
            ))}
            {!people.length && <span className="faint small">Add people first</span>}
          </div>
          <div className="frow wide">
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="What to notice. Applies to every screenshot in this batch." style={{ minHeight: 56 }} />
          </div>
          <div className="inline">
            <button type="button" className="btn gold" disabled={!items.length || busy} onClick={upload}>
              {busy ? "Uploading…" : items.length > 1 ? `Save ${items.length} examples` : "Save example"}
            </button>
            {items.length > 0 && !busy && <button type="button" className="btn ghost sm" onClick={() => setItems([])}>Clear</button>}
          </div>
        </div>
      )}
    </div>
  );
}
