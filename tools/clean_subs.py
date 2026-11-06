#!/usr/bin/env python3
"""Chuẩn hoá thư mục phụ đề thô (UTF-16, dính dấu " kiểu CSV, đoạn dài, đầu file tiếng Việt)
thành listen/t/NN.txt (UTF-8): mỗi dòng ~1 câu, tiêu đề là dòng bắt đầu bằng '# '.
Dùng:  python3 tools/clean_subs.py <thư mục chứa 01.txt..47.txt> [thư mục ra = listen/t]"""
import re, sys, pathlib

ABBR = re.compile(r"(?:\b(?:Mr|Mrs|Ms|Dr|St|Prof|vs|etc|No|Jr|Sr|Mt)|\b[A-Za-z]|e\.g|i\.e|a\.m|p\.m)\.$", re.I)
SPK = re.compile(r"^[A-Z][A-Za-z.' ]{0,22}:\s")
HEAD = re.compile(r"^(track\s*\d+\s*:?|exercise\s*\d+\s*:?|part\s*\d+\s*:?|section\s*\d+\s*:?|bài (đọc|nghe)\s*\d+.*|passage\s*\d+.*)$", re.I)
JUNK = re.compile(r"đăng ký kênh|^transcript \(phụ đề\)|^youtube:\s*https?://|^https?://|^\|?\s*i.m mary$|^\(?study with me", re.I)

def read(p):
    b = p.read_bytes()
    for enc in ("utf-16", "utf-8-sig", "cp1258"):
        try:
            return b.decode(enc)
        except Exception:
            pass
    return b.decode("utf-8", "replace")

def strip_q(l):
    l = l.strip()
    if l.startswith('"'): l = l[1:]
    if l.endswith('"'): l = l[:-1]
    return l.replace('""', '"').strip()

def sentences(t):
    parts = re.split(r"(?<=[.?!…])[\"”]?\s+(?=[A-Z0-9\"“'‘(])", t)
    out = []
    for p in parts:
        if out and ABBR.search(out[-1]): out[-1] += " " + p
        else: out.append(p)
    return out

def chunk_words(t, n=15):
    w = t.split()
    return [" ".join(w[i:i + n]) for i in range(0, len(w), n)]

def clean(raw):
    raw = raw.replace("\r", "").replace("\u00a0", " ")
    lines = [l for l in (strip_q(x) for x in raw.split("\n")) if l]
    auto = "Transcript (phụ đề)" in raw
    title, head, body = None, [], []
    started = False
    for l in lines:
        l = re.sub(r"\s{2,}", " ", l)
        if not started and (title is None or l.startswith("|")) and not HEAD.match(l) and not JUNK.search(l) :
            if title is None: title = l; continue
            title += " " + l.lstrip("| "); continue
        if JUNK.search(l): continue
        if HEAD.match(l): body.append(("h", l.rstrip(":").strip())); started = True; continue
        started = True
        body.append(("t", l))
    if auto:  # phụ đề tự động của YouTube: dòng bị ngắt tuỳ ý -> gộp lại rồi cắt theo câu / số từ
        txt = " ".join(l for k, l in body if k == "t")
        body = [("t", re.sub(r"\s+", " ", txt))]
    # ghép các mảnh bị ngắt giữa câu
    merged = []
    for k, l in body:
        prev = merged[-1][1] if merged and merged[-1][0] == "t" else ""
        cut = len(prev) >= 85 and not SPK.match(l)  # ô CSV bị cắt ở ~100 ký tự giữa câu (kể cả khi dòng sau bắt đầu bằng chữ hoa)
        if (k == "t" and prev and not re.search(r"[.?!…:\"”)]$", prev) and (re.match(r"[a-z0-9]", l) or cut)):
            merged[-1] = ("t", merged[-1][1] + " " + l)
        else:
            merged.append((k, l))
    out = []  # không ghi tiêu đề video vào file (app tự hiện tên Luyện Nghe Bài X)
    for k, l in merged:
        if k == "h": out.append("# " + l); continue
        sents = sentences(l) if len(re.findall(r"[.?!…]", l)) * 25 >= len(l.split()) else chunk_words(l)
        # không có dấu câu ở đoạn dài: cắt theo số từ
        sents = [x for s in sents for x in (chunk_words(s, 22) if len(s.split()) > 40 else [s])]
        cur = ""
        for s in sents:
            if cur and (len(cur) >= 70 or SPK.match(s) or len(cur) + len(s) > 200):
                out.append(cur); cur = s
            else:
                cur = (cur + " " + s).strip()
        if cur: out.append(cur)
    return "\n".join(out) + "\n"

if __name__ == "__main__":
    src = pathlib.Path(sys.argv[1]); dst = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "listen/t")
    dst.mkdir(parents=True, exist_ok=True)
    for p in sorted(src.glob("[0-9][0-9].txt")):
        t = clean(read(p)); (dst / p.name).write_text(t, encoding="utf-8")
        print(p.name, len(t.splitlines()), "dòng")
