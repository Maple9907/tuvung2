/* Đồng bộ nội dung với video YouTube (tab Nghe).
   Nguồn thời gian, ưu tiên từ cao xuống thấp:
   1) mốc người dùng ghim (anchors)  2) dòng có [mm:ss] trong file .txt  3) ước lượng theo độ dài chữ + độ dài video. */

const TS = /^\[(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d+))?\]\s*/;

/* Tách file .txt thành dòng: {k:'h'|'t', s:chữ, t:giây|null, b:1 nếu có dòng trống phía trước} */
export function parseTx(raw) {
  const out = [];
  let gap = false;
  for (let l of raw.replace(/\r/g, '').split('\n')) {
    l = l.trim();
    if (!l) { gap = true; continue; }
    let t = null;
    const m = l.match(TS);
    if (m) { t = (+m[1] || 0) * 3600 + +m[2] * 60 + +m[3] + (m[4] ? +('0.' + m[4]) : 0); l = l.slice(m[0].length).trim(); }
    if (!l) continue;
    const h = l.startsWith('# ');
    out.push({ k: h ? 'h' : 't', s: h ? l.slice(2) : l, t, b: gap ? 1 : 0 });
    gap = false;
  }
  return out;
}

const W = l => (l.k == 'h' ? 0 : l.s.length + 12); // 12 ký tự ≈ quãng nghỉ giữa các câu
const RATE = 14; // ký tự / giây, dùng khi chưa biết độ dài video

/* Tính giờ bắt đầu của từng dòng.
   lines: kết quả parseTx · dur: độ dài video (giây, 0 nếu chưa biết) · anc: {chỉ số dòng: giây} do người dùng ghim.
   Trả về {times:[...], est:[true nếu giờ là ước lượng]} */
export function buildTimes(lines, dur, anc = {}) {
  const n = lines.length;
  if (!n) return { times: [], est: [] };
  const fixed = new Map();
  lines.forEach((l, i) => { if (l.t != null) fixed.set(i, l.t); });
  for (const k in anc) if (+k >= 0 && +k < n) fixed.set(+k, anc[k]);
  // các mốc phải tăng dần theo thứ tự dòng, mốc nào đi lùi thì bỏ
  const pts = [];
  let last = -1;
  for (const i of [...fixed.keys()].sort((a, b) => a - b)) {
    const t = fixed.get(i);
    if (t > last) { pts.push([i, t]); last = t; }
  }
  const cw = [0];
  for (let i = 0; i < n; i++) cw.push(cw[i] + W(lines[i]));
  const total = cw[n] || 1;
  const times = new Array(n), est = new Array(n).fill(true);
  const hasDur = dur > 0;
  // mốc ảo ở đầu và cuối
  const first = pts.length ? pts[0] : null;
  const start = hasDur ? (first ? 0 : dur * 0.02) : 0;
  const end = hasDur ? dur * (pts.length ? 1 : 0.98) : null;
  const seg = [];
  if (!first || first[0] > 0) seg.push([0, first ? Math.min(start, first[1]) : start, false]);
  for (const [i, t] of pts) seg.push([i, t, true]);
  for (let s = 0; s < seg.length; s++) {
    const [i0, t0, real] = seg[s];
    const nx = seg[s + 1];
    const i1 = nx ? nx[0] : n;
    const w0 = cw[i0], w1 = nx ? cw[nx[0]] : total;
    let t1 = nx ? nx[1] : end;
    if (t1 == null || t1 <= t0) t1 = t0 + (w1 - w0) / RATE; // không biết độ dài: dùng tốc độ đọc mặc định
    const span = Math.max(w1 - w0, 1);
    for (let i = i0; i < i1; i++) {
      times[i] = t0 + ((cw[i] - w0) / span) * (t1 - t0);
      if (real && i == i0) est[i] = false;
    }
  }
  // dòng tiêu đề lấy giờ của dòng chữ liền sau
  for (let i = n - 2; i >= 0; i--) if (lines[i].k == 'h' && lines[i + 1].t == null) times[i] = times[i + 1];
  return { times, est };
}

/* Dòng đang phát tại giây t (dòng cuối cùng có giờ <= t); -1 nếu chưa tới dòng nào. */
export function findIdx(times, t) {
  let lo = 0, hi = times.length - 1, r = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (times[m] <= t + 0.05) { r = m; lo = m + 1; } else hi = m - 1;
  }
  return r;
}

export const fmtT = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };
