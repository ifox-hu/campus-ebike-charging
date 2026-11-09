import { createService } from './service.js'
import {CAMPUS_DEMO_LOCATIONS,LEGACY_DEMO_LOCATIONS} from './campusLocations.js'
import {DEMO_ROW_LAYOUTS,LEGACY_DEMO_ROW_LAYOUTS} from './demoLayouts.js'

export function migrateDemoLayouts(source){
  const db=JSON.parse(JSON.stringify(source))
  for(const [stationId,counts] of Object.entries(DEMO_ROW_LAYOUTS)){
    const station=db.stations.find(s=>s.id===stationId)
    if(!station||station.demoLayoutRevision)continue
    const legacy=LEGACY_DEMO_ROW_LAYOUTS[stationId],serial=Number(stationId.slice(2))
    const rows=db.rows.filter(r=>r.stationId===stationId).sort((a,b)=>a.index-b.index)
    const devices=db.devices.filter(d=>d.stationId===stationId).sort((a,b)=>
      rows.findIndex(r=>r.id===a.rowId)-rows.findIndex(r=>r.id===b.rowId)||a.position-b.position)
    if(rows.length!==legacy.length||devices.length!==legacy.reduce((a,b)=>a+b,0)||
      rows.some((r,i)=>r.id!==`ROW${serial}-${i+1}`||r.name!==String.fromCharCode(65+i)+'排'||r.index!==i+1||db.devices.filter(d=>d.rowId===r.id).length!==legacy[i]))continue
    const nextRows=counts.map((_,i)=>({...rows[i],id:`ROW${serial}-${i+1}`,stationId,name:String.fromCharCode(65+i)+'排',index:i+1}))
    if(nextRows.some(row=>db.rows.some(r=>r.id===row.id&&r.stationId!==stationId)))continue
    const placements=[];let offset=0
    for(const [index,count] of counts.entries())for(let position=1;position<=count;position++)placements.push({device:devices[offset++],row:nextRows[index],position})
    const movedIds=new Set(placements.filter(p=>p.device.rowId!==p.row.id||p.device.position!==p.position).map(p=>p.device.id))
    // Do not renumber a device with an unfinished charging task.
    if(db.orders.some(o=>['starting','charging','abnormal'].includes(o.status)&&movedIds.has(o.deviceId)))continue
    db.rows=db.rows.filter(r=>r.stationId!==stationId).concat(nextRows)
    for(const {device,row,position} of placements){
      if(/^[A-Z]排\d+号双插座设备$/.test(device.name))device.name=row.name+String(position).padStart(2,'0')+'号双插座设备'
      device.rowId=row.id;device.position=position
    }
    station.demoLayoutRevision=1
  }
  return db
}

// Correct only the identified stock locations. Keep business data, custom
// stations and manually edited coordinates intact; never reset local storage.
export function migrateCampusLocations(source){
  const db=JSON.parse(JSON.stringify(source))
  for(const old of LEGACY_DEMO_LOCATIONS){
    const station=db.stations.find(s=>s.id===old.id)
    if(!station||station.name!==old.name||station.campusLocationRevision||
       Number(station.lat)!==old.lat||Number(station.lng)!==old.lng)continue
    Object.assign(station,CAMPUS_DEMO_LOCATIONS.find(s=>s.id===old.id))
  }
  return db
}
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
