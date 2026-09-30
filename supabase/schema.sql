-- Ressler Training Hub schema
-- Run this once in the Supabase SQL editor for a fresh project.

create extension if not exists "pgcrypto";

-- Stores and shared workspaces (the Chevy/Toyota BDC shows under both stores)
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_name text not null,
  accent text not null default '#d9a72a',
  sort_order int not null default 0,
  is_bdc boolean not null default false,
  shows_under text[] not null default '{}',   -- slugs of stores this workspace appears under
  locations text[] not null default '{}',     -- sub-locations, e.g. Danhof, Belgrade
  created_at timestamptz not null default now()
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  role text not null default 'Salesperson',   -- Salesperson, BDC Agent, Manager, GM, Service Advisor, Other
  location text,                              -- e.g. Danhof, Belgrade
  active boolean not null default true,
  notes text,                                 -- trainer notes, shown only on person page
  created_at timestamptz not null default now()
);
create index if not exists people_store_idx on people(store_id);

create table if not exists initiatives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active',      -- planning, active, sustaining, done
  goal_text text,
  start_date date,
  store_ids uuid[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists initiative_people (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiatives(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  status text not null default 'not_started', -- not_started, trained, needs_followup, solid
  trained_on date,
  notes text,
  updated_at timestamptz not null default now(),
  unique (initiative_id, person_id)
);

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  date date not null default current_date,
  focus text,                                 -- one line: what the visit was about
  summary text,                               -- shareable recap
  private_notes text,                         -- trainer-only observations, one click deeper
  initiative_ids uuid[] not null default '{}',
  people_ids uuid[] not null default '{}',
  next_visit_date date,
  next_visit_plan text,
  created_at timestamptz not null default now()
);
create index if not exists visits_store_idx on visits(store_id, date desc);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  initiative_id uuid references initiatives(id) on delete set null,
  person_id uuid references people(id) on delete set null,
  visit_id uuid references visits(id) on delete set null,
  text text not null,
  due date,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists bookmarks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,  -- null = every store
  initiative_id uuid references initiatives(id) on delete cascade,
  title text not null,
  url text not null,
  kind text not null default 'report',        -- report, tool, doc
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiatives(id) on delete cascade,
  title text not null,
  kind text not null default 'link',          -- script, word_track, video, doc, link
  url text,
  body text,                                  -- inline word track or notes
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid references initiatives(id) on delete cascade,
  store_id uuid references stores(id) on delete cascade,
  name text not null,
  unit text not null default '%',
  target numeric,
  direction text not null default 'up',       -- up = higher is better, down = lower is better
  created_at timestamptz not null default now()
);

create table if not exists goal_entries (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  date date not null default current_date,
  value numeric not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists goal_entries_goal_idx on goal_entries(goal_id, date);

create table if not exists wins (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  initiative_id uuid references initiatives(id) on delete set null,
  person_id uuid references people(id) on delete set null,
  date date not null default current_date,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists commitments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  initiative_id uuid references initiatives(id) on delete set null,
  owner text not null,                        -- manager name
  text text not null,
  status text not null default 'on_track',    -- on_track, slipping, dropped, done
  checked_at date,
  notes text,
  created_at timestamptz not null default now()
);

-- Month rhythm: reflect (days 1-3), track (4-20), close (21-end)
alter table goals add column if not exists kind text not null default 'rate';  -- rate or count (count = month-to-date total, gets projected)

create table if not exists month_plans (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,  -- null = group-wide
  month text not null,                                    -- YYYY-MM
  lessons text,                                           -- what we learned from last month
  focus text,                                             -- what we're focused on this month
  updated_at timestamptz not null default now(),
  unique nulls not distinct (store_id, month)
);

create table if not exists playbook_items (
  id uuid primary key default gen_random_uuid(),
  phase text not null,                                    -- reflect, track, close
  store_id uuid references stores(id) on delete cascade,  -- null = every store
  text text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists playbook_checks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references playbook_items(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  month text not null,
  created_at timestamptz not null default now(),
  unique (item_id, store_id, month)
);

-- Notes, questions, and ideas posted by GMs and managers
create table if not exists store_posts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  author text not null default 'Anonymous',
  kind text not null default 'note',     -- note, question, idea
  body text not null,
  status text not null default 'open',   -- open, answered, closed
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists store_posts_store_idx on store_posts(store_id, created_at desc);

-- Chat history so Laura can scroll back
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  role text not null,                         -- user, assistant
  content text not null,
  created_at timestamptz not null default now()
);

-- Lock everything down. The app talks to the database with the service role key
-- from the server only, so no anon access is needed.
alter table stores enable row level security;
alter table people enable row level security;
alter table initiatives enable row level security;
alter table initiative_people enable row level security;
alter table visits enable row level security;
alter table todos enable row level security;
alter table bookmarks enable row level security;
alter table resources enable row level security;
alter table goals enable row level security;
alter table goal_entries enable row level security;
alter table wins enable row level security;
alter table commitments enable row level security;
alter table chat_messages enable row level security;
alter table month_plans enable row level security;
alter table playbook_items enable row level security;
alter table playbook_checks enable row level security;
alter table store_posts enable row level security;

-- Seed stores
insert into stores (slug, name, short_name, accent, sort_order, is_bdc, shows_under, locations) values
  ('chevrolet',  'Ressler Chevrolet',        'Chevrolet',  '#d9a72a', 1, false, '{}', '{"Danhof","Belgrade"}'),
  ('toyota',     'Toyota of Bozeman',        'Toyota',     '#e0483e', 2, false, '{}', '{}'),
  ('subaru',     'Gallatin Subaru',          'Subaru',     '#2f6fd6', 3, false, '{}', '{}'),
  ('livingston', 'Livingston Motor Company', 'Livingston', '#3f9d5a', 4, false, '{}', '{}'),
  ('sales-bdc',  'Sales BDC (Chevy + Toyota)', 'Sales BDC', '#8b6cc9', 5, true, '{"chevrolet","toyota"}', '{}')
on conflict (slug) do nothing;

-- Starter checklists for each phase. They're editable in the app, so delete or reword freely.
insert into playbook_items (phase, text, sort_order)
select * from (values
  ('reflect', 'Review last month''s numbers with the GM', 1),
  ('reflect', 'Pick this month''s focus and share it at the first huddle', 2),
  ('reflect', 'Update the roster for new hires and departures', 3),
  ('track',   'Mid-month check: goals posted and huddles happening', 1),
  ('track',   'Role play with anyone marked Follow up', 2),
  ('track',   'Check manager commitments in person', 3),
  ('close',   'Work the unsold showroom and lead list from this month', 1),
  ('close',   'BDC call-down on open appointments that didn''t show', 2),
  ('close',   'Daily appointment count posted where the floor can see it', 3),
  ('close',   'Celebrate every deal out loud', 4)
) as v(phase, text, sort_order)
where not exists (select 1 from playbook_items);
