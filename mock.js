// 示範模式用的假後端：資料只存在這個分頁的記憶體，重新整理就還原，完全不會碰到正式試算表。
// 回傳格式與正式後端相同（中文欄位），讓 api.js 的轉換邏輯在示範模式也會被用到。
const now = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
const V = (id, pid, name, price, rule, sort, status = '上架') => ({ '規格編號': id, '商品編號': pid, '規格名稱': name, '售價': price, '宅配規則': rule, '上架狀態': status, '備註': '', '排序': sort, '更新時間': '2026-10-01 10:00:00' });
const P = (id, cat, name, temp, sort, variants, status = '上架') => ({ '商品編號': id, '分類': cat, '商品名稱': name, '上架狀態': status, '商品備註': '', '排序': sort, '更新時間': '2026-10-01 10:00:00', '溫層': temp, variants });

const db = [
  P('DM001', '示範蛋糕', '示範・香草生乳酪蛋糕', '冷凍', 1, [V('DM001-V01', 'DM001', '5吋', 700, '可宅配', 1), V('DM001-V02', 'DM001', '6吋', 950, '可宅配', 2), V('DM001-V03', 'DM001', '8吋', 1500, '限自取', 3)]),
  P('DM002', '示範蛋糕', '示範・草莓鮮奶油蛋糕', '冷凍', 2, [V('DM002-V01', 'DM002', '6吋', 1080, '限自取', 1), V('DM002-V02', 'DM002', '8吋', 1680, '限自取', 2)]),
  P('DM003', '示範戚風', '示範・原味戚風裸蛋糕', '冷凍', 3, [V('DM003-V01', 'DM003', '4吋', 380, '限自取', 1), V('DM003-V02', 'DM003', '6吋', 620, '限自取', 2)], '停售'),
  P('DN001', '示範點心', '示範・原味瑪德蓮', '常溫', 4, [V('DN001-V01', 'DN001', '單顆', 50, '可宅配', 1), V('DN001-V02', 'DN001', '6入盒', 300, '可宅配', 2), V('DN001-V03', 'DN001', '10入禮盒', 520, '可宅配', 3, '停售')])
];
const clone = o => JSON.parse(JSON.stringify(o));
const wait = ms => new Promise(r => setTimeout(r, ms));
const find = id => { const p = db.find(x => x['商品編號'] === id); if (!p) throw new Error('找不到商品：' + id); return p; };
const txt = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const int = (v, label) => { const n = Number(v); if (v === '' || v == null || !Number.isSafeInteger(n) || n < 0) throw new Error(label + '須為非負整數'); return n; };

function nextId(category) {
  const pat = /^([A-Za-z]+)(\d+)$/, ids = db.map(p => p['商品編號']);
  const same = db.filter(p => p['分類'] === category).map(p => p['商品編號'].match(pat)).filter(Boolean);
  const prefix = same.length ? same[0][1] : 'P', width = same.length ? same[0][2].length : 3;
  let max = 0; ids.forEach(x => { const m = x.match(pat); if (m && m[1] === prefix) max = Math.max(max, Number(m[2])); });
  let id; do { max++; id = prefix + String(max).padStart(width, '0'); } while (ids.includes(id));
  return id;
}

function saveProduct(a) {
  const mode = a.mode === 'update' ? 'update' : 'create';
  const name = txt(a.name, 80), category = txt(a.category, 40);
  if (!name) throw new Error('商品名稱不可空白'); if (!category) throw new Error('分類不可空白');
  if (!['冷凍', '常溫'].includes(a.temp)) throw new Error('溫層須為「冷凍」或「常溫」');
  if (!Array.isArray(a.variants) || !a.variants.length) throw new Error('至少需要一個規格');
  let id = txt(a.id, 30), old = null;
  if (mode === 'update') old = find(id);
  else if (id) { if (!/^[A-Za-z0-9_-]{1,30}$/.test(id)) throw new Error('商品編號只能用英文、數字、- 與 _'); if (db.some(p => p['商品編號'] === id)) throw new Error('商品編號已存在：' + id); }
  else id = nextId(category);
  if (db.some(p => p['商品編號'] !== id && p['商品名稱'] === name)) throw new Error('已有同名商品：' + name);
  const mine = old ? old.variants : [], seen = new Set();
  let seq = 0; mine.forEach(v => { const m = v['規格編號'].match(/-V(\d+)$/); if (m) seq = Math.max(seq, Number(m[1])); });
  const out = a.variants.map((v, i) => {
    const vname = txt(v.name, 40); if (!vname) throw new Error('規格名稱不可空白');
    if (seen.has(vname)) throw new Error('規格名稱重複：' + vname); seen.add(vname);
    const row = { '商品編號': id, '規格名稱': vname, '售價': int(v.price, vname + ' 售價'), '宅配規則': v.shippingRule || '限自取', '上架狀態': v.status || '上架', '備註': txt(v.note), '排序': i + 1, '更新時間': now() };
    if (v.id) { if (!mine.some(m => m['規格編號'] === v.id)) throw new Error('規格不屬於此商品：' + v.id); row['規格編號'] = v.id; }
    else { seq++; row['規格編號'] = id + '-V' + String(seq).padStart(2, '0'); }
    return row;
  });
  const data = { '商品編號': id, '分類': category, '商品名稱': name, '上架狀態': a.status || '上架', '商品備註': txt(a.note, 1000), '排序': int(a.sort || 0, '排序'), '更新時間': now(), '溫層': a.temp, variants: out };
  if (old) Object.assign(old, data); else db.push(data);
  return clone(find(id));
}

const handlers = {
  me: () => ({ email: '示範模式', brand: 'Vanilla. 香草籽甜點' }),
  catalog: () => ({ products: clone(db), shippingRules: ['可宅配', '限自取', '特殊確認'], temps: ['冷凍', '常溫'] }),
  saveProduct,
  setProductStatus: a => { const p = find(a.id); p['上架狀態'] = a.status; p['更新時間'] = now(); return clone(p); },
  setVariantStatus: a => { const p = db.find(x => x.variants.some(v => v['規格編號'] === a.id)); if (!p) throw new Error('找不到規格：' + a.id); p.variants.find(v => v['規格編號'] === a.id)['上架狀態'] = a.status; return clone(p); }
};

export async function mockCall(action, args) {
  await wait(220);
  if (!handlers[action]) throw new Error('不支援的動作：' + action);
  return handlers[action](args || {});
}
