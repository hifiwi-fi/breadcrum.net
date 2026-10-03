alter table users
  add column disabled boolean default false,
  add column disabled_reason text,
  add column internal_note text;

comment on column users.disabled is 'Flag indicating whether the user is disabled or not';
comment on column users.disabled_reason is 'The reason why the user was disabled displaued to the user';
comment on column users.internal_note is 'Field for storing internal notes on user administration';
