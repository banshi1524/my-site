-- 在 Supabase SQL Editor 中执行以下语句创建数据表

CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- 用户只能看自己的内容
CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id);

-- 用户只能插入自己的内容
CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的内容
CREATE POLICY "Users can update own items" ON items
  FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能删除自己的内容
CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (auth.uid() = user_id);

-- 创建索引
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_created_at ON items(created_at DESC);
