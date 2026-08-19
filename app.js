const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const STORAGE_KEY='chroniques-du-foyer-v6';
const oldKeys=['chroniques-du-foyer-v5','chroniques-du-foyer-v4','chroniques-du-foyer-v3','chroniques-du-foyer-v2'];
const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`;
const dateKey=(offset=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10)};
const weekKey=()=>{const d=new Date(),start=new Date(d.getFullYear(),0,1),days=Math.floor((d-start)/86400000);return `${d.getFullYear()}-W${Math.ceil((days+start.getDay()+1)/7)}`};
const pathIcons={Entretien:'🧹',Cuisine:'🍲',Rangement:'📦',Soutien:'❤️',Artisanat:'🔨',Administratif:'📜'};
const pathVirtues={Entretien:'Foyer',Cuisine:'Soutien',Rangement:'Discipline',Soutien:'Soutien',Artisanat:'Artisanat',Administratif:'Discipline'};
const ranks=[
  {name:'Novice',min:0},{name:'Aspirant',min:500},{name:'Gardien',min:1200},{name:'Protecteur',min:2500},{name:'Héros du Foyer',min:4500},{name:'Demi-Dieu',min:7500},{name:'Légende',min:12000}
];
const HOME_FLAGS=['room:adult-bedroom','room:child-bedroom','room:toilet','room:bathroom','room:terrace','room:living-room','room:kitchen','room:cellar'];
const householdHistory=()=>Object.fromEntries(state.tasks.filter(t=>t.libraryTaskId&&t.completedAt).map(t=>[t.libraryTaskId,{lastCompletedAt:t.completedAt}]));
function activeLibraryIds(){return new Set(state.tasks.filter(t=>t.libraryTaskId&&(t.type==='routine'||!t.completedAt)).map(t=>t.libraryTaskId))}
function taskFromLibrary(suggested,day='today',priority='important'){
  return {id:uid(),title:suggested.title,path:suggested.category,duration:Number(suggested.durationMinutes)||10,priority,type:'mission',day,createdFor:day==='tomorrow'?dateKey(1):dateKey(),why:suggested.why||'Mission ménagère suggérée par la bibliothèque.',notes:(suggested.instructions||[]).join(' '),room:suggested.subcategory||'',doneDates:[],libraryTaskId:suggested.id};
}
async function addHouseholdIdeasToOath(){
  const btn=$('#suggestOathHousehold'),status=$('#oathSuggestionStatus');
  const forDate=$('#oathPicker').dataset.forDate||dateKey();
  const day=forDate>dateKey()?'tomorrow':'today';
  const selected=$$('#oathPicker input:checked').map(x=>x.value);
  const slots=selected.length<3?3-selected.length:3;
  const history=householdHistory();
  const existing=activeLibraryIds();
  const added=[];
  if(btn){btn.disabled=true;btn.classList.add('loading')}
  if(status)status.textContent='Le Gardien consulte les besoins du Royaume…';
  try{
    const lib=await HouseholdLibrary.load();
    const context={today:forDate,maxRisk:1,durationMax:25,difficultyMax:2,flags:HOME_FLAGS};
    const candidates=lib.tasks.filter(t=>HouseholdLibrary.eligible(t,context,history)&&!existing.has(t.id))
      .map(t=>({task:t,score:HouseholdLibrary.score(t,context,history)+Math.random()*4}))
      .sort((a,b)=>b.score-a.score);
    const usedRooms=new Set();
    for(const {task} of candidates){
      if(added.length>=slots)break;
      const room=task.subcategory||'';
      if(room&&usedRooms.has(room)&&candidates.length>6)continue;
      const created=taskFromLibrary(task,day,'important');
      state.tasks.push(created);existing.add(task.id);if(room)usedRooms.add(room);added.push(created);
    }
    if(!added.length){if(status)status.textContent='Aucune nouvelle idée sûre n’est nécessaire pour ce Serment.';return}
    save();
    openOathPicker(day==='tomorrow');
    const wanted=new Set([...selected,...added.map(t=>t.id)]);
    $$('#oathPicker input[type="checkbox"]').forEach(x=>x.checked=wanted.has(x.value));
    if(status)status.textContent=`${added.length} idée${added.length>1?'s':''} ménagère${added.length>1?'s':''} ajoutée${added.length>1?'s':''} sans remplacer tes choix.`;
  }catch(err){console.error(err);if(status)status.textContent='La bibliothèque ménagère est indisponible. Tes missions existantes restent utilisables.'}
  finally{if(btn){btn.disabled=false;btn.classList.remove('loading')}}
}

const victoryRanks=[['D',0],['C',18],['B',28],['A',42],['S',58],['SS',82],['SSS',115]];
function victoryRankFor(xp,task){let score=Number(xp)||0;if(task?.priority==='must')score+=12;if(task?.duration>=30)score+=8;if(task?.path==='Soutien')score+=5;let rank='D';for(const [r,min] of victoryRanks)if(score>=min)rank=r;return rank}
function rewardForStreak(streak){if(streak>=60)return{icon:'🔥',name:'Cœur de Légende'};if(streak>=30)return{icon:'🏵️',name:'Sceau du Protecteur'};if(streak>=14)return{icon:'💜',name:'Cristal d’Endurance'};if(streak>=7)return{icon:'💎',name:'Éclat Azur'};if(streak>=3)return{icon:'💚',name:'Éclat d’Élan'};return{icon:'✨',name:'Éclat du Gardien'}}
const quotes=[
  'Une petite action utile vaut mieux qu’une grande intention.',
  'Le foyer ne demande pas la perfection. Il demande ta présence.',
  'Commence par cinq minutes. L’élan fera le reste.',
  'Prendre soin des autres commence souvent par une action simple.',
  'Tu n’as pas besoin d’être motivé longtemps. Juste assez pour démarrer.',
  'Chaque mission terminée rend demain plus léger.',
  'Le Gardien ne fait pas tout. Il fait ce qui compte maintenant.'
];
const defaultTasks=[
  ['Faire 15 minutes de rangement','Rangement',15,'important','routine','today','Une zone seulement. Pas toute la maison.','Rendre l’espace plus léger.'],
  ['Préparer le repas','Cuisine',30,'must','routine','today','','Prendre soin de ceux qui partagent le foyer.'],
  ['Lancer une machine','Entretien',10,'important','mission','today','','Éviter l’accumulation.'],
  ['Nettoyer le plan de travail','Entretien',10,'bonus','mission','today','','Finir la journée dans un espace net.'],
].map(([title,path,duration,priority,type,day,notes,why])=>({id:uid(),title,path,duration,priority,type,day,createdFor:dateKey(),notes,why,doneDates:[]}));
const defaultProjects=[{id:uid(),title:'Exemple : Refaire l’escalier',why:'Améliorer durablement le foyer.',createdAt:dateKey(),steps:[
  {id:uid(),title:'Lister le matériel',done:false},{id:uid(),title:'Protéger la zone',done:false},{id:uid(),title:'Poncer une première section',done:false},{id:uid(),title:'Reboucher les défauts',done:false},{id:uid(),title:'Appliquer la finition',done:false}
]}];
function freshState(){return{schemaVersion:8,tasks:defaultTasks,projects:defaultProjects,xp:0,shards:0,activeDays:[],oath:[],oathDate:dateKey(),oathsByDate:{},pathFilter:'all',virtues:{Foyer:0,Artisanat:0,Soutien:0,Discipline:0},ritualTime:'21:30',lastRitualNotice:'',week:{key:weekKey(),count:0},achievements:[],stats:{missions:0,minutes:0,oaths:0,rescues:0},ascensions:[]}}
function load(){let raw=localStorage.getItem(STORAGE_KEY);if(!raw){for(const k of oldKeys){if(localStorage.getItem(k)){try{const old=JSON.parse(localStorage.getItem(k));const n=freshState();if(old.tasks)n.tasks=old.tasks.filter(t=>!t.realm||t.realm==='Foyer').map(t=>({...t,realm:undefined,path:t.path||'Entretien'}));n.xp=old.xp||0;n.activeDays=old.activeDays||[];n.oath=old.oath||[];return n}catch{}}}}try{return raw?JSON.parse(raw):freshState()}catch{return freshState()}}
let state=load();
function normalize(){state.tasks=Array.isArray(state.tasks)?state.tasks:[];state.projects=Array.isArray(state.projects)?state.projects:[];state.activeDays=Array.isArray(state.activeDays)?state.activeDays:[];state.oath=Array.isArray(state.oath)?state.oath:[];state.oathDate=state.oathDate||dateKey();state.oathsByDate=state.oathsByDate&&typeof state.oathsByDate==='object'?state.oathsByDate:{};if(state.oath.length&&!state.oathsByDate[state.oathDate])state.oathsByDate[state.oathDate]=[...state.oath];Object.keys(state.oathsByDate).forEach(d=>{state.oathsByDate[d]=Array.isArray(state.oathsByDate[d])?[...new Set(state.oathsByDate[d])]:[]});state.virtues=state.virtues||{Foyer:0,Artisanat:0,Soutien:0,Discipline:0};state.achievements=Array.isArray(state.achievements)?state.achievements:[];state.ascensions=Array.isArray(state.ascensions)?state.ascensions:[];state.stats={missions:0,minutes:0,oaths:0,rescues:0,...(state.stats||{})};state.shards=Number(state.shards)||0;state.tasks.forEach(t=>{t.type=t.type==='routine'?'routine':'mission';t.doneDates=Array.isArray(t.doneDates)?t.doneDates:[];if(t.type==='mission'&&!t.completedAt&&t.doneDates.length)t.completedAt=[...t.doneDates].sort().at(-1);if(t.type==='routine')delete t.completedAt;t.duration=Math.max(1,Number(t.duration)||15);if(!['must','important','bonus'].includes(t.priority))t.priority='important';if(!pathIcons[t.path])t.path='Entretien';});state.projects.forEach(p=>{p.steps=Array.isArray(p.steps)?p.steps:[];p.steps.forEach(step=>{step.done=!!step.done;if(step.done&&!step.completedAt)step.completedAt=p.createdAt||dateKey();});});state.schemaVersion=8;state.ritualTime=state.ritualTime||'21:30';if(!state.week||state.week.key!==weekKey())state.week={key:weekKey(),count:0};}
normalize();
const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
const esc=(s='')=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
const isDone=(t,d=dateKey())=>t.type==='routine'?(t.doneDates||[]).includes(d):!!t.completedAt;
const getOath=(d=dateKey())=>(state.oathsByDate?.[d]||[]).filter(id=>state.tasks.some(t=>t.id===id));
function setOath(d,ids){state.oathsByDate=state.oathsByDate||{};state.oathsByDate[d]=[...new Set(ids)].filter(id=>state.tasks.some(t=>t.id===id));state.oath=[...state.oathsByDate[d]];state.oathDate=d}
function removeTaskFromOaths(id){if(!state.oathsByDate)return;Object.keys(state.oathsByDate).forEach(d=>state.oathsByDate[d]=state.oathsByDate[d].filter(x=>x!==id));state.oath=state.oath.filter(x=>x!==id)}
const priorityLabel=p=>p==='must'?'Serment':p==='bonus'?'Bonus':'Important';
const xpFor=t=>Math.max(10,Math.min(140,Math.round(Number(t.duration||15)*1.4)+(t.priority==='must'?25:t.priority==='important'?12:0)+(t.path==='Soutien'?8:0)));
const shardFor=t=>Math.max(1,Math.round(xpFor(t)/25));
function currentRank(){let r=ranks[0];for(const x of ranks)if(state.xp>=x.min)r=x;return r}
function nextRank(){return ranks.find(r=>r.min>state.xp)||{name:'Légende',min:Math.max(12000,state.xp)};}
function level(){return Math.floor(state.xp/250)+1}
const guardianStages=[
  {min:1,max:9,img:'assets/guardian-stage-1.webp',name:'L’Éveillé',gear:'Tunique usée, bottes simples, carnet de route',decor:'Maison sombre, première lueur à l’horizon',desc:'La volonté précède l’armure.'},
  {min:10,max:19,img:'assets/guardian-stage-10.webp',name:'L’Apprenti',gear:'Cuir léger, brassards, ceinture d’outils',decor:'Premières lanternes, foyer plus ordonné',desc:'Les premiers équipements témoignent de ta constance.'},
  {min:20,max:29,img:'assets/guardian-stage-20.webp',name:'Le Protecteur',gear:'Plastron léger, épaulières, cape courte',decor:'Village visible, ciel plus lumineux',desc:'Une véritable armure apparaît : ton foyer sent ta présence.'},
  {min:30,max:39,img:'assets/guardian-stage-30.webp',name:'Le Gardien',gear:'Armure intermédiaire noire et or, cape complète',decor:'Domaine fortifié, soleil levant',desc:'Tu ne subis plus le désordre : tu le maîtrises.'},
  {min:40,max:49,img:'assets/guardian-stage-40.webp',name:'Le Champion',gear:'Armure complète, épaulières imposantes, première relique',decor:'Domaine prospère, jardins entretenus',desc:'Une armure forgée par des centaines de gestes utiles.'},
  {min:50,max:59,img:'assets/guardian-stage-50.webp',name:'Le Héros du Foyer',gear:'Armure héroïque, cœur lumineux, relique majeure',decor:'Château-sanctuaire et ciel épique',desc:'Le foyer devient un symbole de protection.'},
  {min:60,max:69,img:'assets/guardian-stage-50.webp',name:'Le Seigneur Bâtisseur',gear:'Armure noble, manteau long, marteau cérémoniel',decor:'Royaume en construction, tours et ateliers',desc:'Tu bâtis désormais au-delà de l’entretien quotidien.'},
  {min:70,max:79,img:'assets/guardian-stage-50.webp',name:'Le Gardien Ascendant',gear:'Armure noire et or raffinée, runes éveillées',decor:'Royaume achevé, temples et crépuscule doré',desc:'Tes habitudes deviennent une puissance visible.'},
  {min:80,max:89,img:'assets/guardian-stage-50.webp',name:'Le Gardien Légendaire',gear:'Armure légendaire, cape majestueuse, halo runique',decor:'Royaume vu depuis les hauteurs',desc:'Ton foyer porte la trace durable de ta constance.'},
  {min:90,max:99,img:'assets/guardian-stage-50.webp',name:'Le Demi-Dieu du Foyer',gear:'Armure mythologique noire, or et ivoire, reliques orbitantes',decor:'Cité mythologique sous un ciel étoilé',desc:'Le Gardien devient le symbole vivant du Royaume.'},
  {min:100,max:9999,img:'assets/guardian-stage-50.webp',name:'Le Gardien Éternel',gear:'Armure ultime, Flamme Éternelle, Cercle du Gardien',decor:'Royaume entier au lever du soleil, maison originelle au centre',desc:'Tu n’as pas construit une série : tu as construit un héritage.'}
];
const ASCENSION_LEVELS=[10,20,30,40,50,60,70,80,90,100];
let pendingAscensions=[];
function stageForLevel(l){return guardianStages.find(s=>l>=s.min&&l<=s.max)||guardianStages.at(-1)}
function guardianStage(){return stageForLevel(level())}
function queueAscensions(beforeLevel,afterLevel){
  const crossed=ASCENSION_LEVELS.filter(n=>beforeLevel<n&&afterLevel>=n&&!state.ascensions.includes(n));
  if(!crossed.length)return;
  crossed.forEach(n=>{state.ascensions.push(n);pendingAscensions.push(n)});save();
}
function showNextAscension(){if(!pendingAscensions.length)return;showAscension(pendingAscensions.shift())}
function showAscension(lvl){
  const stage=stageForLevel(lvl),prev=stageForLevel(Math.max(1,lvl-1));
  $('#ascensionLevel').textContent=lvl;$('#ascensionName').textContent=stage.name;
  $('#ascensionQuote').textContent=lvl===100?'Tu n’as pas construit une série de victoires. Tu as construit un héritage.':'Celui qui prend soin de son royaume devient digne de le protéger.';
  $('#ascensionBeforeImg').src=prev.img;$('#ascensionAfterImg').src=stage.img;$('#ascensionBeforeName').textContent=`Niv. ${Math.max(1,lvl-1)} · ${prev.name}`;$('#ascensionAfterName').textContent=`Niv. ${lvl} · ${stage.name}`;
  $('#ascensionGear').textContent=stage.gear;$('#ascensionDecor').textContent=stage.decor;
  $('#ascensionStats').innerHTML=`<span>⚔️ <strong>${state.stats.missions}</strong> missions</span><span>❤️ <strong>${state.virtues.Soutien||0}</strong> Soutien</span><span>🔨 <strong>${state.projects.filter(p=>p.steps.length&&p.steps.every(x=>x.done)).length}</strong> campagnes</span><span>🔥 <strong>${computeStreak()}</strong> jours</span>`;
  $('#ascensionDialog').classList.toggle('eternal',lvl===100);$('#ascensionContinue').textContent=lvl===100?'✦ COMMENCER L’ÈRE II — L’HÉRITAGE':'⚔️ CONTINUER L’AVENTURE';
  $('#ascensionDialog').showModal();requestAnimationFrame(()=>$('#ascensionDialog').classList.add('revealed'));
}
function renderHeritage(selectedLevel=level()){
  const box=$('#heritageStages');if(!box)return;box.innerHTML='';
  guardianStages.forEach(stage=>{const unlocked=level()>=stage.min||state.ascensions.includes(stage.min),selected=selectedLevel>=stage.min&&selectedLevel<=stage.max;const card=document.createElement('button');card.type='button';card.className=`heritage-card ${unlocked?'unlocked':'locked'} ${selected?'current':''}`;card.innerHTML=`<div class="heritage-image-wrap"><img src="${stage.img}" alt="${esc(stage.name)}"><span>${unlocked?'':'🔒'}</span></div><strong>Niv. ${stage.min}</strong><small>${unlocked?esc(stage.name):'???'}</small>`;card.onclick=()=>renderHeritageDetail(stage);box.appendChild(card)});
  renderHeritageDetail(stageForLevel(selectedLevel));
}
function renderHeritageDetail(stage){const unlocked=level()>=stage.min||state.ascensions.includes(stage.min);$('#heritageHero').src=stage.img;$('#heritageTitle').textContent=unlocked?stage.name:'Héritage scellé';$('#heritageLevel').textContent=`Niveau ${stage.min}`;$('#heritageGear').textContent=unlocked?stage.gear:'Atteins ce palier pour découvrir l’équipement.';$('#heritageDecor').textContent=unlocked?stage.decor:'Le Royaume garde encore ce décor dans l’ombre.';$('#heritageLock').textContent=unlocked?'Débloqué dans ton histoire':`${Math.max(0,stage.min-level())} ${stage.min-level()>1?'niveaux restants':'niveau restant'}`;}

function computeStreak(){let n=0,d=new Date(),set=new Set(state.activeDays);if(!set.has(dateKey()))d.setDate(d.getDate()-1);while(set.has(d.toISOString().slice(0,10))){n++;d.setDate(d.getDate()-1)}return n}
function syncDays(){state.tasks.forEach(t=>{if(t.day==='tomorrow'&&t.createdFor&&dateKey()>=t.createdFor){t.day='today';t.createdFor=dateKey()}});state.oathsByDate=state.oathsByDate||{};Object.keys(state.oathsByDate).forEach(d=>{state.oathsByDate[d]=state.oathsByDate[d].filter(id=>state.tasks.some(t=>t.id===id))});state.oath=getOath(dateKey());state.oathDate=dateKey()}
function todayTasks(){return state.tasks.filter(t=>t.day==='today'&&(t.type==='routine'||!t.completedAt))}
function todayCompleted(){const d=dateKey();return state.tasks.filter(t=>t.type==='routine'?(t.doneDates||[]).includes(d):t.completedAt===d)}
function sortedTasks(tasks){return [...tasks].sort((a,b)=>Number(isDone(a))-Number(isDone(b))||({must:0,important:1,bonus:2}[a.priority]-{must:0,important:1,bonus:2}[b.priority])||Number(a.duration)-Number(b.duration))}
function render(){normalize();syncDays();save();renderHeader();renderToday();renderTomorrow();renderProjects();renderProgress();renderSettings();}
function renderHeader(){const h=new Date().getHours();$('#greeting').textContent=`${h<12?'Bonjour':h<18?'Bon après-midi':'Bonsoir'}, Gardien`;const stage=guardianStage(),heroImg=$('#heroGuardianImage');if(heroImg){heroImg.src=stage.img;heroImg.alt=`Gardien ${stage.name}`;}const r=currentRank(),n=nextRank();$('#rankPill').textContent=r.name.toUpperCase();$('#rankMini').textContent=r.name;$('#level').textContent=level();$('#xpCurrent').textContent=state.xp;$('#xpNext').textContent=n.min===state.xp?state.xp:n.min;const prev=r.min,next=n.min===r.min?r.min+250:n.min,pct=Math.min(100,Math.max(0,((state.xp-prev)/(next-prev))*100));$('#xpBar').style.width=`${pct}%`;$('#dailyQuote').textContent=quotes[new Date().getDate()%quotes.length];}
function renderToday(){const completed=todayCompleted();$('#todayDone').textContent=completed.length;$('#todayMinutes').textContent=completed.reduce((a,t)=>a+Number(t.duration||0),0);$('#streak').textContent=computeStreak();$('#shards').textContent=state.shards;renderOath();const list=$('#taskList');list.innerHTML='';let tasks=todayTasks();if(state.pathFilter!=='all')tasks=tasks.filter(t=>t.path===state.pathFilter);tasks=sortedTasks(tasks);if(!tasks.length){list.innerHTML='<div class="empty">Aucune mission ici. Le Gardien peut respirer… ou créer une petite action utile.</div>';return}tasks.forEach(t=>list.appendChild(taskCard(t,true)))}
function taskCard(t,actions=true){const el=document.createElement('article');el.className=`task ${isDone(t)?'done':''}`;el.innerHTML=`<div class="task-main"><button class="check ${isDone(t)?'done':''}" aria-label="Terminer">${isDone(t)?'✓':''}</button><div><h3>${esc(t.title)}</h3><div class="task-meta">${pathIcons[t.path]||'🛡️'} ${esc(t.path)}${t.room?` · 📍 ${esc(t.room)}`:''} · ${t.duration} min <span class="priority ${t.priority}">${priorityLabel(t.priority)}</span> · +${xpFor(t)} XP</div>${t.why?`<div class="why">${esc(t.why)}</div>`:''}</div></div>${actions?'<div class="task-actions"><button class="small-btn focus" aria-label="Commencer">▶</button><button class="small-btn delete" aria-label="Supprimer">⋯</button></div>':''}`;el.querySelector('.check').onclick=()=>toggleDone(t.id);if(actions){el.querySelector('.focus').onclick=()=>openFocus(t);el.querySelector('.delete').onclick=()=>{if(confirm(`Supprimer « ${t.title} » ?`)){state.tasks=state.tasks.filter(x=>x.id!==t.id);removeTaskFromOaths(t.id);save();render()}}}return el}
function toggleDone(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;const d=dateKey();t.doneDates=t.doneDates||[];if(isDone(t)){const hadOathBonus=oathComplete()&&getOath().includes(t.id);t.doneDates=t.doneDates.filter(x=>x!==d);if(t.type!=='routine')t.completedAt=null;state.xp=Math.max(0,state.xp-xpFor(t)-(hadOathBonus?75:0));state.shards=Math.max(0,state.shards-shardFor(t)-(hadOathBonus?5:0));state.stats.missions=Math.max(0,state.stats.missions-1);state.stats.minutes=Math.max(0,state.stats.minutes-Number(t.duration||0));state.week.count=Math.max(0,state.week.count-1);const v=pathVirtues[t.path]||'Foyer';state.virtues[v]=Math.max(0,(state.virtues[v]||0)-1);if(hadOathBonus)state.stats.oaths=Math.max(0,state.stats.oaths-1);}else{completeTask(t)}save();render()}
function completeTask(t){const d=dateKey();t.doneDates=t.doneDates||[];if(t.doneDates.includes(d))return;const beforeLevel=level(),beforeOath=oathComplete();t.doneDates.push(d);if(t.type!=='routine')t.completedAt=d;const xp=xpFor(t);state.xp+=xp;state.shards+=shardFor(t);state.stats.missions++;state.stats.minutes+=Number(t.duration||0);state.week.count++;const v=pathVirtues[t.path]||'Foyer';state.virtues[v]=(state.virtues[v]||0)+1;if(!state.activeDays.includes(d))state.activeDays.push(d);if(!beforeOath&&oathComplete()&&getOath().length>=3){state.xp+=75;state.shards+=5;state.stats.oaths++;setTimeout(()=>showReward('Serment tenu !','+75 XP bonus','Tu as tenu tes engagements essentiels. Le reste est du bonus.',{rank:'S',xp:75,mission:'Serment du jour'}),80)}else{showReward('Mission accomplie',`+${xp} XP · +${shardFor(t)} éclat${shardFor(t)>1?'s':''}`,t.path==='Soutien'?'Tu viens directement d’alléger la charge du foyer.':'Une action concrète de plus. Le foyer avance.',{task:t,xp})}queueAscensions(beforeLevel,level());unlockAchievements();confetti()}
function oathComplete(){const items=getOath().map(id=>state.tasks.find(t=>t.id===id)).filter(Boolean);return items.length>=3&&items.every(isDone)}
function renderOath(){const box=$('#oathList');box.innerHTML='';const items=getOath().map(id=>state.tasks.find(t=>t.id===id)).filter(Boolean);const done=items.filter(isDone).length;$('#oathDone').textContent=done;const oathTotal=$('#oathTotal');if(oathTotal)oathTotal.textContent=items.length||3;$('#oathProgress').style.width=`${items.length?done/items.length*100:0}%`;if(!items.length){box.innerHTML='<div class="empty">Choisis au moins 3 engagements. Tu peux en sceller davantage si ta journée le permet.</div>';return}items.forEach((t,i)=>{const row=document.createElement('div');row.className=`oath-item ${isDone(t)?'done':''}`;row.innerHTML=`<span class="oath-index">${i+1}</span><div><strong>${esc(t.title)}</strong><div class="task-meta">${pathIcons[t.path]||'🛡️'} ${t.duration} min</div></div><span>${isDone(t)?'✓':'→'}</span>`;row.onclick=()=>openFocus(t);box.appendChild(row)})}
function renderTomorrow(){const list=$('#tomorrowList');list.innerHTML='';const tasks=sortedTasks(state.tasks.filter(t=>t.day==='tomorrow'&&(t.type==='routine'||!t.completedAt)));if(!tasks.length){list.innerHTML='<div class="empty">Rien n’est prévu pour demain. Utilise le Rituel du soir pour vider ta tête.</div>';return}tasks.forEach(t=>list.appendChild(taskCard(t,false)))}
function inferMission(text,defaultDuration){const s=text.toLowerCase();let path='Entretien',duration=defaultDuration,priority='important';const m=s.match(/(\d+)\s*(min|minute|minutes)/);if(m)duration=Math.min(120,Math.max(5,Number(m[1])));if(/repas|cuisin|dîner|diner|déjeuner|dejeuner|courses|four|frigo/.test(s))path='Cuisine';else if(/ranger|tri|cave|placard|garage|grenier|bureau/.test(s))path='Rangement';else if(/bricol|ponc|peind|peint|répar|repar|meuble|escalier|percer|visser|monter/.test(s))path='Artisanat';else if(/aider|préparer.*pour|enfant|famille|femme|conjoint|soutien|emmener|aller chercher/.test(s))path='Soutien';else if(/papier|facture|assurance|administr|courrier|budget/.test(s))path='Administratif';if(/urgent|obligatoire|impératif|imperatif|dois|absolument/.test(s))priority='must';if(/si possible|bonus|peut-être|peut etre/.test(s))priority='bonus';return{title:text.replace(/\s+\d+\s*(min|minute|minutes).*/i,'').trim()||text,path,duration,priority}}
function planTomorrow(){const lines=$('#ritualInput').value.split('\n').map(x=>x.trim()).filter(Boolean);if(!lines.length)return alert('Énonce au moins une mission.');const defaultDuration=Number($('#ritualDuration').value),energy=$('#tomorrowEnergy').value;lines.forEach(line=>{const m=inferMission(line,defaultDuration);state.tasks.push({id:uid(),...m,type:'mission',day:'tomorrow',createdFor:dateKey(1),why:'Préparé pendant le Rituel du soir.',notes:'',doneDates:[]})});$('#ritualInput').value='';save();$('#ritualDialog').close();openOathPicker(true,energy)}
function openOathPicker(tomorrow=false,energy='normal'){
  const picker=$('#oathPicker'),targetDate=tomorrow?dateKey(1):dateKey();picker.dataset.forDate=targetDate;picker.innerHTML='';
  let pool=state.tasks.filter(t=>tomorrow?t.day==='tomorrow':todayTasks().includes(t));pool=sortedTasks(pool);
  if(tomorrow&&energy==='low')pool.sort((a,b)=>a.duration-b.duration);
  if(tomorrow&&energy==='high')pool.sort((a,b)=>({must:0,important:1,bonus:2}[a.priority]-{must:0,important:1,bonus:2}[b.priority])||b.duration-a.duration);
  if(!pool.length)picker.innerHTML='<div class="empty">Aucune mission disponible. Tu peux demander des idées ménagères au Gardien.</div>';
  const saved=new Set(getOath(targetDate));
  pool.forEach((t,i)=>{const suggested=tomorrow&&saved.size===0&&i<3&&t.priority!=='bonus';const row=document.createElement('label');row.className='oath-item';row.innerHTML=`<input type="checkbox" value="${t.id}" ${(saved.has(t.id)||suggested)?'checked':''}><div><strong>${esc(t.title)}</strong><div class="task-meta">${pathIcons[t.path]||'🛡️'} ${t.path}${t.room?` · 📍 ${esc(t.room)}`:''} · ${t.duration} min · ${priorityLabel(t.priority)}</div></div><span>+${xpFor(t)} XP</span>`;const input=row.querySelector('input');input.onchange=()=>{const checked=$$('#oathPicker input:checked');const status=$('#oathSuggestionStatus');if(status)status.textContent=checked.length<3?`Encore ${3-checked.length} serment${3-checked.length>1?'s':''} minimum à choisir.`:`${checked.length} serment${checked.length>1?'s':''} sélectionné${checked.length>1?'s':''}. Tu peux continuer librement.`};picker.appendChild(row)});
  const status=$('#oathSuggestionStatus');if(status)status.textContent='';$('#oathDialog').showModal()
}
let currentFocus=null,timerId=null,seconds=900,focusCompletion=null,isRescueFocus=false;
function openFocus(t,forcedSeconds=null,onComplete=null){currentFocus=t;focusCompletion=onComplete;seconds=forcedSeconds??Math.max(300,Math.min(Number(t.duration)||15,90)*60);updateTimer();$('#focusTitle').textContent=t.title;$('#focusWhy').textContent=t.why||'Une seule action. Le reste peut attendre.';$('#focusMeta').textContent=`${pathIcons[t.path]||'🛡️'} ${t.path} · +${xpFor(t)} XP · +${shardFor(t)} éclat${shardFor(t)>1?'s':''}`;$('#focusDialog').showModal()}
function updateTimer(){const m=String(Math.floor(seconds/60)).padStart(2,'0'),s=String(seconds%60).padStart(2,'0');$('#timer').textContent=`${m}:${s}`}
function closeFocus(){clearInterval(timerId);timerId=null;focusCompletion=null;isRescueFocus=false;$('#startTimer').textContent='Démarrer';if($('#focusDialog').open)$('#focusDialog').close()}
function chooseMission(maxDuration=999){let pool=todayTasks().filter(t=>!isDone(t)&&Number(t.duration)<=maxDuration);const currentOath=getOath();const oathPool=pool.filter(t=>currentOath.includes(t.id));if(oathPool.length)pool=oathPool;pool=sortedTasks(pool);return pool[0]||null}
function renderProjects(){const box=$('#projectList');box.innerHTML='';if(!state.projects.length){box.innerHTML='<div class="empty">Aucune campagne. Crée un grand projet et découpe-le en étapes.</div>';return}state.projects.forEach(p=>{const done=p.steps.filter(s=>s.done).length,pct=p.steps.length?done/p.steps.length*100:0;const el=document.createElement('article');el.className='project';el.innerHTML=`<div class="project-head"><div><h3>${esc(p.title)}</h3><div class="task-meta">${esc(p.why||'Grand projet du foyer')}</div></div><button class="small-btn delete">⋯</button></div><div class="project-progress"><div class="xp-track"><span style="width:${pct}%"></span></div><small>${done}/${p.steps.length}</small></div><div class="steps"></div><div class="project-actions"><button class="action small next-step">⚔️ Prochaine étape</button></div>`;const steps=el.querySelector('.steps');p.steps.forEach(step=>{const row=document.createElement('label');row.className=`project-step ${step.done?'done':''}`;row.innerHTML=`<input type="checkbox" ${step.done?'checked':''}><span>${esc(step.title)}</span>`;row.querySelector('input').onchange=e=>{const wantsDone=e.target.checked;if(wantsDone&&!step.done){const beforeLevel=level();step.done=true;step.completedAt=dateKey();state.xp+=20;state.shards+=1;state.virtues.Artisanat=(state.virtues.Artisanat||0)+1;queueAscensions(beforeLevel,level());showReward('Étape franchie','+20 XP · +1 éclat','Les grandes campagnes se gagnent une étape après l’autre.',{rank:'B',xp:20,mission:step.title});confetti()}else if(!wantsDone&&step.done){step.done=false;step.completedAt=null;state.xp=Math.max(0,state.xp-20);state.shards=Math.max(0,state.shards-1);state.virtues.Artisanat=Math.max(0,(state.virtues.Artisanat||0)-1)}save();render()};steps.appendChild(row)});el.querySelector('.next-step').onclick=()=>{const step=p.steps.find(x=>!x.done);if(!step)return alert('Campagne terminée !');const temp={id:`project-${step.id}`,title:step.title,path:'Artisanat',duration:20,priority:'important',type:'mission',why:p.title,doneDates:[]};openFocus(temp,null,()=>{if(!step.done){const beforeLevel=level();step.done=true;step.completedAt=dateKey();state.xp+=20;state.shards+=1;state.virtues.Artisanat=(state.virtues.Artisanat||0)+1;queueAscensions(beforeLevel,level());save();showReward('Étape franchie','+20 XP · +1 éclat',p.title,{rank:'B',xp:20,mission:step.title});confetti()}})};el.querySelector('.delete').onclick=()=>{if(confirm(`Supprimer la campagne « ${p.title} » ?`)){state.projects=state.projects.filter(x=>x.id!==p.id);save();renderProjects()}};box.appendChild(el)})}
function renderProgress(){const r=currentRank(),n=nextRank(),stage=guardianStage();$('#profileRank').textContent=r.name;$('#profileLevel').textContent=level();$('#profileXP').textContent=state.xp;const gi=$('#guardianEvolutionImage'),gn=$('#guardianEvolutionName'),gd=$('#guardianEvolutionDesc');if(gi){gi.src=stage.img;gi.alt=`Gardien ${stage.name} niveau ${level()}`;}if(gn)gn.textContent=stage.name;if(gd)gd.textContent=stage.desc;$$('.guardian-stage-card').forEach(card=>{const min=Number(card.dataset.minLevel)||1;const nextCard=card.nextElementSibling;const max=nextCard?Number(nextCard.dataset.minLevel)-1:Infinity;card.classList.toggle('current',level()>=min&&level()<=max);card.classList.toggle('unlocked',level()>=min)});const next=n.min===r.min?r.min+250:n.min;$('#profileXpBar').style.width=`${Math.min(100,(state.xp-r.min)/(next-r.min)*100)}%`;const virtues=[['Foyer','🛡️','Entretenir et protéger'],['Soutien','❤️','Soulager les autres'],['Artisanat','🔨','Construire et réparer'],['Discipline','⚡','Tenir ses engagements']];$('#virtues').innerHTML=virtues.map(([name,icon,desc])=>{const v=state.virtues[name]||0,lvl=Math.floor(v/5)+1,pct=(v%5)/5*100;return`<article class="virtue"><div class="virtue-top"><strong>${icon} ${name}</strong><span>Niv. ${lvl}</span></div><small class="muted">${desc}</small><div class="xp-track"><span style="width:${pct}%"></span></div></article>`}).join('');renderBadges();$('#weeklyDone').textContent=Math.min(7,state.week.count);$('#weeklyBar').style.width=`${Math.min(100,state.week.count/7*100)}%`;$('#weeklyMessage').textContent=state.week.count>=7?'Défi accompli. Tu as créé un vrai élan cette semaine.':`${7-state.week.count} geste${7-state.week.count>1?'s':''} avant le défi accompli.`}
const badgeDefs=[['first','🔥','Premier pas','1 mission',()=>state.stats.missions>=1],['ten','⚔️','Élan','10 missions',()=>state.stats.missions>=10],['streak3','🌟','Constant','3 jours',()=>computeStreak()>=3],['support5','❤️','Pilier','5 Soutien',()=>state.virtues.Soutien>=5],['craft5','🔨','Artisan','5 Artisanat',()=>state.virtues.Artisanat>=5],['oath3','🛡️','Parole tenue','3 Serments',()=>state.stats.oaths>=3],['hour','⏱️','Heure utile','60 minutes',()=>state.stats.minutes>=60],['rescue3','⚡','Rebond','3 modes 5 min',()=>state.stats.rescues>=3]];
function unlockAchievements(){badgeDefs.forEach(([id,,, ,test])=>{if(test()&&!state.achievements.includes(id)){state.achievements.push(id);state.shards+=3}})}
function renderBadges(){unlockAchievements();$('#badges').innerHTML=badgeDefs.map(([id,icon,name,desc])=>`<article class="badge ${state.achievements.includes(id)?'':'locked'}"><div class="badge-icon">${icon}</div><strong>${name}</strong><small>${desc}</small></article>`).join('')}
function renderSettings(){$('#ritualTime').value=state.ritualTime}
function showReward(title,xp,text,meta={}){
  const streak=computeStreak(),task=meta.task||null;
  const match=String(xp).match(/\+?(\d+)\s*XP/i),xpNumber=Number(meta.xp??(match?match[1]:0));
  const vrank=meta.rank||victoryRankFor(xpNumber,task),reward=rewardForStreak(streak);
  $('#rewardTitle').textContent=title;$('#rewardXp').textContent=xp;$('#rewardText').textContent=text;
  $('#victoryRank').textContent=vrank;$('#victoryCombo').textContent=streak?`${streak} jour${streak>1?'s':''}`:'Premier pas';
  $('#victoryRewardIcon').textContent=reward.icon;$('#victoryRewardName').textContent=reward.name;$('#victoryMission').textContent=task?.title||meta.mission||'Le foyer avance';
  $('#rewardDialog').dataset.rank=vrank;$('#rewardDialog').showModal();
}
function confetti(){const box=$('#celebration');box.innerHTML='';for(let i=0;i<28;i++){const c=document.createElement('i');c.className='confetti';c.style.left=`${Math.random()*100}%`;c.style.animationDelay=`${Math.random()*.35}s`;c.style.transform=`rotate(${Math.random()*180}deg)`;box.appendChild(c)}setTimeout(()=>box.innerHTML='',1900)}
function maybeRitualReminder(){if(Notification.permission!=='granted')return;const now=new Date(),hm=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;if(hm===state.ritualTime&&state.lastRitualNotice!==dateKey()){new Notification('🌙 Le Rituel du Gardien t’attend',{body:'Prépare 3 missions essentielles pour rendre demain plus léger.',icon:'icon.svg'});state.lastRitualNotice=dateKey();save()}}

$$('.nav-item').forEach(btn=>btn.onclick=()=>{$$('.nav-item').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$$('.view').forEach(v=>v.classList.remove('active-view'));$('#'+btn.dataset.view).classList.add('active-view');window.scrollTo({top:0,behavior:'smooth'});render()});
$$('.chip').forEach(btn=>btn.onclick=()=>{$$('.chip').forEach(x=>x.classList.remove('active'));btn.classList.add('active');state.pathFilter=btn.dataset.path;save();renderToday()});
$('#addTaskBtn').onclick=()=>{$('#taskDay').value='today';$('#taskDialog').showModal()};
$('#addTomorrowBtn').onclick=()=>{$('#taskDay').value='tomorrow';$('#taskDialog').showModal()};
$('#taskForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),day=f.get('day');state.tasks.push({id:uid(),title:f.get('title').trim(),path:f.get('path'),duration:Number(f.get('duration')),priority:f.get('priority'),type:f.get('type'),day,createdFor:day==='tomorrow'?dateKey(1):dateKey(),why:f.get('why').trim(),notes:f.get('notes').trim(),doneDates:[]});save();e.currentTarget.reset();$('#taskDay').value='today';$('#taskDialog').close();render()};
$$('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#oneMissionBtn').onclick=()=>{const t=chooseMission();if(!t)return alert('Toutes les missions du jour sont accomplies. Profite de ton avancée.');openFocus(t)};
$('#rescueBtn').onclick=()=>{let t=chooseMission(15);if(!t)t=chooseMission();if(!t){t={id:'rescue',title:'Ranger une seule petite zone',path:'Rangement',duration:5,priority:'bonus',why:'Créer un petit élan immédiatement.',doneDates:[]}}isRescueFocus=true;openFocus(t,300)};
$('#householdSuggestBtn').onclick=async()=>{try{const suggested=await HouseholdLibrary.suggest({today:dateKey(),maxRisk:1,durationMax:20,difficultyMax:2,flags:HOME_FLAGS,avoidTaskIds:[...activeLibraryIds()]},householdHistory());if(!suggested)return alert('Aucune mission sûre disponible pour le moment.');if(activeLibraryIds().has(suggested.id))return alert('Cette mission est déjà présente dans ton Royaume. Termine-la avant de la reproposer.');const t=taskFromLibrary(suggested,'today','important');state.tasks.push(t);save();render();openFocus(t)}catch(err){console.error(err);alert('La bibliothèque ménagère est indisponible. Tu peux continuer à utiliser tes missions habituelles.')}};
$('#startTimer').onclick=()=>{if(timerId)return;$('#startTimer').textContent='En cours…';timerId=setInterval(()=>{seconds=Math.max(0,seconds-1);updateTimer();if(seconds===0){clearInterval(timerId);timerId=null;$('#startTimer').textContent='Temps écoulé ✓'}},1000)};
$('#doneFocus').onclick=()=>{const rescue=isRescueFocus;if(focusCompletion){const fn=focusCompletion;fn();if(rescue)state.stats.rescues++;save();closeFocus();render();return}if(currentFocus?.id==='rescue'){const beforeLevel=level();state.xp+=10;state.shards+=1;state.stats.missions++;state.stats.minutes+=5;state.stats.rescues++;if(!state.activeDays.includes(dateKey()))state.activeDays.push(dateKey());queueAscensions(beforeLevel,level());save();showReward('Élan retrouvé','+10 XP · +1 éclat','Cinq minutes suffisent parfois à changer la direction d’une soirée.',{rank:'C',xp:10,mission:'Mission de reprise'});confetti();closeFocus();render();return}if(currentFocus&&state.tasks.some(t=>t.id===currentFocus.id)){const real=state.tasks.find(t=>t.id===currentFocus.id);if(!isDone(real))completeTask(real);if(rescue)state.stats.rescues++;save()}closeFocus();render()};
$('#closeFocus').onclick=closeFocus;
$('#editOathBtn').onclick=()=>openOathPicker(false);
$('#closeOath').onclick=()=>$('#oathDialog').close();
$('#saveOath').onclick=()=>{const d=$('#oathPicker').dataset.forDate||dateKey();const ids=$$('#oathPicker input:checked').map(x=>x.value);if(ids.length<3){const status=$('#oathSuggestionStatus');if(status)status.textContent=`Il te faut au moins 3 serments. Encore ${3-ids.length} à choisir.`;return}setOath(d,ids);save();$('#oathDialog').close();render()};
$('#suggestOathHousehold').onclick=addHouseholdIdeasToOath;
$('#openRitualBtn').onclick=()=>$('#ritualDialog').showModal();
$('#closeRitual').onclick=()=>$('#ritualDialog').close();
$('#generateTomorrow').onclick=planTomorrow;
$('#addProjectBtn').onclick=()=>$('#projectDialog').showModal();
$('#projectForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),steps=f.get('steps').split('\n').map(x=>x.trim()).filter(Boolean).map(title=>({id:uid(),title,done:false}));state.projects.push({id:uid(),title:f.get('title').trim(),why:f.get('why').trim(),createdAt:dateKey(),steps});save();e.currentTarget.reset();$('#projectDialog').close();renderProjects()};
$('#closeReward').onclick=()=>{$('#rewardDialog').close();setTimeout(showNextAscension,140)};
$('#openHeritageBtn').onclick=()=>{renderHeritage(level());$('#heritageDialog').showModal()};
$('#closeHeritage').onclick=()=>$('#heritageDialog').close();
$('#ascensionContinue').onclick=()=>{const d=$('#ascensionDialog');d.classList.remove('revealed');d.close();setTimeout(showNextAscension,120)};
$('#ascensionHeritage').onclick=()=>{const lvl=Number($('#ascensionLevel').textContent)||level();const d=$('#ascensionDialog');d.classList.remove('revealed');d.close();renderHeritage(lvl);$('#heritageDialog').showModal()};
$('#ascensionAdmire').onclick=()=>$('#ascensionDialog').classList.toggle('admire');
$('#ritualTime').onchange=e=>{state.ritualTime=e.target.value;save()};
$('#notifyBtn').onclick=async()=>{if(!('Notification'in window))return alert('Les notifications ne sont pas disponibles ici.');const p=await Notification.requestPermission();if(p==='granted')new Notification('🌙 Chroniques du Foyer',{body:'Exemple : ton Rituel du soir t’attend. Prépare ton Serment de demain.',icon:'icon.svg'});else alert('Permission de notification non accordée.')};
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`chroniques-du-foyer-${dateKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('#importInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.tasks))throw new Error();state=data;normalize();save();render();alert('Sauvegarde restaurée.')}catch{alert('Ce fichier de sauvegarde n’est pas valide.')}e.target.value=''};
$('#resetBtn').onclick=()=>{if(confirm('Effacer toute ta progression, tes missions et tes projets ?')){localStorage.removeItem(STORAGE_KEY);location.reload()}};
let deferredPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});$('#installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true};
if('serviceWorker'in navigator)navigator.serviceWorker.register(new URL('./sw.js', document.baseURI).href, { scope: './' });
setInterval(maybeRitualReminder,30000);
render();

HouseholdLibrary.load().then(lib=>{const el=document.querySelector('#libraryCount');if(el)el.textContent=lib.tasks.length;}).catch(()=>{});
