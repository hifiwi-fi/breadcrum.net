-- Add a source field to auth tokens
create type auth_token_source as enum ('web', 'api');

alter table auth_tokens
add column source auth_token_source not null default 'web';
comment on column auth_tokens.source is 'The method which created the auth token (api or web login).';

-- Remove the default after all existing rows have been populated
alter table auth_tokens
alter column source drop default;
