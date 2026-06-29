CREATE TABLE generated_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_source_id UUID NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  format VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  edited_content TEXT,
  model_used VARCHAR(100) NOT NULL,
  tokens_input INT,
  tokens_output INT,
  generation_time_ms INT,
  is_favorite BOOLEAN DEFAULT FALSE,
  rating VARCHAR(10) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outputs_source ON generated_outputs(content_source_id);
CREATE INDEX idx_outputs_user ON generated_outputs(user_id, created_at DESC);
CREATE INDEX idx_outputs_format ON generated_outputs(user_id, format);
