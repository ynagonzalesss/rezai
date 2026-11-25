export type Issue = {id:string;property:string;guest:string;summary:string;category:string;priority:'low'|'medium'|'high'|'critical';status:'open'|'in_review'|'resolved';assignee:string;confidence:number};
export const properties = [
 {id:'p1',name:'Scottsdale Desert Retreat',score:98,review:false,city:'Scottsdale'},
 {id:'p2',name:'Mesa Sunset Villa',score:96,review:false,city:'Mesa'},
 {id:'p3',name:'Belize Coastal Villa',score:82,review:true,city:'Belize'},
 {id:'p4',name:'Chandler Family Home',score:100,review:false,city:'Chandler'}
];
export const issues:Issue[] = [
 {id:'i1',property:'Scottsdale Desert Retreat',guest:'Demo Guest',summary:'AC is running but the bedroom is still warm.',category:'maintenance',priority:'high',status:'open',assignee:'Maya Reyes',confidence:.97},
 {id:'i2',property:'Mesa Sunset Villa',guest:'Demo Guest',summary:'Guest asked whether late checkout is available.',category:'guest_concern',priority:'medium',status:'open',assignee:'Jordan Lee',confidence:.94},
 {id:'i3',property:'Belize Coastal Villa',guest:'Demo Guest',summary:'Guest verification is still pending.',category:'management_escalation',priority:'high',status:'in_review',assignee:'Sam Carter',confidence:.91}
];

export const schedule = [
 {time:'10:00',type:'checkout',property:'Mesa Sunset Villa',guest:'Demo Guest A'},
 {time:'11:00',type:'clean',property:'Mesa Sunset Villa',guest:'Housekeeping'},
 {time:'11:00',type:'checkout',property:'Chandler Family Home',guest:'Demo Guest B'},
 {time:'15:00',type:'checkin',property:'Mesa Sunset Villa',guest:'Demo Guest C',sameDay:true},
 {time:'16:00',type:'checkin',property:'Scottsdale Desert Retreat',guest:'Demo Guest D'}
];

export const occupancy = [72,78,81,76,88,93,90];
export const messages:Record<string,string> = {
 i1:'Hi! The AC is running but the master bedroom is still really warm, around 82°F. Is there anything we can do tonight?',
 i2:'Hello, our flight leaves at 6 PM on Sunday. Would a late checkout be possible?',
 i3:'Hi, I uploaded my ID yesterday but it still says verification pending. Will I get the door code in time?'
};
export const missingInfo:Record<string,string[]> = {
 p3:['Wi-Fi network & password','Parking instructions','Trash pickup day']
};
export const incoming = [
 {property:'Chandler Family Home',summary:'Guest asked for extra towels and a pack-n-play.',category:'housekeeping',priority:'medium',assignee:'Jordan Lee',message:'Hi! Could we get extra towels and a pack-n-play for our toddler? Thanks so much!'},
 {property:'Scottsdale Desert Retreat',summary:'Pool heater not reaching temperature.',category:'maintenance',priority:'high',assignee:'Maya Reyes',message:'The pool heat was paid for but the water is still cold. Can someone check the heater?'},
 {property:'Mesa Sunset Villa',summary:'Guest wants to check in early at 1 PM.',category:'check_in_out',priority:'medium',assignee:'Jordan Lee',message:'We land early. Any chance we can check in at 1 PM instead of 4?'}
];
