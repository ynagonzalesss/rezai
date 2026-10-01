export function classify(text:string){
 const t=text.toLowerCase();
 if(/\b(ac|aircon|air conditioning|leak|plumb|toilet|heater|broken|repair|not working|maintenance)\b/.test(t)) return {category:'maintenance',priority:'high' as const,assignee:'Kathleen',confidence:.97};
 if(/\b(refund|manager|complaint|unsafe|emergency|escalate|fraud)\b/.test(t)) return {category:'management_escalation',priority:'high' as const,assignee:'Lori',confidence:.94};
 if(/\b(payment|charge|invoice|balance|card)\b/.test(t)) return {category:'payment',priority:'medium' as const,assignee:'Alissa',confidence:.92};
 if(/\b(clean|towel|sheet|housekeeping)\b/.test(t)) return {category:'housekeeping',priority:'medium' as const,assignee:'Alissa',confidence:.92};
 if(/\b(check.?in|check.?out|arrival|departure|late checkout|early check)\b/.test(t)) return {category:'check_in_out',priority:'medium' as const,assignee:'Alissa',confidence:.91};
 return {category:'guest_concern',priority:'medium' as const,assignee:'Alissa',confidence:.82};
}
