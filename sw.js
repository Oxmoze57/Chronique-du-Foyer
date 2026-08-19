const CACHE='chroniques-foyer-v6-3-shonen';
const ASSETS=['./','./index.html','./style.css','./app.js','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest','./household-library.js','./household-task-library.v1.json','./assets/hero-guardian.webp','./assets/ritual-moon.webp','./assets/campaign-forge.webp','./assets/progression-banner.webp'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res}).catch(()=>caches.match('./index.html'))))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>list[0]?list[0].focus():clients.openWindow('./')))});

