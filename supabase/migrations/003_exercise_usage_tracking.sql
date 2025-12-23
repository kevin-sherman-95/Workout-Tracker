-- Table to track exercise usage per user for personalized sorting
CREATE TABLE user_exercise_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- RLS Policies for user_exercise_usage
CREATE POLICY "Users can view their own exercise usage"
  ON user_exercise_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise usage"
  ON user_exercise_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise usage"
  ON user_exercise_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise usage"
  ON user_exercise_usage FOR DELETE
  USING (auth.uid() = user_id);

