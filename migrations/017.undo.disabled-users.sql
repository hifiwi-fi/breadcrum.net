alter table users
  drop column if exists disabled,
  drop column if exists disabled_reason,
  drop column if exists internal_note;
