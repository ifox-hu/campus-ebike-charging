// Only station configuration is transferred; never local users or demo orders.
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>value[k]!==undefined).map(k=>[k,value[k]]))
export function catalogOf(db){return {
 stations:db.stations.map(s=>pick(s,['id','name','address','scene','lat','lng','note','enabled'])),
 rows:db.rows.map(r=>pick(r,['id','stationId','name','index'])),
 devices:db.devices.map(d=>pick(d,['id','code','name','stationId','rowId','position','enabled','online'])),
 sockets:db.sockets.map(s=>({...pick(s,['id','deviceId','number','code','name','enabled','fault','faultReason']),powerWatts:s.powerWatts??300})),
 rates:db.rates.map(r=>({stationId:r.stationId,electricRate:r.electricRate}))
}}
export function mergeCatalog(db,catalog){
 for(const key of ['stations','rows','devices','sockets','rates'])if(!Array.isArray(catalog?.[key]))throw Error('站点目录文件不完整。')
 for(const key of ['stations','rows','devices','sockets','rates']){
  const identity=key==='rates'?'stationId':'id',seen=new Set();
  for(const item of catalog[key]){if(!item||typeof item[identity]!=='string'||!item[identity]||seen.has(item[identity]))throw Error('目录记录缺少编号或编号重复。');seen.add(item[identity])}
 }
 // Merge rather than replace arrays, retaining all private stations and history.
 for(const key of ['stations','rows','devices','sockets','rates'])for(const item of catalog[key]){
  const identity=key==='rates'?'stationId':'id';if(!item[identity])throw Error('目录记录缺少编号。')
  const existing=db[key].find(x=>x[identity]===item[identity]);
  if(existing)Object.assign(existing,item);else db[key].push({...item})
 }
 if(Number.isInteger(db.sequence))for(const key of ['stations','rows','devices','sockets'])for(const item of db[key]){const suffix=/^[A-Z]+(\d+)$/.exec(item.id);if(suffix)db.sequence=Math.max(db.sequence,Number(suffix[1]))}
}
export function applySocketSnapshot(db,sockets){
 const byId=new Map(sockets.map(s=>[s.externalId,s]));
 for(const socket of db.sockets){const live=byId.get(socket.id);if(live){socket.businessId=live.id;socket.businessStatus=live.status}}
}
