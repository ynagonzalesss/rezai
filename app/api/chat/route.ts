import {issues,properties} from '@/lib/demo';
import {liveAllowed,ownerrez} from '@/lib/ownerrez';
import {answer,parseIntent} from '@/lib/bookings';
import {isListingQuestion,listingAnswer} from '@/lib/listings';

export async function POST(req:Request){
 const live=liveAllowed(req); let body:any={}; try{body=await req.json()}catch{}; const m=String(body.message||'').toLowerCase();
 if(live&&isListingQuestion(m)){
  try{
   const r=await listingAnswer(ownerrez,m);
   return Response.json({reply:r.reply,mode:'ownerrez',verified:r.verified,confidence:r.verified?.95:.7});
  }catch(e){console.error(e);return Response.json({reply:'I couldn\'t reach OwnerRez just now. Please try again in a minute.',mode:'ownerrez',verified:false,confidence:0})}
 }
 if(live&&parseIntent(m).kind!=='help'){
  try{
   const r=await answer(ownerrez,m);
   return Response.json({reply:r.reply,mode:'ownerrez',verified:r.verified,confidence:r.verified?.98:.8});
  }catch(e){console.error(e);return Response.json({reply:'I couldn\'t reach OwnerRez just now. Please try again in a minute.',mode:'ownerrez',verified:false,confidence:0})}
 }
 if(/maintenance|repair|broken|not working|issue/.test(m)){
  const open=issues.filter(i=>i.category==='maintenance'&&i.status!=='resolved');
  return Response.json({reply:'I found '+open.length+' open maintenance concern'+(open.length===1?'':'s')+'.\n'+open.map(i=>'• '+i.property+': '+i.summary+' — '+i.priority+' priority, assigned to '+i.assignee).join('\n'),mode:live?'ownerrez':'demo',verified:false,confidence:.96});
 }
 if(/property|information|listing/.test(m)){
  const flagged=properties.filter(p=>p.review);
  return Response.json({reply:flagged.length?'Properties needing information review:\n'+flagged.map(p=>'• '+p.name+' — health '+p.score+'%').join('\n'):'No demo properties are currently flagged for information review.',mode:'demo',verified:false,confidence:.9});
 }
 return Response.json({reply:'I can help with check-ins and check-outs, booking lookups, cancellations, maintenance, property audits, and operations triage.',mode:live?'ownerrez':'demo',verified:false,confidence:.78});
}
