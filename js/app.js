
import{W}from'./words.js';
import{firebaseConfig}from'./firebase-config.js';
import{fsrs,generatorParameters,createEmptyCard}from'./vendor/fsrs.mjs';
import{parseTx,buildTimes,findIdx,fmtT}from'./sync.js';
import{VPlayer}from'./vplayer.js';
/* Thư viện ngoài tải động: lỗi mạng/CDN không còn làm kẹt cả app – phần học vẫn chạy */
const tmo=(p,ms)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))]);
const FBU='https://www.gstatic.com/firebasejs/10.14.1/',P3=tmo(import('three'),8000),PF=tmo(Promise.all([import(FBU+'firebase-app.js'),import(FBU+'firebase-database.js'),import(FBU+'firebase-auth.js')]),8000);P3.catch(()=>{});PF.catch(()=>{});/* bắt đầu tải cả hai ngay, chờ song song */
let T=null;try{T=await P3}catch(e){console.warn('three.js không tải được: tắt nền 3D/thiên hà',e)}
const NO3D=!T;if(NO3D){const nop=function(){},mk=()=>new Proxy(nop,{get:(t,k)=>k===Symbol.toPrimitive?()=>0:k==='then'?undefined:mk(),apply:()=>mk(),construct:()=>mk(),set:()=>true});T=mk();const g=document.getElementById('gl');if(g)g.style.display='none';const n=document.querySelector('nav [data-v=galaxy]');if(n)n.hidden=true}
let FB={};try{Object.assign(FB,...await PF)}catch(e){console.warn('Firebase không tải được: chạy ngoại tuyến',e)}
const FBOK=!!FB.initializeApp;
const{initializeApp,getDatabase,ref,set,get,remove,query,orderByChild,limitToLast,serverTimestamp,getAuth,onAuthStateChanged,signInWithPopup,GoogleAuthProvider,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,signOut,signInAnonymously,linkWithPopup,linkWithCredential,signInWithCredential,EmailAuthProvider,deleteUser,fetchSignInMethodsForEmail}=FB;


const $=s=>document.querySelector(s),h=s=>$('#main').innerHTML=s,esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const L=['A1','A2','B1','B2','C1'],LC={A1:0x3ddc97,A2:0x4cc9f0,B1:0x7c9cff,B2:0xc77dff,C1:0xff6b81};
const dayOf=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},day=()=>dayOf(Date.now()),sh=v=>v.split(/[;,(]/)[0].trim(),rnd=a=>a[Math.random()*a.length|0];
function def(){return{xp:0,streak:0,last:'',day:day(),nn:0,rv:0,cards:{},lv:['A1','A2'],nd:10,acc:'en-GB',auto:true,ap:1,name:'',upd:0,best:0,owner:'',fx:true,sfx:true,music:true,mv:.5,nc:0}}
function mig(o){if(o&&o.ap==null){o.auto=true;o.ap=1}return o}
let S;try{S=Object.assign(def(),mig(JSON.parse(localStorage.vv)))}catch{S=def()}
if(S.day!==day()){S.day=day();S.nn=0;S.rv=0}
const lvl=()=>Math.floor(Math.sqrt(S.xp/50))+1;
/* ---------- Firebase (Auth + Realtime DB) ---------- */
const app=FBOK?initializeApp(firebaseConfig):null,db=FBOK?getDatabase(app):null,au=FBOK?getAuth(app):null;
let usr=null,uid='',cs='Chưa đăng nhập – dữ liệu chỉ lưu trên máy',tm;
const EM={'auth/invalid-credential':'Sai email hoặc mật khẩu','auth/email-already-in-use':'Email đã được đăng ký','auth/weak-password':'Mật khẩu tối thiểu 6 ký tự','auth/invalid-email':'Email không hợp lệ','auth/popup-closed-by-user':'Bạn đã đóng cửa sổ đăng nhập','auth/unauthorized-domain':'Domain chưa được thêm vào Authorized domains (xem README)','auth/network-request-failed':'Mất kết nối mạng','auth/admin-restricted-operation':'Chưa bật đăng nhập Ẩn danh (Anonymous) trong Firebase Console','auth/operation-not-allowed':'Phương thức đăng nhập này chưa được bật trong Firebase Console','auth/popup-blocked':'Trình duyệt chặn cửa sổ đăng nhập, hãy cho phép popup','auth/cancelled-popup-request':'Đã huỷ đăng nhập','auth/too-many-requests':'Thử quá nhiều lần, hãy đợi một lúc','auth/missing-password':'Chưa nhập mật khẩu','auth/missing-email':'Chưa nhập email','auth/user-disabled':'Tài khoản đã bị khoá','auth/credential-already-in-use':'Tài khoản này đã được liên kết với người khác','auth/provider-already-linked':'Tài khoản đã được liên kết rồi','auth/account-exists-with-different-credential':'Email này đã đăng ký bằng cách khác (email/mật khẩu). Hãy đăng nhập bằng email'};
const err=e=>EM[e.code]||e.code||e.message;
/* khai báo sớm: usr()/refresh() có thể chạy ngay lúc khởi động (khi Firebase lỗi/ngoại tuyến) trước khi tới phần Views */
let tab='home',Q=null,qi=0,fl=false,G=null,mt='set',dip=null;const V={};
const refresh=()=>{if((tab=='me'||tab=='home')&&V[tab])V[tab]()};
function merge(a,b){const n=a.upd>=b.upd?a:b,r=Object.assign(def(),n),ca=a.cards||{},cb=b.cards||{};r.cards={...cb,...ca};for(const k in cb)if(ca[k]&&(cb[k].ts||0)>(ca[k].ts||0))r.cards[k]=cb[k];
 r.xp=Math.max(a.xp||0,b.xp||0);r.best=Math.max(a.best||0,b.best||0);r.upd=Date.now();
 {const na=a.nc||0,nb=b.nc||0;r.nc=Math.max(na,nb);r.name=na!=nb?(na>nb?a.name:b.name):(/^Khách /.test(a.name||'')&&b.name?b.name:(r.name||a.name||b.name||''))}if(r.day!==day()){r.day=day();r.nn=0;r.rv=0}return r}
async function push(){await set(ref(db,'users/'+uid),S);await set(ref(db,'leaderboard/'+uid),{n:S.name||'Ẩn danh',xp:S.xp,st:S.streak,lv:lvl(),t:serverTimestamp()})}
async function pull(){cs='⏳ Đang đồng bộ…';refresh();try{const d=(await get(ref(db,'users/'+uid))).val();
 if(d){const nc={};Object.entries(d.cards||{}).forEach(([k,v])=>{if(v)nc[k]=v});d.cards=nc;mig(d)}
 if(S.owner&&S.owner!==uid&&S.owner!==localStorage.vvao)S=d?Object.assign(def(),d):def();else S=d?merge(S,d):S;
 S.owner=uid;if(!usr.isAnonymous)localStorage.removeItem('vvao');await ensureName();localStorage.vv=JSON.stringify(S);await push();cs='☁️ Đã đồng bộ'}catch(e){cs='📴 Lỗi đồng bộ: '+(e.code||e.message)}refresh()}
function cloud(){if(!usr)return;clearTimeout(tm);tm=setTimeout(()=>push().then(()=>cs='☁️ Đã đồng bộ').catch(e=>cs='📴 Lỗi: '+(e.code||'')),2500)}
function save(){S.upd=Date.now();localStorage.vv=JSON.stringify(S);cloud()}
/* ---------- Tên hiển thị: không trùng (không phân biệt hoa/thường), giữ chỗ trong names/<tên> = uid ---------- */
const nk=n=>encodeURIComponent(String(n).normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()).replace(/\./g,'%2E'),
 nameLock=()=>Date.now()-(S.nc||0)<864e5;/* đã đổi tên trong 24 giờ qua: ô tên bị làm mờ */
async function avail(n){try{const o=(await get(ref(db,'names/'+nk(n)))).val();return!o||o===uid?1:0}catch{return -1}}/* 1 dùng được · 0 đã có người dùng · -1 không kiểm tra được */
async function claim(n){const r=ref(db,'names/'+nk(n));let o;try{o=(await get(r)).val()}catch{return -1}
 if(o===uid)return 1;if(o)return 0;try{await set(r,uid);return 1}catch{return 0}}
/* Đảm bảo tên hiện tại đã được giữ chỗ cho tài khoản này; nếu trùng thì thêm số phía sau. Chưa có tên thì dùng tên mặc định (Khách ab12 / tên Google) */
async function ensureName(){if(!usr)return;const n=S.name||(usr.isAnonymous?'Khách '+uid.slice(0,4):(usr.displayName||'').slice(0,16));if(!n)return;
 for(let i=0;i<6;i++){const c=i?n.slice(0,13)+' '+(10+Math.random()*90|0):n,r=await claim(c);if(r<0)break;
  if(r){if(S.name&&c!==S.name)toast('Tên "'+S.name+'" đã có người dùng, đã đổi thành "'+c+'"',4000);S.name=c;return}}
 if(!S.name)S.name=n}
async function wipe(){const k=S.name?nk(S.name):'';for(const q of['leaderboard/'+uid,'users/'+uid,k&&'names/'+k])if(q)try{await remove(ref(db,q))}catch{}}
const cl=v=>String(v).trim().replace(/\s+/g,' ');
async function rename(raw){const el=$('#nm'),v=cl(raw).slice(0,16),back=()=>{if(el){el.value=S.name;el.disabled=false}};
 if(v===S.name||nameLock())return back();
 clearTimeout(nt);if(el)el.disabled=true;
 if(v&&!(S.name&&nk(v)==nk(S.name))){const r=usr?await claim(v):await avail(v);
  if(r==0){toast('Tên đã có người dùng, hãy chọn tên khác');return back()}
  if(r<0&&usr){toast('Không kiểm tra được tên – kiểm tra mạng và Rules của database');return back()}}
 const o=S.name;S.name=v;S.nc=Date.now();if(usr&&o&&nk(o)!=nk(v))remove(ref(db,'names/'+nk(o))).catch(()=>{});
 save();toast('Đã đổi tên ✔');if(tab=='me')V.me()}
let nt;function hint(e){const v=cl(e.target.value),h=$('#nh');clearTimeout(nt);if(!h)return;
 if(!v||v===S.name||(S.name&&nk(v)==nk(S.name))){h.hidden=true;return}
 nt=setTimeout(async()=>{const r=await avail(v),h2=$('#nh'),i=$('#nm');if(!h2||!i||cl(i.value)!==v||v===S.name||nameLock())return;h2.hidden=r<0;h2.textContent=r?'✔ Tên có thể dùng':'✖ Tên đã có người dùng';h2.style.color=r?'var(--g)':'var(--r)'},450)}
/* ---------- Màn hình đăng nhập đầu tiên: Google / email / khách ---------- */
let ready=false,gtry=false;
const guestOn=()=>localStorage.vvg==='1';
/* ---------- Form đăng nhập / đăng ký dùng chung (màn hình đầu + mục Tôi). Không dùng alert(): lỗi hiện ngay trong form ---------- */
const AF={m:'in',e:'',p:'',p2:'',show:false,busy:false,fe:{},msg:null},MAILRE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const msgHtml=()=>{const m=AF.msg;if(!m)return'';const a=(m.a||[]).map(x=>`<button type="button" class="chip" data-a="${x.a}" data-v="${x.v||''}">${esc(x.l)}</button>`).join('');
 return`<div class="msg ${m.t}" role="${m.t=='err'?'alert':'status'}"><span>${esc(m.h)}</span>${a?`<span>${a}</span>`:''}</div>`};
const setMsg=m=>{AF.msg=m;document.querySelectorAll('[data-af] .mg').forEach(e=>e.innerHTML=msgHtml())};
const authInner=()=>{const up=AF.m=='up',g=!!(usr&&usr.isAnonymous),d=AF.busy?' disabled':'',
 fe=n=>AF.fe[n]?`<div class="fe" role="alert">${esc(AF.fe[n])}</div>`:'',iv=n=>AF.fe[n]?' aria-invalid="true"':'';
 return`<button type="button" class="btn" data-a="google" style="margin-top:0"${d}>${g?'Liên kết với Google':'Tiếp tục với Google'}</button>
<div class="or">hoặc dùng email</div>
<div class="seg" role="tablist" style="margin:0"><button type="button" role="tab" aria-selected="${!up}" class="${up?'':'on'}" data-a="am" data-v="in">Đăng nhập</button><button type="button" role="tab" aria-selected="${up}" class="${up?'on':''}" data-a="am" data-v="up">${g?'Liên kết email':'Đăng ký'}</button></div>
<form novalidate data-f="${up?'up':'in'}">
<label class="fld"><span>Email</span><input name="e" type="email" inputmode="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="ten@email.com" value="${esc(AF.e)}"${iv('e')}>${fe('e')}</label>
<label class="fld"><span>Mật khẩu</span><div class="pw"><input name="p" type="${AF.show?'text':'password'}" autocomplete="${up?'new-password':'current-password'}" placeholder="${up?'Tối thiểu 6 ký tự':'Nhập mật khẩu'}" value="${esc(AF.p)}"${iv('p')}><button type="button" class="eye" data-a="eye" aria-pressed="${AF.show}" aria-label="Hiện hoặc ẩn mật khẩu" tabindex="-1">${AF.show?'Ẩn':'Hiện'}</button></div>${fe('p')}</label>
${up?`<label class="fld"><span>Nhập lại mật khẩu</span><div class="pw"><input name="p2" type="${AF.show?'text':'password'}" autocomplete="new-password" placeholder="Nhập lại mật khẩu" value="${esc(AF.p2)}"${iv('p2')}></div>${fe('p2')}</label>`:''}
<div class="mg" aria-live="polite">${msgHtml()}</div>
<button type="submit" class="btn"${d}>${AF.busy?'Đang xử lý…':up?(g?'Liên kết email':'Tạo tài khoản'):'Đăng nhập'}</button>
${up?'':'<div class="ct"><button type="button" class="link" data-a="reset">Quên mật khẩu?</button></div>'}
</form>`};
function authRender(f){document.querySelectorAll('[data-af]').forEach(e=>e.innerHTML=authInner());
 if(f){const r=$('#gate')||document,i=r.querySelector('[data-af] [name="'+f+'"]');if(i)i.focus()}}
const aBusy=b=>{AF.busy=b;authRender()};
const aFormOf=t=>t.closest('[data-af]').querySelector('form');
const aRd=f=>{const g=n=>f.elements[n]?f.elements[n].value:'';AF.e=g('e').trim();AF.p=g('p');AF.p2=g('p2');return{e:AF.e,p:AF.p,p2:AF.p2}};
function aVal(d,up){const fe={};
 if(!d.e)fe.e='Nhập email của bạn';else if(!MAILRE.test(d.e))fe.e='Email chưa đúng định dạng (ví dụ: ten@gmail.com)';
 if(!d.p)fe.p='Nhập mật khẩu';else if(up&&d.p.length<6)fe.p='Mật khẩu cần tối thiểu 6 ký tự';
 if(up&&!fe.p&&d.p2!==d.p)fe.p2='Mật khẩu nhập lại chưa khớp';return fe}
function aFail(x){const c=x.code;
 if(c=='auth/popup-closed-by-user'||c=='auth/cancelled-popup-request'){AF.msg=null;return}
 if(c=='auth/email-already-in-use')AF.msg={t:'err',h:'Email này đã được đăng ký rồi.',a:[{l:'Đăng nhập bằng email này',a:'am',v:'in'},{l:'Quên mật khẩu?',a:'reset'}]};
 else if(c=='auth/invalid-credential'||c=='auth/wrong-password'||c=='auth/user-not-found')AF.msg={t:'err',h:'Email hoặc mật khẩu chưa đúng. Nếu bạn chưa có tài khoản, hãy đăng ký.',a:[{l:'Quên mật khẩu?',a:'reset'},{l:'Tạo tài khoản mới',a:'am',v:'up'}]};
 else AF.msg={t:'err',h:err(x)}}
/* Kiểm tra email đã đăng ký chưa ngay khi rời ô email (tab Đăng ký). Nếu project bật "Email enumeration protection" thì Firebase luôn trả rỗng – khi đó lỗi email-already-in-use lúc bấm Tạo tài khoản vẫn bắt được */
let aCk=0;async function aMail(m){const id=++aCk;if(!MAILRE.test(m))return;
 try{const r=await fetchSignInMethodsForEmail(au,m);if(id!=aCk||AF.m!='up'||AF.e!=m||!r.length)return;
  setMsg(r.includes('google.com')&&!r.includes('password')?{t:'err',h:'Email này đã đăng ký bằng Google.',a:[{l:'Đăng nhập bằng Google',a:'google'}]}:{t:'err',h:'Email này đã được đăng ký rồi.',a:[{l:'Đăng nhập bằng email này',a:'am',v:'in'},{l:'Quên mật khẩu?',a:'reset'}]})}catch{}}
function gate(){let e=$('#gate');const need=FBOK&&(!ready||(!usr&&!guestOn()));
 if(!need){if(e)e.remove();return}
 const st=ready?'fm':'ld';if(!e){e=document.createElement('div');e.id='gate';document.body.appendChild(e)}if(e.dataset.s===st)return;e.dataset.s=st;
 e.innerHTML=st=='ld'?'<div class="gi ct"><div class="gl">🌌</div><h2>Học Từ Vựng</h2><div class="m">⏳ Đang tải…</div></div>'
:`<div class="gi ct"><div class="gl">🌌</div><h2>Học Từ Vựng</h2><p class="m" style="margin:0 0 14px">Đăng nhập để đồng bộ tiến độ giữa các thiết bị và thi đua trên bảng xếp hạng.</p><div class="card" style="text-align:left"><div data-af>${authInner()}</div></div><div class="or" style="margin:12px 0 8px">hoặc</div><button class="btn s" data-a="guest" style="margin-top:0">👤 Chơi với tài khoản khách</button><p class="m" style="margin:10px 0 0">Tài khoản khách vẫn chơi online và xem được bảng xếp hạng. Bạn có thể liên kết Google/email sau để giữ tiến độ.</p></div>`}
/* Chuyển từ tài khoản khách sang tài khoản khác: xoá dòng của khách trên cloud (tránh trùng trên bảng xếp hạng); nếu đăng nhập thất bại thì ghi lại */
async function swap(fn){const g=usr&&usr.isAnonymous?uid:'';
 if(g){clearTimeout(tm);await wipe()}
 try{await fn()}catch(x){if(g)ensureName().then(push).catch(()=>{});throw x}}
/* Sau khi liên kết tài khoản khách: uid giữ nguyên nên onAuthStateChanged không chạy, tự cập nhật */
function linked(){usr=au.currentUser;localStorage.removeItem('vvao');localStorage.removeItem('vvg');const o=S.name;if(/^Khách /.test(o||'')&&usr.displayName&&!S.nc)S.name=usr.displayName.slice(0,16);cs='☁️ Đã liên kết';ensureName().then(()=>{if(o&&nk(o)!=nk(S.name))remove(ref(db,'names/'+nk(o))).catch(()=>{});save();refresh()});toast('Đã liên kết tài khoản ✔')}
(FBOK?onAuthStateChanged:(a,f)=>f(null))(au,u=>{usr=u;uid=u?u.uid:'';ready=true;
 if(u){if(u.isAnonymous)localStorage.vvao=u.uid;else localStorage.removeItem('vvg');pull()}
 else{cs='Chưa đăng nhập – dữ liệu chỉ lưu trên máy';refresh();if(guestOn()&&!gtry){gtry=true;signInAnonymously(au).catch(()=>{})}}
 gate()});
setTimeout(()=>{if(!ready){ready=true;gate()}},4000);
const acct=()=>usr&&!usr.isAnonymous?`<div class="card"><b>☁️ Tài khoản</b><div class="m" style="margin:6px 0">${esc(usr.email||usr.displayName||'')}<br>${cs}</div><button class="btn s" data-a="logout">Đăng xuất</button></div>`
:usr?`<div class="card"><b>👤 Tài khoản khách</b><div class="m" style="margin:6px 0 10px">${esc(S.name)}<br>${cs}<br>Liên kết Google/email để giữ tiến độ khi đổi máy hoặc thoát.</div><div data-af>${authInner()}</div><div class="ct" style="margin-top:6px"><button class="chip" data-a="logout">Thoát chế độ khách</button></div></div>`
:`<div class="card"><b>Đăng nhập để đồng bộ & xếp hạng</b><div class="m" style="margin:6px 0 10px">${cs}</div><div data-af>${authInner()}</div></div>`;
/* ---------- Logic ---------- */
function addXP(n){if(S.last!==day()){const y=dayOf(Date.now()-864e5);S.streak=S.last===y?S.streak+1:1;S.last=day()}S.xp+=n}
const FS=fsrs(generatorParameters({enable_fuzz:true,enable_short_term:false}));
const toCard=(c,now=Date.now())=>c.S?{due:new Date(c.due),stability:c.S,difficulty:c.D,elapsed_days:0,scheduled_days:c.iv||0,learning_steps:0,reps:c.n||0,lapses:c.lp||0,state:2,last_review:new Date(Math.min(c.ts||now,now))}
 :{due:new Date(c.due||Date.now()),stability:Math.max(.5,c.iv||1),difficulty:Math.min(10,Math.max(1,5+(2.5-(c.ef||2.5))*3)),elapsed_days:0,scheduled_days:c.iv||0,learning_steps:0,reps:c.n||1,lapses:c.lp||0,state:2,last_review:new Date(Math.min(c.ts||now,now))};
function nxt(c,g,now=Date.now()){const d=new Date(now),r=FS.next(c?toCard(c,now):createEmptyCard(d),d,g+1).card;return Object.assign({},c||{},{n:r.reps,iv:r.scheduled_days,lp:r.lapses,due:r.due.getTime(),ts:now,S:r.stability,D:r.difficulty,ef:(c&&c.ef)||2.5})}
const ivl=(c,g)=>g==0?'<1p':(n=>n<1?'1 ngày':Math.round(n)+' ngày')(nxt(c,g).iv);
function grade(i,g){const nw=!S.cards[i];S.cards[i]=nxt(S.cards[i],g);nw?S.nn++:S.rv++}
function buildQ(){const now=Date.now();let d=[],n=[];W.forEach((x,i)=>{const c=S.cards[i];if(c){if(c.due<=now)d.push(i)}else if(S.lv.includes(x.c))n.push(i)});d.sort((a,b)=>S.cards[a].due-S.cards[b].due);n.sort((a,b)=>W[a].ord-W[b].ord);return[...d.slice(0,40),...n.slice(0,Math.max(0,S.nd-S.nn))]}
function speak(t){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang=S.acc;u.rate=.9;speechSynthesis.speak(u)}catch{}}
/* ---------- Âm thanh (Web Audio: tự tạo bằng code, không cần file, chạy offline) ---------- */
let AC=null,MG=null,MB=null;
function ac(){if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;AC=new C();MG=AC.createGain();MG.gain.value=.6;const cp=AC.createDynamicsCompressor();MG.connect(cp);cp.connect(AC.destination);
 /* bus nhạc nền: âm lượng riêng + echo nhẹ cho êm tai */
 MB=AC.createGain();MB.gain.value=0;MB.connect(cp);const dl=AC.createDelay(1),fb=AC.createGain(),lp=AC.createBiquadFilter(),wg=AC.createGain();dl.delayTime.value=.375;fb.gain.value=.38;lp.type='lowpass';lp.frequency.value=1800;wg.gain.value=.3;MB.connect(dl);dl.connect(lp);lp.connect(fb);fb.connect(dl);lp.connect(wg);wg.connect(cp)}
 if(AC.state=='suspended')AC.resume();return AC}
function tone(f,t0,d,o={}){const c=ac();if(!c)return;const t=c.currentTime+t0,os=c.createOscillator(),g=c.createGain();os.type=o.type||'sine';os.frequency.setValueAtTime(f,t);if(o.slide)os.frequency.exponentialRampToValueAtTime(f*o.slide,t+d);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(o.v||.2,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);os.connect(g);g.connect(MG);os.start(t);os.stop(t+d+.05)}
const PEN=[0,2,4,7,9,12,14,16];
const SFX={
 ok(c){const f=523.25*Math.pow(2,PEN[Math.min(Math.max(c,1),8)-1]/12);tone(f,0,.16,{v:.18});tone(f*1.5,.07,.26,{v:.14})},
 no(){tone(200,0,.28,{type:'triangle',v:.2,slide:.75});tone(150,.13,.32,{type:'triangle',v:.18,slide:.75})},
 flip(){tone(420,0,.09,{type:'triangle',v:.1,slide:1.7})},
 good(g){const f=[440,440,587,784][g]||587;tone(f,0,.12,{v:.15});if(g==3)tone(f*1.25,.07,.2,{v:.12})},
 again(){tone(240,0,.18,{type:'triangle',v:.12,slide:.8})},
 tick(){tone(1200,0,.05,{type:'square',v:.04})},
 win(){[523,659,784,1047].forEach((f,i)=>tone(f,i*.1,.28,{v:.15}))},
 lose(){tone(392,0,.2,{type:'triangle',v:.16});tone(330,.18,.35,{type:'triangle',v:.16})},
 lvl(){[523,659,784,1047,1319,1568].forEach((f,i)=>tone(f,i*.08,.3,{v:.14}))}};
const sfx=(n,a)=>{if(S.sfx===false)return;try{SFX[n](a)}catch{}};
/* ---------- Nhạc nền: tự phát bằng code (không cần file mp3, chạy offline) ----------
   Hợp âm Am7 – Fmaj7 – Cmaj7 – G6, rồi Fmaj7 – Em7 – Dm7 – Cmaj7: nền (pad) êm + bass + vài nốt ngân ngẫu nhiên, ~80 nhịp/phút */
const MUS={on:false,t:0,next:0,step:0},BEAT=.75,mf=n=>440*Math.pow(2,(n-69)/12),
 PL=[[[57,60,64,67],45],[[53,57,60,64],41],[[48,52,55,59],48],[[55,59,62,64],43],[[53,57,60,64],41],[[52,55,59,62],52],[[50,53,57,60],50],[[48,52,55,59],48]];
function voice(f,t,d,o){const c=AC,os=c.createOscillator(),g=c.createGain();os.type=o.type||'sine';os.frequency.value=f;if(o.det)os.detune.value=o.det;
 const a=o.a||.01;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(o.v||.05,t+a);g.gain.setTargetAtTime(0,t+(o.hold??a),o.r||d/4);
 let n=os;if(o.lp){const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=o.lp;os.connect(fl);n=fl}n.connect(g);g.connect(MB);os.start(t);os.stop(t+d)}
function musStep(t,s){const[ch,b]=PL[Math.floor(s/16)%PL.length],k=s%16;
 if(k==0){ch.forEach((n,j)=>{voice(mf(n),t,8.5,{type:j%2?'triangle':'sine',v:.03,a:1.8,hold:5,r:.8,lp:1100,det:j*3-4});voice(mf(n+12),t,8.5,{v:.012,a:2.2,hold:5,r:.8,det:4})});voice(mf(b),t,3.5,{v:.15,a:.05,hold:.3,r:.6})}
 else if(k==8)voice(mf(b+7),t,3,{v:.08,a:.05,hold:.3,r:.5});
 if(k%2==0?Math.random()<.5:Math.random()<.18)voice(mf(rnd(ch)+(Math.random()<.3?24:12)),t,2.2,{v:.06,a:.008,hold:.008,r:.35,lp:2600})}
function musTick(){const c=AC;if(!c||!MUS.on||c.state!='running')return;
 if(MUS.next<c.currentTime-.2){MUS.next=c.currentTime+.05;MUS.step=Math.ceil(MUS.step/16)*16}
 while(MUS.next<c.currentTime+1.2){musStep(MUS.next,MUS.step++);MUS.next+=BEAT/2}}
function musOn(){const c=ac();if(!c||!S.music)return;if(!MUS.on){MUS.on=true;MUS.next=c.currentTime+.1;MUS.step=0}if(!MUS.t)MUS.t=setInterval(musTick,200);
 MB.gain.cancelScheduledValues(c.currentTime);MB.gain.setTargetAtTime(S.mv*.5,c.currentTime,.7);musTick()}
function musOff(){MUS.on=false;if(AC&&MB){MB.gain.cancelScheduledValues(AC.currentTime);MB.gain.setTargetAtTime(0,AC.currentTime,.25)}clearInterval(MUS.t);MUS.t=0}
/* Trình duyệt chỉ cho phát âm thanh sau khi người dùng chạm: mở khoá ở lần chạm đầu tiên (thử lại nếu iOS chưa cho) */
const unlock=()=>{if(S.sfx===false&&!S.music)return;const c=ac();if(c&&S.music&&!MUS.on)musOn()};
['pointerdown','touchend','click','keydown'].forEach(ev=>document.addEventListener(ev,unlock,{capture:true,passive:true}));
document.addEventListener('visibilitychange',()=>{if(!AC)return;if(document.hidden)AC.suspend();else if(S.music||S.sfx!==false)AC.resume()});
const hl=(s,w)=>{const r=new RegExp('\\b'+w.replace(/[^a-z]/gi,'')+'\\w*','i');return esc(s).replace(r,m=>'<mark>'+m+'</mark>')};
/* ---------- Three.js ---------- */
const R=new T.WebGLRenderer({canvas:$('#gl'),antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,2));
const sc=new T.Scene(),cam=new T.PerspectiveCamera(60,1,.1,200);cam.position.z=14;
let zf=16;const rs=()=>{R.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();
 zf=Math.max(15,Math.min(60,11/(Math.tan(Math.PI/6)*cam.aspect)));/* khoảng cách camera để cả thiên hà vừa chiều ngang màn hình */
 gm.uniforms.k.value=innerHeight*R.getPixelRatio()/(2*Math.tan(Math.PI/6))};
const bg=new T.Group();sc.add(bg);const N=900,pa=new Float32Array(N*3).map(()=>(Math.random()-.5)*50);
const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pa,3));
const pm=new T.PointsMaterial({size:.13,color:0x9db4ff,transparent:true,opacity:.85}),base=new T.Color(0x9db4ff);bg.add(new T.Points(pg,pm));
const cr=new T.Mesh(new T.IcosahedronGeometry(2.4,1),new T.MeshBasicMaterial({color:0x7c9cff,wireframe:true,transparent:true,opacity:.22}));cr.position.set(0,8,-8);bg.add(cr);
const gal=new T.Group();gal.visible=false;sc.add(gal);const GN=W.length,gp=new Float32Array(GN*3),gc=new Float32Array(GN*3),gz=new Float32Array(GN);
/* Mỗi từ có 1 vị trí cố định (seed) nên ngôi sao không nhảy chỗ giữa các lần mở. Cấp độ xếp theo vành: A1 trong cùng → C1 ngoài cùng, 3 nhánh xoắn ốc. */
const rg=(q=>()=>{q=q+0x6D2B79F5|0;let t=Math.imul(q^q>>>15,1|q);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296})(20240601),gs=()=>(rg()+rg()+rg()-1.5)*.8;
const lc={},ls={};W.forEach((x,i)=>{lc[x.c]=(lc[x.c]||0)+1;if(ls[x.c]==null)ls[x.c]=i});
W.forEach((x,i)=>{const f=(ls[x.c]+rg()*lc[x.c])/GN,r=.6+Math.pow(f,.7)*9.4,a=(rg()*3|0)*2.0944+r*.62+gs()*(.3+.05*r);
 gp[i*3]=Math.cos(a)*r;gp[i*3+1]=gs()*.5*(1.25-r/12);gp[i*3+2]=Math.sin(a)*r});
const gg=new T.BufferGeometry();gg.setAttribute('position',new T.BufferAttribute(gp,3));gg.setAttribute('aCol',new T.BufferAttribute(gc,3));gg.setAttribute('aSize',new T.BufferAttribute(gz,1));
/* Điểm sáng tròn, mờ dần ra rìa (thay cho ô vuông của PointsMaterial); kích thước riêng cho từng sao */
const gm=new T.ShaderMaterial({uniforms:{k:{value:600}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
 vertexShader:'attribute vec3 aCol;attribute float aSize;varying vec3 vc;uniform float k;void main(){vc=aCol;vec4 m=modelViewMatrix*vec4(position,1.);gl_PointSize=max(aSize*k/-m.z,1.5);gl_Position=projectionMatrix*m;}',
 fragmentShader:'varying vec3 vc;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vc,pow(1.-d,1.6));\n#include <colorspace_fragment>\n}'});
gal.add(new T.Points(gg,gm));gal.rotation.x=.5;rs();addEventListener('resize',()=>{rs();if(gal.visible)cam.position.z=zf});
const WH=new T.Color(0xffffff);
/* chưa học: chấm mờ nhỏ · đang học: sáng, to hơn · thuộc lòng: rất sáng, hơi ngả trắng */
function paintGal(){const c=new T.Color();W.forEach((x,i)=>{const d=S.cards[i],m=d&&d.iv>=21;c.setHex(LC[x.c]);if(m)c.lerp(WH,.45);c.multiplyScalar(!d?.28:m?1.5:.95);gc.set([c.r,c.g,c.b],i*3);gz[i]=!d?.14:m?.62:.4});gg.attributes.aCol.needsUpdate=true;gg.attributes.aSize.needsUpdate=true}
let pulse=0,px=0,py=0;const burst=ok=>{pm.color.set(ok?0x3ddc97:0xff6b81);pulse=1};
addEventListener('pointermove',e=>{px=e.clientX/innerWidth-.5;py=e.clientY/innerHeight-.5});
const ptrs=new Map();let pd=0;const cv=$('#gl');
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);pd=0});
const up=e=>{ptrs.delete(e.pointerId);pd=0};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p||!gal.visible)return;
 if(ptrs.size==1){gal.rotation.y+=(e.clientX-p[0])*.008;gal.rotation.x=Math.max(-1.4,Math.min(1.4,gal.rotation.x+(e.clientY-p[1])*.006))}
 ptrs.set(e.pointerId,[e.clientX,e.clientY]);if(ptrs.size==2){const[a,b]=[...ptrs.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pd&&d)cam.position.z=Math.max(5,Math.min(zf*1.3,cam.position.z*pd/d));pd=d}});
(function loop(){requestAnimationFrame(loop);pulse*=.94;pm.color.lerp(base,.03);const t=performance.now()/1000;
 if(bg.visible){bg.rotation.y+=(px*.6-bg.rotation.y)*.03+.0008;bg.rotation.x+=(py*.4-bg.rotation.x)*.03;bg.scale.setScalar(1+pulse*.25);cr.rotation.x=t*(.3+S.streak*.03);cr.rotation.y=t*.4}
 if(gal.visible&&!ptrs.size)gal.rotation.y+=.0016;const on=S.fx||tab=='galaxy';cv.style.visibility=on?'visible':'hidden';if(on)R.render(sc,cam)})();
/* ---------- Views ---------- */
const go=t=>{vfsOff();if(G)G.over=1;clearInterval(G?.tm);if(t=='learn'&&tab!='learn')Q=null;if(t=='nghe')musOff();else if(tab=='nghe'&&S.music)musOn();tab=t;document.body.classList.toggle('gal',t=='galaxy');bg.visible=t!='galaxy';gal.visible=t=='galaxy';cam.position.z=t=='galaxy'?zf:14;
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v==t));$('#main').scrollTop=0;if(t=='galaxy')paintGal();V[t]()};
V.home=()=>{const ids=Object.keys(S.cards),mast=ids.filter(i=>S.cards[i].iv>=21).length,due=ids.filter(i=>S.cards[i].due<=Date.now()).length,nl=Math.max(0,S.nd-S.nn);
 const bars=L.map(l=>{const tot=W.filter(x=>x.c==l).length,k=ids.filter(i=>W[i].c==l).length;return`<div class="pr"><span>${l}</span><div class="bar"><i style="width:${k/tot*100}%;background:#${LC[l].toString(16).padStart(6,0)}"></i></div><span>${k}/${tot}</span></div>`}).join('');
 h(`<h2>Xin chào${S.name?', '+esc(S.name):''} 👋</h2><div class="row"><div class="card st"><b>🔥 ${S.streak}</b><span class="m">ngày liền</span></div><div class="card st"><b>Lv ${lvl()}</b><span class="m">${S.xp} XP</span></div><div class="card st"><b>${S.nn}/${S.nd}</b><span class="m">từ mới</span></div></div>
 <div class="card"><b>Hôm nay</b> <span class="m">· ${due} từ cần ôn · ${nl} từ mới</span><div class="row"><button class="btn" data-a="go" data-v="learn">Bắt đầu học</button><button class="btn s" data-a="go" data-v="play">Chơi 🎮</button></div></div>
 <div class="card"><b>Tiến độ Oxford 5000</b><div class="m">${ids.length} đã học · ${mast} thuộc lòng</div><div style="display:grid;gap:7px;margin-top:10px">${bars}</div></div>
 <div class="card"><input id="q" placeholder="🔎 Tra từ (tiếng Anh hoặc Việt)…"><div id="sr"></div></div>`);
 $('#q').oninput=e=>{const q=e.target.value.trim().toLowerCase();$('#sr').innerHTML=q.length<2?'':W.map((x,i)=>[x,i]).filter(([x])=>x.w.toLowerCase().startsWith(q)||x.v.toLowerCase().includes(q)).slice(0,20).map(([x,i])=>`<div class="lr hit" data-a="say" data-v="${i}"><span><b>${esc(x.w)}</b> <span class="m">${esc(x.ph)} · ${x.c}</span><br><span class="m">${esc(sh(x.v))}</span></span><span>🔊</span></div>`).join('')}};
const LS={};let EX=null,QD='';
const norm=t=>t.toLowerCase().replace(/[^a-z0-9 ]/g,'').trim();
function lev(a,b){const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]}
const matchW=(a,w)=>{a=norm(a);const t=norm(w);return a===t||(t.length>=6&&lev(a,t)<=1)};
const sn=x=>x.sd?x.sd.map(([p,m])=>`<div><b>${esc(p)}</b> · ${esc(m)}</div>`).join(''):`<div style="font-size:21px;font-weight:600">${esc(x.v)}</div>`;
const info=i=>{const x=W[i];return `<div class="card" style="text-align:left"><div><b style="font-size:24px">${esc(x.w)}</b> <span class="m">${esc(x.ph)}</span> <button class="sp" data-a="say" data-v="${i}" aria-label="Nghe phát âm">🔊</button></div><div class="m">${x.c} · ${esc(x.p)}</div><div style="margin:8px 0">${sn(x)}</div><div>${hl(x.e,x.w)}</div><div class="m" style="margin-top:4px">${esc(x.t)}</div></div>`};
const lhead=()=>`<div class="lh"><span class="m">${qi+1}/${Q.length} · ${S.cards[Q[qi]]?'Ôn tập':'Từ mới'}</span></div><div class="bar" style="margin:2px 0 10px"><i style="width:${qi/Q.length*100}%"></i></div>`;
function opts(i){const x=W[i],o=[i];let g=0;while(o.length<4&&g++<400){const j=Math.random()*W.length|0,y=W[j];if(o.includes(j)||y.m===x.m)continue;if(g<250&&(y.c!==x.c||y.pm!==x.pm))continue;o.push(j)}while(o.length<4){const j=Math.random()*W.length|0;if(!o.includes(j))o.push(j)}return o.sort(()=>Math.random()-.5)}
V.learn=()=>{if(!Q||(qi>=Q.length&&QD!==day())){Q=buildQ();qi=0;QD=day();for(const k in LS)delete LS[k]}fl=false;EX=null;
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
const modes={mc:['🔤','Trắc nghiệm','Anh → Việt'],mc2:['🇻🇳','Đoán từ','Việt → Anh'],listen:['🎧','Nghe & chọn','Luyện nghe'],cloze:['✍️','Điền chỗ trống','Từ trong câu'],type:['⌨️','Gõ từ','Nhớ chính tả'],speed:['⚡','Tốc độ 60s','Kỷ lục: '+S.best]};
V.play=()=>h(`<h2>Chơi & luyện tập</h2><div class="grid">${Object.entries(modes).map(([k,[e,n,s]])=>`<button class="gm" data-a="play" data-v="${k}"><b>${e}</b>${n}<br><span>${s}</span></button>`).join('')}</div><p class="m ct">Mỗi câu đúng +2 XP (combo từ 5: +3). Đúng không đổi lịch ôn; trả lời sai thì từ đó được ôn sớm hơn.</p>`);
function startGame(m){let pool=Object.keys(S.cards).map(Number);if(pool.length<12){pool=[];W.forEach((x,i)=>{if(S.lv.includes(x.c)&&pool.length<80)pool.push(i)})}
 G={m,pool,n:0,ok:0,xp:0,combo:0,max:m=='speed'?999:10,end:Date.now()+6e4};if(m=='speed')G.tm=setInterval(()=>{const s=Math.max(0,Math.ceil((G.end-Date.now())/1e3)),e=$('#tm');if(s!=G.ls){G.ls=s;if(s>0&&s<=5)sfx('tick')}if(e)e.textContent='⏱ '+s;if(!s)fin()},250);nextQ()}
function mkQ(m,pool){const i=rnd(pool),x=W[i],dis=f=>{const o=[f(x)];let g=0;while(o.length<4&&g++<300){const y=rnd(W),z=f(y);if((y.c==x.c||g>150)&&!o.includes(z))o.push(z)}return o.sort(()=>Math.random()-.5)};
 if(m=='cloze'&&!(/^[a-z]+$/i.test(x.w)&&new RegExp('\\b'+x.w+'\\w*','i').test(x.e)))m='mc';
 if(m=='type'&&!/^[a-z' -]+$/i.test(x.w))m='mc2';
 const q={i,m,a:x.w};
 if(m=='mc'){q.p=`<div class="w">${esc(x.w)}</div><div class="m">${esc(x.ph)}</div>`;q.o=dis(y=>sh(y.v));q.a=sh(x.v);q.s=x.w}
 else if(m=='mc2'){q.p=`<div style="font-size:24px;font-weight:600">${esc(sh(x.v))}</div><div class="m">${esc(x.p)}</div>`;q.o=dis(y=>y.w)}
 else if(m=='listen'){q.p=`<button class="sp" style="width:90px;height:90px;font-size:38px" data-a="spq">🔊</button><div class="m">Chạm để nghe lại</div>`;q.o=dis(y=>y.w);q.s=x.w}
 else if(m=='cloze'){q.p=`<div style="font-size:20px">${esc(x.e).replace(new RegExp('\\b'+x.w+'\\w*','i'),'<mark>_____</mark>')}</div><div class="m" style="margin-top:6px">${esc(x.t)}</div>`;q.o=dis(y=>y.w)}
 else{q.p=`<div style="font-size:24px;font-weight:600">${esc(sh(x.v))}</div><div class="m">${esc(x.p)} · gợi ý: ${esc(x.w[0])}${x.w.slice(1).replace(/[a-z]/gi,' _')}</div>`}
 return q}
function nextQ(){if(G.n>=G.max)return fin();const q=G.q=mkQ(G.m=='speed'?'mc':G.m,G.pool);G.done=false;
 h(`<div class="fill"><div class="gh m"><button class="x" data-a="go" data-v="play" aria-label="Thoát">✕</button><span>${G.m=='speed'?'<span id="tm">⏱ '+Math.max(0,Math.ceil((G.end-Date.now())/1e3))+'</span>':G.n+1+'/'+G.max}</span><span>✅ ${G.ok}</span><span>🔥 ${G.combo}</span></div>
 <div class="card ct q">${q.p}</div>
 ${q.o?q.o.map((o,k)=>`<button class="op" data-a="pick" data-v="${k}">${esc(o)}</button>`).join(''):`<input id="ti" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Gõ từ tiếng Anh…"><button class="btn" data-a="chk">Kiểm tra</button>`}</div>`);
 if(q.m=='listen')speak(q.s);if($('#ti')){$('#ti').focus();$('#ti').onkeydown=e=>{if(e.key=='Enter')A.chk()}}}
function answer(ok,given){if(G.done||G.over)return;G.done=true;const q=G.q;G.n++;burst(ok);
 if(ok){G.ok++;G.combo++;G.xp+=2+(G.combo>=5?1:0)}else G.combo=0;sfx(ok?'ok':'no',G.combo);
 {const cd=S.cards[q.i];if(cd&&!ok&&cd.due>Date.now())cd.due=Date.now()}if(q.s&&q.m!='listen')speak(W[q.i].w);
 document.querySelectorAll('.op').forEach((b,k)=>{if(q.o[k]==q.a)b.classList.add('ok');else if(k==given)b.classList.add('no')});
 if(q.m=='type'){const t=$('#ti');t.style.borderColor=ok?'#3ddc97':'#ff6b81';if(!ok)t.value=W[q.i].w}
 setTimeout(()=>G&&!G.over&&tab=='play'&&nextQ(),G.m=='speed'?(ok?250:800):(ok?650:1500))}
function fin(){if(G.over)return;G.over=1;clearInterval(G.tm);const bonus=G.ok>=G.max*.8||G.m=='speed'&&G.ok>=10?20:0;G.xp+=bonus;const l0=lvl();addXP(G.xp);if(G.m=='speed'&&G.ok>S.best)S.best=G.ok;save();const m=G.m,n=G.n||1;sfx(lvl()>l0?'lvl':G.ok/n>=.5?'win':'lose');
 h(`<div class="card ct"><div style="font-size:56px">${G.ok/n>=.8?'🏆':'💪'}</div><h2>${G.ok}/${G.n} đúng</h2><p class="m">+${G.xp} XP${bonus?' (gồm thưởng '+bonus+')':''} · Lv ${lvl()}</p><button class="btn" data-a="play" data-v="${m}">Chơi lại</button><button class="btn s" data-a="go" data-v="play">Chọn chế độ khác</button></div>`)}
V.galaxy=()=>{const ids=Object.keys(S.cards),mast=ids.filter(i=>S.cards[i].iv>=21).length;h(`<div class="card" style="pointer-events:none"><b>🌌 Thiên hà từ vựng</b> <span class="m">· ${ids.length}/${W.length} từ · ${mast} thuộc lòng</span><div style="margin-top:4px;font-size:13px">${L.map(l=>`<span style="color:#${LC[l].toString(16).padStart(6,0)}">● ${l} </span>`).join('')}</div><div class="m" style="margin-top:2px">Vuốt để xoay · chụm hai ngón để thu phóng</div></div>`)};
const sw=(on,a)=>`<button class="sw ${on?'on':''}" role="switch" aria-checked="${!!on}" data-a="${a}"><i></i></button>`;
/* Dòng bảng xếp hạng: tên cắt "…" khi quá dài, Lv + XP luôn nguyên vẹn; <bdi> cô lập chiều chữ để tên chứa ký tự RTL không làm đảo chữ bên cạnh */
const fmtN=n=>Math.floor(+n||0).toLocaleString('vi-VN');
const lbRow=(u,k)=>`<div class="lr hit lb${u.id==uid?' me':''}"><span class="rk">${k+1}.</span><bdi class="nn">${esc(u.n)}</bdi>${u.id==uid?'<span class="you">(bạn)</span>':''}<span class="m lvb">Lv ${Math.floor(+u.lv||1)}</span><b class="xpv">${fmtN(u.xp)} XP</b></div>`;
V.me=()=>{const tabs=[['set','Học'],['snd','Âm thanh'],['acc','Tài khoản'],['lb','Xếp hạng']];let b='';
 if(mt=='set')b=`<div class="card"><div style="border-bottom:1px solid var(--b)"><div class="lr" style="border-bottom:0"><span>Tên hiển thị</span><input id="nm" value="${esc(S.name)}" maxlength="16" placeholder="Ẩn danh" style="width:55%${nameLock()?';opacity:.45':''}"${nameLock()?' disabled':''}></div><div id="nh" class="m" hidden style="text-align:right;padding-bottom:8px"></div></div>
 <div style="padding:10px 0;border-bottom:1px solid var(--b)"><div style="margin-bottom:6px">Cấp độ muốn học</div><div class="lv">${L.map(l=>`<button class="chip ${S.lv.includes(l)?'on':''}" data-a="lv" data-v="${l}">${l}</button>`).join('')}</div></div>
 <div class="lr"><span>Từ mới mỗi ngày</span><span><button class="chip" data-a="nd" data-v="-5">−</button><b>${S.nd}</b><button class="chip" data-a="nd" data-v="5">+</button></span></div>
 <div class="lr"><span>Giọng đọc</span><button class="chip on" data-a="acc">${S.acc=='en-GB'?'🇬🇧 Anh':'🇺🇸 Mỹ'}</button></div>
 <div class="lr"><span>Tự động đọc khi học</span>${sw(S.auto,'auto')}</div></div>`;
 else if(mt=='snd')b=`<div class="card"><div class="lr"><span>🎵 Nhạc nền</span>${sw(S.music,'music')}</div>
 <div class="lr"><span>Âm lượng nhạc</span><input id="mv" type="range" min="0" max="100" value="${Math.round(S.mv*100)}" style="width:55%" aria-label="Âm lượng nhạc nền"></div>
 <div class="lr"><span>Âm thanh hiệu ứng</span>${sw(S.sfx!==false,'snd')}</div>
 <div class="lr"><span>Hiệu ứng 3D <span class="m">(tốn pin)</span></span>${sw(S.fx,'fx')}</div></div>`;
 else if(mt=='acc')b=`${acct()}<div class="card"><b>Dữ liệu trên máy</b><div class="row"><button class="btn s" data-a="bak">Sao lưu (.json)</button><button class="btn s" data-a="rest">Khôi phục</button></div></div>`;
 else b=`<div class="card"><b>🏆 Bảng xếp hạng</b><div id="lb" class="m" style="margin-top:6px">Đang tải…</div></div>${usr?'':'<p class="m ct">Bạn chưa đăng nhập nên chưa có tên trên bảng. Vào tab Tài khoản để đăng nhập hoặc chơi với tài khoản khách.</p>'}`;
 h(`<div class="seg">${tabs.map(([k,n])=>`<button class="${mt==k?'on':''}" data-a="mt" data-v="${k}">${n}</button>`).join('')}</div>${b}`);
 if($('#nm')){$('#nm').onchange=e=>rename(e.target.value);$('#nm').oninput=hint}
 if($('#mv')){$('#mv').oninput=e=>{S.mv=e.target.value/100;if(MB)MB.gain.setTargetAtTime(S.music?S.mv*.5:0,AC.currentTime,.05)};$('#mv').onchange=()=>save()}
 if(mt=='lb'){if(db)get(query(ref(db,'leaderboard'),orderByChild('xp'),limitToLast(10))).then(s=>{const a=[];s.forEach(c=>{a.push({...c.val(),id:c.key})});a.reverse();$('#lb')&&($('#lb').innerHTML=a.map(lbRow).join('')||'Chưa có dữ liệu')}).catch(()=>{$('#lb')&&($('#lb').textContent='Không tải được (kiểm tra Rules của Realtime Database)')});else $('#lb').textContent='Cần kết nối Firebase'}};
/* ---------- Thanh trên: nhạc nền + cài về máy ---------- */
const std=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true,ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform=='MacIntel'&&navigator.maxTouchPoints>1);
function topUI(){const m=$('#mus'),i=$('#ins');if(m){m.textContent=S.music?'🎵':'🔇';m.classList.toggle('off',!S.music);m.setAttribute('aria-pressed',!!S.music)}if(i)i.hidden=std()}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();dip=e;topUI()});
addEventListener('appinstalled',()=>{dip=null;topUI();toast('Đã cài về máy ✔')});
function closeSheet(){const e=$('#sheet');if(e)e.remove()}
function modal(html){closeSheet();const d=document.createElement('div');d.id='sheet';d.innerHTML='<div>'+html+'</div>';d.addEventListener('click',e=>{if(e.target===d)closeSheet()});document.body.appendChild(d)}
let tt;function toast(m,ms){let e=$('#toast');if(!e){e=document.createElement('div');e.id='toast';document.body.appendChild(e)}e.textContent=m;e.hidden=false;clearTimeout(tt);tt=setTimeout(()=>e.hidden=true,ms||2500)}
/* ---------- Tab Nghe: playlist YouTube (khung phát) + nội dung từng video (listen/t/NN.txt, NN = thứ tự video trong playlist) ---------- */
/* 2 mục: q = Luyện nghe 5 phút (playlist 45 video, phụ đề listen/q/NN.txt) · d = Luyện nghe sâu (playlist 47 video, phụ đề listen/t/NN.txt).
   ids = ID video theo từng file phụ đề (null = video chưa có phụ đề); dùng để đối chiếu nếu thứ tự playlist khác thứ tự file. */
const NM={q:{pl:'PLnGTZv-nqOPqy42APYZywQIch__nFugFx',dir:'listen/q/',n:45,ik:'vvlq',ak:'vvaq',ids:['OlulrDOixEg','ga4JN44D1O8','TURHcAxt_JA','44TBU1Acq0s','hGbq9FAVE6g','NKXx_LHh4lY','JA3z5qc4E5U','ikwYSBoe_WI','L__-PbKjXwk','8bI8UjpT2zo','2F20CI8T6Lg','EEg4BfSf-H0','-KBP-Zliex0','4PtFfU3c7d0','jNDKNmKYc0Q','TpbQEYoks2U','leos8HySE7s',null,'II_n1hPUg3Y','uSNKxxeH1uM',null,'GBudukMsOyA','ZTQcb63xXGI',null,'1JenV_j7MU0','qWb7d_0TUTs','lMCkx__ppeQ','z2pypp5Pl80','2hPM_GEgP2o','w1Llgzg7KoM','oFxEmt0Y0Fk','WLqgLMISrUo','yrCrznjmjP8','Qa-pGWGRmNc','-0T7dONEBng','IS3Y9ZxJVLg','xCZpmB7hIEE','xLE633Q9oIU','-DJWZITYGFA','fRjHOABhNQE','asYalGkr_mQ','xErAdZ37GQo','RDjNpP3wVBk','DPGYsu6jHcs','b6nhVw3ozgY']},
 d:{pl:'PLnGTZv-nqOPqRXxnfi-wEdpLPyWXdxVwX',dir:'listen/t/',n:47,ik:'vvl',ak:'vva',ids:null}};
let NMD=localStorage.vvm=='d'?'d':'q',NP=null,NI=+localStorage[NM[NMD].ik]||0,NN=NM[NMD].n,NH=localStorage.vvlh=='1',YTL=null,NPLs=null,NCl=-1,NVP=null;/* NVP khung điều khiển video riêng (js/vplayer.js) · NMD chế độ đang nghe · NPLs danh sách ID thật của playlist · NCl số file phụ đề đang hiện */
const nM=()=>NM[NMD];
/* số file phụ đề ứng với video thứ i của playlist (đối chiếu theo ID khi biết, không thì theo thứ tự) */
const nCi=i=>{const m=nM();if(m.ids&&NPLs&&NPLs[i]){const j=m.ids.indexOf(NPLs[i]);if(j>=0)return j}return i};
let NL=[],NTm=[],NEs=[],NAn={},NCur=-1,ND=0,NF=localStorage.vvlf!='0',NCal=false,NPz=0,NTk=0;/* NL dòng nội dung · NTm giờ từng dòng · NAn mốc người dùng ghim · NF tự cuộn · NCal chế độ ghim mốc */
const ytLoad=()=>YTL||(YTL=tmo(new Promise((ok,no)=>{if(window.YT&&YT.Player)return ok();window.onYouTubeIframeAPIReady=ok;const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=no;document.head.appendChild(s)}),8000).catch(e=>{YTL=null;throw e}));
const lnHtml=l=>l.s.split(/([A-Za-z][A-Za-z'’-]*)/).map((x,i)=>i%2?`<span class="tw" data-a="lwd" data-v="${esc(x)}">${esc(x)}</span>`:esc(x)).join('');
const txFmt=L=>L.map((l,i)=>`<div class="ln${l.k=='h'?' h':''}${l.b?' bk':''}" data-i="${i}"><button class="ts" data-a="lsk" data-v="${i}" aria-label="Tua tới câu này"></button><div class="lx">${l.k=='h'?`<h3>${esc(l.s)}</h3>`:lnHtml(l)}</div></div>`).join('');
const akey=()=>nM().ak+NI;
function aLoad(){NAn={};try{const o=JSON.parse(localStorage[akey()]||'null');if(o&&o.n==NL.length)NAn=o.a||{}}catch{}}
function aSave(){try{if(Object.keys(NAn).length)localStorage[akey()]=JSON.stringify({n:NL.length,a:NAn});else localStorage.removeItem(akey())}catch{}}
function nTimes(){const r=buildTimes(NL,ND,NAn);NTm=r.times;NEs=r.est;document.querySelectorAll('#tx .ln').forEach(e=>{const i=+e.dataset.i,b=e.firstChild;b.textContent=(NEs[i]?'~':'')+fmtT(NTm[i]);b.classList.toggle('pin',NAn[i]!=null)});nSt()}
function nSt(){const e=$('#ls');if(!e)return;const k=Object.keys(NAn).length,real=NL.some(l=>l.t!=null);e.textContent=NCal?'📍 Đang ghim: nghe tới câu nào thì chạm giờ ở đầu câu đó':(real?'⏱ Có giờ chuẩn trong file':(k?'📍 '+k+' mốc đã ghim · còn lại là ước lượng (~)':'⏱ Giờ ước lượng (~). Chưa khớp? Bấm “📍 Ghim” để chỉnh.'))}
function nMark(i,scroll){const tx=$('#tx');if(!tx)return;const o=tx.querySelector('.ln.on');if(o)o.classList.remove('on');NCur=i;const e=i>=0&&tx.querySelector('.ln[data-i="'+i+'"]');if(!e)return;e.classList.add('on');if(scroll&&NF&&!NH&&Date.now()>NPz){const v=$('.vid'),m=$('#main'),nv=$('nav');if(!v||!m)return;const top=v.getBoundingClientRect().bottom,bot=nv?nv.getBoundingClientRect().top:innerHeight,want=top+(bot-top)*.3;m.scrollTo({top:m.scrollTop+e.getBoundingClientRect().top-want,behavior:'smooth'})}}
function nTick(){if(tab!='nghe'||!$('#tx')){clearInterval(NTk);NTk=0;msStop();return}msPos();if(document.hidden)return;if(!NP||!NP.getCurrentTime||!NTm.length)return;let t,d;try{t=NP.getCurrentTime();d=NP.getDuration()}catch{return}if(d>0&&Math.abs(d-ND)>1){ND=d;nTimes()}const i=findIdx(NTm,t);if(i!=NCur)nMark(i,true)}
function lsk(v){const i=+v;if(!(i>=0&&i<NL.length))return;if(NCal){let t=0;try{t=NP.getCurrentTime()}catch{return}NAn[i]=Math.max(0,t-.8);aSave();nTimes();nMark(findIdx(NTm,t),false);toast('📍 Đã ghim câu này ở '+fmtT(t));return}
 try{NP.seekTo(NTm[i],true);NP.playVideo()}catch{toast('Video chưa sẵn sàng');return}userPaused=false;NPz=0;nMark(i,true)}
function lcal(v,b){NCal=!NCal;b.classList.toggle('on',NCal);const tx=$('#tx');if(tx)tx.classList.toggle('cal',NCal);nSt()}
function lfo(v,b){NF=!NF;try{localStorage.vvlf=NF?'1':'0'}catch{}b.textContent=NF?'🔄 Tự cuộn: Bật':'⏸ Tự cuộn: Tắt';if(NF)NPz=0}
function lclr(){if(!Object.keys(NAn).length){toast('Chưa có mốc nào');return}NAn={};aSave();nTimes();toast('Đã xoá mốc ghim')}
async function txLoad(){const el=$('#tx');if(!el)return;const i=NI,c=nCi(i),n=String(c+1).padStart(2,'0');NCl=c;el.dataset.i=i;el.innerHTML='<div class="m">⏳ Đang tải nội dung…</div>';NL=[];NTm=[];NCur=-1;ND=0;NAn={};
 try{const r=await fetch(nM().dir+n+'.txt');if(!r.ok)throw 0;const t=await r.text();if(i!=NI||!$('#tx'))return;NL=parseTx(t);aLoad();el.innerHTML=txFmt(NL);try{ND=NP.getDuration()||0}catch{}nTimes();if(!NTk)NTk=setInterval(nTick,250)}
 catch{if(i==NI&&$('#tx'))$('#tx').innerHTML='<div class="m">Video này chưa có phụ đề'+(NMD=='q'?'.':' (thêm file <b>'+nM().dir+n+'.txt</b>).')+'</div>'}}
/* Tên hiển thị ngắn gọn (thay tiêu đề YouTube): video 6–9 là loại Nghe + Đọc, còn lại là Nghe. X = số thứ tự video (X/47) */
const NRD=[6,7,8,9],nTitle=i=>NMD=='q'?'Luyện Nghe 5 Phút Bài '+(i+1):(NRD.includes(i+1)?'Luyện Nghe Và Đọc Bài ':'Luyện Nghe Bài ')+(i+1);
function nUI(){const c=$('#lc'),t=$('#lt');if(c)c.textContent='Video '+(NI+1)+'/'+NN;if(t)t.textContent=nTitle(NI);msMeta()}
function nSet(i){if(!(i>=0&&i<NN)||i==NI)return;NI=i;try{localStorage[nM().ik]=i}catch{}nUI();txLoad();const m=$('#main');if(m)m.scrollTop=0}
/* Phóng to video: dùng Fullscreen API nếu trình duyệt cho phép (Android/iPad), nếu không (iPhone) thì phóng to bằng CSS, tự xoay ngang khi máy đang dọc */
const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement||null,
 IFS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
 IFX='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
const vfsOn=()=>{const v=$('.vb');return!!v&&(fsEl()===v||v.classList.contains('fs'))};
function vfsUI(){const b=$('.vfs');if(!b)return;const on=vfsOn();b.innerHTML=on?IFX:IFS;b.setAttribute('aria-label',on?'Thu nhỏ video':'Phóng to video')}
function vfsOff(){const v=$('.vb');if(fsEl()){try{(document.exitFullscreen||document.webkitExitFullscreen).call(document)}catch{}}
 document.body.classList.remove('vfs');if(v)v.classList.remove('fs');try{screen.orientation.unlock()}catch{}vfsUI()}
function vfs(){const v=$('.vb');if(!v)return;if(vfsOn())return vfsOff();
 const pseudo=()=>{v.classList.add('fs');document.body.classList.add('vfs');vfsUI()},rq=v.requestFullscreen||v.webkitRequestFullscreen;
 if(!rq)return pseudo();
 try{const p=rq.call(v);if(p&&p.then)p.then(()=>{try{screen.orientation.lock('landscape').catch(()=>{})}catch{}}).catch(pseudo)}catch{pseudo()}}
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{if(!fsEl())try{screen.orientation.unlock()}catch{}vfsUI()}));
addEventListener('keydown',e=>{if(e.key=='Escape'&&vfsOn())vfsOff()});
/* ---------- Nghe nền + thông báo điều khiển (Media Session) ----------
   Chrome chỉ gắn thông báo với media của TRANG CHÍNH, nên dùng một <audio> im lặng (tạo bằng JS) phát song song với video YouTube.
   Tiêu đề thông báo = nTitle(NI) (tiêu đề của app), không phải tiêu đề YouTube. Chỉ hoạt động trên Android (iOS dừng media PWA khi khoá màn hình). */
let userPaused=false,MSA=null,msPT=0;/* userPaused: người dùng TỰ dừng (khác với YouTube tự dừng khi ẩn trang) */
const silentWav=()=>{const sr=8000,n=sr*10,b=new Uint8Array(44+n),d=new DataView(b.buffer),w=(o,s)=>[...s].forEach((c,i)=>b[o+i]=c.charCodeAt(0));
 w(0,'RIFF');d.setUint32(4,36+n,true);w(8,'WAVEfmt ');d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,1,true);d.setUint32(24,sr,true);d.setUint32(28,sr,true);d.setUint16(32,1,true);d.setUint16(34,8,true);w(36,'data');d.setUint32(40,n,true);b.fill(128,44);
 return URL.createObjectURL(new Blob([b],{type:'audio/wav'}))};
function msMeta(){if(!('mediaSession'in navigator)||typeof MediaMetadata!='function')return;
 try{navigator.mediaSession.metadata=new MediaMetadata({title:nTitle(NI),artist:'Học Từ Vựng',album:NMD=='q'?'Nghe 5 phút':'Nghe sâu',
  artwork:[{src:'icons/icon-512.png',sizes:'512x512',type:'image/png'},{src:'icons/icon-192.png',sizes:'192x192',type:'image/png'}]})}catch{}}
function msState(s){/* s = e.data của onStateChange */
 if(!('mediaSession'in navigator))return;
 if(!MSA){MSA=new Audio(silentWav());MSA.loop=true}
 if(s==1||s==3){MSA.play().catch(()=>{});navigator.mediaSession.playbackState='playing';msMeta()}
 else if(s==0||s==2||s==5){MSA.pause();navigator.mediaSession.playbackState='paused'}}
function msPos(){/* mỗi ~1 giây: cập nhật thanh tiến trình trên thông báo */
 if(!('mediaSession'in navigator)||!NP||!NP.getCurrentTime||Date.now()-msPT<1000)return;msPT=Date.now();
 try{const d=NP.getDuration(),t=NP.getCurrentTime();if(d>0)navigator.mediaSession.setPositionState({duration:d,position:Math.min(Math.max(0,t),d),playbackRate:NVP?NVP.rate:1})}catch{}}
function msStop(){/* rời tab Nghe / dựng lại player: tắt audio im lặng và thông báo */
 userPaused=false;try{MSA&&MSA.pause()}catch{}
 if('mediaSession'in navigator){try{navigator.mediaSession.playbackState='none';navigator.mediaSession.metadata=null}catch{}}}
function msInit(){const m=navigator.mediaSession;if(!m)return;
 const on=(k,f)=>{try{m.setActionHandler(k,f)}catch{}};
 on('play',()=>{userPaused=false;try{NP&&NP.playVideo()}catch{}});
 on('pause',()=>{userPaused=true;try{NP&&NP.pauseVideo()}catch{}});
 on('previoustrack',()=>A.lpv());on('nexttrack',()=>A.lnx());
 on('seekbackward',()=>{try{NP&&NP.seekTo(Math.max(0,NP.getCurrentTime()-10),true)}catch{}});
 on('seekforward',()=>{try{NP&&NP.seekTo(NP.getCurrentTime()+10,true)}catch{}});
 on('seekto',e=>{try{NP&&NP.seekTo(e.seekTime,true)}catch{}})}
msInit();
/* Ẩn trang (khoá màn hình / sang app khác): YouTube có thể tự pause → bật lại nếu người dùng không tự dừng; hạ chất lượng cho đỡ pin */
document.addEventListener('visibilitychange',()=>{
 if(!NP||tab!='nghe')return;
 if(document.hidden){
  [300,1000,2000].forEach(ms=>setTimeout(()=>{try{if(document.hidden&&!userPaused&&NP&&NP.getPlayerState()==2)NP.playVideo()}catch{}},ms));
  try{NP.setPlaybackQuality('tiny')}catch{}
 }else{
  try{NP.setPlaybackQuality(NVP&&NVP.q!=='auto'?NVP.q:'default')}catch{}
 }});
V.nghe=()=>{vfsOff();NVP&&NVP.destroy();NVP=null;try{NP&&NP.destroy()}catch{}NP=null;NPLs=null;NCl=-1;NCal=false;msStop();
 h(`<div class="vid"><div class="vb" id="vb"><div id="yt"></div><div class="ye m" id="ye">⏳ Đang tải video…</div></div></div>
<div class="card"><div class="seg"><button data-a="lmode" data-v="q"${NMD=='q'?' class="on"':''}>⏱ Nghe 5 phút</button><button data-a="lmode" data-v="d"${NMD=='d'?' class="on"':''}>🎧 Nghe sâu</button></div><div class="lh"><button class="x" data-a="lpv" aria-label="Video trước">‹</button><div class="ct" style="flex:1;min-width:0"><b id="lc"></b><div class="m lt" id="lt"></div></div><button class="x" data-a="lnx" aria-label="Video sau">›</button></div></div>
<div class="card"><div class="lh"><b>📖 Nội dung</b><button class="hb" data-a="lsh">${NH?'👁 Hiện':'🙈 Ẩn'}</button></div>
<div class="lbar"><button class="hb" data-a="lfo">${NF?'🔄 Tự cuộn: Bật':'⏸ Tự cuộn: Tắt'}</button><button class="hb${NCal?' on':''}" data-a="lcal">📍 Ghim</button><button class="hb" data-a="lclr">↺ Xoá mốc</button></div><div class="m ls" id="ls"></div>
<div id="tx" class="tx${NCal?' cal':''}"${NH?' hidden':''}></div></div>`);
 NVP=new VPlayer($('#vb'),{toast,onUser:p=>{userPaused=p}});vfsUI();nUI();txLoad();
 ytLoad().then(()=>{if(tab!='nghe'||!$('#yt'))return;
  NP=new YT.Player('yt',{host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',playerVars:{listType:'playlist',list:nM().pl,index:NI,playsinline:1,rel:0,modestbranding:1,fs:0,controls:0,disablekb:1,iv_load_policy:3,...VPlayer.vars(),...(location.protocol.startsWith('http')?{origin:location.origin}:{})},
   events:{onReady:e=>{NVP&&NVP.attach(e.target);const n=e.target.getPlaylist&&e.target.getPlaylist();if(n&&n.length){NN=n.length;NPLs=n;if(nCi(NI)!=NCl)txLoad()}const y=$('#ye');if(y)y.hidden=true;nUI()},
    onStateChange:e=>{NVP&&NVP.state(e.data);msState(e.data);try{const i=NP.getPlaylistIndex();if(i>=0&&i!=NI)nSet(i);else nUI()}catch{}},onError:e=>NVP&&NVP.error(e.data),onApiChange:()=>NVP&&NVP.api()}})
 }).catch(()=>{const y=$('#ye');if(y)y.textContent='📡 Cần có mạng để xem video. Nội dung bên dưới vẫn đọc được.'})};
['touchstart','wheel'].forEach(ev=>$('#main').addEventListener(ev,()=>{NPz=Date.now()+6000},{passive:true}));/* người dùng tự cuộn thì tạm ngưng tự cuộn 6 giây */
/* ---------- Actions ---------- */
function lmode(v){if(v!='q'&&v!='d'||v==NMD)return;NMD=v;try{localStorage.vvm=v}catch{}NI=+localStorage[nM().ik]||0;NN=nM().n;if(NI>=NN)NI=0;V.nghe();const m=$('#main');if(m)m.scrollTop=0}
const A={go,vfs,lmode,lpv(){userPaused=false;nSet(NI-1);try{NP.previousVideo()}catch{}},lnx(){userPaused=false;nSet(NI+1);try{NP.nextVideo()}catch{}},lwd:w=>speak(w),lsk,lcal,lfo,lclr,lsh(v,t){NH=!NH;try{localStorage.vvlh=NH?'1':'0'}catch{}$('#tx').hidden=NH;t.textContent=NH?'👁 Hiện':'🙈 Ẩn'},ls(){LS[Q[qi]].seen=1;V.learn()},ln(){qi++;V.learn()},lp(v){lfin(+v===EX.i)},lc(){lfin(matchW($('#ti').value,W[EX.i].w))},li(){lfin(false)},say:i=>speak(W[i].w),spq:()=>speak(G.q.s),
 mt(v){mt=v;V.me()},closeSheet,
 music(){S.music=!S.music;save();S.music&&tab!='nghe'?musOn():musOff();topUI();if(tab=='me')V.me()},
 async install(){if(dip){const p=dip;dip=null;p.prompt();try{await p.userChoice}catch{}topUI();return}
  modal(`<h3>Cài về máy</h3>${ios?'<ol><li>Mở trang này bằng <b>Safari</b></li><li>Bấm nút <b>Chia sẻ</b> (hình vuông có mũi tên hướng lên) ở thanh dưới</li><li>Chọn <b>Thêm vào MH chính</b></li></ol>':'<ol><li>Bấm menu <b>⋮</b> của trình duyệt (Chrome / Edge)</li><li>Chọn <b>Cài đặt ứng dụng</b> hoặc <b>Thêm vào màn hình chính</b></li></ol><div class="m">Nếu không thấy mục này, hãy mở trang bằng Chrome và đảm bảo địa chỉ bắt đầu bằng https://</div>'}<button class="btn" data-a="closeSheet">Đã hiểu</button>`)},
 flip(){fl=!fl;sfx('flip');$('.fc').classList.toggle('f',fl);$('#gr').classList.remove('hide')},
 gr(g){g=+g;burst(g>0);sfx(g?'good':'again',g);grade(Q[qi],g);if(g==0)Q.push(Q[qi]);addXP(g==0?1:g==3?8:5);save();qi++;V.learn()},
 play(m){startGame(m)},pick(k){answer(G.q.o[k]==G.q.a,+k)},
 chk(){const v=$('#ti').value.trim().toLowerCase();answer(v==G.q.a.toLowerCase())},
 lv(l){const s=new Set(S.lv);s.has(l)?s.delete(l):s.add(l);if(!s.size)s.add(l);S.lv=L.filter(x=>s.has(x));save();V.me()},
 nd(d){S.nd=Math.max(5,Math.min(100,S.nd+ +d));save();V.me()},acc(){S.acc=S.acc=='en-GB'?'en-US':'en-GB';save();V.me()},auto(){S.auto=!S.auto;save();V.me()},snd(){S.sfx=S.sfx===false;save();sfx('good',3);V.me()},
 known(){sfx('good',3);const i=Q[qi];S.cards[i]={n:3,ef:2.5,iv:30,lp:0,due:Date.now()+30*864e5,ts:Date.now(),S:30,D:5};S.nn++;addXP(2);save();qi++;V.learn()},
 fx(){S.fx=!S.fx;save();V.me()},
 async guest(){localStorage.vvg='1';gate();toast('⏳ Đang vào chế độ khách…');
  try{await signInAnonymously(au);toast('Đã vào bằng tài khoản khách ✔')}catch(x){console.warn(x);toast('Chưa vào được chế độ khách online ('+err(x)+'). Đang chơi ngoại tuyến, vẫn xem được bảng xếp hạng.',5000)}
  refresh()},
 am(v){AF.m=v=='up'?'up':'in';AF.fe={};AF.msg=null;authRender()},
 eye(){AF.show=!AF.show;document.querySelectorAll('[data-af] .pw input').forEach(i=>i.type=AF.show?'text':'password');document.querySelectorAll('[data-af] .eye').forEach(b=>{b.textContent=AF.show?'Ẩn':'Hiện';b.setAttribute('aria-pressed',AF.show)})},
 async google(){if(AF.busy)return;setMsg(null);aBusy(true);const p=new GoogleAuthProvider();
  try{if(usr&&usr.isAnonymous){try{await linkWithPopup(usr,p);linked()}catch(x){if(x.code!='auth/credential-already-in-use')throw x;const c=GoogleAuthProvider.credentialFromError(x);await swap(()=>signInWithCredential(au,c))}}else await signInWithPopup(au,p)}catch(x){aFail(x)}
  aBusy(false)},
 async login(v,t){if(AF.busy)return;const d=aRd(aFormOf(t)),fe=aVal(d,0);AF.fe=fe;AF.msg=null;
  if(Object.keys(fe).length)return authRender(Object.keys(fe)[0]);
  aBusy(true);try{await swap(()=>signInWithEmailAndPassword(au,d.e,d.p));AF.p=AF.p2='';toast('Đăng nhập thành công ✔')}catch(x){aFail(x)}aBusy(false)},
 async signup(v,t){if(AF.busy)return;const d=aRd(aFormOf(t)),fe=aVal(d,1);AF.fe=fe;AF.msg=null;
  if(Object.keys(fe).length)return authRender(Object.keys(fe)[0]);
  aBusy(true);try{if(usr&&usr.isAnonymous){await linkWithCredential(usr,EmailAuthProvider.credential(d.e,d.p));linked()}else{await createUserWithEmailAndPassword(au,d.e,d.p);toast('Đăng ký thành công 🎉 Chào mừng bạn!',3500)}AF.p=AF.p2=''}catch(x){aFail(x)}aBusy(false)},
 async reset(v,t){if(AF.busy)return;const d=aRd(aFormOf(t));AF.fe={};AF.msg=null;
  if(!MAILRE.test(d.e)){AF.fe.e=d.e?'Email chưa đúng định dạng (ví dụ: ten@gmail.com)':'Nhập email để nhận liên kết đặt lại mật khẩu';return authRender('e')}
  aBusy(true);try{await sendPasswordResetEmail(au,d.e);AF.msg={t:'ok',h:'Đã gửi hướng dẫn đặt lại mật khẩu tới '+d.e+' (nếu email này đã đăng ký). Nhớ kiểm tra cả mục Thư rác.'}}catch(x){aFail(x)}aBusy(false)},
 logout(){const an=usr&&usr.isAnonymous;modal(`<h3>${an?'Thoát chế độ khách?':'Đăng xuất?'}</h3><p class="m" style="margin:0 0 12px">${an?'Tiến độ của tài khoản khách sẽ <b>mất</b> và không khôi phục được nếu bạn chưa liên kết Google/email.':'Dữ liệu trên máy sẽ được xoá (bản trên cloud vẫn giữ).'}</p><div class="row"><button class="btn s" data-a="closeSheet">Huỷ</button><button class="btn" data-a="logout2">${an?'Thoát':'Đăng xuất'}</button></div>`)},
 async logout2(){closeSheet();const an=usr&&usr.isAnonymous;
  localStorage.removeItem('vvg');localStorage.removeItem('vvao');clearTimeout(tm);
  try{if(an){await wipe();await deleteUser(usr)}else await push()}catch{}
  AF.m='in';AF.p=AF.p2='';AF.fe={};AF.msg=null;
  try{await signOut(au)}catch{}S=def();localStorage.vv=JSON.stringify(S);go('me')},
 bak(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S)],{type:'application/json'}));a.download='hoc-tu-vung-backup.json';a.click()},
 rest(){const i=document.createElement('input');i.type='file';i.accept='.json';i.onchange=async()=>{try{const d=JSON.parse(await i.files[0].text());if(typeof d.xp!='number')throw 0;S=merge(S,d);save();go('me')}catch{alert('File không hợp lệ')}};i.click()}};
document.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(t){e.stopPropagation();A[t.dataset.a](t.dataset.v,t)}});
document.addEventListener('submit',e=>{const f=e.target.closest&&e.target.closest('form[data-f]');if(!f)return;e.preventDefault();A[f.dataset.f=='up'?'signup':'login'](null,f)});
addEventListener('input',e=>{const t=e.target;if(!t.name||!t.closest||!t.closest('[data-af]'))return;AF[t.name]=t.value;
 if(AF.fe[t.name]){delete AF.fe[t.name];t.removeAttribute('aria-invalid');const x=t.closest('label').querySelector('.fe');if(x)x.remove()}});
addEventListener('focusout',e=>{const t=e.target;if(t.name=='e'&&AF.m=='up'&&t.closest&&t.closest('[data-af]'))aMail(t.value.trim())});
const isIn=e=>e&&e.matches&&e.matches('input:not([type=range])');
addEventListener('focusin',e=>{if(isIn(e.target))document.body.classList.add('kb')});
addEventListener('focusout',()=>setTimeout(()=>{if(!isIn(document.activeElement))document.body.classList.remove('kb')},60));
topUI();go('home');if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
