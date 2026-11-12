// This mapping is based on the audited backend at 1f881ef. Unknown states
// remain unavailable; missing money/measurements are never replaced by zero.
const identifier=value=>{
  if((typeof value==='number'&&Number.isSafeInteger(value))||(typeof value==='string'&&value))return String(value);
  throw new Error('服务返回的资源编号无效');
};
const list=value=>{if(!Array.isArray(value))throw new Error('服务返回的列表格式不正确');return value;};
export const scaledNumber=(value,scale)=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Math.round(Number(value)*scale):null;
export function mapCatalog(stations,chargers,connectors) {
  list(chargers); list(connectors);
  return list(stations).map(s=>({
    id:identifier(s.id),name:s.name,address:s.address,area:'',scene:s.scene||'未分类',enabled:s.status==='OPERATING',
    latitude:s.latitude,longitude:s.longitude,coordinateType:s.coordinateType,rates:null,ratePeriods:null,
    devices:chargers.filter(d=>String(d.stationId)===String(s.id)).map(d=>({
      id:identifier(d.id),code:d.code,name:d.name,online:d.status==='ONLINE',enabled:d.enabled!==false&&['ONLINE','OFFLINE'].includes(d.status),rowName:d.rowName||'',rowId:d.rowName?identifier(s.id)+':'+d.rowName:null,
      sockets:connectors.filter(p=>String(p.chargerId)===String(d.id)).map((p,index)=>({
        id:identifier(p.id),code:p.code,name:p.name,number:index+1,
        status:({IDLE:'idle',CHARGING:'charging',FAULT:'fault',DISABLED:'disabled'})[p.status]||'unknown'
      }))
    }))
  }));
}
export function parseServerTime(value) {
  if(typeof value!=='string')return null;
  // Java LocalDateTime has no UTC offset. Parse components for iOS compatibility;
  // display the server's literal local time instead of interpreting it as UTC.
  const m=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  return m?new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0)).getTime():null;
}
export function mapOrder(raw,stations) {
  const station=stations.find(s=>s.id===String(raw.stationId));
  const socket=station?.devices.flatMap(d=>d.sockets).find(p=>p.id===String(raw.connectorId));
  const startedAt=parseServerTime(raw.startTime),endedAt=parseServerTime(raw.endTime);
  return {
    id:identifier(raw.id),orderNo:raw.orderNo,stationId:String(raw.stationId),connectorId:String(raw.connectorId),stationName:raw.stationNameSnapshot||station?.name||`站点 #${raw.stationId}`,
    socketCode:raw.socketCodeSnapshot||socket?.code||`插座 #${raw.connectorId}`,startedAt,endedAt,
    startTimeText:raw.startTime,endTimeText:raw.endTime,
    minutes:Number.isFinite(raw.elapsedSeconds)?Math.floor(raw.elapsedSeconds/60):startedAt!==null&&endedAt!==null?Math.max(0,Math.floor((endedAt-startedAt)/60000)):null,
    status:({STARTING:'starting',CHARGING:'charging',COMPLETED:'ended',ENDED:'ended',START_FAILED:'failed'})[raw.status]||'unknown',
    payment:({UNPAID:'unpaid',PAID:'paid',NOT_REQUIRED:'free'})[raw.paymentStatus]||'unknown',
    energyWh:scaledNumber(raw.energyKwh,1000),electricityCents:scaledNumber(raw.electricityFee,100),
    serviceCents:scaledNumber(raw.serviceFee,100),totalCents:scaledNumber(raw.totalAmount,100),
    chargePlan:raw.planId?{id:raw.planId,minutes:raw.durationMinutes,label:({HOUR_1:'1h',HOUR_2:'2h',HOUR_3:'3h',FULL:'充满自停',CUSTOM:`自定义 ${raw.durationMinutes}分钟`})[raw.planId]||raw.planId}:null,
    completionPolicy:raw.completionPolicy,currentPowerWatts:raw.currentPowerWatts==null?null:Number(raw.currentPowerWatts),
    estimatedCents:scaledNumber(raw.estimatedAmount,100),endReason:raw.endReason||'',
    rates:null,ratePeriods:readSnapshot(raw.priceSnapshot),meteringSource:raw.meteringSource,simulatedPowerWatts:raw.simulatedPowerWatts,failureReason:raw.failureReason||''
  };
}
export const mapOrders=(orders,stations)=>list(orders).map(raw=>mapOrder(raw,stations));
function readSnapshot(value){if(!value)return null;try{const rows=typeof value==='string'?JSON.parse(value):value;return Array.isArray(rows)?rows:null;}catch{return null;}}
export const mapReport=raw=>({id:identifier(raw.id),socketCode:raw.socketCode||raw.deviceCode,deviceCode:raw.deviceCode,stationName:raw.stationName,description:raw.description,
    status:({OPEN:'pending',PROCESSING:'processing',RESOLVED:'resolved'})[raw.status]||'unknown',resolution:raw.resolution||'',timeline:readSnapshot(raw.progressHistory)||[],createdAt:parseServerTime(raw.createdAt),updatedAt:parseServerTime(raw.updatedAt)});
export const mapReports=rows=>list(rows).map(mapReport);
export function resolveBackendSocket(stations,value) {
  let code=String(value||'').trim();
  const match=code.match(/[?&]socket=([^&#]+)/);
  if(match){try{code=decodeURIComponent(match[1]);}catch{throw new Error('插座编号格式不正确');}}
  const matches=stations.flatMap(station=>station.devices.flatMap(device=>device.sockets.filter(socket=>socket.code===code).map(socket=>({station,device,socket}))));
  if(matches.length>1)throw new Error('插座编号不唯一，请从站点列表选择');
  if(!matches.length)throw new Error('未找到该插座，请核对编号');
  return matches[0];
}
