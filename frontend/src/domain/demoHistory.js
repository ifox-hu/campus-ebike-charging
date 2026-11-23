import {today} from './service.js'
import {dashboardRange} from './dashboardPeriod.js'

// Only the local demonstration store calls this migration.
export function ensureDemoHistory(data,end=today()){
 const range=dashboardRange('sixMonths',end),months=[]
 for(const date=new Date(`${range.start}T00:00:00Z`);date.toISOString().slice(0,7)<=end.slice(0,7);date.setUTCMonth(date.getUTCMonth()+1))months.push(date.toISOString().slice(0,7))
 const completed=new Set(data.demoHistoryMonths||[]),pending=months.filter(month=>!completed.has(month))
 if(!pending.length)return data
 const result={...data,users:[...data.users],orders:[...data.orders]},knownUsers=new Set(data.users.map(u=>u.id)),knownOrders=new Set(data.orders.map(o=>o.id))
 for(const month of pending){
  for(const [si,station] of data.stations.entries()){
   const devices=data.devices.filter(d=>d.stationId===station.id&&d.enabled&&d.online)
   if(!devices.length)continue
   const count=3+(Number(month.slice(5))+si)%5
   for(let i=0;i<count;i++){
    const device=devices[i%devices.length],socket=data.sockets.find(s=>s.deviceId===device.id&&s.enabled&&!s.fault)
    if(!socket)continue
    const row=data.rows.find(r=>r.id===device.rowId),key=`${month}-${station.id}-${i}`,id=`HIST-${key}`,userId=`HU-${key}`
    const day=month===end.slice(0,7)?Math.min(Number(end.slice(8)),2+i*4):2+i*4
    const date=`${month}-${String(day).padStart(2,'0')}`,startedAt=`${date} 08:00:00`,endedAt=`${date} 10:00:00`
    const rate=data.rates.find(r=>r.stationId===station.id),electricRate=rate?.electricRate??.6,serviceRate=rate?.serviceRate??.06,energy=Number((.4+((si+i)%7)*.08).toFixed(3))
    const electricFee=Number((energy*electricRate).toFixed(2)),serviceFee=Number((energy*serviceRate).toFixed(2))
    if(!knownUsers.has(userId)){result.users.push({id:userId,account:`history_${key}`,name:`演示用户${month.replace('-','')}${String(si+1).padStart(2,'0')}${i+1}`,enabled:true,createdAt:`${date} 07:30:00`});knownUsers.add(userId)}
    if(!knownOrders.has(id)){
     result.orders.push({id,number:`DEMOH${key.replaceAll('-','')}`,userId,stationId:station.id,...(station.operatorId?{operatorId:station.operatorId}:{}),deviceId:device.id,socketId:socket.id,stationName:station.name,deviceCode:device.code,socketCode:socket.code,rowId:row?.id,rowName:row?.name||'',position:device.position,status:'ended',payStatus:'paid',startedAt,endedAt,minutes:120,energy,electricRate,serviceRate,electricFee,serviceFee,total:Number((electricFee+serviceFee).toFixed(2)),reason:'充电完成（软件模拟）'})
     knownOrders.add(id)
    }
   }
  }
  completed.add(month)
 }
 result.demoHistoryMonths=[...completed].sort()
 return result
}
