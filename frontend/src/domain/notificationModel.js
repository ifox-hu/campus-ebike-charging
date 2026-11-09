export function notificationSignals(db){
 const list=[],devices=new Map(db.devices.map(d=>[d.id,d])),stations=new Map(db.stations.map(s=>[s.id,s]))
 for(const r of db.reports){const s=db.sockets.find(s=>s.id===r.socketId),d=devices.get(s?.deviceId);list.push({key:`report:${r.id}:new:${r.createdAt}`,kind:'report',title:`收到故障报修 ${r.id}`,description:`${stations.get(d?.stationId)?.name||''} · ${r.description}`,sourceTime:r.createdAt,target:{reportId:r.id}});if(r.status==='resolved')list.push({key:`report:${r.id}:resolved:${r.resolvedAt}`,kind:'report',title:`报修 ${r.id} 已处理`,description:r.resolution,sourceTime:r.resolvedAt,target:{reportId:r.id}})}
 for(const d of db.devices.filter(d=>!d.online))list.push({key:`device:${d.id}:offline:${d.onlineChangedAt||'initial'}`,kind:'device',title:`设备 ${d.code} 离线`,description:`${stations.get(d.stationId)?.name||''}，请核验相关充电任务。`,sourceTime:d.onlineChangedAt,target:{deviceId:d.id}})
 for(const s of db.sockets.filter(s=>s.fault))list.push({key:`socket:${s.id}:fault:${s.faultChangedAt||'initial'}`,kind:'socket',title:`插座 ${s.code} 故障`,description:s.faultReason||'请检查插座状态。',sourceTime:s.faultChangedAt,target:{deviceId:s.deviceId,socketId:s.id}})
 for(const o of db.orders.filter(o=>o.status==='abnormal'))list.push({key:`order:${o.id}:abnormal:${o.statusChangedAt||o.startedAt}`,kind:'order',title:`充电订单异常 ${o.number}`,description:o.reason||'停止状态待核验，插座保持占用。',sourceTime:o.statusChangedAt||o.startedAt,target:{orderId:o.id}})
 return list
}
export function mergeNotificationLedger(previous,signals,now=new Date().toISOString()){
 const map=new Map(previous.map(e=>[e.key,e]));for(const signal of signals)if(!map.has(signal.key)){const {sourceTime,...event}=signal;map.set(event.key,{...event,createdAt:sourceTime||now})}
 const millis=t=>new Date(/^\d{4}-\d\d-\d\d /.test(t)?t.replace(' ','T')+'+08:00':t).getTime()||0
 return [...map.values()].sort((a,b)=>millis(b.createdAt)-millis(a.createdAt)).slice(0,300)
}
