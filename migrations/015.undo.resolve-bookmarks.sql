-- for "bookmarks" table
-- step 1: drop the 'done' and 'error' column
alter table bookmarks
drop column error,
drop column done;

-- for "archives" table
-- step 1: drop the 'ready' column
alter table archives
drop column ready;

-- step 2: drop the 'done' column
alter table archives
drop column done;

-- step 3: add 'ready' column and set it to true if 'error' is null
alter table archives
add column ready boolean default false not null;

update archives
set ready = (coalesce(error, '') = '');

-- for "episodes" table
-- step 1: drop the 'ready' column
alter table episodes
drop column ready;

-- step 2: drop the 'done' column
alter table episodes
drop column done;

-- step 3: add 'ready' column and set it to true if 'error' is null
alter table episodes
add column ready boolean default false not null;

update episodes
set ready = (coalesce(error, '') = '');
