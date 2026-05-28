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

  // ── 持仓 ──
  const [positions, setPositions] = useState([]);
  const [prices, setPrices] = useState({});        // {code: {price, change_pct, name, ...}}
  const [newCode, setNewCode] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newCost, setNewCost] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const canvasRef = useRef(null);

  // ── 贪吃蛇 refs ──
  const snakeRef = useRef([]);
  const dirRef = useRef({ x: 1, y: 0 });
  const foodRef = useRef(null);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const speedRef = useRef(120);
  const intervalRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
      else router.push('/login');
    });
    fetchMessages();
    fetchPhoto();
    fetchPositions();
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

  // ════════════════════════════════════════════
  // 照片墙
  // ════════════════════════════════════════════
  const fetchPhoto = async () => {
    const { data } = supabase.storage.from('photos').getPublicUrl('wall.jpg');
    if (data?.publicUrl) setPhotoUrl(data.publicUrl);
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

  // ════════════════════════════════════════════
  // 留言板
  // ════════════════════════════════════════════
  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*')
      .order('created_at', { ascending: false }).limit(50);
    if (data) setMessages(data.reverse());
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

  // ════════════════════════════════════════════
  // 贪吃蛇
  // ════════════════════════════════════════════
  const drawSnake = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 16;
    const cols = 18, rows = 18;
    canvas.width = cols * size;
    canvas.height = rows * size;

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
    if (foodRef.current) {
      ctx.fillStyle = '#e94560';
      ctx.fillRect(foodRef.current.x * size + 2, foodRef.current.y * size + 2, size - 4, size - 4);
    }
    snakeRef.current.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#0f3460' : '#162447';
      ctx.fillRect(s.x * size + 1, s.y * size + 1, size - 2, size - 2);
    });
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText('Score: ' + scoreRef.current, 8, canvas.height - 6);
    if (gameOverRef.current) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#e94560';
      ctx.font = '18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 8);
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.fillText('按 R 或点击按钮重新开始', canvas.width / 2, canvas.height / 2 + 14);
      ctx.textAlign = 'start';
    }
  }, []);

  const resetSnake = useCallback(() => {
    snakeRef.current = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    dirRef.current = { x: 1, y: 0 };
    scoreRef.current = 0;
    gameOverRef.current = false;
    speedRef.current = 120;
    const cols = 18, rows = 18;
    let f;
    do {
      f = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    } while (snakeRef.current.some(s => s.x === f.x && s.y === f.y));
    foodRef.current = f;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 120);
    drawSnake();
  }, [drawSnake]);

  const tick = useCallback(() => {
    if (gameOverRef.current) return;
    const cols = 18, rows = 18;
    const head = {
      x: snakeRef.current[0].x + dirRef.current.x,
      y: snakeRef.current[0].y + dirRef.current.y
    };
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows ||
        snakeRef.current.some(s => s.x === head.x && s.y === head.y)) {
      gameOverRef.current = true;
      drawSnake();
      return;
    }
    snakeRef.current.unshift(head);
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      scoreRef.current += 10;
      let f;
      do {
        f = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
      } while (snakeRef.current.some(s => s.x === f.x && s.y === f.y));
      foodRef.current = f;
      if (speedRef.current > 60) {
        speedRef.current -= 2;
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(tick, speedRef.current);
      }
    } else {
      snakeRef.current.pop();
    }
    drawSnake();
  }, [drawSnake]);

  const changeDir = useCallback((dx, dy) => {
    if (!(dx === -dirRef.current.x && dy === -dirRef.current.y)) {
      dirRef.current = { x: dx, y: dy };
    }
  }, []);

  const keyHandler = useCallback((e) => {
    if (e.key === 'r' || e.key === 'R') { resetSnake(); return; }
    const map = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0],
                   w:[0,-1], W:[0,-1], s:[0,1], S:[0,1], a:[-1,0], A:[-1,0], d:[1,0], D:[1,0] };
    const d = map[e.key];
    if (d) changeDir(d[0], d[1]);
  }, [resetSnake, changeDir]);

  useEffect(() => {
    snakeRef.current = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    dirRef.current = { x: 1, y: 0 };
    scoreRef.current = 0;
    gameOverRef.current = false;
    speedRef.current = 120;
    const cols = 18, rows = 18;
    let f;
    do {
      f = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    } while (snakeRef.current.some(s => s.x === f.x && s.y === f.y));
    foodRef.current = f;
    drawSnake();
    window.addEventListener('keydown', keyHandler);
    intervalRef.current = setInterval(tick, 120);
    return () => {
      window.removeEventListener('keydown', keyHandler);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ════════════════════════════════════════════
  // 持仓监控
  // ════════════════════════════════════════════
  const fetchPositions = async () => {
    const { data } = await supabase.from('positions').select('*').order('created_at', { ascending: false });
    if (data) setPositions(data);
  };

  const addPosition = async () => {
    const code = newCode.trim();
    const shares = parseInt(newShares);
    const cost = parseFloat(newCost);
    if (!code || code.length !== 6 || isNaN(shares) || shares <= 0 || isNaN(cost) || cost <= 0) return;
    // 先查行情获取名称
    try {
      const res = await fetch('/api/stock?codes=' + code);
      const json = await res.json();
      const info = json.stocks?.[0];
      if (!info) { alert('未找到该股票'); return; }
      await supabase.from('positions').insert({
        user_id: user.id,
        stock_code: code,
        stock_name: info.name,
        shares,
        cost_price: cost,
        exchange: code.startsWith('6') ? 'SH' : 'SZ'
      });
      setNewCode(''); setNewShares(''); setNewCost('');
      await fetchPositions();
      // 立即刷新价格
      refreshPrices();
    } catch (err) {
      alert('添加失败: ' + err.message);
    }
  };

  const removePosition = async (id) => {
    await supabase.from('positions').delete().eq('id', id);
    setPositions(p => p.filter(x => x.id !== id));
  };

  const refreshPrices = async () => {
    if (positions.length === 0) return;
    setPriceLoading(true);
    try {
      const codes = positions.map(p => p.stock_code).join(',');
      const res = await fetch('/api/stock?codes=' + codes);
      const json = await res.json();
      if (json.stocks) {
        const map = {};
        json.stocks.forEach(s => { map[s.code] = s; });
        setPrices(map);
      }
    } catch (err) { /* ignore */ }
    setPriceLoading(false);
  };

  // 首次加载 + positions 变化时刷新价格
  useEffect(() => {
    if (positions.length > 0) refreshPrices();
  }, [positions.length]);

  // ════════════════════════════════════════════
  // 计算浮盈
  // ════════════════════════════════════════════
  const calcPnL = (pos) => {
    const p = prices[pos.stock_code];
    if (!p) return { pnl: null, marketVal: null };
    const marketVal = p.price * pos.shares;
    const cost = pos.cost_price * pos.shares;
    const pnl = marketVal - cost;
    return { pnl, marketVal };
  };

  if (!user) return null;

  const dirBtnClass = "w-12 h-12 flex items-center justify-center bg-gray-700 hover:bg-emerald-600 active:bg-emerald-500 rounded-lg text-white text-xl select-none touch-manipulation transition";

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* 导航栏 */}
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-lg font-bold text-emerald-400">张凡</h1>
        <div className="text-gray-400 text-xs sm:text-sm font-mono">{time}</div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:inline">{user.email}</span>
          <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 transition">退出</button>
        </div>
      </nav>

      {/* 主区域：照片 + 贪吃蛇 */}
      <div className="flex-1 p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto w-full">

        {/* 左：照片墙 */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">📷 照片墙</h2>
          <div className="flex-1 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden min-h-[220px]">
            {photoUrl ? (
              <img src={photoUrl} alt="照片墙" className="max-w-full max-h-full object-contain"
                onError={(e) => { e.target.style.display = 'none'; setPhotoUrl(null); }} />
            ) : <span className="text-gray-600 text-sm">还没有照片</span>}
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

          {/* 触屏方向键 D-pad */}
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {/* 空 上 空 */}
            <div />
            <button className={dirBtnClass} onPointerDown={(e) => { e.preventDefault(); changeDir(0, -1); }}
              title="上">▲</button>
            <div />

            {/* 左 重置 右 */}
            <button className={dirBtnClass} onPointerDown={(e) => { e.preventDefault(); changeDir(-1, 0); }}
              title="左">◀</button>
            <button className="w-12 h-12 flex items-center justify-center bg-gray-700 hover:bg-red-600 active:bg-red-500 rounded-lg text-white text-xs select-none touch-manipulation transition"
              onPointerDown={(e) => { e.preventDefault(); resetSnake(); }} title="重新开始">↻</button>
            <button className={dirBtnClass} onPointerDown={(e) => { e.preventDefault(); changeDir(1, 0); }}
              title="右">▶</button>

            {/* 空 下 空 */}
            <div />
            <button className={dirBtnClass} onPointerDown={(e) => { e.preventDefault(); changeDir(0, 1); }}
              title="下">▼</button>
            <div />
          </div>

          <p className="text-gray-600 text-[10px] mt-2">方向键 / WASD / 触屏按钮</p>
        </div>
      </div>

      {/* ── 持仓监控 ── */}
      <div className="px-3 sm:px-4 pb-4 max-w-6xl mx-auto w-full">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">📊 持仓监控</h2>
            <button onClick={refreshPrices} disabled={priceLoading || positions.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded transition">
              {priceLoading ? '刷新中...' : '刷新价格'}
            </button>
          </div>

          {/* 添加持仓 */}
          <div className="flex flex-wrap gap-2 mb-3">
            <input value={newCode} onChange={e => setNewCode(e.target.value)}
              placeholder="代码(6位)" maxLength={6}
              className="w-24 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500" />
            <input value={newShares} onChange={e => setNewShares(e.target.value)}
              placeholder="股数" type="number"
              className="w-20 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500" />
            <input value={newCost} onChange={e => setNewCost(e.target.value)}
              placeholder="买入价" type="number" step="0.01"
              className="w-24 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500" />
            <button onClick={addPosition}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-1.5 rounded transition">
              添加
            </button>
          </div>

          {/* 持仓列表 */}
          {positions.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-4">还没有持仓，在上方添加</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-700">
                    <th className="text-left py-2 pr-2">代码</th>
                    <th className="text-left py-2 pr-2">名称</th>
                    <th className="text-right py-2 pr-2">现价</th>
                    <th className="text-right py-2 pr-2">涨跌</th>
                    <th className="text-right py-2 pr-2">成本</th>
                    <th className="text-right py-2 pr-2">持仓</th>
                    <th className="text-right py-2 pr-2">市值</th>
                    <th className="text-right py-2 pr-2">浮盈</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(pos => {
                    const { pnl, marketVal } = calcPnL(pos);
                    const priceInfo = prices[pos.stock_code];
                    const changePct = priceInfo?.change_pct;
                    const isUp = changePct > 0;
                    const isDown = changePct < 0;
                    return (
                      <tr key={pos.id} className="border-b border-gray-700/50 hover:bg-gray-750">
                        <td className="py-2 pr-2 text-gray-300">{pos.stock_code}</td>
                        <td className="py-2 pr-2 text-gray-300">{pos.stock_name}</td>
                        <td className={`py-2 pr-2 text-right font-mono ${priceInfo ? (isDown ? 'text-green-400' : isUp ? 'text-red-400' : 'text-gray-300') : 'text-gray-500'}`}>
                          {priceInfo ? priceInfo.price?.toFixed(2) : '---'}
                        </td>
                        <td className={`py-2 pr-2 text-right font-mono ${isDown ? 'text-green-400' : isUp ? 'text-red-400' : 'text-gray-400'}`}>
                          {changePct != null ? (changePct > 0 ? '+' : '') + changePct.toFixed(2) + '%' : '---'}
                        </td>
                        <td className="py-2 pr-2 text-right text-gray-400">{pos.cost_price.toFixed(2)}</td>
                        <td className="py-2 pr-2 text-right text-gray-300">{pos.shares}</td>
                        <td className="py-2 pr-2 text-right font-mono text-gray-300">
                          {marketVal != null ? marketVal.toFixed(2) : '---'}
                        </td>
                        <td className={`py-2 pr-2 text-right font-mono font-bold ${pnl != null ? (pnl >= 0 ? 'text-red-400' : 'text-green-400') : 'text-gray-500'}`}>
                          {pnl != null ? (pnl >= 0 ? '+' : '') + pnl.toFixed(2) : '---'}
                        </td>
                        <td className="py-2 text-center">
                          <button onClick={() => removePosition(pos.id)}
                            className="text-gray-600 hover:text-red-400 text-sm leading-none">&times;</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── 留言板 ── */}
      <div className="px-3 sm:px-4 pb-6 max-w-6xl mx-auto w-full">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">💬 留言板</h2>
          <div className="h-40 overflow-y-auto space-y-2 mb-3 pr-1">
            {messages.length === 0 && <p className="text-gray-600 text-xs text-center py-8">还没有留言，说点什么吧</p>}
            {messages.map(m => (
              <div key={m.id} className="flex gap-2 text-xs">
                <span className="text-emerald-400 shrink-0 font-medium">{m.email?.split('@')[0]}</span>
                <span className="text-gray-600 shrink-0">{new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-gray-300">{m.content}</span>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2">
            <input value={msgText} onChange={e => setMsgText(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
              placeholder="输入留言..." maxLength={500} />
            <button type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-5 py-2 rounded-lg transition shrink-0">
              发送
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
