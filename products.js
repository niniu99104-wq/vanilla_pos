// 商品管理：商品列表（搜尋／篩選／排序／上架開關）＋ 新增・編輯抽屜（商品與全部規格一次儲存）
import { api } from './api.js';
import { esc, money, toast, confirmDialog, icon } from './ui.js';

const PRESETS = { '冷凍': ['4吋', '5吋', '6吋', '8吋'], '常溫': ['單顆', '6入盒', '10入禮盒', '150g／罐'] };
const TEMP_LABEL = { '冷凍': '冷凍蛋糕', '常溫': '常溫點心' };
const TEMP_HINT = {
  '冷凍': '可選「工作室自取、冷凍宅配」；宅配運費每顆計算；每顆一張標籤。',
  '常溫': '可選「工作室自取、超商店到店、新竹物流」；運費整筆計算；整筆訂單一張標籤。'
};
const DEFAULT_RULE = { '冷凍': '限自取', '常溫': '可宅配' };

let root, state;

export async function mount(el) {
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
