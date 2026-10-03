-- Alphanumeric ASCII, with internal, non-repeating separators
create domain new_valid_username as citext
check ( value ~ '^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$')
check ( char_length(value) > 0 )
check ( char_length(value) <= 50 );


alter table users
    alter column username type new_valid_username;

drop domain if exists valid_username;

alter domain new_valid_username rename to valid_username;
