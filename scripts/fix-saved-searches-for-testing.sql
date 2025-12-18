-- Fix Saved Searches for Testing
-- Sets next_run_at to 1 minute ago so they run immediately

UPDATE "SavedSearch"
SET next_run_at = NOW() - INTERVAL '1 minute'
WHERE active = true
  AND (next_run_at IS NULL OR next_run_at > NOW());

-- Verify the update
SELECT
  id,
  name,
  active,
  next_run_at,
  last_run_at,
  CASE
    WHEN next_run_at <= NOW() THEN '✓ READY TO RUN'
    ELSE '✗ NOT READY'
  END as status
FROM "SavedSearch"
WHERE active = true;
