create table sync_mutation_receipts (
  owner_id uuid not null references users(id) on delete cascade,
  operation_id uuid not null,
  request_hash bytea not null check (octet_length(request_hash) = 32),
  receipt jsonb not null check (jsonb_typeof(receipt) = 'object'),
  primary key (owner_id, operation_id)
);

comment on table sync_mutation_receipts is
  'Retains native sync operation outcomes for the lifetime of the account. Write each receipt in the same transaction as its domain changes.';
comment on column sync_mutation_receipts.owner_id is 'Authenticated account that owns the operation and its receipt.';
comment on column sync_mutation_receipts.operation_id is 'Stable UUID chosen by the client before its first upload attempt.';
comment on column sync_mutation_receipts.request_hash is 'SHA-256 digest of the canonical request for detecting reuse of an operation ID with a different intent.';
comment on column sync_mutation_receipts.receipt is 'Original outcome, affected IDs, and field dispositions, without bookmark text or tag names.';
