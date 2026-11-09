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

`/phones` shows inbound request and set rates, outbound call volume, live conversation and appointment set rates by team, month to date, plus outbound calls a selling day by week. Everything comes from Car Wars Staff Activity, one row per person, added up by the Car Wars group each person is in (Manage Groups in Car Wars is the roster). Gallatin Subaru is its own Car Wars account; Chevrolet, Toyota, Belgrade, Danhof and the Ressler BDC share one.

To refresh: in a tab signed in to Car Wars, run `phonesPull({ month, hub, key })` from `scripts/phones_pull.js`. It reads both accounts and posts each to `/api/phones` with the hub passcode. A daily scheduled task does this through the browser pane on Laura's computer and carries its own copy of the function, so change both together. The page's Updated chip comes from the pull time. Starting numbers live in `src/lib/phones-seed.ts`.
