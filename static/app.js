/*
  app.js  |  BEHAVIOR of the system

  What this file does:
  It is the whole front end of the prototype. It stores mock data in memory,
  draws each screen, and reacts to clicks and typing. Nothing is saved:
  refresh the page and the sample data resets.

  Sections, top to bottom:
  1. helpers        small functions for dates, plate format, escaping text, icons
  2. seed data      sample users, vehicles and parking records
  3. shell          sidebar and top bar shared by every admin screen
  4. screens        login, dashboard, vehicles, records, users, settings
  5. gate monitor   the camera view and the plate recognition decision flow:
                      registered + active  -> authorized, gate opens automatically
                      not registered / inactive -> guard lets in as visitor or denies
                      low confidence       -> guard types the plate by hand
                      already inside / never entered -> warning
  6. modals         add / edit / delete pop-ups with validation
  7. events         one click, input and submit listener for the whole page

  Connecting the real backend later: replace the in-memory lists in `state`
  (users, vehicles, records) with API calls, and replace the "Demo controls"
  buttons on the gate screen with the real camera result.
*/

const LOGO='assets/logo.jpg';

/* ================= helpers ================= */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtTime=d=>{let h=d.getHours();const ap=h>=12?'PM':'AM';h=h%12||12;return pad(h)+':'+pad(d.getMinutes())+' '+ap};
const fmtDate=d=>MONTHS[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear();
const sameDay=(a,b)=>a.toDateString()===b.toDateString();
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const dur=(a,b)=>{const m=Math.max(0,Math.round((b-a)/60000)),h=Math.floor(m/60);return h?h+'h '+(m%60)+'m':m+'m'};

const normPlate = s => {
  const t = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z0-9]{3,10}$/.test(t)) return null;

  const m = t.match(/^([A-Z]{3})(\d{3,4})$/);
  return m ? m[1] + ' ' + m[2] : t;
};

const ICONS={
 dashboard:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
 camera:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
 car:'<path d="M4 15l1.5-5a2 2 0 0 1 1.9-1.4h9.2a2 2 0 0 1 1.9 1.4L20 15"/><rect x="3" y="15" width="18" height="4" rx="1.5"/><path d="M7 19v1.5M17 19v1.5"/>',
 records:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2 .8 3.5 2.7 3.5 5.6"/>',
 settings:'<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
 logout:'<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M15 8l4 4-4 4M19 12H9"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
 edit:'<path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16v4z"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 eyeoff:'<path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.8C3.8 8.5 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
 lock:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
 moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 alert:'<path d="M12 4l9.5 16h-19L12 4z"/><path d="M12 10v4M12 17v.5"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 barrier:'<path d="M4 20V9M4 12h16M7 12v-2M11 12v-2M15 12v-2"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 db:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
 entry:'<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M4 12h11M11 8l4 4-4 4"/>',
 exit:'<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M20 12H9M16 8l4 4-4 4"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
};
const ic=(n,s)=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true"${s?` style="width:${s}px;height:${s}px"`:''}>${ICONS[n]||''}</svg>`;

/* ================= seed data ================= */
const today0=new Date();today0.setHours(0,0,0,0);
const at=(off,h,m)=>{const d=new Date(today0);d.setDate(d.getDate()+off);d.setHours(h,m,0,0);return d};

const state={
  auth:false, page:'dashboard', theme:null, navOpen:false,
  users:[
    {id:'2021-12345',name:'Juan Dela Cruz',role:'Student',status:'Active'},
    {id:'2020-67890',name:'Maria Santos',role:'Faculty',status:'Active'},
    {id:'STAFF-001',name:'Pedro Reyes',role:'Staff',status:'Active'},
    {id:'2022-54321',name:'Ana Lopez',role:'Student',status:'Active'},
    {id:'FAC-001',name:'Luis Garcia',role:'Faculty',status:'Active'},
    {id:'2023-11872',name:'Katrina Villanueva',role:'Student',status:'Active'},
    {id:'2019-44021',name:'Ramon Bautista',role:'Faculty',status:'Active'},
    {id:'STAFF-014',name:'Liza Mercado',role:'Staff',status:'Active'},
    {id:'2022-60318',name:'Carlo Mendoza',role:'Student',status:'Inactive'},
    {id:'STAFF-022',name:'Dennis Aquino',role:'Staff',status:'Active'},
  ],
  vehicles:[
    {plate:'NAB 1234',userId:'2021-12345',status:'Active'},
    {plate:'AAA 5678',userId:'2020-67890',status:'Active'},
    {plate:'TUV 9012',userId:'STAFF-001',status:'Active'},
    {plate:'XYZ 3456',userId:'2022-54321',status:'Active'},
    {plate:'DEF 7890',userId:'FAC-001',status:'Active'},
    {plate:'KLM 2468',userId:'2023-11872',status:'Active'},
    {plate:'PQR 1357',userId:'2019-44021',status:'Active'},
    {plate:'BCD 8642',userId:'STAFF-014',status:'Active'},
    {plate:'GHJ 9753',userId:'2022-60318',status:'Inactive'},
    {plate:'NTR 4410',userId:'STAFF-022',status:'Active'},
  ],
  records:[],
  vq:'', vtype:'all',
  uq:'',
  rf:{from:'',to:'',type:'all',status:'all',q:'',page:1},
  settings:{autoOpen:true,autoClose:8,threshold:85,retention:'1 year'},
  modal:null,
  gate:{dir:'entry',phase:'idle',plate:'',conf:0,kind:'',veh:null,reason:'',open:false,openMode:'',event:null,guess:''},
};
let rid=1;
const ownerOf=p=>{const v=state.vehicles.find(x=>x.plate===p);const u=v&&state.users.find(x=>x.id===v.userId);return u?{owner:u.name,type:u.role}:{owner:'Unregistered',type:'Visitor'}};
function addRec(plate,entry,exit,result='ok',extra={}){const o=ownerOf(plate);const r={id:rid++,plate,owner:o.owner,type:o.type,entry,exit,result,note:'',reviewed:result==='ok',...extra};state.records.push(r);return r}



const isInside=p=>state.records.find(r=>r.plate===p&&r.entry&&!r.exit&&r.result!=='denied');
const flagged=()=>state.records.filter(r=>(r.result==='manual'||r.result==='denied')&&!r.reviewed);
const todayRecs=()=>state.records.filter(r=>(r.entry&&sameDay(r.entry,new Date()))||(r.exit&&sameDay(r.exit,new Date())));
const stamp=r=>r.exit&&(!r.entry||r.exit>r.entry)?r.exit:r.entry;

/* ================= toast / theme ================= */
function toast(msg){const t=document.createElement('div');t.className='toast';t.innerHTML=ic('check',16)+'<span>'+esc(msg)+'</span>';$('#toasts').appendChild(t);setTimeout(()=>t.remove(),3200)}
function applyTheme(){const r=document.documentElement;state.theme?r.setAttribute('data-theme',state.theme):r.removeAttribute('data-theme')}
const isDark=()=>state.theme?state.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;

/* ================= shell ================= */
const NAV=[['dashboard','Dashboard','dashboard'],['gate','Gate monitor','camera'],['vehicles','Vehicles','car'],['records','Parking records','records'],['users','Manage users','users'],['settings','Settings','settings']];
const TITLES={dashboard:'Dashboard',gate:'Gate monitor',vehicles:'Vehicles',records:'Parking records',users:'Manage users',settings:'Settings'};

function shell(inner){
  const n=flagged().length;
  return `<div class="shell">
  <aside class="side${state.navOpen?' open':''}" aria-label="Main">
    <div class="brand"><img class="seal" src="${LOGO}" alt=""><div><b>Quezon City University</b><span>Parking Management System</span></div></div>
    <nav class="nav">${NAV.map(([id,l,i])=>`<a href="#${id}" data-act="nav" data-page="${id}"${state.page===id?' aria-current="page"':''}>${ic(i)}<span>${l}</span>${id==='records'&&n?`<span class="badge" title="${n} need review">${n}</span>`:''}</a>`).join('')}</nav>
    <div class="spacer"></div>
    <button class="logout" data-act="logout">${ic('logout')}<span>Log out</span></button>
  </aside>
  ${state.navOpen?'<div class="scrim" data-act="nav-close" style="z-index:25"></div>':''}
  <div class="main">
    <header class="topbar">
      <button class="iconbtn menubtn" data-act="nav-toggle" aria-label="Open menu">${ic('menu')}</button>
      <span class="crumb">${TITLES[state.page]}</span><span class="grow"></span>
      <button class="iconbtn" data-act="theme" aria-label="Switch theme">${ic(isDark()?'sun':'moon')}</button>
      <div class="who"><span class="av">${ic('user',16)}</span><span>Admin</span></div>
    </header>
    <main class="content" id="view">${inner}</main>
  </div></div>`;
}

/* ================= login ================= */
function vLogin(err,forgot){
  const art=`<svg viewBox="0 0 600 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
   <rect width="600" height="700" fill="#2d3c50"/>
   <rect y="470" width="600" height="230" fill="#202d3c"/>
   <rect x="215" y="120" width="170" height="350" fill="#3d4f66"/><rect x="195" y="300" width="210" height="170" fill="#475b75"/>
   <g fill="#2a3a4e">${Array.from({length:9},(_,r)=>[0,1,2,3].map(c=>`<rect x="${232+c*34}" y="${140+r*32}" width="20" height="20"/>`).join('')).join('')}</g>
   <circle cx="300" cy="104" r="22" fill="#566b87"/><circle cx="300" cy="104" r="14" fill="#2d3c50"/>
   <rect x="120" y="440" width="360" height="14" fill="#566b87"/>
   <path d="M0 700V540L210 505h180L600 540v160z" fill="#18222f"/>
   <path d="M250 700L285 505h30L350 700z" fill="#2a3848"/>
   <g fill="#8fa0b8"><rect x="276" y="540" width="48" height="8"/><rect x="268" y="590" width="64" height="9"/><rect x="258" y="650" width="84" height="10"/></g>
   <rect x="430" y="470" width="86" height="76" fill="#566b87"/><rect x="444" y="484" width="26" height="34" fill="#2d3c50"/>
   <rect x="86" y="510" width="344" height="9" rx="3" fill="#d6dde8"/><g fill="#d86a5f"><rect x="150" y="510" width="34" height="9"/><rect x="230" y="510" width="34" height="9"/><rect x="310" y="510" width="34" height="9"/></g>
   <rect x="76" y="470" width="16" height="76" fill="#566b87"/>
   <circle cx="90" cy="150" r="90" fill="#3d4f66" opacity=".35"/><circle cx="520" cy="70" r="60" fill="#3d4f66" opacity=".35"/>
  </svg>`;
  return `<div class="login">
   <header class="login-top"><img class="seal" src="${LOGO}" alt=""><div class="brand"><b>Quezon City University</b><span>Parking Management System</span></div>
     <div class="tag"><span>Safe Campus</span><span>Organized Parking</span><span>Better Tomorrow</span></div></header>
   <div class="login-main">
    <div class="login-form"><form class="login-card" id="loginform" novalidate>
      <img class="seal big" src="${LOGO}" alt="Quezon City University seal">
      <h1>QUEZON CITY UNIVERSITY<span>Parking Management System</span></h1>
      ${err?`<div class="notice bad" role="alert">${ic('alert')}<span>${esc(err)}</span></div>`:''}
      ${forgot?`<div class="notice" role="status">${ic('info')}<span>Password resets are handled by the system administrator. Visit the IT office with your school ID.</span></div>`:''}
      <div class="field"><label for="u">Username</label><div class="iwrap">${ic('user')}<input class="input" id="u" autocomplete="username" placeholder="Username" value="admin"></div></div>
      <div class="field"><label for="p">Password</label><div class="iwrap">${ic('lock')}<input class="input" id="p" type="password" autocomplete="current-password" placeholder="Password" value="parking2026"><button type="button" class="reveal" data-act="reveal" aria-label="Show password">${ic('eye')}</button></div></div>
      <button class="btn primary block" type="submit" style="min-height:44px">Log in</button>
      <button type="button" class="linkbtn" data-act="forgot">Forgot password?</button>
      <p class="hint" style="text-align:center;font-size:12px;color:var(--muted)">Sign in with your administrator account.</p>
    </form></div>
    <div class="login-art">${art}</div>
   </div></div>`;
}

/* ================= dashboard ================= */
function activityRows(limit){
  const ev=[];
  state.records.forEach(r=>{
    if(r.entry)ev.push({t:r.entry,r,a:r.result==='denied'?'Denied':'Entry'});
    if(r.exit)ev.push({t:r.exit,r,a:'Exit'});
  });
  return ev.sort((a,b)=>b.t-a.t).slice(0,limit);
}
const actPill=a=>a==='Entry'?`<span class="pill info">${ic('entry',13)}Entry</span>`:a==='Exit'?`<span class="pill">${ic('exit',13)}Exit</span>`:`<span class="pill bad">Denied</span>`;
const plate=p=>`<span class="plate">${esc(p)}</span>`;

function vDashboard(){
  const now=new Date(),tr=todayRecs();
  const entries=state.records.filter(r=>r.entry&&r.result!=='denied'&&sameDay(r.entry,now)).length;
  const exits=state.records.filter(r=>r.exit&&sameDay(r.exit,now)).length;
  const fl=flagged().length;
  const inside=state.records.filter(r=>r.entry&&!r.exit&&r.result!=='denied').length;
  const hrs=Array.from({length:13},(_,i)=>6+i);
  const counts=hrs.map(h=>state.records.filter(r=>r.entry&&r.result!=='denied'&&sameDay(r.entry,now)&&r.entry.getHours()===h).length);
  const max=Math.max(1,...counts);
  const lab=h=>(h%12||12)+(h<12?'a':'p');
  const rows=activityRows(7).map(e=>`<tr><td class="num">${fmtTime(e.t)}</td><td>${plate(e.r.plate)}</td><td>${esc(e.r.type)}</td><td>${actPill(e.a)}</td></tr>`).join('');
  return `<div class="phead"><div><h1>Dashboard</h1><p>${fmtDate(now)}. ${inside} vehicle${inside===1?'':'s'} on campus now.</p></div>
   <div class="right"><button class="btn primary" data-act="nav" data-page="gate">${ic('camera')}Open gate monitor</button></div></div>
  <div class="tiles">
   <div class="tile"><span class="ico">${ic('car',20)}</span><span class="lbl">Registered vehicles</span><span class="val">${state.vehicles.length}</span></div>
   <div class="tile"><span class="ico">${ic('entry',20)}</span><span class="lbl">Today's entries</span><span class="val">${entries}</span></div>
   <div class="tile"><span class="ico">${ic('exit',20)}</span><span class="lbl">Today's exits</span><span class="val">${exits}</span></div>
   <button class="tile flag${fl?'':' zero'}" data-act="goto-flagged"><span class="ico">${ic(fl?'alert':'check',20)}</span><span class="lbl">Needs review</span><span class="val">${fl}</span><span class="more">${fl?'Review now':'All clear'}</span></button>
  </div>
  <div class="grid2">
   <div class="stack">
    <section class="card"><header><h2>Recent activity</h2><button class="btn sm" style="margin-left:auto" data-act="nav" data-page="records">View all</button></header>
     <div class="body" style="padding:12px 0 0"><div class="tablewrap"><table><thead><tr><th>Time</th><th>Plate number</th><th>Type</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>
    <section class="card"><header><h2>Entries by hour, today</h2></header><div class="body">
      <div class="bars" role="img" aria-label="Entries per hour from 6 AM to 6 PM. Busiest hour has ${max} entries.">${counts.map((c,i)=>`<div class="col"><div class="bar${c?'':' zero'}" style="height:${c?Math.max(6,c/max*100):2}%" title="${lab(hrs[i])}: ${c} entr${c===1?'y':'ies'}"></div></div>`).join('')}</div>
      <div class="barlbl">${hrs.map((h,i)=>`<span>${i%2===0?lab(h):''}</span>`).join('')}</div></div></section>
   </div>
   <section class="card"><header><h2>System status</h2></header><div class="body"><div class="status">
     <div class="row">${ic('camera')}<span class="t">Camera</span><span class="s pill good"><span class="dot"></span>Online</span></div>
     <div class="row">${ic('barrier')}<span class="t">Gate</span><span class="s pill good" data-gatebadge><span class="dot"></span>Online, ${state.gate.open?'open':'closed'}</span></div>
     <div class="row">${ic('db')}<span class="t">Database</span><span class="s pill good"><span class="dot"></span>Online</span></div>
   </div></div></section>
  </div>`;
}

/* ================= vehicles ================= */
function vehicleTable(){
  const q=state.vq.trim().toLowerCase();
  const list=state.vehicles.filter(v=>{const o=ownerOf(v.plate);return (state.vtype==='all'||o.type===state.vtype)&&(!q||v.plate.toLowerCase().includes(q)||o.owner.toLowerCase().includes(q)||o.type.toLowerCase().includes(q))});
  if(!list.length)return `<div class="empty"><b>No vehicles match</b><span>${state.vehicles.length?'Try a different plate number, owner or type.':'Register the first vehicle to start recognizing plates.'}</span>${state.vehicles.length?`<button class="btn sm" data-act="clear-v">Clear search</button>`:`<button class="btn primary" data-act="add-vehicle">${ic('plus')}Add vehicle</button>`}</div>`;
  return `<div class="tablewrap"><table><thead><tr><th>Plate number</th><th>Owner name</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>${list.map(v=>{const o=ownerOf(v.plate);return `<tr><td>${plate(v.plate)}</td><td>${esc(o.owner)}</td><td>${esc(o.type)}</td><td><span class="pill ${v.status==='Active'?'good':''}">${v.status}</span></td><td><div class="acts"><button class="btn sm" data-act="edit-vehicle" data-id="${esc(v.plate)}" aria-label="Edit ${esc(v.plate)}">${ic('edit',15)}Edit</button><button class="btn sm danger" data-act="del-vehicle" data-id="${esc(v.plate)}" aria-label="Delete ${esc(v.plate)}">Delete</button></div></td></tr>`}).join('')}</tbody></table></div>`;
}
function vVehicles(){
  return `<div class="phead"><div><h1>Vehicle registration</h1><p>Only vehicles listed here are let in automatically.</p></div><div class="right"><button class="btn primary" data-act="add-vehicle">${ic('plus')}Add vehicle</button></div></div>
  <section class="card"><div class="toolbar"><div class="iwrap">${ic('search')}<input class="input" id="vq" data-bind="vq" placeholder="Search by plate number, owner or type" aria-label="Search vehicles" value="${esc(state.vq)}"></div>
   <select class="select" id="vtype" data-bind="vtype" aria-label="Filter by type"><option value="all">All types</option>${['Student','Faculty','Staff'].map(t=>`<option${state.vtype===t?' selected':''}>${t}</option>`).join('')}</select></div>
   <div id="vtable">${vehicleTable()}</div></section>`;
}

/* ================= records ================= */
function filteredRecs(){
  const f=state.rf,q=f.q.trim().toLowerCase();
  return state.records.filter(r=>{
    const t=stamp(r);if(!t)return false;
    if(f.from&&iso(r.entry||r.exit)<f.from)return false;
    if(f.to&&iso(r.entry||r.exit)>f.to)return false;
    if(f.type!=='all'&&r.type!==f.type)return false;
    if(f.status==='inside'&&!(r.entry&&!r.exit&&r.result!=='denied'))return false;
    if(f.status==='flagged'&&!((r.result==='manual'||r.result==='denied')&&!r.reviewed))return false;
    if(q&&!(r.plate.toLowerCase().includes(q)||r.owner.toLowerCase().includes(q)))return false;
    return true}).sort((a,b)=>stamp(b)-stamp(a));
}
function recStatus(r){
  if(r.result==='denied')return `<span class="pill bad">Denied</span>`;
  if(r.result==='manual')return `<span class="pill warn">Manual${r.note?': '+esc(r.note):''}</span>`;
  if(!r.exit)return `<span class="pill good"><span class="dot"></span>On campus</span>`;
  return `<span class="pill">Completed</span>`;
}
function recordsTable(){
  const PS=8,all=filteredRecs(),pages=Math.max(1,Math.ceil(all.length/PS));
  if(state.rf.page>pages)state.rf.page=pages;
  const p=state.rf.page,rows=all.slice((p-1)*PS,p*PS);
  if(!rows.length)return `<div class="empty"><b>No records found</b><span>Change the dates, type or status to see more history.</span><button class="btn sm" data-act="clear-r">Clear filters</button></div>`;
  const cell=d=>d?`<span class="num">${fmtTime(d)}</span><span class="sub">${sameDay(d,new Date())?'Today':fmtDate(d)}</span>`:'<span style="color:var(--muted)">—</span>';
  const body=rows.map(r=>`<tr><td>${plate(r.plate)}</td><td>${esc(r.owner)}</td><td>${esc(r.type)}</td><td>${cell(r.entry)}</td><td>${cell(r.exit)}</td>
   <td class="num">${r.entry&&r.exit?dur(r.entry,r.exit):'<span style="color:var(--muted)">—</span>'}</td>
   <td><div class="acts" style="align-items:center">${recStatus(r)}${(r.result!=='ok'&&!r.reviewed)?`<button class="btn sm" data-act="review" data-id="${r.id}">Mark reviewed</button>`:''}</div></td></tr>`).join('');
  const pg=Array.from({length:pages},(_,i)=>i+1).map(n=>`<button data-act="page" data-n="${n}"${n===p?' aria-current="true"':''}>${n}</button>`).join('');
  return `<div class="tablewrap"><table style="min-width:760px"><thead><tr><th>Plate number</th><th>Owner name</th><th>Type</th><th>Entry</th><th>Exit</th><th>Duration</th><th>Status</th></tr></thead><tbody>${body}</tbody></table></div>
  <div class="pager"><span class="info">Showing ${(p-1)*PS+1}–${(p-1)*PS+rows.length} of ${all.length}</span><button data-act="page" data-n="${p-1}"${p===1?' disabled':''} aria-label="Previous page">‹</button>${pg}<button data-act="page" data-n="${p+1}"${p===pages?' disabled':''} aria-label="Next page">›</button></div>`;
}
function vRecords(){
  const f=state.rf;
  return `<div class="phead"><div><h1>Parking records</h1><p>Every entry and exit the system has logged.</p></div></div>
  <section class="card"><div class="toolbar">
   <label class="sr" for="rfrom">From date</label><input class="input date" type="date" id="rfrom" data-rf="from" value="${f.from}">
   <label class="sr" for="rto">To date</label><input class="input date" type="date" id="rto" data-rf="to" value="${f.to}">
   <select class="select" id="rtype" data-rf="type" aria-label="Filter by type"><option value="all">All types</option>${['Student','Faculty','Staff','Visitor'].map(t=>`<option${f.type===t?' selected':''}>${t}</option>`).join('')}</select>
   <div class="iwrap" style="max-width:260px">${ic('search')}<input class="input" id="rq" data-rf="q" placeholder="Plate or owner" aria-label="Search records" value="${esc(f.q)}"></div></div>
   <div class="toolbar chips" style="border-bottom:1px solid var(--line)" id="rchips">${chips()}</div>
   <div id="rtable">${recordsTable()}</div></section>`;
}
function chips(){const f=state.rf;const n=flagged().length;return [['all','All'],['inside','On campus'],['flagged','Needs review'+(n?' ('+n+')':'')]].map(([k,l])=>`<button class="chip" data-act="rstatus" data-k="${k}" aria-pressed="${f.status===k}">${l}</button>`).join('')}

/* ================= users ================= */
function userTable(){
  const q=state.uq.trim().toLowerCase();
  const list=state.users.filter(u=>!q||u.name.toLowerCase().includes(q)||u.id.toLowerCase().includes(q)||u.role.toLowerCase().includes(q));
  if(!list.length)return `<div class="empty"><b>No users match</b><span>Search by name, ID number or role.</span><button class="btn sm" data-act="clear-u">Clear search</button></div>`;
  return `<div class="tablewrap"><table><thead><tr><th>ID number</th><th>Name</th><th>Role</th><th>Vehicles</th><th>Status</th><th>Actions</th></tr></thead><tbody>${list.map(u=>{const n=state.vehicles.filter(v=>v.userId===u.id).length;return `<tr><td class="mono">${esc(u.id)}</td><td>${esc(u.name)}</td><td>${u.role}</td><td class="num">${n}</td><td><span class="pill ${u.status==='Active'?'good':''}">${u.status}</span></td><td><div class="acts"><button class="btn sm" data-act="edit-user" data-id="${esc(u.id)}" aria-label="Edit ${esc(u.name)}">${ic('edit',15)}Edit</button><button class="btn sm danger" data-act="del-user" data-id="${esc(u.id)}" aria-label="Delete ${esc(u.name)}">Delete</button></div></td></tr>`}).join('')}</tbody></table></div>`;
}
function vUsers(){
  return `<div class="phead"><div><h1>Manage users</h1><p>Students, faculty and staff who can register vehicles.</p></div><div class="right"><button class="btn primary" data-act="add-user">${ic('plus')}Add user</button></div></div>
  <section class="card"><div class="toolbar"><div class="iwrap">${ic('search')}<input class="input" id="uq" data-bind="uq" placeholder="Search by name, ID number or role" aria-label="Search users" value="${esc(state.uq)}"></div></div><div id="utable">${userTable()}</div></section>`;
}

/* ================= settings ================= */
function vSettings(){
  const s=state.settings;
  return `<div class="phead"><div><h1>Settings</h1><p>How the gate monitor behaves and how long records are kept.</p></div></div>
  <div class="set">
  <section class="card"><header><h2>Gate behavior</h2></header><div class="body">
    <div class="setrow"><div><div class="t" id="l1">Open the gate automatically for registered vehicles</div><div class="d">Unregistered, inactive and unclear plates always wait for a guard's decision.</div></div><button class="switch" role="switch" id="s-auto" aria-labelledby="l1" aria-checked="${s.autoOpen}" data-act="toggle-auto"></button></div>
    <div class="setrow"><div><div class="t"><label for="s-close">Keep the gate open for</label></div><div class="d">The gate closes on its own after this many seconds.</div></div><select class="select" id="s-close" style="width:auto">${[5,8,10,15].map(n=>`<option value="${n}"${s.autoClose===n?' selected':''}>${n} seconds</option>`).join('')}</select></div>
    <div class="setrow"><div><div class="t"><label for="s-th">Minimum plate confidence</label></div><div class="d">Readings below this ask the guard to check the plate by hand.</div></div><div style="display:flex;gap:12px;align-items:center"><input type="range" id="s-th" min="60" max="99" value="${s.threshold}"><b class="num" id="s-thv" style="width:42px">${s.threshold}%</b></div></div>
  </div></section>
  <section class="card"><header><h2>Devices</h2></header><div class="body"><div class="status">
    <div class="row">${ic('barrier')}<div><div class="t">Gate barrier</div><div class="d" style="font-size:12.5px;color:var(--muted)">Controller on the gate booth</div></div><span class="s" style="display:flex;gap:10px;align-items:center"><span class="pill good"><span class="dot"></span>Online</span><button class="btn sm" data-act="test" data-d="Gate">Test</button></span></div>
  </div></div></section>
  <section class="card"><header><h2>Records</h2></header><div class="body">
    <div class="setrow"><div><div class="t"><label for="s-ret">Keep parking records for</label></div><div class="d">Older records are removed automatically.</div></div><select class="select" id="s-ret" style="width:auto">${['6 months','1 year','2 years','Forever'].map(n=>`<option${s.retention===n?' selected':''}>${n}</option>`).join('')}</select></div>
  </div></section>
  <div><button class="btn primary" data-act="save-settings">Save changes</button></div>
  </div>`;
}

/* ================= gate ================= */
function camSVG(g){
  const tone={authorized:'good',blocked:'bad',denied:'bad',unclear:'warn',duplicate:'warn',visitor:'warn',scanning:'idle',idle:'idle'}[g.phase]||'idle';
  const hasCar=g.phase!=='idle';
  const txt=g.phase==='scanning'?'···':(g.phase==='unclear'?g.guess:g.plate);
  const arm=g.open?'rotate(-62 560 214)':'rotate(0 560 214)';
  const label=hasCar&&g.phase!=='scanning'?`${g.plate&&g.phase!=='unclear'?g.plate:g.guess} · ${g.conf}%`:'';
  return `<svg viewBox="0 0 640 360" role="img" aria-label="${hasCar?'Camera view: vehicle at the gate':'Camera view: no vehicle at the gate'}">
   <defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a222d"/><stop offset="1" stop-color="#0d1218"/></linearGradient></defs>
   <rect width="640" height="360" fill="url(#gr)"/>
   <path d="M0 250L640 250V360H0z" fill="#161d26"/>
   <g stroke="#2b3644" stroke-width="3" stroke-dasharray="26 22"><path d="M0 318H640"/></g>
   <rect x="552" y="214" width="14" height="96" fill="#44505f"/><rect x="545" y="300" width="28" height="12" fill="#2d3846"/>
   <g transform="${arm}" style="transition:transform .5s"><rect x="40" y="206" width="520" height="12" rx="3" fill="#cfd6e0"/>${[90,170,250,330,410].map(x=>`<rect x="${x}" y="206" width="36" height="12" fill="#d8584c"/>`).join('')}</g>
   ${hasCar?`<ellipse cx="320" cy="304" rx="190" ry="14" fill="#06090d" opacity=".7"/>
   <path d="M150 292V196a42 42 0 0 1 42-42h256a42 42 0 0 1 42 42v96z" fill="#3a4553"/>
   <path d="M196 156l16-52a24 24 0 0 1 23-17h170a24 24 0 0 1 23 17l16 52z" fill="#2b3440"/>
   <path d="M218 150l12-40a12 12 0 0 1 11-8h158a12 12 0 0 1 11 8l12 40z" fill="#161c24"/>
   <ellipse cx="196" cy="222" rx="30" ry="14" fill="#d8dfe9" opacity=".9"/><ellipse cx="444" cy="222" rx="30" ry="14" fill="#d8dfe9" opacity=".9"/>
   <rect x="262" y="206" width="116" height="34" rx="6" fill="#1b2129"/><g stroke="#2f3946" stroke-width="2"><path d="M278 206v34M296 206v34M314 206v34M332 206v34M350 206v34M368 206v34"/></g>
   <rect x="274" y="246" width="92" height="30" rx="3" fill="#f4f1e3"/>
   <text x="320" y="268" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-weight="600" font-size="15.5" letter-spacing="1.2" fill="#1a2333">${esc(txt)}</text>
   <rect x="262" y="236" width="116" height="50" rx="4" fill="none" stroke-width="2.5" class="det-${tone}"${g.phase==='scanning'?' stroke-dasharray="8 6"':''}/>
   ${g.phase==='scanning'?`<rect class="scanline" x="264" y="238" width="112" height="3" fill="#9fb0c6" opacity=".9"/>`:''}
   ${label?`<rect x="262" y="212" width="${label.length*8.4+14}" height="20" rx="3" class="det-${tone}" fill="#0d1218" fill-opacity=".85" stroke-width="1.5"/><text x="269" y="226" font-family="IBM Plex Mono,monospace" font-size="12" fill="#e9eef6">${esc(label)}</text>`:''}`
   :`<text x="320" y="210" text-anchor="middle" font-family="Public Sans,sans-serif" font-size="15" fill="#8696ab">No vehicle at the gate</text>`}
  </svg>`;
}
function vGate(){
  const g=state.gate,s=state.settings;
  const entry=g.dir==='entry';
  const ph=g.phase;
  let banner;
  if(ph==='idle')banner=['idle','camera','Waiting for a vehicle','The camera reads plates as vehicles arrive'];
  else if(ph==='scanning')banner=['idle','clock','Reading plate','Hold on, this takes about a second'];
  else if(ph==='authorized')banner=['good','check','Authorized',g.open||g.logged?(entry?'Entry granted':'Exit recorded'):'Registered vehicle, waiting for the guard to open the gate'];
  else if(ph==='blocked')banner=['bad','alert','Not authorized',g.reason];
  else if(ph==='unclear')banner=['warn','alert','Plate unclear',`Confidence ${g.conf}%, below the ${s.threshold}% minimum`];
  else if(ph==='duplicate')banner=['warn','alert',entry?'Already on campus':'No entry on record',g.reason];
  else if(ph==='visitor')banner=['warn','alert','Let in as visitor','Logged for review in Parking records'];
  else if(ph==='denied')banner=['bad','x','Entry denied','Logged for review in Parking records'];
  const showPlate=ph==='unclear'?g.guess:(g.plate||'— — —');
  const o=g.veh?ownerOf(g.veh.plate):null;
  const ev=g.event;
  /* actions */
  let action='';
  if(ph==='authorized'){
    if(g.open||g.logged)action=`<div class="notice" role="status">${ic('check')}<span>${g.openMode==='auto'?'Gate opened automatically.':'Gate opened by guard.'} It closes in ${s.autoClose} seconds.</span></div>`;
    else action=`<button class="btn good block" style="min-height:48px;font-size:15px" data-act="gate-open">${ic('barrier')}Open gate and record ${entry?'entry':'exit'}</button>`;
  }else if(ph==='blocked'){
    action=`<div class="field"><label for="reason">Reason for letting in</label><select class="select" id="reason" data-bind="reasonSel"><option>Visitor</option><option>Delivery</option><option>Official guest</option><option>Emergency</option></select></div>
    <button class="btn primary block" data-act="gate-visitor">${ic('barrier')}${entry?'Let in as visitor':'Let out'}</button>
    <button class="btn danger block" data-act="gate-deny">${ic('x')}${entry?'Deny entry':'Deny exit'}</button>`;
  }else if(ph==='unclear'){
    action=`<div class="field"><label for="manualplate">Plate number</label><input class="input mono" id="manualplate" data-bind="manual" placeholder="e.g. NAB 1234" value="${esc(g.manualVal||'')}" autocomplete="off">${g.manualErr?`<span class="ferr">${esc(g.manualErr)}</span>`:`<span class="hint">Type what you can read on the plate.</span>`}</div>
    <button class="btn primary block" data-act="gate-recheck">Check plate</button><button class="btn block" data-act="gate-rescan">Scan again</button>`;
  }else if(ph==='duplicate'){
    action=`<button class="btn block" data-act="gate-dismiss">Dismiss</button>`;
  }else if(ph==='visitor'||ph==='denied'){
    action=`<button class="btn block" data-act="gate-dismiss">Ready for next vehicle</button>`;
  }else{
    action=`<button class="btn good block" style="min-height:48px;font-size:15px" disabled>${ic('barrier')}Open gate</button>`;
  }
  const recent=activityRows(5).map(e=>`<div class="r">${plate(e.r.plate)}<span>${e.a}</span><span class="tm">${fmtTime(e.t)}</span></div>`).join('');
  return `<div class="phead"><div><h1>Gate monitor</h1><p>Live plate recognition for the main gate.</p></div>
   <div class="right"><div class="seg" role="group" aria-label="Lane direction"><button data-act="dir" data-d="entry" aria-pressed="${entry}">${ic('entry',16)}Entry</button><button data-act="dir" data-d="exit" aria-pressed="${!entry}">${ic('exit',16)}Exit</button></div>
   <span class="pill ${g.open?'warn':'good'}" data-gatebadge style="min-height:38px;padding:0 14px">${ic('barrier',16)}Gate: ${g.open?'open':'closed'}</span></div></div>
  <div class="gate">
   <section class="card"><div class="cam">${camSVG(g)}<div class="ov top"><span class="live"><i></i>LIVE · Main gate, lane 1</span><span data-clock>${fmtTime(new Date())}</span></div><div class="ov bot"><span>${entry?'ENTRY LANE':'EXIT LANE'}</span><span>Confidence ${g.conf?g.conf+'%':'—'}</span></div></div>
    <div class="plateread"><span class="plate lg">${esc(showPlate)}</span>
     <div class="banner ${banner[0]}" role="status">${ic(banner[1])}<div><b>${banner[2]}</b><span>${esc(banner[3])}</span></div></div></div></section>
   <section class="card"><div class="sect"><h3>Vehicle information</h3>
     ${g.veh&&ph!=='idle'&&ph!=='scanning'?`<dl class="kv"><dt>Owner</dt><dd>${esc(o.owner)}</dd><dt>Type</dt><dd>${esc(o.type)}</dd><dt>Plate</dt><dd class="mono">${esc(g.veh.plate)}</dd><dt>Registration</dt><dd>${g.veh.status}</dd></dl>`:
     `<p style="color:var(--muted)">${ph==='blocked'&&!g.veh?'This plate is not in the registered vehicles list.':ph==='unclear'?'Waiting for a confirmed plate number.':'Details appear when a vehicle is recognized.'}</p>`}</div>
    <div class="sect"><h3>Action</h3>${action}</div>
    <div class="sect"><h3>Log entry</h3><dl class="kv"><dt>Time</dt><dd class="num">${ev?fmtTime(ev.t):'—'}</dd><dt>Date</dt><dd>${ev?fmtDate(ev.t):'—'}</dd><dt>Direction</dt><dd>${ev?(ev.dir==='entry'?'Entry':'Exit'):'—'}</dd><dt>Recorded as</dt><dd>${ev?ev.as:'—'}</dd></dl></div></section>
   <div class="col3 stack">
    <section class="card"><div class="body" style="display:grid;gap:10px"><div><h2>Live camera</h2><p data-camstatus>${esc(cam.status)}</p></div><button class="btn ${cam.on?'danger':'primary'} block" data-act="cam-toggle">${ic('camera')}${cam.on?'Stop camera':'Start camera'}</button></div></section>
    <section class="card demo"><div class="body" style="display:grid;gap:10px"><div><h2>Demo controls</h2><p>Practice without a camera: simulate what the camera sees.</p></div>
     <div class="simbtns"><button class="btn" data-act="sim" data-k="registered">Registered vehicle</button><button class="btn" data-act="sim" data-k="unknown">Unregistered plate</button><button class="btn" data-act="sim" data-k="inactive">Inactive registration</button><button class="btn" data-act="sim" data-k="unclear">Unreadable plate</button></div></div></section>
    <section class="card"><header><h2>Recent scans</h2></header><div class="body"><div class="recent">${recent}</div></div></section>
   </div>
  </div>`;
}

/* gate logic */
let gateTimer=null,scanTimer=null;
const G=()=>state.gate;
function setBadges(){$$('[data-gatebadge]').forEach(el=>{const open=G().open;if(el.closest('.status'))el.innerHTML='<span class="dot"></span>Online, '+(open?'open':'closed');else{el.className='pill '+(open?'warn':'good');el.innerHTML=ic('barrier',16)+'Gate: '+(open?'open':'closed')}})}
function openGate(mode){
  const g=G();g.open=true;g.openMode=mode;clearTimeout(gateTimer);
  gateTimer=setTimeout(()=>{g.open=false;if(state.page==='gate'&&state.auth){if(g.phase==='authorized'){g.phase='idle';g.plate='';g.veh=null;g.conf=0}render()}},state.settings.autoClose*1000);
}
function logEvent(plateStr,as,dir){G().event={t:new Date(),dir,as}}
function recordAuthorized(v){
  const g=G(),now=new Date();
  if(g.dir==='entry'){addRec(v.plate,now,null)}else{const r=isInside(v.plate);if(r)r.exit=now}
  logEvent(v.plate,'Registered vehicle',g.dir);
}
function evaluate(plateStr,conf){
  const g=G(),s=state.settings;g.plate=plateStr;g.conf=conf;g.reason='';g.logged=false;g.open=g.open&&false;
  const v=state.vehicles.find(x=>x.plate===plateStr);g.veh=v||null;
  const inside=isInside(plateStr);
  if(!v){g.phase='blocked';g.reason='Plate is not registered';}
  else if(v.status!=='Active'){g.phase='blocked';g.reason='Registration is inactive';}
  else if(g.dir==='entry'&&inside){g.phase='duplicate';g.reason='In since '+fmtTime(inside.entry)+'. Check for a duplicate read.';}
  else if(g.dir==='exit'&&!inside){g.phase='duplicate';g.reason='This vehicle was never logged coming in.';}
  else{g.phase='authorized';if(s.autoOpen){recordAuthorized(v);g.logged=true;openGate('auto')}}
  render();
}
function simulate(kind){
  const g=G();if(g.phase==='scanning')return;
  const entry=g.dir==='entry';let plateStr,conf=90+Math.floor(Math.random()*9);
  g.kind=kind;g.manualVal='';g.manualErr='';g.logged=false;g.event=null;
  if(kind==='registered'){
    const pool=state.vehicles.filter(v=>v.status==='Active'&&(entry?!isInside(v.plate):!!isInside(v.plate)));
    if(!pool.length){toast(entry?'Every active vehicle is already on campus.':'No registered vehicle is on campus to exit.');return}
    plateStr=pool[Math.floor(Math.random()*pool.length)].plate;
  }else if(kind==='inactive'){const v=state.vehicles.find(x=>x.status==='Inactive');if(!v){toast('No inactive registration in the list.');return}plateStr=v.plate;conf=95}
  else if(kind==='unknown'){
    const open=state.records.find(r=>!entry&&r.result==='manual'&&r.entry&&!r.exit);
    plateStr=open?open.plate:['WRX 4821','CPL 7305','HGT 2290','MNB 6613'][Math.floor(Math.random()*4)];conf=93;
  }else{plateStr='NAB 1234';conf=52+Math.floor(Math.random()*20);g.guess='N?B 1?34'}
  g.phase='scanning';g.plate=plateStr;g.conf=conf;g.veh=null;g.reason='';
  render();clearTimeout(scanTimer);
  scanTimer=setTimeout(()=>{
    if(conf<state.settings.threshold){g.phase='unclear';g.plate='';render()}
    else evaluate(plateStr,conf);
  },900);
}
function logManual(kind){
  const g=G(),now=new Date(),entry=g.dir==='entry';
  const reason=($('#reason')||{}).value||'Visitor';
  if(kind==='visitor'){
    if(entry)addRec(g.plate,now,null,'manual',{note:reason,reviewed:false});
    else{const r=isInside(g.plate);if(r)r.exit=now;else addRec(g.plate,null,now,'manual',{note:reason,reviewed:false})}
    g.phase='visitor';logEvent(g.plate,'Manual: '+reason,g.dir);openGate('manual');
  }else{
    addRec(g.plate,now,null,'denied',{note:'Denied by guard',reviewed:false});
    g.phase='denied';logEvent(g.plate,'Denied',g.dir);
  }
  render();
}
function resetGate(){const g=G();g.phase='idle';g.plate='';g.veh=null;g.conf=0;g.reason='';g.guess='';render()}

/* ================= modals ================= */
function modalHTML(m){
  if(m.type==='vehicle'){
    const v=m.v,e=m.err||{};const u=state.users.find(x=>x.id===v.userId);
    return `<header><h2 id="mt">${m.edit?'Edit vehicle':'Add vehicle'}</h2><button class="iconbtn" data-act="close-modal" aria-label="Close">${ic('x')}</button></header>
    <form id="mform" novalidate>
     <div class="field"><label for="f-plate">Plate number *</label><input class="input mono${e.plate?' err':''}" id="f-plate" placeholder="e.g. ABC 1234" value="${esc(v.plate)}" autocomplete="off"${m.edit?' readonly':''}>${e.plate?`<span class="ferr">${e.plate}</span>`:`<span class="hint">3 letters followed by 3 or 4 digits in any order.</span>`}</div>
     <div class="field"><label for="f-owner">Owner *</label><select class="select${e.owner?' err':''}" id="f-owner"><option value="">Select owner</option>${state.users.map(x=>`<option value="${esc(x.id)}"${x.id===v.userId?' selected':''}>${esc(x.name)} (${esc(x.id)})</option>`).join('')}</select>${e.owner?`<span class="ferr">${e.owner}</span>`:`<span class="hint">Owner isn't listed? <button type="button" class="linkbtn" style="font-size:12px" data-act="add-user-from-vehicle">Add a user first</button></span>`}</div>
     <div class="field"><label>Type</label><div class="readonly" id="f-type">${u?u.role:'Set from the owner'}</div></div>
     <div class="field"><label for="f-status">Status</label><select class="select" id="f-status"><option${v.status==='Active'?' selected':''}>Active</option><option${v.status==='Inactive'?' selected':''}>Inactive</option></select></div>
     <div class="foot"><button type="button" class="btn" data-act="close-modal">Cancel</button><button class="btn primary" type="submit">Save vehicle</button></div></form>`;
  }
  if(m.type==='user'){
    const u=m.u,e=m.err||{};
    return `<header><h2 id="mt">${m.edit?'Edit user':'Add user'}</h2><button class="iconbtn" data-act="close-modal" aria-label="Close">${ic('x')}</button></header>
    <form id="mform" novalidate>
     <div class="field"><label for="f-id">ID number *</label><input class="input mono${e.id?' err':''}" id="f-id" placeholder="e.g. 2024-10001" value="${esc(u.id)}" autocomplete="off"${m.edit?' readonly':''}>${e.id?`<span class="ferr">${e.id}</span>`:''}</div>
     <div class="field"><label for="f-name">Full name *</label><input class="input${e.name?' err':''}" id="f-name" placeholder="First and last name" value="${esc(u.name)}" autocomplete="off">${e.name?`<span class="ferr">${e.name}</span>`:''}</div>
     <div class="field"><label for="f-role">Role</label><select class="select" id="f-role">${['Student','Faculty','Staff'].map(r=>`<option${u.role===r?' selected':''}>${r}</option>`).join('')}</select></div>
     <div class="field"><label for="f-status">Status</label><select class="select" id="f-status"><option${u.status==='Active'?' selected':''}>Active</option><option${u.status==='Inactive'?' selected':''}>Inactive</option></select></div>
     <div class="foot"><button type="button" class="btn" data-act="close-modal">Cancel</button><button class="btn primary" type="submit">Save user</button></div></form>`;
  }
  if(m.type==='confirm'){
    return `<header><h2 id="mt">${esc(m.title)}</h2><button class="iconbtn" data-act="close-modal" aria-label="Close">${ic('x')}</button></header>
    <div class="dbody"><p>${esc(m.text)}</p><div class="foot">${m.blocked?`<button class="btn primary" data-act="close-modal">Got it</button>`:`<button class="btn" data-act="close-modal">Cancel</button><button class="btn danger solid" data-act="confirm-delete">${esc(m.cta)}</button>`}</div></div>`;
  }
  return '';
}
function renderModal(){
  const root=$('#modal-root'),m=state.modal;
  if(!m){root.innerHTML='';return}
  root.innerHTML=`<div class="scrim" data-act="close-modal"></div><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="mt">${modalHTML(m)}</div>`;
  const first=$('.dialog input:not([readonly]), .dialog select, .dialog .btn',root);first&&first.focus();
}
const openModal=m=>{state.modal=m;renderModal()};
const closeModal=()=>{state.modal=null;renderModal()};

function saveVehicle(){
  const m=state.modal,v={plate:$('#f-plate').value,userId:$('#f-owner').value,status:$('#f-status').value};const err={};
  const p=normPlate(v.plate);
  if(!v.plate.trim())err.plate='Enter the plate number.';
  else if(!p)err.plate='Enter a valid plate using 3 letters and 3 to 4 numbers.';
  else if(!m.edit&&state.vehicles.some(x=>x.plate===p))err.plate='This plate is already registered.';
  if(!v.userId)err.owner='Choose the vehicle owner.';
  if(Object.keys(err).length){m.v={...v};m.err=err;renderModal();return}
  if(m.edit){const t=state.vehicles.find(x=>x.plate===m.v.plate);t.userId=v.userId;t.status=v.status;toast('Vehicle updated')}
  else{state.vehicles.push({plate:p,userId:v.userId,status:v.status});toast('Vehicle added')}
  closeModal();render();
}
function saveUser(){
  const m=state.modal,u={id:$('#f-id').value.trim(),name:$('#f-name').value.trim(),role:$('#f-role').value,status:$('#f-status').value};const err={};
  if(!u.id)err.id='Enter the ID number.';else if(!m.edit&&state.users.some(x=>x.id.toLowerCase()===u.id.toLowerCase()))err.id='This ID number already exists.';
  if(!u.name)err.name='Enter the full name.';
  if(Object.keys(err).length){m.u=u;m.err=err;renderModal();return}
  if(m.edit){Object.assign(state.users.find(x=>x.id===u.id),u);toast('User updated')}
  else{state.users.push(u);toast('User added')}
  if(m.returnToVehicle){const vv=m.returnToVehicle;vv.userId=u.id;state.modal={type:'vehicle',v:vv,edit:false};renderModal();render();return}
  closeModal();render();
}

/* ================= render ================= */
function render(){
  const app=$('#app');
  if(!state.auth){app.innerHTML=vLogin(state.loginErr,state.forgot);return}
  const views={dashboard:vDashboard,gate:vGate,vehicles:vVehicles,records:vRecords,users:vUsers,settings:vSettings};
  app.innerHTML=shell(views[state.page]());
}
function go(p){
  if(!TITLES[p])p='dashboard';
  state.page=p;state.navOpen=false;
  try{if(location.hash!=='#'+p)history.replaceState(null,'','#'+p)}catch(e){}
  render();scrollTo(0,0);
}

/* ================= events ================= */
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');if(!t)return;
  const a=t.dataset.act;
  if(a==='nav'){e.preventDefault();go(t.dataset.page)}
  else if(a==='nav-toggle'){state.navOpen=!state.navOpen;render()}
  else if(a==='nav-close'){state.navOpen=false;render()}
  else if(a==='logout'){persist().finally(()=>api('/api/logout','POST'));state.auth=false;state.loginErr='';state.forgot=false;render()}
  else if(a==='theme'){state.theme=isDark()?'light':'dark';applyTheme();render()}
  else if(a==='reveal'){const p=$('#p');const show=p.type==='password';p.type=show?'text':'password';t.innerHTML=ic(show?'eyeoff':'eye');t.setAttribute('aria-label',show?'Hide password':'Show password')}
  else if(a==='forgot'){state.forgot=true;state.loginErr='';const u=$('#u').value,p=$('#p').value;render();$('#u').value=u;$('#p').value=p}
  else if(a==='goto-flagged'){state.rf={from:'',to:'',type:'all',status:'flagged',q:'',page:1};go('records')}
  /* vehicles */
  else if(a==='add-vehicle')openModal({type:'vehicle',v:{plate:'',userId:'',status:'Active'},edit:false});
  else if(a==='edit-vehicle'){const v=state.vehicles.find(x=>x.plate===t.dataset.id);openModal({type:'vehicle',v:{...v},edit:true})}
  else if(a==='del-vehicle'){openModal({type:'confirm',kind:'vehicle',id:t.dataset.id,title:'Delete this vehicle?',text:`${t.dataset.id} will no longer be recognized at the gate. Past parking records stay.`,cta:'Delete vehicle'})}
  else if(a==='clear-v'){state.vq='';state.vtype='all';render()}
  else if(a==='add-user-from-vehicle'){const vv={plate:$('#f-plate').value,userId:'',status:$('#f-status').value};openModal({type:'user',u:{id:'',name:'',role:'Student',status:'Active'},edit:false,returnToVehicle:vv})}
  /* users */
  else if(a==='add-user')openModal({type:'user',u:{id:'',name:'',role:'Student',status:'Active'},edit:false});
  else if(a==='edit-user'){const u=state.users.find(x=>x.id===t.dataset.id);openModal({type:'user',u:{...u},edit:true})}
  else if(a==='del-user'){const u=state.users.find(x=>x.id===t.dataset.id);const n=state.vehicles.filter(v=>v.userId===u.id).length;
    if(n)openModal({type:'confirm',blocked:true,title:'Can\'t delete this user',text:`${u.name} still has ${n} registered vehicle${n>1?'s':''}. Delete or reassign ${n>1?'them':'it'} first.`});
    else openModal({type:'confirm',kind:'user',id:u.id,title:'Delete this user?',text:`${u.name} (${u.id}) will be removed from the system.`,cta:'Delete user'})}
  else if(a==='clear-u'){state.uq='';render()}
  else if(a==='confirm-delete'){const m=state.modal;
    if(m.kind==='vehicle'){state.vehicles=state.vehicles.filter(v=>v.plate!==m.id);toast('Vehicle deleted')}
    else{state.users=state.users.filter(u=>u.id!==m.id);toast('User deleted')}
    closeModal();render()}
  else if(a==='close-modal')closeModal();
  /* records */
  else if(a==='rstatus'){state.rf.status=t.dataset.k;state.rf.page=1;$('#rchips').innerHTML=chips();$('#rtable').innerHTML=recordsTable()}
  else if(a==='page'){const n=+t.dataset.n;if(n>0){state.rf.page=n;$('#rtable').innerHTML=recordsTable()}}
  else if(a==='review'){const r=state.records.find(x=>x.id==t.dataset.id);r.reviewed=true;toast('Marked as reviewed');render()}
  else if(a==='clear-r'){state.rf={from:'',to:'',type:'all',status:'all',q:'',page:1};render()}
  /* gate */
  else if(a==='dir'){if(G().phase!=='scanning'){G().dir=t.dataset.d;resetGate()}}
  else if(a==='sim')simulate(t.dataset.k);
  else if(a==='gate-open'){recordAuthorized(G().veh);G().logged=true;openGate('manual');render()}
  else if(a==='gate-visitor')logManual('visitor');
  else if(a==='gate-deny')logManual('deny');
  else if(a==='gate-dismiss')resetGate();
  else if(a==='gate-rescan'){const k=G().kind;resetGate();if(k==='live')cam.cool={};else simulate(k==='unclear'?'registered':k)}
  else if(a==='gate-recheck'){const g=G(),p=normPlate(g.manualVal);if(!p){g.manualErr='Use 3 letters and 3 or 4 digits, like NAB 1234.';render();const i=$('#manualplate');i&&(i.focus(),i.setSelectionRange(99,99))}else{g.manualErr='';evaluate(p,100)}}
  /* settings */
  else if(a==='toggle-auto'){const b=t;const on=b.getAttribute('aria-checked')!=='true';b.setAttribute('aria-checked',on)}
  else if(a==='save-settings'){const s=state.settings;s.autoOpen=$('#s-auto').getAttribute('aria-checked')==='true';s.autoClose=+$('#s-close').value;s.threshold=+$('#s-th').value;s.retention=$('#s-ret').value;toast('Settings saved')}
  else if(a==='cam-toggle'){cam.on?(stopCam(),render()):startCam()}
  else if(a==='test'){toast(t.dataset.d+' responded normally (simulated)')}
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.bind==='vq'){state.vq=t.value;$('#vtable').innerHTML=vehicleTable()}
  else if(t.dataset.bind==='uq'){state.uq=t.value;$('#utable').innerHTML=userTable()}
  else if(t.dataset.bind==='manual'){G().manualVal=t.value}
  else if(t.dataset.rf){state.rf[t.dataset.rf]=t.value;state.rf.page=1;$('#rtable').innerHTML=recordsTable()}
  else if(t.id==='s-th'){$('#s-thv').textContent=t.value+'%'}
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset.bind==='vtype'){state.vtype=t.value;$('#vtable').innerHTML=vehicleTable()}
  else if(t.id==='f-owner'){const u=state.users.find(x=>x.id===t.value);$('#f-type').textContent=u?u.role:'Set from the owner'}
  else if(t.dataset.rf){state.rf[t.dataset.rf]=t.value;state.rf.page=1;$('#rtable').innerHTML=recordsTable()}
});
document.addEventListener('submit',e=>{
  e.preventDefault();
  if(e.target.id==='loginform'){
    const u=$('#u').value.trim(),p=$('#p').value;
    if(!u||!p){state.loginErr=!u?'Enter your username.':'Enter your password.';state.forgot=false;render();$('#'+(!u?'u':'p')).value='';return}
    api('/api/login','POST',{username:u,password:p}).then(()=>loadState()).then(()=>{state.auth=true;state.loginErr='';state.forgot=false;const h=(location.hash||'').slice(1);go(TITLES[h]?h:'dashboard')}).catch(()=>{state.loginErr='Incorrect username or password.';state.forgot=false;render()});
  }else if(e.target.id==='mform'){state.modal.type==='vehicle'?saveVehicle():saveUser()}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.modal)closeModal()});
addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(state.auth&&TITLES[h]&&h!==state.page){state.page=h;state.navOpen=false;render()}});
setInterval(()=>{$$('[data-clock]').forEach(el=>el.textContent=fmtTime(new Date()))},15000);
try{const h=location.hash.slice(1);if(TITLES[h])state.page=h}catch(e){}
/* ================= live camera + plate recognition ================= */
/* The browser grabs a frame about once a second and sends it to /api/recognize.
   The same plate must be read twice in a row before the gate decision runs. */
const cam={on:false,stream:null,busy:false,status:'Camera is off. Start it to read plates live.',last:null,streak:0,cool:{}};
const camWrap=document.createElement('div');camWrap.id='camwrap';
camWrap.innerHTML='<video playsinline muted autoplay></video><div class="detbox"></div><div class="dettag"></div>';
const camVideo=camWrap.firstChild,camBox=camWrap.children[1],camTag=camWrap.children[2];
function setCamStatus(t){cam.status=t;const e=$('[data-camstatus]');if(e)e.textContent=t}
function drawBox(b,label){
  if(!b||!camVideo.videoWidth){camBox.style.display=camTag.style.display='none';return}
  const cw=camWrap.clientWidth,ch=camWrap.clientHeight,vw=camVideo.videoWidth,vh=camVideo.videoHeight;
  const sc=Math.max(cw/vw,ch/vh),ox=(cw-vw*sc)/2,oy=(ch-vh*sc)/2;
  const x=ox+b[0]*vw*sc,y=oy+b[1]*vh*sc,w=b[2]*vw*sc,h=b[3]*vh*sc;
  Object.assign(camBox.style,{display:'block',left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
  camTag.textContent=label;Object.assign(camTag.style,{display:'block',left:x+'px',top:Math.max(0,y-24)+'px'});
}
async function startCam(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){setCamStatus('This browser cannot use the camera. Open http://127.0.0.1:5000 in Chrome or Edge.');return}
  try{
    cam.stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false});
    camVideo.srcObject=cam.stream;cam.on=true;cam.last=null;cam.streak=0;cam.status='Camera on. Point it at a plate.';
  }catch(e){cam.status='Camera blocked or not found. Allow camera access in the browser, then try again.'}
  render();
}
function stopCam(){
  cam.on=false;if(cam.stream)cam.stream.getTracks().forEach(t=>t.stop());
  cam.stream=null;camVideo.srcObject=null;drawBox(null);cam.status='Camera is off. Start it to read plates live.';
}
/* put the live video into the gate screen after every redraw */
const _render=render;
render=function(){
  _render();
  if(cam.on&&(!state.auth||state.page!=='gate'))stopCam();
  const c=$('.cam');if(!c||!cam.on)return;
  const svg=c.querySelector('svg');if(svg)svg.style.display='none';
  c.insertBefore(camWrap,c.firstChild);camVideo.play().catch(()=>{});
};
function onRead(d){
  if(!d.found){cam.streak=0;cam.last=null;drawBox(null);setCamStatus('Looking for a plate…');return}
  drawBox(d.box,d.plate+' · '+d.confidence+'%');
  const now=Date.now();
  if(cam.cool[d.plate]&&now-cam.cool[d.plate]<20000){setCamStatus(d.plate+' was just handled.');return}
  cam.streak=cam.last===d.plate?cam.streak+1:1;cam.last=d.plate;
  if(cam.streak<2){setCamStatus('Reading '+d.plate+'…');return}
  cam.cool[d.plate]=now;cam.streak=0;cam.last=null;
  const g=G();g.kind='live';g.manualVal='';g.manualErr='';g.logged=false;g.event=null;
  if(d.confidence<state.settings.threshold){g.phase='unclear';g.plate='';g.conf=d.confidence;g.guess=d.plate;render()}
  else evaluate(d.plate,d.confidence);
  if(cam.on)setCamStatus('Plate '+d.plate+' read.');
}
async function camTick(){
  if(!cam.on||cam.busy||!state.auth||document.hidden||G().phase!=='idle'||camVideo.readyState<2||!camVideo.videoWidth)return;
  cam.busy=true;
  try{
    const w=Math.min(960,camVideo.videoWidth),h=Math.round(w*camVideo.videoHeight/camVideo.videoWidth);
    const cv=cam.cv||(cam.cv=document.createElement('canvas'));cv.width=w;cv.height=h;
    cv.getContext('2d').drawImage(camVideo,0,0,w,h);
    const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.85));
    const res=await fetch('/api/recognize',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob});
    const d=await res.json();
    if(!cam.on)return;
    if(d.error){stopCam();cam.status=d.error;render();return}
    if(d.loading){setCamStatus('Loading the plate recognition model (first start only)…');return}
    onRead(d);
  }catch(e){setCamStatus('Cannot reach the server.')}
  finally{cam.busy=false}
}
setInterval(camTick,600);

/* ================= backend sync (Flask + SQLite) ================= */
async function api(url,method='GET',body){
  const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!r.ok)throw new Error(r.status);return r.json();
}
const snap=()=>JSON.stringify({users:state.users,vehicles:state.vehicles,records:state.records,settings:state.settings});
let lastSnap='',saving=false;
async function loadState(){
  const d=await api('/api/state');
  state.users=d.users;state.vehicles=d.vehicles;Object.assign(state.settings,d.settings);
  state.records=d.records.map(r=>({...r,entry:r.entry?new Date(r.entry):null,exit:r.exit?new Date(r.exit):null}));
  rid=state.records.reduce((m,r)=>Math.max(m,r.id),0)+1;lastSnap=snap();
}
/* every change made on screen is saved to the database within a second */
async function persist(){
  if(!state.auth||saving)return;const s=snap();if(s===lastSnap)return;
  saving=true;try{await api('/api/state','PUT',JSON.parse(s));lastSnap=s}catch(e){console.error('Save failed',e)}finally{saving=false}
}
setInterval(persist,1000);
/* start: if a login session already exists, go straight in */
loadState().then(()=>{state.auth=true;render()}).catch(()=>render());
