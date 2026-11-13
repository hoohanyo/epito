/* Építőkalkulátor – Kuka (törölt elemek 30 napig visszaállíthatók) + balra húzásos törlés a listákban */

const KUKA_NAP = 30;
const KUKA_IKON = { ugyfel: '👤', megrendeles: '📁', munkaresz: '🧱', helyiseg: '🏠', tetel: '🧮' };
const KUKA_NEV = { ugyfel: 'Ügyfél', megrendeles: 'Megrendelés', munkaresz: 'Munkarész', helyiseg: 'Felmérés', tetel: 'Tétel' };
const kukaLista = () => (Array.isArray(S.data.kuka) ? S.data.kuka : (S.data.kuka = []));
const copy = (x) => JSON.parse(JSON.stringify(x));
const KUKA_UZENET = '\n\n30 napig visszaállítható: Több → Törölt elemek.';

// Szerverre: a JSON-t darabolva küldjük (egy Sheet-cellába legfeljebb ~50 000 karakter fér)
function kukaSor(k) {
  const json = JSON.stringify(k.adat); const r = { id: k.id, tipus: k.tipus, nev: k.nev, torolve: k.torolve };
  for (let i = 0; i < 8; i++) r['adat' + (i + 1)] = json.slice(i * 45000, (i + 1) * 45000);
  return r;
}
function kukaba(tipus, nev, adat) {
  const k = { id: uid('K'), tipus, nev, torolve: now(), adat };
  kukaLista().unshift(k); saveCache(); enqueue('saveKuka', { k: kukaSor(k) });
}
function kukaTorol(id) { S.data.kuka = kukaLista().filter(k => k.id !== id); saveCache(); enqueue('deleteKuka', { id }); }
function kukaLejart() {
  const hatar = Date.now() - KUKA_NAP * 864e5;
  for (const k of kukaLista().slice()) if (Date.parse(k.torolve) < hatar) kukaTorol(k.id);
}

/* ---------- Törlések (mind a kukán át) ---------- */
function torolTetel(t) {
  kukaba('tetel', t.nev, { tetelek: [copy(t)] });
  deleteTetel(t.id);
}
function torolMunkaresz(mr) {
  kukaba('munkaresz', mr.nev + ' · ' + ugyfelNev(megrOf(mr)), { munkareszek: [copy(mr)], tetelek: copy(tetelekOfMr(mr)) });
  deleteMunkaresz(mr.id);
}
function torolMegrendeles(p) {
  kukaba('megrendeles', (p.sorszam || '') + ' · ' + ugyfelNev(p) + ' · ' + megrLabel(p), megrCsomag(p));
  deleteProjekt(p.id);
}
const megrCsomag = (p) => ({ projektek: [copy(p)], munkareszek: copy(mrsOf(p)), tetelek: copy(S.data.tetelek.filter(t => t.projektId === p.id)) });
function torolUgyfel(u) {
  const ms = megrendelesekOf(u);
  const adat = { ugyfelek: [copy(u)], projektek: [], munkareszek: [], tetelek: [] };
  for (const p of ms) { const c = megrCsomag(p); adat.projektek.push(...c.projektek); adat.munkareszek.push(...c.munkareszek); adat.tetelek.push(...c.tetelek); }
  kukaba('ugyfel', u.nev + (ms.length ? ' (' + ms.length + ' megrendeléssel)' : ''), adat);
  for (const p of ms) deleteProjekt(p.id);
  deleteUgyfel(u.id);
}
function torolHelyiseg(p, room) {
  const kotott = S.data.tetelek.filter(t => t.projektId === p.id && tetelRoomId(t) === room.id).map(t => t.id);
  kukaba('helyiseg', room.nev + ' · ' + ugyfelNev(p), { helyiseg: copy(room), projektId: p.id, kotott });
  p.helyisegek = roomsOf(p).filter(r => r.id !== room.id); upsertProjekt(p);
  for (const t of S.data.tetelek.filter(t => kotott.includes(t.id))) { t.roomId = ''; if (t.values) delete t.values._room; upsertTetel(t); }
}
// Megerősítés + törlés típus szerint (listából húzva, vagy a szerkesztő ablakokból)
function torlesKerdes(tipus, id, utana) {
  let szoveg, fn;
  if (tipus === 'ugyfel') {
    const u = ugyfelById(id); if (!u) return; const n = megrendelesekOf(u).length;
    szoveg = 'Törlöd „' + u.nev + '” ügyfelet' + (n ? ' és a(z) ' + n + ' megrendelését (munkarészekkel, tételekkel)' : '') + '?'; fn = () => torolUgyfel(u);
  } else if (tipus === 'megrendeles') {
    const p = S.data.projektek.find(x => x.id === id); if (!p) return; const n = S.data.tetelek.filter(t => t.projektId === p.id).length;
    szoveg = 'Törlöd a(z) ' + (p.sorszam || '') + ' megrendelést (' + ugyfelNev(p) + ')' + (n ? ' és a(z) ' + n + ' tételét' : '') + '?'; fn = () => torolMegrendeles(p);
  } else if (tipus === 'munkaresz') {
    const mr = mrById(id); if (!mr) return; const n = tetelekOfMr(mr).length;
    szoveg = 'Törlöd a(z) „' + mr.nev + '” munkarészt' + (n ? ' és a(z) ' + n + ' tételét' : '') + '?'; fn = () => torolMunkaresz(mr);
  } else if (tipus === 'helyiseg') {
    const [pid, rid] = id.split('|'); const p = S.data.projektek.find(x => x.id === pid); const room = p && roomById(p, rid); if (!room) return;
    const n = S.data.tetelek.filter(t => t.projektId === p.id && tetelRoomId(t) === room.id).length;
    szoveg = 'Törlöd a(z) „' + room.nev + '” felmérését?' + (n ? ' A ' + n + ' tétel megmarad a mostani értékeivel, de már nem frissül a felmérésből.' : ''); fn = () => torolHelyiseg(p, room);
  } else if (tipus === 'tetel') {
    const t = S.data.tetelek.find(x => x.id === id); if (!t) return;
    szoveg = 'Törlöd a(z) „' + t.nev + '” tételt?'; fn = () => torolTetel(t);
  } else return;
  if (!confirm(szoveg + KUKA_UZENET)) return false;
  fn(); toast(KUKA_NEV[tipus] + ' törölve – visszaállítható a Törölt elemek közül');
  if (utana) utana(); else render();
  return true;
}

/* ---------- Visszaállítás ---------- */
function kukaVissza(k) {
  const a = k.adat || {};
  if (k.tipus === 'helyiseg') {
    const p = S.data.projektek.find(x => x.id === a.projektId);
    if (!p) return toast('A megrendelés, amelyhez tartozott, már nincs meg – előbb azt állítsd vissza');
    if (!roomById(p, a.helyiseg.id)) { p.helyisegek = roomsOf(p).concat([a.helyiseg]); upsertProjekt(p); }
    for (const t of S.data.tetelek.filter(t => (a.kotott || []).includes(t.id))) { t.roomId = a.helyiseg.id; t.values = Object.assign(t.values || {}, { _room: a.helyiseg.id }); applyRoomToTetel(t, a.helyiseg); upsertTetel(t); }
  } else {
    for (const p of a.projektek || []) if (p.ugyfelId && !ugyfelById(p.ugyfelId) && !(a.ugyfelek || []).some(u => u.id === p.ugyfelId)) {
      return toast('Az ügyfél, akihez tartozott, már nincs meg – előbb őt állítsd vissza');
    }
    for (const m of a.munkareszek || []) if (!S.data.projektek.some(p => p.id === m.projektId) && !(a.projektek || []).some(p => p.id === m.projektId)) {
      return toast('A megrendelés, amelyhez tartozott, már nincs meg – előbb azt állítsd vissza');
    }
    for (const t of a.tetelek || []) if (t.munkareszId && !mrById(t.munkareszId) && !(a.munkareszek || []).some(m => m.id === t.munkareszId)) {
      return toast('A munkarész, amelyhez tartozott, már nincs meg – előbb azt állítsd vissza');
    }
    (a.ugyfelek || []).forEach(u => upsertUgyfel(copy(u)));
    (a.projektek || []).forEach(p => upsertProjekt(copy(p)));
    (a.munkareszek || []).forEach(m => upsertMunkaresz(copy(m)));
    (a.tetelek || []).forEach(t => upsertTetel(copy(t)));
  }
  kukaTorol(k.id); toast('Visszaállítva: ' + k.nev); render();
}

/* ---------- Törölt elemek képernyő ---------- */
function renderKuka() {
  kukaLejart();
  const ks = kukaLista();
  setHeader('Törölt elemek', ks.length + ' elem · ' + KUKA_NAP + ' napig őrzi');
  let h = '<div class="small muted" style="margin:0 2px 10px">A törölt ügyfelek, megrendelések, munkarészek, felmérések és tételek ' + KUKA_NAP + ' napig itt maradnak, utána véglegesen törlődnek.</div>';
  if (!ks.length) h += '<div class="empty">A kuka üres.</div>';
  else {
    h += '<div class="card list">' + ks.map(k => {
      const nap = Math.max(0, KUKA_NAP - Math.floor((Date.now() - Date.parse(k.torolve)) / 864e5));
      return '<div class="it"><span class="ic">' + (KUKA_IKON[k.tipus] || '•') + '</span><div class="m"><b>' + esc(k.nev) + '</b><small>' + esc(KUKA_NEV[k.tipus] + ' · törölve ' + dateHu(k.torolve) + ' · még ' + nap + ' napig') + '</small></div>' +
        '<button class="btn sm" data-vissza="' + k.id + '">↶ Vissza</button><button class="nydel" data-vegleg="' + k.id + '" title="Végleges törlés">✕</button></div>';
    }).join('') + '</div>';
    h += '<div class="btns"><button class="btn danger" id="kurit">Kuka ürítése</button></div>';
  }
  $('#view').innerHTML = h;
  document.querySelectorAll('[data-vissza]').forEach(b => b.onclick = () => { const k = kukaLista().find(x => x.id === b.dataset.vissza); if (k) kukaVissza(k); });
  document.querySelectorAll('[data-vegleg]').forEach(b => b.onclick = () => { if (confirm('Véglegesen törlöd? Ez már nem vonható vissza.')) { kukaTorol(b.dataset.vegleg); renderKuka(); } });
  if ($('#kurit')) $('#kurit').onclick = () => { if (confirm('Kiüríted a kukát? A benne lévő ' + ks.length + ' elem véglegesen törlődik.')) { ks.slice().forEach(k => kukaTorol(k.id)); renderKuka(); } };
}

/* ---------- Balra húzás a listákban ----------
   Minden törölhető listaelem kap egy data-del="tipus|id" attribútumot; balra húzva előjön a 🗑 Törlés gomb. */
(function swipeInit() {
  let el = null, x0 = 0, y0 = 0, dx = 0, irany = '', nyitott = null;
  const MAX = 92;
  const zar = (kiveve) => { if (nyitott && nyitott !== kiveve) { nyitott.style.transform = ''; nyitott.classList.remove('swiped'); const b = nyitott.querySelector('.swipe-del'); if (b) b.remove(); nyitott = null; } };
  const nyit = (it) => {
    zar(it); nyitott = it; it.classList.add('swiped'); it.style.transform = 'translateX(-' + MAX + 'px)';
    if (!it.querySelector('.swipe-del')) {
      const b = document.createElement('button'); b.className = 'swipe-del'; b.textContent = '🗑 Törlés';
      b.addEventListener('click', (e) => { e.stopPropagation(); const [tipus, ...rest] = it.dataset.del.split('|'); zar(); torlesKerdes(tipus, rest.join('|')); });
      it.appendChild(b);
    }
  };
  document.addEventListener('touchstart', (e) => {
    const it = e.target.closest && e.target.closest('[data-del]');
    if (!it) { zar(); return; }
    if (e.target.closest('.swipe-del')) return;
    el = it; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; irany = '';
    el.style.transition = 'none';
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!el) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!irany) { if (Math.abs(mx) > 8 || Math.abs(my) > 8) irany = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'; else return; }
    if (irany !== 'x') return;
    const alap = el === nyitott ? -MAX : 0;
    dx = Math.min(0, Math.max(-MAX - 30, alap + mx));
    el.style.transform = 'translateX(' + dx + 'px)';
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!el) return;
    el.style.transition = '';
    if (irany === 'x') {
      if (dx < -MAX / 2) nyit(el); else { el.style.transform = ''; if (el === nyitott) zar(); }
      el.dataset.swipeClick = '1'; const x = el; setTimeout(() => { delete x.dataset.swipeClick; }, 350);
    }
    el = null;
  });
  // húzás után ne nyíljon meg az elem; nyitott elemre koppintva csak bezárjuk
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('.swipe-del')) return;
    const it = e.target.closest && e.target.closest('[data-del]');
    if (it && (it.dataset.swipeClick || (it === nyitott && !e.target.closest('.swipe-del')))) { e.stopPropagation(); e.preventDefault(); if (!it.dataset.swipeClick) zar(); }
  }, true);
  window.swipeZar = () => zar();
})();
