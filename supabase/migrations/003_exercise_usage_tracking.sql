-- Table to track exercise usage per user for personalized sorting
-- Updated for Auth0 integration (user_id is TEXT, not UUID)
CREATE TABLE user_exercise_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  usage_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_user_exercise_usage_user_id ON user_exercise_usage(user_id);
CREATE INDEX idx_user_exercise_usage_exercise_id ON user_exercise_usage(exercise_id);
CREATE INDEX idx_user_exercise_usage_count ON user_exercise_usage(user_id, usage_count DESC);

-- Enable Row Level Security
ALTER TABLE user_exercise_usage ENABLE ROW LEVEL SECURITY;

-- Permissive policy for service role access (Auth0 handles authorization at app level)
CREATE POLICY "Service role has full access to user_exercise_usage"
  ON user_exercise_usage FOR ALL
  USING (true)
  WITH CHECK (true);
