# Ressler Training Hub

Training initiatives, store visits, staff progress, goals, to-dos, store notes, and a chat assistant across the Ressler stores. Next.js on Vercel, Supabase for the database.

## First-time setup

1. **Supabase**: create a project, open SQL Editor, paste `supabase/schema.sql`, run it.
2. **Vercel**: import this repo. Under Settings → Environment Variables add:

| Name | What |
|---|---|
| `SUPABASE_URL` | Project URL, like `https://abcd1234.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (`sb_secret_...`) from Project Settings → API Keys |
| `HUB_PASSCODE` | Passcode for editing (trainer) |
| `MANAGER_CODE` | Optional. Store code GMs enter once to post. Leave out for open posting |
| `ANTHROPIC_API_KEY` | For the Ask chat |
| `CHAT_MODEL` | Optional. Defaults to `claude-sonnet-5-5` |
| `CHAT_PUBLIC` | Optional. `true` lets anyone with the link use the chat. Default is trainer only |

3. Redeploy. Sign in at `/login` with the passcode, add people under People, create initiatives.

## Access model

- Anyone with the link can read everything.
- Editing (visits, rosters, goals, replies) needs the trainer passcode.
- GMs and managers post Store notes with the store code, remembered per device.
- The database is only reached from the server with the service role key. Row level security is on and there are no anon policies, so the Supabase URL alone gives nothing away.

## Month rhythm

Days 1 to 3: Reflect and set. Days 4 to 20: Track. Day 21 on: Close strong. Dates run in America/Denver. `?phase=reflect|track|close` previews any mode.

## Phones tab

`/phones` shows inbound request and set rates and outbound live conversation and appointment set rates by team, month to date, from Car Wars. Gallatin Subaru is its own Car Wars account. Chevrolet, Toyota, Belgrade, Danhof and the Ressler BDC share one, so their lines add up each person's CRISP counts by the Car Wars group they are in (Manage Groups in Car Wars is the roster).

To refresh: in a signed-in Car Wars tab, run `phonesPull("YYYY-MM")` from `scripts/phones_pull.js` once on each account and POST each result to `/api/phones` as `{ month, account, data }` with the hub passcode in `x-hub-key` (or as `key` in the body). The page's Updated chip comes from the pull time. Starting numbers live in `src/lib/phones-seed.ts`.
