-- 创建 photos 存储桶（公开访问）
-- 在 Supabase SQL Editor 中运行此文件：
-- https://supabase.com/dashboard/project/eabupgneotyhpaeiikez/sql/new

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('photos', 'photos', true, 10485760, '{image/*}')
ON CONFLICT (id) DO UPDATE SET public = true;

-- 允许任何人查看 photos 桶中的文件
CREATE POLICY IF NOT EXISTS "Public read photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- 允许已认证用户上传到 photos 桶
CREATE POLICY IF NOT EXISTS "Auth users upload photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');
