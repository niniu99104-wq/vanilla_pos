// Vanilla POS — 全部前端程式（單一檔案）
// 目錄：一、共用小工具　二、登入狀態　三、示範模式假後端　四、API 服務　五、商品管理頁　六、主程式（登入畫面、導覽、頁面切換）
// 各區塊包在自己的範圍裡，彼此只透過最後回傳的名稱互相使用，避免變數名稱互相干擾。
// 唯一分開的檔案是 config.js（後端網址），方便您只改那一個值。
import { CONFIG } from './config.js';

/* ══════════ 一、共用小工具：跳脫、金額、提示訊息、確認視窗、圖示 ══════════ */
const { esc, money, icon, toast, confirmDialog } = (() => {
  // 共用小工具：跳脫、金額、提示訊息、確認視窗、圖示
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '$' + Number(n || 0).toLocaleString('zh-TW');

  const ICON_PATHS = {
    dashboard: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    orders: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8.5h6M9 12h6M9 15.5h4"/>',
    new: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    production: '<path d="M4 20.5h16M6 20.5v-6h12v6M8 14.5v-3h8v3M12 11.5V8"/><path d="M12 8c1.2-1 1.2-2.4 0-3.8-1.2 1.4-1.2 2.8 0 3.8z"/>',
    customers: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.5-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    products: '<path d="M12 3.5l8 4.2v8.6l-8 4.2-8-4.2V7.7z"/><path d="M4 7.7l8 4.3 8-4.3M12 12v8.5"/>',
    reports: '<path d="M4 20.5h16M7 20.5v-7M12 20.5V5M17 20.5v-10"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    more: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;

  let toastBox;
  function toast(message, type = 'success', ms = 3600) {
    if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; toastBox.setAttribute('role', 'status'); toastBox.setAttribute('aria-live', 'polite'); document.body.append(toastBox); }
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    // 對話框開啟時位於最上層，訊息區要移進去才不會被蓋住。
    (document.querySelector('dialog[open]') || document.body).append(toastBox);
    toastBox.append(el);
    setTimeout(() => el.remove(), type === 'error' ? ms * 1.6 : ms);
  }

  /** 確認視窗；回傳 Promise<boolean>。 */
  function confirmDialog({ title, message = '', okText = '確定', cancelText = '取消', danger = false }) {
    return new Promise(resolve => {
      const d = document.createElement('dialog');
      d.className = 'confirm';
      d.innerHTML = `<h2>${esc(title)}</h2><p>${esc(message)}</p>
        <div class="actions"><button type="button" class="btn" data-v="0">${esc(cancelText)}</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-v="1">${esc(okText)}</button></div>`;
      let result = false;
      d.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { result = b.dataset.v === '1'; d.close(); } });
      d.addEventListener('close', () => { d.remove(); resolve(result); });
      document.body.append(d);
      d.showModal();
    });
  }
  return { esc, money, icon, toast, confirmDialog };
})();

/* ══════════ 二、登入狀態 ══════════ */
const { getSession, setSession, clearSession } = (() => {
  // 登入狀態：登入成功後，後端發給一組隨機的「登入代碼」，之後每次呼叫後端都帶上。
  // 前端不保存密碼。登入代碼預設只放在本分頁（關閉分頁即消失）；勾選「保持登入」才會留在這台裝置。
  const KEY = 'vp_session';
  let mem = null;

  function load() {
    if (mem) return mem;
    for (const store of ['sessionStorage', 'localStorage']) {
      try { const raw = window[store].getItem(KEY); if (raw) { mem = JSON.parse(raw); return mem; } } catch { /* 無法使用儲存空間時只放記憶體 */ }
    }
    return null;
  }
  /** 回傳尚未過期的登入資料 { token, username, name, expiresAt }；沒有則回傳 null。 */
  function getSession() {
    const s = load();
    if (!s || !s.token || !s.expiresAt || s.expiresAt < Date.now() + 30000) { if (s) clearSession(); return null; }
    return s;
  }
  function setSession(session, remember) {
    clearSession(); mem = session;
    try { window[remember ? 'localStorage' : 'sessionStorage'].setItem(KEY, JSON.stringify(session)); } catch { /* 忽略 */ }
  }
  function clearSession() {
    mem = null;
    for (const store of ['sessionStorage', 'localStorage']) { try { window[store].removeItem(KEY); } catch { /* 忽略 */ } }
  }
  return { getSession, setSession, clearSession };
})();

/* ══════════ 三、示範模式假後端 ══════════ */
const { mockCall } = (() => {
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

  async function mockCall(action, args) {
    await wait(220);
    if (!handlers[action]) throw new Error('不支援的動作：' + action);
    return handlers[action](args || {});
  }
  return { mockCall };
})();

/* ══════════ 四、API 服務 ══════════ */
const { isMock, ApiError, api } = (() => {
  // API Service：所有與後端的溝通都經過這裡。
  // 負責：呼叫、逾時、錯誤處理、登入與帶上登入代碼、後端格式（中文欄位）↔ 前端格式的轉換。
  // 規則：不自動重送。寫入逾時時無法確定後端是否已完成，由使用者重新整理確認。

  const isMock = !CONFIG.API_URL;
  const TIMEOUT_MS = 45000;

  class ApiError extends Error {
    constructor(code, message) { super(message); this.code = code; }
  }

  // 只讀取、不寫入的動作：遇到連線或後端暫時性錯誤時可以安全地自動重試一次。寫入類動作絕不自動重送。
  const READ_ONLY = new Set(['me', 'catalog']);
  const pause = ms => new Promise(r => setTimeout(r, ms));

  async function call(action, args = {}) {
    if (isMock) { return mockCall(action, args); }
    try { return await callOnce(action, args); }
    catch (e) {
      if (!READ_ONLY.has(action) || !['NETWORK', 'BAD_RESPONSE'].includes(e.code)) throw e;
      await pause(900);
      return callOnce(action, args);
    }
  }

  async function callOnce(action, args) {
    let token = '';
    if (action !== 'login') {
      const session = getSession();
      if (!session) { window.dispatchEvent(new Event('vp:auth')); throw new ApiError('AUTH', '請先登入'); }
      token = session.token;
    }
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    let res, text;
    try {
      // 用 text/plain 送出可避免瀏覽器預檢請求（Apps Script 不回應預檢）。
      res = await fetch(CONFIG.API_URL, {
        method: 'POST', redirect: 'follow', signal: ctl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token, action, args })
      });
      text = await res.text();
    } catch (e) {
      if (e.name === 'AbortError') throw new ApiError('TIMEOUT', '連線逾時。若剛才是在儲存，請先重新整理確認資料是否已寫入，不要直接再按一次。');
      throw new ApiError('NETWORK', '無法連線到後端，請檢查網路。');
    } finally { clearTimeout(timer); }
    let json;
    try { json = JSON.parse(text); }
    catch {
      // 後端回的不是資料而是 Google 的錯誤頁：把頁面裡的文字抓出來顯示，才知道真正原因。
      const plain = String(text || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
      throw new ApiError('BAD_RESPONSE', `後端沒有回傳資料（${action}，HTTP ${res.status}）。Google 回應的內容：${plain ? plain.slice(0, 260) : '（空白）'}`);
    }
    if (!json || !json.ok) {
      const code = (json && json.code) || 'ERROR';
      if (code === 'AUTH') { clearSession(); window.dispatchEvent(new Event('vp:auth')); }
      throw new ApiError(code, (json && json.error) || '後端發生錯誤');
    }
    return json.data;
  }

  /* ── 格式轉換 ── */
  const toVariant = v => ({
    id: String(v['規格編號'] ?? ''), name: String(v['規格名稱'] ?? ''), price: Number(v['售價']) || 0,
    shippingRule: String(v['宅配規則'] ?? ''), status: String(v['上架狀態'] ?? ''), note: String(v['備註'] ?? ''), sort: Number(v['排序']) || 0
  });
  const toProduct = p => ({
    id: String(p['商品編號'] ?? ''), category: String(p['分類'] ?? ''), name: String(p['商品名稱'] ?? ''),
    status: String(p['上架狀態'] ?? ''), note: String(p['商品備註'] ?? ''), sort: Number(p['排序']) || 0,
    updatedAt: String(p['更新時間'] ?? ''), temp: p['溫層'] === '常溫' ? '常溫' : '冷凍',
    variants: (p.variants || []).map(toVariant)
  });

  const api = {
    /** 登入；remember=true 時登入狀態會留在這台裝置。密碼只在這一次請求中送出，不會被保存。 */
    async login(username, password, remember) {
      const d = await call('login', { username, password });
      setSession({ token: d.token, username: d.username, name: d.name, expiresAt: d.expiresAt }, remember);
      return d;
    },
    async logout() { try { if (!isMock && getSession()) await call('logout'); } catch { /* 後端登出失敗時仍清除本機狀態 */ } finally { clearSession(); } },
    me: () => call('me'),
    async catalog() {
      const d = await call('catalog');
      return { products: (d.products || []).map(toProduct), shippingRules: d.shippingRules || [], temps: d.temps || [] };
    },
    /** product: { mode, id?, name, category, temp, status, note, sort, variants:[{id?,name,price,shippingRule,status,note}] } */
    saveProduct: async product => toProduct(await call('saveProduct', product)),
    setProductStatus: async (id, status) => toProduct(await call('setProductStatus', { id, status })),
    setVariantStatus: async (id, status) => toProduct(await call('setVariantStatus', { id, status }))
  };
  return { isMock, ApiError, api };
})();

/* ══════════ 五、商品管理頁 ══════════ */
const { mount } = (() => {
  // 商品管理：商品列表（搜尋／篩選／排序／上架開關）＋ 新增・編輯抽屜（商品與全部規格一次儲存）

  const PRESETS = { '冷凍': ['4吋', '5吋', '6吋', '8吋'], '常溫': ['單顆', '6入盒', '10入禮盒', '150g／罐'] };
  const TEMP_LABEL = { '冷凍': '冷凍蛋糕', '常溫': '常溫點心' };
  const TEMP_HINT = {
    '冷凍': '可選「工作室自取、冷凍宅配」；宅配運費每顆計算；每顆一張標籤。',
    '常溫': '可選「工作室自取、超商店到店、新竹物流」；運費整筆計算；整筆訂單一張標籤。'
  };
  const DEFAULT_RULE = { '冷凍': '限自取', '常溫': '可宅配' };

  let root, state;

  async function mount(el) {
    root = el;
    state = { products: [], shippingRules: ['可宅配', '限自取', '特殊確認'], q: '', category: '', status: '', sortKey: '', sortDir: 1, flashId: '' };
    root.innerHTML = `
      <header class="page-head">
        <div><h1>商品管理</h1><p class="sub" id="p-sub">&nbsp;</p></div>
        <button type="button" class="btn btn-primary" id="p-add">＋ 新增商品</button>
      </header>
      <div class="toolbar">
        <input class="input search" id="p-q" type="search" placeholder="搜尋商品名稱、編號、規格" aria-label="搜尋商品">
        <select class="select" id="p-cat" aria-label="分類篩選"><option value="">全部分類</option></select>
        <select class="select" id="p-status" aria-label="上架狀態篩選"><option value="">全部狀態</option><option>上架</option><option>停售</option></select>
      </div>
      <div class="table-wrap" id="p-list"></div>`;
    root.querySelector('#p-add').addEventListener('click', () => openEditor(null));
    root.querySelector('#p-q').addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); renderList(); });
    root.querySelector('#p-cat').addEventListener('change', e => { state.category = e.target.value; renderList(); });
    root.querySelector('#p-status').addEventListener('change', e => { state.status = e.target.value; renderList(); });
    root.querySelector('#p-list').addEventListener('click', onListClick);
    await load();
  }

  async function load() {
    const list = root.querySelector('#p-list');
    list.innerHTML = `<div class="state"><div class="spinner"></div>讀取商品中…</div>`;
    try {
      const d = await api.catalog();
      state.products = d.products;
      if (d.shippingRules.length) state.shippingRules = d.shippingRules;
      renderCategories(); renderList();
    } catch (e) {
      root.querySelector('#p-sub').textContent = '';
      list.innerHTML = `<div class="state"><strong>商品讀取失敗</strong>${esc(e.message)}<br><button type="button" class="btn" data-act="reload">重新整理</button></div>`;
    }
  }

  const categories = () => [...new Set(state.products.map(p => p.category).filter(Boolean))];
  function renderCategories() {
    const sel = root.querySelector('#p-cat'), cur = state.category, cats = categories();
    sel.innerHTML = `<option value="">全部分類</option>` + cats.map(c => `<option${c === cur ? ' selected' : ''}>${esc(c)}</option>`).join('');
    if (cur && !cats.includes(cur)) state.category = '';
  }
  const priceRange = p => {
    const on = p.variants.filter(v => v.status === '上架'), src = on.length ? on : p.variants;
    if (!src.length) return { min: 0, text: '—' };
    const a = Math.min(...src.map(v => v.price)), b = Math.max(...src.map(v => v.price));
    return { min: a, text: a === b ? money(a) : `${money(a)} – ${money(b)}` };
  };

  function renderList() {
    const list = root.querySelector('#p-list'), all = state.products;
    root.querySelector('#p-sub').textContent = `共 ${all.length} 項商品・${all.reduce((n, p) => n + p.variants.length, 0)} 個規格`;
    if (!all.length) {
      list.innerHTML = `<div class="state"><strong>還沒有商品</strong>按右上角「＋ 新增商品」建立第一個商品。</div>`; return;
    }
    let rows = all.filter(p => (!state.category || p.category === state.category) && (!state.status || p.status === state.status)
      && (!state.q || [p.name, p.id, p.category, ...p.variants.map(v => v.name)].join(' ').toLowerCase().includes(state.q)));
    if (state.sortKey) {
      const key = { name: p => p.name, category: p => p.category, count: p => p.variants.length, price: p => priceRange(p).min, status: p => p.status, updated: p => p.updatedAt }[state.sortKey];
      rows = rows.slice().sort((a, b) => { const x = key(a), y = key(b); return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'zh-Hant')) * state.sortDir; });
    }
    if (!rows.length) {
      list.innerHTML = `<div class="state"><strong>找不到符合的商品</strong>請調整搜尋文字或篩選條件。<br><button type="button" class="btn" data-act="clear">清除篩選</button></div>`; return;
    }
    const th = (key, label) => `<th${state.sortKey === key ? ` aria-sort="${state.sortDir > 0 ? 'ascending' : 'descending'}"` : ''}><button type="button" data-sort="${key}">${label}</button></th>`;
    list.innerHTML = `<table class="table">
      <thead><tr>${th('name', '商品名稱')}${th('category', '分類')}${th('count', '規格')}${th('price', '價格範圍')}${th('status', '上架狀態')}${th('updated', '最後更新')}<th><span>操作</span></th></tr></thead>
      <tbody>${rows.map(p => {
        const on = p.status === '上架', pr = priceRange(p);
        const specs = p.variants.map(v => v.status === '上架' ? esc(v.name) : `<s>${esc(v.name)}</s>`).join('、');
        return `<tr data-id="${esc(p.id)}" class="${on ? '' : 'is-off'}${state.flashId === p.id ? ' flash' : ''}">
          <td class="c-name"><div class="p-name">${esc(p.name)}</div>
            <div class="p-meta"><span class="num">${esc(p.id)}</span><span class="tag ${p.temp === '常溫' ? 'tag-ambient' : 'tag-frozen'}">${esc(p.temp)}</span></div></td>
          <td class="c-cat">${esc(p.category)}</td>
          <td class="c-specs"><span class="p-specs">${p.variants.length} 個：${specs || '—'}</span></td>
          <td class="c-price num p-price">${esc(pr.text)}</td>
          <td class="c-status"><button type="button" class="switch" role="switch" aria-checked="${on}" data-act="toggle" aria-label="${esc(p.name)} 上架狀態"><i></i><span class="sw-text">${on ? '上架' : '停售'}</span></button></td>
          <td class="c-updated muted small num">${esc(p.updatedAt.slice(0, 16))}</td>
          <td class="col-actions"><button type="button" class="btn btn-ghost btn-sm" data-act="edit">編輯</button><button type="button" class="btn btn-ghost btn-sm" data-act="copy">複製</button></td>
        </tr>`;
      }).join('')}</tbody></table>`;
    state.flashId = '';
  }

  async function onListClick(e) {
    const sortBtn = e.target.closest('[data-sort]');
    if (sortBtn) { const k = sortBtn.dataset.sort; if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = 1; } renderList(); return; }
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'reload') return load();
    if (act === 'clear') { state.q = state.category = state.status = ''; root.querySelector('#p-q').value = ''; root.querySelector('#p-status').value = ''; renderCategories(); renderList(); return; }
    const tr = btn.closest('tr'), p = state.products.find(x => x.id === (tr && tr.dataset.id)); if (!p) return;
    if (act === 'edit') return openEditor(p);
    if (act === 'copy') return openEditor(p, true);
    if (act === 'toggle') {
      const next = p.status === '上架' ? '停售' : '上架';
      if (next === '停售' && !await confirmDialog({ title: `將「${p.name}」停售？`, message: '停售後新增訂單時不會再出現這個商品。\n既有訂單不受影響，之後可以隨時重新上架。', okText: '停售', danger: true })) return;
      btn.disabled = true;
      try { replaceProduct(await api.setProductStatus(p.id, next)); toast(`「${p.name}」已${next}`); }
      catch (err) { toast(err.message, 'error'); btn.disabled = false; }
    }
  }
  function replaceProduct(np) {
    const i = state.products.findIndex(x => x.id === np.id);
    if (i >= 0) state.products[i] = np; else state.products.push(np);
    state.flashId = np.id; renderCategories(); renderList();
  }

  /* ───────── 新增／編輯抽屜 ───────── */
  function variantRow(v, temp) {
    const saved = !!v.id, on = v.status !== '停售';
    return `<div class="variant${on ? '' : ' is-off'}" data-vid="${esc(v.id || '')}">
      <input class="input v-name" placeholder="規格名稱" aria-label="規格名稱" maxlength="40" value="${esc(v.name || '')}">
      <div class="price-wrap"><input class="input v-price" inputmode="numeric" placeholder="售價" aria-label="售價" maxlength="7" value="${v.price === '' || v.price == null ? '' : esc(v.price)}"></div>
      <select class="select v-rule" aria-label="宅配規則">${state.shippingRules.map(r => `<option${r === (v.shippingRule || DEFAULT_RULE[temp]) ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select>
      <input class="input v-note" placeholder="規格備註（選填）" aria-label="規格備註" maxlength="200" value="${esc(v.note || '')}">
      <div class="v-act">${saved
        ? `<button type="button" class="switch v-status" role="switch" aria-checked="${on}" aria-label="規格上架狀態" title="${on ? '上架中，點一下停售' : '已停售，點一下上架'}"><i></i></button>`
        : `<button type="button" class="icon-btn v-remove" aria-label="移除這個規格" title="移除">${icon('x')}</button>`}</div>
    </div>`;
  }

  function openEditor(product, asCopy = false) {
    const isEdit = !!product && !asCopy;
    const src = product || { name: '', category: state.category || '', temp: '冷凍', status: '上架', note: '', sort: 0, variants: [] };
    const temp = src.temp === '常溫' ? '常溫' : '冷凍';
    const variants = (product ? src.variants : []).map(v => asCopy ? { ...v, id: '', status: '上架' } : v);
    const d = document.createElement('dialog');
    d.className = 'drawer';
    d.innerHTML = `<form novalidate>
      <div class="drawer-head"><h2>${isEdit ? '編輯商品' : asCopy ? '複製成新商品' : '新增商品'}</h2><button type="button" class="btn btn-ghost btn-sm" data-act="cancel">關閉</button></div>
      <div class="drawer-body">
        <div class="field"><label class="req" for="f-name">商品名稱</label>
          <input class="input" id="f-name" maxlength="80" autocomplete="off" placeholder="例如：莓果可可戚風蛋糕" value="${esc(asCopy ? '' : src.name)}">
          ${asCopy ? `<span class="hint">已帶入「${esc(src.name)}」的分類、類型與規格，請輸入新名稱並調整價格。</span>` : ''}</div>
        <div class="grid-2">
          <div class="field"><label class="req" for="f-cat">分類</label>
            <input class="input" id="f-cat" maxlength="40" list="f-cats" autocomplete="off" placeholder="選擇或輸入新分類" value="${esc(src.category)}">
            <datalist id="f-cats">${categories().map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
          <div class="field"><span class="field-label req">類型</span>
            <div class="seg block" role="radiogroup" aria-label="類型">${['冷凍', '常溫'].map(t => `<label><input type="radio" name="f-temp" value="${t}"${t === temp ? ' checked' : ''}><span>${TEMP_LABEL[t]}</span></label>`).join('')}</div></div>
        </div>
        <p class="hint small muted" id="f-temp-hint"></p>

        <div class="section-title">規格與售價 <small>至少一個；由上到下就是顯示順序</small></div>
        <div class="chips" id="f-chips" aria-label="快速加入常用規格"></div>
        <div>
          <div class="variant-head"><span>規格名稱</span><span>售價</span><span>宅配規則</span><span>備註</span><span></span></div>
          <div class="variants" id="f-variants">${variants.map(v => variantRow(v, temp)).join('')}</div>
        </div>
        <div><button type="button" class="btn btn-sm" data-act="add-variant">＋ 新增規格</button></div>

        <details class="adv"><summary>進階設定（商品編號、備註、排序、上架）</summary><div class="adv-body">
          <div class="grid-2">
            <div class="field"><label for="f-id">商品編號</label>
              <input class="input" id="f-id" maxlength="30" autocomplete="off" ${isEdit ? 'readonly' : ''} placeholder="留空會自動編號" value="${esc(isEdit ? src.id : '')}">
              <span class="hint">${isEdit ? '商品編號建立後不可更改。' : '留空時沿用同分類的編號規則，例如 CK015。'}</span></div>
            <div class="field"><label for="f-sort">排序</label>
              <input class="input" id="f-sort" inputmode="numeric" maxlength="5" value="${esc(src.sort || 0)}"><span class="hint">數字小的排前面。</span></div>
          </div>
          <div class="field"><label for="f-note">商品備註</label><textarea class="textarea" id="f-note" maxlength="1000" placeholder="內部備註，選填">${esc(asCopy ? '' : src.note)}</textarea></div>
          <button type="button" class="switch" role="switch" id="f-status" aria-checked="${isEdit ? src.status === '上架' : true}"><i></i><span>上架販售</span></button>
        </div></details>
        <div class="form-error" id="f-error" role="alert" hidden></div>
      </div>
      <div class="drawer-foot"><button type="button" class="btn" data-act="cancel">取消</button><button type="submit" class="btn btn-primary" id="f-save">儲存商品</button></div>
    </form>`;
    document.body.append(d);

    const $ = s => d.querySelector(s), list = $('#f-variants'), errBox = $('#f-error');
    const curTemp = () => d.querySelector('input[name="f-temp"]:checked').value;
    const names = () => [...list.querySelectorAll('.v-name')].map(i => i.value.trim());
    function renderChips() {
      const used = names();
      $('#f-chips').innerHTML = PRESETS[curTemp()].map(n => `<button type="button" class="chip" data-chip="${esc(n)}"${used.includes(n) ? ' disabled' : ''}>＋ ${esc(n)}</button>`).join('');
      $('#f-temp-hint').textContent = TEMP_HINT[curTemp()];
    }
    function addVariant(name = '') {
      const last = list.querySelector('.variant:last-child .v-rule');
      list.insertAdjacentHTML('beforeend', variantRow({ name, price: '', shippingRule: last ? last.value : DEFAULT_RULE[curTemp()] }, curTemp()));
      const row = list.lastElementChild; (name ? row.querySelector('.v-price') : row.querySelector('.v-name')).focus();
      renderChips();
    }
    function collect() {
      return {
        mode: isEdit ? 'update' : 'create', id: $('#f-id').value.trim(), name: $('#f-name').value.trim(), category: $('#f-cat').value.trim(),
        temp: curTemp(), status: $('#f-status').getAttribute('aria-checked') === 'true' ? '上架' : '停售', note: $('#f-note').value.trim(), sort: $('#f-sort').value.trim() || '0',
        variants: [...list.querySelectorAll('.variant')].map(r => ({
          id: r.dataset.vid || '', name: r.querySelector('.v-name').value.trim(), price: r.querySelector('.v-price').value.trim(), shippingRule: r.querySelector('.v-rule').value, note: r.querySelector('.v-note').value.trim(),
          status: r.querySelector('.v-status') ? (r.querySelector('.v-status').getAttribute('aria-checked') === 'true' ? '上架' : '停售') : '上架'
        }))
      };
    }
    function validate(data) {
      d.querySelectorAll('.invalid').forEach(i => i.classList.remove('invalid'));
      const bad = (el, msg) => { el.classList.add('invalid'); return { el, msg }; };
      if (!data.name) return bad($('#f-name'), '請輸入商品名稱。');
      if (!data.category) return bad($('#f-cat'), '請選擇或輸入分類。');
      if (data.id && !/^[A-Za-z0-9_-]{1,30}$/.test(data.id)) { $('details.adv').open = true; return bad($('#f-id'), '商品編號只能用英文、數字、- 與 _。'); }
      if (!/^\d{1,5}$/.test(data.sort)) { $('details.adv').open = true; return bad($('#f-sort'), '排序請輸入數字。'); }
      if (!data.variants.length) return { el: d.querySelector('[data-act="add-variant"]'), msg: '請至少新增一個規格。' };
      const rows = [...list.querySelectorAll('.variant')], seen = new Set();
      for (let i = 0; i < rows.length; i++) {
        const v = data.variants[i];
        if (!v.name) return bad(rows[i].querySelector('.v-name'), `第 ${i + 1} 個規格還沒有名稱。`);
        if (seen.has(v.name)) return bad(rows[i].querySelector('.v-name'), `規格名稱「${v.name}」重複了。`);
        seen.add(v.name);
        if (!/^\d{1,7}$/.test(v.price)) return bad(rows[i].querySelector('.v-price'), `請輸入「${v.name}」的售價（整數）。`);
      }
      return null;
    }
    const showError = msg => { errBox.textContent = msg; errBox.hidden = !msg; if (msg) errBox.scrollIntoView({ block: 'nearest' }); };

    renderChips();
    const initial = JSON.stringify(collect());
    let saving = false, closing = false;
    async function tryClose() {
      if (saving || closing) return;
      if (JSON.stringify(collect()) !== initial) {
        closing = true;
        const ok = await confirmDialog({ title: '放棄尚未儲存的內容？', message: '關閉後這次輸入的資料不會保留。', okText: '放棄', cancelText: '繼續編輯', danger: true });
        closing = false; if (!ok) return;
      }
      d.close();
    }
    // Esc 鍵：延後一拍再開確認視窗，否則同一次按鍵會把剛開的確認視窗也關掉。
    d.addEventListener('cancel', e => { e.preventDefault(); setTimeout(tryClose, 0); });
    d.addEventListener('close', () => d.remove());
    d.addEventListener('change', e => { if (e.target.name === 'f-temp') renderChips(); });
    d.addEventListener('input', e => {
      const t = e.target;
      if (t.classList.contains('v-price') || t.id === 'f-sort') t.value = t.value.replace(/[^\d]/g, '');
      if (t.classList.contains('v-name')) renderChips();
      t.classList.remove('invalid'); if (!errBox.hidden) showError('');
    });
    d.addEventListener('click', e => {
      const chip = e.target.closest('[data-chip]'); if (chip) return addVariant(chip.dataset.chip);
      const rm = e.target.closest('.v-remove'); if (rm) { rm.closest('.variant').remove(); renderChips(); return; }
      const sw = e.target.closest('.switch'); if (sw) { const on = sw.getAttribute('aria-checked') !== 'true'; sw.setAttribute('aria-checked', on); const row = sw.closest('.variant'); if (row) { row.classList.toggle('is-off', !on); sw.title = on ? '上架中，點一下停售' : '已停售，點一下上架'; } return; }
      const act = e.target.closest('[data-act]'); if (!act) return;
      if (act.dataset.act === 'cancel') tryClose();
      if (act.dataset.act === 'add-variant') addVariant();
    });
    d.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault(); if (saving) return;
      const data = collect(), err = validate(data);
      if (err) { showError(err.msg); err.el.focus(); return; }
      const payload = { ...data, sort: Number(data.sort), variants: data.variants.map(v => ({ ...v, price: Number(v.price) })) };
      const btn = $('#f-save'); saving = true; btn.disabled = true; btn.textContent = '儲存中…'; showError('');
      try {
        const saved = await api.saveProduct(payload);
        d.close(); replaceProduct(saved);
        toast(`已儲存「${saved.name}」（${saved.id}）・${saved.variants.length} 個規格`);
      } catch (ex) {
        showError(ex.message || '儲存失敗');
      } finally { saving = false; btn.disabled = false; btn.textContent = '儲存商品'; }
    });
    d.showModal();
    if (!isEdit) $('#f-name').focus();
  }
  return { mount };
})();

/* ══════════ 六、主程式：登入畫面、導覽外框、頁面切換 ══════════ */
// 進入點：登入檢查、導覽外框、頁面切換

// ready: 已可使用；stage: 預計在第幾階段開放
const PAGES = [
  { id: 'dashboard', label: '總覽', stage: 4 },
  { id: 'orders', label: '訂單', stage: 2 },
  { id: 'new', label: '新增訂單', stage: 2 },
  { id: 'calendar', label: '行事曆', stage: 3 },
  { id: 'production', label: '製作', stage: 3 },
  { id: 'customers', label: '顧客', stage: 4 },
  { id: 'products', label: '商品', ready: true, load: async () => ({ mount }) },
  { id: 'reports', label: '報表', stage: 4 },
  { id: 'settings', label: '設定', stage: 4 }
];
const MOBILE_MAIN = ['dashboard', 'orders', 'new', 'products'];
const HOME = 'products';
const app = document.getElementById('app');
let userName = '';

const brandHtml = `<div class="brand-name">Vanilla<span>.</span></div><div class="brand-sub">香草籽甜點 POS</div>`;

function showLogin(message = '') {
  app.innerHTML = `<div class="login"><form class="login-card" id="login-form" novalidate>${brandHtml}
    <div class="login-fields">
      <div class="field"><label for="l-user">帳號</label>
        <input class="input" id="l-user" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="30" required></div>
      <div class="field"><label for="l-pass">密碼</label>
        <input class="input" id="l-pass" name="password" type="password" autocomplete="current-password" maxlength="100" required></div>
      <label class="check"><input type="checkbox" id="l-remember"> 在這台裝置保持登入</label>
      <div class="login-error" id="l-err" role="alert"${message ? '' : ' hidden'}>${esc(message)}</div>
      <button type="submit" class="btn btn-primary" id="l-btn">登入</button>
    </div></form></div>`;
  const form = document.getElementById('login-form'), err = document.getElementById('l-err'), btn = document.getElementById('l-btn');
  const fail = msg => { err.textContent = msg; err.hidden = false; };
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (btn.disabled) return;
    const username = form.username.value.trim(), password = form.password.value;
    if (!username || !password) return fail('請輸入帳號與密碼。');
    btn.disabled = true; btn.textContent = '登入中…'; err.hidden = true;
    try { await api.login(username, password, document.getElementById('l-remember').checked); start(); }
    catch (ex) { fail(ex.message || '登入失敗'); form.password.value = ''; form.password.focus(); btn.disabled = false; btn.textContent = '登入'; }
  });
  form.username.focus();
}

function shell() {
  const link = (p, cls) => `<a class="${cls}" href="#/${p.id}" data-page="${p.id}">${icon(p.id)}<span>${p.label}</span>${p.ready ? '' : '<span class="soon">未開放</span>'}</a>`;
  app.innerHTML = `
    ${isMock ? '<div class="banner">示範模式：目前顯示的是內建假資料，不會讀寫您的試算表。完成 config.js 設定後才會連到正式資料。</div>' : ''}
    <div class="shell">
      <aside class="side">
        <div class="brand">${brandHtml}</div>
        <nav class="side-nav" aria-label="主要導覽">${PAGES.map(p => link(p, 'nav-link')).join('')}</nav>
        <div class="side-user"><div class="email">${esc(userName)}</div>${isMock ? '' : '<button type="button" class="linklike" data-act="logout">登出</button>'}</div>
      </aside>
      <main class="main" id="view" tabindex="-1"></main>
      <nav class="bottom-nav" aria-label="主要導覽">
        ${MOBILE_MAIN.map(id => { const p = PAGES.find(x => x.id === id); return `<a href="#/${p.id}" data-page="${p.id}">${icon(p.id)}<span>${p.label}</span></a>`; }).join('')}
        <a href="#/more" data-page="more">${icon('more')}<span>更多</span></a>
      </nav>
    </div>`;
}

async function route() {
  const view = document.getElementById('view'); if (!view) return;
  const id = (location.hash.replace(/^#\/?/, '') || HOME).split('?')[0];
  const page = PAGES.find(p => p.id === id);
  document.querySelectorAll('[data-page]').forEach(a => {
    const on = a.dataset.page === id || (a.dataset.page === 'more' && page && !MOBILE_MAIN.includes(id) && a.closest('.bottom-nav'));
    a.classList.toggle('active', !!on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (id === 'more') {
    view.innerHTML = `<header class="page-head"><div><h1>更多</h1></div></header>
      <div class="more-list">${PAGES.filter(p => !MOBILE_MAIN.includes(p.id)).map(p => `<a href="#/${p.id}">${icon(p.id)}<span>${p.label}</span>${p.ready ? '' : '<span class="soon">未開放</span>'}</a>`).join('')}</div>
      <div class="more-user">${esc(userName)}${isMock ? '' : '　<button type="button" class="linklike" data-act="logout">登出</button>'}</div>`;
    return;
  }
  if (!page) { location.hash = '#/' + HOME; return; }
  if (!page.ready) {
    view.innerHTML = `<header class="page-head"><div><h1>${page.label}</h1></div></header>
      <div class="placeholder"><strong>這個頁面尚未開放</strong>預計在開發第 ${page.stage} 階段完成。目前可以使用的是「商品」頁面。</div>`;
    return;
  }
  view.innerHTML = `<div class="state"><div class="spinner"></div>載入中…</div>`;
  try { const mod = await page.load(); await mod.mount(view); }
  catch (e) { view.innerHTML = `<div class="state"><strong>頁面載入失敗</strong>${esc(e.message)}<br><button type="button" class="btn" onclick="location.reload()">重新整理</button></div>`; }
}

async function start() {
  if (!isMock) {
    if (!getSession()) return showLogin();
    app.innerHTML = `<p class="boot">登入確認中…</p>`;
    try { const me = await api.me(); userName = me.name || me.username; }
    catch (e) {
      if (e.code === 'AUTH') return;                       // 已由 vp:auth 事件切回登入畫面
      app.innerHTML = `<div class="login"><div class="login-card">${brandHtml}<div class="login-error">${esc(e.message)}</div><p><button type="button" class="btn" onclick="location.reload()">重新整理</button></p></div></div>`;
      return;
    }
  } else { userName = '示範模式'; }
  shell(); route();
}

window.addEventListener('hashchange', route);
window.addEventListener('vp:auth', () => showLogin('登入已過期，請重新登入。'));
app.addEventListener('click', async e => {
  const btn = e.target.closest('[data-act="logout"]'); if (!btn) return;
  btn.disabled = true; await api.logout(); showLogin();
});
start();
