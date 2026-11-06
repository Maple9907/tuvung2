#!/usr/bin/env python3
"""Đổi PDF nội dung từng video thành listen/t/NN.txt cho tab Nghe.
Dùng: python3 tools/pdf_to_txt.py <thư mục PDF> [--reflow]
  - Tên file bắt đầu bằng số (3.pdf, 03 - abc.pdf) -> NN = số đó. Không có số -> theo thứ tự tên.
  - --reflow: nối các dòng bị PDF ngắt cứng trong cùng một đoạn (dùng khi PDF là văn bản liền mạch).
Cần pdftotext (poppler-utils) hoặc `pip install pypdf`."""
import re, shutil, subprocess, sys
from pathlib import Path

def extract(pdf: Path) -> str:
    if shutil.which('pdftotext'):
        return subprocess.run(['pdftotext', '-enc', 'UTF-8', str(pdf), '-'], capture_output=True, text=True, check=True).stdout
    from pypdf import PdfReader
    return '\n'.join((p.extract_text() or '') for p in PdfReader(str(pdf)).pages)

def clean(t: str, reflow: bool) -> str:
    t = t.replace('\f', '\n\n').replace('\r', '')
    t = re.sub(r'(\w)-\n(\w)', r'\1\2', t)           # từ bị gạch nối cuối dòng
    t = re.sub(r'[ \t]+\n', '\n', t)
    t = re.sub(r'\n{3,}', '\n\n', t).strip()
    if reflow:
        t = '\n\n'.join(re.sub(r'\s*\n\s*', ' ', p) for p in re.split(r'\n{2,}', t))
    return t + '\n'

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    src, out = Path(args[0]), Path(__file__).resolve().parent.parent / 'listen' / 't'
    out.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(src.glob('*.pdf'), key=lambda p: [int(x) if x.isdigit() else x.lower() for x in re.split(r'(\d+)', p.name)])
    for k, pdf in enumerate(pdfs, 1):
        m = re.match(r'\s*(\d+)', pdf.stem)
        n = int(m.group(1)) if m else k
        dest = out / f'{n:02d}.txt'
        dest.write_text(clean(extract(pdf), '--reflow' in sys.argv), encoding='utf-8')
        print(f'{pdf.name} -> {dest.relative_to(out.parent.parent)}')

if __name__ == '__main__':
    main()
