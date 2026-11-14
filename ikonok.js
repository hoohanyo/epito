/* Építőkalkulátor – vonalas ikonkészlet
   - ICONS: SVG-útvonalak (24×24, körvonalas)
   - ico(nev): kész <svg> HTML
   - icoHtml(x): ha x ikonnév, SVG-t ad, egyébként x-et (pl. régi emoji)
   - Emoji-csere: minden képernyőn automatikusan vonalas ikonra cseréli az ismert emojikat. */
const ICONS = {
  // kalkulátorok
  beton: '<path d="M4 9l8-4 8 4-8 4z"/><path d="M4 9v6l8 4 8-4V9"/><path d="M12 13v6"/>',
  esztrich: '<path d="M3 21h18"/><path d="M3 17h18"/><path d="M5 13h14"/><path d="M8 9h8"/><path d="M11 5h2"/>',
  falazas: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9.3h18M3 14.7h18M9 4v5.3M15 4v5.3M6 9.3v5.4M12 9.3v5.4M18 9.3v5.4M9 14.7V20M15 14.7V20"/>',
  zsaluko: '<rect x="3" y="6" width="18" height="12" rx="1.5"/><rect x="6" y="9" width="4.5" height="6" rx=".8"/><rect x="13.5" y="9" width="4.5" height="6" rx=".8"/>',
  vakolas: '<path d="M4 14l8-8 6 6-8 8H4z"/><path d="M14 4l6 6"/><path d="M10 20h10"/>',
  festes: '<rect x="3" y="3" width="15" height="6" rx="1.5"/><path d="M18 6h2.5v5H11v3"/><rect x="9.5" y="14" width="3" height="7" rx="1"/>',
  gipszkarton: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M4 12h16"/><path d="M7 6h.01M12 6h.01M17 6h.01M7 18h.01M12 18h.01M17 18h.01"/>',
  burkolas: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  vizszig: '<path d="M12 3c3.5 4.5 6 7.6 6 10.5a6 6 0 0 1-12 0C6 10.6 8.5 7.5 12 3z"/><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5"/>',
  homlokzat: '<rect x="4" y="3" width="12" height="18" rx="1"/><path d="M16 6h4v15h-4"/><path d="M7 7h2M11 7h2M7 11h2M11 11h2M7 15h2M11 15h2"/>',
  fodem: '<path d="M3 11l9-7 9 7"/><path d="M5 14l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5"/><path d="M4 18h16"/>',
  teto: '<path d="M2.5 13L12 4.5 21.5 13"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M5.5 14h13M5.5 17h13"/>',
  eresz: '<path d="M3 6h18v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="M16 12v9"/><path d="M8 15.5v.01M10.5 18.5v.01M7 20.5v.01"/>',
  terko: '<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M3 9h18M3 15h18M9 3v6M15 9v6M9 15v6"/>',
  omlesztett: '<path d="M2.5 20L9 9l3 4 2.5-3.5L21.5 20z"/><path d="M8 20l2-3M14 20l1.5-2.5"/>',
  kerites: '<path d="M4 21V7l2-2.5L8 7v14M10 21V7l2-2.5L14 7v14M16 21V7l2-2.5L20 7v14"/><path d="M2.5 11h19M2.5 17h19"/>',
  deszka: '<path d="M4 3v18M9 3v18M14 3v18M19 3v18"/><path d="M4 3h15M4 21h15"/>',
  terasz: '<path d="M3 10l2-4h14l2 4z"/><path d="M3 10h18M3 14h18M3 18h18"/><path d="M5 18v3M19 18v3"/>',
  kobozes: '<ellipse cx="7" cy="12" rx="4" ry="6"/><path d="M7 6h10a4 6 0 0 1 0 12H7"/><ellipse cx="7" cy="12" rx="1.5" ry="2.5"/>',
  alakzat: '<path d="M4 20V9l6-5 10 5v11z"/><path d="M8 20v-5h8v5"/>',
  lejtes: '<path d="M3 19h18"/><path d="M3 19L21 8"/><path d="M15 19a6 6 0 0 0-1-3.5"/>',
  lepcso: '<path d="M3 20h5v-5h5v-5h5V5h3"/><path d="M3 20h18"/>',
  keveres: '<path d="M12 4v16M7 20h10"/><path d="M5 8h14"/><path d="M5 8l-2.5 6a2.5 2.5 0 0 0 5 0z"/><path d="M19 8l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
  // sablonok
  furdo: '<path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M6 12V6a2 2 0 0 1 4 0"/><path d="M7 20l-1 1.5M17 20l1 1.5"/>',
  szobafestes: '<rect x="3" y="3" width="15" height="6" rx="1.5"/><path d="M18 6h2.5v5H11v3"/><rect x="9.5" y="14" width="3" height="7" rx="1"/>',
  padlo: '<path d="M2 20L7 8h10l5 12z"/><path d="M4.5 14h15M9.5 8l-2 12M14.5 8l2 12"/>',
  kocsibeallo: '<path d="M3 17v-4l2.5-6h13L21 13v4z"/><path d="M3 13h18"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  // felület
  ruler: '<g transform="rotate(-45 12 12)"><rect x="1.5" y="8" width="21" height="8" rx="1.6"/><path d="M5.5 8v3M9 8v2M12.5 8v3M16 8v2M19.5 8v3"/></g>',
  setsquare: '<path d="M3 21L21 3v18z"/><path d="M8.5 21v-2.5M12.5 21v-3.5M16.5 21v-2.5M21 9.5h-2.5M21 13.5h-3.5"/><path d="M14 17h3v-3z"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c0-3.4 2.8-5.8 6.2-5.8s6.2 2.4 6.2 5.8"/><path d="M15.8 4.7a3.4 3.4 0 0 1 0 6.6M17.6 14.4c2.1.7 3.6 2.8 3.6 5.6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c0-4 3.4-6.8 7.5-6.8s7.5 2.8 7.5 6.8"/>',
  tag: '<path d="M3 12.2V4a1 1 0 0 1 1-1h8.2l8.6 8.6a1.4 1.4 0 0 1 0 2l-7.2 7.2a1.4 1.4 0 0 1-2 0z"/><circle cx="7.8" cy="7.8" r="1.6"/>',
  more: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><circle cx="17" cy="17" r="3.5"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><rect x="8" y="6" width="8" height="3" rx=".8"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
  cart: '<path d="M3 4h2l2.4 11h11l2-8H6.3"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 11h6M9 15h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  building: '<rect x="4" y="3" width="11" height="18" rx="1"/><path d="M15 9h5v12h-5"/><path d="M7.5 7h4M7.5 11h4M7.5 15h4"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l2.5 2.5M18.5 4.5L21 7"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>',
  device: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  alert: '<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  moon: '<path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.7 6.7 0 0 0 10.7 10.7z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};
function ico(n, cls) {
  const p = ICONS[n]; if (!p) return '';
  return '<svg class="svgi' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
}
function icoHtml(x) { return ICONS[x] ? ico(x) : (x || ''); }

/* Emoji → ikon */
const EMOJI_IKON = {
  '👤': 'user', '📁': 'folder', '🧱': 'layers', '🏠': 'home', '🧮': 'calc', '📐': 'setsquare', '🔗': 'link',
  '📄': 'doc', '🧾': 'receipt', '✏': 'pencil', '🛒': 'cart', '📍': 'pin', '📞': 'phone', '✉': 'mail',
  '📋': 'clipboard', '➕': 'plus', '🗓': 'calendar', '🏢': 'building', '🗑': 'trash', '🔑': 'key', '👁': 'eye',
  '🖨': 'printer', '🕘': 'history', '📱': 'device', '⏳': 'clock', '⚠': 'alert', '☀': 'sun', '🌙': 'moon',
  '🛁': 'furdo', '🖌': 'szobafestes', '🚗': 'kocsibeallo', '▭': 'padlo', '👥': 'users', '🏷': 'tag', '⚙': 'more',
};
const EMOJI_RE = new RegExp('(' + Object.keys(EMOJI_IKON).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')️?', 'gu');
const EMOJI_SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, TITLE: 1, OPTION: 1 };
function emojiCsere(root) {
  if (!root) return;
  if (root.nodeType === 3) return emojiSzoveg(root);
  if (root.nodeType !== 1 || EMOJI_SKIP[root.nodeName] || root.closest('.q-paper')) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const list = []; let n;
  while ((n = tw.nextNode())) { EMOJI_RE.lastIndex = 0; if (EMOJI_RE.test(n.nodeValue)) list.push(n); }
  list.forEach(emojiSzoveg);
}
function emojiSzoveg(t) {
  const par = t.parentNode; if (!par || EMOJI_SKIP[par.nodeName] || (par.closest && par.closest('.q-paper'))) return;
  const s = t.nodeValue; EMOJI_RE.lastIndex = 0; if (!EMOJI_RE.test(s)) return;
  EMOJI_RE.lastIndex = 0;
  const frag = document.createDocumentFragment(); let last = 0, m;
  while ((m = EMOJI_RE.exec(s))) {
    if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
    const sp = document.createElement('span'); sp.className = 'ei'; sp.innerHTML = ico(EMOJI_IKON[m[1]]);
    frag.appendChild(sp); last = m.index + m[0].length;
  }
  if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
  par.replaceChild(frag, t);
}
document.addEventListener('DOMContentLoaded', () => {
  emojiCsere(document.body);
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'characterData') emojiSzoveg(m.target);
      else m.addedNodes.forEach(emojiCsere);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
});
if (typeof module !== 'undefined') module.exports = { ICONS, ico, icoHtml, EMOJI_IKON };
