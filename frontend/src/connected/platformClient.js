export function formatNumber(value,digits=2){return value===null||value===undefined||value===''||!Number.isFinite(Number(value))?'—':Number(value).toFixed(digits)}
const labels={station:{OPERATING:'运营中',CLOSED:'停用',MAINTENANCE:'维护中'},device:{ONLINE:'在线',OFFLINE:'离线',DISABLED:'停用'},socket:{IDLE:'空闲',CHARGING:'充电中',FAULT:'故障',OFFLINE:'离线',DISABLED:'停用'},order:{STARTING:'启动中',CHARGING:'充电中',COMPLETED:'已结束',START_FAILED:'启动失败',FAILED:'启动失败',ABNORMAL:'异常待处理'},repair:{OPEN:'待处理',PROCESSING:'处理中',RESOLVED:'已处理'},payment:{UNPAID:'待支付',PAID:'已模拟支付',NOT_REQUIRED:'无需支付'}}
export const statusLabel=(value,kind)=>labels[kind]?.[value]||(value?`未知（${value}）`:'未提供')
export function orderPresentation(order){
 const full=order.chargeMode==='FULL'||order.planId==='FULL'
 const plan=full?'充满自停':order.planId==='CUSTOM'?`自定义 ${order.durationMinutes??'未记录'} 分钟`:order.durationMinutes?`定时 ${order.durationMinutes} 分钟`:'历史订单未记录'
 const reasons={DURATION_REACHED:'已达到选择时长',USER_STOPPED:'用户提前结束',FULL_SIMULATED:'持续低功率，模拟充电结束',FULL_POWER_CONFIRMED:'持续低功率，设备停止已确认',MAX_DURATION_REACHED:'达到最长保护时限'}
 return {plan,meter:order.meteringSource==='SOFTWARE'?'软件模拟计量':order.meteringSource==='TCP'?'设备模拟器计量':'历史订单未记录',reason:reasons[order.endReason]||order.endReason||order.failureReason||'未记录'}
}
export function electricityRatePayload(form){
 if(form.electricityPrice===''||form.electricityPrice==null||!Number.isFinite(Number(form.electricityPrice))||Number(form.electricityPrice)<0)throw Error('电价必须为非负数')
 if(!/^[1-9]\d*$/.test(String(form.stationId)))throw Error('请选择站点')
 if(!/^\d{2}:\d{2}(:\d{2})?$/.test(form.startTime)||!/^\d{2}:\d{2}(:\d{2})?$/.test(form.endTime))throw Error('请填写HH:mm:ss格式的时间')
 return {stationId:Number(form.stationId),startTime:form.startTime,endTime:form.endTime,electricityPrice:Number(form.electricityPrice),servicePrice:0}
}
export function scopeRecords(rows,{stationId='',abnormalOnly=false,abnormalDeviceIds=[]}={}){
 const ids=new Set(abnormalDeviceIds.map(String))
 return rows.filter(row=>(!stationId||String(row.stationId)===String(stationId))&&(!abnormalOnly||row.status==='OFFLINE'||row.status==='FAULT'||ids.has(String(row.id))))
}
export function scopeDeviceCatalog(data,scope={}){
 const devices=scopeRecords(data.devices,scope),ids=new Set(devices.map(d=>String(d.stationId)))
 const stations=scope.stationId?data.stations.filter(s=>String(s.id)===String(scope.stationId)):scope.abnormalOnly?data.stations.filter(s=>ids.has(String(s.id))):data.stations
 return {...data,devices,stations}
}
export function relationRows(stations,devices,sockets){
 const siteMap=new Map(stations.map(s=>[s.id,s])),deviceMap=new Map(devices.map(d=>[d.id,d]))
 return {stations:stations.map(s=>{const own=devices.filter(d=>d.stationId===s.id);return {...s,deviceCount:own.length,socketCount:sockets.filter(p=>own.some(d=>d.id===p.chargerId)).length}}),devices:devices.map(d=>({...d,stationName:siteMap.get(d.stationId)?.name||`站点 #${d.stationId}`,socketCount:sockets.filter(p=>p.chargerId===d.id).length})),sockets:sockets.map(s=>({...s,deviceCode:deviceMap.get(s.chargerId)?.code||`设备 #${s.chargerId}`}))}
}
export function createPlatformClient({fetchImpl=globalThis.fetch,onExpired=()=>{},timeoutMs=10000}={}){
 let token='',generation=0
 function expire(){token='';generation++;onExpired()}
 async function request(path,{method='GET',body,anonymous=false,bearer=token}={}){
  if(!anonymous&&!bearer)throw Error('请先登录业务后端管理员账号。')
  const version=generation,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs)
  try{
   const headers={Accept:'application/json'};if(bearer)headers.Authorization=`Bearer ${bearer}`;if(body!==undefined)headers['Content-Type']='application/json'
   const r=await fetchImpl(`/api${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,cache:'no-store',credentials:'omit'})
   if(version!==generation)throw Object.assign(Error('会话已变化，已丢弃旧请求结果。'),{stale:true})
   const payload=await r.json().catch(()=>null)
   if(version!==generation)throw Object.assign(Error('会话已失效。'),{stale:true})
   if((r.status===401||payload?.code===401)&&!anonymous){expire();throw Object.assign(Error('登录已过期，请重新登录业务后端。'),{status:401})}
   if(!r.ok||!payload||![200,201].includes(payload.code))throw Object.assign(Error(payload?.message||(r.status>=500?'业务后端暂不可用，请检查数据库与服务。':'接口响应不符合约定。')),{status:r.status})
   return payload.data
  }catch(e){if(e.name==='AbortError')throw Error(method==='GET'?'业务后端响应超时，请重试读取。':'请求超时，结果尚未确认，请刷新核对后再操作。');if(e instanceof TypeError)throw Error('无法连接业务后端，请检查服务与代理配置。');throw e}finally{clearTimeout(timer)}
 }
 const array=async p=>{const data=await request(p);if(!Array.isArray(data))throw Error('接口列表格式不正确，未使用模拟数据替代。');return data}
 function id(value){if(!/^[1-9]\d*$/.test(String(value)))throw Error('无效记录编号。');return encodeURIComponent(value)}
 return {
  async login(username,password){token='';const version=++generation;const login=await request('/auth/login',{method:'POST',body:{username,password},anonymous:true,bearer:''});if(!login?.token||!['ADMIN','OPERATOR'].includes(login.role))throw Error('请使用管理员或运营员账号登录，普通用户不能进入管理端。');const profile=await request('/auth/me',{bearer:login.token});if(!['ADMIN','OPERATOR'].includes(profile?.role))throw Error('此账号没有管理员权限。');if(version!==generation)throw Error('登录会话已变化。');token=login.token;return profile},
  logout(){token='';generation++},
  stations:()=>array('/stations'),devices:()=>array('/chargers'),sockets:()=>array('/connectors'),orders:()=>array('/orders'),order:value=>request(`/orders/${id(value)}`),
  users:(page=1,keyword='')=>request(`/auth/users?role=USER&page=${page}&size=20&keyword=${encodeURIComponent(keyword)}`),
  setUserEnabled(value,enabled){const safe=id(value);if(typeof enabled!=='boolean')throw Error('用户状态必须为布尔值。');return request(`/auth/users/${safe}/status?enabled=${enabled}`,{method:'PATCH'})},
  rates:value=>array(`/price-periods?stationId=${id(value)}`),audit:(page=1)=>request(`/audit-logs?page=${page}&size=20`)
  ,repairs:(status='')=>array('/repairs'+(status?'?status='+encodeURIComponent(status):'')),
  handleRepair:(value,body)=>request('/repairs/'+id(value),{method:'PATCH',body})
  ,saveStation:(value,body)=>request('/stations'+(value?'/'+id(value):''),{method:value?'PUT':'POST',body}),
  createDevices:body=>request('/bike/devices',{method:'POST',body}),
  saveDevice:(value,body)=>request('/bike/devices/'+id(value),{method:'PATCH',body}),
  saveSocket:(value,body)=>request('/connectors/'+id(value),{method:'PUT',body}),
  setSocketStatus:(value,status)=>request('/bike/sockets/'+id(value)+'/status',{method:'PATCH',body:{status}}),
  saveRate:(value,body)=>request('/price-periods'+(value?'/'+id(value):''),{method:value?'PUT':'POST',body}),
  deleteRate:value=>request('/price-periods/'+id(value),{method:'DELETE'})
  ,alertAcks:()=>array('/alert-acknowledgements'),ackAlert:body=>request('/alert-acknowledgements',{method:'POST',body})
 }
}
