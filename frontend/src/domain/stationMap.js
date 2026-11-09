import {socketStatus} from './service.js'

export function stationPosition(station){
 const values=[station.lng,station.lat]
 if(values.some(v=>v===null||v===undefined||String(v).trim()===''||!Number.isFinite(Number(v))))return null
 const [lng,lat]=values.map(Number),type=String(station.coordinateType||'GCJ02').toUpperCase().replace(/[-_]/g,'')
 return type==='GCJ02'&&lng>=73&&lng<=135&&lat>=3&&lat<=54?[lng,lat]:null
}
export function buildStationMapRows(db){
 return db.stations.map(station=>{
  const devices=db.devices.filter(d=>d.stationId===station.id),ids=new Set(devices.map(d=>d.id))
  const sockets=db.sockets.filter(s=>ids.has(s.deviceId)),socketIds=new Set(sockets.map(s=>s.id))
  const counts={free:0,charging:0,starting:0,fault:0,abnormal:0,disabled:0,offline:0}
  const keys={'空闲':'free','充电中':'charging','启动中':'starting','故障':'fault','异常占用':'abnormal','停用':'disabled','离线':'offline'}
  for(const socket of sockets){const serverLabels={IDLE:'空闲',CHARGING:'充电中',FAULT:'故障',DISABLED:'停用',OFFLINE:'离线'};const label=Object.hasOwn(socket,'serverStatus')?(serverLabels[socket.serverStatus]||'停用'):socketStatus(db,socket);const key=keys[label];if(key)counts[key]++}
  const offlineDevices=devices.filter(d=>!d.online).length
  const hasAlert=offlineDevices>0||counts.fault>0||counts.abnormal>0
  return {...station,...counts,position:stationPosition(station),deviceCount:devices.length,socketCount:sockets.length,offlineDevices,hasAlert,
   pendingRepairs:db.reportsLoaded===false?null:db.reports.filter(r=>r.status==='pending'&&socketIds.has(r.socketId)).length,
   tone:!station.enabled?'disabled':hasAlert?'alert':counts.charging||counts.starting?'charging':'idle'}
 })
}
export function filterMapStations(rows,query='',status='all'){
 const term=String(query).trim().toLocaleLowerCase()
 return rows.filter(s=>(!term||`${s.name} ${s.address} ${s.id}`.toLocaleLowerCase().includes(term))&&
  (status==='all'||status==='idle'&&s.free>0||status==='alert'&&s.hasAlert||status==='disabled'&&!s.enabled))
}
export function projectMapStations(rows){
 const valid=rows.filter(s=>s.position),xs=valid.map(s=>s.position[0]),ys=valid.map(s=>s.position[1])
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),used=new Set()
 return valid.map(s=>{
  let x=maxX===minX?50:16+(s.position[0]-minX)/(maxX-minX)*68
  let y=maxY===minY?50:24+(maxY-s.position[1])/(maxY-minY)*52
  const key=`${x.toFixed(1)},${y.toFixed(1)}`
  if(used.has(key)){const i=used.size;x=Math.max(10,Math.min(90,x+Math.cos(i*2.4)*12));y=Math.max(15,Math.min(85,y+Math.sin(i*2.4)*10))}
  used.add(`${x.toFixed(1)},${y.toFixed(1)}`)
  return {...s,x,y}
 })
}
