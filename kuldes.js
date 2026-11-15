/* Metrum – árajánlat ellenőrzése, PDF készítése és kiküldése e-mailben */

/* ---------- Ellenőrzés küldés előtt ---------- */
function ajEllenorzes(p) {
  const aj = ajOf(p), c = cegOf(), Q = computeQuote(p, aj), ug = ugyfelOf(p) || {}, za = arZarAllapot(p);
  const L = [];
  if (!Q.rows.length) L.push(['hiba', 'Az ajánlatban nincs egyetlen tétel sem.']);
  if (za && za.lejart) L.push(['hiba', 'Az ajánlat lejárt – küldés előtt aktualizáld (Ajánlat → Aktualizálás).']);
  if (!ug.nev) L.push(['hiba', 'Nincs megadva a megrendelő.']);
  else if (!ug.email) L.push(['figy', 'A megrendelőnek nincs e-mail címe – e-mailben így nem tudod kiküldeni.']);
  if (!c.nev) L.push(['figy', 'Hiányoznak a vállalkozói adataid (Több → Vállalkozói adatok).']);
  const arNelkul = [];
  Q.rows.forEach(r => (r.lines || []).forEach(l => { if (l.cat !== 'egyeb' && !l.amount && Number(l.q) > 0) arNelkul.push(l.name); }));
  if (arNelkul.length) L.push(['figy', 'Ár nélküli tétel: ' + [...new Set(arNelkul)].slice(0, 5).join(', ') + (arNelkul.length > 5 ? '…' : '') + ' – nézd meg az árlistát.']);
  Q.rows.filter(r => !r.total).forEach(r => L.push(['figy', '„' + r.nev + '” sor összege 0 Ft.']));
  const kimarad = mrsOf(p).filter(m => m.ajanlatban === false);
  if (kimarad.length) L.push(['info', 'Nincs az ajánlatban: ' + kimarad.map(m => m.nev).join(', ') + '.']);
  L.push(['ok', Q.rows.length + ' tétel · ' + (aj.afa === '27' ? 'bruttó ' : '') + ft(Q.brutto) + ' · érvényes ' + huDate(ervIgIso(aj)) + '-ig']);
  return L;
}
function ellenorzesHtml(p) {
  const L = ajEllenorzes(p), hiba = L.some(x => x[0] === 'hiba');
  const ik = { hiba: '⛔', figy: '⚠️', info: 'ℹ️', ok: '✅' };
  return '<div class="q-ell' + (hiba ? ' van-hiba' : '') + '"><div class="q-ell-c">Nézd át a tételeket, mielőtt kiküldöd</div>' +
    L.map(x => '<div class="q-ell-s ' + x[0] + '">' + ik[x[0]] + ' ' + esc(x[1]) + '</div>').join('') + '</div>';
}

/* ---------- PDF az ajánlatból (oldalra tördelt kép, A4) ---------- */
let QUOTE_CSS = null;
async function quoteCss() {
  if (QUOTE_CSS) return QUOTE_CSS;
  try { QUOTE_CSS = await (await fetch('style.css?v=' + APP_VERSION)).text(); } catch (e) { QUOTE_CSS = ''; }
  return QUOTE_CSS;
}
async function quotePdf(paper) {
  const W = 794, PH = 1123, M = 40;
  const zoom0 = paper.style.zoom; paper.style.zoom = 1;
  const top0 = paper.getBoundingClientRect().top;
  const H = Math.ceil(paper.scrollHeight);
  // tördelési pontok: blokkok és táblázatsorok alja
  const cand = [...new Set([...paper.querySelectorAll(':scope > *, tr, li, p, figure, .q-box')].map(el => Math.round(el.getBoundingClientRect().bottom - top0)))].filter(y => y > 0).sort((a, b) => a - b);
  paper.style.zoom = zoom0;
  const veg = Math.min(H, (cand[cand.length - 1] || H) + 12); // az alsó belső margó nem kell
  const lapok = []; let y = 0;
  while (y < veg - 4) {
    const hely = (lapok.length ? PH - 2 * M : PH - M);
    let v = y + hely;
    if (veg - y <= hely + M - 14) v = veg; // a maradék (pl. lábléc) befér az alsó margóba
    else if (v < veg) { const jo = cand.filter(c => c > y + 120 && c <= v); if (jo.length) v = jo[jo.length - 1]; } else v = H;
    if (v > veg) v = veg;
    lapok.push([y, v]); y = v;
  }
  // raszterizálás SVG foreignObject-tel
  const css = await quoteCss();
  const sc = Math.min(2, 30000 / H);
  const wrap = document.createElement('div');
  const st = document.createElement('style');
  st.textContent = css + '\n.q-paper{zoom:1!important;margin:0!important;box-shadow:none!important;width:' + W + 'px!important}.q-ell{display:none!important}';
  wrap.appendChild(st); const kl = paper.cloneNode(true); kl.style.zoom = 1; wrap.appendChild(kl);
  const xhtml = new XMLSerializer().serializeToString(wrap);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><foreignObject x="0" y="0" width="100%" height="100%">' + xhtml + '</foreignObject></svg>';
  const img = await new Promise((ok, hiba) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => hiba(new Error('A PDF képét nem sikerült elkészíteni')); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const nagy = document.createElement('canvas'); nagy.width = Math.round(W * sc); nagy.height = Math.round(H * sc);
  const g = nagy.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, nagy.width, nagy.height); g.drawImage(img, 0, 0, nagy.width, nagy.height);
  const jpgek = lapok.map(([a, b], i) => {
    const cv = document.createElement('canvas'); cv.width = Math.round(W * sc); cv.height = Math.round(PH * sc);
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
    const cel = i ? M : 0;
    x.drawImage(nagy, 0, Math.round(a * sc), nagy.width, Math.round((b - a) * sc), 0, Math.round(cel * sc), cv.width, Math.round((b - a) * sc));
    if (lapok.length > 1) { x.fillStyle = '#8A8582'; x.font = Math.round(10 * sc) + 'px -apple-system,Segoe UI,Roboto,Arial'; x.textAlign = 'right'; x.fillText((i + 1) + '/' + lapok.length + '. oldal', cv.width - 48 * sc, cv.height - 18 * sc); }
    return { w: cv.width, h: cv.height, b: dataUrlBytes(cv.toDataURL('image/jpeg', 0.86)) };
  });
  return pdfJpegbol(jpgek);
}
function dataUrlBytes(d) { const s = atob(d.split(',')[1]); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
// minimális PDF író: oldalanként egy JPEG kép, A4
function pdfJpegbol(lapok) {
  const enc = new TextEncoder(), reszek = [], ofs = []; let hossz = 0;
  const ir = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; reszek.push(b); hossz += b.length; };
  const obj = (n, fn) => { ofs[n] = hossz; ir(n + ' 0 obj\n'); fn(); ir('\nendobj\n'); };
  const n = lapok.length, A4w = 595.28, A4h = 841.89;
  ir('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, () => ir('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => ir('<< /Type /Pages /Count ' + n + ' /Kids [' + lapok.map((_, i) => (3 + i * 3) + ' 0 R').join(' ') + '] >>'));
  lapok.forEach((l, i) => {
    const pg = 3 + i * 3, im = pg + 1, ct = pg + 2;
    obj(pg, () => ir('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + A4w + ' ' + A4h + '] /Resources << /XObject << /Im' + i + ' ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>'));
    obj(im, () => { ir('<< /Type /XObject /Subtype /Image /Width ' + l.w + ' /Height ' + l.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + l.b.length + ' >>\nstream\n'); ir(l.b); ir('\nendstream'); });
    const s = 'q ' + A4w + ' 0 0 ' + A4h + ' 0 0 cm /Im' + i + ' Do Q';
    obj(ct, () => ir('<< /Length ' + s.length + ' >>\nstream\n' + s + '\nendstream'));
  });
  const xref = hossz, db = 3 + n * 3;
  let x = 'xref\n0 ' + db + '\n0000000000 65535 f \n';
  for (let i = 1; i < db; i++) x += String(ofs[i]).padStart(10, '0') + ' 00000 n \n';
  ir(x + 'trailer\n<< /Size ' + db + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
  return new Blob(reszek, { type: 'application/pdf' });
}
const blobBase64 = (b) => new Promise((ok, hiba) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = hiba; r.readAsDataURL(b); });
const pdfFajlnev = (p, aj) => (aj.szam + ' ' + ugyfelNev(p) + ' árajánlat').replace(/[\\/:*?"<>|]+/g, '_') + '.pdf';
function letolt(blob, nev) { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = nev; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }

/* ---------- Véglegesítés: kiküldött állapot + árzárolás ---------- */
function ajVeglegesit(p, kinek) {
  if (p.allapot === 'Ajánlat') p.allapot = 'Kiküldve';
  if (p.allapot === 'Kiküldve') { p.kikuldve = isoDay(); arZarol(p); }
  if (kinek) { p.aj = ajOf(p); p.aj.kuldesek = (p.aj.kuldesek || []).concat([{ to: kinek, datum: isoDay() }]); }
  upsertProjekt(p);
}

/* ---------- Küldés e-mailben ---------- */
function kuldesDialog(p, paper) {
  const aj = ajOf(p), c = cegOf(), ug = ugyfelOf(p) || {};
  const L = ajEllenorzes(p), hibak = L.filter(x => x[0] === 'hiba');
  const megszolit = 'Tisztelt ' + (ug.nev || 'Megrendelő') + '!';
  const alair = [c.kapcs, c.nev, c.tel, c.email].filter(Boolean).join('\n');
  const uzenet = megszolit + '\n\nMellékelten küldöm a(z) „' + (aj.targy || megrLabel(p)) + '” munkáira vonatkozó árajánlatunkat (' + aj.szam + '), amely ' + huDate(ervIgIso(aj)) + '-ig érvényes.\nHa kérdése van, vagy módosítana valamin, keressen bizalommal.\n\nÜdvözlettel:\n' + alair;
  const tudMegosztani = !!(navigator.canShare && window.File && navigator.canShare({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] }));
  const korabbi = (aj.kuldesek || []).map(k => huDate(k.datum) + ' → ' + k.to).join(', ');
  const h = '<h3>Ajánlat küldése</h3>' +
    (hibak.length ? '<div class="warn">' + hibak.map(x => esc(x[1])).join('<br>') + '</div>' : '') +
    (korabbi ? '<div class="small muted" style="margin:-4px 0 10px">Korábban elküldve: ' + esc(korabbi) + '</div>' : '') +
    '<div class="card"><div class="fld"><label>Címzett</label><input id="ke_to" type="email" inputmode="email" value="' + esc(ug.email || '') + '" placeholder="megrendelo@pelda.hu"></div>' +
    (c.email ? '<div class="f"><label for="ke_cc">Másolat nekem<span class="help">' + esc(c.email) + '</span></label><label class="sw"><input type="checkbox" id="ke_cc" checked><i></i></label></div>' : '') +
    '<div class="fld"><label>Tárgy</label><input id="ke_t" value="' + esc('Árajánlat – ' + (aj.targy || megrLabel(p)) + ' (' + aj.szam + ')') + '"></div>' +
    '<div class="fld"><label>Üzenet</label><textarea id="ke_u" rows="9">' + esc(uzenet) + '</textarea></div>' +
    '<div class="small muted">Az ajánlat PDF-ként megy csatolmányban' + (c.email ? ', a válasz a te címedre érkezik' : '') + '.</div></div>' +
    (LOCAL ? '<div class="warn">Helyi módban nincs szerver, ezért közvetlenül nem tudok e-mailt küldeni – használd a megosztást vagy a PDF letöltését.</div>' : '') +
    '<div class="btns"><button class="btn" id="ke_x">Mégse</button><button class="btn" id="ke_pdf">⬇ PDF</button>' + (tudMegosztani ? '<button class="btn" id="ke_sh">Megosztás…</button>' : '') +
    '<button class="btn pri" id="ke_ok"' + (LOCAL || hibak.length ? ' disabled' : '') + '>✉️ Küldés</button></div>';
  let pdf = null;
  const keszit = async () => { if (!pdf) { toast('PDF készül…'); pdf = await quotePdf(paper); } return pdf; };
  openModal(h, m => {
    $('#ke_x', m).onclick = closeModal;
    $('#ke_pdf', m).onclick = async () => { try { letolt(await keszit(), pdfFajlnev(p, aj)); } catch (e) { toast(e.message); } };
    if ($('#ke_sh', m)) $('#ke_sh', m).onclick = async () => {
      try {
        const f = new File([await keszit()], pdfFajlnev(p, aj), { type: 'application/pdf' });
        await navigator.share({ files: [f], title: $('#ke_t', m).value, text: $('#ke_u', m).value });
        if (!hibak.length && confirm('Sikerült elküldeni? Ha igen, az ajánlatot kiküldöttnek jelölöm, és az árai rögzülnek.')) { ajVeglegesit(p, 'megosztás'); closeModal(); toast('Kiküldöttnek jelölve'); }
      } catch (e) { if (e.name !== 'AbortError') toast(e.message); }
    };
    $('#ke_ok', m).onclick = async () => {
      const to = $('#ke_to', m).value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { toast('Adj meg érvényes e-mail címet'); return; }
      const gomb = $('#ke_ok', m); gomb.disabled = true; gomb.textContent = 'Küldés…';
      try {
        const b64 = await blobBase64(await keszit());
        const r = await api('sendAjanlat', { to, cc: $('#ke_cc', m) && $('#ke_cc', m).checked ? c.email : '', targy: $('#ke_t', m).value, uzenet: $('#ke_u', m).value, fajl: pdfFajlnev(p, aj), pdf: b64, nev: c.nev || '', valaszCim: c.email || '' });
        if (!ug.email && ug.id) { ug.email = to; if (typeof upsertUgyfel === 'function') upsertUgyfel(ug); }
        ajVeglegesit(p, to); closeModal(); closeQuote();
        toast('Elküldve: ' + to + (r.maradek != null ? ' (ma még ' + r.maradek + ' e-mail küldhető)' : ''));
      } catch (e) { gomb.disabled = false; gomb.textContent = '✉️ Küldés'; toast('Nem sikerült elküldeni: ' + e.message); }
    };
  });
}
