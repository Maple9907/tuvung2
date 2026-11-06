const V='vv-v25',SHELL=['./','index.html','css/style.css','js/app.js','js/sync.js','js/vplayer.js','js/words.js','js/vendor/fsrs.mjs','js/firebase-config.js','manifest.webmanifest','icons/icon-192.png','icons/apple-touch-icon.png','icons/favicon-32.png'],CDN=['cdn.jsdelivr.net','www.gstatic.com'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=V).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!='GET')return;const cdn=CDN.includes(u.hostname);if(u.origin!=location.origin&&!cdn)return;
 const fixed=cdn||u.pathname.endsWith('words.js');
 e.respondWith(caches.open(V).then(async c=>{const hit=await c.match(r);if(hit&&fixed)return hit;
  const net=fetch(r,{cache:'no-cache'}).then(res=>{if(res.ok)c.put(r,res.clone());return res});return net.catch(()=>hit)}))});
