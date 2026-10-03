-- Fix nullability of disabled and updated_at columns across all tables
-- First update any existing NULL values to the defaults
update users set disabled = false where disabled is null;
update users set updated_at = now() where updated_at is null;
update archives set updated_at = now() where updated_at is null;
update bookmarks set updated_at = now() where updated_at is null;
update episodes set updated_at = now() where updated_at is null;
update podcast_feeds set updated_at = now() where updated_at is null;
update tags set updated_at = now() where updated_at is null;

-- Add defaults for updated_at columns and make them NOT NULL
alter table users alter column updated_at set default now();
alter table archives alter column updated_at set default now();
alter table bookmarks alter column updated_at set default now();
alter table episodes alter column updated_at set default now();
alter table podcast_feeds alter column updated_at set default now();
alter table tags alter column updated_at set default now();

-- Make disabled column NOT NULL
alter table users alter column disabled set not null;

-- Make all updated_at columns NOT NULL
alter table users alter column updated_at set not null;
alter table archives alter column updated_at set not null;
alter table bookmarks alter column updated_at set not null;
alter table episodes alter column updated_at set not null;
alter table podcast_feeds alter column updated_at set not null;
alter table tags alter column updated_at set not null;
