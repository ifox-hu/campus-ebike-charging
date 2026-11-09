export function createSeed() {
  const stations = [
    ['ST01','教学楼东侧示例站','校园','教学区东侧集中停车棚',32.9912,112.5231],
    ['ST02','食堂北侧示例站','校园','食堂北侧非机动车停车区',32.9931,112.5252],
    ['ST03','体育馆示例站','校园','体育馆西侧停车棚',32.9896,112.5208],
    ['ST04','园区通勤示例站','园区','园区南门员工停车区',32.9875,112.5294],
    ['ST05','住宅小区示例站','住宅小区','小区集中非机动车车棚',32.9953,112.5311],
  ].map(([id,name,scene,address,lat,lng])=>({id,name,scene,address,lat,lng,enabled:true,note:'模拟站点；GCJ-02 示例坐标，不代表实际部署。'}))
  const users=Array.from({length:10},(_,i)=>({id:`U${i+1}`,account:`demo${String(i+1).padStart(3,'0')}`,name:`演示用户${String(i+1).padStart(2,'0')}`,enabled:i!==9,createdAt:`2026-11-${String(3+i%7).padStart(2,'0')} 09:00:00`}))
  const rowCounts=[[12,15,12],[16,12],[12],[14,14],[12,10]]
  const rows=[],devices=[]
  for(const [si,counts] of rowCounts.entries())for(const [ri,count] of counts.entries()){
    const row={id:`ROW${si+1}-${ri+1}`,stationId:stations[si].id,name:`${String.fromCharCode(65+ri)}排`,index:ri+1};rows.push(row)
    for(let position=1;position<=count;position++){
      const n=devices.length+1
      devices.push({id:`D${n}`,code:`EB-${String(n).padStart(4,'0')}`,name:`${row.name}${String(position).padStart(2,'0')}号双插座设备`,stationId:row.stationId,rowId:row.id,position,online:n!==11,enabled:n!==12,createdAt:'2026-11-01 09:00:00'})
    }
  }
  const sockets=devices.flatMap((d,i)=>Array.from({length:2},(_,j)=>({id:`${d.id}P${j+1}`,deviceId:d.id,number:j+1,code:`${d.code}-${j===0?'A':'B'}`,name:`${j===0?'A':'B'}插座`,enabled:true,fault:(i===5&&j===1)||(i===7&&j===0),faultReason:i===5&&j===1?'过流告警':i===7&&j===0?'插座损坏':''})))
  const rates=stations.map(s=>({stationId:s.id,electricRate:.6,serviceRate:.2,updatedAt:'2026-11-01 09:00:00'}))
  const orders=[]
  for(let i=0;i<42;i++){
    const socket=sockets[(i*3)%sockets.length],device=devices.find(d=>d.id===socket.deviceId),station=stations.find(s=>s.id===device.stationId)
    const day=3+i%7,energy=Number((.25+(i%8)*.075).toFixed(3)),electricFee=Math.round(energy*.6*100)/100,serviceFee=Math.round(energy*.2*100)/100
    orders.push({id:`O${i+1}`,number:`DEMO202611${String(day).padStart(2,'0')}${String(i+1).padStart(4,'0')}`,userId:`U${1+i%9}`,stationId:station.id,deviceId:device.id,socketId:socket.id,stationName:station.name,deviceCode:device.code,socketCode:socket.code,status:'ended',payStatus:i%5===0?'unpaid':'paid',startedAt:`2026-11-${String(day).padStart(2,'0')} ${String(8+i%10).padStart(2,'0')}:00:00`,endedAt:`2026-11-${String(day).padStart(2,'0')} ${String(9+i%10).padStart(2,'0')}:30:00`,minutes:90,energy,electricRate:.6,serviceRate:.2,electricFee,serviceFee,total:Math.round((electricFee+serviceFee)*100)/100,reason:'用户结束（软件模拟）'})
  }
  for(const [i,socketId] of ['D1P1','D3P1','D4P2','D11P1'].entries()){
    const socket=sockets.find(s=>s.id===socketId),device=devices.find(d=>d.id===socket.deviceId),station=stations.find(s=>s.id===device.stationId)
    orders.unshift({id:`OA${i}`,number:`DEMO20261109009${i}`,userId:`U${i+1}`,stationId:station.id,deviceId:device.id,socketId:socket.id,stationName:station.name,deviceCode:device.code,socketCode:socket.code,status:i===3?'abnormal':'charging',payStatus:'unpaid',startedAt:'2026-11-09 10:00:00',endedAt:'',minutes:60,energy:.3,electricRate:.6,serviceRate:.2,electricFee:.18,serviceFee:.06,total:.24,reason:i===3?'设备离线，待核验停止状态':''})
  }
  orders.push({...orders.at(-1),id:'OF1',number:'DEMO202611090100',status:'failed',payStatus:'none',startedAt:'2026-11-09 09:00:00',endedAt:'2026-11-09 09:00:00',minutes:0,energy:0,electricFee:0,serviceFee:0,total:0,reason:'软件模拟启动失败；未产生费用'})
  for(const order of orders){const d=devices.find(d=>d.id===order.deviceId),row=rows.find(r=>r.id===d?.rowId);order.rowId=row?.id;order.rowName=row?.name||'';order.position=d?.position}
  const reports=[
    {id:'R1',userId:'U2',socketId:'D6P2',description:'插座充电时提示过流，请检查。',status:'pending',createdAt:'2026-11-09 10:20:00',resolution:'',resolvedAt:''},
    {id:'R2',userId:'U3',socketId:'D8P1',description:'插座外观损坏，暂未使用。',status:'pending',createdAt:'2026-11-09 09:15:00',resolution:'',resolvedAt:''},
    {id:'R3',userId:'U4',socketId:'D11P1',description:'设备页面一直显示离线。',status:'pending',createdAt:'2026-11-09 10:30:00',resolution:'',resolvedAt:''},
    {id:'R4',userId:'U1',socketId:'D2P1',description:'设备编号贴纸模糊。',status:'resolved',createdAt:'2026-11-07 09:00:00',resolution:'已更换示例编号贴纸；不涉及插座故障状态。',resolvedAt:'2026-11-08 14:00:00'},
  ]
  return {version:3,sequence:1000,stations,rows,devices,sockets,users,rates,orders,reports}
}
