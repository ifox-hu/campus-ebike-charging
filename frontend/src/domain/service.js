export const activeStatuses = ['starting','charging','abnormal']
export const orderLabels = {starting:'启动中',charging:'充电中',ended:'已结束',abnormal:'异常待处理',failed:'启动失败'}
export const payLabels = {unpaid:'待支付',paid:'已模拟支付',none:'无需支付'}
export const money = n => Number(n || 0).toFixed(2)
export function stamp(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]))
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}
export const today = () => stamp().slice(0,10)
export function socketStatus(db,socket) {
  const d=db.devices.find(d=>d.id===socket.deviceId),s=db.stations.find(s=>s.id===d?.stationId)
  const active=db.orders.find(o=>o.socketId===socket.id&&activeStatuses.includes(o.status))
  if(socket.businessStatus)return ({IDLE:'空闲',CHARGING:'充电中',FAULT:'故障',OFFLINE:'离线',DISABLED:'停用',STARTING:'启动中'})[socket.businessStatus]||'异常占用'
  if(active?.status==='abnormal')return '异常占用'
  if(active?.status==='starting')return '启动中'
  if(active)return '充电中'
  if(!s?.enabled||!d?.enabled||!socket.enabled)return '停用'
  if(!d.online)return '离线'
  if(socket.fault)return '故障'
  return '空闲'
}
export function deviceStatus(db,d){
  if(!d.enabled||!db.stations.find(s=>s.id===d.stationId)?.enabled)return '停用'
  if(!d.online)return '离线'
  if(db.sockets.some(s=>s.deviceId===d.id&&s.fault))return '部分插座故障'
  return '正常'
}
export function createService(db){
  const get=(list,id)=>{const item=db[list].find(i=>i.id===id);if(!item)throw Error('关联记录不存在，请刷新页面。');return item}
  const uid=prefix=>`${prefix}${++db.sequence}`
  const text=(s,label)=>{if(!String(s??'').trim())throw Error(`请填写${label}。`);return String(s).trim()}
  const occupied=ids=>db.orders.some(o=>ids.includes(o.socketId)&&activeStatuses.includes(o.status))
  const idsForDevice=id=>db.sockets.filter(s=>s.deviceId===id).map(s=>s.id)
  function recalc(o){o.energy=Math.round(o.energy*1000)/1000;o.electricFee=Math.round(o.energy*o.electricRate*100)/100;o.serviceFee=Math.round(o.energy*o.serviceRate*100)/100;o.total=Math.round((o.electricFee+o.serviceFee)*100)/100}
  function record(o,type,description){(o.events??=[]).push({type,description,at:stamp(),source:'软件模拟'})}
  function flagAbnormal(ids,reason){for(const o of db.orders.filter(o=>ids.includes(o.socketId)&&['starting','charging'].includes(o.status))){o.status='abnormal';o.statusChangedAt=new Date().toISOString();o.reason=reason;record(o,'abnormal',reason)}}
  function addSocket(d,number){const label=number===1?'A':'B';db.sockets.push({id:uid('P'),deviceId:d.id,number,code:`${d.code}-${label}`,name:`${label}插座`,enabled:true,fault:false,faultReason:''})}
  const api = {
    setSocketPower(id,value){const s=get('sockets',id),watts=Number(value);if(!Number.isInteger(watts)||watts<1||watts>10000)throw Error('插座功率须为 1～10000 W 的整数。');if(['STARTING','CHARGING','ABNORMAL'].includes(s.businessStatus)||(!s.businessId&&occupied([id])))throw Error('插座存在未结束任务，不能修改功率。');s.powerWatts=watts},
    saveStation(payload,id){
      const name=text(payload.name,'站点名称'),address=text(payload.address,'站点地址')
      if(payload.lat===''||payload.lng===''||!Number.isFinite(Number(payload.lat))||!Number.isFinite(Number(payload.lng))||Math.abs(Number(payload.lat))>90||Math.abs(Number(payload.lng))>180)throw Error('请填写有效坐标：纬度 -90～90，经度 -180～180。')
      const values={name,address,scene:text(payload.scene,'应用场景'),lat:Number(payload.lat),lng:Number(payload.lng),note:String(payload.note||'')}
      if(id){const s=get('stations',id);Object.assign(s,values);return s}
      const s={id:uid('ST'),...values,enabled:true};db.stations.push(s);db.rates.push({stationId:s.id,electricRate:.6,serviceRate:.2,updatedAt:stamp()});return s
    },
    setStationEnabled(id,enabled){const s=get('stations',id);const devices=db.devices.filter(d=>d.stationId===id).map(d=>d.id);if(!enabled&&occupied(db.sockets.filter(p=>devices.includes(p.deviceId)).map(p=>p.id)))throw Error('站点存在未结束任务，请先处理充电或异常订单。');s.enabled=enabled},
    saveDevice(payload,id){
      const code=text(payload.code,'设备编号').toUpperCase(),name=text(payload.name,'设备名称')
      if(!/^[A-Z0-9][A-Z0-9_-]{1,29}$/.test(code))throw Error('设备编号须为 2～30 位字母、数字、横线或下划线。')
      if(db.devices.some(d=>d.code.toUpperCase()===code&&d.id!==id))throw Error('设备编号已存在。')
      if(payload.portCount!==undefined&&Number(payload.portCount)!==2)throw Error('当前场景采用双插座设备，每台固定 A、B 两个插座。请调整每排设备数量。')
      get('stations',payload.stationId)
      const row=get('rows',payload.rowId)
      if(row.stationId!==payload.stationId)throw Error('设备排不属于所选站点。')
      const old=id?get('devices',id):null
      const position=Number(payload.position||((old?.rowId===row.id?old.position:0)||Math.max(0,...db.devices.filter(d=>d.rowId===row.id).map(d=>d.position))+1))
      if(!Number.isInteger(position)||position<1)throw Error('排内序号须为正整数。')
      if(db.devices.some(d=>d.rowId===row.id&&d.position===position&&d.id!==id))throw Error('本排该序号已有设备，请选择其他位置。')
      if(id){
        const d=get('devices',id),current=db.sockets.filter(s=>s.deviceId===id)
        if((d.stationId!==payload.stationId||d.rowId!==row.id||d.position!==position||d.code!==code)&&occupied(current.map(s=>s.id)))throw Error('设备存在活动任务，不能修改归属、排内位置或编号。')
        if(current.length!==2)throw Error('旧多插座数据尚未迁移，请刷新页面。')
        Object.assign(d,{code,name,stationId:payload.stationId,rowId:row.id,position})
        for(const s of current){const label=s.number===1?'A':'B';s.code=`${code}-${label}`;s.name=`${label}插座`}
        return d
      }
      const d={id:uid('D'),code,name,stationId:payload.stationId,rowId:row.id,position,enabled:true,online:true,createdAt:stamp()};db.devices.push(d);addSocket(d,1);addSocket(d,2);return d
    },
    saveRow(payload,id){
      get('stations',payload.stationId);const name=text(payload.name,'设备排名称')
      if(db.rows.some(r=>r.stationId===payload.stationId&&r.name===name&&r.id!==id))throw Error('该站点已有同名设备排。')
      if(id){const r=get('rows',id);if(r.stationId!==payload.stationId)throw Error('设备排不能直接移动到其他站点。');r.name=name;return r}
      const count=Number(payload.deviceCount??12);if(!Number.isInteger(count)||count<1||count>100)throw Error('本排初始设备数量须为 1～100 台，可随后追加。')
      const row={id:uid('ROW'),stationId:payload.stationId,name,index:Math.max(0,...db.rows.filter(r=>r.stationId===payload.stationId).map(r=>r.index))+1};db.rows.push(row);api.addDevicesToRow(row.id,count);return row
    },
    addDevicesToRow(rowId,count){
      const row=get('rows',rowId);count=Number(count)
      if(!Number.isInteger(count)||count<1||count>100)throw Error('单次追加设备数量须为 1～100 台。')
      const added=[];for(let i=0;i<count;i++){let code;do{code=`EB-${String(++db.sequence).padStart(5,'0')}`}while(db.devices.some(d=>d.code===code));added.push(api.saveDevice({code,name:`${row.name}双插座设备`,stationId:row.stationId,rowId:row.id,portCount:2}))}return added
    },
    setDeviceEnabled(id,enabled){const d=get('devices',id);if(!enabled&&occupied(idsForDevice(id)))throw Error('设备存在未结束任务，不能停用。');d.enabled=enabled},
    setDeviceOnline(id,online){const d=get('devices',id);if(d.online!==online)d.onlineChangedAt=new Date().toISOString();d.online=online;if(!online)flagAbnormal(idsForDevice(id),'模拟设备离线，停止状态待核验；插座保持占用。')},
    setSocketEnabled(id,enabled){const s=get('sockets',id);if(!enabled&&occupied([id]))throw Error('插座存在未结束任务，不能停用。');s.enabled=enabled},
    setSocketFault(id,fault,reason='插座故障（模拟）'){const s=get('sockets',id),nextReason=fault?text(reason,'故障说明'):'';if(s.fault!==fault||s.faultReason!==nextReason)s.faultChangedAt=new Date().toISOString();s.fault=fault;s.faultReason=nextReason;if(fault)flagAbnormal([id],`${s.faultReason}，停止状态待核验。`)},
    setUserEnabled(id,enabled){get('users',id).enabled=enabled},
    saveRate(stationId,electricRate,serviceRate){
      get('stations',stationId)
      const a=Number(electricRate),b=Number(serviceRate)
      if(electricRate===''||serviceRate===''||!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<0)throw Error('费率必须是非负有效数字。')
      const rate=db.rates.find(r=>r.stationId===stationId);Object.assign(rate,{electricRate:a,serviceRate:b,updatedAt:stamp()});return rate
    },
    requestStartSimulation(socketId,userId,requestKey){
      if(requestKey){requestKey=text(requestKey,'启动请求标识');const previous=db.orders.find(o=>o.requestKey===requestKey);if(previous){if(previous.socketId!==socketId||previous.userId!==userId)throw Error('该启动请求已用于其他用户或插座。');return previous}}
      const socket=get('sockets',socketId),device=get('devices',socket.deviceId),station=get('stations',device.stationId),user=get('users',userId)
      if(!user.enabled)throw Error('用户已停用，禁止新建充电任务。')
      if(occupied([socketId]))throw Error('插座已被未结束任务占用。')
      if(!station.enabled||!device.enabled||!socket.enabled)throw Error('站点、设备或插座已停用。')
      if(!device.online)throw Error('设备离线，禁止启动。')
      if(socket.fault)throw Error('插座存在故障，禁止启动。')
      const rate=db.rates.find(r=>r.stationId===station.id)
      const id=uid('O'),o={id,number:`SIM${today().replaceAll('-','')}${db.sequence}`,requestKey:requestKey||id,userId,stationId:station.id,deviceId:device.id,socketId,stationName:station.name,deviceCode:device.code,socketCode:socket.code,status:'starting',payStatus:'none',requestedAt:stamp(),startedAt:stamp(),endedAt:'',minutes:0,energy:0,electricRate:rate.electricRate,serviceRate:rate.serviceRate,electricFee:0,serviceFee:0,total:0,reason:''}
      const row=db.rows.find(r=>r.id===device.rowId);o.rowId=row?.id;o.rowName=row?.name||'';o.position=device.position;record(o,'requested','提交启动请求，插座保持占用，等待模拟设备反馈。');db.orders.unshift(o);return o
    },
    confirmStartSimulation(id,success,reason='模拟设备启动失败'){
      const o=get('orders',id)
      if(typeof success!=='boolean')throw Error('设备反馈必须明确成功或失败。')
      if((o.status==='charging'&&success)||(o.status==='failed'&&!success))return o
      if(o.status!=='starting')throw Error('订单状态已变化，不能接受该启动反馈。')
      if(!success){o.reason=text(reason,'启动失败原因');o.status='failed';o.payStatus='none';o.endedAt=stamp();record(o,'start-failed',o.reason);return o}
      const socket=get('sockets',o.socketId),device=get('devices',o.deviceId),station=get('stations',o.stationId)
      if(!device.online||socket.fault||!socket.enabled||!device.enabled||!station.enabled)throw Error('设备当前不可启动，请核验异常状态。')
      o.status='charging';o.startedAt=stamp();o.payStatus='unpaid';record(o,'started','模拟设备确认启动成功。');return o
    },
    // Retained for existing one-step simulation callers; UI uses explicit request/feedback.
    startSimulation(socketId,userId){const o=api.requestStartSimulation(socketId,userId);return api.confirmStartSimulation(o.id,true)},
    advanceSimulation(id,minutes=10){const o=get('orders',id);if(o.status!=='charging')throw Error('仅充电中的任务可以推进模拟电量。');if(!Number.isFinite(minutes)||minutes<=0)throw Error('模拟时长必须大于零。');o.minutes+=minutes;o.energy+=.3*minutes/60;recalc(o);return o},
    endSimulation(id){const o=get('orders',id);if(o.status==='ended')return o;if(o.status!=='charging')throw Error('任务尚未正常充电或处于异常，请先核验处理。');o.status='ended';o.endedAt=stamp();o.reason='用户结束（软件模拟）';recalc(o);o.payStatus=o.total>0?'unpaid':'none';record(o,'ended',o.reason);return o},
    resolveOrder(id,reason,verified){const o=get('orders',id);if(o.status!=='abnormal')throw Error('该订单无需异常核验。');if(!verified)throw Error('请先勾选已核验设备停止，才能释放占用。');o.reason=text(reason,'异常处理原因');o.status='ended';o.endedAt=stamp();recalc(o);o.payStatus=o.total>0?'unpaid':'none';record(o,'verified',o.reason);return o},
    paySimulation(id){const o=get('orders',id);if(o.status!=='ended')throw Error('订单结束后才允许模拟支付。');if(o.payStatus==='paid'||o.payStatus==='none')return o;o.payStatus='paid';o.paidAt=stamp();record(o,'paid','模拟支付成功，无真实收款。');return o},
    resolveReport(id,resolution){const r=get('reports',id);r.resolution=text(resolution,'处理说明');r.status='resolved';r.resolvedAt=stamp();return r},
  }
  return api
}
