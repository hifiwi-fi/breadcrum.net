-- Enforce one subscription provider row per user and tighten billing plan code values.

-- Keep most recent subscription row per user before adding the new uniqueness invariant.
with ranked_subscriptions as (
  select
    s.id,
    row_number() over (
      partition by s.user_id
      order by s.updated_at desc nulls last, s.created_at desc, s.id desc
    ) as rn
  from subscriptions s
)
delete from subscriptions s
using ranked_subscriptions rs
where s.id = rs.id
  and rs.rn > 1;

alter table subscriptions
  drop constraint if exists subscriptions_user_provider_unique;

alter table subscriptions
  add constraint subscriptions_user_unique
    unique (user_id);

comment on table subscriptions is 'Provider-generic subscription supertype. One row per user.';

create type subscription_plan_code as enum ('yearly_paid');

update stripe_subscriptions
set plan_code = null
where plan_code is not null
  and plan_code::text not in ('yearly_paid');

update custom_subscriptions
set plan_code = null
where plan_code is not null
  and plan_code::text not in ('yearly_paid');

alter table stripe_subscriptions
  alter column plan_code type subscription_plan_code
  using plan_code::subscription_plan_code;

alter table custom_subscriptions
  alter column plan_code type subscription_plan_code
  using plan_code::subscription_plan_code;

comment on column stripe_subscriptions.plan_code is 'Stripe-derived internal plan code';
comment on column custom_subscriptions.plan_code is 'Internal plan identifier for custom grants';
