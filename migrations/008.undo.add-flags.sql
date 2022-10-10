drop table if exists feature_flags;
drop trigger if exists set_timestamp_feature_flags ON feature_flags;

alter table users
  drop column if exists admin;
