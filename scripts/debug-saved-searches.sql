-- Debug Saved Searches
-- Check the current state of saved searches

SELECT
  id,
  name,
  active,
  next_run_at,
  last_run_at,
  frequency,
  created_at,
  -- Check if next_run_at is in the past or future
  CASE
    WHEN next_run_at IS NULL THEN 'NULL - never scheduled'
    WHEN next_run_at <= NOW() THEN 'READY TO RUN (past)'
    ELSE 'SCHEDULED FOR FUTURE'
  END as run_status,
  -- Show how long until next run
  CASE
    WHEN next_run_at IS NULL THEN NULL
    ELSE next_run_at - NOW()
  END as time_until_run
FROM "SavedSearch"
WHERE active = true
ORDER BY created_at DESC;
