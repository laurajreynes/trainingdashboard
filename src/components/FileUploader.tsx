"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createFileUpload, addFileBookmark } from "@/app/actions";

type Props = { storeId?: string | null; initiativeId?: string | null; kind?: string; label?: string };

/** Drop a PDF or spreadsheet here and it shows up as a clickable report on this page. */
export function FileUploader({ storeId, initiativeId, kind = "report", label = "Upload a report" }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
  };

  const go = async () => {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      const { path, signedUrl } = await createFileUpload(file.type || "application/octet-stream", file.name);
      const put = await fetch(signedUrl, { method: "PUT", headers: { "content-type": file.type || "application/octet-stream" }, body: file });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      await addFileBookmark({ path, title, kind, storeId: storeId || null, initiativeId: initiativeId || null });
      setFile(null); setTitle(""); if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <div className="fileup">
      <div className="frow">
        <input ref={inputRef} type="file" accept=".pdf,.csv,.xlsx,.xls,.docx,.doc,.pptx,image/*" onChange={(e) => pick(e.target.files?.[0] || null)} />
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (Sales Staff Productivity, September)" />
        <button type="button" className="btn sm" disabled={!file || busy} onClick={go}>{busy ? "Uploading…" : label}</button>
      </div>
      {err && <p className="small" style={{ color: "var(--bad)" }}>{err}</p>}
    </div>
  );
}
