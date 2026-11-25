drop trigger sync_capture_account_deletes on users;
drop trigger sync_capture_bookmarks_tags on bookmarks_tags;
drop trigger sync_capture_feed_deletes on podcast_feeds;
drop trigger sync_capture_tag_renames on tags;
drop trigger sync_capture_tag_deletes on tags;
drop trigger sync_capture_episodes on episodes;
drop trigger sync_capture_archives on archives;
drop trigger sync_capture_bookmarks on bookmarks;
drop trigger sync_publish_at_commit on sync_pending_transactions;

drop function sync_publish_changes();
drop function sync_capture_account_delete();
drop function sync_capture_tag_rename();
drop function sync_capture_membership();
drop function sync_queue_bookmark(uuid);
drop function sync_capture_resource();
drop function sync_queue_change(uuid, text, uuid, uuid, timestamptz);

drop index sync_bookmarks_by_owner_and_id;
drop table sync_pending_transactions;
drop table sync_pending_changes;
drop table sync_tombstones;
drop table sync_bookmark_changes;
drop table sync_heads;
drop table sync_cursor_keys;
