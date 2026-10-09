/** Initiative description: paragraphs, with any line starting with "!" shown as a highlighted callout. */
export function Desc({ text, small }: { text: string; small?: boolean }) {
  const blocks = text.split(/\r?\n\s*\r?\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={`desc${small ? " small" : ""}`}>
      {blocks.map((b, i) => b.startsWith("!")
        ? <p key={i} className="callout">{b.replace(/^!\s*/, "")}</p>
        : <p key={i} className="pre muted">{b}</p>)}
    </div>
  );
}
