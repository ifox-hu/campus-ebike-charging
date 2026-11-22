export const DEMO_OPERATORS=Object.freeze([
 Object.freeze({id:'platform',name:'平台自营'}),
 Object.freeze({id:'campus',name:'校园运营商'}),
 Object.freeze({id:'hospital',name:'医院运营商'}),
])

const seededOwners=new Map([
 ...['ST01','ST02','ST03','ST04','ST05','ST06'].map(id=>[id,'campus']),
 ...['ST07','ST08'].map(id=>[id,'hospital']),
])

export function addOperatorOwnership(data){
 for(const station of data.stations){
  station.operatorId??=seededOwners.get(station.id)||'platform'
 }
 return data
}

const scopedCollections={
 stations:'id',rows:'id',devices:'id',sockets:'id',rates:'stationId',orders:'id',reports:'id',
}

export function operatorDemoData(data,operatorId){
 if(!operatorId)return data
 const stations=data.stations.filter(site=>site.operatorId===operatorId)
 const siteIds=new Set(stations.map(site=>site.id))
 const devices=data.devices.filter(device=>siteIds.has(device.stationId))
 const deviceIds=new Set(devices.map(device=>device.id))
 const sockets=data.sockets.filter(socket=>deviceIds.has(socket.deviceId))
 const socketIds=new Set(sockets.map(socket=>socket.id))
 return {
  ...data,stations,devices,sockets,
  rows:data.rows.filter(row=>siteIds.has(row.stationId)),
  rates:data.rates.filter(rate=>siteIds.has(rate.stationId)),
  orders:data.orders.filter(order=>siteIds.has(order.stationId)&&socketIds.has(order.socketId)),
  reports:data.reports.filter(report=>socketIds.has(report.socketId)),
 }
}

export function mergeOperatorDemoData(all,view,operatorId){
 if(!operatorId)return addOperatorOwnership({...view})
 const previous=operatorDemoData(all,operatorId)
 const merged={...all,sequence:view.sequence}
 for(const [collection,key] of Object.entries(scopedCollections)){
  const oldIds=new Set(previous[collection].map(record=>record[key]))
  const changed=new Map(view[collection].map(record=>[record[key],record]))
  merged[collection]=all[collection].flatMap(record=>{
   if(!oldIds.has(record[key]))return [record]
   const next=changed.get(record[key])
   changed.delete(record[key])
   return next?[next]:[]
  }).concat([...changed.values()])
 }
 return merged
}
