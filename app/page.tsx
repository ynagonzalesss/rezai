'use client';
import {useEffect,useState} from 'react';
import {AlertTriangle,CheckCircle2,Wrench,MessageSquare} from 'lucide-react';

type Issue={id:string;property:string;guest:string;summary:string;category:string;priority:string;status:string;assignee:string};
type Prop={id:string;name:string;score:number;review:boolean;city:string};

export default function Home(){
 const [issues,setIssues]=useState<Issue[]>([]); const [props,setProps]=useState<Prop[]>([]);
 const [q,setQ]=useState(''); const [reply,setReply]=useState(''); const [mode,setMode]=useState('demo'); const [key,setKey]=useState(''); const [loading,setLoading]=useState(false);
 const hdrs=(k:string):Record<string,string>=>k?{'x-rezai-key':k}:{};
 function load(k:string){fetch('/api/operations',{headers:hdrs(k)}).then(r=>r.json()).then(d=>{setIssues(d.issues);setProps(d.properties);setMode(d.mode)}).catch(()=>{})}
 useEffect(()=>{let k='';try{k=sessionStorage.getItem('rezai-key')||''}catch{};setKey(k);load(k)},[]);
 function saveKey(k:string){setKey(k);try{k?sessionStorage.setItem('rezai-key',k):sessionStorage.removeItem('rezai-key')}catch{};load(k)}
 async function ask(){if(!q.trim()||loading)return;setLoading(true);try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json',...hdrs(key)},body:JSON.stringify({message:q})});const d=await r.json();setReply(d.reply||d.error||'No response.')}catch{setReply('Something went wrong. Please try again.')}finally{setLoading(false)}}
 const open=issues.filter(i=>i.status!=='resolved');
 return <main style={{minHeight:'100vh',background:'#f4f1ea',color:'#18232c',fontFamily:'Arial,sans-serif',padding:40}}>
  <div style={{maxWidth:1200,margin:'0 auto'}}>
   <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:32}}>
    <div><div style={{fontSize:34,fontWeight:700}}>RezAI</div><div style={{fontSize:11,letterSpacing:2,color:'#73838a'}}>AI PROPERTY OPERATIONS COPILOT</div></div>
    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><input type="password" aria-label="Team key" placeholder="Team key (live data)" defaultValue="" onKeyDown={e=>{if(e.key==='Enter')saveKey((e.target as HTMLInputElement).value.trim())}} style={{padding:'7px 10px',border:'1px solid #d9d4ca',borderRadius:20,fontSize:11,width:170}}/><span style={{border:'1px solid #d9d4ca',borderRadius:20,padding:'7px 12px',fontSize:11}}>{mode==='ownerrez'?'LIVE OWNERREZ':'DEMO DATA'}</span></div>
   </header>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:18}}>
    <Metric label="Open issues" value={open.length}/><Metric label="Property health" value={props.length?Math.round(props.reduce((a,p)=>a+p.score,0)/props.length)+'%':'—'}/><Metric label="Needs review" value={props.filter(p=>p.review).length}/><Metric label="Routing confidence" value="94%"/>
   </div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:18}}>
    <section style={card}><h2>Needs attention</h2>{open.map(i=><div key={i.id} style={row}><span>{i.category==='maintenance'?<Wrench size={17}/>:<MessageSquare size={17}/>}</span><div><b>{i.summary}</b><div style={muted}>{i.property} · {i.assignee} · {i.priority}</div></div></div>)}</section>
    <section style={card}><h2>Property health</h2>{props.map(p=><div key={p.id} style={row}><span>{p.review?<AlertTriangle size={17}/>:<CheckCircle2 size={17}/>}</span><div style={{flex:1}}><b>{p.name}</b><div style={muted}>{p.city} · {p.review?'Needs information review':'All tracked fields present'}</div></div><strong>{p.score}%</strong></div>)}</section>
   </div>
   <section style={{...card,marginTop:18}}><h2>Ask RezAI</h2><p style={muted}>Ask about check-ins, maintenance, property information, or operations triage.</p><div style={{display:'flex',gap:8}}><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()} placeholder="Who is checking in tomorrow?" style={{flex:1,padding:13,border:'1px solid #d9d4ca',borderRadius:8}}/><button onClick={ask} style={{background:'#14313b',color:'#fff',border:0,borderRadius:8,padding:'0 18px'}}>{loading?'…':'Ask'}</button></div>{reply&&<pre style={{whiteSpace:'pre-wrap',background:'#eef5f2',padding:15,borderRadius:8,marginTop:14}}>{reply}</pre>}</section>
   <footer style={{marginTop:24,fontSize:10,color:'#899397'}}>RezAI · Portfolio build · Human approval remains required before operational actions</footer>
  </div>
 </main>
}
function Metric({label,value}:{label:string;value:string|number}){return <div style={card}><div style={muted}>{label}</div><div style={{fontSize:30,fontWeight:700,marginTop:12}}>{value}</div></div>}
const card={background:'#fbfaf6',border:'1px solid #dfdbd2',borderRadius:13,padding:20};
const row={display:'flex',gap:12,alignItems:'center',padding:'14px 0',borderTop:'1px solid #e8e4dc'};
const muted={fontSize:11,color:'#748188',marginTop:4};
