alter table episodes
  drop column if exists thumbnail,
  drop column if exists text_content,
  drop column if exists author_url;
