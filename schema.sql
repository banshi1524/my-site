-- 留言板表
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 所有人都能看
CREATE POLICY "Anyone can view messages" ON messages FOR SELECT USING (true);

-- 登录用户能发
CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 只能删自己的
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
