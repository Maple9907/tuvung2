# words-original.js -> data/words.json : thêm tần suất, cờ từ chức năng, nghĩa ngắn, câu điền chỗ trống, thứ tự học
import json,re
from wordfreq import zipf_frequency
s=open('tools/words-original.js',encoding='utf8').read()
W=json.loads(s[s.index('['):s.rindex(']')+1])
FW=('giới từ','đại từ','mạo từ','liên từ','từ hạn định','khuyết thiếu','số từ','thán từ')
def short(v):
    v=re.sub(r'\s*\([^)]*\)','',v); m=re.split(r'[;]',v)[0].strip()
    return ', '.join(m.split(',')[:2]).strip() or v
def cloze(w,e):
    b=re.escape(w.lower()); st=re.escape(w.lower()[:-1]) if w[-1] in 'ey' else b
    pat=r'\b(?:%s|%s)(?:s|es|ed|d|ing|ings|er|ers|est|ly|ies|ied|ness|ment|ments)?\b'%(b,st)
    if ' ' in w or len(w)<2: pat=r'\b%s\b'%b
    m=re.search(pat,e,re.I)
    return e[:m.start()]+'_____'+e[m.end():] if m else ''
NM={'n':'danh từ','v':'động từ','a':'tính từ','r':'trạng từ'}
MAN={l.split(':')[0]:l.split(':')[1] for l in open('tools/pos_assign.txt',encoding='utf8').read().split() if ':' in l}
def senses(x,fw):
    sn=[a.strip() for a in re.split(r';(?![^(]*\))',x['v']) if a.strip()];ps=[a.strip() for a in x['p'].split(',')]
    # chỉ tách khi số nghĩa == số loại từ (thứ tự nghĩa theo thứ tự loại từ); còn lại giữ nguyên để không gán sai
    pat=MAN.get(x['w'])
    if pat and not fw and len(pat)==len(sn) and all(NM[c] in ps for c in pat):return [[NM[c],b] for c,b in zip(pat,sn)]  # gán tay theo từng nghĩa
    return [[a,b] for a,b in zip(ps,sn)] if (not fw and len(ps)>1 and len(ps)==len(sn)) else None
band={'A1':0,'A2':1,'B1':2,'B2':3,'C1':4}
out=[]
for x in W:
    z=zipf_frequency(x['w'],'en') or 0
    fw=any(k in x['p'] for k in FW)
    out.append(dict(w=x['w'],l=x['l'],m=short(x['v']),v=x['v'],p=x['p'],ph=x['ph'],c=x['c'],e=x['e'],t=x['t'],z=round(z,2),fw=int(fw),cz=cloze(x['w'],x['e']),sd=senses(x,fw)))
out.sort(key=lambda r:(band[r['c']],r['fw'],-r['z']))
for i,r in enumerate(out): r['i']=i
json.dump(out,open('data/words.json','w',encoding='utf8'),ensure_ascii=False,separators=(',',':'))
print('đã tách nghĩa theo loại từ:',sum(1 for r in out if r['sd']),'/ 775 từ nhiều loại từ');print(len(out),'từ; cloze',sum(1 for r in out if r['cz']),'; fw',sum(r['fw'] for r in out))
print([r['w'] for r in out[:25]])
