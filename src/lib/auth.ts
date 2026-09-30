import "server-only";
import { cookies } from "next/headers";
import { createHmac } from "crypto";

const COOKIE = "hub_editor";

function secret(): string {
  return process.env.HUB_PASSCODE || "";
}

export function tokenFor(passcode: string): string {
  return createHmac("sha256", "ressler-training-hub").update(passcode).digest("hex");
}

/** True when the current request carries a valid editor cookie. */
export async function isEditor(): Promise<boolean> {
  const pass = secret();
  if (!pass) return false;
  const store = await cookies();
  const v = store.get(COOKIE)?.value;
  return Boolean(v && v === tokenFor(pass));
}

export async function requireEditor(): Promise<void> {
  if (!(await isEditor())) {
    throw new Error("Editing requires the trainer passcode.");
  }
}

export async function setEditorCookie(passcode: string): Promise<boolean> {
  const pass = secret();
  if (!pass || passcode !== pass) return false;
  const store = await cookies();
  store.set(COOKIE, tokenFor(pass), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return true;
}

export async function clearEditorCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

// ---------- store managers ----------
// GMs and managers can post notes, questions, and ideas. If MANAGER_CODE is set,
// they enter it once and a cookie remembers them. If it's not set, posting is open.
const MGR_COOKIE = "hub_manager";

export function managerCodeRequired(): boolean {
  return Boolean(process.env.MANAGER_CODE);
}

export async function canPost(): Promise<boolean> {
  if (await isEditor()) return true;
  const code = process.env.MANAGER_CODE;
  if (!code) return true;
  const store = await cookies();
  return store.get(MGR_COOKIE)?.value === tokenFor("mgr:" + code);
}

/** Checks a submitted code and remembers the device if it matches. */
export async function acceptManagerCode(submitted: string | null): Promise<boolean> {
  if (await canPost()) return true;
  const code = process.env.MANAGER_CODE;
  if (!code || !submitted || submitted.trim() !== code) return false;
  const store = await cookies();
  store.set(MGR_COOKIE, tokenFor("mgr:" + code), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  return true;
}
