-- ============================================================================
-- RLS POLICIES FIX - Execute this in Supabase SQL Editor
-- This script removes all old policies and creates new open-access policies
-- ============================================================================

-- STEP 1: Drop all old restrictive policies
DROP POLICY IF EXISTS "movements_policy" ON movements;
DROP POLICY IF EXISTS "movements_read_all" ON movements;
DROP POLICY IF EXISTS "movements_write_own" ON movements;
DROP POLICY IF EXISTS "movements_delete_own" ON movements;
DROP POLICY IF EXISTS "movements_full_access" ON movements;

DROP POLICY IF EXISTS "category_rules_policy" ON category_rules;
DROP POLICY IF EXISTS "category_rules_read_all" ON category_rules;
DROP POLICY IF EXISTS "category_rules_write_own" ON category_rules;
DROP POLICY IF EXISTS "category_rules_update_own" ON category_rules;
DROP POLICY IF EXISTS "category_rules_delete_own" ON category_rules;
DROP POLICY IF EXISTS "category_rules_full_access" ON category_rules;

DROP POLICY IF EXISTS "custom_categories_policy" ON custom_categories;
DROP POLICY IF EXISTS "custom_categories_read_all" ON custom_categories;
DROP POLICY IF EXISTS "custom_categories_write_own" ON custom_categories;
DROP POLICY IF EXISTS "custom_categories_delete_own" ON custom_categories;
DROP POLICY IF EXISTS "custom_categories_full_access" ON custom_categories;

-- STEP 2: Ensure RLS is enabled on all tables
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create new open-access policies (allow all operations for all users)

-- Movements: All operations allowed
CREATE POLICY "movements_open_access"
    ON movements FOR ALL
    USING (true)
    WITH CHECK (true);

-- Category rules: All operations allowed
CREATE POLICY "category_rules_open_access"
    ON category_rules FOR ALL
    USING (true)
    WITH CHECK (true);

-- Custom categories: All operations allowed
CREATE POLICY "custom_categories_open_access"
    ON custom_categories FOR ALL
    USING (true)
    WITH CHECK (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('movements', 'category_rules', 'custom_categories')
ORDER BY tablename, policyname;
