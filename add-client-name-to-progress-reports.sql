-- =====================================================
-- ADD CLIENT_NAME FIELD TO PROGRESS_REPORTS TABLE
-- =====================================================
-- This adds client_name field for better privacy by 
-- displaying client names instead of emails
-- =====================================================

-- Add client_name field to progress_reports table
ALTER TABLE progress_reports 
ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Add comment to document the field
COMMENT ON COLUMN progress_reports.client_name IS 'Client display name for privacy (shown instead of email in UI)';

-- Update existing records to populate client_name from email (fallback)
-- This will use the part before @ as the display name for existing records
UPDATE progress_reports 
SET client_name = COALESCE(
    client_name, 
    CASE 
        WHEN client_email IS NOT NULL 
        THEN split_part(client_email, '@', 1)
        ELSE 'Unknown Client'
    END
)
WHERE client_name IS NULL;

-- Verification query - uncomment to test after running migration
-- SELECT id, client_email, client_name, report_title FROM progress_reports LIMIT 5;