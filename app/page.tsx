'use client';
import {useEffect,useRef,useState} from 'react';
import {schedule} from '@/lib/demo';
import {LogIn,LogOut,SprayCan,Command,Search,X,Zap,AlertTriangle,CheckCircle2,Wrench,MessageSquare,Sparkles,LayoutDashboard,Home as HomeIcon,Inbox,Bot,KeyRound,ArrowUp,ShieldCheck,Gauge,Activity,Radio} from 'lucide-react';

type Issue={id:string;property:string;guest:string;summary:string;category:string;priority:string;status:string;assignee:string};
type Prop={id:string;name:string;score:number;review:boolean;city:string};

function Rich({text}:{text:string}){
 const out:any[]=[]; const re=/\[([^\]]+)\]\((https:\/\/app\.ownerrez\.com\/[^\s)]+)\)|\*\*([^*]+)\*\*/g; let last=0,m:RegExpExecArray|null,i=0;
 while((m=re.exec(text))){ if(m.index>last)out.push(text.slice(last,m.index)); out.push(m[1]?<a key={i++} href={m[2]} target="_blank" rel="noopener noreferrer">{m[1]}</a>:<b key={i++}>{m[3]}</b>); last=m.index+m[0].length; }
 if(last<text.length)out.push(text.slice(last)); return <>{out}</>;
}
const label=(c:string)=>c.replace(/_/g,' ').replace(/\b\w/g,s=>s.toUpperCase());
const initials=(n:string)=>n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
function greeting(){const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening'}

export default function Home(){
 const [issues,setIssues]=useState<Issue[]>([]); const [props,setProps]=useState<Prop[]>([]);
 const [hist,setHist]=useState<{q:string;a:string}[]>([]); const [q,setQ]=useState(''); const [reply,setReply]=useState(''); const [asked,setAsked]=useState(''); const [mode,setMode]=useState('demo'); const [key,setKey]=useState(''); const [loading,setLoading]=useState(false); const [ready,setReady]=useState(false); const [today,setToday]=useState('');
 const askRef=useRef<HTMLElement>(null);
 const [palette,setPalette]=useState(false); const [pq,setPq]=useState(''); const [feed,setFeed]=useState<{t:string;msg:string;tag:string}[]>([]);
 useEffect(()=>{const h=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setPalette(p=>!p)}if(e.key==='Escape')setPalette(false)};addEventListener('keydown',h);return()=>removeEventListener('keydown',h)},[]);
 useEffect(()=>{if(!issues.length)return;const ev=[...issues.map(i=>({msg:`Classified “${i.summary.slice(0,42)}${i.summary.length>42?'…':''}”`,tag:`${label(i.category)} · ${Math.round(((i as any).confidence||.9)*100)}%`})),{msg:'Synced listings across Airbnb, Vrbo & direct',tag:'Channel sync'},{msg:'Checked tomorrow’s arrivals for missing verifications',tag:'Pre-arrival'},{msg:'Scored property info completeness',tag:'Health check'}];let n=0;const push=()=>{const e=ev[n%ev.length];n++;setFeed(f=>[{t:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}),...e},...f].slice(0,6))};push();push();push();const id=setInterval(push,3500);return()=>clearInterval(id)},[issues]);
 const hdrs=(k:string):Record<string,string>=>k?{'x-rezai-key':k}:{};
 function load(k:string){fetch('/api/operations',{headers:hdrs(k)}).then(r=>r.json()).then(d=>{setIssues(d.issues);setProps(d.properties);setMode(d.mode);setReady(true)}).catch(()=>setReady(true))}
 useEffect(()=>{let k='';try{k=sessionStorage.getItem('rezai-key')||''}catch{};setKey(k);load(k);setToday(new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}))},[]);
 function saveKey(k:string){setKey(k);try{k?sessionStorage.setItem('rezai-key',k):sessionStorage.removeItem('rezai-key')}catch{};load(k)}
 async function ask(forced?:string){const text=(typeof forced==='string'?forced:q).trim();if(!text||loading)return;setLoading(true);setAsked(text);setReply('');setQ('');try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json',...hdrs(key)},body:JSON.stringify({message:text,history:hist})});const d=await r.json();const a=d.reply||d.error||'No response.';setReply(a);setHist(h=>[...h.slice(-3),{q:text,a}])}catch{setReply('Something went wrong. Please try again.')}finally{setLoading(false)}}
 const open=issues.filter(i=>i.status!=='resolved');
 const health=props.length?Math.round(props.reduce((a,p)=>a+p.score,0)/props.length):0;
 const live=mode==='ownerrez';
 const hi=open.filter(i=>i.priority==='high'||i.priority==='critical');const rv=props.filter(p=>p.review);const sameDay=schedule.filter(x=>x.sameDay).length;
 const insight=!ready?'':`${hi.length?`${hi.length} high-priority ${hi.length>1?'issues need':'issue needs'} attention${hi[0]?`, starting with ${hi[0].property}`:''}.`:'No high-priority issues right now.'} ${!live&&sameDay?`${sameDay} same-day turnover at ${schedule.find(x=>x.sameDay)?.property}, so cleaning needs to wrap by 3 PM.`:''} ${rv.length?`${rv[0].name} is missing listing details.`:''}`.replace(/\s+/g,' ').trim();
 const runPalette=(t:string)=>{setPalette(false);setPq('');document.getElementById('ask')?.scrollIntoView({behavior:'smooth'});ask(t)};
 const metrics=[
  {label:'Open issues',value:open.length,icon:<Inbox size={18}/>,note:open.filter(i=>i.priority==='high'||i.priority==='critical').length+' high priority',tone:'rose'},
  {label:'Property health',value:props.length?health+'%':'—',icon:<Gauge size={18}/>,note:props.length+' properties tracked',tone:'plum',bar:health},
  {label:'Needs review',value:props.filter(p=>p.review).length,icon:<ShieldCheck size={18}/>,note:'Missing listing info',tone:'sand'},
  {label:'Routing confidence',value:'94%',icon:<Activity size={18}/>,note:'AI triage accuracy',tone:'ink',bar:94},
 ];
 return <div className="shell">
  <aside className="side">
   <div className="brand"><img src="/logo-mark.png" alt="" className="logo-img"/><div><b>Rez<span className="ai-grad">AI</span></b><small>Vacation Rental Copilot</small></div></div>
   <nav>
    <a className="on" href="#top"><LayoutDashboard size={17}/>Overview</a>
    <a href="#attention"><Inbox size={17}/>Needs attention<span className="count">{open.length}</span></a>
    <a href="#health"><HomeIcon size={17}/>Properties</a>
    <a href="#ask" onClick={()=>setTimeout(()=>askRef.current?.querySelector('input')?.focus(),300)}><Bot size={17}/>Ask RezAI</a>
   </nav>
   <button className="side-k" onClick={()=>setPalette(true)}><Search size={15}/>Search or ask<kbd>⌘K</kbd></button>
   <div className="side-foot">
    <div className={'mode '+(live?'live':'')}><Radio size={14}/>{live?'Live OwnerRez':'Demo data'}</div>
    <label className="keybox"><KeyRound size={14}/><input type="password" aria-label="Team key" placeholder="Team key for live data" onKeyDown={e=>{if(e.key==='Enter')saveKey((e.target as HTMLInputElement).value.trim())}}/></label>
   </div>
  </aside>

  <main className="main" id="top">
   <header className="top">
    <div><p className="date">{today}</p><h1>{greeting()}, team</h1><p className="lead">Here&apos;s what needs you across your rentals today.</p></div>
    <button className="cta" onClick={()=>{document.getElementById('ask')?.scrollIntoView({behavior:'smooth'});ask('Daily briefing for today')}}><Sparkles size={16}/>Get today&apos;s briefing</button>
   </header>

   <div className="insight"><span className="in-ico"><Zap size={16}/></span><div><b>RezAI insight</b><p>{insight||<span className="sk w60"/>}</p></div><button onClick={()=>setPalette(true)} className="kbd-btn"><Command size={13}/>K</button></div>

   <section className="metrics">
    {metrics.map((m,i)=><div key={m.label} className={'metric '+m.tone} style={{animationDelay:i*70+'ms'}}>
     <div className="m-top"><span>{m.label}</span><i>{m.icon}</i></div>
     <div className="m-val">{ready?m.value:<span className="sk w40"/>}</div>
     {m.bar!==undefined?<div className="bar"><span style={{width:(ready?m.bar:0)+'%'}}/></div>:<div className="m-note">{m.note}</div>}
     {m.bar!==undefined&&<div className="m-note">{m.note}</div>}
    </div>)}
   </section>

   <div className="grid">
    <section className="card" id="attention">
     <div className="c-head"><h2>Needs attention</h2><span className="pill">{open.length} open</span></div>
     {!ready&&[0,1,2].map(i=><div key={i} className="item"><span className="sk circle"/><div style={{flex:1}}><span className="sk w80"/><span className="sk w50"/></div></div>)}
     {ready&&open.length===0&&<div className="empty"><CheckCircle2 size={22}/>All clear. Nothing needs you right now.</div>}
     {open.map(i=><div key={i.id} className="item">
      <span className={'ico '+(i.category==='maintenance'?'maint':'msg')}>{i.category==='maintenance'?<Wrench size={16}/>:<MessageSquare size={16}/>}</span>
      <div className="it-body"><b>{i.summary}</b><div className="meta"><span>{i.property}</span><span className="tag">{label(i.category)}</span></div></div>
      <div className="it-side"><span className={'prio '+i.priority}>{i.priority}</span><span className="av" title={i.assignee}>{initials(i.assignee)}</span></div>
     </div>)}
    </section>

    <section className="card" id="health">
     <div className="c-head"><h2>Property health</h2><span className="pill">{props.length} properties</span></div>
     {!ready&&[0,1,2,3].map(i=><div key={i} className="prop"><div style={{flex:1}}><span className="sk w60"/><span className="sk w30"/></div></div>)}
     {props.map(p=><div key={p.id} className="prop">
      <span className={'ico '+(p.review?'warn':'ok')}>{p.review?<AlertTriangle size={16}/>:<CheckCircle2 size={16}/>}</span>
      <div className="pr-body"><div className="pr-row"><b>{p.name}</b><strong>{p.score}%</strong></div><div className="meter"><span className={p.review?'low':''} style={{width:p.score+'%'}}/></div><div className="meta"><span>{p.city}</span><span>{p.review?'Needs information review':'All tracked fields present'}</span></div></div>
     </div>)}
    </section>
   </div>

   <div className="grid two">
    <section className="card">
     <div className="c-head"><h2>Today&apos;s timeline</h2><span className="pill">{live?'live':'demo'} · {schedule.length} events</span></div>
     {live?<div className="empty muted">Ask RezAI “Daily briefing for today” for the live schedule.</div>:<div className="tl">{schedule.map((x,i)=><div key={i} className={'tl-row '+x.type}><span className="tl-time">{x.time}</span><span className="tl-dot">{x.type==='checkin'?<LogIn size={14}/>:x.type==='checkout'?<LogOut size={14}/>:<SprayCan size={14}/>}</span><div className="tl-body"><b>{x.type==='checkin'?'Check-in':x.type==='checkout'?'Checkout':'Turnover clean'} · {x.property}</b><span>{x.guest}{x.sameDay&&<em className="flag">Same-day turnover</em>}</span></div></div>)}</div>}
    </section>
    <section className="card feed">
     <div className="c-head"><h2><span className="live-dot"/>AI activity</h2><span className="pill">real-time</span></div>
     {feed.map((f,i)=><div key={f.t+i} className="fd-row"><span className="fd-time">{f.t}</span><div><b>{f.msg}</b><span className="fd-tag">{f.tag}</span></div></div>)}
    </section>
   </div>

   <section className="card ask" id="ask" ref={askRef}>
    <div className="c-head"><h2><Bot size={20}/>Ask RezAI</h2><span className="pill soft">Powered by Gemini</span></div>
    <p className="sub">Ask about check-ins, turnovers, bookings, maintenance or a quick daily triage.</p>
    <div className="chips">{['What happened today','Daily briefing for today','Who is checking out tomorrow','Same-day turnovers today'].map(t=><button key={t} onClick={()=>ask(t)}>{t}</button>)}</div>
    {(asked||loading)&&<div className="convo">
     {asked&&<div className="bubble me">{asked}</div>}
     <div className="bubble ai"><span className="ai-ico"><Sparkles size={14}/></span><div>{loading?<span className="typing"><i/><i/><i/></span>:<Rich text={reply}/>}</div></div>
    </div>}
    <div className="composer"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()} placeholder="Try: who's checking out tomorrow? · booking 12345 · daily briefing"/><button onClick={()=>ask()} disabled={loading||!q.trim()} aria-label="Send"><ArrowUp size={18}/></button></div>
   </section>

   <footer>RezAI · Portfolio build by Czarina Gonzales · Human approval is required before any operational action</footer>
  </main>
  {palette&&<div className="pal-bg" onClick={()=>setPalette(false)}><div className="pal" onClick={e=>e.stopPropagation()}>
   <div className="pal-in"><Search size={18}/><input autoFocus value={pq} onChange={e=>setPq(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&pq.trim())runPalette(pq)}} placeholder="Ask RezAI anything, or pick an action…"/><button onClick={()=>setPalette(false)} aria-label="Close"><X size={16}/></button></div>
   <div className="pal-list"><small>Suggested</small>{['Daily briefing for today','Who is checking out tomorrow','Same-day turnovers today','What happened today','Which properties need review'].filter(t=>t.toLowerCase().includes(pq.toLowerCase())).map(t=><button key={t} onClick={()=>runPalette(t)}><Sparkles size={15}/>{t}<kbd>↵</kbd></button>)}{pq.trim()&&<button onClick={()=>runPalette(pq)}><Bot size={15}/>Ask: “{pq}”<kbd>↵</kbd></button>}</div>
  </div></div>}
 </div>
}
