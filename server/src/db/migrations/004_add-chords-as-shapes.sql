-- Up Migration
ALTER TABLE chord_sheets ADD COLUMN chords_as_shapes BOOLEAN DEFAULT true;

-- Down Migration
ALTER TABLE chord_sheets DROP COLUMN IF EXISTS chords_as_shapes;
