import { login } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ bad?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="login card">
      <div className="eyebrow">Trainer sign in</div>
      <h1 style={{ marginBottom: 12 }}>Passcode</h1>
      <p className="muted small">Anyone can read the hub. Editing needs the passcode.</p>
      {sp.bad && <div className="notice bad small" style={{ margin: "10px 0" }}>That passcode didn&apos;t match.</div>}
      <form action={login} style={{ marginTop: 12 }}>
        <input type="hidden" name="next" value={sp.next || "/"} />
        <div className="frow wide"><input type="password" name="passcode" placeholder="Passcode" autoFocus required /></div>
        <button className="btn gold" type="submit">Sign in</button>
      </form>
    </div>
  );
}
