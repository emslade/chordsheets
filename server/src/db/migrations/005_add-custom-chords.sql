-- Up Migration
ALTER TABLE chord_sheets ADD COLUMN custom_chords JSONB;

-- Down Migration
ALTER TABLE chord_sheets DROP COLUMN IF EXISTS custom_chords;
