CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Valid email
CREATE DOMAIN email_address AS citext
CHECK (
  value ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
)
CHECK ( char_length(value) <= 200 );

-- Alphanumeric ASCII, with internal, non-repeating separators
CREATE DOMAIN valid_username AS citext
CHECK ( value ~ '^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$')
CHECK ( char_length(value) > 0 )
CHECK ( char_length(value) <= 50 );

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
  username valid_username UNIQUE NOT NULL,
  email email_address UNIQUE NOT NULL,
  email_confirmed BOOLEAN NOT NULL DEFAULT false,
  password text CHECK(char_length(password) <= 50) CHECK(char_length(username) >= 8) NOT NULL
);

CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
  url text NOT NULL,
  title text CHECK(char_length(title) >= 255),
  note text,
  time timestamptz NOT NULL DEFAULT now(),
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
  name citext CHECK(char_length(name) >= 255) NOT NULL,
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
