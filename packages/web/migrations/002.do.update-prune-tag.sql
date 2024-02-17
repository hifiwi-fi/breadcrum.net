CREATE OR REPLACE FUNCTION prune_tags()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM tags
    WHERE id IN (
      SELECT id FROM tags
      LEFT OUTER JOIN bookmarks_tags on tags.id = bookmarks_tags.tag_id
      WHERE bookmarks_tags.tag_id is null
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
