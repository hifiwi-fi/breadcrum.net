create type subscription_provider as enum ('stripe', 'custom');

-- Generic subscriptions supertype table.
-- Provider-specific fields live in provider subtype tables.
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider subscription_provider not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint fk_subscriptions_user
    foreign key (user_id)
      references users(id)
      on delete cascade,
  constraint subscriptions_user_provider_unique
    unique (user_id, provider)
);

comment on table subscriptions is 'Provider-generic subscription supertype. One row per user per provider.';
comment on column subscriptions.provider is 'Subscription provider: stripe or custom';
-- Note: subscriptions_user_provider_unique already covers user_id lookups; no separate index needed.

create trigger set_timestamp_subscriptions
  before update on subscriptions
  for each row
  execute procedure trigger_set_timestamp();

-- Stripe-specific: maps users to Stripe customer IDs
create table stripe_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  stripe_customer_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint fk_stripe_customers_user
    foreign key (user_id)
      references users(id)
      on delete cascade,
  constraint stripe_customers_user_unique
    unique (user_id),
  constraint stripe_customers_customer_id_unique
    unique (stripe_customer_id)
);

comment on table stripe_customers is 'Maps breadcrum users to Stripe customer IDs';
-- Note: stripe_customers_user_unique and stripe_customers_customer_id_unique already cover all lookup patterns.

create trigger set_timestamp_stripe_customers
  before update on stripe_customers
  for each row
  execute procedure trigger_set_timestamp();

-- Stripe-specific: subscription details from Stripe (1:1 with generic subscriptions row)
create table stripe_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null,
  stripe_subscription_id text not null,
  status text not null,
  plan_code text,
  price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  payment_method_brand text,
  payment_method_last4 text,
  latest_invoice_status text,
  latest_invoice_paid_at timestamptz,
  latest_invoice_settled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint fk_stripe_subscriptions_subscription
    foreign key (subscription_id)
      references subscriptions(id)
      on delete cascade,
  constraint stripe_subscriptions_subscription_unique
    unique (subscription_id),
  constraint stripe_subscriptions_stripe_id_unique
    unique (stripe_subscription_id)
);

comment on table stripe_subscriptions is 'Stripe-specific subscription details, 1:1 with generic subscriptions row';
comment on column stripe_subscriptions.subscription_id is 'Reference to generic subscriptions table';
comment on column stripe_subscriptions.stripe_subscription_id is 'Stripe subscription ID (sub_xxx)';
comment on column stripe_subscriptions.status is 'Stripe subscription status (e.g., active, canceled, trialing, past_due)';
comment on column stripe_subscriptions.plan_code is 'Stripe-derived internal plan code (lookup key or nickname)';
comment on column stripe_subscriptions.price_id is 'Stripe price ID';
comment on column stripe_subscriptions.current_period_start is 'Start of current Stripe billing period (from subscription.items.data[0])';
comment on column stripe_subscriptions.current_period_end is 'End of current Stripe billing period (from subscription.items.data[0])';
comment on column stripe_subscriptions.cancel_at is 'Timestamp when Stripe subscription is scheduled to cancel';
comment on column stripe_subscriptions.cancel_at_period_end is 'Whether Stripe subscription will cancel at period end';
comment on column stripe_subscriptions.trial_end is 'End of Stripe trial period';
comment on column stripe_subscriptions.payment_method_brand is 'Card brand from the default payment method (e.g., visa, mastercard)';
comment on column stripe_subscriptions.payment_method_last4 is 'Last 4 digits of the default payment method card';
comment on column stripe_subscriptions.latest_invoice_status is 'Status of Stripe latest_invoice (e.g., paid, open, void)';
comment on column stripe_subscriptions.latest_invoice_paid_at is 'Timestamp when latest_invoice was marked paid';
comment on column stripe_subscriptions.latest_invoice_settled is 'True when latest_invoice status is paid; used for settlement-driven entitlement';

create trigger set_timestamp_stripe_subscriptions
  before update on stripe_subscriptions
  for each row
  execute procedure trigger_set_timestamp();

-- Custom provider subscription details (1:1 with generic subscriptions row)
create table custom_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null,
  status text not null,
  plan_code text,
  display_name text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint fk_custom_subscriptions_subscription
    foreign key (subscription_id)
      references subscriptions(id)
      on delete cascade,
  constraint custom_subscriptions_subscription_unique
    unique (subscription_id)
);

comment on table custom_subscriptions is 'Custom provider subscription details, 1:1 with generic subscriptions row';
comment on column custom_subscriptions.subscription_id is 'Reference to generic subscriptions table';
comment on column custom_subscriptions.status is 'Custom subscription status (e.g., active, canceled)';
comment on column custom_subscriptions.plan_code is 'Internal plan identifier for custom grants (e.g., yearly_paid)';
comment on column custom_subscriptions.display_name is 'Human-readable custom label (e.g., Friends & Family, Gift)';
comment on column custom_subscriptions.current_period_start is 'Start of custom grant period';
comment on column custom_subscriptions.current_period_end is 'End of custom grant period; NULL means lifetime';

create trigger set_timestamp_custom_subscriptions
  before update on custom_subscriptions
  for each row
  execute procedure trigger_set_timestamp();

-- Index for efficient monthly bookmark quota queries.
-- The free tier bookmark quota limit is controlled by the `free_bookmarks_per_month` feature flag,
-- not stored in the schema. See packages/web/plugins/flags/frontend-flags.js.
create index idx_bookmarks_owner_created_at on bookmarks(owner_id, created_at);
comment on index idx_bookmarks_owner_created_at is 'Index for efficient monthly bookmark quota queries. Quota limit is set via the free_bookmarks_per_month feature flag.';
