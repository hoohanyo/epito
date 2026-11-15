/* Építőkalkulátor – vállalkozói adatok és árajánlat */

const AJ_ALLAPOTOK = ['Tervezet', 'Kiküldve', 'Elfogadva', 'Elutasítva'];
const AJ_DEF = {
  afa: '27', erv: 30, eloleg: 30, jotallas: 12, reszlet: 'tetel',
  vallalas: [
    'Az ajánlatban rögzített árat az érvényességi időn belül garantáljuk.',
    'A munka kezdését és ütemezését előre egyeztetjük, a vállalt határidőt tartjuk.',
    'Ismert gyártók minőségi anyagaival, a gyártói technológia betartásával dolgozunk.',
    'A munkaterületet rendben tartjuk, és a munka végén tisztán adjuk át.',
    'Előre nem látható többletmunkát kizárólag az Ön előzetes jóváhagyásával végzünk.',
  ].join('\n'),
  nemtart: [
    'A bontási hulladék és a sitt elszállítása (ha nem szerepel a tételek között)',
    'A megrendelő által biztosított anyagok',
    'A munka közben feltárt, előre nem látható rejtett hibák javítása',
  ].join('\n'),
  zaras: 'Bízunk benne, hogy ajánlatunk elnyeri tetszését. Ha bármilyen kérdése van, vagy módosítaná a tartalmát, keressen bizalommal – szívesen egyeztetünk személyesen is.',
};
const cegOf = () => Object.assign({}, AJ_DEF, S.data.ceg || {});
const huDate = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }); };
const isoDay = (d) => { d = d || new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
function nextAjSzam() {
  const y = new Date().getFullYear(); let max = 0;
  for (const p of S.data.projektek) { const m = String((p.aj && p.aj.szam) || '').match(/(\d{4})-(\d+)$/); if (m && Number(m[1]) === y) max = Math.max(max, Number(m[2])); }
  return 'ÁJ-' + y + '-' + String(max + 1).padStart(3, '0');
}
function bevezetoDef(p) {
  const u = ugyfelOf(p);
  return 'Tisztelt ' + ((u && u.nev) || 'Megrendelő') + '!\n\nKöszönjük megkeresését és a bizalmat. Az egyeztetés alapján elkészítettük a(z) „' + megrLabel(p) + '” munkáira vonatkozó részletes ajánlatunkat. Az árakat tételesen, átláthatóan állítottuk össze, hogy pontosan lássa, mire számíthat – a munkát az itt rögzített feltételekkel, gondosan és határidőre végezzük el.';
}
function ajOf(p) {
  const c = cegOf();
  return Object.assign({ szam: '', datum: isoDay(), erv: c.erv, allapot: 'Tervezet', afa: c.afa, arres: 0, kedv: 0, eloleg: c.eloleg, jotallas: c.jotallas, kezdes: '', idotartam: '',
    reszlet: c.reszlet, vallalas: c.vallalas, nemtart: c.nemtart, megj: '', bevezeto: '', targy: '' }, p.aj || {});
}

/* ---------- Árzárolás ----------
   Kiküldéskor az ajánlatban használt egységárak rögzülnek az érvényesség végéig.
   Ha a megrendelő ezen belül elfogadja, az árak véglegesen rögzítve maradnak. */
function ervIgIso(aj) { const d = new Date(aj.datum || Date.now()); d.setDate(d.getDate() + (Number(aj.erv) || 0)); return isoDay(d); }
// A zárolt árak mindig érvényben maradnak az adott ajánlaton (az kiküldött dokumentum), lejárat után csak jelzünk.
function arZarAllapot(p) {
  const z = p.aj && p.aj.arZar; if (!z || !z.arak) return null;
  const vegleges = !!(p.elfogadva && p.elfogadva <= z.ig);
  return { z, vegleges, lejart: !vegleges && isoDay() > z.ig };
}
function arZarol(p) {
  const aj = ajOf(p);
  ARGYUJT = {}; let arak; try { computeQuote(p, aj); } finally { arak = ARGYUJT; ARGYUJT = null; }
  aj.arZar = { nap: isoDay(), ig: ervIgIso(aj), arak };
  p.aj = aj;
}
function arZarFelold(p) { if (p.aj) delete p.aj.arZar; }
// a mai árlista szerinti összeg zárolás nélkül
function quoteMaiAron(p, aj) { const e = ARZAR; ARZAR = null; try { return computeQuote0(p, aj); } finally { ARZAR = e; } }
const valtPct = (uj, regi) => regi ? Math.round((uj / regi - 1) * 1000) / 10 : 0;

/* Korábbi ajánlatok archív példánya (újranyomtatható). A Sheet cellakorlátja miatt karcsúsítva tároljuk. */
function ajPillanatkep(p) {
  const aj = ajOf(p), za = arZarAllapot(p), Q = computeQuote(p, aj), resz = aj.reszlet === 'reszletes';
  const a = Object.assign({}, aj, { targy: aj.targy || megrLabel(p) }); delete a.arZar;
  const u = ugyfelOf(p) || {};
  return { szam: aj.szam, datum: aj.datum, ig: za ? za.z.ig : ervIgIso(aj), brutto: Q.brutto, mentve: isoDay(), aj: a,
    ug: { nev: u.nev || '', cim: u.cim || '', tel: u.tel || '', email: u.email || '' },
    Q: { anyag: Q.anyag, munka: Q.munka, reszossz: Q.reszossz, kedv: Q.kedv, netto: Q.netto, afa: Q.afa, brutto: Q.brutto,
      blocks: Q.blocks.map(b => ({ nev: b.nev, anyag: b.anyag, munka: b.munka, total: b.total,
        rows: b.rows.map(r => ({ nev: r.nev, kalk: r.kalk, sub: r.sub, anyag: r.anyag, munka: r.munka, total: r.total,
          lines: resz ? r.lines.map(l => ({ name: l.name, cat: l.cat, qtxt: l.qtxt, ptxt: l.ptxt, packs: l.packs, up: l.up, amount: l.amount })) : [] })) })) } };
}
function ajArchival(p) {
  const lista = (p.ajElozmeny || []).concat([ajPillanatkep(p)]);
  const meret = () => JSON.stringify(lista).length;
  // ha túl nagy: előbb a legrégebbiek tételes anyagsorai mennek, végső esetben a legrégebbi példány
  for (let i = 0; meret() > 45000 && i < lista.length - 1; i++) lista[i].Q.blocks.forEach(b => b.rows.forEach(r => r.lines = []));
  let torolt = 0; while (meret() > 45000 && lista.length > 1) { lista.shift(); torolt++; }
  if (torolt) toast('Helyhiány miatt a legrégebbi archív ajánlat törlődött');
  p.ajElozmeny = lista;
}
function elozmenyHtml(p) {
  const l = p.ajElozmeny || []; if (!l.length) return '';
  return '<h2>Korábbi ajánlatok</h2><div class="card list">' + l.slice().reverse().map((x, i) => '<div class="it" data-ae="' + (l.length - 1 - i) + '"><span class="ic">📄</span><div class="m"><b>' + esc(x.szam) + '</b><small>' + esc(huDate(x.datum)) + ' · érvényes volt ' + esc(huDate(x.ig)) + '-ig</small></div><b class="small">' + ft(x.brutto) + '</b></div>').join('') + '</div>';
}

/* Lejárt ajánlat aktualizálása: új szám, mai kelte, árváltozási tájékoztató */
function aktualizalDialog(p) {
  const aj = ajOf(p), za = arZarAllapot(p);
  const regi = computeQuote(p, aj), mai = quoteMaiAron(p, aj);
  const pct = valtPct(mai.reszossz, regi.reszossz);
  const h = '<h3>Aktualizált ajánlat</h3>' +
    '<div class="card"><div class="kv"><span>Lejárt ajánlat (' + esc(aj.szam) + ')</span><b>' + ft(regi.brutto) + '</b></div>' +
    '<div class="kv"><span>Mai árlista szerint</span><b>' + ft(mai.brutto) + '</b></div>' +
    '<div class="kv"><span>Változás</span><b>' + (pct > 0 ? '+' : '') + fmt(pct, 1) + '%</b></div></div>' +
    '<div class="card list">' +
    '<label class="it"><input type="radio" name="akm" value="lista" checked><div class="m"><b>Az aktuális árlista szerint</b><small>Tételenként a mai anyag- és munkadíjárakkal</small></div></label>' +
    '<label class="it"><input type="radio" name="akm" value="szaz"><div class="m"><b>Egységes emelés a régi árakra</b><small>Minden tétel ugyanannyi százalékkal nő</small></div></label>' +
    '<div class="fld" style="padding:4px 12px 10px"><label>Emelés mértéke (%)</label><input id="akp" inputmode="decimal" value="' + fmt(Math.max(0, pct), 1) + '"></div></div>' +
    '<div class="card"><div class="f"><label for="akt">Árváltozási tájékoztató az ajánlatban<span class="help">Megírja a megrendelőnek, mennyivel és miért változott az ár</span></label><label class="sw"><input type="checkbox" id="akt" checked><i></i></label></div></div>' +
    '<div class="btns"><button class="btn" id="akx">Mégse</button><button class="btn pri" id="akok">Elkészítem</button></div>';
  openModal(h, m => {
    $('#akx', m).onclick = closeModal;
    $('#akok', m).onclick = () => {
      const mod = m.querySelector('[name=akm]:checked').value, x = Number(parseNum($('#akp', m).value)) || 0;
      const uj = Object.assign({}, aj, { szam: nextAjSzam(), datum: isoDay(), tajekoztato: $('#akt', m).checked,
        elozo: { szam: aj.szam, datum: aj.datum, ig: za ? za.z.ig : ervIgIso(aj), brutto: regi.brutto, reszossz: regi.reszossz } });
      delete uj.arZar;
      ajArchival(p);
      if (mod === 'szaz' && za) {
        const arak = {}; for (const k in za.z.arak) arak[k] = Math.round(za.z.arak[k] * (1 + x / 100));
        uj.arZar = { nap: isoDay(), ig: ervIgIso(uj), arak, emeles: x };
      }
      p.aj = uj; p.allapot = 'Ajánlat'; p.kikuldve = '';
      upsertProjekt(p); closeModal(); render(); toast('Elkészült az aktualizált ajánlat: ' + uj.szam);
    };
  });
}

/* ---------- Számítás ---------- */
function computeQuote(p, aj) {
  const za = arZarAllapot(p);
  const elozo = ARZAR; ARZAR = za ? za.z.arak : null;
  try { return computeQuote0(p, aj); } finally { ARZAR = elozo; }
}
function computeQuote0(p, aj) {
  const ar = 1 + nz(aj.arres) / 100;
  const blocks = [];
  let anyag = 0, munka = 0;
  for (const mr of mrsOf(p).filter(m => m.ajanlatban !== false)) {
  const rows = [];
  for (const t of tetelekOfMr(mr)) {
    const c = CALC_BY_ID[t.calc];
    const ls = (t.mats || []).map(line).map(l => {
      const k = l.cat === 'anyag' ? ar : 1;
      return Object.assign({}, l, { up: Math.round((l.packs != null ? l.price : l.price) * k), amount: Math.round(l.cost * k) });
    });
    const a = ls.filter(l => l.cat !== 'munka').reduce((s, l) => s + l.amount, 0);
    const m = ls.filter(l => l.cat === 'munka').reduce((s, l) => s + l.amount, 0);
    let sub = '';
    if (c && c.mq) { try { const q = c.mq(t.values || {}); if (q[0] > 0) sub = fmt(q[0], 2) + ' ' + q[1]; } catch (e) {} }
    else if (t.calc === 'egyeb' && t.mats[0]) sub = line(t.mats[0]).qtxt;
    // részmunkák külön sorban (pl. ajtó-, ablakmázolás a festés mellett), a fő sor a maradék
    const rs = c && c.resz ? reszOf(c, t.values || {}) : [];
    let ma = a, mm = m; const resz = [];
    for (const x of rs) {
      const rl = [{ k: x.r.md, q: x.q }].concat((x.r.mats || []).map(mt => ({ k: mt[0], q: Math.round(x.q * mt[1] * 1000) / 1000 }))).map(line).map(l => {
        const k = l.cat === 'anyag' ? ar : 1; return Object.assign({}, l, { up: Math.round(l.price * k), amount: Math.round(l.cost * k) });
      });
      const ra = rl.filter(l => l.cat !== 'munka').reduce((s, l) => s + l.amount, 0), rm = rl.filter(l => l.cat === 'munka').reduce((s, l) => s + l.amount, 0);
      ma -= ra; mm -= rm;
      resz.push({ nev: x.r.n, kalk: c.n, sub: fmt(x.q, 2) + ' ' + x.r.u, anyag: ra, munka: rm, total: ra + rm, lines: rl, resz: true });
    }
    if (resz.length) {
      ma = Math.max(0, ma); mm = Math.max(0, mm);
      const reszKulcs = new Set(rs.map(x => x.r.md));
      const fo = ls.filter(l => !reszKulcs.has(l.k));
      if (ma + mm > 0) rows.push({ nev: t.nev, kalk: c.n, sub, anyag: ma, munka: mm, total: ma + mm, lines: fo });
      resz.forEach(r => rows.push(r));
      continue;
    }
    rows.push({ nev: t.nev, kalk: c ? c.n : '', sub, anyag: a, munka: m, total: a + m, lines: ls });
  }
  rows.forEach(r => { anyag += r.anyag; munka += r.munka; });
  if (rows.length) blocks.push({ nev: mr.nev, rows, anyag: rows.reduce((x, r) => x + r.anyag, 0), munka: rows.reduce((x, r) => x + r.munka, 0), total: rows.reduce((x, r) => x + r.total, 0) });
  }
  const rows = [].concat(...blocks.map(b => b.rows));
  const reszossz = anyag + munka;
  const kedv = Math.round(reszossz * nz(aj.kedv) / 100);
  const netto = reszossz - kedv;
  const afa = aj.afa === '27' ? Math.round(netto * 0.27) : 0;
  return { blocks, rows, anyag, munka, reszossz, kedv, netto, afa, brutto: netto + afa };
}

/* ---------- Vállalkozói adatok ---------- */
function renderCeg() {
  const c = cegOf();
  setHeader('Vállalkozói adatok', 'Az árajánlat fejléce és alapbeállításai');
  const fld = (id, l, ph, extra) => '<div class="fld"><label>' + l + '</label><input id="c_' + id + '" value="' + esc(c[id] || '') + '" placeholder="' + esc(ph || '') + '"' + (extra || '') + '></div>';
  const ta = (id, l, help) => '<div class="fld"><label>' + l + '</label><textarea id="c_' + id + '" rows="5">' + esc(c[id] || '') + '</textarea>' + (help ? '<div class="small muted">' + help + '</div>' : '') + '</div>';
  let h = '<div class="card">' +
    '<div class="fld"><label>Logó</label><div class="logo-row"><div class="logo-prev" id="lprev">' + (S.data.logo ? '<img src="' + S.data.logo + '" alt="">' : '<span class="muted small">nincs</span>') + '</div>' +
    '<label class="btn sm" style="cursor:pointer">Kép választása<input type="file" id="lfile" accept="image/*" hidden></label>' + (S.data.logo ? '<button class="btn sm danger" id="ldel">Törlés</button>' : '') + '</div></div>' +
    fld('nev', 'Cég / vállalkozó neve', 'pl. Kovács Építő Kft.') + fld('kapcs', 'Kapcsolattartó neve (aláíráshoz)', 'pl. Kovács Péter') +
    fld('cim', 'Cím', 'pl. 2234 Maglód, Fő utca 1.') +
    '<div class="row2">' + fld('adoszam', 'Adószám', '12345678-1-13') + fld('nyilv', 'Cégjegyzék- / nyilv. szám', '') + '</div>' +
    '<div class="row2">' + fld('tel', 'Telefon', '+36 30 123 4567', ' inputmode="tel"') + fld('email', 'E-mail', '', ' inputmode="email"') + '</div>' +
    '<div class="row2">' + fld('web', 'Weboldal', '') + fld('bank', 'Bankszámlaszám', '') + '</div></div>';
  h += '<h2>Ajánlat alapbeállításai</h2><div class="card">' +
    '<div class="fld"><label>ÁFA</label><select id="c_afa">' + [['27', 'Nettó ár + 27% ÁFA'], ['aam', 'Alanyi adómentes (AAM)'], ['ford', 'Fordított adózás']].map(o => '<option value="' + o[0] + '"' + (c.afa === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' +
    '<div class="row2">' + fld('erv', 'Érvényesség (nap)', '30', ' inputmode="numeric"') + fld('eloleg', 'Előleg (%)', '30', ' inputmode="numeric"') + fld('jotallas', 'Jótállás (hónap)', '12', ' inputmode="numeric"') + '</div>' +
    ta('vallalas', 'Vállalásaink (soronként egy)', 'Ez a lista adja az ajánlat „elköteleződés” részét – írd a saját szavaiddal.') +
    ta('nemtart', 'Az ajánlat nem tartalmazza (soronként egy)') +
    ta('zaras', 'Záró szöveg') + '</div>';
  h += '<div class="btns"><button class="btn pri wide" id="cok">Mentés</button></div><div class="small muted">Az ÁFA-szöveget és a jótállást egyeztesd a könyvelőddel – ezek csak alapértékek, ajánlatonként módosíthatók.</div>';
  $('#view').innerHTML = h;
  $('#lfile').onchange = (e) => { const f = e.target.files[0]; if (f) logoFromFile(f); };
  if ($('#ldel')) $('#ldel').onclick = () => { saveLogo(''); renderCeg(); };
  $('#cok').onclick = () => {
    const o = {};
    ['nev', 'kapcs', 'cim', 'adoszam', 'nyilv', 'tel', 'email', 'web', 'bank', 'afa', 'vallalas', 'nemtart', 'zaras'].forEach(k => o[k] = $('#c_' + k).value.trim());
    ['erv', 'eloleg', 'jotallas'].forEach(k => o[k] = Number(parseNum($('#c_' + k).value)) || 0);
    saveCeg(o); toast('Vállalkozói adatok mentve'); back();
  };
}
function logoFromFile(f) {
  const img = new Image(); const url = URL.createObjectURL(f);
  img.onload = () => {
    // kerek / négyzetes logó (pl. embléma körirattal): nagyobb felbontás, hogy nyomtatásban is olvasható legyen
    const arany = img.width / img.height, negyzetes = arany > 0.8 && arany < 1.25;
    let maxW = negyzetes ? 360 : 520, maxH = negyzetes ? 360 : 180, d = '';
    for (let i = 0; i < 5; i++) {
      const sc = Math.min(1, maxW / img.width, maxH / img.height);
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      d = cv.toDataURL('image/png');
      if (d.length > 45000) { const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const x = c2.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c2.width, c2.height); x.drawImage(cv, 0, 0); for (const q of [0.92, 0.85, 0.75, 0.6]) { d = c2.toDataURL('image/jpeg', q); if (d.length < 45000) break; } }
      if (d.length <= 45000) break;
      maxW = Math.round(maxW * 0.85); maxH = Math.round(maxH * 0.85);
    }
    URL.revokeObjectURL(url);
    if (d.length > 48000) { toast('A kép túl nagy, válassz egyszerűbb logót'); return; }
    saveLogo(d); renderCeg(); toast('Logó mentve');
  };
  img.onerror = () => toast('Ezt a képet nem tudom beolvasni');
  img.src = url;
}

/* ---------- Ajánlat beállítása ---------- */
function renderAjanlat(r) {
  const p = S.data.projektek.find(x => x.id === r.id); if (!p) return back();
  const aj = ajOf(p); if (!aj.szam) aj.szam = nextAjSzam();
  const c = cegOf();
  setHeader('Árajánlat', ugyfelNev(p) + ' · ' + (p.sorszam || ''));
  const ft2 = (id, l, val, extra) => '<div class="fld"><label>' + l + '</label><input id="a_' + id + '" value="' + esc(val == null ? '' : val) + '"' + (extra || '') + '></div>';
  const sel = (id, l, opts, val) => '<div class="fld"><label>' + l + '</label><select id="a_' + id + '">' + opts.map(o => '<option value="' + o[0] + '"' + (String(val) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>';
  let h = '';
  if (!c.nev) h += '<div class="banner">🏢 Még nincsenek kitöltve a vállalkozói adataid – ezek kerülnek az ajánlat fejlécébe.<button class="btn sm" id="toceg">Kitöltés</button></div>';
  if (!S.data.tetelek.some(t => t.projektId === p.id)) h += '<div class="warn">A projektben még nincs tétel – az ajánlat üres lesz.</div>';
  const za = arZarAllapot(p);
  if (za && za.lejart) h += '<div class="banner lejart">⏰ Lejárt az ajánlat (érvényes volt: ' + esc(huDate(za.z.ig)) + '). Ha a munka mégis megvalósul, készíts aktualizált ajánlatot a mai árakkal.<button class="btn sm pri" id="aktual">Aktualizálás</button></div>';
  else if (za) h += '<div class="banner zar">🔒 ' + (za.vegleges ? 'Az árak véglegesen rögzítve (elfogadott ajánlat).' : 'Az árak rögzítve ' + esc(huDate(za.z.ig)) + '-ig – az árlista változása nem írja át az ajánlatot.') + '<button class="btn sm" id="zarfel">Feloldás</button></div>';
  if (aj.elozo) h += '<div class="banner">🔄 Aktualizált ajánlat – előzmény: ' + esc(aj.elozo.szam) + ' (' + esc(huDate(aj.elozo.datum)) + ', ' + ft(aj.elozo.brutto) + '). Tájékoztató: ' + (aj.tajekoztato === false ? 'kikapcsolva' : 'bekapcsolva') + '<button class="btn sm" id="tajtgl">' + (aj.tajekoztato === false ? 'Bekapcsol' : 'Kikapcsol') + '</button></div>';
  h += '<div class="card hero" id="ajsum"></div>';
  h += '<div class="btns"><button class="btn pri wide" id="aprev">👁 Előnézet, nyomtatás, PDF</button></div>';
  h += elozmenyHtml(p);
  h += '<h2>Alapadatok</h2><div class="card"><div class="row2">' + ft2('szam', 'Ajánlat száma', aj.szam) + ft2('datum', 'Kelte', aj.datum, ' type="date"') + '</div>' +
    '<div class="row2">' + ft2('erv', 'Érvényes (nap)', aj.erv, ' inputmode="numeric"') + '<div class="fld"><label>Megrendelés állapota</label><button class="btn sm" id="a_all" style="width:100%;text-align:left">' + allapotPill(p.allapot) + ' – módosítás</button></div>' + '</div>' +
    ft2('targy', 'Az ajánlat tárgya', aj.targy || megrLabel(p)) +
    '<div class="kv"><span>Megrendelő</span><b>' + esc(ugyfelNev(p)) + '</b></div>' +
    '<div class="btns" style="margin-bottom:0"><button class="btn sm" id="amegr">✏️ Ügyfél adatai</button></div></div>';
  h += '<h2>Munkarészek az ajánlatban</h2><div class="card">' + (mrsOf(p).length ? mrsOf(p).map(m => '<div class="f"><label for="mri_' + m.id + '">' + esc(m.nev) + '<span class="help">' + ft(mrKoltseg(m)) + ' (nettó, árrés nélkül)</span></label><label class="sw"><input type="checkbox" class="mri" id="mri_' + m.id + '" data-m="' + m.id + '"' + (m.ajanlatban !== false ? ' checked' : '') + '><i></i></label></div>').join('') : '<div class="muted small">Még nincs munkarész.</div>') + '</div>';
  h += '<h2>Árazás</h2><div class="card"><div class="row2">' + ft2('arres', 'Anyagárrés (%)', aj.arres, ' inputmode="decimal"') + ft2('kedv', 'Kedvezmény (%)', aj.kedv, ' inputmode="decimal"') + '</div>' +
    sel('afa', 'ÁFA', [['27', 'Nettó ár + 27% ÁFA'], ['aam', 'Alanyi adómentes (AAM)'], ['ford', 'Fordított adózás']], aj.afa) +
    sel('reszlet', 'Tételek bontása', [['tetel', 'Munkanemenként (anyag + munkadíj oszlop)'], ['reszletes', 'Részletes (anyagok tételesen is)']], aj.reszlet) +
    '<div class="small muted">Az anyagárrés beépül az anyagárakba, a megrendelő külön nem látja.</div></div>';
  h += '<h2>Ütemezés, fizetés</h2><div class="card"><div class="row2">' + ft2('kezdes', 'Várható kezdés', aj.kezdes, ' placeholder="pl. 2026. december eleje"') + ft2('idotartam', 'Időtartam', aj.idotartam, ' placeholder="pl. kb. 5 munkanap"') + '</div>' +
    '<div class="row2">' + ft2('eloleg', 'Előleg (%)', aj.eloleg, ' inputmode="numeric"') + ft2('jotallas', 'Jótállás (hónap)', aj.jotallas, ' inputmode="numeric"') + '</div></div>';
  h += '<h2>Szövegek</h2><div class="card">' +
    '<div class="fld"><label>Bevezető</label><textarea id="a_bevezeto" rows="6">' + esc(aj.bevezeto || bevezetoDef(p)) + '</textarea></div>' +
    '<div class="fld"><label>Vállalásaink (soronként egy)</label><textarea id="a_vallalas" rows="5">' + esc(aj.vallalas) + '</textarea></div>' +
    '<div class="fld"><label>Az ajánlat nem tartalmazza (soronként egy)</label><textarea id="a_nemtart" rows="3">' + esc(aj.nemtart) + '</textarea></div>' +
    '<div class="fld"><label>Megjegyzés (opcionális)</label><textarea id="a_megj" rows="3">' + esc(aj.megj) + '</textarea></div></div>';
  h += '<div class="btns"><button class="btn wide" id="asave">Mentés</button><button class="btn pri wide" id="aprev2">👁 Előnézet</button></div>';
  $('#view').innerHTML = h;
  const read = () => {
    const o = Object.assign({}, aj);
    ['szam', 'datum', 'targy', 'afa', 'reszlet', 'kezdes', 'idotartam', 'bevezeto', 'vallalas', 'nemtart', 'megj'].forEach(k => o[k] = $('#a_' + k).value.trim());
    ['erv', 'arres', 'kedv', 'eloleg', 'jotallas'].forEach(k => o[k] = Number(parseNum($('#a_' + k).value)) || 0);
    if (o.bevezeto === bevezetoDef(p)) o.bevezeto = '';
    return o;
  };
  const sum = () => {
    const o = read(); const Q = computeQuote(p, o);
    $('#ajsum').innerHTML = '<div class="total"><span>' + (o.afa === '27' ? 'Bruttó végösszeg' : 'Végösszeg') + '</span><b>' + ft(Q.brutto) + '</b></div>' +
      '<div class="small muted" style="margin-top:4px">Anyag ' + ft(Q.anyag) + ' · munkadíj ' + ft(Q.munka) + (Q.kedv ? ' · kedvezmény −' + ft(Q.kedv) : '') + (o.afa === '27' ? ' · nettó ' + ft(Q.netto) + ' + ÁFA ' + ft(Q.afa) : '') + '</div>';
  };
  const save = (silent) => { p.aj = read(); upsertProjekt(p); if (!silent) toast('Ajánlat mentve'); };
  $('#view').querySelectorAll('input,select,textarea').forEach(el => el.addEventListener('input', sum));
  sum();
  $('#asave').onclick = () => save();
  $('#aprev').onclick = $('#aprev2').onclick = () => { save(true); openQuote(p); };
  $('#amegr').onclick = () => { save(true); const u = ugyfelOf(p); if (u) ugyfelDialog(u); };
  $('#a_all').onclick = () => { save(true); allapotDialog(p); };
  document.querySelectorAll('.mri').forEach(el => el.onchange = () => { const m = mrById(el.dataset.m); m.ajanlatban = el.checked; upsertMunkaresz(m); sum(); });
  if ($('#zarfel')) $('#zarfel').onclick = () => {
    if (!confirm('Feloldod az árzárolást? Az ajánlat ezután az aktuális árlistával számol.')) return;
    save(true); arZarFelold(p); upsertProjekt(p); render(); toast('Árzárolás feloldva');
  };
  if ($('#aktual')) $('#aktual').onclick = () => { save(true); aktualizalDialog(p); };
  document.querySelectorAll('[data-ae]').forEach(el => el.onclick = () => { save(true); openQuote(p, p.ajElozmeny[Number(el.dataset.ae)]); });
  if ($('#tajtgl')) $('#tajtgl').onclick = () => { save(true); p.aj.tajekoztato = p.aj.tajekoztato === false; upsertProjekt(p); render(); };
  if ($('#toceg')) $('#toceg').onclick = () => { save(true); go({ v: 'ceg' }); };
}

/* ---------- Ajánlat dokumentum ---------- */
function quoteHtml(p, fotoSrc, snap) {
  const aj = snap ? snap.aj : ajOf(p); const c = cegOf();
  const Q = snap ? Object.assign({}, snap.Q, { rows: [].concat(...snap.Q.blocks.map(b => b.rows)) }) : computeQuote(p, aj);
  const lines = (s) => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
  const ervIg = (() => { const d = new Date(aj.datum || Date.now()); d.setDate(d.getDate() + (Number(aj.erv) || 0)); return huDate(isoDay(d)); })();
  const cegSor = [c.cim, c.adoszam ? 'Adószám: ' + c.adoszam : '', c.nyilv ? 'Nyilv. sz.: ' + c.nyilv : ''].filter(Boolean);
  const kapcs = [c.tel, c.email, c.web].filter(Boolean);
  let h = '<div class="q-paper">' + (snap ? '<div class="q-archiv">Archív példány – ez az ajánlat lejárt, helyette a(z) ' + esc(ajOf(p).szam) + ' számú ajánlat érvényes.</div>' : '');
  // fejléc
  h += '<header class="q-head"><div class="q-brand">' + (S.data.logo ? '<img class="q-logo" src="' + S.data.logo + '" alt="" onload="this.classList.toggle(\'kerek\', this.naturalWidth / this.naturalHeight < 1.25)">' : '') + '<div class="q-brand-t">' +
    '<div class="q-cegnev">' + esc(c.nev || 'Vállalkozó neve') + '</div>' +
    cegSor.map(x => '<div>' + esc(x) + '</div>').join('') + (kapcs.length ? '<div>' + esc(kapcs.join(' · ')) + '</div>' : '') + '</div></div>' +
    '<div class="q-title"><div class="q-h1">Árajánlat</div><table class="q-meta"><tr><td>Szám</td><td>' + esc(aj.szam) + '</td></tr><tr><td>Kelt</td><td>' + esc(huDate(aj.datum)) + '</td></tr><tr><td>Érvényes</td><td>' + esc(ervIg) + '-ig</td></tr></table></div></header>';
  // felek
  const ug = snap ? snap.ug : (ugyfelOf(p) || {});
  h += '<section class="q-parties"><div class="q-box"><div class="q-lbl">Megrendelő</div><div class="q-strong">' + esc(ug.nev || '') + '</div>' +
    [ug.cim, ug.tel, ug.email].filter(Boolean).map(x => '<div>' + esc(x) + '</div>').join('') + '</div>' +
    '<div class="q-box"><div class="q-lbl">Az ajánlat tárgya</div><div class="q-strong">' + esc(aj.targy || megrLabel(p)) + '</div>' + '<div>Megrendelés: ' + esc(p.sorszam || '') + '</div>' + (p.hely ? '<div>Helyszín: ' + esc(p.hely) + '</div>' : '') +
    (aj.kezdes || aj.idotartam ? '<div>' + esc([aj.kezdes ? 'Kezdés: ' + aj.kezdes : '', aj.idotartam ? 'Időtartam: ' + aj.idotartam : ''].filter(Boolean).join(' · ')) + '</div>' : '') + '</div></section>';
  // bevezető
  h += '<section class="q-intro">' + lines(aj.bevezeto || bevezetoDef(p)).map(x => '<p>' + esc(x) + '</p>').join('') + '</section>';
  if (aj.elozo && aj.tajekoztato !== false) {
    const e = aj.elozo, pc = valtPct(Q.reszossz, e.reszossz || e.brutto);
    h += '<section class="q-scope q-arval"><div class="q-lbl">Tájékoztatás az árváltozásról</div><p>Ez az ajánlat a(z) ' + esc(e.szam) + ' számú, ' + esc(huDate(e.datum)) + ' keltű, ' + esc(huDate(e.ig)) + '-ig érvényes ajánlatunk aktualizált változata. ' +
      (pc > 0 ? 'Az azóta eltelt időben az anyagárak és a munkadíjak emelkedtek, ezért a végösszeg az eredeti ' + esc(ft(e.brutto)) + ' helyett ' + esc(ft(Q.brutto)) + ' (+' + esc(fmt(pc, 1)) + '%). Megértését köszönjük – a munka tartalma, a vállalásaink és a feltételeink nem változtak.'
        : pc < 0 ? 'Az azóta eltelt időben az árak csökkentek, ezért a végösszeg az eredeti ' + esc(ft(e.brutto)) + ' helyett ' + esc(ft(Q.brutto)) + '.'
        : 'Az árak nem változtak, az ajánlat érvényességét meghosszabbítottuk.') + '</p></section>';
  }
  if (p.megj) h += '<section class="q-scope"><div class="q-lbl">A munka leírása</div><p>' + esc(p.megj).replace(/\n/g, '<br>') + '</p></section>';
  // tételek
  h += '<table class="q-tbl"><thead><tr><th class="q-n">#</th><th>Megnevezés</th><th class="q-r">Anyag, egyéb</th><th class="q-r">Munkadíj</th><th class="q-r">Összesen</th></tr></thead><tbody>';
  const tobbBlokk = Q.blocks.length > 1; let sorsz = 0;
  Q.blocks.forEach((b, bi) => {
  if (tobbBlokk) h += '<tr class="q-blk"><td class="q-n">' + String.fromCharCode(65 + bi) + '</td><td colspan="4">' + esc(b.nev) + '</td></tr>';
  b.rows.forEach((r) => {
    const i = sorsz++;
    h += '<tr class="q-row"><td class="q-n">' + (i + 1) + '.</td><td><div class="q-strong">' + esc(r.nev) + '</div>' + (r.kalk || r.sub ? '<div class="q-sub">' + esc([r.kalk, r.sub].filter(Boolean).join(' · ')) + '</div>' : '') + '</td><td class="q-r">' + (r.anyag ? ft(r.anyag) : '–') + '</td><td class="q-r">' + (r.munka ? ft(r.munka) : '–') + '</td><td class="q-r q-strong">' + ft(r.total) + '</td></tr>';
    if (aj.reszlet === 'reszletes') for (const l of r.lines) {
      const qty = l.cat === 'anyag' ? (l.ptxt && l.packs != null ? l.ptxt : l.qtxt) : l.qtxt;
      h += '<tr class="q-det"><td></td><td>' + esc(l.name) + ' <span class="q-sub">' + esc(qty) + (l.up ? ' × ' + ft(l.up) : '') + '</span></td><td class="q-r">' + (l.cat !== 'munka' ? ft(l.amount) : '') + '</td><td class="q-r">' + (l.cat === 'munka' ? ft(l.amount) : '') + '</td><td></td></tr>';
    }
  });
  if (tobbBlokk) h += '<tr class="q-blksum"><td></td><td>' + esc(b.nev) + ' összesen</td><td class="q-r">' + ft(b.anyag) + '</td><td class="q-r">' + ft(b.munka) + '</td><td class="q-r">' + ft(b.total) + '</td></tr>';
  });
  if (!Q.rows.length) h += '<tr><td></td><td colspan="4" class="q-sub">Nincs tétel.</td></tr>';
  h += '</tbody></table>';
  // összesítő
  h += '<section class="q-sumwrap"><table class="q-sum">' +
    '<tr><td>Anyag és egyéb</td><td>' + ft(Q.anyag) + '</td></tr><tr><td>Munkadíj</td><td>' + ft(Q.munka) + '</td></tr>' +
    (Q.kedv ? '<tr><td>Részösszeg</td><td>' + ft(Q.reszossz) + '</td></tr><tr class="q-kedv"><td>Kedvezmény (' + fmt(aj.kedv) + '%)</td><td>−' + ft(Q.kedv) + '</td></tr>' : '') +
    (aj.afa === '27' ? '<tr class="q-line"><td>Nettó összesen</td><td>' + ft(Q.netto) + '</td></tr><tr><td>ÁFA (27%)</td><td>' + ft(Q.afa) + '</td></tr><tr class="q-grand"><td>Bruttó végösszeg</td><td>' + ft(Q.brutto) + '</td></tr>'
      : '<tr class="q-grand"><td>' + (aj.afa === 'ford' ? 'Nettó végösszeg' : 'Végösszeg') + '</td><td>' + ft(Q.brutto) + '</td></tr>') +
    '</table>' + (aj.afa === 'aam' ? '<div class="q-note">Alanyi adómentes, az árak áfát nem tartalmaznak.</div>' : aj.afa === 'ford' ? '<div class="q-note">Fordított adózás: az áfát a megrendelő fizeti meg.</div>' : '') + '</section>';
  // feltételek + vállalások
  const felt = [];
  if (aj.kezdes) felt.push(['Várható kezdés', aj.kezdes]);
  if (aj.idotartam) felt.push(['Kivitelezés időtartama', aj.idotartam]);
  if (nz(aj.eloleg) > 0) felt.push(['Fizetés', fmt(aj.eloleg) + '% előleg (' + ft(Math.round(Q.brutto * nz(aj.eloleg) / 100)) + ') a munka kezdésekor, a fennmaradó összeg a műszaki átadáskor']);
  else felt.push(['Fizetés', 'A teljes összeg a műszaki átadáskor']);
  if (nz(aj.jotallas) > 0) felt.push(['Jótállás', fmt(aj.jotallas) + ' hónap az elvégzett munkára']);
  felt.push(['Az ajánlat érvényes', ervIg + '-ig']);
  h += '<section class="q-cols"><div><div class="q-lbl">Feltételek</div><table class="q-felt">' + felt.map(f => '<tr><td>' + esc(f[0]) + '</td><td>' + esc(f[1]) + '</td></tr>').join('') + '</table>' +
    (lines(aj.nemtart).length ? '<div class="q-lbl" style="margin-top:14px">Az ajánlat nem tartalmazza</div><ul class="q-ul">' + lines(aj.nemtart).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') + '</div>' +
    (lines(aj.vallalas).length ? '<div class="q-commit"><div class="q-lbl">Vállalásaink</div><ul class="q-check">' + lines(aj.vallalas).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '<div></div>') + '</section>';
  if (aj.megj) h += '<section class="q-scope"><div class="q-lbl">Megjegyzés</div><p>' + esc(aj.megj).replace(/\n/g, '<br>') + '</p></section>';
  const qf = (p.fotok || []).filter(f => f.aj && fotoSrc && fotoSrc[f.id]);
  if (qf.length) h += '<section class="q-fotok"><div class="q-lbl">Fotók a helyszínről</div><div class="q-fgrid">' + qf.map(f => '<figure><img src="' + fotoSrc[f.id] + '" alt="">' + (f.cap ? '<figcaption>' + esc(f.cap) + '</figcaption>' : '') + '</figure>').join('') + '</div></section>';
  h += '<section class="q-close"><p>' + esc(c.zaras || AJ_DEF.zaras) + '</p></section>';
  // aláírás
  h += '<section class="q-sign"><div><div class="q-sigline"></div><div class="q-strong">' + esc(c.kapcs || c.nev || '') + '</div><div class="q-sub">' + esc(c.kapcs && c.nev ? c.nev : 'Ajánlattevő') + '</div></div>' +
    '<div><div class="q-sigline"></div><div class="q-strong">Az ajánlatot elfogadom</div><div class="q-sub">' + esc(ug.nev || 'Megrendelő') + ' · Dátum: ……………………</div></div></section>';
  h += '<footer class="q-foot">' + esc([c.nev, c.tel, c.email, c.bank ? 'Számlaszám: ' + c.bank : ''].filter(Boolean).join(' · ')) + '</footer>';
  return h + '</div>';
}
async function openQuote(p, snap) {
  if (!snap && !(p.aj && p.aj.szam)) { p.aj = ajOf(p); p.aj.szam = nextAjSzam(); upsertProjekt(p); }
  const fotoSrc = {};
  const kell = snap ? [] : (p.fotok || []).filter(f => f.aj);
  if (kell.length) { toast('Fotók betöltése…'); for (const f of kell) { try { fotoSrc[f.id] = await fotoGet(f.id); } catch (e) {} } }
  let q = $('#quote');
  if (!q) { q = document.createElement('div'); q.id = 'quote'; document.body.appendChild(q); }
  const aj = snap ? snap.aj : ajOf(p);
  q.innerHTML = '<div class="q-bar"><button class="btn sm" id="qx">‹ Vissza</button><span class="q-bt">' + esc(aj.szam) + (snap ? ' (archív)' : '') + '</span>' +
    '<button class="btn sm" id="qp" title="Nyomtatás">🖨️</button>' + (snap ? '<button class="btn sm pri" id="qpdf">⬇ PDF</button>' : '<button class="btn sm pri" id="qk">✉️ Küldés</button>') + '</div>' +
    (snap ? '' : ellenorzesHtml(p)) + quoteHtml(p, fotoSrc, snap);
  q.hidden = false; document.body.classList.add('quote-open');
  const fit = () => { const pp = q.querySelector('.q-paper'); if (pp) pp.style.zoom = Math.min(1, (window.innerWidth - 16) / 794); };
  fit(); window.addEventListener('resize', fit);
  history.pushState({ quote: 1 }, '');
  $('#qx').onclick = () => closeQuote();
  if ($('#qk')) $('#qk').onclick = () => kuldesDialog(p, q.querySelector('.q-paper'));
  if ($('#qpdf')) $('#qpdf').onclick = async () => { try { toast('PDF készül…'); letolt(await quotePdf(q.querySelector('.q-paper')), pdfFajlnev(p, aj).replace('.pdf', ' (archív).pdf')); } catch (e) { toast(e.message); } };
  $('#qp').onclick = () => {
    const old = document.title; document.title = (aj.szam + ' ' + ugyfelNev(p) + ' ' + megrLabel(p)).replace(/[\\/:*?"<>|]+/g, '_');
    const za = arZarAllapot(p);
    if (snap) {}
    else if (za && za.lejart) { if (!confirm('Ez az ajánlat lejárt (érvényes volt: ' + huDate(za.z.ig) + '). Ha újra el akarod küldeni, előbb készíts aktualizált ajánlatot (Ajánlat → Aktualizálás). Így is kinyomtatod?')) return; }
    else {
      if (p.allapot === 'Ajánlat') { p.allapot = 'Kiküldve'; p.kikuldve = isoDay(); }
      if (p.allapot === 'Kiküldve') arZarol(p);
      upsertProjekt(p);
    }
    setTimeout(() => { window.print(); document.title = old; }, 50);
  };
  window.scrollTo(0, 0);
}
function closeQuote() { const q = $('#quote'); if (q) { q.hidden = true; q.innerHTML = ''; } document.body.classList.remove('quote-open'); render(); }
