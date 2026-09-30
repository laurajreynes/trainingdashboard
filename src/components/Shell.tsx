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
        <Link href="/" className="brand"><i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16" /><path d="M7 15V9" /><path d="M12 15V5" /><path d="M17 15v-4" /></svg></i>Ressler <span>Training</span></Link>
        <StoreNav stores={primary} />
        <nav className="utilnav">
          <Link href="/group">Group</Link>
          <Link href="/initiatives">Initiatives</Link>
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
