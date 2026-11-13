/* Építőkalkulátor – helyiségek, projektsablonok, nyíláslista-szerkesztő */

/* ---------- Nyíláslista szerkesztő (kalkulátorból és helyiségből is) ---------- */
function openNyEditor(list, onApply, onCancel) {
  let rows = (list && list.length ? list : [{ t: 'ablak', sz: 120, m: 150, db: 1 }]).map(r => Object.assign({}, r));
  const typeOpts = (t) => NY_TYPES.map(x => '<option value="' + x[0] + '"' + (x[0] === t ? ' selected' : '') + '>' + x[1] + '</option>').join('');
  const sum = (m) => {
    const st = nyStats({ nyl: rows });
    $('#nysum', m).innerHTML = '<b>' + fmt(st.m2, 2) + ' m²</b> levonás · ' + st.n + ' db · kerület ' + fmt(st.ker, 1) + ' m' + (st.ajtoDb ? ' · ebből ' + st.ajtoDb + ' ajtó (' + fmt(st.ajtoSz, 2) + ' m)' : '');
  };
  const draw = (m) => {
    $('#nyrows', m).innerHTML = rows.map((r, i) => '<div class="nyrow" data-i="' + i + '"><select data-k="t">' + typeOpts(r.t) + '</select>' +
      ['sz', 'm', 'db'].map(k => '<input data-k="' + k + '" inputmode="decimal" value="' + esc(numStr(r[k])) + '">').join('') + '<button class="nydel" title="Törlés">✕</button></div>').join('') ||
      '<div class="muted small" style="padding:8px 0">Nincs nyílás a listában.</div>';
    $('#nyrows', m).querySelectorAll('.nyrow').forEach(row => {
      const r = rows[row.dataset.i];
      row.querySelector('select').onchange = (e) => { const ty = NY_TYPES.find(x => x[0] === e.target.value); r.t = ty[0]; r.sz = ty[2]; r.m = ty[3]; draw(m); };
      row.querySelectorAll('input').forEach(inp => { inp.oninput = () => { r[inp.dataset.k] = parseNum(inp.value); sum(m); }; inp.onfocus = () => inp.select(); });
      row.querySelector('.nydel').onclick = () => { rows.splice(row.dataset.i, 1); draw(m); };
    });
    sum(m);
  };
  const h = '<h3>Nyílások</h3><p class="small muted" style="margin-top:-6px">Méretek cm-ben (falnyílás / tokméret). A típus kiválasztásakor jellemző méretet ad, amit átírhatsz.</p>' +
    '<div class="nyrow nyhead"><span>Típus</span><span>Szél.</span><span>Mag.</span><span>db</span><span></span></div><div id="nyrows"></div>' +
    '<div class="btns"><button class="btn sm" id="nyab">+ Ablak</button><button class="btn sm" id="nyaj">+ Ajtó</button><button class="btn sm" id="nyeg">+ Egyéb</button></div>' +
    '<div class="card" id="nysum" style="font-size:14px"></div>' +
    '<div class="btns"><button class="btn pri wide" id="nyok">Átvétel</button><button class="btn" id="nyx">Mégse</button></div>';
  openModal(h, m => {
    const add = (t) => { const ty = NY_TYPES.find(x => x[0] === t); rows.push({ t, sz: ty[2], m: ty[3], db: 1 }); draw(m); };
    $('#nyab', m).onclick = () => add('ablak'); $('#nyaj', m).onclick = () => add('ajto'); $('#nyeg', m).onclick = () => add('egyeb');
    $('#nyx', m).onclick = () => { closeModal(); if (onCancel) onCancel(); };
    $('#nyok', m).onclick = () => { rows = rows.filter(r => nz(r.sz) > 0 && nz(r.m) > 0 && nz(r.db) > 0); closeModal(); onApply(rows); };
    draw(m);
  });
}

/* ---------- Helyiségek ---------- */
const roomsOf = (p) => (p && Array.isArray(p.helyisegek) ? p.helyisegek : []);
const roomById = (p, id) => roomsOf(p).find(r => r.id === id);
function roomSummary(r) {
  const g = roomGeo(r);
  return fmt(g.L, 2) + ' × ' + fmt(g.W, 2) + ' m · ' + fmt(g.A, 2) + ' m²' + (g.H ? ' · bm. ' + fmt(g.H, 2) + ' m' : '') + (g.st.n ? ' · ' + g.st.n + ' nyílás' : '');
}
const tetelRoomId = (t) => t.roomId || (t.values && t.values._room) || '';

function roomDialog(p, room, after) {
  const uj = !room;
  const d = room ? JSON.parse(JSON.stringify(room)) : { id: uid('H'), nev: '', L: '', W: '', H: 2.6, nyl: [] };
  const linked = uj ? 0 : S.data.tetelek.filter(t => t.projektId === p.id && tetelRoomId(t) === d.id).length;
  const show = () => {
    const h = '<h3>' + (uj ? 'Helyiség felmérése' : 'Felmérés: ' + esc(d.nev)) + '</h3>' +
      '<div class="fld"><label>Megnevezés</label><input id="hn" value="' + esc(d.nev) + '" placeholder="pl. Fürdőszoba, Nappali, Kocsibeálló"></div>' +
      '<div class="row2"><div class="fld"><label>Hossz (m)</label><input id="hL" inputmode="decimal" value="' + esc(numStr(d.L)) + '"></div><div class="fld"><label>Szélesség (m)</label><input id="hW" inputmode="decimal" value="' + esc(numStr(d.W)) + '"></div><div class="fld"><label>Belmagasság (m)</label><input id="hH" inputmode="decimal" value="' + esc(numStr(d.H)) + '"></div></div>' +
      '<div class="small muted" style="margin:-4px 0 10px">Kültéri területnél (pl. kocsibeálló) a belmagasság 0 is lehet.</div>' +
      '<div class="f-sub" style="border:0"><button class="btn sm" id="hny">📐 Nyílások (' + (d.nyl || []).length + ')</button><span class="small muted" id="hsum"></span></div>' +
      (linked ? '<div class="banner" style="margin-top:8px">🔗 ' + linked + ' tétel számol ebből a helyiségből – mentéskor mind frissül.</div>' : '') +
      '<div class="btns"><button class="btn pri wide" id="hok">Mentés</button><button class="btn" id="hx">Mégse</button></div>' +
      (uj ? '' : '<div class="btns"><button class="btn danger" id="hdel">Helyiség törlése</button></div>');
    openModal(h, m => {
      const read = () => { d.nev = $('#hn', m).value.trim(); d.L = parseNum($('#hL', m).value); d.W = parseNum($('#hW', m).value); d.H = parseNum($('#hH', m).value); };
      const upd = () => { read(); $('#hsum', m).textContent = (nz(d.L) && nz(d.W)) ? roomSummary(d) : ''; };
      m.querySelectorAll('input').forEach(i => i.oninput = upd); upd();
      $('#hny', m).onclick = () => { read(); openNyEditor(d.nyl, rows => { d.nyl = rows; show(); }, show); };
      $('#hx', m).onclick = closeModal;
      $('#hok', m).onclick = () => {
        read(); if (!d.nev) { $('#hn', m).focus(); return; }
        if (!(nz(d.L) > 0 && nz(d.W) > 0)) { toast('Add meg a hosszt és a szélességet'); return; }
        const list = roomsOf(p).slice(); const i = list.findIndex(r => r.id === d.id);
        if (i >= 0) list[i] = d; else list.push(d);
        p.helyisegek = list; upsertProjekt(p);
        const n = recalcRoom(p, d);
        closeModal(); if (after) after(d); else if (uj) mitCsinalunkDialog(p, d); else render();
        if (n) toast(n + ' tétel frissítve a helyiség alapján');
      };
      if (!uj) $('#hdel', m).onclick = () => {
        if (!confirm('Törlöd a(z) „' + d.nev + '” helyiséget?' + (linked ? ' A ' + linked + ' tétel megmarad, de már nem frissül a helyiségből.' : ''))) return;
        p.helyisegek = roomsOf(p).filter(r => r.id !== d.id); upsertProjekt(p);
        for (const t of S.data.tetelek.filter(t => t.projektId === p.id && tetelRoomId(t) === d.id)) { t.roomId = ''; if (t.values) delete t.values._room; upsertTetel(t); }
        closeModal(); render();
      };
    });
  };
  show();
}

// Egy tétel értékeinek frissítése a helyiségből (kalkulátor vagy helyiségből számolt munkadíj)
function applyRoomToTetel(t, room) {
  if (t.calc === 'egyeb') {
    if (!t.rq || !ROOM_Q[t.rq] || !t.mats[0]) return false;
    const q = r2(ROOM_Q[t.rq][1](room));
    t.mats[0].q = q; t.out = [['Mennyiség', fmt(q) + ' ' + (t.mats[0].k === '_egyeb' ? (t.mats[0].u || '') : mat(t.mats[0].k).u) + ' (' + room.nev + ': ' + ROOM_Q[t.rq][0] + ')']];
    return true;
  }
  const c = CALC_BY_ID[t.calc]; if (!c || !ROOM_MAP[c.id]) return false;
  const v = Object.assign(defaults(c), t.values || {});
  Object.assign(v, ROOM_MAP[c.id](room, v)); v._room = room.id;
  const r = fullResult(c, v);
  t.values = v; t.mats = r.mats.map(x => Object.assign({}, x, { q: round3(x.q) })); t.out = r.out; t.roomId = room.id;
  return true;
}
function recalcRoom(p, room) {
  let n = 0;
  for (const t of S.data.tetelek.filter(t => t.projektId === p.id && tetelRoomId(t) === room.id)) if (applyRoomToTetel(t, room)) { upsertTetel(t); n++; }
  return n;
}

// Kalkulátor űrlap tetején: helyiség választó
function roomPickerHtml(c, v) {
  const p = S.calc && S.calc.projektId && S.data.projektek.find(x => x.id === S.calc.projektId);
  const rooms = roomsOf(p);
  if (!ROOM_MAP[c.id] || !rooms.length) return '';
  return '<div class="f sel roompick"><label for="f__room">🏠 Méretek a felmérésből' + '<span class="help">Ha választasz, a felmérés módosításakor ez a tétel is frissül</span></label><select id="f__room"><option value="">– kézi megadás –</option>' +
    rooms.map(r => '<option value="' + r.id + '"' + (v._room === r.id ? ' selected' : '') + '>' + esc(r.nev) + ' (' + fmt(roomGeo(r).A, 2) + ' m²)</option>').join('') + '</select></div>';
}
function bindRoomPicker(c, v) {
  const el = $('#f__room'); if (!el) return;
  el.onchange = () => {
    const p = S.data.projektek.find(x => x.id === S.calc.projektId); const room = roomById(p, el.value);
    if (room) { Object.assign(v, ROOM_MAP[c.id](room, v)); v._room = room.id; } else delete v._room;
    remember(); renderForm(); renderMunka(); renderRes();
  };
}

/* ---------- Projektsablonok ---------- */
const sajatSablonok = () => (Array.isArray(S.data.sablonok) ? S.data.sablonok : []);
function saveSablonok(list) { S.data.sablonok = list; saveCache(); enqueue('saveBeallitas', { kulcs: 'sablonok', ertek: JSON.stringify(list) }); }
const sablonKell = (sab) => sab.items.some(it => (it.calc && ROOM_MAP[it.calc]) || it.rq);

function sablonDialog(p) {
  const all = SABLONOK.map(s => Object.assign({ beepitett: true }, s)).concat(sajatSablonok());
  const h = '<h3>Új munkarész sablonból</h3><p class="small muted" style="margin-top:-6px">A sablon új munkarészt nyit, benne az összes tétellel. Utána bármelyik tétel szerkeszthető.</p>' +
    '<div class="card list">' + all.map((s, i) => '<div class="it" data-s="' + i + '"><span class="ic">' + (s.i || '📋') + '</span><div class="m"><b>' + esc(s.n) + (s.beepitett ? '' : '<span class="pill">saját</span>') + '</b><small>' + esc(s.desc || s.items.map(x => x.nev).join(', ')) + '</small></div>' +
      (s.beepitett ? '<span class="arrow">›</span>' : '<button class="nydel" data-del="' + s.id + '" title="Sablon törlése">✕</button>') + '</div>').join('') + '</div>' +
    '<div class="btns"><button class="btn" id="sx">Mégse</button></div>';
  openModal(h, m => {
    $('#sx', m).onclick = closeModal;
    m.querySelectorAll('[data-del]').forEach(b => b.onclick = (e) => { e.stopPropagation(); if (confirm('Törlöd ezt a saját sablont?')) { saveSablonok(sajatSablonok().filter(s => s.id !== b.dataset.del)); sablonDialog(p); } });
    m.querySelectorAll('[data-s]').forEach(el => el.onclick = () => sablonRoomStep(p, all[el.dataset.s]));
  });
}
function sablonRoomStep(p, sab) {
  if (!sablonKell(sab)) { closeModal(); applySablon(p, sab, null); return; }
  const rooms = roomsOf(p);
  const h = '<h3>' + esc(sab.n) + '</h3><p class="small muted" style="margin-top:-6px">Melyik ' + (sab.kint ? 'területre' : 'helyiségre') + ' vonatkozik? A tételek ennek a méreteiből számolnak.</p>' +
    (rooms.length ? '<div class="card list">' + rooms.map(r => '<div class="it" data-r="' + r.id + '"><span class="ic">🏠</span><div class="m"><b>' + esc(r.nev) + '</b><small>' + esc(roomSummary(r)) + '</small></div><span class="arrow">›</span></div>').join('') + '</div>' : '') +
    '<div class="btns"><button class="btn pri wide" id="sr_uj">+ Új ' + (sab.kint ? 'terület' : 'helyiség') + ' felmérése</button><button class="btn" id="sr_x">Mégse</button></div>';
  openModal(h, m => {
    $('#sr_x', m).onclick = closeModal;
    m.querySelectorAll('[data-r]').forEach(el => el.onclick = () => { closeModal(); applySablon(p, sab, roomById(p, el.dataset.r)); });
    $('#sr_uj', m).onclick = () => roomDialog(p, null, (room) => applySablon(p, sab, room));
  });
}
function applySablon(p, sab, room) {
  let n = 0; const base = Date.now();
  const mr = ujMunkaresz(p, sab.n + (room ? ' – ' + room.nev : ''));
  for (const it of sab.items) {
    const t = { id: uid('T'), projektId: p.id, munkareszId: mr.id, nev: it.nev, letrehozva: new Date(base + n).toISOString() };
    if (it.calc && CALC_BY_ID[it.calc]) {
      const c = CALC_BY_ID[it.calc];
      const v = Object.assign(defaults(c), it.v || {});
      if (c.fields.some(f => f.id === 'mj')) v.mj = mjPref();
      t.calc = c.id; t.values = v;
      if (room && ROOM_MAP[c.id]) { applyRoomToTetel(t, room); }
      else { const r = fullResult(c, v); t.mats = r.mats.map(x => Object.assign({}, x, { q: round3(x.q) })); t.out = r.out; }
    } else if (it.md || it.mats) {
      t.calc = 'egyeb'; t.values = {};
      if (it.md) {
        const q = it.rq && room && ROOM_Q[it.rq] ? r2(ROOM_Q[it.rq][1](room)) : (it.q || 1);
        t.mats = [{ k: it.md, q }]; t.out = [['Mennyiség', fmt(q) + ' ' + mat(it.md).u]];
        if (it.rq && room) { t.rq = it.rq; t.roomId = room.id; applyRoomToTetel(t, room); }
      } else { t.mats = JSON.parse(JSON.stringify(it.mats)); t.out = it.out || []; }
    } else continue;
    upsertTetel(t); n++;
  }
  S.tab = 'proj'; S.stack = [{ v: 'proj' }, { v: 'projekt', id: p.id }, { v: 'munkaresz', id: mr.id }]; render();
  toast('„' + mr.nev + '” – ' + n + ' tétel létrehozva');
}
function saveAsSablon(p) {
  const ts = tetelekOfMr(p);
  if (!ts.length) return toast('A munkarészben nincs tétel');
  const h = '<h3>Mentés sablonként</h3><p class="small muted" style="margin-top:-6px">A munkarész ' + ts.length + ' tétele a beállításaival együtt sablon lesz. A méreteket alkalmazáskor a kiválasztott helyiségből veszi.</p>' +
    '<div class="fld"><label>Sablon neve</label><input id="sn" value="' + esc(p.nev) + '"></div>' +
    '<div class="btns"><button class="btn pri wide" id="sok">Mentés</button><button class="btn" id="sx">Mégse</button></div>';
  openModal(h, m => {
    $('#sx', m).onclick = closeModal;
    $('#sok', m).onclick = () => {
      const n = $('#sn', m).value.trim(); if (!n) return;
      const items = ts.map(t => {
        if (t.calc === 'egyeb') {
          const m0 = t.mats[0] || {};
          if (m0.k && m0.k !== '_egyeb' && t.rq) return { nev: t.nev, md: m0.k, rq: t.rq };
          if (m0.k && m0.k !== '_egyeb') return { nev: t.nev, md: m0.k, q: m0.q };
          return { nev: t.nev, mats: t.mats, out: t.out };
        }
        const v = Object.assign({}, t.values); delete v._room;
        return { nev: t.nev, calc: t.calc, v };
      });
      saveSablonok(sajatSablonok().concat([{ id: uid('S'), n, i: '📋', items }]));
      closeModal(); toast('Sablon mentve: ' + n);
    };
  });
}

/* ---------- Fotók ----------
   Szerver módban: Google Drive "Építőkalkulátor fotók" mappa (nagy kép + bélyegkép), az eszközön gyorsítótárazva.
   Helyi módban: a böngésző IndexedDB tárolója. A projekt csak az azonosítókat tárolja: p.fotok = [{ id, tid, cap, aj, d }] */
const IDB = {
  db: null,
  open() { return new Promise((res, rej) => { if (this.db) return res(this.db); const r = indexedDB.open('epitokalk', 1); r.onupgradeneeded = () => r.result.createObjectStore('fotok'); r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error); }); },
  async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('fotok', mode); const req = fn(t.objectStore('fotok')); t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); }); },
  put(k, v) { return this.tx('readwrite', s => s.put(v, k)); },
  get(k) { return this.tx('readonly', s => s.get(k)); },
  del(k) { return this.tx('readwrite', s => s.delete(k)); },
};
const FOTO_CACHE = {};
const idbTry = (pr) => Promise.race([pr, new Promise(res => setTimeout(() => res(null), 1500))]).catch(() => null); // ha a tároló nem elérhető, ne akadjon el
async function fotoGet(id) {
  if (!id) return '';
  if (FOTO_CACHE[id]) return FOTO_CACHE[id];
  let d = await idbTry(IDB.get('f_' + id));
  if (!d && !LOCAL) { const j = await api('getFoto', { id }); d = 'data:image/jpeg;base64,' + j.data; idbTry(IDB.put('f_' + id, d)); }
  if (d) FOTO_CACHE[id] = d;
  return d || '';
}
function resizeImage(file, max, q) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
      const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('A képet nem tudom beolvasni')); };
    img.src = url;
  });
}
async function addFotok(p, files) {
  const list = Array.from(files || []); if (!list.length) return;
  if (!LOCAL && !navigator.onLine) return toast('Fotó feltöltéséhez internet kell');
  let n = 0;
  for (const f of list) {
    try {
      toast('Fotó feldolgozása… (' + (n + 1) + '/' + list.length + ')');
      const full = await resizeImage(f, 1600, 0.82), thumb = await resizeImage(f, 360, 0.72);
      let id, tid;
      if (LOCAL) { id = uid('LF'); tid = uid('LT'); await IDB.put('f_' + id, full); await IDB.put('f_' + tid, thumb); }
      else {
        const j = await api('uploadFoto', { nev: p.nev, full: full.split(',')[1], thumb: thumb.split(',')[1] });
        id = j.id; tid = j.tid; idbTry(IDB.put('f_' + id, full)); idbTry(IDB.put('f_' + tid, thumb));
      }
      FOTO_CACHE[id] = full; FOTO_CACHE[tid] = thumb;
      p.fotok = (p.fotok || []).concat([{ id, tid, cap: '', aj: true, d: now() }]); n++;
    } catch (e) { toast('Hiba: ' + e.message); }
  }
  if (n) { upsertProjekt(p); render(); toast(n + ' fotó hozzáadva'); }
}
function fotokHtml(p) {
  const fs = p.fotok || [];
  let h = '<div class="ghdr"><h2>Fotók</h2><label class="btn sm" style="cursor:pointer">+ Fotó<input type="file" id="ffile" accept="image/*" multiple hidden></label></div>';
  if (!fs.length) return h + '<div class="empty small" style="padding:14px">Felméréskori képek a helyszínről. Amelyiket kijelölöd, az árajánlat végére is bekerül.</div>';
  return h + '<div class="fgrid">' + fs.map((f, i) => '<button class="fth" data-f="' + i + '"><img data-tid="' + esc(f.tid) + '" alt="">' + (f.aj ? '<span class="fq" title="Az árajánlatban">📄</span>' : '') + (f.cap ? '<span class="fcap">' + esc(f.cap) + '</span>' : '') + '</button>').join('') + '</div>';
}
function bindFotok(p) {
  const fi = $('#ffile'); if (fi) fi.onchange = () => addFotok(p, fi.files);
  document.querySelectorAll('.fth img[data-tid]').forEach(img => fotoGet(img.dataset.tid).then(src => { if (src) img.src = src; }).catch(() => {}));
  document.querySelectorAll('.fth').forEach(b => b.onclick = () => fotoDialog(p, Number(b.dataset.f)));
}
function fotoDialog(p, i) {
  const f = p.fotok[i]; if (!f) return;
  const h = '<h3>Fotó</h3><div class="fbig"><img id="fbimg" alt=""><span class="muted small" id="fbl">Betöltés…</span></div>' +
    '<div class="fld"><label>Felirat</label><input id="fcap" value="' + esc(f.cap || '') + '" placeholder="pl. Régi csempe, vizesedés a sarokban"></div>' +
    '<div class="f"><label for="faj">Bekerül az árajánlatba</label><label class="sw"><input type="checkbox" id="faj"' + (f.aj ? ' checked' : '') + '><i></i></label></div>' +
    '<div class="btns"><button class="btn pri wide" id="fok">Mentés</button><button class="btn" id="fx">Bezár</button></div>' +
    '<div class="btns"><button class="btn danger" id="fdel">Fotó törlése</button></div>';
  openModal(h, m => {
    fotoGet(f.id).then(src => { if (src) { $('#fbimg', m).src = src; $('#fbl', m).remove(); } }).catch(() => { $('#fbl', m).textContent = 'Nem sikerült betölteni (nincs net?)'; });
    $('#fx', m).onclick = closeModal;
    $('#fok', m).onclick = () => { f.cap = $('#fcap', m).value.trim(); f.aj = $('#faj', m).checked; upsertProjekt(p); closeModal(); render(); };
    $('#fdel', m).onclick = async () => {
      if (!confirm('Törlöd ezt a fotót?')) return;
      p.fotok = p.fotok.filter(x => x !== f); upsertProjekt(p);
      if (!LOCAL) enqueue('deleteFoto', { id: f.id, tid: f.tid });
      idbTry(IDB.del('f_' + f.id)); idbTry(IDB.del('f_' + f.tid));
      closeModal(); render();
    };
  });
}

/* ---------- Helyiség felmérése után: mit csinálunk benne? ---------- */
function mitCsinalunkDialog(p, room) {
  if (!room) return;
  const all = SABLONOK.map(s => Object.assign({ beepitett: true }, s)).concat(sajatSablonok());
  const h = '<h3>Mit csinálunk itt: ' + esc(room.nev) + '?</h3><p class="small muted" style="margin-top:-6px">' + esc(roomSummary(room)) + '</p>' +
    '<div class="lgrp" style="padding-top:0">Munka indítása most</div><div class="card list">' +
    all.map((s, i) => '<div class="it" data-s="' + i + '"><span class="ic">' + (s.i || '📋') + '</span><div class="m"><b>' + esc(s.n) + (s.beepitett ? '' : '<span class="pill">saját</span>') + '</b><small>' + esc(s.desc || s.items.map(x => x.nev).join(', ')) + '</small></div><span class="arrow">›</span></div>').join('') +
    '<div class="it" data-ures="1"><span class="ic">＋</span><div class="m"><b>Üres munkarész</b><small>Saját tételekkel, a méreteket a felmérésből választod</small></div><span class="arrow">›</span></div></div>' +
    '<div class="lgrp">Nem most</div><div class="card list">' +
    '<div class="it" data-kesobb="1"><span class="ic">🗓</span><div class="m"><b>Későbbi munkához – külön megrendelésbe</b><small>Új megrendelés ' + esc(ugyfelNev(p)) + ' részére, saját ajánlattal; ide nem keveredik</small></div><span class="arrow">›</span></div>' +
    '<div class="it" data-csak="1"><span class="ic">✓</span><div class="m"><b>Csak felmérés, a munkát később döntjük el</b><small>A helyiség itt marad „még nincs munka” jelöléssel</small></div></div></div>';
  openModal(h, m => {
    m.querySelectorAll('[data-s]').forEach(el => el.onclick = () => { closeModal(); applySablon(p, all[el.dataset.s], room); });
    $('[data-ures]', m).onclick = () => { closeModal(); const mr = ujMunkaresz(p, room.nev); go({ v: 'munkaresz', id: mr.id }); };
    $('[data-csak]', m).onclick = () => { closeModal(); render(); };
    $('[data-kesobb]', m).onclick = () => {
      const u = ugyfelOf(p) || ugyfelByNameOrNew('Névtelen ügyfél');
      const np = ujMegrendeles(u, { hely: p.hely, nev: '', megj: '' });
      np.helyisegek = [JSON.parse(JSON.stringify(room))]; upsertProjekt(np);
      if (!S.data.tetelek.some(t => t.projektId === p.id && tetelRoomId(t) === room.id)) { p.helyisegek = roomsOf(p).filter(r => r.id !== room.id); upsertProjekt(p); }
      closeModal(); S.tab = 'proj'; S.stack = [{ v: 'proj' }, { v: 'ugyfel', id: u.id }, { v: 'projekt', id: np.id }]; render();
      toast('Új megrendelés: ' + np.sorszam + ' – a felmérés átkerült');
    };
  });
}
