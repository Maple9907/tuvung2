#!/usr/bin/env python3
"""Chuyển phụ đề .srt của YouTube (yt-dlp) thành listen/<mục>/NN.txt: mỗi dòng '[m:ss.s] câu' (giờ chuẩn của sub).
Xử lý: phụ đề cuốn chiếu bị lặp (bản 5 phút), chấm câu giả cuối mỗi cue, chữ hoa giả ở đầu cue, dấu '-' / '>>' đổi lượt,
tiêu đề Track/Exercise N, video dài > 1 giờ ([h:mm:ss.s]).
Dùng (tên file srt phải bắt đầu bằng số thứ tự trong playlist, ví dụ '07 - ....en.srt'):
  python3 tools/srt_to_txt.py <thư mục srt 5 phút>=listen/q <thư mục srt dài>=listen/t
Số thứ tự NN của file srt = vị trí video trong playlist (01 = video đầu)."""
import re, sys, os, glob
def parse(path):
    b=open(path,'rb').read()
    for enc in ('utf-8-sig','utf-16'):
        try: t=b.decode(enc); break
        except: pass
    t=t.replace('\r','')
    cues=[]
    for blk in re.split(r'\n\s*\n',t.strip()):
        ls=blk.split('\n')
        m=None
        for i,l in enumerate(ls):
            m=re.match(r'(\d+):(\d\d):(\d\d)[,.](\d{3})\s*-->\s*(\d+):(\d\d):(\d\d)[,.](\d{3})',l)
            if m: break
        if not m: continue
        g=list(map(int,m.groups()))
        s=g[0]*3600+g[1]*60+g[2]+g[3]/1000; e=g[4]*3600+g[5]*60+g[6]+g[7]/1000
        txt=' '.join(x.strip() for x in ls[i+1:] if x.strip())
        cues.append((s,e,txt))
    return cues
def norm(w): return re.sub(r"[^a-z0-9']","",w.lower())
def rolling_ratio(c):
    hit=0;n=0
    for a,b in zip(c,c[1:]):
        wa=[norm(x) for x in a[2].split() if norm(x)];wb=[norm(x) for x in b[2].split() if norm(x)]
        if not wa or not wb: continue
        n+=1
        if wa[-1]==wb[0] or (len(wa)>1 and wa[-2:]==wb[:2]): hit+=1
    return hit/max(n,1)


NUM = r"(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty(?:[- ]\w+)?|thirty(?:[- ]\w+)?|forty(?:[- ]\w+)?|fifty(?:[- ]\w+)?)"
HEAD = re.compile(r"^(track|exercise|part|section|passage|test|task|question|questions)\s+" + NUM + r"(?:\s+\w+){0,3}[.:]?$", re.I)
DANGLE = set("a an the of to in on at for with and or but if than as am i my your his its our their these those will would can could may might shall should by from into about because when while which who whose what how is are was were be been".split())

def sent_end(pw):
    if re.search(r"[?!]$", pw): return True
    if pw.endswith("."): return re.sub(r"[^a-z']", "", pw.lower()) not in DANGLE
    return False
TURN = ("-", ">>", "—", "–")

def clean_tok(w):
    return w.replace("\\h", "").replace("\u00a0", " ").strip()

def to_words(cue_text):
    """-> (turn_flag, [tokens])"""
    t = cue_text.replace("\\h", " ").replace("♪", " ")
    t = re.sub(r"\s+([.,?!;:])", r"\1", t)
    t = re.sub(r"\.{2,}(?!\.)", ".", t)
    t = re.sub(r"\[(?:music|applause|laughter|noise)\]", " ", t, flags=re.I)
    toks = t.split()
    turn = False
    out = []
    for w in toks:
        if w in TURN:
            if not out: turn = True
            else: out.append("\x00")  # turn marker giữa cue
            continue
        if w.startswith(">>"):
            w = w[2:].strip()
            if not out: turn = True
            else: out.append("\x00")
            if not w: continue
        out.append(w)
    return turn, out

def build_words(cues):
    """Dedupe phụ đề cuốn chiếu; trả về list [text, start, turn, cue_end_flag, cue_last_flag]"""
    rolling = rolling_ratio(cues) >= 0.04
    cues = sorted(enumerate(cues), key=lambda x: (x[1][0], x[0]))
    words = []  # dict(w,t,turn,last)
    for _, (s, e, txt) in cues:
        turn, toks = to_words(txt)
        # tách theo \x00 (đổi lượt giữa cue)
        segs, cur = [], []
        for w in toks:
            if w == "\x00": segs.append(cur); cur = []
            else: cur.append(w)
        segs.append(cur)
        first = True
        for si, seg in enumerate(segs):
            if not seg: continue
            seg_turn = turn if si == 0 else True
            start_idx = len(words)
            if rolling and first:
                # tìm phần trùng giữa đuôi words và đầu seg
                prev = [norm(x["w"]) for x in words[-40:]]
                cn = [norm(x) for x in seg]
                best = 0
                for k in range(min(len(prev), len(cn), 40), 0, -1):
                    if prev[-k:] == cn[:k] and all(cn[:k]):
                        best = k; break
                if best:
                    base = len(words) - best
                    # lấy dấu câu từ bản mới hơn (nằm giữa cue, ít bị chấm giả) cho các từ trùng
                    for j in range(best):
                        later = re.search(r"[.,?!;:]*$", seg[j]).group()
                        w0 = re.sub(r"[.,?!;:]+$", "", words[base + j]["w"])
                        words[base + j]["w"] = w0 + later
                    words[base]["cs"] = True
                    if seg_turn: words[base]["turn"] = True
                    new = seg[best:]
                    if words and base + best == len(words):
                        words[-1]["last"] = False
                    for w in new:
                        words.append(dict(w=w, t=s, turn=False, last=False, cs=False))
                    if new: words[-1]["last"] = True
                    elif words: words[-1]["last"] = True
                    first = False
                    continue
            for j, w in enumerate(seg):
                words.append(dict(w=w, t=s, turn=(seg_turn and j == 0), last=False, cs=(j == 0)))
            if words: words[-1]["last"] = True
            first = False
    return words, rolling

def fixcase(line):
    line = re.sub(r"\bi\b(?!\.)", "I", line)
    line = re.sub(r"\bi(?=['’](?:m|ll|ve|d)\b)", "I", line)
    return line

def fmt(t):
    if t >= 3600:  # [h:mm:ss.s] cho video dài hơn 1 giờ (sync.js chỉ đọc phút 1-2 chữ số)
        h = int(t // 3600); m = int((t - h * 3600) // 60); s = t - h * 3600 - m * 60
        return "%d:%02d:%04.1f" % (h, m, s)
    m = int(t // 60); s = t - m * 60
    return "%d:%04.1f" % (m, s)

NUMW = set("one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty".split())
def isnum(w):
    w = re.sub(r"[^a-z0-9]", "", w.lower())
    return w.isdigit() or w in NUMW

def is_punct_file(words):
    txt = " ".join(x["w"] for x in words)
    return (txt.count("?") + txt.count(",")) > len(words) * 0.01

def lex_add(lex, words):
    """Đếm dạng viết thường / viết hoa giữa câu (không tính từ đầu cue) để nhận ra tên riêng."""
    lo, cap = lex
    prev = ""
    for x in words:
        w = re.sub(r"^[^A-Za-z']+|[^A-Za-z']+$", "", x["w"])
        if w and not x["cs"] and not x["turn"] and prev and not sent_end(prev):
            if w[0].islower(): lo[w] = lo.get(w, 0) + 1
            elif w != "I" and not w.startswith("I'"): cap[w.lower()] = cap.get(w.lower(), 0) + 1
        prev = x["w"]

def build_lines(words, lex, soft=9, hard=26):
    punct = is_punct_file(words)
    lo, cap = lex
    n = len(words)
    # 0) dấu "-" / ">>" đứng sau từ chưa kết thúc câu (the, of, to...) là giả: bỏ cờ đổi lượt
    for i in range(1, n):
        if words[i]["turn"]:
            pw = words[i - 1]["w"]
            if re.sub(r"[^a-z']", "", pw.lower()) in DANGLE and not re.search(r"[?!]$", pw): words[i]["turn"] = False
    # 1) chữ hoa giả ở đầu cue (do ngắt dòng của YouTube)
    prev = ""
    for i, x in enumerate(words):
        w = x["w"]
        core = re.sub(r"^[^A-Za-z']+", "", w)
        is_I = core == "I" or core.startswith("I'") or core.startswith("I’")
        if not punct:
            if not is_I:
                k = re.sub(r"[^A-Za-z']", "", core).lower()
                if len(k) >= 3 and cap.get(k, 0) >= 3 and lo.get(k, 0) <= cap.get(k, 0) * 0.05:
                    w = w[:len(w) - len(core)] + core[:1].upper() + core[1:].lower()
                else:
                    w = w[:len(w) - len(core)] + core.lower()
        elif x["cs"] and not x["turn"] and prev and not sent_end(prev) and core[:1].isupper() and not is_I:
            k = re.sub(r"[^A-Za-z']", "", core).lower()
            if lo.get(k, 0) > cap.get(k, 0): w = w[:len(w) - len(core)] + core[:1].lower() + core[1:]
        x["w"] = w
        prev = w
    # 2) dấu chấm cuối cue: giả -> bỏ (file không có dấu câu thật: bỏ hết)
    for i, x in enumerate(words):
        w = x["w"]
        nxt = words[i + 1] if i + 1 < n else None
        if x["last"] and w.endswith("."):
            keep = False
            if punct and nxt and (nxt["turn"] or re.sub(r"^[^A-Za-z]+", "", nxt["w"])[:1].isupper()) and re.sub(r"[^a-z']", "", w.lower()) not in DANGLE:
                keep = True
            if not keep: w = w[:-1]
        if not punct: w = w.replace(",", "").rstrip(".")
        x["w"] = w
    # 3) cắt dòng
    lines, cur, cur_t = [], [], None
    def flush():
        nonlocal cur, cur_t
        if cur: lines.append((cur_t, " ".join(cur)))
        cur, cur_t = [], None
    i = 0
    while i < n:
        x = words[i]
        w = x["w"]
        lw = re.sub(r"[^a-z]", "", w.lower())
        # tiêu đề: Track N / Exercise N / Part N ở đầu cue
        if (x["cs"] or x["turn"]) and lw in ("track", "exercise", "part", "section") and i + 1 < n and isnum(words[i + 1]["w"]) and (lw != "part" or x["cs"]):
            flush()
            hw = [w, words[i + 1]["w"]]
            lines.append((x["t"], "#H " + " ".join(re.sub(r"[.,:]$", "", z) for z in hw)))
            i += 2
            continue
        if x["turn"] and cur: flush()
        if not cur: cur_t = x["t"]
        cur.append(w)
        nxt = words[i + 1] if i + 1 < n else None
        brk = False
        if nxt is None or nxt["turn"]: brk = True
        elif punct and len(cur) >= 4 and (w.endswith("?") or w.endswith("!") or w.endswith(".")): brk = True
        elif nxt["t"] != x["t"] and len(cur) >= (18 if punct else soft): brk = True
        elif len(cur) >= hard: brk = True
        elif nxt["cs"] and len(cur) >= 3 and re.sub(r"[^a-z]", "", nxt["w"].lower()) in ("track", "exercise") and i + 2 < n and isnum(words[i + 2]["w"]): brk = True
        if brk: flush()
        i += 1
    flush()
    out = []
    for t, s in lines:
        s = re.sub(r"\s+", " ", s).strip()
        if not s: continue
        if s.startswith("#H "):
            h = s[3:]
            out.append((t, "# " + h[:1].upper() + h[1:].lower()))
            continue
        s = fixcase(s) if not punct else s
        s = s[:1].upper() + s[1:]
        out.append((t, s))
    return out

def load(path):
    cues = parse(path)
    words, rolling = build_words(cues)
    return words, rolling, len(cues)

def render(lines):
    return "\n".join("[%s] %s" % (fmt(t), s) for t, s in lines) + "\n"

if __name__ == "__main__":
    srcs = sys.argv[1:]
    jobs = []  # (src, dst)
    for a in srcs:
        src, dst = a.split("=")
        for f in sorted(os.listdir(src)):
            m = re.match(r"(\d+) - ", f)
            if m and f.endswith(".srt"): jobs.append((os.path.join(src, f), dst, int(m.group(1))))
    loaded = [(j, load(j[0])) for j in jobs]
    lex = ({}, {})
    for j, (words, rolling, nc) in loaded:
        if is_punct_file([dict(x) for x in words]): lex_add(lex, words)
    for (path, dst, num), (words, rolling, nc) in loaded:
        os.makedirs(dst, exist_ok=True)
        lines = build_lines(words, lex)
        open(os.path.join(dst, "%02d.txt" % num), "w", encoding="utf-8").write(render(lines))
        print(dst, num, "cues", nc, "words", len(words), "lines", len(lines))
