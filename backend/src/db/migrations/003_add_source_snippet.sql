-- 003_add_source_snippet.sql
-- Add snippet column to source_references to store verified text excerpts

ALTER TABLE source_references ADD COLUMN IF NOT EXISTS snippet TEXT;
