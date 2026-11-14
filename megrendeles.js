/* Építőkalkulátor – Ügyfél → Megrendelés → Munkarész
   Belül a megrendelés neve továbbra is "projekt" (S.data.projektek), a felületen mindenhol megrendelés. */

const ALLAPOTOK = [
  ['Ajánlat', 'Az ajánlat készül', 'gray'],
  ['Kiküldve', 'Az ajánlatot elküldted, válaszra vársz', ''],
  ['Elfogadva', 'Az ügyfél elfogadta – a munka elvégzendő', 'ok'],
  ['Kész', 'A munka elkészült, átadva – lezárt', 'done'],
  ['Elutasítva', 'Nem lett belőle munka – lezárt', 'gray'],
];
const LEZART = { 'Kész': 1, 'Elutasítva': 1 };
const isAktiv = (p) => !LEZART[p.allapot];
const allapotPill = (a) => { const x = ALLAPOTOK.find(y => y[0] === a) || ALLAPOTOK[0]; return '<span class="pill ' + x[2] + '">' + esc(x[0]) + '</span>'; };

/* ---------- Segédek ---------- */
const ugyfelById = (id) => S.data.ugyfelek.find(u => u.id === id);
const ugyfelOf = (p) => (p && ugyfelById(p.ugyfelId)) || null;
const ugyfelNev = (p) => { const u = ugyfelOf(p); return u ? u.nev : 'Ügyfél nélkül'; };
const mrById = (id) => S.data.munkareszek.find(m => m.id === id);
const megrOf = (mr) => mr && S.data.projektek.find(p => p.id === mr.projektId);
const mrsOf = (p) => S.data.munkareszek.filter(m => m.projektId === p.id).sort((a, b) => (a.sorrend || 0) - (b.sorrend || 0) || String(a.letrehozva || '').localeCompare(String(b.letrehozva || '')));
const tetelekOfMr = (mr) => S.data.tetelek.filter(t => t.munkareszId === mr.id).sort((a, b) => String(a.letrehozva || '').localeCompare(String(b.letrehozva || '')));
const megrendelesekOf = (u) => S.data.projektek.filter(p => p.ugyfelId === u.id);
function megrLabel(p) { if (!p) return ''; const ms = mrsOf(p).map(m => m.nev); return p.nev || (ms.length ? ms.slice(0, 3).join(', ') + (ms.length > 3 ? '…' : '') : 'Új megrendelés'); }
const megrKoltseg = (p) => sumCost(aggregate(S.data.tetelek.filter(t => t.projektId === p.id)));
const mrKoltseg = (mr) => sumCost(aggregate(tetelekOfMr(mr)));
function ugyfelDatalist() { return '<datalist id="ugyfelLista">' + S.data.ugyfelek.map(u => '<option value="' + esc(u.nev) + '">').join('') + '</datalist>'; }
function ugyfelByNameOrNew(nev) {
  const n = nev.trim().toLowerCase();
  let u = S.data.ugyfelek.find(x => (x.nev || '').trim().toLowerCase() === n);
  if (!u) { u = { id: uid('U'), nev: nev.trim(), cim: '', tel: '', email: '', megj: '' }; upsertUgyfel(u); }
  return u;
}
function nextSorszam() {
  const y = new Date().getFullYear(); let max = 0;
  for (const p of S.data.projektek) { const m = String(p.sorszam || '').match(/M-(\d{4})-(\d+)/); if (m && Number(m[1]) === y) max = Math.max(max, Number(m[2])); }
  return 'M-' + y + '-' + String(max + 1).padStart(3, '0');
}
function ujMegrendeles(u, extra) {
  const p = Object.assign({ id: uid('P'), ugyfelId: u.id, sorszam: nextSorszam(), nev: '', hely: u.cim || '', megj: '', allapot: 'Ajánlat', helyisegek: [], fotok: [], aj: {} }, extra || {});
  upsertProjekt(p); return p;
}
function ujMunkaresz(p, nev) {
  const mr = { id: uid('R'), projektId: p.id, nev: nev || 'Munkarész', sorrend: mrsOf(p).length + 1, ajanlatban: true };
  upsertMunkaresz(mr); return mr;
}

/* ---------- Régi adatok átalakítása (projekt → ügyfél + megrendelés + munkarész) ---------- */
function migrateData() {
  let n = 0;
  const regiAllapot = (p) => {
    const a = p.aj && p.aj.allapot;
    if (a === 'Elutasítva') return 'Elutasítva';
    if (p.allapot === 'Lezárt') return 'Kész';
    if (a === 'Elfogadva') return 'Elfogadva';
    if (a === 'Kiküldve') return 'Kiküldve';
    return 'Ajánlat';
  };
  const sorrend = S.data.projektek.slice().sort((a, b) => String(a.letrehozva || '').localeCompare(String(b.letrehozva || '')));
  for (const p of sorrend) {
    let ch = false;
    if (!p.ugyfelId || !ugyfelById(p.ugyfelId)) {
      const nev = (p.megrNev || '').trim() || 'Névtelen ügyfél';
      const u = ugyfelByNameOrNew(nev);
      if (u.nev !== nev && u.nev === u.nev.toLowerCase() && nev !== nev.toLowerCase()) { u.nev = nev; upsertUgyfel(u); } // a szebben írt nevet tartjuk meg
      if (!u.cim && p.megrCim) { u.cim = p.megrCim; u.tel = u.tel || p.megrTel || ''; u.email = u.email || p.megrEmail || ''; upsertUgyfel(u); }
      p.ugyfelId = u.id; ch = true;
    }
    if (!ALLAPOTOK.some(a => a[0] === p.allapot)) { p.allapot = regiAllapot(p); ch = true; }
    if (!p.sorszam) { p.sorszam = nextSorszam(); ch = true; }
    const arva = S.data.tetelek.filter(t => t.projektId === p.id && (!t.munkareszId || !mrById(t.munkareszId)));
    if (arva.length) {
      const csop = new Map();
      for (const t of arva) { const r = roomById(p, tetelRoomId(t)); const k = r ? r.id : ''; if (!csop.has(k)) csop.set(k, []); csop.get(k).push(t); }
      for (const [k, ts] of csop) {
        const r = roomById(p, k);
        const mr = ujMunkaresz(p, r ? r.nev : (p.nev || 'Általános'));
        for (const t of ts) { t.munkareszId = mr.id; upsertTetel(t); }
      }
      ch = true;
    }
    if (ch) { upsertProjekt(p); n++; }
  }
  if (n) toast(n + ' korábbi projekt átalakítva megrendeléssé');
  return n;
}

/* ---------- Ügyfelek lista / összes megrendelés ---------- */
function renderUgyfelek() {
  S.ugyNezet = S.ugyNezet || 'ugyfel';
  const q = (S.ugyKeres || '').toLowerCase();
  setHeader('Ügyfelek', S.data.ugyfelek.length + ' ügyfél · ' + S.data.projektek.filter(isAktiv).length + ' aktív megrendelés');
  let h = '<div class="seg"><button data-n="ugyfel"' + (S.ugyNezet === 'ugyfel' ? ' class="on"' : '') + '>Ügyfelek</button><button data-n="megr"' + (S.ugyNezet === 'megr' ? ' class="on"' : '') + '>Összes megrendelés</button></div>';
  h += '<input class="search" id="uk" placeholder="' + (S.ugyNezet === 'ugyfel' ? 'Keresés névre, településre…' : 'Keresés ügyfélre, munkára, sorszámra…') + '" value="' + esc(S.ugyKeres || '') + '">';
  if (S.ugyNezet === 'ugyfel') {
    h += '<div class="btns"><button class="btn pri wide" id="ujmeg">+ Új megrendelés</button><button class="btn" id="ujugy">+ Ügyfél</button></div>';
    const us = S.data.ugyfelek.filter(u => !q || [u.nev, u.cim, u.tel].join(' ').toLowerCase().includes(q)).map(u => {
      const ms = megrendelesekOf(u); const akt = ms.filter(isAktiv);
      const last = ms.map(p => p.modositva || '').sort().pop() || u.modositva || '';
      return { u, ms, akt, last };
    }).sort((a, b) => (b.akt.length > 0) - (a.akt.length > 0) || String(b.last).localeCompare(String(a.last)));
    if (!us.length) h += '<div class="empty">' + (S.data.ugyfelek.length ? 'Nincs találat.' : 'Még nincs ügyfeled. Az „+ Új megrendelés” gombbal kezdj – az ügyfelet ott helyben felveheted.') + '</div>';
    else h += '<div class="card list">' + us.map(x => '<div class="it" data-u="' + x.u.id + '" data-del="ugyfel|' + x.u.id + '"><span class="ic">👤</span><div class="m"><b>' + esc(x.u.nev) + (x.akt.length ? '<span class="pill">' + x.akt.length + ' aktív</span>' : '') + '</b><small>' + esc([telepules(x.u.cim), x.ms.length + ' megrendelés'].filter(Boolean).join(' · ')) + '</small></div><span class="arrow">›</span></div>').join('') + '</div>';
  } else {
    S.projFilter = S.projFilter || 'Aktív';
    const nFiz = S.data.projektek.filter(fizetesreVar).length;
    h += '<div class="seg">' + [['Aktív', 'Aktív'], ['Fiz', 'Fizetésre vár' + (nFiz ? ' (' + nFiz + ')' : '')], ['Lezárt', 'Lezárt'], ['Mind', 'Mind']].map(x => '<button data-f="' + x[0] + '"' + (S.projFilter === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>').join('') + '</div>';
    const ps = S.data.projektek.filter(p => S.projFilter === 'Mind' || (S.projFilter === 'Fiz' ? fizetesreVar(p) : (S.projFilter === 'Aktív') === isAktiv(p)))
      .filter(p => !q || [ugyfelNev(p), megrLabel(p), p.sorszam, p.hely, mrsOf(p).map(m => m.nev).join(' ')].join(' ').toLowerCase().includes(q))
      .sort((a, b) => String(b.modositva || '').localeCompare(String(a.modositva || '')));
    h += ps.length ? '<div class="card list">' + ps.map(megrItem).join('') + '</div>' : '<div class="empty">Ebben a nézetben nincs megrendelés.</div>';
  }
  $('#view').innerHTML = h;
  document.querySelectorAll('.seg button[data-n]').forEach(b => b.onclick = () => { S.ugyNezet = b.dataset.n; renderUgyfelek(); });
  document.querySelectorAll('.seg button[data-f]').forEach(b => b.onclick = () => { S.projFilter = b.dataset.f; renderUgyfelek(); });
  const uk = $('#uk'); uk.oninput = () => { S.ugyKeres = uk.value; const pos = uk.selectionStart; renderUgyfelek(); const n = $('#uk'); n.focus(); n.setSelectionRange(pos, pos); };
  if ($('#ujmeg')) $('#ujmeg').onclick = () => megrendelesDialog(null, null);
  if ($('#ujugy')) $('#ujugy').onclick = () => ugyfelDialog(null);
  document.querySelectorAll('[data-u]').forEach(el => el.onclick = () => go({ v: 'ugyfel', id: el.dataset.u }));
  document.querySelectorAll('[data-p]').forEach(el => el.onclick = () => go({ v: 'projekt', id: el.dataset.p }));
}
const telepules = (cim) => { const m = String(cim || '').match(/^\s*\d{4}\s+([^,]+)/); return m ? m[1].trim() : String(cim || '').split(',')[0].trim(); };
function megrItem(p) {
  const ms = mrsOf(p).map(m => m.nev);
  return '<div class="it" data-p="' + p.id + '" data-del="megrendeles|' + p.id + '"><div class="m"><b>' + esc(ugyfelNev(p)) + '</b><div class="pills">' + allapotPill(p.allapot) + szamlaPill(p) + '</div><small>' + esc([p.sorszam, p.nev || ms.join(', ') || 'nincs munkarész', telepules(p.hely)].filter(Boolean).join(' · ')) + '</small></div><div class="v">' + ft(megrKoltseg(p)) + '</div><span class="arrow">›</span></div>';
}

/* ---------- Ügyfél ---------- */
function renderUgyfel(r) {
  const u = ugyfelById(r.id); if (!u) { S.stack = [{ v: 'proj' }]; return renderUgyfelek(); }
  const ms = megrendelesekOf(u).sort((a, b) => String(b.letrehozva || '').localeCompare(String(a.letrehozva || '')));
  const akt = ms.filter(isAktiv), lez = ms.filter(p => !isAktiv(p));
  setHeader(u.nev, ms.length + ' megrendelés');
  let h = '<div class="card">' + [['📍', u.cim], ['📞', u.tel ? '<a href="tel:' + esc(u.tel.replace(/\s/g, '')) + '">' + esc(u.tel) + '</a>' : ''], ['✉️', u.email ? '<a href="mailto:' + esc(u.email) + '">' + esc(u.email) + '</a>' : '']]
    .filter(x => x[1]).map(x => '<div class="kv"><span>' + x[0] + '</span><b style="font-weight:500">' + (x[0] === '📍' ? esc(x[1]) : x[1]) + '</b></div>').join('') +
    (u.megj ? '<div class="small muted" style="padding-top:6px;white-space:pre-wrap">' + esc(u.megj) + '</div>' : '') +
    (!u.cim && !u.tel && !u.email ? '<div class="small muted">Nincsenek elérhetőségek megadva.</div>' : '') +
    '<div class="btns" style="margin-bottom:0"><button class="btn sm" id="uedit">✏️ Ügyfél adatai</button></div></div>';
  h += '<div class="btns"><button class="btn pri wide" id="ujmeg">+ Új megrendelés ' + esc(u.nev) + ' részére</button></div>';
  h += '<h2>Aktív megrendelések</h2>' + (akt.length ? '<div class="card list">' + akt.map(megrItemU).join('') + '</div>' : '<div class="empty small" style="padding:14px">Nincs aktív megrendelés.</div>');
  if (lez.length) h += '<h2>Lezárt megrendelések</h2><div class="card list">' + lez.map(megrItemU).join('') + '</div>';
  $('#view').innerHTML = h;
  $('#uedit').onclick = () => ugyfelDialog(u);
  $('#ujmeg').onclick = () => megrendelesDialog(null, u);
  document.querySelectorAll('[data-p]').forEach(el => el.onclick = () => go({ v: 'projekt', id: el.dataset.p }));
}
function megrItemU(p) {
  const ms = mrsOf(p).map(m => m.nev);
  return '<div class="it" data-p="' + p.id + '" data-del="megrendeles|' + p.id + '"><div class="m"><b>' + esc(p.nev || ms.join(', ') || 'Új megrendelés') + '</b><div class="pills">' + allapotPill(p.allapot) + szamlaPill(p) + '</div><small>' + esc([p.sorszam, dateHu(p.letrehozva), telepules(p.hely)].filter(Boolean).join(' · ')) + '</small></div><div class="v">' + ft(megrKoltseg(p)) + '</div><span class="arrow">›</span></div>';
}
function ugyfelDialog(u, after) {
  const uj = !u; const d = u ? Object.assign({}, u) : { id: uid('U'), nev: '', cim: '', tel: '', email: '', megj: '' };
  const ms = uj ? [] : megrendelesekOf(d);
  const masok = S.data.ugyfelek.filter(x => x.id !== d.id);
  const h = '<h3>' + (uj ? 'Új ügyfél' : 'Ügyfél adatai') + '</h3>' +
    '<div class="fld"><label>Név</label><input id="un" value="' + esc(d.nev) + '" placeholder="pl. Kovács János"></div>' +
    '<div class="fld"><label>Cím</label><input id="uc" value="' + esc(d.cim) + '" placeholder="pl. 2234 Maglód, Fő utca 1."></div>' +
    '<div class="row2"><div class="fld"><label>Telefon</label><input id="ut" inputmode="tel" value="' + esc(d.tel) + '"></div><div class="fld"><label>E-mail</label><input id="ue" inputmode="email" value="' + esc(d.email) + '"></div></div>' +
    '<div class="fld"><label>Adószám (cégnél, vállalkozónál)</label><input id="ua" value="' + esc(d.adoszam || '') + '" placeholder="Magánszemélynél hagyd üresen"></div>' +
    '<div class="fld"><label>Megjegyzés</label><textarea id="um">' + esc(d.megj) + '</textarea></div>' +
    '<div class="btns"><button class="btn pri wide" id="uok">Mentés</button><button class="btn" id="ux">Mégse</button></div>' +
    (uj ? '' : (masok.length ? '<div class="fld" style="margin-top:8px"><label>Összevonás egy másik ügyféllel (ha duplán szerepel)</label><select id="umerge"><option value="">– válassz –</option>' + masok.map(x => '<option value="' + x.id + '">' + esc(x.nev) + '</option>').join('') + '</select></div>' : '') +
      '<div class="btns"><button class="btn danger" id="udel">Ügyfél törlése</button></div>');
  openModal(h, m => {
    $('#ux', m).onclick = closeModal;
    $('#uok', m).onclick = () => {
      const n = $('#un', m).value.trim(); if (!n) { $('#un', m).focus(); return; }
      Object.assign(d, { nev: n, cim: $('#uc', m).value.trim(), tel: $('#ut', m).value.trim(), email: $('#ue', m).value.trim(), adoszam: $('#ua', m).value.trim(), megj: $('#um', m).value.trim() });
      upsertUgyfel(d); closeModal();
      if (after) after(d); else if (uj) go({ v: 'ugyfel', id: d.id }); else render();
    };
    if (!uj) {
      const mg = $('#umerge', m);
      if (mg) mg.onchange = () => {
        const cel = ugyfelById(mg.value); if (!cel) return;
        if (!confirm('„' + d.nev + '” ' + ms.length + ' megrendelése átkerül „' + cel.nev + '” alá, és „' + d.nev + '” törlődik. Mehet?')) { mg.value = ''; return; }
        for (const p of ms) { p.ugyfelId = cel.id; upsertProjekt(p); }
        if (!cel.cim && d.cim) { cel.cim = d.cim; cel.tel = cel.tel || d.tel; cel.email = cel.email || d.email; upsertUgyfel(cel); }
        deleteUgyfel(d.id); closeModal(); S.stack = [{ v: 'proj' }, { v: 'ugyfel', id: cel.id }]; render(); toast('Összevonva');
      };
      $('#udel', m).onclick = () => {
        torlesKerdes('ugyfel', d.id, () => { closeModal(); S.stack = [{ v: 'proj' }]; render(); });
      };
    }
  });
}

/* ---------- Megrendelés ---------- */
function megrendelesDialog(p, u) {
  const uj = !p; const d = p ? p : null;
  const ugy = d ? ugyfelOf(d) : u;
  const h = '<h3>' + (uj ? 'Új megrendelés' : 'Megrendelés adatai') + '</h3>' +
    '<div class="fld"><label>Ügyfél</label><input id="mug" list="ugyfelLista" value="' + esc(ugy ? ugy.nev : '') + '" placeholder="Kezdd el gépelni – a korábbiakat felajánlja">' + ugyfelDatalist() + '<div class="small muted" id="mugi" style="margin-top:4px"></div></div>' +
    '<div class="fld"><label>Megnevezés (nem kötelező)</label><input id="mnev" value="' + esc(d ? d.nev : '') + '" placeholder="pl. Lakásfelújítás – üresen a munkarészekből áll össze"></div>' +
    '<div class="fld"><label>Helyszín</label><input id="mhely" value="' + esc(d ? d.hely : (ugy ? ugy.cim : '')) + '" placeholder="Alapból az ügyfél címe"></div>' +
    (uj ? '<div class="fld"><label>Első munkarész</label><input id="mmr" placeholder="pl. Fürdőszoba-felújítás (sablonból később is)"></div>' : '') +
    '<div class="fld"><label>Megjegyzés / a munka leírása</label><textarea id="mmegj">' + esc(d ? d.megj : '') + '</textarea></div>' +
    '<div class="btns"><button class="btn pri wide" id="mok">' + (uj ? 'Létrehozás' : 'Mentés') + '</button><button class="btn" id="mx">Mégse</button></div>' +
    (uj ? '' : '<div class="btns"><button class="btn danger" id="mdel">Megrendelés törlése</button></div>');
  openModal(h, m => {
    const mug = $('#mug', m);
    const info = () => {
      const n = mug.value.trim().toLowerCase(); const x = S.data.ugyfelek.find(y => (y.nev || '').trim().toLowerCase() === n);
      $('#mugi', m).textContent = !n ? '' : x ? '✓ Meglévő ügyfél – ' + (megrendelesekOf(x).length) + ' korábbi megrendelés' : '+ Új ügyfélként veszem fel';
      if (x && uj && !$('#mhely', m).value) $('#mhely', m).value = x.cim || '';
    };
    mug.oninput = info; info();
    $('#mx', m).onclick = closeModal;
    $('#mok', m).onclick = () => {
      const un = mug.value.trim(); if (!un) { mug.focus(); return; }
      const ug = ugyfelByNameOrNew(un);
      if (!ug.cim && $('#mhely', m).value.trim()) { ug.cim = $('#mhely', m).value.trim(); upsertUgyfel(ug); }
      if (uj) {
        const np = ujMegrendeles(ug, { nev: $('#mnev', m).value.trim(), hely: $('#mhely', m).value.trim(), megj: $('#mmegj', m).value.trim() });
        const mrn = $('#mmr', m).value.trim(); if (mrn) ujMunkaresz(np, mrn);
        closeModal(); S.tab = 'proj'; S.stack = [{ v: 'proj' }, { v: 'ugyfel', id: ug.id }, { v: 'projekt', id: np.id }]; render();
      } else {
        Object.assign(d, { ugyfelId: ug.id, nev: $('#mnev', m).value.trim(), hely: $('#mhely', m).value.trim(), megj: $('#mmegj', m).value.trim() });
        upsertProjekt(d); closeModal(); render();
      }
    };
    if (!uj) $('#mdel', m).onclick = () => torlesKerdes('megrendeles', d.id, () => { closeModal(); back(); });
  });
}
function allapotDialog(p) {
  const h = '<h3>Megrendelés állapota</h3><div class="card list">' + ALLAPOTOK.map(a => '<div class="it" data-a="' + a[0] + '">' + '<span class="ic">' + (p.allapot === a[0] ? '●' : '○') + '</span><div class="m"><b>' + esc(a[0]) + (LEZART[a[0]] ? '<span class="pill gray">lezárt</span>' : '') + '</b><small>' + esc(a[1]) + '</small></div></div>').join('') + '</div>' +
    '<div class="btns"><button class="btn" id="ax">Mégse</button></div>';
  openModal(h, m => {
    $('#ax', m).onclick = closeModal;
    m.querySelectorAll('[data-a]').forEach(el => el.onclick = () => {
      const a = el.dataset.a; p.allapot = a;
      if (a === 'Elfogadva' && !p.elfogadva) p.elfogadva = isoDay();
      if (a === 'Kész') p.kesz = isoDay();
      upsertProjekt(p); closeModal(); render(); toast('Állapot: ' + a);
    });
  });
}
function renderMegrendeles(r) {
  const p = S.data.projektek.find(x => x.id === r.id);
  if (!p) { S.stack = [{ v: 'proj' }]; return renderUgyfelek(); }
  const u = ugyfelOf(p); const mrs = mrsOf(p);
  const ts = S.data.tetelek.filter(t => t.projektId === p.id);
  const agg = aggregate(ts); const sc = splitCats(agg);
  setHeader(ugyfelNev(p), [p.sorszam, p.nev].filter(Boolean).join(' · '));
  const datumok = [p.elfogadva ? 'elfogadva ' + dateHu(p.elfogadva) : '', p.kesz && p.allapot === 'Kész' ? 'kész ' + dateHu(p.kesz) : ''].filter(Boolean).join(' · ');
  let h = '<div class="card hero"><div class="hero-top"><button class="allapot-btn" id="pall">' + allapotPill(p.allapot) + ' <span>▾</span></button><span class="muted small">' + esc(datumok) + '</span></div>' +
    (p.szamla && p.szamla.szam ? '<div style="margin-top:8px" class="small">🧾 ' + esc(p.szamla.szam) + ' · ' + ft(p.szamla.osszeg) + ' ' + szamlaPill(p) + '</div>' : '') +
    '<div class="total" style="margin-top:8px"><span>Összesen (nettó)</span><b>' + ft(sumCost(agg)) + '</b></div>' +
    '<div class="small muted" style="margin-top:4px">Anyag ' + ft(sumCost(sc.anyag)) + ' · munkadíj ' + ft(sumCost(sc.munka)) + (sc.egyeb.length ? ' · egyéb ' + ft(sumCost(sc.egyeb)) : '') + '</div>' +
    (p.hely ? '<div class="small muted" style="margin-top:6px">📍 ' + esc(p.hely) + '</div>' : '') +
    (p.megj ? '<div class="small muted" style="margin-top:4px;white-space:pre-wrap">' + esc(p.megj) + '</div>' : '') +
    '<div class="btns" style="margin-bottom:0;margin-top:10px"><button class="btn sm" id="pedit">✏️ Adatok</button>' + (u ? '<button class="btn sm" id="pugy">👤 ' + esc(u.nev) + '</button>' : '') + '<button class="btn sm" id="pshare">🛒 Bevásárlólista</button></div></div>';
  h += '<div class="btns"><button class="btn pri wide" id="paj">📄 Árajánlat</button><button class="btn wide' + (p.allapot === 'Elfogadva' || p.allapot === 'Kész' ? ' pri' : '') + '" id="pszl">🧾 Számlázás</button></div>';
  // 1. felmérés (helyiségek) – külön, keretes blokkban, a munkák előtt
  const rooms = roomsOf(p);
  const mrNevek = (rm) => [...new Set(ts.filter(t => tetelRoomId(t) === rm.id).map(t => (mrById(t.munkareszId) || {}).nev).filter(Boolean))];
  h += '<div class="szakasz felm"><div class="ghdr"><h2>📐 Felmérés</h2><button class="btn sm" id="addh">+ Helyiség felmérése</button></div>';
  if (!rooms.length) h += '<div class="small muted" style="padding:2px 4px 6px">Itt rögzíted a helyszíni felmérést: helyiségek, területek méretei, ablakok, ajtók. A munkák tételei ebből számolnak, és ha egy méret változik, minden hozzá kötött tétel frissül.</div>';
  else h += '<div class="card list">' + rooms.map(rm => {
    const mn = mrNevek(rm);
    return '<div class="it" data-h="' + rm.id + '" data-del="helyiseg|' + p.id + '|' + rm.id + '"><span class="ic">🏠</span><div class="m"><b>' + esc(rm.nev) + '</b><small>' + esc(roomSummary(rm)) + '</small>' +
      (mn.length ? '<small class="hasznal">🔗 ' + esc(mn.join(', ')) + '</small>' : '<div class="pills"><span class="pill warn">még nincs munka</span></div>') + '</div>' +
      (mn.length ? '<span class="arrow">›</span>' : '<button class="btn sm" data-start="' + rm.id + '">▶ Munka</button>') + '</div>';
  }).join('') + '</div>';
  h += '</div>';
  // 2. munkák (munkarészek)
  h += '<div class="szakasz"><div class="ghdr"><h2>🧱 Munkarészek</h2><button class="btn sm" id="addmr">+ Munkarész</button></div>';
  if (!mrs.length) h += '<div class="empty">Még nincs munkarész. ' + (rooms.length ? 'A felmérésnél a „▶ Munka” gombbal indíthatsz egyet, vagy itt adj hozzá üresen, sablonból.' : 'Adj hozzá egyet üresen vagy sablonból – vagy kezdd a felméréssel.') + '</div>';
  else h += '<div class="card list">' + mrs.map(m => {
    const n = tetelekOfMr(m).length;
    return '<div class="it" data-mr="' + m.id + '" data-del="munkaresz|' + m.id + '"><span class="ic">🧱</span><div class="m"><b>' + esc(m.nev) + (m.ajanlatban === false ? '<span class="pill gray">ajánlaton kívül</span>' : '') + '</b><small>' + n + ' tétel</small></div><div class="v">' + ft(mrKoltseg(m)) + '</div><span class="arrow">›</span></div>';
  }).join('') + '</div>';
  h += '</div>';
  if (sc.anyag.length) h += '<h2>Összesített anyaglista</h2><div class="card">' + matsTable(sc.anyag) + '</div>';
  h += fotokHtml(p);
  $('#view').innerHTML = h;
  bindFotok(p);
  $('#pall').onclick = () => allapotDialog(p);
  $('#pedit').onclick = () => megrendelesDialog(p);
  if ($('#pugy')) $('#pugy').onclick = () => go({ v: 'ugyfel', id: u.id });
  $('#pshare').onclick = () => shareList(p, sc.anyag);
  $('#paj').onclick = () => go({ v: 'ajanlat', id: p.id });
  $('#pszl').onclick = () => go({ v: 'szamla', id: p.id });
  $('#addmr').onclick = () => ujMunkareszDialog(p);
  $('#addh').onclick = () => roomDialog(p, null);
  document.querySelectorAll('[data-h]').forEach(el => el.onclick = () => roomDialog(p, roomById(p, el.dataset.h)));
  document.querySelectorAll('[data-start]').forEach(b => b.onclick = (e) => { e.stopPropagation(); mitCsinalunkDialog(p, roomById(p, b.dataset.start)); });
  document.querySelectorAll('[data-mr]').forEach(el => el.onclick = () => go({ v: 'munkaresz', id: el.dataset.mr }));
}
function ujMunkareszDialog(p) {
  const h = '<h3>Új munkarész</h3>' +
    '<div class="fld"><label>Üres munkarész neve</label><input id="mrn" placeholder="pl. Kisszoba glettelés, festés"></div>' +
    '<div class="btns"><button class="btn pri wide" id="mrok">Létrehozás</button></div>' +
    '<div class="or">vagy</div><div class="btns"><button class="btn wide" id="mrsab">📋 Sablonból (fürdőszoba, festés, padlócsere…)</button></div>' +
    '<div class="btns"><button class="btn" id="mrx">Mégse</button></div>';
  openModal(h, m => {
    $('#mrx', m).onclick = closeModal;
    $('#mrsab', m).onclick = () => sablonDialog(p);
    $('#mrok', m).onclick = () => { const n = $('#mrn', m).value.trim(); if (!n) { $('#mrn', m).focus(); return; } const mr = ujMunkaresz(p, n); closeModal(); go({ v: 'munkaresz', id: mr.id }); };
  });
}

/* ---------- Munkarész ---------- */
function renderMunkaresz(r) {
  const mr = mrById(r.id); const p = megrOf(mr);
  if (!mr || !p) { back(); return; }
  const ts = tetelekOfMr(mr); const agg = aggregate(ts); const sc = splitCats(agg); const rooms = roomsOf(p);
  setHeader(mr.nev, ugyfelNev(p) + ' · ' + (p.sorszam || ''));
  let h = '<div class="card hero"><div class="total"><span>Munkarész összesen</span><b>' + ft(sumCost(agg)) + '</b></div>' +
    '<div class="small muted" style="margin-top:4px">Anyag ' + ft(sumCost(sc.anyag)) + ' · munkadíj ' + ft(sumCost(sc.munka)) + (sc.egyeb.length ? ' · egyéb ' + ft(sumCost(sc.egyeb)) : '') + '</div>' +
    '<div class="f" style="border:0;padding:8px 0 0"><label for="mrin" style="color:var(--hero-m)">Bekerül az árajánlatba</label><label class="sw"><input type="checkbox" id="mrin"' + (mr.ajanlatban !== false ? ' checked' : '') + '><i></i></label></div>' +
    '<div class="btns" style="margin-bottom:0;margin-top:8px"><button class="btn sm" id="mredit">✏️ Átnevezés</button><button class="btn sm" id="mrsab">📋 Mentés sablonként</button><button class="btn sm" id="mrmove">↗ Áthelyezés</button></div></div>';
  h += '<div class="btns"><button class="btn sm wide" id="addk">+ Kalkuláció</button><button class="btn sm wide" id="addm">+ Munkadíj</button><button class="btn sm wide" id="adde">+ Egyéb</button></div>';
  const tetelItem = (t) => {
    const c = CALC_BY_ID[t.calc]; const cost = sumCost((t.mats || []).map(line)); const m0 = t.mats && t.mats[0];
    const room = roomById(p, tetelRoomId(t));
    const sub = t.calc === 'egyeb' ? (!m0 ? '' : m0.k === '_egyeb' ? fmt(m0.q) + ' ' + (m0.u || '') + ' × ' + ft(m0.p) : (line(m0).ptxt || line(m0).qtxt)) : (c ? c.n : t.calc) + (t.out && t.out[0] ? ' · ' + t.out[0][1] : '');
    return '<div class="it" data-t="' + t.id + '" data-del="tetel|' + t.id + '"><span class="ic">' + (c ? icoHtml(c.i) : ico('plus')) + '</span><div class="m"><b>' + esc(t.nev) + '</b><small>' + esc((room ? '🏠 ' + room.nev + ' · ' : '') + sub) + '</small></div><div class="v">' + ft(cost) + '</div><span class="arrow">›</span></div>';
  };
  h += '<h2>Tételek</h2>' + (ts.length ? '<div class="card list">' + ts.map(tetelItem).join('') + '</div>' : '<div class="empty">Még nincs tétel ebben a munkarészben.' + (rooms.length ? '' : ' Tipp: a megrendelés Felmérés részében add meg a helyiségeket, és a kalkulátorok onnan veszik a méreteket.') + '</div>');
  if (sc.anyag.length) h += '<h2>Anyaglista</h2><div class="card">' + matsTable(sc.anyag) + '</div>';
  if (sc.munka.length) h += '<h2>Munkadíjak</h2><div class="card">' + matsTable(sc.munka) + '</div>';
  if (sc.egyeb.length) h += '<h2>Egyéb tételek</h2><div class="card">' + matsTable(sc.egyeb) + '</div>';
  h += '<div class="btns" style="margin-top:16px"><button class="btn danger" id="mrdel">Munkarész törlése</button></div>';
  $('#view').innerHTML = h;
  $('#mrin').onchange = (e) => { mr.ajanlatban = e.target.checked; upsertMunkaresz(mr); toast(mr.ajanlatban ? 'Bekerül az ajánlatba' : 'Kivéve az ajánlatból'); render(); };
  $('#mredit').onclick = () => {
    openModal('<h3>Munkarész neve</h3><div class="fld"><input id="mrn" value="' + esc(mr.nev) + '"></div><div class="btns"><button class="btn pri wide" id="ok">Mentés</button><button class="btn" id="x">Mégse</button></div>', m => {
      $('#x', m).onclick = closeModal; $('#ok', m).onclick = () => { const n = $('#mrn', m).value.trim(); if (!n) return; mr.nev = n; upsertMunkaresz(mr); closeModal(); render(); };
    });
  };
  $('#mrsab').onclick = () => saveAsSablon(mr);
  $('#mrmove').onclick = () => athelyezDialog(mr);
  $('#addk').onclick = () => { S.targetMr = mr.id; setTab('kalk'); };
  $('#addm').onclick = () => egyebDialog(mr.id, null, 'md_ora');
  $('#adde').onclick = () => egyebDialog(mr.id, null);
  $('#mrdel').onclick = () => torlesKerdes('munkaresz', mr.id, () => back());
  document.querySelectorAll('[data-t]').forEach(el => el.onclick = () => {
    const t = S.data.tetelek.find(x => x.id === el.dataset.t); if (!t) return;
    if (t.calc === 'egyeb') egyebDialog(mr.id, t); else openCalc(t.calc, t);
  });
}
// Munkarész áthelyezése másik (vagy új) megrendelésbe – pl. ha az ügyfél csak egy részét fogadta el
function athelyezDialog(mr) {
  const p = megrOf(mr); const u = ugyfelOf(p);
  const celok = S.data.projektek.filter(x => x.id !== p.id && x.ugyfelId === p.ugyfelId && isAktiv(x));
  const h = '<h3>„' + esc(mr.nev) + '” áthelyezése</h3><p class="small muted" style="margin-top:-6px">Pl. ha az ügyfél csak a többi munkát fogadta el, ezt külön megrendelésként viheted tovább (saját ajánlattal).</p>' +
    '<div class="card list"><div class="it" data-c="_uj"><span class="ic">＋</span><div class="m"><b>Új megrendelés ' + esc(u ? u.nev : '') + ' részére</b><small>Ugyanazzal a helyszínnel</small></div></div>' +
    celok.map(x => '<div class="it" data-c="' + x.id + '"><span class="ic">📁</span><div class="m"><b>' + esc(x.sorszam + ' · ' + megrLabel(x)) + '</b><small>' + esc(x.allapot) + '</small></div></div>').join('') + '</div>' +
    '<div class="btns"><button class="btn" id="ax">Mégse</button></div>';
  openModal(h, m => {
    $('#ax', m).onclick = closeModal;
    m.querySelectorAll('[data-c]').forEach(el => el.onclick = () => {
      const cel = el.dataset.c === '_uj' ? ujMegrendeles(u || ugyfelByNameOrNew('Névtelen ügyfél'), { hely: p.hely, megj: '' }) : S.data.projektek.find(x => x.id === el.dataset.c);
      // a tételek által használt helyiségek átmásolása
      const kell = new Set(tetelekOfMr(mr).map(tetelRoomId).filter(Boolean));
      const meglevo = new Set(roomsOf(cel).map(x => x.id));
      const ujRooms = roomsOf(p).filter(x => kell.has(x.id) && !meglevo.has(x.id)).map(x => JSON.parse(JSON.stringify(x)));
      if (ujRooms.length) { cel.helyisegek = roomsOf(cel).concat(ujRooms); upsertProjekt(cel); }
      mr.projektId = cel.id; mr.sorrend = mrsOf(cel).length + 1; upsertMunkaresz(mr);
      for (const t of tetelekOfMr(mr)) { t.projektId = cel.id; upsertTetel(t); }
      upsertProjekt(p);
      closeModal(); S.stack = [{ v: 'proj' }, { v: 'projekt', id: cel.id }]; render(); toast('Áthelyezve: ' + cel.sorszam);
    });
  });
}
