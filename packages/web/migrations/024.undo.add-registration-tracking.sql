-- Remove registration tracking fields from users table
alter table users
  drop column if exists registration_user_agent,
  drop column if exists registration_ip;