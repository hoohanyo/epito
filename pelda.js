/* Metrum – „Példa” a kalkulátorokhoz és a beépített minta ügyfél / megrendelés
   A minta csak ezen az eszközön, a memóriában él: nem kerül a Sheetbe, a gyorsítótárba,
   a havi összesítőbe és a számozásba. Módosítható, de újraindításkor visszaáll. */

/* ---------- Kalkulátor-példák ---------- */
const PELDAK = {
  beton: ['Kerti járda betonlemeze: 6 m hosszú, 1,2 m széles, 10 cm vastag, hálóval, kész betonnal', { alak: 'lemez', Lh: 6, Ls: 1.2, vast: 10, halo: true, mod: 'kesz', oszt: 'C16' }],
  esztrich: ['18 m²-es szoba aljzata: 5 cm esztrich zsákos anyagból, peremszalaggal', { am: 'm2', A: 18, mod: 'zsak', vast: 5, perem: true }],
  falazas: ['Válaszfal: 3,5 m hosszú, 2,7 m magas, 10 cm-es kerámia falazóelemből, egy 90×210-es ajtóval', { elem: 'p10', am: 'fal', L: 3.5, Hm: 2.7, ny: 1.89 }],
  zsaluko: ['Kerti támfal: 8 m hosszú, 1,2 m magas, 30-as zsalukőből', { tip: '30', am: 'fal', L: 8, Hm: 1.2, ny: 0 }],
  vakolas: ['Garázs falai: 20 m kerület, 2,5 m magas, egy ajtó és egy ablak levonásával', { am: 'fal', L: 20, Hm: 2.5, ny: 5.4, vast: 1.5 }],
  festes: ['4×3 m-es szoba, 2,7 m belmagasság, mennyezettel, egy ajtó és egy ablak levonásával', { am: 'hel', Lh: 4, Ls: 3, Hm: 2.7, menny: true, ny: 3.6, gl: true, alap: true, fest: true, ret: 2 }],
  gipszkarton: ['Gipszkarton válaszfal: 3 m hosszú, 2,7 m magas, egy ajtóval, ásványgyapottal', { tip: 'vf', L: 3, Hm: 2.7, ny: 1.89, ret: '1', gyapot: true }],
  burkolas: ['Fürdőszoba padlója: 2,4×1,8 m, 60×60-as lap, lábazattal, kenhető vízszigeteléssel', { hol: 'padlo', Lh: 2.4, Ls: 1.8, la: 60, lb: 60, lab: true, szig: true }],
  vizszig: ['Zuhanyzós fürdőszoba: 8 m² kenhető szigetelés alapozóval', { am: 'm2', A: 8, tip: 'ken', alap: true }],
  homlokzat: ['Kockaház: 40 m kerület, 3 m magas homlokzat, 25 m² nyílással, 15 cm grafitos EPS', { am: 'fal', L: 40, Hm: 3, ny: 25, any: 'eps_grafit', vast: 15 }],
  fodem: ['80 m²-es padlásfödém: 25 cm üveggyapot párazáró fóliával', { am: 'm2', A: 80, any: 'uveggyapot', vast: 25, fol: true }],
  teto: ['Családi ház: 100 m² alapterület, 35°-os tetőhajlás', { am: 'alap', Av: 100, fok: 35 }],
  eresz: ['Családi ház: 34 m ereszcsatorna, 4 lefolyó 5 m magasról', { L: 34, lef: 4, lefh: 5 }],
  terko: ['Kocsibeálló: 6×3 m térkő, 15 cm zúzottkő alap, szegélykővel', { am: 'hsz', Lh: 6, Ls: 3, alap: 15, szm: 'kor' }],
  omlesztett: ['Kerti út murvából: 10 m hosszú, 1 m széles, 5 cm vastag, geotextíliával', { any: 'murva', am: 'hsz', Lh: 10, Ls: 1, vast: 5, geo: true }],
  kerites: ['30 m drótfonatos kerítés 2,5 m-es oszloptávolsággal, egy kapuval', { L: 30, tip: 'drot', kapu: 1, koz: 2.5 }],
  deszka: ['Nappali díszfala: 3,5 m széles, 2,6 m magas, vízszintes deszkaburkolat', { L: 3.5, Hm: 2.6, ir: 'viz', ny: 0 }],
  terasz: ['4×3 m-es fa terasz 14,5 cm-es teraszdeszkával, olajozva', { Lh: 4, Ls: 3, dsz: 14.5, kez: true }],
  kobozes: ['10 db 5×10 cm-es, 4 m hosszú gerenda', { db: 10, v: 5, sz: 10, h: 4 }],
  alakzat: ['L alakú szoba: 5×4 m-es téglalapból egy 2×2 m-es sarok hiányzik', { a: 'L', x1: 5, y1: 4, x2: 2, y2: 2 }],
  lejtes: ['Terasz esése: 2%-os lejtés 4 m hosszon', { be: 'sz', p: 2, L: 4 }],
  lepcso: ['Emeletre vezető lépcső: 280 cm szintkülönbség, legfeljebb 18 cm-es fellépő', { H: 280, mmax: 18, lep: 63 }],
  keveres: ['100 liter 1:4 arányú habarcs homokkal', { ar: 4, V: 100, ad: 'homok' }],
  villany: ['Szoba felújítása: 4 dugalj, 1 kapcsoló, 1 lámpahely, falba vésve, érintésvédelmi méréssel', { mod: 'vesett', hely: 1, dug: 4, kap: 1, lam: 1, kor: 0, gyenge: 0, vh: 6, ev: true }],
  viz: ['Fürdőszoba: mosdó, WC, zuhany és mosógép bekötése PPR csővel, falba vésve', { mod: 'vesett', cso: 'ppr', mosdo: 1, wc: 1, zuhany: 1, kad: 0, mosogato: 0, gep: 1 }],
  futes: ['Négy lapradiátor (600×1000) termosztatikus szeleppel, osztó-gyűjtővel, falba vésett csővel', { mod: 'vesett', rad: 4, meret: '600x1000', radAnyag: true, oszto: true }],
  padlofutes: ['20 m²-es nappali padlófűtése rendszerlemezen, 15 cm-es csőosztással', { A: 20, oszt: '15', alap: 'lemez', oszto: true }],
  bontas: ['Fürdőszoba bontása: 16 m² csempe és járólap, 3 szaniter, első emeletről, 4 m³-es konténerrel', { burk: true, ba: 16, szan: 3, kont: 'k4', em: 1 }],
  foldmunka: ['Sávalap árka: 30 m hosszú, 40 cm széles, 80 cm mély, géppel, a föld elszállításával', { tip: 'arok', L: 30, Sz: 0.4, M: 0.8, asas: 'gepi', vt: 0, elsz: true }],
  elokeszito: ['Kazáncsere előtt: 6 fm horony a gázcsőnek, 1 faláttörés az égéstermék-elvezetőnek, a kazán helyének előkészítése', { horony: true, hl: 6, hjav: true, atfur: true, adb: 1, atip: 'nagy', avast: 'v30', rm_kazanhely: 1 }],
  berles: ['Homlokzatfelújítás: 150 m² állvány 4 hétre, fel- és leszereléssel, egy 6 m³-es konténer', { allv: true, aA: 150, ah: 4, aszer: true, k6: 1 }],
  laminalt: ['4×3 m-es szoba laminált padlóval, alátéttel, párazáróval, szegélyléccel', { tip: 'lam', Lh: 4, Ls: 3, ajto: 0.9, alatet: true, para: true, szeg: true, atm: 1 }],
  butor: ['Konyhabútor: 3,6 m alsó és 3 m felső sor, egy magas szekrény, munkalap két kivágással, főzőlap, sütő, mosogatógép, páraelszívó és mosogató beépítése', { konyha: true, alsoFm: 3.6, felsoFm: 3, magas: 1, pult: true, kiv: 2, g_fozo: 1, g_suto: 1, g_mosgep: 1, g_para: 1, g_mosogato: 1 }],
  nyilaszaro: ['Két 120×140-es ablak cseréje belső párkánnyal és kávajavítással', { mod: 'csere', ablak: 2, aw: 1.2, ah: 1.4, bpark: true, kava: true }],
};

/* ---------- Beépített minta ---------- */
const MINTA_ON = () => LS.get('metrum_minta', true) !== false;
const isMintaId = (id) => String(id || '').indexOf('MINTA') === 0;
const isMinta = (x) => !!x && isMintaId(x.id);
const nemMinta = (arr) => (arr || []).filter(x => !isMinta(x));
function mintaNap(eltol) { const d = new Date(); d.setDate(d.getDate() + eltol); return isoDay(d); }

function mintaEpit() {
  const u = { id: 'MINTA_U', nev: 'Minta Anna', cim: '2234 Maglód, Fő utca 12.', tel: '+36 20 555 1234', email: 'minta.anna@example.com', megj: 'Beépített minta – nézz körül bátran. A módosítások nem mentődnek, újraindításkor visszaáll.' };
  const furdo = { id: 'MINTA_R1', nev: 'Fürdőszoba', L: 2.4, W: 1.8, H: 2.6, nyl: [{ t: 'ajto', w: 0.75, h: 2.1, db: 1 }] };
  const nappali = { id: 'MINTA_R2', nev: 'Nappali', L: 4.6, W: 3.9, H: 2.7, nyl: [{ t: 'ajto', w: 0.9, h: 2.1, db: 1 }, { t: 'ablak', w: 1.5, h: 1.5, db: 2, p: 0.9 }] };
  const p = { id: 'MINTA_P', ugyfelId: u.id, sorszam: 'MINTA', nev: 'Fürdőszoba és nappali felújítás', hely: u.cim,
    megj: 'Fürdőszoba teljes felújítása, a nappali glettelése és festése, két ajtó mázolásával.', allapot: 'Elfogadva',
    kikuldve: mintaNap(-12), elfogadva: mintaNap(-5), helyisegek: [furdo, nappali], fotok: [],
    aj: { szam: 'ÁJ-MINTA', datum: mintaNap(-12), erv: 30 },
    kiadasok: [{ id: 'MINTA_K1', datum: mintaNap(-3), nev: 'Csempe, ragasztó, fugázó (barkácsáruház)', osszeg: 186500, foto: null }, { id: 'MINTA_K2', datum: mintaNap(-2), nev: 'Glett, festék', osszeg: 42300, foto: null }],
    naplo: [{ id: 'MINTA_N1', datum: mintaNap(-3), ora: 8, megj: 'Bontás, sittelszállítás' }, { id: 'MINTA_N2', datum: mintaNap(-2), ora: 9, megj: 'Vízszerelés, vízszigetelés' }],
    ajElozmeny: [], letrehozva: mintaNap(-14) };
  const mrs = [{ id: 'MINTA_M1', projektId: p.id, nev: 'Fürdőszoba-felújítás', sorrend: 1, ajanlatban: true }, { id: 'MINTA_M2', projektId: p.id, nev: 'Nappali festés, mázolás', sorrend: 2, ajanlatban: true }];
  const ts = []; let n = 0;
  const tetel = (mr, room, nev, calc, vals, md) => {
    const t = { id: 'MINTA_T' + (++n), projektId: p.id, munkareszId: mr.id, nev, letrehozva: mintaNap(-14) + 'T08:' + String(n).padStart(2, '0') + ':00Z' };
    if (calc) {
      const c = CALC_BY_ID[calc]; const v = Object.assign(defaults(c), vals || {}); t.calc = calc; t.values = v;
      if (room && ROOM_MAP[calc]) applyRoomToTetel(t, room);
      else { const r = fullResult(c, v); t.mats = r.mats.map(x => Object.assign({}, x, { q: round3(x.q) })); t.out = r.out; if (room) t.roomId = room.id; }
    } else { t.calc = 'egyeb'; t.values = {}; t.mats = [{ k: md[0], q: md[1] }]; t.out = [['Mennyiség', fmt(md[1]) + ' ' + mat(md[0]).u]]; }
    ts.push(t);
  };
  const sab = SABLONOK.find(s => s.id === 'furdo');
  for (const it of sab.items) {
    if (it.calc) tetel(mrs[0], furdo, it.nev, it.calc, it.v);
    else if (it.md) tetel(mrs[0], null, it.nev, null, null, [it.md, it.rq && ROOM_Q[it.rq] ? r2(ROOM_Q[it.rq][1](furdo)) : (it.q || 1)]);
  }
  tetel(mrs[1], nappali, 'Glettelés, festés, ajtómázolás', 'festes', { menny: true, rm_takaras: true, rm_ajto: 2 });
  return { u, p, mrs, ts };
}
// A minta a memóriában: betöltés után és minden megjelenítés előtt ellenőrizzük
function mintaBiztosit() {
  if (!S.data || !S.data.projektek) return;
  const van = S.data.projektek.some(isMinta);
  if (!MINTA_ON()) { if (van || S.data.ugyfelek.some(isMinta)) mintaEltavolit(); return; }
  if (van) return;
  try {
    const m = mintaEpit();
    if (!S.data.ugyfelek.some(isMinta)) S.data.ugyfelek.push(m.u);
    S.data.projektek.push(m.p); S.data.munkareszek.push(...m.mrs); S.data.tetelek.push(...m.ts);
  } catch (e) { console.warn('Minta hiba', e); }
}
function mintaEltavolit() {
  S.data.ugyfelek = nemMinta(S.data.ugyfelek); S.data.projektek = nemMinta(S.data.projektek);
  S.data.munkareszek = nemMinta(S.data.munkareszek); S.data.tetelek = nemMinta(S.data.tetelek);
}
// a mentett gyorsítótárba nem kerül bele
function mintaNelkul(d) {
  if (!d || !d.projektek) return d;
  return Object.assign({}, d, { ugyfelek: nemMinta(d.ugyfelek), projektek: nemMinta(d.projektek), munkareszek: nemMinta(d.munkareszek), tetelek: nemMinta(d.tetelek) });
}
// a szerverre semmi nem megy, ami a mintára hivatkozik
const mintaPayload = (payload) => /"(id|projektId|ugyfelId|munkareszId)":"MINTA/.test(JSON.stringify(payload || {}));

/* Másolat: a mintából saját megrendelés lesz (új azonosítókkal, valódi ügyfélhez) */
function mintaMasolat(p) {
  const h = '<h3>Másolat saját megrendelésként</h3><p class="small muted" style="margin-top:-6px">A minta minden adata (felmérés, munkarészek, tételek) átkerül egy új, valódi megrendelésbe. Az ajánlat, a kiadások és a munkanapló üresen indul.</p>' +
    '<div class="fld"><label>Ügyfél neve</label><input id="mmu" placeholder="Az új megrendelő neve"></div>' +
    '<div class="btns"><button class="btn" id="mmx">Mégse</button><button class="btn pri" id="mmok">Másolat készítése</button></div>';
  openModal(h, m => {
    $('#mmx', m).onclick = closeModal;
    $('#mmok', m).onclick = () => {
      const nev = $('#mmu', m).value.trim(); if (!nev) { toast('Add meg az ügyfél nevét'); return; }
      let u = S.data.ugyfelek.find(x => !isMinta(x) && x.nev.toLowerCase() === nev.toLowerCase());
      if (!u) { u = { id: uid('U'), nev, cim: '', tel: '', email: '', megj: '', letrehozva: new Date().toISOString() }; upsertUgyfel(u); }
      const rmap = {};
      const helyisegek = roomsOf(p).map(r => { const id = uid('R'); rmap[r.id] = id; return Object.assign(JSON.parse(JSON.stringify(r)), { id }); });
      const uj = ujMegrendeles(u, { nev: p.nev, hely: u.cim || '', megj: p.megj, helyisegek });
      for (const mr of mrsOf(p)) {
        const m2 = Object.assign({}, mr, { id: uid('M'), projektId: uj.id }); upsertMunkaresz(m2);
        for (const t of tetelekOfMr(mr)) {
          const t2 = JSON.parse(JSON.stringify(t)); t2.id = uid('T'); t2.projektId = uj.id; t2.munkareszId = m2.id;
          if (t2.roomId) t2.roomId = rmap[t2.roomId] || ''; if (t2.values && t2.values._room) t2.values._room = rmap[t2.values._room] || '';
          upsertTetel(t2);
        }
      }
      closeModal(); S.tab = 'proj'; S.stack = [{ v: 'proj' }, { v: 'projekt', id: uj.id }]; render(); toast('Elkészült: ' + uj.sorszam);
    };
  });
}
const mintaBanner = (p) => isMinta(p) ? '<div class="banner minta"><div>🧪 Ez a beépített <b>minta</b>, puskának. Bármit megnézhetsz és kipróbálhatsz benne, de a módosítások nem mentődnek, és újraindításkor visszaáll.</div><button class="btn sm" id="mintaMas">Másolat saját megrendelésként</button></div>' : '';
const mintaPill = (x) => isMinta(x) ? '<span class="pill minta">MINTA</span>' : '';
