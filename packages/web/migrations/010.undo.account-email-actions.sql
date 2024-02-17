alter table users
  drop column if exists email_verify_token,
  drop column if exists email_verify_token_exp,
  drop column if exists pending_email_update,
  drop column if exists pending_email_update_token,
  drop column if exists pending_email_update_token_exp,
  drop column if exists password_reset_token,
  drop column if exists password_reset_token_exp;


drop table if exists sns;
drop trigger if exists set_timestamp_sns ON sns;

drop table if exists email_blackhole;
drop trigger if exists set_timestamp_email_blackhole ON email_blackhole;
