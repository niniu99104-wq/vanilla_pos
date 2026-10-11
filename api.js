// API Service：所有與後端的溝通都經過這裡。
// 負責：呼叫、逾時、錯誤處理、登入與帶上登入代碼、後端格式（中文欄位）↔ 前端格式的轉換。
// 規則：不自動重送。寫入逾時時無法確定後端是否已完成，由使用者重新整理確認。
import { CONFIG } from '../config.js';
import { getSession, setSession, clearSession } from './auth.js';

export const isMock = !CONFIG.API_URL;
const TIMEOUT_MS = 45000;

export class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

async function call(action, args = {}) {
  if (isMock) { const { mockCall } = await import('./mock.js'); return mockCall(action, args); }
  let token = '';
  if (action !== 'login') {
    const session = getSession();
    if (!session) { window.dispatchEvent(new Event('vp:auth')); throw new ApiError('AUTH', '請先登入'); }
    token = session.token;
  }
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let res;
  try {
    // 用 text/plain 送出可避免瀏覽器預檢請求（Apps Script 不回應預檢）。
    res = await fetch(CONFIG.API_URL, {
      method: 'POST', redirect: 'follow', signal: ctl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token, action, args })
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new ApiError('TIMEOUT', '連線逾時。若剛才是在儲存，請先重新整理確認資料是否已寫入，不要直接再按一次。');
    throw new ApiError('NETWORK', '無法連線到後端，請檢查網路。');
  } finally { clearTimeout(timer); }
  let json;
  try { json = await res.json(); }
  catch { throw new ApiError('ERROR', '後端回應格式不正確。請確認 Apps Script 已部署為「網頁應用程式」、存取權為「所有人」，且 config.js 的網址結尾是 /exec。'); }
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

export const api = {
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
