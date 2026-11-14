/* Építőkalkulátor – pénzügyi kiegészítők
   1. Kiadások és haszon (megrendelésenként, blokkfotóval)
   2. Munkanapló (nap, óra, megjegyzés → tényleges órabér)
   3. Utánkövetés (7 napnál régebben kiküldött ajánlat → „Rákérdezni”)
   4. Árlista emelése egy gombbal (%-os, csoportonként, visszavonható)
   5. Havi összesítő (Több fül) */

const KOVETES_NAP = 7;
const napokOta = (iso) => { if (!iso) return 0; const a = Date.parse(String(iso).slice(0, 10)), b = Date.parse(isoDay()); return isFinite(a) ? Math.floor((b - a) / 864e5) : 0; };
const kiadasokOf = (p) => (p && Array.isArray(p.kiadasok)) ? p.kiadasok : [];
const naploOf = (p) => (p && Array.isArray(p.naplo)) ? p.naplo : [];
const kiadasOssz = (p) => kiadasokOf(p).reduce((s, k) => s + (Number(k.osszeg) || 0), 0);
const oraOssz = (p) => naploOf(p).reduce((s, n) => s + (Number(n.ora) || 0), 0);
const oraTxt = (x) => numStr(Math.round(x * 10) / 10) + ' óra';
const szazalek = (x) => (x > 0 ? '+' : '') + numStr(Math.round(x * 10) / 10) + '%';
const honapNev = (ym) => { const [y, m] = ym.split('-').map(Number); return y + '. ' + ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'][m - 1]; };
const honapLep = (ym, d) => { const [y, m] = ym.split('-').map(Number); const x = new Date(y, m - 1 + d, 1); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); };
const ebbenAHonapban = (iso, ym) => !!iso && String(iso).slice(0, 7) === ym;

/* ---------- 3. Utánkövetés ---------- */
const kikuldveNap = (p) => p.kikuldve || String(p.modositva || '').slice(0, 10);
const kovetendo = (p) => p.allapot === 'Kiküldve' && napokOta(kikuldveNap(p)) >= KOVETES_NAP;
const kovetesPill = (p) => kovetendo(p) ? '<span class="pill kovet">Rákérdezni</span>' : '';
function kovetesHtml(p) {
  if (!kovetendo(p)) return '';
  const u = ugyfelOf(p); const tel = u && u.tel ? String(u.tel).replace(/[^\d+]/g, '') : '';
  return '<div class="kovetes"><div class="kv-cim">📞 ' + napokOta(kikuldveNap(p)) + ' napja küldted ki az ajánlatot</div>' +
    '<div class="small muted">Érdemes rákérdezni, hogy döntött-e az ügyfél.</div>' +
    '<div class="btns" style="margin:10px 0 0">' + (tel ? '<a class="btn pri" href="tel:' + esc(tel) + '">📞 Hívás</a>' : '') +
    '<button class="btn" id="kv_ok">Elfogadta</button><button class="btn" id="kv_var">Még gondolkodik</button></div></div>';
}
function bindKovetes(p) {
  if (!$('#kv_ok')) return;
  $('#kv_ok').onclick = () => { p.allapot = 'Elfogadva'; if (!p.elfogadva) p.elfogadva = isoDay(); upsertProjekt(p); render(); toast('Állapot: Elfogadva'); };
  $('#kv_var').onclick = () => { p.kikuldve = isoDay(); upsertProjekt(p); render(); toast('Rendben, egy hét múlva újra szólok'); };
}

/* ---------- 1–2. Kiadások, haszon, munkanapló (megrendelés oldal) ---------- */
function penzugyHtml(p, ajanlat, munkadij) {
  const ks = kiadasokOf(p).slice().sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
  const kOssz = kiadasOssz(p); const haszon = ajanlat - kOssz;
  const mutK = S.kiadasMind === p.id ? ks : ks.slice(0, 3);
  let h = '<div class="szakasz"><div class="ghdr"><h2>Kiadások és haszon</h2><button class="btn sm" id="addk">+ Kiadás</button></div>';
  h += '<div class="card haszon">' +
    '<div class="kv"><span>Ajánlat (nettó)</span><b>' + ft(ajanlat) + '</b></div>' +
    '<div class="kv"><span>Kiadások' + (ks.length ? ' (' + ks.length + ' tétel)' : '') + '</span><b>' + (kOssz ? '−' + ft(kOssz) : ft(0)) + '</b></div>' +
    '<div class="kv hsz ' + (haszon >= 0 ? 'poz' : 'neg') + '"><span>Haszon</span><b>' + ft(haszon) + (ajanlat > 0 && kOssz ? ' <small>(' + Math.round(haszon / ajanlat * 100) + '%)</small>' : '') + '</b></div>' +
    (ks.length ? '' : '<div class="small muted" style="padding-top:6px">Írd be, mit vettél és mennyiért (anyag, fuvar, gépbérlés…), akár a blokk fotójával. Így látod, megérte-e a munka.</div>') + '</div>';
  if (ks.length) {
    h += '<div class="card list">' + mutK.map(k => '<div class="it" data-kid="' + k.id + '"><span class="ic">' + (k.foto ? '🧾' : '🛒') + '</span><div class="m"><b>' + esc(k.nev || 'Kiadás') + '</b><small>' + esc(dateHu(k.datum) + (k.foto ? ' · blokk csatolva' : '')) + '</small></div><div class="v">' + ft(k.osszeg) + '</div></div>').join('') + '</div>';
    if (ks.length > 3) h += '<div class="btns" style="margin-top:-2px"><button class="btn sm" id="kmind">' + (S.kiadasMind === p.id ? 'Kevesebb' : 'Mind a ' + ks.length + ' kiadás') + '</button></div>';
  }
  h += '</div>';

  // Munkanapló
  const ns = naploOf(p).slice().sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
  const ora = oraOssz(p); const napok = new Set(ns.map(n => n.datum)).size;
  const oradij = mat('md_ora').p || 0;
  const mutN = S.naploMind === p.id ? ns : ns.slice(0, 3);
  h += '<div class="szakasz"><div class="ghdr"><h2>Munkanapló</h2><button class="btn sm" id="addn">+ Munkanap</button></div><div class="card">';
  if (!ns.length) h += '<div class="small muted">Naponta egy sor: mikor, hány órát dolgoztál, mit csináltál. A végén látod, mennyi idő ment el a munkára, és ez mekkora órabérnek felel meg.</div>';
  else {
    h += '<div class="kv"><span>Ledolgozva</span><b>' + oraTxt(ora) + ' · ' + napok + ' nap</b></div>';
    if (munkadij > 0 && ora > 0) h += '<div class="kv"><span>Munkadíj ÷ óra = tényleges órabér</span><b>' + ft(munkadij / ora) + '/óra</b></div>';
    if (munkadij > 0 && oradij > 0) {
      const terv = munkadij / oradij; const elt = ora - terv;
      h += '<div class="kv"><span>Ajánlatban tervezett (óradíjad ' + ft(oradij) + ')</span><b>' + oraTxt(terv) + '</b></div>' +
        '<div class="kv hsz ' + (elt <= 0 ? 'poz' : 'neg') + '"><span>' + (elt <= 0 ? 'Gyorsabb a tervnél' : 'Több, mint tervezted') + '</span><b>' + oraTxt(Math.abs(elt)) + '</b></div>';
    }
  }
  h += '</div>';
  if (ns.length) {
    h += '<div class="card list">' + mutN.map(n => '<div class="it" data-nid="' + n.id + '"><span class="ic">🗓</span><div class="m"><b>' + esc(dateHu(n.datum)) + '</b><small>' + esc(n.megj || '—') + '</small></div><div class="v">' + oraTxt(Number(n.ora) || 0) + '</div></div>').join('') + '</div>';
    if (ns.length > 3) h += '<div class="btns" style="margin-top:-2px"><button class="btn sm" id="nmind">' + (S.naploMind === p.id ? 'Kevesebb' : 'Mind a ' + ns.length + ' nap') + '</button></div>';
  }
  h += '</div>';
  return h;
}
function bindPenzugy(p) {
  $('#addk').onclick = () => kiadasDialog(p, null);
  $('#addn').onclick = () => naploDialog(p, null);
  if ($('#kmind')) $('#kmind').onclick = () => { S.kiadasMind = S.kiadasMind === p.id ? null : p.id; render(); };
  if ($('#nmind')) $('#nmind').onclick = () => { S.naploMind = S.naploMind === p.id ? null : p.id; render(); };
  document.querySelectorAll('[data-kid]').forEach(el => el.onclick = () => kiadasDialog(p, kiadasokOf(p).find(k => k.id === el.dataset.kid)));
  document.querySelectorAll('[data-nid]').forEach(el => el.onclick = () => naploDialog(p, naploOf(p).find(n => n.id === el.dataset.nid)));
}

async function blokkFeltolt(p, file) {
  const full = await resizeImage(file, 1600, 0.82), thumb = await resizeImage(file, 360, 0.72);
  let id, tid;
  if (LOCAL) { id = uid('LF'); tid = uid('LT'); await IDB.put('f_' + id, full); await IDB.put('f_' + tid, thumb); }
  else {
    const j = await api('uploadFoto', { nev: (p.sorszam || p.nev || 'megrendeles') + ' blokk', full: full.split(',')[1], thumb: thumb.split(',')[1] });
    id = j.id; tid = j.tid; idbTry(IDB.put('f_' + id, full)); idbTry(IDB.put('f_' + tid, thumb));
  }
  FOTO_CACHE[id] = full; FOTO_CACHE[tid] = thumb;
  return { id, tid };
}
function blokkTorol(f) {
  if (!f) return;
  if (!LOCAL) enqueue('deleteFoto', { id: f.id, tid: f.tid });
  idbTry(IDB.del('f_' + f.id)); idbTry(IDB.del('f_' + f.tid));
}
function kiadasDialog(p, k) {
  const uj = !k; const d = k || { datum: isoDay(), nev: '', osszeg: 0, foto: null };
  const h = '<h3>' + (uj ? 'Új kiadás' : 'Kiadás') + '</h3>' +
    '<div class="row2"><div class="fld"><label>Dátum</label><input type="date" id="kd" value="' + esc(d.datum) + '"></div>' +
    '<div class="fld"><label>Összeg (Ft)</label><input id="ko" inputmode="numeric" value="' + (d.osszeg ? dotted(d.osszeg) : '') + '" placeholder="0"></div></div>' +
    '<div class="fld"><label>Mire ment?</label><input id="kn" list="knl" value="' + esc(d.nev) + '" placeholder="pl. Csemperagasztó, fuga – Praktiker"><datalist id="knl"><option>Anyagvásárlás</option><option>Fuvar, szállítás</option><option>Gépbérlés</option><option>Sitt elszállítás</option><option>Alvállalkozó</option><option>Üzemanyag</option></datalist></div>' +
    '<div class="fld"><label>Blokk / számla fotója</label><div class="blokk-sor">' +
    '<div class="blokk-kep" id="kbk">' + (d.foto ? '<img id="kbimg" alt="Blokk">' : '<span class="small muted">Nincs csatolva</span>') + '</div>' +
    '<label class="btn sm" style="cursor:pointer">' + (d.foto ? 'Csere' : '+ Fotó') + '<input type="file" id="kf" accept="image/*" capture="environment" hidden></label>' +
    (d.foto ? '<button class="btn sm" id="kfx">Levétel</button>' : '') + '</div></div>' +
    '<div class="btns"><button class="btn pri wide" id="kok">Mentés</button><button class="btn" id="kx">Mégse</button></div>' +
    (uj ? '' : '<div class="btns"><button class="btn danger" id="kdel">Kiadás törlése</button></div>');
  openModal(h, m => {
    priceInput($('#ko', m));
    let ujFajl = null, levesz = false;
    if (d.foto) fotoGet(d.foto.tid).then(src => { const i = $('#kbimg', m); if (src && i) i.src = src; }).catch(() => {});
    if (d.foto) $('#kbk', m).onclick = () => { const k = $('#kbk', m); if (k.classList.toggle('nagy')) fotoGet(d.foto.id).then(src => { const i = $('#kbimg', m); if (src && i) i.src = src; }).catch(() => {}); };
    $('#kf', m).onchange = () => {
      ujFajl = $('#kf', m).files[0] || null; levesz = false;
      if (ujFajl) { const r = new FileReader(); r.onload = () => { $('#kbk', m).innerHTML = '<img alt="Blokk" src="' + r.result + '">'; }; r.readAsDataURL(ujFajl); }
    };
    if ($('#kfx', m)) $('#kfx', m).onclick = () => { levesz = true; ujFajl = null; $('#kbk', m).innerHTML = '<span class="small muted">Mentéskor leveszem</span>'; };
    $('#kx', m).onclick = closeModal;
    $('#kok', m).onclick = async () => {
      const osszeg = priceVal($('#ko', m)); if (!osszeg) { $('#ko', m).focus(); return; }
      const rec = Object.assign({}, d, { id: d.id || uid('K'), datum: $('#kd', m).value || isoDay(), nev: $('#kn', m).value.trim(), osszeg });
      if (levesz && d.foto) { blokkTorol(d.foto); rec.foto = null; }
      if (ujFajl) {
        if (!LOCAL && !navigator.onLine) toast('A fotóhoz internet kell – a kiadást fotó nélkül mentem');
        else {
          const b = $('#kok', m); b.disabled = true; b.textContent = 'Fotó feltöltése…';
          try { const f = await blokkFeltolt(p, ujFajl); if (d.foto && !levesz) blokkTorol(d.foto); rec.foto = f; }
          catch (e) { toast('Fotó hiba: ' + e.message); }
        }
      }
      p.kiadasok = uj ? kiadasokOf(p).concat([rec]) : kiadasokOf(p).map(x => x.id === rec.id ? rec : x);
      upsertProjekt(p); closeModal(); render(); toast(uj ? 'Kiadás rögzítve' : 'Mentve');
    };
    if (!uj) $('#kdel', m).onclick = () => {
      if (!confirm('Törlöd ezt a kiadást (' + ft(d.osszeg) + ')?')) return;
      blokkTorol(d.foto); p.kiadasok = kiadasokOf(p).filter(x => x.id !== d.id);
      upsertProjekt(p); closeModal(); render(); toast('Kiadás törölve');
    };
  });
}
function naploDialog(p, n) {
  const uj = !n; const d = n || { datum: isoDay(), ora: 8, megj: '' };
  const h = '<h3>' + (uj ? 'Új munkanap' : 'Munkanap') + '</h3>' +
    '<div class="row2"><div class="fld"><label>Dátum</label><input type="date" id="nd" value="' + esc(d.datum) + '"></div>' +
    '<div class="fld"><label>Óra</label><input id="no" inputmode="decimal" value="' + esc(numStr(d.ora)) + '"></div></div>' +
    '<div class="btns" style="margin-top:-4px">' + [4, 6, 8, 10].map(x => '<button class="btn sm" data-o="' + x + '">' + x + ' óra</button>').join('') + '</div>' +
    '<div class="fld"><label>Mit csináltál? (nem kötelező)</label><input id="nm" value="' + esc(d.megj) + '" placeholder="pl. Csempézés, fürdő fal"></div>' +
    '<div class="btns"><button class="btn pri wide" id="nok">Mentés</button><button class="btn" id="nx">Mégse</button></div>' +
    (uj ? '' : '<div class="btns"><button class="btn danger" id="ndel">Nap törlése</button></div>');
  openModal(h, m => {
    m.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { $('#no', m).value = b.dataset.o; });
    $('#nx', m).onclick = closeModal;
    $('#nok', m).onclick = () => {
      const ora = Number(parseNum($('#no', m).value)) || 0; if (ora <= 0 || ora > 24) { $('#no', m).focus(); return; }
      const rec = Object.assign({}, d, { id: d.id || uid('N'), datum: $('#nd', m).value || isoDay(), ora, megj: $('#nm', m).value.trim() });
      p.naplo = uj ? naploOf(p).concat([rec]) : naploOf(p).map(x => x.id === rec.id ? rec : x);
      upsertProjekt(p); closeModal(); render(); toast(uj ? 'Munkanap rögzítve' : 'Mentve');
    };
    if (!uj) $('#ndel', m).onclick = () => {
      if (!confirm('Törlöd ezt a munkanapot?')) return;
      p.naplo = naploOf(p).filter(x => x.id !== d.id); upsertProjekt(p); closeModal(); render(); toast('Munkanap törölve');
    };
  });
}

/* ---------- 4. Árlista emelése ---------- */
function arEmelesDialog() {
  const csop = allGroups();
  const h = '<h3>Árak emelése</h3><p class="small muted" style="margin-top:-6px">Minden kijelölt anyag ára egyszerre változik. Csökkentéshez írj mínusz számot. Utána egy gombbal visszavonhatod.</p>' +
    '<div class="row2"><div class="fld"><label>Változás (%)</label><input id="ep" inputmode="decimal" value="5"></div>' +
    '<div class="fld"><label>Kerekítés</label><select id="ek"><option value="1">1 Ft-ra</option><option value="10" selected>10 Ft-ra</option><option value="100">100 Ft-ra</option></select></div></div>' +
    '<div class="fld"><label>Mire vonatkozzon?</label><select id="ec"><option value="_anyag">Minden anyag (munkadíjak nélkül)</option><option value="_mind">Minden tétel, munkadíjakkal együtt</option>' +
    csop.map(g => '<option value="' + esc(g) + '">Csak: ' + esc(g) + '</option>').join('') + '</select></div>' +
    '<div class="banner" id="eprev"></div>' +
    '<div class="btns"><button class="btn pri wide" id="eok">Árak módosítása</button><button class="btn" id="ex">Mégse</button></div>';
  openModal(h, m => {
    const kor = () => Number($('#ek', m).value) || 1;
    const szaz = () => Number(parseNum($('#ep', m).value)) || 0;
    const kulcsok = () => {
      const c = $('#ec', m).value;
      return allMatKeys().filter(k => mat(k).p > 0 && (c === '_mind' || (c === '_anyag' ? mat(k).g !== 'Munkadíj' : mat(k).g === c)));
    };
    const uj = (p) => Math.max(kor(), Math.round(p * (1 + szaz() / 100) / kor()) * kor());
    const prev = () => {
      const ks = kulcsok(); const pl = ks[0] && mat(ks[0]);
      $('#eprev', m).textContent = ks.length ? ks.length + ' tétel változik ' + szazalek(szaz()) + '-kal. Például: ' + pl.n + ' ' + ft(pl.p) + ' → ' + ft(uj(pl.p)) : 'Ebben a körben nincs áras tétel.';
    };
    prev(); ['#ep', '#ek', '#ec'].forEach(s => { $(s, m).oninput = prev; $(s, m).onchange = prev; });
    $('#ex', m).onclick = closeModal;
    $('#eok', m).onclick = () => {
      const ks = kulcsok(); if (!ks.length || !szaz()) return;
      const vissza = {}; const items = [];
      for (const k of ks) {
        vissza[k] = S.data.arlista[k] ? JSON.parse(JSON.stringify(S.data.arlista[k])) : null;
        S.data.arlista[k] = Object.assign({}, S.data.arlista[k] || {}, { p: uj(mat(k).p) });
        items.push(arRow(k, mat(k)));
      }
      saveCache(); enqueue('saveArak', { items });
      S.arVissza = { vissza, txt: szazalek(szaz()) + ', ' + ks.length + ' tétel' };
      closeModal(); render(); toast('Árak módosítva: ' + S.arVissza.txt);
    };
  });
}
function arVisszaHtml() {
  return S.arVissza ? '<div class="banner ar-vissza"><span>Utolsó árváltozás: ' + esc(S.arVissza.txt) + '</span><button class="btn sm" id="arv">Visszavonás</button></div>' : '';
}
function bindArEmeles() {
  if ($('#arem')) $('#arem').onclick = arEmelesDialog;
  if ($('#arv')) $('#arv').onclick = () => {
    const v = S.arVissza.vissza; const items = [];
    for (const k of Object.keys(v)) {
      if (v[k]) { S.data.arlista[k] = v[k]; items.push(arRow(k, mat(k))); }
      else deleteAr(k);
    }
    saveCache(); if (items.length) enqueue('saveArak', { items });
    S.arVissza = null; render(); toast('Árak visszaállítva');
  };
}

/* ---------- 5. Havi összesítő ---------- */
function haviHtml() {
  const ym = S.honap || (S.honap = isoDay().slice(0, 7));
  const ps = S.data.projektek;
  const kik = ps.filter(p => ebbenAHonapban(p.kikuldve, ym));
  const elf = ps.filter(p => ebbenAHonapban(p.elfogadva, ym));
  const fiz = ps.filter(p => p.szamla && ebbenAHonapban(p.szamla.fizetve, ym));
  const befolyt = fiz.reduce((s, p) => s + (Number(p.szamla.osszeg) || 0), 0);
  let kiad = 0, ora = 0;
  ps.forEach(p => { kiadasokOf(p).forEach(k => { if (ebbenAHonapban(k.datum, ym)) kiad += Number(k.osszeg) || 0; }); naploOf(p).forEach(n => { if (ebbenAHonapban(n.datum, ym)) ora += Number(n.ora) || 0; }); });
  const kint = ps.filter(fizetesreVar); const kintOssz = kint.reduce((s, p) => s + (Number(p.szamla.osszeg) || 0), 0);
  const lejart = kint.filter(p => p.szamla.hatarido && p.szamla.hatarido < isoDay()).length;
  const kov = ps.filter(kovetendo).length;
  const sum = (arr) => arr.reduce((s, p) => s + megrKoltseg(p), 0);
  const egy = befolyt - kiad;
  let h = '<div class="ghdr"><h2>Havi összesítő</h2></div><div class="card havi">' +
    '<div class="havi-fej"><button class="btn sm" id="hprev" aria-label="Előző hónap">‹</button><b>' + honapNev(ym) + '</b><button class="btn sm" id="hnext" aria-label="Következő hónap"' + (ym >= isoDay().slice(0, 7) ? ' disabled' : '') + '>›</button></div>' +
    '<div class="kv"><span>Kiküldött ajánlatok</span><b>' + kik.length + ' db · ' + ft(sum(kik)) + '</b></div>' +
    '<div class="kv"><span>Elfogadott munkák</span><b>' + elf.length + ' db · ' + ft(sum(elf)) + '</b></div>' +
    '<div class="kv"><span>Befolyt (kifizetett számlák)</span><b>' + ft(befolyt) + '</b></div>' +
    '<div class="kv"><span>Kiadások</span><b>' + (kiad ? '−' + ft(kiad) : ft(0)) + '</b></div>' +
    '<div class="kv hsz ' + (egy >= 0 ? 'poz' : 'neg') + '"><span>Egyenleg (befolyt − kiadás)</span><b>' + ft(egy) + '</b></div>' +
    (ora ? '<div class="kv"><span>Ledolgozott órák</span><b>' + oraTxt(ora) + '</b></div>' : '') + '</div>';
  h += '<div class="card list">' +
    '<div class="it" id="hkint"><span class="ic">🧾</span><div class="m"><b>Kintlévőség: ' + ft(kintOssz) + '</b><small>' + (kint.length ? kint.length + ' kiállított, még nem fizetett számla' + (lejart ? ' · ' + lejart + ' lejárt' : '') : 'Minden kiállított számla ki van fizetve') + '</small></div>' + (kint.length ? '<span class="arrow">›</span>' : '') + '</div>' +
    '<div class="it" id="hkov"><span class="ic">📞</span><div class="m"><b>Rákérdezni: ' + kov + ' ajánlat</b><small>' + (kov ? KOVETES_NAP + ' napnál régebben kiküldve, még nincs döntés' : 'Nincs régóta váró ajánlat') + '</small></div>' + (kov ? '<span class="arrow">›</span>' : '') + '</div></div>';
  return h;
}
function bindHavi() {
  $('#hprev').onclick = () => { S.honap = honapLep(S.honap, -1); render(); };
  $('#hnext').onclick = () => { S.honap = honapLep(S.honap, 1); render(); };
  $('#hkint').onclick = () => { if (!S.data.projektek.some(fizetesreVar)) return; S.ugyNezet = 'megr'; S.projFilter = 'Fiz'; setTab('proj'); };
  $('#hkov').onclick = () => { if (!S.data.projektek.some(kovetendo)) return; S.ugyNezet = 'megr'; S.projFilter = 'Kovet'; setTab('proj'); };
}
