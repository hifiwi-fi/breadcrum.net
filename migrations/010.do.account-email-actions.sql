alter table users
  add column email_verify_token text,
  add column email_verify_token_exp timestamptz,
  add column pending_email_update email_address,
  add column pending_email_update_token text,
  add column pending_email_update_token_exp timestamptz,
  add column password_reset_token text,
  add column password_reset_token_exp timestamptz;

create table sns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  body jsonb not null
);

create trigger set_timestamp_sns
  before update on sns
  for each row
  execute procedure trigger_set_timestamp();

create table email_blackhole (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email email_address unique not null,
  bounce_count bigint not null default 0,
  disabled boolean not null default true
);

create trigger set_timestamp_email_blackhole
  before update on email_blackhole
  for each row
  execute procedure trigger_set_timestamp();
