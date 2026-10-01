const base = process.env.OWNERREZ_API_BASE || 'https://api.ownerrez.com/v2';
export function ownerrezEnabled(){ return !!process.env.OWNERREZ_ACCESS_TOKEN; }
export async function ownerrez(path:string, init:RequestInit={}){
 const token=process.env.OWNERREZ_ACCESS_TOKEN;
 if(!token) throw new Error('OWNERREZ_ACCESS_TOKEN is not configured');
 const res=await fetch(\`\${base}\${path}\`,{...init,headers:{Accept:'application/json',Authorization:\`Bearer \${token}\`,...(init.headers||{})},cache:'no-store'});
 if(!res.ok){let detail='';try{detail=await res.text()}catch{};throw new Error(\`OwnerRez API error: \${res.status}\${detail?' — '+detail.slice(0,500):''}\`)}
 return res.json();
}
export function items(data:any):any[]{if(Array.isArray(data))return data;if(Array.isArray(data?.items))return data.items;if(Array.isArray(data?.results))return data.results;if(Array.isArray(data?.data))return data.data;return []}
