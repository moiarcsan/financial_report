-- Supabase Schema for Financial Control App
-- Execute this in the SQL Editor in Supabase Dashboard

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Movements table: stores all bank transactions
create table if not exists movements (
    id text primary key,
    user_id text not null,
    bank text not null check (bank in ('N26', 'Unicaja', 'Sabadell')),
    account text not null,
    operation_date date not null,
    value_date date,
    concept text not null,
    amount numeric not null,
    currency text not null default 'EUR' check (currency = 'EUR'),
    source_file_name text not null,
    imported_at timestamp not null,
    created_at timestamp default now()
);

-- Create index for faster queries by user and date
create index if not exists idx_movements_user_id on movements(user_id);
create index if not exists idx_movements_operation_date on movements(operation_date desc);
create index if not exists idx_movements_user_date on movements(user_id, operation_date desc);

-- Category rules table: user-defined keyword → category mappings
create table if not exists category_rules (
    id uuid default uuid_generate_v4() primary key,
    user_id text not null,
    keyword text not null,
    category text not null,
    created_at timestamp default now(),
    unique(user_id, keyword)
);

-- Create index for faster queries
create index if not exists idx_category_rules_user_id on category_rules(user_id);

-- Custom categories table: user-created categories with custom colors
create table if not exists custom_categories (
    id uuid default uuid_generate_v4() primary key,
    user_id text not null,
    name text not null,
    color text not null,
    created_at timestamp default now(),
    unique(user_id, name)
);

-- Create index for faster queries
create index if not exists idx_custom_categories_user_id on custom_categories(user_id);

-- Enable Row Level Security (RLS)
alter table movements enable row level security;
alter table category_rules enable row level security;
alter table custom_categories enable row level security;

-- RLS Policies: Users can only access their own data
create policy if not exists "movements_policy"
    on movements for all
    using (auth.uid()::text = user_id)
    with check (auth.uid()::text = user_id);

create policy if not exists "category_rules_policy"
    on category_rules for all
    using (auth.uid()::text = user_id)
    with check (auth.uid()::text = user_id);

create policy if not exists "custom_categories_policy"
    on custom_categories for all
    using (auth.uid()::text = user_id)
    with check (auth.uid()::text = user_id);

-- Note: For this app, we're using a simple user_id string from our custom auth
-- If you want to use Supabase Auth instead, you would need to:
-- 1. Create users in Supabase Auth
-- 2. Use auth.uid() instead of user_id in the policies
-- 3. Modify the app to use Supabase Auth