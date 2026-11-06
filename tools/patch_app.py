import re,json
P='js/app.js';L=open(P,encoding='utf8').read().split('\n')
assert L[0].startswith('import*as T') and L[3].startswith('import{initializeApp') and L[5].startswith('import{getAuth')
HEAD=r"""import{fsrs,generatorParameters,createEmptyCard}from'./vendor/fsrs.mjs';
/* Thư viện ngoài tải động: lỗi mạng/CDN không còn làm kẹt cả app – phần học vẫn chạy */
const tmo=(p,ms)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))]);
let T=null;try{T=await tmo(import('three'),8000)}catch(e){console.warn('three.js không tải được: tắt nền 3D/thiên hà',e)}
const NO3D=!T;if(NO3D){const nop=function(){},mk=()=>new Proxy(nop,{get:(t,k)=>k===Symbol.toPrimitive?()=>0:k==='then'?undefined:mk(),apply:()=>mk(),construct:()=>mk(),set:()=>true});T=mk();const g=document.getElementById('gl');if(g)g.style.display='none';const n=document.querySelector('nav [data-v=galaxy]');if(n)n.hidden=true}
let FB={};try{const U='https://www.gstatic.com/firebasejs/10.14.1/';Object.assign(FB,...await tmo(Promise.all([import(U+'firebase-app.js'),import(U+'firebase-database.js'),import(U+'firebase-auth.js')]),8000))}catch(e){console.warn('Firebase không tải được: chạy ngoại tuyến',e)}
const FBOK=!!FB.initializeApp;
const{initializeApp,getDatabase,ref,set,get,remove,query,orderByChild,limitToLast,serverTimestamp,getAuth,onAuthStateChanged,signInWithPopup,GoogleAuthProvider,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,signOut,signInAnonymously,linkWithPopup,linkWithCredential,signInWithCredential,EmailAuthProvider,deleteUser,fetchSignInMethodsForEmail}=FB;"""
L[0]='';L[3]=HEAD;L[4]='';L[5]=''
s='\n'.join(L)
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:60],s.count(a));s=s.replace(a,b)
rep("const app=initializeApp(firebaseConfig),db=getDatabase(app),au=getAuth(app);","const app=FBOK?initializeApp(firebaseConfig):null,db=FBOK?getDatabase(app):null,au=FBOK?getAuth(app):null;")
rep("onAuthStateChanged(au,u=>{","(FBOK?onAuthStateChanged:(a,f)=>f(null))(au,u=>{")
rep("const need=!ready||(!usr&&!guestOn());","const need=FBOK&&(!ready||(!usr&&!guestOn()));")
# ---- lịch ôn: SM-2 -> FSRS (giữ tên trường cũ n/ef/iv/lp/due/ts để thiên hà, thống kê, đồng bộ cloud không hỏng; thẻ cũ tự quy đổi) ----
a=s.index("function nxt(c,g){");b=s.index("function buildQ(){")
FS=r"""const FS=fsrs(generatorParameters({enable_fuzz:true,enable_short_term:false}));
const toCard=c=>c.S?{due:new Date(c.due),stability:c.S,difficulty:c.D,elapsed_days:0,scheduled_days:c.iv||0,learning_steps:0,reps:c.n||0,lapses:c.lp||0,state:2,last_review:new Date(c.ts||Date.now())}
 :{due:new Date(c.due||Date.now()),stability:Math.max(.5,c.iv||1),difficulty:Math.min(10,Math.max(1,5+(2.5-(c.ef||2.5))*3)),elapsed_days:0,scheduled_days:c.iv||0,learning_steps:0,reps:c.n||1,lapses:c.lp||0,state:2,last_review:new Date(c.ts||Date.now())};
function nxt(c,g,now=Date.now()){const d=new Date(now),r=FS.next(c?toCard(c):createEmptyCard(d),d,g+1).card;return Object.assign({},c||{},{n:r.reps,iv:r.scheduled_days,lp:r.lapses,due:r.due.getTime(),ts:now,S:r.stability,D:r.difficulty,ef:(c&&c.ef)||2.5})}
const ivl=(c,g)=>g==0?'<1p':(n=>n<1?'1 ngày':Math.round(n)+' ngày')(nxt(c,g).iv);
function grade(i,g){const nw=!S.cards[i];S.cards[i]=nxt(S.cards[i],g);nw?S.nn++:S.rv++}
"""
s=s[:a]+FS+s[b:]
a=s.index("function buildQ(){");b=s.index("\n",a)
s=s[:a]+"function buildQ(){const now=Date.now();let d=[],n=[];W.forEach((x,i)=>{const c=S.cards[i];if(c){if(c.due<=now)d.push(i)}else if(S.lv.includes(x.c))n.push(i)});d.sort((a,b)=>S.cards[a].due-S.cards[b].due);n.sort((a,b)=>W[a].ord-W[b].ord);return[...d.slice(0,40),...n.slice(0,Math.max(0,S.nd-S.nn))]}"+s[b:]
# ---- game: đúng KHÔNG đổi lịch; sai thì ôn sớm hơn; XP luyện nhỏ hơn XP học ----
rep("if(S.cards[q.i])S.cards[q.i]=nxt(S.cards[q.i],ok?2:0);","{const cd=S.cards[q.i];if(cd&&!ok&&cd.due>Date.now())cd.due=Date.now()}")
rep("G.xp+=10+Math.min(G.combo,10)","G.xp+=2+(G.combo>=5?1:0)")
rep("Mỗi câu đúng +10 XP, combo tăng thêm. Trả lời sai sẽ đưa từ về ôn lại.","Mỗi câu đúng +2 XP (combo từ 5: +3). Đúng không đổi lịch ôn; trả lời sai thì từ đó được ôn sớm hơn.")
rep("S.cards[i]={n:3,ef:2.5,iv:30,lp:0,due:Date.now()+30*864e5,ts:Date.now()}","S.cards[i]={n:3,ef:2.5,iv:30,lp:0,due:Date.now()+30*864e5,ts:Date.now(),S:30,D:5}")
# ---- phiên học mới: từ mới được kiểm tra ngay (nhớ lại chủ động), ôn tập tự chấm đúng/sai ----
a=s.index("V.learn=()=>{");b=s.index("const modes={")
LEARN=r"""const LS={};let EX=null;
const norm=t=>t.toLowerCase().replace(/[^a-z0-9 ]/g,'').trim();
function lev(a,b){const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]}
const matchW=(a,w)=>{a=norm(a);const t=norm(w);return a===t||(t.length>=6&&lev(a,t)<=1)};
const sn=x=>x.sd?x.sd.map(([p,m])=>`<div><b>${esc(p)}</b> · ${esc(m)}</div>`).join(''):`<div style="font-size:21px;font-weight:600">${esc(x.v)}</div>`;
const info=i=>{const x=W[i];return `<div class="card" style="text-align:left"><div><b style="font-size:24px">${esc(x.w)}</b> <span class="m">${esc(x.ph)}</span> <button class="sp" data-a="say" data-v="${i}" aria-label="Nghe phát âm">🔊</button></div><div class="m">${x.c} · ${esc(x.p)}</div><div style="margin:8px 0">${sn(x)}</div><div>${hl(x.e,x.w)}</div><div class="m" style="margin-top:4px">${esc(x.t)}</div></div>`};
const lhead=()=>`<div class="lh"><span class="m">${qi+1}/${Q.length} · ${S.cards[Q[qi]]?'Ôn tập':'Từ mới'}</span></div><div class="bar" style="margin:2px 0 10px"><i style="width:${qi/Q.length*100}%"></i></div>`;
function opts(i){const x=W[i],o=[i];let g=0;while(o.length<4&&g++<400){const j=Math.random()*W.length|0,y=W[j];if(o.includes(j)||y.m===x.m)continue;if(g<250&&(y.c!==x.c||y.pm!==x.pm))continue;o.push(j)}while(o.length<4){const j=Math.random()*W.length|0;if(!o.includes(j))o.push(j)}return o.sort(()=>Math.random()-.5)}
V.learn=()=>{if(!Q){Q=buildQ();qi=0}fl=false;EX=null;
 if(qi>=Q.length){if(Q.length)sfx('win');return h(`<div class="fill" style="justify-content:center"><div class="card ct"><div style="font-size:56px">${Q.length?'🎉':'✅'}</div><h2>${Q.length?'Hoàn thành phiên học!':'Không còn thẻ nào'}</h2><p class="m">Có thể đổi số từ mới mỗi ngày hoặc cấp độ trong mục Tôi.</p><button class="btn" data-a="go" data-v="play">Luyện tập thêm 🎮</button><button class="btn s" data-a="go" data-v="home">Trang chủ</button></div></div>`)}
 const i=Q[qi],c=S.cards[i],st=LS[i]||(LS[i]={}),x=W[i];
 if(!c&&!st.seen){h(`<div class="fill">${lhead()}<p class="m ct">Xem kỹ từ này, ngay sau đó bạn sẽ được kiểm tra.</p>${info(i)}<button class="btn" data-a="ls">Đã xem, kiểm tra</button><button class="btn s" data-a="known">✔ Đã biết từ này</button></div>`);if(S.auto)speak(x.w);return}
 const kind=!c?((st.need||2)===2||!x.cz?'mc':'cl'):(c.iv<4||!x.cz?'mc':c.iv<15?'cl':'ty');EX={i,kind,t0:Date.now(),done:false};
 const pr=kind=='mc'?`<div style="font-size:28px;font-weight:700">${esc(x.m)}</div><div class="m">${esc(x.pm)}</div>`:`<div style="font-size:21px;margin:6px 0">${esc(x.cz)}</div><div class="m">${esc(x.m)} · ${esc(x.pm)}</div>`;
 const body=kind=='ty'?`<input id="ti" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Gõ từ gốc (dạng từ điển)…"><button class="btn" data-a="lc">Kiểm tra</button><button class="btn s" data-a="li">Không nhớ</button>`:opts(i).map(j=>`<button class="op" data-a="lp" data-v="${j}">${esc(W[j].w)}</button>`).join('');
 h(`<div class="fill">${lhead()}<div class="card ct q">${pr}</div>${body}</div>`);
 if(kind=='ty'){const t=$('#ti');t.focus();t.onkeydown=e=>{if(e.key=='Enter')A.lc()}}};
function lfin(ok){if(!EX||EX.done)return;EX.done=true;const i=EX.i,ms=Date.now()-EX.t0,st=LS[i],c=S.cards[i];burst(ok);sfx(ok?'ok':'no',0);
 if(!c){if(ok){st.need=(st.need||2)-1;if(st.need>0)Q.splice(Math.min(qi+5,Q.length),0,i);else{grade(i,st.miss?1:2);addXP(10)}}else{st.miss=(st.miss||0)+1;st.need=2;Q.splice(Math.min(qi+3,Q.length),0,i)}}
 else{if(!st.g){st.g=1;grade(i,ok?(ms>12000?1:2):0);addXP(ok?5:1)}if(!ok)Q.splice(Math.min(qi+3,Q.length),0,i)}
 save();h(`<div class="fill">${lhead()}<div class="card ct" style="color:${ok?'#3ddc97':'#ff6b81'}"><b style="font-size:20px">${ok?'Đúng ✔':'Chưa đúng'}</b></div>${info(i)}<button class="btn" data-a="ln">Tiếp</button></div>`);if(ok||S.auto)speak(W[i].w)}
"""
s=s[:a]+LEARN+s[b:]
rep("const A={go,","const A={go,ls(){LS[Q[qi]].seen=1;V.learn()},ln(){qi++;V.learn()},lp(v){lfin(+v===EX.i)},lc(){lfin(matchW($('#ti').value,W[EX.i].w))},li(){lfin(false)},")
open(P,'w',encoding='utf8').write(s)
# ---- words.js: GIỮ NGUYÊN THỨ TỰ cũ (khoá tiến độ theo chỉ số) + trường mới ----
src=open('tools/words-original.js',encoding='utf8').read();old=json.loads(src[src.index('['):src.rindex(']')+1])
new={r['w']:r for r in json.load(open('data/words.json',encoding='utf8'))}
out=[]
for x in old:
    n=new[x['w']];y=dict(x);y['ph']=n['ph'];y['m']=n['m'];y['pm']=n['sd'][0][0] if n['sd'] else n['p'].split(',')[0].strip();y['sd']=n['sd'];y['cz']=n['cz'];y['z']=n['z'];y['fw']=n['fw'];y['ord']=n['i'];out.append(y)
open('js/words.js','w',encoding='utf8').write('export const W='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';')
t=open('sw.js').read();assert 'vv-v8' in t;t=t.replace('vv-v8','vv-v9').replace("'js/words.js',","'js/words.js','js/vendor/fsrs.mjs',");open('sw.js','w').write(t)
print('ok',len(out))
