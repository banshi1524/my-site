import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: '邮箱或密码格式不正确' }, { status: 400 });
  }

  const supabase = createClient(
    'https://eabupgneotyhpaeiikez.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 先用 admin API 创建用户
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    // 如果用户已存在，返回友好提示
    if (createError.message?.includes('already') || createError.status === 422) {
      return NextResponse.json({ error: '该邮箱已注册，请直接登录' }, { status: 409 });
    }
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
