-- Up Migration
ALTER TABLE chord_sheets ADD COLUMN share_token VARCHAR(32) UNIQUE;
CREATE INDEX idx_chord_sheets_share_token ON chord_sheets (share_token) WHERE share_token IS NOT NULL;

-- Down Migration
-- DROP INDEX IF EXISTS idx_chord_sheets_share_token;
-- ALTER TABLE chord_sheets DROP COLUMN IF EXISTS share_token;
