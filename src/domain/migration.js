import { createService } from './service.js'
// Retain the old storage key and historical socket IDs; migrate a separate clone.
export function migrateV2(source){
  const db=JSON.parse(JSON.stringify(source)),originalDevices=db.devices,originalSockets=db.sockets
  db.version=3;db.rows=[];db.devices=[];db.sockets=[]
  const uid=p=>`${p}${++db.sequence}`
  const rowFor=(stationId,index)=>{let row=db.rows.find(r=>r.stationId===stationId&&r.index===index);if(!row){row={id:uid('MR'),stationId,index,name:`${String.fromCharCode(64+index)}排`};db.rows.push(row)}return row}
  for(const station of db.stations){let position=0
    for(const old of originalDevices.filter(d=>d.stationId===station.id)){
      const ports=originalSockets.filter(s=>s.deviceId===old.id).sort((a,b)=>a.number-b.number)
      for(let chunk=0;chunk<Math.max(1,Math.ceil(ports.length/2));chunk++){
        position++;const row=rowFor(station.id,Math.floor((position-1)/15)+1)
        let code=old.code;if(chunk){do{code=`EB-M${++db.sequence}`}while(db.devices.some(d=>d.code===code)||originalDevices.some(d=>d.code===code))}
        const d={...old,id:chunk?uid('MD'):old.id,code,legacyName:old.name,name:`${row.name}${String((position-1)%15+1).padStart(2,'0')}号双插座设备`,rowId:row.id,position:(position-1)%15+1};db.devices.push(d)
        for(let j=0;j<2;j++){const existing=ports[chunk*2+j],label=j===0?'A':'B';db.sockets.push({...existing,id:existing?.id||uid('MP'),deviceId:d.id,number:j+1,code:`${code}-${label}`,legacyCode:existing?.code,name:`${label}插座`,enabled:existing?.enabled??true,fault:existing?.fault??false,faultReason:existing?.faultReason||''})}
      }
    }
  }
  for(const order of db.orders){const socket=db.sockets.find(s=>s.id===order.socketId);if(socket)order.deviceId=socket.deviceId;order.rowName=order.rowName||'迁移前未记录排号'}
  const api=createService(db)
  for(const station of db.stations.filter(s=>/^ST0[1-5]$/.test(s.id))){
    const first=rowFor(station.id,1),count=db.devices.filter(d=>d.rowId===first.id).length
    if(count<12)api.addDevicesToRow(first.id,12-count)
    if(!db.rows.some(r=>r.stationId===station.id&&r.index===2))api.saveRow({stationId:station.id,name:'B排',deviceCount:12})
  }
  db.migration={from:2,description:'旧多口设备按双插座拆分，旧插座 ID、订单与报修关联保留；原 v2 存储未删除。'}
  return db
}
