-- for "bookmarks" table
-- step 1: add new column allowing null values
alter table bookmarks
add column error text,
add column done boolean default false;

-- step 2: set all existing rows to true
update bookmarks
set done = true;

-- step 3: set the done column to not null
alter table bookmarks
alter column done set not null;

-- for "archives" table
-- step 1: add new column allowing null values
alter table archives
add column done boolean default false;

-- step 2: set all existing rows to true
update archives
set done = true;

-- step 3: set the done column to not null
alter table archives
alter column done set not null;

-- step 4: drop the 'ready' column
alter table archives
drop column ready;

-- step 5: add 'ready' as a generated column
alter table archives
add column ready boolean generated always as (done and coalesce(error, '') = '') stored;

-- for "episodes" table
-- step 1: add new column allowing null values
alter table episodes
add column done boolean default false;

-- step 2: set all existing rows to true
update episodes
set done = true;

-- step 3: set the done column to not null
alter table episodes
alter column done set not null;

-- step 4: drop the 'ready' column
alter table episodes
drop column ready;

-- step 5: add 'ready' as a generated column
alter table episodes
add column ready boolean generated always as (done and coalesce(error, '') = '') stored;
