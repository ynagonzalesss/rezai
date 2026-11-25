'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {schedule,occupancy,messages,missingInfo,incoming} from '@/lib/demo';
import {LogIn,LogOut,SprayCan,Command,Search,X,Zap,AlertTriangle,CheckCircle2,Wrench,MessageSquare,Sparkles,LayoutDashboard,Home as HomeIcon,Inbox,Bot,KeyRound,ArrowUp,Gauge,Activity,Radio,Send,UserRound,Clock,Moon,Sun,Bell,ArrowRight,CircleDot,Check} from 'lucide-react';

type Issue={id:string;property:string;guest:string;summary:string;category:string;priority:string;status:string;assignee:string;confidence?:number;message?:string};
type Prop={id:string;name:string;score:number;review:boolean;city:string};
type Toast={id:number;title:string;body:string};

function Rich({text}:{text:string}){
 const out:any[]=[]; const re=/\[([^\]]+)\]\((https:\/\/app\.ownerrez\.com\/[^\s)]+)\)|\*\*([^*]+)\*\*/g; let last=0,m:RegExpExecArray|null,i=0;
 while((m=re.exec(text))){ if(m.index>last)out.push(text.slice(last,m.index)); out.push(m[1]?<a key={i++} href={m[2]} target="_blank" rel="noopener noreferrer">{m[1]}</a>:<b key={i++}>{m[3]}</b>); last=m.index+m[0].length; }
 if(last<text.length)out.push(text.slice(last)); return <>{out}</>;
}
const label=(c:string)=>c.replace(/_/g,' ').replace(/\b\w/g,s=>s.toUpperCase());
const initials=(n:string)=>n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
const TEAM=['Maya Reyes','Jordan Lee','Sam Carter'];
function greeting(){const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening'}
function suggest(i:Issue){
 const first='Hi there,';
 switch(i.category){
  case 'maintenance':return `${first}\n\nThanks for letting us know, and sorry for the trouble. I've dispatched our maintenance team to ${i.property} and they'll reach out with an arrival time shortly. In the meantime, please make sure the windows are closed and the thermostat is set to Cool.\n\nWe'll keep you updated!`;
  case 'check_in_out':return `${first}\n\nGreat question! Let me check the cleaning schedule for ${i.property} and confirm within the hour.\n\nThanks for your patience!`;
  case 'housekeeping':return `${first}\n\nAbsolutely! Our housekeeping team will drop those off at ${i.property} today. Let us know if there's anything else you need.`;
  case 'management_escalation':return `${first}\n\nThanks for your patience. Your ID was received and it's in the final review step. You'll get your door code as soon as it's approved, well before check-in. If it isn't cleared by tomorrow morning, I'll follow up personally.`;
  default:return `${first}\n\nThanks for reaching out! I'm looking into this now and will get back to you shortly.`;
 }
}
function Spark({data}:{data:number[]}){
 const w=260,h=70,max=100,min=50;const pts=data.map((v,i)=>[i*(w/(data.length-1)),h-((v-min)/(max-min))*h]);
 const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
 return <svg viewBox={`0 0 ${w} ${h+6}`} className="spark" preserveAspectRatio="none"><defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#14b8a6" stopOpacity=".35"/><stop offset="1" stopColor="#14b8a6" stopOpacity="0"/></linearGradient></defs><path d={d+` L${w} ${h+6} L0 ${h+6}Z`} fill="url(#sg)"/><path d={d} fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="4" fill="#6366f1"/></svg>;
}

export default function Home(){
 const [issues,setIssues]=useState<Issue[]>([]); const [props,setProps]=useState<Prop[]>([]);
 const [hist,setHist]=useState<{q:string;a:string}[]>([]); const [q,setQ]=useState(''); const [reply,setReply]=useState(''); const [asked,setAsked]=useState(''); const [mode,setMode]=useState('demo'); const [key,setKey]=useState(''); const [loading,setLoading]=useState(false); const [ready,setReady]=useState(false); const [today,setToday]=useState('');
 const [palette,setPalette]=useState(false); const [pq,setPq]=useState(''); const [feed,setFeed]=useState<{t:string;msg:string;tag:string}[]>([]);
 const [openIssue,setOpenIssue]=useState<string|null>(null); const [openProp,setOpenProp]=useState<string|null>(null); const [draft,setDraft]=useState('');
 const [toasts,setToasts]=useState<Toast[]>([]); const [dark,setDark]=useState(false); const [authed,setAuthed]=useState(true); const [responded,setResponded]=useState<number[]>([]);
 const askRef=useRef<HTMLElement>(null);
 const hdrs=(k:string):Record<string,string>=>k?{'x-rezai-key':k}:{};
 const stamp=()=>new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
 const log=(msg:string,tag:string)=>setFeed(f=>[{t:stamp(),msg,tag},...f].slice(0,6));
 const toast=(title:string,body:string)=>{const id=Date.now()+Math.random();setToasts(t=>[...t,{id,title,body}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4800)};
 function load(k:string){fetch('/api/operations',{headers:hdrs(k)}).then(r=>r.json()).then(d=>{setIssues(d.issues.map((i:Issue)=>({...i,message:messages[i.id]})));setProps(d.properties);setMode(d.mode);setReady(true)}).catch(()=>setReady(true))}
 useEffect(()=>{let k='';try{k=sessionStorage.getItem('rezai-key')||'';setAuthed(sessionStorage.getItem('rezai-in')==='1');setDark(localStorage.getItem('rezai-theme')==='dark')}catch{};setKey(k);load(k);setToday(new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}))},[]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('rezai-theme',dark?'dark':'light')}catch{}},[dark]);
 function saveKey(k:string){setKey(k);try{k?sessionStorage.setItem('rezai-key',k):sessionStorage.removeItem('rezai-key')}catch{};load(k)}
 function signIn(k?:string){setAuthed(true);try{sessionStorage.setItem('rezai-in','1')}catch{};if(k)saveKey(k)}
 async function ask(forced?:string){const text=(typeof forced==='string'?forced:q).trim();if(!text||loading)return;setLoading(true);setAsked(text);setReply('');setQ('');try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json',...hdrs(key)},body:JSON.stringify({message:text,history:hist})});const d=await r.json();const a=d.reply||d.error||'No response.';setReply(a);setHist(h=>[...h.slice(-3),{q:text,a}])}catch{setReply('Something went wrong. Please try again.')}finally{setLoading(false)}}

 useEffect(()=>{const h=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setPalette(p=>!p)}if(e.key==='Escape'){setPalette(false);setOpenIssue(null);setOpenProp(null)}};addEventListener('keydown',h);return()=>removeEventListener('keydown',h)},[]);
 useEffect(()=>{if(!ready)return;const ev=[{msg:'Synced listings across Airbnb, Vrbo & direct',tag:'Channel sync'},{msg:'Checked tomorrow’s arrivals for missing verifications',tag:'Pre-arrival'},{msg:'Scored property info completeness',tag:'Health check'},{msg:'Matched guest messages to bookings',tag:'Booking match'}];issues.slice(0,3).forEach(i=>log(`Classified “${i.summary.slice(0,40)}…”`,`${label(i.category)} · ${Math.round((i.confidence||.9)*100)}%`));let n=0;const id=setInterval(()=>{const e=ev[n++%ev.length];log(e.msg,e.tag)},5000);return()=>clearInterval(id)},[ready]);
 useEffect(()=>{if(!ready||mode!=='demo'||!authed)return;let n=0;const id=setInterval(()=>{if(n>=incoming.length){clearInterval(id);return}const x=incoming[n++];const iss:Issue={id:'n'+n,guest:'Demo Guest',status:'open',confidence:.95,...x};setIssues(s=>[iss,...s]);log(`New message at ${x.property} → ${label(x.category)}`,`Auto-routed to ${x.assignee.split(' ')[0]}`);toast('New guest message',`${x.property} · classified as ${label(x.category)}`)},16000);return()=>clearInterval(id)},[ready,mode,authed]);

 const open=issues.filter(i=>i.status!=='resolved');
 const resolved=issues.filter(i=>i.status==='resolved');
 const health=props.length?Math.round(props.reduce((a,p)=>a+p.score,0)/props.length):0;
 const live=mode==='ownerrez';
 const hi=open.filter(i=>i.priority==='high'||i.priority==='critical');const rv=props.filter(p=>p.review);const sameDay=schedule.filter(x=>x.sameDay).length;
 const insight=!ready?'':`${hi.length?`${hi.length} high-priority ${hi.length>1?'issues need':'issue needs'} attention, starting with ${hi[0].property}.`:'No high-priority issues right now. Nice work!'} ${!live&&sameDay?`${sameDay} same-day turnover at ${schedule.find(x=>x.sameDay)?.property}, so cleaning needs to wrap by 3 PM.`:''} ${rv.length?`${rv[0].name} is missing listing details.`:''}`.replace(/\s+/g,' ').trim();
 const cats=useMemo(()=>{const c:Record<string,number>={};issues.forEach(i=>c[i.category]=(c[i.category]||0)+1);return Object.entries(c).sort((a,b)=>b[1]-a[1])},[issues]);
 const maxCat=Math.max(1,...cats.map(x=>x[1]));
 const avgResp=responded.length?Math.round(responded.reduce((a,b)=>a+b,0)/responded.length):12;
 const metrics=[
  {label:'Open issues',value:open.length,icon:<Inbox size={18}/>,note:hi.length+' high priority',tone:'rose'},
  {label:'Property health',value:props.length?health+'%':'—',icon:<Gauge size={18}/>,note:props.length+' properties tracked',tone:'plum',bar:health},
  {label:'Resolved today',value:resolved.length,icon:<CheckCircle2 size={18}/>,note:'Avg response '+avgResp+' min',tone:'ink'},
  {label:'Routing confidence',value:'94%',icon:<Activity size={18}/>,note:'AI triage accuracy',tone:'sand',bar:94},
 ];
 const runPalette=(t:string)=>{setPalette(false);setPq('');document.getElementById('ask')?.scrollIntoView({behavior:'smooth'});ask(t)};
 const cur=issues.find(i=>i.id===openIssue);const prop=props.find(p=>p.id===openProp);
 const stays=prop?schedule.filter(s=>s.property===prop.name&&s.type!=='clean'):[];
 const propIssues=prop?issues.filter(i=>i.property===prop.name):[];
 function openI(i:Issue){setOpenIssue(i.id);setOpenProp(null);setDraft(suggest(i))}
 function setStatus(id:string,status:string){setIssues(s=>s.map(i=>i.id===id?{...i,status}:i))}
 function approve(i:Issue){setStatus(i.id,'resolved');setResponded(r=>[...r,Math.round(4+Math.random()*9)]);setOpenIssue(null);log(`Reply sent to guest at ${i.property}`,'Resolved · human approved');toast('Reply sent ✓',`${i.property} · issue resolved`)}
 function reassign(i:Issue){const n=TEAM[(TEAM.indexOf(i.assignee)+1)%TEAM.length];setIssues(s=>s.map(x=>x.id===i.id?{...x,assignee:n}:x));log(`Reassigned “${i.summary.slice(0,30)}…” to ${n}`,'Manual routing')}

 if(!authed) return <div className="login">
  <div className="lg-card">
   <img src="/logo-mark.png" alt="" className="lg-logo"/>
   <h1>Welcome to Rez<span className="ai-grad">AI</span></h1>
   <p>Your AI operations copilot for vacation rentals.</p>
   <label className="lg-field"><span>Work email</span><input defaultValue="demo@rezai.app" readOnly/></label>
   <button className="lg-btn" onClick={()=>signIn()}>Continue as demo <ArrowRight size={16}/></button>
   <div className="lg-or"><span>or connect live OwnerRez data</span></div>
   <label className="lg-field key"><KeyRound size={15}/><input type="password" placeholder="Team key, then press Enter" onKeyDown={e=>{if(e.key==='Enter')signIn((e.target as HTMLInputElement).value.trim())}}/></label>
   <small>Demo mode uses sample data only. No real guest information is shown.</small>
  </div>
 </div>;

 return <div className="shell">
  <aside className="side">
   <div className="brand"><img src="/logo-mark.png" alt="" className="logo-img"/><div><b>Rez<span className="ai-grad">AI</span></b><small>Vacation Rental Copilot</small></div></div>
   <nav>
    <a className="on" href="#top"><LayoutDashboard size={17}/>Overview</a>
    <a href="#attention"><Inbox size={17}/>Needs attention<span className="count">{open.length}</span></a>
    <a href="#health"><HomeIcon size={17}/>Properties</a>
    <a href="#perf"><Activity size={17}/>Performance</a>
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
    <div className="top-act">
     <button className="icon-btn" onClick={()=>setDark(d=>!d)} aria-label="Toggle theme">{dark?<Sun size={17}/>:<Moon size={17}/>}</button>
     <button className="icon-btn" aria-label="Notifications" onClick={()=>toast(open.length?`${open.length} open issues`:'All caught up',open.length?'Click any issue to review and reply':'No new alerts')}><Bell size={17}/>{open.length>0&&<i className="nb"/>}</button>
     <button className="cta" onClick={()=>{document.getElementById('ask')?.scrollIntoView({behavior:'smooth'});ask('Daily briefing for today')}}><Sparkles size={16}/>Get today&apos;s briefing</button>
    </div>
   </header>

   <div className="insight"><span className="in-ico"><Zap size={16}/></span><div><b>RezAI insight</b><p>{insight||<span className="sk w60"/>}</p></div><button onClick={()=>setPalette(true)} className="kbd-btn"><Command size={13}/>K</button></div>

   <section className="metrics">
    {metrics.map((m,i)=><div key={m.label} className={'metric '+m.tone} style={{animationDelay:i*70+'ms'}}>
     <div className="m-top"><span>{m.label}</span><i>{m.icon}</i></div>
     <div className="m-val">{ready?m.value:<span className="sk w40"/>}</div>
     {m.bar!==undefined&&<div className="bar"><span style={{width:(ready?m.bar:0)+'%'}}/></div>}
     <div className="m-note">{m.note}</div>
    </div>)}
   </section>

   <div className="grid">
    <section className="card" id="attention">
     <div className="c-head"><h2>Needs attention</h2><span className="pill">{open.length} open · click to act</span></div>
     {!ready&&[0,1,2].map(i=><div key={i} className="item"><span className="sk circle"/><div style={{flex:1}}><span className="sk w80"/><span className="sk w50"/></div></div>)}
     {ready&&open.length===0&&<div className="empty"><CheckCircle2 size={22}/>All clear. Nothing needs you right now.</div>}
     {open.map(i=><button key={i.id} className={'item btn'+(i.id===openIssue?' sel':'')} onClick={()=>openI(i)}>
      <span className={'ico '+(i.category==='maintenance'?'maint':'msg')}>{i.category==='maintenance'?<Wrench size={16}/>:<MessageSquare size={16}/>}</span>
      <div className="it-body"><b>{i.summary}</b><div className="meta"><span>{i.property}</span><span className="tag">{label(i.category)}</span>{i.status==='in_progress'&&<span className="tag prog">In progress</span>}{i.status==='in_review'&&<span className="tag">In review</span>}</div></div>
      <div className="it-side"><span className={'prio '+i.priority}>{i.priority}</span><span className="av" title={i.assignee}>{initials(i.assignee)}</span></div>
     </button>)}
    </section>

    <section className="card" id="health">
     <div className="c-head"><h2>Property health</h2><span className="pill">{props.length} properties</span></div>
     {!ready&&[0,1,2,3].map(i=><div key={i} className="prop"><div style={{flex:1}}><span className="sk w60"/><span className="sk w30"/></div></div>)}
     {props.map(p=><button key={p.id} className="prop btn" onClick={()=>{setOpenProp(p.id);setOpenIssue(null)}}>
      <span className={'ico '+(p.review?'warn':'ok')}>{p.review?<AlertTriangle size={16}/>:<CheckCircle2 size={16}/>}</span>
      <div className="pr-body"><div className="pr-row"><b>{p.name}</b><strong>{p.score}%</strong></div><div className="meter"><span className={p.review?'low':''} style={{width:p.score+'%'}}/></div><div className="meta"><span>{p.city}</span><span>{p.review?'Needs information review':'All tracked fields present'}</span></div></div>
     </button>)}
    </section>
   </div>

   <section className="perf" id="perf">
    <div className="card"><div className="c-head"><h2>Occupancy · 7 days</h2><span className="pill up">↑ 18 pts</span></div><div className="big">{occupancy[occupancy.length-1]}%</div><Spark data={occupancy}/><div className="days">{['M','T','W','T','F','S','S'].map((d,i)=><span key={i}>{d}</span>)}</div></div>
    <div className="card"><div className="c-head"><h2>Issues by category</h2><span className="pill">{issues.length} total</span></div>{cats.map(([c,n])=><div key={c} className="cat"><span>{label(c)}</span><div className="cbar"><i style={{width:(n/maxCat)*100+'%'}}/></div><b>{n}</b></div>)}</div>
    <div className="card"><div className="c-head"><h2>Response time</h2><span className="pill">avg</span></div><div className="rt"><div><div className="big">{avgResp}<small> min</small></div><p className="sub">Target under 15 min. {avgResp<=15?'On track.':'Above target.'}</p></div><div className="ring"><svg viewBox="0 0 36 36"><defs><linearGradient id="rg"><stop offset="0" stopColor="#14b8a6"/><stop offset="1" stopColor="#6366f1"/></linearGradient></defs><circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--line)" strokeWidth="3"/><circle cx="18" cy="18" r="15.9" fill="none" stroke="url(#rg)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Math.max(8,Math.min(100,100-avgResp*3))} 100`} transform="rotate(-90 18 18)"/></svg><span><Clock size={13}/>SLA</span></div></div></div>
   </section>

   <div className="grid two">
    <section className="card">
     <div className="c-head"><h2>Today&apos;s timeline</h2><span className="pill">{live?'live':'demo'} · {schedule.length} events</span></div>
     {live?<div className="empty muted">Ask RezAI “Daily briefing for today” for the live schedule.</div>:<div className="tl">{schedule.map((x,i)=><div key={i} className={'tl-row '+x.type}><span className="tl-time">{x.time}</span><span className="tl-dot">{x.type==='checkin'?<LogIn size={14}/>:x.type==='checkout'?<LogOut size={14}/>:<SprayCan size={14}/>}</span><div className="tl-body"><b>{x.type==='checkin'?'Check-in':x.type==='checkout'?'Checkout':'Turnover clean'} · {x.property}</b><span>{x.guest}{x.sameDay&&<em className="flag">Same-day turnover</em>}</span></div></div>)}</div>}
    </section>
    <section className="card feed">
     <div className="c-head"><h2><span className="live-dot"/>AI activity</h2><span className="pill">real-time</span></div>
     {feed.map((f,i)=><div key={f.t+f.msg+i} className="fd-row"><span className="fd-time">{f.t}</span><div><b>{f.msg}</b><span className="fd-tag">{f.tag}</span></div></div>)}
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

  {(cur||prop)&&<div className="dr-bg" onClick={()=>{setOpenIssue(null);setOpenProp(null)}}/>}
  <aside className={'drawer'+(cur||prop?' on':'')}>
   {cur&&<>
    <div className="dr-head"><div className="dr-tags"><span className={'prio '+cur.priority}>{cur.priority}</span><span className="tag">{label(cur.category)}</span></div><button className="icon-btn" onClick={()=>setOpenIssue(null)} aria-label="Close"><X size={16}/></button></div>
    <h3>{cur.summary}</h3>
    <div className="dr-meta"><span><HomeIcon size={14}/>{cur.property}</span><span><UserRound size={14}/>{cur.assignee}</span><span><CircleDot size={14}/>{label(cur.status)}</span></div>
    <div className="dr-sec"><small>Guest message</small><div className="gmsg">{cur.message||cur.summary}</div></div>
    <div className="dr-sec"><small>AI classification</small><div className="conf"><div><b>{label(cur.category)}</b><span>{Math.round((cur.confidence||.9)*100)}% confidence</span></div><div className="bar"><span style={{width:Math.round((cur.confidence||.9)*100)+'%'}}/></div></div></div>
    <div className="dr-sec"><small><Sparkles size={12}/> Suggested reply · edit before sending</small><textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={8}/></div>
    <div className="dr-act">
     <button className="cta" onClick={()=>approve(cur)}><Send size={15}/>Approve &amp; send</button>
     <button className="ghost" onClick={()=>{setStatus(cur.id,'in_progress');log(`Marked in progress at ${cur.property}`,'Status update')}}><Check size={15}/>In progress</button>
     <button className="ghost" onClick={()=>reassign(cur)}><UserRound size={15}/>Reassign</button>
    </div>
    <p className="dr-note">Demo only: nothing is actually sent. In a live setup, nothing goes out without a human clicking approve.</p>
   </>}
   {prop&&<>
    <div className="dr-head"><div className="dr-tags"><span className={'tag '+(prop.review?'warnt':'okt')}>{prop.review?'Needs review':'Healthy'}</span></div><button className="icon-btn" onClick={()=>setOpenProp(null)} aria-label="Close"><X size={16}/></button></div>
    <h3>{prop.name}</h3>
    <div className="dr-meta"><span><HomeIcon size={14}/>{prop.city}</span><span><Gauge size={14}/>{prop.score}% complete</span></div>
    <div className="dr-sec"><small>Listing information</small>{(missingInfo[prop.id]||[]).length?missingInfo[prop.id].map(m=><div key={m} className="chk miss"><AlertTriangle size={14}/>{m}<em>missing</em></div>):<div className="chk"><CheckCircle2 size={14}/>All tracked fields present</div>}</div>
    <div className="dr-sec"><small>Upcoming stays</small>{stays.length?stays.map((s,i)=><div key={i} className="chk"><Clock size={14}/>{s.type==='checkin'?'Check-in':'Checkout'} today · {s.time}<em>{s.guest}</em></div>):<div className="chk muted"><Clock size={14}/>No stays today</div>}</div>
    <div className="dr-sec"><small>Issue history</small>{propIssues.length?propIssues.map(i=><button key={i.id} className="chk link" onClick={()=>openI(i)}><MessageSquare size={14}/>{i.summary}<em>{label(i.status)}</em></button>):<div className="chk muted"><CheckCircle2 size={14}/>No issues logged</div>}</div>
   </>}
  </aside>

  <div className="toasts">{toasts.map(t=><div key={t.id} className="toast"><span className="t-ico"><Bell size={15}/></span><div><b>{t.title}</b><span>{t.body}</span></div></div>)}</div>

  {palette&&<div className="pal-bg" onClick={()=>setPalette(false)}><div className="pal" onClick={e=>e.stopPropagation()}>
   <div className="pal-in"><Search size={18}/><input autoFocus value={pq} onChange={e=>setPq(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&pq.trim())runPalette(pq)}} placeholder="Ask RezAI anything, or pick an action…"/><button onClick={()=>setPalette(false)} aria-label="Close"><X size={16}/></button></div>
   <div className="pal-list"><small>Suggested</small>{['Daily briefing for today','Who is checking out tomorrow','Same-day turnovers today','What happened today','Which properties need review'].filter(t=>t.toLowerCase().includes(pq.toLowerCase())).map(t=><button key={t} onClick={()=>runPalette(t)}><Sparkles size={15}/>{t}<kbd>↵</kbd></button>)}{pq.trim()&&<button onClick={()=>runPalette(pq)}><Bot size={15}/>Ask: “{pq}”<kbd>↵</kbd></button>}</div>
  </div></div>}
 </div>
}
