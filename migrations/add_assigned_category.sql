-- Migration: Add assigned_category column to movements table
-- This allows storing manually assigned categories per movement
-- If the column already exists, this will not fail

DO $$
BEGIN
    -- Add assigned_category column if it doesn't exist
    ALTER TABLE movements ADD COLUMN assigned_category text;
EXCEPTION WHEN duplicate_column THEN
    -- Column already exists, do nothing
    NULL;
END $$;
