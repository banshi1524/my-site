'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Register() {
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const sendCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 先尝试创建用户（SMTP关了不会发邮件）
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password: crypto.randomUUID() + crypto.randomUUID(),
    });

    // 忽略"已存在"错误
    if (signUpErr && !signUpErr.message?.includes('already') && !signUpErr.message?.includes('exists')) {
      // 用户不存在，创建失败但不是因为已存在 → 可能有问题
    }

    // 发验证码
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    if (otpErr) setError(otpErr.message);
    else setCodeSent(true);
    setLoading(false);
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (err) setError('验证码错误或已过期');
    else router.push('/dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">注册/登录</h1>
        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded">{error}</p>}
        
        {!codeSent ? (
          <form onSubmit={sendCode} className="space-y-4">
            <p className="text-sm text-gray-500">新用户自动注册，老用户直接登录</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required placeholder="your@qq.com" />
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
              {loading ? '发送中...' : '发送验证码'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <p className="text-sm text-gray-600">验证码已发送到 <strong>{email}</strong></p>
            <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
              required placeholder="000000" maxLength={6} autoFocus />
            <button type="submit" disabled={loading || code.length !== 6}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
              {loading ? '验证中...' : '确认'}
            </button>
            <button type="button" onClick={() => setCodeSent(false)}
              className="w-full text-sm text-blue-600 hover:underline">← 换邮箱</button>
          </form>
        )}
      </div>
    </div>
  );
}
