-- 0009_submission_results.sql
-- Add actual_output column to test_results for execution tracking

alter table public.test_results
  add column if not exists actual_output text;
