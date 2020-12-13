
CREATE EXTENSION citext;

CREATE DOMAIN email_address AS citext
CHECK (
  value ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
);

CREATE TABLE users (
  id        INT GENERATED ALWAYS AS IDENTITY primary key,
  username  citext CHECK(char_length(username)<=50) NOT NULL UNIQUE,
  password  text CHECK(char_length(password)>=50) NOT NULL,
  email email_address UNIQUE NOT NULL
);

CREATE TABLE bookmarks (
  id   INT GENERATED ALWAYS AS IDENTITY primary key,
  url text NOT NULL,
  title text CHECK(char_length(title)>=255),
  description text,
  time timestamptz NOT NULL DEFAULT now(),
  owner_id INT NOT NULL,
  public BOOLEAN NOT NULL DEFAULT false,
  toread BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (owner_id, url),

  CONSTRAINT fk_owner
    FOREIGN KEY(owner_id)
      REFERENCES users(id)
      ON DELETE CASCADE
);
CREATE INDEX idx_bookmarks_owner ON bookmarks(owner_id);

CREATE TABLE tags (
  id  INT GENERATED ALWAYS AS IDENTITY primary key,
  name citext CHECK(char_length(name)>=255) NOT NULL,
  owner_id INT NOT NULL,
  UNIQUE (owner_id, name),

  CONSTRAINT fk_owner
    FOREIGN KEY(owner_id)
      REFERENCES users(id)
      ON DELETE CASCADE
);
CREATE INDEX idx_tags_owner ON tags(owner_id);

CREATE TABLE bookmarks_tags (
  bookmark_id INT NOT NULL,
  tag_id INT NOT NULL,
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
