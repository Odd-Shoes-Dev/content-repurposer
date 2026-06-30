-- Add soft-delete support to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;
