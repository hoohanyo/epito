/* Építőkalkulátor – felület, adatkezelés, szinkron */
const APP_VERSION = '1.9.1';
const LOCAL = !CONFIG.API_URL;
const $ = (s, r) => (r || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dotted = (digits) => String(digits).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const ft = (n) => (n < 0 ? '−' : '') + dotted(Math.round(Math.abs(n || 0))) + ' Ft';
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const now = () => new Date().toISOString();
const dateHu = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? String(iso) : d.toLocaleDateString('hu-HU'); };
const numStr = (x) => (x === '' || x == null || !isFinite(x)) ? '' : String(x).replace('.', ',');
const parseNum = (s) => { s = String(s).replace(/\s/g, '').replace(',', '.'); if (s === '') return ''; const n = Number(s); return isFinite(n) ? n : ''; };
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

/* ---------- Állapot ---------- */
const S = {
  tab: 'kalk',
  stack: [{ v: 'kalk' }],
  data: LS.get('ek_cache', { projektek: [], tetelek: [], arlista: {} }),
  queue: LS.get('ek_queue', []),
  kod: LS.get('ek_kod', ''),
  syncing: false, lastErr: '', loaded: false, kodBeallitas: false,
  calc: null, targetMr: null, projFilter: 'Aktív', kalkKeres: '', arKeres: '',
};
if (!S.data.arlista) S.data.arlista = {};
if (!S.data.ceg) S.data.ceg = {};
if (!S.data.ugyfelek) S.data.ugyfelek = [];
if (!S.data.munkareszek) S.data.munkareszek = [];
const saveCache = () => LS.set('ek_cache', S.data);
const saveQueue = () => LS.set('ek_queue', S.queue);

/* ---------- Árak ---------- */
function mat(k) {
  const o = S.data.arlista[k];
  const d = MATERIALS[k] || { n: (o && o.n) || k, g: (o && o.g) || 'Egyéb', u: (o && o.u) || 'db', pack: 0, pn: '', p: 0, egyedi: true };
  if (!o) return d;
  return Object.assign({}, d, {
    n: o.n || d.n, pack: o.pack === '' || o.pack == null ? d.pack : Number(o.pack),
    pn: o.pn || d.pn, p: o.p === '' || o.p == null ? d.p : Number(o.p), megj: o.megj || ''
  });
}
const isMunkaKey = (k) => k !== '_egyeb' && mat(k).g === 'Munkadíj';
const munkaKeys = () => allMatKeys().filter(isMunkaKey);
function line(m) { const l = line0(m); l.cat = m.k === '_egyeb' ? (m.cat || 'egyeb') : isMunkaKey(m.k) ? 'munka' : 'anyag'; return l; }
const splitCats = (ls) => ({ anyag: ls.filter(l => l.cat === 'anyag'), munka: ls.filter(l => l.cat === 'munka'), egyeb: ls.filter(l => l.cat === 'egyeb') });
function line0(m) {
  if (m.k === '_egyeb') {
    const q = Number(m.q) || 0, p = Number(m.p) || 0;
    return { k: m.k, name: m.n || 'Egyéb tétel', q, u: m.u || '', packs: null, pn: '', price: p, cost: q * p, qtxt: fmt(q) + ' ' + (m.u || ''), ptxt: '' };
  }
  const P = mat(m.k); const q = Number(m.q) || 0; const pack = Number(P.pack) || 0;
  let packs = null, cost;
  if (pack > 0) { packs = Math.ceil(q / pack - 1e-9); cost = packs * P.p; } else cost = q * P.p;
  const qtxt = fmt(q) + ' ' + P.u;
  const ptxt = pack > 0 ? (pack === 1 && (P.u === 'db' || P.u === 'szál') ? '' : packs + ' × ' + P.pn) : '';
  if (P.u === 't' && !ptxt) {
    const ro = MATERIALS[m.k] && MATERIALS[m.k].ro; const mj = mjPref();
    if (mj === 'mind') return { k: m.k, name: P.n, q, u: P.u, pack, packs, pn: P.pn, price: P.p, cost, qtxt, ptxt: fmt(q * 10, q * 10 >= 100 ? 0 : 1) + '\u00a0q' + (ro ? ' ≈\u00a0' + fmt(q / ro, 2) + '\u00a0m³ (laza)' : ''), noprice: !P.p };
    return { k: m.k, name: P.n, q, u: P.u, pack, packs, pn: P.pn, price: P.p, cost, qtxt: bulkTxt(q, m.k, mj), ptxt: mj === 't' ? '' : 'ár: ' + fmt(q, 2) + ' t alapján', noprice: !P.p };
  }
  return { k: m.k, name: P.n, q, u: P.u, pack, packs, pn: P.pn, price: P.p, cost, qtxt, ptxt, noprice: !P.p };
}
const mjPref = () => LS.get('ek_mj', 'm3');
function aggregate(tetelek) {
  const map = new Map();
  for (const t of tetelek) for (const m of (t.mats || [])) {
    const key = m.k === '_egyeb' ? '_e|' + (m.n || '') + '|' + (m.u || '') + '|' + (m.p || 0) + '|' + (m.cat || '') : m.k;
    const cur = map.get(key);
    if (cur) cur.q += Number(m.q) || 0; else map.set(key, Object.assign({}, m, { q: Number(m.q) || 0 }));
  }
  const ls = [...map.values()].map(line);
  ls.sort((a, b) => (mat(a.k).g || '').localeCompare(mat(b.k).g || '', 'hu') || a.name.localeCompare(b.name, 'hu'));
  return ls;
}
const sumCost = (ls) => ls.reduce((s, l) => s + (l.cost || 0), 0);

/* ---------- Szerver ---------- */
async function api(action, payload) {
  const res = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ kod: S.kod, action }, payload || {})) });
  let j; try { j = await res.json(); } catch (e) { const er = new Error('Érvénytelen válasz a szervertől'); er.server = true; throw er; }
  if (!j.ok) { const er = new Error(j.error || 'Szerverhiba'); er.server = true; er.auth = j.auth; throw er; }
  return j;
}
function enqueue(action, payload) {
  if (LOCAL) return;
  S.queue.push({ action, payload }); saveQueue(); flush();
}
async function flush() {
  if (LOCAL || S.syncing || !S.queue.length || !S.kod) { updateSync(); return; }
  S.syncing = true; updateSync();
  try {
    while (S.queue.length) {
      const q = S.queue[0];
      try { await api(q.action, q.payload); S.queue.shift(); saveQueue(); S.lastErr = ''; }
      catch (e) {
        if (e.server) { S.queue.shift(); saveQueue(); S.lastErr = e.message; toast('Mentési hiba: ' + e.message); if (e.auth) { logout(); break; } }
        else { S.lastErr = 'Nincs kapcsolat – a módosítások várakoznak'; break; }
      }
    }
  } finally { S.syncing = false; updateSync(); }
}
async function load(force) {
  if (LOCAL) { S.loaded = true; render(); return; }
  if (!S.kod) { render(); return; }
  await flush();
  if (S.queue.length && !force) { S.loaded = true; render(); return; }
  try {
    S.syncing = true; updateSync();
    const j = await api('load');
    if (j.alapkod) { S.kodBeallitas = true; return; }
    const arl = {};
    for (const r of (j.arlista || [])) arl[r.kulcs] = { n: r.anyag, g: r.csoport, u: r.egyseg, pack: r.kiszereles, pn: r.kiszNev, p: r.ar, megj: r.megj };
    const be = j.beallitas || {};
    S.data = { ceg: safeJson(be.ceg, {}), logo: be.logo || '', sablonok: safeJson(be.sablonok, []), projektek: (j.projektek || []).map(p => Object.assign(p, { aj: safeJson(p.aj, {}), helyisegek: safeJson(p.helyisegek, []), fotok: safeJson(p.fotok, []), szamla: safeJson(p.szamla, null) })), tetelek: (j.tetelek || []).map(t => Object.assign(t, { values: safeJson(t.values, {}), mats: safeJson(t.mats, []), out: safeJson(t.out, []) })), arlista: arl,
      kuka: (j.kuka || []).map(k => ({ id: k.id, tipus: k.tipus, nev: k.nev, torolve: k.torolve, adat: safeJson([1, 2, 3, 4, 5, 6, 7, 8].map(i => k['adat' + i] || '').join(''), {}) })),
      ugyfelek: j.ugyfelek || [], munkareszek: (j.munkareszek || []).map(m => Object.assign(m, { ajanlatban: !(m.ajanlatban === false || m.ajanlatban === 'FALSE' || m.ajanlatban === 'false'), sorrend: Number(m.sorrend) || 0 })) };
    saveCache(); S.lastErr = ''; S.loaded = true;
    migrateData(); kukaLejart();
    const hianyzo = Object.keys(MATERIALS).filter(k => !arl[k]);
    if (hianyzo.length) enqueue('saveArak', { items: hianyzo.map(k => arRow(k, MATERIALS[k])) });
  } catch (e) {
    S.lastErr = e.message;
    if (e.auth) { logout(); toast('Hibás kód'); }
    else if (!e.server) S.lastErr = 'Offline – a tárolt adatokat látod';
  } finally { S.syncing = false; updateSync(); render(); }
}
function safeJson(x, d) { if (typeof x !== 'string') return x == null ? d : x; try { return JSON.parse(x); } catch (e) { return d; } }
function arRow(k, P) { return { kulcs: k, csoport: P.g, anyag: P.n, egyseg: P.u, kiszereles: P.pack, kiszNev: P.pn, ar: P.p, megj: P.megj || '' }; }
function logout() { S.kod = ''; LS.del('ek_kod'); render(); }

/* ---------- Adatműveletek ---------- */
function upsertProjekt(p) {
  p.modositva = now(); if (!p.letrehozva) p.letrehozva = p.modositva;
  const i = S.data.projektek.findIndex(x => x.id === p.id);
  if (i >= 0) S.data.projektek[i] = p; else S.data.projektek.unshift(p);
  saveCache(); enqueue('saveProjekt', { p: Object.assign({}, p, { aj: JSON.stringify(p.aj || {}), ajAllapot: (p.aj && p.aj.allapot) || '', helyisegek: JSON.stringify(p.helyisegek || []), fotok: JSON.stringify(p.fotok || []),
    szamla: p.szamla ? JSON.stringify(p.szamla) : '', szamlaSzam: (p.szamla && p.szamla.szam) || '', szamlaKelt: (p.szamla && p.szamla.kelt) || '', szamlaHatarido: (p.szamla && p.szamla.hatarido) || '', szamlaOsszeg: (p.szamla && p.szamla.osszeg) || '', kifizetve: (p.szamla && p.szamla.fizetve) || '' }) });
}
function deleteProjekt(id) {
  S.data.projektek = S.data.projektek.filter(p => p.id !== id);
  S.data.tetelek = S.data.tetelek.filter(t => t.projektId !== id);
  S.data.munkareszek = S.data.munkareszek.filter(m => m.projektId !== id);
  saveCache(); enqueue('deleteProjekt', { id });
}
function upsertUgyfel(u) {
  u.modositva = now(); if (!u.letrehozva) u.letrehozva = u.modositva;
  const i = S.data.ugyfelek.findIndex(x => x.id === u.id);
  if (i >= 0) S.data.ugyfelek[i] = u; else S.data.ugyfelek.push(u);
  saveCache(); enqueue('saveUgyfel', { u });
}
function deleteUgyfel(id) { S.data.ugyfelek = S.data.ugyfelek.filter(u => u.id !== id); saveCache(); enqueue('deleteUgyfel', { id }); }
function upsertMunkaresz(m) {
  m.modositva = now(); if (!m.letrehozva) m.letrehozva = m.modositva;
  const i = S.data.munkareszek.findIndex(x => x.id === m.id);
  if (i >= 0) S.data.munkareszek[i] = m; else S.data.munkareszek.push(m);
  saveCache(); enqueue('saveMunkaresz', { m });
}
function deleteMunkaresz(id) {
  S.data.munkareszek = S.data.munkareszek.filter(m => m.id !== id);
  S.data.tetelek = S.data.tetelek.filter(t => t.munkareszId !== id);
  saveCache(); enqueue('deleteMunkaresz', { id });
}
function upsertTetel(t) {
  t.modositva = now(); if (!t.letrehozva) t.letrehozva = t.modositva;
  const ls = (t.mats || []).map(line); t.koltseg = Math.round(sumCost(ls));
  const i = S.data.tetelek.findIndex(x => x.id === t.id);
  if (i >= 0) S.data.tetelek[i] = t; else S.data.tetelek.push(t);
  const p = S.data.projektek.find(x => x.id === t.projektId);
  if (p) { p.modositva = t.modositva; }
  saveCache();
  const calc = CALC_BY_ID[t.calc];
  enqueue('saveTetel', {
    t: Object.assign({}, t, { values: JSON.stringify(t.values || {}), mats: JSON.stringify(t.mats || []), out: JSON.stringify(t.out || []) }),
    projektNev: p ? megrLabel(p) : '', kalkNev: calc ? calc.n : 'Egyéb tétel',
    eredmeny: (t.out || []).map(o => o[0] + ': ' + o[1]).join('; '),
    sorok: ls.map(l => [l.name, round3(l.q), l.u, l.pn || '', l.packs == null ? '' : l.packs, l.price, Math.round(l.cost)])
  });
}
const round3 = (x) => Math.round(x * 1000) / 1000;
function deleteTetel(id) {
  S.data.tetelek = S.data.tetelek.filter(t => t.id !== id); saveCache(); enqueue('deleteTetel', { id });
}
const isEgyedi = (k) => !MATERIALS[k];
const allMatKeys = () => Object.keys(MATERIALS).concat(Object.keys(S.data.arlista).filter(k => isEgyedi(k) && S.data.arlista[k]));
const allGroups = () => [...new Set(allMatKeys().map(k => mat(k).g))];
function deleteAr(k) { delete S.data.arlista[k]; saveCache(); enqueue('deleteAr', { kulcs: k }); }
function saveCeg(ceg) { S.data.ceg = ceg; saveCache(); enqueue('saveBeallitas', { kulcs: 'ceg', ertek: JSON.stringify(ceg) }); }
function saveLogo(dataUrl) { S.data.logo = dataUrl || ''; saveCache(); enqueue('saveBeallitas', { kulcs: 'logo', ertek: S.data.logo }); }
function saveAr(k, o) {
  S.data.arlista[k] = o; saveCache();
  enqueue('saveArak', { items: [arRow(k, mat(k))] });
}

/* ---------- Navigáció ---------- */
function go(route) { S.stack.push(route); history.pushState({ d: S.stack.length }, ''); render(); window.scrollTo(0, 0); }
function back() { if (S.stack.length > 1) { S.stack.pop(); render(); } }
window.addEventListener('popstate', () => { if (!$('#szg').hidden) { closeSzg(); return; } if ($('#quote') && !$('#quote').hidden) { closeQuote(); return; } if (!$('#modal').hidden) { closeModal(); return; } back(); });
function setTab(tab) { S.tab = tab; S.stack = [{ v: tab }]; render(); window.scrollTo(0, 0); }
document.querySelectorAll('nav.bottom button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
$('#btnBack').onclick = () => back();
$('#btnTheme').onclick = () => { const d = document.documentElement.classList.toggle('dark'); try { localStorage.setItem('ek_tema', d ? 'sotet' : 'vilagos'); } catch (e) {} themeIcon(); };
function navMove() {
  const nav = $('nav.bottom'); const bs = [...nav.querySelectorAll('button')];
  const i = Math.max(0, bs.findIndex(b => b.dataset.tab === S.tab));
  bs.forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-current', j === i ? 'page' : 'false'); });
  const x = ((i + 0.5) * 100 / bs.length) + '%';
  if (nav.style.getPropertyValue('--nx') !== x) {
    nav.style.setProperty('--nx', x);
    const bub = nav.querySelector('.nb-bubble'); bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop');
  }
}
const IC_SUN = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';
const IC_MOON = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.7 6.7 0 0 0 10.7 10.7z"/></svg>';
function themeIcon() { const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = document.documentElement.classList.contains('dark') ? '#100D0E' : '#3F3937'; $('#btnTheme').innerHTML = document.documentElement.classList.contains('dark') ? IC_SUN : IC_MOON; }
$('#btnSync').onclick = () => { if (LOCAL) setTab('tobb'); else load(true); };
window.addEventListener('online', () => flush());
window.addEventListener('offline', updateSync);

function updateSync() {
  const b = $('#btnSync');
  if (LOCAL) { b.textContent = '📱 Helyi'; b.title = 'Helyi mód – az adatok csak ezen az eszközön vannak'; return; }
  if (!S.kod || S.kodBeallitas) { b.textContent = ''; b.hidden = true; return; }
  b.hidden = false;
  if (S.syncing) b.textContent = '⟳ Szinkron…';
  else if (S.queue.length) b.textContent = '⏳ ' + S.queue.length + ' várakozik';
  else if (!navigator.onLine) b.textContent = '⚠ Offline';
  else if (S.lastErr) b.textContent = '⚠ Hiba';
  else b.textContent = '✓ Mentve';
  b.title = S.lastErr || '';
}

/* ---------- Közös UI ---------- */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600); }
function openModal(html, bind) { $('#modalBody').innerHTML = '<button class="sheet-szg" title="Számológép" onmousedown="event.preventDefault()" onclick="openSzg()">' + $('#btnSzg').innerHTML + '</button>' + html; $('#modal').hidden = false; if (bind) bind($('#modalBody')); }
function closeModal() { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
function priceInput(el) { el.addEventListener('input', () => { const d = el.value.replace(/\D/g, ''); el.value = d ? dotted(d) : ''; }); }
const priceVal = (el) => Number(String(el.value).replace(/\D/g, '')) || 0;
function setHeader(title, sub) {
  $('#hdrTitle').textContent = title; $('#hdrSub').textContent = sub || '';
  $('#btnBack').hidden = S.stack.length <= 1;
  navMove();
}
function matsTable(ls, opts) {
  opts = opts || {};
  if (!ls.length) return '<div class="muted small">Nincs anyagtétel.</div>';
  let h = '<table class="mt"><tr><th>Anyag</th><th class="n">Mennyiség</th><th class="n">Költség</th></tr>';
  for (const l of ls) {
    h += '<tr><td>' + esc(l.name) + (l.ptxt ? '<br><small>' + esc(l.ptxt) + '</small>' : '') + '</td><td class="n">' + esc(l.qtxt) + '</td><td class="n' + (l.noprice ? ' noprice' : '') + '">' + (l.noprice ? 'nincs ár' : ft(l.cost)) + '</td></tr>';
  }
  h += '<tr class="tot"><td>Összesen</td><td></td><td class="n">' + ft(sumCost(ls)) + '</td></tr></table>';
  if (ls.some(l => l.noprice)) h += '<div class="small muted" style="margin-top:6px">A „nincs ár” sorokhoz az Árlista fülön adhatsz árat.</div>';
  return h;
}

/* ---------- Render ---------- */
function render() {
  themeIcon(); updateSync();
  const nav = $('nav.bottom');
  if (!LOCAL && !S.kod) { nav.hidden = true; return renderLogin(); }
  if (!LOCAL && S.kodBeallitas) { nav.hidden = true; return renderKodBeallit(); }
  nav.hidden = false;
  const r = S.stack[S.stack.length - 1];
  ({ kalk: renderKalk, calc: renderCalc, proj: (x) => renderUgyfelek(x), ugyfel: (x) => renderUgyfel(x), projekt: (x) => renderMegrendeles(x), munkaresz: (x) => renderMunkaresz(x), szamla: (x) => renderSzamla(x), kuka: () => renderKuka(), ar: renderAr, tobb: renderTobb, ceg: (x) => renderCeg(x), ajanlat: (x) => renderAjanlat(x) }[r.v] || renderKalk)(r);
}

function renderLogin() {
  setHeader(CONFIG.APP_NAME, 'Belépés');
  $('#btnBack').hidden = true;
  $('#view').innerHTML = '<div class="card" style="margin-top:30px"><h3 style="margin-top:0">Belépés</h3><p class="muted small">Add meg a kódodat. Első belépéskor az alapkódot – utána kérni fogja a végleges kódot, amit az app megjegyez.</p>' +
    '<div class="fld"><input id="kod" type="password" autocomplete="current-password" placeholder="Kód"></div><button class="btn pri wide" id="belep" style="width:100%">Belépés</button><div id="lerr" class="small" style="color:var(--err);margin-top:8px"></div></div>';
  const go_ = async () => {
    const k = $('#kod').value.trim(); if (!k) return;
    $('#belep').disabled = true; $('#lerr').textContent = '';
    S.kod = k;
    try {
      const j = await api('ping');
      if (j.alapkod) { S.kodBeallitas = true; render(); return; }
      LS.set('ek_kod', k); render(); load(true);
    }
    catch (e) { S.kod = ''; $('#lerr').textContent = e.server ? (e.auth ? 'Hibás kód.' : e.message) : 'Nem érem el a szervert. Ellenőrizd a netet és a config.js-ben az API_URL-t.'; $('#belep').disabled = false; }
  };
  $('#belep').onclick = go_; $('#kod').onkeydown = e => { if (e.key === 'Enter') go_(); };
}

function kodUrlap(pre) {
  return '<div class="fld"><label>Új kód (legalább 4 karakter)</label><input id="' + pre + '1" type="password" autocomplete="new-password"></div>' +
    '<div class="fld"><label>Új kód még egyszer</label><input id="' + pre + '2" type="password" autocomplete="new-password"></div>';
}
async function kodMentes(pre, root, gomb, hiba) {
  const a = $('#' + pre + '1', root).value.trim(), b = $('#' + pre + '2', root).value.trim();
  hiba.textContent = '';
  if (a.length < 4) { hiba.textContent = 'Legalább 4 karakter legyen.'; return false; }
  if (a !== b) { hiba.textContent = 'A két kód nem egyezik.'; return false; }
  gomb.disabled = true;
  try { await api('setKod', { uj: a }); S.kod = a; LS.set('ek_kod', a); return true; }
  catch (e) { hiba.textContent = e.server ? e.message : 'Nincs kapcsolat a szerverrel – próbáld újra.'; gomb.disabled = false; return false; }
}
function renderKodBeallit() {
  setHeader(CONFIG.APP_NAME, 'Végleges kód beállítása');
  $('#btnBack').hidden = true;
  $('#view').innerHTML = '<div class="card" style="margin-top:30px"><h3 style="margin-top:0">Végleges kód</h3><p class="muted small">Az alapkóddal léptél be. Most adj meg egy saját kódot – ettől kezdve csak ezzel lehet belépni, az alapkód megszűnik. Ezen az eszközön az app megjegyzi, nem kell újra beírnod.</p>' +
    kodUrlap('vk') + '<button class="btn pri" id="vkok" style="width:100%">Kód mentése</button><div id="vkerr" class="small" style="color:var(--err);margin-top:8px"></div></div>';
  $('#vkok').onclick = async () => {
    if (await kodMentes('vk', document, $('#vkok'), $('#vkerr'))) { S.kodBeallitas = false; toast('Kód beállítva'); render(); load(true); }
  };
}

/* ----- Kalkulátor lista ----- */
function renderKalk() {
  const tmr = S.targetMr && mrById(S.targetMr);
  if (S.targetMr && !tmr) S.targetMr = null;
  setHeader(CONFIG.APP_NAME, tmr ? 'Kalkuláció hozzáadása' : 'Válassz kalkulátort');
  const q = S.kalkKeres.toLowerCase();
  let h = '';
  if (tmr) h += '<div class="banner">📁 Ide mentesz: <b>' + esc(tmr.nev) + '</b>&nbsp;· ' + esc(ugyfelNev(megrOf(tmr))) + '<button class="btn sm" id="tpx">Mégse</button></div>';
  h += '<input class="search" id="kk" placeholder="Keresés (pl. csempe, beton, festék)…" value="' + esc(S.kalkKeres) + '">';
  for (const [gid, gn] of GROUPS) {
    const cs = CALCS.filter(c => c.g === gid && (!q || (c.n + ' ' + c.desc).toLowerCase().includes(q)));
    if (!cs.length) continue;
    h += '<h2>' + esc(gn) + '</h2><div class="grid">' + cs.map(c => '<button class="tile g-' + c.g + '" data-c="' + c.id + '"><span class="ic">' + c.i + '</span><b>' + esc(c.n) + '</b></button>').join('') + '</div>';
  }
  if (q && !CALCS.some(c => (c.n + ' ' + c.desc).toLowerCase().includes(q))) h += '<div class="empty">Nincs ilyen kalkulátor.</div>';
  $('#view').innerHTML = h;
  const kk = $('#kk'); kk.oninput = () => { S.kalkKeres = kk.value; const pos = kk.selectionStart; renderKalk(); const n = $('#kk'); n.focus(); n.setSelectionRange(pos, pos); };
  if (tmr) $('#tpx').onclick = () => { S.targetMr = null; renderKalk(); };
  document.querySelectorAll('.tile[data-c]').forEach(b => b.onclick = () => openCalc(b.dataset.c));
}
function openCalc(id, tetel) {
  const c = CALC_BY_ID[id]; if (!c) return;
  const saved = !tetel ? LS.get('ek_utolso_' + id, null) : null;
  const v0 = Object.assign(defaults(c), saved || {}, tetel ? tetel.values : {});
  if (c.fields.some(f => f.id === 'mj')) v0.mj = mjPref();
  const tmr = !tetel && S.targetMr && mrById(S.targetMr);
  S.calc = { id, v: v0, tetelId: tetel ? tetel.id : null, projektId: tetel ? tetel.projektId : (tmr ? tmr.projektId : null), mrId: tetel ? tetel.munkareszId : (tmr ? tmr.id : null), nev: tetel ? tetel.nev : '' };
  go({ v: 'calc' });
}

/* ----- Egy kalkulátor ----- */
function renderCalc() {
  const st = S.calc; if (!st) return back();
  const c = CALC_BY_ID[st.id];
  const p = st.projektId && S.data.projektek.find(x => x.id === st.projektId);
  setHeader(c.n, st.tetelId ? 'Tétel szerkesztése' + (p ? ' · ' + p.nev : '') : (p ? 'Projekt: ' + p.nev : ''));
  let h = '<p class="desc">' + esc(c.desc) + '</p><div class="card" id="form"></div><div id="res"></div><div id="munka"></div><div id="calcTot"></div>';
  h += '<div class="btns"><button class="btn pri wide" id="ment">' + (st.tetelId ? 'Módosítás mentése' : 'Mentés projektbe') + '</button>' +
    (st.tetelId ? '<button class="btn" id="ujkent">Mentés újként</button>' : '') +
    '<button class="btn" id="alap">Alapértékek</button></div>';
  if (st.tetelId) h += '<div class="btns"><button class="btn danger" id="torol">Tétel törlése</button></div>';
  $('#view').innerHTML = h;
  renderForm(); renderMunka(); renderRes();
  $('#ment').onclick = () => saveDialog(false);
  if (st.tetelId) {
    $('#ujkent').onclick = () => saveDialog(true);
    $('#torol').onclick = () => torlesKerdes('tetel', st.tetelId, () => back());
  }
  $('#alap').onclick = () => { st.v = defaults(c); LS.del('ek_utolso_' + c.id); renderForm(); renderMunka(); renderRes(); };
}
function renderForm() {
  const st = S.calc, c = CALC_BY_ID[st.id], v = st.v;
  let h = roomPickerHtml(c, v);
  for (const f of c.fields) {
    if (f.show && !f.show(v)) continue;
    const help = f.help ? '<span class="help">' + esc(f.help) + '</span>' : '';
    if (f.t === 'hdr') h += '<div class="f hdr">' + esc(f.l) + '</div>';
    else if (f.t === 'num') {
      h += '<div class="f' + (f.nyHelp ? ' hasSub' : '') + '"><label for="f_' + f.id + '">' + esc(f.l) + help + '</label><span class="in"><input id="f_' + f.id + '" data-id="' + f.id + '"' + (f.nyHelp ? ' data-ny="1"' : '') + ' inputmode="decimal" autocomplete="off" value="' + esc(numStr(v[f.id])) + '"><span class="u">' + esc(f.u || '') + '</span></span></div>';
      if (f.nyHelp) h += '<div class="f-sub"><button class="btn sm" data-nyh="' + f.id + '">📐 Nyílások listából</button><span class="small muted" id="nys_' + f.id + '">' + esc(nySummary(v)) + '</span></div>';
    }
    else if (f.t === 'sel') h += '<div class="f sel"><label for="f_' + f.id + '">' + esc(f.l) + help + '</label><select id="f_' + f.id + '" data-id="' + f.id + '">' + f.opts.map(o => '<option value="' + esc(o[0]) + '"' + (String(v[f.id]) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>';
    else if (f.t === 'chk') h += '<div class="f"><label for="f_' + f.id + '">' + esc(f.l) + help + '</label><label class="sw"><input type="checkbox" id="f_' + f.id + '" data-id="' + f.id + '"' + (v[f.id] ? ' checked' : '') + '><i></i></label></div>';
  }
  const form = $('#form'); form.innerHTML = h;
  form.querySelectorAll('input[inputmode]').forEach(el => el.addEventListener('input', () => {
    v[el.dataset.id] = parseNum(el.value);
    if (el.dataset.ny && v.nyl && v.nyl.length) { v.nyl = []; const sm = $('#nys_' + el.dataset.id); if (sm) sm.textContent = ''; el.dataset.relist = '1'; }
    remember(); renderRes();
  }));
  form.querySelectorAll('input[data-ny]').forEach(el => el.addEventListener('change', () => { if (el.dataset.relist) renderForm(); }));
  form.querySelectorAll('[data-nyh]').forEach(b => b.onclick = () => openNyilas(b.dataset.nyh));
  bindRoomPicker(c, v);
  form.querySelectorAll('input[inputmode]').forEach(el => el.addEventListener('focus', () => el.select()));
  form.querySelectorAll('select:not(#f__room)').forEach(el => el.onchange = () => { v[el.dataset.id] = el.value; if (el.dataset.id === 'mj') LS.set('ek_mj', el.value); remember(); renderForm(); renderRes(); });
  form.querySelectorAll('input[type=checkbox]').forEach(el => el.onchange = () => { v[el.dataset.id] = el.checked; remember(); renderForm(); renderRes(); });
}
function nySummary(v) {
  const st = nyStats(v); if (!st.list) return '';
  return st.n + ' nyílás · ' + fmt(st.m2, 2) + ' m² · kerület ' + fmt(st.ker, 1) + ' m';
}
function openNyilas(fid) {
  const v = S.calc.v;
  openNyEditor(v.nyl, (rows) => {
    const st = nyStats({ nyl: rows });
    const fdef = CALC_BY_ID[S.calc.id].fields.find(f => f.id === fid);
    v.nyl = rows; v[fid] = Math.round((fdef && fdef.nyHelp === 'ajto' ? st.ajtoSz : st.m2) * 100) / 100;
    remember(); renderForm(); renderMunka(); renderRes();
  });
}
function remember() { if (S.calc && !S.calc.tetelId) LS.set('ek_utolso_' + S.calc.id, S.calc.v); }
// Teljes eredmény: anyagok + (ha be van kapcsolva) a kalkulációhoz tartozó munkadíj
function fullResult(c, v) {
  const r = computeSafe(c, v);
  r.munka = null;
  if (c.md && v.mdOn !== false) {
    const key = v.mdK && mat(v.mdK) && isMunkaKey(v.mdK) ? v.mdK : c.md; const P = mat(key);
    let mq = [0, '']; try { mq = c.mq(v); } catch (e) {}
    const auto = P.u === mq[1];
    const q = Math.round((auto ? mq[0] : nz(v.mdQ)) * 100) / 100;
    r.munka = { key, q, u: P.u, auto, mq };
    if (q > 0) r.mats = r.mats.concat([{ k: key, q }]);
  }
  return r;
}
function renderMunka() {
  const st = S.calc, c = CALC_BY_ID[st.id], v = st.v, box = $('#munka');
  if (!box) return;
  if (!c.md) { box.innerHTML = ''; return; }
  const on = v.mdOn !== false; const key = v.mdK && isMunkaKey(v.mdK) ? v.mdK : c.md; const P = mat(key);
  let mq = [0, '']; try { mq = c.mq(v); } catch (e) {}
  let h = '<h2>Munkadíj</h2><div class="card">' +
    '<div class="f"><label for="mdOn">Munkadíj számolása ehhez a tételhez</label><label class="sw"><input type="checkbox" id="mdOn"' + (on ? ' checked' : '') + '><i></i></label></div>';
  if (on) {
    h += '<div class="f sel"><label for="mdK">Díjtétel</label><select id="mdK">' + munkaKeys().map(k => '<option value="' + k + '"' + (k === key ? ' selected' : '') + '>' + esc(mat(k).n) + ' (' + ft(mat(k).p) + '/' + esc(mat(k).u) + ')</option>').join('') + '</select></div>';
    if (P.u !== mq[1]) h += '<div class="f"><label for="mdQ">Mennyiség</label><span class="in"><input id="mdQ" inputmode="decimal" value="' + esc(numStr(v.mdQ)) + '"><span class="u">' + esc(P.u) + '</span></span></div>';
    h += '<div class="small muted" id="mdInfo" style="padding-top:8px"></div>';
  }
  box.innerHTML = h + '</div>';
  $('#mdOn').onchange = (e) => { v.mdOn = e.target.checked; remember(); renderMunka(); renderRes(); };
  if (on) {
    $('#mdK').onchange = (e) => { v.mdK = e.target.value; remember(); renderMunka(); renderRes(); };
    const q = $('#mdQ'); if (q) { q.oninput = () => { v.mdQ = parseNum(q.value); remember(); renderRes(); }; q.onfocus = () => q.select(); }
  }
}
function computeSafe(c, v) { try { return c.compute(v); } catch (e) { console.error(e); return { out: [['Hiba', 'Ellenőrizd a megadott értékeket']], mats: [], warn: [] }; } }
function renderRes() {
  const st = S.calc, c = CALC_BY_ID[st.id];
  const r = fullResult(c, st.v); st.r = r;
  let h = '<h2>Eredmény</h2><div class="card res">' + r.out.map(o => '<div class="row"><span>' + esc(o[0]) + '</span><b>' + esc(o[1]) + '</b></div>').join('') + '</div>';
  for (const w of r.warn) h += '<div class="warn">' + esc(w) + '</div>';
  const ls = r.mats.map(line); const sc = splitCats(ls);
  if (sc.anyag.length) h += '<h2>Anyagok és költség</h2><div class="card">' + matsTable(sc.anyag) + '</div>';
  $('#res').innerHTML = h;
  const info = $('#mdInfo');
  if (info && r.munka) {
    const P = mat(r.munka.key);
    info.innerHTML = (r.munka.auto ? 'A kalkulációból: ' : '') + fmt(r.munka.q) + ' ' + esc(P.u) + ' × ' + ft(P.p) + ' = <b style="color:var(--text)">' + ft(r.munka.q * P.p) + '</b>' + (P.p ? '' : ' – <span class="noprice">nincs díj megadva (Árlista → Munkadíj)</span>');
  }
  const tot = $('#calcTot');
  if (tot) tot.innerHTML = sc.munka.length && sc.anyag.length ? '<div class="card hero"><div class="total"><span>Anyag + munkadíj</span><b>' + ft(sumCost(ls)) + '</b></div><div class="small muted" style="margin-top:4px">Anyag ' + ft(sumCost(sc.anyag)) + ' · munkadíj ' + ft(sumCost(sc.munka)) + '</div></div>' : '';
}
function saveDialog(asNew) {
  const st = S.calc, c = CALC_BY_ID[st.id];
  const megr = S.data.projektek.filter(p => isAktiv(p) || p.id === st.projektId);
  let sel = st.mrId || '';
  if (!sel || !mrById(sel)) { const p0 = megr[0]; const m0 = p0 && mrsOf(p0)[0]; sel = m0 ? m0.id : (p0 ? '_ujmr|' + p0.id : '_ujmeg'); }
  const opts = megr.map(p => '<optgroup label="' + esc(ugyfelNev(p) + ' · ' + (p.sorszam || '') + (p.nev ? ' · ' + p.nev : '')) + '">' +
    mrsOf(p).map(m => '<option value="' + m.id + '"' + (m.id === sel ? ' selected' : '') + '>' + esc(m.nev) + '</option>').join('') +
    '<option value="_ujmr|' + p.id + '"' + (sel === '_ujmr|' + p.id ? ' selected' : '') + '>+ Új munkarész ebben a megrendelésben…</option></optgroup>').join('');
  const h = '<h3>' + (st.tetelId && !asNew ? 'Módosítás mentése' : 'Mentés munkarészbe') + '</h3>' +
    '<div class="fld"><label>Hova kerüljön?</label><select id="mp">' + opts + '<option value="_ujmeg"' + (sel === '_ujmeg' ? ' selected' : '') + '>+ Új megrendelés…</option></select></div>' +
    '<div class="fld" id="ugw" hidden><label>Ügyfél</label><input id="mug" list="ugyfelLista" placeholder="Kezdd el gépelni a nevet…">' + ugyfelDatalist() + '</div>' +
    '<div class="fld" id="mrw" hidden><label>Munkarész neve</label><input id="mmr" placeholder="pl. Fürdőszoba-felújítás, Kisszoba festés"></div>' +
    '<div class="fld"><label>Tétel megnevezése</label><input id="mn" value="' + esc(st.nev && !asNew ? st.nev : (st.nev || c.n)) + '" placeholder="pl. Padlóburkolás"></div>' +
    '<div class="btns"><button class="btn pri wide" id="mok">Mentés</button><button class="btn" id="mx">Mégse</button></div>';
  openModal(h, m => {
    const upd = () => { const v = $('#mp', m).value; $('#ugw', m).hidden = v !== '_ujmeg'; $('#mrw', m).hidden = !(v === '_ujmeg' || v.startsWith('_ujmr|')); };
    $('#mp', m).onchange = upd; upd();
    $('#mx', m).onclick = closeModal;
    $('#mok', m).onclick = () => {
      const v = $('#mp', m).value; let mr;
      if (v === '_ujmeg') {
        const un = $('#mug', m).value.trim(); if (!un) { $('#mug', m).focus(); return; }
        const p = ujMegrendeles(ugyfelByNameOrNew(un));
        mr = ujMunkaresz(p, $('#mmr', m).value.trim() || c.n);
      } else if (v.startsWith('_ujmr|')) {
        mr = ujMunkaresz(S.data.projektek.find(x => x.id === v.split('|')[1]), $('#mmr', m).value.trim() || c.n);
      } else mr = mrById(v);
      if (!mr) return;
      const pid = mr.projektId; const pp = megrOf(mr);
      const r = fullResult(c, st.v);
      if (st.v._room && !roomById(pp, st.v._room)) delete st.v._room;
      const t = { id: st.tetelId && !asNew ? st.tetelId : uid('T'), projektId: pid, munkareszId: mr.id, calc: c.id, roomId: st.v._room || '', nev: $('#mn', m).value.trim() || c.n, values: Object.assign({}, st.v), mats: r.mats.map(x => ({ k: x.k, q: round3(x.q) })), out: r.out };
      const old = st.tetelId && !asNew && S.data.tetelek.find(x => x.id === st.tetelId);
      if (old) t.letrehozva = old.letrehozva;
      upsertTetel(t);
      closeModal();
      toast('Mentve: ' + mr.nev + ' · ' + ugyfelNev(pp));
      st.tetelId = t.id; st.projektId = pid; st.mrId = mr.id; st.nev = t.nev;
      if (S.targetMr) { S.targetMr = null; S.tab = 'proj'; S.stack = [{ v: 'proj' }, { v: 'projekt', id: pid }, { v: 'munkaresz', id: mr.id }]; render(); }
      else render();
    };
  });
}

function matOptions(sel) {
  return allGroups().map(g => '<optgroup label="' + esc(g) + '">' + allMatKeys().filter(k => mat(k).g === g).map(k => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(mat(k).n) + '</option>').join('') + '</optgroup>').join('');
}
function egyebDialog(mrId, t, pre) {
  const m0 = t && t.mats[0] || { k: pre || '_egyeb', n: '', q: 1, u: 'db', p: 0 };
  const mrx = mrById(mrId); const pid = mrx ? mrx.projektId : (t && t.projektId);
  const proj = S.data.projektek.find(x => x.id === pid); const rooms = roomsOf(proj);
  const rqSel = t && t.rq && t.roomId ? t.roomId + '|' + t.rq : '';
  const rqHtml = rooms.length ? '<div class="fld"><label>Mennyiség forrása</label><select id="erq"><option value="">Kézzel adom meg</option>' + rooms.map(r => '<optgroup label="' + esc(r.nev) + '">' + Object.keys(ROOM_Q).map(q => '<option value="' + r.id + '|' + q + '"' + (rqSel === r.id + '|' + q ? ' selected' : '') + '>' + esc(r.nev) + ': ' + ROOM_Q[q][0] + ' (' + fmt(ROOM_Q[q][1](r), 2) + ')</option>').join('') + '</optgroup>').join('') + '</select></div>' : '';
  const h = '<h3>' + (t ? 'Tétel' : pre ? 'Új munkadíj tétel' : 'Új egyéb tétel') + '</h3>' +
    '<div class="fld"><label>Forrás</label><select id="es"><option value="_egyeb"' + (m0.k === '_egyeb' ? ' selected' : '') + '>Kézi tétel (fuvar, bérlés, munkadíj…)</option>' + matOptions(m0.k) + '</select></div>' +
    '<div class="fld"><label>Megnevezés</label><input id="en" value="' + esc(t ? t.nev : '') + '" placeholder="pl. Fuvardíj, konténer, szerszámbérlés"></div>' +
 rqHtml +
    '<div class="row2"><div class="fld"><label>Mennyiség</label><input id="eq" inputmode="decimal" value="' + esc(numStr(m0.q)) + '"></div><div class="fld" id="euw"><label>Egység</label><input id="eu" value="' + esc(m0.u || '') + '" list="egysegek"></div></div>' +
    '<datalist id="egysegek"><option>db</option><option>alkalom</option><option>óra</option><option>nap</option><option>m²</option><option>fm</option><option>m³</option><option>t</option><option>kg</option><option>l</option></datalist>' +
    '<div class="fld" id="ecw"><label>Jellege</label><select id="ec"><option value="egyeb"' + (m0.cat !== 'munka' ? ' selected' : '') + '>Egyéb (anyag, fuvar, bérlés…)</option><option value="munka"' + (m0.cat === 'munka' ? ' selected' : '') + '>Munkadíj</option></select></div>' +
    '<div class="fld" id="epw"><label>Egységár (Ft)</label><input id="ep" inputmode="numeric" value="' + (m0.p ? dotted(m0.p) : '') + '"></div>' +
    '<div class="small muted" id="einfo" style="margin:-4px 0 10px"></div>' +
    '<div class="btns"><button class="btn pri wide" id="eok">Mentés</button><button class="btn" id="ex">Mégse</button></div>' +
    (t ? '<div class="btns"><button class="btn danger" id="edel">Tétel törlése</button></div>' : '');
  openModal(h, m => {
    priceInput($('#ep', m));
    let elozo = m0.k;
    const frissit = () => {
      const k = $('#es', m).value, kezi = k === '_egyeb';
      $('#euw', m).hidden = !kezi; $('#epw', m).hidden = !kezi; $('#ecw', m).hidden = !kezi;
      if (kezi) { $('#einfo', m).textContent = ''; }
      else {
        const P = mat(k), en = $('#en', m);
        if (!en.value.trim() || (elozo !== '_egyeb' && en.value === mat(elozo).n)) en.value = P.n;
        const l = line({ k, q: Number(parseNum($('#eq', m).value)) || 0 });
        $('#einfo', m).textContent = 'Mennyiség ' + P.u + '-ben. ' + (l.ptxt ? l.ptxt + ' → ' : '') + (P.p ? ft(l.cost) : 'nincs ár az árlistában');
      }
      elozo = k;
    };
    const rqUpd = () => { const e = $('#erq', m); if (!e) return; const [rid, q] = e.value.split('|'); const r = roomById(proj, rid); $('#eq', m).readOnly = !!r; if (r) $('#eq', m).value = numStr(r2(ROOM_Q[q][1](r))); frissit(); };
    if ($('#erq', m)) { $('#erq', m).onchange = rqUpd; rqUpd(); }
    $('#es', m).onchange = frissit; $('#eq', m).oninput = frissit; frissit();
    $('#ex', m).onclick = closeModal;
    $('#eok', m).onclick = () => {
      const k = $('#es', m).value;
      const n = $('#en', m).value.trim() || (k !== '_egyeb' ? mat(k).n : ''); if (!n) { $('#en', m).focus(); return; }
      const q = Number(parseNum($('#eq', m).value)) || 0;
      let mats, out;
      if (k === '_egyeb') { const u = $('#eu', m).value.trim(), pr = priceVal($('#ep', m)); mats = [{ k: '_egyeb', n, q, u, p: pr, cat: $('#ec', m).value }]; out = [['Mennyiség', fmt(q) + ' ' + u], ['Egységár', ft(pr)]]; }
      else { mats = [{ k, q }]; out = [['Mennyiség', fmt(q) + ' ' + mat(k).u]]; }
      const [rid, rq] = ($('#erq', m) ? $('#erq', m).value : '').split('|');
      const tt = { id: t ? t.id : uid('T'), projektId: pid, munkareszId: mrId, calc: 'egyeb', nev: n, values: {}, mats, out, letrehozva: t ? t.letrehozva : '', roomId: rid && rq ? rid : '', rq: rid && rq ? rq : '' };
      if (tt.rq) applyRoomToTetel(tt, roomById(proj, rid));
      upsertTetel(tt);
      closeModal(); render();
    };
    if (t) $('#edel', m).onclick = () => torlesKerdes('tetel', t.id, () => { closeModal(); render(); });
  });
}

/* ----- Export ----- */
function download(blob, name) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function shareList(p, agg) {
  if (!agg.length) return toast('Nincs anyag a listán');
  const txt = '🛒 ' + ugyfelNev(p) + ' – ' + megrLabel(p) + '\n' + agg.map(l => '• ' + l.name + ': ' + (l.ptxt || l.qtxt)).join('\n') + '\n\nBecsült összeg: ' + ft(sumCost(agg));
  if (navigator.share) { try { await navigator.share({ title: megrLabel(p), text: txt }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(txt); toast('Bevásárlólista a vágólapra másolva'); } catch (e) { openModal('<h3>Bevásárlólista</h3><textarea style="width:100%;min-height:240px">' + esc(txt) + '</textarea><div class="btns"><button class="btn" onclick="closeModal()">Bezár</button></div>'); }
}

/* ----- Árlista ----- */
function renderAr() {
  const keys0 = allMatKeys();
  setHeader('Árlista', keys0.length + ' anyag');
  const q = S.arKeres.toLowerCase();
  const keys = keys0.filter(k => !q || (mat(k).n + ' ' + mat(k).g).toLowerCase().includes(q));
  let h = '<div class="banner">ℹ️ Az induló árak csak minták. Koppints egy anyagra, és írd át a saját áradra. Ami hiányzik, a csoportoknál a „+ Új” gombbal veheted fel.</div>';
  h += '<input class="search" id="ak" placeholder="Anyag keresése…" value="' + esc(S.arKeres) + '">';
  const groups = q ? [...new Set(keys.map(k => mat(k).g))] : allGroups();
  for (const g of groups) {
    const gk = keys.filter(k => mat(k).g === g);
    h += '<div class="ghdr"><h2>' + esc(g) + '</h2><button class="btn sm" data-ujg="' + esc(g) + '">+ Új</button></div><div class="card list">' + (gk.length ? gk.map(k => {
      const P = mat(k); const unitTxt = P.pack > 0 ? '/ ' + P.pn : '/ ' + P.u;
      return '<div class="it" data-k="' + k + '"><div class="m"><b>' + esc(P.n) + (isEgyedi(k) ? '<span class="pill">saját</span>' : '') + '</b><small>' + esc(P.pack > 0 ? P.pn + ' · alapegység: ' + P.u : 'egységár: Ft/' + P.u) + (P.megj ? ' · ' + esc(P.megj) : '') + '</small></div><div class="v' + (P.p ? '' : ' noprice') + '">' + (P.p ? ft(P.p) : 'nincs ár') + '<small>' + esc(unitTxt) + '</small></div></div>';
    }).join('') : '<div class="muted small" style="padding:8px 2px">Nincs anyag.</div>') + '</div>';
  }
  if (!keys.length) h += '<div class="empty">Nincs találat.</div>';
  h += '<div class="btns" style="margin-top:14px"><button class="btn wide" id="ujcsop">+ Új anyag új csoportba</button></div>';
  $('#view').innerHTML = h;
  const ak = $('#ak'); ak.oninput = () => { S.arKeres = ak.value; const pos = ak.selectionStart; renderAr(); const n = $('#ak'); n.focus(); n.setSelectionRange(pos, pos); };
  document.querySelectorAll('[data-k]').forEach(el => el.onclick = () => arDialog(el.dataset.k));
  document.querySelectorAll('[data-ujg]').forEach(el => el.onclick = () => arDialog(null, el.dataset.ujg));
  $('#ujcsop').onclick = () => arDialog(null, '');
}
function arDialog(k, ujCsoport) {
  const uj = !k; const egyedi = uj || isEgyedi(k);
  const P = uj ? { n: '', g: ujCsoport, u: 'db', pack: 0, pn: '', p: 0, megj: '' } : mat(k);
  const D = !uj && MATERIALS[k];
  const csoportok = allGroups();
  const ujCs = egyedi && !P.g;
  const h = '<h3>' + (uj ? 'Új anyag' : esc(P.n)) + '</h3>' +
    '<div class="fld"><label>Megnevezés</label><input id="an" value="' + esc(P.n) + '" placeholder="pl. Csempeszegély alumínium"></div>' +
    (egyedi ? '<div class="fld"><label>Csoport</label><select id="ag">' + csoportok.map(g => '<option' + (g === P.g ? ' selected' : '') + '>' + esc(g) + '</option>').join('') + '<option value="_uj"' + (ujCs ? ' selected' : '') + '>+ Új csoport…</option></select></div>' +
      '<div class="fld" id="agw"' + (ujCs ? '' : ' hidden') + '><label>Új csoport neve</label><input id="agn" placeholder="pl. Villanyszerelés"></div>' +
      '<div class="fld"><label>Alapegység (ebben adod meg a mennyiséget)</label><input id="au" value="' + esc(P.u) + '" list="aegys"><datalist id="aegys"><option>db</option><option>kg</option><option>l</option><option>m²</option><option>fm</option><option>m³</option><option>t</option><option>szál</option><option>tekercs</option></datalist></div>' : '') +
    '<div class="row2"><div class="fld"><label>Kiszerelés neve</label><input id="apn" value="' + esc(P.pn) + '" placeholder="pl. zsák (25 kg)"></div>' +
    '<div class="fld"><label id="apkl">Kiszerelés (' + esc(P.u) + ')</label><input id="apk" inputmode="decimal" value="' + esc(numStr(P.pack)) + '"></div></div>' +
    '<div class="small muted" id="apinfo" style="margin:-4px 0 10px"></div>' +
    '<div class="fld"><label id="apl"></label><input id="ap" inputmode="numeric" value="' + (P.p ? dotted(Math.round(P.p)) : '') + '"></div>' +
    '<div class="fld"><label>Megjegyzés (pl. bolt, márka)</label><input id="am" value="' + esc(P.megj || '') + '"></div>' +
    '<div class="btns"><button class="btn pri wide" id="aok">Mentés</button><button class="btn" id="ax">Mégse</button></div>' +
    (D ? '<div class="btns"><button class="btn sm" id="ad">Minta érték visszaállítása (' + ft(D.p) + ')</button></div>' : '') +
    (!uj && egyedi ? '<div class="btns"><button class="btn danger" id="adel">Anyag törlése</button></div>' : '');
  openModal(h, m => {
    priceInput($('#ap', m));
    const egys = () => egyedi ? ($('#au', m).value.trim() || 'db') : P.u;
    const frissit = () => {
      const u = egys(), pk = Number(parseNum($('#apk', m).value)) || 0;
      $('#apkl', m).textContent = 'Kiszerelés (' + u + ')';
      $('#apinfo', m).textContent = 'Hány ' + u + ' van egy kiszerelésben. 0 = nincs kerekítés, ekkor az ár ' + u + '-re értendő.';
      $('#apl', m).textContent = 'Ár (Ft / ' + (pk > 0 ? 'kiszerelés' : u) + ')';
    };
    frissit(); $('#apk', m).oninput = frissit;
    if (egyedi) { $('#au', m).oninput = frissit; $('#ag', m).onchange = () => { $('#agw', m).hidden = $('#ag', m).value !== '_uj'; }; }
    $('#ax', m).onclick = closeModal;
    $('#aok', m).onclick = () => {
      const n = $('#an', m).value.trim(); if (!n && egyedi) { $('#an', m).focus(); return; }
      const o = { n: n || D.n, pn: $('#apn', m).value.trim(), pack: Number(parseNum($('#apk', m).value)) || 0, p: priceVal($('#ap', m)), megj: $('#am', m).value.trim() };
      if (egyedi) {
        let g = $('#ag', m).value;
        if (g === '_uj') { g = $('#agn', m).value.trim(); if (!g) { $('#agn', m).focus(); return; } }
        o.g = g; o.u = egys();
      }
      saveAr(k || uid('egyedi_'), o); closeModal(); render(); toast(uj ? 'Anyag hozzáadva' : 'Mentve');
    };
    if (D) $('#ad', m).onclick = () => { saveAr(k, { n: D.n, pn: D.pn, pack: D.pack, p: D.p, megj: '' }); closeModal(); render(); };
    if (!uj && egyedi) $('#adel', m).onclick = () => {
      const n = S.data.tetelek.filter(t => (t.mats || []).some(x => x.k === k)).length;
      if (!confirm('Törlöd a(z) „' + P.n + '” anyagot?' + (n ? ' ' + n + ' tétel használja – ott ár nélkül marad.' : ''))) return;
      deleteAr(k); closeModal(); render(); toast('Anyag törölve');
    };
  });
}

/* ----- Több ----- */
function renderTobb() {
  setHeader('Több', CONFIG.APP_NAME + ' ' + APP_VERSION);
  let h = '<h2>Adatok</h2><div class="card">';
  if (LOCAL) h += '<div class="kv"><span>Mód</span><b>Helyi (csak ez az eszköz)</b></div><div class="small muted" style="padding:6px 0">A Google Sheet bekötéséhez írd be a config.js-be az API_URL-t (Telepites.txt).</div>';
  else h += '<div class="kv"><span>Mód</span><b>Google Sheet</b></div><div class="kv"><span>Állapot</span><b>' + esc(S.syncing ? 'Szinkronizál…' : S.queue.length ? S.queue.length + ' módosítás várakozik' : S.lastErr || 'Minden mentve') + '</b></div>';
  h += '<div class="kv"><span>Ügyfelek / megrendelések / tételek</span><b>' + S.data.ugyfelek.length + ' / ' + S.data.projektek.length + ' / ' + S.data.tetelek.length + '</b></div></div>';
  h += '<div class="btns">' + (LOCAL ? '' : '<button class="btn wide" id="sync">⟳ Szinkron most</button>') + '</div>';
  h += '<h2>Árajánlat</h2><div class="card list"><div class="it" id="cegb"><span class="ic">🏢</span><div class="m"><b>Vállalkozói adatok és ajánlat-alapbeállítások</b><small>' + esc((S.data.ceg && S.data.ceg.nev) || 'Még nincs kitöltve – az árajánlat fejlécéhez kell') + '</small></div><span class="arrow">›</span></div></div>';
  h += '<h2>Törölt elemek</h2><div class="card list"><div class="it" id="kukab"><span class="ic">🗑</span><div class="m"><b>Törölt elemek (' + ((S.data.kuka || []).length) + ')</b><small>30 napig visszaállíthatók</small></div><span class="arrow">›</span></div></div>';
  h += '<h2>Megjelenés</h2><div class="card"><div class="kv"><span>Téma</span><b>' + (document.documentElement.classList.contains('dark') ? 'Sötét' : 'Világos') + ' – a fejléc ' + (document.documentElement.classList.contains('dark') ? '☀️' : '🌙') + ' gombjával váltasz</b></div></div>';
  if (!LOCAL) h += '<h2>Belépés</h2><div class="btns"><button class="btn wide" id="kodmod">🔑 Kód módosítása</button></div><div class="btns"><button class="btn danger" id="kilep">Kilépés (kód törlése erről az eszközről)</button></div>';
  h += '<h2>Eszköz</h2><div class="btns"><button class="btn danger" id="cache">Helyi adatok törlése</button></div>';
  h += '<h2>Névjegy</h2><div class="card small"><b>' + esc(CONFIG.APP_NAME) + ' ' + APP_VERSION + '</b><br><span class="muted">' + CALCS.length + ' kalkulátor, ' + allMatKeys().length + ' anyag. A számítások átlagos anyagszükségleti értékekkel dolgoznak, tájékoztató jellegűek – vásárlás előtt mindig nézd meg a gyártó terméklapját.</span></div>';
  $('#view').innerHTML = h;
  if (!LOCAL) {
    $('#sync').onclick = () => load(true).then(() => toast(S.lastErr ? S.lastErr : 'Szinkron kész'));
    $('#kodmod').onclick = () => openModal('<h3>Kód módosítása</h3><p class="muted small">Az új kód minden eszközön érvényes lesz; a többi eszközön újra be kell majd lépni vele.</p>' + kodUrlap('km') +
      '<div id="kmerr" class="small" style="color:var(--err);margin-bottom:8px"></div><div class="btns"><button class="btn pri wide" id="kmok">Mentés</button><button class="btn" id="kmx">Mégse</button></div>', m => {
      $('#kmx', m).onclick = closeModal;
      $('#kmok', m).onclick = async () => { if (await kodMentes('km', m, $('#kmok', m), $('#kmerr', m))) { closeModal(); toast('Új kód elmentve'); } };
    });
    $('#kilep').onclick = () => { if (confirm('Kilépsz? Az el nem küldött módosítások elvesznek.')) { S.queue = []; saveQueue(); logout(); } };
  }
  $('#cegb').onclick = () => go({ v: 'ceg' });
  $('#kukab').onclick = () => go({ v: 'kuka' });
  $('#cache').onclick = () => {
    const msg = LOCAL ? 'Helyi módban ez MINDEN projektet és árat töröl erről az eszközről. Biztos?' : 'Törlöd a helyi gyorsítótárat? A Sheetben lévő adatok megmaradnak, újratöltjük őket.' + (S.queue.length ? ' FIGYELEM: ' + S.queue.length + ' el nem küldött módosítás elveszik!' : '');
    if (!confirm(msg)) return;
    Object.keys(localStorage).filter(k => k.startsWith('ek_') && k !== 'ek_kod' && k !== 'ek_tema').forEach(k => localStorage.removeItem(k));
    S.data = { projektek: [], tetelek: [], arlista: {}, ceg: LOCAL ? {} : S.data.ceg, logo: LOCAL ? '' : S.data.logo }; S.queue = [];
    if (LOCAL) render(); else load(true);
  };
}

/* ---------- Indulás ---------- */
history.replaceState({ d: 1 }, '');
// minden script betöltése után indul (a megrendelés/helyiség modulok is kellenek)
window.addEventListener('DOMContentLoaded', () => { if (LOCAL) migrateData(); render(); load(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
