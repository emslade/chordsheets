-- Up Migration
ALTER TABLE chord_sheets ADD COLUMN capo INTEGER;
ALTER TABLE chord_sheets ADD COLUMN tuning VARCHAR(20);

-- Down Migration
ALTER TABLE chord_sheets DROP COLUMN IF EXISTS tuning;
ALTER TABLE chord_sheets DROP COLUMN IF EXISTS capo;
