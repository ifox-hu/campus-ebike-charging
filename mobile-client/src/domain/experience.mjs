// Station discovery and browser preferences. No server-side business mutations.
export const preferenceKey=(base,account)=>`lightcharge-discovery:${encodeURIComponent(base)}:${encodeURIComponent(account||'guest')}`;
export const visitStation=(recent,id)=>[String(id),...recent.map(String).filter(x=>x!==String(id))].slice(0,10);
export function filterStations(rows,{query='',scene='',tab='all',favorites=[],recent=[]}={}){
 const q=query.trim().toLowerCase();
 const found=rows.filter(s=>(!scene||(s.scene||'未分类')===scene)&&`${s.name||''}${s.address||''}`.toLowerCase().includes(q)&&(tab!=='favorites'||favorites.includes(String(s.id)))&&(tab!=='recent'||recent.includes(String(s.id))));
 return tab==='recent'?[...found].sort((a,b)=>recent.indexOf(String(a.id))-recent.indexOf(String(b.id))):found;
}
