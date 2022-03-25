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

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
  username valid_username UNIQUE NOT NULL,
  email email_address UNIQUE NOT NULL,
  email_confirmed BOOLEAN NOT NULL DEFAULT false,
  password text NOT NULL -- Encrypted passwords are 60+ chars
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
);

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE auth_tokens (
  token text PRIMARY KEY,
  owner_id UUID NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, token),

  CONSTRAINT fk_owner
    FOREIGN KEY(owner_id)
      REFERENCES users(id)
      ON DELETE CASCADE
);
CREATE INDEX idx_auth_tokens_owner ON auth_tokens(owner_id);

CREATE TRIGGER set_timestamp_auth_tokens
BEFORE UPDATE ON auth_tokens
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
  url text NOT NULL,
  title text CHECK(char_length(title) <= 255),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  toread BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID NOT NULL,
  UNIQUE (owner_id, url),

  CONSTRAINT fk_owner
    FOREIGN KEY(owner_id)
      REFERENCES users(id)
      ON DELETE CASCADE
);
CREATE INDEX idx_bookmarks_owner ON bookmarks(owner_id);

CREATE TRIGGER set_timestamp_bookmarks
BEFORE UPDATE ON bookmarks
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
  name citext CHECK(char_length(name) <= 255) NOT NULL,
  owner_id UUID NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  UNIQUE (owner_id, name),

  CONSTRAINT fk_owner
    FOREIGN KEY(owner_id)
      REFERENCES users(id)
      ON DELETE CASCADE
);
CREATE INDEX idx_tags_owner ON tags(owner_id);

CREATE TRIGGER set_timestamp_tags
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

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
