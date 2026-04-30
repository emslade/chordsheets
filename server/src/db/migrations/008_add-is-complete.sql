-- Up Migration
ALTER TABLE chord_sheets ADD COLUMN is_complete BOOLEAN NOT NULL DEFAULT false;

-- Down Migration
ALTER TABLE chord_sheets DROP COLUMN IF EXISTS is_complete;
