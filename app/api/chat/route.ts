import {issues,properties} from '@/lib/demo';
import {ownerrezEnabled,ownerrez,items} from '@/lib/ownerrez';

export async function POST(req:Request){
 const body=await req.json(); const m=String(body.message||'').toLowerCase();
 if(/maintenance|repair|broken|not working|issue/.test(m)){
  const open=issues.filter(i=>i.category==='maintenance'&&i.status!=='resolved');
  return Response.json({reply:'I found '+open.length+' open maintenance concern'+(open.length===1?'':'s')+'.\n'+open.map(i=>'• '+i.property+': '+i.summary+' — '+i.priority+' priority, assigned to '+i.assignee).join('\n'),mode:ownerrezEnabled()?'ownerrez':'demo',verified:false,confidence:.96});
 }
 if(/property|information|listing/.test(m)){
  const flagged=properties.filter(p=>p.review);
  return Response.json({reply:flagged.length?'Properties needing information review:\n'+flagged.map(p=>'• '+p.name+' — health '+p.score+'%').join('\n'):'No demo properties are currently flagged for information review.',mode:'demo',verified:false,confidence:.9});
 }
 if(/check.?in|arriv/.test(m) && ownerrezEnabled()){
  try{
   const ps=items(await ownerrez('/properties?active=true&limit=100')); const ids=ps.map((p:any)=>p.id).filter(Boolean);
   const d=new Date(); d.setUTCDate(d.getUTCDate()+1);
   const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Phoenix',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
   const qs=new URLSearchParams({from:date,status:'active',include_guest:'true',limit:'100'}); ids.forEach((id:any)=>qs.append('property_ids',id));
   const bs=items(await ownerrez('/bookings?'+qs.toString())).filter((b:any)=>String(b.arrival||'').slice(0,10)===date&&!b.is_block);
   const reply=bs.length?'Tomorrow\'s check-ins ('+date+'):\n'+bs.map((b:any)=>'• '+(b.guest?.name||'Guest')+' — '+(b.property?.name||'Property')+' — '+(b.check_in||'time not provided')).join('\n'):'I checked OwnerRez for tomorrow ('+date+'). I don\'t see any active guest arrivals.';
   return Response.json({reply,mode:'ownerrez',verified:true,confidence:.98});
  }catch(e){console.error(e)}
 }
 return Response.json({reply:'I can help with check-ins, maintenance, property audits, information gaps, and operations triage.',mode:ownerrezEnabled()?'ownerrez':'demo',verified:false,confidence:.78});
}
