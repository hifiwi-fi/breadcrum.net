alter table stripe_subscriptions
  alter column plan_code type text
  using plan_code::text;

alter table custom_subscriptions
  alter column plan_code type text
  using plan_code::text;

drop type if exists subscription_plan_code;

alter table subscriptions
  drop constraint if exists subscriptions_user_unique;

alter table subscriptions
  add constraint subscriptions_user_provider_unique
    unique (user_id, provider);

comment on table subscriptions is 'Provider-generic subscription supertype. One row per user per provider.';
