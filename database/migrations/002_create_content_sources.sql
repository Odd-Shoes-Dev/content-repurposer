CREATE TABLE content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  source_type VARCHAR(50) NOT NULL DEFAULT 'paste',
  content TEXT NOT NULL,
  word_count INT,
  tone VARCHAR(50) DEFAULT 'professional',
  custom_instructions TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_sources_user ON content_sources(user_id, created_at DESC);
