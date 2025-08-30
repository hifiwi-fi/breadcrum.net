-- Revert disabled and updated_at columns back to nullable across all tables
alter table users alter column disabled drop not null;

-- Revert updated_at columns back to nullable
alter table users alter column updated_at drop not null;
alter table archives alter column updated_at drop not null;
alter table bookmarks alter column updated_at drop not null;
alter table episodes alter column updated_at drop not null;
alter table podcast_feeds alter column updated_at drop not null;
alter table tags alter column updated_at drop not null;

-- Remove defaults from updated_at columns
alter table users alter column updated_at drop default;
alter table archives alter column updated_at drop default;
alter table bookmarks alter column updated_at drop default;
alter table episodes alter column updated_at drop default;
alter table podcast_feeds alter column updated_at drop default;
alter table tags alter column updated_at drop default;
