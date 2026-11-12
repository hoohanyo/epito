/* Építőkalkulátor – számítási motor
   Minden kalkulátor: mezők (fields) + compute(v) -> { out:[[címke, érték]], mats:[{k, q}], warn:[] }
   Az anyagmennyiség (q) mindig az anyag alapegységében van (MATERIALS[k].u).
   A kiszerelésre kerekítést és az árat az app számolja az Árlista alapján. */

const CALC_VERSION = '0.1';

/* ---------- Anyagok, alap (minta) árlista ----------
   u: alapegység, pack: kiszerelés alapegységben (0 = nincs kerekítés, az ár alapegységre értendő),
   pn: kiszerelés neve, p: ár Ft / kiszerelés (pack=0 esetén Ft / alapegység)
   Az árak csak MINTA értékek – az Árlista fülön írd át a sajátodra. */
const MATERIALS = {
  // Kötőanyag, beton
  kesz_beton:   { n: 'Kész beton (mixer)', g: 'Beton, habarcs', u: 'm³', pack: 0, pn: 'm³', p: 40000 },
  cement:       { n: 'Cement', g: 'Beton, habarcs', u: 'kg', pack: 25, pn: 'zsák (25 kg)', p: 2800 },
  soder:        { n: 'Homokos kavics (sóder)', g: 'Beton, habarcs', u: 't', pack: 0, pn: 't', p: 9000 },
  homok:        { n: 'Homok', g: 'Beton, habarcs', u: 't', pack: 0, pn: 't', p: 9000 },
  szarazbeton:  { n: 'Zsákos szárazbeton', g: 'Beton, habarcs', u: 'kg', pack: 25, pn: 'zsák (25 kg)', p: 1600 },
  betonhalo:    { n: 'Betonacél háló', g: 'Beton, habarcs', u: 'm²', pack: 6, pn: 'tábla (2×3 m)', p: 7500 },
  esztrich:     { n: 'Esztrich szárazhabarcs', g: 'Beton, habarcs', u: 'kg', pack: 25, pn: 'zsák (25 kg)', p: 1900 },
  onterulo:     { n: 'Önterülő aljzatkiegyenlítő', g: 'Beton, habarcs', u: 'kg', pack: 25, pn: 'zsák (25 kg)', p: 6000 },
  peremszalag:  { n: 'Peremszigetelő szalag', g: 'Beton, habarcs', u: 'fm', pack: 25, pn: 'tekercs (25 m)', p: 2500 },
  falazohabarcs:{ n: 'Falazóhabarcs (száraz)', g: 'Beton, habarcs', u: 'kg', pack: 40, pn: 'zsák (40 kg)', p: 2300 },
  ytong_ragaszto:{ n: 'Pórusbeton falazóragasztó', g: 'Beton, habarcs', u: 'kg', pack: 25, pn: 'zsák (25 kg)', p: 4500 },
  // Falazóelemek
  tegla_kis:    { n: 'Kisméretű tömör tégla', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 130 },
  poro10:       { n: 'Porotherm 10 N+F', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 520 },
  poro30:       { n: 'Porotherm 30 N+F', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 950 },
  poro38:       { n: 'Porotherm 38 N+F', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 1200 },
  poro44:       { n: 'Porotherm 44 N+F', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 1450 },
  ytong10:      { n: 'Pórusbeton válaszfalelem 10 cm', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 800 },
  ytong20:      { n: 'Pórusbeton falazóelem 20 cm', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 1500 },
  ytong30:      { n: 'Pórusbeton falazóelem 30 cm', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 2100 },
  ytong375:     { n: 'Pórusbeton falazóelem 37,5 cm', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 2600 },
  falelem_egyedi:{ n: 'Falazóelem (egyedi)', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 0 },
  zsaluko15:    { n: 'Zsalukő 15 cm', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 550 },
  zsaluko20:    { n: 'Zsalukő 20 cm', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 620 },
  zsaluko25:    { n: 'Zsalukő 25 cm', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 720 },
  zsaluko30:    { n: 'Zsalukő 30 cm', g: 'Falazóelem', u: 'db', pack: 1, pn: 'db', p: 820 },
  // Vakolat, glett, festés
  vakolat:      { n: 'Alapvakolat (gépi/kézi)', g: 'Vakolat, festés', u: 'kg', pack: 30, pn: 'zsák (30 kg)', p: 2500 },
  glett:        { n: 'Glett', g: 'Vakolat, festés', u: 'kg', pack: 20, pn: 'zsák (20 kg)', p: 6500 },
  mely_alapozo: { n: 'Mélyalapozó', g: 'Vakolat, festés', u: 'l', pack: 5, pn: 'kanna (5 l)', p: 5000 },
  festek:       { n: 'Beltéri falfesték', g: 'Vakolat, festés', u: 'l', pack: 15, pn: 'vödör (15 l)', p: 16000 },
  // Gipszkarton
  gk_lap:       { n: 'Gipszkarton lap', g: 'Gipszkarton', u: 'db', pack: 1, pn: 'tábla', p: 3200 },
  cw_profil:    { n: 'CW profil', g: 'Gipszkarton', u: 'szál', pack: 1, pn: 'szál', p: 1600 },
  uw_profil:    { n: 'UW profil', g: 'Gipszkarton', u: 'szál', pack: 1, pn: 'szál', p: 1300 },
  cd_profil:    { n: 'CD profil', g: 'Gipszkarton', u: 'szál', pack: 1, pn: 'szál', p: 1500 },
  ud_profil:    { n: 'UD profil', g: 'Gipszkarton', u: 'szál', pack: 1, pn: 'szál', p: 1000 },
  fuggeszto:    { n: 'Függesztő (direkt/nóniusz)', g: 'Gipszkarton', u: 'db', pack: 1, pn: 'db', p: 180 },
  gk_csavar:    { n: 'Gipszkarton csavar', g: 'Gipszkarton', u: 'db', pack: 1000, pn: 'doboz (1000 db)', p: 4500 },
  gk_hezag:     { n: 'Hézagoló gipsz', g: 'Gipszkarton', u: 'kg', pack: 5, pn: 'zsák (5 kg)', p: 3500 },
  bandazs:      { n: 'Bandázsszalag', g: 'Gipszkarton', u: 'fm', pack: 90, pn: 'tekercs (90 m)', p: 2500 },
  gk_gyapot:    { n: 'Hangszigetelő gyapot (5 cm)', g: 'Gipszkarton', u: 'm²', pack: 0, pn: 'm²', p: 1300 },
  // Burkolás
  burkolat:     { n: 'Burkolólap (csempe/járólap)', g: 'Burkolás', u: 'm²', pack: 0, pn: 'm²', p: 7000 },
  burk_ragaszto:{ n: 'Csemperagasztó', g: 'Burkolás', u: 'kg', pack: 25, pn: 'zsák (25 kg)', p: 5000 },
  fugazo:       { n: 'Fugázó', g: 'Burkolás', u: 'kg', pack: 5, pn: 'zsák (5 kg)', p: 4200 },
  labazat:      { n: 'Lábazati csík / szegély', g: 'Burkolás', u: 'fm', pack: 0, pn: 'fm', p: 1500 },
  kenheto_szig: { n: 'Kenhető vízszigetelés', g: 'Burkolás', u: 'kg', pack: 7, pn: 'vödör (7 kg)', p: 16000 },
  hajlat_szalag:{ n: 'Hajlaterősítő szalag', g: 'Burkolás', u: 'fm', pack: 10, pn: 'tekercs (10 m)', p: 4500 },
  // Vízszigetelés
  bitumen_lemez:{ n: 'Bitumenes vízszigetelő lemez', g: 'Vízszigetelés', u: 'm²', pack: 10, pn: 'tekercs (10 m²)', p: 18000 },
  bitumen_alap: { n: 'Bitumenes alapozó', g: 'Vízszigetelés', u: 'l', pack: 10, pn: 'kanna (10 l)', p: 9000 },
  // Hőszigetelés
  eps_feher:    { n: 'Homlokzati EPS 80 (fehér)', g: 'Hőszigetelés', u: 'm³', pack: 0, pn: 'm³', p: 26000 },
  eps_grafit:   { n: 'Homlokzati grafitos EPS', g: 'Hőszigetelés', u: 'm³', pack: 0, pn: 'm³', p: 31000 },
  kozetgyapot_h:{ n: 'Homlokzati kőzetgyapot', g: 'Hőszigetelés', u: 'm³', pack: 0, pn: 'm³', p: 60000 },
  xps:          { n: 'XPS lábazati hőszigetelés', g: 'Hőszigetelés', u: 'm³', pack: 0, pn: 'm³', p: 65000 },
  hoszig_ragaszto:{ n: 'Hőszigetelő ragasztótapasz', g: 'Hőszigetelés', u: 'kg', pack: 25, pn: 'zsák (25 kg)', p: 4800 },
  dubel:        { n: 'Beütő dübel', g: 'Hőszigetelés', u: 'db', pack: 1, pn: 'db', p: 60 },
  uvegszovet:   { n: 'Üvegszövet háló', g: 'Hőszigetelés', u: 'm²', pack: 50, pn: 'tekercs (50 m²)', p: 25000 },
  vakolat_alapozo:{ n: 'Vékonyvakolat-alapozó', g: 'Hőszigetelés', u: 'kg', pack: 15, pn: 'vödör (15 kg)', p: 15000 },
  szinvakolat:  { n: 'Színvakolat (vékonyvakolat)', g: 'Hőszigetelés', u: 'kg', pack: 25, pn: 'vödör (25 kg)', p: 19000 },
  labazati_profil:{ n: 'Lábazati indítóprofil', g: 'Hőszigetelés', u: 'szál', pack: 1, pn: 'szál (2,5 m)', p: 2600 },
  elvedo:       { n: 'Hálós élvédő', g: 'Hőszigetelés', u: 'szál', pack: 1, pn: 'szál (2,5 m)', p: 700 },
  uveggyapot:   { n: 'Üveggyapot (födém/tető)', g: 'Hőszigetelés', u: 'm³', pack: 0, pn: 'm³', p: 22000 },
  kozetgyapot_f:{ n: 'Kőzetgyapot (födém/tető)', g: 'Hőszigetelés', u: 'm³', pack: 0, pn: 'm³', p: 30000 },
  eps_padlo:    { n: 'EPS 100 (padló/födém)', g: 'Hőszigetelés', u: 'm³', pack: 0, pn: 'm³', p: 30000 },
  parazaro:     { n: 'Párazáró fólia', g: 'Hőszigetelés', u: 'm²', pack: 75, pn: 'tekercs (75 m²)', p: 22000 },
  // Tető
  cserep:       { n: 'Tetőcserép', g: 'Tető', u: 'db', pack: 1, pn: 'db', p: 380 },
  gerinccserep: { n: 'Gerinccserép', g: 'Tető', u: 'db', pack: 1, pn: 'db', p: 1100 },
  tetolec:      { n: 'Tetőléc', g: 'Tető', u: 'fm', pack: 4, pn: 'szál (4 m)', p: 1600 },
  ellenlec:     { n: 'Ellenléc', g: 'Tető', u: 'fm', pack: 4, pn: 'szál (4 m)', p: 1400 },
  tetofolia:    { n: 'Páraáteresztő tetőfólia', g: 'Tető', u: 'm²', pack: 75, pn: 'tekercs (75 m²)', p: 45000 },
  csatorna:     { n: 'Ereszcsatorna', g: 'Tető', u: 'fm', pack: 4, pn: 'szál (4 m)', p: 9000 },
  csatorna_tarto:{ n: 'Csatornatartó (vas)', g: 'Tető', u: 'db', pack: 1, pn: 'db', p: 900 },
  lefolyo:      { n: 'Lefolyócső', g: 'Tető', u: 'fm', pack: 3, pn: 'szál (3 m)', p: 8000 },
  lefolyo_bilincs:{ n: 'Lefolyócső-bilincs', g: 'Tető', u: 'db', pack: 1, pn: 'db', p: 800 },
  csatorna_veg: { n: 'Végelzáró', g: 'Tető', u: 'db', pack: 1, pn: 'db', p: 1200 },
  csatorna_sarok:{ n: 'Csatorna sarokidom', g: 'Tető', u: 'db', pack: 1, pn: 'db', p: 6000 },
  csatorna_lefolyoidom:{ n: 'Csatorna lefolyóidom (üst)', g: 'Tető', u: 'db', pack: 1, pn: 'db', p: 4000 },
  lefolyo_konyok:{ n: 'Lefolyó könyök', g: 'Tető', u: 'db', pack: 1, pn: 'db', p: 2500 },
  // Kert, térburkolat, ömlesztett
  terko:        { n: 'Térkő', g: 'Kert', u: 'm²', pack: 0, pn: 'm²', p: 7500 },
  zuzottko:     { n: 'Zúzottkő (alap, 0/32)', g: 'Kert', u: 't', pack: 0, pn: 't', p: 13000 },
  kozuzalek:    { n: 'Kőzúzalék (ágyazat, 0/4)', g: 'Kert', u: 't', pack: 0, pn: 't', p: 15000 },
  szegelyko:    { n: 'Kerti szegélykő (1 m)', g: 'Kert', u: 'db', pack: 1, pn: 'db', p: 2200 },
  fugahomok:    { n: 'Fugahomok', g: 'Kert', u: 'kg', pack: 25, pn: 'zsák (25 kg)', p: 1800 },
  geotextil:    { n: 'Geotextília', g: 'Kert', u: 'm²', pack: 0, pn: 'm²', p: 350 },
  murva:        { n: 'Murva / díszkavics', g: 'Kert', u: 't', pack: 0, pn: 't', p: 18000 },
  termofold:    { n: 'Termőföld', g: 'Kert', u: 't', pack: 0, pn: 't', p: 8000 },
  // Kerítés
  ker_oszlop:   { n: 'Kerítésoszlop', g: 'Kerítés', u: 'db', pack: 1, pn: 'db', p: 5500 },
  drothalo:     { n: 'Drótfonat / drótháló', g: 'Kerítés', u: 'fm', pack: 25, pn: 'tekercs (25 m)', p: 32000 },
  fesziduzal:   { n: 'Feszítőhuzal', g: 'Kerítés', u: 'fm', pack: 50, pn: 'tekercs (50 m)', p: 5000 },
  ker_panel:    { n: 'Kerítéspanel', g: 'Kerítés', u: 'db', pack: 1, pn: 'db', p: 13000 },
  // Fa
  burkolo_deszka:{ n: 'Burkolódeszka', g: 'Fa', u: 'fm', pack: 0, pn: 'fm', p: 900 },
  alatet_lec:   { n: 'Alátétléc / lécváz', g: 'Fa', u: 'fm', pack: 0, pn: 'fm', p: 450 },
  teraszdeszka: { n: 'Teraszdeszka', g: 'Fa', u: 'fm', pack: 0, pn: 'fm', p: 2800 },
  terasz_gerenda:{ n: 'Terasz alátétgerenda', g: 'Fa', u: 'fm', pack: 0, pn: 'fm', p: 1700 },
  facsavar:     { n: 'Facsavar', g: 'Fa', u: 'db', pack: 200, pn: 'doboz (200 db)', p: 4500 },
  fureszaru:    { n: 'Fűrészáru', g: 'Fa', u: 'm³', pack: 0, pn: 'm³', p: 190000 },
  lazur:        { n: 'Fa felületkezelő (lazúr/olaj)', g: 'Fa', u: 'l', pack: 2.5, pn: 'doboz (2,5 l)', p: 10000 },
};

/* ---------- Segédfüggvények ---------- */
const CEIL = (x) => Math.ceil(x - 1e-9);
const nz = (x) => { x = Number(x); return isFinite(x) && x > 0 ? x : 0; };
function fmt(n, d) {
  if (n === null || n === undefined || !isFinite(n)) return '–';
  if (d === undefined) d = Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2;
  return Number(n).toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: d });
}
const F = (id, l, u, d, extra) => Object.assign({ id, t: 'num', l, u, d }, extra || {});
const SEL = (id, l, opts, d, extra) => Object.assign({ id, t: 'sel', l, opts, d }, extra || {});
const C = (id, l, d, extra) => Object.assign({ id, t: 'chk', l, d }, extra || {});
const T = (id, l, d, extra) => Object.assign({ id, t: 'txt', l, d }, extra || {});
const H = (l) => ({ t: 'hdr', l });

// Felület-megadás blokkok
function areaFields(kind) {
  // kind: 'floor' (padló/födém), 'wall' (fal), 'room' (helyiség falai+mennyezet)
  if (kind === 'wall') return [
    SEL('am', 'Felület megadása', [['fal', 'Hossz × magasság'], ['m2', 'Kész felület (m²)']], 'fal'),
    F('L', 'Fal hossza (összesen)', 'm', 5, { show: v => v.am === 'fal' }),
    F('Hm', 'Fal magassága', 'm', 2.7, { show: v => v.am === 'fal' }),
    F('A', 'Felület', 'm²', 10, { show: v => v.am === 'm2' }),
    F('ny', 'Nyílások levonása (ablak, ajtó)', 'm²', 0, { help: 'Pl. ajtó 0,9×2,1 ≈ 1,9 m², ablak 1,2×1,5 = 1,8 m²' }),
  ];
  if (kind === 'room') return [
    SEL('am', 'Felület megadása', [['hel', 'Helyiség (h × sz × belmagasság)'], ['m2', 'Kész felület (m²)']], 'hel'),
    F('Lh', 'Helyiség hossza', 'm', 4, { show: v => v.am === 'hel' }),
    F('Ls', 'Helyiség szélessége', 'm', 3, { show: v => v.am === 'hel' }),
    F('Hm', 'Belmagasság', 'm', 2.7, { show: v => v.am === 'hel' }),
    C('menny', 'Mennyezet is', true, { show: v => v.am === 'hel' }),
    F('A', 'Felület', 'm²', 40, { show: v => v.am === 'm2' }),
    F('ny', 'Nyílások levonása', 'm²', 3.5, { show: v => v.am === 'hel' || v.am === 'm2', help: 'Ajtó ≈ 1,9 m², ablak pl. 1,2×1,5 = 1,8 m²' }),
  ];
  return [
    SEL('am', 'Felület megadása', [['hsz', 'Hossz × szélesség'], ['m2', 'Kész terület (m²)']], 'hsz'),
    F('Lh', 'Hossz', 'm', 4, { show: v => v.am === 'hsz' }),
    F('Ls', 'Szélesség', 'm', 3, { show: v => v.am === 'hsz' }),
    F('A', 'Terület', 'm²', 12, { show: v => v.am === 'm2' }),
  ];
}
function areaOf(v, kind) {
  if (kind === 'wall') {
    const g = v.am === 'm2' ? nz(v.A) : nz(v.L) * nz(v.Hm);
    return { gross: g, net: Math.max(0, g - nz(v.ny)), per: v.am === 'fal' ? nz(v.L) : null };
  }
  if (kind === 'room') {
    if (v.am === 'm2') return { walls: Math.max(0, nz(v.A) - nz(v.ny)), ceil: 0, net: Math.max(0, nz(v.A) - nz(v.ny)), per: null };
    const per = 2 * (nz(v.Lh) + nz(v.Ls));
    const walls = Math.max(0, per * nz(v.Hm) - nz(v.ny));
    const ceil = v.menny ? nz(v.Lh) * nz(v.Ls) : 0;
    return { walls, ceil, net: walls + ceil, per };
  }
  if (v.am === 'm2') return { net: nz(v.A), per: null };
  return { net: nz(v.Lh) * nz(v.Ls), per: 2 * (nz(v.Lh) + nz(v.Ls)) };
}
const RAH = (d) => F('rah', 'Ráhagyás (veszteség)', '%', d, { help: 'Vágási és szállítási veszteség' });

/* ---------- Kalkulátorok ---------- */
const GROUPS = [
  ['szerk', 'Szerkezet', '🧱'],
  ['felulet', 'Felületek, belső munkák', '🎨'],
  ['szig', 'Szigetelés', '🧊'],
  ['teto', 'Tető', '🏠'],
  ['kert', 'Kert, udvar', '🌿'],
  ['fa', 'Fa', '🪵'],
  ['seged', 'Segédszámítások', '📐'],
];

const CALCS = [
/* ===== SZERKEZET ===== */
{
  id: 'beton', g: 'szerk', n: 'Beton (lemez, alap, pillér)', i: '🏗️',
  desc: 'Betonmennyiség és alapanyag – kész beton, helyben kevert vagy zsákos szárazbeton.',
  fields: [
    SEL('alak', 'Szerkezet', [['lemez', 'Lemez, járda, aljzat'], ['sav', 'Sávalap'], ['pill', 'Szögletes pillér / oszlopalap'], ['kor', 'Kör keresztmetszetű oszlop'], ['m3', 'Kész térfogat (m³)']], 'lemez'),
    F('Lh', 'Hossz', 'm', 4, { show: v => v.alak === 'lemez' || v.alak === 'sav' }),
    F('Ls', 'Szélesség', 'm', 3, { show: v => v.alak === 'lemez' }),
    F('vast', 'Vastagság', 'cm', 12, { show: v => v.alak === 'lemez' }),
    F('sz', 'Alap szélessége', 'cm', 40, { show: v => v.alak === 'sav' }),
    F('mely', 'Alap mélysége', 'cm', 80, { show: v => v.alak === 'sav' }),
    F('a', 'Keresztmetszet A oldal', 'cm', 30, { show: v => v.alak === 'pill' }),
    F('b', 'Keresztmetszet B oldal', 'cm', 30, { show: v => v.alak === 'pill' }),
    F('d', 'Átmérő', 'cm', 30, { show: v => v.alak === 'kor' }),
    F('h', 'Magasság / mélység', 'cm', 80, { show: v => v.alak === 'pill' || v.alak === 'kor' }),
    F('db', 'Darabszám', 'db', 1, { show: v => v.alak === 'pill' || v.alak === 'kor' }),
    F('V', 'Térfogat', 'm³', 1, { show: v => v.alak === 'm3' }),
    RAH(5),
    SEL('mod', 'Beton forrása', [['kesz', 'Kész beton (mixer)'], ['kevert', 'Helyben kevert (cement + sóder)'], ['zsak', 'Zsákos szárazbeton']], 'kesz'),
    SEL('oszt', 'Betonosztály', [['C12', 'C12/15 (soványbeton, aljzat alá)'], ['C16', 'C16/20 (alap, járda)'], ['C20', 'C20/25 (födém, lemez)'], ['C25', 'C25/30 (vasbeton)']], 'C16', { show: v => v.mod === 'kevert' }),
    C('halo', 'Betonacél háló a lemezbe', false, { show: v => v.alak === 'lemez' }),
  ],
  compute(v) {
    let V = 0;
    if (v.alak === 'lemez') V = nz(v.Lh) * nz(v.Ls) * nz(v.vast) / 100;
    else if (v.alak === 'sav') V = nz(v.Lh) * nz(v.sz) / 100 * nz(v.mely) / 100;
    else if (v.alak === 'pill') V = nz(v.a) / 100 * nz(v.b) / 100 * nz(v.h) / 100 * nz(v.db);
    else if (v.alak === 'kor') V = Math.PI * Math.pow(nz(v.d) / 200, 2) * nz(v.h) / 100 * nz(v.db);
    else V = nz(v.V);
    const Vr = V * (1 + nz(v.rah) / 100);
    const out = [['Nettó térfogat', fmt(V, 3) + ' m³'], ['Ráhagyással', fmt(Vr, 3) + ' m³']];
    const mats = [], warn = [];
    if (v.mod === 'kesz') {
      mats.push({ k: 'kesz_beton', q: Math.ceil(Vr * 4) / 4 });
      out.push(['Rendelés (¼ m³-re kerekítve)', fmt(Math.ceil(Vr * 4) / 4, 2) + ' m³']);
      if (Vr < 1) warn.push('1 m³ alatt a betonüzemek gyakran kisszállítási felárat kérnek – érdemes lehet zsákos szárazbetonnal számolni.');
    } else if (v.mod === 'kevert') {
      const cem = { C12: 250, C16: 300, C20: 330, C25: 370 }[v.oszt] || 300;
      mats.push({ k: 'cement', q: Vr * cem });
      mats.push({ k: 'soder', q: Vr * 1.9 });
      out.push(['Cement', fmt(Vr * cem, 0) + ' kg (' + cem + ' kg/m³)']);
      out.push(['Homokos kavics', fmt(Vr * 1.9, 2) + ' t']);
      out.push(['Keverővíz (kb.)', fmt(Vr * 180, 0) + ' l']);
      if (Vr > 2) warn.push('2 m³ fölött kézi keveréssel nehéz egyenletes minőséget tartani – fontold meg a kész betont.');
    } else {
      mats.push({ k: 'szarazbeton', q: Vr * 2200 });
      out.push(['Szárazbeton', fmt(Vr * 2200, 0) + ' kg (≈ 2 200 kg/m³)']);
    }
    if (v.alak === 'lemez' && v.halo) {
      const hA = nz(v.Lh) * nz(v.Ls) * 1.15;
      mats.push({ k: 'betonhalo', q: hA });
      out.push(['Háló (15% átfedéssel)', fmt(hA, 1) + ' m²']);
    }
    return { out, mats, warn };
  }
},
{
  id: 'esztrich', g: 'szerk', n: 'Esztrich, aljzat, önterülő', i: '▭',
  desc: 'Padlóaljzat: zsákos esztrich, cement + homok vagy önterülő kiegyenlítő.',
  fields: [
    ...areaFields('floor'),
    SEL('mod', 'Anyag', [['zsak', 'Zsákos esztrich'], ['ch', 'Cement + homok (1:4)'], ['ont', 'Önterülő aljzatkiegyenlítő']], 'zsak'),
    F('vast', 'Vastagság', 'cm', 5, { show: v => v.mod !== 'ont' }),
    F('vmm', 'Rétegvastagság', 'mm', 5, { show: v => v.mod === 'ont' }),
    F('fogy', 'Anyagszükséglet', 'kg/m²/mm', 1.6, { show: v => v.mod === 'ont', help: 'A zsákon szerepel, jellemzően 1,5–1,7' }),
    C('perem', 'Peremszigetelő szalag', true),
    RAH(5),
  ],
  compute(v) {
    const ar = areaOf(v, 'floor'); const A = ar.net; const k = 1 + nz(v.rah) / 100;
    const out = [['Terület', fmt(A, 2) + ' m²']], mats = [], warn = [];
    if (v.mod === 'ont') {
      const kg = A * nz(v.vmm) * nz(v.fogy) * k;
      mats.push({ k: 'onterulo', q: kg }); out.push(['Önterülő', fmt(kg, 0) + ' kg']);
      if (nz(v.vmm) > 30) warn.push('A legtöbb önterülő legfeljebb 10–30 mm-ig hordható fel egy rétegben – nézd meg a terméklapot.');
    } else {
      const V = A * nz(v.vast) / 100 * k;
      out.push(['Térfogat', fmt(V, 3) + ' m³']);
      if (v.mod === 'zsak') { const kg = A * nz(v.vast) * 20 * k; mats.push({ k: 'esztrich', q: kg }); out.push(['Esztrich', fmt(kg, 0) + ' kg (≈ 20 kg/m²/cm)']); }
      else { mats.push({ k: 'cement', q: V * 380 }); mats.push({ k: 'homok', q: V * 1.7 }); out.push(['Cement', fmt(V * 380, 0) + ' kg']); out.push(['Homok', fmt(V * 1.7, 2) + ' t']); }
      if (nz(v.vast) < 3.5) warn.push('Úsztatott esztrichnél 4,5–5 cm alatt repedésveszély van; tapadó esztrichnél min. kb. 2,5–3 cm.');
    }
    if (v.perem) { const p = ar.per != null ? ar.per : 4 * Math.sqrt(A); mats.push({ k: 'peremszalag', q: p * 1.05 }); out.push(['Peremszalag', fmt(p * 1.05, 1) + ' fm' + (ar.per == null ? ' (becsült kerület)' : '')]); }
    return { out, mats, warn };
  }
},
{
  id: 'falazas', g: 'szerk', n: 'Falazás', i: '🧱',
  desc: 'Falazóelem darabszám és habarcs / ragasztó a fal felületéből.',
  fields: [
    SEL('elem', 'Falazóelem', [
      ['tk12', 'Kisméretű tégla – 12 cm (fél tégla)'], ['tk25', 'Kisméretű tégla – 25 cm (egy tégla)'], ['tk38', 'Kisméretű tégla – 38 cm (másfél tégla)'],
      ['p10', 'Porotherm 10 N+F (válaszfal)'], ['p30', 'Porotherm 30 N+F'], ['p38', 'Porotherm 38 N+F'], ['p44', 'Porotherm 44 N+F'],
      ['y10', 'Pórusbeton 10 cm (válaszfal)'], ['y20', 'Pórusbeton 20 cm'], ['y30', 'Pórusbeton 30 cm'], ['y375', 'Pórusbeton 37,5 cm'],
      ['egy', 'Egyedi elem (méret megadásával)']], 'p30'),
    F('eh', 'Elem hossza', 'cm', 25, { show: v => v.elem === 'egy' }),
    F('em', 'Elem magassága', 'cm', 23.8, { show: v => v.elem === 'egy' }),
    F('fu', 'Fugavastagság', 'mm', 10, { show: v => v.elem === 'egy' }),
    F('hab', 'Habarcsszükséglet', 'l/m²', 20, { show: v => v.elem === 'egy', help: 'Gyártói adat; ragasztott elemnél írj 0-t' }),
    ...areaFields('wall'),
    RAH(5),
  ],
  compute(v) {
    const E = {
      tk12: ['tegla_kis', 52, 25, 'hab'], tk25: ['tegla_kis', 104, 60, 'hab'], tk38: ['tegla_kis', 156, 95, 'hab'],
      p10: ['poro10', 8, 7, 'hab'], p30: ['poro30', 16, 20, 'hab'], p38: ['poro38', 16, 25, 'hab'], p44: ['poro44', 16, 29, 'hab'],
      y10: ['ytong10', 8.4, 0.1, 'rag'], y20: ['ytong20', 8.4, 0.2, 'rag'], y30: ['ytong30', 8.4, 0.3, 'rag'], y375: ['ytong375', 8.4, 0.375, 'rag'],
    };
    const ar = areaOf(v, 'wall'); const A = ar.net; const k = 1 + nz(v.rah) / 100;
    let key, perM2, habL = 0, ragKg = 0;
    if (v.elem === 'egy') { key = 'falelem_egyedi'; perM2 = 1 / ((nz(v.eh) / 100 + nz(v.fu) / 1000) * (nz(v.em) / 100 + nz(v.fu) / 1000)); habL = nz(v.hab); }
    else { const e = E[v.elem]; key = e[0]; perM2 = e[1]; if (e[3] === 'hab') habL = e[2]; else ragKg = e[2] * 17; }
    const db = CEIL(A * perM2 * k);
    const out = [['Nettó falfelület', fmt(A, 2) + ' m²'], ['Elem / m²', fmt(perM2, 1) + ' db'], ['Falazóelem', fmt(db, 0) + ' db']];
    const mats = [{ k: key, q: db }];
    if (habL > 0) { const kg = A * habL * 1.5 * k; out.push(['Habarcs (friss)', fmt(A * habL * k, 0) + ' l']); out.push(['Falazóhabarcs (száraz)', fmt(kg, 0) + ' kg']); mats.push({ k: 'falazohabarcs', q: kg }); }
    if (ragKg > 0) { const kg = A * ragKg * k; out.push(['Falazóragasztó', fmt(kg, 0) + ' kg']); mats.push({ k: 'ytong_ragaszto', q: kg }); }
    return { out, mats, warn: ['A habarcs- és ragasztóigény átlagérték – a pontos adat a gyártó terméklapján van.'] };
  }
},
{
  id: 'zsaluko', g: 'szerk', n: 'Zsalukő fal', i: '🔲',
  desc: 'Zsalukő darabszám és kitöltő beton.',
  fields: [
    SEL('tip', 'Zsalukő szélessége', [['15', '15 cm'], ['20', '20 cm'], ['25', '25 cm'], ['30', '30 cm']], '30'),
    ...areaFields('wall'),
    RAH(5),
    SEL('mod', 'Kitöltő beton', [['kesz', 'Kész beton'], ['kevert', 'Helyben kevert (C16)'], ['zsak', 'Zsákos szárazbeton']], 'kesz'),
  ],
  compute(v) {
    const bet = { 15: 0.08, 20: 0.11, 25: 0.14, 30: 0.17 }[v.tip] || 0.17;
    const ar = areaOf(v, 'wall'); const A = ar.net; const k = 1 + nz(v.rah) / 100;
    const db = CEIL(A * 10 * k); const V = A * bet * k;
    const out = [['Falfelület', fmt(A, 2) + ' m²'], ['Zsalukő (10 db/m²)', fmt(db, 0) + ' db'], ['Kitöltő beton', fmt(V, 3) + ' m³']];
    const mats = [{ k: 'zsaluko' + v.tip, q: db }];
    if (v.mod === 'kesz') mats.push({ k: 'kesz_beton', q: Math.ceil(V * 4) / 4 });
    else if (v.mod === 'kevert') { mats.push({ k: 'cement', q: V * 300 }); mats.push({ k: 'soder', q: V * 1.9 }); out.push(['Cement / sóder', fmt(V * 300, 0) + ' kg / ' + fmt(V * 1.9, 2) + ' t']); }
    else { mats.push({ k: 'szarazbeton', q: V * 2200 }); out.push(['Szárazbeton', fmt(V * 2200, 0) + ' kg']); }
    return { out, mats, warn: ['A betonigény 50×20 cm-es elemmel számolt átlag; a gyártói adat ettől eltérhet. A vasalást külön számold.'] };
  }
},

/* ===== FELÜLETEK ===== */
{
  id: 'vakolas', g: 'felulet', n: 'Vakolás', i: '🪣',
  desc: 'Alapvakolat mennyisége a falfelület és a vastagság alapján.',
  fields: [
    ...areaFields('wall'),
    F('vast', 'Vakolatvastagság', 'cm', 1.5),
    F('fogy', 'Anyagszükséglet', 'kg/m²/cm', 13, { help: 'Gépi alapvakolat jellemzően 12–14' }),
    C('alap', 'Mélyalapozó előtte', false),
    RAH(5),
  ],
  compute(v) {
    const A = areaOf(v, 'wall').net; const k = 1 + nz(v.rah) / 100;
    const kg = A * nz(v.vast) * nz(v.fogy) * k;
    const out = [['Felület', fmt(A, 2) + ' m²'], ['Vakolat', fmt(kg, 0) + ' kg']]; const mats = [{ k: 'vakolat', q: kg }];
    if (v.alap) { const l = A / 8 * k; mats.push({ k: 'mely_alapozo', q: l }); out.push(['Mélyalapozó (8 m²/l)', fmt(l, 1) + ' l']); }
    return { out, mats, warn: [] };
  }
},
{
  id: 'festes', g: 'felulet', n: 'Glettelés, festés', i: '🖌️',
  desc: 'Helyiség falai (+mennyezet): glett, alapozó és festék.',
  fields: [
    ...areaFields('room'),
    C('gl', 'Glettelés', true),
    F('glmm', 'Glett összvastagság', 'mm', 1.5, { show: v => v.gl, help: 'Két vékony réteg együtt kb. 1–2 mm' }),
    C('alap', 'Mélyalapozó', true),
    F('alapk', 'Alapozó kiadóssága', 'm²/l', 8, { show: v => v.alap }),
    C('fest', 'Festés', true),
    F('ret', 'Festékrétegek száma', 'réteg', 2, { show: v => v.fest }),
    F('kiad', 'Festék kiadóssága', 'm²/l/réteg', 8, { show: v => v.fest, help: 'A vödrön szerepel, jellemzően 6–10' }),
    RAH(5),
  ],
  compute(v) {
    const ar = areaOf(v, 'room'); const A = ar.net; const k = 1 + nz(v.rah) / 100;
    const out = [['Festendő felület', fmt(A, 2) + ' m²' + (ar.ceil ? ' (ebből mennyezet ' + fmt(ar.ceil, 1) + ')' : '')]], mats = [];
    if (v.gl) { const kg = A * nz(v.glmm) * 1.0 * k; mats.push({ k: 'glett', q: kg }); out.push(['Glett (≈1 kg/m²/mm)', fmt(kg, 0) + ' kg']); }
    if (v.alap) { const l = A / nz(v.alapk || 8) * k; mats.push({ k: 'mely_alapozo', q: l }); out.push(['Mélyalapozó', fmt(l, 1) + ' l']); }
    if (v.fest) { const l = A * nz(v.ret) / nz(v.kiad || 8) * k; mats.push({ k: 'festek', q: l }); out.push(['Festék', fmt(l, 1) + ' l']); }
    return { out, mats, warn: [] };
  }
},
{
  id: 'gipszkarton', g: 'felulet', n: 'Gipszkarton', i: '📋',
  desc: 'Válaszfal, előtétfal vagy álmennyezet: lapok, profilok, csavar, hézagoló.',
  fields: [
    SEL('tip', 'Szerkezet', [['vf', 'Válaszfal (két oldal)'], ['et', 'Előtétfal / falburkolat (egy oldal)'], ['am', 'Álmennyezet']], 'vf'),
    F('L', 'Fal hossza', 'm', 4, { show: v => v.tip !== 'am' }),
    F('Hm', 'Fal magassága', 'm', 2.7, { show: v => v.tip !== 'am' }),
    F('ny', 'Nyílások (ajtó)', 'm²', 1.9, { show: v => v.tip !== 'am' }),
    F('Lh', 'Helyiség hossza', 'm', 4, { show: v => v.tip === 'am' }),
    F('Ls', 'Helyiség szélessége', 'm', 3, { show: v => v.tip === 'am' }),
    SEL('ret', 'Lapréteg oldalanként', [['1', '1 réteg'], ['2', '2 réteg']], '1'),
    SEL('lap', 'Lapméret', [['2.0', '120 × 200 cm (2,4 m²)'], ['2.6', '120 × 260 cm (3,12 m²)'], ['2.75', '120 × 275 cm (3,3 m²)'], ['3.0', '120 × 300 cm (3,6 m²)']], '2.6'),
    SEL('pl', 'Profil szálhossz', [['2.6', '2,6 m'], ['2.75', '2,75 m'], ['3', '3 m'], ['4', '4 m']], '3'),
    F('koz', 'Profilkiosztás', 'cm', 60, { help: 'Fal: CW 60 cm (csempézendőnél 40). Mennyezet: CD 40–50 cm' }),
    C('gyapot', 'Hangszigetelő gyapot', true, { show: v => v.tip !== 'am' }),
    RAH(10),
  ],
  compute(v) {
    const k = 1 + nz(v.rah) / 100; const pl = Number(v.pl) || 3; const lapA = 1.2 * (Number(v.lap) || 2.6); const ret = Number(v.ret) || 1;
    const out = [], mats = [], warn = [];
    if (v.tip === 'am') {
      const A = nz(v.Lh) * nz(v.Ls); const per = 2 * (nz(v.Lh) + nz(v.Ls)); const koz = nz(v.koz) / 100 || 0.5;
      const lapok = CEIL(A * ret * k / lapA);
      const cdSorok = CEIL(nz(v.Ls) / koz) + 1; const cdFm = cdSorok * nz(v.Lh);
      const cd = CEIL(cdFm * 1.05 / pl); const ud = CEIL(per * 1.05 / pl);
      const fugg = CEIL(cdSorok * (CEIL(nz(v.Lh) / 0.9) + 1));
      out.push(['Mennyezet', fmt(A, 2) + ' m²'], ['Gipszkarton lap', lapok + ' tábla'], ['CD profil', cd + ' szál (' + fmt(cdFm, 1) + ' fm)'], ['UD profil', ud + ' szál'], ['Függesztő (90 cm-enként)', fugg + ' db']);
      mats.push({ k: 'gk_lap', q: lapok }, { k: 'cd_profil', q: cd }, { k: 'ud_profil', q: ud }, { k: 'fuggeszto', q: fugg });
      mats.push({ k: 'gk_csavar', q: A * ret * 20 * k }, { k: 'gk_hezag', q: A * 0.4 * k }, { k: 'bandazs', q: A * 1.5 * k });
      out.push(['Csavar', fmt(A * ret * 20 * k, 0) + ' db'], ['Hézagoló', fmt(A * 0.4 * k, 1) + ' kg']);
      if (koz > 0.5) warn.push('CD profilt 50 cm-nél ritkábban ne rakj.');
    } else {
      const old = v.tip === 'vf' ? 2 : 1; const L = nz(v.L), Hm = nz(v.Hm); const A = Math.max(0, L * Hm - nz(v.ny)); const koz = nz(v.koz) / 100 || 0.6;
      const lapok = CEIL(A * old * ret * k / lapA);
      const cwDb = CEIL(L / koz) + 1; const cwSzal = cwDb * CEIL(Hm / pl);
      const uw = CEIL(2 * L * 1.05 / pl);
      out.push(['Falfelület (egy oldal)', fmt(A, 2) + ' m²'], ['Gipszkarton lap', lapok + ' tábla'], ['CW profil', cwSzal + ' szál (' + cwDb + ' állás)'], ['UW profil', uw + ' szál']);
      mats.push({ k: 'gk_lap', q: lapok }, { k: 'cw_profil', q: cwSzal }, { k: 'uw_profil', q: uw });
      const cs = A * old * ret * 25 * k; mats.push({ k: 'gk_csavar', q: cs }, { k: 'gk_hezag', q: A * old * 0.4 * k }, { k: 'bandazs', q: A * old * 1.5 * k });
      out.push(['Csavar', fmt(cs, 0) + ' db'], ['Hézagoló', fmt(A * old * 0.4 * k, 1) + ' kg']);
      if (v.gyapot && v.tip === 'vf') { mats.push({ k: 'gk_gyapot', q: A * 1.05 }); out.push(['Gyapot', fmt(A * 1.05, 1) + ' m²']); }
      if (Hm > pl) warn.push('A falmagasság nagyobb a profil szálhosszánál – a CW profilokat toldani kell (toldáskor min. 50 cm átfedés).');
      if (nz(v.ny) > 0) warn.push('Ajtónyílásnál 2 db UA (merevített) profil kell a tok mellé – ezt külön vedd fel.');
    }
    return { out, mats, warn };
  }
},
{
  id: 'burkolas', g: 'felulet', n: 'Burkolás (csempe, járólap)', i: '🔳',
  desc: 'Lapmennyiség ráhagyással, ragasztó, fuga, lábazat és kenhető szigetelés.',
  fields: [
    SEL('hol', 'Hova', [['padlo', 'Padló'], ['fal', 'Fal (csempe)'], ['m2', 'Kész terület (m²)']], 'padlo'),
    F('Lh', 'Helyiség hossza', 'm', 3, { show: v => v.hol !== 'm2' }),
    F('Ls', 'Helyiség szélessége', 'm', 2, { show: v => v.hol !== 'm2' }),
    F('Hm', 'Csempézés magassága', 'm', 2.1, { show: v => v.hol === 'fal' }),
    F('ny', 'Nyílások levonása', 'm²', 1.9, { show: v => v.hol === 'fal' }),
    F('A', 'Terület', 'm²', 10, { show: v => v.hol === 'm2' }),
    F('la', 'Lap hossza', 'cm', 60),
    F('lb', 'Lap szélessége', 'cm', 60),
    F('lv', 'Lap vastagsága', 'mm', 9),
    SEL('fekt', 'Fektetés', [['egyenes', 'Egyenes (≈7%)'], ['kotes', 'Kötésben, nagylap (≈10%)'], ['atlos', 'Átlós / halszálkás (≈15%)']], 'egyenes'),
    F('rah', 'Ráhagyás (felülírható)', '%', '', { help: 'Üresen hagyva a fektetés szerinti értékkel számol' }),
    F('doboz', 'Doboz tartalma', 'm²', 1.44, { help: 'A dobozon szerepel; 0 = nem számol dobozt' }),
    F('fsz', 'Fugaszélesség', 'mm', 3),
    F('rag', 'Ragasztó', 'kg/m²', 4, { help: '8 mm fogazás ≈ 3–4, nagylap / kültér 5–7' }),
    C('lab', 'Lábazat (padlónál)', true, { show: v => v.hol === 'padlo' }),
    F('ajto', 'Ajtók szélessége összesen (lábazatból levonva)', 'm', 0.9, { show: v => v.hol === 'padlo' && v.lab }),
    C('szig', 'Kenhető vízszigetelés (vizes helyiség)', false),
    F('szkg', 'Szigetelés anyagigény (2 réteg)', 'kg/m²', 2, { show: v => v.szig }),
  ],
  compute(v) {
    let A, per = null;
    if (v.hol === 'padlo') { A = nz(v.Lh) * nz(v.Ls); per = 2 * (nz(v.Lh) + nz(v.Ls)); }
    else if (v.hol === 'fal') { per = 2 * (nz(v.Lh) + nz(v.Ls)); A = Math.max(0, per * nz(v.Hm) - nz(v.ny)); }
    else A = nz(v.A);
    const defR = { egyenes: 7, kotes: 10, atlos: 15 }[v.fekt] || 10;
    const r = (v.rah === '' || v.rah === null || v.rah === undefined || isNaN(v.rah)) ? defR : Number(v.rah);
    const lapM2 = nz(v.la) / 100 * nz(v.lb) / 100;
    const Ar = A * (1 + r / 100);
    const lapDb = lapM2 > 0 ? CEIL(Ar / lapM2) : 0;
    const out = [['Burkolandó felület', fmt(A, 2) + ' m²'], ['Ráhagyással (' + fmt(r, 0) + '%)', fmt(Ar, 2) + ' m²'], ['Lapok', fmt(lapDb, 0) + ' db']];
    let rendel = Ar;
    if (nz(v.doboz) > 0) { const dob = CEIL(Ar / nz(v.doboz)); rendel = dob * nz(v.doboz); out.push(['Dobozok', dob + ' doboz = ' + fmt(rendel, 2) + ' m²']); }
    const mats = [{ k: 'burkolat', q: rendel }];
    const ragKg = A * nz(v.rag) * 1.05; mats.push({ k: 'burk_ragaszto', q: ragKg }); out.push(['Ragasztó', fmt(ragKg, 0) + ' kg']);
    const a = nz(v.la) * 10, b = nz(v.lb) * 10;
    const fugaKgM2 = a > 0 && b > 0 ? (a + b) / (a * b) * nz(v.fsz) * nz(v.lv) * 1.6 : 0;
    const fkg = fugaKgM2 * A * 1.1; mats.push({ k: 'fugazo', q: fkg }); out.push(['Fugázó', fmt(fkg, 1) + ' kg (' + fmt(fugaKgM2, 2) + ' kg/m²)']);
    if (v.hol === 'padlo' && v.lab) { const fm = Math.max(0, per - nz(v.ajto)) * 1.05; mats.push({ k: 'labazat', q: fm }); out.push(['Lábazat', fmt(fm, 1) + ' fm']); }
    if (v.szig) {
      const kg = A * nz(v.szkg) * 1.05; mats.push({ k: 'kenheto_szig', q: kg }); out.push(['Kenhető szigetelés', fmt(kg, 1) + ' kg']);
      if (per) { const fm = per * 1.1; mats.push({ k: 'hajlat_szalag', q: fm }); out.push(['Hajlaterősítő szalag', fmt(fm, 1) + ' fm']); }
    }
    return { out, mats, warn: [] };
  }
},
{
  id: 'vizszig', g: 'felulet', n: 'Vízszigetelés (lábazat, alap, terasz)', i: '💧',
  desc: 'Bitumenes lemez vagy kenhető szigetelés felületre.',
  fields: [
    ...areaFields('wall'),
    SEL('tip', 'Rendszer', [['lemez', 'Bitumenes lemez (1 réteg)'], ['lemez2', 'Bitumenes lemez (2 réteg)'], ['ken', 'Kenhető szigetelés']], 'lemez'),
    F('kg', 'Kenhető anyagigény (összes réteg)', 'kg/m²', 3, { show: v => v.tip === 'ken' }),
    C('alap', 'Bitumenes alapozó (lemeznél)', true, { show: v => v.tip !== 'ken' }),
  ],
  compute(v) {
    const A = areaOf(v, 'wall').net; const out = [['Felület', fmt(A, 2) + ' m²']], mats = [];
    if (v.tip === 'ken') { const kg = A * nz(v.kg) * 1.05; mats.push({ k: 'kenheto_szig', q: kg }); out.push(['Kenhető szigetelés', fmt(kg, 1) + ' kg']); }
    else {
      const ret = v.tip === 'lemez2' ? 2 : 1; const m2 = A * ret * 1.15; mats.push({ k: 'bitumen_lemez', q: m2 }); out.push(['Lemez (15% átfedéssel)', fmt(m2, 1) + ' m²']);
      if (v.alap) { const l = A * 0.3; mats.push({ k: 'bitumen_alap', q: l }); out.push(['Alapozó (0,3 l/m²)', fmt(l, 1) + ' l']); }
    }
    return { out, mats, warn: [] };
  }
},

/* ===== SZIGETELÉS ===== */
{
  id: 'homlokzat', g: 'szig', n: 'Homlokzati hőszigetelés (dryvit)', i: '🏢',
  desc: 'Teljes rendszer: hőszigetelő lap, ragasztó, dübel, háló, alapozó, színvakolat, profilok.',
  fields: [
    ...areaFields('wall'),
    SEL('any', 'Hőszigetelő anyag', [['eps_feher', 'EPS 80 (fehér)'], ['eps_grafit', 'Grafitos EPS'], ['kozetgyapot_h', 'Kőzetgyapot'], ['xps', 'XPS (lábazat)']], 'eps_grafit'),
    F('vast', 'Vastagság', 'cm', 15),
    F('dub', 'Dübel', 'db/m²', 6, { help: 'EPS 4–6, kőzetgyapot 6–8, széles felületen szélzónában több' }),
    SEL('vak', 'Színvakolat szemcse', [['1.5', '1,5 mm kapart (≈2,5 kg/m²)'], ['2', '2 mm kapart (≈3 kg/m²)'], ['0', 'Nem kell színvakolat']], '1.5'),
    F('lab', 'Lábazati indítóprofil hossza', 'fm', 0, { help: 'Általában a homlokzat kerülete, mínusz ajtók' }),
    F('elv', 'Élvédő (sarkok + nyíláskeretek)', 'fm', 0),
    RAH(5),
  ],
  compute(v) {
    const A = areaOf(v, 'wall').net; const k = 1 + nz(v.rah) / 100;
    const V = A * nz(v.vast) / 100 * k;
    const tabla = CEIL(A * k / 0.5);
    const rag = A * 5 * 1.0, beagy = A * 4.5;
    const mats = [{ k: v.any, q: V }, { k: 'hoszig_ragaszto', q: (rag + beagy) * 1.05 }, { k: 'dubel', q: CEIL(A * nz(v.dub) * 1.05) }, { k: 'uvegszovet', q: A * 1.15 }];
    const out = [['Szigetelendő felület', fmt(A, 2) + ' m²'], ['Hőszigetelő anyag', fmt(V, 2) + ' m³ ≈ ' + tabla + ' tábla (100×50 cm)'],
      ['Ragasztó (ragasztás 5 + beágyazás 4,5 kg/m²)', fmt((rag + beagy) * 1.05, 0) + ' kg'], ['Dübel', CEIL(A * nz(v.dub) * 1.05) + ' db'], ['Üvegszövet háló', fmt(A * 1.15, 1) + ' m²']];
    if (v.vak !== '0') {
      const kgm = v.vak === '2' ? 3 : 2.5; mats.push({ k: 'vakolat_alapozo', q: A * 0.25 * 1.05 }, { k: 'szinvakolat', q: A * kgm * 1.05 });
      out.push(['Vakolatalapozó', fmt(A * 0.25 * 1.05, 1) + ' kg'], ['Színvakolat', fmt(A * kgm * 1.05, 0) + ' kg']);
    }
    if (nz(v.lab) > 0) { const sz = CEIL(nz(v.lab) * 1.05 / 2.5); mats.push({ k: 'labazati_profil', q: sz }); out.push(['Lábazati profil', sz + ' szál']); }
    if (nz(v.elv) > 0) { const sz = CEIL(nz(v.elv) * 1.05 / 2.5); mats.push({ k: 'elvedo', q: sz }); out.push(['Élvédő', sz + ' szál']); }
    const dl = nz(v.vast) + 5; out.push(['Javasolt dübelhossz', '≈ ' + dl + '–' + (dl + 4) + ' cm']);
    return { out, mats, warn: ['A kávák (ablakbélletek) 2–3 cm-es szigetelését és a lábazati XPS-t külön számold, ha kell.'] };
  }
},
{
  id: 'fodem', g: 'szig', n: 'Födém, padlás, tető hőszigetelés', i: '🧶',
  desc: 'Üveggyapot, kőzetgyapot vagy EPS köbméterben, párazáró fóliával.',
  fields: [
    ...areaFields('floor'),
    SEL('any', 'Anyag', [['uveggyapot', 'Üveggyapot'], ['kozetgyapot_f', 'Kőzetgyapot'], ['eps_padlo', 'EPS 100 (padló/födém)']], 'uveggyapot'),
    F('vast', 'Vastagság (összesen)', 'cm', 25, { help: 'Padlásfödémre ma 25–30 cm ajánlott' }),
    F('csm', 'Egy csomag tartalma', 'm²', 0, { help: 'Ha megadod, kiírja a csomagszámot (az adott vastagságnál)' }),
    C('fol', 'Párazáró fólia', true),
    RAH(5),
  ],
  compute(v) {
    const A = areaOf(v, 'floor').net; const k = 1 + nz(v.rah) / 100; const V = A * nz(v.vast) / 100 * k;
    const out = [['Terület', fmt(A, 2) + ' m²'], ['Szigetelőanyag', fmt(V, 2) + ' m³']]; const mats = [{ k: v.any, q: V }];
    if (nz(v.csm) > 0) out.push(['Csomag', CEIL(A * k / nz(v.csm)) + ' csomag']);
    if (v.fol) { mats.push({ k: 'parazaro', q: A * 1.15 }); out.push(['Párazáró fólia (15% átfedés)', fmt(A * 1.15, 1) + ' m²']); }
    return { out, mats, warn: [] };
  }
},

/* ===== TETŐ ===== */
{
  id: 'teto', g: 'teto', n: 'Tetőfedés', i: '🏠',
  desc: 'Tetőfelület hajlásszögből, cserép, gerinccserép, léc, ellenléc, fólia.',
  fields: [
    SEL('am', 'Felület megadása', [['alap', 'Alapterület (vetület) + hajlásszög'], ['m2', 'Tényleges tetőfelület (m²)']], 'alap'),
    F('Av', 'Tető vízszintes vetülete (ereszekkel)', 'm²', 120, { show: v => v.am === 'alap' }),
    F('fok', 'Hajlásszög', '°', 35, { show: v => v.am === 'alap' }),
    F('A', 'Tetőfelület', 'm²', 150, { show: v => v.am === 'm2' }),
    F('cdb', 'Cserép / m²', 'db', 10, { help: 'Gyártói adat: hornyolt nagyelem ≈ 10, hódfarkú ≈ 35–38' }),
    F('ger', 'Gerinc + élgerinc hossza', 'fm', 10),
    F('gdb', 'Gerinccserép / fm', 'db', 2.5),
    F('lo', 'Lécosztás', 'cm', 33, { help: 'A cseréptől függ, jellemzően 31–34 cm' }),
    F('sz', 'Szarufák távolsága (ellenléc)', 'cm', 90),
    C('fol', 'Páraáteresztő tetőfólia', true),
    RAH(5),
  ],
  compute(v) {
    const A = v.am === 'm2' ? nz(v.A) : nz(v.Av) / Math.cos(nz(v.fok) * Math.PI / 180);
    const k = 1 + nz(v.rah) / 100;
    const cs = CEIL(A * nz(v.cdb) * k); const gc = CEIL(nz(v.ger) * nz(v.gdb));
    const lec = nz(v.lo) > 0 ? A / (nz(v.lo) / 100) * 1.1 : 0; const ell = nz(v.sz) > 0 ? A / (nz(v.sz) / 100) * 1.1 : 0;
    const out = [['Tetőfelület', fmt(A, 1) + ' m²'], ['Cserép', cs + ' db'], ['Gerinccserép', gc + ' db'], ['Tetőléc', fmt(lec, 0) + ' fm'], ['Ellenléc', fmt(ell, 0) + ' fm']];
    const mats = [{ k: 'cserep', q: cs }, { k: 'gerinccserep', q: gc }, { k: 'tetolec', q: lec }, { k: 'ellenlec', q: ell }];
    if (v.fol) { mats.push({ k: 'tetofolia', q: A * 1.12 }); out.push(['Tetőfólia (12% átfedés)', fmt(A * 1.12, 0) + ' m²']); }
    const warn = ['Szegélycserép, szellőzőcserép, hófogó, gerincszellőző szalag és kúpcserép-lezáró a rendszertől függ – a gyártói kalkulátorral érdemes pontosítani.'];
    if (v.am === 'alap' && (nz(v.fok) < 15 || nz(v.fok) > 70)) warn.unshift('Szokatlan hajlásszög – ellenőrizd a cserép minimális hajlásszögét.');
    return { out, mats, warn };
  }
},
{
  id: 'eresz', g: 'teto', n: 'Ereszcsatorna', i: '🌧️',
  desc: 'Csatorna, tartók, lefolyók és idomok.',
  fields: [
    F('L', 'Eresz hossza összesen', 'fm', 30),
    F('tkoz', 'Tartók távolsága', 'cm', 60),
    F('lef', 'Lefolyók száma', 'db', 2, { help: 'Ökölszabály: kb. 10–12 m ereszenként egy' }),
    F('lefh', 'Egy lefolyó hossza', 'm', 5),
    F('veg', 'Végelzárók', 'db', 4),
    F('sar', 'Sarokidomok (külső+belső)', 'db', 0),
  ],
  compute(v) {
    const L = nz(v.L); const tk = nz(v.tkoz) / 100 || 0.6;
    const tarto = CEIL(L / tk) + 1; const lefFm = nz(v.lef) * nz(v.lefh); const bil = CEIL(nz(v.lef) * (CEIL(nz(v.lefh) / 2) + 1));
    const out = [['Csatorna', fmt(L * 1.05, 1) + ' fm'], ['Csatornatartó', tarto + ' db'], ['Lefolyócső', fmt(lefFm * 1.05, 1) + ' fm'], ['Lefolyóbilincs (2 m-enként)', bil + ' db'], ['Lefolyóidom (üst)', fmt(nz(v.lef), 0) + ' db'], ['Könyök (lefolyónként 3)', fmt(nz(v.lef) * 3, 0) + ' db']];
    const mats = [{ k: 'csatorna', q: L * 1.05 }, { k: 'csatorna_tarto', q: tarto }, { k: 'lefolyo', q: lefFm * 1.05 }, { k: 'lefolyo_bilincs', q: bil }, { k: 'csatorna_lefolyoidom', q: nz(v.lef) }, { k: 'lefolyo_konyok', q: nz(v.lef) * 3 }, { k: 'csatorna_veg', q: nz(v.veg) }];
    if (nz(v.sar) > 0) mats.push({ k: 'csatorna_sarok', q: nz(v.sar) });
    if (L / Math.max(1, nz(v.lef)) > 12) return { out, mats, warn: ['Egy lefolyóra 12 m-nél több eresz jut – érdemes több lefolyóval számolni.'] };
    return { out, mats, warn: [] };
  }
},

/* ===== KERT ===== */
{
  id: 'terko', g: 'kert', n: 'Térkövezés', i: '🟫',
  desc: 'Térkő, zúzottkő alap, ágyazat, szegélykő, fugahomok, geotextil.',
  fields: [
    ...areaFields('floor'),
    F('alap', 'Zúzottkő alap vastagsága', 'cm', 15, { help: 'Gyalogos 10–15, személyautó 20–25, tehergépjármű 30+' }),
    F('agy', 'Ágyazat (0/4) vastagsága', 'cm', 4),
    F('szeg', 'Szegélykő hossza', 'fm', 0, { help: 'Ha 0 és hossz × szélességet adtál, a kerületet veszi' }),
    C('szegB', 'Szegélykő betonágyba (≈0,03 m³/fm, zsákos)', true),
    C('geo', 'Geotextília az alap alá', true),
    RAH(5),
  ],
  compute(v) {
    const ar = areaOf(v, 'floor'); const A = ar.net; const k = 1 + nz(v.rah) / 100;
    const alapT = A * nz(v.alap) / 100 * 1.25 * 1.6; const agyT = A * nz(v.agy) / 100 * 1.2 * 1.6;
    const szeg = nz(v.szeg) > 0 ? nz(v.szeg) : (ar.per || 0);
    const out = [['Terület', fmt(A, 2) + ' m²'], ['Térkő', fmt(A * k, 2) + ' m²'], ['Zúzottkő alap (tömörítéssel)', fmt(alapT, 2) + ' t'], ['Kőzúzalék ágyazat', fmt(agyT, 2) + ' t'], ['Fugahomok (≈4 kg/m²)', fmt(A * 4, 0) + ' kg']];
    const mats = [{ k: 'terko', q: A * k }, { k: 'zuzottko', q: alapT }, { k: 'kozuzalek', q: agyT }, { k: 'fugahomok', q: A * 4 }];
    if (szeg > 0) { const db = CEIL(szeg * 1.03); mats.push({ k: 'szegelyko', q: db }); out.push(['Szegélykő (1 m)', db + ' db']); if (v.szegB) { mats.push({ k: 'szarazbeton', q: szeg * 0.03 * 2200 }); out.push(['Szárazbeton a szegélyhez', fmt(szeg * 0.03 * 2200, 0) + ' kg']); } }
    if (v.geo) { mats.push({ k: 'geotextil', q: A * 1.15 }); out.push(['Geotextília', fmt(A * 1.15, 1) + ' m²']); }
    return { out, mats, warn: ['Tömegek: kb. 1,6 t/m³ laza térfogatsúllyal és 20–25% tömörítési ráhagyással.'] };
  }
},
{
  id: 'omlesztett', g: 'kert', n: 'Ömlesztett anyag (murva, sóder, föld)', i: '⛰️',
  desc: 'Térfogat és tonna terület × rétegvastagság alapján.',
  fields: [
    SEL('any', 'Anyag', [['murva', 'Murva / díszkavics (≈1,5 t/m³)'], ['zuzottko', 'Zúzottkő (≈1,6 t/m³)'], ['kozuzalek', 'Kőzúzalék 0/4 (≈1,6 t/m³)'], ['soder', 'Homokos kavics (≈1,8 t/m³)'], ['homok', 'Homok (≈1,5 t/m³)'], ['termofold', 'Termőföld (≈1,3 t/m³)']], 'murva'),
    ...areaFields('floor'),
    F('vast', 'Rétegvastagság', 'cm', 5),
    F('tom', 'Tömörítési / ülepedési ráhagyás', '%', 10, { help: 'Díszkavics 0–5, tömörített alap 20–25, föld 15–20' }),
    C('geo', 'Geotextília alá', true),
  ],
  compute(v) {
    const ro = { murva: 1.5, zuzottko: 1.6, kozuzalek: 1.6, soder: 1.8, homok: 1.5, termofold: 1.3 }[v.any] || 1.6;
    const A = areaOf(v, 'floor').net; const V = A * nz(v.vast) / 100 * (1 + nz(v.tom) / 100); const t = V * ro;
    const out = [['Terület', fmt(A, 2) + ' m²'], ['Térfogat', fmt(V, 2) + ' m³'], ['Tömeg', fmt(t, 2) + ' t']]; const mats = [{ k: v.any, q: t }];
    if (v.geo) { mats.push({ k: 'geotextil', q: A * 1.15 }); out.push(['Geotextília (15% átfedés)', fmt(A * 1.15, 1) + ' m²']); }
    return { out, mats, warn: [] };
  }
},
{
  id: 'kerites', g: 'kert', n: 'Kerítés', i: '🚧',
  desc: 'Oszlopok, oszlopalap, drótfonat vagy panel.',
  fields: [
    F('L', 'Kerítés hossza', 'm', 30),
    SEL('tip', 'Típus', [['drot', 'Drótfonat + feszítőhuzal'], ['panel', 'Táblás kerítéspanel']], 'drot'),
    F('koz', 'Oszlopköz / panelszélesség', 'm', 2.5),
    F('sar', 'Sarkok, végek, kapuoszlopok (plusz)', 'db', 2),
    F('sor', 'Feszítőhuzal sorok', 'sor', 3, { show: v => v.tip === 'drot' }),
    F('la', 'Oszlopgödör oldala', 'cm', 30),
    F('lm', 'Oszlopgödör mélysége', 'cm', 80),
    SEL('mod', 'Oszlopalap beton', [['zsak', 'Zsákos szárazbeton'], ['kevert', 'Helyben kevert (C16)'], ['kesz', 'Kész beton']], 'zsak'),
  ],
  compute(v) {
    const L = nz(v.L), koz = nz(v.koz) || 2.5;
    const mezo = CEIL(L / koz); const oszl = mezo + 1 + nz(v.sar);
    const Vo = nz(v.la) / 100 * nz(v.la) / 100 * nz(v.lm) / 100; const V = Vo * oszl * 1.05;
    const out = [['Mezők', mezo + ' db'], ['Oszlop', oszl + ' db'], ['Oszlopalap beton', fmt(V, 3) + ' m³ (' + fmt(Vo * 1000, 0) + ' l/oszlop)']];
    const mats = [{ k: 'ker_oszlop', q: oszl }];
    if (v.tip === 'drot') { mats.push({ k: 'drothalo', q: L * 1.03 }, { k: 'fesziduzal', q: L * nz(v.sor) * 1.1 }); out.push(['Drótfonat', fmt(L * 1.03, 1) + ' fm'], ['Feszítőhuzal', fmt(L * nz(v.sor) * 1.1, 0) + ' fm']); }
    else { mats.push({ k: 'ker_panel', q: mezo }); out.push(['Panel', mezo + ' db']); }
    if (v.mod === 'zsak') { mats.push({ k: 'szarazbeton', q: V * 2200 }); out.push(['Szárazbeton', fmt(V * 2200, 0) + ' kg']); }
    else if (v.mod === 'kevert') { mats.push({ k: 'cement', q: V * 300 }, { k: 'soder', q: V * 1.9 }); out.push(['Cement / sóder', fmt(V * 300, 0) + ' kg / ' + fmt(V * 1.9, 2) + ' t']); }
    else mats.push({ k: 'kesz_beton', q: Math.ceil(V * 4) / 4 });
    return { out, mats, warn: ['Oszlopot fagyhatár alá (≈ 80 cm) érdemes betonozni.'] };
  }
},

/* ===== FA ===== */
{
  id: 'deszka', g: 'fa', n: 'Deszkaburkolat (fal, mennyezet)', i: '🪵',
  desc: 'Vízszintes vagy függőleges deszkák lécvázon, árnyékfugával – fm, szál, léc, csavar, felületkezelés.',
  fields: [
    F('L', 'Felület szélessége', 'm', 3.5),
    F('Hm', 'Felület magassága', 'm', 2.6),
    F('ny', 'Kihagyott felület (ablak, ajtó)', 'm²', 0),
    SEL('ir', 'Deszkák iránya', [['viz', 'Vízszintes'], ['fugg', 'Függőleges']], 'viz'),
    F('dsz', 'Deszka fedőszélessége', 'cm', 12),
    F('fuga', 'Árnyékfuga', 'mm', 8),
    F('dh', 'Deszka szálhossza', 'm', 4),
    F('lk', 'Lécváz kiosztása', 'cm', 50),
    SEL('rog', 'Rögzítés', [['2', '2 csavar / kereszteződés'], ['1', '1 csavar / kereszteződés (rejtett)']], '2'),
    C('kez', 'Felületkezelés', true),
    F('ret', 'Rétegek', 'réteg', 2, { show: v => v.kez }),
    F('kiad', 'Kiadósság', 'm²/l/réteg', 12, { show: v => v.kez }),
    RAH(10),
  ],
  compute(v) {
    const L = nz(v.L), Hm = nz(v.Hm); const A = Math.max(0, L * Hm - nz(v.ny)); const k = 1 + nz(v.rah) / 100;
    const osztas = nz(v.dsz) / 100 + nz(v.fuga) / 1000;
    const viz = v.ir === 'viz'; const span = viz ? Hm : L, run = viz ? L : Hm;
    const sorok = osztas > 0 ? CEIL(span / osztas) : 0;
    const fm = sorok * run * (A / Math.max(0.0001, L * Hm)) * k;
    const szal = nz(v.dh) > 0 ? CEIL(fm / nz(v.dh)) : 0;
    const lecDb = CEIL(run / (nz(v.lk) / 100 || 0.5)) + 1; const lecFm = lecDb * span * 1.05;
    const csav = CEIL(sorok * lecDb * Number(v.rog || 2) * 1.05);
    const out = [['Burkolt felület', fmt(A, 2) + ' m²'], ['Deszkasorok', sorok + ' sor'], ['Deszka', fmt(fm, 1) + ' fm ≈ ' + szal + ' szál (' + fmt(nz(v.dh), 1) + ' m)'], ['Lécváz', lecDb + ' léc, ' + fmt(lecFm, 1) + ' fm'], ['Csavar', csav + ' db']];
    const mats = [{ k: 'burkolo_deszka', q: fm }, { k: 'alatet_lec', q: lecFm }, { k: 'facsavar', q: csav }];
    if (v.kez) { const l = A * 1.1 * nz(v.ret) / (nz(v.kiad) || 12); mats.push({ k: 'lazur', q: l }); out.push(['Felületkezelő (élekkel)', fmt(l, 2) + ' l']); }
    return { out, mats, warn: [] };
  }
},
{
  id: 'terasz', g: 'fa', n: 'Teraszburkolat', i: '🪑',
  desc: 'Teraszdeszka, alátétgerenda, csavar.',
  fields: [
    F('Lh', 'Terasz hossza (deszkairány)', 'm', 4),
    F('Ls', 'Terasz szélessége', 'm', 3),
    F('dsz', 'Deszka szélessége', 'cm', 14.5),
    F('hez', 'Hézag', 'mm', 6),
    F('dh', 'Deszka szálhossza', 'm', 4),
    F('gk', 'Gerendák tengelytávolsága', 'cm', 40, { help: 'Puhafa deszkánál 40–50, WPC-nél gyártó szerint (≈ 35–40)' }),
    C('kez', 'Felületkezelés (olaj)', true),
    F('kiad', 'Kiadósság', 'm²/l/réteg', 12, { show: v => v.kez }),
    RAH(10),
  ],
  compute(v) {
    const Lh = nz(v.Lh), Ls = nz(v.Ls); const A = Lh * Ls; const k = 1 + nz(v.rah) / 100;
    const osz = nz(v.dsz) / 100 + nz(v.hez) / 1000; const sorok = osz > 0 ? CEIL(Ls / osz) : 0;
    const fm = sorok * Lh * k; const szal = nz(v.dh) > 0 ? CEIL(fm / nz(v.dh)) : 0;
    const gerDb = CEIL(Lh / (nz(v.gk) / 100 || 0.4)) + 1; const gerFm = gerDb * Ls * 1.05;
    const csav = CEIL(sorok * gerDb * 2 * 1.05);
    const out = [['Terület', fmt(A, 2) + ' m²'], ['Deszkasorok', sorok + ' sor'], ['Teraszdeszka', fmt(fm, 1) + ' fm ≈ ' + szal + ' szál'], ['Alátétgerenda', gerDb + ' db, ' + fmt(gerFm, 1) + ' fm'], ['Csavar', csav + ' db']];
    const mats = [{ k: 'teraszdeszka', q: fm }, { k: 'terasz_gerenda', q: gerFm }, { k: 'facsavar', q: csav }];
    if (v.kez) { const l = A * 2 / (nz(v.kiad) || 12); mats.push({ k: 'lazur', q: l }); out.push(['Olaj (2 réteg)', fmt(l, 2) + ' l']); }
    return { out, mats, warn: ['A gerendák alá alátámasztás (állítható talp, betonpapucs) kell – ezt külön számold.'] };
  }
},
{
  id: 'kobozes', g: 'fa', n: 'Faanyag köbözés', i: '📏',
  desc: 'Gerenda, léc, deszka köbtartalma és ára.',
  fields: [
    F('db', 'Darabszám', 'db', 10),
    F('v', 'Vastagság', 'cm', 5),
    F('sz', 'Szélesség', 'cm', 10),
    F('h', 'Hossz', 'm', 4),
  ],
  compute(v) {
    const V1 = nz(v.v) / 100 * nz(v.sz) / 100 * nz(v.h); const V = V1 * nz(v.db);
    return { out: [['Egy darab', fmt(V1, 4) + ' m³'], ['Összesen', fmt(V, 3) + ' m³'], ['Folyóméter', fmt(nz(v.db) * nz(v.h), 1) + ' fm'], ['1 m³-ben', fmt(V1 > 0 ? 1 / V1 : 0, 1) + ' db']], mats: [{ k: 'fureszaru', q: V }], warn: [] };
  }
},

/* ===== SEGÉD ===== */
{
  id: 'alakzat', g: 'seged', n: 'Terület, kerület', i: '📐', noSave: false,
  desc: 'Téglalap, L-alak, háromszög, trapéz, kör terület és kerület.',
  fields: [
    SEL('a', 'Alakzat', [['tegla', 'Téglalap'], ['L', 'L-alak (két téglalap)'], ['har', 'Háromszög (3 oldal)'], ['trap', 'Trapéz'], ['kor', 'Kör / félkör']], 'tegla'),
    F('x1', 'A oldal', 'm', 4, { show: v => v.a !== 'kor' }),
    F('y1', 'B oldal', 'm', 3, { show: v => v.a === 'tegla' || v.a === 'L' || v.a === 'har' }),
    F('x2', 'Második téglalap A', 'm', 2, { show: v => v.a === 'L' }),
    F('y2', 'Második téglalap B', 'm', 2, { show: v => v.a === 'L' }),
    F('c', 'C oldal', 'm', 5, { show: v => v.a === 'har' }),
    F('b2', 'Másik alap (párhuzamos)', 'm', 2, { show: v => v.a === 'trap' }),
    F('m', 'Magasság', 'm', 2, { show: v => v.a === 'trap' }),
    F('d', 'Átmérő', 'm', 2, { show: v => v.a === 'kor' }),
    C('fel', 'Csak félkör', false, { show: v => v.a === 'kor' }),
  ],
  compute(v) {
    let A = 0, P = null, note = '';
    if (v.a === 'tegla') { A = nz(v.x1) * nz(v.y1); P = 2 * (nz(v.x1) + nz(v.y1)); }
    else if (v.a === 'L') { A = nz(v.x1) * nz(v.y1) + nz(v.x2) * nz(v.y2); note = 'Az L-alak kerülete a csatlakozás módjától függ – a külső kontúrt mérd le.'; }
    else if (v.a === 'har') { const a = nz(v.x1), b = nz(v.y1), c = nz(v.c); const s = (a + b + c) / 2; const q = s * (s - a) * (s - b) * (s - c); A = q > 0 ? Math.sqrt(q) : 0; P = a + b + c; if (q <= 0) note = 'Ilyen oldalakkal nem létezik háromszög.'; }
    else if (v.a === 'trap') { A = (nz(v.x1) + nz(v.b2)) / 2 * nz(v.m); }
    else { const r = nz(v.d) / 2; A = Math.PI * r * r; P = 2 * Math.PI * r; if (v.fel) { A /= 2; P = P / 2 + 2 * r; } }
    const out = [['Terület', fmt(A, 3) + ' m²']]; if (P != null) out.push(['Kerület', fmt(P, 2) + ' m']);
    return { out, mats: [], warn: note ? [note] : [] };
  }
},
{
  id: 'lejtes', g: 'seged', n: 'Lejtés, esés, hajlásszög', i: '📉',
  desc: 'Átváltás % ↔ fok ↔ cm/m, szintkülönbség adott hosszon.',
  fields: [
    SEL('be', 'Mit adsz meg', [['sz', 'Lejtés %-ban'], ['fok', 'Hajlásszög fokban'], ['dh', 'Szintkülönbség és hossz']], 'sz'),
    F('p', 'Lejtés', '%', 2, { show: v => v.be === 'sz' }),
    F('f', 'Hajlásszög', '°', 35, { show: v => v.be === 'fok' }),
    F('dh', 'Szintkülönbség', 'cm', 10, { show: v => v.be === 'dh' }),
    F('L', 'Vízszintes hossz', 'm', 5),
  ],
  compute(v) {
    let p;
    if (v.be === 'sz') p = Number(v.p) || 0; else if (v.be === 'fok') p = Math.tan((Number(v.f) || 0) * Math.PI / 180) * 100; else p = nz(v.L) > 0 ? nz(v.dh) / 100 / nz(v.L) * 100 : 0;
    const deg = Math.atan(p / 100) * 180 / Math.PI;
    const out = [['Lejtés', fmt(p, 2) + ' %'], ['Hajlásszög', fmt(deg, 2) + '°'], ['Esés', fmt(p, 2) + ' cm / m'], ['Szintkülönbség ' + fmt(nz(v.L), 2) + ' m-en', fmt(nz(v.L) * p, 1) + ' cm'], ['Ferde hossz', fmt(nz(v.L) / Math.cos(deg * Math.PI / 180), 3) + ' m']];
    return { out, mats: [], warn: ['Tájékoztatásul: térburkolat 1,5–2,5%, terasz, erkély min. 1,5–2%, csatorna 0,3–0,5%, akadálymentes rámpa max. 5% (6% rövid szakaszon).'] };
  }
},
{
  id: 'lepcso', g: 'seged', n: 'Lépcső méretezés', i: '🪜',
  desc: 'Fokok száma, fellépő, belépő (2m + b ≈ 63 cm), lépcső hossza és dőlése.',
  fields: [
    F('H', 'Szintkülönbség (padlótól padlóig)', 'cm', 280),
    F('mmax', 'Kívánt fellépő legfeljebb', 'cm', 18, { help: 'Lakásban 16–18 cm kényelmes' }),
    F('lep', 'Lépéshossz (2m + b)', 'cm', 63),
  ],
  compute(v) {
    const H = nz(v.H); const n = CEIL(H / (nz(v.mmax) || 18)); const m = n > 0 ? H / n : 0; const b = nz(v.lep) - 2 * m;
    const len = (n - 1) * b; const deg = Math.atan(m / Math.max(0.1, b)) * 180 / Math.PI;
    const warn = []; if (b < 23) warn.push('A belépő 23 cm alatti – nagyon meredek, csak padlás-/feljárólépcsőnek jó.'); if (deg > 42) warn.push('A dőlés 42° fölötti – lakóépületben kényelmetlen.');
    return { out: [['Fokok (fellépők) száma', n + ' db'], ['Fellépő magasság', fmt(m, 1) + ' cm'], ['Belépő szélesség', fmt(b, 1) + ' cm'], ['Járóvonal vízszintes hossza', fmt(len / 100, 2) + ' m'], ['Dőlésszög', fmt(deg, 1) + '°']], mats: [], warn };
  }
},
{
  id: 'keveres', g: 'seged', n: 'Keverés arányból', i: '⚖️',
  desc: 'Cement : homok (vagy sóder) arányból kész habarcs / beton alapanyaga.',
  fields: [
    F('ar', 'Arány 1 : x (cement : adalék, térfogat)', 'x', 4),
    F('V', 'Kész mennyiség', 'l', 100),
    SEL('ad', 'Adalék', [['homok', 'Homok'], ['soder', 'Homokos kavics']], 'homok'),
  ],
  compute(v) {
    const x = nz(v.ar); const Vk = nz(v.V) / 1000; const szaraz = Vk * 1.35;
    const cemV = szaraz / (1 + x), adV = szaraz * x / (1 + x);
    const cemKg = cemV * 1400, adT = adV * (v.ad === 'soder' ? 1.8 : 1.5);
    return { out: [['Cement', fmt(cemKg, 1) + ' kg ≈ ' + fmt(cemKg / 25, 1) + ' zsák'], [v.ad === 'soder' ? 'Homokos kavics' : 'Homok', fmt(adT * 1000, 0) + ' kg (' + fmt(adV * 1000, 0) + ' l)'], ['Keverővíz (kb.)', fmt(cemKg * 0.5, 1) + ' l']],
      mats: [{ k: 'cement', q: cemKg }, { k: v.ad, q: adT }], warn: ['Száraz-nedves térfogatváltozás ≈ 1,35-ös szorzóval; a víz mennyisége az adalék nedvességétől függ.'] };
  }
},
];

const CALC_BY_ID = Object.fromEntries(CALCS.map(c => [c.id, c]));

function defaults(calc) {
  const v = {};
  for (const f of calc.fields) if (f.id) v[f.id] = f.d;
  return v;
}

if (typeof module !== 'undefined') module.exports = { MATERIALS, CALCS, CALC_BY_ID, GROUPS, defaults, fmt, CALC_VERSION };
