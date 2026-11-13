/* Építőkalkulátor – számlázási összesítő (NEM számla!)
   A számlát a saját számlázóddal / a NAV Online Számlázóval állítod ki – ez az oldal minden adatot
   kimásolható formában elé készít, utána rögzíted a számlaszámot és a kifizetést. */

const FIZ_MODOK = ['Átutalás', 'Készpénz', 'Bankkártya'];
const addDays = (iso, n) => { const d = new Date(iso || Date.now()); d.setDate(d.getDate() + n); return isoDay(d); };
const plainNum = (n) => String(Math.round(n || 0));

function szamlaPill(p) {
  const s = p.szamla; if (!s || !s.szam) return '';
  if (s.fizetve) return '<span class="pill done">Kifizetve</span>';
  if (s.hatarido && s.hatarido < isoDay()) return '<span class="pill late">Lejárt fizetés</span>';
  return '<span class="pill warn">Fizetésre vár</span>';
}
const fizetesreVar = (p) => !!(p.szamla && p.szamla.szam && !p.szamla.fizetve);

// Összesítő sorai az ajánlat számításából (árrés, kedvezmény benne)
function szamlaSorok(p, o) {
  const aj = Object.assign(ajOf(p), { afa: o.afa });
  const Q = computeQuote(p, aj);
  const kulcs = o.afa === '27' ? 27 : 0;
  const rows = [];
  for (const b of Q.blocks) {
    if (o.bontas === 'munkaresz') rows.push({ nev: b.nev, q: 1, u: 'tétel', netto: b.total });
    else if (o.bontas === 'anyagmunka') {
      if (b.anyag) rows.push({ nev: b.nev + ' – anyag', q: 1, u: 'tétel', netto: b.anyag });
      if (b.munka) rows.push({ nev: b.nev + ' – munkadíj', q: 1, u: 'tétel', netto: b.munka });
    } else for (const r of b.rows) {
      const m = String(r.sub || '').match(/^([\d\s,.]+)\s*(.+)$/);
      const q = m ? Number(m[1].replace(/\s/g, '').replace(',', '.')) : 1;
      rows.push({ nev: (Q.blocks.length > 1 ? b.nev + ': ' : '') + r.nev, q: q > 0 ? q : 1, u: m && q > 0 ? m[2] : 'tétel', netto: r.total });
    }
  }
  if (Q.kedv) rows.push({ nev: 'Kedvezmény (' + fmt(aj.kedv) + '%)', q: 1, u: 'tétel', netto: -Q.kedv });
  for (const r of rows) { r.egysegar = r.q ? r.netto / r.q : r.netto; r.afa = Math.round(r.netto * kulcs / 100); r.brutto = r.netto + r.afa; }
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const brutto = sum('brutto');
  return { rows, netto: sum('netto'), afa: sum('afa'), brutto, kulcs, eloleg: nz(o.eloleg), fizetendo: brutto - nz(o.eloleg) };
}
const afaTxt = (afa) => afa === '27' ? '27%' : afa === 'aam' ? 'AAM (alanyi adómentes)' : 'Fordított adózás (FAD)';

function renderSzamla(r) {
  const p = S.data.projektek.find(x => x.id === r.id); if (!p) return back();
  const u = ugyfelOf(p) || {}; const aj = ajOf(p);
  const s = p.szamla || {};
  const o = Object.assign({ teljesites: p.kesz || isoDay(), hatarido: addDays(p.kesz || isoDay(), 8), fizmod: 'Átutalás', afa: aj.afa || cegOf().afa, bontas: 'anyagmunka', eloleg: 0 }, s.elok || {});
  setHeader('Számlázási összesítő', ugyfelNev(p) + ' · ' + (p.sorszam || ''));
  const cp = (txt, label) => '<button class="cpy" data-cp="' + esc(txt) + '" title="Másolás">' + (label || '📋') + '</button>';
  const sel = (id, l, opts, val) => '<div class="fld"><label>' + l + '</label><select id="s_' + id + '">' + opts.map(x => '<option value="' + x[0] + '"' + (String(val) === String(x[0]) ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div>';
  let h = '<div class="warn" style="border-left-color:var(--pri)">ℹ️ Ez <b>nem számla</b>, csak előkészítő. A számlát a számlázódban vagy a NAV Online Számlázóban állítsd ki – a 📋 gombokkal minden adatot átmásolhatsz. Utána alul rögzítsd a számlaszámot.</div>';
  if (s.szam) h += '<div class="card hero"><div class="total"><span>Kiállított számla</span><b>' + esc(s.szam) + '</b></div><div class="small muted" style="margin-top:4px">' + esc(['kelte ' + dateHu(s.kelt), 'bruttó ' + ft(s.osszeg), s.hatarido ? 'határidő ' + dateHu(s.hatarido) : '', s.fizetve ? 'kifizetve ' + dateHu(s.fizetve) : ''].filter(Boolean).join(' · ')) + '</div><div style="margin-top:8px">' + szamlaPill(p) + '</div></div>';
  h += '<h2>Beállítások</h2><div class="card"><div class="row2"><div class="fld"><label>Teljesítés dátuma</label><input type="date" id="s_teljesites" value="' + esc(o.teljesites) + '"></div><div class="fld"><label>Fizetési határidő</label><input type="date" id="s_hatarido" value="' + esc(o.hatarido) + '"></div></div>' +
    '<div class="row2">' + sel('fizmod', 'Fizetési mód', FIZ_MODOK.map(x => [x, x]), o.fizmod) + sel('afa', 'ÁFA', [['27', '27%'], ['aam', 'Alanyi adómentes'], ['ford', 'Fordított adózás']], o.afa) + '</div>' +
    sel('bontas', 'Számlasorok', [['anyagmunka', 'Munkarészenként anyag + munkadíj külön sorban'], ['munkaresz', 'Munkarészenként egy sor'], ['tetel', 'Tételenként (részletes)']], o.bontas) +
    '<div class="fld"><label>Előleg, amit már kiszámláztál (bruttó Ft) – levonásra kerül</label><input id="s_eloleg" inputmode="numeric" value="' + (o.eloleg ? dotted(o.eloleg) : '') + '" placeholder="0"></div></div>';
  h += '<div id="sz_body"></div>';
  h += '<h2>Kiállított számla rögzítése</h2><div class="card"><div class="row2"><div class="fld"><label>Számlaszám</label><input id="k_szam" value="' + esc(s.szam || '') + '" placeholder="pl. ABC-2026-15"></div><div class="fld"><label>Kelte</label><input type="date" id="k_kelt" value="' + esc(s.kelt || isoDay()) + '"></div></div>' +
    '<div class="f" style="border:0"><label for="k_fiz">Kifizetve</label><label class="sw"><input type="checkbox" id="k_fiz"' + (s.fizetve ? ' checked' : '') + '><i></i></label></div>' +
    '<div class="btns"><button class="btn pri wide" id="k_ok">Mentés</button>' + (s.szam ? '<button class="btn danger" id="k_del">Számla adatainak törlése</button>' : '') + '</div></div>';
  $('#view').innerHTML = h;
  priceInput($('#s_eloleg'));
  const read = () => ({ teljesites: $('#s_teljesites').value, hatarido: $('#s_hatarido').value, fizmod: $('#s_fizmod').value, afa: $('#s_afa').value, bontas: $('#s_bontas').value, eloleg: priceVal($('#s_eloleg')) });
  const body = () => {
    const x = read(); const Z = szamlaSorok(p, x);
    const vevo = [u.nev, u.cim, u.adoszam ? 'Adószám: ' + u.adoszam : 'Magánszemély'].filter(Boolean);
    let b = '<h2>Vevő</h2><div class="card">' + [['Név', u.nev], ['Cím', u.cim], ['Adószám', u.adoszam], ['E-mail', u.email]].filter(y => y[1]).map(y => '<div class="kv"><span>' + y[0] + '</span><b>' + esc(y[1]) + ' ' + cp(y[1]) + '</b></div>').join('') +
      (!u.adoszam ? '<div class="small muted" style="padding-top:6px">Adószám nélkül magánszemélyként kell kiállítani (a számlázóban „magánszemély” vevőtípus).</div>' : '') +
      (!u.cim ? '<div class="warn" style="margin:8px 0 0">A számlán a vevő címe kötelező – add meg az ügyfél adatainál.</div>' : '') + '</div>';
    b += '<h2>Fejléc</h2><div class="card">' + [['Teljesítés', x.teljesites ? x.teljesites.replace(/-/g, '.') : ''], ['Fizetési határidő', x.hatarido ? x.hatarido.replace(/-/g, '.') : ''], ['Fizetési mód', x.fizmod], ['ÁFA', afaTxt(x.afa)], ['Megrendelés / ajánlat', [p.sorszam, aj.szam].filter(Boolean).join(' / ')]]
      .map(y => '<div class="kv"><span>' + y[0] + '</span><b>' + esc(y[1]) + ' ' + cp(y[1]) + '</b></div>').join('') + '</div>';
    b += '<h2>Számlasorok</h2><div class="card list">' + Z.rows.map((r, i) => '<div class="szsor"><div class="szn"><b>' + (i + 1) + '. ' + esc(r.nev) + '</b> ' + cp(r.nev) + '</div>' +
      '<div class="szlg"><span>' + fmt(r.q) + ' ' + esc(r.u) + ' ' + cp(String(r.q).replace('.', ',')) + '</span><span>egységár ' + ft(r.egysegar) + ' ' + cp(plainNum(r.egysegar)) + '</span><span>nettó ' + ft(r.netto) + ' ' + cp(plainNum(r.netto)) + '</span>' + (Z.kulcs ? '<span>ÁFA ' + ft(r.afa) + '</span>' : '') + '<span><b>bruttó ' + ft(r.brutto) + '</b></span></div></div>').join('') + '</div>';
    b += '<div class="card hero"><div class="kv"><span>Nettó</span><b>' + ft(Z.netto) + ' ' + cp(plainNum(Z.netto)) + '</b></div>' + (Z.kulcs ? '<div class="kv"><span>ÁFA (27%)</span><b>' + ft(Z.afa) + ' ' + cp(plainNum(Z.afa)) + '</b></div>' : '') +
      '<div class="kv"><span>Bruttó</span><b>' + ft(Z.brutto) + ' ' + cp(plainNum(Z.brutto)) + '</b></div>' + (Z.eloleg ? '<div class="kv"><span>Előleg levonása</span><b>−' + ft(Z.eloleg) + '</b></div>' : '') +
      '<div class="total" style="margin-top:8px"><span>Fizetendő</span><b>' + ft(Z.fizetendo) + '</b></div></div>';
    if (Z.eloleg) b += '<div class="small muted" style="margin:-4px 2px 10px">Előlegszámla esetén a végszámlán az előleget a számlázódban az előlegszámlára hivatkozva kell levonni.</div>';
    b += '<div class="btns"><button class="btn wide" id="cpall">📋 Minden adat másolása szövegként</button></div>';
    $('#sz_body').innerHTML = b;
    $('#cpall').onclick = () => copyText(szamlaText(p, u, x, Z, aj), 'Összesítő a vágólapon');
    document.querySelectorAll('[data-cp]').forEach(el => el.onclick = () => copyText(el.dataset.cp, 'Másolva: ' + el.dataset.cp));
    if (!$('#k_szam').value || !s.szam) $('#k_szam').dataset.osszeg = Z.fizetendo;
    return Z;
  };
  body();
  ['s_teljesites', 's_hatarido', 's_fizmod', 's_afa', 's_bontas', 's_eloleg'].forEach(id => $('#' + id).addEventListener('input', body));
  ['s_fizmod', 's_afa', 's_bontas'].forEach(id => $('#' + id).addEventListener('change', body));
  $('#k_ok').onclick = () => {
    const x = read(); const Z = szamlaSorok(p, x);
    const szam = $('#k_szam').value.trim();
    p.szamla = Object.assign({}, s, { elok: x });
    if (szam) Object.assign(p.szamla, { szam, kelt: $('#k_kelt').value, hatarido: x.hatarido, osszeg: Z.fizetendo, fizetve: $('#k_fiz').checked ? (s.fizetve || isoDay()) : '' });
    if (szam && p.allapot !== 'Kész') { p.allapot = 'Kész'; p.kesz = p.kesz || x.teljesites || isoDay(); }
    upsertProjekt(p); toast(szam ? 'Számla rögzítve' : 'Beállítások mentve'); render();
  };
  if ($('#k_del')) $('#k_del').onclick = () => { if (confirm('Törlöd a rögzített számla adatait? (A számlázódban kiállított számlát ez nem érinti.)')) { p.szamla = { elok: read() }; upsertProjekt(p); render(); } };
}
function szamlaText(p, u, x, Z, aj) {
  const L = [];
  L.push('SZÁMLÁZÁSI ÖSSZESÍTŐ (nem számla) – ' + (p.sorszam || ''));
  L.push('Vevő: ' + [u.nev, u.cim, u.adoszam ? 'adószám: ' + u.adoszam : 'magánszemély'].filter(Boolean).join(', '));
  L.push('Teljesítés: ' + String(x.teljesites).replace(/-/g, '.') + ' · Fizetési határidő: ' + String(x.hatarido).replace(/-/g, '.') + ' · ' + x.fizmod + ' · ÁFA: ' + afaTxt(x.afa));
  L.push('');
  Z.rows.forEach((r, i) => L.push((i + 1) + '. ' + r.nev + ' | ' + fmt(r.q) + ' ' + r.u + ' | egységár ' + plainNum(r.egysegar) + ' | nettó ' + plainNum(r.netto) + (Z.kulcs ? ' | ÁFA ' + plainNum(r.afa) : '') + ' | bruttó ' + plainNum(r.brutto)));
  L.push('');
  L.push('Nettó: ' + plainNum(Z.netto) + (Z.kulcs ? ' · ÁFA: ' + plainNum(Z.afa) : '') + ' · Bruttó: ' + plainNum(Z.brutto));
  if (Z.eloleg) L.push('Előleg levonása: ' + plainNum(Z.eloleg));
  L.push('Fizetendő: ' + plainNum(Z.fizetendo) + ' Ft');
  return L.join('\n');
}
async function copyText(t, msg) {
  try { await navigator.clipboard.writeText(t); toast(msg.length > 60 ? msg.slice(0, 57) + '…' : msg); }
  catch (e) { openModal('<h3>Másolás</h3><textarea style="width:100%;min-height:200px">' + esc(t) + '</textarea><div class="btns"><button class="btn" onclick="closeModal()">Bezár</button></div>'); }
}
