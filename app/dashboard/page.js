'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [time, setTime] = useState('');
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const canvasRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
      else router.push('/login');
    });
    fetchMessages();
    fetchPhoto();
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateTime = () => {
    const now = new Date();
    setTime(now.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'long'
    }));
  };

  // ── 照片墙 ──
  const fetchPhoto = async () => {
    const { data } = supabase.storage.from('photos').getPublicUrl('wall.jpg');
    if (data?.publicUrl) {
      try {
        const res = await fetch(data.publicUrl, { method: 'HEAD' });
        if (res.ok) setPhotoUrl(data.publicUrl);
      } catch {}
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await supabase.storage.from('photos').upload('wall.jpg', file, { upsert: true });
    const { data } = supabase.storage.from('photos').getPublicUrl('wall.jpg');
    setPhotoUrl(data.publicUrl + '?t=' + Date.now());
    setUploading(false);
  };

  // ── 留言板 ──
  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(50);
    if (data) setMessages(data);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    await supabase.from('messages').insert({ user_id: user.id, email: user.email, content: msgText });
    setMsgText('');
    await fetchMessages();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // ── 贪吃蛇 ──
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = 16;
    const cols = 18, rows = 18;
    canvas.width = cols * size;
    canvas.height = rows * size;

    let snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    let dir = { x: 1, y: 0 };
    let food = spawnFood();
    let score = 0;
    let gameOver = false;
    let speed = 120;

    function spawnFood() {
      let f;
      do { f = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) }; }
      while (snake.some(s => s.x === f.x && s.y === f.y));
      return f;
    }

    function draw() {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c) % 2 === 0) {
            ctx.fillStyle = '#16213e';
            ctx.fillRect(c * size, r * size, size, size);
          }
        }
      }
      ctx.fillStyle = '#e94560';
      ctx.fillRect(food.x * size + 2, food.y * size + 2, size - 4, size - 4);
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#0f3460' : '#162447';
        ctx.fillRect(s.x * size + 1, s.y * size + 1, size - 2, size - 2);
      });
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.fillText('Score: ' + score, 8, canvas.height - 6);
      if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#e94560';
        ctx.font = '18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 8);
        ctx.fillStyle = '#fff';
        ctx.font = '11px monospace';
        ctx.fillText('按 R 重新开始', canvas.width / 2, canvas.height / 2 + 14);
        ctx.textAlign = 'start';
      }
    }

    function tick() {
      if (gameOver) return;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows || snake.some(s => s.x === head.x && s.y === head.y)) {
        gameOver = true; draw(); return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        food = spawnFood();
        if (speed > 60) speed -= 2;
      } else {
        snake.pop();
      }
      draw();
    }

    const keyHandler = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
        dir = { x: 1, y: 0 };
        score = 0;
        gameOver = false;
        speed = 120;
        food = spawnFood();
        return;
      }
      const keyMap = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
      const newDir = keyMap[e.key];
      if (newDir && !(newDir.x === -dir.x && newDir.y === -dir.y)) dir = newDir;
    };

    draw();
    window.addEventListener('keydown', keyHandler);
    const interval = setInterval(() => { tick(); if (gameOver) clearInterval(interval); }, speed);

    return () => {
      window.removeEventListener('keydown', keyHandler);
      clearInterval(interval);
    };
  }, [canvasRef.current]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* 导航栏 */}
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex justify-between items-center">
        <h1 className="text-lg font-bold text-emerald-400">张凡</h1>
        <div className="text-gray-400 text-sm font-mono">{time}</div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 transition">退出</button>
        </div>
      </nav>

      {/* 主区域 */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto w-full">
        
        {/* 左：照片墙 */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">📷 照片墙</h2>
          <div className="flex-1 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden min-h-[280px]">
            {photoUrl ? (
              <img src={photoUrl} alt="照片墙" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-gray-600 text-sm">还没有照片</span>
            )}
          </div>
          <label className="mt-3 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-2 px-4 rounded-lg text-center transition inline-block w-full">
            {uploading ? '上传中...' : '上传照片'}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>

        {/* 右：贪吃蛇 */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col items-center">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider self-start">🐍 贪吃蛇</h2>
          <canvas ref={canvasRef} className="rounded-lg border border-gray-700" />
          <p className="text-gray-500 text-xs mt-2">方向键控制 · 按 R 重新开始</p>
        </div>
      </div>

      {/* 留言板 */}
      <div className="px-4 pb-4 max-w-6xl mx-auto w-full">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">💬 留言板</h2>
          <div className="h-48 overflow-y-auto space-y-2 mb-3 pr-1">
            {messages.length === 0 && <p className="text-gray-600 text-sm text-center py-8">还没有留言，说点什么吧</p>}
            {messages.map(m => (
              <div key={m.id} className="flex gap-2 text-sm">
                <span className="text-emerald-400 shrink-0">{m.email?.split('@')[0]}</span>
                <span className="text-gray-500 shrink-0">{new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-gray-300">{m.content}</span>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2">
            <input value={msgText} onChange={e => setMsgText(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
              placeholder="输入留言..." maxLength={500} />
            <button type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-5 py-2 rounded-lg transition">
              发送
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
