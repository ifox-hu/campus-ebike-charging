// Local demonstration migration only. Never apply this to server catalog IDs.
const stockRows={baoan:[12,15,12],garden:[14,14],campus:[12,12]}
export function normalizeDualSocketLayout(input,{preserveLegacyCodes=true}={}){
 const state=JSON.parse(JSON.stringify(input))
 if(state.version===2)return state
 let serial=27000000
 const ids=new Set(state.stations.flatMap(s=>s.devices.map(d=>String(d.id))))
 const socketCodes=new Set(state.stations.flatMap(s=>s.devices.flatMap(d=>d.sockets.map(p=>p.code))))
 function nextId(){let id;do{id=String(++serial)}while(ids.has(id)||socketCodes.has(id+'-01'));ids.add(id);return id}
 for(const station of state.stations){
  const units=[]
  for(const original of station.devices){
   for(let offset=0;offset<original.sockets.length;offset+=2){
    let id=String(original.id)
    if(offset){id=preserveLegacyCodes?`${original.id}-M${offset/2+1}`:nextId();if(preserveLegacyCodes){if(ids.has(id))id=nextId();else ids.add(id)}}
    const sockets=original.sockets.slice(offset,offset+2).map((p,i)=>({...p,code:preserveLegacyCodes?p.code:`${id}-0${i+1}`,number:i+1,label:i===0?'A':'B',name:i===0?'A插座':'B插座'}))
    if(sockets.length===1){let code=String(original.id)+'-02';if(socketCodes.has(code))code=nextId()+'-02';socketCodes.add(code);sockets.push({code,number:2,label:'B',name:'B插座',status:'idle'})}
    units.push({...original,id,code:offset?id:(original.code||String(original.id)),legacyDeviceId:String(original.id),sockets})
   }
  }
  const counts=stockRows[station.id]?[...stockRows[station.id]]:[]
  // Only stock demonstration sites receive additional sample devices.
  const target=counts.reduce((a,b)=>a+b,0)
  while(units.length<target){const id=nextId();units.push({id,code:id,online:true,enabled:true,sockets:['A','B'].map((label,i)=>({code:`${id}-0${i+1}`,number:i+1,label,name:label+'插座',status:'idle'}))})}
  if(!counts.length&&units.length)for(let left=units.length;left>0;left-=12)counts.push(Math.min(12,left))
  while(counts.reduce((a,b)=>a+b,0)<units.length)counts.push(Math.min(12,units.length-counts.reduce((a,b)=>a+b,0)))
  station.rows=counts.map((_,i)=>({id:`${station.id}-row-${i+1}`,name:i<26?String.fromCharCode(65+i)+'排':`第${i+1}排`,index:i+1}))
  let offset=0
  for(const [i,count] of counts.entries()){const row=station.rows[i];for(let position=1;position<=count&&offset<units.length;position++,offset++){Object.assign(units[offset],{rowId:row.id,rowName:row.name,position,name:`${row.name}${String(position).padStart(2,'0')}号双插座设备`})}}
  station.devices=units
 }
 state.version=2
 return state
}
export function groupStationRows(station){
 if(!station)return []
 const known=new Map((station.rows||[]).map(r=>[String(r.id),r])),groups=new Map()
 for(const device of station.devices||[]){const id=device.rowId?String(device.rowId):'unassigned';if(!groups.has(id)){const row=known.get(id);groups.set(id,{id,name:row?.name||device.rowName||'未提供排号',index:row?.index||0,devices:[]})}groups.get(id).devices.push(device)}
 return [...groups.values()].sort((a,b)=>a.index-b.index)
}
