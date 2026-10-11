// 共用小工具：跳脫、金額、提示訊息、確認視窗、圖示
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = n => '$' + Number(n || 0).toLocaleString('zh-TW');

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
export const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;

let toastBox;
export function toast(message, type = 'success', ms = 3600) {
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
export function confirmDialog({ title, message = '', okText = '確定', cancelText = '取消', danger = false }) {
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
