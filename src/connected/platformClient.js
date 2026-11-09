export function formatNumber(value,digits=2){return value===null||value===undefined||value===''||!Number.isFinite(Number(value))?'—':Number(value).toFixed(digits)}
const labels={station:{OPERATING:'运营中',CLOSED:'停用',MAINTENANCE:'维护中'},device:{ONLINE:'在线',OFFLINE:'离线',DISABLED:'停用'},socket:{IDLE:'空闲',CHARGING:'充电中',FAULT:'故障',OFFLINE:'离线',DISABLED:'停用'},order:{STARTING:'启动中',CHARGING:'充电中',COMPLETED:'已结束',FAILED:'启动失败',ABNORMAL:'异常待处理'},payment:{UNPAID:'待支付',PAID:'已模拟支付',NOT_REQUIRED:'无需支付'}}
export const statusLabel=(value,kind)=>labels[kind]?.[value]||(value?`未知（${value}）`:'未提供')
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
  async login(username,password){token='';const version=++generation;const login=await request('/auth/login',{method:'POST',body:{username,password},anonymous:true,bearer:''});if(!login?.token||login.role!=='ADMIN')throw Error('请使用管理员账号登录，普通用户或运营员不能进入本管理端。');const profile=await request('/auth/me',{bearer:login.token});if(profile?.role!=='ADMIN')throw Error('此账号没有管理员权限。');if(version!==generation)throw Error('登录会话已变化。');token=login.token;return profile},
  logout(){token='';generation++},
  stations:()=>array('/stations'),devices:()=>array('/chargers'),sockets:()=>array('/connectors'),orders:()=>array('/orders'),order:value=>request(`/orders/${id(value)}`),
  users:(page=1,keyword='')=>request(`/auth/users?role=USER&page=${page}&size=20&keyword=${encodeURIComponent(keyword)}`),
  setUserEnabled(value,enabled){const safe=id(value);if(typeof enabled!=='boolean')throw Error('用户状态必须为布尔值。');return request(`/auth/users/${safe}/status?enabled=${enabled}`,{method:'PATCH'})},
  rates:value=>array(`/price-periods?stationId=${id(value)}`),audit:(page=1)=>request(`/audit-logs?page=${page}&size=20`)
 }
}
