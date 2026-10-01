export type Issue = {id:string;property:string;guest:string;summary:string;category:string;priority:'low'|'medium'|'high'|'critical';status:'open'|'in_review'|'resolved';assignee:string;confidence:number};
export const properties = [
 {id:'p1',name:'Scottsdale Desert Retreat',score:98,review:false,city:'Scottsdale'},
 {id:'p2',name:'Mesa Sunset Villa',score:96,review:false,city:'Mesa'},
 {id:'p3',name:'Belize Coastal Villa',score:82,review:true,city:'Belize'},
 {id:'p4',name:'Chandler Family Home',score:100,review:false,city:'Chandler'}
];
export const issues:Issue[] = [
 {id:'i1',property:'Scottsdale Desert Retreat',guest:'Demo Guest',summary:'AC is running but the bedroom is still warm.',category:'maintenance',priority:'high',status:'open',assignee:'Kathleen',confidence:.97},
 {id:'i2',property:'Mesa Sunset Villa',guest:'Demo Guest',summary:'Guest asked whether late checkout is available.',category:'guest_concern',priority:'medium',status:'open',assignee:'Alissa',confidence:.94},
 {id:'i3',property:'Belize Coastal Villa',guest:'Demo Guest',summary:'Guest verification is still pending.',category:'management_escalation',priority:'high',status:'in_review',assignee:'Lori',confidence:.91}
];
