-- Up Migration
ALTER TABLE chord_sheets ADD COLUMN nashville_content TEXT;

-- Down Migration
-- ALTER TABLE chord_sheets DROP COLUMN IF EXISTS nashville_content;
