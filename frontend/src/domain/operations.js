export function mapConnectedSource(data){
 return {reportsLoaded:false,stations:data.stations.map(s=>({...s,enabled:s.status==='OPERATING',scene:s.scene||'未分类',lat:s.latitude,lng:s.longitude})),
 devices:data.devices.map(d=>({...d,online:d.status==='ONLINE',enabled:d.enabled!==false,rowId:d.stationId+':'+(d.rowName||'未分排')})),
 sockets:data.sockets.map(s=>({...s,serverStatus:s.status,deviceId:s.chargerId,enabled:!['DISABLED','OFFLINE'].includes(s.status),fault:s.status==='FAULT'})),
 orders:data.orders.map(o=>({...o,number:o.orderNo,socketId:o.connectorId,status:({STARTING:'starting',CHARGING:'charging',COMPLETED:'ended',START_FAILED:'failed',ABNORMAL:'abnormal'})[o.status]||'unknown',startedAt:o.startTime,endedAt:o.endTime,total:o.totalAmount==null?null:Number(o.totalAmount),energy:o.energyKwh==null?null:Number(o.energyKwh),reason:o.failureReason||o.endReason||''})),reports:[]};
}
export function activeAlerts(db,now=Date.now()){
 const alerts=[];const socketMap=new Map(db.sockets.map(s=>[s.id,s]));const deviceMap=new Map(db.devices.map(d=>[d.id,d]));
 for(const device of db.devices)if(device.enabled!==false&&!device.online)alerts.push({key:`DEVICE:${device.id}:OFFLINE:${device.statusRevision??device.onlineChangedAt??0}`,title:'设备离线',body:device.code,stationId:device.stationId,deviceId:device.id,level:'关注'});
 for(const socket of db.sockets)if(socket.fault){const device=deviceMap.get(socket.deviceId);alerts.push({key:`SOCKET:${socket.id}:FAULT:${socket.statusRevision??socket.faultChangedAt??0}`,title:'插座故障',body:socket.code,stationId:device?.stationId,deviceId:device?.id,level:'紧急'});}
 for(const order of db.orders){let kind,title;if(order.status==='failed'){kind='START_FAILED';title='启动失败'}else if(order.status==='abnormal'){kind='ABNORMAL';title='异常占用待核验'}else if(order.status==='starting'&&now-Date.parse(order.startedAt?.replace(' ','T'))>60000){kind='START_TIMEOUT';title='启动确认超时'}else if(order.status==='charging'&&order.durationMinutes&&now-Date.parse(order.startedAt?.replace(' ','T'))>order.durationMinutes*60000+30000){kind='OVERDUE';title='定时停止待确认'}if(!kind)continue;
 const device=deviceMap.get(socketMap.get(order.socketId)?.deviceId);alerts.push({key:`ORDER:${order.id}:${kind}`,title,body:order.reason||order.number||String(order.id),stationId:order.stationId,deviceId:device?.id,orderId:order.id,level:'紧急'});}
 return alerts;
}
export function operationsStats(db,{from='',to='',scene=''}={}){
 const stations=db.stations.filter(s=>!scene||s.scene===scene),ids=new Set(stations.map(s=>s.id));
 const orders=db.orders.filter(o=>ids.has(o.stationId)&&(!from||String(o.startedAt).slice(0,10)>=from)&&(!to||String(o.startedAt).slice(0,10)<=to));
 const completed=orders.filter(o=>o.status==='ended');const hours=Array(24).fill(0),days=new Map();
 for(const o of orders){const hour=Number(String(o.startedAt).slice(11,13));if(Number.isInteger(hour)&&hour>=0&&hour<24)hours[hour]++;const date=String(o.startedAt||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;if(!days.has(date))days.set(date,{date,count:0,amount:0});const row=days.get(date);row.count++;if(o.status==='ended'&&Number.isFinite(o.total))row.amount+=o.total;}
 return {orders:orders.length,completed:completed.length,failed:orders.filter(o=>['failed','abnormal'].includes(o.status)).length,amount:completed.reduce((n,o)=>n+(Number.isFinite(o.total)?o.total:0),0),energy:completed.reduce((n,o)=>n+(Number.isFinite(o.energy)?o.energy:0),0),missingBills:completed.filter(o=>!Number.isFinite(o.total)).length,hours,days:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)),stations:stations.map(s=>{
  const devices=db.devices.filter(d=>d.stationId===s.id),deviceIds=new Set(devices.map(d=>d.id)),sockets=db.sockets.filter(p=>deviceIds.has(p.deviceId)),active=new Set(db.orders.filter(o=>o.stationId===s.id&&['starting','charging','abnormal'].includes(o.status)).map(o=>o.socketId)),done=completed.filter(o=>o.stationId===s.id);
  return {id:s.id,name:s.name,scene:s.scene||'未分类',sockets:sockets.length,occupied:active.size,amount:done.reduce((n,o)=>n+(Number.isFinite(o.total)?o.total:0),0),energy:done.reduce((n,o)=>n+(Number.isFinite(o.energy)?o.energy:0),0),completed:done.length};
 })};
}
