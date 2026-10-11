// Vanilla POS — 全部前端程式（單一檔案）
// 目錄：一、共用小工具　二、登入狀態　三、API 與暫存　四、商品管理　五、訂單詳情與標籤列印
//       六、總覽／訂單／行事曆／製作／顧客／報表／設定　七、新增與修改訂單　八、主程式
// 唯一分開的檔案是 config.js（後端網址），方便您只改那一個值。
import { CONFIG } from './config.js';

/* ══════════ 一、共用小工具 ══════════ */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + Number(n || 0).toLocaleString('zh-TW');

/* 日期（一律以台北時間為準） */
const todayStr = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const weekday = s => new Date(s + 'T12:00:00Z').getUTCDay();
const fmtDay = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}（${WEEK[weekday(s)]}）` : (s || '');
const shortId = id => String(id || '').replace(/^VP-\d{4}/, '');
const uuid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

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
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;

/* 狀態標籤 */
const TAG_CLASS = { '待確認': 't-warn', '已確認': 't-info', '製作中': 't-sage', '待取貨': 't-sage', '已出貨': 't-sage', '已完成': 't-done', '已取消': 't-off', '未付款': 't-danger', '部分付款': 't-warn', '已付款': 't-ok', '已退款': 't-off', '冷凍': 'tag-frozen', '常溫': 'tag-ambient' };
const tag = s => s ? `<span class="tag ${TAG_CLASS[s] || 't-off'}">${esc(s)}</span>` : '';
const loadingHtml = (text = '讀取中…') => `<div class="state"><div class="spinner"></div>${esc(text)}</div>`;
const errorHtml = (title, message) => `<div class="state"><strong>${esc(title)}</strong>${esc(message)}<br><button type="button" class="btn" data-act="reload">重新整理</button></div>`;
const emptyHtml = (title, message = '') => `<div class="state"><strong>${esc(title)}</strong>${esc(message)}</div>`;

let toastBox;
function toast(message, type = 'success', ms = 3600) {
  if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; toastBox.setAttribute('role', 'status'); toastBox.setAttribute('aria-live', 'polite'); }
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = message;
  // 對話框開啟時位於最上層，訊息區要移進最上面那個對話框才不會被蓋住。
  const open = document.querySelectorAll('dialog[open]');
  (open.length ? open[open.length - 1] : document.body).append(toastBox);
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

/**
 * 表單視窗。fields: [{ name, label, type:'text'|'money'|'select'|'textarea'|'password', value, options, required, hint, placeholder }]
 * submit(values) 可為非同步；丟出錯誤時訊息顯示在視窗內、視窗不關閉。回傳 Promise<submit 的結果 | null（取消）>。
 */
function formDialog({ title, message = '', fields = [], okText = '確定', danger = false, submit }) {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.className = 'confirm formdlg';
    d.innerHTML = `<form novalidate><h2>${esc(title)}</h2>${message ? `<p>${esc(message)}</p>` : ''}<div class="fd-fields">${fields.map(f => {
      const id = 'fd-' + f.name, common = `id="${id}" name="${esc(f.name)}"`;
      const ctl = f.type === 'select' ? `<select ${common} class="select">${f.options.map(o => `<option${o === f.value ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`
        : f.type === 'textarea' ? `<textarea ${common} class="textarea" maxlength="500" placeholder="${esc(f.placeholder || '')}">${esc(f.value || '')}</textarea>`
        : `<input ${common} class="input" type="${f.type === 'password' ? 'password' : 'text'}"${f.type === 'money' ? ' inputmode="numeric"' : ''}${f.autocomplete ? ` autocomplete="${f.autocomplete}"` : ''} maxlength="100" value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder || '')}">`;
      return `<div class="field"><label for="${id}"${f.required ? ' class="req"' : ''}>${esc(f.label)}</label>${ctl}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}</div>`;
    }).join('')}</div><div class="form-error" role="alert" hidden></div>
      <div class="actions"><button type="button" class="btn" data-v="0">取消</button><button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(okText)}</button></div></form>`;
    let result = null, busy = false;
    const form = d.querySelector('form'), err = d.querySelector('.form-error'), ok = d.querySelector('[type="submit"]');
    d.addEventListener('input', e => { if (e.target.inputMode === 'numeric') e.target.value = e.target.value.replace(/[^\d]/g, ''); });
    d.addEventListener('click', e => { if (e.target.closest('[data-v="0"]') && !busy) d.close(); });
    d.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
    form.addEventListener('submit', async e => {
      e.preventDefault(); if (busy) return;
      const v = {};
      for (const f of fields) {
        const raw = form.elements[f.name].value; v[f.name] = f.type === 'password' ? raw : raw.trim();
        if (f.required && !v[f.name]) { err.textContent = `請填寫「${f.label}」。`; err.hidden = false; form.elements[f.name].focus(); return; }
      }
      busy = true; ok.disabled = true; const label = ok.textContent; ok.textContent = '處理中…'; err.hidden = true;
      try { const r = submit ? await submit(v) : v; result = r === undefined ? v : r; d.close(); }
      catch (ex) { err.textContent = ex.message || '發生錯誤'; err.hidden = false; }
      finally { busy = false; ok.disabled = false; ok.textContent = label; }
    });
    d.addEventListener('close', () => { d.remove(); resolve(result); });
    document.body.append(d);
    d.showModal();
  });
}

/** 右側抽屜（手機為全螢幕）。回傳 { d, body, title }；按「關閉」或 Esc 關閉。 */
function openDrawer(title) {
  const d = document.createElement('dialog');
  d.className = 'drawer';
  d.innerHTML = `<div class="drawer-wrap"><div class="drawer-head"><h2></h2><button type="button" class="btn btn-ghost btn-sm" data-act="close">關閉</button></div><div class="drawer-body"></div></div>`;
  d.querySelector('h2').textContent = title;
  d.addEventListener('click', e => { if (e.target.closest('[data-act="close"]')) d.close(); });
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
  return { d, body: d.querySelector('.drawer-body'), title: d.querySelector('h2') };
}
/** 通知目前頁面：資料有變動，需要重新讀取。 */
const notifyChanged = () => window.dispatchEvent(new Event('vp:changed'));

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

/* ══════════ 三、API 與暫存 ══════════ */
// 所有與後端的溝通都經過這裡：呼叫、逾時、錯誤處理、登入與帶上登入代碼。
// 規則：只讀取的動作遇到暫時性錯誤會自動重試一次；寫入類動作絕不自動重送（逾時後由使用者確認）。
const TIMEOUT_MS = 45000;
const READ_ONLY = new Set(['init', 'me', 'catalog', 'orders', 'order', 'production', 'labels', 'customers', 'customer', 'report', 'settings']);
const pause = ms => new Promise(r => setTimeout(r, ms));

class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

async function call(action, args = {}) {
  if (!CONFIG.API_URL) throw new ApiError('CONFIG', 'config.js 尚未填入後端網址（API_URL）。');
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
    if (e.name === 'AbortError') throw new ApiError('TIMEOUT', '連線逾時。若剛才是在儲存，請先到列表確認資料是否已寫入；確認沒有再按一次（同一張單重按不會重複建立）。');
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

/* 商品資料：後端為中文欄位，轉成前端用的英文欄位 */
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
  async logout() { try { if (getSession()) await call('logout'); } catch { /* 後端登出失敗時仍清除本機狀態 */ } finally { clearSession(); } },
  changePassword: (oldPassword, newPassword) => call('changePassword', { oldPassword, newPassword }),
  init: () => call('init'),
  // 商品
  async catalog() { const d = await call('catalog'); return { products: (d.products || []).map(toProduct), shippingRules: d.shippingRules || [], temps: d.temps || [] }; },
  saveProduct: async product => toProduct(await call('saveProduct', product)),
  setProductStatus: async (id, status) => toProduct(await call('setProductStatus', { id, status })),
  // 訂單
  orders: () => call('orders'),
  order: id => call('order', { id }),
  createOrder: payload => call('createOrder', payload),
  editOrder: (id, changes, reason) => call('editOrder', { id, changes, reason }),
  setStatus: (id, status, reason) => call('setStatus', { id, status, reason }),
  recordPayment: payload => call('recordPayment', payload),
  // 製作與標籤
  production: (date, basis) => call('production', { date, basis }),
  labels: orderIds => call('labels', { orderIds }),
  recordPrints: (items, status) => call('recordPrints', { items, status }),
  // 顧客
  customers: () => call('customers'),
  customer: id => call('customer', { id }),
  saveCustomer: customer => call('saveCustomer', customer),
  // 報表與設定
  report: (from, to) => call('report', { from, to }),
  settings: () => call('settings'),
  saveSettings: values => call('saveSettings', { values })
};

/**
 * 前端暫存：商品、訂單、顧客各讀一次後留在記憶體，切換頁面不必每次重新等後端。
 * 寫入後呼叫 drop() 讓下次讀取重新向後端要；超過 3 分鐘的資料也會自動重讀。
 */
const Store = {
  init: null,
  _cache: {},
  _loaders: { catalog: () => api.catalog(), orders: () => api.orders(), customers: () => api.customers() },
  load(key, force = false) {
    const hit = this._cache[key];
    if (!force && hit && Date.now() - hit.at < 180000) return hit.promise;
    const entry = { at: Date.now(), promise: this._loaders[key]() };
    entry.promise.catch(() => { if (this._cache[key] === entry) delete this._cache[key]; });
    this._cache[key] = entry;
    return entry.promise;
  },
  set(key, value) { this._cache[key] = { at: Date.now(), promise: Promise.resolve(value) }; },
  drop(...keys) { keys.forEach(k => delete this._cache[k]); },
  clear() { this._cache = {}; this.init = null; }
};

/* ══════════ 四、商品管理 ══════════ */
const mountProducts = (() => {
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
      const d = await Store.load('catalog', true);
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
    list.innerHTML = `<table class="table cards">
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
    Store.set('catalog', { products: state.products, shippingRules: state.shippingRules, temps: [] });
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
  return mount;
})();

/* ══════════ 五、訂單詳情與標籤列印 ══════════ */
/* ── 標籤列印 ──
 * 透過瀏覽器的列印視窗列印（無法直接操作印表機）。紀錄分兩種：
 *   已送出列印＝已開啟列印視窗；列印成功＝列印後由使用者確認已正常出紙。
 */
function labelHtml(l, brand) {
  const when = `${fmtDay(l.date)}${l.time ? ' ' + l.time : ''}`;
  const body = l.items
    ? `<div class="lb-list">${l.items.map(i => `<div><span>${esc(i.product)}${i.variant ? ' ' + esc(i.variant) : ''}</span><b>×${esc(i.quantity)}</b></div>${i.note ? `<div class="lb-inote">${esc(i.note)}</div>` : ''}`).join('')}</div>`
    : `<div class="lb-product">${esc(l.product)}</div><div class="lb-variant">${esc(l.variant)}</div>`;
  return `<div class="label">
    <div class="lb-top"><span class="lb-brand">${esc(brand)}</span><span class="lb-id">${esc(shortId(l.orderId))}</span></div>
    <div class="lb-name">${esc(l.name)}</div>
    ${body}
    <div class="lb-bottom">
      <div class="lb-row"><span>${esc(l.delivery)}</span><b>${esc(when)}</b></div>
      ${l.note ? `<div class="lb-note">${esc(l.note)}</div>` : ''}
    </div>
  </div>`;
}

async function printLabels(orderIds) {
  if (!orderIds.length) { toast('沒有可列印的訂單', 'info'); return false; }
  const d = document.createElement('dialog');
  d.className = 'confirm print-dlg';
  d.innerHTML = `<h2>列印製作標籤</h2><div class="print-body">${loadingHtml('準備標籤中…')}</div>
    <div class="actions"><button type="button" class="btn" data-v="0">關閉</button><button type="button" class="btn btn-primary" data-v="1" disabled>列印</button></div>`;
  document.body.append(d); d.showModal();
  const body = d.querySelector('.print-body'), go = d.querySelector('[data-v="1"]');
  let data = null, printedAny = false;
  d.addEventListener('close', () => d.remove());
  d.querySelector('[data-v="0"]').addEventListener('click', () => d.close());
  try {
    data = await api.labels(orderIds);
    if (!data.labels.length) { body.innerHTML = emptyHtml('沒有標籤', '這些訂單沒有商品明細。'); }
    else {
      body.innerHTML = `<p class="muted small">共 ${data.labels.length} 張，尺寸 ${esc(data.width)} × ${esc(data.height)} mm。按「列印」後會開啟瀏覽器的列印視窗，請選擇標籤印表機，紙張選 ${esc(data.width)}×${esc(data.height)}mm、邊界選「無」。</p>
        <div class="label-preview" style="--lw:${Number(data.width)}mm;--lh:${Number(data.height)}mm">${data.labels.map(l => labelHtml(l, data.brand)).join('')}</div>`;
      go.disabled = false; go.textContent = `列印 ${data.labels.length} 張`;
    }
  } catch (e) { body.innerHTML = emptyHtml('標籤讀取失敗', e.message); }
  go.addEventListener('click', async () => {
    if (!data) return;
    let root = document.getElementById('print-root');
    if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.append(root); }
    root.style.setProperty('--lw', Number(data.width) + 'mm'); root.style.setProperty('--lh', Number(data.height) + 'mm');
    root.innerHTML = data.labels.map(l => labelHtml(l, data.brand)).join('');
    let page = document.getElementById('print-page-size');
    if (!page) { page = document.createElement('style'); page.id = 'print-page-size'; document.head.append(page); }
    page.textContent = `@page { size: ${Number(data.width)}mm ${Number(data.height)}mm; margin: 0; }`;
    go.disabled = true;
    window.print();                                  // 列印視窗關閉後才會往下執行（部分手機瀏覽器會立即往下）
    const items = data.labels.map(l => ({ orderId: l.orderId, detailId: l.detailId, unit: l.unit }));
    try { await api.recordPrints(items, '已送出列印'); printedAny = true; } catch (e) { toast('列印紀錄寫入失敗：' + e.message, 'error'); }
    go.disabled = false;
    const ok = await confirmDialog({ title: '標籤有正常印出來嗎？', message: '確認全部都有印出來，系統才會記錄為「列印成功」。\n若取消列印、卡紙或不確定，請選「沒有」，之後可以重新列印。', okText: '有，全部印出', cancelText: '沒有／不確定' });
    if (ok) { try { await api.recordPrints(items, '列印成功'); toast('已記錄列印成功'); d.close(); } catch (e) { toast('列印紀錄寫入失敗：' + e.message, 'error'); } }
    Store.drop('orders'); notifyChanged();
  });
  return new Promise(resolve => d.addEventListener('close', () => resolve(printedAny)));
}

/* ── 訂單詳情抽屜 ── */
async function openOrder(id) {
  const { d, body, title } = openDrawer('訂單 ' + shortId(id));
  let data = null, changed = false;
  d.addEventListener('close', () => { if (changed) notifyChanged(); });
  const apply = detail => { data = detail; changed = true; Store.drop('orders', 'customers'); render(); };
  const init = Store.init || {};

  async function load() {
    body.innerHTML = loadingHtml('讀取訂單中…');
    try { data = await api.order(id); render(); }
    catch (e) { body.innerHTML = errorHtml('訂單讀取失敗', e.message); }
  }

  function render() {
    const o = data.order, pickup = o.delivery === '工作室自取', unpaid = Math.max(o.total - o.paid, 0), cancelled = o.status === '已取消';
    title.textContent = '訂單 ' + shortId(o.id);
    const row = (k, v) => v ? `<div class="kv"><span>${esc(k)}</span><b>${v}</b></div>` : '';
    body.innerHTML = `
      <div class="od-top"><div class="od-tags">${tag(o.status)}${tag(o.payStatus)}${tag(o.temp)}</div>
        <div class="muted small num">${esc(o.id)}・建立 ${esc(o.createdAt)}${o.createdBy ? '・' + esc(o.createdBy) : ''}</div></div>
      <div class="od-actions">
        ${cancelled ? '' : `<button type="button" class="btn btn-sm" data-act="status">修改狀態</button>
        ${unpaid > 0 ? `<button type="button" class="btn btn-sm btn-primary" data-act="pay">登記收款</button>` : ''}`}
        ${o.paid > 0 ? `<button type="button" class="btn btn-sm" data-act="refund">登記退款</button>` : ''}
        ${cancelled ? '' : `<button type="button" class="btn btn-sm" data-act="print">列印標籤${o.labels ? `（${o.printed}/${o.labels}）` : ''}</button>
        <button type="button" class="btn btn-sm" data-act="edit">修改訂單</button>
        <button type="button" class="btn btn-sm btn-ghost danger-text" data-act="cancel">取消訂單</button>`}
      </div>
      ${cancelled && o.paid > 0 ? `<div class="notice warn">這筆訂單已取消，但仍有已收款 ${money(o.paid)} 尚未退款。</div>` : ''}
      <section class="od-sec"><h3>顧客</h3>${row('姓名', esc(o.name))}${row('電話', `<a href="tel:${esc(o.phone)}">${esc(o.phone)}</a>`)}</section>
      <section class="od-sec"><h3>交付</h3>${row('方式', esc(o.delivery))}${row(pickup ? '取貨時間' : '出貨日期', esc(fmtDay(o.date)) + (o.time ? ' ' + esc(o.time) : ''))}
        ${row('製作日期', o.productionDate ? esc(fmtDay(o.productionDate)) : '')}
        ${pickup ? '' : row('收件人', esc(o.recipient)) + row('收件電話', esc(o.recipientPhone)) + row(o.delivery === '常溫超商店到店' ? '門市' : '地址', esc(o.address))}</section>
      <section class="od-sec"><h3>商品</h3>
        ${data.items.map(i => `<div class="line"><div><div>${esc(i.name)} <span class="muted">${esc(i.variant)}</span> <b class="num">×${i.quantity}</b></div>${i.note ? `<div class="line-note">${esc(i.note)}</div>` : ''}</div><div class="num muted">單價 ${money(i.price)}</div><div class="num line-sum">${money(i.subtotal)}</div></div>`).join('') || '<p class="muted small">沒有商品明細</p>'}
        ${data.addons.length ? `<h3 class="sub-h">加購</h3>` + data.addons.map(a => `<div class="line"><div>${esc(a.name)} <b class="num">×${a.quantity}</b></div><div class="num muted">單價 ${money(a.price)}</div><div class="num line-sum">${money(a.subtotal)}</div></div>`).join('') : ''}</section>
      <section class="od-sec"><h3>金額</h3>
        ${row('商品小計', money(o.subtotal))}${o.addonTotal ? row('加購小計', money(o.addonTotal)) : ''}${o.shipping ? row('運費', money(o.shipping)) : ''}${o.discount ? row('折扣', '−' + money(o.discount)) : ''}
        <div class="kv total"><span>應收總額</span><b>${money(o.total)}</b></div>${row('已收金額', money(o.paid))}
        <div class="kv${unpaid ? ' due' : ''}"><span>未收金額</span><b>${money(unpaid)}</b></div></section>
      <section class="od-sec"><h3>付款紀錄</h3>${data.payments.length ? data.payments.map(p => `<div class="line"><div>${esc(p.type)}・${esc(p.method)}${p.note ? `<div class="line-note">${esc(p.note)}</div>` : ''}<div class="muted small">${esc(p.at)}${p.operator ? '・' + esc(p.operator) : ''}</div></div><div></div><div class="num line-sum">${p.type === '退款' ? '−' : ''}${money(p.amount)}</div></div>`).join('') : '<p class="muted small">尚無付款紀錄</p>'}</section>
      ${o.note ? `<section class="od-sec"><h3>訂單備註</h3><p class="pre">${esc(o.note)}</p></section>` : ''}
      <details class="adv"><summary>訂單異動紀錄（${data.history.length}）</summary><div class="adv-body logs">${data.history.map(h => `<div><b>${esc(h.type)}</b> <span class="muted small">${esc(h.at)}・${esc(h.operator)}</span>${h.reason ? `<div class="small">原因：${esc(h.reason)}</div>` : ''}</div>`).join('') || '<span class="muted small">沒有紀錄</span>'}</div></details>
      <details class="adv"><summary>標籤列印紀錄（${data.prints.length}）</summary><div class="adv-body logs">${data.prints.map(p => `<div>${esc(p.status)} <span class="muted small">${esc(p.at)}・${esc(p.operator)}</span></div>`).join('') || '<span class="muted small">尚未列印</span>'}</div></details>`;
  }

  body.addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]'); if (!btn || !data && btn.dataset.act !== 'reload') return;
    const act = btn.dataset.act;
    if (act === 'reload') return load();
    const o = data.order, pickup = o.delivery === '工作室自取', unpaid = Math.max(o.total - o.paid, 0), methods = init.methods || ['現金'];
    if (act === 'edit') { d.close(); location.hash = '#/new?edit=' + encodeURIComponent(o.id); return; }
    if (act === 'print') { await printLabels([o.id]); try { data = await api.order(id); changed = true; render(); } catch { /* 保留原畫面 */ } return; }
    if (act === 'status') {
      const options = (init.orderStatuses || []).filter(s => s !== o.status && s !== '已取消' && !(s === '待取貨' && !pickup) && !(s === '已出貨' && pickup));
      await formDialog({ title: '修改訂單狀態', message: `目前狀態：${o.status}`, okText: '更新狀態',
        fields: [{ name: 'status', label: '新狀態', type: 'select', options, value: options[Math.max(0, options.indexOf(nextStatus(o)))] }, { name: 'reason', label: '備註（選填）', type: 'text' }],
        submit: async v => { apply(await api.setStatus(o.id, v.status, v.reason)); toast('狀態已更新為「' + v.status + '」'); } });
    }
    if (act === 'pay' || act === 'refund') {
      const refund = act === 'refund', requestId = uuid();
      await formDialog({ title: refund ? '登記退款' : '登記收款', message: refund ? `已收 ${money(o.paid)}` : `應收 ${money(o.total)}・已收 ${money(o.paid)}・未收 ${money(unpaid)}`, okText: refund ? '登記退款' : '登記收款', danger: refund,
        fields: [{ name: 'amount', label: '金額', type: 'money', required: true, value: refund ? o.paid : unpaid }, { name: 'method', label: refund ? '退款方式' : '付款方式', type: 'select', options: methods, value: methods.includes(o.method) ? o.method : methods[0] }, { name: 'note', label: '備註（選填）', type: 'text', placeholder: '例如：帳號末五碼 12345' }],
        submit: async v => { apply(await api.recordPayment({ orderId: o.id, requestId, type: refund ? '退款' : '收款', method: v.method, amount: Number(v.amount), note: v.note })); toast(refund ? '已登記退款' : '已登記收款'); } });
    }
    if (act === 'cancel') {
      await formDialog({ title: '取消這筆訂單？', message: `${o.name}・${fmtDay(o.date)}・${o.summary}\n取消後無法恢復。` + (o.paid > 0 ? `\n此訂單已收 ${money(o.paid)}，取消後請記得登記退款。` : ''), okText: '取消訂單', danger: true,
        fields: [{ name: 'reason', label: '取消原因', type: 'text', required: true }],
        submit: async v => { apply(await api.setStatus(o.id, '已取消', v.reason)); toast('訂單已取消'); } });
    }
  });
  // 依目前狀態建議下一個狀態，讓「修改狀態」預設選到最可能要的那一個。
  function nextStatus(o) {
    const pickup = o.delivery === '工作室自取';
    return { '待確認': '已確認', '已確認': '製作中', '製作中': pickup ? '待取貨' : '已出貨', '待取貨': '已完成', '已出貨': '已完成' }[o.status] || '已完成';
  }
  await load();
}

/** 訂單列表用的一列（表格在手機會自動變成卡片）。columns 可指定要顯示哪些欄位。 */
function orderRowsHtml(orders) {
  return orders.map(o => {
    const unpaid = Math.max(o.total - o.paid, 0);
    return `<tr data-order="${esc(o.id)}" class="clickable${o.status === '已取消' ? ' is-off' : ''}" tabindex="0">
      <td class="main"><span class="p-name">${esc(o.name)}</span> <span class="muted small num">${esc(shortId(o.id))}</span></td>
      <td data-label="商品">${esc(o.summary || '—')}</td>
      <td data-label="交付"><span class="num">${esc(fmtDay(o.date))}${o.time ? ' ' + esc(o.time) : ''}</span><span class="muted small"> ${esc(o.delivery)}</span></td>
      <td data-label="付款">${tag(o.payStatus)}${unpaid && o.status !== '已取消' ? ` <span class="small num muted">未收 ${money(unpaid)}</span>` : ''}</td>
      <td data-label="狀態">${tag(o.status)}</td>
      <td data-label="應收" class="num r">${money(o.total)}</td></tr>`;
  }).join('');
}
const ORDER_THEAD = `<thead><tr><th><span>顧客／編號</span></th><th><span>商品</span></th><th><span>交付</span></th><th><span>付款</span></th><th><span>狀態</span></th><th class="r"><span>應收</span></th></tr></thead>`;
const orderTableHtml = orders => `<table class="table stack">${ORDER_THEAD}<tbody>${orderRowsHtml(orders)}</tbody></table>`;
/** 讓容器內的訂單列可以點擊（或按 Enter）開啟訂單詳情。 */
function bindOrderRows(container) {
  const open = e => { const tr = e.target.closest('[data-order]'); if (tr && !e.target.closest('a,button')) openOrder(tr.dataset.order); };
  container.addEventListener('click', open);
  container.addEventListener('keydown', e => { if (e.key === 'Enter') open(e); });
}

/* ══════════ 六、各頁面 ══════════ */
const headHtml = (title, sub = '', actions = '') => `<header class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div class="head-actions">${actions}</div></header>`;
const refreshBtn = `<button type="button" class="btn btn-sm" data-act="refresh" title="重新讀取最新資料">${icon('refresh')}<span>更新</span></button>`;
const isPickup = o => o.delivery === '工作室自取';
const active = o => o.status !== '已取消';
/** 讀取資料並顯示；失敗時顯示錯誤與重新整理按鈕。回傳資料或 null。 */
async function guard(box, loader, label) {
  box.innerHTML = loadingHtml(label);
  try { return await loader(); }
  catch (e) { box.innerHTML = errorHtml('讀取失敗', e.message); return null; }
}

/* ══════ 總覽 ══════ */
async function mountDashboard(view, params, force) {
  view.innerHTML = headHtml('總覽', esc(fmtDay(todayStr())), refreshBtn + `<a class="btn btn-primary" href="#/new">＋ 新增訂單</a>`) + `<div id="dash"></div>`;
  const box = view.querySelector('#dash');
  view.querySelector('.page-head').addEventListener('click', e => { if (e.target.closest('[data-act="refresh"]')) mountDashboard(view, params, true); });
  box.addEventListener('click', e => { if (e.target.closest('[data-act="reload"]')) mountDashboard(view, params, true); });
  const orders = await guard(box, () => Store.load('orders', force), '讀取訂單中…'); if (!orders) return;
  const today = todayStr(), live = orders.filter(active), todays = live.filter(o => o.date === today).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  const week = addDays(today, 7), soon = o => o.date <= week;
  const pending = [
    ['待確認訂單', live.filter(o => o.status === '待確認')],
    ['尚未付清', live.filter(o => ['未付款', '部分付款'].includes(o.payStatus))],
    ['尚未完成製作（七日內）', live.filter(o => ['已確認', '製作中'].includes(o.status) && soon(o))],
    ['尚未列印標籤（七日內）', live.filter(o => ['已確認', '製作中', '待取貨'].includes(o.status) && o.printed < o.labels && soon(o))]
  ].map(([t, list]) => [t, list.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))]);
  const tile = (label, value, sub = '') => `<div class="tile"><div class="tile-label">${esc(label)}</div><div class="tile-value num">${value}</div>${sub ? `<div class="tile-sub">${sub}</div>` : ''}</div>`;
  const dueToday = todays.reduce((n, o) => n + o.total, 0), unpaidToday = todays.reduce((n, o) => n + Math.max(o.total - o.paid, 0), 0);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i + 1)).map(d => { const l = live.filter(o => o.date === d); return { d, n: l.length, qty: l.reduce((n, o) => n + o.qty, 0), pick: l.filter(isPickup).length, ship: l.filter(o => !isPickup(o)).length }; });
  box.innerHTML = `
    <div class="tiles">
      ${tile('今日訂單', todays.length)}${tile('今日取貨', todays.filter(isPickup).length)}${tile('今日出貨', todays.filter(o => !isPickup(o)).length)}
      ${tile('待確認訂單', pending[0][1].length)}${tile('待付款訂單', pending[1][1].length)}${tile('今日應收金額', money(dueToday), unpaidToday ? `其中未收 ${money(unpaidToday)}` : '已全數收款')}
    </div>
    <h2 class="sec-h">今日訂單</h2>
    <div class="table-wrap" id="dash-today">${todays.length ? orderTableHtml(todays) : emptyHtml('今天沒有要交付的訂單')}</div>
    <h2 class="sec-h">待處理事項</h2>
    <div class="cards-2" id="dash-pending">${pending.map(([t, list]) => `<div class="card"><div class="card-h"><b>${esc(t)}</b><span class="count${list.length ? ' on' : ''}">${list.length}</span></div>
      ${list.slice(0, 5).map(o => `<button type="button" class="mini-row" data-order="${esc(o.id)}"><span>${esc(o.name)}<span class="muted small"> ${esc(o.summary)}</span></span><span class="num small">${esc(fmtDay(o.date))}</span></button>`).join('') || '<p class="muted small">沒有待處理的訂單</p>'}
      ${list.length > 5 ? `<p class="muted small">…還有 ${list.length - 5} 筆，請到「訂單」頁查看</p>` : ''}</div>`).join('')}</div>
    <h2 class="sec-h">未來七日</h2>
    <div class="table-wrap"><table class="table stack"><thead><tr><th><span>日期</span></th><th class="r"><span>訂單數</span></th><th class="r"><span>商品數量</span></th><th class="r"><span>自取</span></th><th class="r"><span>寄送</span></th></tr></thead>
      <tbody>${days.map(x => `<tr class="${x.n ? '' : 'is-off'}"><td class="main num">${esc(fmtDay(x.d))}</td><td data-label="訂單數" class="num r">${x.n}</td><td data-label="商品數量" class="num r">${x.qty}</td><td data-label="自取" class="num r">${x.pick}</td><td data-label="寄送" class="num r">${x.ship}</td></tr>`).join('')}</tbody></table></div>`;
  bindOrderRows(box);
}

/* ══════ 訂單管理 ══════ */
const ordersState = { tab: 'upcoming', q: '', status: '', pay: '', delivery: '', from: '', to: '', limit: 200 };
async function mountOrders(view, params, force) {
  const st = ordersState, init = Store.init || {};
  const opt = (list, cur, all) => `<option value="">${all}</option>` + list.map(x => `<option${x === cur ? ' selected' : ''}>${esc(x)}</option>`).join('');
  view.innerHTML = headHtml('訂單管理', '<span id="o-sub">&nbsp;</span>', refreshBtn + `<a class="btn btn-primary" href="#/new">＋ 新增訂單</a>`) + `
    <div class="seg tabs" id="o-tabs">${[['upcoming', '今日與未來'], ['today', '今日'], ['past', '歷史'], ['all', '全部']].map(([k, l]) => `<button type="button" data-tab="${k}" aria-pressed="${st.tab === k}">${l}</button>`).join('')}</div>
    <div class="toolbar">
      <input class="input search" id="o-q" type="search" placeholder="搜尋姓名、電話、訂單編號" aria-label="搜尋訂單" value="${esc(st.q)}">
      <select class="select" id="o-status" aria-label="訂單狀態">${opt(init.orderStatuses || [], st.status, '全部狀態')}</select>
      <select class="select" id="o-pay" aria-label="付款狀態">${opt(init.paymentStatuses || [], st.pay, '全部付款')}</select>
      <select class="select" id="o-deliv" aria-label="交付方式">${opt(init.deliveries || [], st.delivery, '全部交付方式')}</select>
      <label class="range">交付日 <input class="input" type="date" id="o-from" value="${esc(st.from)}" aria-label="起始日"> – <input class="input" type="date" id="o-to" value="${esc(st.to)}" aria-label="結束日"></label>
    </div>
    <div class="table-wrap" id="o-list"></div>`;
  const box = view.querySelector('#o-list');
  bindOrderRows(box);
  let orders = null;
  const digits = s => String(s).replace(/\D/g, '').replace(/^886/, '').replace(/^0+/, '');
  function render() {
    if (!orders) return;
    const today = todayStr(), q = st.q.toLowerCase(), qd = digits(st.q);
    let rows = orders.filter(o => (st.tab === 'all' || (st.tab === 'today' && o.date === today) || (st.tab === 'upcoming' && o.date >= today) || (st.tab === 'past' && o.date < today))
      && (!st.status || o.status === st.status) && (!st.pay || o.payStatus === st.pay) && (!st.delivery || o.delivery === st.delivery)
      && (!st.from || o.date >= st.from) && (!st.to || o.date <= st.to)
      && (!q || o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || o.phone.includes(q) || (qd.length >= 3 && digits(o.phone).includes(qd))));
    const key = o => o.date + ' ' + (o.time || '99:99');
    rows.sort((a, b) => (st.tab === 'past' || st.tab === 'all') ? key(b).localeCompare(key(a)) : key(a).localeCompare(key(b)));
    view.querySelector('#o-sub').textContent = `符合 ${rows.length} 筆・全部 ${orders.length} 筆`;
    if (!orders.length) { box.innerHTML = emptyHtml('還沒有訂單', '按右上角「＋ 新增訂單」建立第一筆。'); return; }
    if (!rows.length) { box.innerHTML = `<div class="state"><strong>找不到符合的訂單</strong>請調整搜尋或篩選條件。<br><button type="button" class="btn" data-act="clear">清除篩選</button></div>`; return; }
    box.innerHTML = orderTableHtml(rows.slice(0, st.limit)) + (rows.length > st.limit ? `<div class="state"><button type="button" class="btn" data-act="more">再顯示 200 筆（還有 ${rows.length - st.limit} 筆）</button></div>` : '');
  }
  view.addEventListener('input', onInput); view.addEventListener('change', onInput); view.addEventListener('click', onClick);
  function onInput(e) {
    if (!view.contains(box)) return off();
    const m = { 'o-q': 'q', 'o-status': 'status', 'o-pay': 'pay', 'o-deliv': 'delivery', 'o-from': 'from', 'o-to': 'to' }[e.target.id]; if (!m) return;
    st[m] = e.target.value.trim(); st.limit = 200; render();
  }
  function onClick(e) {
    if (!view.contains(box)) return off();
    const tab = e.target.closest('[data-tab]');
    if (tab) { st.tab = tab.dataset.tab; st.limit = 200; view.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-pressed', b === tab)); render(); return; }
    const act = e.target.closest('[data-act]'); if (!act) return;
    if (act.dataset.act === 'refresh' || act.dataset.act === 'reload') { off(); mountOrders(view, params, true); }
    if (act.dataset.act === 'more') { st.limit += 200; render(); }
    if (act.dataset.act === 'clear') { Object.assign(st, { q: '', status: '', pay: '', delivery: '', from: '', to: '', tab: 'all' }); off(); mountOrders(view, params); }
  }
  function off() { view.removeEventListener('input', onInput); view.removeEventListener('change', onInput); view.removeEventListener('click', onClick); }
  orders = await guard(box, () => Store.load('orders', force), '讀取訂單中…');
  render();
  return off;
}

/* ══════ 行事曆 ══════ */
const calState = { view: 'month', basis: 'delivery', cursor: '', selected: '' };
async function mountCalendar(view, params, force) {
  const st = calState, today = todayStr();
  if (!st.cursor) st.cursor = today; if (!st.selected) st.selected = today;
  view.innerHTML = headHtml('訂單行事曆', '', refreshBtn) + `
    <div class="toolbar">
      <div class="seg" id="c-view">${[['month', '月'], ['week', '週'], ['list', '每日列表']].map(([k, l]) => `<button type="button" data-cview="${k}" aria-pressed="${st.view === k}">${l}</button>`).join('')}</div>
      <div class="seg" id="c-basis">${[['delivery', '依交付日'], ['production', '依製作日']].map(([k, l]) => `<button type="button" data-cbasis="${k}" aria-pressed="${st.basis === k}">${l}</button>`).join('')}</div>
      <div class="cal-nav"><button type="button" class="btn btn-sm" data-cnav="-1" aria-label="上一頁">‹</button><button type="button" class="btn btn-sm" data-cnav="0">今天</button><button type="button" class="btn btn-sm" data-cnav="1" aria-label="下一頁">›</button><b id="c-title" class="num"></b></div>
    </div>
    <p class="muted small" id="c-hint"></p>
    <div id="c-body"></div><div id="c-day"></div>`;
  const body = view.querySelector('#c-body'), dayBox = view.querySelector('#c-day');
  bindOrderRows(dayBox); bindOrderRows(body);
  let orders = null;
  const keyOf = o => st.basis === 'production' ? (o.productionDate || o.date) : o.date;
  const stat = l => ({ n: l.length, qty: l.reduce((n, o) => n + o.qty, 0), pick: l.filter(isPickup).length, ship: l.filter(o => !isPickup(o)).length });
  function render() {
    if (!orders) return;
    const by = {}; orders.filter(active).forEach(o => { (by[keyOf(o)] = by[keyOf(o)] || []).push(o); });
    view.querySelector('#c-hint').textContent = st.basis === 'production' ? '依製作日：沒有填製作日期的訂單，會算在交付日當天。' : '依交付日：自取為取貨日、寄送為出貨日。不含已取消訂單。';
    const cell = d => { const s = stat(by[d] || []); return { d, ...s }; };
    if (st.view === 'month') {
      const first = st.cursor.slice(0, 8) + '01', start = addDays(first, -weekday(first)), month = st.cursor.slice(0, 7);
      view.querySelector('#c-title').textContent = `${Number(month.slice(0, 4))} 年 ${Number(month.slice(5, 7))} 月`;
      const cells = Array.from({ length: 42 }, (_, i) => cell(addDays(start, i))), weeks = cells.slice(35).some(c => c.d.startsWith(month)) ? 6 : 5;
      body.innerHTML = `<div class="cal"><div class="cal-head">${WEEK.map(w => `<span>${w}</span>`).join('')}</div><div class="cal-grid">${cells.slice(0, weeks * 7).map(c => `<button type="button" class="cal-cell${c.d.startsWith(month) ? '' : ' out'}${c.d === today ? ' today' : ''}${c.d === st.selected ? ' sel' : ''}" data-day="${c.d}" aria-label="${esc(fmtDay(c.d))} ${c.n} 筆訂單">
        <span class="cal-d num">${Number(c.d.slice(8))}</span>${c.n ? `<span class="cal-n"><b>${c.n}</b> 單<i>・${c.qty} 件</i></span><span class="cal-s">取 ${c.pick}／寄 ${c.ship}</span>` : ''}</button>`).join('')}</div></div>`;
    } else if (st.view === 'week') {
      const start = addDays(st.cursor, -weekday(st.cursor));
      view.querySelector('#c-title').textContent = `${fmtDay(start)} – ${fmtDay(addDays(start, 6))}`;
      body.innerHTML = `<div class="table-wrap"><table class="table stack"><thead><tr><th><span>日期</span></th><th class="r"><span>訂單數</span></th><th class="r"><span>商品數量</span></th><th class="r"><span>自取</span></th><th class="r"><span>寄送</span></th></tr></thead><tbody>${Array.from({ length: 7 }, (_, i) => cell(addDays(start, i))).map(c => `<tr class="clickable${c.d === st.selected ? ' sel' : ''}${c.n ? '' : ' is-off'}" data-day="${c.d}" tabindex="0"><td class="main num">${esc(fmtDay(c.d))}${c.d === today ? ' <span class="tag t-info">今天</span>' : ''}</td><td data-label="訂單數" class="num r">${c.n}</td><td data-label="商品數量" class="num r">${c.qty}</td><td data-label="自取" class="num r">${c.pick}</td><td data-label="寄送" class="num r">${c.ship}</td></tr>`).join('')}</tbody></table></div>`;
    } else {
      view.querySelector('#c-title').textContent = `${fmtDay(st.cursor)} 起 30 天`;
      const days = Array.from({ length: 30 }, (_, i) => addDays(st.cursor, i)).filter(d => (by[d] || []).length);
      body.innerHTML = days.length ? days.map(d => { const s = stat(by[d]); return `<h2 class="sec-h num">${esc(fmtDay(d))} <span class="muted small">${s.n} 單・${s.qty} 件・取 ${s.pick}／寄 ${s.ship}</span></h2><div class="table-wrap">${orderTableHtml(by[d].slice().sort((a, b) => (a.time || '99').localeCompare(b.time || '99')))}</div>`; }).join('') : `<div class="table-wrap">${emptyHtml('這 30 天沒有訂單')}</div>`;
    }
    if (st.view === 'list') { dayBox.innerHTML = ''; return; }
    const list = (by[st.selected] || []).slice().sort((a, b) => (a.time || '99').localeCompare(b.time || '99')), s = stat(list);
    dayBox.innerHTML = `<h2 class="sec-h num">${esc(fmtDay(st.selected))} <span class="muted small">${s.n} 單・${s.qty} 件・取 ${s.pick}／寄 ${s.ship}</span></h2><div class="table-wrap">${list.length ? orderTableHtml(list) : emptyHtml('這一天沒有訂單')}</div>`;
  }
  view.addEventListener('click', onClick);
  function onClick(e) {
    if (!view.contains(body)) return view.removeEventListener('click', onClick);
    const t = e.target, v = t.closest('[data-cview]'), b = t.closest('[data-cbasis]'), n = t.closest('[data-cnav]'), day = t.closest('[data-day]');
    if (v) { st.view = v.dataset.cview; view.querySelectorAll('[data-cview]').forEach(x => x.setAttribute('aria-pressed', x === v)); render(); }
    else if (b) { st.basis = b.dataset.cbasis; view.querySelectorAll('[data-cbasis]').forEach(x => x.setAttribute('aria-pressed', x === b)); render(); }
    else if (n) {
      const dir = Number(n.dataset.cnav);
      if (!dir) { st.cursor = today; st.selected = today; }
      else if (st.view === 'month') { const y = Number(st.cursor.slice(0, 4)), m = Number(st.cursor.slice(5, 7)) - 1 + dir, dt = new Date(Date.UTC(y, m, 1, 12)); st.cursor = dt.toISOString().slice(0, 10); }
      else st.cursor = addDays(st.cursor, dir * (st.view === 'week' ? 7 : 30));
      render();
    }
    else if (day) { st.selected = day.dataset.day; render(); if (window.innerWidth <= 860) dayBox.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (t.closest('[data-act="refresh"],[data-act="reload"]')) { view.removeEventListener('click', onClick); mountCalendar(view, params, true); }
  }
  orders = await guard(body, () => Store.load('orders', force), '讀取訂單中…');
  render();
  return () => view.removeEventListener('click', onClick);
}

/* ══════ 製作管理 ══════ */
const prodState = { date: '', basis: 'delivery' };
async function mountProduction(view) {
  const st = prodState; if (!st.date) st.date = todayStr();
  view.innerHTML = headHtml('製作管理', '', refreshBtn) + `
    <div class="toolbar">
      <input class="input" type="date" id="pr-date" value="${esc(st.date)}" aria-label="日期" style="width:auto">
      <button type="button" class="btn btn-sm" data-pday="0">今天</button><button type="button" class="btn btn-sm" data-pday="1">明天</button>
      <div class="seg">${[['delivery', '依交付日'], ['production', '依製作日']].map(([k, l]) => `<button type="button" data-pbasis="${k}" aria-pressed="${st.basis === k}">${l}</button>`).join('')}</div>
    </div><div id="pr-body"></div>`;
  const box = view.querySelector('#pr-body'); bindOrderRows(box);
  let data = null, seq = 0;
  async function load() {
    const mine = ++seq; box.innerHTML = loadingHtml('統計製作數量中…');
    try { const d = await api.production(st.date, st.basis); if (mine !== seq) return; data = d; render(); }
    catch (e) { if (mine === seq) box.innerHTML = errorHtml('讀取失敗', e.message); }
  }
  function render() {
    const total = data.items.reduce((n, i) => n + i.quantity, 0), labels = data.orders.reduce((n, o) => n + o.labels, 0), printed = data.orders.reduce((n, o) => n + o.printed, 0);
    box.innerHTML = `
      <div class="tiles tiles-3"><div class="tile"><div class="tile-label">${esc(fmtDay(data.date))} 製作數量</div><div class="tile-value num">${total}</div></div>
        <div class="tile"><div class="tile-label">列入製作的訂單</div><div class="tile-value num">${data.orders.length}</div></div>
        <div class="tile"><div class="tile-label">標籤（已印／應印）</div><div class="tile-value num">${printed}／${labels}</div></div></div>
      <p class="muted small">列入條件：付款狀態為「${esc(data.payRule.join('、'))}」，且訂單狀態為已確認、製作中、待取貨或已出貨。${data.basis === 'production' ? '沒有填製作日期的訂單算在交付日。' : ''}</p>
      <div class="sec-row"><h2 class="sec-h">製作統計</h2>${data.orders.length ? `<button type="button" class="btn btn-primary btn-sm" data-act="print-all">列印當日全部標籤（${labels} 張）</button>` : ''}</div>
      <div class="table-wrap">${data.items.length ? `<table class="table stack"><thead><tr><th><span>商品</span></th><th><span>規格</span></th><th class="r"><span>數量</span></th></tr></thead><tbody>${data.items.map(i => `<tr><td class="main">${esc(i.product)}</td><td data-label="規格">${esc(i.variant)}</td><td data-label="數量" class="num r"><b>${i.quantity}</b></td></tr>`).join('')}</tbody></table>` : emptyHtml('這一天沒有要製作的商品')}</div>
      ${data.orders.length ? `<h2 class="sec-h">列入製作的訂單</h2><div class="table-wrap"><table class="table stack">${ORDER_THEAD.replace('<th class="r"><span>應收</span></th>', '<th><span>標籤</span></th><th></th>')}<tbody>${data.orders.map(o => `<tr data-order="${esc(o.id)}" class="clickable" tabindex="0"><td class="main"><span class="p-name">${esc(o.name)}</span> <span class="muted small num">${esc(shortId(o.id))}</span></td><td data-label="商品">${esc(o.summary)}</td><td data-label="交付"><span class="num">${esc(fmtDay(o.date))}${o.time ? ' ' + esc(o.time) : ''}</span><span class="muted small"> ${esc(o.delivery)}</span></td><td data-label="付款">${tag(o.payStatus)}</td><td data-label="狀態">${tag(o.status)}</td><td data-label="標籤" class="num">${o.printed}／${o.labels}</td><td class="col-actions"><button type="button" class="btn btn-ghost btn-sm" data-print="${esc(o.id)}">列印</button></td></tr>`).join('')}</tbody></table></div>` : ''}
      ${data.excluded.length ? `<h2 class="sec-h">當日未列入的訂單（${data.excluded.length}）</h2><div class="notice warn">以下訂單的日期相符，但不符合製作條件，沒有算進上面的數量。要列入請先到訂單內確認訂單或登記收款。</div>
        <div class="table-wrap"><table class="table stack"><thead><tr><th><span>顧客／編號</span></th><th><span>商品</span></th><th><span>未列入原因</span></th></tr></thead><tbody>${data.excluded.map(o => `<tr data-order="${esc(o.id)}" class="clickable is-off" tabindex="0"><td class="main"><span class="p-name">${esc(o.name)}</span> <span class="muted small num">${esc(shortId(o.id))}</span></td><td data-label="商品">${esc(o.summary)}</td><td data-label="原因">${esc(o.reason)}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
  }
  view.addEventListener('click', onClick); view.addEventListener('change', onChange);
  const off = () => { view.removeEventListener('click', onClick); view.removeEventListener('change', onChange); };
  function onChange(e) { if (!view.contains(box)) return off(); if (e.target.id === 'pr-date' && e.target.value) { st.date = e.target.value; load(); } }
  async function onClick(e) {
    if (!view.contains(box)) return off();
    const t = e.target, b = t.closest('[data-pbasis]'), day = t.closest('[data-pday]'), pr = t.closest('[data-print]');
    if (b) { st.basis = b.dataset.pbasis; view.querySelectorAll('[data-pbasis]').forEach(x => x.setAttribute('aria-pressed', x === b)); load(); }
    else if (day) { st.date = addDays(todayStr(), Number(day.dataset.pday)); view.querySelector('#pr-date').value = st.date; load(); }
    else if (pr) { e.stopPropagation(); await printLabels([pr.dataset.print]); }
    else if (t.closest('[data-act="print-all"]')) { await printLabels(data.orders.map(o => o.id)); }
    else if (t.closest('[data-act="refresh"],[data-act="reload"]')) load();
  }
  await load();
  return off;
}

/* ══════ 顧客管理 ══════ */
const custState = { q: '' };
async function mountCustomers(view, params, force) {
  view.innerHTML = headHtml('顧客管理', '<span id="cu-sub">&nbsp;</span>', refreshBtn) + `
    <div class="toolbar"><input class="input search" id="cu-q" type="search" placeholder="搜尋姓名或電話" aria-label="搜尋顧客" value="${esc(custState.q)}"></div>
    <div class="table-wrap" id="cu-list"></div>`;
  const box = view.querySelector('#cu-list'); let list = null;
  const digits = s => String(s).replace(/\D/g, '').replace(/^886/, '').replace(/^0+/, '');
  function render() {
    if (!list) return;
    const q = custState.q.toLowerCase(), qd = digits(custState.q);
    const rows = list.filter(c => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || (qd.length >= 3 && digits(c.phone).includes(qd)));
    view.querySelector('#cu-sub').textContent = `共 ${list.length} 位顧客`;
    if (!list.length) { box.innerHTML = emptyHtml('還沒有顧客資料', '建立訂單時會自動依電話建立顧客。'); return; }
    if (!rows.length) { box.innerHTML = emptyHtml('找不到符合的顧客'); return; }
    box.innerHTML = `<table class="table stack"><thead><tr><th><span>姓名</span></th><th><span>電話</span></th><th class="r"><span>訂單數</span></th><th class="r"><span>累積消費</span></th><th><span>最近交付日</span></th><th><span>備註</span></th></tr></thead><tbody>${rows.slice(0, 500).map(c => `<tr class="clickable" data-cust="${esc(c.id)}" tabindex="0"><td class="main"><span class="p-name">${esc(c.name)}</span></td><td data-label="電話" class="num">${esc(c.phone)}</td><td data-label="訂單數" class="num r">${c.orderCount}</td><td data-label="累積消費" class="num r">${money(c.spent)}</td><td data-label="最近交付日" class="num">${esc(c.lastDate ? fmtDay(c.lastDate) : '—')}</td><td data-label="備註">${esc(c.note || '')}</td></tr>`).join('')}</tbody></table>`;
  }
  const open = e => { const tr = e.target.closest('[data-cust]'); if (tr) openCustomer(tr.dataset.cust); };
  box.addEventListener('click', e => { if (e.target.closest('[data-act="reload"]')) mountCustomers(view, params, true); else open(e); });
  box.addEventListener('keydown', e => { if (e.key === 'Enter') open(e); });
  view.querySelector('#cu-q').addEventListener('input', e => { custState.q = e.target.value.trim(); render(); });
  view.querySelector('.page-head').addEventListener('click', e => { if (e.target.closest('[data-act="refresh"]')) mountCustomers(view, params, true); });
  list = await guard(box, () => Store.load('customers', force), '讀取顧客中…');
  render();
}
async function openCustomer(id) {
  const { d, body, title } = openDrawer('顧客');
  let changed = false; d.addEventListener('close', () => { if (changed) notifyChanged(); });
  bindOrderRows(body);
  async function load() {
    body.innerHTML = loadingHtml('讀取顧客中…');
    try { render(await api.customer(id)); } catch (e) { body.innerHTML = errorHtml('顧客讀取失敗', e.message); }
  }
  function render(data) {
    const c = data.customer; title.textContent = c.name || '顧客';
    body.innerHTML = `
      <div class="tiles tiles-3"><div class="tile"><div class="tile-label">訂單數</div><div class="tile-value num">${c.orderCount}</div></div><div class="tile"><div class="tile-label">累積消費</div><div class="tile-value num">${money(c.spent)}</div></div><div class="tile"><div class="tile-label">最近交付日</div><div class="tile-value num small-v">${esc(c.lastDate ? fmtDay(c.lastDate) : '—')}</div></div></div>
      <p class="muted small">累積消費＝未取消訂單的實際收款扣除退款，不含尚未收到的款項。</p>
      <form id="cu-form" class="stack-form" novalidate>
        <div class="grid-2"><div class="field"><label class="req" for="cu-name">姓名</label><input class="input" id="cu-name" maxlength="60" value="${esc(c.name)}"></div>
          <div class="field"><label class="req" for="cu-phone">電話</label><input class="input" id="cu-phone" inputmode="tel" maxlength="30" value="${esc(c.phone)}"></div></div>
        <div class="grid-2"><div class="field"><label for="cu-rec">常用收件人</label><input class="input" id="cu-rec" maxlength="60" value="${esc(c.recipient)}"></div>
          <div class="field"><label for="cu-addr">常用地址／門市</label><input class="input" id="cu-addr" maxlength="500" value="${esc(c.address)}"></div></div>
        <div class="field"><label for="cu-note">顧客備註</label><textarea class="textarea" id="cu-note" maxlength="500">${esc(c.note)}</textarea></div>
        <div class="form-error" id="cu-err" role="alert" hidden></div>
        <div><button type="submit" class="btn btn-primary" id="cu-save">儲存顧客資料</button></div>
      </form>
      <h2 class="sec-h">歷史訂單（${data.orders.length}）</h2>
      <div class="table-wrap">${data.orders.length ? orderTableHtml(data.orders) : emptyHtml('沒有訂單')}</div>`;
    body.querySelector('#cu-form').addEventListener('submit', async e => {
      e.preventDefault(); const btn = body.querySelector('#cu-save'), err = body.querySelector('#cu-err'); if (btn.disabled) return;
      const v = k => body.querySelector('#cu-' + k).value.trim();
      if (!v('name') || !v('phone')) { err.textContent = '姓名與電話不可空白。'; err.hidden = false; return; }
      btn.disabled = true; btn.textContent = '儲存中…'; err.hidden = true;
      try { const nd = await api.saveCustomer({ id, name: v('name'), phone: v('phone'), recipient: v('rec'), address: v('addr'), note: v('note') }); changed = true; Store.drop('customers'); toast('顧客資料已儲存'); render(nd); }
      catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = '儲存顧客資料'; }
    });
  }
  body.addEventListener('click', e => { if (e.target.closest('[data-act="reload"]')) load(); });
  await load();
}

/* ══════ 營業報表 ══════ */
const repState = { from: '', to: '', preset: 'month' };
async function mountReports(view) {
  const st = repState, today = todayStr();
  const preset = k => {
    const first = today.slice(0, 8) + '01';
    if (k === 'month') return [first, addDays(new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 1, 12)).toISOString().slice(0, 10), -1)];
    if (k === 'last') { const end = addDays(first, -1); return [end.slice(0, 8) + '01', end]; }
    if (k === '30') return [addDays(today, -29), today];
    return [st.from, st.to];
  };
  if (!st.from) [st.from, st.to] = preset('month');
  view.innerHTML = headHtml('營業報表') + `
    <div class="toolbar">
      <div class="seg">${[['month', '本月'], ['last', '上個月'], ['30', '近 30 天']].map(([k, l]) => `<button type="button" data-rp="${k}" aria-pressed="${st.preset === k}">${l}</button>`).join('')}</div>
      <label class="range"><input class="input" type="date" id="r-from" value="${esc(st.from)}" aria-label="起始日"> – <input class="input" type="date" id="r-to" value="${esc(st.to)}" aria-label="結束日"></label>
    </div><div id="r-body"></div>`;
  const box = view.querySelector('#r-body'); let seq = 0;
  async function load() {
    const mine = ++seq; box.innerHTML = loadingHtml('計算報表中…');
    try { const d = await api.report(st.from, st.to); if (mine === seq) render(d); }
    catch (e) { if (mine === seq) box.innerHTML = errorHtml('報表讀取失敗', e.message); }
  }
  function render(d) {
    const tile = (label, value, sub = '', cls = '') => `<div class="tile ${cls}"><div class="tile-label">${esc(label)}</div><div class="tile-value num">${value}</div>${sub ? `<div class="tile-sub">${esc(sub)}</div>` : ''}</div>`;
    const months = {}; d.daily.forEach(r => { const m = months[r.date.slice(0, 7)] = months[r.date.slice(0, 7)] || { date: r.date.slice(0, 7), orders: 0, orderTotal: 0, received: 0, refunded: 0 }; m.orders += r.orders; m.orderTotal += r.orderTotal; m.received += r.received; m.refunded += r.refunded; });
    const mList = Object.keys(months).sort().map(k => months[k]);
    const table = (rows, first, fmt) => `<div class="table-wrap"><table class="table stack"><thead><tr><th><span>${first}</span></th><th class="r"><span>訂單數</span></th><th class="r"><span>訂單應收</span></th><th class="r"><span>實際收款</span></th><th class="r"><span>實際退款</span></th><th class="r"><span>淨收款</span></th></tr></thead><tbody>${rows.map(r => `<tr><td class="main num">${esc(fmt(r.date))}</td><td data-label="訂單數" class="num r">${r.orders}</td><td data-label="訂單應收" class="num r">${money(r.orderTotal)}</td><td data-label="實際收款" class="num r">${money(r.received)}</td><td data-label="實際退款" class="num r">${r.refunded ? '−' + money(r.refunded) : money(0)}</td><td data-label="淨收款" class="num r"><b>${money(r.received - r.refunded)}</b></td></tr>`).join('')}</tbody></table></div>`;
    const top = (rows, withVariant) => rows.length ? `<div class="table-wrap"><table class="table stack"><thead><tr><th><span>${withVariant ? '商品／規格' : '商品'}</span></th><th class="r"><span>數量</span></th><th class="r"><span>金額</span></th></tr></thead><tbody>${rows.map((r, i) => `<tr><td class="main"><span class="rank num">${i + 1}</span>${esc(r.name)}${withVariant ? ` <span class="muted">${esc(r.variant)}</span>` : ''}</td><td data-label="數量" class="num r">${r.quantity}</td><td data-label="金額" class="num r">${money(r.amount)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="table-wrap">${emptyHtml('這段期間沒有銷售')}</div>`;
    const dn = d.byDelivery.reduce((n, x) => n + x.orders, 0) || 1;
    box.innerHTML = `
      <p class="muted small">訂單數與訂單應收依「交付日」計算，不含已取消訂單；實際收款與退款依「登記付款的日期」計算。兩者是不同的數字，未收到的款項不會算進收款。</p>
      <div class="tiles">${tile('訂單數', d.orderCount, d.cancelledCount ? `另有 ${d.cancelledCount} 筆已取消` : '')}${tile('訂單應收總額', money(d.orderTotal))}${tile('未收金額', money(d.unpaid), '這些訂單尚未收到的款項', d.unpaid ? 'warn' : '')}
        ${tile('實際收款', money(d.received))}${tile('實際退款', (d.refunded ? '−' : '') + money(d.refunded))}${tile('淨收款', money(d.net), '實際收款 − 實際退款', 'strong')}</div>
      ${mList.length > 1 ? `<h2 class="sec-h">每月</h2>` + table(mList, '月份', m => `${Number(m.slice(0, 4))} 年 ${Number(m.slice(5, 7))} 月`) : ''}
      <h2 class="sec-h">每日</h2>${d.daily.length ? table(d.daily, '日期', fmtDay) : `<div class="table-wrap">${emptyHtml('這段期間沒有訂單或收款')}</div>`}
      <div class="cards-2 plain"><div><h2 class="sec-h">熱銷商品</h2>${top(d.topProducts, false)}</div><div><h2 class="sec-h">熱銷規格</h2>${top(d.topVariants, true)}</div></div>
      <h2 class="sec-h">自取與寄送比例</h2>
      <div class="table-wrap pad">${d.byDelivery.length ? d.byDelivery.map(x => `<div class="ratio"><span>${esc(x.delivery)}</span><div class="bar"><i style="width:${Math.round(x.orders / dn * 100)}%"></i></div><b class="num">${x.orders} 筆・${Math.round(x.orders / dn * 100)}%</b></div>`).join('') : '<span class="muted small">沒有資料</span>'}</div>`;
  }
  view.addEventListener('click', onClick); view.addEventListener('change', onChange);
  const off = () => { view.removeEventListener('click', onClick); view.removeEventListener('change', onChange); };
  function onClick(e) {
    if (!view.contains(box)) return off();
    const p = e.target.closest('[data-rp]');
    if (p) { st.preset = p.dataset.rp; [st.from, st.to] = preset(st.preset); view.querySelector('#r-from').value = st.from; view.querySelector('#r-to').value = st.to; view.querySelectorAll('[data-rp]').forEach(x => x.setAttribute('aria-pressed', x === p)); load(); }
    else if (e.target.closest('[data-act="reload"]')) load();
  }
  function onChange(e) {
    if (!view.contains(box)) return off();
    if (e.target.id !== 'r-from' && e.target.id !== 'r-to') return;
    const f = view.querySelector('#r-from').value, t = view.querySelector('#r-to').value; if (!f || !t) return;
    st.from = f; st.to = t; st.preset = ''; view.querySelectorAll('[data-rp]').forEach(x => x.setAttribute('aria-pressed', 'false')); load();
  }
  await load();
  return off;
}

/* ══════ 系統設定 ══════ */
async function mountSettings(view) {
  view.innerHTML = headHtml('系統設定') + `<div id="s-body"></div>`;
  const box = view.querySelector('#s-body');
  async function load() { const d = await guard(box, () => api.settings(), '讀取設定中…'); if (d) render(d); }
  function render(d) {
    const chips = list => `<div class="chips ro">${list.map(x => `<span class="chip-ro">${esc(x)}</span>`).join('') || '<span class="muted small">（無）</span>'}</div>`;
    box.innerHTML = `
      <form class="card stack-form" id="s-form" novalidate><h2 class="card-title">營運設定</h2>
        <div class="grid-2">${d.items.map(i => `<div class="field"><label for="s-${esc(i.key)}">${esc(i.label)}</label><input class="input" id="s-${esc(i.key)}" data-key="${esc(i.key)}" ${i.type === 'time' ? 'type="time"' : ['money', 'mm', 'hours'].includes(i.type) ? 'inputmode="numeric"' : ''} maxlength="200" value="${esc(i.value)}"></div>`).join('')}</div>
        <div class="form-error" id="s-err" role="alert" hidden></div>
        <div><button type="submit" class="btn btn-primary" id="s-save">儲存設定</button></div>
      </form>
      <div class="card stack-form"><h2 class="card-title">固定項目</h2>
        <div class="field"><span class="field-label">訂單狀態</span>${chips(d.orderStatuses)}</div>
        <div class="field"><span class="field-label">付款狀態</span>${chips(d.paymentStatuses)}</div>
        <div class="field"><span class="field-label">交付方式</span>${chips(d.deliveries)}</div>
        <div class="field"><span class="field-label">商品分類</span>${chips(d.categories)}<span class="hint">分類來自商品資料，請到「商品」頁新增或修改。</span></div>
        <p class="muted small">訂單狀態、付款狀態與交付方式和系統的檢查規則綁在一起，不開放在這裡修改。</p>
      </div>
      <div class="card stack-form"><h2 class="card-title">帳號</h2>
        <p class="small">目前登入：<b>${esc((Store.init && Store.init.user && (Store.init.user.name || Store.init.user.username)) || '')}</b></p>
        <p class="muted small">目前所有帳號的權限相同。新增帳號、停用帳號請到試算表的「帳號」分頁與選單處理。</p>
        <div class="btn-row"><button type="button" class="btn" data-act="password">修改密碼</button><button type="button" class="btn" data-act="logout">登出</button></div>
      </div>`;
    box.querySelector('#s-form').addEventListener('submit', async e => {
      e.preventDefault(); const btn = box.querySelector('#s-save'), err = box.querySelector('#s-err'); if (btn.disabled) return;
      const values = {}; box.querySelectorAll('[data-key]').forEach(i => { values[i.dataset.key] = i.value.trim(); });
      btn.disabled = true; btn.textContent = '儲存中…'; err.hidden = true;
      try { const nd = await api.saveSettings(values); Store.init = await api.init(); toast('設定已儲存'); render(nd); }
      catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = '儲存設定'; }
    });
  }
  box.addEventListener('input', e => { if (e.target.inputMode === 'numeric') e.target.value = e.target.value.replace(/[^\d]/g, ''); });
  box.addEventListener('click', async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'reload') load();
    if (a.dataset.act === 'password') {
      const r = await formDialog({ title: '修改密碼', message: '修改後，其他裝置會被登出，這台裝置維持登入。', okText: '修改密碼',
        fields: [{ name: 'old', label: '目前的密碼', type: 'password', required: true, autocomplete: 'current-password' }, { name: 'pw', label: '新密碼（至少 8 個字元）', type: 'password', required: true, autocomplete: 'new-password' }, { name: 'pw2', label: '再輸入一次新密碼', type: 'password', required: true, autocomplete: 'new-password' }],
        submit: async v => { if (v.pw !== v.pw2) throw new Error('兩次輸入的新密碼不一樣。'); await api.changePassword(v.old, v.pw); return true; } });
      if (r) toast('密碼已修改');
    }
  });
  await load();
}

/* ══════════ 七、新增與修改訂單 ══════════ */
/* ══════ 新增訂單／修改訂單 ══════
 * 金額在畫面上即時試算，正式儲存時以後端重新計算的結果為準。
 * 每張表單只產生一個 requestId：逾時後再按一次用的是同一個編號，後端不會重複建立。
 */
let newOrderDirty = () => false;
async function mountNewOrder(view, params) {
  const editId = params.edit || '', init = Store.init || {}, S = init.settings || {};
  const st = { requestId: uuid(), delivery: '工作室自取', cat: '', cart: [], addons: [], locked: false, saving: false, original: null, touched: false, done: false };
  newOrderDirty = () => !st.done && view.contains(view.querySelector('#no-form')) && (st.touched || st.cart.length > 0);
  view.innerHTML = headHtml(editId ? '修改訂單' : '新增訂單', editId ? `<span class="num">${esc(editId)}</span>` : '') + `<div id="no-wrap">${loadingHtml('準備中…')}</div>`;
  const wrap = view.querySelector('#no-wrap');
  let catalog, customers = [];
  try {
    const jobs = [Store.load('catalog'), Store.load('customers').catch(() => [])];
    if (editId) jobs.push(api.order(editId));
    const r = await Promise.all(jobs); catalog = r[0]; customers = r[1]; st.original = r[2] || null;
  } catch (e) { wrap.innerHTML = errorHtml('讀取失敗', e.message); wrap.addEventListener('click', ev => { if (ev.target.closest('[data-act="reload"]')) mountNewOrder(view, params); }); return; }

  const products = catalog.products.filter(p => p.status === '上架' && p.variants.some(v => v.status === '上架'));
  const cats = [...new Set(products.map(p => p.category))];
  st.cat = cats[0] || '';
  const o = st.original && st.original.order;
  if (o) {
    if (o.status === '已取消') { wrap.innerHTML = emptyHtml('這筆訂單已取消，不能修改'); return; }
    st.locked = !['待確認', '已確認'].includes(o.status);
    st.delivery = o.delivery;
    const tempOf = id => { const p = catalog.products.find(x => x.id === id); return p ? p.temp : o.temp; };
    st.cart = st.original.items.map(i => ({ key: uuid(), detailId: i.id, variantId: i.variantId, name: i.name, variant: i.variant, price: i.price, quantity: i.quantity, note: i.note, rule: i.shippingRule, temp: tempOf(i.productId), approved: true }));
    st.addons = st.original.addons.map(a => ({ key: uuid(), name: a.name, quantity: a.quantity, price: a.price }));
  }
  const val = (k, d = '') => o ? (o[k] ?? d) : d;

  wrap.innerHTML = `<form id="no-form" novalidate autocomplete="off">
    ${st.locked ? `<div class="notice warn">這筆訂單已是「${esc(o.status)}」，商品內容與金額不能再修改，只能改顧客、日期、收件資料與備註。要調整商品請取消後重新建立。</div>` : ''}
    <div class="no-grid">
      <div class="no-col">
        <section class="card"><h2 class="card-title">顧客</h2>
          <div class="grid-2"><div class="field"><label class="req" for="no-phone">聯絡電話</label><input class="input" id="no-phone" inputmode="tel" maxlength="30" value="${esc(val('phone'))}"></div>
            <div class="field"><label class="req" for="no-name">顧客姓名</label><input class="input" id="no-name" maxlength="60" value="${esc(val('name'))}"></div></div>
          <div id="no-sugg"></div>
          ${editId ? '' : `<div class="field"><label for="no-cnote">顧客備註</label><input class="input" id="no-cnote" maxlength="500" placeholder="會記在顧客資料上，選填"></div>`}
        </section>
        <section class="card"><h2 class="card-title">交付</h2>
          <div class="field"><span class="field-label req">交付方式</span><div class="seg wrap" id="no-deliv" role="radiogroup" aria-label="交付方式"></div><span class="hint" id="no-deliv-hint"></span></div>
          <div class="grid-2"><div class="field"><label class="req" for="no-date" id="no-date-label">取貨日期</label><input class="input" type="date" id="no-date" value="${esc(val('date'))}"></div>
            <div class="field" id="no-time-field"><label class="req" for="no-time">取貨時間</label><input class="input" type="time" id="no-time" value="${esc(val('time', S.pickupStart || ''))}"><span class="hint">${S.pickupStart && S.pickupEnd ? `預設取貨時段 ${esc(S.pickupStart)}–${esc(S.pickupEnd)}` : ''}</span></div></div>
          <div id="no-ship" hidden>
            <div class="grid-2"><div class="field"><label for="no-rec">收件人</label><input class="input" id="no-rec" maxlength="60" placeholder="留空＝同顧客姓名" value="${esc(val('recipient'))}"></div>
              <div class="field"><label for="no-recphone">收件電話</label><input class="input" id="no-recphone" inputmode="tel" maxlength="30" placeholder="留空＝同聯絡電話" value="${esc(val('recipientPhone'))}"></div></div>
            <div class="field"><label class="req" for="no-addr" id="no-addr-label">收件地址</label><input class="input" id="no-addr" maxlength="500" value="${esc(val('address'))}"></div>
          </div>
          <div class="field"><label for="no-prod">製作日期（選填）</label><input class="input" type="date" id="no-prod" value="${esc(val('productionDate'))}"><span class="hint">沒填就當作和交付日同一天。</span></div>
          <div class="field"><label for="no-note">訂單備註</label><textarea class="textarea" id="no-note" maxlength="2000" placeholder="選填">${esc(val('note'))}</textarea></div>
        </section>
      </div>
      <div class="no-col">
        ${st.locked ? '' : `<section class="card"><h2 class="card-title">選擇商品</h2><div class="chips" id="no-cats"></div><div id="no-prods"></div></section>`}
        <section class="card"><h2 class="card-title">訂單內容</h2><div id="no-cart"></div>
          ${st.locked ? '' : `<h3 class="sub-h">加購</h3><div class="chips" id="no-addon-quick"><button type="button" class="chip" data-addon="刀叉盤組">＋ 刀叉盤組</button><button type="button" class="chip" data-addon="蠟燭">＋ 蠟燭</button><button type="button" class="chip" data-addon="">＋ 自訂加購</button></div><div id="no-addons"></div>`}
        </section>
        <section class="card"><h2 class="card-title">金額</h2>
          ${st.locked ? '' : `<div class="grid-2"><div class="field"><label for="no-discount">折扣</label><div class="price-wrap"><input class="input" id="no-discount" inputmode="numeric" maxlength="7" placeholder="0" value="${o && o.discount ? esc(o.discount) : ''}"></div></div>
            <div class="field"><label for="no-shipfee">手動運費</label><div class="price-wrap"><input class="input" id="no-shipfee" inputmode="numeric" maxlength="6" placeholder="留空＝自動計算"></div></div></div>`}
          <div id="no-totals"></div>
          ${editId ? '' : `<h3 class="sub-h">本次收款（選填）</h3><div class="grid-2"><div class="field"><label for="no-pay">收款金額</label><div class="price-wrap"><input class="input" id="no-pay" inputmode="numeric" maxlength="7" placeholder="沒收款就留空"></div></div>
            <div class="field"><label for="no-method">付款方式</label><select class="select" id="no-method">${(init.methods || []).map(m => `<option>${esc(m)}</option>`).join('')}</select></div></div>
            <div class="btn-row"><button type="button" class="btn btn-sm" data-act="pay-full">帶入全額</button><button type="button" class="btn btn-sm" data-act="pay-half">帶入一半</button></div>`}
        </section>
      </div>
    </div>
    <div class="no-bar"><div class="no-bar-total"><span class="muted small">應收總額</span><b class="num" id="no-bar-total">$0</b></div>
      <div class="form-error" id="no-err" role="alert" hidden></div>
      <div class="no-bar-btns">${editId ? `<a class="btn" href="#/orders">取消</a><button type="submit" class="btn btn-primary" data-save="edit">儲存修改</button>`
        : `<button type="submit" class="btn" data-save="draft">儲存為待確認</button><button type="submit" class="btn btn-primary" data-save="confirm">儲存並確認訂單</button>`}</div></div>
  </form>`;

  const $ = s => wrap.querySelector(s), form = $('#no-form');
  const cartTemp = () => st.cart.length ? st.cart[0].temp : '';
  const pickup = () => st.delivery === '工作室自取';
  const num = el => { const v = el ? el.value.trim() : ''; return v === '' ? null : Number(v); };

  function calc() {
    const subtotal = st.cart.reduce((n, i) => n + i.price * i.quantity, 0), addonTotal = st.addons.reduce((n, a) => n + (Number(a.price) || 0) * (Number(a.quantity) || 0), 0);
    if (st.locked) return { subtotal: o.subtotal, addonTotal: o.addonTotal, shipping: o.shipping, discount: o.discount, total: o.total, auto: o.shipping };
    const qty = st.cart.reduce((n, i) => n + i.quantity, 0);
    const auto = pickup() ? 0 : st.delivery === '冷凍宅配' ? qty * (S.feePerCake || 0) : st.delivery === '常溫超商店到店' ? (S.feeCvs || 0) : (S.feeHct || 0);
    const manual = num($('#no-shipfee')), shipping = pickup() ? 0 : (manual == null ? auto : manual), discount = num($('#no-discount')) || 0;
    return { subtotal, addonTotal, shipping, discount, total: subtotal + addonTotal + shipping - discount, auto };
  }
  function renderDelivery() {
    const all = init.deliveries || ['工作室自取'], allowed = cartTemp() ? (init.deliveryByTemp || {})[cartTemp()] || all : all;
    if (!allowed.includes(st.delivery)) st.delivery = '工作室自取';
    $('#no-deliv').innerHTML = all.map(d => `<button type="button" data-deliv="${esc(d)}" aria-pressed="${d === st.delivery}"${allowed.includes(d) && !st.locked ? '' : ' disabled'}>${esc(d)}</button>`).join('');
    $('#no-deliv-hint').textContent = st.locked ? '' : cartTemp() ? `訂單內是${cartTemp()}商品，只能選對應的交付方式。` : '加入商品後，會依冷凍或常溫限制可選的方式。';
    const p = pickup(); $('#no-ship').hidden = p; $('#no-time-field').hidden = !p;
    $('#no-date-label').textContent = p ? '取貨日期' : '出貨日期';
    $('#no-addr-label').textContent = st.delivery === '常溫超商店到店' ? '門市名稱（例如：7-11 大智門市）' : '收件地址';
  }
  function renderPicker() {
    if (st.locked) return;
    $('#no-cats').innerHTML = cats.map(c => `<button type="button" class="chip${c === st.cat ? ' on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('') || '<span class="muted small">還沒有上架的商品，請先到「商品」頁新增。</span>';
    const temp = cartTemp();
    $('#no-prods').innerHTML = products.filter(p => p.category === st.cat).map(p => {
      const blocked = temp && p.temp !== temp;
      return `<div class="pick${blocked ? ' blocked' : ''}"><div class="pick-name">${esc(p.name)} ${tag(p.temp)}${blocked ? `<span class="muted small">　訂單內已有${esc(temp)}商品，不能混單</span>` : ''}</div>
        <div class="pick-vars">${p.variants.filter(v => v.status === '上架').map(v => `<button type="button" class="var-btn" data-var="${esc(v.id)}"${blocked ? ' disabled' : ''}><span>${esc(v.name)}</span><b class="num">${money(v.price)}</b>${v.shippingRule === '限自取' ? '<i>限自取</i>' : v.shippingRule === '特殊確認' ? '<i>寄送需確認</i>' : ''}</button>`).join('')}</div></div>`;
    }).join('');
  }
  function renderCart() {
    const p = pickup();
    $('#no-cart').innerHTML = st.cart.length ? st.cart.map(i => `<div class="cart-line" data-key="${i.key}">
      <div class="cart-main"><div><b>${esc(i.name)}</b> <span class="muted">${esc(i.variant)}</span></div><div class="num muted small">${money(i.price)}${i.detailId ? '（成交價）' : ''}</div></div>
      ${st.locked ? `<div class="num">× ${i.quantity}</div>` : `<div class="stepper"><button type="button" data-step="-1" aria-label="減少數量">−</button><input class="num" inputmode="numeric" maxlength="4" value="${i.quantity}" aria-label="${esc(i.name)} ${esc(i.variant)} 數量"><button type="button" data-step="1" aria-label="增加數量">＋</button></div>`}
      <div class="num cart-sum">${money(i.price * i.quantity)}</div>
      ${st.locked ? '' : `<button type="button" class="icon-btn" data-remove aria-label="移除 ${esc(i.name)} ${esc(i.variant)}" title="移除">${icon('x')}</button>`}
      ${st.locked ? (i.note ? `<div class="cart-note line-note">${esc(i.note)}</div>` : '') : `<input class="input cart-note" maxlength="1000" placeholder="這個商品的備註（選填）" value="${esc(i.note || '')}" aria-label="${esc(i.name)} 備註">`}
      ${!p && i.rule === '限自取' ? `<div class="cart-warn">這個規格限自取，不能寄送。請改回自取或移除。</div>` : ''}
      ${!p && i.rule === '特殊確認' && !st.locked ? `<label class="check cart-warn"><input type="checkbox" data-approve${i.approved ? ' checked' : ''}> 已和顧客確認可以寄送</label>` : ''}
    </div>`).join('') : `<p class="muted small empty-cart">還沒有商品。${st.locked ? '' : '請從上方點選規格加入。'}</p>`;
  }
  function renderAddons() {
    if (st.locked) { if (st.addons.length) $('#no-cart').insertAdjacentHTML('beforeend', `<h3 class="sub-h">加購</h3>` + st.addons.map(a => `<div class="cart-line"><div class="cart-main">${esc(a.name)}</div><div class="num">× ${a.quantity}</div><div class="num cart-sum">${money(a.price * a.quantity)}</div></div>`).join('')); return; }
    $('#no-addons').innerHTML = st.addons.map(a => `<div class="addon-line" data-key="${a.key}"><input class="input a-name" maxlength="60" placeholder="品項" value="${esc(a.name)}" aria-label="加購品項">
      <input class="input a-qty num" inputmode="numeric" maxlength="4" value="${esc(a.quantity)}" aria-label="數量"><div class="price-wrap"><input class="input a-price" inputmode="numeric" maxlength="6" placeholder="單價" value="${a.price === '' ? '' : esc(a.price)}" aria-label="單價"></div>
      <button type="button" class="icon-btn" data-remove-addon aria-label="移除加購" title="移除">${icon('x')}</button></div>`).join('');
  }
  function renderTotals() {
    const c = calc(), paid = o ? o.paid : 0, row = (k, v, cls = '') => `<div class="kv ${cls}"><span>${k}</span><b class="num">${v}</b></div>`;
    $('#no-totals').innerHTML = row('商品小計', money(c.subtotal)) + row('加購小計', money(c.addonTotal))
      + row('運費' + (!pickup() && !st.locked ? `<small class="muted">　${num($('#no-shipfee')) == null ? (st.delivery === '冷凍宅配' ? `每顆 ${money(S.feePerCake)}` : '整筆') : '手動'}</small>` : ''), money(c.shipping))
      + row('折扣', (c.discount ? '−' : '') + money(c.discount)) + row('應收總額', money(c.total), 'total' + (c.total < 0 ? ' due' : ''))
      + (editId ? row('已收金額', money(paid)) + row('未收金額', money(Math.max(c.total - paid, 0)), c.total - paid > 0 ? 'due' : '') : '');
    $('#no-bar-total').textContent = money(c.total);
  }
  function renderAll() { renderDelivery(); renderPicker(); renderCart(); renderAddons(); renderTotals(); }
  const digits = s => String(s).replace(/\D/g, '').replace(/^886/, '').replace(/^0+/, '');
  function renderSuggest() {
    if (editId) return;
    const ph = digits($('#no-phone').value), nm = $('#no-name').value.trim().toLowerCase();
    const hits = (ph.length >= 4 || nm.length >= 2) ? customers.filter(c => (ph.length >= 4 && digits(c.phone).includes(ph)) || (nm.length >= 2 && c.name.toLowerCase().includes(nm))).slice(0, 4) : [];
    $('#no-sugg').innerHTML = hits.length ? `<div class="sugg"><div class="muted small">找到既有顧客，點一下帶入：</div>${hits.map(c => `<button type="button" class="mini-row" data-cust="${esc(c.id)}"><span><b>${esc(c.name)}</b> <span class="num">${esc(c.phone)}</span>${c.note ? `<span class="muted small">　${esc(c.note)}</span>` : ''}</span><span class="muted small">${c.orderCount} 筆訂單</span></button>`).join('')}</div>` : '';
  }
  const showError = msg => { const e = $('#no-err'); e.textContent = msg; e.hidden = !msg; };

  wrap.addEventListener('click', e => {
    const t = e.target, dl = t.closest('[data-deliv]'), cat = t.closest('[data-cat]'), vb = t.closest('[data-var]'), step = t.closest('[data-step]'), cu = t.closest('[data-cust]'), ad = t.closest('[data-addon]');
    if (dl) { st.delivery = dl.dataset.deliv; st.touched = true; renderDelivery(); renderCart(); renderAddons(); renderTotals(); }
    else if (cat) { st.cat = cat.dataset.cat; renderPicker(); }
    else if (vb) {
      const p = products.find(x => x.variants.some(v => v.id === vb.dataset.var)), v = p.variants.find(x => x.id === vb.dataset.var);
      const hit = st.cart.find(i => !i.detailId && i.variantId === v.id);
      if (hit) hit.quantity = Math.min(hit.quantity + 1, 1000);
      else st.cart.push({ key: uuid(), detailId: '', variantId: v.id, name: p.name, variant: v.name, price: v.price, quantity: 1, note: '', rule: v.shippingRule, temp: p.temp, approved: false });
      renderAll(); toast(`已加入：${p.name} ${v.name}`, 'info', 1400);
    }
    else if (step) { const line = st.cart.find(i => i.key === step.closest('[data-key]').dataset.key); line.quantity = Math.max(1, Math.min(1000, line.quantity + Number(step.dataset.step))); renderCart(); renderAddons(); renderTotals(); }
    else if (t.closest('[data-remove]')) { const k = t.closest('[data-key]').dataset.key; st.cart = st.cart.filter(i => i.key !== k); renderAll(); }
    else if (t.closest('[data-remove-addon]')) { const k = t.closest('[data-key]').dataset.key; st.addons = st.addons.filter(a => a.key !== k); renderAddons(); renderTotals(); }
    else if (ad) { st.addons.push({ key: uuid(), name: ad.dataset.addon, quantity: 1, price: '' }); renderAddons(); renderTotals(); const rows = wrap.querySelectorAll('.addon-line'); rows[rows.length - 1].querySelector(ad.dataset.addon ? '.a-price' : '.a-name').focus(); }
    else if (cu) {
      const c = customers.find(x => x.id === cu.dataset.cust); if (!c) return;
      $('#no-name').value = c.name; $('#no-phone').value = c.phone; if ($('#no-cnote')) $('#no-cnote').value = c.note || '';
      if (!$('#no-rec').value) $('#no-rec').value = c.recipient || ''; if (!$('#no-addr').value) $('#no-addr').value = c.address || '';
      $('#no-sugg').innerHTML = ''; st.touched = true;
    }
    else if (t.closest('[data-act="pay-full"]')) { $('#no-pay').value = Math.max(calc().total, 0); }
    else if (t.closest('[data-act="pay-half"]')) { $('#no-pay').value = Math.max(Math.round(calc().total / 2), 0); }
  });
  wrap.addEventListener('input', e => {
    const t = e.target; st.touched = true;
    if (t.inputMode === 'numeric') t.value = t.value.replace(/[^\d]/g, '');
    const line = t.closest('.cart-line[data-key]'), addon = t.closest('.addon-line');
    if (line) { const i = st.cart.find(x => x.key === line.dataset.key); if (t.classList.contains('cart-note')) i.note = t.value; else if (t.matches('.stepper input')) { i.quantity = Math.max(1, Math.min(1000, Number(t.value) || 1)); line.querySelector('.cart-sum').textContent = money(i.price * i.quantity); renderTotals(); } }
    else if (addon) { const a = st.addons.find(x => x.key === addon.dataset.key); a.name = addon.querySelector('.a-name').value; a.quantity = addon.querySelector('.a-qty').value; a.price = addon.querySelector('.a-price').value; renderTotals(); }
    else if (t.id === 'no-discount' || t.id === 'no-shipfee') renderTotals();
    else if (t.id === 'no-phone' || t.id === 'no-name') renderSuggest();
    if (!$('#no-err').hidden) showError('');
  });
  wrap.addEventListener('change', e => {
    if (e.target.matches('[data-approve]')) { st.cart.find(x => x.key === e.target.closest('[data-key]').dataset.key).approved = e.target.checked; }
    // 數量欄離開時，把顯示值校正成實際採用的數量（不重畫整個清單，避免和點擊事件互相干擾）。
    if (e.target.matches('.stepper input')) { const i = st.cart.find(x => x.key === e.target.closest('[data-key]').dataset.key); if (i) e.target.value = i.quantity; }
  });

  // 在輸入欄位按 Enter 不送出表單，避免還沒填完就誤存。
  form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) e.preventDefault(); });
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (st.saving) return;
    const mode = (e.submitter && e.submitter.dataset.save) || (editId ? 'edit' : 'draft'), v = id => ($(id) ? $(id).value.trim() : ''), c = calc();
    const fail = (msg, el) => { showError(msg); if (el) el.focus(); };
    if (!v('#no-phone')) return fail('請輸入聯絡電話。', $('#no-phone'));
    if (!v('#no-name')) return fail('請輸入顧客姓名。', $('#no-name'));
    if (!v('#no-date')) return fail(`請選擇${pickup() ? '取貨' : '出貨'}日期。`, $('#no-date'));
    if (pickup() && !v('#no-time')) return fail('請選擇取貨時間。', $('#no-time'));
    if (!pickup() && !v('#no-addr')) return fail(st.delivery === '常溫超商店到店' ? '請輸入門市名稱。' : '請輸入收件地址。', $('#no-addr'));
    const base = { name: v('#no-name'), phone: v('#no-phone'), date: v('#no-date'), time: pickup() ? v('#no-time') : '', productionDate: v('#no-prod'), recipient: pickup() ? '' : v('#no-rec'), recipientPhone: pickup() ? '' : v('#no-recphone'), address: pickup() ? '' : v('#no-addr'), note: v('#no-note') };
    let content = null;
    if (!st.locked) {
      if (!st.cart.length) return fail('請至少加入一項商品。');
      if (!pickup() && st.cart.some(i => i.rule === '限自取')) return fail('訂單內有限自取的商品，不能寄送。');
      if (!pickup() && st.cart.some(i => i.rule === '特殊確認' && !i.approved)) return fail('有商品寄送前需要確認，請勾選「已和顧客確認可以寄送」。');
      for (const a of st.addons) { if (!String(a.name).trim()) return fail('加購品項還沒有名稱（不需要的話請移除）。'); if (!/^\d+$/.test(String(a.quantity)) || Number(a.quantity) < 1) return fail(`加購「${a.name}」的數量請輸入 1 以上的整數。`); if (!/^\d+$/.test(String(a.price))) return fail(`請輸入加購「${a.name}」的單價（免費請填 0）。`); }
      if (c.total < 0) return fail('折扣超過總額。', $('#no-discount'));
      content = { delivery: st.delivery, items: st.cart.map(i => ({ ...(i.detailId ? { detailId: i.detailId } : { variantId: i.variantId }), quantity: i.quantity, note: (i.note || '').trim(), specialShippingApproved: !!i.approved })),
        addons: st.addons.map(a => ({ name: String(a.name).trim(), quantity: Number(a.quantity), price: Number(a.price) })), discount: c.discount, shippingOverride: pickup() || num($('#no-shipfee')) == null ? null : num($('#no-shipfee')) };
    }
    let payment = null;
    if (!editId && v('#no-pay') && Number(v('#no-pay')) > 0) { if (Number(v('#no-pay')) > c.total) return fail('本次收款超過應收總額。', $('#no-pay')); payment = { amount: Number(v('#no-pay')), method: v('#no-method') }; }
    if (editId && content && o && !(await confirmDialog({ title: '儲存這筆訂單的修改？', message: `應收總額：${money(o.total)} → ${money(c.total)}`, okText: '儲存修改' }))) return;
    const btns = wrap.querySelectorAll('.no-bar-btns button'); st.saving = true; btns.forEach(b => { b.disabled = true; }); showError('');
    const label = e.submitter ? e.submitter.textContent : ''; if (e.submitter) e.submitter.textContent = '儲存中…';
    try {
      const saved = editId ? await api.editOrder(editId, { ...base, ...(content || {}) }, '') : await api.createOrder({ requestId: st.requestId, ...base, customerNote: v('#no-cnote'), ...content, confirm: mode === 'confirm', payment });
      st.done = true; Store.drop('orders', 'customers');
      if (editId) { toast('訂單已更新'); location.hash = '#/orders'; openOrder(saved.order.id); return; }
      const so = saved.order;
      wrap.innerHTML = `<div class="card done"><div class="done-mark">✓</div><h2>訂單已建立</h2><p class="done-id num">${esc(so.id)}</p>
        <p>${esc(so.name)}・${esc(so.delivery)}・${esc(fmtDay(so.date))}${so.time ? ' ' + esc(so.time) : ''}</p><p>${esc(so.summary)}</p>
        <p>應收 <b class="num">${money(so.total)}</b>・已收 <b class="num">${money(so.paid)}</b>・${tag(so.status)}${tag(so.payStatus)}</p>
        <div class="btn-row center"><button type="button" class="btn btn-primary" data-act="again">再新增一筆</button><button type="button" class="btn" data-act="view">查看這筆訂單</button><a class="btn" href="#/orders">回訂單列表</a></div></div>`;
      wrap.querySelector('[data-act="again"]').addEventListener('click', () => mountNewOrder(view, {}));
      wrap.querySelector('[data-act="view"]').addEventListener('click', () => openOrder(so.id));
      window.scrollTo(0, 0);
    } catch (ex) {
      showError(ex.message || '儲存失敗'); st.saving = false; btns.forEach(b => { b.disabled = false; }); if (e.submitter) e.submitter.textContent = label;
    }
  });

  // 修改模式：原本的運費若不是自動算出來的金額，視為手動運費帶入。
  renderAll();
  if (o && !st.locked && !pickup() && o.shipping !== calc().auto) { $('#no-shipfee').value = o.shipping; renderTotals(); }
  if (!editId) $('#no-phone').focus();
}

/* ══════════ 八、主程式 ══════════ */
/* ══════ 主程式：登入畫面、導覽外框、頁面切換 ══════ */
const PAGES = [
  { id: 'dashboard', label: '總覽', mount: mountDashboard, live: true },
  { id: 'orders', label: '訂單', mount: mountOrders, live: true },
  { id: 'new', label: '新增訂單', mount: mountNewOrder },
  { id: 'calendar', label: '行事曆', mount: mountCalendar, live: true },
  { id: 'production', label: '製作', mount: mountProduction, live: true },
  { id: 'customers', label: '顧客', mount: mountCustomers, live: true },
  { id: 'products', label: '商品', mount: mountProducts },
  { id: 'reports', label: '報表', mount: mountReports },
  { id: 'settings', label: '設定', mount: mountSettings }
];
const MOBILE_MAIN = ['dashboard', 'orders', 'new', 'production'];
const HOME = 'dashboard';
const app = document.getElementById('app');
const brandHtml = `<div class="brand-name">Vanilla<span>.</span></div><div class="brand-sub">香草籽甜點 POS</div>`;
let current = { id: '', hash: '' }, cleanup = null, ignoreNextHash = false;

function showLogin(message = '') {
  current = { id: '', hash: '' }; Store.clear();
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
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
  const user = (Store.init && Store.init.user) || {}, name = user.name || user.username || '';
  const link = (p, cls) => `<a class="${cls}" href="#/${p.id}" data-page="${p.id}">${icon(p.id)}<span>${p.label}</span></a>`;
  app.innerHTML = `
    <div class="shell">
      <aside class="side">
        <div class="brand">${brandHtml}</div>
        <nav class="side-nav" aria-label="主要導覽">${PAGES.map(p => link(p, 'nav-link')).join('')}</nav>
        <div class="side-user"><div class="email">${esc(name)}</div><button type="button" class="linklike" data-act="logout">登出</button></div>
      </aside>
      <main class="main" id="view" tabindex="-1"></main>
      <nav class="bottom-nav" aria-label="主要導覽">
        ${MOBILE_MAIN.map(id => link(PAGES.find(x => x.id === id), '')).join('')}
        <a href="#/more" data-page="more">${icon('more')}<span>更多</span></a>
      </nav>
    </div>`;
}

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, ''), [id, query = ''] = raw.split('?'), params = {};
  query.split('&').filter(Boolean).forEach(kv => { const [k, v = ''] = kv.split('='); try { params[decodeURIComponent(k)] = decodeURIComponent(v); } catch { /* 略過格式不對的參數 */ } });
  return { id: id || HOME, params };
}

async function route(force = false) {
  const view = document.getElementById('view'); if (!view) return;
  const { id, params } = parseHash(), page = PAGES.find(p => p.id === id);
  document.querySelectorAll('[data-page]').forEach(a => {
    const on = a.dataset.page === id || (a.dataset.page === 'more' && a.closest('.bottom-nav') && (id === 'more' || (page && !MOBILE_MAIN.includes(id))));
    a.classList.toggle('active', !!on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* 略過 */ } } cleanup = null;
  const samePage = current.id === id; current = { id, hash: location.hash };
  if (id === 'more') {
    const user = (Store.init && Store.init.user) || {};
    view.innerHTML = `<header class="page-head"><div><h1>更多</h1></div></header>
      <div class="more-list">${PAGES.filter(p => !MOBILE_MAIN.includes(p.id)).map(p => `<a href="#/${p.id}">${icon(p.id)}<span>${p.label}</span></a>`).join('')}</div>
      <div class="more-user">${esc(user.name || user.username || '')}　<button type="button" class="linklike" data-act="logout">登出</button></div>`;
    return;
  }
  if (!page) { location.hash = '#/' + HOME; return; }
  if (!samePage) window.scrollTo(0, 0);
  try { cleanup = await page.mount(view, params, force); }
  catch (e) { view.innerHTML = `<div class="state"><strong>頁面發生錯誤</strong>${esc(e.message)}<br><button type="button" class="btn" onclick="location.reload()">重新整理</button></div>`; }
}

async function onHashChange() {
  if (ignoreNextHash) { ignoreNextHash = false; return; }
  if (current.id === 'new' && location.hash !== current.hash && newOrderDirty()) {
    const ok = await confirmDialog({ title: '離開這個頁面？', message: '尚未儲存的訂單內容會消失。', okText: '離開', cancelText: '留下繼續編輯', danger: true });
    if (!ok) { ignoreNextHash = true; location.hash = current.hash; return; }
  }
  route();
}

async function start() {
  if (!CONFIG.API_URL) { app.innerHTML = `<div class="login"><div class="login-card">${brandHtml}<div class="login-error">config.js 還沒有填入後端網址（API_URL）。</div></div></div>`; return; }
  if (!getSession()) return showLogin();
  app.innerHTML = `<p class="boot">登入確認中…</p>`;
  try { Store.init = await api.init(); }
  catch (e) {
    if (e.code === 'AUTH') return;                       // 已由 vp:auth 事件切回登入畫面
    app.innerHTML = `<div class="login"><div class="login-card">${brandHtml}<div class="login-error">${esc(e.message)}</div><p><button type="button" class="btn" onclick="location.reload()">重新整理</button></p></div></div>`;
    return;
  }
  shell(); route();
}

window.addEventListener('hashchange', onHashChange);
window.addEventListener('vp:auth', () => showLogin('登入已過期，請重新登入。'));
// 資料有變動（例如在訂單詳情收款、改狀態）：目前頁面若是列表類，重新讀取。
window.addEventListener('vp:changed', () => { const p = PAGES.find(x => x.id === current.id); if (p && p.live && document.getElementById('view')) route(true); });
// 離開或重新整理前，若新增訂單有未儲存內容，讓瀏覽器跳出提醒。
window.addEventListener('beforeunload', e => { if (current.id === 'new' && newOrderDirty()) { e.preventDefault(); e.returnValue = ''; } });
app.addEventListener('click', async e => {
  const btn = e.target.closest('[data-act="logout"]'); if (!btn) return;
  if (current.id === 'new' && newOrderDirty() && !(await confirmDialog({ title: '確定要登出？', message: '尚未儲存的訂單內容會消失。', okText: '登出', danger: true }))) return;
  btn.disabled = true; await api.logout(); showLogin();
});
start();
