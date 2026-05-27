'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
      else router.push('/login');
    });
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from('items').select('*').order('created_at', { ascending: false });
    if (data) setItems(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (editing) {
      await supabase.from('items').update({ title, content }).eq('id', editing);
      setEditing(null);
    } else {
      await supabase.from('items').insert({ title, content, user_id: user.id });
    }
    setTitle('');
    setContent('');
    await fetchItems();
    setLoading(false);
  };

  const handleEdit = (item) => {
    setTitle(item.title);
    setContent(item.content);
    setEditing(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    await supabase.from('items').delete().eq('id', id);
    await fetchItems();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">管理后台</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">退出</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">{editing ? '编辑内容' : '发布新内容'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required
              placeholder="标题" />
            <textarea value={content} onChange={e => setContent(e.target.value)} rows="4"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required
              placeholder="内容..." />
            <div className="flex gap-3">
              <button type="submit" disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                {loading ? '提交中...' : editing ? '保存修改' : '发布'}
              </button>
              {editing && (
                <button type="button" onClick={() => { setEditing(null); setTitle(''); setContent(''); }}
                  className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition">取消</button>
              )}
            </div>
          </form>
        </div>

        <div className="space-y-4">
          {items.length === 0 && <p className="text-gray-400 text-center py-8">暂无内容，发布第一条吧</p>}
          {items.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm">
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-600 mb-3">{item.content}</p>
              <div className="flex gap-3 text-sm">
                <button onClick={() => handleEdit(item)} className="text-blue-600 hover:underline">编辑</button>
                <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:underline">删除</button>
                <span className="text-gray-400 ml-auto">{new Date(item.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
