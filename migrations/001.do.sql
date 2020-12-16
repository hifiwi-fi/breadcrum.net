CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
  username  citext UNIQUE NOT NULL,
  email citext UNIQUE NOT NULL,
  email_confirmed BOOLEAN NOT NULL DEFAULT false,
  password text
);

CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
  url text NOT NULL,
  title text,
  description text,
  time timestamptz NOT NULL DEFAULT now(),
  public BOOLEAN NOT NULL DEFAULT false,
  toread BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID NOT NULL,
  UNIQUE (owner_id, url),

  CONSTRAINT fk_owner
    FOREIGN KEY(owner_id)
      REFERENCES users(id)
      ON DELETE CASCADE
);
CREATE INDEX idx_bookmarks_owner ON bookmarks(owner_id);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
  name citext NOT NULL,
  owner_id UUID NOT NULL,
  UNIQUE (owner_id, name),

  CONSTRAINT fk_owner
    FOREIGN KEY(owner_id)
      REFERENCES users(id)
      ON DELETE CASCADE
);
CREATE INDEX idx_tags_owner ON tags(owner_id);

CREATE TABLE bookmarks_tags (
  bookmark_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  CONSTRAINT pkey_bookmarks_tags PRIMARY KEY (bookmark_id, tag_id),

  CONSTRAINT fk_bookmark
    FOREIGN KEY(bookmark_id)
      REFERENCES bookmarks(id)
      ON DELETE CASCADE,

  CONSTRAINT fk_tag
    FOREIGN KEY(tag_id)
      REFERENCES tags(id)
      ON DELETE CASCADE
);
CREATE INDEX idx_bookmarks_tags_bookmarks_id ON bookmarks_tags(bookmark_id);
CREATE INDEX idx_bookmarks_tags_tags_id ON bookmarks_tags(tag_id);
