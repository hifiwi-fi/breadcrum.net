-- Add registration tracking fields to users table
alter table users
  add column registration_ip inet,
  add column registration_user_agent text;

comment on column users.registration_ip is 'IP address used during account registration';
comment on column users.registration_user_agent is 'User agent string from browser/client during account registration';