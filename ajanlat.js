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
  return 'Tisztelt ' + (p.megrNev || 'Megrendelő') + '!\n\nKöszönjük megkeresését és a bizalmat. Az egyeztetés alapján elkészítettük a(z) „' + p.nev + '” munkáira vonatkozó részletes ajánlatunkat. Az árakat tételesen, átláthatóan állítottuk össze, hogy pontosan lássa, mire számíthat – a munkát az itt rögzített feltételekkel, gondosan és határidőre végezzük el.';
}
function ajOf(p) {
  const c = cegOf();
  return Object.assign({ szam: '', datum: isoDay(), erv: c.erv, allapot: 'Tervezet', afa: c.afa, arres: 0, kedv: 0, eloleg: c.eloleg, jotallas: c.jotallas, kezdes: '', idotartam: '',
    reszlet: c.reszlet, vallalas: c.vallalas, nemtart: c.nemtart, megj: '', bevezeto: '', targy: '' }, p.aj || {});
}

/* ---------- Számítás ---------- */
function computeQuote(p, aj) {
  const ts = S.data.tetelek.filter(t => t.projektId === p.id).sort((a, b) => String(a.letrehozva || '').localeCompare(String(b.letrehozva || '')));
  const ar = 1 + nz(aj.arres) / 100;
  const rows = [];
  let anyag = 0, munka = 0;
  for (const t of ts) {
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
    rows.push({ nev: t.nev, kalk: c ? c.n : '', sub, anyag: a, munka: m, total: a + m, lines: ls });
    anyag += a; munka += m;
  }
  const reszossz = anyag + munka;
  const kedv = Math.round(reszossz * nz(aj.kedv) / 100);
  const netto = reszossz - kedv;
  const afa = aj.afa === '27' ? Math.round(netto * 0.27) : 0;
  return { rows, anyag, munka, reszossz, kedv, netto, afa, brutto: netto + afa };
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
    const sc = Math.min(1, 520 / img.width, 180 / img.height);
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    let d = cv.toDataURL('image/png');
    if (d.length > 45000) { const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const x = c2.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c2.width, c2.height); x.drawImage(cv, 0, 0); for (const q of [0.9, 0.8, 0.65, 0.5]) { d = c2.toDataURL('image/jpeg', q); if (d.length < 45000) break; } }
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
  setHeader('Árajánlat', p.nev);
  const ft2 = (id, l, val, extra) => '<div class="fld"><label>' + l + '</label><input id="a_' + id + '" value="' + esc(val == null ? '' : val) + '"' + (extra || '') + '></div>';
  const sel = (id, l, opts, val) => '<div class="fld"><label>' + l + '</label><select id="a_' + id + '">' + opts.map(o => '<option value="' + o[0] + '"' + (String(val) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>';
  let h = '';
  if (!c.nev) h += '<div class="banner">🏢 Még nincsenek kitöltve a vállalkozói adataid – ezek kerülnek az ajánlat fejlécébe.<button class="btn sm" id="toceg">Kitöltés</button></div>';
  if (!S.data.tetelek.some(t => t.projektId === p.id)) h += '<div class="warn">A projektben még nincs tétel – az ajánlat üres lesz.</div>';
  h += '<div class="card hero" id="ajsum"></div>';
  h += '<div class="btns"><button class="btn pri wide" id="aprev">👁 Előnézet, nyomtatás, PDF</button></div>';
  h += '<h2>Alapadatok</h2><div class="card"><div class="row2">' + ft2('szam', 'Ajánlat száma', aj.szam) + ft2('datum', 'Kelte', aj.datum, ' type="date"') + '</div>' +
    '<div class="row2">' + ft2('erv', 'Érvényes (nap)', aj.erv, ' inputmode="numeric"') + sel('allapot', 'Állapot', AJ_ALLAPOTOK.map(x => [x, x]), aj.allapot) + '</div>' +
    ft2('targy', 'Az ajánlat tárgya', aj.targy || p.nev) +
    '<div class="kv"><span>Megrendelő</span><b>' + esc(p.megrNev || '– nincs megadva –') + '</b></div>' +
    '<div class="btns" style="margin-bottom:0"><button class="btn sm" id="amegr">✏️ Megrendelő adatai</button></div></div>';
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
    ['szam', 'datum', 'allapot', 'targy', 'afa', 'reszlet', 'kezdes', 'idotartam', 'bevezeto', 'vallalas', 'nemtart', 'megj'].forEach(k => o[k] = $('#a_' + k).value.trim());
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
  $('#amegr').onclick = () => { save(true); projDialog(p); };
  if ($('#toceg')) $('#toceg').onclick = () => { save(true); go({ v: 'ceg' }); };
}

/* ---------- Ajánlat dokumentum ---------- */
function quoteHtml(p, fotoSrc) {
  const aj = ajOf(p); const c = cegOf(); const Q = computeQuote(p, aj);
  const lines = (s) => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
  const ervIg = (() => { const d = new Date(aj.datum || Date.now()); d.setDate(d.getDate() + (Number(aj.erv) || 0)); return huDate(isoDay(d)); })();
  const cegSor = [c.cim, c.adoszam ? 'Adószám: ' + c.adoszam : '', c.nyilv ? 'Nyilv. sz.: ' + c.nyilv : ''].filter(Boolean);
  const kapcs = [c.tel, c.email, c.web].filter(Boolean);
  let h = '<div class="q-paper">';
  // fejléc
  h += '<header class="q-head"><div class="q-brand">' + (S.data.logo ? '<img class="q-logo" src="' + S.data.logo + '" alt="">' : '') +
    '<div class="q-cegnev">' + esc(c.nev || 'Vállalkozó neve') + '</div>' +
    cegSor.map(x => '<div>' + esc(x) + '</div>').join('') + (kapcs.length ? '<div>' + esc(kapcs.join(' · ')) + '</div>' : '') + '</div>' +
    '<div class="q-title"><div class="q-h1">Árajánlat</div><table class="q-meta"><tr><td>Szám</td><td>' + esc(aj.szam) + '</td></tr><tr><td>Kelt</td><td>' + esc(huDate(aj.datum)) + '</td></tr><tr><td>Érvényes</td><td>' + esc(ervIg) + '-ig</td></tr></table></div></header>';
  // felek
  h += '<section class="q-parties"><div class="q-box"><div class="q-lbl">Megrendelő</div><div class="q-strong">' + esc(p.megrNev || '') + '</div>' +
    [p.megrCim, p.megrTel, p.megrEmail].filter(Boolean).map(x => '<div>' + esc(x) + '</div>').join('') + '</div>' +
    '<div class="q-box"><div class="q-lbl">Az ajánlat tárgya</div><div class="q-strong">' + esc(aj.targy || p.nev) + '</div>' + (p.hely ? '<div>Helyszín: ' + esc(p.hely) + '</div>' : '') +
    (aj.kezdes || aj.idotartam ? '<div>' + esc([aj.kezdes ? 'Kezdés: ' + aj.kezdes : '', aj.idotartam ? 'Időtartam: ' + aj.idotartam : ''].filter(Boolean).join(' · ')) + '</div>' : '') + '</div></section>';
  // bevezető
  h += '<section class="q-intro">' + lines(aj.bevezeto || bevezetoDef(p)).map(x => '<p>' + esc(x) + '</p>').join('') + '</section>';
  if (p.megj) h += '<section class="q-scope"><div class="q-lbl">A munka leírása</div><p>' + esc(p.megj).replace(/\n/g, '<br>') + '</p></section>';
  // tételek
  h += '<table class="q-tbl"><thead><tr><th class="q-n">#</th><th>Megnevezés</th><th class="q-r">Anyag, egyéb</th><th class="q-r">Munkadíj</th><th class="q-r">Összesen</th></tr></thead><tbody>';
  Q.rows.forEach((r, i) => {
    h += '<tr class="q-row"><td class="q-n">' + (i + 1) + '.</td><td><div class="q-strong">' + esc(r.nev) + '</div>' + (r.kalk || r.sub ? '<div class="q-sub">' + esc([r.kalk, r.sub].filter(Boolean).join(' · ')) + '</div>' : '') + '</td><td class="q-r">' + (r.anyag ? ft(r.anyag) : '–') + '</td><td class="q-r">' + (r.munka ? ft(r.munka) : '–') + '</td><td class="q-r q-strong">' + ft(r.total) + '</td></tr>';
    if (aj.reszlet === 'reszletes') for (const l of r.lines) {
      const qty = l.cat === 'anyag' ? (l.ptxt && l.packs != null ? l.ptxt : l.qtxt) : l.qtxt;
      h += '<tr class="q-det"><td></td><td>' + esc(l.name) + ' <span class="q-sub">' + esc(qty) + (l.up ? ' × ' + ft(l.up) : '') + '</span></td><td class="q-r">' + (l.cat !== 'munka' ? ft(l.amount) : '') + '</td><td class="q-r">' + (l.cat === 'munka' ? ft(l.amount) : '') + '</td><td></td></tr>';
    }
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
    '<div><div class="q-sigline"></div><div class="q-strong">Az ajánlatot elfogadom</div><div class="q-sub">' + esc(p.megrNev || 'Megrendelő') + ' · Dátum: ……………………</div></div></section>';
  h += '<footer class="q-foot">' + esc([c.nev, c.tel, c.email, c.bank ? 'Számlaszám: ' + c.bank : ''].filter(Boolean).join(' · ')) + '</footer>';
  return h + '</div>';
}
async function openQuote(p) {
  const fotoSrc = {};
  const kell = (p.fotok || []).filter(f => f.aj);
  if (kell.length) { toast('Fotók betöltése…'); for (const f of kell) { try { fotoSrc[f.id] = await fotoGet(f.id); } catch (e) {} } }
  let q = $('#quote');
  if (!q) { q = document.createElement('div'); q.id = 'quote'; document.body.appendChild(q); }
  const aj = ajOf(p);
  q.innerHTML = '<div class="q-bar"><button class="btn sm" id="qx">‹ Vissza</button><span class="q-bt">' + esc(aj.szam) + '</span><button class="btn sm pri" id="qp">🖨️ Nyomtatás / PDF</button></div>' + quoteHtml(p, fotoSrc);
  q.hidden = false; document.body.classList.add('quote-open');
  const fit = () => { const pp = q.querySelector('.q-paper'); if (pp) pp.style.zoom = Math.min(1, (window.innerWidth - 16) / 794); };
  fit(); window.addEventListener('resize', fit);
  history.pushState({ quote: 1 }, '');
  $('#qx').onclick = () => closeQuote();
  $('#qp').onclick = () => {
    const old = document.title; document.title = (aj.szam + ' ' + p.nev).replace(/[\\/:*?"<>|]+/g, '_');
    if (aj.allapot === 'Tervezet') { aj.allapot = 'Kiküldve'; p.aj = aj; upsertProjekt(p); }
    setTimeout(() => { window.print(); document.title = old; }, 50);
  };
  window.scrollTo(0, 0);
}
function closeQuote() { const q = $('#quote'); if (q) { q.hidden = true; q.innerHTML = ''; } document.body.classList.remove('quote-open'); render(); }
