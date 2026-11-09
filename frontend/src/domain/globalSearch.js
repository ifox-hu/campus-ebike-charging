import { navigation } from '../data.js'
export function globalSearch(db,query){
 const q=String(query||'').trim().toLowerCase().slice(0,100)
 const results=[],stations=new Map(db.stations.map(s=>[s.id,s])),devices=new Map(db.devices.map(d=>[d.id,d])),rows=new Map((db.rows||[]).map(r=>[r.id,r]))
 function add(kind,id,title,description,target,terms=[]){const texts=[title,description,...terms].map(t=>String(t||'').toLowerCase());if(!q||texts.some(t=>t.includes(q)))results.push({key:`${kind}:${id}`,kind,id,title,description,target,rank:texts.some(t=>t===q)?100:texts.some(t=>t.startsWith(q))?40:10})}
 navigation.forEach(n=>add('menu',n.id,n.label,'管理功能入口',{page:n.id},['菜单']))
 if(q){
  db.stations.forEach(s=>add('station',s.id,s.name,s.address,{page:'devices',stationId:s.id},[s.scene,'站点']))
  db.devices.forEach(d=>add('device',d.id,d.code,`${stations.get(d.stationId)?.name||''} · ${rows.get(d.rowId)?.name||''} · ${d.name}`,{deviceId:d.id},['设备']))
  db.sockets.forEach(s=>{const d=devices.get(s.deviceId);add('socket',s.id,s.code,`${stations.get(d?.stationId)?.name||''} · ${rows.get(d?.rowId)?.name||''} · ${s.name}`,{deviceId:s.deviceId,socketId:s.id},['插座'])})
  db.orders.forEach(o=>{const u=db.users.find(u=>u.id===o.userId);add('order',o.id,o.number,`${u?.name||''} · ${o.stationName} · ${o.socketCode}`,{orderId:o.id},['订单',u?.account])})
  db.reports.forEach(r=>{const s=db.sockets.find(s=>s.id===r.socketId),d=devices.get(s?.deviceId);add('report',r.id,`报修 ${r.id}`,`${stations.get(d?.stationId)?.name||''} · ${r.description}`,{reportId:r.id},[s?.code,'故障报修'])})
 }
 const groups=['menu','station','device','socket','order','report'];return groups.flatMap(kind=>results.filter(r=>r.kind===kind).sort((a,b)=>b.rank-a.rank).slice(0,8))
}
