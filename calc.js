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
  soder:        { n: 'Homokos kavics (sóder)', g: 'Beton, habarcs', u: 't', ro: 1.8, pack: 0, pn: 't', p: 9000 },
  homok:        { n: 'Homok', g: 'Beton, habarcs', u: 't', ro: 1.5, pack: 0, pn: 't', p: 9000 },
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
  athidalo:     { n: 'Áthidaló', g: 'Falazóelem', u: 'fm', pack: 0, pn: 'fm', p: 6500 },
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
  ua_profil:    { n: 'UA (merevített) profil ajtóhoz', g: 'Gipszkarton', u: 'szál', pack: 1, pn: 'szál', p: 5500 },
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
  zuzottko:     { n: 'Zúzottkő (alap, 0/32)', g: 'Kert', u: 't', ro: 1.6, pack: 0, pn: 't', p: 13000 },
  kozuzalek:    { n: 'Kőzúzalék (ágyazat, 0/4)', g: 'Kert', u: 't', ro: 1.6, pack: 0, pn: 't', p: 15000 },
  szegelyko:    { n: 'Kerti szegélykő (1 m)', g: 'Kert', u: 'db', pack: 1, pn: 'db', p: 2200 },
  fugahomok:    { n: 'Fugahomok', g: 'Kert', u: 'kg', pack: 25, pn: 'zsák (25 kg)', p: 1800 },
  geotextil:    { n: 'Geotextília', g: 'Kert', u: 'm²', pack: 0, pn: 'm²', p: 350 },
  murva:        { n: 'Murva / díszkavics', g: 'Kert', u: 't', ro: 1.5, pack: 0, pn: 't', p: 18000 },
  termofold:    { n: 'Termőföld', g: 'Kert', u: 't', ro: 1.3, pack: 0, pn: 't', p: 8000 },
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
  // Villany (minta árak – írd át a sajátodra)
  nymj15:       { n: 'Kábel NYM-J 3×1,5', g: 'Villany', u: 'fm', pack: 100, pn: 'tekercs (100 m)', p: 42000 },
  nymj25:       { n: 'Kábel NYM-J 3×2,5', g: 'Villany', u: 'fm', pack: 100, pn: 'tekercs (100 m)', p: 65000 },
  nymj525:      { n: 'Kábel NYM-J 5×2,5', g: 'Villany', u: 'fm', pack: 0, pn: 'fm', p: 1100 },
  utp:          { n: 'UTP kábel (Cat6)', g: 'Villany', u: 'fm', pack: 0, pn: 'fm', p: 250 },
  gegecso:      { n: 'Gégecső (16 mm)', g: 'Villany', u: 'fm', pack: 50, pn: 'tekercs (50 m)', p: 3800 },
  kabelcsatorna:{ n: 'Kábelcsatorna', g: 'Villany', u: 'fm', pack: 2, pn: 'szál (2 m)', p: 1300 },
  szerdoboz:    { n: 'Süllyesztett szerelvénydoboz', g: 'Villany', u: 'db', pack: 1, pn: 'db', p: 180 },
  gkdoboz:      { n: 'Gipszkarton szerelvénydoboz', g: 'Villany', u: 'db', pack: 1, pn: 'db', p: 320 },
  kotodoboz:    { n: 'Kötődoboz', g: 'Villany', u: 'db', pack: 1, pn: 'db', p: 450 },
  dugalj:       { n: 'Dugalj (földelt, kerettel)', g: 'Villany', u: 'db', pack: 1, pn: 'db', p: 2600 },
  kapcsolo:     { n: 'Kapcsoló (kerettel)', g: 'Villany', u: 'db', pack: 1, pn: 'db', p: 2400 },
  utp_aljzat:   { n: 'Adat-/TV-aljzat', g: 'Villany', u: 'db', pack: 1, pn: 'db', p: 3800 },
  vezcsatlakozo:{ n: 'Vezetékösszekötő (pl. WAGO)', g: 'Villany', u: 'db', pack: 50, pn: 'doboz (50 db)', p: 6500 },
  kiseloszto:   { n: 'Lakáselosztó (kiselosztó doboz)', g: 'Villany', u: 'db', pack: 1, pn: 'db', p: 26000 },
  kismegszakito:{ n: 'Kismegszakító (B16)', g: 'Villany', u: 'db', pack: 1, pn: 'db', p: 2200 },
  fi_rele:      { n: 'Áramvédő kapcsoló (FI-relé, 30 mA)', g: 'Villany', u: 'db', pack: 1, pn: 'db', p: 16000 },
  gyorsgipsz:   { n: 'Gyorskötő gipsz', g: 'Villany', u: 'kg', pack: 5, pn: 'zsák (5 kg)', p: 2200 },
  // Víz, fűtés (minta árak – írd át a sajátodra)
  ppr20:        { n: 'PPR cső 20 mm', g: 'Víz, fűtés', u: 'fm', pack: 4, pn: 'szál (4 m)', p: 1400 },
  ppr_idom:     { n: 'PPR idom (könyök, T, karmantyú)', g: 'Víz, fűtés', u: 'db', pack: 1, pn: 'db', p: 250 },
  otr16:        { n: 'Ötrétegű cső 16 mm', g: 'Víz, fűtés', u: 'fm', pack: 0, pn: 'fm', p: 650 },
  otr_idom:     { n: 'Préselt idom (ötrétegű)', g: 'Víz, fűtés', u: 'db', pack: 1, pn: 'db', p: 1800 },
  falikorong:   { n: 'Falikorong (csatlakozó könyök)', g: 'Víz, fűtés', u: 'db', pack: 1, pn: 'db', p: 1500 },
  csoszig:      { n: 'Csőhéj szigetelés', g: 'Víz, fűtés', u: 'fm', pack: 2, pn: 'szál (2 m)', p: 800 },
  pvc40:        { n: 'Lefolyócső 40–50 mm', g: 'Víz, fűtés', u: 'fm', pack: 0, pn: 'fm', p: 900 },
  pvc110:       { n: 'Lefolyócső 110 mm (WC)', g: 'Víz, fűtés', u: 'fm', pack: 0, pn: 'fm', p: 2200 },
  lefolyo_idom: { n: 'Lefolyóidom (ív, ágidom, szűkítő)', g: 'Víz, fűtés', u: 'db', pack: 1, pn: 'db', p: 700 },
  sarokszelep:  { n: 'Sarokszelep', g: 'Víz, fűtés', u: 'db', pack: 1, pn: 'db', p: 2800 },
  rad_800:      { n: 'Lapradiátor 22K 600×800', g: 'Víz, fűtés', u: 'db', pack: 1, pn: 'db', p: 36000 },
  rad_1000:     { n: 'Lapradiátor 22K 600×1000', g: 'Víz, fűtés', u: 'db', pack: 1, pn: 'db', p: 42000 },
  rad_1400:     { n: 'Lapradiátor 22K 600×1400', g: 'Víz, fűtés', u: 'db', pack: 1, pn: 'db', p: 56000 },
  torolkozo:    { n: 'Törölközőszárító radiátor', g: 'Víz, fűtés', u: 'db', pack: 1, pn: 'db', p: 38000 },
  termoszelep:  { n: 'Termosztatikus szelepszett (szelep, fej, visszatérő)', g: 'Víz, fűtés', u: 'db', pack: 1, pn: 'szett', p: 9500 },
  oszto_kor:    { n: 'Osztó-gyűjtő (köronként)', g: 'Víz, fűtés', u: 'kör', pack: 1, pn: 'kör', p: 12000 },
  osztoszekreny:{ n: 'Osztószekrény', g: 'Víz, fűtés', u: 'db', pack: 1, pn: 'db', p: 18000 },
  pf_cso:       { n: 'Padlófűtéscső 16 mm (PE-RT)', g: 'Víz, fűtés', u: 'fm', pack: 0, pn: 'fm', p: 380 },
  pf_lemez:     { n: 'Padlófűtés rendszerlemez (bütykös)', g: 'Víz, fűtés', u: 'm²', pack: 0, pn: 'm²', p: 4800 },
  pf_tabla:     { n: 'Hőszigetelő tábla padlófűtéshez', g: 'Víz, fűtés', u: 'm²', pack: 0, pn: 'm²', p: 3200 },
  pf_kapocs:    { n: 'Csőrögzítő kapocs', g: 'Víz, fűtés', u: 'db', pack: 100, pn: 'csomag (100 db)', p: 2500 },
  pur_hab:      { n: 'PUR hab (pisztolyos)', g: 'Nyílászáró', u: 'flakon', pack: 1, pn: 'flakon', p: 3500 },
  beszego:      { n: 'Beszegő szalag (tetőáttöréshez)', g: 'Víz, fűtés', u: 'fm', pack: 5, pn: 'tekercs (5 m)', p: 9500 },
  figy_szalag:  { n: 'Figyelmeztető szalag (közműárok)', g: 'Víz, fűtés', u: 'fm', pack: 100, pn: 'tekercs (100 m)', p: 3500 },
  // Bontás, bérlés (minta árak)
  kontener_4:   { n: 'Konténer 4 m³ (szállítással)', g: 'Bérlés', u: 'db', pack: 1, pn: 'db', p: 55000 },
  kontener_6:   { n: 'Konténer 6 m³ (szállítással)', g: 'Bérlés', u: 'db', pack: 1, pn: 'db', p: 65000 },
  kontener_8:   { n: 'Konténer 8 m³ (szállítással)', g: 'Bérlés', u: 'db', pack: 1, pn: 'db', p: 75000 },
  allvany_berles:{ n: 'Homlokzati állvány bérlése', g: 'Bérlés', u: 'm²·hét', pack: 0, pn: 'm²·hét', p: 250 },
  gep_kotro:    { n: 'Minikotró gépkezelővel', g: 'Bérlés', u: 'nap', pack: 0, pn: 'nap', p: 95000 },
  gep_vibro:    { n: 'Lapvibrátor', g: 'Bérlés', u: 'nap', pack: 0, pn: 'nap', p: 12000 },
  gep_vesogep:  { n: 'Bontókalapács, vésőgép', g: 'Bérlés', u: 'nap', pack: 0, pn: 'nap', p: 9000 },
  gep_horony:   { n: 'Falhoronymaró', g: 'Bérlés', u: 'nap', pack: 0, pn: 'nap', p: 10000 },
  gep_keve:     { n: 'Betonkeverő', g: 'Bérlés', u: 'nap', pack: 0, pn: 'nap', p: 5000 },
  // Úsztatott padló
  laminalt_lap: { n: 'Laminált padló', g: 'Padló', u: 'm²', pack: 0, pn: 'm²', p: 4500 },
  vinyl_lap:    { n: 'Vinyl / SPC padló', g: 'Padló', u: 'm²', pack: 0, pn: 'm²', p: 7500 },
  parketta_lap: { n: 'Szalagparketta (kész)', g: 'Padló', u: 'm²', pack: 0, pn: 'm²', p: 12000 },
  lam_alatet:   { n: 'Padlóalátét', g: 'Padló', u: 'm²', pack: 10, pn: 'tekercs (10 m²)', p: 6500 },
  szegelyleck:  { n: 'Szegélyléc', g: 'Padló', u: 'fm', pack: 2.5, pn: 'szál (2,5 m)', p: 2200 },
  atmeneti_profil:{ n: 'Átmeneti / záróprofil', g: 'Padló', u: 'db', pack: 1, pn: 'db', p: 3500 },
  // Nyílászáró
  nyil_rogzito: { n: 'Nyílászáró-rögzítő csavar, dübel', g: 'Nyílászáró', u: 'db', pack: 1, pn: 'db', p: 250 },
  tomitoszalag: { n: 'Tömítőszalag (kültéri / beltéri)', g: 'Nyílászáró', u: 'fm', pack: 0, pn: 'fm', p: 900 },
  belso_parkany:{ n: 'Belső párkány', g: 'Nyílászáró', u: 'fm', pack: 0, pn: 'fm', p: 6500 },
  kulso_parkany:{ n: 'Külső alumínium párkány', g: 'Nyílászáró', u: 'fm', pack: 0, pn: 'fm', p: 5500 },
  // Bútor
  butor_rogzito:{ n: 'Bútorrögzítő szett (tipli, csavar)', g: 'Bútor', u: 'db', pack: 1, pn: 'db', p: 350 },
  pultzaro:     { n: 'Munkalap fali záróléc', g: 'Bútor', u: 'fm', pack: 0, pn: 'fm', p: 1800 },
  munkalap:     { n: 'Munkalap (laminált, 60 cm)', g: 'Bútor', u: 'fm', pack: 0, pn: 'fm', p: 18000 },
  pf_perem:     { n: 'Peremszigetelő szalag', g: 'Víz, fűtés', u: 'fm', pack: 25, pn: 'tekercs (25 m)', p: 3500 },
  // Munkadíjak (minta árak – írd át a sajátodra). A "Munkadíj" csoport tételei munkadíjként számítanak.
  md_ora:       { n: 'Szakmunka (óradíj)', g: 'Munkadíj', u: 'óra', pack: 0, pn: 'óra', p: 8000 },
  md_segedora:  { n: 'Segédmunka (óradíj)', g: 'Munkadíj', u: 'óra', pack: 0, pn: 'óra', p: 5000 },
  md_nap:       { n: 'Napidíj (1 fő)', g: 'Munkadíj', u: 'nap', pack: 0, pn: 'nap', p: 55000 },
  md_kiszallas: { n: 'Kiszállás', g: 'Munkadíj', u: 'alkalom', pack: 0, pn: 'alkalom', p: 10000 },
  md_km:        { n: 'Kiszállás km-díj', g: 'Munkadíj', u: 'km', pack: 0, pn: 'km', p: 150 },
  md_foldkiemeles:{ n: 'Földkiemelés, tükörkészítés', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 3000 },
  md_bontas:    { n: 'Bontás', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 3000 },
  md_sitt:      { n: 'Sittszállítás (konténer)', g: 'Munkadíj', u: 'alkalom', pack: 0, pn: 'alkalom', p: 60000 },
  md_beton:     { n: 'Betonozás', g: 'Munkadíj', u: 'm³', pack: 0, pn: 'm³', p: 30000 },
  md_esztrich:  { n: 'Aljzatkészítés', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 3500 },
  md_falazas:   { n: 'Falazás', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 9000 },
  md_zsaluko:   { n: 'Zsalukő fal építése', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 10000 },
  md_vakolas:   { n: 'Vakolás', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 4500 },
  md_festes:    { n: 'Glettelés, festés', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 3000 },
  md_gipszkarton:{ n: 'Gipszkarton szerelés', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 8000 },
  md_burkolas:  { n: 'Burkolás', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 9000 },
  md_vizszig:   { n: 'Vízszigetelés', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 4000 },
  md_homlokzat: { n: 'Homlokzati hőszigetelés', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 9000 },
  md_fodem:     { n: 'Födém-, tetőszigetelés', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 1800 },
  md_teto:      { n: 'Tetőfedés', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 6500 },
  md_eresz:     { n: 'Ereszcsatorna szerelés', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 3500 },
  md_terko:     { n: 'Térkövezés', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 8000 },
  md_teritese:  { n: 'Ömlesztett anyag terítése', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 1500 },
  md_kerites:   { n: 'Kerítésépítés', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 7000 },
  md_deszka:    { n: 'Deszkaburkolat szerelés', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 8000 },
  md_terasz:    { n: 'Teraszépítés', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 12000 },
  md_villany_pont:   { n: 'Villanyszerelés – új pont kiépítése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 11000 },
  md_villany_horony: { n: 'Falhorony vésése (villany)', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 2500 },
  md_villany_csatorna:{ n: 'Kábelcsatorna szerelése', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 1200 },
  md_villany_kor:    { n: 'Külön áramkör kiépítése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 25000 },
  md_villany_csere:  { n: 'Szerelvénycsere (dugalj, kapcsoló)', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 3500 },
  md_villany_eloszto:{ n: 'Lakáselosztó szerelése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 40000 },
  md_villany_kism:   { n: 'Áramkör bekötése az elosztóba', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 3000 },
  md_villany_ev:     { n: 'Érintésvédelmi mérés, jegyzőkönyv', g: 'Munkadíj', u: 'alkalom', pack: 0, pn: 'alkalom', p: 35000 },
  md_viz_pont:       { n: 'Vízszerelés – vételi hely kiépítése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 28000 },
  md_viz_csere:      { n: 'Vízszerelés – szerelvénycsere', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 9000 },
  md_viz_proba:      { n: 'Nyomáspróba (víz)', g: 'Munkadíj', u: 'alkalom', pack: 0, pn: 'alkalom', p: 15000 },
  md_viz_horony:     { n: 'Falhorony vésése (víz, fűtés)', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 3000 },
  md_futes_rad:      { n: 'Radiátor felszerelése, bekötése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 28000 },
  md_futes_oszto:    { n: 'Osztó-gyűjtő szerelése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 30000 },
  md_futes_proba:    { n: 'Fűtés nyomáspróba, feltöltés, légtelenítés', g: 'Munkadíj', u: 'alkalom', pack: 0, pn: 'alkalom', p: 20000 },
  md_elokeszito_horony:   { n: 'Horony vésése (tégla)', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 3000 },
  md_elokeszito_horonyb:  { n: 'Horony vésése (beton)', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 5500 },
  md_elokeszito_horonyjav:{ n: 'Horony visszajavítása', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 1500 },
  md_elokeszito_atfur_k:  { n: 'Falátfúrás ≤ 60 mm', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 6000 },
  md_elokeszito_atfur_m:  { n: 'Falátfúrás ≤ 125 mm', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 12000 },
  md_elokeszito_atfur_n:  { n: 'Faláttörés ≤ 200 mm', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 20000 },
  md_elokeszito_potv50:   { n: 'Pótdíj: 30–50 cm-es fal átfúrása', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 5000 },
  md_elokeszito_potbeton: { n: 'Pótdíj: beton / 50 cm feletti fal átfúrása', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 12000 },
  md_elokeszito_teto:     { n: 'Födém- / tetőáttörés', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 25000 },
  md_elokeszito_tetobesz: { n: 'Tetőáttörés beszegése, lezárása', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 18000 },
  md_elokeszito_arok:     { n: 'Árokásás kézzel', g: 'Munkadíj', u: 'm³', pack: 0, pn: 'm³', p: 18000 },
  md_elokeszito_arokg:    { n: 'Árokásás géppel', g: 'Munkadíj', u: 'm³', pack: 0, pn: 'm³', p: 9000 },
  md_elokeszito_visszat:  { n: 'Visszatöltés, tömörítés', g: 'Munkadíj', u: 'm³', pack: 0, pn: 'm³', p: 6000 },
  md_elokeszito_elsz:     { n: 'Föld elszállítása', g: 'Munkadíj', u: 'm³', pack: 0, pn: 'm³', p: 9000 },
  md_elokeszito_pill:     { n: 'Mérőhely-pillér építése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 45000 },
  md_elokeszito_fulke:    { n: 'Mérőhelyfülke kialakítása', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 35000 },
  md_bontas_tegla:   { n: 'Falbontás (tégla)', g: 'Munkadíj', u: 'm³', pack: 0, pn: 'm³', p: 40000 },
  md_bontas_beton:   { n: 'Falbontás (beton)', g: 'Munkadíj', u: 'm³', pack: 0, pn: 'm³', p: 90000 },
  md_bontas_gk:      { n: 'Gipszkarton fal bontása', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 2500 },
  md_bontas_burk:    { n: 'Csempe, járólap leverése', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 3500 },
  md_bontas_vak:     { n: 'Vakolat leverése', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 2500 },
  md_bontas_aljzat:  { n: 'Aljzat bontása', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 6000 },
  md_bontas_padlo:   { n: 'Padló felszedése', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 1200 },
  md_bontas_nyil:    { n: 'Nyílászáró bontása', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 8000 },
  md_bontas_szan:    { n: 'Szaniter, bútor, radiátor bontása', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 6000 },
  md_bontas_lehord:  { n: 'Sitt lehordása (m³ × emelet)', g: 'Munkadíj', u: 'm³', pack: 0, pn: 'm³', p: 5000 },
  md_foldmunka_kezi: { n: 'Földkiemelés kézzel', g: 'Munkadíj', u: 'm³', pack: 0, pn: 'm³', p: 18000 },
  md_foldmunka_gepi: { n: 'Földkiemelés géppel', g: 'Munkadíj', u: 'm³', pack: 0, pn: 'm³', p: 8000 },
  md_foldmunka_visszat:{ n: 'Visszatöltés, tömörítés', g: 'Munkadíj', u: 'm³', pack: 0, pn: 'm³', p: 6000 },
  md_foldmunka_elsz: { n: 'Föld elszállítása', g: 'Munkadíj', u: 'm³', pack: 0, pn: 'm³', p: 9000 },
  md_berles_allv:    { n: 'Állvány fel- és leszerelése', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 900 },
  md_laminalt:       { n: 'Úsztatott padló lerakása', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 2800 },
  md_laminalt_szegely:{ n: 'Szegélyléc felszerelése', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 900 },
  md_nyilaszaro_ablak:{ n: 'Ablak beépítése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 25000 },
  md_nyilaszaro_erkely:{ n: 'Erkélyajtó beépítése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 32000 },
  md_nyilaszaro_bejarati:{ n: 'Bejárati ajtó beépítése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 38000 },
  md_nyilaszaro_belt:{ n: 'Beltéri ajtó beépítése tokkal', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 18000 },
  md_nyilaszaro_bontas:{ n: 'Régi nyílászáró kibontása', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 8000 },
  md_nyilaszaro_park:{ n: 'Párkány beépítése', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 4000 },
  md_nyilaszaro_kava:{ n: 'Kávajavítás (vakolás, glettelés)', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 3500 },
  md_butor_also:     { n: 'Konyhabútor alsó elemeinek összeszerelése, beállítása', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 18000 },
  md_butor_felso:    { n: 'Konyhabútor felső elemeinek összeszerelése, felfüggesztése', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 15000 },
  md_butor_magas:    { n: 'Magas szekrény összeszerelése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 22000 },
  md_butor_pult:     { n: 'Munkalap szabása, rögzítése', g: 'Munkadíj', u: 'fm', pack: 0, pn: 'fm', p: 6000 },
  md_butor_kivag:    { n: 'Kivágás a munkalapon', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 8000 },
  md_butor_fozo:     { n: 'Főzőlap beépítése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 12000 },
  md_butor_suto:     { n: 'Sütő beépítése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 10000 },
  md_butor_mosgep:   { n: 'Mosogatógép beépítése, bekötése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 18000 },
  md_butor_huto:     { n: 'Beépíthető hűtő beépítése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 20000 },
  md_butor_para:     { n: 'Páraelszívó felszerelése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 15000 },
  md_butor_mikro:    { n: 'Mikró beépítése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 8000 },
  md_butor_mosogato: { n: 'Mosogató, csaptelep bekötése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 15000 },
  md_butor_szekreny: { n: 'Ruhásszekrény összeszerelése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 18000 },
  md_butor_tolo:     { n: 'Tolóajtós szekrény összeszerelése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 30000 },
  md_butor_komod:    { n: 'Komód összeszerelése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 9000 },
  md_butor_agy:      { n: 'Ágy összeszerelése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 12000 },
  md_butor_asztal:   { n: 'Asztal összeszerelése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 5000 },
  md_butor_szek:     { n: 'Szék összeszerelése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 2500 },
  md_butor_polc:     { n: 'Polc összeszerelése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 5000 },
  md_butor_tv:       { n: 'TV-szekrény összeszerelése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 7000 },
  md_butor_furdo:    { n: 'Fürdőszobabútor felszerelése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 12000 },
  md_butor_falrog:   { n: 'Bútor falhoz rögzítése', g: 'Munkadíj', u: 'db', pack: 0, pn: 'db', p: 1500 },
  md_padlofutes:     { n: 'Padlófűtés kiépítése', g: 'Munkadíj', u: 'm²', pack: 0, pn: 'm²', p: 4500 },
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
// Ömlesztett anyag: tonna + mázsa + laza m³ egyszerre
const MJ_OPTS = [['m3', 'Köbméter (laza m³)'], ['t', 'Tonna'], ['q', 'Mázsa'], ['mind', 'Mind egyszerre (t, q, m³)']];
function bulkTxt(t, k, mode) {
  const ro = MATERIALS[k] && MATERIALS[k].ro;
  if (mode === 't') return fmt(t, 2) + '\u00a0t';
  if (mode === 'q') return fmt(t * 10, t * 10 >= 100 ? 0 : 1) + '\u00a0q';
  if (mode === 'm3' && ro) return fmt(t / ro, 2) + '\u00a0m³';
  return TQ(t, k);
}
function TQ(t, k, mode) {
  if (mode && mode !== 'mind') return bulkTxt(t, k, mode);
  const ro = MATERIALS[k] && MATERIALS[k].ro;
  return fmt(t, 2) + '\u00a0t = ' + fmt(t * 10, t * 10 >= 100 ? 0 : 1) + '\u00a0q' + (ro ? ' ≈\u00a0' + fmt(t / ro, 2) + '\u00a0m³' : '');
}

/* ---------- Nyílások (ablak, ajtó) listája ----------
   v.nyl = [{ t, sz (cm), m (cm), db }] – a "Nyílások" segédablak tölti ki */
const NY_TYPES = [['ablak', 'Ablak', 120, 150], ['ajto', 'Ajtó', 90, 210], ['erkely', 'Erkélyajtó', 90, 210], ['kapu', 'Garázskapu', 250, 210], ['tetoablak', 'Tetőablak', 78, 118], ['egyeb', 'Egyéb nyílás', 100, 100]];
const NY_AJTO = { ajto: 1, erkely: 1, kapu: 1 };
function nyStats(v) {
  const L = Array.isArray(v.nyl) ? v.nyl : [];
  const st = { n: 0, m2: 0, ker: 0, kavaKer: 0, ajtoSz: 0, ajtoDb: 0, list: L.length > 0 };
  for (const r of L) {
    const sz = nz(r.sz) / 100, m = nz(r.m) / 100, db = nz(r.db);
    st.n += db; st.m2 += sz * m * db; st.ker += 2 * (sz + m) * db;
    if (NY_AJTO[r.t]) { st.kavaKer += (sz + 2 * m) * db; st.ajtoSz += sz * db; st.ajtoDb += db; }
    else st.kavaKer += 2 * (sz + m) * db;
  }
  return st;
}

function csempeSav(v, ar) {
  if (v.am !== 'hel' || !(nz(v.csempeH) > 0)) return 0;
  ar = ar || areaOf(v, 'room');
  return Math.max(0, ar.per * Math.min(nz(v.csempeH), nz(v.Hm)) - (Array.isArray(v.nyl) && v.nyl.length ? nyInBand(v.nyl, nz(v.csempeH)) : 0));
}
// A nyílások fal alsó sávjába (0…h méter) eső része – ajtó a padlótól, ablak 0,9 m mellvédtől
function nyInBand(nyl, h) {
  let a = 0;
  for (const r of nyl || []) {
    const sz = nz(r.sz) / 100, m = nz(r.m) / 100, db = nz(r.db);
    const alja = NY_AJTO[r.t] ? 0 : r.t === 'tetoablak' ? 99 : 0.9;
    a += sz * Math.max(0, Math.min(h, alja + m) - alja) * db;
  }
  return a;
}

// Káva (ablak/ajtó bélése) – a nyíláslistából
const kavaFields = (mely, cimke) => [
  C('kava', cimke || 'Kávák (ablak-, ajtóbéllet) is', false),
  F('kmely', 'Káva mélysége', 'cm', mely, { show: v => v.kava, help: 'A nyíláslista alapján számol' }),
];
function kavaArea(v, warn) {
  if (!v.kava) return 0;
  const st = nyStats(v);
  if (!st.list) { if (warn) warn.push('A kávákhoz add meg az ablakokat, ajtókat a „Nyílások listából” gombbal.'); return 0; }
  return st.kavaKer * nz(v.kmely) / 100;
}

// Felület-megadás blokkok
function areaFields(kind) {
  // kind: 'floor' (padló/födém), 'wall' (fal), 'room' (helyiség falai+mennyezet)
  if (kind === 'wall') return [
    SEL('am', 'Felület megadása', [['fal', 'Hossz × magasság'], ['m2', 'Kész felület (m²)']], 'fal'),
    F('L', 'Fal hossza (összesen)', 'm', 5, { show: v => v.am === 'fal' }),
    F('Hm', 'Fal magassága', 'm', 2.7, { show: v => v.am === 'fal' }),
    F('A', 'Felület', 'm²', 10, { show: v => v.am === 'm2' }),
    F('ny', 'Nyílások levonása (ablak, ajtó)', 'm²', 0, { nyHelp: true }),
  ];
  if (kind === 'room') return [
    SEL('am', 'Felület megadása', [['hel', 'Helyiség (h × sz × belmagasság)'], ['m2', 'Kész felület (m²)']], 'hel'),
    F('Lh', 'Helyiség hossza', 'm', 4, { show: v => v.am === 'hel' }),
    F('Ls', 'Helyiség szélessége', 'm', 3, { show: v => v.am === 'hel' }),
    F('Hm', 'Belmagasság', 'm', 2.7, { show: v => v.am === 'hel' }),
    C('menny', 'Mennyezet is', true, { show: v => v.am === 'hel' }),
    F('A', 'Felület', 'm²', 40, { show: v => v.am === 'm2' }),
    F('ny', 'Nyílások levonása', 'm²', 3.5, { show: v => v.am === 'hel' || v.am === 'm2', nyHelp: true }),
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
  ['elo', 'Bontás, előkészítés', '⛏'],
  ['szerk', 'Szerkezet', '🧱'],
  ['felulet', 'Felületek, belső munkák', '🎨'],
  ['szig', 'Szigetelés', '🧊'],
  ['teto', 'Tető', '🏠'],
  ['kert', 'Kert, udvar', '🌿'],
  ['gep', 'Villany, víz, fűtés', '⚡'],
  ['butor', 'Bútor', '🪑'],
  ['fa', 'Fa', '🪵'],
  ['seged', 'Segédszámítások', '📐'],
];

const CALCS = [
/* ===== SZERKEZET ===== */
{
  id: 'beton', g: 'szerk', n: 'Beton (lemez, alap, pillér)', i: 'beton',
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
      out.push(['Homokos kavics', TQ(Vr * 1.9, 'soder', v.mj)]);
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
  id: 'esztrich', g: 'szerk', n: 'Esztrich, aljzat, önterülő', i: 'esztrich',
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
      else { mats.push({ k: 'cement', q: V * 380 }); mats.push({ k: 'homok', q: V * 1.7 }); out.push(['Cement', fmt(V * 380, 0) + ' kg']); out.push(['Homok', TQ(V * 1.7, 'homok', v.mj)]); }
      if (nz(v.vast) < 3.5) warn.push('Úsztatott esztrichnél 4,5–5 cm alatt repedésveszély van; tapadó esztrichnél min. kb. 2,5–3 cm.');
    }
    if (v.perem) { const p = ar.per != null ? ar.per : 4 * Math.sqrt(A); mats.push({ k: 'peremszalag', q: p * 1.05 }); out.push(['Peremszalag', fmt(p * 1.05, 1) + ' fm' + (ar.per == null ? ' (becsült kerület)' : '')]); }
    return { out, mats, warn };
  }
},
{
  id: 'falazas', g: 'szerk', n: 'Falazás', i: 'falazas',
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
    SEL('athm', 'Áthidaló a nyílások fölé', [['igen', 'Számolja (a nyíláslistából)'], ['nem', 'Nem kell']], 'igen', { show: v => nyStats(v).list }),
    F('athdb', 'Áthidaló egymás mellett', 'db', 2, { show: v => nyStats(v).list && v.athm === 'igen', help: 'Falvastagságtól függ: pl. 12 cm-es elemből 30-as falba 2–3 db' }),
    F('athf', 'Felfekvés oldalanként', 'cm', 12.5, { show: v => nyStats(v).list && v.athm === 'igen' }),
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
    const st = nyStats(v);
    if (st.list && v.athm === 'igen') {
      let fm = 0, n = 0;
      for (const r of v.nyl) { const len = (nz(r.sz) + 2 * nz(v.athf)) / 100; fm += len * nz(r.db) * nz(v.athdb); n += nz(r.db) * nz(v.athdb); }
      mats.push({ k: 'athidalo', q: fm }); out.push(['Áthidaló', n + ' db, összesen ' + fmt(fm, 2) + ' fm']);
    }
    return { out, mats, warn: ['A habarcs- és ragasztóigény átlagérték – a pontos adat a gyártó terméklapján van.'].concat(st.list && v.athm === 'igen' ? ['Az áthidalót a gyártói hosszakra (pl. 25 cm-es lépésekben) felfelé kerekítve rendeld.'] : []) };
  }
},
{
  id: 'zsaluko', g: 'szerk', n: 'Zsalukő fal', i: 'zsaluko',
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
    else if (v.mod === 'kevert') { mats.push({ k: 'cement', q: V * 300 }); mats.push({ k: 'soder', q: V * 1.9 }); out.push(['Cement', fmt(V * 300, 0) + ' kg'], ['Homokos kavics', TQ(V * 1.9, 'soder', v.mj)]); }
    else { mats.push({ k: 'szarazbeton', q: V * 2200 }); out.push(['Szárazbeton', fmt(V * 2200, 0) + ' kg']); }
    return { out, mats, warn: ['A betonigény 50×20 cm-es elemmel számolt átlag; a gyártói adat ettől eltérhet. A vasalást külön számold.'] };
  }
},

/* ===== FELÜLETEK ===== */
{
  id: 'vakolas', g: 'felulet', n: 'Vakolás', i: 'vakolas',
  desc: 'Alapvakolat mennyisége a falfelület és a vastagság alapján.',
  fields: [
    ...areaFields('wall'),
    F('vast', 'Vakolatvastagság', 'cm', 1.5),
    F('fogy', 'Anyagszükséglet', 'kg/m²/cm', 13, { help: 'Gépi alapvakolat jellemzően 12–14' }),
    ...kavaFields(25),
    C('alap', 'Mélyalapozó előtte', false),
    RAH(5),
  ],
  compute(v) {
    const warn = []; const kA = kavaArea(v, warn); const A = areaOf(v, 'wall').net + kA; const k = 1 + nz(v.rah) / 100;
    const kg = A * nz(v.vast) * nz(v.fogy) * k;
    const out = [['Felület', fmt(A, 2) + ' m²' + (kA ? ' (ebből káva ' + fmt(kA, 2) + ')' : '')], ['Vakolat', fmt(kg, 0) + ' kg']]; const mats = [{ k: 'vakolat', q: kg }];
    if (v.alap) { const l = A / 8 * k; mats.push({ k: 'mely_alapozo', q: l }); out.push(['Mélyalapozó (8 m²/l)', fmt(l, 1) + ' l']); }
    return { out, mats, warn };
  }
},
{
  id: 'festes', g: 'felulet', n: 'Glettelés, festés', i: 'festes',
  desc: 'Helyiség falai (+mennyezet): glett, alapozó és festék.',
  fields: [
    ...areaFields('room'),
    F('csempeH', 'Csempézett sáv a fal alján (nem festendő)', 'm', 0, { show: v => v.am === 'hel', help: 'Pl. fürdőben 2,1 m-ig csempe – ott csak a fölötte lévő falat festi' }),
    ...kavaFields(25),
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
    const warn = []; const kA = kavaArea(v, warn); const ar = areaOf(v, 'room'); const k = 1 + nz(v.rah) / 100;
    const sav = csempeSav(v, ar);
    const A = Math.max(0, ar.net - sav) + kA;
    const out = [['Festendő felület', fmt(A, 2) + ' m²' + (ar.ceil || kA ? ' (ebből ' + [ar.ceil ? 'mennyezet ' + fmt(ar.ceil, 1) : '', kA ? 'káva ' + fmt(kA, 2) : ''].filter(Boolean).join(', ') + ')' : '')]], mats = [];
    if (v.gl) { const kg = A * nz(v.glmm) * 1.0 * k; mats.push({ k: 'glett', q: kg }); out.push(['Glett (≈1 kg/m²/mm)', fmt(kg, 0) + ' kg']); }
    if (v.alap) { const l = A / nz(v.alapk || 8) * k; mats.push({ k: 'mely_alapozo', q: l }); out.push(['Mélyalapozó', fmt(l, 1) + ' l']); }
    if (v.fest) { const l = A * nz(v.ret) / nz(v.kiad || 8) * k; mats.push({ k: 'festek', q: l }); out.push(['Festék', fmt(l, 1) + ' l']); }
    if (sav) out.push(['Csempézett sáv levonva', fmt(sav, 2) + ' m²']);
    return { out, mats, warn };
  }
},
{
  id: 'gipszkarton', g: 'felulet', n: 'Gipszkarton', i: 'gipszkarton',
  desc: 'Válaszfal, előtétfal vagy álmennyezet: lapok, profilok, csavar, hézagoló.',
  fields: [
    SEL('tip', 'Szerkezet', [['vf', 'Válaszfal (két oldal)'], ['et', 'Előtétfal / falburkolat (egy oldal)'], ['am', 'Álmennyezet']], 'vf'),
    F('L', 'Fal hossza', 'm', 4, { show: v => v.tip !== 'am' }),
    F('Hm', 'Fal magassága', 'm', 2.7, { show: v => v.tip !== 'am' }),
    F('ny', 'Nyílások (ajtó)', 'm²', 1.9, { show: v => v.tip !== 'am', nyHelp: true }),
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
      const gst = nyStats(v);
      if (gst.ajtoDb > 0) { mats.push({ k: 'ua_profil', q: gst.ajtoDb * 2 }); out.push(['UA profil (ajtónként 2)', gst.ajtoDb * 2 + ' szál']); }
      else if (nz(v.ny) > 0) warn.push('Ajtónyílásnál 2 db UA (merevített) profil kell a tok mellé – a „📐 Nyílások listából” gombbal vedd fel az ajtót, és kiszámolja.');
    }
    return { out, mats, warn };
  }
},
{
  id: 'burkolas', g: 'felulet', n: 'Burkolás (csempe, járólap)', i: 'burkolas',
  desc: 'Lapmennyiség ráhagyással, ragasztó, fuga, lábazat és kenhető szigetelés.',
  fields: [
    SEL('hol', 'Hova', [['padlo', 'Padló'], ['fal', 'Fal (csempe)'], ['m2', 'Kész terület (m²)']], 'padlo'),
    F('Lh', 'Helyiség hossza', 'm', 3, { show: v => v.hol !== 'm2' }),
    F('Ls', 'Helyiség szélessége', 'm', 2, { show: v => v.hol !== 'm2' }),
    F('Hm', 'Csempézés magassága', 'm', 2.1, { show: v => v.hol === 'fal' }),
    F('ny', 'Nyílások levonása', 'm²', 1.9, { show: v => v.hol === 'fal', nyHelp: true }),
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
    F('ajto', 'Ajtók szélessége összesen (lábazatból levonva)', 'm', 0.9, { show: v => v.hol === 'padlo' && v.lab, nyHelp: 'ajto' }),
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
  id: 'vizszig', g: 'felulet', n: 'Vízszigetelés (lábazat, alap, terasz)', i: 'vizszig',
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
  id: 'homlokzat', g: 'szig', n: 'Homlokzati hőszigetelés (dryvit)', i: 'homlokzat',
  desc: 'Teljes rendszer: hőszigetelő lap, ragasztó, dübel, háló, alapozó, színvakolat, profilok.',
  fields: [
    ...areaFields('wall'),
    SEL('any', 'Hőszigetelő anyag', [['eps_feher', 'EPS 80 (fehér)'], ['eps_grafit', 'Grafitos EPS'], ['kozetgyapot_h', 'Kőzetgyapot'], ['xps', 'XPS (lábazat)']], 'eps_grafit'),
    F('vast', 'Vastagság', 'cm', 15),
    F('dub', 'Dübel', 'db/m²', 6, { help: 'EPS 4–6, kőzetgyapot 6–8, széles felületen szélzónában több' }),
    SEL('vak', 'Színvakolat szemcse', [['1.5', '1,5 mm kapart (≈2,5 kg/m²)'], ['2', '2 mm kapart (≈3 kg/m²)'], ['0', 'Nem kell színvakolat']], '1.5'),
    SEL('labm', 'Lábazati indítóprofil', [['auto', 'Fal hosszából, az ajtók levonásával'], ['kezi', 'Megadom a hosszát'], ['nincs', 'Nem kell']], 'auto', { show: v => v.am === 'fal' }),
    F('lab', 'Lábazati profil hossza', 'fm', 0, { show: v => v.am === 'm2' || v.labm === 'kezi' }),
    SEL('elvm', 'Élvédő', [['auto', 'Sarkokból és nyílásokból'], ['kezi', 'Megadom a hosszát'], ['nincs', 'Nem kell']], 'auto'),
    F('sarok', 'Külső épületsarkok száma', 'db', 4, { show: v => v.elvm === 'auto' }),
    F('smag', 'Sarkok magassága', 'm', 3, { show: v => v.elvm === 'auto' && v.am === 'm2' }),
    F('elv', 'Élvédő hossza', 'fm', 0, { show: v => v.elvm === 'kezi' }),
    C('kava', 'Kávák (ablakbélletek) szigetelése', false),
    F('kmely', 'Káva mélysége', 'cm', 20, { show: v => v.kava }),
    F('kvast', 'Káva szigetelés vastagsága', 'cm', 3, { show: v => v.kava }),
    RAH(5),
  ],
  compute(v) {
    const ar = areaOf(v, 'wall'); const A0 = ar.net; const k = 1 + nz(v.rah) / 100; const st = nyStats(v); const warn = [];
    const kavaA = v.kava ? st.kavaKer * nz(v.kmely) / 100 : 0;
    const A = A0 + kavaA; // ragasztó, háló, vakolat a kávákra is kell
    const V = A0 * nz(v.vast) / 100 * k + kavaA * nz(v.kvast) / 100 * 1.1;
    const tabla = CEIL(A0 * k / 0.5);
    const rag = A * 5 * 1.0, beagy = A * 4.5;
    const mats = [{ k: v.any, q: V }, { k: 'hoszig_ragaszto', q: (rag + beagy) * 1.05 }, { k: 'dubel', q: CEIL(A0 * nz(v.dub) * 1.05) }, { k: 'uvegszovet', q: A * 1.15 }];
    const out = [['Szigetelendő felület', fmt(A0, 2) + ' m²' + (kavaA ? ' + káva ' + fmt(kavaA, 2) + ' m²' : '')], ['Hőszigetelő anyag', fmt(V, 2) + ' m³ ≈ ' + tabla + ' tábla (100×50 cm)' + (kavaA ? ' + kávalapok' : '')],
      ['Ragasztó (ragasztás 5 + beágyazás 4,5 kg/m²)', fmt((rag + beagy) * 1.05, 0) + ' kg'], ['Dübel', CEIL(A0 * nz(v.dub) * 1.05) + ' db'], ['Üvegszövet háló', fmt(A * 1.15, 1) + ' m²']];
    if (v.kava && !st.list) warn.push('A kávák számolásához add meg az ablakokat, ajtókat a „📐 Nyílások listából” gombbal.');
    if (v.vak !== '0') {
      const kgm = v.vak === '2' ? 3 : 2.5; mats.push({ k: 'vakolat_alapozo', q: A * 0.25 * 1.05 }, { k: 'szinvakolat', q: A * kgm * 1.05 });
      out.push(['Vakolatalapozó', fmt(A * 0.25 * 1.05, 1) + ' kg'], ['Színvakolat', fmt(A * kgm * 1.05, 0) + ' kg']);
    }
    const lab = v.am === 'm2' ? nz(v.lab) : v.labm === 'auto' ? Math.max(0, nz(v.L) - st.ajtoSz) : v.labm === 'kezi' ? nz(v.lab) : 0;
    if (lab > 0) { const sz = CEIL(lab * 1.05 / 2.5); mats.push({ k: 'labazati_profil', q: sz }); out.push(['Lábazati profil', fmt(lab, 1) + ' fm → ' + sz + ' szál']); }
    const elv = v.elvm === 'auto' ? st.kavaKer + nz(v.sarok) * (v.am === 'fal' ? nz(v.Hm) : nz(v.smag)) : v.elvm === 'kezi' ? nz(v.elv) : 0;
    if (elv > 0) { const sz = CEIL(elv * 1.05 / 2.5); mats.push({ k: 'elvedo', q: sz }); out.push(['Élvédő', fmt(elv, 1) + ' fm → ' + sz + ' szál']); }
    if (v.elvm === 'auto' && !st.list && nz(v.ny) > 0) warn.push('Az élvédőbe a nyílások kerülete csak akkor számít bele, ha a „📐 Nyílások listából” gombbal adod meg őket.');
    const dl = nz(v.vast) + 5; out.push(['Javasolt dübelhossz', '≈ ' + dl + '–' + (dl + 4) + ' cm']);
    warn.push('A lábazati XPS-t külön számold (XPS anyaggal, a lábazat magasságával).');
    return { out, mats, warn };
  }
},
{
  id: 'fodem', g: 'szig', n: 'Födém, padlás, tető hőszigetelés', i: 'fodem',
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
  id: 'teto', g: 'teto', n: 'Tetőfedés', i: 'teto',
  desc: 'Tetőfelület hajlásszögből, cserép, gerinccserép, léc, ellenléc, fólia.',
  fields: [
    SEL('am', 'Felület megadása', [['alap', 'Alapterület (vetület) + hajlásszög'], ['m2', 'Tényleges tetőfelület (m²)']], 'alap'),
    F('Av', 'Tető vízszintes vetülete (ereszekkel)', 'm²', 120, { show: v => v.am === 'alap' }),
    F('fok', 'Hajlásszög', '°', 35, { show: v => v.am === 'alap' }),
    F('A', 'Tetőfelület', 'm²', 150, { show: v => v.am === 'm2' }),
    F('tny', 'Tetőablakok, kémények levonása', 'm²', 0, { nyHelp: true }),
    F('cdb', 'Cserép / m²', 'db', 10, { help: 'Gyártói adat: hornyolt nagyelem ≈ 10, hódfarkú ≈ 35–38' }),
    F('ger', 'Gerinc + élgerinc hossza', 'fm', 10),
    F('gdb', 'Gerinccserép / fm', 'db', 2.5),
    F('lo', 'Lécosztás', 'cm', 33, { help: 'A cseréptől függ, jellemzően 31–34 cm' }),
    F('sz', 'Szarufák távolsága (ellenléc)', 'cm', 90),
    C('fol', 'Páraáteresztő tetőfólia', true),
    RAH(5),
  ],
  compute(v) {
    const Ab = v.am === 'm2' ? nz(v.A) : nz(v.Av) / Math.cos(nz(v.fok) * Math.PI / 180);
    const A = Math.max(0, Ab - nz(v.tny));
    const k = 1 + nz(v.rah) / 100;
    const cs = CEIL(A * nz(v.cdb) * k); const gc = CEIL(nz(v.ger) * nz(v.gdb));
    const lec = nz(v.lo) > 0 ? A / (nz(v.lo) / 100) * 1.1 : 0; const ell = nz(v.sz) > 0 ? A / (nz(v.sz) / 100) * 1.1 : 0;
    const out = [['Tetőfelület', fmt(Ab, 1) + ' m²' + (nz(v.tny) ? ' (fedendő ' + fmt(A, 1) + ')' : '')], ['Cserép', cs + ' db'], ['Gerinccserép', gc + ' db'], ['Tetőléc', fmt(lec, 0) + ' fm'], ['Ellenléc', fmt(ell, 0) + ' fm']];
    const mats = [{ k: 'cserep', q: cs }, { k: 'gerinccserep', q: gc }, { k: 'tetolec', q: lec }, { k: 'ellenlec', q: ell }];
    if (v.fol) { mats.push({ k: 'tetofolia', q: Ab * 1.12 }); out.push(['Tetőfólia (12% átfedés)', fmt(Ab * 1.12, 0) + ' m²']); }
    const warn = ['Szegélycserép, szellőzőcserép, hófogó, gerincszellőző szalag és kúpcserép-lezáró a rendszertől függ – a gyártói kalkulátorral érdemes pontosítani.'];
    if (v.am === 'alap' && (nz(v.fok) < 15 || nz(v.fok) > 70)) warn.unshift('Szokatlan hajlásszög – ellenőrizd a cserép minimális hajlásszögét.');
    return { out, mats, warn };
  }
},
{
  id: 'eresz', g: 'teto', n: 'Ereszcsatorna', i: 'eresz',
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
  id: 'terko', g: 'kert', n: 'Térkövezés', i: 'terko',
  desc: 'Térkő, zúzottkő alap, ágyazat, szegélykő, fugahomok, geotextil.',
  fields: [
    ...areaFields('floor'),
    F('alap', 'Zúzottkő alap vastagsága', 'cm', 15, { help: 'Gyalogos 10–15, személyautó 20–25, tehergépjármű 30+' }),
    F('agy', 'Ágyazat (0/4) vastagsága', 'cm', 4),
    SEL('szm', 'Szegélykő', [['kor', 'Körben, a teljes kerületen'], ['hossz', 'Csak megadott hosszon'], ['nincs', 'Nem kell szegély']], 'kor', { show: v => v.am === 'hsz' }),
    F('szeg', 'Szegélykő hossza', 'fm', 10, { show: v => v.am === 'm2' || v.szm === 'hossz', help: 'Pl. ha az egyik oldal a házfalhoz ér, azt hagyd ki' }),
    C('szegB', 'Szegélykő betonágyba (≈0,03 m³/fm, zsákos)', true, { show: v => !(v.am === 'hsz' && v.szm === 'nincs') }),
    C('geo', 'Geotextília az alap alá', true),
    RAH(5),
  ],
  compute(v) {
    const ar = areaOf(v, 'floor'); const A = ar.net; const k = 1 + nz(v.rah) / 100;
    const alapT = A * nz(v.alap) / 100 * 1.25 * 1.6; const agyT = A * nz(v.agy) / 100 * 1.2 * 1.6;
    const szeg = v.am === 'm2' || v.szm === 'hossz' ? nz(v.szeg) : v.szm === 'nincs' ? 0 : (ar.per || 0);
    const out = [['Terület', fmt(A, 2) + ' m²'], ['Térkő', fmt(A * k, 2) + ' m²'], ['Zúzottkő alap (tömörítéssel)', TQ(alapT, 'zuzottko', v.mj)], ['Kőzúzalék ágyazat', TQ(agyT, 'kozuzalek', v.mj)], ['Fugahomok (≈4 kg/m²)', fmt(A * 4, 0) + ' kg']];
    const mats = [{ k: 'terko', q: A * k }, { k: 'zuzottko', q: alapT }, { k: 'kozuzalek', q: agyT }, { k: 'fugahomok', q: A * 4 }];
    if (szeg > 0) { const db = CEIL(szeg * 1.03); mats.push({ k: 'szegelyko', q: db }); out.push(['Szegély hossza', fmt(szeg, 2) + ' fm'], ['Szegélykő (1 m)', db + ' db']); if (v.szegB) { mats.push({ k: 'szarazbeton', q: szeg * 0.03 * 2200 }); out.push(['Szárazbeton a szegélyhez', fmt(szeg * 0.03 * 2200, 0) + ' kg']); } }
    if (v.geo) { mats.push({ k: 'geotextil', q: A * 1.15 }); out.push(['Geotextília', fmt(A * 1.15, 1) + ' m²']); }
    return { out, mats, warn: ['Tömegek: kb. 1,6 t/m³ laza térfogatsúllyal és 20–25% tömörítési ráhagyással.'] };
  }
},
{
  id: 'omlesztett', g: 'kert', n: 'Ömlesztett anyag (murva, sóder, föld)', i: 'omlesztett',
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
    const out = [['Terület', fmt(A, 2) + ' m²'], ['Szükséges anyag', TQ(t, v.any, v.mj)]]; const mats = [{ k: v.any, q: t }];
    if (v.geo) { mats.push({ k: 'geotextil', q: A * 1.15 }); out.push(['Geotextília (15% átfedés)', fmt(A * 1.15, 1) + ' m²']); }
    return { out, mats, warn: [] };
  }
},
{
  id: 'kerites', g: 'kert', n: 'Kerítés', i: 'kerites',
  desc: 'Oszlopok, oszlopalap, drótfonat vagy panel.',
  fields: [
    F('L', 'Kerítés hossza', 'm', 30),
    SEL('tip', 'Típus', [['drot', 'Drótfonat + feszítőhuzal'], ['panel', 'Táblás kerítéspanel']], 'drot'),
    F('kapu', 'Kapuk szélessége összesen (levonva)', 'm', 0, { help: 'Pl. 1 kiskapu (1 m) + 1 nagykapu (3,5 m) = 4,5' }),
    F('koz', 'Oszlopköz / panelszélesség', 'm', 2.5),
    F('sar', 'Sarkok, végek, kapuoszlopok (plusz)', 'db', 2),
    F('sor', 'Feszítőhuzal sorok', 'sor', 3, { show: v => v.tip === 'drot' }),
    F('la', 'Oszlopgödör oldala', 'cm', 30),
    F('lm', 'Oszlopgödör mélysége', 'cm', 80),
    SEL('mod', 'Oszlopalap beton', [['zsak', 'Zsákos szárazbeton'], ['kevert', 'Helyben kevert (C16)'], ['kesz', 'Kész beton']], 'zsak'),
  ],
  compute(v) {
    const L = Math.max(0, nz(v.L) - nz(v.kapu)), koz = nz(v.koz) || 2.5;
    const mezo = CEIL(L / koz); const oszl = mezo + 1 + nz(v.sar);
    const Vo = nz(v.la) / 100 * nz(v.la) / 100 * nz(v.lm) / 100; const V = Vo * oszl * 1.05;
    const out = [['Mezők', mezo + ' db'], ['Oszlop', oszl + ' db'], ['Oszlopalap beton', fmt(V, 3) + ' m³ (' + fmt(Vo * 1000, 0) + ' l/oszlop)']];
    const mats = [{ k: 'ker_oszlop', q: oszl }];
    if (v.tip === 'drot') { mats.push({ k: 'drothalo', q: L * 1.03 }, { k: 'fesziduzal', q: L * nz(v.sor) * 1.1 }); out.push(['Drótfonat', fmt(L * 1.03, 1) + ' fm'], ['Feszítőhuzal', fmt(L * nz(v.sor) * 1.1, 0) + ' fm']); }
    else { mats.push({ k: 'ker_panel', q: mezo }); out.push(['Panel', mezo + ' db']); }
    if (v.mod === 'zsak') { mats.push({ k: 'szarazbeton', q: V * 2200 }); out.push(['Szárazbeton', fmt(V * 2200, 0) + ' kg']); }
    else if (v.mod === 'kevert') { mats.push({ k: 'cement', q: V * 300 }, { k: 'soder', q: V * 1.9 }); out.push(['Cement', fmt(V * 300, 0) + ' kg'], ['Homokos kavics', TQ(V * 1.9, 'soder', v.mj)]); }
    else mats.push({ k: 'kesz_beton', q: Math.ceil(V * 4) / 4 });
    return { out, mats, warn: ['Oszlopot fagyhatár alá (≈ 80 cm) érdemes betonozni.'] };
  }
},

/* ===== FA ===== */
{
  id: 'deszka', g: 'fa', n: 'Deszkaburkolat (fal, mennyezet)', i: 'deszka',
  desc: 'Vízszintes vagy függőleges deszkák lécvázon, árnyékfugával – fm, szál, léc, csavar, felületkezelés.',
  fields: [
    F('L', 'Felület szélessége', 'm', 3.5),
    F('Hm', 'Felület magassága', 'm', 2.6),
    F('ny', 'Kihagyott felület (ablak, ajtó)', 'm²', 0, { nyHelp: true }),
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
  id: 'terasz', g: 'fa', n: 'Teraszburkolat', i: 'terasz',
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
  id: 'kobozes', g: 'fa', n: 'Faanyag köbözés', i: 'kobozes',
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
  id: 'alakzat', g: 'seged', n: 'Terület, kerület', i: 'alakzat', noSave: false,
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
  id: 'lejtes', g: 'seged', n: 'Lejtés, esés, hajlásszög', i: 'lejtes',
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
  id: 'lepcso', g: 'seged', n: 'Lépcső méretezés', i: 'lepcso',
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
  id: 'keveres', g: 'seged', n: 'Keverés arányból', i: 'keveres',
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
    return { out: [['Cement', fmt(cemKg, 1) + ' kg ≈ ' + fmt(cemKg / 25, 1) + ' zsák'], [v.ad === 'soder' ? 'Homokos kavics' : 'Homok', fmt(adT * 1000, 0) + ' kg = ' + fmt(adT * 10, 1) + ' q (' + fmt(adV * 1000, 0) + ' l)'], ['Keverővíz (kb.)', fmt(cemKg * 0.5, 1) + ' l']],
      mats: [{ k: 'cement', q: cemKg }, { k: v.ad, q: adT }], warn: ['Száraz-nedves térfogatváltozás ≈ 1,35-ös szorzóval; a víz mennyisége az adalék nedvességétől függ.'] };
  }
},
{
  id: 'villany', g: 'gep', n: 'Villanyszerelés', i: 'villany',
  desc: 'Dugaljak, kapcsolók, lámpahelyek, külön áramkörök: kábel, védőcső, dobozok, szerelvények, elosztó és munkadíj.',
  fields: [
    SEL('mod', 'Szerelés módja', [['vesett', 'Falba vésve (új kiépítés)'], ['csatorna', 'Falon kívül, kábelcsatornában'], ['gk', 'Gipszkarton / szerelt falban'], ['csere', 'Csak szerelvénycsere (marad a vezeték)']], 'vesett'),
    F('hely', 'Helyiségek száma', 'db', 1, { show: v => v.mod !== 'csere', help: 'A kötődobozok számához' }),
    H('Szerelési pontok'),
    F('dug', 'Dugalj (konnektor)', 'db', 4, { help: 'A kettes dugalj is egy pont' }),
    F('kap', 'Kapcsoló', 'db', 2),
    F('lam', 'Lámpahely (mennyezeti, fali)', 'db', 2, { show: v => v.mod !== 'csere' }),
    F('kor', 'Külön áramkör (bojler, sütő, főzőlap, klíma…)', 'db', 0, { show: v => v.mod !== 'csere', help: 'Saját kismegszakítóval, közvetlenül az elosztóból' }),
    F('kor5', 'ebből háromfázisú (5×2,5)', 'db', 0, { show: v => v.mod !== 'csere' && nz(v.kor) > 0, help: 'Pl. főzőlap' }),
    F('gyenge', 'Adat-/TV-aljzat (gyengeáram)', 'db', 0),
    F('vh', 'Átlagos vezetékhossz pontonként', 'm', 6, { show: v => v.mod !== 'csere', help: 'A kötődoboztól mérve. Külön áramkörnél az elosztótól, ott a kétszeresével számol' }),
    H('Elosztó, átadás'),
    C('eloszto', 'Lakáselosztó cseréje / új elosztó', false),
    F('kism', 'Kismegszakítók száma', 'db', 0, { show: v => v.eloszto, help: '0 = az áramkörökből számolja (8 dugalj és 10 lámpa / kör + a külön körök)' }),
    C('fi', 'Áramvédő kapcsoló (FI-relé)', true, { show: v => v.eloszto }),
    C('ev', 'Érintésvédelmi mérés, jegyzőkönyv', false),
    RAH(10),
  ],
  compute(v) {
    const warn = [], out = [], mats = [], k = 1 + nz(v.rah) / 100, md = v.mdOn !== false;
    const dug = nz(v.dug), kap = nz(v.kap), gy = nz(v.gyenge);
    if (v.mod === 'csere') {
      if (dug) mats.push({ k: 'dugalj', q: dug });
      if (kap) mats.push({ k: 'kapcsolo', q: kap });
      if (gy) mats.push({ k: 'utp_aljzat', q: gy });
      out.push(['Cserélendő szerelvény', fmt(dug + kap + gy) + ' db']);
      if (md && dug + kap + gy) mats.push({ k: 'md_villany_csere', q: dug + kap + gy });
    } else {
      const lam = nz(v.lam), kor = nz(v.kor), kor5 = Math.min(kor, nz(v.kor5)), vh = nz(v.vh);
      const pont = dug + kap + lam + gy;
      const k15 = (kap + lam) * vh * k, k25 = (dug * vh + (kor - kor5) * vh * 2) * k, k525 = kor5 * vh * 2 * k, kutp = gy * vh * 1.5 * k;
      const kabel = k15 + k25 + k525 + kutp;
      const utvonal = villanyUtvonal(v); // a közös szakaszok miatt a kábelhossz kb. 70%-a
      out.push(['Szerelési pont', fmt(pont) + ' db' + (kor ? ' + ' + fmt(kor) + ' külön áramkör' : '')]);
      if (k15) { mats.push({ k: 'nymj15', q: k15 }); out.push(['NYM-J 3×1,5 (lámpa, kapcsoló)', fmt(k15, 0) + ' m']); }
      if (k25) { mats.push({ k: 'nymj25', q: k25 }); out.push(['NYM-J 3×2,5 (dugalj, külön kör)', fmt(k25, 0) + ' m']); }
      if (k525) { mats.push({ k: 'nymj525', q: k525 }); out.push(['NYM-J 5×2,5 (háromfázisú)', fmt(k525, 0) + ' m']); }
      if (kutp) { mats.push({ k: 'utp', q: kutp }); out.push(['UTP / koax (gyengeáram)', fmt(kutp, 0) + ' m']); }
      if (v.mod === 'csatorna') { mats.push({ k: 'kabelcsatorna', q: utvonal * k }); out.push(['Kábelcsatorna', fmt(utvonal * k, 0) + ' m']); }
      else { mats.push({ k: 'gegecso', q: kabel }); out.push(['Gégecső', fmt(kabel, 0) + ' m']); }
      if (v.mod === 'vesett') out.push(['Falhorony (kb.)', fmt(utvonal, 0) + ' fm']);
      const doboz = dug + kap + gy, kot = Math.max(nz(v.hely), Math.ceil(pont / 6));
      if (doboz && v.mod !== 'csatorna') mats.push({ k: v.mod === 'gk' ? 'gkdoboz' : 'szerdoboz', q: doboz });
      if (kot) mats.push({ k: 'kotodoboz', q: kot });
      if (dug) mats.push({ k: 'dugalj', q: dug });
      if (kap) mats.push({ k: 'kapcsolo', q: kap });
      if (gy) mats.push({ k: 'utp_aljzat', q: gy });
      if (pont + kor) mats.push({ k: 'vezcsatlakozo', q: (pont + kor) * 3 });
      out.push(['Dobozok', (v.mod === 'csatorna' ? 'falon kívüli szerelvények + ' : fmt(doboz) + ' szerelvény- + ') + fmt(kot) + ' kötődoboz']);
      if (md) {
        if (kor) mats.push({ k: 'md_villany_kor', q: kor });
        if (v.mod === 'vesett' && utvonal) mats.push({ k: 'md_villany_horony', q: Math.round(utvonal * 10) / 10 });
        if (v.mod === 'csatorna' && utvonal) mats.push({ k: 'md_villany_csatorna', q: Math.round(utvonal * 10) / 10 });
      }
      if (v.mod === 'vesett') warn.push('A falhornyok visszajavítását a Részmunkák között kérheted.');
    }
    if (v.eloszto) {
      const auto = Math.ceil(dug / 8) + Math.ceil(nz(v.lam) / 10) + (v.mod === 'csere' ? 0 : nz(v.kor)) + (gy ? 1 : 0);
      const km = nz(v.kism) || Math.max(1, auto);
      mats.push({ k: 'kiseloszto', q: 1 }, { k: 'kismegszakito', q: km });
      if (v.fi) mats.push({ k: 'fi_rele', q: 1 });
      out.push(['Kismegszakító', fmt(km) + ' db' + (nz(v.kism) ? '' : ' (számolt)')]);
      if (md) mats.push({ k: 'md_villany_eloszto', q: 1 }, { k: 'md_villany_kism', q: km });
    }
    if (v.ev && md) mats.push({ k: 'md_villany_ev', q: 1 });
    if (!v.ev && v.mod !== 'csere') warn.push('Új áramkör átadása előtt érintésvédelmi mérés és jegyzőkönyv kell – kapcsold be, ha te csinálod.');
    return { out, mats, warn };
  }
},
{
  id: 'viz', g: 'gep', n: 'Víz- és lefolyószerelés', i: 'viz',
  desc: 'Vételi helyek (mosdó, WC, zuhany, kád, mosogató, gépek): hideg-meleg vízcső, lefolyó, idomok, sarokszelepek és munkadíj.',
  fields: [
    SEL('mod', 'Szerelés módja', [['vesett', 'Falba vésve (új kiépítés)'], ['szerelt', 'Szerelőfal / álfal mögé, vésés nélkül'], ['csere', 'Csak szerelvénycsere (marad a cső)']], 'vesett'),
    SEL('cso', 'Vízcső', [['ppr', 'PPR, hegesztett (20 mm)'], ['otr', 'Ötrétegű, préselt (16 mm)']], 'ppr', { show: v => v.mod !== 'csere' }),
    H('Vételi helyek'),
    F('mosdo', 'Mosdó', 'db', 1),
    F('wc', 'WC', 'db', 1),
    F('zuhany', 'Zuhany', 'db', 1),
    F('kad', 'Kád', 'db', 0),
    F('mosogato', 'Mosogató', 'db', 0),
    F('gep', 'Mosógép / mosogatógép', 'db', 1, { help: 'Csak hideg víz és lefolyó' }),
    F('vh', 'Átlagos vízcsőhossz vételi helyenként', 'm', 5, { show: v => v.mod !== 'csere', help: 'A felszállótól / elosztótól mérve, egy vezetékre' }),
    F('lh', 'Átlagos lefolyóhossz vételi helyenként', 'm', 3, { show: v => v.mod !== 'csere', help: 'A lefolyó gerincvezetékig' }),
    C('szig', 'Melegvízcső szigetelése', true, { show: v => v.mod !== 'csere' }),
    C('proba', 'Nyomáspróba, átadás', true, { show: v => v.mod !== 'csere' }),
    RAH(10),
  ],
  compute(v) {
    const warn = [], out = [], mats = [], k = 1 + nz(v.rah) / 100, md = v.mdOn !== false;
    const mo = nz(v.mosdo), wc = nz(v.wc), zu = nz(v.zuhany), ka = nz(v.kad), mg = nz(v.mosogato), gp = nz(v.gep);
    const pont = mo + wc + zu + ka + mg + gp;
    const hm = mo + zu + ka + mg;            // hideg + meleg kiállás
    const csakH = wc + gp;                   // csak hideg
    const kiall = hm * 2 + csakH;            // falikorong / csatlakozás
    const sarok = mo * 2 + mg * 2 + wc + gp; // sarokszelepek
    out.push(['Vételi hely', fmt(pont) + ' db (' + fmt(kiall) + ' vízkiállás)']);
    if (sarok) mats.push({ k: 'sarokszelep', q: sarok });
    if (v.mod === 'csere') {
      if (md && pont) mats.push({ k: 'md_viz_csere', q: pont });
      out.push(['Sarokszelep', fmt(sarok) + ' db']);
      return { out, mats, warn };
    }
    const vh = nz(v.vh), lh = nz(v.lh);
    const viz = kiall * vh * k, meleg = hm * vh * k;
    if (v.cso === 'otr') { mats.push({ k: 'otr16', q: viz }, { k: 'otr_idom', q: kiall * 3 }); out.push(['Ötrétegű cső 16 mm', fmt(viz, 0) + ' m']); }
    else { mats.push({ k: 'ppr20', q: viz }, { k: 'ppr_idom', q: kiall * 5 }); out.push(['PPR cső 20 mm', fmt(viz, 0) + ' m']); }
    mats.push({ k: 'falikorong', q: kiall });
    if (v.szig && meleg) { mats.push({ k: 'csoszig', q: meleg }); out.push(['Csőszigetelés (meleg ág)', fmt(meleg, 0) + ' m']); }
    const l40 = (mo + zu + ka + mg + gp) * lh * k, l110 = wc * Math.max(1, lh * 0.6) * k;
    if (l40) mats.push({ k: 'pvc40', q: l40 });
    if (l110) mats.push({ k: 'pvc110', q: l110 });
    if (pont) mats.push({ k: 'lefolyo_idom', q: pont * 3 });
    out.push(['Lefolyó', fmt(l40, 0) + ' m (40–50 mm)' + (l110 ? ' + ' + fmt(l110, 0) + ' m (110 mm)' : '')]);
    const horony = gepUtvonal(v);
    if (v.mod === 'vesett') out.push(['Falhorony (kb.)', fmt(horony, 0) + ' fm']);
    if (md) {
      if (v.mod === 'vesett' && horony) mats.push({ k: 'md_viz_horony', q: Math.round(horony * 10) / 10 });
      if (v.proba) mats.push({ k: 'md_viz_proba', q: 1 });
    }
    if (zu || ka || wc) warn.push('A szaniterek (WC, mosdó, zuhanytálca, kád) és a csaptelepek felszerelését a Részmunkák között kérheted.');
    return { out, mats, warn };
  }
},
{
  id: 'futes', g: 'gep', n: 'Radiátoros fűtés', i: 'futes',
  desc: 'Radiátorok, termosztatikus szelepek, ötrétegű fűtéscső, osztó-gyűjtő, nyomáspróba és munkadíj.',
  fields: [
    SEL('mod', 'Szerelés módja', [['vesett', 'Falba / aljzatba vésve (új kiépítés)'], ['latszo', 'Falon kívül, látszó csővel'], ['csere', 'Csak radiátorcsere (marad a cső)']], 'vesett'),
    H('Radiátorok'),
    F('rad', 'Radiátorok száma', 'db', 4),
    SEL('meret', 'Jellemző radiátorméret', [['600x800', 'Lapradiátor 22K 600×800'], ['600x1000', 'Lapradiátor 22K 600×1000'], ['600x1400', 'Lapradiátor 22K 600×1400'], ['torolkozo', 'Törölközőszárító']], '600x1000'),
    C('radAnyag', 'A radiátorokat én szerzem be', true, { help: 'Kikapcsolva a megrendelő hozza, csak a felszerelés díja számít' }),
    F('vh', 'Átlagos csőhossz radiátoronként', 'm', 8, { show: v => v.mod !== 'csere', help: 'Az osztótól / kazántól, egy irányba – az előremenőt és a visszatérőt is számolja' }),
    C('oszto', 'Osztó-gyűjtő (köronként egy radiátor)', true, { show: v => v.mod !== 'csere' }),
    C('szig', 'Csőszigetelés', true, { show: v => v.mod !== 'csere' }),
    C('proba', 'Nyomáspróba, feltöltés, légtelenítés', true),
    RAH(10),
  ],
  compute(v) {
    const warn = [], out = [], mats = [], k = 1 + nz(v.rah) / 100, md = v.mdOn !== false;
    const rad = nz(v.rad), rk = { '600x800': 'rad_800', '600x1000': 'rad_1000', '600x1400': 'rad_1400', torolkozo: 'torolkozo' }[v.meret] || 'rad_1000';
    if (rad && v.radAnyag) mats.push({ k: rk, q: rad });
    if (rad) mats.push({ k: 'termoszelep', q: rad });
    out.push(['Radiátor', fmt(rad) + ' db' + (v.radAnyag ? '' : ' (a megrendelő hozza)')]);
    if (v.mod !== 'csere') {
      const cso = rad * nz(v.vh) * 2 * k;
      if (cso) { mats.push({ k: 'otr16', q: cso }, { k: 'otr_idom', q: rad * 4 }); out.push(['Ötrétegű cső 16 mm', fmt(cso, 0) + ' m']); }
      if (v.szig && cso) mats.push({ k: 'csoszig', q: cso });
      if (v.oszto && rad) { mats.push({ k: 'oszto_kor', q: rad }, { k: 'osztoszekreny', q: Math.ceil(rad / 10) }); out.push(['Osztó-gyűjtő', fmt(rad) + ' kör']); }
      const horony = gepUtvonal(v);
      if (v.mod === 'vesett') out.push(['Falhorony / aljzathorony (kb.)', fmt(horony, 0) + ' fm']);
      if (md) {
        if (v.mod === 'vesett' && horony) mats.push({ k: 'md_viz_horony', q: Math.round(horony * 10) / 10 });
        if (v.oszto && rad) mats.push({ k: 'md_futes_oszto', q: 1 });
      }
    }
    if (md && v.proba) mats.push({ k: 'md_futes_proba', q: 1 });
    warn.push('A kazán beépítését, a rendszer mosatását és a beszabályozást a Részmunkák között kérheted.');
    return { out, mats, warn };
  }
},
{
  id: 'padlofutes', g: 'gep', n: 'Padlófűtés', i: 'padlofutes',
  desc: 'Rendszerlemez vagy hőszigetelés, padlófűtéscső, peremszigetelés, osztó-gyűjtő, nyomáspróba és munkadíj. Az esztrichet külön kalkulátorral számold.',
  fields: [
    F('A', 'Fűtött alapterület', 'm²', 20),
    F('ker', 'Helyiség(ek) kerülete', 'm', 0, { help: '0 = az alapterületből becsli' }),
    SEL('oszt', 'Csőosztás', [['10', '10 cm (fürdő, nagy hőigény)'], ['15', '15 cm (lakószoba)'], ['20', '20 cm (jól szigetelt ház)']], '15'),
    SEL('alap', 'Alap', [['lemez', 'Bütykös rendszerlemez'], ['tabla', 'Hőszigetelő tábla + rögzítőkapocs']], 'lemez'),
    F('vh', 'Osztó és helyiség közti távolság', 'm', 5, { help: 'Körönként oda-vissza számolja' }),
    C('oszto', 'Osztó-gyűjtő szekrénnyel', true),
    C('proba', 'Nyomáspróba, feltöltés, beszabályozás', true),
    RAH(5),
  ],
  compute(v) {
    const warn = [], out = [], mats = [], k = 1 + nz(v.rah) / 100, md = v.mdOn !== false;
    const A = nz(v.A), osz = nz(v.oszt) || 15;
    const csoM2 = 100 / osz; // 15 cm-nél ≈ 6,7 fm/m²
    const kor = Math.max(1, Math.ceil(A / 12));
    const cso = (A * csoM2 + kor * nz(v.vh) * 2) * k;
    const ker = nz(v.ker) || Math.sqrt(A) * 4;
    out.push(['Fűtőkör', fmt(kor) + ' db (max. kb. 12 m² / kör)']);
    out.push(['Padlófűtéscső 16 mm', fmt(cso, 0) + ' m']);
    if (A) mats.push({ k: 'pf_cso', q: cso });
    if (A) mats.push({ k: v.alap === 'tabla' ? 'pf_tabla' : 'pf_lemez', q: A * k });
    if (v.alap === 'tabla' && A) mats.push({ k: 'pf_kapocs', q: cso * 2.5 });
    if (ker) mats.push({ k: 'pf_perem', q: ker * k });
    if (v.oszto) { mats.push({ k: 'oszto_kor', q: kor }, { k: 'osztoszekreny', q: 1 }); out.push(['Osztó-gyűjtő', fmt(kor) + ' kör']); }
    if (md) {
      if (v.oszto) mats.push({ k: 'md_futes_oszto', q: 1 });
      if (v.proba) mats.push({ k: 'md_futes_proba', q: 1 });
    }
    if (A / kor > 12) warn.push('Egy kör legfeljebb kb. 100 m cső legyen.');
    warn.push('A csövek fölé esztrich kell – azt az Esztrich kalkulátorral számold.');
    return { out, mats, warn };
  }
},
{
  id: 'bontas', g: 'elo', n: 'Bontás és sitt', i: 'bontas',
  desc: 'Falbontás, burkolat, vakolat, aljzat, padló, nyílászáró és berendezés bontása – munkadíj, sittmennyiség és konténerek száma.',
  fields: [
    H('Fal'),
    C('fal', 'Falbontás', false),
    F('fh', 'Fal hossza', 'm', 3, { show: v => v.fal }),
    F('fm', 'Fal magassága', 'm', 2.7, { show: v => v.fal }),
    F('fv', 'Fal vastagsága', 'cm', 12, { show: v => v.fal && v.fanyag !== 'gk' }),
    SEL('fanyag', 'Fal anyaga', [['tegla', 'Tégla, pórusbeton'], ['beton', 'Beton, vasbeton'], ['gk', 'Gipszkarton, szerelt fal']], 'tegla', { show: v => v.fal }),
    F('fny', 'Nyílások levonása', 'm²', 0, { show: v => v.fal }),
    H('Felületek'),
    C('burk', 'Csempe, járólap leverése (ragasztóval)', false),
    F('ba', 'Burkolt felület', 'm²', 10, { show: v => v.burk }),
    C('vak', 'Vakolat leverése', false),
    F('va', 'Vakolt felület', 'm²', 20, { show: v => v.vak }),
    C('aljzat', 'Aljzat (esztrich, beton) bontása', false),
    F('aa', 'Aljzat területe', 'm²', 10, { show: v => v.aljzat }),
    F('av', 'Aljzat vastagsága', 'cm', 5, { show: v => v.aljzat }),
    C('padlo', 'Laminált, parketta, szőnyeg felszedése', false),
    F('pa', 'Padló területe', 'm²', 15, { show: v => v.padlo }),
    H('Elemek'),
    F('nyil', 'Nyílászáró bontása', 'db', 0),
    F('szan', 'Szaniter, konyhabútor, radiátor bontása', 'db', 0),
    H('Sitt'),
    SEL('kont', 'Konténer mérete', [['k4', '4 m³'], ['k6', '6 m³'], ['k8', '8 m³'], ['nincs', 'Nem kell konténer (zsákos / saját elszállítás)']], 'k6'),
    F('em', 'Lehordás emeletről (lift nélkül)', 'emelet', 0, { help: '0 = földszint vagy van lift' }),
  ],
  compute(v) {
    const warn = [], out = [], mats = [];
    let tomor = 0; // tömör (bontás előtti) sittmennyiség, m³
    if (v.fal) {
      const A = Math.max(0, nz(v.fh) * nz(v.fm) - nz(v.fny));
      if (v.fanyag === 'gk') { mats.push({ k: 'md_bontas_gk', q: r2(A) }); tomor += A * 0.03; out.push(['Gipszkarton fal', fmt(A, 1) + ' m²']); }
      else {
        const V = A * nz(v.fv) / 100;
        mats.push({ k: v.fanyag === 'beton' ? 'md_bontas_beton' : 'md_bontas_tegla', q: r2(V) }); tomor += V;
        out.push(['Fal', fmt(A, 1) + ' m² = ' + fmt(V, 2) + ' m³' + (v.fanyag === 'beton' ? ' beton' : '')]);
      }
      warn.push('Teherhordó fal bontásához statikus vélemény (és sokszor engedély) kell – egyeztesd a megrendelővel.');
    }
    if (v.burk && nz(v.ba)) { mats.push({ k: 'md_bontas_burk', q: nz(v.ba) }); tomor += nz(v.ba) * 0.02; }
    if (v.vak && nz(v.va)) { mats.push({ k: 'md_bontas_vak', q: nz(v.va) }); tomor += nz(v.va) * 0.02; }
    if (v.aljzat && nz(v.aa)) { mats.push({ k: 'md_bontas_aljzat', q: nz(v.aa) }); tomor += nz(v.aa) * nz(v.av) / 100; if (nz(v.av) > 6) warn.push('6 cm feletti aljzatnál számolj több idővel – a díj m²-re szól.'); }
    if (v.padlo && nz(v.pa)) { mats.push({ k: 'md_bontas_padlo', q: nz(v.pa) }); tomor += nz(v.pa) * 0.015; }
    if (nz(v.nyil)) { mats.push({ k: 'md_bontas_nyil', q: nz(v.nyil) }); tomor += nz(v.nyil) * 0.15; }
    if (nz(v.szan)) { mats.push({ k: 'md_bontas_szan', q: nz(v.szan) }); tomor += nz(v.szan) * 0.25; }
    const laza = tomor * 1.5; // bontás után kb. másfélszeres térfogat
    if (laza) {
      out.push(['Sitt (lazult térfogat)', fmt(laza, 2) + ' m³ ≈ ' + fmt(tomor * 1.8, 1) + ' t']);
      if (nz(v.em)) { mats.push({ k: 'md_bontas_lehord', q: r2(laza * nz(v.em)) }); out.push(['Lehordás', fmt(laza, 1) + ' m³ × ' + fmt(nz(v.em)) + ' emelet']); }
      if (v.kont !== 'nincs') {
        const meret = { k4: 4, k6: 6, k8: 8 }[v.kont] || 6, db = Math.ceil(laza / meret);
        mats.push({ k: 'kontener_' + meret, q: db });
        out.push(['Konténer', fmt(db) + ' × ' + meret + ' m³']);
        if (laza < 1.5) warn.push('Kevés a sitt (' + fmt(laza, 1) + ' m³) – zsákos elszállítással olcsóbb lehet, mint egy egész konténer. Ehhez válaszd a „Nem kell konténer” lehetőséget.');
        if (tomor * 1.8 > meret * 1.2 * db) warn.push('A sitt nehéz (beton, tégla) – nézd meg a konténer súlyhatárát, lehet, hogy kisebb, de több konténer kell.');
      }
    }
    if (!mats.length) warn.push('Kapcsold be, mit kell bontani.');
    return { out, mats, warn };
  }
},
{
  id: 'foldmunka', g: 'elo', n: 'Földmunka', i: 'foldmunka',
  desc: 'Alapárok, munkagödör vagy terület kiemelése kézzel vagy géppel, visszatöltés, tömörítés, elszállítás.',
  fields: [
    SEL('tip', 'Mit ásunk', [['arok', 'Alapárok, sávalap'], ['godor', 'Munkagödör, pince'], ['terulet', 'Terület (pl. kocsibeálló, terasz alá)']], 'arok'),
    F('L', 'Hossz', 'm', 10),
    F('Sz', 'Szélesség', 'm', 0.5),
    F('M', 'Mélység', 'm', 0.8),
    SEL('asas', 'Ásás', [['kezi', 'Kézi'], ['gepi', 'Gépi (minikotró)']], 'gepi'),
    F('vt', 'Ebből visszatöltés', '%', 0, { help: 'Alapároknál általában 0, munkagödörnél a fal mögé visszatöltött rész' }),
    C('elsz', 'A felesleg elszállítása', true),
  ],
  compute(v) {
    const warn = [], out = [], mats = [];
    const V = nz(v.L) * nz(v.Sz) * nz(v.M), vt = V * Math.min(100, nz(v.vt)) / 100, fel = (V - vt) * 1.25;
    out.push(['Kiemelt föld', fmt(V, 2) + ' m³']);
    if (V) mats.push({ k: v.asas === 'gepi' ? 'md_foldmunka_gepi' : 'md_foldmunka_kezi', q: r2(V) });
    if (vt) { mats.push({ k: 'md_foldmunka_visszat', q: r2(vt) }); out.push(['Visszatöltés', fmt(vt, 2) + ' m³']); }
    if (v.elsz && fel > 0) { mats.push({ k: 'md_foldmunka_elsz', q: r2(fel) }); out.push(['Elszállítandó (lazult)', fmt(fel, 2) + ' m³']); }
    if (v.asas === 'kezi' && V > 6) warn.push('Ennyi földnél érdemes gépi ásással számolni.');
    if (v.asas === 'gepi') warn.push('A minikotró bérleti díját az „Állvány, konténer, gépbérlés” kalkulátorban adhatod hozzá, ha nem a munkadíj része.');
    if (nz(v.M) > 1.5) warn.push('1,5 m-nél mélyebb munkagödörnél dúcolás vagy rézsű kell.');
    return { out, mats, warn };
  }
},
{
  id: 'elokeszito', g: 'elo', n: 'Előkészítő és segédmunkák', i: 'elokeszito',
  desc: 'Gáz-, kémény-, napelem- és közműmunkák előtti és utáni kőműves munka: horony, falátfúrás, födém- és tetőáttörés, közműárok, mérőhely-pillér.',
  fields: [
    H('Horony'),
    C('horony', 'Horony vésése (csőnek, kábelnek)', true),
    F('hl', 'Horony hossza', 'fm', 6, { show: v => v.horony }),
    SEL('hfal', 'Fal anyaga', [['tegla', 'Tégla, pórusbeton'], ['beton', 'Beton, vasbeton (nehezebb)']], 'tegla', { show: v => v.horony }),
    C('hjav', 'Visszajavítás a szerelés után', true, { show: v => v.horony, help: 'Gipsz vagy javítóhabarcs, a horony teljes hosszán' }),
    H('Falátfúrás, áttörés'),
    C('atfur', 'Falátfúrás / áttörés', false),
    F('adb', 'Darabszám', 'db', 1, { show: v => v.atfur }),
    SEL('atip', 'Átmérő', [['kicsi', 'Kicsi – cső, kábel (≤ 60 mm)'], ['kozep', 'Közepes – szellőző, kondenzvíz (≤ 125 mm)'], ['nagy', 'Nagy – égéstermék, légbevezető (≤ 200 mm)']], 'kicsi', { show: v => v.atfur }),
    SEL('avast', 'Falvastagság', [['v30', '30 cm-ig'], ['v50', '30–50 cm'], ['beton', 'Beton vagy 50 cm felett']], 'v30', { show: v => v.atfur }),
    H('Födém- és tetőáttörés'),
    C('teto', 'Födém- / tetőáttörés (kémény, égéstermék-elvezető, napelem kábel)', false),
    F('tdb', 'Darabszám', 'db', 1, { show: v => v.teto }),
    C('tbesz', 'Tetőn: beszegés, vízzáró lezárás', true, { show: v => v.teto }),
    H('Közműárok'),
    C('arok', 'Közműárok (gáz, víz, villany, csatorna)', false),
    F('al', 'Árok hossza', 'm', 10, { show: v => v.arok }),
    F('am', 'Mélysége', 'm', 0.8, { show: v => v.arok, help: 'Víz: fagyhatár alá (kb. 0,9–1 m), gáz, villany: 0,6–0,8 m' }),
    F('asz', 'Szélessége', 'm', 0.4, { show: v => v.arok }),
    SEL('aasas', 'Ásás', [['kezi', 'Kézi'], ['gepi', 'Gépi (minikotró)']], 'kezi', { show: v => v.arok }),
    C('ahomok', 'Homokágy és takarás (10 + 20 cm)', true, { show: v => v.arok }),
    C('aelsz', 'A kiszorult föld elszállítása', true, { show: v => v.arok && v.ahomok }),
    H('Mérőhely'),
    C('pill', 'Mérőhely-pillér / fülke falazása', false),
    F('pdb', 'Darabszám', 'db', 1, { show: v => v.pill }),
    SEL('ptip', 'Kialakítás', [['pill', 'Kerítéspillér zsalukőből (kb. 0,5×0,4×1,6 m)'], ['fulke', 'Falfülke kialakítása meglévő falban']], 'pill', { show: v => v.pill }),
    RAH(10),
  ],
  compute(v) {
    const warn = [], out = [], mats = [], k = 1 + nz(v.rah) / 100;
    if (v.horony && nz(v.hl)) {
      const hl = nz(v.hl);
      mats.push({ k: v.hfal === 'beton' ? 'md_elokeszito_horonyb' : 'md_elokeszito_horony', q: hl });
      if (v.hjav) { mats.push({ k: 'gyorsgipsz', q: hl * 0.8 * k }, { k: 'md_elokeszito_horonyjav', q: hl }); }
      out.push(['Horony', fmt(hl) + ' fm' + (v.hfal === 'beton' ? ' (betonban)' : '') + (v.hjav ? ', visszajavítással' : '')]);
    }
    if (v.atfur && nz(v.adb)) {
      const db = nz(v.adb);
      const key = { kicsi: 'md_elokeszito_atfur_k', kozep: 'md_elokeszito_atfur_m', nagy: 'md_elokeszito_atfur_n' }[v.atip] || 'md_elokeszito_atfur_k';
      mats.push({ k: key, q: db });
      if (v.avast === 'v50') mats.push({ k: 'md_elokeszito_potv50', q: db });
      if (v.avast === 'beton') mats.push({ k: 'md_elokeszito_potbeton', q: db });
      out.push(['Falátfúrás', fmt(db) + ' db' + (v.avast === 'v50' ? ', 30–50 cm-es falban' : v.avast === 'beton' ? ', betonban / vastag falban' : '')]);
      mats.push({ k: 'pur_hab', q: Math.ceil(db / 4) });
    }
    if (v.teto && nz(v.tdb)) {
      const db = nz(v.tdb);
      mats.push({ k: 'md_elokeszito_teto', q: db });
      if (v.tbesz) mats.push({ k: 'beszego', q: db * 1.5 * k }, { k: 'md_elokeszito_tetobesz', q: db });
      out.push(['Födém- / tetőáttörés', fmt(db) + ' db' + (v.tbesz ? ', beszegéssel' : '')]);
    }
    if (v.arok && nz(v.al)) {
      const L = nz(v.al), V = L * nz(v.am) * nz(v.asz), hom = v.ahomok ? L * nz(v.asz) * 0.3 : 0;
      mats.push({ k: v.aasas === 'gepi' ? 'md_elokeszito_arokg' : 'md_elokeszito_arok', q: Math.round(V * 100) / 100 });
      mats.push({ k: 'md_elokeszito_visszat', q: Math.round((V - hom) * 100) / 100 });
      mats.push({ k: 'figy_szalag', q: L * k });
      if (hom) mats.push({ k: 'homok', q: hom * 1.5 * k });
      if (hom && v.aelsz) mats.push({ k: 'md_elokeszito_elsz', q: Math.round(hom * 1.25 * 100) / 100 });
      out.push(['Kiemelt föld', fmt(V, 2) + ' m³']);
      if (hom) out.push(['Homok (ágy + takarás)', fmt(hom, 2) + ' m³ ≈ ' + fmt(hom * 1.5, 1) + ' t']);
      if (v.aasas === 'kezi' && V > 6) warn.push('Ennyi földnél érdemes gépi ásással számolni.');
    }
    if (v.pill && nz(v.pdb)) {
      const db = nz(v.pdb);
      if (v.ptip === 'pill') {
        mats.push({ k: 'zsaluko25', q: db * 24 * k }, { k: 'kesz_beton', q: db * 0.3 * k }, { k: 'md_elokeszito_pill', q: db });
        out.push(['Mérőhely-pillér', fmt(db) + ' db (kb. 24 zsalukő + 0,3 m³ beton / db)']);
      } else {
        mats.push({ k: 'falazohabarcs', q: db * 40 * k }, { k: 'md_elokeszito_fulke', q: db });
        out.push(['Falfülke', fmt(db) + ' db']);
      }
    }
    if (!mats.length) warn.push('Kapcsold be, milyen munka kell.');
    warn.push('A gáz-, kémény-, napelem- és mérőhelyi szerelést engedéllyel rendelkező szakember végzi – ez a kalkulátor csak az előtte és utána szükséges kőműves- és segédmunkát számolja.');
    return { out, mats, warn };
  }
},
{
  id: 'berles', g: 'elo', n: 'Állvány, konténer, gépbérlés', i: 'berles',
  desc: 'Homlokzati állvány bérlése és szerelése, konténerek, bérelt gépek napra.',
  fields: [
    H('Állvány'),
    C('allv', 'Homlokzati állvány', false),
    F('aA', 'Állványozott felület', 'm²', 100, { show: v => v.allv, help: 'Homlokzat hossza × magassága' }),
    F('ah', 'Bérleti idő', 'hét', 3, { show: v => v.allv }),
    C('aszer', 'Fel- és leszerelés (saját emberekkel)', true, { show: v => v.allv }),
    H('Konténer'),
    F('k4', 'Konténer 4 m³', 'db', 0),
    F('k6', 'Konténer 6 m³', 'db', 0),
    F('k8', 'Konténer 8 m³', 'db', 0),
    H('Gépbérlés (nap)'),
    F('g_kotro', 'Minikotró (gépkezelővel)', 'nap', 0),
    F('g_vibro', 'Lapvibrátor', 'nap', 0),
    F('g_vesogep', 'Bontókalapács, vésőgép', 'nap', 0),
    F('g_horony', 'Falhoronymaró', 'nap', 0),
    F('g_keve', 'Betonkeverő', 'nap', 0),
  ],
  compute(v) {
    const warn = [], out = [], mats = [];
    if (v.allv && nz(v.aA)) {
      mats.push({ k: 'allvany_berles', q: nz(v.aA) * nz(v.ah) });
      out.push(['Állvány', fmt(nz(v.aA)) + ' m² × ' + fmt(nz(v.ah)) + ' hét']);
      if (v.aszer) mats.push({ k: 'md_berles_allv', q: nz(v.aA) });
    }
    for (const m of [4, 6, 8]) if (nz(v['k' + m])) mats.push({ k: 'kontener_' + m, q: nz(v['k' + m]) });
    for (const g of ['kotro', 'vibro', 'vesogep', 'horony', 'keve']) if (nz(v['g_' + g])) mats.push({ k: 'gep_' + g, q: nz(v['g_' + g]) });
    if (!mats.length) warn.push('Add meg, mit bérelsz.');
    return { out, mats, warn };
  }
},
{
  id: 'laminalt', g: 'felulet', n: 'Laminált padló, parketta, vinyl', i: 'laminalt',
  desc: 'Úsztatott padló: burkolat dobozra, alátét, párazáró fólia, szegélyléc, átmeneti profil és munkadíj.',
  fields: [
    SEL('tip', 'Padló', [['lam', 'Laminált'], ['vinyl', 'Vinyl / SPC (kattintós)'], ['parketta', 'Szalagparketta (kész)']], 'lam'),
    F('Lh', 'Helyiség hossza', 'm', 4),
    F('Ls', 'Helyiség szélessége', 'm', 3),
    F('ajto', 'Ajtók szélessége összesen', 'm', 0.9, { help: 'A szegélylécből levonja', nyHelp: 'ajto' }),
    SEL('fekt', 'Fektetés', [['egyenes', 'Egyenes (≈7%)'], ['atlos', 'Átlós (≈12%)'], ['halszalka', 'Halszálka (≈15%)']], 'egyenes'),
    F('doboz', 'Doboz tartalma', 'm²', 2.2, { help: 'A dobozon szerepel' }),
    C('alatet', 'Alátét', true, { help: 'Integrált alátétes vinylnél kapcsold ki' }),
    C('para', 'Párazáró fólia (beton aljzatra)', true),
    C('szeg', 'Szegélyléc', true),
    F('atm', 'Átmeneti profil (ajtóknál)', 'db', 1),
  ],
  compute(v) {
    const warn = [], out = [], mats = [];
    const A = nz(v.Lh) * nz(v.Ls), per = 2 * (nz(v.Lh) + nz(v.Ls));
    const rah = { egyenes: 0.07, atlos: 0.12, halszalka: 0.15 }[v.fekt] || 0.07;
    const kulcs = { lam: 'laminalt_lap', vinyl: 'vinyl_lap', parketta: 'parketta_lap' }[v.tip] || 'laminalt_lap';
    const Ab = A * (1 + rah), dob = nz(v.doboz) ? Math.ceil(Ab / nz(v.doboz)) : 0;
    out.push(['Alapterület', fmt(A, 2) + ' m²']);
    out.push(['Burkolat ráhagyással', fmt(Ab, 2) + ' m²' + (dob ? ' = ' + dob + ' doboz' : '')]);
    if (A) mats.push({ k: kulcs, q: dob ? dob * nz(v.doboz) : Ab });
    if (v.alatet && A) mats.push({ k: 'lam_alatet', q: A * 1.05 });
    if (v.para && A) mats.push({ k: 'parazaro', q: A * 1.15 });
    const szl = Math.max(0, per - nz(v.ajto)) * 1.08;
    if (v.szeg && szl) { mats.push({ k: 'szegelyleck', q: szl }); out.push(['Szegélyléc', fmt(szl, 1) + ' fm']); }
    if (nz(v.atm)) mats.push({ k: 'atmeneti_profil', q: nz(v.atm) });
    if (v.mdOn !== false && v.szeg && szl) mats.push({ k: 'md_laminalt_szegely', q: r2(szl) });
    if (v.tip === 'vinyl' && v.alatet) warn.push('Sok vinyl / SPC padló integrált alátéttel készül – ilyenkor kapcsold ki az alátétet.');
    warn.push('Az aljzat síkhibája 2 m-en legfeljebb 2–3 mm lehet – ha nagyobb, kérj aljzatkiegyenlítést a Részmunkák közül.');
    return { out, mats, warn };
  }
},
{
  id: 'nyilaszaro', g: 'szerk', n: 'Nyílászáró beépítése, cseréje', i: 'nyilaszaro',
  desc: 'Ablakok, erkély- és bejárati ajtók, beltéri ajtók beépítése: PUR hab, tömítőszalag, rögzítés, párkány, kávajavítás és munkadíj.',
  fields: [
    SEL('mod', 'Munka', [['csere', 'Csere (a régi bontásával)'], ['uj', 'Új beépítés (kész nyílásba)']], 'csere'),
    H('Darabszámok'),
    F('ablak', 'Ablak', 'db', 2),
    F('aw', 'Ablak átlagos szélessége', 'm', 1.2, { show: v => nz(v.ablak) > 0 }),
    F('ah', 'Ablak átlagos magassága', 'm', 1.4, { show: v => nz(v.ablak) > 0 }),
    F('erkely', 'Erkélyajtó / teraszajtó', 'db', 0),
    F('bejarati', 'Bejárati ajtó', 'db', 0),
    F('belt', 'Beltéri ajtó (tokkal)', 'db', 0),
    H('Kiegészítők'),
    C('tomit', 'Kültéri-beltéri tömítőszalag (RAL szerinti beépítés)', true),
    C('bpark', 'Belső párkány', true, { show: v => nz(v.ablak) > 0 }),
    C('kpark', 'Külső párkány (alumínium)', false, { show: v => nz(v.ablak) > 0 }),
    C('kava', 'Kávajavítás (vakolás, glettelés)', true, { show: v => v.mod === 'csere' }),
  ],
  compute(v) {
    const warn = [], out = [], mats = [], md = v.mdOn !== false;
    const ab = nz(v.ablak), er = nz(v.erkely), be = nz(v.bejarati), bl = nz(v.belt);
    const aw = nz(v.aw), ah = nz(v.ah);
    // kerületek (fm): ablak a valós méretből, erkélyajtó ~0,9×2,2, bejárati ~1,0×2,1
    const kerK = ab * 2 * (aw + ah) + er * 2 * (0.9 + 2.2) + be * (1.0 + 2 * 2.1); // kültéri nyílászárók (bejáratinál küszöb nélkül)
    const kerB = bl * (0.9 + 2 * 2.1);
    const db = ab + er + be + bl;
    out.push(['Nyílászáró', fmt(db) + ' db' + (db ? ' (' + [ab && ab + ' ablak', er && er + ' erkélyajtó', be && be + ' bejárati', bl && bl + ' beltéri'].filter(Boolean).join(', ') + ')' : '')]);
    if (kerK + kerB) mats.push({ k: 'pur_hab', q: Math.ceil((kerK + kerB) / 6) });
    if (ab + er + be) mats.push({ k: 'nyil_rogzito', q: (ab + er + be) * 8 });
    if (v.tomit && kerK) { mats.push({ k: 'tomitoszalag', q: kerK * 2 * 1.05 }); out.push(['Tömítőszalag (kint + bent)', fmt(kerK * 2, 1) + ' fm']); }
    if (v.bpark && ab) { mats.push({ k: 'belso_parkany', q: ab * (aw + 0.1) }); if (md) mats.push({ k: 'md_nyilaszaro_park', q: r2(ab * (aw + 0.1)) }); }
    if (v.kpark && ab) { mats.push({ k: 'kulso_parkany', q: ab * (aw + 0.1) }); if (md) mats.push({ k: 'md_nyilaszaro_park', q: r2(ab * (aw + 0.1)) }); }
    if (md) {
      if (ab) mats.push({ k: 'md_nyilaszaro_ablak', q: ab });
      if (er) mats.push({ k: 'md_nyilaszaro_erkely', q: er });
      if (be) mats.push({ k: 'md_nyilaszaro_bejarati', q: be });
      if (bl) mats.push({ k: 'md_nyilaszaro_belt', q: bl });
      if (v.mod === 'csere' && db) mats.push({ k: 'md_nyilaszaro_bontas', q: db });
    }
    if (v.mod === 'csere' && v.kava && kerK + kerB) {
      const kv = kerK + kerB;
      mats.push({ k: 'vakolat', q: kv * 2.5 }, { k: 'glett', q: kv * 0.6 });
      if (md) mats.push({ k: 'md_nyilaszaro_kava', q: r2(kv) });
      out.push(['Kávajavítás', fmt(kv, 1) + ' fm']);
    }
    warn.push('A nyílászárók árát a gyártói ajánlat alapján külön tételként vedd fel (Egyéb tétel) – a kalkulátor csak a beépítést és a kiegészítőket számolja.');
    return { out, mats, warn };
  }
},
{
  id: 'butor', g: 'butor', n: 'Bútor összeszerelése, beépítése', i: 'butor',
  desc: 'Konyhabútor folyóméterre, gépek beépítése, lapra szerelt bútorok darabra – rögzítőanyag és munkadíj.',
  fields: [
    H('Konyhabútor'),
    C('konyha', 'Konyhabútor összeszerelése', true),
    F('alsoFm', 'Alsó szekrénysor', 'fm', 3.6, { show: v => v.konyha }),
    F('felsoFm', 'Felső szekrénysor', 'fm', 3, { show: v => v.konyha }),
    F('magas', 'Magas szekrény (hűtő-, sütőkamra)', 'db', 1, { show: v => v.konyha }),
    C('pult', 'Munkalap szabása, rögzítése', true, { show: v => v.konyha, help: 'Hossza az alsó szekrénysorral egyezik' }),
    F('kiv', 'Kivágás a munkalapon (mosogató, főzőlap)', 'db', 2, { show: v => v.konyha && v.pult }),
    C('pultAnyag', 'A munkalapot én szerzem be', false, { show: v => v.konyha && v.pult }),
    H('Gépek beépítése'),
    F('g_fozo', 'Főzőlap', 'db', 0, { help: 'Csak a beépítés – lásd a figyelmeztetést' }),
    F('g_suto', 'Beépíthető sütő', 'db', 0),
    F('g_mosgep', 'Beépíthető mosogatógép (víz, lefolyó bekötéssel)', 'db', 0),
    F('g_huto', 'Beépíthető hűtő (front ajtóval)', 'db', 0),
    F('g_para', 'Páraelszívó (kivezetéssel)', 'db', 0),
    F('g_mikro', 'Beépíthető mikró', 'db', 0),
    F('g_mosogato', 'Mosogató + csaptelep bekötése', 'db', 0),
    H('Lapra szerelt bútorok'),
    F('szekreny', 'Ruhásszekrény, gardrób (nyílóajtós)', 'db', 0),
    F('tolo', 'Tolóajtós szekrény', 'db', 0),
    F('komod', 'Komód, fiókos elem', 'db', 0),
    F('agy', 'Ágy', 'db', 0),
    F('asztal', 'Asztal', 'db', 0),
    F('szek', 'Szék', 'db', 0),
    F('polc', 'Polc, könyvespolc', 'db', 0),
    F('tv', 'TV-szekrény, alacsony elem', 'db', 0),
    F('furdo', 'Fürdőszobabútor (mosdószekrény, tükrös szekrény)', 'db', 0),
    C('falrog', 'Magas bútorok falhoz rögzítése (billenésgátló)', true),
  ],
  compute(v) {
    const warn = [], out = [], mats = [];
    let rogzito = 0;
    if (v.konyha) {
      const a = nz(v.alsoFm), f = nz(v.felsoFm), m = nz(v.magas);
      if (a) mats.push({ k: 'md_butor_also', q: a });
      if (f) mats.push({ k: 'md_butor_felso', q: f });
      if (m) mats.push({ k: 'md_butor_magas', q: m });
      rogzito += Math.ceil(f / 0.6) * 2 + m * 2 + Math.ceil(a / 0.6);
      out.push(['Konyhabútor', fmt(a, 1) + ' fm alsó + ' + fmt(f, 1) + ' fm felső' + (m ? ' + ' + fmt(m) + ' magas szekrény' : '')]);
      if (v.pult && a) {
        mats.push({ k: 'md_butor_pult', q: a }, { k: 'pultzaro', q: a });
        if (v.pultAnyag) mats.push({ k: 'munkalap', q: a });
        if (nz(v.kiv)) mats.push({ k: 'md_butor_kivag', q: nz(v.kiv) });
        out.push(['Munkalap', fmt(a, 1) + ' fm' + (nz(v.kiv) ? ', ' + fmt(nz(v.kiv)) + ' kivágással' : '')]);
      }
    }
    const gepek = [['g_fozo', 'md_butor_fozo'], ['g_suto', 'md_butor_suto'], ['g_mosgep', 'md_butor_mosgep'], ['g_huto', 'md_butor_huto'], ['g_para', 'md_butor_para'], ['g_mikro', 'md_butor_mikro'], ['g_mosogato', 'md_butor_mosogato']];
    let gdb = 0; for (const [f, k] of gepek) if (nz(v[f])) { mats.push({ k, q: nz(v[f]) }); gdb += nz(v[f]); }
    if (gdb) out.push(['Beépített gép', fmt(gdb) + ' db']);
    // szilikon folyóméterben: a munkalap fali csatlakozása + mosogatónként kb. 2,5 fm
    const szil = (v.konyha && v.pult ? nz(v.alsoFm) : 0) + nz(v.g_mosogato) * 2.5;
    if (szil) mats.push({ k: 'szilikon', q: szil });
    const lapra = [['szekreny', 'md_butor_szekreny', true], ['tolo', 'md_butor_tolo', true], ['komod', 'md_butor_komod', true], ['agy', 'md_butor_agy'], ['asztal', 'md_butor_asztal'], ['szek', 'md_butor_szek'], ['polc', 'md_butor_polc', true], ['tv', 'md_butor_tv'], ['furdo', 'md_butor_furdo', true]];
    let ldb = 0, magasDb = 0;
    for (const [f, k, magas] of lapra) if (nz(v[f])) { mats.push({ k, q: nz(v[f]) }); ldb += nz(v[f]); if (magas) magasDb += nz(v[f]); }
    if (ldb) out.push(['Lapra szerelt bútor', fmt(ldb) + ' db']);
    if (v.falrog && magasDb) { mats.push({ k: 'md_butor_falrog', q: magasDb }); rogzito += magasDb * 2; }
    if (rogzito) mats.push({ k: 'butor_rogzito', q: rogzito });
    if (nz(v.g_fozo)) warn.push('Gázfőzőlap bekötése gázszerelői, háromfázisú főzőlapé villanyszerelői feladat – a kalkulátor csak a beépítést számolja.');
    if (!mats.length) warn.push('Add meg, mit kell összeszerelni.');
    warn.push('A bútor és a gépek árát nem számolja – azokat a megrendelő hozza, vagy külön tételként veszed fel.');
    return { out, mats, warn };
  }
},
];

const CALC_BY_ID = Object.fromEntries(CALCS.map(c => [c.id, c]));

// Munkadíj: alapértelmezett díjtétel és a munka mennyisége (mq) minden kalkulátorhoz
function betonVol(v) {
  if (v.alak === 'lemez') return nz(v.Lh) * nz(v.Ls) * nz(v.vast) / 100;
  if (v.alak === 'sav') return nz(v.Lh) * nz(v.sz) / 100 * nz(v.mely) / 100;
  if (v.alak === 'pill') return nz(v.a) / 100 * nz(v.b) / 100 * nz(v.h) / 100 * nz(v.db);
  if (v.alak === 'kor') return Math.PI * Math.pow(nz(v.d) / 200, 2) * nz(v.h) / 100 * nz(v.db);
  return nz(v.V);
}
const wallA = (v) => areaOf(v, 'wall').net;
const MUNKA = {
  beton: ['md_beton', v => [betonVol(v), 'm³']],
  esztrich: ['md_esztrich', v => [areaOf(v, 'floor').net, 'm²']],
  falazas: ['md_falazas', v => [wallA(v), 'm²']],
  zsaluko: ['md_zsaluko', v => [wallA(v), 'm²']],
  vakolas: ['md_vakolas', v => [wallA(v) + kavaArea(v), 'm²']],
  festes: ['md_festes', v => [(v.gl || v.alap || v.fest) ? Math.max(0, areaOf(v, 'room').net - csempeSav(v)) + kavaArea(v) : 0, 'm²']], // ha csak részmunka kell (pl. ajtómázolás), a fő munka 0
  gipszkarton: ['md_gipszkarton', v => [v.tip === 'am' ? nz(v.Lh) * nz(v.Ls) : Math.max(0, nz(v.L) * nz(v.Hm) - nz(v.ny)), 'm²']],
  burkolas: ['md_burkolas', v => [v.hol === 'padlo' ? nz(v.Lh) * nz(v.Ls) : v.hol === 'fal' ? Math.max(0, 2 * (nz(v.Lh) + nz(v.Ls)) * nz(v.Hm) - nz(v.ny)) : nz(v.A), 'm²']],
  vizszig: ['md_vizszig', v => [wallA(v), 'm²']],
  homlokzat: ['md_homlokzat', v => [wallA(v), 'm²']],
  fodem: ['md_fodem', v => [areaOf(v, 'floor').net, 'm²']],
  teto: ['md_teto', v => [Math.max(0, (v.am === 'm2' ? nz(v.A) : nz(v.Av) / Math.cos(nz(v.fok) * Math.PI / 180)) - nz(v.tny)), 'm²']],
  eresz: ['md_eresz', v => [nz(v.L), 'fm']],
  terko: ['md_terko', v => [areaOf(v, 'floor').net, 'm²']],
  omlesztett: ['md_teritese', v => [areaOf(v, 'floor').net, 'm²']],
  kerites: ['md_kerites', v => [nz(v.L), 'fm']],
  deszka: ['md_deszka', v => [Math.max(0, nz(v.L) * nz(v.Hm) - nz(v.ny)), 'm²']],
  terasz: ['md_terasz', v => [nz(v.Lh) * nz(v.Ls), 'm²']],
  villany: ['md_villany_pont', v => [v.mod === 'csere' ? 0 : nz(v.dug) + nz(v.kap) + nz(v.lam) + nz(v.gyenge), 'db']],
  viz: ['md_viz_pont', v => [v.mod === 'csere' ? 0 : nz(v.mosdo) + nz(v.wc) + nz(v.zuhany) + nz(v.kad) + nz(v.mosogato) + nz(v.gep), 'db']],
  futes: ['md_futes_rad', v => [nz(v.rad), 'db']],
  padlofutes: ['md_padlofutes', v => [nz(v.A), 'm²']],
  laminalt: ['md_laminalt', v => [nz(v.Lh) * nz(v.Ls), 'm²']],
};
// villanyszerelés: falhorony / kábelcsatorna útvonala (a közös szakaszok miatt a kábelhossz kb. 70%-a)
// víz/fűtés: vésendő horony hossza (a közös szakaszok miatt a csőhossz kb. 60%-a)
function gepUtvonal(v) {
  if (v.mod !== 'vesett') return 0;
  if (v.rad !== undefined && v.mosdo === undefined) return nz(v.rad) * nz(v.vh) * 0.6;
  const kiall = (nz(v.mosdo) + nz(v.zuhany) + nz(v.kad) + nz(v.mosogato)) * 2 + nz(v.wc) + nz(v.gep);
  return kiall * nz(v.vh) * 0.6;
}
function villanyUtvonal(v) { return v.mod === 'csere' ? 0 : (nz(v.dug) + nz(v.kap) + nz(v.lam) + nz(v.gyenge) + nz(v.kor) * 2) * nz(v.vh) * 0.7; }
for (const id in MUNKA) { CALC_BY_ID[id].md = MUNKA[id][0]; CALC_BY_ID[id].mq = MUNKA[id][1]; }

/* ---------- Részmunkák ----------
   Minden kalkulátorhoz a szokásos, külön is kérhető részmunkák (a megrendelő gyakran csak egy részét kéri).
   t: 'c' = kapcsoló, a mennyiséget a kalkulációból veszi (q(v), alapból a fő munka mennyisége)
   t: 'n' = darab / fm / m² beírása
   mats: [anyagkulcs, mennyiség egységenként] – a részmunkához tartozó anyag is bekerül az anyaglistába */
const RSZ = (id, n, u, p, t, extra) => Object.assign({ id, n, u, p, t }, extra || {});
const festFal = (v) => { const ar = areaOf(v, 'room'); return Math.max(0, (ar.walls || 0) - csempeSav(v, ar)); };
const festA = (v) => Math.max(0, areaOf(v, 'room').net - csempeSav(v)) + kavaArea(v);
const festPadlo = (v) => v.am === 'hel' ? nz(v.Lh) * nz(v.Ls) : 0;
const RESZ = {
  festes: [
    RSZ('takaras', 'Takarás, bútormozgatás', 'm²', 400, 'c', { q: festPadlo, help: 'A padló területe – fólia és festőszalag is', mats: [['takaro', 1]] }),
    RSZ('kaparas', 'Régi festék kaparása, felület lemosása', 'm²', 1200, 'c', { q: festA }),
    RSZ('tapeta', 'Régi tapéta eltávolítása', 'm²', 1500, 'c', { q: festFal, help: 'Csak a falfelület, mennyezet nélkül' }),
    RSZ('javitas', 'Repedések, lyukak javítása', 'fm', 1500, 'n', { mats: [['glett', 0.4]] }),
    RSZ('penesz', 'Penészmentesítés', 'm²', 1500, 'n', { mats: [['penesz', 0.15]] }),
    RSZ('ajto', 'Ajtó + tok mázolása (mindkét oldal)', 'db', 15000, 'n', { mats: [['zomanc', 0.9], ['zomanc_alap', 0.45]] }),
    RSZ('tok', 'Csak ajtótok mázolása', 'db', 7000, 'n', { mats: [['zomanc', 0.3], ['zomanc_alap', 0.15]] }),
    RSZ('ablak', 'Ablak + keret mázolása', 'db', 15000, 'n', { help: 'Közepes, kb. 120×120 cm-es ablak', mats: [['zomanc', 0.5], ['zomanc_alap', 0.25]] }),
    RSZ('radiator', 'Radiátor festése', 'db', 12000, 'n', { mats: [['radiator_festek', 0.6]] }),
    RSZ('radle', 'Radiátor le- és visszaszerelése', 'db', 5000, 'n', { help: 'Hogy a mögötte lévő fal is festhető legyen' }),
    RSZ('cso', 'Fűtéscső festése', 'fm', 800, 'n', { mats: [['radiator_festek', 0.02]] }),
    RSZ('lec', 'Szegélyléc, lábazati léc festése', 'fm', 1000, 'n', { mats: [['zomanc', 0.03]] }),
  ],
  burkolas: [
    RSZ('bontas', 'Régi burkolat bontása', 'm²', 3000, 'c', { md: 'md_bontas' }),
    RSZ('kiegy', 'Aljzat- vagy falkiegyenlítés', 'm²', 3000, 'c'),
    RSZ('alapoz', 'Mélyalapozás', 'm²', 800, 'c', { mats: [['mely_alapozo', 0.125]] }),
    RSZ('vszig', 'Kenhető vízszigetelés (2 réteg)', 'm²', 3500, 'n', { mats: [['kenheto_szig', 1.5]] }),
    RSZ('hajlat', 'Hajlaterősítő szalag beépítése', 'fm', 1300, 'n', { mats: [['hajlat_szalag', 1]] }),
    RSZ('elvedo', 'Élvédő, díszcsík, bordűr rakása', 'fm', 2500, 'n'),
    RSZ('labazat', 'Lábazat burkolása', 'fm', 3000, 'n'),
    RSZ('szilikon', 'Szilikonozás', 'fm', 900, 'n', { mats: [['szilikon', 1]] }),
    RSZ('fugazas', 'Régi burkolat újrafugázása', 'm²', 2000, 'n', { mats: [['fugazo', 0.5]] }),
    RSZ('folyoka', 'Zuhanyfolyóka beépítése', 'db', 20000, 'n'),
    RSZ('sitt', 'Sitt elszállítása', 'alkalom', 60000, 'n', { md: 'md_sitt' }),
  ],
  vakolas: [
    RSZ('leveres', 'Régi vakolat leverése', 'm²', 2500, 'c'),
    RSZ('elokeszit', 'Felület előkészítése, gúzolás', 'm²', 1200, 'c'),
    RSZ('elvedo', 'Élvédő beépítése', 'fm', 800, 'n'),
    RSZ('javit', 'Javítóvakolás foltokban', 'm²', 6000, 'n', { mats: [['vakolat', 15]] }),
    RSZ('kava', 'Ablak-, ajtókáva vakolása', 'fm', 3000, 'n', { mats: [['vakolat', 6]] }),
    RSZ('sitt', 'Sitt elszállítása', 'alkalom', 60000, 'n', { md: 'md_sitt' }),
  ],
  gipszkarton: [
    RSZ('gyapot', 'Hang-/hőszigetelő gyapot beépítése', 'm²', 1500, 'c'),
    RSZ('glett', 'Hézagolás, teljes felületű glettelés', 'm²', 2500, 'c'),
    RSZ('ajto', 'Ajtónyílás kialakítása (UA profillal)', 'db', 20000, 'n'),
    RSZ('kava', 'Ablakkáva burkolása gipszkartonnal', 'fm', 7000, 'n'),
    RSZ('revizio', 'Revíziós ajtó beépítése', 'db', 8000, 'n'),
    RSZ('spot', 'Spotlámpa-kivágás', 'db', 1500, 'n'),
  ],
  vizszig: [
    RSZ('elokeszit', 'Felület előkészítése, tisztítása', 'm²', 800, 'c'),
    RSZ('hajlat', 'Hajlaterősítés, sarokkiképzés', 'fm', 1300, 'n', { mats: [['hajlat_szalag', 1]] }),
    RSZ('vedo', 'Védőréteg (pl. dombornyomott lemez)', 'm²', 2000, 'n'),
  ],
  homlokzat: [
    RSZ('allvany', 'Állványozás', 'm²', 1500, 'c'),
    RSZ('elokeszit', 'Felület előkészítése (mosás, javítás)', 'm²', 1000, 'c'),
    RSZ('labszig', 'Lábazat XPS szigetelése', 'm²', 9000, 'n'),
    RSZ('parkany', 'Ablakpárkány beépítése', 'fm', 5000, 'n'),
    RSZ('leszer', 'Homlokzati elemek le- és visszaszerelése', 'db', 5000, 'n', { help: 'Lámpa, csengő, lefolyócső-bilincs, klíma kültéri egység stb.' }),
    RSZ('csakszin', 'Csak színezés (régi szigetelésen)', 'm²', 3500, 'n', { mats: [['vakolat_alapozo', 0.25], ['szinvakolat', 2.5]] }),
  ],
  fodem: [
    RSZ('takarit', 'Padlás kitakarítása', 'm²', 500, 'c'),
    RSZ('parazaro', 'Párazáró fólia terítése', 'm²', 400, 'c', { mats: [['parazaro', 1.1]] }),
    RSZ('pallo', 'Járható pallósor készítése', 'fm', 4000, 'n'),
  ],
  teto: [
    RSZ('bontas', 'Régi fedés bontása', 'm²', 2500, 'c'),
    RSZ('lecezes', 'Lécezés, ellenlécezés cseréje', 'm²', 2500, 'c'),
    RSZ('folia', 'Tetőfólia fektetése', 'm²', 800, 'c'),
    RSZ('gerinc', 'Gerinc, élgerinc rakása', 'fm', 3500, 'n'),
    RSZ('badog', 'Bádogozás (kémény, vápa, szegély)', 'fm', 6000, 'n'),
    RSZ('tetoablak', 'Tetőablak beépítése', 'db', 45000, 'n'),
    RSZ('hofogo', 'Hófogó szerelése', 'fm', 2500, 'n'),
    RSZ('javitas', 'Tetőjavítás, cserépcsere (beázás)', 'óra', 8000, 'n'),
    RSZ('sitt', 'Sitt elszállítása', 'alkalom', 60000, 'n', { md: 'md_sitt' }),
  ],
  eresz: [
    RSZ('bontas', 'Régi csatorna bontása', 'fm', 800, 'c'),
    RSZ('tisztitas', 'Csatornatisztítás', 'fm', 800, 'n'),
    RSZ('lomb', 'Lombfogó háló szerelése', 'fm', 1500, 'n'),
  ],
  terko: [
    RSZ('bontas', 'Régi burkolat bontása', 'm²', 3000, 'c', { md: 'md_bontas' }),
    RSZ('tukor', 'Földkiemelés, tükörkészítés', 'm²', 3000, 'c', { md: 'md_foldkiemeles' }),
    RSZ('alap', 'Alapréteg terítése, tömörítése', 'm²', 2500, 'c'),
    RSZ('szegely', 'Szegélykő beépítése betonágyba', 'fm', 3000, 'n'),
    RSZ('folyoka', 'Vízelvezető folyóka beépítése', 'fm', 6000, 'n'),
    RSZ('sitt', 'Föld, sitt elszállítása', 'alkalom', 60000, 'n', { md: 'md_sitt' }),
  ],
  omlesztett: [
    RSZ('gyom', 'Gyomtalanítás, terület előkészítése', 'm²', 300, 'c'),
    RSZ('geotex', 'Geotextília terítése', 'm²', 400, 'c', { mats: [['geotextil', 1.1]] }),
    RSZ('szegely', 'Szegély beépítése', 'fm', 3000, 'n'),
  ],
  kerites: [
    RSZ('bontas', 'Régi kerítés bontása', 'fm', 3000, 'c'),
    RSZ('oszlop', 'Oszlopok alapozása, betonozása', 'db', 6000, 'n'),
    RSZ('kapu', 'Kapu beépítése', 'db', 40000, 'n'),
    RSZ('festes', 'Kerítés festése, lazúrozása', 'm²', 2500, 'n', { mats: [['lazur', 0.25]] }),
  ],
  deszka: [
    RSZ('lecvaz', 'Lécváz készítése', 'm²', 2500, 'c'),
    RSZ('lazur', 'Felületkezelés (2 réteg lazúr)', 'm²', 2000, 'c', { mats: [['lazur', 0.2]] }),
    RSZ('szegely', 'Szegély-, sarokléc felrakása', 'fm', 1200, 'n'),
  ],
  terasz: [
    RSZ('vaz', 'Alépítmény, tartóváz készítése', 'm²', 6000, 'c'),
    RSZ('olaj', 'Olajozás, felületkezelés', 'm²', 1800, 'c', { mats: [['teraszolaj', 0.12]] }),
    RSZ('lepcso', 'Lépcső készítése', 'fok', 15000, 'n'),
    RSZ('korlat', 'Korlát szerelése', 'fm', 12000, 'n'),
  ],
  beton: [
    RSZ('zsalu', 'Zsaluzás', 'm²', 4000, 'n'),
    RSZ('vas', 'Vasszerelés', 'kg', 150, 'n'),
    RSZ('pumpa', 'Betonpumpa', 'alkalom', 70000, 'n'),
  ],
  esztrich: [
    RSZ('lepeshang', 'Lépéshang-szigetelés terítése', 'm²', 800, 'c'),
    RSZ('perem', 'Peremszigetelő szalag', 'fm', 300, 'n', { mats: [['peremszalag', 1]] }),
    RSZ('bontas', 'Régi aljzat bontása', 'm²', 3000, 'c', { md: 'md_bontas' }),
  ],
  falazas: [
    RSZ('athidalo', 'Áthidaló elhelyezése', 'db', 6000, 'n'),
    RSZ('koszoru', 'Koszorú zsaluzása, betonozása', 'fm', 12000, 'n'),
    RSZ('falszig', 'Vízszintes falszigetelés', 'fm', 1500, 'n'),
    RSZ('bontas', 'Falbontás', 'm²', 6000, 'n'),
  ],
  viz: [
    RSZ('bontas', 'Régi csövek, szerelvények bontása', 'db', 4000, 'n', { help: 'Vételi helyenként' }),
    RSZ('javitas', 'Falhornyok visszajavítása', 'fm', 1500, 'c', { q: v => Math.round(gepUtvonal(v) * 10) / 10, mats: [['gyorsgipsz', 0.8]] }),
    RSZ('mosdo', 'Mosdó + csaptelep felszerelése', 'db', 18000, 'n'),
    RSZ('wc', 'WC (álló) felszerelése', 'db', 20000, 'n'),
    RSZ('wckeret', 'Beépített WC-tartály (szerelőkeret) + WC', 'db', 45000, 'n'),
    RSZ('zuhanytalca', 'Zuhanytálca beépítése', 'db', 25000, 'n'),
    RSZ('kad', 'Kád beépítése', 'db', 35000, 'n'),
    RSZ('csaptelep', 'Csaptelep cseréje', 'db', 9000, 'n'),
    RSZ('mosogato', 'Mosogató bekötése', 'db', 15000, 'n'),
    RSZ('gep', 'Mosógép / mosogatógép bekötése', 'db', 8000, 'n'),
    RSZ('bojler', 'Villanybojler felszerelése', 'db', 25000, 'n'),
    RSZ('foelzaro', 'Főelzáró cseréje', 'db', 15000, 'n'),
    RSZ('dugulas', 'Duguláselhárítás', 'óra', 12000, 'n'),
  ],
  futes: [
    RSZ('bontas', 'Régi radiátorok, csövek bontása', 'db', 6000, 'n', { help: 'Radiátoronként' }),
    RSZ('javitas', 'Hornyok visszajavítása', 'fm', 1500, 'c', { q: v => Math.round(gepUtvonal(v) * 10) / 10, mats: [['gyorsgipsz', 0.8]] }),
    RSZ('kazan', 'Kazán beépítése, bekötése', 'db', 120000, 'n', { help: 'A kémény / égéstermék-elvezetés és a gázszerelés nélkül' }),
    RSZ('mosatas', 'Fűtési rendszer mosatása, inhibitorozás', 'alkalom', 45000, 'n'),
    RSZ('termosztat', 'Szobatermosztát felszerelése', 'db', 12000, 'n'),
    RSZ('fejcsere', 'Termosztatikus fej cseréje', 'db', 3000, 'n'),
    RSZ('beszab', 'Beszabályozás, légtelenítés', 'óra', 10000, 'n'),
  ],
  butor: [
    RSZ('felhord', 'Kiszállítás, felhordás emeletre', 'alkalom', 10000, 'n'),
    RSZ('regi', 'Régi bútor bontása, elszállítása', 'db', 6000, 'n'),
    RSZ('csomag', 'Csomagolóanyag elszállítása', 'alkalom', 5000, 'n'),
    RSZ('fogantyu', 'Fogantyúk felszerelése', 'db', 500, 'n'),
    RSZ('led', 'LED pultmegvilágítás felszerelése', 'fm', 5000, 'n'),
    RSZ('hatfal', 'Konyhai hátfal (üveg, panel) felszerelése', 'm²', 9000, 'n'),
    RSZ('atszerel', 'Bútor átszerelése, átrendezése', 'óra', 8000, 'n'),
  ],
  bontas: [
    RSZ('takaras', 'Takarás, porvédelem', 'm²', 500, 'n', { mats: [['takaro', 1]] }),
    RSZ('levalaszt', 'Víz, villany leválasztása a bontás előtt', 'alkalom', 15000, 'n'),
    RSZ('athidalo', 'Áthidaló beépítése (falnyitásnál)', 'db', 45000, 'n', { help: 'Csak statikus terv alapján' }),
    RSZ('takarit', 'Takarítás a bontás után', 'm²', 600, 'n'),
  ],
  foldmunka: [
    RSZ('humusz', 'Humusz leszedése (kb. 20 cm)', 'm²', 1500, 'n'),
    RSZ('planir', 'Tereprendezés, planírozás', 'm²', 1200, 'n'),
    RSZ('talajcsere', 'Talajcsere zúzottkővel, tömörítve', 'm³', 9000, 'n', { mats: [['zuzottko', 1.8]] }),
    RSZ('tusko', 'Tuskó, gyökérzet eltávolítása', 'db', 15000, 'n'),
    RSZ('kituzes', 'Kitűzés', 'alkalom', 15000, 'n'),
  ],
  laminalt: [
    RSZ('regi', 'Régi padló felszedése', 'm²', 1200, 'c', { q: v => r2(nz(v.Lh) * nz(v.Ls)) }),
    RSZ('kiegy', 'Aljzatkiegyenlítés (önterülő, kb. 3 mm)', 'm²', 2500, 'n', { mats: [['onterulo', 5], ['mely_alapozo', 0.15]] }),
    RSZ('alavag', 'Ajtótok alávágása', 'db', 3000, 'n'),
    RSZ('butor', 'Bútormozgatás', 'alkalom', 10000, 'n'),
    RSZ('lepcso', 'Lépcsőfok burkolása', 'fok', 9000, 'n'),
  ],
  nyilaszaro: [
    RSZ('elsz', 'Régi nyílászárók elszállítása', 'db', 3000, 'n'),
    RSZ('redony', 'Redőny felszerelése', 'db', 15000, 'n'),
    RSZ('szunyog', 'Szúnyogháló felszerelése', 'db', 4000, 'n'),
    RSZ('kuszob', 'Küszöb beépítése', 'db', 6000, 'n'),
    RSZ('beallit', 'Beállítás, karbantartás (meglévő)', 'db', 5000, 'n'),
  ],
  elokeszito: [
    RSZ('klima', 'Klíma előkészítése: falátfúrás, kondenzvíz-elvezetés', 'db', 18000, 'n', { help: 'A klíma bekötését F-gáz képesítéssel rendelkező szerelő végzi' }),
    RSZ('klimacso', 'Klímacső nyomvonala kábelcsatornával', 'fm', 2500, 'n', { mats: [['kabelcsatorna', 1]] }),
    RSZ('kazanhely', 'Kazán helyének előkészítése (víz-, kondenz-, villanykiállás)', 'db', 35000, 'n'),
    RSZ('burkolat', 'Burkolat bontása és visszarakása a nyomvonalon', 'm²', 9000, 'n'),
    RSZ('cserep', 'Tetőfedés megbontása és visszarakása', 'm²', 6000, 'n', { help: 'Pl. napelem tartóinál' }),
    RSZ('kemenytest', 'Kéménytest falazása, javítása', 'fm', 18000, 'n', { help: 'Magasság szerint' }),
    RSZ('korona', 'Kéménykorona készítése', 'db', 25000, 'n'),
    RSZ('akna', 'Akna elhelyezése (víz, csatorna)', 'db', 20000, 'n'),
    RSZ('terko', 'Térkő, járda helyreállítása', 'm²', 8000, 'n'),
    RSZ('inverter', 'Inverter / szekrény helyének előkészítése', 'db', 15000, 'n'),
  ],
  padlofutes: [
    RSZ('bontas', 'Régi burkolat, aljzat bontása', 'm²', 3500, 'c', { q: v => nz(v.A) }),
    RSZ('termosztat', 'Helyiségtermosztát + szelepmozgató', 'db', 22000, 'n'),
    RSZ('szivattyu', 'Keverőszelep / szivattyús egység beépítése', 'db', 45000, 'n'),
    RSZ('beszab', 'Beszabályozás, felfűtési protokoll', 'alkalom', 15000, 'n'),
  ],
  villany: [
    RSZ('bontas', 'Régi vezeték, szerelvények bontása', 'db', 1500, 'n', { help: 'Pontonként' }),
    RSZ('javitas', 'Falhornyok visszajavítása (gipszelés)', 'fm', 1200, 'c', { q: v => v.mod === 'vesett' ? Math.round(villanyUtvonal(v) * 10) / 10 : 0, mats: [['gyorsgipsz', 0.6]] }),
    RSZ('lampa', 'Lámpatest felszerelése', 'db', 6000, 'n'),
    RSZ('spot', 'Spotlámpa beépítése', 'db', 4000, 'n'),
    RSZ('lampacsere', 'Lámpacsere (meglévő helyre)', 'db', 5000, 'n'),
    RSZ('kulter', 'Kültéri, vízvédett dugalj (IP44)', 'db', 9000, 'n'),
    RSZ('mozgas', 'Mozgásérzékelő felszerelése', 'db', 8000, 'n'),
    RSZ('csengo', 'Csengő, kaputelefon bekötése', 'db', 12000, 'n'),
    RSZ('hiba', 'Hibakeresés', 'óra', 9000, 'n'),
  ],
  zsaluko: [
    RSZ('vas', 'Vasszerelés', 'kg', 150, 'n'),
    RSZ('szig', 'Talajnedvesség elleni szigetelés', 'm²', 3000, 'n'),
  ],
};
// Új anyagok, amiket a részmunkák használnak
Object.assign(MATERIALS, {
  zomanc:          { n: 'Zománcfesték (fa, fém)', g: 'Vakolat, festés', u: 'l', pack: 0.75, pn: 'doboz (0,75 l)', p: 6000 },
  zomanc_alap:     { n: 'Alapozó festék (fa, fém)', g: 'Vakolat, festés', u: 'l', pack: 0.75, pn: 'doboz (0,75 l)', p: 5000 },
  radiator_festek: { n: 'Radiátorfesték (hőálló)', g: 'Vakolat, festés', u: 'l', pack: 0.75, pn: 'doboz (0,75 l)', p: 6500 },
  takaro:          { n: 'Takarófólia + festőszalag', g: 'Vakolat, festés', u: 'm²', pack: 0, pn: 'm²', p: 150 },
  penesz:          { n: 'Penészgátló oldat', g: 'Vakolat, festés', u: 'l', pack: 1, pn: 'flakon (1 l)', p: 3000 },
  szilikon:        { n: 'Szaniter szilikon', g: 'Burkolás', u: 'fm', pack: 8, pn: 'kartus (≈8 fm)', p: 2500 },
  lazur:           { n: 'Vékonylazúr', g: 'Fa', u: 'l', pack: 2.5, pn: 'kanna (2,5 l)', p: 14000 },
  teraszolaj:      { n: 'Teraszolaj', g: 'Fa', u: 'l', pack: 2.5, pn: 'kanna (2,5 l)', p: 18000 },
});
for (const id in RESZ) {
  const c = CALC_BY_ID[id]; if (!c) continue;
  c.resz = RESZ[id].map(r => {
    r.md = r.md || ('md_' + id + '_' + r.id);
    if (!MATERIALS[r.md]) MATERIALS[r.md] = { n: r.n, g: 'Munkadíj', u: r.u, pack: 0, pn: r.u, p: r.p };
    if (r.t === 'c' && !r.q) r.q = (v) => { try { const m = c.mq(v); return m[1] === r.u ? m[0] : 0; } catch (e) { return 0; } };
    return r;
  });
}
// Munkadíjak alcsoportja az Árlistában (szakmánként)
const SZAKMAK = [
  ['altalanos', 'Általános (óradíj, kiszállás, sitt…)', []],
  ['festes', 'Festés, mázolás', ['festes']],
  ['burkolas', 'Burkolás, padló', ['burkolas', 'laminalt']],
  ['nyilaszaro', 'Nyílászáró', ['nyilaszaro']],
  ['butor', 'Bútor', ['butor']],
  ['bontas', 'Bontás, földmunka', ['bontas', 'foldmunka']],
  ['vakolas', 'Vakolás', ['vakolas']],
  ['gipszkarton', 'Gipszkarton', ['gipszkarton']],
  ['szig', 'Szigetelés (víz, homlokzat, födém)', ['vizszig', 'homlokzat', 'fodem']],
  ['teto', 'Tető, ereszcsatorna', ['teto', 'eresz']],
  ['beton', 'Beton, aljzat, falazás', ['beton', 'esztrich', 'falazas', 'zsaluko']],
  ['kert', 'Kert, térkő, kerítés', ['terko', 'omlesztett', 'kerites']],
  ['fa', 'Fa, terasz', ['deszka', 'terasz']],
  ['villany', 'Villanyszerelés', ['villany']],
  ['viz', 'Víz-, fűtésszerelés', ['viz', 'futes', 'padlofutes']],
  ['elokeszito', 'Előkészítő, segédmunkák, bérlés', ['elokeszito', 'berles']],
  ['sajat', 'Saját munkadíjak', []],
];
function munkaSzakma(k) {
  let calc = null;
  for (const id in MUNKA) if (MUNKA[id][0] === k || k.indexOf('md_' + id + '_') === 0) { calc = id; break; }
  if (!calc) { const cc = CALCS.find(c => k.indexOf('md_' + c.id + '_') === 0); if (cc) calc = cc.id; }
  if (!calc) return MATERIALS[k] ? 'altalanos' : 'sajat';
  const sz = SZAKMAK.find(s => s[2].includes(calc));
  return sz ? sz[0] : 'altalanos';
}
// Részmunkák eredménye: [{ r, q }] – csak a bekapcsolt / kitöltött tételek
function reszOf(c, v) {
  const out = [];
  for (const r of (c.resz || [])) {
    const k = 'rm_' + r.id;
    let q = 0;
    if (r.t === 'c') { if (v[k] === true) { try { q = nz(r.q(v)); } catch (e) { q = 0; } } }
    else q = nz(v[k]);
    q = Math.round(q * 100) / 100;
    if (q > 0) out.push({ r, q });
  }
  return out;
}

/* ---------- Helyiségek ----------
   Helyiség: { id, nev, L, W, H (m), nyl: [nyílások] }. A ROOM_MAP megmondja, egy kalkulátor mely mezőit tölti a helyiség. */
function roomGeo(r) {
  const L = nz(r.L), W = nz(r.W), H = nz(r.H); const st = nyStats({ nyl: r.nyl || [] });
  return { L, W, H, A: L * W, per: 2 * (L + W), fal: Math.max(0, 2 * (L + W) * H - st.m2), st };
}
const r2 = (x) => Math.round(x * 100) / 100;
const ROOM_MAP = {
  burkolas: (r, v) => {
    if (v.hol === 'm2') return {}; // kész terület (pl. konyhai csempesáv) – a helyiség méretei nem írják felül
    const g = roomGeo(r);
    if (v.hol === 'fal') return { Lh: g.L, Ls: g.W, ny: r2(nyInBand(r.nyl, nz(v.Hm) || 2.1)), nyl: r.nyl || [] };
    return { hol: 'padlo', Lh: g.L, Ls: g.W, ajto: r2(g.st.ajtoSz), nyl: r.nyl || [] };
  },
  festes: (r) => { const g = roomGeo(r); return { am: 'hel', Lh: g.L, Ls: g.W, Hm: g.H, ny: r2(g.st.m2), nyl: r.nyl || [] }; },
  vakolas: (r) => { const g = roomGeo(r); return { am: 'fal', L: g.per, Hm: g.H, ny: r2(g.st.m2), nyl: r.nyl || [] }; },
  vizszig: (r) => { const g = roomGeo(r); return { am: 'fal', L: g.per, Hm: g.H, ny: r2(g.st.m2), nyl: r.nyl || [] }; },
  esztrich: (r) => { const g = roomGeo(r); return { am: 'hsz', Lh: g.L, Ls: g.W }; },
  fodem: (r) => { const g = roomGeo(r); return { am: 'hsz', Lh: g.L, Ls: g.W }; },
  terko: (r) => { const g = roomGeo(r); return { am: 'hsz', Lh: g.L, Ls: g.W }; },
  omlesztett: (r) => { const g = roomGeo(r); return { am: 'hsz', Lh: g.L, Ls: g.W }; },
  gipszkarton: (r, v) => { const g = roomGeo(r); return v.tip === 'am' ? { Lh: g.L, Ls: g.W } : {}; },
  terasz: (r) => { const g = roomGeo(r); return { Lh: g.L, Ls: g.W }; },
  beton: (r, v) => { if (v.alak !== 'lemez') return {}; const g = roomGeo(r); return { Lh: g.L, Ls: g.W }; },
  foldmunka: (r, v) => { if (v.tip !== 'terulet') return {}; const g = roomGeo(r); return { L: g.L, Sz: g.W }; },
  laminalt: (r) => { const g = roomGeo(r); return { Lh: g.L, Ls: g.W, ajto: r2(g.st.ajtoSz) }; },
  padlofutes: (r) => { const g = roomGeo(r); return { A: r2(g.A), ker: r2(g.per) }; },
};
// Egyéb (munkadíj) tételek mennyisége a helyiségből
const ROOM_Q = {
  padlo: ['padló területe', r => roomGeo(r).A],
  fal: ['falfelület (nyílások nélkül)', r => roomGeo(r).fal],
  osszes: ['padló + fal + mennyezet', r => { const g = roomGeo(r); return g.A * 2 + g.fal; }],
  csempe: ['padló + 2,1 m-es csempézett sáv', r => { const g = roomGeo(r); return g.A + Math.max(0, g.per * Math.min(2.1, g.H || 2.1) - nyInBand(r.nyl, 2.1)); }],
  kerulet: ['kerület', r => roomGeo(r).per],
  egy: ['1 alkalom', () => 1],
};

/* ---------- Beépített projektsablonok ---------- */
const SABLONOK = [
  { id: 'furdo', n: 'Fürdőszoba-felújítás', i: 'furdo', desc: 'Bontás, vízszigetelés, padló- és falburkolás, festés a csempe felett, vízszerelés (mosdó, WC, zuhany), sittszállítás',
    items: [
      { nev: 'Régi burkolat bontása', md: 'md_bontas', rq: 'csempe' },
      { nev: 'Padlóburkolás vízszigeteléssel', calc: 'burkolas', v: { hol: 'padlo', szig: true } },
      { nev: 'Falburkolás (csempe 2,1 m-ig)', calc: 'burkolas', v: { hol: 'fal', Hm: 2.1, la: 30, lb: 60, lv: 8, szig: false } },
      { nev: 'Glettelés, festés (csempe felett + mennyezet)', calc: 'festes', v: { csempeH: 2.1, menny: true } },
      { nev: 'Vízszerelés (mosdó, WC, zuhany)', calc: 'viz', v: { mod: 'vesett', mosdo: 1, wc: 1, zuhany: 1, kad: 0, mosogato: 0, gep: 0, rm_mosdo: 1, rm_wc: 1, rm_zuhanytalca: 1 } },
      { nev: 'Sittszállítás', md: 'md_sitt', rq: 'egy' },
    ] },
  { id: 'festes', n: 'Szobafestés', i: 'szobafestes', desc: 'Glettelés, alapozás, festés falakra és mennyezetre',
    items: [{ nev: 'Glettelés, festés', calc: 'festes', v: { menny: true } }] },
  { id: 'padlo', n: 'Padlócsere', i: 'padlo', desc: 'Régi padló bontása, aljzatkiegyenlítés, új burkolat lábazattal',
    items: [
      { nev: 'Régi padló bontása', md: 'md_bontas', rq: 'padlo' },
      { nev: 'Aljzatkiegyenlítés (önterülő)', calc: 'esztrich', v: { mod: 'ont', vmm: 5 } },
      { nev: 'Padlóburkolás', calc: 'burkolas', v: { hol: 'padlo', lab: true } },
    ] },
  { id: 'kocsibeallo', n: 'Kocsibeálló, térkövezés', i: 'kocsibeallo', desc: 'Földkiemelés, zúzottkő alap autós terhelésre, térkő, szegély, földelszállítás', kint: true,
    items: [
      { nev: 'Földkiemelés, tükörkészítés', md: 'md_foldkiemeles', rq: 'padlo' },
      { nev: 'Térkövezés (autós terhelés)', calc: 'terko', v: { alap: 25, agy: 4 } },
      { nev: 'Föld elszállítása', md: 'md_sitt', rq: 'egy' },
    ] },
  { id: 'konyha', n: 'Konyhafelújítás', i: 'konyha', desc: 'Bontás, padlóburkolás, csempesáv a pult felett, festés, víz a mosogatóhoz és mosogatógéphez, villany a konyhagépekhez, konyhabútor gépekkel, sittszállítás',
    items: [
      { nev: 'Régi burkolat bontása', md: 'md_bontas', rq: 'padlo' },
      { nev: 'Padlóburkolás', calc: 'burkolas', v: { hol: 'padlo', lab: true } },
      { nev: 'Csempesáv a konyhapult felett', calc: 'burkolas', v: { hol: 'm2', A: 2.4, la: 30, lb: 60, lv: 8 } },
      { nev: 'Glettelés, festés', calc: 'festes', v: { menny: true } },
      { nev: 'Vízszerelés (mosogató, mosogatógép)', calc: 'viz', v: { mod: 'vesett', mosdo: 0, wc: 0, zuhany: 0, kad: 0, mosogato: 1, gep: 1, vh: 4, rm_mosogato: 1, rm_gep: 1 } },
      { nev: 'Villanyszerelés (konyhai pontok, sütő, főzőlap)', calc: 'villany', v: { mod: 'vesett', hely: 1, dug: 6, kap: 1, lam: 2, kor: 2, kor5: 1, gyenge: 0, vh: 5, ev: true } },
      { nev: 'Konyhabútor összeszerelése, gépek beépítése', calc: 'butor', v: { konyha: true, alsoFm: 3.6, felsoFm: 3, magas: 1, pult: true, kiv: 2, g_fozo: 1, g_suto: 1, g_para: 1, g_mosgep: 0, g_mosogato: 0 } },
      { nev: 'Sittszállítás', md: 'md_sitt', rq: 'egy' },
    ] },
  { id: 'wc', n: 'WC-felújítás', i: 'wc', desc: 'Bontás, padló- és falburkolás 1,5 m-ig, festés, WC (beépített tartállyal) és kézmosó, sittszállítás',
    items: [
      { nev: 'Régi burkolat bontása', md: 'md_bontas', rq: 'csempe' },
      { nev: 'Padlóburkolás', calc: 'burkolas', v: { hol: 'padlo', lab: false } },
      { nev: 'Falburkolás (csempe 1,5 m-ig)', calc: 'burkolas', v: { hol: 'fal', Hm: 1.5, la: 30, lb: 60, lv: 8 } },
      { nev: 'Glettelés, festés (csempe felett + mennyezet)', calc: 'festes', v: { csempeH: 1.5, menny: true } },
      { nev: 'Vízszerelés (WC, kézmosó)', calc: 'viz', v: { mod: 'vesett', mosdo: 1, wc: 1, zuhany: 0, kad: 0, mosogato: 0, gep: 0, vh: 3, rm_wckeret: 1, rm_mosdo: 1 } },
      { nev: 'Sittszállítás', md: 'md_sitt', rq: 'egy' },
    ] },
  { id: 'padlofutes', n: 'Padlófűtés kiépítése', i: 'padlofutes', desc: 'Régi padló bontása, padlófűtés rendszerlemezen, esztrich a csövek fölé, új padlóburkolat',
    items: [
      { nev: 'Régi padló bontása', md: 'md_bontas', rq: 'padlo' },
      { nev: 'Padlófűtés', calc: 'padlofutes', v: { oszt: '15', alap: 'lemez', oszto: true, proba: true } },
      { nev: 'Esztrich a csövek fölé (6,5 cm)', calc: 'esztrich', v: { mod: 'zsak', vast: 6.5, perem: false } },
      { nev: 'Padlóburkolás', calc: 'burkolas', v: { hol: 'padlo', lab: true } },
      { nev: 'Sittszállítás', md: 'md_sitt', rq: 'egy' },
    ] },
  { id: 'homlokzatfelujitas', n: 'Homlokzatfelújítás', i: 'homlokzat', desc: 'Állvány, homlokzati hőszigetelés vékonyvakolattal, lábazat XPS-sel, sittszállítás',
    items: [
      { nev: 'Homlokzati állvány', calc: 'berles', v: { allv: true, aA: 150, ah: 4, aszer: true } },
      { nev: 'Homlokzati hőszigetelés (15 cm grafitos EPS)', calc: 'homlokzat', v: { am: 'm2', A: 150, ny: 20, any: 'eps_grafit', vast: 15 } },
      { nev: 'Lábazat hőszigetelése (XPS)', calc: 'homlokzat', v: { am: 'fal', L: 40, Hm: 0.5, ny: 0, any: 'xps', vast: 10, labm: 'nincs' } },
      { nev: 'Sittszállítás', md: 'md_sitt', q: 1 },
    ] },
  { id: 'tetoter', n: 'Tetőtér-beépítés', i: 'fodem', desc: 'Hőszigetelés párazáróval, gipszkarton burkolat, villany, festés, laminált padló',
    items: [
      { nev: 'Hőszigetelés párazáró fóliával', calc: 'fodem', v: { any: 'uveggyapot', vast: 25, fol: true } },
      { nev: 'Gipszkarton burkolat (ferde és vízszintes)', calc: 'gipszkarton', v: { tip: 'am', ret: '1', gyapot: false } },
      { nev: 'Villanyszerelés', calc: 'villany', v: { mod: 'gk', hely: 1, dug: 5, kap: 1, lam: 2, kor: 0, gyenge: 1, vh: 6, ev: true } },
      { nev: 'Glettelés, festés', calc: 'festes', v: { menny: true } },
      { nev: 'Laminált padló', calc: 'laminalt', v: { tip: 'lam' } },
    ] },
  { id: 'keritesepites', n: 'Kerítésépítés (sávalappal)', i: 'kerites', desc: 'Alapárok gépi ásással, betonsávalap, panelkerítés oszlopokkal – az oszlopok a sávalapba kerülnek', kint: true,
    items: [
      { nev: 'Alapárok kiemelése', calc: 'foldmunka', v: { tip: 'arok', L: 30, Sz: 0.3, M: 0.8, asas: 'gepi', vt: 0, elsz: true } },
      { nev: 'Betonsávalap (30×80 cm)', calc: 'beton', v: { alak: 'sav', Lh: 30, sz: 30, mely: 80 } },
      { nev: 'Panelkerítés oszlopokkal', calc: 'kerites', v: { L: 30, tip: 'panel', la: 0, lm: 0 } },
    ] },
  { id: 'terasz_beton', n: 'Terasz építése (beton + burkolat)', i: 'terasz', desc: 'Földkiemelés, vasalt betonlemez, vízszigetelés, fagyálló burkolat', kint: true,
    items: [
      { nev: 'Földkiemelés a terasz alól', calc: 'foldmunka', v: { tip: 'terulet', M: 0.3, asas: 'kezi', elsz: true } },
      { nev: 'Betonlemez hálóval (12 cm)', calc: 'beton', v: { alak: 'lemez', vast: 12, halo: true } },
      { nev: 'Fagyálló burkolás vízszigeteléssel', calc: 'burkolas', v: { hol: 'padlo', lab: false, szig: true, la: 60, lb: 60, lv: 20, rag: 6 } },
    ] },
  { id: 'terasz_fa', n: 'Fa terasz építése', i: 'terasz', desc: 'Terület előkészítése, alátétgerendák, teraszdeszka, olajozás', kint: true,
    items: [
      { nev: 'Terület előkészítése', calc: 'foldmunka', v: { tip: 'terulet', M: 0.15, asas: 'kezi', elsz: true } },
      { nev: 'Teraszburkolat', calc: 'terasz', v: {} },
    ] },
  { id: 'berendezes', n: 'Lakás berendezése', i: 'butor', desc: 'Konyhabútor gépekkel, hálószoba, nappali és fürdőszobabútorok összeszerelése, kiszállítással',
    items: [
      { nev: 'Konyhabútor összeszerelése, gépek beépítése', calc: 'butor', v: { konyha: true, alsoFm: 3.6, felsoFm: 3, magas: 1, pult: true, kiv: 2, g_fozo: 1, g_suto: 1, g_mosgep: 1, g_para: 1, g_mosogato: 1, rm_felhord: 1, rm_csomag: 1 } },
      { nev: 'Hálószoba bútorai', calc: 'butor', v: { konyha: false, tolo: 1, agy: 1, komod: 1, falrog: true } },
      { nev: 'Nappali, étkező bútorai', calc: 'butor', v: { konyha: false, tv: 1, polc: 2, asztal: 1, szek: 4, falrog: true } },
      { nev: 'Fürdőszobabútor', calc: 'butor', v: { konyha: false, furdo: 2, falrog: false } },
    ] },
  { id: 'futeskorszerusites', n: 'Fűtéskorszerűsítés radiátorokkal', i: 'futes', desc: 'Új radiátorok termosztatikus szelepekkel, ötrétegű cső, osztó-gyűjtő, nyomáspróba',
    items: [{ nev: 'Radiátoros fűtés', calc: 'futes', v: { mod: 'vesett', rad: 6, meret: '600x1000', radAnyag: true, vh: 8, oszto: true, szig: true, proba: true } }] },
  { id: 'villanyfelujitas', n: 'Lakás villanyfelújítása', i: 'villany', desc: 'Új vezetékezés falba vésve, szerelvények, lakáselosztó, érintésvédelmi mérés',
    items: [{ nev: 'Villanyszerelés', calc: 'villany', v: { mod: 'vesett', hely: 3, dug: 12, kap: 6, lam: 6, kor: 2, eloszto: true, fi: true, ev: true } }] },
];

// Ömlesztett anyag mértékegysége – a választást az app megjegyzi, minden kalkulátorban ugyanaz
const MJ_SHOW = { terko: () => true, omlesztett: () => true, beton: v => v.mod === 'kevert', esztrich: v => v.mod === 'ch', zsaluko: v => v.mod === 'kevert', kerites: v => v.mod === 'kevert' };
for (const id in MJ_SHOW) CALC_BY_ID[id].fields.push(SEL('mj', 'Ömlesztett anyag mértékegysége', MJ_OPTS, 'm3', { show: MJ_SHOW[id], help: 'Az app megjegyzi, és mindenhol ezt használja' }));

function defaults(calc) {
  const v = {};
  for (const f of calc.fields) if (f.id) v[f.id] = f.d;
  return v;
}

if (typeof module !== 'undefined') module.exports = { RESZ, reszOf, SZAKMAK, munkaSzakma, ROOM_MAP, ROOM_Q, SABLONOK, roomGeo, nyInBand, nyStats, kavaArea, bulkTxt, MJ_OPTS, MATERIALS, CALCS, CALC_BY_ID, GROUPS, defaults, fmt, CALC_VERSION };
