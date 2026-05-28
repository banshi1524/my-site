-- 留言板表
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- 持仓表
CREATE TABLE IF NOT EXISTS positions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_code TEXT NOT NULL,
  stock_name TEXT NOT NULL,
  shares INTEGER NOT NULL,
  cost_price NUMERIC(10,3) NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'SH',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- 所有人都能看持仓
CREATE POLICY "Anyone can view positions" ON positions FOR SELECT USING (true);
-- 只能添加自己的
CREATE POLICY "Users can insert own positions" ON positions FOR INSERT WITH CHECK (auth.uid() = user_id);
-- 只能删自己的
CREATE POLICY "Users can delete own positions" ON positions FOR DELETE USING (auth.uid() = user_id);
