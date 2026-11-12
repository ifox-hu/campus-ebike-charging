export function selectLayoutScope(stations,rows,stationId='',keyword='',status=''){
 const sites=stationId?stations.filter(s=>s.id===stationId):stations
 const ids=new Set(sites.map(s=>s.id)),key=keyword.trim().toLowerCase()
 const summary=stationId?sites[0]:{name:'全部站点',...Object.fromEntries(['rowCount','deviceCount','portCount'].map(k=>[k,sites.reduce((sum,s)=>sum+(s[k]||0),0)]))}
 const visibleRows=rows.filter(r=>ids.has(r.stationId)).map(r=>({...r,stationName:sites.find(s=>s.id===r.stationId)?.name,visible:r.devices.filter(d=>(!key||`${d.code} ${d.name} ${r.name}`.toLowerCase().includes(key))&&(!status||d.status===status))})).filter(r=>r.visible.length||(!key&&!status))
 return {summary,rows:visibleRows}
}
