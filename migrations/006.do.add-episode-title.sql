alter table episodes
  add column title text CHECK ( char_length(title) > 0 ) CHECK(char_length(title) <= 255);

