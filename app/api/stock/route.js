// GET /api/stock?codes=601231,000858
// 代理东方财富实时行情，避免浏览器跨域

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const codes = searchParams.get('codes');
  if (!codes) return Response.json({ error: '缺少 codes 参数' }, { status: 400 });

  const codeList = codes.split(',').map(c => c.trim()).filter(Boolean);
  if (codeList.length === 0) return Response.json({ error: 'codes 为空' }, { status: 400 });
  if (codeList.length > 20) return Response.json({ error: '最多 20 只' }, { status: 400 });

  // 构建 secid 列表（6开头=沪市SH，0/3开头=深市SZ）
  const secids = codeList.map(code => {
    const prefix = code.startsWith('6') ? '1.' : '0.';
    return prefix + code;
  }).join(',');

  const fields = 'f2,f3,f4,f12,f14,f15,f16,f17,f18';

  try {
    const res = await fetch(
      `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=${secids}&fields=${fields}`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://quote.eastmoney.com/' } }
    );
    const json = await res.json();

    if (!json.data || !json.data.diff) {
      return Response.json({ error: 'API 返回异常' }, { status: 502 });
    }

    const stocks = json.data.diff.map(item => ({
      code: item.f12,
      name: item.f14,
      price: item.f2,
      change_pct: item.f3,
      change_amt: item.f4,
      high: item.f15,
      low: item.f16,
      open: item.f17,
      prev_close: item.f18,
    }));

    return Response.json({ stocks });
  } catch (err) {
    return Response.json({ error: '请求东方财富失败: ' + err.message }, { status: 502 });
  }
}
