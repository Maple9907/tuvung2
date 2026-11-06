/* Khung phát video "sạch" cho tab Nghe (v3.6)
   - Iframe YouTube chạy với controls:0 và KHÔNG nhận chạm (pointer-events:none) → học sinh không bấm nhầm ra ngoài app.
   - Iframe được dựng cao hơn khung nhìn (dư phía trên và dưới), khung .vb cắt phần dư → tiêu đề, avatar kênh, logo, "Video khác"
     của YouTube nằm ngoài vùng nhìn thấy (xem fit()).
   - Điều khiển riêng của app: chạm để phát/tạm dừng, thanh tua, phụ đề (bật/tắt, ngôn ngữ, cỡ chữ), tốc độ, chất lượng, phóng to.
   Cách dùng: vp=new VPlayer(khungVb,{toast}); vp.attach(ytPlayer) khi onReady; vp.state(s) khi onStateChange; vp.error(c); vp.api(). */

const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const QL = { highres: '4320p', hd2880: '2880p', hd2160: '2160p', hd1440: '1440p', hd1080: '1080p', hd720: '720p', large: '480p', medium: '360p', small: '240p', tiny: '144p' };
const FSZ = [[-1, 'Nhỏ'], [0, 'Vừa'], [1, 'Lớn'], [2, 'Rất lớn']];
const MODS = ['captions', 'cc'];
const TRL = { vi: 'Tiếng Việt', en: 'Tiếng Anh' };   /* tên dự phòng khi YouTube chưa trả danh sách ngôn ngữ dịch */

const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v } catch { return d } },
  set(k, v) { try { localStorage.setItem(k, v) } catch { } }
};
const clk = s => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0') };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const svg = (body, fill) => `<svg viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${body}</svg>`;
const IPL = svg('<path d="M8 5.2v13.6a.6.6 0 0 0 .9.5l11-6.8a.6.6 0 0 0 0-1L8.9 4.7a.6.6 0 0 0-.9.5z"/>', 1);
const IPA = svg('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>', 1);
const ICC = svg('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.6 10.3a2.3 2.3 0 1 0 0 3.4M17 10.3a2.3 2.3 0 1 0 0 3.4"/>');
const IST = svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>');
const IFS0 = svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>');

/* Phần giao diện chèn vào khung .vb (nút phóng to giữ data-a="vfs" để app.js xử lý) */
const MARK = `<i class="vtm"></i><div class="vs" data-c="tap"><i class="vpl">${IPL}</i><i class="vsp"></i></div>
<div class="vc"><div class="vsk" tabindex="0" role="slider" aria-label="Thanh tua video" aria-valuemin="0"><i class="bf"></i><i class="pf"></i><i class="th"></i></div>
<div class="vr"><button class="vbn pp" data-c="pp" aria-label="Phát / Tạm dừng">${IPL}</button><span class="vt">0:00 / 0:00</span><span class="gr"></span>
<button class="vbn cc" data-c="cc" aria-label="Bật/tắt phụ đề" aria-pressed="false">${ICC}</button>
<button class="vbn" data-c="set" aria-label="Cài đặt">${IST}</button>
<button class="vbn vfs" data-a="vfs" aria-label="Phóng to video">${IFS0}</button></div></div>
<div class="vm" hidden></div>`;

export class VPlayer {
  constructor(vb, o = {}) {
    this.vb = vb; this.o = o; this.p = null; this.st = -2; this.vid = '';
    this.drag = false; this.dragT = 0; this.hold = 0; this.menu = false; this.mv = 'main';
    this.rate = +ls.get('vvsp', '1') || 1;
    this.q = ls.get('vvq', 'auto');
    this.cc = ls.get('vvcc', '0') == '1';
    const l0 = ls.get('vvcl', '');
    this.key = /^[A-Za-z-]+\|/.test(l0) ? l0 : '';   /* phụ đề đã chọn: 'mãNgônNgữ|asr' (asr = tự tạo) · '' = app tự chọn tiếng Anh */
    this.tl = l0 === 'vi' ? 'vi' : ls.get('vvct', '');   /* ngôn ngữ YouTube dịch tự động sang ('' = không dịch) */
    this.fsz = +ls.get('vvcf', '0') || 0;
    this.done = false; this.pw = false; this.try = 0;
    this.tracks = []; this.tls = []; this.cur = ''; this.cst = 'idle'; this.ack = null;   /* cst: idle | wait | ok | none */
    this.ht = this.rt = this.ct = this.qt = 0;
    vb.insertAdjacentHTML('beforeend', MARK);
    const $ = s => vb.querySelector(s);
    this.sk = $('.vsk'); this.bf = $('.vsk .bf'); this.pf = $('.vsk .pf'); this.th = $('.vsk .th');
    this.tm = $('.vtm'); this.tt = $('.vt'); this.pp = $('.pp'); this.ccb = $('.vbn.cc'); this.vm = $('.vm');
    this.ratio = (() => { try { const [a, b] = getComputedStyle(vb.parentNode).getPropertyValue('--vr').split('/').map(Number); if (a > 0 && b > 0) return a / b } catch { } return 16 / 9 })();
    this.bind();
    this.ro = typeof ResizeObserver == 'function' ? new ResizeObserver(() => this.fit()) : null;
    if (this.ro) this.ro.observe(vb);
    this.iv = setInterval(() => this.tick(), 250);
    this.paintCC(); this.paintTime(0, 0);
  }

  /* ---------- Gắn với player YouTube ---------- */
  attach(p) { this.p = p; this.fit(); this.vb.classList.add('rd'); this.show(); this.paintTime() }
  destroy() { clearInterval(this.iv); clearTimeout(this.ht); clearTimeout(this.rt); clearTimeout(this.ct); clearTimeout(this.qt); if (this.ro) this.ro.disconnect(); document.removeEventListener('keydown', this.esc); this.p = null }

  /* Dựng iframe cao hơn khung nhìn: video 16:9 vẫn nằm vừa khít giữa, phần dư trên/dưới (nền đen) bị .vb cắt đi.
     Tiêu đề/avatar (bám mép trên iframe), logo và "Video khác" (bám mép dưới) vì thế bị đẩy ra ngoài vùng nhìn.
     Khi BẬT phụ đề: phụ đề của YouTube bám mép DƯỚI iframe, nên không thể cắt phần dư phía dưới. Cách làm:
       - iframe vẫn dư S phía trên (S ≥ chiều cao khối tiêu đề+avatar) → tiêu đề/avatar vẫn nằm ngoài khung nhìn;
       - khung .vb được nới thêm đúng S phía dưới video → dải đen S đó chính là chỗ phụ đề hiện ra (không đè lên hình);
       - lớp .vtm (nền đen) che phần trên video khi khung cao hơn khối video+dải (toàn màn hình), để tiêu đề không lọt vào vùng đen còn thấy. */
  isFs() { const v = this.vb; return v.classList.contains('fs') || (document.fullscreenElement || document.webkitFullscreenElement) === v }
  fit() {
    const f = this.vb.querySelector('iframe'); if (!f) return;
    const S = this.cc ? Math.round(Math.min(100, Math.max(72, this.vb.clientWidth * .19))) : 0;
    /* Khung nhỏ (không toàn màn hình): chiều cao theo tỉ lệ khung = video + dải phụ đề. Toàn màn hình thì CSS tự đặt cỡ. */
    if (!this.isFs()) { const ar = S && this.vb.clientWidth ? this.vb.clientWidth + '/' + Math.round(this.vb.clientWidth / this.ratio + S) : ''; if (this._ar !== ar) { this._ar = ar; this.vb.style.aspectRatio = ar } }
    else if (this._ar) { this._ar = ''; this.vb.style.aspectRatio = '' }
    const W = this.vb.clientWidth, H = this.vb.clientHeight; if (!W || !H) return;
    let vh = Math.min(W / this.ratio, H - S), vw = vh * this.ratio;
    if (vh <= 0) return;
    const y0 = (H - vh - S) / 2, pad = S || Math.round(Math.max(96, vh * .45)), k = [W, H, S].join('x');
    if (f._k === k) return; f._k = k;
    f.style.cssText = `left:${(W - vw) / 2}px;top:${y0 - pad}px;width:${vw}px;height:${vh + 2 * pad}px`;
    this.tm.style.height = S && y0 > .5 ? Math.ceil(y0) + 'px' : '0';
  }

  /* ---------- Sự kiện từ YouTube ---------- */
  state(s) {
    if (s === this.st) return; this.st = s;
    const b = this.vb.classList, on = s === 1 || s === 3;
    b.toggle('pl', on); b.toggle('bf', s === 3); b.toggle('en', s === 0);
    if (on) { b.remove('raw'); clearTimeout(this.rt) }
    if (s === 1) {
      const y = this.vb.querySelector('#ye'); if (y) { delete y.dataset.err; y.hidden = true } b.remove('err');
      const id = this.vidId(); if (id !== this.vid) { this.vid = id; this.applyPrefs() }
    }
    this.paintPP(); this.show();
  }
  error(c) {
    const y = this.vb.querySelector('#ye'); if (!y) return;
    y.dataset.err = 1; y.hidden = false; this.vb.classList.add('err');
    y.textContent = '⚠️ Video này không phát được (mã lỗi ' + c + '). Thử video khác bằng nút ‹ › bên dưới.';
  }
  api() { if (this.cc && !this.pw && this.cst !== 'ok') this.ccOn(); if (this.menu) this.paintMenu() }
  vidId() { try { return this.p.getVideoData().video_id || '' } catch { return '' } }

  /* Áp lại tuỳ chọn của người dùng cho video mới (YouTube tự đặt lại một số thứ khi đổi video) */
  applyPrefs() {
    const p = this.p; if (!p) return;
    try { p.setPlaybackRate(this.rate) } catch { }
    if (this.q !== 'auto') this.setQ(this.q, true);
    this.tracks = []; this.tls = []; this.cur = ''; this.cst = 'idle'; this.ack = null; this.done = false; this.pw = false; this.try = 0; clearTimeout(this.ct);
    if (this.cc) this.ccOn(); else this.mod('unloadModule');
  }

  /* ---------- Phát / tạm dừng ---------- */
  tap() {
    const p = this.p; if (!p || this.menu) return;
    try {
      const on = this.st === 1 || this.st === 3;
      if (this.o.onUser) this.o.onUser(on);   /* người dùng tự dừng (on=true) hoặc tự phát (on=false) */
      if (on) p.pauseVideo();
      else { if (this.st === 0) p.seekTo(0, true); this.play() }
    } catch { }
    this.show();
  }
  play() {
    try { this.p.playVideo() } catch { return }
    clearTimeout(this.rt);
    /* Một số trình duyệt (iPhone) chỉ cho phát khi người dùng chạm thẳng vào video: nếu 1,5 giây sau vẫn chưa phát thì mở khoá iframe để chạm vào nút phát của YouTube */
    if (this.st === -1 || this.st === 5 || this.st === -2) this.rt = setTimeout(() => {
      if (this.st === -1 || this.st === 5 || this.st === -2) { this.vb.classList.add('raw'); if (this.o.toast) this.o.toast('Chạm vào hình video để bắt đầu phát') }
    }, 1500);
  }
  paintPP() { const on = this.st === 1 || this.st === 3; this.pp.innerHTML = on ? IPA : IPL; const vpl = this.vb.querySelector('.vpl'); vpl.innerHTML = this.st === 0 ? svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>') : IPL }

  /* ---------- Hiện / ẩn thanh điều khiển ---------- */
  show() {
    const b = this.vb.classList; b.add('ui'); clearTimeout(this.ht);
    if (this.st === 1 && !this.drag && !this.menu) this.ht = setTimeout(() => b.remove('ui'), 3000);
  }

  /* ---------- Cập nhật mỗi 250ms ---------- */
  tick() {
    if (!this.vb.isConnected) return this.destroy();
    if (document.hidden) return;   /* nền: khỏi cập nhật DOM cho đỡ pin */
    this.fit();
    const p = this.p; if (!p || !p.getCurrentTime) return;
    let s; try { s = p.getPlayerState() } catch { return }
    if (s !== this.st) this.state(s);
    if (!this.drag && Date.now() > this.hold) this.paintTime();
    try { this.bf.style.width = Math.min(100, (p.getVideoLoadedFraction() || 0) * 100) + '%' } catch { }
  }
  paintTime(t, d) {
    if (t == null) { try { t = this.p.getCurrentTime(); d = this.p.getDuration() } catch { return } }
    d = d > 0 ? d : 0; t = t || 0;
    const f = d ? Math.min(1, t / d) : 0;
    this.pf.style.width = f * 100 + '%'; this.th.style.left = f * 100 + '%';
    this.tt.textContent = clk(t) + ' / ' + clk(d) + (this.rate !== 1 ? ' · ' + this.rate + '×' : '');
    this.sk.setAttribute('aria-valuenow', Math.round(t)); this.sk.setAttribute('aria-valuemax', Math.round(d));
    this.sk.setAttribute('aria-valuetext', clk(t) + ' trên ' + clk(d));
  }
  dur() { try { return this.p.getDuration() || 0 } catch { return 0 } }

  /* ---------- Phụ đề (của YouTube) ----------
     YouTube không có API chính thức cho phụ đề trong iframe, chỉ có module ẩn "captions":
       loadModule → getOption('tracklist') → setOption('track', {…}) (kèm translationLanguage nếu muốn YouTube tự dịch).
     Hai điều hay làm hỏng:
       1) Phụ đề TỰ TẠO (asr) chỉ có trong tracklist khi hỏi kèm {includeAsr:true}.
       2) Danh sách đến muộn sau khi video chạy → phải hỏi lại cho tới khi có (ccOn tự lặp tối đa ~8 giây), rồi kiểm tra lại (check()). */
  static vars() { return { cc_load_policy: ls.get('vvcc', '0') == '1' ? 1 : 0, cc_lang_pref: ls.get('vvcl', '') === 'vi' ? 'vi' : 'en' } }
  mod(fn) { MODS.forEach(m => { try { this.p[fn](m) } catch { } }) }
  opt(k, a) { for (const m of MODS) { try { const v = a === undefined ? this.p.getOption(m, k) : this.p.getOption(m, k, a); if (Array.isArray(v) ? v.length : v != null && v !== '') return v } catch { } } return null }
  setOpt(k, v) { MODS.forEach(m => { try { this.p.setOption(m, k, v) } catch { } }) }
  list(v) { return Array.isArray(v) ? v.filter(x => x && x.languageCode) : [] }
  isAsr(x) { return x.kind === 'asr' || /^a\./.test(x.vss_id || '') }
  tk(x) { return x.languageCode + '|' + (this.isAsr(x) ? 'asr' : '') }
  tname(x) { return x.displayName || x.languageName || x.languageCode }
  /* Phụ đề mặc định: tiếng Anh thật > tiếng Anh tự tạo > track mặc định > track đầu tiên */
  pick() {
    const tl = this.tracks; if (!tl.length) return null;
    const en = tl.filter(x => /^en/i.test(x.languageCode));
    return en.find(x => !this.isAsr(x)) || en[0] || tl.find(x => x.is_default) || tl.find(x => this.isAsr(x)) || tl[0];
  }
  src() { return this.tracks.find(x => this.tk(x) === this.key) || this.pick() }
  tlName(c) { const t = this.tls.find(x => x.languageCode === c); return (t && (t.languageName || t.displayName)) || TRL[c] || c }
  ccName() { const t = this.src(); return (t ? this.tname(t) : 'Tiếng Anh') + (this.tl ? ' → ' + this.tlName(this.tl) : '') }
  /* shape 0: gửi nguyên đối tượng track lấy từ danh sách (đúng như nút phụ đề của YouTube) · shape 1: chỉ languageCode (dự phòng) */
  applyTrack(shape = 0) {
    if (!this.p || !this.cc) return;
    const t = this.src(); let o;
    if (t) { o = shape ? { languageCode: t.languageCode } : Object.assign({}, t); if (shape && t.kind) o.kind = t.kind }
    else o = { languageCode: 'en' };   /* chưa có danh sách: đoán tiếng Anh */
    const same = (o.languageCode || '').toLowerCase().startsWith((this.tl || '~').toLowerCase());
    if (this.tl && !same && (!t || t.is_translateable !== false)) o.translationLanguage = { languageCode: this.tl, languageName: this.tlName(this.tl) };
    this.cur = this.ccName();
    this.setOpt('track', o); this.setOpt('fontSize', this.fsz); this.setOpt('reload', true);
  }
  ccOn(n = 0) {
    if (!this.p || !this.cc) return;
    clearTimeout(this.ct);
    if (n === 0) { this.mod('loadModule'); this.cst = 'wait'; this.pw = true; this.ack = null }
    let tl = this.list(this.opt('tracklist', { includeAsr: true })); if (!tl.length) tl = this.list(this.opt('tracklist'));
    if (tl.length) {
      this.tracks = tl; this.tls = this.list(this.opt('translationLanguages'));
      this.applyTrack(0); this.done = true; this.pw = false; this.cst = 'ok'; this.paintMenu();
      this.ct = setTimeout(() => this.check(), 900); return;
    }
    if (n === 3) this.applyTrack(0);   /* sau ~1,2 giây vẫn chưa có danh sách: thử bật bừa tiếng Anh, vẫn tiếp tục hỏi lại danh sách */
    if (n < 20) { this.ct = setTimeout(() => this.ccOn(n + 1), 400); this.paintMenu(); return }
    this.pw = false; this.cst = 'none'; this.paintMenu();
  }
  /* Hỏi lại YouTube xem đã nhận phụ đề chưa; nếu chưa (hoặc nhận sai) thì gửi lại bằng dạng đơn giản hơn */
  check() {
    if (!this.p || !this.cc) return;
    const c = this.opt('track'), tl = (this.tl || '').toLowerCase();
    const ok = !!(c && c.languageCode && (!tl || c.languageCode.toLowerCase().startsWith(tl) || (c.translationLanguage && (c.translationLanguage.languageCode || '').toLowerCase().startsWith(tl))));
    this.ack = ok;
    if (!ok && this.try < 1) { this.try++; this.applyTrack(1); this.ct = setTimeout(() => this.check(), 900) }
    this.paintMenu();
  }
  ccOff() { clearTimeout(this.ct); this.pw = false; this.cst = 'idle'; this.mod('unloadModule') }
  setCC(on) {
    this.cc = on; ls.set('vvcc', on ? '1' : '0'); this.done = false; this.try = 0; this.fit();
    if (on) this.ccOn(); else this.ccOff();
    this.paintCC(); this.paintMenu();
  }
  /* Chọn như menu của YouTube: một phụ đề trong danh sách (xoá dịch tự động) hoặc một ngôn ngữ trong "Dịch tự động" */
  pickSub(key, tl) {
    this.key = key; this.tl = tl; ls.set('vvcl', key); ls.set('vvct', tl);
    this.setCC(true); this.setMenu(false);
  }
  paintCC() { this.ccb.classList.toggle('on', this.cc); this.ccb.setAttribute('aria-pressed', this.cc) }

  /* ---------- Tốc độ & chất lượng ---------- */
  rates() { let r = []; try { r = this.p.getAvailablePlaybackRates() || [] } catch { } return r.length ? r : RATES }
  setRate(r) {
    this.rate = r; ls.set('vvsp', r);
    try { this.p.setPlaybackRate(r) } catch { }
    this.paintTime(); this.paintMenu();
  }
  levels() { let l = []; try { l = this.p.getAvailableQualityLevels() || [] } catch { } return l.filter(x => QL[x]) }
  curQ() { try { return this.p.getPlaybackQuality() } catch { return '' } }
  setQ(q, silent) {
    this.q = q; ls.set('vvq', q);
    try { this.p.setPlaybackQuality(q === 'auto' ? 'default' : q) } catch { }
    clearTimeout(this.qt);
    /* YouTube coi hàm này là "gợi ý" và có thể bỏ qua → kiểm tra lại sau vài giây và báo thật cho người dùng */
    if (!silent && q !== 'auto') this.qt = setTimeout(() => {
      const c = this.curQ();
      if (c && c !== q && (this.st === 1 || this.st === 3) && this.o.toast) this.o.toast('YouTube đang phát ' + (QL[c] || c) + ', chưa đổi được sang ' + QL[q], 3500);
      this.paintMenu();
    }, 3000);
    this.paintMenu();
  }

  /* ---------- Bảng cài đặt (nằm trong khung .vb để vẫn thấy khi phóng to) ----------
     Dạng danh sách vào từng mục như YouTube (main → rate | q | cc | fsz) để vừa khung video nhỏ trên điện thoại. */
  setMenu(on) {
    this.menu = on; this.mv = 'main'; this.vb.classList.toggle('mo', on); this.vm.hidden = !on;
    if (on) { this.paintMenu(); clearTimeout(this.ht) } else this.show();
  }
  paintMenu() {
    if (!this.menu) return;
    const chip = (c, v, label, on) => `<button class="mchip${on ? ' on' : ''}" data-c="${c}" data-v="${esc(v)}">${esc(label)}</button>`;
    const cur = this.curQ(), mv = this.mv || 'main';
    const TT = { rate: 'Tốc độ phát', q: 'Chất lượng video', cc: 'Phụ đề', tl: 'Dịch tự động', fsz: 'Cỡ chữ phụ đề' };
    let body = '';
    if (mv === 'main') {
      const row = (k, val) => `<button class="mrow" data-c="mv" data-v="${k}"><span>${TT[k]}</span><span>${esc(val)} ›</span></button>`;
      body = row('rate', this.rate == 1 ? 'Chuẩn (1×)' : this.rate + '×')
        + row('q', this.q === 'auto' ? 'Tự động' + (QL[cur] ? ' (' + QL[cur] + ')' : '') : (QL[this.q] || this.q))
        + row('cc', this.cc ? this.ccName() : 'Tắt')
        + row('fsz', (FSZ.find(x => x[0] === this.fsz) || FSZ[1])[1]);
    } else if (mv === 'rate') {
      body = '<div class="mc">' + this.rates().map(r => chip('rate', r, r == 1 ? '1× Chuẩn' : r + '×', Math.abs(r - this.rate) < .001)).join('') + '</div>';
    } else if (mv === 'q') {
      const lv = this.levels();
      body = '<div class="mc">' + chip('q', 'auto', 'Tự động' + (this.q === 'auto' && QL[cur] ? ' (' + QL[cur] + ')' : ''), this.q === 'auto')
        + lv.map(x => chip('q', x, QL[x], this.q === x)).join('') + '</div>'
        + (lv.length ? '' : '<div class="mn">Các mức chất lượng hiện sau khi video bắt đầu phát.</div>');
    } else if (mv === 'cc' || mv === 'tl') {
      /* Giống menu Phụ đề của YouTube: Tắt · từng phụ đề có sẵn · Dịch tự động › (danh sách ngôn ngữ) */
      const opt = (c, v, label, on, extra) => `<button class="mopt${on ? ' on' : ''}" data-c="${c}" data-v="${esc(v)}"><i class="ck">${on ? '✓' : ''}</i><span>${esc(label)}</span>${extra || ''}</button>`;
      const note = !this.cc ? '' : this.cst === 'wait' ? 'Đang lấy danh sách phụ đề từ YouTube…'
        : this.cst === 'none' && !this.tracks.length ? 'YouTube không báo có phụ đề cho video này.'
        : this.cur ? 'Đang dùng: ' + this.cur + (this.ack === true ? ' ✓' : this.ack === false ? ' (YouTube chưa xác nhận)' : '') : '';
      const nt = note ? '<div class="mn">' + esc(note) + '</div>' : '';
      if (mv === 'cc') {
        const list = this.tracks.length ? this.tracks : [{ languageCode: 'en', displayName: 'Tiếng Anh' }];
        const ck = this.src(), ckey = ck ? this.tk(ck) : 'en|';
        body = '<div class="mo">' + opt('sub', 'off', 'Tắt', !this.cc)
          + list.map(t => opt('trk', this.tk(t), this.tname(t), this.cc && !this.tl && this.tk(t) === ckey)).join('')
          + opt('mv', 'tl', 'Dịch tự động', this.cc && !!this.tl, `<em>${this.tl ? esc(this.tlName(this.tl)) + ' ' : ''}›</em>`) + '</div>' + nt;
      } else {
        const arr = (this.tls.length ? this.tls : [{ languageCode: 'vi' }, { languageCode: 'en' }]).filter(x => !/^$/.test(x.languageCode));
        const vi = arr.filter(x => /^vi/i.test(x.languageCode)), rest = arr.filter(x => !/^vi/i.test(x.languageCode));
        body = '<div class="mo">' + [...vi, ...rest].map(x => opt('tl', x.languageCode, x.languageName || x.displayName || TRL[x.languageCode] || x.languageCode, this.cc && this.tl === x.languageCode)).join('') + '</div>' + nt;
      }
    } else if (mv === 'fsz') {
      body = '<div class="mc">' + FSZ.map(([v, l]) => chip('fsz', v, l, this.fsz === v)).join('') + '</div>';
    }
    this.vm.innerHTML = `<div class="mh">${mv === 'main' ? '<b>⚙ Cài đặt video</b>' : `<button class="mb" data-c="mb">‹ ${TT[mv]}</button>`}<button class="vbn" data-c="mx" aria-label="Đóng cài đặt">✕</button></div><div class="mi">${body}</div>`;
  }

  /* ---------- Gắn sự kiện ---------- */
  bind() {
    const vb = this.vb, sk = this.sk;
    vb.addEventListener('click', e => {
      const t = e.target.closest('[data-c]'); if (!t || !vb.contains(t)) return;
      const c = t.dataset.c, v = t.dataset.v;
      if (c === 'tap' || c === 'pp') this.tap();
      else if (c === 'cc') { this.setCC(!this.cc); this.show() }
      else if (c === 'set') this.setMenu(!this.menu);
      else if (c === 'mx') this.setMenu(false);
      else if (c === 'mv') { this.mv = v; this.paintMenu() }
      else if (c === 'mb') { this.mv = this.mv === 'tl' ? 'cc' : 'main'; this.paintMenu() }
      else if (c === 'rate') { this.mv = 'main'; this.setRate(+v) }
      else if (c === 'q') { this.mv = 'main'; this.setQ(v) }
      else if (c === 'sub') { this.setCC(false); this.setMenu(false) }
      else if (c === 'trk') this.pickSub(v, '')
      else if (c === 'tl') this.pickSub(this.key, v)
      else if (c === 'fsz') { this.mv = 'main'; this.fsz = +v; ls.set('vvcf', v); this.setOpt('fontSize', this.fsz); this.paintMenu() }
    });
    /* Thanh tua: kéo hoặc chạm. Khi video đang phóng to bằng CSS và bị xoay 90° (iPhone dọc) thì trục kéo là dọc. */
    const frac = e => {
      const r = sk.getBoundingClientRect(), rot = vb.classList.contains('fs') && matchMedia('(orientation:portrait)').matches;
      const f = rot ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
      return Math.min(1, Math.max(0, f || 0));
    };
    const move = f => { const d = this.dur(); this.dragT = f * d; this.paintTime(this.dragT, d) };
    sk.addEventListener('pointerdown', e => {
      if (!this.p) return; e.preventDefault();
      try { sk.setPointerCapture(e.pointerId) } catch { }
      this.drag = true; clearTimeout(this.ht); move(frac(e));
    });
    sk.addEventListener('pointermove', e => { if (this.drag) move(frac(e)) });
    const end = () => {
      if (!this.drag) return; this.drag = false;
      try { this.p.seekTo(this.dragT, true) } catch { }
      this.hold = Date.now() + 700; this.show();
    };
    sk.addEventListener('pointerup', end); sk.addEventListener('pointercancel', end);
    sk.addEventListener('keydown', e => {
      const k = { ArrowLeft: -5, ArrowRight: 5 }[e.key]; if (!k || !this.p) return; e.preventDefault();
      try { this.p.seekTo(Math.max(0, this.p.getCurrentTime() + k), true) } catch { }
      this.hold = Date.now() + 500; this.show();
    });
    document.addEventListener('keydown', this.esc = e => { if (e.key === 'Escape' && this.menu) this.setMenu(false) });
  }
}
