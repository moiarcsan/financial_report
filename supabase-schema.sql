-- Supabase Schema for Financial Control App
-- Execute this in the SQL Editor in Supabase Dashboard

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Movements table: stores all bank transactions
create table if not exists movements (
    id uuid primary key default uuid_generate_v4(),
    user_id text not null,
    bank text not null check (bank in ('N26', 'Unicaja', 'Sabadell')),
    account text not null,
    operation_date date not null,
    value_date date,
    concept text not null,
    amount numeric not null,
    currency text not null default 'EUR' check (currency = 'EUR'),
    source_file_name text not null,
    external_id text, -- Hash fingerprint for duplicate detection
    imported_at timestamp not null,
    created_at timestamp default now()
);

-- Create index for faster queries by user and date
create index if not exists idx_movements_user_id on movements(user_id);
create index if not exists idx_movements_operation_date on movements(operation_date desc);
create index if not exists idx_movements_user_date on movements(user_id, operation_date desc);
create index if not exists idx_movements_external_id on movements(external_id);

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

-- ============================================================================
-- IMPORTANT: Drop old policies if they exist to avoid conflicts
-- ============================================================================
DO $$
BEGIN
    -- Drop old restrictive policies if they exist
    DROP POLICY IF EXISTS "movements_policy" ON movements;
    DROP POLICY IF EXISTS "movements_read_all" ON movements;
    DROP POLICY IF EXISTS "movements_write_own" ON movements;
    DROP POLICY IF EXISTS "movements_delete_own" ON movements;
    
    DROP POLICY IF EXISTS "category_rules_policy" ON category_rules;
    DROP POLICY IF EXISTS "category_rules_read_all" ON category_rules;
    DROP POLICY IF EXISTS "category_rules_write_own" ON category_rules;
    DROP POLICY IF EXISTS "category_rules_update_own" ON category_rules;
    DROP POLICY IF EXISTS "category_rules_delete_own" ON category_rules;
    
    DROP POLICY IF EXISTS "custom_categories_policy" ON custom_categories;
    DROP POLICY IF EXISTS "custom_categories_read_all" ON custom_categories;
    DROP POLICY IF EXISTS "custom_categories_write_own" ON custom_categories;
    DROP POLICY IF EXISTS "custom_categories_delete_own" ON custom_categories;
END $$;

-- RLS Policies: Open access - all users can do anything
-- (All operations are allowed for all authenticated users)

-- Movements: All operations allowed for all users
create policy if not exists "movements_full_access"
    on movements for all
    using (true)
    with check (true);

-- Category rules: All operations allowed for all users
create policy if not exists "category_rules_full_access"
    on category_rules for all
    using (true)
    with check (true);

-- Custom categories: All operations allowed for all users
create policy if not exists "custom_categories_full_access"
    on custom_categories for all
    using (true)
    with check (true);

-- Note: For this app, we're using a simple user_id string from our custom auth
-- If you want to use Supabase Auth instead, you would need to:
-- 1. Create users in Supabase Auth
-- 2. Use auth.uid() instead of user_id in the policies
-- 3. Modify the app to use Supabase Auth

-- ============================================================================
-- MIGRATION SCRIPT: Run this if the movements table already exists
-- This adds the external_id column and updates the id column to UUID
-- ============================================================================
DO $$
BEGIN
    -- Add external_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movements' AND column_name = 'external_id') THEN
        ALTER TABLE movements ADD COLUMN external_id text;
    END IF;
    
    -- Create index on external_id for faster duplicate checks
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'movements' AND indexname = 'idx_movements_external_id') THEN
        CREATE INDEX idx_movements_external_id ON movements(external_id);
    END IF;
END $$;