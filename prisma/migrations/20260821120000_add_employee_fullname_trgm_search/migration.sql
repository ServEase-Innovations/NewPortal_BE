-- ============================================================================
-- Enable pg_trgm and add a trigram index on employees.full_name so we can do
-- fast fuzzy/partial name search (GET /employees/search?q=...).
--
-- Supabase note: pg_trgm is on Supabase's allow-list of extensions, so the
-- pooled `postgres` role in DATABASE_URL has enough privilege to create it.
-- Safe to re-run: every statement below uses IF NOT EXISTS.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS employees_full_name_trgm_idx
  ON employees
  USING GIN (full_name gin_trgm_ops);
