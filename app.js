/* 我的記賬 — 正式版第一期
   所有資料只儲喺呢部機（localStorage）。程式入面冇任何真實數字。 */
'use strict';

// ---------- 小工具 ----------
var KEY = 'ledger-v1';
function p2(n) { return (n < 10 ? '0' : '') + n; }
function iso(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
function today() { return iso(new Date()); }
function nowHM() { var d = new Date(); return p2(d.getHours()) + ':' + p2(d.getMinutes()); }
function mkOf(s) { return String(s).slice(0, 7); }
function addM(mk, n) { var y = +mk.slice(0, 4), m = +mk.slice(5, 7) + n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return y + '-' + p2(m); }
function daysIn(mk) { return new Date(+mk.slice(0, 4), +mk.slice(5, 7), 0).getDate(); }
function r2(n) { return Math.round((+n || 0) * 100) / 100; }
function fmt(n) { n = r2(n); return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function md(s) { return (+s.slice(5, 7)) + '/' + (+s.slice(8, 10)); }
function mlabel(mk) { return mk.slice(0, 4) + ' 年 ' + (+mk.slice(5)) + ' 月'; }
var WD = ['日', '一', '二', '三', '四', '五', '六'];
function wd(s) { return WD[new Date(s + 'T00:00:00').getDay()]; }
function evalAmt(x) { var t = String(x || '').replace(/−/g, '-').replace(/[+\-]+$/, ''); if (!t) return 0; var s = 0; (t.match(/[+\-]?[0-9.]+/g) || []).forEach(function (q) { var v = parseFloat(q); if (!isNaN(v)) s += v; }); return r2(s); }
function dayOf(mk, d) { return mk + '-' + p2(Math.min(d, daysIn(mk))); }

// ---------- 圖示（數字 = A 套 11 欄；'nX' = B 套 4 欄） ----------
function ic(k, S) {
  if (k === null || k === undefined || k === '') return '<span class="icx' + S + '"></span>';
  var isB = typeof k === 'string', i = isB ? parseInt(k.slice(1), 10) : k, cols = isB ? 4 : 11;
  return '<span class="' + (isB ? 'b' : 'a') + S + '" style="background-position:' + (-(i % cols) * S) + 'px ' + (-Math.floor(i / cols) * S) + 'px"></span>';
}

// ---------- 分類（跟試看版定稿） ----------
var EXP = [
  { name: '必要開支', ic: 118, cats: [
    ['住屋 Home', 118, [['按揭', 101], ['管理費', 105], ['差餉地租', 36], ['水電煤', 80], ['上網電話', 57], ['家居維修', 76]]],
    ['車 Car', 53, [['入油', 'n0'], ['月租車位', 4], ['泊車', 90], ['隧道費', 49], ['牌費保險', 24], ['維修保養', 78], ['罰款', 'n1']]],
    ['交通 Transport', 6, [['公共交通', 6], ['Uber/的士', 53]]],
    ['飲食 Food', 115, [['餐廳', 'n35'], ['外賣', 96], ['超市便利店', 95], ['零食飲品', 'n33']]],
    ['日用品 Daily', 25, [['個人用品', 'n2'], ['家居用品', 25]]],
    ['醫療保險 Health', 26, [['睇醫生', 26], ['牙科', 'n3'], ['保健品', 88], ['保險', 107]]],
    ['稅項 Tax', 87, [['薪俸稅', 70]]]
  ] },
  { name: '彈性開支', ic: 29, cats: [
    ['購物 Shopping', 29, [['網購', 'n34'], ['衫褲鞋袋', 52], ['電子電器', 64], ['其他購物', 33]]],
    ['美容 Beauty', 119, [['頭髮', 'n4'], ['護膚化妝', 9], ['美甲', 'n5'], ['療程', 'n6']]],
    ['興趣娛樂 Leisure', 81, [['跳舞堂費', 'n37'], ['表演', 99], ['電影', 110], ['運動', 14], ['訂閱', 97], ['進修', 23]]],
    ['人情社交 Social', 10, [['聚會請客', 'n38'], ['禮物', 67], ['紅白事', 84]]],
    ['旅行 Travel', 114, [['機票', 114], ['酒店', 'n7'], ['外遊消費', 94], ['旅遊保險', 109]]]
  ] },
  { name: '其他', ic: 0, cats: [
    ['共同生活 Shared', 'n16', [['出街食飯', 'n36'], ['外賣', 96], ['買餸超市', 95], ['家居日用', 'n15'], ['娛樂旅行', 114], ['代BB付', 'n14']]],
    ['債務還款 Debt', 2, [['渣打貸款', 'n27'], ['恒生分期', 'n23'], ['其他分期', 'n29']]],
    ['財務費用 Fees', 60, [['利息', 27], ['遲交費', 46], ['年費', 3], ['手續費', 60]]],
    ['公司代付 Company', 5, [['交通', 6], ['飲食', 115], ['物資活動', 'n39'], ['其他', 5]]],
    ['美睫生意 Lash', 65, [['材料', 'n8'], ['場地', 'n32'], ['工具其他', 'n9']]],
    ['其他 Other', 0, [['現金支出', 75], ['電子錢包小額', 89], ['轉畀他人', 'n40'], ['代朋友付', 'n12'], ['雜項', 54]]]
  ] }
];
var INC = [['薪金', 100], ['花紅', 'n31'], ['美睫收入', 'n41'], ['退款回贈', 50], ['利息', 27], ['利是', 'n11'], ['其他收入', 22], ['BB 回款', 'n17'], ['公司報銷', 38], ['朋友還款', 'n10']];
var OFFSETS = ['BB 回款', '公司報銷', '朋友還款'];
var TRF = [['信用卡還款', 86], ['戶口之間', 'n42'], ['借錢／還借款', 'n43'], ['存入獨立帳戶', 'n19'], ['家人定期存款', 'n18'], ['八達通增值', 'n30']];
var CAT = {}, SUBIC = {};
EXP.forEach(function (g) { g.cats.forEach(function (c) { CAT[c[0]] = c; c[2].forEach(function (s) { SUBIC[c[0] + '|' + s[0]] = s[1]; }); }); });
INC.forEach(function (c) { CAT[c[0]] = [c[0], c[1], []]; });
function zh(n) { var i = String(n).indexOf(' '); return OFFSETS.indexOf(n) >= 0 || i < 0 ? n : n.slice(0, i); }
function catIc(cat, sub) { return SUBIC[cat + '|' + sub] != null ? SUBIC[cat + '|' + sub] : (CAT[cat] ? CAT[cat][1] : 54); }

// 預算分組
var BGROUPS = [
  ['必要開支', ['住屋 Home', '車 Car', '交通 Transport', '飲食 Food', '日用品 Daily', '醫療保險 Health', '稅項 Tax']],
  ['自己使（可累積）', ['購物 Shopping', '美容 Beauty', '人情社交 Social']],
  ['其他彈性', ['興趣娛樂 Leisure', '旅行 Travel', '其他 Other']],
  ['共同生活（扣 BB 回款）', ['共同生活 Shared']]
];
var POOL = BGROUPS[1][1];
var FLEXCAT = ['飲食 Food', '交通 Transport', '日用品 Daily', '興趣娛樂 Leisure', '共同生活 Shared', '旅行 Travel', '其他 Other', '車 Car'];
var ATYPES = [['card', '信用卡'], ['bank', '銀行'], ['wallet', '電子錢包'], ['cash', '現金'], ['octopus', '八達通'], ['env', '獨立帳戶']];
var CURS = ['TWD', 'JPY', 'KRW', 'CNY', 'USD', 'EUR', 'GBP', 'THB', 'SGD', 'AUD', 'MYR'];
var OCTP = [['巴士', '交通 Transport', '公共交通', 6], ['港鐵', '交通 Transport', '公共交通', 6], ['泊車', '車 Car', '泊車', 90], ['便利店', '飲食 Food', '超市便利店', 95], ['飲品', '飲食 Food', '零食飲品', 'n33'], ['其他', '其他 Other', '雜項', 54]];

// ---------- 資料 ----------
function blank() {
  return { v: 1, accounts: [], records: [], octPend: [], budgets: {}, selfBase: 0, startMonth: mkOf(today()), learned: {}, commute: { on: true, bus: 0, mtr: 0 },
    recon: {}, cardPaid: {}, fxRate: {}, seen: {}, lastBackup: '', recent: [], nextId: 1, lastAcct: '', name: '', gUrl: '', gKey: '', lastKJ: '', lastSync: '' };
}
var S = blank();
try { var raw = localStorage.getItem(KEY); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('儲存失敗：手機空間唔夠？'); } }
function nid() { return S.nextId++; }
if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) {} }

function acctBy(name) { for (var i = 0; i < S.accounts.length; i++) if (S.accounts[i].name === name) return S.accounts[i]; return null; }
function acctIc(name) { var a = acctBy(name); return a ? a.ic : 54; }
function bal(name, upto) {
  var a = acctBy(name); if (!a) return 0;
  var b = +a.open || 0, from = a.openDate || '';
  S.records.forEach(function (r) {
    if (from && r.date < from) return; if (upto && r.date > upto) return;
    if (r.type === 'exp' && r.acct === name) b -= r.amt;
    if (r.type === 'inc' && r.acct === name) b += r.amt;
    if (r.type === 'trf') { if (r.acct === name) b -= r.amt; if (r.to === name) b += r.amt; }
  });
  return r2(b);
}

// ---------- 預算計數 ----------
function monthRecs(mk) { return S.records.filter(function (r) { return mkOf(r.date) === mk; }); }
function actual(mk, cat, recs) {
  recs = recs || monthRecs(mk); var a = 0;
  recs.forEach(function (r) { if (r.type === 'exp' && r.cat === cat) a += r.amt; });
  if (cat === '共同生活 Shared') { recs.forEach(function (r) { if (r.type === 'inc' && r.cat === 'BB 回款') a -= r.amt; }); a = Math.max(0, a); }
  return r2(a);
}
function poolUsed(mk, recs) { var u = 0; POOL.forEach(function (c) { u += actual(mk, c, recs); }); return r2(u); }
function carry(mk) { var c = 0, m = S.startMonth; var guard = 0; while (m < mk && guard++ < 240) { c += (+S.selfBase || 0) - poolUsed(m); m = addM(m, 1); } return r2(c); }
function effBud(mk, cat) {
  var B = +S.budgets[cat] || 0; if (!B || FLEXCAT.indexOf(cat) < 0) return B;
  var pm = addM(mk, -1); if (pm < S.startMonth) return B;
  var over = Math.max(0, actual(pm, cat) - B);
  return r2(Math.max(0, B - over));
}
function monthSum(mk) {
  var recs = monthRecs(mk), budT = 0, act = 0, rows = [];
  BGROUPS.forEach(function (g, gi) {
    if (gi === 1) return;
    g[1].forEach(function (c) { var b = effBud(mk, c), a = actual(mk, c, recs); budT += b; act += a; });
  });
  var pb = +S.selfBase || 0, cy = carry(mk), pu = poolUsed(mk, recs);
  budT += pb + cy; act += pu;
  var spend = 0, income = 0, other = 0;
  recs.forEach(function (r) {
    if (r.type === 'exp') { spend += r.amt; }
    if (r.type === 'inc' && OFFSETS.indexOf(r.cat) < 0) income += r.amt;
  });
  var cb = pb + cy, ca = pu;
  FLEXCAT.forEach(function (c) { cb += effBud(mk, c); ca += actual(mk, c, recs); });
  return { bud: r2(budT), act: r2(act), left: r2(budT - act), cBud: r2(cb), cAct: r2(ca), cLeft: r2(cb - ca), spend: r2(spend), income: r2(income), poolBase: pb, carry: cy, poolUsed: pu, recs: recs };
}

// ---------- 卡：截數、到期 ----------
function lastStmt(a) { var t = today(), mk = mkOf(t); var d = dayOf(mk, a.stmt); if (d > t) d = dayOf(addM(mk, -1), a.stmt); return d; }
function nextDue(a) {
  // 到期日 = 截數之後嗰個到期日
  var sd = lastStmt(a), mk = mkOf(sd), d = dayOf(mk, a.due); if (d <= sd) d = dayOf(addM(mk, 1), a.due); return d;
}
function daysTo(d) { return Math.round((new Date(d + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000); }

// ---------- 介面狀態 ----------
var U = { tab: 'home', prev: 'home', month: mkOf(today()), day: today(), sheet: null, q: '', open: '', toast: '', f: null, budTab: 'now', acctOpen: false, toOpen: false };
function toast(m) { U.toast = m; render(); clearTimeout(toast._t); toast._t = setTimeout(function () { U.toast = ''; render(); }, 2400); }

// ---------- 記一筆表格 ----------
function newForm(over) {
  var f = { id: 0, type: 'exp', amt: '', kp: false, fx: false, cur: 'TWD', fxAmt: '', hkd: '', cat: '', sub: '', step: 'grp', grp: -1,
    acct: S.lastAcct || (S.accounts[0] ? S.accounts[0].name : ''), atype: '', to: '', ttype: '', kind: '信用卡還款', date: today(), note: '', est: false, pend: false, after: null };
  if (over) Object.assign(f, over);
  var a = acctBy(f.acct); f.atype = f.atype || (a ? a.type : 'card');
  var t = acctBy(f.to); f.ttype = f.ttype || (t ? t.type : 'card');
  if (f.cat) f.step = 'done';
  return f;
}
function formFromRec(r) {
  var f = newForm({ id: r.id, type: r.type, amt: String(r.fx ? r.fx.amt : r.amt), fx: !!r.fx, cur: r.fx ? r.fx.cur : 'TWD', hkd: r.fx ? String(r.amt) : '', cat: r.cat || '', sub: r.sub || '',
    acct: r.acct, to: r.to || '', kind: r.kind || '信用卡還款', date: r.date, note: r.note || '', pend: !!r.pend });
  if (r.type === 'exp' && !r.cat) f.step = 'grp';
  return f;
}
function saveForm() {
  var f = U.f, amt = evalAmt(f.amt), hkd = amt, fxo = null, est = false;
  if (!(amt > 0)) return toast('請填金額');
  if (f.fx) {
    var h = evalAmt(f.hkd);
    if (h > 0) { hkd = h; S.fxRate[f.cur] = r2(h / amt * 10000) / 10000; }
    else if (S.fxRate[f.cur]) { hkd = r2(amt * S.fxRate[f.cur]); est = true; }
    else return toast('第一次用 ' + f.cur + '：請填卡實際扣幾多港幣');
    fxo = { cur: f.cur, amt: amt };
  }
  if (!f.acct) return toast('請揀帳戶');
  if (f.type === 'exp' && (!f.cat || !f.sub)) return toast('請揀分類');
  if (f.type === 'inc' && !f.cat) return toast('請揀收入類別');
  if (f.type === 'trf' && (!f.to || f.to === f.acct)) return toast('請揀轉去邊個帳戶');
  var r = { id: f.id || nid(), date: f.date || today(), type: f.type, amt: hkd, acct: f.acct, note: (f.note || '').trim() };
  if (f.type === 'exp') { r.cat = f.cat; r.sub = f.sub; }
  if (f.type === 'inc') { r.cat = f.cat; }
  if (f.type === 'trf') { r.to = f.to; r.kind = f.kind; }
  if (fxo) r.fx = fxo; if (est) r.est = true;
  var old = null; S.records.forEach(function (x, i) { if (x.id === r.id) old = i; });
  if (old !== null) { var o = S.records[old]; if (o.src) r.src = o.src; if (o.mer) r.mer = o.mer; S.records[old] = r; } else S.records.push(r);
  if (r.mer && r.cat) S.learned[r.mer.toLowerCase()] = [r.cat, r.sub];
  if (f.type === 'exp') { var k = r.cat + '|' + r.sub; S.recent = [k].concat(S.recent.filter(function (x) { return x !== k; })).slice(0, 8); }
  S.lastAcct = r.acct;
  if (r.type === 'trf' && r.kind === '信用卡還款') { var ca = acctBy(r.to); if (ca && ca.due) S.cardPaid[ca.name] = nextDue(ca); }
  save(); var after = f.after; U.f = null; U.tab = U.prev || 'home'; window.scrollTo(0, 0);
  toast((old !== null ? '已更新 ' : '已記 ') + fmt(hkd) + (est ? '（匯率估算，對月結單再改）' : ''));
  if (after) after();
}

// ---------- 捷徑記錄匯入（kuaiji.txt） ----------
function matchAcct(card) {
  var c = String(card || '').trim().toLowerCase(); if (!c) return '';
  var hit = '';
  S.accounts.forEach(function (a) {
    if (hit) return;
    var names = [a.name].concat(String(a.wallet || '').split(/[,，]/));
    names.forEach(function (n) { n = n.trim().toLowerCase(); if (n && (c === n || c.indexOf(n) >= 0 || n.indexOf(c) >= 0)) hit = a.name; });
  });
  return hit;
}
function guessCat(mer) {
  var m = String(mer || '').toLowerCase(); if (!m) return null;
  if (S.learned[m]) return S.learned[m];
  var keys = Object.keys(S.learned); for (var i = 0; i < keys.length; i++) { if (keys[i].length >= 3 && (m.indexOf(keys[i]) >= 0 || keys[i].indexOf(m) >= 0)) return S.learned[keys[i]]; }
  return null;
}
function importKJ(text) {
  var lines = String(text || '').split(/\r?\n/), cnt = {}, addR = 0, addO = 0, skip = 0, bad = 0, oct = S.accounts.filter(function (a) { return a.type === 'octopus'; })[0];
  lines.forEach(function (line) {
    var L = line.trim(); if (!L) return;
    var p = L.split('|').map(function (x) { return x.trim(); });
    var dm = p[0].match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/); if (!dm) { bad++; return; }
    var date = dm[1] + '-' + p2(+dm[2]) + '-' + p2(+dm[3]);
    var tm = L.match(/\b(\d{1,2}):(\d{2})\b/), time = tm ? p2(+tm[1]) + ':' + tm[2] : '';
    // 金額同商戶邊個先都得（你個捷徑係 日期|金額|商戶|卡）
    var f1 = p[1] || '', f2 = p[2] || '', card = p[3] || '';
    function isAmt(x) { return /\d/.test(x) && /^[^A-Za-z\u4e00-\u9fff]*(HK|HKD|NT|US|JP|CN|RMB|SGD|MOP)?[^A-Za-z\u4e00-\u9fff]*[\d,.]+[^A-Za-z\u4e00-\u9fff]*(HKD|TWD|JPY|KRW|USD|CNY|RMB)?$/i.test(x.replace(/\s/g, '')); }
    var rawAmt = isAmt(f1) ? f1 : (isAmt(f2) ? f2 : ''), mer = rawAmt === f1 ? f2 : f1;
    var amtS = rawAmt.replace(/[^0-9.\-]/g, '');
    var foreign = rawAmt && !/^\s*(HK\$|HKD|\$)?\s*[\d,.]+\s*(HKD)?\s*$/i.test(rawAmt);
    var k = date + '#' + L; cnt[k] = (cnt[k] || 0) + 1; var key = k + '#' + cnt[k];
    if (S.seen[key]) { skip++; return; }
    S.seen[key] = 1;
    var amt = parseFloat(amtS);
    if (!(amt > 0) && !mer) { S.octPend.push({ id: nid(), date: date, time: time, n: cnt[k] }); addO++; return; }
    if (!(amt > 0)) { bad++; return; }
    var g = guessCat(mer), acct = matchAcct(card) || (card ? '' : (oct ? oct.name : ''));
    var rec = { id: nid(), date: date, type: 'exp', amt: r2(amt), acct: acct || card || '未知', cat: g ? g[0] : '', sub: g ? g[1] : '', note: mer, mer: mer, pend: true, src: 'kj', time: time, sure: !!g };
    if (foreign) { rec.note = mer + '（' + rawAmt + '，外幣：撳入去改實際港幣）'; rec.est = true; }
    S.records.push(rec);
    addR++;
  });
  S.lastKJ = today(); save();
  return '匯入咗 ' + addR + ' 筆捷徑記錄、' + addO + ' 筆八達通' + (skip ? '；' + skip + ' 筆之前已匯入' : '') + (bad ? '；' + bad + ' 行睇唔明' : '');
}

// ---------- 八達通通勤估算 ----------
function octGuess() {
  var by = {}, g = {}; var C = S.commute || {};
  S.octPend.forEach(function (o) { (by[o.date] = by[o.date] || []).push(o); });
  Object.keys(by).forEach(function (d) {
    var dow = new Date(d + 'T00:00:00').getDay(); if (!C.on || dow === 0 || dow === 6) return;
    var arr = by[d].slice(), bus = ['巴士', +C.bus || 0], mtr = ['港鐵', +C.mtr || 0];
    var timed = arr.every(function (o) { return o.time; });
    if (timed) {
      arr.sort(function (a, b) { return a.time < b.time ? -1 : 1; });
      var am = 0, pm = 0;
      arr.forEach(function (o) { var h = +o.time.slice(0, 2) + (+o.time.slice(3)) / 60;
        if (h >= 7 && h < 10) { var q = [bus, mtr][am++]; if (q) g[o.id] = q; }
        else if (h >= 17 && h < 21) { var q2 = [bus, mtr][pm++]; if (q2) g[o.id] = q2; } });
    } else {
      // 冇時間：當日頭兩筆當返工（巴士→港鐵）；有 4 筆或以上，最後兩筆當放工
      if (arr[0]) g[arr[0].id] = bus; if (arr[1]) g[arr[1].id] = mtr;
      if (arr.length >= 4) { g[arr[arr.length - 2].id] = bus; g[arr[arr.length - 1].id] = mtr; }
    }
  });
  return g;
}

// ---------- 備份 ----------
function download(name, text) {
  var blob = new Blob([text], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
}
function exportBackup() {
  S.lastBackup = today(); save();
  var data = JSON.stringify({ app: 'my-ledger', kind: 'backup', at: new Date().toISOString(), data: S }, null, 1);
  var name = '記賬備份-' + today() + '.json';
  try {
    var file = new File([data], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(function () {}); return; }
  } catch (e) {}
  download(name, data);
}
function importFile(text) {
  var j; try { j = JSON.parse(text); } catch (e) { return toast('檔案唔係 JSON'); }
  if (!j || j.app !== 'my-ledger' || !j.data) return toast('呢個唔係記賬檔');
  if (j.kind === 'backup') {
    if (!confirm('還原備份會用備份取代而家所有資料（' + S.records.length + ' 筆記錄）。確定？')) return;
    S = Object.assign(blank(), j.data); save(); U.sheet = null; return toast('已還原 ' + S.records.length + ' 筆記錄');
  }
  // 設定檔：合併，唔會刪你記錄
  var d = j.data, msg = [];
  (d.accounts || []).forEach(function (a) { var o = acctBy(a.name); if (o) Object.assign(o, a); else S.accounts.push(Object.assign({ type: 'bank', ic: 54, open: 0, openDate: '', stmt: 0, due: 0, wallet: '' }, a)); });
  if (d.accounts) msg.push(d.accounts.length + ' 個帳戶');
  if (d.budgets) { Object.assign(S.budgets, d.budgets); msg.push('預算'); }
  if (d.selfBase != null) S.selfBase = d.selfBase;
  if (d.startMonth) S.startMonth = d.startMonth;
  if (d.cardPaid) Object.assign(S.cardPaid, d.cardPaid);
  if (d.name != null) S.name = d.name;
  if (d.gUrl) { S.gUrl = d.gUrl; S.gKey = d.gKey || ''; msg.push('Google 同步'); }
  if (d.commute) S.commute = Object.assign({}, S.commute, d.commute);
  if (d.learned) { Object.assign(S.learned, d.learned); msg.push(Object.keys(d.learned).length + ' 個商戶分類'); }
  if (d.records) { var ids = {}; S.records.forEach(function (r) { ids[r.id] = 1; }); var n = 0; d.records.forEach(function (r) { if (!ids[r.id]) { S.records.push(r); n++; } }); S.nextId = Math.max(S.nextId, 1 + Math.max.apply(null, S.records.map(function (r) { return +r.id || 0; }).concat([0]))); msg.push(n + ' 筆記錄'); }
  if (d.renameAccts) { Object.keys(d.renameAccts).forEach(function (o) { var nn = d.renameAccts[o]; S.records.forEach(function (r) { if (r.acct === o) r.acct = nn; if (r.to === o) r.to = nn; }); }); }
  save(); U.sheet = null; toast('已匯入：' + (msg.join('、') || '設定'));
}

// ---------- Google 同步（Apple Pay 捷徑 → Google Sheet → App） ----------
var syncing = false;
function gsync(manual) {
  if (!S.gUrl || !S.gKey || syncing || !navigator.onLine) { if (manual && !S.gUrl) toast('未設定 Google 同步'); return; }
  syncing = true;
  var base = S.gUrl + (S.gUrl.indexOf('?') >= 0 ? '&' : '?') + 'key=' + encodeURIComponent(S.gKey);
  fetch(base + '&action=list', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
    if (!j.ok) throw new Error(j.err || 'err');
    var rows = j.rows || [];
    S.lastSync = new Date().toISOString(); save();
    if (!rows.length) { syncing = false; if (manual) toast('冇新記錄'); render(); return; }
    var lines = rows.map(function (r) {
      var d = String(r.d || '').trim(), t = String(r.t || '').trim();
      return d + (t ? ' ' + t : '') + '|' + (r.a || '') + '|' + (r.m || '') + '|' + (r.c || '') + '|g' + r.id;
    }).join('\n');
    var msg = importKJ(lines);
    var ids = rows.map(function (r) { return r.id; }).join(',');
    return fetch(base + '&action=ack&ids=' + encodeURIComponent(ids), { cache: 'no-store' }).then(function () { syncing = false; toast('同步：' + msg); });
  }).catch(function (e) { syncing = false; if (manual) toast('同步唔到：' + (e.message === 'key' ? '密碼唔啱' : '檢查網絡或者網址')); });
}

// ---------- 講嘢記賬 ----------
function parseVoice(text) {
  var f = U.f, t = String(text || '').trim(); if (!t) return '請講或者打一句，例如：午餐 68 PayMe';
  var hint = [];
  var am = t.match(/(\d+(?:\.\d+)?)/); if (am) { f.amt = am[1]; t = t.replace(am[0], ' '); hint.push('金額 ' + fmt(+am[1])); }
  var hit = null, low = t.toLowerCase();
  S.accounts.forEach(function (a) { [a.name].concat(String(a.wallet || '').split(/[,，]/)).forEach(function (n) { n = n.trim(); if (n && !hit && low.indexOf(n.toLowerCase()) >= 0) { hit = a; t = t.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' '); } }); });
  if (!hit) t.split(/\s+/).forEach(function (w) { var wl = w.toLowerCase(); if (hit || wl.length < 2) return; S.accounts.forEach(function (a) { if (!hit && a.name.toLowerCase().indexOf(wl) === 0) { hit = a; t = t.replace(w, ' '); } }); });
  if (hit) { f.acct = hit.name; f.atype = hit.type; hint.push(hit.name); }
  var note = t.replace(/\s+/g, ' ').replace(/[$港幣蚊元]/g, '').trim();
  if (note) { f.note = note; var g = guessCat(note); if (g) { f.cat = g[0]; f.sub = g[1]; f.step = 'done'; hint.push(zh(g[0]) + ' › ' + g[1]); } else hint.push('「' + note + '」未識，請揀分類'); }
  return '整理咗：' + hint.join(' · ');
}

// ---------- 畫面元件 ----------
var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function enMonth(mk) { return MON[+mk.slice(5, 7) - 1] + ' ' + mk.slice(0, 4); }
function header(title, back, mk) {
  return '<header class="phd"><div class="phd-l">' + (back ? '<button type="button" class="back" data-a="tab" data-x="' + back + '">‹ ' + (back === 'more' ? '更多' : '返回') + '</button>' : '<span class="enm">' + enMonth(mk || mkOf(today())) + '</span>') +
    '<span class="ptitle">' + esc(title) + '</span></div></header>';
}
function recRow(r, showDate) {
  var title = r.type === 'trf' ? (r.kind || '轉賬') : (r.note || (r.type === 'exp' ? (r.sub || '待分類') : zh(r.cat)));
  var meta = r.type === 'trf' ? esc(r.acct) + ' → ' + esc(r.to) : (r.type === 'exp' ? (r.cat ? esc(zh(r.cat)) + ' › ' + esc(r.sub) : '<b class="warn">未揀分類</b>') : esc(zh(r.cat))) + (r.type !== 'trf' ? ' · ' + esc(r.acct) : '');
  if (showDate) meta = md(r.date) + ' · ' + meta; else if (r.time) meta = r.time + ' · ' + meta;
  var icn = r.type === 'trf' ? (TRF.filter(function (t) { return t[0] === r.kind; })[0] || [0, 'n42'])[1] : (r.type === 'exp' ? (r.cat ? catIc(r.cat, r.sub) : 54) : catIc(r.cat));
  var amt = r.type === 'exp' ? '-' + fmt(r.amt).replace('-', '') : (r.type === 'inc' ? '+' + fmt(r.amt) : fmt(r.amt));
  var cls = r.type === 'inc' ? 'pos' : (r.type === 'trf' ? 'mutc' : '');
  var tag = r.pend ? '待確認' : r.est ? (r.fx ? '匯率估算' : '外幣') : r.type === 'trf' ? '唔計支出' : (r.type === 'inc' && OFFSETS.indexOf(r.cat) >= 0) ? (r.cat === 'BB 回款' ? '抵銷共同生活' : '抵銷') : r.fx ? r.fx.cur + ' ' + r.fx.amt : '';
  return '<button type="button" class="rrow tap" data-a="editRec" data-x="' + r.id + '">' + ic(icn, 36) +
    '<span class="grow"><span class="t1">' + esc(title) + '</span><span class="t2">' + meta + '</span></span>' +
    '<span class="rr"><span class="amt ' + cls + '">' + amt + '</span>' + (tag ? '<span class="tagp">' + esc(tag) + '</span>' : '') + '</span></button>';
}
function sortRecs(a) { return a.sort(function (x, y) { return x.date < y.date ? 1 : x.date > y.date ? -1 : (x.time || '') < (y.time || '') ? 1 : (x.time || '') > (y.time || '') ? -1 : y.id - x.id; }); }
function greet() { var h = new Date().getHours(); return h < 12 ? 'Good morning,' : h < 18 ? 'Good afternoon,' : 'Good evening,'; }
function isDaily(r) { return r.type === 'exp' && ['住屋 Home', '債務還款 Debt', '財務費用 Fees', '公司代付 Company', '醫療保險 Health', '稅項 Tax'].indexOf(r.cat) < 0; }

// ---------- 主頁 ----------
function todos() {
  var todo = [];
  if (S.accounts.length && !S.gUrl && S.lastKJ !== today()) todo.push(['匯入今日捷徑記錄', 'Apple Pay 已經自動記低，揀 kuaiji.txt 就入晒', '匯入', 'kj', false]);
  if (S.octPend.length) todo.push(['補 ' + S.octPend.length + ' 筆八達通', '一頁填晒，通勤會自動估', '補', 'oct', true]);
  var pend = S.records.filter(function (r) { return r.pend; });
  if (pend.length) todo.push(['確認 ' + pend.length + ' 筆捷徑記錄', pend.some(function (r) { return !r.cat; }) ? '有新商戶要揀分類' : '每筆一撳 ✓', '睇', 'pend', pend.some(function (r) { return !r.cat; })]);
  S.accounts.forEach(function (a) {
    if (a.type !== 'card' || !a.due || !a.stmt) return;
    var d = nextDue(a), n = daysTo(d), owed = a.openDate ? -bal(a.name, lastStmt(a)) : 0;
    if (S.cardPaid[a.name] === d || n > 7 || n < -3) return;
    todo.push(['還 ' + a.name + (owed > 0 ? ' ' + fmt(owed) : ''), (n < 0 ? '過咗 ' + (-n) + ' 日！' : n === 0 ? '今日到期' : n + ' 日後到期'), '還', 'pay:' + a.name, n <= 2]);
  });
  var rq = S.accounts.filter(function (a) { if (a.type !== 'card' || !a.stmt || !a.openDate) return false; var r = S.recon[a.name]; return !(r && r.at >= lastStmt(a)); });
  if (rq.length) todo.push(['對數：' + rq[0].name + (rq.length > 1 ? '（仲有 ' + (rq.length - 1) + ' 張）' : ''), md(lastStmt(rq[0])) + ' 截數 · 打月結單結欠就得', '對', 'recon:' + rq[0].name, false]);
  var mk = mkOf(today()), over = FLEXCAT.filter(function (c) { var b = effBud(mk, c); return b > 0 && actual(mk, c) > b; });
  if (over.length) todo.push(['超支 ' + over.length + ' 項', over.map(zh).join('、') + ' · 下個月會扣返', '睇', 'tab:budget', false]);
  if (S.records.length && (!S.lastBackup || daysTo(S.lastBackup) <= -14)) todo.push(['備份資料', S.lastBackup ? '上次 ' + md(S.lastBackup) : '仲未備份過', '備份', 'backup', false]);
  return todo;
}
function viewHome() {
  var mk = mkOf(today()), M = monthSum(mk), dl = daysIn(mk) - (+today().slice(8)) + 1;
  var pend = S.records.filter(function (r) { return r.pend; }).length;
  var h = '<div class="hero"><div class="hero-fade"></div>' +
    '<div class="glass pill fu"><i class="live"></i>' + (S.gUrl ? '捷徑同步中' : '捷徑記錄') + ' · ' + pend + ' 筆待確認</div>' +
    '<div class="greet"><span class="g1">' + greet() + '</span><span class="g2">' + esc(S.name || '你好') + ' ♡</span></div></div>';
  h += '<div class="pad">';
  if (!S.accounts.length) {
    h += '<section class="card"><h3>歡迎！</h3><p class="t2">第一次用：撳「匯入設定檔」，揀 <b>記賬設定.json</b>。</p><div class="two"><button type="button" class="btn" data-a="sheet" data-x="file">匯入設定檔</button><button type="button" class="btn ghost" data-a="sheet" data-x="acctNew">自己加帳戶</button></div></section>';
  }
  var pct = M.cBud > 0 ? M.cAct / M.cBud : 0, over = M.cLeft < 0, ro = 188.5 * (1 - Math.max(0, Math.min(1, pct)));
  // 每日洗費線
  var nd = +today().slice(8), vals = [];
  for (var i = 1; i <= nd; i++) vals.push(0);
  M.recs.forEach(function (r) { if (isDaily(r)) { var d = +r.date.slice(8); if (d <= nd) vals[d - 1] += r.amt; } });
  var mx = Math.max.apply(null, vals.concat([1])), pts = vals.map(function (v, i2) { return [nd === 1 ? 300 : Math.round(i2 / (nd - 1) * 300), Math.round(42 - v / mx * 36)]; });
  var pl = pts.map(function (p) { return p.join(','); }).join(' '), last = pts[pts.length - 1];
  h += '<button type="button" class="money fu d1 tap" data-a="tab" data-x="budget" aria-label="今個月仲可以使，撳睇預算"><span class="blob" style="background:' + (over ? '#F2B3A6' : '#F2D0C1') + '"></span>' +
    '<span class="mrow"><span class="mcol"><span class="t2">' + mk.slice(0, 4) + ' 年 ' + (+mk.slice(5)) + ' 月 · 今個月仲可以使</span><span class="big" style="color:' + (over ? '#C0392B' : '#A35C52') + '">' + (M.cBud ? fmt(M.cLeft) : '未設預算') + '</span>' +
    '<span class="msub">' + (M.cBud ? (over ? '超咗預算，下個月會扣返' : '仲有 ' + dl + ' 日 · 平均每日 ' + fmt(Math.floor(M.cLeft / dl))) : '撳入去設定預算') + '</span></span>' +
    '<span class="ringw"><svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8C0AF"/><stop offset="1" stop-color="' + (over ? '#C0392B' : '#A35C52') + '"/></linearGradient></defs><circle cx="42" cy="42" r="30" fill="none" stroke="#F1E4DB" stroke-width="9"/><circle class="ring" cx="42" cy="42" r="30" fill="none" stroke="url(#rg)" stroke-width="9" stroke-linecap="round" transform="rotate(-90 42 42)" style="stroke-dasharray:188.5;stroke-dashoffset:' + ro.toFixed(1) + '"/></svg>' +
    '<span class="ringt"><b>' + Math.round(pct * 100) + '%</b><span>預算已用</span></span></span></span>' +
    '<span class="spk"><svg width="100%" height="46" viewBox="0 0 300 46" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C98A7C" stop-opacity=".28"/><stop offset="1" stop-color="#C98A7C" stop-opacity="0"/></linearGradient></defs><path d="M0,46 L' + pl.replace(/ /g, ' L') + ' L' + last[0] + ',46 Z" fill="url(#sg)"/><polyline class="spark" points="' + pl + '" fill="none" stroke="#B9786B" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="3.5" fill="#A35C52"/></svg>' +
    '<span class="spkl"><span>' + (+mk.slice(5)) + '/1</span><span>每日洗費（唔計按揭）</span><span>今日</span></span></span>' +
    '<span class="more-l">睇預算 ›</span></button>';
  // 四格
  var overN = FLEXCAT.filter(function (c) { var b = effBud(mk, c); return b > 0 && actual(mk, c, M.recs) > b; }).length + (M.poolBase + M.carry - M.poolUsed < 0 ? 1 : 0);
  var owe = 0, setN = 0, cardN = 0, liquid = 0, liqN = 0;
  S.accounts.forEach(function (a) { if (a.type === 'card') { cardN++; if (a.openDate) { setN++; owe += Math.min(0, bal(a.name)); } } else if (a.type !== 'env' && a.openDate) { liqN++; liquid += bal(a.name); } });
  var net = M.income - M.spend;
  var tiles = [
    ['預算', overN ? '超支 ' + overN + ' 項' : (M.cBud ? '未超支 ✓' : '未設'), overN ? '撳睇預算' : '撳睇預算', 'budget', overN ? '#C0392B' : '#4F6B45', overN],
    ['本月收支', (net < 0 ? '−' : '+') + short(Math.abs(net)), '已記收入 − 支出', 'stats', net < 0 ? '#C0392B' : '#4F6B45'],
    ['銀行現金', liqN ? short(liquid) : '未設', liqN ? '銀行＋錢包＋現金' : '1/12 設開始銀碼', 'acct', '#4A3A33'],
    ['卡數', setN ? short(-owe) : '未設', setN ? (setN < cardN ? setN + '/' + cardN + ' 張已設' : '全部信用卡') : '1/12 設開始銀碼', 'acct', '#4A3A33']
  ];
  h += '<div class="tiles4 fu d2">' + tiles.map(function (t) { return '<button type="button" class="tile4 tap' + (t[5] ? ' hot' : '') + '" data-a="tab" data-x="' + t[3] + '"><span class="tl">' + t[0] + '</span><span class="tv" style="color:' + t[4] + '">' + esc(t[1]) + '</span><span class="ts">' + esc(t[2]) + '</span></button>'; }).join('') + '</div>';
  var td = todos();
  h += '<section class="card fu d2"><div class="hd"><h3>今日要做</h3><span class="t2">' + (td.length ? td.length + ' 樣' : '') + '</span></div>' +
    (td.length ? td.map(function (t) { return '<div class="todo"><i class="dot" style="background:' + (t[4] ? '#E0604F' : '#D9B48A') + '"></i><span class="grow"><span class="t1s">' + esc(t[0]) + '</span><span class="t3">' + esc(t[1]) + '</span></span><button type="button" class="btn pillb tap" data-a="todo" data-x="' + esc(t[3]) + '">' + t[2] + '</button></div>'; }).join('')
      : '<p class="okline">今日冇嘢要做 ✓</p>') + '</section>';
  var all = sortRecs(S.records.slice()), rec = all.slice(0, 3);
  h += '<section class="card fu d3"><div class="hd"><h3>最近記錄</h3><button type="button" class="btn soft pillb tap" data-a="tab" data-x="search">搜尋</button></div>' +
    (rec.length ? rec.map(function (r) { return recRow(r, true); }).join('') + (all.length > 3 ? '<button type="button" class="lnk center" data-a="tab" data-x="cal">睇晒 ' + all.length + ' 筆</button>' : '') : '<p class="t2">仲未有記錄，撳下面 ＋ 記第一筆</p>') + '</section>';
  return h + '</div>';
}
function short(n) { n = Math.abs(n); if (n >= 10000) return '$' + (n / 1000).toFixed(1) + 'k'; return '$' + Math.round(n).toLocaleString('en-US'); }

// ---------- 日曆 ----------
function viewCal() {
  var mk = U.month, recs = monthRecs(mk), tot = {}, has = {};
  recs.forEach(function (r) { var d = +r.date.slice(8); has[d] = 1; if (r.type === 'exp') tot[d] = (tot[d] || 0) + r.amt; });
  var h = header('日曆', null, mk) + '<div class="pad">';
  h += '<section class="card"><div class="mnav"><button type="button" class="nav" data-a="month" data-x="-1" aria-label="上個月">‹</button><b>' + mlabel(mk) + '</b><button type="button" class="nav" data-a="month" data-x="1" aria-label="下個月">›</button></div><div class="cal">';
  WD.forEach(function (w) { h += '<span class="wd">' + w + '</span>'; });
  var first = new Date(+mk.slice(0, 4), +mk.slice(5, 7) - 1, 1).getDay(), t = today();
  for (var i = 0; i < first; i++) h += '<span></span>';
  for (var d = 1; d <= daysIn(mk); d++) {
    var ds = mk + '-' + p2(d), fut = ds > t, sel = ds === U.day, past0 = !fut && !has[d] && ds >= (S.startMonth + '-01');
    h += '<button type="button" class="cd' + (sel ? ' sel' : '') + (past0 ? ' none' : '') + (fut ? ' fut' : '') + '" data-a="day" data-x="' + ds + '"><b>' + d + '</b><span>' + (fut ? '' : has[d] ? (tot[d] ? short(tot[d]) : '—') : (past0 ? '●' : '')) + '</span></button>';
  }
  h += '</div><p class="t3">數字 = 當日支出（唔計轉賬）' + ' · <span style="color:#8A5A1A">●</span> 未有記錄</p></section>';
  var dl = sortRecs(S.records.filter(function (r) { return r.date === U.day; }));
  var dt = dl.reduce(function (s, r) { return s + (r.type === 'exp' ? r.amt : 0); }, 0);
  h += '<section class="card"><div class="hd"><h3>' + (+U.day.slice(5, 7)) + ' 月 ' + (+U.day.slice(8)) + ' 日（' + (U.day === t ? '今日' : wd(U.day)) + '）</h3><b>支出 ' + fmt(dt) + '</b></div>' +
    (dl.length ? dl.map(function (r) { return recRow(r); }).join('') : '<p class="t2">呢日冇記錄</p>') +
    '<button type="button" class="btn soft big" data-a="addOn" data-x="' + U.day + '">＋ 喺呢日記一筆</button></section>';
  return h + '</div>';
}

// ---------- 統計 ----------
function viewStats() {
  var mk = U.month, recs = monthRecs(mk), by = {}, tot = 0;
  recs.forEach(function (r) { if (r.type === 'exp' && r.cat !== '公司代付 Company') { by[r.cat] = (by[r.cat] || 0) + r.amt; tot += r.amt; } });
  var cats = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; });
  var COL = ['#C98A7C', '#D9B48A', '#B7A3C9', '#9DB89A', '#E0A899', '#A8BFD0', '#D8C3A5', '#C9A0B5'];
  var h = header('統計', null, mk) + '<div class="pad"><div class="mnav out"><button type="button" class="nav" data-a="month" data-x="-1" aria-label="上個月">‹</button><b>' + mlabel(mk) + '</b><button type="button" class="nav" data-a="month" data-x="1" aria-label="下個月">›</button></div>';
  h += '<section class="card"><div class="hd"><h3>' + (+mk.slice(5)) + ' 月支出（已記錄）</h3><b class="accent">' + fmt(tot) + '</b></div><p class="t3">轉賬、信用卡還款、公司代付唔計</p>' + (cats.length ? '<p class="t3 accent">撳一個分類，睇呢個月用咗啲咩</p>' : '<p class="t2">呢個月未有支出</p>');
  cats.forEach(function (c, i) {
    var p = tot ? by[c] / tot : 0, op = U.open === 's:' + c;
    h += '<button type="button" class="srow tap" data-a="openCat" data-x="s:' + esc(c) + '" aria-expanded="' + op + '">' + ic(CAT[c] ? CAT[c][1] : 54, 36) + '<span class="grow"><span class="sl"><b>' + esc(zh(c)) + ' <span class="car">' + (op ? '▲' : '▼') + '</span></b><span>' + fmt(by[c]) + ' · ' + Math.round(p * 100) + '%</span></span><span class="bar"><i style="width:' + Math.max(2, Math.round(p * 100)) + '%;background:' + COL[i % COL.length] + '"></i></span></span></button>';
    if (op) {
      var subs = {}; recs.forEach(function (r) { if (r.type === 'exp' && r.cat === c) subs[r.sub] = (subs[r.sub] || 0) + r.amt; });
      h += '<div class="inner"><p class="t3">' + Object.keys(subs).map(function (s) { return esc(s) + ' ' + fmt(subs[s]); }).join(' · ') + '</p>' + sortRecs(recs.filter(function (r) { return r.type === 'exp' && r.cat === c; })).map(function (r) { return recRow(r, true); }).join('') + '</div>';
    }
  });
  h += '</section>';
  var ms = [], mx = 1; for (var i2 = 5; i2 >= 0; i2--) { var m2 = addM(mk, -i2), s2 = 0; monthRecs(m2).forEach(function (r) { if (r.type === 'exp' && r.cat !== '公司代付 Company') s2 += r.amt; }); ms.push([m2, s2]); mx = Math.max(mx, s2); }
  h += '<section class="card"><h3>每月支出比較</h3><div class="bars">' + ms.map(function (m) { return '<div class="bcol"><span class="bv">' + (m[1] ? short(m[1]).replace('$', '') : '') + '</span><span class="bb" style="height:' + Math.max(2, Math.round(m[1] / mx * 130)) + 'px;background:' + (m[0] === mkOf(today()) ? '#C98A7C' : '#EBD5CB') + '"></span><span class="bm">' + (+m[0].slice(5)) + '月</span></div>'; }).join('') + '</div><p class="t3">深色 = 本月至今（未完）</p></section>';
  return h + '</div>';
}

// ---------- 預算 ----------
function viewBudget() {
  var mk = U.budTab === 'next' ? addM(mkOf(today()), 1) : U.month, M = monthSum(mk), recs = M.recs, cur = mk === mkOf(today());
  var h = header('預算', 'more') + '<div class="pad">';
  h += '<div class="segp">' + [['now', '今個月'], ['next', '下個月預覽']].map(function (t) { return '<button type="button" class="' + (U.budTab === t[0] ? 'on' : '') + '" data-a="budTab" data-x="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
  if (U.budTab === 'now') h += '<div class="mnav out"><button type="button" class="nav" data-a="month" data-x="-1" aria-label="上個月">‹</button><b>' + mlabel(mk) + '</b><button type="button" class="nav" data-a="month" data-x="1" aria-label="下個月">›</button></div>';
  var passed = cur ? +today().slice(8) : daysIn(mk), proj = U.budTab === 'next' ? 0 : (cur ? M.act / passed * daysIn(mk) : M.act);
  h += '<section class="card sum3"><div><span class="t3">預算</span><b>' + fmt(M.bud) + '</b></div><div><span class="t3">實際</span><b>' + fmt(M.act) + '</b></div><div><span class="t3">' + (cur ? '月尾預測' : U.budTab === 'next' ? '自己使' : '剩／超') + '</span><b>' + (U.budTab === 'next' ? fmt(M.poolBase + M.carry) : cur ? fmt(Math.round(proj)) : fmt(M.left)) + '</b></div></section>';
  var pm = U.budTab === 'next' ? mkOf(today()) : addM(mk, -1), cuts = [];
  if (U.budTab === 'next' || pm >= S.startMonth) FLEXCAT.forEach(function (c) { var B = +S.budgets[c] || 0, a = actual(pm, c); if (B && a > B) cuts.push([zh(c), a - B, B, Math.max(0, B - (a - B))]); });
  if (U.budTab === 'now' && cur) {
    var ov = FLEXCAT.filter(function (c) { var b = effBud(mk, c); return b > 0 && actual(mk, c, recs) > b; });
    if (ov.length) { var ovt = 0; var rows = ov.map(function (c) { var b = effBud(mk, c), a = actual(mk, c, recs); ovt += a - b; return '<div class="kv"><span>' + esc(zh(c)) + ' 超 ' + fmt(a - b) + '</span><b>' + (+addM(mk, 1).slice(5)) + ' 月預算 ' + fmt(+S.budgets[c] || 0) + ' → ' + fmt(Math.max(0, (+S.budgets[c] || 0) - (a - b))) + '</b></div>'; }).join('');
      h += '<section class="card warnc"><h3>超支會喺下個月補返 · 合共 ' + fmt(ovt) + '</h3>' + rows + '<p class="t3">超咗幾多，下個月同一個分類就少幾多。</p></section>'; }
  }
  if (U.budTab === 'next') h += '<section class="card ' + (cuts.length ? 'warnc' : 'okc') + '"><h3>' + (cuts.length ? '因為今個月超支，下個月會扣' : '今個月暫時冇超支，下個月唔使扣 ✓') + '</h3>' + cuts.map(function (c) { return '<div class="kv"><span>' + esc(c[0]) + ' 超 ' + fmt(c[1]) + '</span><b>' + fmt(c[2]) + ' → ' + fmt(c[3]) + '</b></div>'; }).join('') + '<p class="t3">以今日為止計，月尾前仲會變。</p></section>';
  h += '<p class="t3 pl">撳每個分類睇呢個月用咗啲乜，入面可以改預算</p>';
  BGROUPS.forEach(function (g, gi) {
    h += '<section class="card"><h3>' + g[0] + '</h3>';
    if (gi === 1) { var avail = M.poolBase + M.carry, left = avail - M.poolUsed;
      h += '<div class="pool"><div class="kv"><span>每月 ' + fmt(M.poolBase) + (M.carry ? (M.carry > 0 ? ' ＋ 累積 ' : ' − 之前超咗 ') + fmt(Math.abs(M.carry)) : '') + '</span><b class="' + (left < 0 ? 'neg' : 'pos') + '">' + (left < 0 ? '超 ' : '剩 ') + fmt(Math.abs(left)) + '</b></div><span class="bar"><i style="width:' + (avail > 0 ? Math.min(100, Math.round(M.poolUsed / avail * 100)) : 0) + '%;background:' + (left < 0 ? '#E0604F' : '#C98A7C') + '"></i></span><span class="t3">用咗 ' + fmt(M.poolUsed) + ' / ' + fmt(avail) + ' · 用唔晒會累積落下個月</span><button type="button" class="lnk" data-a="editPool">改每月金額</button></div>'; }
    g[1].forEach(function (c) {
      var a = actual(mk, c, recs), B = +S.budgets[c] || 0, b = gi === 1 ? 0 : effBud(mk, c), op = U.open === c, over = gi !== 1 && b > 0 && a > b;
      h += '<button type="button" class="brow tap" data-a="openCat" data-x="' + esc(c) + '" aria-expanded="' + op + '">' + ic(CAT[c][1], 44) + '<span class="grow"><span class="sl"><b>' + esc(zh(c)) + ' <span class="car">' + (op ? '▲' : '▼') + '</span></b>' +
        (gi === 1 ? '<span>用咗 ' + fmt(a) + '</span>' : '<span class="' + (over ? 'neg' : '') + '">' + (b ? (over ? '超支 ' + fmt(a - b) : '剩 ' + fmt(b - a)) : '未設') + '</span>') + '</span>' +
        (gi === 1 ? '' : '<span class="bar"><i style="width:' + (b > 0 ? Math.min(100, Math.round(a / b * 100)) : 0) + '%;background:' + (over ? '#A3412F' : '#C98A7C') + '"></i></span><span class="t3">預算 ' + fmt(b) + (b < B ? '（上月超支扣咗 ' + fmt(B - b) + '）' : '') + ' · 已用 ' + fmt(a) + '</span>') + '</span></button>';
      if (op) {
        var rs = recs.filter(function (r) { return (r.type === 'exp' && r.cat === c) || (c === '共同生活 Shared' && r.type === 'inc' && r.cat === 'BB 回款'); });
        h += '<div class="inner">' + (gi === 1 ? '' : '<button type="button" class="btn soft pillb" data-a="editBud" data-x="' + esc(c) + '">改預算（每月 ' + fmt(B) + '）</button>') + (rs.length ? sortRecs(rs).map(function (r) { return recRow(r, true); }).join('') : '<p class="t3">呢個月未有</p>') + '</div>';
      }
    });
    h += '</section>';
  });
  var nob = 0; recs.forEach(function (r) { if (r.type === 'exp' && ['債務還款 Debt', '財務費用 Fees', '公司代付 Company', '美睫生意 Lash'].indexOf(r.cat) >= 0) nob += r.amt; });
  if (nob) h += '<p class="t3 center">債務還款、財務費用、公司代付、美睫生意唔計預算：' + fmt(nob) + '</p>';
  return h + '</div>';
}

// ---------- 搜尋 ----------
function viewSearch() {
  var h = header('搜尋記錄', 'more') + '<div class="pad"><input class="in" type="search" placeholder="商戶、備註、分類、帳戶或者金額" value="' + esc(U.q) + '" data-f="q" data-live="1" aria-label="搜尋記錄">';
  var q = U.q.trim().toLowerCase();
  if (!q) return h + '<p class="t2 center">打字就會搵</p></div>';
  var list = sortRecs(S.records.filter(function (r) { return [r.note, zh(r.cat || ''), r.sub, r.acct, r.to, r.kind, String(r.amt), r.date].join(' ').toLowerCase().indexOf(q) >= 0; }));
  var tot = list.reduce(function (s, r) { return s + (r.type === 'exp' ? r.amt : 0); }, 0);
  return h + '<section class="card"><div class="hd"><h3>搵到 ' + list.length + ' 筆</h3><b>支出 ' + fmt(tot) + '</b></div>' + list.slice(0, 200).map(function (r) { return recRow(r, true); }).join('') + '</section></div>';
}

// ---------- 帳戶 ----------
function viewAcct() {
  var h = header('帳戶', 'more') + '<div class="pad"><button type="button" class="btn soft big" data-a="sheet" data-x="acctNew">＋ 加帳戶</button>';
  ATYPES.forEach(function (t) {
    var as = S.accounts.filter(function (a) { return a.type === t[0]; }); if (!as.length) return;
    var tot = as.reduce(function (s, a) { return s + (a.openDate ? bal(a.name) : 0); }, 0);
    h += '<section class="card"><div class="hd"><h3>' + t[1] + '</h3><b class="' + (tot < 0 ? 'neg' : '') + '">' + fmt(tot) + '</b></div>';
    as.forEach(function (a) {
      var b = bal(a.name), r = S.recon[a.name], meta = [];
      meta.push(a.openDate ? '由 ' + md(a.openDate) + ' 計' : '未設開始銀碼');
      if (t[0] === 'card' && a.stmt) meta.push(a.stmt + ' 號截數'); if (t[0] === 'card' && a.due) meta.push(a.due + ' 號到期');
      if (r) meta.push(Math.abs(r.diff) < 0.005 ? '✓ ' + md(r.at) + ' 啱數' : '⚠ 差 ' + fmt(r.diff));
      h += '<div class="arow">' + ic(a.ic, 36) + '<button type="button" class="grow plain" data-a="sheet" data-x="acct:' + esc(a.name) + '"><span class="t1s">' + esc(a.name) + '</span><span class="t3">' + esc(meta.join(' · ')) + '</span></button><span class="amt ' + (b < 0 ? 'neg' : '') + '">' + (a.openDate ? fmt(b) : '—') + '</span>' +
        '<button type="button" class="btn ghost pillb" data-a="sheet" data-x="recon:' + esc(a.name) + '">對數</button></div>';
    });
    h += '</section>';
  });
  return h + '</div>';
}

// ---------- 更多 ----------
function viewMore() {
  var items = [
    ['預算', '每個分類嘅預算、實際、剩餘', 15, 'tab:budget'],
    ['帳戶', '結餘、開始銀碼、截數到期日、對數', 103, 'tab:acct'],
    ['搜尋記錄', '用商戶、分類、帳戶或者金額搵', 37, 'tab:search'],
    ['捷徑自動入數', S.gUrl ? 'Google 同步已開' + (S.lastSync ? ' · 上次 ' + S.lastSync.slice(5, 16).replace('T', ' ') : '') : '設定 Google 同步', 'n44', 'sheet:google'],
    ['匯入捷徑記錄', '揀 kuaiji.txt 或者貼上文字', 89, 'sheet:kj'],
    ['八達通通勤規律', '平日巴士 ' + fmt(S.commute.bus) + ' → 港鐵 ' + fmt(S.commute.mtr) + (S.commute.on ? '' : '（已關）'), 'n30', 'sheet:commute'],
    ['備份資料', S.lastBackup ? '上次 ' + S.lastBackup + ' · 建議每月 26 號做' : '仲未備份過 · 建議每月 26 號做', 'n19', 'backup'],
    ['匯入設定檔／還原備份', '揀 .json 檔', 38, 'sheet:file'],
    ['你嘅名', S.name || '未設', 71, 'sheet:name'],
    ['預算開始月份', mlabel(S.startMonth) + ' · 自己使累積、超支扣減由呢個月計', 41, 'sheet:start'],
    ['清除所有資料', '小心：清咗就冇', 76, 'wipe']
  ];
  return header('更多') + '<div class="pad"><section class="card list">' + items.map(function (it) {
    return '<button type="button" class="mrowi tap" data-a="go" data-x="' + esc(it[3]) + '">' + ic(it[2], 44) + '<span class="grow"><span class="t1s">' + esc(it[0]) + '</span><span class="t3">' + esc(it[1]) + '</span></span><span class="chev">›</span></button>';
  }).join('') + '</section><p class="t3 center">資料只儲喺呢部手機 · ' + S.records.length + ' 筆記錄 · 第一期</p></div>';
}

// ---------- 記一筆 ----------
function acctPicker(field, typeField, f, exclude) {
  var cur = f[field], typ = f[typeField];
  var types = ATYPES.filter(function (t) { return S.accounts.some(function (a) { return a.type === t[0]; }); });
  if (!types.some(function (t) { return t[0] === typ; })) typ = types.length ? types[0][0] : 'card';
  var h = '<div class="chips">' + types.map(function (t) { return '<button type="button" class="chip ' + (t[0] === typ ? 'on' : '') + '" data-a="fset" data-x="' + typeField + '=' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
  return h + '<div class="chips">' + S.accounts.filter(function (a) { return a.type === typ && a.name !== exclude; }).map(function (a) {
    return '<button type="button" class="achip ' + (a.name === cur ? 'on' : '') + '" data-a="pickAcct" data-x="' + field + '=' + esc(a.name) + '">' + ic(a.ic, 28) + esc(a.name) + '</button>'; }).join('') + '</div>';
}
function acctCard(label, field, typeField, openKey, f, exclude) {
  var a = acctBy(f[field]), open = U[openKey];
  return '<section class="card"><div class="acrow">' + (a ? ic(a.ic, 36) : ic('', 36)) + '<span class="grow"><span class="t3">' + label + '</span><span class="t1s">' + esc(f[field] || '未揀') + '</span></span><button type="button" class="btn soft pillb" data-a="flipU" data-x="' + openKey + '">' + (open ? '收埋' : '更改') + '</button></div>' + (open ? acctPicker(field, typeField, f, exclude) : '') + '</section>';
}
var GDESC = ['住屋、車、交通、飲食…', '購物、美容、興趣娛樂、人情社交…', '債務還款、財務費用、共同生活、公司代付…'];
var GBG = ['linear-gradient(160deg,#FFF6F1,#F6E1D7)', 'linear-gradient(160deg,#FBF3F8,#EFDCE8)', 'linear-gradient(160deg,#FAF7F0,#ECE5D6)'];
function viewAdd() {
  var f = U.f, h = header(f.id ? '改記錄' : '記一筆', f.id ? (U.prev || 'home') : null, mkOf(f.date)) + '<div class="pad">';
  h += '<div class="segp">' + [['exp', '支出', 11], ['inc', '收入', 12], ['trf', '轉賬', 108]].map(function (t) { return '<button type="button" class="' + (f.type === t[0] ? 'on' : '') + '" data-a="ftype" data-x="' + t[0] + '">' + ic(t[2], 28) + t[1] + '</button>'; }).join('') + '</div>';
  if (f.type !== 'trf' && !f.id) h += '<section class="voice"><span class="vl"><i class="live"></i>講嘢記賬 · 撳鍵盤個咪講，或者直接打</span><div class="two"><input class="vin" type="text" placeholder="例如：午餐 68 PayMe" value="' + esc(f.voice || '') + '" data-f="f.voice" aria-label="講嘢記賬"><button type="button" class="vbtn" data-a="voice">整理</button></div>' + (f.vhint ? '<span class="vh">' + esc(f.vhint) + '</span>' : '') + '</section>';
  // 金額
  h += '<section class="card"><div class="hd"><label for="amtIn" class="t2">金額（' + (f.fx ? esc(f.cur) : 'HKD') + '）</label><button type="button" class="chk ' + (f.fx ? 'on' : '') + '" role="checkbox" aria-checked="' + f.fx + '" data-a="fflip" data-x="fx"><i>' + (f.fx ? '✓' : '') + '</i>外幣</button></div>' +
    '<div class="amtline"><input id="amtIn" class="amt-in" ' + (f.kp ? 'readonly' : '') + ' type="' + (f.kp ? 'text' : 'number') + '" inputmode="decimal" placeholder="0" value="' + esc(f.amt) + '" data-f="f.amt"><button type="button" class="kpbtn ' + (f.kp ? 'on' : '') + '" data-a="fflip" data-x="kp" aria-label="計數機" aria-pressed="' + f.kp + '">🧮</button></div>';
  if (f.kp) { var calc = /[+\-]/.test(String(f.amt).replace(/^-/, '')) ? '= ' + fmt(evalAmt(f.amt)) : ''; h += '<div class="t2 calc">' + calc + '</div><div class="kp">' + ['7', '8', '9', '⌫', '4', '5', '6', '+', '1', '2', '3', '−', '.', '0', 'C', '✓'].map(function (k) { return '<button type="button" data-a="kp" data-x="' + k + '">' + k + '</button>'; }).join('') + '</div>'; }
  if (f.fx) h += '<div class="chips">' + CURS.map(function (c) { return '<button type="button" class="chip ' + (c === f.cur ? 'on' : '') + '" data-a="fset" data-x="cur=' + c + '">' + c + '</button>'; }).join('') + '</div><label class="t2">卡實際扣幾多港幣' + (S.fxRate[f.cur] ? '（未知可以留空，用上次匯率 ' + S.fxRate[f.cur] + ' 估）' : '') + '<input class="in" type="number" inputmode="decimal" placeholder="例如 785.40" value="' + esc(f.hkd) + '" data-f="f.hkd"></label>';
  if (f.type !== 'trf') h += '<label class="t2">商戶／備註<input class="in" type="text" value="' + esc(f.note) + '" data-f="f.note" placeholder="例如：iHerb、Keeta、Shell"></label>';
  h += '</section>';
  // 分類
  if (f.type === 'exp') {
    h += '<section class="card">';
    if (f.step === 'done' && f.cat) h += '<div class="acrow">' + ic(catIc(f.cat, f.sub), 44) + '<span class="grow"><span class="t3">分類</span><span class="t1s">' + esc(zh(f.cat)) + ' › ' + esc(f.sub) + '</span></span><button type="button" class="btn soft pillb" data-a="fset" data-x="step=grp">更改</button></div>';
    else {
      if (S.recent.length && f.step === 'grp') h += '<span class="t3">最近用過</span><div class="chips">' + S.recent.slice(0, 6).map(function (k) { var p = k.split('|'); return '<button type="button" class="achip" data-a="pickCat" data-x="' + esc(k) + '">' + ic(catIc(p[0], p[1]), 28) + esc(zh(p[0])) + ' › ' + esc(p[1]) + '</button>'; }).join('') + '</div>';
      if (f.step === 'grp') h += '<span class="t3">揀類別</span><div class="grid3">' + EXP.map(function (g, i) { return '<button type="button" class="gtile tap" style="background:' + GBG[i] + '" data-a="fset" data-x="grp=' + i + '">' + ic(g.ic, 56) + '<b>' + g.name + '</b><span>' + GDESC[i] + '</span></button>'; }).join('') + '</div>';
      if (f.step === 'cat') h += '<button type="button" class="lnk" data-a="fset" data-x="step=grp">‹ ' + EXP[f.grp].name + '</button><div class="grid4">' + EXP[f.grp].cats.map(function (c) { return '<button type="button" class="ctile tap" data-a="fset" data-x="cat=' + esc(c[0]) + '">' + ic(c[1], 44) + '<span>' + esc(zh(c[0])) + '</span></button>'; }).join('') + '</div>';
      if (f.step === 'sub') h += '<button type="button" class="lnk" data-a="fset" data-x="step=cat">‹ ' + esc(zh(f.cat)) + '</button><div class="grid4">' + CAT[f.cat][2].map(function (s) { return '<button type="button" class="ctile tap" data-a="pickCat" data-x="' + esc(f.cat + '|' + s[0]) + '">' + ic(s[1], 44) + '<span>' + esc(s[0]) + '</span></button>'; }).join('') + '</div>';
    }
    h += '</section>';
  }
  if (f.type === 'inc') h += '<section class="card"><span class="t3">類別（BB 回款、公司報銷、朋友還款係抵銷，唔計收入）</span><div class="chips">' + INC.map(function (c) { return '<button type="button" class="achip ' + (c[0] === f.cat ? 'on' : '') + '" data-a="fset" data-x="cat=' + esc(c[0]) + '">' + ic(c[1], 28) + esc(c[0]) + '</button>'; }).join('') + '</div></section>';
  if (f.type === 'trf') h += '<section class="card"><span class="t3">轉賬類型（唔計支出）</span><div class="chips">' + TRF.map(function (t) { return '<button type="button" class="achip ' + (t[0] === f.kind ? 'on' : '') + '" data-a="fset" data-x="kind=' + esc(t[0]) + '">' + ic(t[1], 28) + esc(t[0]) + '</button>'; }).join('') + '</div></section>';
  h += acctCard(f.type === 'trf' ? '由邊個帳戶出' : f.type === 'inc' ? '入咗邊個帳戶' : '帳戶', 'acct', 'atype', 'acctOpen', f);
  if (f.type === 'trf') h += acctCard('轉去邊個帳戶', 'to', 'ttype', 'toOpen', f, f.acct);
  h += '<section class="card"><label class="t2 dline">日期<input class="in" type="date" value="' + esc(f.date) + '" data-f="f.date"></label></section>';
  h += '<button type="button" class="save tap" data-a="saveForm">' + (f.id ? '儲存修改' : '記低') + '</button>';
  if (f.id) h += '<button type="button" class="btn ghost big" data-a="delRec" data-x="' + f.id + '">刪除呢筆</button>';
  return h + '</div>';
}
function sheetOct() {
  var g = octGuess(), h = '<p class="t2">平日返工放工已按通勤規律估好（標「估」），啱就直接撳儲存。</p>';
  S.octPend.slice().sort(function (a, b) { return (a.date + a.time + a.n) < (b.date + b.time + b.n) ? -1 : 1; }).forEach(function (o) {
    var v = U.sheet.v[o.id] || (g[o.id] ? { place: g[o.id][0], amt: String(g[o.id][1]), guess: true } : { place: '', amt: '' });
    h += '<div class="octrow"><div class="t1">' + md(o.date) + '（' + wd(o.date) + '）' + (o.time ? ' ' + o.time : ' 第 ' + o.n + ' 筆') + (v.guess ? ' <i class="est">估</i>' : '') + '</div>' +
      '<div class="chips">' + OCTP.map(function (p) { return '<button type="button" class="chip ' + (p[0] === v.place ? 'on' : '') + '" data-a="octPlace" data-x="' + o.id + '|' + p[0] + '">' + p[0] + '</button>'; }).join('') + '</div>' +
      '<div class="two"><input class="in" type="number" inputmode="decimal" placeholder="金額" value="' + esc(v.amt) + '" data-f="sheet.v.' + o.id + '.amt" data-init="' + esc(JSON.stringify(v)) + '" aria-label="金額"><button type="button" class="btn sm ghost" data-a="octDel" data-x="' + o.id + '">唔記（錯誤記錄）</button></div></div>';
  });
  h += '<button type="button" class="btn big" data-a="octSave">儲存已填嘅</button>';
  var oct = S.accounts.filter(function (a) { return a.type === 'octopus'; })[0];
  if (oct) {
    var b = bal(oct.name);
    h += '<div class="box"><b>對八達通餘額</b><p class="t2">' + (oct.openDate ? 'App 計應該剩 ' + fmt(b) + '（未計上面未儲存嘅）' : '要先喺帳戶設八達通開始銀碼') + '</p><div class="two"><input class="in" type="number" inputmode="decimal" placeholder="八達通 App 顯示嘅餘額" data-f="sheet.octBal" value="' + esc(U.sheet.octBal || '') + '" aria-label="八達通 App 餘額"><button type="button" class="btn sm" data-a="octBal">對數</button></div>' + (U.sheet.octMsg ? '<p class="t1">' + esc(U.sheet.octMsg) + '</p>' : '') + '</div>';
  }
  return h;
}
function sheetPend() {
  var ps = S.records.filter(function (r) { return r.pend; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  if (!ps.length) return '<p class="mut">冇待確認 ✓</p>';
  var sure = ps.filter(function (r) { return r.cat; }).length;
  var h = sure ? '<button type="button" class="btn big" data-a="pendAll">全部確認有分類嘅 ' + sure + ' 筆</button>' : '';
  ps.forEach(function (r) {
    h += '<div class="prow">' + recRow(r) + '<div class="two">' + (r.cat ? '<button type="button" class="btn sm" data-a="pendOK" data-x="' + r.id + '">✓ 啱</button>' : '') + '<button type="button" class="btn sm ghost" data-a="editRec" data-x="' + r.id + '">' + (r.cat ? '改' : '揀分類') + '</button></div></div>';
  });
  return h;
}
function sheetRecon() {
  var a = acctBy(U.sheet.acct); if (!a) return '';
  var isCard = a.type === 'card', asOf = U.sheet.asOf;
  var appB = bal(a.name, asOf), h = '';
  h += '<p class="t2">' + (isCard ? '用月結單上嘅「結欠」，App 會計到截數日 ' + md(asOf) + ' 為止。' : '用銀行 App 而家顯示嘅結餘。') + '</p>';
  h += '<label class="t2">對到幾時<input class="in" type="date" value="' + esc(asOf) + '" data-f="sheet.asOf" data-rc="1"></label>';
  h += '<p class="t1">App 計：' + (isCard ? '欠 ' + fmt(-appB) : fmt(appB)) + '</p>';
  h += '<label class="t2">' + (isCard ? '月結單結欠（正數）' : '銀行顯示結餘') + '<input class="in" type="number" inputmode="decimal" data-f="sheet.v" value="' + esc(U.sheet.v || '') + '"></label>';
  h += '<button type="button" class="btn big" data-a="reconSave">對數</button>';
  if (!a.openDate) h += '<p class="warn">提你：呢個帳戶未設開始銀碼，App 計嘅數未準。去帳戶設定先。</p>';
  return h;
}
function sheetAcct() {
  var a = U.sheet.a, isNew = U.sheet.isNew;
  var h = '<label class="t2">名稱<input class="in" type="text" value="' + esc(a.name) + '" data-f="sheet.a.name"></label>';
  h += '<div class="t2">類型</div><div class="chips">' + ATYPES.map(function (t) { return '<button type="button" class="chip ' + (t[0] === a.type ? 'on' : '') + '" data-a="aset" data-x="type=' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
  h += '<div class="two"><label class="t2">開始銀碼' + (a.type === 'card' ? '（欠款用負數）' : '') + '<input class="in" type="number" inputmode="decimal" value="' + esc(a.open) + '" data-f="sheet.a.open"></label><label class="t2">由邊日開始計<input class="in" type="date" value="' + esc(a.openDate) + '" data-f="sheet.a.openDate"></label></div>';
  if (a.type === 'card') h += '<div class="two"><label class="t2">截數日（每月幾號）<input class="in" type="number" inputmode="numeric" value="' + esc(a.stmt || '') + '" data-f="sheet.a.stmt"></label><label class="t2">到期日（每月幾號）<input class="in" type="number" inputmode="numeric" value="' + esc(a.due || '') + '" data-f="sheet.a.due"></label></div>';
  h += '<label class="t2">錢包／捷徑卡名（用逗號分開，捷徑匯入時用嚟對帳戶）<input class="in" type="text" value="' + esc(a.wallet || '') + '" data-f="sheet.a.wallet" placeholder="例如 Standard Chartered"></label>';
  h += '<button type="button" class="btn big" data-a="acctSave">' + (isNew ? '加帳戶' : '儲存') + '</button>';
  if (!isNew) {
    var rs = S.records.filter(function (r) { return r.acct === a.oldName || r.to === a.oldName; }).sort(function (x, y) { return x.date < y.date ? 1 : -1; }).slice(0, 15);
    h += '<h3 class="mt">最近記錄</h3>' + (rs.length ? rs.map(recRow).join('') : '<p class="mut">未有</p>');
    h += '<button type="button" class="btn ghost big" data-a="acctDel">刪除帳戶</button>';
  }
  return h;
}
function sheetKJ() {
  return '<p class="t2">捷徑每碌一次卡會寫一行入 kuaiji.txt。喺呢度揀個檔（喺「檔案」App），或者成段貼落下面。已經匯入過嘅行唔會重複入。</p>' +
    '<label class="btn big filebtn">揀 kuaiji.txt<input type="file" accept=".txt,text/plain" data-file="kj" hidden></label>' +
    '<textarea class="in" rows="6" placeholder="或者貼上：2026-11-21|Shell|400|Citi Cash Back" data-f="sheet.text"></textarea>' +
    '<button type="button" class="btn big ghost" data-a="kjPaste">匯入貼上嘅文字</button>' + (U.sheet.msg ? '<p class="t1">' + esc(U.sheet.msg) + '</p>' +
      (S.octPend.length ? '<button type="button" class="btn big" data-a="sheet" data-x="oct">下一步：補 ' + S.octPend.length + ' 筆八達通</button>' : '') +
      (S.records.some(function (r) { return r.pend; }) ? '<button type="button" class="btn big ghost" data-a="sheet" data-x="pend">確認捷徑記錄</button>' : '') : '');
}
function sheetFile() {
  return '<p class="t2"><b>設定檔</b>：加入帳戶、預算等等，唔會刪你嘅記錄。<br><b>備份檔</b>：還原成備份嗰陣，會取代而家所有資料。</p>' +
    '<label class="btn big filebtn">揀 .json 檔<input type="file" accept=".json,application/json" data-file="json" hidden></label>';
}
function sheetCommute() {
  var C = S.commute;
  return '<p class="t2">平日朝早 7–10 點、夜晚 5–9 點：第一筆當巴士、第二筆當港鐵。捷徑冇記時間嘅話，用當日頭兩筆當返工、最後兩筆當放工。</p>' +
    '<button type="button" class="chk ' + (C.on ? 'on' : '') + '" role="checkbox" aria-checked="' + C.on + '" data-a="commuteOn"><i>' + (C.on ? '✓' : '') + '</i>自動估通勤金額</button>' +
    '<div class="two"><label class="t2">巴士車費<input class="in" type="number" inputmode="decimal" value="' + esc(C.bus) + '" data-f="sheet.bus"></label><label class="t2">港鐵車費<input class="in" type="number" inputmode="decimal" value="' + esc(C.mtr) + '" data-f="sheet.mtr"></label></div>' +
    '<button type="button" class="btn big" data-a="commuteSave">儲存</button>';
}
function sheetNum(title) {
  return '<label class="t2">' + esc(title) + '<input class="in" type="' + (U.sheet.inType || 'number') + '"' + (U.sheet.inType ? '' : ' inputmode="decimal"') + ' value="' + esc(U.sheet.v) + '" data-f="sheet.v"></label><button type="button" class="btn big" data-a="numSave">儲存</button>';
}
function sheetGoogle() {
  var s = U.sheet;
  return '<p class="t2">設定好之後，你每次碌 Apple Pay，捷徑會喺背景將交易送去你自己嘅 Google Sheet；開 App 就會自動入晒數，唔使匯入 kuaiji.txt。</p>' +
    '<label class="t2">網頁應用程式網址（/exec 結尾）<input class="in" type="url" value="' + esc(s.url) + '" data-f="sheet.url" placeholder="https://script.google.com/macros/s/…/exec"></label>' +
    '<label class="t2">密碼（KEY）<input class="in" type="text" value="' + esc(s.key) + '" data-f="sheet.key" autocomplete="off"></label>' +
    '<button type="button" class="btn big" data-a="googleSave">儲存並試同步</button>' +
    (S.gUrl ? '<button type="button" class="btn ghost big" data-a="googleSync">即刻同步</button><button type="button" class="btn ghost big" data-a="googleOff">停用 Google 同步</button>' : '');
}
var SHEETS = {
  oct: function () { return ['補八達通', sheetOct()]; },
  pend: function () { return ['待確認', sheetPend()]; },
  recon: function () { return ['對數：' + U.sheet.acct, sheetRecon()]; },
  acct: function () { return [U.sheet.isNew ? '加帳戶' : U.sheet.a.oldName, sheetAcct()]; },
  kj: function () { return ['匯入捷徑記錄', sheetKJ()]; },
  file: function () { return ['匯入檔案', sheetFile()]; },
  commute: function () { return ['八達通通勤規律', sheetCommute()]; },
  google: function () { return ['捷徑自動入數（Google）', sheetGoogle()]; },
  num: function () { return [U.sheet.title, sheetNum(U.sheet.label)]; }
};

// ---------- 畫 ----------
var app = document.getElementById('app');
function render() {
  var sc = document.querySelector('.sheet-body'), st = sc ? sc.scrollTop : 0, sameSheet = U.sheet && render._k === U.sheet.k;
  var V = { home: viewHome, cal: viewCal, stats: viewStats, more: viewMore, budget: viewBudget, acct: viewAcct, search: viewSearch, add: viewAdd };
  if (U.tab === 'add' && !U.f) U.tab = 'home';
  var body = (V[U.tab] || viewHome)();
  var nav = [['home', '主頁', 118], ['cal', '日曆', 77], ['add', '', 0], ['stats', '統計', 104], ['more', '更多', 0]];
  var sub = { budget: 'more', acct: 'more', search: 'more' };
  var h = '<main class="main' + (U.tab === 'home' ? ' homep' : '') + '">' + body + '</main>';
  h += '<nav class="tabs glass" aria-label="主選單">' + nav.map(function (n) {
    if (n[0] === 'add') return '<button type="button" class="orb pulse tap" data-a="add" aria-label="記一筆"><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg></button>';
    var on = U.tab === n[0] || sub[U.tab] === n[0];
    return '<button type="button" class="nb ' + (on ? 'on' : '') + '" data-a="tab" data-x="' + n[0] + '" aria-current="' + (on ? 'page' : 'false') + '">' + ic(n[2], 28) + '<span>' + n[1] + '</span></button>';
  }).join('') + '</nav>';
  if (U.sheet) { var s = SHEETS[U.sheet.kind](); h += '<div class="scrim" data-a="close"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(s[0]) + '"><div class="sheet-hd"><b>' + esc(s[0]) + '</b><button type="button" class="x" data-a="close" aria-label="關閉">✕</button></div><div class="sheet-body">' + s[1] + '</div></div>'; }
  if (U.toast) h += '<div class="toast" role="status">' + esc(U.toast) + '</div>';
  app.innerHTML = h;
  document.body.classList.toggle('lock', !!U.sheet);
  if (U.sheet) { render._k = U.sheet.k; var sc2 = document.querySelector('.sheet-body'); if (sc2 && sameSheet) sc2.scrollTop = st; } else render._k = null;
}
function openSheet(kind, extra) { U.sheet = Object.assign({ kind: kind, k: Math.random() }, extra || {}); render(); }
function openAdd(f) { if (!S.accounts.length) return toast('先加帳戶或者匯入設定檔'); if (U.tab !== 'add') U.prev = U.tab; U.f = f; U.tab = 'add'; U.sheet = null; U.acctOpen = false; U.toOpen = false; window.scrollTo(0, 0); render(); }

// ---------- 動作 ----------
function setPath(obj, path, val) { var p = path.split('.'), o = obj; for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null || typeof o[p[i]] !== 'object') o[p[i]] = {}; o = o[p[i]]; } o[p[p.length - 1]] = val; }
var A = {
  tab: function (x) { if (x === 'add') return A.add(); U.tab = x; U.open = ''; if (x !== 'budget') U.budTab = 'now'; window.scrollTo(0, 0); render(); },
  month: function (x) { U.month = addM(U.month, +x); U.open = ''; if (mkOf(U.day) !== U.month) U.day = U.month === mkOf(today()) ? today() : U.month + '-01'; render(); },
  day: function (x) { U.day = x; render(); },
  budTab: function (x) { U.budTab = x; U.open = ''; render(); },
  add: function () { openAdd(newForm()); setTimeout(function () { var i = document.getElementById('amtIn'); if (i) i.focus(); }, 80); },
  addOn: function (x) { openAdd(newForm({ date: x })); },
  close: function () { U.sheet = null; render(); },
  flipU: function (x) { U[x] = !U[x]; render(); },
  voice: function () { U.f.vhint = parseVoice(U.f.voice); render(); },
  sheet: function (x) {
    if (x === 'file' || x === 'kj' || x === 'oct' || x === 'pend' || x === 'commute') return openSheet(x, { v: {}, bus: S.commute.bus, mtr: S.commute.mtr });
    if (x === 'google') return openSheet('google', { url: S.gUrl, key: S.gKey });
    if (x === 'acctNew') return openSheet('acct', { isNew: true, a: { name: '', type: 'card', ic: 'n29', open: '', openDate: today(), stmt: '', due: '', wallet: '' } });
    if (x.indexOf('acct:') === 0) { var a = acctBy(x.slice(5)); return openSheet('acct', { isNew: false, a: Object.assign({ oldName: a.name }, a) }); }
    if (x.indexOf('recon:') === 0) { var ac = acctBy(x.slice(6)); return openSheet('recon', { acct: ac.name, asOf: ac.type === 'card' && ac.stmt ? lastStmt(ac) : today(), v: '' }); }
    if (x === 'start') return openSheet('num', { title: '預算開始月份', label: '月份（例如 2026-12）', v: S.startMonth, inType: 'month', save: function (v) { if (/^\d{4}-\d{2}$/.test(v)) S.startMonth = v; } });
    if (x === 'name') return openSheet('num', { title: '你嘅名', label: '主頁會寫 Good evening, 你個名', v: S.name, inType: 'text', save: function (v) { S.name = String(v || '').trim(); } });
  },
  go: function (x) {
    if (x.indexOf('tab:') === 0) return A.tab(x.slice(4));
    if (x.indexOf('sheet:') === 0) return A.sheet(x.slice(6));
    if (x === 'backup') return exportBackup();
    if (x === 'wipe') { if (confirm('清除所有資料？（建議先備份）') && confirm('真係清？清咗就冇。')) { S = blank(); save(); toast('已清除'); } }
  },
  todo: function (x) {
    if (x.indexOf('tab:') === 0) return A.tab(x.slice(4));
    if (x === 'oct' || x === 'pend' || x === 'kj') return A.sheet(x);
    if (x === 'backup') return exportBackup();
    if (x.indexOf('recon:') === 0) return A.sheet(x);
    if (x.indexOf('pay:') === 0) {
      var c = acctBy(x.slice(4)), owed = c.openDate ? Math.max(0, -bal(c.name, lastStmt(c))) : 0;
      var from = S.accounts.filter(function (a) { return a.type === 'bank'; })[0];
      openAdd(newForm({ type: 'trf', kind: '信用卡還款', to: c.name, ttype: 'card', acct: from ? from.name : '', atype: 'bank', amt: owed ? String(owed) : '' }));
    }
  },
  ftype: function (x) { var f = U.f; f.type = x; f.cat = ''; f.sub = ''; f.step = 'grp'; render(); },
  fflip: function (x) { var f = U.f; f[x] = !f[x]; render(); },
  fset: function (x) {
    var f = U.f, i = x.indexOf('='), k = x.slice(0, i), v = x.slice(i + 1);
    if (k === 'grp') { f.grp = +v; f.step = 'cat'; }
    else if (k === 'cat' && f.type === 'exp') { f.cat = v; f.step = 'sub'; }
    else f[k] = v;
    render();
  },
  pickAcct: function (x) { var i = x.indexOf('='), k = x.slice(0, i); U.f[k] = x.slice(i + 1); if (k === 'acct') U.acctOpen = false; else U.toOpen = false; render(); },
  pickCat: function (x) { var f = U.f, p = x.split('|'); f.cat = p[0]; f.sub = p[1]; f.step = 'done'; render(); },
  kp: function (k) {
    var f = U.f, s = String(f.amt || '');
    if (k === '⌫') s = s.slice(0, -1); else if (k === 'C') s = ''; else if (k === '✓') { s = String(evalAmt(s) || ''); f.kp = false; }
    else if (k === '−') s += '-'; else s += k;
    f.amt = s; render();
  },
  saveForm: function () { saveForm(); },
  editRec: function (x) { var r = S.records.filter(function (y) { return y.id === +x; })[0]; if (!r) return; var back = U.sheet && U.sheet.kind === 'pend'; openAdd(Object.assign(formFromRec(r), { after: back ? function () { A.sheet('pend'); } : null })); },
  delRec: function (x) { if (!confirm('刪除呢筆記錄？')) return; S.records = S.records.filter(function (r) { return r.id !== +x; }); save(); U.f = null; U.tab = U.prev || 'home'; toast('已刪除'); },
  openCat: function (x) { U.open = U.open === x ? '' : x; render(); },
  editBud: function (x) { openSheet('num', { title: zh(x) + ' 每月預算', label: '金額', v: S.budgets[x] || '', save: function (v) { S.budgets[x] = r2(evalAmt(v)); } }); },
  editPool: function () { openSheet('num', { title: '自己使：每月金額', label: '金額（用唔晒會累積落下個月）', v: S.selfBase || '', save: function (v) { S.selfBase = r2(evalAmt(v)); } }); },
  numSave: function () { U.sheet.save(U.sheet.v); save(); U.sheet = null; toast('已更新'); },
  octPlace: function (x) {
    var p = x.split('|'), id = p[0], pl = p[1], g = octGuess(); var cur = U.sheet.v[id] || (g[id] ? { place: g[id][0], amt: String(g[id][1]) } : { amt: '' });
    cur = Object.assign({}, cur, { place: pl, guess: false });
    if (!cur.amt && pl === '巴士') cur.amt = String(S.commute.bus || ''); if (!cur.amt && pl === '港鐵') cur.amt = String(S.commute.mtr || '');
    U.sheet.v[id] = cur; render();
  },
  octDel: function (x) { if (!confirm('呢筆八達通當冇發生（例如捷徑重複觸發）？')) return; S.octPend = S.octPend.filter(function (o) { return o.id !== +x; }); save(); render(); },
  octSave: function () {
    var g = octGuess(), oct = S.accounts.filter(function (a) { return a.type === 'octopus'; })[0], n = 0;
    if (!oct) return toast('先加一個「八達通」類型帳戶');
    S.octPend = S.octPend.filter(function (o) {
      var v = U.sheet.v[o.id] || (g[o.id] ? { place: g[o.id][0], amt: String(g[o.id][1]) } : null);
      var amt = v ? evalAmt(v.amt) : 0; if (!(amt > 0)) return true;
      var pl = OCTP.filter(function (p) { return p[0] === (v.place || '其他'); })[0] || OCTP[5];
      S.records.push({ id: nid(), date: o.date, type: 'exp', amt: amt, acct: oct.name, cat: pl[1], sub: pl[2], note: '八達通 · ' + (v.place || '其他'), src: 'oct', time: o.time });
      n++; return false;
    });
    save(); var left = S.octPend.length; U.sheet.v = {}; if (!left) U.sheet = null; toast('已記 ' + n + ' 筆八達通' + (left ? '，仲有 ' + left + ' 筆' : ''));
  },
  octBal: function () { var oct = S.accounts.filter(function (a) { return a.type === 'octopus'; })[0]; var v = parseFloat(U.sheet.octBal); if (!oct.openDate) { U.sheet.octMsg = '先設八達通開始銀碼'; return render(); } if (isNaN(v)) return toast('請輸入餘額');
    var d = r2(v - bal(oct.name)); S.recon[oct.name] = { diff: d, at: today() }; save(); U.sheet.octMsg = Math.abs(d) < 0.005 ? '✓ 啱數' : '差 ' + fmt(d) + (d < 0 ? '：可能仲有 ' + fmt(-d) + ' 未記' : '：可能記多咗'); render(); },
  pendOK: function (x) { S.records.forEach(function (r) { if (r.id === +x) { r.pend = false; if (r.mer && r.cat) S.learned[r.mer.toLowerCase()] = [r.cat, r.sub]; } }); save(); if (!S.records.some(function (r) { return r.pend; })) U.sheet = null; render(); },
  pendAll: function () { var n = 0; S.records.forEach(function (r) { if (r.pend && r.cat) { r.pend = false; n++; if (r.mer) S.learned[r.mer.toLowerCase()] = [r.cat, r.sub]; } }); save(); if (!S.records.some(function (r) { return r.pend; })) U.sheet = null; toast('已確認 ' + n + ' 筆'); },
  reconSave: function () {
    var a = acctBy(U.sheet.acct), v = parseFloat(U.sheet.v); if (isNaN(v)) return toast('請填數');
    var appB = bal(a.name, U.sheet.asOf), target = a.type === 'card' ? -Math.abs(v) : v, d = r2(target - appB);
    S.recon[a.name] = { diff: d, at: today(), asOf: U.sheet.asOf }; save(); U.sheet = null;
    toast(Math.abs(d) < 0.005 ? '✓ 啱數' : '差 ' + fmt(Math.abs(d)) + (target < appB ? '：可能漏記咗支出' : '：可能記多咗或者重複') + '，去「日曆」搵吓');
  },
  aset: function (x) { var i = x.indexOf('='); U.sheet.a[x.slice(0, i)] = x.slice(i + 1); render(); },
  acctSave: function () {
    var a = U.sheet.a, nm = String(a.name || '').trim(); if (!nm) return toast('請填名稱');
    if ((U.sheet.isNew || nm !== a.oldName) && acctBy(nm)) return toast('已經有同名帳戶');
    var o = { name: nm, type: a.type, ic: a.ic != null ? a.ic : 54, open: r2(evalAmt(a.open)), openDate: a.openDate || '', stmt: Math.min(31, +a.stmt || 0), due: Math.min(31, +a.due || 0), wallet: a.wallet || '' };
    if (String(a.open).trim().indexOf('-') === 0) o.open = -Math.abs(o.open);
    if (U.sheet.isNew) { o.ic = { card: 'n29', bank: 101, wallet: 89, cash: 75, octopus: 'n30', env: 'n19' }[o.type]; S.accounts.push(o); }
    else { var old = a.oldName; S.accounts = S.accounts.map(function (x) { return x.name === old ? o : x; }); if (old !== nm) S.records.forEach(function (r) { if (r.acct === old) r.acct = nm; if (r.to === old) r.to = nm; }); }
    save(); U.sheet = null; toast('已儲存');
  },
  acctDel: function () { var nm = U.sheet.a.oldName, used = S.records.some(function (r) { return r.acct === nm || r.to === nm; }); if (used) return toast('有記錄用緊呢個帳戶，刪唔到；可以改名'); if (!confirm('刪除 ' + nm + '？')) return; S.accounts = S.accounts.filter(function (a) { return a.name !== nm; }); save(); U.sheet = null; render(); },
  kjPaste: function () { U.sheet.msg = importKJ(U.sheet.text || ''); render(); },
  commuteOn: function () { S.commute.on = !S.commute.on; save(); render(); },
  commuteSave: function () { S.commute.bus = r2(evalAmt(U.sheet.bus)); S.commute.mtr = r2(evalAmt(U.sheet.mtr)); save(); U.sheet = null; toast('已更新'); },
  googleSave: function () { var u = String(U.sheet.url || '').trim(), k = String(U.sheet.key || '').trim(); if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(u)) return toast('網址要係 https://script.google.com/… 開頭'); if (!k) return toast('請填密碼'); S.gUrl = u; S.gKey = k; save(); U.sheet = null; render(); gsync(true); },
  googleSync: function () { U.sheet = null; render(); gsync(true); },
  googleOff: function () { if (!confirm('停用 Google 同步？')) return; S.gUrl = ''; S.gKey = ''; save(); U.sheet = null; toast('已停用'); }
};
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-a]'); if (!el) return;
  var f = A[el.getAttribute('data-a')]; if (f) { e.preventDefault(); f(el.getAttribute('data-x'), el); }
});
document.addEventListener('input', function (e) {
  var el = e.target, p = el.getAttribute && el.getAttribute('data-f'); if (!p) return;
  if (p.indexOf('sheet.') === 0) {
    if (!U.sheet) return;
    var init = el.getAttribute('data-init'), sub = p.slice(6);
    if (init && sub.indexOf('v.') === 0) { var id = sub.split('.')[1]; if (!U.sheet.v[id]) { try { U.sheet.v[id] = JSON.parse(init); } catch (x) { U.sheet.v[id] = {}; } } U.sheet.v[id].guess = false; }
    setPath(U.sheet, sub, el.value);
  } else setPath(U, p, el.value);
  if (el.getAttribute('data-live')) { clearTimeout(A._lt); A._lt = setTimeout(function () { var pos = el.selectionStart; render(); var n = document.querySelector('[data-f="' + p + '"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} } }, 300); }
});
document.addEventListener('change', function (e) {
  var el = e.target;
  if (el.getAttribute && el.getAttribute('data-rc')) render();
  var kind = el.getAttribute && el.getAttribute('data-file'); if (!kind || !el.files || !el.files[0]) return;
  var rd = new FileReader();
  rd.onload = function () { if (kind === 'kj') { U.sheet.msg = importKJ(rd.result); render(); } else importFile(rd.result); };
  rd.readAsText(el.files[0]);
});
window.addEventListener('pageshow', function () { gsync(); });
document.addEventListener('visibilitychange', function () { if (!document.hidden) { gsync(); if (!U.sheet && U.tab !== 'add') render(); } });
render();
gsync();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
