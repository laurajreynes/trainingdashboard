import Link from "next/link";
import { configured } from "@/lib/supabase";
import { isEditor } from "@/lib/auth";
import { getStores } from "@/lib/data";
import { logout } from "@/app/actions";
import { navOrder } from "@/lib/fmt";
import { StoreNav } from "./StoreNav";
import { MobileNav } from "./MobileNav";

export async function Shell({ children }: { children: React.ReactNode }) {
  const ready = configured();
  const editor = ready ? await isEditor() : false;
  let stores: Awaited<ReturnType<typeof getStores>> = [];
  if (ready) {
    try { stores = await getStores(); } catch { stores = []; }
  }
  const primary = navOrder(stores);

  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand"><i aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="44" cy="22" r="7" fill="#e3c27a" /><path d="M4 50 L20 26 L29 38 L38 22 L60 50 Z" fill="#8fc5a3" /><path d="M4 50 L16 36 L26 44 L36 34 L48 46 L60 50 Z" fill="#dfeee4" /></svg></i>Ressler <span>Training</span></Link>
        <StoreNav stores={primary} />
        <nav className="utilnav">
          <Link href="/tracking">Tracking</Link>
          <Link href="/group">Group</Link>
          <Link href="/initiatives">Initiatives</Link>
          <Link href="/marketing">Marketing</Link>
          <Link href="/people">People</Link>
          <Link href="/todos">To-dos</Link>
          <Link href="/examples">Examples</Link>
          <Link href="/chat">Ask</Link>
          <Link href="/recap">Recap</Link>
          {editor ? (
            <form action={logout}><button type="submit" className="pill" title="You can edit. Click to sign out.">Editing</button></form>
          ) : (
            <Link href="/login" className="faint">Sign in</Link>
          )}
        </nav>
      </header>
      <main className="page">
        {!ready ? (
          <div className="notice bad">
            <strong>Not connected to Supabase yet.</strong> Set <code>SUPABASE_URL</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>, and <code>HUB_PASSCODE</code> in the Vercel project, run <code>supabase/schema.sql</code>, and redeploy.
          </div>
        ) : children}
      </main>
      {ready && <MobileNav />}
    </>
  );
}
