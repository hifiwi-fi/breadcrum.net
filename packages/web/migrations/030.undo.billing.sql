drop index if exists idx_bookmarks_owner_created_at;

drop trigger if exists set_timestamp_custom_subscriptions on custom_subscriptions;
drop table if exists custom_subscriptions;

drop trigger if exists set_timestamp_stripe_subscriptions on stripe_subscriptions;
drop table if exists stripe_subscriptions;

drop trigger if exists set_timestamp_stripe_customers on stripe_customers;
drop table if exists stripe_customers;

drop trigger if exists set_timestamp_subscriptions on subscriptions;
drop table if exists subscriptions;

drop type if exists subscription_provider;
