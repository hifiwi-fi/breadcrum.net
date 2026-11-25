-- Keep cursor keys independent of JWT keys. Retired keys can keep verifying
-- tokens for supported generations while new tokens use the active key.
create table sync_cursor_keys (
  id uuid primary key default gen_random_uuid(),
  secret bytea not null default gen_random_bytes(32) check (octet_length(secret) = 32),
  active boolean not null default true
);
comment on table sync_cursor_keys is
  'Signing keys for sync cursors and bootstrap page tokens, independent of API authentication keys. Retain retired keys to verify existing cursors.';
comment on column sync_cursor_keys.id is 'Key identifier carried in signed sync tokens so they can be verified after rotation.';
comment on column sync_cursor_keys.secret is 'Sensitive 32-byte HMAC-SHA-256 key used to sign and verify sync tokens.';
comment on column sync_cursor_keys.active is 'True for the key used to issue new tokens. Inactive keys verify existing tokens only.';

create unique index sync_active_cursor_key on sync_cursor_keys (active) where active;
comment on index sync_active_cursor_key is 'Allows at most one signing key to issue new cursors while retaining retired verification keys.';

insert into sync_cursor_keys default values;

-- Account deletion takes the same late lock as publication, after the domain
-- cascades. A foreign key to users on sync_heads would take that lock earlier.
create table sync_heads (
  owner_id uuid primary key,
  generation integer not null default 1 check (generation > 0),
  revision bigint not null default 0 check (revision >= 0)
);
comment on table sync_heads is
  'One row per account with published sync state. The publisher locks this row after domain writes and cascades. Account deletion removes it through the same publisher to preserve lock ordering.';
comment on column sync_heads.owner_id is 'Account ID used to scope cursors, publication locks, live changes, and tombstones.';
comment on column sync_heads.generation is 'Cursor generation for this account. Increment to require clients holding older cursors to bootstrap again.';
comment on column sync_heads.revision is 'Highest published account revision. Accounts with no head start at revision zero.';

create table sync_bookmark_changes (
  owner_id uuid not null references sync_heads(owner_id) on delete cascade,
  bookmark_id uuid not null,
  revision bigint not null check (revision > 0),
  primary key (owner_id, bookmark_id),
  unique (owner_id, revision)
);
comment on table sync_bookmark_changes is
  'Compact delta index with the latest revision per changed live bookmark. Bootstrap reads live bookmarks directly, and delta reads reconstruct payloads from live tables in the same snapshot.';
comment on column sync_bookmark_changes.owner_id is 'Account that owns the live bookmark and its revision.';
comment on column sync_bookmark_changes.bookmark_id is 'Live bookmark ID. The publisher removes this index entry when it writes a bookmark tombstone.';
comment on column sync_bookmark_changes.revision is 'Latest account revision for a bookmark or its synced tag, archive, or episode metadata.';

create table sync_tombstones (
  owner_id uuid not null references sync_heads(owner_id) on delete cascade,
  resource_type text not null check (resource_type in ('bookmark', 'tag', 'archive', 'episode', 'feed')),
  resource_id uuid not null,
  bookmark_id uuid,
  revision bigint not null check (revision > 0),
  deleted_at timestamptz not null,
  primary key (owner_id, resource_type, resource_id),
  check ((bookmark_id is not null) = (resource_type in ('archive', 'episode')))
);
comment on table sync_tombstones is
  'Identifier-only records of hard deletes, retained for the lifetime of the account. Bookmark tombstones are sent in deltas. Child deletes refresh the surviving bookmark projection.';
comment on column sync_tombstones.owner_id is 'Account that owned the deleted resource and whose sync head controls retention.';
comment on column sync_tombstones.resource_type is 'Deleted resource kind: bookmark, tag, archive, episode, or feed.';
comment on column sync_tombstones.resource_id is 'UUID of the deleted row, captured before it disappears and interpreted with resource_type.';
comment on column sync_tombstones.bookmark_id is 'Former parent bookmark ID for archive and episode deletes, including cascades. Null for other resource types.';
comment on column sync_tombstones.revision is 'Account revision assigned to the delete by the deferred publisher.';
comment on column sync_tombstones.deleted_at is 'Wall-clock time when the delete trigger captured the row. Client cursors use the revision for ordering.';

create index sync_bookmark_tombstones_by_revision
  on sync_tombstones (owner_id, revision)
  where resource_type = 'bookmark';
comment on index sync_bookmark_tombstones_by_revision is 'Supports account-scoped delta scans over bookmark deletes ordered by revision.';

create index sync_bookmarks_by_owner_and_id on bookmarks (owner_id, id);
comment on index sync_bookmarks_by_owner_and_id is 'Supports bootstrap keyset pagination by immutable bookmark ID within an account.';

-- These buffers only hold uncommitted work and are drained before commit.
create unlogged table sync_pending_changes (
  transaction_id xid8 not null,
  owner_id uuid not null,
  resource_type text not null,
  resource_id uuid not null,
  is_delete boolean not null,
  bookmark_id uuid,
  deleted_at timestamptz,
  primary key (transaction_id, owner_id, resource_type, resource_id, is_delete)
);
comment on table sync_pending_changes is
  'Unlogged, transaction-local buffer shared by capture triggers and the deferred publisher. Each transaction drains its own work before commit.';
comment on column sync_pending_changes.transaction_id is 'Full PostgreSQL transaction ID used to collect and drain only the current transaction''s work.';
comment on column sync_pending_changes.owner_id is 'Account whose revision head the publisher uses for this change.';
comment on column sync_pending_changes.resource_type is 'Resource kind or the internal account-deletion marker. A non-delete tag entry marks a rename.';
comment on column sync_pending_changes.resource_id is 'UUID of the affected resource or deleted account.';
comment on column sync_pending_changes.is_delete is 'Distinguishes a hard delete or account removal from an upsert or tag rename.';
comment on column sync_pending_changes.bookmark_id is 'Former parent bookmark ID carried by archive and episode delete entries.';
comment on column sync_pending_changes.deleted_at is 'Delete capture time copied into the tombstone. Null for non-delete work.';

create unlogged table sync_pending_transactions (
  transaction_id xid8 primary key
);
comment on table sync_pending_transactions is
  'Unlogged queue with one deferred publication trigger per writing transaction. The publisher removes the queue row before commit.';
comment on column sync_pending_transactions.transaction_id is 'Full PostgreSQL transaction ID matching the buffered changes to publish together.';

create function sync_queue_change(
  account uuid, kind text, resource uuid, parent_bookmark uuid, deletion_time timestamptz
) returns void
language plpgsql
as $$
declare
  tx xid8 := pg_current_xact_id();
begin
  insert into sync_pending_changes (
    transaction_id, owner_id, resource_type, resource_id, is_delete, bookmark_id, deleted_at
  ) values (tx, account, kind, resource, deletion_time is not null, parent_bookmark, deletion_time)
  on conflict do nothing;

  -- A single deferred trigger publishes the whole transaction.
  insert into sync_pending_transactions values (tx) on conflict do nothing;
end
$$;
comment on function sync_queue_change(uuid, text, uuid, uuid, timestamptz) is
  'Deduplicates buffered work and schedules publication once per transaction without taking an account revision lock.';

create function sync_capture_resource() returns trigger
language plpgsql
as $$
declare
  kind text := tg_argv[0];
begin
  if tg_op = 'DELETE' then
    if kind in ('archive', 'episode') then
      perform sync_queue_change(old.owner_id, kind, old.id, old.bookmark_id, clock_timestamp());
      perform sync_queue_change(old.owner_id, 'bookmark', old.bookmark_id, null, null);
    else
      perform sync_queue_change(old.owner_id, kind, old.id, null, clock_timestamp());
    end if;
  elsif kind = 'bookmark' then
    perform sync_queue_change(new.owner_id, 'bookmark', new.id, null, null);
  elsif kind in ('archive', 'episode') then
    if tg_op = 'UPDATE' and (old.owner_id, old.bookmark_id) is distinct from (new.owner_id, new.bookmark_id) then
      perform sync_queue_change(old.owner_id, 'bookmark', old.bookmark_id, null, null);
    end if;
    perform sync_queue_change(new.owner_id, 'bookmark', new.bookmark_id, null, null);
  end if;
  return null;
end
$$;
comment on function sync_capture_resource() is
  'Captures changes and hard deletes with a resource kind supplied by the trigger. Archive and episode changes also invalidate their parent bookmark projections.';

create function sync_queue_bookmark(bookmark uuid) returns void
language sql
as $$
  select sync_queue_change(owner_id, 'bookmark', id, null, null)
  from bookmarks where id = bookmark
$$;
comment on function sync_queue_bookmark(uuid) is
  'Looks up the surviving bookmark owner and queues an upsert after a tag membership change.';

create function sync_capture_membership() returns trigger
language plpgsql
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform sync_queue_bookmark(old.bookmark_id);
  end if;
  if tg_op in ('UPDATE', 'INSERT') then
    perform sync_queue_bookmark(new.bookmark_id);
  end if;
  return null;
end
$$;
comment on function sync_capture_membership() is
  'Queues the affected old or new bookmark projections after a tag membership is inserted, moved, or deleted.';

create function sync_capture_tag_rename() returns trigger
language plpgsql
as $$
begin
  perform sync_queue_change(new.owner_id, 'tag', new.id, null, null);
  return null;
end
$$;
comment on function sync_capture_tag_rename() is
  'Queues tag rename expansion until after the publisher locks the account head, so it sees memberships that published first.';

create function sync_capture_account_delete() returns trigger
language plpgsql
as $$
begin
  perform sync_queue_change(old.id, 'account', old.id, null, clock_timestamp());
  return null;
end
$$;
comment on function sync_capture_account_delete() is
  'Schedules cleanup of the account head, live changes, and tombstones after source cascades complete.';

create function sync_publish_changes() returns trigger
language plpgsql
as $$
declare
  account record;
  change record;
  next_revision bigint;
begin
  -- The same account ordering applies to bulk workers and account deletes.
  -- Domain writes and their cascades have already run before any head is locked.
  for account in
    select owner_id, bool_or(resource_type = 'account') as removed
    from sync_pending_changes
    where transaction_id = new.transaction_id
    group by owner_id
    order by owner_id
  loop
    if account.removed then
      delete from sync_heads where owner_id = account.owner_id;
      continue;
    end if;

    insert into sync_heads (owner_id) values (account.owner_id) on conflict do nothing;
    select revision into strict next_revision
      from sync_heads where owner_id = account.owner_id for no key update;

    -- Expand renames after acquiring the head, so memberships that published
    -- first are visible. A membership that publishes later emits its own upsert.
    insert into sync_pending_changes (transaction_id, owner_id, resource_type, resource_id, is_delete)
    select new.transaction_id, account.owner_id, 'bookmark', b.id, false
    from sync_pending_changes tag
    join bookmarks_tags bt on bt.tag_id = tag.resource_id
    join bookmarks b on b.id = bt.bookmark_id and b.owner_id = account.owner_id
    where tag.transaction_id = new.transaction_id and tag.owner_id = account.owner_id
      and tag.resource_type = 'tag' and not tag.is_delete
    on conflict do nothing;

    for change in
      select pending.*
      from sync_pending_changes pending
      where pending.transaction_id = new.transaction_id
        and pending.owner_id = account.owner_id
        and (
          pending.is_delete or (
            pending.resource_type = 'bookmark' and exists (
              select from bookmarks b
              where b.id = pending.resource_id and b.owner_id = pending.owner_id
            )
          )
        )
      order by pending.resource_type, pending.resource_id, pending.is_delete desc
    loop
      next_revision := next_revision + 1;
      if change.is_delete then
        insert into sync_tombstones (owner_id, resource_type, resource_id, bookmark_id, revision, deleted_at)
        values (account.owner_id, change.resource_type, change.resource_id, change.bookmark_id, next_revision, change.deleted_at)
        on conflict (owner_id, resource_type, resource_id) do update
          set revision = excluded.revision, bookmark_id = excluded.bookmark_id, deleted_at = excluded.deleted_at;

        if change.resource_type = 'bookmark' then
          delete from sync_bookmark_changes
          where owner_id = account.owner_id and bookmark_id = change.resource_id;
        end if;
      else
        insert into sync_bookmark_changes (owner_id, bookmark_id, revision)
        values (account.owner_id, change.resource_id, next_revision)
        on conflict (owner_id, bookmark_id) do update set revision = excluded.revision;
      end if;
    end loop;

    update sync_heads set revision = next_revision where owner_id = account.owner_id;
  end loop;

  delete from sync_pending_changes where transaction_id = new.transaction_id;
  delete from sync_pending_transactions where transaction_id = new.transaction_id;
  return null;
end
$$;
comment on function sync_publish_changes() is
  'Publishes buffered work atomically with source changes. Locks account heads in ID order, assigns revisions, records tombstones, and drains the buffers.';

create constraint trigger sync_publish_at_commit
after insert on sync_pending_transactions
deferrable initially deferred
for each row execute function sync_publish_changes();
comment on trigger sync_publish_at_commit on sync_pending_transactions is
  'Defers publication until commit so domain writes and cascades finish before account revision locks are acquired.';

create trigger sync_capture_bookmarks
after insert or update or delete on bookmarks
for each row execute function sync_capture_resource('bookmark');
comment on trigger sync_capture_bookmarks on bookmarks is 'Captures bookmark inserts, updates, and hard deletes for native sync.';

create trigger sync_capture_archives
after insert or update or delete on archives
for each row execute function sync_capture_resource('archive');
comment on trigger sync_capture_archives on archives is 'Refreshes parent bookmark metadata and captures archive hard deletes, including cascades.';

create trigger sync_capture_episodes
after insert or update or delete on episodes
for each row execute function sync_capture_resource('episode');
comment on trigger sync_capture_episodes on episodes is 'Refreshes parent bookmark metadata and captures episode hard deletes, including cascades.';

create trigger sync_capture_tag_deletes
after delete on tags
for each row execute function sync_capture_resource('tag');
comment on trigger sync_capture_tag_deletes on tags is 'Captures explicit, cascading, and prune-on-empty tag deletions.';

create trigger sync_capture_tag_renames
after update of name on tags
for each row when (old.name::text is distinct from new.name::text)
execute function sync_capture_tag_rename();
comment on trigger sync_capture_tag_renames on tags is 'Invalidates attached bookmarks on spelling changes, including case-only changes.';

create trigger sync_capture_feed_deletes
after delete on podcast_feeds
for each row execute function sync_capture_resource('feed');
comment on trigger sync_capture_feed_deletes on podcast_feeds is 'Captures feed hard deletes. The episode trigger handles the cascade into bookmark projections.';

create trigger sync_capture_bookmarks_tags
after insert or update or delete on bookmarks_tags
for each row execute function sync_capture_membership();
comment on trigger sync_capture_bookmarks_tags on bookmarks_tags is 'Refreshes bookmark projections when tag membership changes without updating the bookmark row.';

create trigger sync_capture_account_deletes
after delete on users
for each row execute function sync_capture_account_delete();
comment on trigger sync_capture_account_deletes on users is 'Queues removal of the deleted account''s sync state through the deferred publisher.';
