/* Metrum – tagolt címmezők (irányítószám → település) és lenyíló választólisták kézi bevitellel */

/* ---------- Közterület jellege ---------- */
const KOZT_JELLEG = ['utca', 'út', 'útja', 'tér', 'köz', 'körút', 'sor', 'sétány', 'fasor', 'dűlő', 'lakótelep', 'liget', 'park', 'lejtő', 'lépcső', 'sugárút', 'rakpart', 'part', 'udvar', 'zug', 'telep', 'tanya', 'major', 'határút', 'kert', 'sziget', 'árok', 'hrsz.'];
const KOZT_RX = new RegExp('^(.*?)\\s+(' + KOZT_JELLEG.concat(['u.', 'krt.', 'ltp.']).slice().sort((a, b) => b.length - a.length).map(x => x.replace('.', '\\.')).join('|') + ')(?:\\s+(.*))?$', 'i');
const ROMAI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII'];

// "2234 Maglód, Fő utca 12." → részekre
function cimParse(s) {
  const o = { irsz: '', telep: '', kozt: '', jelleg: '', hsz: '' };
  s = String(s || '').trim(); if (!s) return o;
  let m = s.match(/^(\d{4})\s+(.*)$/); if (m) { o.irsz = m[1]; s = m[2]; }
  const v = s.indexOf(',');
  if (v >= 0) { o.telep = s.slice(0, v).trim(); s = s.slice(v + 1).trim(); }
  else if (o.irsz) { const t = s.split(/\s+/); o.telep = t.shift() || ''; s = t.join(' '); }
  m = s.match(KOZT_RX);
  if (m) { o.kozt = m[1].trim(); o.jelleg = ({ 'u.': 'utca', 'krt.': 'körút', 'ltp.': 'lakótelep' })[m[2].toLowerCase()] || m[2].toLowerCase(); o.hsz = (m[3] || '').trim(); }
  else o.kozt = s;
  return o;
}
// részek → "2234 Maglód, Fő utca 12."
function cimOssze(o) {
  let hsz = (o.hsz || '').trim(); if (/^\d+$/.test(hsz)) hsz += '.';
  const utca = [o.kozt, o.jelleg, hsz].map(x => (x || '').trim()).filter(Boolean).join(' ');
  const tel = [o.irsz, o.telep].map(x => (x || '').trim()).filter(Boolean).join(' ');
  return [tel, utca].filter(Boolean).join(', ');
}

/* ---------- Irányítószám → település ---------- */
// Budapestet helyben számoljuk (1XYZ → XY. kerület), a többit a nyílt zippopotam.us adatbázisból kérdezzük le, és megjegyezzük.
let IRSZ_CACHE = null;
function irszCache() { if (!IRSZ_CACHE) { try { IRSZ_CACHE = JSON.parse(localStorage.getItem('metrum_irsz') || '{}'); } catch (e) { IRSZ_CACHE = {}; } } return IRSZ_CACHE; }
async function irszKeres(kod) {
  if (!/^\d{4}$/.test(kod)) return null;
  if (kod[0] === '1') { const k = Number(kod.slice(1, 3)); return k >= 1 && k <= 23 ? { nevek: ['Budapest'], megj: ROMAI[k] + '. kerület' } : null; }
  const c = irszCache(); if (c[kod]) return { nevek: c[kod] };
  try {
    const r = await fetch('https://api.zippopotam.us/hu/' + kod); if (!r.ok) return r.status === 404 ? { nevek: [] } : null;
    const j = await r.json(); const nevek = [...new Set((j.places || []).map(p => p['place name']).filter(Boolean))];
    c[kod] = nevek; try { localStorage.setItem('metrum_irsz', JSON.stringify(c)); } catch (e) { }
    return { nevek };
  } catch (e) { return null; } // offline: kézzel írja be
}

/* ---------- Címmezők ---------- */
function cimMezokHtml(px, ertek, cimke) {
  const o = cimParse(ertek);
  return '<div class="fld cimr" id="' + px + '_w"><label>' + esc(cimke || 'Cím') + '</label>' +
    '<div class="cimr-s"><input id="' + px + '_irsz" class="irsz" inputmode="numeric" maxlength="4" placeholder="Irsz." value="' + esc(o.irsz) + '">' +
    '<input id="' + px + '_telep" placeholder="Település" value="' + esc(o.telep) + '"></div>' +
    '<div class="small muted cimr-i" id="' + px + '_i"></div>' +
    '<div class="cimr-s"><input id="' + px + '_kozt" placeholder="Közterület neve" value="' + esc(o.kozt) + '">' +
    comboHtml(px + '_jelleg', o.jelleg, [['', KOZT_JELLEG]], 'jellege', 'jelleg') + '</div>' +
    '<div class="cimr-s"><input id="' + px + '_hsz" placeholder="Házszám, emelet, ajtó (pl. 12. 3/7)" value="' + esc(o.hsz) + '"></div></div>';
}
function cimMezokBind(m, px) {
  const g = (n) => $('#' + px + '_' + n, m), info = g('i');
  comboBind(m, px + '_jelleg');
  let autoTelep = '';
  const keres = async () => {
    const kod = g('irsz').value.trim(); info.textContent = '';
    if (!/^\d{4}$/.test(kod)) return;
    info.textContent = 'Keresem…';
    const r = await irszKeres(kod);
    if (g('irsz').value.trim() !== kod) return;
    if (!r) { info.textContent = 'Nem érem el az irányítószám-adatbázist – írd be a települést kézzel.'; return; }
    if (!r.nevek.length) { info.textContent = 'Ismeretlen irányítószám – ellenőrizd.'; return; }
    const tel = g('telep');
    const szabad = !tel.value.trim() || tel.value.trim() === autoTelep;
    if (r.nevek.length === 1) {
      if (szabad) { tel.value = autoTelep = r.nevek[0]; }
      info.textContent = r.megj ? '✓ ' + r.nevek[0] + ', ' + r.megj : '';
    } else {
      info.innerHTML = 'Több település tartozik hozzá: ' + r.nevek.map(n => '<button type="button" class="chip" data-tel="' + esc(n) + '">' + esc(n) + '</button>').join(' ');
      info.querySelectorAll('[data-tel]').forEach(b => b.onclick = () => { tel.value = autoTelep = b.dataset.tel; info.textContent = '✓ ' + b.dataset.tel; g('kozt').focus(); });
      if (szabad && !r.nevek.includes(tel.value.trim())) tel.value = autoTelep = '';
    }
    if (r.nevek.length === 1 && szabad && document.activeElement === g('irsz')) g('kozt').focus();
  };
  g('irsz').addEventListener('input', () => { g('irsz').value = g('irsz').value.replace(/\D/g, '').slice(0, 4); keres(); });
  if (g('irsz').value) keres();
  return {
    get: () => cimOssze({ irsz: g('irsz').value, telep: g('telep').value, kozt: g('kozt').value, jelleg: g('jelleg').value, hsz: g('hsz').value }),
    set: (s) => { const o = cimParse(s); ['irsz', 'telep', 'kozt', 'jelleg', 'hsz'].forEach(k => g(k).value = o[k]); autoTelep = ''; keres(); },
    ures: () => !['irsz', 'telep', 'kozt', 'hsz'].some(k => g(k).value.trim())
  };
}

/* ---------- Lenyíló lista kézi bevitellel ---------- */
// csoportok: [[csoportnév, [elemek]]]; a lista gépelés közben szűkül, de bármi beírható
function comboHtml(id, ertek, csoportok, ph, extraCls) {
  return '<div class="combo' + (extraCls ? ' ' + extraCls : '') + '" data-combo="' + id + '"><input id="' + id + '" autocomplete="off" value="' + esc(ertek || '') + '" placeholder="' + esc(ph || '') + '">' +
    '<button type="button" class="combo-b" tabindex="-1" aria-label="Lista">▾</button><div class="combo-l" hidden></div>' +
    '<script type="application/json">' + JSON.stringify(csoportok).replace(/</g, '\\u003c') + '</script></div>';
}
function comboBind(m, id, onPick, csoportokFn) {
  const w = m.querySelector('[data-combo="' + id + '"]'); if (!w) return;
  const inp = w.querySelector('input'), lst = w.querySelector('.combo-l');
  const alap = JSON.parse(w.querySelector('script').textContent);
  let szur = false;
  const rajzol = () => {
    const q = szur ? inp.value.trim().toLowerCase() : '';
    const cs = (csoportokFn ? csoportokFn() : []).concat(alap);
    let h = '';
    cs.forEach(([nev, el]) => {
      const t = el.filter(x => !q || x.toLowerCase().includes(q)); if (!t.length) return;
      if (nev) h += '<div class="combo-g">' + esc(nev) + '</div>';
      h += t.map(x => '<div class="combo-i" data-v="' + esc(x) + '">' + esc(x) + '</div>').join('');
    });
    lst.innerHTML = h || '<div class="combo-g">Nincs ilyen a listában – maradhat, amit beírtál</div>';
    lst.querySelectorAll('[data-v]').forEach(el => el.onmousedown = (e) => {
      e.preventDefault(); inp.value = el.dataset.v; lst.hidden = true;
      inp.dispatchEvent(new Event('input', { bubbles: true })); if (onPick) onPick(el.dataset.v);
    });
  };
  const nyit = (sz) => { szur = sz; rajzol(); lst.hidden = false; w.classList.add('nyitva'); };
  const zar = () => { lst.hidden = true; w.classList.remove('nyitva'); };
  w.querySelector('.combo-b').onmousedown = (e) => { e.preventDefault(); if (lst.hidden) { nyit(false); inp.focus(); } else zar(); };
  inp.addEventListener('input', (e) => { if (e.isTrusted) nyit(true); });
  inp.addEventListener('focus', () => { if (!inp.value) nyit(false); });
  inp.addEventListener('blur', () => setTimeout(zar, 120));
  inp.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'Enter') zar(); });
}

/* ---------- Megnevezés és munkarész javaslatok ---------- */
const HELYISEG_OPC = [
  ['Egész ingatlan', ['Lakásfelújítás', 'Házfelújítás', 'Teljes lakás', 'Teljes ház', 'Új építés', 'Bővítés', 'Tetőtér-beépítés']],
  ['Helyiségek', ['Nappali', 'Hálószoba', 'Gyerekszoba', 'Dolgozószoba', 'Vendégszoba', 'Konyha', 'Étkező', 'Fürdőszoba', 'WC', 'Előszoba', 'Közlekedő', 'Kamra', 'Gardrób', 'Mosókonyha', 'Lépcsőház']],
  ['Kiegészítő helyiségek', ['Erkély', 'Terasz', 'Loggia', 'Pince', 'Padlás', 'Tetőtér', 'Garázs', 'Kazánház', 'Műhely']],
  ['Kültér', ['Homlokzat', 'Tető', 'Lábazat', 'Kerítés', 'Kert', 'Kocsibeálló', 'Járda', 'Udvar']]
];
const MUNKARESZ_OPC = [
  ['Felújítás', ['Fürdőszoba-felújítás', 'Konyhafelújítás', 'WC-felújítás', 'Lakásfelújítás']],
  ['Festés, glettelés', ['Glettelés, festés', 'Szobafestés', 'Ajtók, ablakok mázolása', 'Radiátorfestés', 'Tapétázás', 'Homlokzatfestés']],
  ['Burkolás', ['Padlócsere', 'Hidegburkolás (csempe, járólap)', 'Laminált padló lerakása', 'Parkettázás', 'Teraszburkolás']],
  ['Szerkezet, szigetelés', ['Falazás', 'Vakolás', 'Aljzatbetonozás', 'Esztrichelés', 'Gipszkartonozás', 'Álmennyezet', 'Hőszigetelés', 'Homlokzati hőszigetelés', 'Vízszigetelés']],
  ['Villany', ['Villanyszerelés', 'Villanyhálózat felújítása', 'Szerelvénycsere', 'Lakáselosztó cseréje', 'Lámpák felszerelése']],
  ['Kültér', ['Térkövezés', 'Kerítésépítés', 'Kocsibeálló', 'Tetőfelújítás', 'Ereszcsatorna', 'Járdaépítés']]
];
const HELYISEG_NEVEK = new Set([].concat(...HELYISEG_OPC.slice(1).map(x => x[1])));
// ha a megnevezés egy helyiség, arra szabott javaslatok: "Konyha felújítása", "Konyha festése"…
function munkareszJavaslat(megnev) {
  const n = String(megnev || '').trim(); if (!HELYISEG_NEVEK.has(n)) return [];
  return [[n, ['felújítása', 'festése', 'glettelése, festése', 'burkolása', 'padlócseréje', 'villanyszerelése'].map(x => n + ' ' + x)]];
}
