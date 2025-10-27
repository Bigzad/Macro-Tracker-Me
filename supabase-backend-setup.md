# Supabase Backend Setup Documentation

*Last Updated: October 4, 2025 - Added Progress Reports Feature*

---

## 📋 Latest Changes - Progress Reports Feature

### New Tables Added:
- **`progress_reports`** - Main reports storage with metadata and processing status
- **`report_templates`** - Customizable report templates (3 system templates included)
- **`report_metrics_cache`** - Performance optimization for complex calculations
- **`report_shares`** - Secure report sharing with expiration controls

### New Functions Added:
- **`calculate_client_report_metrics()`** - Comprehensive metrics calculation for date ranges
- **`cleanup_expired_reports()`** - Automated cleanup of expired data

### Features:
- **PDF Report Generation** - Multiple format support with Chart.js integration
- **Secure Sharing** - Token-based sharing with access controls and expiration
- **Performance Caching** - Intelligent caching system for complex calculations
- **Template System** - Default templates with customization options for coaches
- **Multi-export Support** - PDF, Excel, and web formats planned
- **Audit Trails** - Complete history logging and change tracking

---

## 1. Tables and Columns
| table_name              | column_name             | data_type                | is_nullable | column_default      | key_type    |
| ----------------------- | ----------------------- | ------------------------ | ----------- | ------------------- | ----------- |
| anonymous_profiles      | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| anonymous_profiles      | display_name            | text                     | YES         | 'Guest User'::text  |             |
| anonymous_profiles      | created_at              | timestamp with time zone | YES         | now()               |             |
| anonymous_profiles      | updated_at              | timestamp with time zone | YES         | now()               |             |
| anonymous_profiles      | role                    | text                     | YES         | null                |             |
| coach_assignments       | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| coach_assignments       | coach_id                | uuid                     | YES         | null                | PRIMARY KEY |
| coach_assignments       | coach_id                | uuid                     | YES         | null                | PRIMARY KEY |
| coach_assignments       | client_id               | uuid                     | YES         | null                | PRIMARY KEY |
| coach_assignments       | client_id               | uuid                     | YES         | null                | PRIMARY KEY |
| coach_assignments       | assigned_at             | timestamp with time zone | YES         | now()               |             |
| coach_assignments       | is_active               | boolean                  | YES         | true                |             |
| custom_recipes          | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| custom_recipes          | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| custom_recipes          | anon_profile_id         | uuid                     | YES         | null                | PRIMARY KEY |
| custom_recipes          | user_email              | text                     | YES         | null                |             |
| custom_recipes          | recipe_name             | text                     | NO          | null                |             |
| custom_recipes          | category                | text                     | YES         | 'General'::text     |             |
| custom_recipes          | calories                | numeric                  | YES         | 0                   |             |
| custom_recipes          | protein                 | numeric                  | YES         | 0                   |             |
| custom_recipes          | carbs                   | numeric                  | YES         | 0                   |             |
| custom_recipes          | fat                     | numeric                  | YES         | 0                   |             |
| custom_recipes          | servings                | integer                  | YES         | 1                   |             |
| custom_recipes          | ingredients             | text                     | YES         | null                |             |
| custom_recipes          | instructions            | text                     | YES         | null                |             |
| custom_recipes          | recipe_id               | text                     | YES         | null                |             |
| custom_recipes          | created_at              | timestamp with time zone | YES         | now()               |             |
| custom_recipes          | updated_at              | timestamp with time zone | YES         | now()               |             |
| custom_recipes          | recipe_uuid             | uuid                     | YES         | gen_random_uuid()   |             |
| daily_meals             | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| daily_meals             | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| daily_meals             | anon_profile_id         | uuid                     | YES         | null                | PRIMARY KEY |
| daily_meals             | user_email              | text                     | YES         | null                |             |
| daily_meals             | meal_date               | date                     | YES         | CURRENT_DATE        |             |
| daily_meals             | meal_name               | text                     | NO          | null                |             |
| daily_meals             | calories                | numeric                  | YES         | 0                   |             |
| daily_meals             | protein                 | numeric                  | YES         | 0                   |             |
| daily_meals             | carbs                   | numeric                  | YES         | 0                   |             |
| daily_meals             | fat                     | numeric                  | YES         | 0                   |             |
| daily_meals             | meal_id                 | text                     | YES         | null                |             |
| daily_meals             | timestamp               | timestamp with time zone | YES         | now()               |             |
| daily_meals             | created_at              | timestamp with time zone | YES         | now()               |             |
| daily_meals             | updated_at              | timestamp with time zone | YES         | now()               |             |
| daily_meals             | email                   | text                     | YES         | null                |             |
| daily_meals             | meal_uuid               | text                     | YES         | null                |             |
| daily_targets           | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| daily_targets           | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| daily_targets           | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| daily_targets           | user_email              | text                     | YES         | null                |             |
| daily_targets           | targets                 | jsonb                    | YES         | '{}'::jsonb         |             |
| daily_targets           | created_at              | timestamp with time zone | YES         | now()               |             |
| daily_targets           | updated_at              | timestamp with time zone | YES         | now()               |             |
| daily_targets           | anon_profile_id         | uuid                     | YES         | null                | PRIMARY KEY |
| daily_targets           | anon_profile_id         | uuid                     | YES         | null                | PRIMARY KEY |
| daily_targets           | daily_calories          | integer                  | YES         | null                |             |
| daily_targets           | daily_protein           | integer                  | YES         | null                |             |
| daily_targets           | daily_carbs             | integer                  | YES         | null                |             |
| daily_targets           | daily_fat               | integer                  | YES         | null                |             |
| daily_targets           | unit_system             | text                     | YES         | 'imperial'::text    |             |
| daily_targets           | goal_type               | text                     | YES         | null                |             |
| daily_targets           | activity_level          | numeric                  | YES         | null                |             |
| invitation_codes        | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| invitation_codes        | code                    | text                     | NO          | null                | PRIMARY KEY |
| invitation_codes        | coach_email             | text                     | NO          | null                |             |
| invitation_codes        | coach_name              | text                     | NO          | null                |             |
| invitation_codes        | coach_user_id           | uuid                     | YES         | null                | PRIMARY KEY |
| invitation_codes        | created_at              | timestamp with time zone | YES         | now()               |             |
| invitation_codes        | expires_at              | timestamp with time zone | YES         | null                |             |
| invitation_codes        | usage_count             | integer                  | YES         | 0                   |             |
| invitation_codes        | max_uses                | integer                  | YES         | 0                   |             |
| invitation_codes        | is_active               | boolean                  | YES         | true                |             |
| invitation_codes        | description             | text                     | YES         | ''::text            |             |
| invitation_codes        | updated_at              | timestamp with time zone | YES         | now()               |             |
| invitation_codes        | creator_id              | uuid                     | YES         | null                | PRIMARY KEY |
| invitation_codes        | assigns_role_id         | uuid                     | YES         | null                | PRIMARY KEY |
| invite_code_redemptions | id                      | uuid                     | NO          | gen_random_uuid()   | PRIMARY KEY |
| invite_code_redemptions | invite_code_id          | uuid                     | YES         | null                | PRIMARY KEY |
| invite_code_redemptions | code                    | text                     | NO          | null                |             |
| invite_code_redemptions | user_id                 | uuid                     | YES         | null                |             |
| invite_code_redemptions | user_email              | text                     | YES         | null                |             |
| invite_code_redemptions | coach_email             | text                     | YES         | null                |             |
| invite_code_redemptions | redeemed_at             | timestamp with time zone | YES         | now()               |             |
| invite_code_redemptions | ip_address              | text                     | YES         | null                |             |
| invite_code_redemptions | user_agent              | text                     | YES         | null                |             |
| invite_code_redemptions | metadata                | jsonb                    | YES         | null                |             |
| invite_codes            | id                      | uuid                     | NO          | gen_random_uuid()   | PRIMARY KEY |
| invite_codes            | code                    | text                     | NO          | null                | PRIMARY KEY |
| invite_codes            | coach_email             | text                     | NO          | null                |             |
| invite_codes            | coach_user_id           | uuid                     | YES         | null                |             |
| invite_codes            | created_by              | text                     | YES         | null                |             |
| invite_codes            | is_active               | boolean                  | YES         | true                |             |
| invite_codes            | max_uses                | integer                  | YES         | 0                   |             |
| invite_codes            | current_uses            | integer                  | YES         | 0                   |             |
| invite_codes            | expires_at              | timestamp with time zone | YES         | null                |             |
| invite_codes            | created_at              | timestamp with time zone | YES         | now()               |             |
| invite_codes            | updated_at              | timestamp with time zone | YES         | now()               |             |
| invite_codes            | metadata                | jsonb                    | YES         | null                |             |
| invites                 | id                      | uuid                     | NO          | gen_random_uuid()   | PRIMARY KEY |
| invites                 | email                   | text                     | NO          | null                | PRIMARY KEY |
| invites                 | token                   | text                     | NO          | null                | PRIMARY KEY |
| invites                 | invited_by              | uuid                     | YES         | null                | PRIMARY KEY |
| invites                 | invited_by_email        | text                     | YES         | null                |             |
| invites                 | expires_at              | timestamp with time zone | NO          | null                |             |
| invites                 | created_at              | timestamp with time zone | YES         | now()               |             |
| invites                 | used_at                 | timestamp with time zone | YES         | null                |             |
| invites                 | used                    | boolean                  | YES         | false               |             |
| invites                 | user_created            | uuid                     | YES         | null                | PRIMARY KEY |
| macro_calculations      | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| macro_calculations      | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| macro_calculations      | anon_profile_id         | uuid                     | YES         | null                | PRIMARY KEY |
| macro_calculations      | user_email              | text                     | YES         | null                |             |
| macro_calculations      | age                     | integer                  | YES         | null                |             |
| macro_calculations      | gender                  | text                     | YES         | null                |             |
| macro_calculations      | weight_kg               | numeric                  | YES         | null                |             |
| macro_calculations      | height_cm               | numeric                  | YES         | null                |             |
| macro_calculations      | activity_level          | text                     | YES         | null                |             |
| macro_calculations      | goal_calories           | numeric                  | YES         | null                |             |
| macro_calculations      | bmr                     | numeric                  | YES         | null                |             |
| macro_calculations      | tdee                    | numeric                  | YES         | null                |             |
| macro_calculations      | target_calories         | numeric                  | YES         | null                |             |
| macro_calculations      | target_protein          | numeric                  | YES         | null                |             |
| macro_calculations      | target_carbs            | numeric                  | YES         | null                |             |
| macro_calculations      | target_fat              | numeric                  | YES         | null                |             |
| macro_calculations      | input_unit_system       | text                     | YES         | 'imperial'::text    |             |
| macro_calculations      | calculation_date        | date                     | YES         | CURRENT_DATE        |             |
| macro_calculations      | created_at              | timestamp with time zone | YES         | now()               |             |
| macro_calculations      | updated_at              | timestamp with time zone | YES         | now()               |             |
| macro_calculations      | email                   | text                     | YES         | null                |             |
| macro_history           | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| macro_history           | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| macro_history           | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| macro_history           | anon_profile_id         | uuid                     | YES         | null                |             |
| macro_history           | entry_date              | date                     | NO          | CURRENT_DATE        |             |
| macro_history           | calories                | numeric                  | YES         | 0                   |             |
| macro_history           | protein                 | numeric                  | YES         | 0                   |             |
| macro_history           | carbs                   | numeric                  | YES         | 0                   |             |
| macro_history           | fat                     | numeric                  | YES         | 0                   |             |
| macro_history           | calories_goal           | numeric                  | YES         | 0                   |             |
| macro_history           | protein_goal            | numeric                  | YES         | 0                   |             |
| macro_history           | carbs_goal              | numeric                  | YES         | 0                   |             |
| macro_history           | fat_goal                | numeric                  | YES         | 0                   |             |
| macro_history           | protein_percent         | numeric                  | YES         | 0                   |             |
| macro_history           | carbs_percent           | numeric                  | YES         | 0                   |             |
| macro_history           | fat_percent             | numeric                  | YES         | 0                   |             |
| macro_history           | goals_met               | boolean                  | YES         | false               |             |
| macro_history           | created_at              | timestamp with time zone | YES         | now()               |             |
| macro_history           | updated_at              | timestamp with time zone | YES         | now()               |             |
| macro_history           | user_email              | text                     | YES         | null                |             |
| macro_history           | email                   | text                     | YES         | null                |             |
| macro_history           | date                    | date                     | YES         | CURRENT_DATE        | PRIMARY KEY |
| macro_history           | calories_consumed       | integer                  | YES         | 0                   |             |
| macro_history           | carbs_consumed          | integer                  | YES         | 0                   |             |
| macro_history           | protein_consumed        | integer                  | YES         | 0                   |             |
| macro_history           | fat_consumed            | integer                  | YES         | 0                   |             |
| meal_plans              | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| meal_plans              | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| meal_plans              | anon_profile_id         | uuid                     | YES         | null                | PRIMARY KEY |
| meal_plans              | user_email              | text                     | YES         | null                |             |
| meal_plans              | week_data               | jsonb                    | YES         | '{}'::jsonb         |             |
| meal_plans              | day_of_week             | integer                  | YES         | null                |             |
| meal_plans              | meal_type               | text                     | YES         | null                |             |
| meal_plans              | meal_name               | text                     | YES         | null                |             |
| meal_plans              | calories                | numeric                  | YES         | 0                   |             |
| meal_plans              | protein                 | numeric                  | YES         | 0                   |             |
| meal_plans              | carbs                   | numeric                  | YES         | 0                   |             |
| meal_plans              | fat                     | numeric                  | YES         | 0                   |             |
| meal_plans              | plan_id                 | text                     | YES         | null                |             |
| meal_plans              | created_at              | timestamp with time zone | YES         | now()               |             |
| meal_plans              | updated_at              | timestamp with time zone | YES         | now()               |             |
| meal_plans              | email                   | text                     | YES         | null                |             |
| password_resets         | id                      | uuid                     | NO          | gen_random_uuid()   | PRIMARY KEY |
| password_resets         | email                   | text                     | NO          | null                |             |
| password_resets         | token                   | text                     | NO          | null                | PRIMARY KEY |
| password_resets         | expires_at              | timestamp with time zone | NO          | null                |             |
| password_resets         | used                    | boolean                  | YES         | false               |             |
| password_resets         | created_at              | timestamp with time zone | YES         | now()               |             |
| password_resets         | used_at                 | timestamp with time zone | YES         | null                |             |
| password_resets         | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| password_resets         | user_email              | text                     | YES         | null                |             |
| progress_entries        | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| progress_entries        | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| progress_entries        | anon_profile_id         | uuid                     | YES         | null                | PRIMARY KEY |
| progress_entries        | user_email              | text                     | YES         | null                |             |
| progress_entries        | date                    | date                     | YES         | CURRENT_DATE        |             |
| progress_entries        | weight_kg               | numeric                  | YES         | null                |             |
| progress_entries        | waist_cm                | numeric                  | YES         | null                |             |
| progress_entries        | chest_cm                | numeric                  | YES         | null                |             |
| progress_entries        | hips_cm                 | numeric                  | YES         | null                |             |
| progress_entries        | arms_cm                 | numeric                  | YES         | null                |             |
| progress_entries        | notes                   | text                     | YES         | null                |             |
| progress_entries        | entry_uuid              | text                     | YES         | null                |             |
| progress_entries        | created_at              | timestamp with time zone | YES         | now()               |             |
| progress_entries        | updated_at              | timestamp with time zone | YES         | now()               |             |
| progress_entries        | email                   | text                     | YES         | null                |             |
| progress_goals          | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| progress_goals          | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| progress_goals          | anon_profile_id         | uuid                     | YES         | null                | PRIMARY KEY |
| progress_goals          | user_email              | text                     | YES         | null                |             |
| progress_goals          | goal_type               | text                     | YES         | null                |             |
| progress_goals          | current_value           | numeric                  | YES         | null                |             |
| progress_goals          | target_value            | numeric                  | YES         | null                |             |
| progress_goals          | unit                    | text                     | YES         | null                |             |
| progress_goals          | target_date             | date                     | YES         | null                |             |
| progress_goals          | is_active               | boolean                  | YES         | true                |             |
| progress_goals          | created_date            | date                     | YES         | CURRENT_DATE        |             |
| progress_goals          | notes                   | text                     | YES         | null                |             |
| progress_goals          | created_at              | timestamp with time zone | YES         | now()               |             |
| progress_goals          | updated_at              | timestamp with time zone | YES         | now()               |             |
| progress_goals          | email                   | text                     | YES         | null                |             |
| roles                   | id                      | uuid                     | NO          | gen_random_uuid()   | PRIMARY KEY |
| roles                   | name                    | text                     | NO          | null                | PRIMARY KEY |
| roles                   | display_name            | text                     | YES         | null                |             |
| roles                   | description             | text                     | YES         | null                |             |
| roles                   | permissions             | jsonb                    | YES         | '{}'::jsonb         |             |
| roles                   | hierarchy_level         | integer                  | YES         | 0                   |             |
| subscription_overages   | id                      | uuid                     | NO          | gen_random_uuid()   | PRIMARY KEY |
| subscription_overages   | subscription_id         | uuid                     | YES         | null                | PRIMARY KEY |
| subscription_overages   | billing_period_start    | timestamp with time zone | NO          | null                |             |
| subscription_overages   | billing_period_end      | timestamp with time zone | NO          | null                |             |
| subscription_overages   | plan_client_limit       | integer                  | NO          | null                |             |
| subscription_overages   | actual_client_count     | integer                  | NO          | null                |             |
| subscription_overages   | overage_clients         | integer                  | NO          | null                |             |
| subscription_overages   | overage_rate_cents      | integer                  | NO          | 200                 |             |
| subscription_overages   | total_overage_cents     | integer                  | NO          | null                |             |
| subscription_overages   | stripe_invoice_item_id  | text                     | YES         | null                |             |
| subscription_overages   | processed               | boolean                  | YES         | false               |             |
| subscription_overages   | created_at              | timestamp with time zone | YES         | now()               |             |
| subscription_plans      | id                      | uuid                     | NO          | gen_random_uuid()   | PRIMARY KEY |
| subscription_plans      | plan_code               | text                     | NO          | null                | PRIMARY KEY |
| subscription_plans      | plan_name               | text                     | NO          | null                |             |
| subscription_plans      | plan_type               | text                     | NO          | null                |             |
| subscription_plans      | billing_cycle           | text                     | NO          | null                |             |
| subscription_plans      | price_cents             | integer                  | NO          | null                |             |
| subscription_plans      | currency                | text                     | NO          | 'USD'::text         |             |
| subscription_plans      | client_limit            | integer                  | YES         | null                |             |
| subscription_plans      | stripe_price_id         | text                     | YES         | null                | PRIMARY KEY |
| subscription_plans      | features                | jsonb                    | YES         | '{}'::jsonb         |             |
| subscription_plans      | active                  | boolean                  | YES         | true                |             |
| subscription_plans      | created_at              | timestamp with time zone | YES         | now()               |             |
| subscription_plans      | updated_at              | timestamp with time zone | YES         | now()               |             |
| user_preferences        | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| user_preferences        | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| user_preferences        | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| user_preferences        | user_email              | text                     | YES         | null                |             |
| user_preferences        | preferences             | jsonb                    | YES         | '{}'::jsonb         |             |
| user_preferences        | created_at              | timestamp with time zone | YES         | now()               |             |
| user_preferences        | updated_at              | timestamp with time zone | YES         | now()               |             |
| user_preferences        | anon_profile_id         | uuid                     | YES         | null                | PRIMARY KEY |
| user_preferences        | anon_profile_id         | uuid                     | YES         | null                | PRIMARY KEY |
| user_preferences        | notifications_enabled   | boolean                  | YES         | true                |             |
| user_preferences        | show_tutorials          | boolean                  | YES         | true                |             |
| user_preferences        | custom_preferences      | jsonb                    | YES         | '{}'::jsonb         |             |
| user_preferences        | email                   | text                     | YES         | null                |             |
| user_preferences        | theme                   | text                     | YES         | 'light'::text       |             |
| user_preferences        | unit_system             | text                     | YES         | 'imperial'::text    |             |
| user_preferences        | language                | text                     | YES         | 'en'::text          |             |
| user_preferences        | timezone                | text                     | YES         | 'UTC'::text         |             |
| user_profiles           | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| user_profiles           | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| user_profiles           | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| user_profiles           | anon_profile_id         | uuid                     | YES         | null                | PRIMARY KEY |
| user_profiles           | user_email              | text                     | YES         | null                |             |
| user_profiles           | user_name               | text                     | YES         | null                |             |
| user_profiles           | unit_system             | text                     | YES         | 'metric'::text      |             |
| user_profiles           | daily_targets           | jsonb                    | YES         | '{}'::jsonb         |             |
| user_profiles           | assignment_status       | text                     | YES         | 'unassigned'::text  |             |
| user_profiles           | coach_invite_code       | text                     | YES         | null                |             |
| user_profiles           | assigned_coach          | text                     | YES         | null                |             |
| user_profiles           | assigned_coach_email    | text                     | YES         | null                |             |
| user_profiles           | coach_assignment_date   | timestamp with time zone | YES         | null                |             |
| user_profiles           | coach_user_id           | uuid                     | YES         | null                |             |
| user_profiles           | migration_status        | text                     | YES         | 'uuid_native'::text |             |
| user_profiles           | schema_version_text     | text                     | YES         | 'v3_new'::text      |             |
| user_profiles           | created_at              | timestamp with time zone | YES         | now()               |             |
| user_profiles           | updated_at              | timestamp with time zone | YES         | now()               |             |
| user_profiles           | role                    | text                     | YES         | null                |             |
| user_profiles           | computed_role           | text                     | YES         | 'client'::text      |             |
| user_profiles           | is_admin                | boolean                  | YES         | false               |             |
| user_profiles           | subscription_status     | text                     | YES         | 'inactive'::text    |             |
| user_profiles           | subscription_expires_at | timestamp with time zone | YES         | null                |             |
| user_profiles           | stripe_customer_id      | text                     | YES         | null                |             |
| user_roles              | user_id                 | uuid                     | NO          | null                | PRIMARY KEY |
| user_roles              | user_id                 | uuid                     | NO          | null                | PRIMARY KEY |
| user_roles              | role_id                 | uuid                     | NO          | null                | PRIMARY KEY |
| user_roles              | role_id                 | uuid                     | NO          | null                | PRIMARY KEY |
| user_roles              | role                    | text                     | YES         | null                |             |
| user_subscriptions      | id                      | uuid                     | NO          | gen_random_uuid()   | PRIMARY KEY |
| user_subscriptions      | user_id                 | uuid                     | YES         | null                | PRIMARY KEY |
| user_subscriptions      | subscription_plan_id    | uuid                     | YES         | null                | PRIMARY KEY |
| user_subscriptions      | stripe_subscription_id  | text                     | YES         | null                | PRIMARY KEY |
| user_subscriptions      | stripe_customer_id      | text                     | YES         | null                |             |
| user_subscriptions      | status                  | text                     | NO          | null                |             |
| user_subscriptions      | current_period_start    | timestamp with time zone | YES         | null                |             |
| user_subscriptions      | current_period_end      | timestamp with time zone | YES         | null                |             |
| user_subscriptions      | cancel_at_period_end    | boolean                  | YES         | false               |             |
| user_subscriptions      | trial_end               | timestamp with time zone | YES         | null                |             |
| user_subscriptions      | created_at              | timestamp with time zone | YES         | now()               |             |
| user_subscriptions      | updated_at              | timestamp with time zone | YES         | now()               |             |
| webhook_events          | id                      | uuid                     | NO          | gen_random_uuid()   | PRIMARY KEY |
| webhook_events          | stripe_event_id         | text                     | NO          | null                | PRIMARY KEY |
| webhook_events          | event_type              | text                     | NO          | null                |             |
| webhook_events          | processed               | boolean                  | YES         | false               |             |
| webhook_events          | processing_attempts     | integer                  | YES         | 0                   |             |
| webhook_events          | last_error              | text                     | YES         | null                |             |
| webhook_events          | data                    | jsonb                    | YES         | null                |             |
| webhook_events          | created_at              | timestamp with time zone | YES         | now()               |             |
| webhook_events          | processed_at            | timestamp with time zone | YES         | null                |             |
| progress_reports        | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| progress_reports        | coach_user_id           | uuid                     | YES         | null                | FOREIGN KEY |
| progress_reports        | coach_email             | text                     | NO          | null                |             |
| progress_reports        | client_user_id          | uuid                     | YES         | null                | FOREIGN KEY |
| progress_reports        | client_email            | text                     | YES         | null                |             |
| progress_reports        | client_anon_profile_id  | uuid                     | YES         | null                | FOREIGN KEY |
| progress_reports        | report_type             | text                     | NO          | null                |             |
| progress_reports        | report_title            | text                     | NO          | null                |             |
| progress_reports        | date_from               | date                     | NO          | null                |             |
| progress_reports        | date_to                 | date                     | NO          | null                |             |
| progress_reports        | report_status           | text                     | NO          | 'generating'::text  |             |
| progress_reports        | report_data             | jsonb                    | YES         | '{}'::jsonb         |             |
| progress_reports        | report_file_url         | text                     | YES         | null                |             |
| progress_reports        | file_size_bytes         | bigint                   | YES         | null                |             |
| progress_reports        | template_id             | uuid                     | YES         | null                |             |
| progress_reports        | generation_time_ms      | integer                  | YES         | null                |             |
| progress_reports        | error_message           | text                     | YES         | null                |             |
| progress_reports        | generated_at            | timestamp with time zone | YES         | null                |             |
| progress_reports        | expires_at              | timestamp with time zone | YES         | null                |             |
| progress_reports        | created_at              | timestamp with time zone | YES         | now()               |             |
| progress_reports        | updated_at              | timestamp with time zone | YES         | now()               |             |
| report_templates        | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| report_templates        | coach_user_id           | uuid                     | YES         | null                | FOREIGN KEY |
| report_templates        | coach_email             | text                     | YES         | null                |             |
| report_templates        | template_name           | text                     | NO          | null                |             |
| report_templates        | template_description    | text                     | YES         | null                |             |
| report_templates        | template_config         | jsonb                    | NO          | '{}'::jsonb         |             |
| report_templates        | is_default              | boolean                  | YES         | false               |             |
| report_templates        | is_system_template      | boolean                  | YES         | false               |             |
| report_templates        | is_active               | boolean                  | YES         | true                |             |
| report_templates        | usage_count             | integer                  | YES         | 0                   |             |
| report_templates        | last_used_at            | timestamp with time zone | YES         | null                |             |
| report_templates        | created_at              | timestamp with time zone | YES         | now()               |             |
| report_templates        | updated_at              | timestamp with time zone | YES         | now()               |             |
| report_metrics_cache    | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| report_metrics_cache    | client_user_id          | uuid                     | YES         | null                | FOREIGN KEY |
| report_metrics_cache    | client_email            | text                     | YES         | null                |             |
| report_metrics_cache    | client_anon_profile_id  | uuid                     | YES         | null                | FOREIGN KEY |
| report_metrics_cache    | metric_date             | date                     | NO          | null                |             |
| report_metrics_cache    | cache_period            | text                     | NO          | null                |             |
| report_metrics_cache    | daily_adherence_score   | numeric(5,2)             | YES         | null                |             |
| report_metrics_cache    | macro_breakdown         | jsonb                    | YES         | '{}'::jsonb         |             |
| report_metrics_cache    | meal_timing_data        | jsonb                    | YES         | '{}'::jsonb         |             |
| report_metrics_cache    | streak_data             | jsonb                    | YES         | '{}'::jsonb         |             |
| report_metrics_cache    | progress_metrics        | jsonb                    | YES         | '{}'::jsonb         |             |
| report_metrics_cache    | calculation_version     | integer                  | YES         | 1                   |             |
| report_metrics_cache    | is_complete             | boolean                  | YES         | false               |             |
| report_metrics_cache    | calculated_at           | timestamp with time zone | YES         | now()               |             |
| report_metrics_cache    | expires_at              | timestamp with time zone | YES         | now() + 7 days      |             |
| report_shares           | id                      | uuid                     | NO          | uuid_generate_v4()  | PRIMARY KEY |
| report_shares           | report_id               | uuid                     | YES         | null                | FOREIGN KEY |
| report_shares           | shared_with_email       | text                     | NO          | null                |             |
| report_shares           | shared_by_coach_email   | text                     | NO          | null                |             |
| report_shares           | share_token             | text                     | NO          | null                | UNIQUE      |
| report_shares           | can_download            | boolean                  | YES         | true                |             |
| report_shares           | access_count            | integer                  | YES         | 0                   |             |
| report_shares           | max_access_count        | integer                  | YES         | null                |             |
| report_shares           | expires_at              | timestamp with time zone | YES         | null                |             |
| report_shares           | last_accessed_at        | timestamp with time zone | YES         | null                |             |
| report_shares           | created_at              | timestamp with time zone | YES         | now()               |             |


## Foreign Key Relationships

| constraint_name                              | table_name              | column_name          | foreign_table_name | foreign_column_name |
| -------------------------------------------- | ----------------------- | -------------------- | ------------------ | ------------------- |
| coach_assignments_client_id_fkey             | coach_assignments       | client_id            | user_profiles      | id                  |
| coach_assignments_coach_id_fkey              | coach_assignments       | coach_id             | user_profiles      | id                  |
| custom_recipes_anon_profile_id_fkey          | custom_recipes          | anon_profile_id      | anonymous_profiles | id                  |
| daily_meals_anon_profile_id_fkey             | daily_meals             | anon_profile_id      | anonymous_profiles | id                  |
| daily_targets_anon_profile_fkey              | daily_targets           | anon_profile_id      | anonymous_profiles | id                  |
| fk_invitation_codes_assigns_role_id          | invitation_codes        | assigns_role_id      | roles              | id                  |
| fk_invitation_codes_creator                  | invitation_codes        | creator_id           | user_profiles      | id                  |
| invite_code_redemptions_invite_code_id_fkey  | invite_code_redemptions | invite_code_id       | invite_codes       | id                  |
| macro_calculations_anon_profile_id_fkey      | macro_calculations      | anon_profile_id      | anonymous_profiles | id                  |
| meal_plans_anon_profile_id_fkey              | meal_plans              | anon_profile_id      | anonymous_profiles | id                  |
| progress_entries_anon_profile_id_fkey        | progress_entries        | anon_profile_id      | anonymous_profiles | id                  |
| progress_goals_anon_profile_id_fkey          | progress_goals          | anon_profile_id      | anonymous_profiles | id                  |
| subscription_overages_subscription_id_fkey   | subscription_overages   | subscription_id      | user_subscriptions | id                  |
| user_preferences_anon_profile_fkey           | user_preferences        | anon_profile_id      | anonymous_profiles | id                  |
| user_profiles_anon_profile_id_fkey           | user_profiles           | anon_profile_id      | anonymous_profiles | id                  |
| user_roles_role_id_fkey                      | user_roles              | role_id              | roles              | id                  |
| user_roles_user_id_fkey                      | user_roles              | user_id              | user_profiles      | id                  |
| user_subscriptions_subscription_plan_id_fkey | user_subscriptions      | subscription_plan_id | subscription_plans | id                  |
| progress_reports_coach_user_id_fkey          | progress_reports        | coach_user_id        | auth.users         | id                  |
| progress_reports_client_user_id_fkey         | progress_reports        | client_user_id       | auth.users         | id                  |
| progress_reports_client_anon_profile_id_fkey | progress_reports        | client_anon_profile_id | anonymous_profiles | id                  |
| report_templates_coach_user_id_fkey          | report_templates        | coach_user_id        | auth.users         | id                  |
| report_metrics_cache_client_user_id_fkey     | report_metrics_cache    | client_user_id       | auth.users         | id                  |
| report_metrics_cache_client_anon_profile_fkey | report_metrics_cache   | client_anon_profile_id | anonymous_profiles | id                  |
| report_shares_report_id_fkey                 | report_shares           | report_id            | progress_reports   | id                  |


## Unique Constraints and Indexes
| table_name              | constraint_name                               | constraint_type | columns                |
| ----------------------- | --------------------------------------------- | --------------- | ---------------------- |
| anonymous_profiles      | anonymous_profiles_pkey                       | PRIMARY KEY     | id                     |
| coach_assignments       | coach_assignments_pkey                        | PRIMARY KEY     | id                     |
| coach_assignments       | coach_assignments_coach_id_client_id_key      | UNIQUE          | coach_id, client_id    |
| custom_recipes          | custom_recipes_pkey                           | PRIMARY KEY     | id                     |
| daily_meals             | daily_meals_pkey                              | PRIMARY KEY     | id                     |
| daily_targets           | daily_targets_pkey                            | PRIMARY KEY     | id                     |
| daily_targets           | unique_daily_targets_anon_id                  | UNIQUE          | anon_profile_id        |
| daily_targets           | unique_daily_targets_user_id                  | UNIQUE          | user_id                |
| invitation_codes        | invitation_codes_pkey                         | PRIMARY KEY     | id                     |
| invitation_codes        | invitation_codes_code_key                     | UNIQUE          | code                   |
| invite_code_redemptions | invite_code_redemptions_pkey                  | PRIMARY KEY     | id                     |
| invite_codes            | invite_codes_pkey                             | PRIMARY KEY     | id                     |
| invite_codes            | invite_codes_code_key                         | UNIQUE          | code                   |
| invites                 | invites_pkey                                  | PRIMARY KEY     | id                     |
| invites                 | invites_email_key                             | UNIQUE          | email                  |
| invites                 | invites_token_key                             | UNIQUE          | token                  |
| macro_calculations      | macro_calculations_pkey                       | PRIMARY KEY     | id                     |
| macro_history           | macro_history_pkey                            | PRIMARY KEY     | id                     |
| macro_history           | unique_user_macro_entry                       | UNIQUE          | date, user_id          |
| meal_plans              | meal_plans_pkey                               | PRIMARY KEY     | id                     |
| password_resets         | password_resets_pkey                          | PRIMARY KEY     | id                     |
| password_resets         | password_resets_token_key                     | UNIQUE          | token                  |
| progress_entries        | progress_entries_pkey                         | PRIMARY KEY     | id                     |
| progress_goals          | progress_goals_pkey                           | PRIMARY KEY     | id                     |
| roles                   | roles_pkey                                    | PRIMARY KEY     | id                     |
| roles                   | roles_name_key                                | UNIQUE          | name                   |
| subscription_overages   | subscription_overages_pkey                    | PRIMARY KEY     | id                     |
| subscription_plans      | subscription_plans_pkey                       | PRIMARY KEY     | id                     |
| subscription_plans      | subscription_plans_plan_code_key              | UNIQUE          | plan_code              |
| subscription_plans      | subscription_plans_stripe_price_id_key        | UNIQUE          | stripe_price_id        |
| user_preferences        | user_preferences_pkey                         | PRIMARY KEY     | id                     |
| user_preferences        | unique_user_preferences_anon_id               | UNIQUE          | anon_profile_id        |
| user_preferences        | unique_user_preferences_user_id               | UNIQUE          | user_id                |
| user_profiles           | user_profiles_pkey                            | PRIMARY KEY     | id                     |
| user_profiles           | unique_user_profiles_id                       | UNIQUE          | id                     |
| user_roles              | user_roles_pkey                               | PRIMARY KEY     | user_id, role_id       |
| user_subscriptions      | user_subscriptions_pkey                       | PRIMARY KEY     | id                     |
| user_subscriptions      | user_subscriptions_stripe_subscription_id_key | UNIQUE          | stripe_subscription_id |
| webhook_events          | webhook_events_pkey                           | PRIMARY KEY     | id                     |
| progress_reports        | progress_reports_pkey                         | PRIMARY KEY     | id                     |
| report_templates        | report_templates_pkey                         | PRIMARY KEY     | id                     |
| report_templates        | report_templates_coach_user_id_template_name_key | UNIQUE       | coach_user_id, template_name |
| report_metrics_cache    | report_metrics_cache_pkey                     | PRIMARY KEY     | id                     |
| report_metrics_cache    | report_metrics_cache_client_user_id_metric_date_cache_period_key | UNIQUE | client_user_id, metric_date, cache_period |
| report_metrics_cache    | report_metrics_cache_client_email_metric_date_cache_period_key   | UNIQUE | client_email, metric_date, cache_period |
| report_metrics_cache    | report_metrics_cache_client_anon_profile_id_metric_date_key      | UNIQUE | client_anon_profile_id, metric_date, cache_period |
| report_shares           | report_shares_pkey                            | PRIMARY KEY     | id                     |
| report_shares           | report_shares_share_token_key                 | UNIQUE          | share_token            |
| webhook_events          | webhook_events_stripe_event_id_key            | UNIQUE          | stripe_event_id        |


## Constraints

| table_name              | constraint_name                         | check_clause                                                                                                                     |
| ----------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| anonymous_profiles      | 2200_23934_1_not_null                   | id IS NOT NULL                                                                                                                   |
| coach_assignments       | 2200_35344_1_not_null                   | id IS NOT NULL                                                                                                                   |
| custom_recipes          | 2200_24020_1_not_null                   | id IS NOT NULL                                                                                                                   |
| custom_recipes          | 2200_24020_5_not_null                   | recipe_name IS NOT NULL                                                                                                          |
| daily_meals             | 2200_23973_1_not_null                   | id IS NOT NULL                                                                                                                   |
| daily_meals             | 2200_23973_6_not_null                   | meal_name IS NOT NULL                                                                                                            |
| daily_targets           | 2200_24094_1_not_null                   | id IS NOT NULL                                                                                                                   |
| invitation_codes        | 2200_27606_2_not_null                   | code IS NOT NULL                                                                                                                 |
| invitation_codes        | 2200_27606_1_not_null                   | id IS NOT NULL                                                                                                                   |
| invitation_codes        | 2200_27606_4_not_null                   | coach_name IS NOT NULL                                                                                                           |
| invitation_codes        | 2200_27606_3_not_null                   | coach_email IS NOT NULL                                                                                                          |
| invite_code_redemptions | 2200_26412_1_not_null                   | id IS NOT NULL                                                                                                                   |
| invite_code_redemptions | 2200_26412_3_not_null                   | code IS NOT NULL                                                                                                                 |
| invite_codes            | 2200_26396_2_not_null                   | code IS NOT NULL                                                                                                                 |
| invite_codes            | 2200_26396_1_not_null                   | id IS NOT NULL                                                                                                                   |
| invite_codes            | 2200_26396_3_not_null                   | coach_email IS NOT NULL                                                                                                          |
| invites                 | 2200_41308_2_not_null                   | email IS NOT NULL                                                                                                                |
| invites                 | valid_email                             | (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)                                                              |
| invites                 | token_length                            | (char_length(token) >= 32)                                                                                                       |
| invites                 | future_expiry                           | (expires_at > created_at)                                                                                                        |
| invites                 | 2200_41308_6_not_null                   | expires_at IS NOT NULL                                                                                                           |
| invites                 | 2200_41308_1_not_null                   | id IS NOT NULL                                                                                                                   |
| invites                 | 2200_41308_3_not_null                   | token IS NOT NULL                                                                                                                |
| macro_calculations      | 2200_24126_1_not_null                   | id IS NOT NULL                                                                                                                   |
| macro_history           | check_user_identifier                   | (((user_id IS NOT NULL) AND (anon_profile_id IS NULL)) OR ((user_id IS NULL) AND (anon_profile_id IS NOT NULL)))                 |
| macro_history           | 2200_22003_1_not_null                   | id IS NOT NULL                                                                                                                   |
| macro_history           | check_user_identifier                   | ((user_id IS NOT NULL) OR (anon_profile_id IS NOT NULL))                                                                         |
| macro_history           | 2200_22003_4_not_null                   | entry_date IS NOT NULL                                                                                                           |
| meal_plans              | meal_plans_day_of_week_check            | ((day_of_week >= 0) AND (day_of_week <= 6))                                                                                      |
| meal_plans              | 2200_24046_1_not_null                   | id IS NOT NULL                                                                                                                   |
| password_resets         | 2200_46476_4_not_null                   | expires_at IS NOT NULL                                                                                                           |
| password_resets         | 2200_46476_1_not_null                   | id IS NOT NULL                                                                                                                   |
| password_resets         | 2200_46476_2_not_null                   | email IS NOT NULL                                                                                                                |
| password_resets         | 2200_46476_3_not_null                   | token IS NOT NULL                                                                                                                |
| progress_entries        | 2200_23999_1_not_null                   | id IS NOT NULL                                                                                                                   |
| progress_goals          | 2200_24072_1_not_null                   | id IS NOT NULL                                                                                                                   |
| roles                   | 2200_29086_1_not_null                   | id IS NOT NULL                                                                                                                   |
| roles                   | 2200_29086_2_not_null                   | name IS NOT NULL                                                                                                                 |
| subscription_overages   | 2200_47852_3_not_null                   | billing_period_start IS NOT NULL                                                                                                 |
| subscription_overages   | 2200_47852_4_not_null                   | billing_period_end IS NOT NULL                                                                                                   |
| subscription_overages   | 2200_47852_5_not_null                   | plan_client_limit IS NOT NULL                                                                                                    |
| subscription_overages   | 2200_47852_6_not_null                   | actual_client_count IS NOT NULL                                                                                                  |
| subscription_overages   | 2200_47852_7_not_null                   | overage_clients IS NOT NULL                                                                                                      |
| subscription_overages   | 2200_47852_8_not_null                   | overage_rate_cents IS NOT NULL                                                                                                   |
| subscription_overages   | 2200_47852_9_not_null                   | total_overage_cents IS NOT NULL                                                                                                  |
| subscription_overages   | 2200_47852_1_not_null                   | id IS NOT NULL                                                                                                                   |
| subscription_plans      | 2200_47808_1_not_null                   | id IS NOT NULL                                                                                                                   |
| subscription_plans      | 2200_47808_4_not_null                   | plan_type IS NOT NULL                                                                                                            |
| subscription_plans      | 2200_47808_5_not_null                   | billing_cycle IS NOT NULL                                                                                                        |
| subscription_plans      | 2200_47808_6_not_null                   | price_cents IS NOT NULL                                                                                                          |
| subscription_plans      | 2200_47808_7_not_null                   | currency IS NOT NULL                                                                                                             |
| subscription_plans      | subscription_plans_plan_type_check      | (plan_type = ANY (ARRAY['client'::text, 'coach'::text]))                                                                         |
| subscription_plans      | subscription_plans_billing_cycle_check  | (billing_cycle = ANY (ARRAY['monthly'::text, 'annual'::text]))                                                                   |
| subscription_plans      | 2200_47808_2_not_null                   | plan_code IS NOT NULL                                                                                                            |
| subscription_plans      | 2200_47808_3_not_null                   | plan_name IS NOT NULL                                                                                                            |
| user_preferences        | 2200_24110_1_not_null                   | id IS NOT NULL                                                                                                                   |
| user_profiles           | 2200_23945_1_not_null                   | id IS NOT NULL                                                                                                                   |
| user_profiles           | check_user_identifier                   | (((user_id IS NOT NULL) AND (anon_profile_id IS NULL)) OR ((user_id IS NULL) AND (anon_profile_id IS NOT NULL)))                 |
| user_profiles           | check_user_identifier                   | ((user_id IS NOT NULL) OR (anon_profile_id IS NOT NULL))                                                                         |
| user_profiles           | user_profiles_assignment_status_check   | (assignment_status = ANY (ARRAY['owner'::text, 'coach'::text, 'active'::text, 'unassigned'::text]))                              |
| user_profiles           | user_profiles_role_check                | (role = ANY (ARRAY['admin'::text, 'client'::text, 'coach'::text, 'owner'::text]))                                                |
| user_profiles           | user_profiles_subscription_status_check | (subscription_status = ANY (ARRAY['active'::text, 'inactive'::text, 'trial'::text, 'expired'::text, 'canceled'::text]))          |
| user_profiles           | user_profiles_unit_system_check         | (unit_system = ANY (ARRAY['imperial'::text, 'metric'::text]))                                                                    |
| user_roles              | 2200_29100_1_not_null                   | user_id IS NOT NULL                                                                                                              |
| user_roles              | 2200_29100_2_not_null                   | role_id IS NOT NULL                                                                                                              |
| user_subscriptions      | 2200_47827_1_not_null                   | id IS NOT NULL                                                                                                                   |
| user_subscriptions      | user_subscriptions_status_check         | (status = ANY (ARRAY['active'::text, 'canceled'::text, 'past_due'::text, 'unpaid'::text, 'trialing'::text, 'incomplete'::text])) |
| user_subscriptions      | 2200_47827_6_not_null                   | status IS NOT NULL                                                                                                               |
| webhook_events          | 2200_47868_2_not_null                   | stripe_event_id IS NOT NULL                                                                                                      |
| webhook_events          | 2200_47868_1_not_null                   | id IS NOT NULL                                                                                                                   |
| webhook_events          | 2200_47868_3_not_null                   | event_type IS NOT NULL                                                                                                           |

## Row Level Security (RLS) Policies

| schemaname | tablename               | policyname                                      | permissive | roles           | cmd    | qual                                                                                                                                                                                                                                               | with_check                                                                                                                                                                                                                                                                                |
| ---------- | ----------------------- | ----------------------------------------------- | ---------- | --------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public     | anonymous_profiles      | anon_profiles_owner_delete                      | PERMISSIVE | {public}        | DELETE | ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = anonymous_profiles.id) AND ((up.user_id = auth.uid()) OR (up.coach_user_id = auth.uid()))))) OR (auth.role() = 'service_role'::text))                                  | null                                                                                                                                                                                                                                                                                      |
| public     | anonymous_profiles      | anon_profiles_owner_update                      | PERMISSIVE | {public}        | UPDATE | ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = anonymous_profiles.id) AND ((up.user_id = auth.uid()) OR (up.coach_user_id = auth.uid()))))) OR (auth.role() = 'service_role'::text))                                  | ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = anonymous_profiles.id) AND ((up.user_id = auth.uid()) OR (up.coach_user_id = auth.uid()))))) OR (auth.role() = 'service_role'::text))                                                                         |
| public     | anonymous_profiles      | anon_profiles_public_select                     | PERMISSIVE | {public}        | SELECT | true                                                                                                                                                                                                                                               | null                                                                                                                                                                                                                                                                                      |
| public     | anonymous_profiles      | anon_profiles_service_manage                    | PERMISSIVE | {public}        | ALL    | (auth.role() = 'service_role'::text)                                                                                                                                                                                                               | (auth.role() = 'service_role'::text)                                                                                                                                                                                                                                                      |
| public     | custom_recipes          | Users can insert their own custom recipes       | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | (auth.uid() = user_id)                                                                                                                                                                                                                                                                    |
| public     | custom_recipes          | Users can update their own custom recipes       | PERMISSIVE | {public}        | UPDATE | (auth.uid() = user_id)                                                                                                                                                                                                                             | (auth.uid() = user_id)                                                                                                                                                                                                                                                                    |
| public     | custom_recipes          | Users can view their own custom recipes         | PERMISSIVE | {public}        | SELECT | (auth.uid() = user_id)                                                                                                                                                                                                                             | null                                                                                                                                                                                                                                                                                      |
| public     | custom_recipes          | admin_full_access_custom_recipes_delete         | PERMISSIVE | {public}        | DELETE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | custom_recipes          | admin_full_access_custom_recipes_insert         | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | custom_recipes          | admin_full_access_custom_recipes_select         | PERMISSIVE | {public}        | SELECT | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | custom_recipes          | admin_full_access_custom_recipes_update         | PERMISSIVE | {public}        | UPDATE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | custom_recipes          | custom_recipes_delete                           | PERMISSIVE | {public}        | DELETE | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = custom_recipes.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                              | null                                                                                                                                                                                                                                                                                      |
| public     | custom_recipes          | custom_recipes_insert                           | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | (((user_id IS NOT NULL) AND (user_id = auth.uid())) OR ((anon_profile_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = custom_recipes.anon_profile_id) AND (up.coach_user_id = auth.uid()))))) OR (auth.role() = 'service_role'::text))     |
| public     | custom_recipes          | custom_recipes_select                           | PERMISSIVE | {public}        | SELECT | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = custom_recipes.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                              | null                                                                                                                                                                                                                                                                                      |
| public     | custom_recipes          | custom_recipes_update                           | PERMISSIVE | {public}        | UPDATE | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = custom_recipes.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                              | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = custom_recipes.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                                                                     |
| public     | daily_meals             | Coaches can view assigned clients meals         | PERMISSIVE | {public}        | SELECT | check_coach_client_access(user_id)                                                                                                                                                                                                                 | null                                                                                                                                                                                                                                                                                      |
| public     | daily_meals             | admin_full_access_daily_meals_delete            | PERMISSIVE | {public}        | DELETE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | daily_meals             | admin_full_access_daily_meals_insert            | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | daily_meals             | admin_full_access_daily_meals_select            | PERMISSIVE | {public}        | SELECT | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | daily_meals             | admin_full_access_daily_meals_update            | PERMISSIVE | {public}        | UPDATE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | daily_meals             | daily_meals_delete                              | PERMISSIVE | {public}        | DELETE | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = daily_meals.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                                 | null                                                                                                                                                                                                                                                                                      |
| public     | daily_meals             | daily_meals_insert                              | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | (((user_id IS NOT NULL) AND (user_id = auth.uid())) OR ((anon_profile_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = daily_meals.anon_profile_id) AND (up.coach_user_id = auth.uid()))))) OR (auth.role() = 'service_role'::text))        |
| public     | daily_meals             | daily_meals_select                              | PERMISSIVE | {public}        | SELECT | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = daily_meals.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                                 | null                                                                                                                                                                                                                                                                                      |
| public     | daily_meals             | daily_meals_update                              | PERMISSIVE | {public}        | UPDATE | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = daily_meals.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                                 | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = daily_meals.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                                                                        |
| public     | daily_targets           | admin_full_access_daily_targets_delete          | PERMISSIVE | {public}        | DELETE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | daily_targets           | admin_full_access_daily_targets_insert          | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | daily_targets           | admin_full_access_daily_targets_select          | PERMISSIVE | {public}        | SELECT | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | daily_targets           | admin_full_access_daily_targets_update          | PERMISSIVE | {public}        | UPDATE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | daily_targets           | daily_targets_delete                            | PERMISSIVE | {public}        | DELETE | ((user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                                                   | null                                                                                                                                                                                                                                                                                      |
| public     | daily_targets           | daily_targets_insert                            | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | ((user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                                                                                          |
| public     | daily_targets           | daily_targets_secure_delete                     | PERMISSIVE | {public}        | DELETE | ((user_id = auth.uid()) OR is_owner(auth.uid()) OR (auth.email() = 'elhambigzad2@gmail.com'::text))                                                                                                                                                | null                                                                                                                                                                                                                                                                                      |
| public     | daily_targets           | daily_targets_secure_select                     | PERMISSIVE | {public}        | SELECT | ((user_id = auth.uid()) OR ((anon_profile_id IS NOT NULL) AND (user_id IS NULL)) OR is_owner(auth.uid()) OR (auth.email() = 'elhambigzad2@gmail.com'::text))                                                                                       | null                                                                                                                                                                                                                                                                                      |
| public     | daily_targets           | daily_targets_secure_update                     | PERMISSIVE | {public}        | UPDATE | ((user_id = auth.uid()) OR ((anon_profile_id IS NOT NULL) AND (user_id IS NULL)) OR is_owner(auth.uid()) OR (auth.email() = 'elhambigzad2@gmail.com'::text))                                                                                       | ((user_id = auth.uid()) OR ((anon_profile_id IS NOT NULL) AND (user_id IS NULL)) OR is_owner(auth.uid()) OR (auth.email() = 'elhambigzad2@gmail.com'::text))                                                                                                                              |
| public     | daily_targets           | daily_targets_select                            | PERMISSIVE | {public}        | SELECT | ((user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                                                   | null                                                                                                                                                                                                                                                                                      |
| public     | daily_targets           | daily_targets_update                            | PERMISSIVE | {public}        | UPDATE | ((user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                                                   | ((user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                                                                                          |
| public     | daily_targets           | secure_insert_daily_targets                     | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | ((user_id = auth.uid()) OR ((user_id IS NULL) AND (anon_profile_id IS NOT NULL)))                                                                                                                                                                                                         |
| public     | invitation_codes        | Allow anonymous invitation code validation      | PERMISSIVE | {anon}          | SELECT | (is_active = true)                                                                                                                                                                                                                                 | null                                                                                                                                                                                                                                                                                      |
| public     | invitation_codes        | Allow coach admin owner access                  | PERMISSIVE | {public}        | ALL    | ((auth.uid() IN ( SELECT user_profiles.user_id
   FROM user_profiles
  WHERE (user_profiles.role = ANY (ARRAY['coach'::text, 'admin'::text, 'owner'::text])))) OR (coach_user_id = auth.uid()))                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | invitation_codes        | Coaches can create own invitation codes         | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | ((auth.email() = coach_email) AND (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_email = auth.email()) AND (user_profiles.assignment_status = ANY (ARRAY['coach'::text, 'owner'::text]))))))                                                                       |
| public     | invitation_codes        | Coaches can delete own invitation codes         | PERMISSIVE | {public}        | DELETE | ((creator_id = auth.uid()) OR (auth.uid() IN ( SELECT p.id
   FROM ((user_profiles p
     JOIN user_roles ur ON ((p.id = ur.user_id)))
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE (r.name = ANY (ARRAY['admin'::text, 'owner'::text]))))) | null                                                                                                                                                                                                                                                                                      |
| public     | invitation_codes        | Coaches can insert invitation codes             | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | ((creator_id = auth.uid()) AND (auth.uid() IN ( SELECT p.id
   FROM ((user_profiles p
     JOIN user_roles ur ON ((p.id = ur.user_id)))
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE (r.name = ANY (ARRAY['coach'::text, 'admin'::text, 'owner'::text])))))                        |
| public     | invitation_codes        | Coaches can update own invitation codes         | PERMISSIVE | {public}        | UPDATE | ((creator_id = auth.uid()) OR (auth.uid() IN ( SELECT p.id
   FROM ((user_profiles p
     JOIN user_roles ur ON ((p.id = ur.user_id)))
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE (r.name = ANY (ARRAY['admin'::text, 'owner'::text]))))) | null                                                                                                                                                                                                                                                                                      |
| public     | invitation_codes        | Coaches can view own invitation codes           | PERMISSIVE | {public}        | SELECT | ((creator_id = auth.uid()) OR (auth.uid() IN ( SELECT p.id
   FROM ((user_profiles p
     JOIN user_roles ur ON ((p.id = ur.user_id)))
     JOIN roles r ON ((ur.role_id = r.id)))
  WHERE (r.name = ANY (ARRAY['admin'::text, 'owner'::text]))))) | null                                                                                                                                                                                                                                                                                      |
| public     | invitation_codes        | Owners can view all invitation codes            | PERMISSIVE | {public}        | SELECT | (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_email = auth.email()) AND (user_profiles.assignment_status = 'owner'::text))))                                                                                               | null                                                                                                                                                                                                                                                                                      |
| public     | invite_code_redemptions | Allow authenticated access                      | PERMISSIVE | {public}        | ALL    | (auth.role() = 'authenticated'::text)                                                                                                                                                                                                              | null                                                                                                                                                                                                                                                                                      |
| public     | invite_code_redemptions | Allow redemption tracking                       | PERMISSIVE | {public}        | ALL    | ((auth.uid() = user_id) OR (auth.uid() IN ( SELECT user_profiles.user_id
   FROM user_profiles
  WHERE (user_profiles.role = ANY (ARRAY['coach'::text, 'admin'::text, 'owner'::text])))))                                                          | null                                                                                                                                                                                                                                                                                      |
| public     | invite_codes            | Allow authenticated access                      | PERMISSIVE | {public}        | ALL    | (auth.role() = 'authenticated'::text)                                                                                                                                                                                                              | null                                                                                                                                                                                                                                                                                      |
| public     | invite_codes            | Allow coach admin owner access                  | PERMISSIVE | {public}        | ALL    | ((auth.uid() IN ( SELECT user_profiles.user_id
   FROM user_profiles
  WHERE (user_profiles.role = ANY (ARRAY['coach'::text, 'admin'::text, 'owner'::text])))) OR (coach_user_id = auth.uid()))                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | invites                 | Owners and admins can create invites            | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['owner'::text, 'admin'::text])))))                                                                                                                            |
| public     | invites                 | Owners and admins can update invites            | PERMISSIVE | {public}        | UPDATE | (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['owner'::text, 'admin'::text])))))                                                                                     | null                                                                                                                                                                                                                                                                                      |
| public     | invites                 | Owners and admins can view all invites          | PERMISSIVE | {public}        | SELECT | (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['owner'::text, 'admin'::text])))))                                                                                     | null                                                                                                                                                                                                                                                                                      |
| public     | invites                 | Public can read invites for token validation    | PERMISSIVE | {public}        | SELECT | ((used = false) AND (expires_at > now()))                                                                                                                                                                                                          | null                                                                                                                                                                                                                                                                                      |
| public     | macro_calculations      | admin_full_access_macro_calculations_delete     | PERMISSIVE | {public}        | DELETE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | macro_calculations      | admin_full_access_macro_calculations_insert     | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | macro_calculations      | admin_full_access_macro_calculations_select     | PERMISSIVE | {public}        | SELECT | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | macro_calculations      | admin_full_access_macro_calculations_update     | PERMISSIVE | {public}        | UPDATE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | macro_calculations      | macro_calculations_delete                       | PERMISSIVE | {public}        | DELETE | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = macro_calculations.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                          | null                                                                                                                                                                                                                                                                                      |
| public     | macro_calculations      | macro_calculations_insert                       | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | (((user_id IS NOT NULL) AND (user_id = auth.uid())) OR ((anon_profile_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = macro_calculations.anon_profile_id) AND (up.coach_user_id = auth.uid()))))) OR (auth.role() = 'service_role'::text)) |
| public     | macro_calculations      | macro_calculations_select                       | PERMISSIVE | {public}        | SELECT | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = macro_calculations.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                          | null                                                                                                                                                                                                                                                                                      |
| public     | macro_calculations      | macro_calculations_update                       | PERMISSIVE | {public}        | UPDATE | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = macro_calculations.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                          | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = macro_calculations.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                                                                 |
| public     | macro_history           | Coaches can view assigned clients macro history | PERMISSIVE | {public}        | SELECT | check_coach_client_access(user_id)                                                                                                                                                                                                                 | null                                                                                                                                                                                                                                                                                      |
| public     | macro_history           | Users can insert their own macro history        | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | (auth.uid() = user_id)                                                                                                                                                                                                                                                                    |
| public     | macro_history           | Users can update their own macro history        | PERMISSIVE | {public}        | UPDATE | (auth.uid() = user_id)                                                                                                                                                                                                                             | (auth.uid() = user_id)                                                                                                                                                                                                                                                                    |
| public     | macro_history           | Users can view their own macro history          | PERMISSIVE | {public}        | SELECT | (auth.uid() = user_id)                                                                                                                                                                                                                             | null                                                                                                                                                                                                                                                                                      |
| public     | meal_plans              | meal_plans_delete                               | PERMISSIVE | {public}        | DELETE | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = meal_plans.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                                  | null                                                                                                                                                                                                                                                                                      |
| public     | meal_plans              | meal_plans_insert                               | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | (((user_id IS NOT NULL) AND (user_id = auth.uid())) OR ((anon_profile_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = meal_plans.anon_profile_id) AND (up.coach_user_id = auth.uid()))))) OR (auth.role() = 'service_role'::text))         |
| public     | meal_plans              | meal_plans_select                               | PERMISSIVE | {public}        | SELECT | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = meal_plans.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                                  | null                                                                                                                                                                                                                                                                                      |
| public     | meal_plans              | meal_plans_update                               | PERMISSIVE | {public}        | UPDATE | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = meal_plans.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                                  | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = meal_plans.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                                                                         |
| public     | password_resets         | Allow public password reset requests            | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | true                                                                                                                                                                                                                                                                                      |
| public     | password_resets         | Allow public token usage updates                | PERMISSIVE | {public}        | UPDATE | true                                                                                                                                                                                                                                               | true                                                                                                                                                                                                                                                                                      |
| public     | password_resets         | Allow public token validation                   | PERMISSIVE | {public}        | SELECT | true                                                                                                                                                                                                                                               | null                                                                                                                                                                                                                                                                                      |
| public     | password_resets         | Users can access own password resets            | PERMISSIVE | {public}        | ALL    | ((auth.uid() = user_id) OR (auth.email() = email) OR (auth.role() = 'service_role'::text))                                                                                                                                                         | null                                                                                                                                                                                                                                                                                      |
| public     | progress_entries        | Coaches can view assigned clients progress      | PERMISSIVE | {public}        | SELECT | check_coach_client_access(user_id)                                                                                                                                                                                                                 | null                                                                                                                                                                                                                                                                                      |
| public     | progress_entries        | admin_full_access_progress_entries_delete       | PERMISSIVE | {public}        | DELETE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | progress_entries        | admin_full_access_progress_entries_insert       | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | progress_entries        | admin_full_access_progress_entries_select       | PERMISSIVE | {public}        | SELECT | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | progress_entries        | admin_full_access_progress_entries_update       | PERMISSIVE | {public}        | UPDATE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | progress_entries        | progress_entries_delete                         | PERMISSIVE | {public}        | DELETE | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = progress_entries.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                            | null                                                                                                                                                                                                                                                                                      |
| public     | progress_entries        | progress_entries_insert                         | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | (((user_id IS NOT NULL) AND (user_id = auth.uid())) OR ((anon_profile_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = progress_entries.anon_profile_id) AND (up.coach_user_id = auth.uid()))))) OR (auth.role() = 'service_role'::text))   |
| public     | progress_entries        | progress_entries_select                         | PERMISSIVE | {public}        | SELECT | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = progress_entries.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                            | null                                                                                                                                                                                                                                                                                      |
| public     | progress_entries        | progress_entries_update                         | PERMISSIVE | {public}        | UPDATE | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = progress_entries.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                            | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = progress_entries.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                                                                   |
| public     | progress_goals          | progress_goals_delete                           | PERMISSIVE | {public}        | DELETE | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = progress_goals.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                              | null                                                                                                                                                                                                                                                                                      |
| public     | progress_goals          | progress_goals_insert                           | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | (((user_id IS NOT NULL) AND (user_id = auth.uid())) OR ((anon_profile_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = progress_goals.anon_profile_id) AND (up.coach_user_id = auth.uid()))))) OR (auth.role() = 'service_role'::text))     |
| public     | progress_goals          | progress_goals_select                           | PERMISSIVE | {public}        | SELECT | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = progress_goals.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                              | null                                                                                                                                                                                                                                                                                      |
| public     | progress_goals          | progress_goals_update                           | PERMISSIVE | {public}        | UPDATE | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = progress_goals.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                              | ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.anon_profile_id = progress_goals.anon_profile_id) AND (up.coach_user_id = auth.uid())))) OR (auth.role() = 'service_role'::text))                                                                     |
| public     | roles                   | Owners can delete roles                         | PERMISSIVE | {authenticated} | DELETE | is_owner(auth.uid())                                                                                                                                                                                                                               | null                                                                                                                                                                                                                                                                                      |
| public     | roles                   | Owners can insert roles                         | PERMISSIVE | {authenticated} | INSERT | null                                                                                                                                                                                                                                               | is_owner(auth.uid())                                                                                                                                                                                                                                                                      |
| public     | roles                   | Owners can update roles                         | PERMISSIVE | {authenticated} | UPDATE | is_owner(auth.uid())                                                                                                                                                                                                                               | is_owner(auth.uid())                                                                                                                                                                                                                                                                      |
| public     | roles                   | Public can view roles                           | PERMISSIVE | {public}        | SELECT | true                                                                                                                                                                                                                                               | null                                                                                                                                                                                                                                                                                      |
| public     | subscription_overages   | Users can view their own subscription overages  | PERMISSIVE | {public}        | SELECT | (auth.uid() IN ( SELECT user_subscriptions.user_id
   FROM user_subscriptions
  WHERE (user_subscriptions.id = subscription_overages.subscription_id)))                                                                                            | null                                                                                                                                                                                                                                                                                      |
| public     | subscription_plans      | Subscription plans are publicly readable        | PERMISSIVE | {public}        | SELECT | (active = true)                                                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | user_preferences        | admin_full_access_user_preferences_delete       | PERMISSIVE | {public}        | DELETE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | user_preferences        | admin_full_access_user_preferences_insert       | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | user_preferences        | admin_full_access_user_preferences_select       | PERMISSIVE | {public}        | SELECT | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | user_preferences        | admin_full_access_user_preferences_update       | PERMISSIVE | {public}        | UPDATE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | user_preferences        | secure_insert_user_preferences                  | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | ((user_id = auth.uid()) OR ((user_id IS NULL) AND (anon_profile_id IS NOT NULL)))                                                                                                                                                                                                         |
| public     | user_preferences        | user_preferences_delete                         | PERMISSIVE | {public}        | DELETE | ((user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                                                   | null                                                                                                                                                                                                                                                                                      |
| public     | user_preferences        | user_preferences_insert                         | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | ((user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                                                                                          |
| public     | user_preferences        | user_preferences_secure_delete                  | PERMISSIVE | {public}        | DELETE | ((user_id = auth.uid()) OR is_owner(auth.uid()) OR (auth.email() = 'elhambigzad2@gmail.com'::text))                                                                                                                                                | null                                                                                                                                                                                                                                                                                      |
| public     | user_preferences        | user_preferences_secure_select                  | PERMISSIVE | {public}        | SELECT | ((user_id = auth.uid()) OR ((anon_profile_id IS NOT NULL) AND (user_id IS NULL)) OR is_owner(auth.uid()) OR (auth.email() = 'elhambigzad2@gmail.com'::text))                                                                                       | null                                                                                                                                                                                                                                                                                      |
| public     | user_preferences        | user_preferences_secure_update                  | PERMISSIVE | {public}        | UPDATE | ((user_id = auth.uid()) OR ((anon_profile_id IS NOT NULL) AND (user_id IS NULL)) OR is_owner(auth.uid()) OR (auth.email() = 'elhambigzad2@gmail.com'::text))                                                                                       | ((user_id = auth.uid()) OR ((anon_profile_id IS NOT NULL) AND (user_id IS NULL)) OR is_owner(auth.uid()) OR (auth.email() = 'elhambigzad2@gmail.com'::text))                                                                                                                              |
| public     | user_preferences        | user_preferences_select                         | PERMISSIVE | {public}        | SELECT | ((user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                                                   | null                                                                                                                                                                                                                                                                                      |
| public     | user_preferences        | user_preferences_update                         | PERMISSIVE | {public}        | UPDATE | ((user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                                                   | ((user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                                                                                          |
| public     | user_profiles           | Coaches can view assigned clients profiles      | PERMISSIVE | {public}        | SELECT | check_coach_client_access(id)                                                                                                                                                                                                                      | null                                                                                                                                                                                                                                                                                      |
| public     | user_profiles           | admin_access_user_profiles                      | PERMISSIVE | {public}        | ALL    | ((((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text) OR ((auth.jwt() ->> 'email'::text) = 'elhambigzad2@gmail.com'::text))                                               | null                                                                                                                                                                                                                                                                                      |
| public     | user_profiles           | admin_full_access_user_profiles                 | PERMISSIVE | {public}        | SELECT | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | user_profiles           | admin_full_access_user_profiles_delete          | PERMISSIVE | {public}        | DELETE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                                                      |
| public     | user_profiles           | admin_full_access_user_profiles_insert          | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | user_profiles           | admin_full_access_user_profiles_update          | PERMISSIVE | {public}        | UPDATE | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                    | ((auth.jwt() ->> 'role'::text) = 'admin'::text)                                                                                                                                                                                                                                           |
| public     | user_profiles           | user_profiles_delete                            | PERMISSIVE | {public}        | DELETE | ((user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                                                   | null                                                                                                                                                                                                                                                                                      |
| public     | user_profiles           | user_profiles_insert                            | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                               | (((user_id IS NOT NULL) AND (user_id = auth.uid())) OR (auth.role() = 'service_role'::text))                                                                                                                                                                                              |
| public     | user_profiles           | user_profiles_select                            | PERMISSIVE | {public}        | SELECT | ((user_id = auth.uid()) OR (coach_user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                   | null                                                                                                                                                                                                                                                                                      |
| public     | user_profiles           | user_profiles_update                            | PERMISSIVE | {public}        | UPDATE | ((user_id = auth.uid()) OR (coach_user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                   | ((user_id = auth.uid()) OR (coach_user_id = auth.uid()) OR (auth.role() = 'service_role'::text))                                                                                                                                                                                          |
| public     | user_roles              | Admins manage user roles (safe)                 | PERMISSIVE | {public}        | ALL    | ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.is_admin = true)))) OR (auth.role() = 'service_role'::text))                                                                                               | ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.is_admin = true)))) OR (auth.role() = 'service_role'::text))                                                                                                                                      |
| public     | user_roles              | Users can view their own roles                  | PERMISSIVE | {public}        | SELECT | (user_id = auth.uid())                                                                                                                                                                                                                             | null                                                                                                                                                                                                                                                                                      |
| public     | user_subscriptions      | Service role can manage all subscriptions       | PERMISSIVE | {public}        | ALL    | ((auth.jwt() ->> 'role'::text) = 'service_role'::text)                                                                                                                                                                                             | null                                                                                                                                                                                                                                                                                      |
| public     | user_subscriptions      | Users can view their own subscriptions          | PERMISSIVE | {public}        | SELECT | (auth.uid() = user_id)                                                                                                                                                                                                                             | null                                                                                                                                                                                                                                                                                      |
| public     | webhook_events          | Service role can manage webhook events          | PERMISSIVE | {public}        | ALL    | ((auth.jwt() ->> 'role'::text) = 'service_role'::text)                                                                                                                                                                                             | null                                                                                                                                                                                                                                                                                      |


## RLS Status for All Tables

| table_name              | rls_status |
| ----------------------- | ---------- |
| anonymous_profiles      | ENABLED    |
| coach_assignments       | DISABLED   |
| custom_recipes          | ENABLED    |
| daily_meals             | ENABLED    |
| daily_targets           | ENABLED    |
| invitation_codes        | ENABLED    |
| invite_code_redemptions | ENABLED    |
| invite_codes            | ENABLED    |
| invites                 | ENABLED    |
| macro_calculations      | ENABLED    |
| macro_history           | ENABLED    |
| meal_plans              | ENABLED    |
| password_resets         | ENABLED    |
| progress_entries        | ENABLED    |
| progress_goals          | ENABLED    |
| roles                   | ENABLED    |
| subscription_overages   | ENABLED    |
| subscription_plans      | ENABLED    |
| user_preferences        | ENABLED    |
| user_profiles           | ENABLED    |
| user_roles              | ENABLED    |
| user_subscriptions      | ENABLED    |
| webhook_events          | ENABLED    |

## Edge Functions List

| function_name                       | routine_schema | return_type | function_definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | -------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| assign_client_to_coach              | public         | boolean     | 
BEGIN
    -- Update existing user_profiles structure
    UPDATE user_profiles 
    SET 
        coach_user_id = coach_uuid,
        assigned_coach_email = (SELECT user_email FROM user_profiles WHERE user_id = coach_uuid),
        assignment_status = 'assigned',
        coach_assignment_date = NOW(),
        computed_role = 'client'
    WHERE user_id = client_uuid;
    
    RETURN FOUND;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| assign_coach_to_client              | public         | boolean     | 
DECLARE
    coach_id UUID;
    code_record RECORD;
BEGIN
    -- Get the invitation code details
    SELECT ic.*, up.user_id as coach_user_id
    INTO code_record
    FROM invitation_codes ic
    LEFT JOIN user_profiles up ON ic.coach_user_id = up.user_id
    WHERE ic.id = invitation_code_id;
    
    -- If no code found, return false
    IF code_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- If code has a coach assigned, create coach assignment
    IF code_record.coach_user_id IS NOT NULL THEN
        INSERT INTO coach_assignments (
            coach_id,
            client_id,
            assigned_at,
            is_active
        )
        VALUES (
            code_record.coach_user_id,
            new_user_id,
            NOW(),
            TRUE
        )
        ON CONFLICT (coach_id, client_id) DO UPDATE SET
            is_active = TRUE,
            assigned_at = NOW();
            
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| check_coach_client_access           | public         | boolean     | 
BEGIN
    -- Check if the current user is the target user (own data)
    IF auth.uid() = target_user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if current user is a coach assigned to the target user
    RETURN EXISTS (
        SELECT 1 
        FROM user_profiles up
        JOIN coach_assignments ca ON up.id = ca.coach_id
        WHERE ca.client_id = target_user_id 
        AND ca.is_active = TRUE
        AND up.role = 'coach'
        AND up.id = auth.uid()
    );
END;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| cleanup_expired_password_resets     | public         | void        | 
BEGIN
    DELETE FROM password_resets 
    WHERE expires_at < NOW() - INTERVAL '7 days'; -- Keep expired tokens for 7 days for audit
END;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| create_invitation_code              | public         | uuid        | 
DECLARE
    v_role_id UUID;
    v_code_id UUID;
    v_user_role TEXT;
BEGIN
    -- Security: Check user has permission to create codes
    SELECT r.name INTO v_user_role
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    ORDER BY r.hierarchy_level DESC
    LIMIT 1;
    
    IF v_user_role NOT IN ('coach', 'admin', 'owner') THEN
        RAISE EXCEPTION 'Insufficient permissions to create invitation codes';
    END IF;
    
    -- Get role ID
    SELECT id INTO v_role_id FROM roles WHERE name = p_assigns_role_name;
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Role % does not exist', p_assigns_role_name;
    END IF;

    -- Insert invitation code
    INSERT INTO invitation_codes (
        code,
        creator_id,
        assigns_role_id,
        coach_email,
        coach_name,
        coach_user_id,
        max_uses,
        usage_count,
        is_active,
        created_at
    ) VALUES (
        p_code,
        auth.uid(),
        v_role_id,
        (SELECT user_email FROM user_profiles WHERE id = auth.uid()),
        (SELECT user_name FROM user_profiles WHERE id = auth.uid()),
        auth.uid(),
        p_max_uses,
        0,
        TRUE,
        NOW()
    ) RETURNING id INTO v_code_id;

    RETURN v_code_id;
END;
                                                                                                                                                                                                                                                                                                                         |
| create_invite                       | public         | uuid        | 
DECLARE
    new_invite_id uuid;
    invite_token text;
    inviter_email text;
BEGIN
    -- Get the current user's email
    SELECT email INTO inviter_email 
    FROM auth.users 
    WHERE id = auth.uid();
    
    -- Generate secure token
    invite_token := generate_invite_token();
    
    -- Insert the invite
    INSERT INTO public.invites (
        email, 
        token, 
        invited_by, 
        invited_by_email,
        expires_at
    ) VALUES (
        invite_email,
        invite_token,
        auth.uid(),
        inviter_email,
        now() + (expires_in_hours || ' hours')::interval
    ) 
    RETURNING id INTO new_invite_id;
    
    RETURN new_invite_id;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| enforce_invitation_only_signup      | public         | trigger     | 
BEGIN
    -- Allow Supabase email invitations (invited_at is populated)
    IF NEW.invited_at IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Allow Supabase dashboard invitations (they have email_confirmed_at = NULL and confirmation_token)
    -- This indicates it's an invitation pending confirmation
    IF NEW.email_confirmed_at IS NULL AND NEW.confirmation_token IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Allow coach invitation signups by checking user_metadata
    IF NEW.raw_user_meta_data ? 'invitation_code' 
       OR NEW.raw_user_meta_data ? 'coach_code'
       OR NEW.raw_user_meta_data ? 'coach_invitation_code' THEN
        RETURN NEW;
    END IF;
    
    -- Block unauthorized signups (confirmed users without invitations)
    RAISE EXCEPTION 'Account creation requires a valid invitation. Please contact an administrator or use a coach invitation code.';
    RETURN NULL;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| generate_invite_token               | public         | text        | 
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| get_coach_client_count              | public         | integer     | 
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM user_profiles 
        WHERE coach_user_id = coach_uuid 
        AND assignment_status = 'assigned'
    );
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| get_user_highest_role               | public         | text        | 
DECLARE
    role_name TEXT;
BEGIN
    SELECT r.name INTO role_name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    ORDER BY r.hierarchy_level DESC
    LIMIT 1;

    RETURN COALESCE(role_name, 'client');
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| get_user_role_info                  | public         | record      | 
    SELECT 
        up.user_id,
        up.user_email as email,
        up.user_name as display_name,
        COALESCE(up.is_admin, false) as is_admin,
        COALESCE(up.role, 'user') as role,
        COALESCE(up.is_admin, false) as can_invite_clients
    FROM user_profiles up 
    WHERE up.user_id = user_uuid;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| increment_invitation_code_usage     | public         | record      | 
    UPDATE invitation_codes 
    SET 
        usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE code = input_code 
    AND is_active = true;
    
    SELECT 
        ic.coach_email,
        ic.coach_user_id
    FROM invitation_codes ic 
    WHERE ic.code = input_code;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| is_owner                            | public         | boolean     | 
  -- Check both role_id-based and string-based role assignment
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = user_uuid 
    AND (
      ur.role = 'owner'  -- Direct string check (no recursion)
      OR 
      ur.role = 'admin'  -- Also allow admin as owner
    )
  );

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| update_updated_at_column            | public         | trigger     | 
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| update_user_profile_by_subscription | public         | void        | 
BEGIN
    UPDATE user_profiles 
    SET 
        subscription_status = new_status,
        subscription_expires_at = COALESCE(expires_at, subscription_expires_at),
        updated_at = NOW()
    WHERE user_id IN (
        SELECT user_id FROM user_subscriptions 
        WHERE user_subscriptions.stripe_subscription_id = update_user_profile_by_subscription.stripe_subscription_id
    );
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| use_invitation_code                 | public         | record      | 
DECLARE
    v_code_record RECORD;
    v_client_user_id UUID;
    v_assigns_role TEXT;
BEGIN
    v_client_user_id := COALESCE(p_client_user_id, auth.uid());
    
    -- Validate code
    SELECT * INTO v_code_record FROM validate_invitation_code(p_code) LIMIT 1;
    
    IF v_code_record IS NULL OR NOT v_code_record.is_valid THEN
        RETURN QUERY SELECT FALSE, 'Invalid or expired invitation code'::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Get role name
    SELECT r.name INTO v_assigns_role 
    FROM invitation_codes ic 
    JOIN roles r ON ic.assigns_role_id = r.id 
    WHERE ic.code = p_code;
    
    -- Assign role to user
    INSERT INTO user_roles (user_id, role_id)
    SELECT v_client_user_id, r.id
    FROM roles r 
    WHERE r.name = v_assigns_role
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    -- If assigning client role, update user_profiles with coach assignment
    IF v_assigns_role = 'client' THEN
        UPDATE user_profiles 
        SET 
            assignment_status = 'assigned',
            assigned_coach_email = v_code_record.coach_email,
            coach_user_id = (SELECT creator_id FROM invitation_codes WHERE code = p_code),
            coach_assignment_date = NOW(),
            role = 'client',
            updated_at = NOW()
        WHERE id = v_client_user_id;
    END IF;
    
    -- Update usage count
    UPDATE invitation_codes 
    SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE code = p_code;
    
    RETURN QUERY SELECT TRUE, 'Successfully assigned'::TEXT, v_assigns_role, v_code_record.coach_email;
END;
 |
| validate_any_invitation_code        | public         | record      | 
BEGIN
    -- Check 8-character coach codes
    IF LENGTH(input_code) = 8 THEN
        RETURN QUERY
        SELECT 
            v.is_valid,
            'client'::TEXT as assigns_role,
            v.coach_email,
            'coach_code'::TEXT as code_type
        FROM validate_invitation_code(input_code) v
        WHERE v.is_valid = TRUE;
        
    -- Check 12-character admin codes  
    ELSIF LENGTH(input_code) = 12 THEN
        RETURN QUERY
        SELECT 
            ic.is_active as is_valid,
            'admin'::TEXT as assigns_role,
            ic.coach_email,
            'admin_code'::TEXT as code_type
        FROM invite_codes ic
        WHERE ic.code = input_code
        AND ic.is_active = TRUE
        AND (ic.expires_at IS NULL OR ic.expires_at > NOW());
    END IF;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| validate_invitation_code            | public         | record      | 
    SELECT 
        CASE 
            WHEN ic.is_active = true 
            AND (ic.expires_at IS NULL OR ic.expires_at > NOW())
            AND (ic.max_uses = 0 OR ic.usage_count < ic.max_uses)
            THEN true 
            ELSE false 
        END as is_valid,
        ic.coach_email,
        ic.coach_name,
        ic.coach_user_id,
        ic.id as code_id
    FROM invitation_codes ic 
    WHERE ic.code = input_code;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| validate_invite_token               | public         | json        | 
DECLARE
    invite_record record;
    result json;
BEGIN
    -- Find the invite
    SELECT * INTO invite_record
    FROM public.invites 
    WHERE token = token_input;
    
    -- Check if invite exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'Invalid invitation token'
        );
    END IF;
    
    -- Check if already used
    IF invite_record.used = true THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'This invitation has already been used'
        );
    END IF;
    
    -- Check if expired
    IF invite_record.expires_at < now() THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'This invitation has expired'
        );
    END IF;
    
    -- Valid invitation
    RETURN json_build_object(
        'valid', true,
        'email', invite_record.email,
        'invite_id', invite_record.id,
        'expires_at', invite_record.expires_at
    );
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| validate_role_consistency           | public         | trigger     | 
BEGIN
    -- If both role and role_id are provided, ensure they match
    IF NEW.role IS NOT NULL AND NEW.role_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM roles r 
            WHERE r.id = NEW.role_id AND r.name = NEW.role
        ) THEN
            RAISE EXCEPTION 'Role string % does not match role_id %', NEW.role, NEW.role_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## Database Triggers

| trigger_name                       | event_manipulation | event_object_table | action_statement                             | action_timing |
| ---------------------------------- | ------------------ | ------------------ | -------------------------------------------- | ------------- |
| update_invitation_codes_updated_at | UPDATE             | invitation_codes   | EXECUTE FUNCTION update_updated_at_column()  | BEFORE        |
| update_macro_history_updated_at    | UPDATE             | macro_history      | EXECUTE FUNCTION update_updated_at_column()  | BEFORE        |
| validate_role_consistency_trigger  | INSERT             | user_roles         | EXECUTE FUNCTION validate_role_consistency() | BEFORE        |
| validate_role_consistency_trigger  | UPDATE             | user_roles         | EXECUTE FUNCTION validate_role_consistency() | BEFORE        |

## Table Row Counts and Sizes

| schemaname | tablename        | attname               | n_distinct | correlation |
| ---------- | ---------------- | --------------------- | ---------- | ----------- |
| public     | daily_meals      | anon_profile_id       | -0.153846  | -1          |
| public     | daily_meals      | calories              | -0.769231  | 0.351648    |
| public     | daily_meals      | carbs                 | -0.923077  | 0.252747    |
| public     | daily_meals      | created_at            | -0.923077  | 0.379121    |
| public     | daily_meals      | email                 | 0          | null        |
| public     | daily_meals      | fat                   | -0.461538  | 0.21978     |
| public     | daily_meals      | id                    | -1         | -0.318681   |
| public     | daily_meals      | meal_date             | -0.307692  | 0.642857    |
| public     | daily_meals      | meal_id               | -0.153846  | 1           |
| public     | daily_meals      | meal_name             | -0.923077  | 0.489011    |
| public     | daily_meals      | meal_uuid             | -1         | 0.252747    |
| public     | daily_meals      | protein               | -0.615385  | 0.153846    |
| public     | daily_meals      | timestamp             | -0.923077  | 0.379121    |
| public     | daily_meals      | updated_at            | -0.923077  | 0.379121    |
| public     | daily_meals      | user_email            | -0.153846  | -1          |
| public     | daily_meals      | user_id               | -0.153846  | 0.672727    |
| public     | daily_targets    | activity_level        | 0          | null        |
| public     | daily_targets    | anon_profile_id       | 0          | null        |
| public     | daily_targets    | created_at            | -1         | 1           |
| public     | daily_targets    | daily_calories        | -1         | 1           |
| public     | daily_targets    | daily_carbs           | -1         | 1           |
| public     | daily_targets    | daily_fat             | -1         | 1           |
| public     | daily_targets    | daily_protein         | -1         | 1           |
| public     | daily_targets    | goal_type             | 0          | null        |
| public     | daily_targets    | id                    | -1         | -1          |
| public     | daily_targets    | targets               | -0.5       | 1           |
| public     | daily_targets    | unit_system           | -0.5       | 1           |
| public     | daily_targets    | updated_at            | -1         | 1           |
| public     | daily_targets    | user_email            | 0          | null        |
| public     | daily_targets    | user_id               | -1         | 1           |
| public     | macro_history    | anon_profile_id       | 0          | null        |
| public     | macro_history    | calories              | -0.25      | 1           |
| public     | macro_history    | calories_consumed     | -1         | -0.2        |
| public     | macro_history    | calories_goal         | -0.5       | -0.2        |
| public     | macro_history    | carbs                 | -0.25      | 1           |
| public     | macro_history    | carbs_consumed        | -1         | -0.4        |
| public     | macro_history    | carbs_goal            | -0.5       | -0.2        |
| public     | macro_history    | carbs_percent         | -1         | -0.2        |
| public     | macro_history    | created_at            | -1         | -0.2        |
| public     | macro_history    | date                  | -1         | -0.2        |
| public     | macro_history    | email                 | 0          | null        |
| public     | macro_history    | entry_date            | -1         | -0.2        |
| public     | macro_history    | fat                   | -0.25      | 1           |
| public     | macro_history    | fat_consumed          | -1         | -0.4        |
| public     | macro_history    | fat_goal              | -0.5       | -0.2        |
| public     | macro_history    | fat_percent           | -1         | -0.4        |
| public     | macro_history    | goals_met             | -0.25      | 1           |
| public     | macro_history    | id                    | -1         | -0.2        |
| public     | macro_history    | protein               | -0.25      | 1           |
| public     | macro_history    | protein_consumed      | -1         | -0.4        |
| public     | macro_history    | protein_goal          | -0.5       | -0.2        |
| public     | macro_history    | protein_percent       | -1         | -0.4        |
| public     | macro_history    | updated_at            | -1         | -0.2        |
| public     | macro_history    | user_email            | 0          | null        |
| public     | macro_history    | user_id               | -0.5       | -0.2        |
| public     | meal_plans       | anon_profile_id       | 0          | null        |
| public     | meal_plans       | calories              | 1          | 1           |
| public     | meal_plans       | carbs                 | 1          | 1           |
| public     | meal_plans       | created_at            | -1         | 0.280618    |
| public     | meal_plans       | day_of_week           | 0          | null        |
| public     | meal_plans       | email                 | 0          | null        |
| public     | meal_plans       | fat                   | 1          | 1           |
| public     | meal_plans       | id                    | -1         | 0.0555892   |
| public     | meal_plans       | meal_name             | 0          | null        |
| public     | meal_plans       | meal_type             | 0          | null        |
| public     | meal_plans       | plan_id               | 0          | null        |
| public     | meal_plans       | protein               | 1          | 1           |
| public     | meal_plans       | updated_at            | -0.984848  | 0.467947    |
| public     | meal_plans       | user_email            | 0          | null        |
| public     | meal_plans       | user_id               | 5          | 0.742156    |
| public     | meal_plans       | week_data             | -0.666667  | 0.671795    |
| public     | user_preferences | anon_profile_id       | 0          | null        |
| public     | user_preferences | created_at            | -1         | 0.8         |
| public     | user_preferences | custom_preferences    | -0.25      | 1           |
| public     | user_preferences | email                 | 0          | null        |
| public     | user_preferences | id                    | -1         | 0.2         |
| public     | user_preferences | language              | -0.25      | 1           |
| public     | user_preferences | notifications_enabled | -0.25      | 1           |
| public     | user_preferences | preferences           | -0.25      | 1           |
| public     | user_preferences | show_tutorials        | -0.25      | 1           |
| public     | user_preferences | theme                 | -0.25      | 1           |
| public     | user_preferences | timezone              | -0.25      | 1           |
| public     | user_preferences | unit_system           | -0.5       | 0.8         |
| public     | user_preferences | updated_at            | -1         | 0.8         |
| public     | user_preferences | user_email            | 0          | null        |
| public     | user_preferences | user_id               | -1         | -0.4        |

## User Defined Types/Enums

Success. No rows returned

## Storage Buckets (if using Supabase Storage)

Success. No rows returned


## Auth Schema Information

| table_name | column_name                 | data_type                   | is_nullable |
| ---------- | --------------------------- | --------------------------- | ----------- |
| identities | provider_id                 | text                        | NO          |
| identities | user_id                     | uuid                        | NO          |
| identities | identity_data               | jsonb                       | NO          |
| identities | provider                    | text                        | NO          |
| identities | last_sign_in_at             | timestamp with time zone    | YES         |
| identities | created_at                  | timestamp with time zone    | YES         |
| identities | updated_at                  | timestamp with time zone    | YES         |
| identities | email                       | text                        | YES         |
| identities | id                          | uuid                        | NO          |
| sessions   | id                          | uuid                        | NO          |
| sessions   | user_id                     | uuid                        | NO          |
| sessions   | created_at                  | timestamp with time zone    | YES         |
| sessions   | updated_at                  | timestamp with time zone    | YES         |
| sessions   | factor_id                   | uuid                        | YES         |
| sessions   | aal                         | USER-DEFINED                | YES         |
| sessions   | not_after                   | timestamp with time zone    | YES         |
| sessions   | refreshed_at                | timestamp without time zone | YES         |
| sessions   | user_agent                  | text                        | YES         |
| sessions   | ip                          | inet                        | YES         |
| sessions   | tag                         | text                        | YES         |
| users      | instance_id                 | uuid                        | YES         |
| users      | id                          | uuid                        | NO          |
| users      | aud                         | character varying           | YES         |
| users      | role                        | character varying           | YES         |
| users      | email                       | character varying           | YES         |
| users      | encrypted_password          | character varying           | YES         |
| users      | email_confirmed_at          | timestamp with time zone    | YES         |
| users      | invited_at                  | timestamp with time zone    | YES         |
| users      | confirmation_token          | character varying           | YES         |
| users      | confirmation_sent_at        | timestamp with time zone    | YES         |
| users      | recovery_token              | character varying           | YES         |
| users      | recovery_sent_at            | timestamp with time zone    | YES         |
| users      | email_change_token_new      | character varying           | YES         |
| users      | email_change                | character varying           | YES         |
| users      | email_change_sent_at        | timestamp with time zone    | YES         |
| users      | last_sign_in_at             | timestamp with time zone    | YES         |
| users      | raw_app_meta_data           | jsonb                       | YES         |
| users      | raw_user_meta_data          | jsonb                       | YES         |
| users      | is_super_admin              | boolean                     | YES         |
| users      | created_at                  | timestamp with time zone    | YES         |
| users      | updated_at                  | timestamp with time zone    | YES         |
| users      | phone                       | text                        | YES         |
| users      | phone_confirmed_at          | timestamp with time zone    | YES         |
| users      | phone_change                | text                        | YES         |
| users      | phone_change_token          | character varying           | YES         |
| users      | phone_change_sent_at        | timestamp with time zone    | YES         |
| users      | confirmed_at                | timestamp with time zone    | YES         |
| users      | email_change_token_current  | character varying           | YES         |
| users      | email_change_confirm_status | smallint                    | YES         |
| users      | banned_until                | timestamp with time zone    | YES         |
| users      | reauthentication_token      | character varying           | YES         |
| users      | reauthentication_sent_at    | timestamp with time zone    | YES         |
| users      | is_sso_user                 | boolean                     | NO          |
| users      | deleted_at                  | timestamp with time zone    | YES         |
| users      | is_anonymous                | boolean                     | NO          |