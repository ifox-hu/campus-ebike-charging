import { reactive, watch, computed } from 'vue'
import { createSeed } from './seed.js'
import { migrateV2 } from './migration.js'
import { createService, deviceStatus, socketStatus, activeStatuses } from './service.js'
const STORAGE_KEY='ebike-graduation-admin-demo-v3'
let initial=createSeed()
try{const valid=s=>s&&['stations','devices','sockets','users','rates','orders','reports'].every(k=>Array.isArray(s[k]))&&Number.isInteger(s.sequence);const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(valid(stored)&&stored.version===3&&Array.isArray(stored.rows))initial=stored;else{const old=JSON.parse(localStorage.getItem('ebike-graduation-admin-demo-v2')||'null');if(valid(old)&&old.version===2)initial=migrateV2(old)}}catch{}
export const db=reactive(initial)
export const api=createService(db)
export const storageWarning=reactive({message:''})
watch(db,()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db));storageWarning.message=''}catch{storageWarning.message='浏览器未能保存演示数据，刷新可能恢复初始数据。'}},{deep:true,flush:'post',immediate:true})
export const socketsView=computed(()=>db.sockets.map(s=>{const device=db.devices.find(d=>d.id===s.deviceId),station=db.stations.find(st=>st.id===device?.stationId),order=db.orders.find(o=>o.socketId===s.id&&activeStatuses.includes(o.status));return {...s,device,station,order,status:socketStatus(db,s)}}))
export const devicesView=computed(()=>db.devices.map(d=>{const sockets=socketsView.value.filter(s=>s.deviceId===d.id),ended=db.orders.filter(o=>o.deviceId===d.id&&o.status==='ended');return {...d,row:db.rows.find(r=>r.id===d.rowId),station:db.stations.find(s=>s.id===d.stationId),portCount:sockets.length,free:sockets.filter(s=>s.status==='空闲').length,starting:sockets.filter(s=>s.status==='启动中').length,charging:sockets.filter(s=>s.status==='充电中').length,abnormal:sockets.filter(s=>s.status==='异常占用').length,faults:sockets.filter(s=>s.fault).length,status:deviceStatus(db,d),amount:ended.reduce((n,o)=>n+o.total,0),energy:ended.reduce((n,o)=>n+o.energy,0),times:ended.length}}))
export const stationsView=computed(()=>db.stations.map(s=>{const devices=devicesView.value.filter(d=>d.stationId===s.id),sockets=socketsView.value.filter(p=>p.station?.id===s.id);return {...s,rowCount:db.rows.filter(r=>r.stationId===s.id).length,deviceCount:devices.length,portCount:sockets.length,free:sockets.filter(p=>p.status==='空闲').length,charging:sockets.filter(p=>p.status==='充电中').length,rate:db.rates.find(r=>r.stationId===s.id)}}))
export const rowsView=computed(()=>db.rows.map(r=>{const devices=devicesView.value.filter(d=>d.rowId===r.id).sort((a,b)=>a.position-b.position);return {...r,devices,deviceCount:devices.length,portCount:devices.reduce((n,d)=>n+d.portCount,0),free:devices.reduce((n,d)=>n+d.free,0),starting:devices.reduce((n,d)=>n+d.starting,0),charging:devices.reduce((n,d)=>n+d.charging,0)}}).sort((a,b)=>a.index-b.index))
export const ordersView=computed(()=>db.orders.map(o=>({...o,user:db.users.find(u=>u.id===o.userId)})))
export const reportsView=computed(()=>db.reports.map(r=>({...r,user:db.users.find(u=>u.id===r.userId),socket:socketsView.value.find(s=>s.id===r.socketId)})))
