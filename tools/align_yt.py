#!/usr/bin/env python3
"""Gắn giờ chuẩn [m:ss] vào listen/t/NN.txt bằng cách lấy phụ đề tự động của từng video YouTube
trong playlist rồi khớp chữ của bạn với phụ đề đó. Dòng nào khớp được thì có giờ thật;
dòng không khớp (số, tên riêng, nghe sai…) app tự nội suy giữa các dòng có giờ.

Cài:   pip install yt-dlp
Chạy:  python3 tools/align_yt.py                 # cả playlist (ID lấy từ js/app.js)
       python3 tools/align_yt.py --only 3,5,12   # chỉ vài video
       python3 tools/align_yt.py --cookies-from-browser chrome   # nếu YouTube đòi đăng nhập
Chạy lại an toàn: giờ cũ được bỏ trước khi khớp lại."""
import argparse, json, pathlib, re, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
TSRE = re.compile(r"^\[(?:\d+:)?\d{1,2}:\d{2}(?:[.,]\d+)?\]\s*")
SPK = re.compile(r"^[A-Z][A-Za-z.' ]{0,22}:\s")

def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower().replace("’", "'"))

def words_of(text):
    return [n for n in (norm(w) for w in text.split()) if n]

def load_json3(path):
    """json3 của YouTube -> [(từ, giây)]; phụ đề tự động có giờ từng từ (tOffsetMs)."""
    d = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    out = []
    for ev in d.get("events", []):
        segs = ev.get("segs")
        if not segs: continue
        base = ev.get("tStartMs", 0)
        for sg in segs:
            t = (base + sg.get("tOffsetMs", 0)) / 1000
            for w in words_of(sg.get("utf8", "")):
                out.append((w, t))
    return out

def load_stamped_md(path):
    """Dùng để thử: file dạng '[mm:ss] câu' -> [(từ, giây)] (mọi từ trong dòng lấy giờ đầu dòng)."""
    out = []
    for l in pathlib.Path(path).read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\[(?:(\d+):)?(\d+):(\d+)\]\s*(.*)$", l)
        if m:
            t = int(m[1] or 0) * 3600 + int(m[2]) * 60 + int(m[3])
            out += [(w, t) for w in words_of(m[4])]
    return out

def align(lines, cap, window=700, k=5):
    """lines: list[(loại, chữ)] với loại 'h' (tiêu đề) hoặc 't'. cap: [(từ, giây)].
    Trả về list giờ (giây hoặc None) cùng độ dài lines. Duyệt tiến, không bao giờ đi lùi."""
    toks = [w for w, _ in cap]
    res = [None] * len(lines)
    cur = 0
    for i, (kind, text) in enumerate(lines):
        if kind != "t": continue
        w = words_of(SPK.sub("", text, count=1))
        if len(w) < 3: continue
        q = w[:k]
        need = max(3, (len(q) * 3 + 4) // 5)  # ≥60% số từ đầu dòng phải trùng
        best, bj = 0, -1
        for j in range(cur, min(len(toks) - len(q) + 1, cur + window)):
            if toks[j] != q[0] and toks[j + 1 if j + 1 < len(toks) else j] != q[0]:
                continue  # chỉ xét chỗ có từ đầu (hoặc từ thứ hai) trùng, cho nhanh
            sc = sum(1 for d in range(len(q)) if toks[j + d] == q[d])
            if sc > best: best, bj = sc, j
            if sc == len(q): break
        if best >= need:
            res[i] = cap[bj][1]
            cur = bj + 1
    # giờ phải tăng dần: bỏ giá trị đi lùi
    last = -1
    for i, t in enumerate(res):
        if t is None: continue
        if t < last: res[i] = None
        else: last = t
    return res

def fmt(t):
    t = int(t); h, m, s = t // 3600, t % 3600 // 60, t % 60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"

def process(txt_path, cap):
    raw = txt_path.read_text(encoding="utf-8").replace("\r", "").split("\n")
    rows = []  # (chuỗi gốc đã bỏ giờ, loại, chữ)
    for l in raw:
        s = TSRE.sub("", l.strip())
        if not s: rows.append(("", "b", "")); continue
        rows.append((s, "h" if s.startswith("# ") else "t", s))
    idx = [i for i, r in enumerate(rows) if r[1] != "b"]
    times = align([(rows[i][1], rows[i][2]) for i in idx], cap)
    out, n = list(r[0] for r in rows), 0
    for i, t in zip(idx, times):
        if t is not None and rows[i][1] == "t":
            out[i] = f"[{fmt(t)}] {rows[i][0]}"; n += 1
    txt_path.write_text("\n".join(out).rstrip("\n") + "\n", encoding="utf-8")
    return n, sum(1 for i in idx if rows[i][1] == "t")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--playlist", help="ID playlist (mặc định lấy NPL trong js/app.js)")
    ap.add_argument("--only", help="vd 1,2,15 : chỉ xử lý các video này")
    ap.add_argument("--dir", default=str(ROOT / "listen" / "t"))
    ap.add_argument("--cookies-from-browser", dest="cookies")
    a = ap.parse_args()
    pl = a.playlist or re.search(r"NPL='([^']+)'", (ROOT / "js" / "app.js").read_text(encoding="utf-8")).group(1)
    only = {int(x) for x in a.only.split(",")} if a.only else None
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="caps_"))
    cmd = ["yt-dlp", "--skip-download", "--write-auto-subs", "--write-subs", "--sub-langs", "en.*,en",
           "--sub-format", "json3", "--ignore-errors", "--no-warnings",
           "-o", str(tmp / "%(playlist_index)02d.%(ext)s")]
    if only: cmd += ["--playlist-items", ",".join(map(str, sorted(only)))]
    if a.cookies: cmd += ["--cookies-from-browser", a.cookies]
    cmd.append("https://www.youtube.com/playlist?list=" + pl)
    print("Đang tải phụ đề…", " ".join(cmd[:3]), "…")
    subprocess.run(cmd)
    tot = 0
    for p in sorted(pathlib.Path(a.dir).glob("[0-9][0-9].txt")):
        n = int(p.stem)
        if only and n not in only: continue
        caps = sorted(tmp.glob(f"{n:02d}.*json3"))
        if not caps: print(f"{p.name}: không có phụ đề trên YouTube -> giữ giờ ước lượng"); continue
        got, all_ = process(p, load_json3(caps[0]))
        tot += 1
        print(f"{p.name}: khớp {got}/{all_} dòng ({got * 100 // max(all_, 1)}%)")
    print("Xong", tot, "file. Commit lại listen/t/*.txt.")

if __name__ == "__main__":
    main()
