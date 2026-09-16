-- Create enum type for authenticator transports
create type authenticator_transport as enum ('internal', 'usb', 'nfc', 'ble', 'hybrid');

-- Create passkeys table for WebAuthn credentials
create table passkeys (
  -- Primary identifier
  id uuid primary key default gen_random_uuid(),
  
  -- User relationship
  user_id uuid not null,
  
  -- WebAuthn credential data (from server.verifyRegistration result)
  credential_id text not null unique,
  public_key text not null,
  algorithm text not null,
  counter bigint not null default 0,
  
  -- Optional WebAuthn metadata
  transports authenticator_transport[],
  aaguid text,
  
  -- User-facing metadata
  name text not null check (char_length(name) > 0 and char_length(name) <= 100),
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  last_used timestamptz,
  
  constraint fk_user
    foreign key(user_id)
      references users(id)
      on delete cascade
);

-- Indexes for efficient lookups
create index idx_passkeys_user_id on passkeys(user_id);
create index idx_passkeys_credential_id on passkeys(credential_id);

-- Trigger for updated_at timestamp
create trigger set_timestamp_passkeys
before update on passkeys
for each row
execute procedure trigger_set_timestamp();

-- Column documentation (required for every column)
comment on table passkeys is 'WebAuthn passkey credentials for passwordless authentication';
comment on column passkeys.id is 'Internal database primary key for the passkey record';
comment on column passkeys.user_id is 'Foreign key to users table - identifies which user owns this passkey';
comment on column passkeys.credential_id is 'WebAuthn credential ID (base64url encoded) - returned from client.register() and used in authentication requests';
comment on column passkeys.public_key is 'Public key (base64 encoded) - used by server.verifyAuthentication() to verify signatures';
comment on column passkeys.algorithm is 'Cryptographic algorithm identifier (e.g., "ES256", "RS256") - specifies which algorithm to use for signature verification';
comment on column passkeys.counter is 'Signature counter for replay attack prevention - increments with each authentication and must always increase';
comment on column passkeys.transports is 'Array of supported authenticator transport methods - helps browser optimize passkey selection UI (e.g., ["internal"] for platform authenticators, ["usb", "nfc"] for security keys)';
comment on column passkeys.aaguid is 'Authenticator Attestation GUID - identifies the authenticator model (e.g., YubiKey, Touch ID)';
comment on column passkeys.name is 'User-defined friendly name for identifying this passkey (e.g., "iPhone 15", "YubiKey 5", "Work Laptop")';
comment on column passkeys.created_at is 'Timestamp when the passkey was registered';
comment on column passkeys.updated_at is 'Timestamp when the passkey record was last modified (e.g., name changed)';
comment on column passkeys.last_used is 'Timestamp when this passkey was last used for authentication - updated by authenticate/verify endpoint';

-- Add 'passkey' as a valid auth_token_source value (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'auth_token_source'
      and e.enumlabel = 'passkey'
  ) then
    alter type auth_token_source add value 'passkey';
  end if;
end$$;

comment on type auth_token_source is 'The method which created the auth token: web (password login), api (API token creation), or passkey (WebAuthn passkey authentication).';