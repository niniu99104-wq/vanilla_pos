// 進入點：登入檢查、導覽外框、頁面切換
import { api, isMock } from './api.js';
import { getSession } from './auth.js';
import { esc, icon } from './ui.js';

// ready: 已可使用；stage: 預計在第幾階段開放
const PAGES = [
  { id: 'dashboard', label: '總覽', stage: 4 },
  { id: 'orders', label: '訂單', stage: 2 },
  { id: 'new', label: '新增訂單', stage: 2 },
  { id: 'calendar', label: '行事曆', stage: 3 },
  { id: 'production', label: '製作', stage: 3 },
  { id: 'customers', label: '顧客', stage: 4 },
  { id: 'products', label: '商品', ready: true, load: () => import('./products.js') },
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
