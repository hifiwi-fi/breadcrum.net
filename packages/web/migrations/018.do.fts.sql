-- Bookmarks FTS
alter table bookmarks
  add column tsv tsvector;

create index bookmarks_tsv_idx on bookmarks using gin(tsv);


update bookmarks set tsv =
  setweight(to_tsvector('english', coalesce(note,'')), 'A') ||
  setweight(to_tsvector('english', coalesce(title,'')), 'B') ||
  setweight(to_tsvector('english', coalesce(summary,'')), 'C') ||
  setweight(to_tsvector('english', coalesce(url,'')), 'C');

create function bookmarks_tsv_update() returns trigger as $$
begin
  new.tsv :=
    setweight(to_tsvector('english', coalesce(NEW.note,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.title,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.summary,'')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.url,'')), 'C');
  return new;
end
$$ language plpgsql;

create trigger bookmarks_tsv_trigger before insert or update
on bookmarks for each row execute function bookmarks_tsv_update();

-- Archives FTS
alter table archives
  add column tsv tsvector;

create index archives_tsv_idx on archives using gin(tsv);


update archives set tsv =
  setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
  setweight(to_tsvector('english', coalesce(text_content,'')), 'B') ||
  setweight(to_tsvector('english', coalesce(excerpt,'')), 'C') ||
  setweight(to_tsvector('english', coalesce(site_name,'')), 'D') ||
  setweight(to_tsvector('english', coalesce(byline,'')), 'D') ||
  setweight(to_tsvector('english', coalesce(url,'')), 'D');


create function archives_tsv_update() returns trigger as $$
begin
  new.tsv :=
    setweight(to_tsvector('english', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.text_content,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.excerpt,'')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.site_name,'')), 'D') ||
    setweight(to_tsvector('english', coalesce(NEW.byline,'')), 'D') ||
    setweight(to_tsvector('english', coalesce(NEW.url,'')), 'D');
  return new;
end
$$ language plpgsql;

create trigger archives_tsv_trigger before insert or update
on archives for each row execute function archives_tsv_update();

-- Episodes FTS
alter table episodes
  add column tsv tsvector;

create index episodes_tsv_idx on episodes using gin(tsv);


update episodes set tsv =
  setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
  setweight(to_tsvector('english', coalesce(text_content,'')), 'B') ||
  setweight(to_tsvector('english', coalesce(author_name,'')), 'C') ||
  setweight(to_tsvector('english', coalesce(filename,'')), 'D') ||
  setweight(to_tsvector('english', coalesce(url,'')), 'D');


create function episodes_tsv_update() returns trigger as $$
begin
  new.tsv :=
    setweight(to_tsvector('english', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.text_content,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.author_name,'')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.filename,'')), 'D') ||
    setweight(to_tsvector('english', coalesce(NEW.url,'')), 'D');
  return new;
end
$$ language plpgsql;

create trigger episodes_tsv_trigger before insert or update
on episodes for each row execute function episodes_tsv_update();

-- Users FTS
alter table users
  add column tsv tsvector;

create index users_tsv_idx on users using gin(tsv);


update users set tsv =
  setweight(to_tsvector('english', coalesce(username,'')), 'A') ||
  setweight(to_tsvector('english', coalesce(disabled_reason,'')), 'A') ||
  setweight(to_tsvector('english', coalesce(internal_note,'')), 'A') ||
  setweight(to_tsvector('english', coalesce(email,'')), 'B') ||
  setweight(to_tsvector('english', coalesce(pending_email_update,'')), 'B');


create function users_tsv_update() returns trigger as $$
begin
  new.tsv :=
    setweight(to_tsvector('english', coalesce(NEW.username,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.disabled_reason,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.internal_note,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.email,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.pending_email_update,'')), 'B');
  return new;
end
$$ language plpgsql;

create trigger users_tsv_trigger before insert or update
on users for each row execute function users_tsv_update();
