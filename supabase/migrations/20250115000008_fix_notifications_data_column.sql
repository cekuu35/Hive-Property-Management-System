-- Fix notifications table data column issue
-- First, check if the data column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'data'
    ) THEN
        ALTER TABLE notifications ADD COLUMN data jsonb;
    END IF;
END $$;

-- Also ensure the user_id column references the correct table
-- Check if user_id references profiles(id) correctly
DO $$
BEGIN
    -- Drop existing foreign key if it exists and is wrong
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_user_id_fkey'
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_user_id_fkey;
    END IF;
    
    -- Add the correct foreign key constraint
    ALTER TABLE notifications 
    ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;

