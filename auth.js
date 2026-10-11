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
export function getSession() {
  const s = load();
  if (!s || !s.token || !s.expiresAt || s.expiresAt < Date.now() + 30000) { if (s) clearSession(); return null; }
  return s;
}
export function setSession(session, remember) {
  clearSession(); mem = session;
  try { window[remember ? 'localStorage' : 'sessionStorage'].setItem(KEY, JSON.stringify(session)); } catch { /* 忽略 */ }
}
export function clearSession() {
  mem = null;
  for (const store of ['sessionStorage', 'localStorage']) { try { window[store].removeItem(KEY); } catch { /* 忽略 */ } }
}
