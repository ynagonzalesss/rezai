import {issues,properties} from '@/lib/demo';
import {liveAllowed,ownerrez,items} from '@/lib/ownerrez';
export async function GET(req:Request){
 const live=liveAllowed(req);
 let liveProperties:any[]=[];
 if(live){
  try{liveProperties=items(await ownerrez('/properties?active=true&limit=100')).map((p:any)=>({id:String(p.id),name:p.name||p.external_name||'Unnamed property',score:100,review:false,city:p.address?.city||''}));}catch{}
 }
 return Response.json({mode:live&&liveProperties.length?'ownerrez':'demo',properties:liveProperties.length?liveProperties:properties,issues});
}
