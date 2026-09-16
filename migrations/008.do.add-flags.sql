create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text unique not null,
  value jsonb not null
);

create trigger set_timestamp_feature_flags
  before update on feature_flags
  for each row
  execute procedure trigger_set_timestamp();

alter table users
  add column admin boolean not null default false;
