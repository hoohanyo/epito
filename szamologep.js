/* Építőkalkulátor – tudományos számológép (lebegő ablak, a munka mögötte nyitva marad)
   Szögfüggvények fokban. Saját kifejezés-elemző, nincs eval. */
const SZG = {
  expr: LS.get('ek_szg_expr', ''), hist: LS.get('ek_szg_hist', []), ans: LS.get('ek_szg_ans', 0),
  fresh: false, target: null, showHist: false,
};
let szgLastField = null;
document.addEventListener('focusin', e => {
  const el = e.target;
  if (el && el.matches && el.matches('#view input[inputmode], #modal input[inputmode]')) szgLastField = el;
});

/* ---------- Kifejezés-elemző ---------- */
function szgTokens(src) {
  const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
  const t = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.,]/.test(c)) { let j = i; while (j < s.length && /[0-9.,]/.test(s[j])) j++; const num = s.slice(i, j).replace(',', '.'); if ((num.match(/\./g) || []).length > 1 || num === '.') throw 0; t.push({ k: 'n', v: parseFloat(num) }); i = j; continue; }
    if (c === 'π') { t.push({ k: 'n', v: Math.PI }); i++; continue; }
    if ('+-*/^()²%'.includes(c)) { t.push({ k: c }); i++; continue; }
    if (c === '√') { t.push({ k: 'f', v: 'sqrt' }); i++; continue; }
    const m = s.slice(i).match(/^(asin|acos|atan|sin|cos|tan|ln|log|Ans)/);
    if (m) { if (m[1] === 'Ans') t.push({ k: 'n', v: SZG.ans }); else t.push({ k: 'f', v: m[1] }); i += m[1].length; continue; }
    throw 0;
  }
  // implicit szorzás: 2π, 2(…), 2sin(…), )(, )2
  const out = [];
  for (let k = 0; k < t.length; k++) {
    const a = out[out.length - 1], b = t[k];
    if (a && (a.k === 'n' || a.k === ')' || a.k === '²' || a.k === '%') && (b.k === 'n' || b.k === '(' || b.k === 'f')) out.push({ k: '*' });
    out.push(b);
  }
  return out;
}
function szgEval(src) {
  if (!src.trim()) return null;
  // nyitva maradt zárójelek automatikus bezárása
  const open = (src.match(/\(/g) || []).length - (src.match(/\)/g) || []).length;
  if (open > 0) src += ')'.repeat(open);
  const T = szgTokens(src); let p = 0;
  const peek = () => T[p], take = () => T[p++];
  const D = Math.PI / 180;
  const F = { sin: x => Math.sin(x * D), cos: x => Math.cos(x * D), tan: x => Math.tan(x * D), asin: x => Math.asin(x) / D, acos: x => Math.acos(x) / D, atan: x => Math.atan(x) / D, sqrt: Math.sqrt, ln: Math.log, log: Math.log10 };
  function expr() { let v = term(); while (peek() && (peek().k === '+' || peek().k === '-')) { const o = take().k; const r = term(); v = o === '+' ? v + r : v - r; } return v; }
  function term() { let v = factor(); while (peek() && (peek().k === '*' || peek().k === '/')) { const o = take().k; const r = factor(); v = o === '*' ? v * r : v / r; } return v; }
  function factor() { const b = unary(); if (peek() && peek().k === '^') { take(); return Math.pow(b, factor()); } return b; }
  function unary() { if (peek() && peek().k === '-') { take(); return -unary(); } if (peek() && peek().k === '+') { take(); return unary(); } return postfix(); }
  function postfix() { let v = primary(); while (peek() && (peek().k === '²' || peek().k === '%')) { const o = take().k; v = o === '²' ? v * v : v / 100; } return v; }
  function primary() {
    const t = take(); if (!t) throw 0;
    if (t.k === 'n') return t.v;
    if (t.k === '(') { const v = expr(); if (!take() || T[p - 1].k !== ')') throw 0; return v; }
    if (t.k === 'f') { if (!peek() || peek().k !== '(') { return F[t.v](postfix()); } take(); const v = expr(); if (!take() || T[p - 1].k !== ')') throw 0; return F[t.v](v); }
    throw 0;
  }
  const v = expr(); if (p !== T.length) throw 0;
  return v;
}
function szgFmt(x) {
  if (x === null || x === undefined) return '';
  if (!isFinite(x)) return 'Hiba';
  if (Math.abs(x) < 1e-10) x = 0;
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e12 || a < 1e-6)) return x.toExponential(6).replace('.', ',').replace('e', '·10^');
  return Number(x.toPrecision(12)).toLocaleString('hu-HU', { maximumFractionDigits: 10 });
}
const szgPlain = (x) => String(Number(x.toPrecision(12))).replace('.', ','); // mezőbe íráshoz

/* ---------- Felület ---------- */
const SZG_KEYS = [
  ['sin', 'fn', 'sin('], ['cos', 'fn', 'cos('], ['tan', 'fn', 'tan('], ['(', 'op', '('], [')', 'op', ')'],
  ['x²', 'fn', '²'], ['√', 'fn', '√('], ['xʸ', 'fn', '^'], ['π', 'fn', 'π'], ['%', 'fn', '%'],
  ['7', 'd', '7'], ['8', 'd', '8'], ['9', 'd', '9'], ['÷', 'op', '÷'], ['⌫', 'ctl', 'back'],
  ['4', 'd', '4'], ['5', 'd', '5'], ['6', 'd', '6'], ['×', 'op', '×'], ['C', 'ctl', 'clear'],
  ['1', 'd', '1'], ['2', 'd', '2'], ['3', 'd', '3'], ['−', 'op', '−'], ['Ans', 'fn', 'Ans'],
  ['±', 'fn', 'neg'], ['0', 'd', '0'], [',', 'd', ','], ['+', 'op', '+'], ['=', 'eq', 'eq'],
];
const SZG_KEYS2 = [['sin⁻¹', 'asin('], ['cos⁻¹', 'acos('], ['tan⁻¹', 'atan('], ['1/x', 'inv'], ['ln', 'ln('], ['log', 'log(']];

function openSzg() {
  SZG.target = szgLastField && document.body.contains(szgLastField) ? szgLastField : null;
  const box = $('#szg');
  box.innerHTML = '<div class="szg-panel" role="dialog" aria-label="Számológép">' +
    '<div class="szg-top"><b>Számológép</b><span class="szg-mode">fok</span><button class="szg-ic" id="szgH" title="Előzmények">🕘</button><button class="szg-ic" id="szgX" title="Bezárás">✕</button></div>' +
    '<div class="szg-disp"><div class="szg-expr" id="szgE"></div><div class="szg-res" id="szgR"></div></div>' +
    '<div class="szg-hist" id="szgHist" hidden></div>' +
    (SZG.target ? '<button class="btn sm szg-ins" id="szgIns"></button>' : '') +
    '<div class="szg-row2">' + SZG_KEYS2.map(k => '<button data-x="' + k[1] + '">' + k[0] + '</button>').join('') + '</div>' +
    '<div class="szg-keys">' + SZG_KEYS.map(k => '<button class="k-' + k[1] + '" data-k="' + esc(k[2]) + '">' + k[0] + '</button>').join('') + '</div></div>';
  box.hidden = false;
  history.pushState({ szg: 1 }, '');
  box.onclick = (e) => { if (e.target === box) closeSzg(); };
  $('#szgX').onclick = () => closeSzg();
  $('#szgH').onclick = () => { SZG.showHist = !SZG.showHist; szgDraw(); };
  box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => szgKey(b.dataset.k));
  box.querySelectorAll('[data-x]').forEach(b => b.onclick = () => szgKey(b.dataset.x));
  if (SZG.target) $('#szgIns').onclick = szgInsert;
  szgDraw();
}
function closeSzg() { $('#szg').hidden = true; $('#szg').innerHTML = ''; szgSave(); }
function szgSave() { LS.set('ek_szg_expr', SZG.expr); LS.set('ek_szg_hist', SZG.hist.slice(0, 20)); LS.set('ek_szg_ans', SZG.ans); }
function szgPreview() { try { return szgEval(SZG.expr); } catch (e) { return undefined; } }
function szgDraw() {
  if ($('#szg').hidden) return;
  $('#szgE').textContent = SZG.expr || '0';
  const v = szgPreview();
  $('#szgR').textContent = v === undefined ? '…' : v === null ? '' : '= ' + szgFmt(v);
  $('#szgR').classList.toggle('fresh', SZG.fresh);
  const hb = $('#szgHist'); hb.hidden = !SZG.showHist;
  if (SZG.showHist) {
    hb.innerHTML = SZG.hist.length ? SZG.hist.map((h, i) => '<div class="szg-hi" data-i="' + i + '"><span>' + esc(h.e) + '</span><b>' + esc(szgFmt(h.r)) + '</b></div>').join('') : '<div class="muted small" style="padding:6px">Még nincs előzmény.</div>';
    hb.querySelectorAll('.szg-hi').forEach(el => el.onclick = () => { const h = SZG.hist[el.dataset.i]; SZG.expr = szgPlain(h.r); SZG.fresh = true; SZG.showHist = false; szgDraw(); });
  }
  if (SZG.target) {
    const el = SZG.target; let name = 'mező';
    if (el.closest('.f')) name = el.closest('.f').querySelector('label').childNodes[0].textContent.trim();
    else if (el.closest('.nyrow')) { const sel = el.closest('.nyrow').querySelector('select'); name = (sel ? sel.options[sel.selectedIndex].text + ' – ' : '') + ({ sz: 'szélesség', m: 'magasság', db: 'darab' }[el.dataset.k] || ''); }
    else if (el.closest('.fld')) name = el.closest('.fld').querySelector('label').textContent.trim();
    $('#szgIns').textContent = '↵ Beírás ide: ' + name;
    $('#szgIns').disabled = !(typeof v === 'number' && isFinite(v));
  }
}
function szgKey(k) {
  const e = SZG.expr; const isOp = (k) => ['+', '−', '×', '÷', '^', '%', '²'].includes(k);
  if (k === 'clear') { SZG.expr = ''; SZG.fresh = false; }
  else if (k === 'back') { SZG.expr = SZG.fresh ? '' : e.replace(/(asin\(|acos\(|atan\(|sin\(|cos\(|tan\(|ln\(|log\(|Ans|√\(|.)$/, ''); SZG.fresh = false; }
  else if (k === 'eq') {
    const v = szgPreview(); if (typeof v !== 'number' || !isFinite(v)) { szgDraw(); return; }
    SZG.hist.unshift({ e: SZG.expr, r: v }); SZG.hist = SZG.hist.slice(0, 20); SZG.ans = v;
    SZG.expr = szgPlain(v); SZG.fresh = true; szgSave();
  }
  else if (k === 'neg') { SZG.expr = e ? (/^−\(.*\)$/.test(e) ? e.slice(2, -1) : '−(' + e + ')') : '−'; SZG.fresh = false; }
  else if (k === 'inv') { const v = szgPreview(); if (e) SZG.expr = '1÷(' + e + ')'; SZG.fresh = false; }
  else {
    // eredmény után: számjegy új kifejezést kezd, művelet folytatja
    if (SZG.fresh && !isOp(k)) SZG.expr = '';
    SZG.fresh = false;
    SZG.expr += k;
  }
  szgDraw();
}
function szgInsert() {
  const v = szgPreview(); const el = SZG.target;
  if (typeof v !== 'number' || !isFinite(v) || !el || !document.body.contains(el)) return;
  const r = Math.round(v * 1000) / 1000;
  SZG.hist.unshift({ e: SZG.expr, r: v }); SZG.hist = SZG.hist.slice(0, 20); SZG.ans = v; SZG.expr = szgPlain(v); SZG.fresh = true;
  el.value = szgPlain(r);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  closeSzg();
  toast('Beírva: ' + szgFmt(r));
}
document.addEventListener('keydown', (e) => {
  if ($('#szg').hidden) return;
  const map = { '*': '×', '/': '÷', '-': '−', '.': ',', 'Enter': 'eq', '=': 'eq', 'Backspace': 'back', 'Delete': 'clear' };
  if (e.key === 'Escape') { closeSzg(); return; }
  let k = map[e.key] || e.key;
  if (/^[0-9+×÷−(),^%]$/.test(k) || k === 'eq' || k === 'back' || k === 'clear') { e.preventDefault(); szgKey(k); }
});
$('#btnSzg').onclick = () => { if ($('#szg').hidden) openSzg(); else closeSzg(); };
// a gomb megnyomásakor a mező ne veszítse el a "kijelölt" állapotot
$('#btnSzg').addEventListener('mousedown', e => e.preventDefault());
