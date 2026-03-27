-- Up Migration
CREATE TABLE chord_sheets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  artist      VARCHAR(255),
  key         VARCHAR(10),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chord_sheets_user_id ON chord_sheets(user_id);

-- Down Migration
DROP TABLE IF EXISTS chord_sheets;
