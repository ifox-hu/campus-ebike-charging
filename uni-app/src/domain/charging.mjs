// Local demonstration only. Monetary inputs and outputs use integer cents.
import {normalizeDualSocketLayout} from './dual-socket-layout.mjs';
import campusCatalog from '../data/campus-stations.json' with {type:'json'};
export const CHARGE_PLANS = Object.freeze([
  Object.freeze({id:'HOUR_1',label:'1小时',minutes:60,description:'到时自动停止'}),
  Object.freeze({id:'HOUR_2',label:'2小时',minutes:120,description:'到时自动停止'}),
  Object.freeze({id:'HOUR_3',label:'3小时',minutes:180,description:'到时自动停止'}),
  Object.freeze({id:'HOUR_4',label:'4小时',minutes:240,description:'到时自动停止'}),
  Object.freeze({id:'HOUR_5',label:'5小时',minutes:300,description:'到时自动停止'}),
  Object.freeze({id:'FULL',label:'充满自停',minutes:null,description:'充满后自动停止'})
]);
// Demonstration meter only: 300W, with a 1.2kWh full-charge threshold.
// These are internal simulation settings, not real battery measurements.
const SIMULATED_POWER_WATTS=300;
const SIMULATED_FULL_ENERGY_WH=1200;
export function estimatePlanCost(rates,planId) {
  const plan=CHARGE_PLANS.find(p=>p.id===planId);
  if(!plan)throw new Error('请选择有效的充电方式');
  if(plan.minutes===null)return null;
  const estimate={energyWh:SIMULATED_POWER_WATTS*plan.minutes/60,rates};
  updateFee(estimate);
  return {energyWh:estimate.energyWh,electricityCents:estimate.electricityCents,serviceCents:estimate.serviceCents,totalCents:estimate.totalCents};
}
const makeSockets = (id, states) => states.map((status, i) => ({ code: `${id}-${String(i + 1).padStart(2, '0')}`, number: i + 1, status }));
function legacyDemoState() {
  return { version: 1, stations: [
    { id: 'baoan', name: '南阳师范学院校园充电站（模拟）', address: '河南省南阳市卧龙区卧龙路1638号 · 毕设演示点位', area: '南阳师范学院', latitude:32.975857, longitude:112.487679, coordinateType:'GCJ02', x: 52, y: 31, rates: { electricity: 60, service: 20 }, devices: [
      { id: '14500006', online: true, sockets: makeSockets('14500006', ['idle', 'idle', 'charging', 'fault', 'idle', 'idle']) },
      { id: '14500008', online: false, sockets: makeSockets('14500008', ['idle', 'idle', 'idle', 'idle']) }
    ] },
    { id: 'garden', name: '南阳理工学院校园充电站（模拟）', address: '河南省南阳市宛城区长江路80号 · 毕设演示点位', area: '南阳理工学院', latitude:32.967595, longitude:112.553209, coordinateType:'GCJ02', x: 28, y: 56, rates: { electricity: 60, service: 20 }, devices: [
      { id: '14500011', online: true, sockets: makeSockets('14500011', ['idle', 'charging', 'idle', 'fault']) }
    ] },
    { id: 'campus', name: '校园备用充电站（模拟）', address: '南阳市校园场景 · 未设置真实位置的演示站点', area: '校园备用站', x: 73, y: 65, rates: { electricity: 60, service: 20 }, devices: [
      { id: '14500021', online: true, sockets: makeSockets('14500021', ['idle', 'idle', 'idle', 'idle']) }
    ] }
  ], orders: [
    { id: 'DEMO-20261108-001', stationId: 'baoan', stationName: '南阳师范学院校园充电站（模拟）', socketCode: '14500006-02', startedAt: 1794110400000, endedAt: 1794115800000, minutes: 90, energyWh: 450, rates: {electricity:60,service:20}, electricityCents:27,serviceCents:9,totalCents:36,status:'ended',payment:'paid' }
  ], reports: [] };
}
export function createDemoState(){
 const state=legacyDemoState(),legacy=new Map(state.stations.map(s=>[s.id,s]));
 state.stations=campusCatalog.stations.map(site=>({...site,rates:{electricity:60,service:20},devices:legacy.get(site.id)?.devices||[]}));
 state.orders[0].stationName=state.stations[0].name;
 return normalizeDualSocketLayout(state,{preserveLegacyCodes:false});
}
export const isDeviceAvailable=(station,device)=>station.enabled!==false&&device.enabled!==false&&device.online;
export function availableCount(station) { return station.devices.reduce((n,d) => n + (isDeviceAvailable(station,d) ? d.sockets.filter(p => p.status === 'idle').length : 0), 0); }
export function totalCount(station) { return station.devices.reduce((n,d) => n + d.sockets.length, 0); }
export function findSocket(state, code) {
  for (const station of state.stations) for (const device of station.devices) {
    const socket = device.sockets.find(x => x.code === code);
    if (socket) return {station, device, socket};
  }
  return null;
}
export function parseSocketCode(value) {
  const v = String(value || '').trim();
  if (/^\d{8}-\d{2}$/.test(v)) return v;
  const match = v.match(/[?&]socket=(\d{8}-\d{2})(?:&|$)/);
  if (match) return match[1];
  throw new Error('请输入有效插座编号，例如 14500006-01');
}
export function startSession(state, code, now = Date.now(), planId = 'FULL') {
  const plan=CHARGE_PLANS.find(p=>p.id===planId);
  if(!plan)throw new Error('请选择有效的充电方式');
  const match = findSocket(state, code);
  if (!match) throw new Error('插座编号不存在，请核对后重试');
  if (!isDeviceAvailable(match.station,match.device)) throw new Error('站点或设备离线、停用，当前不可用');
  if (state.orders.some(x => x.status === 'charging')) throw new Error('已有订单正在充电，请先结束当前充电');
  if (match.socket.status !== 'idle') throw new Error('插座当前不可用，请选择空闲插座');
  const order = { id: `DEMO-${now}-${state.orders.length + 1}`, stationId: match.station.id, stationName: match.station.name, socketCode: code, startedAt: now, minutes: 0, energyWh: 0, rates: {...match.station.rates}, electricityCents: 0, serviceCents: 0, totalCents: 0, status: 'charging', payment: 'unpaid' };
  order.chargePlan={...plan};
  order.estimatedCents=estimatePlanCost(order.rates,planId)?.totalCents??null;
  if(plan.id==='FULL')order.fullEnergyWh=SIMULATED_FULL_ENERGY_WH;
  state.orders.unshift(order); match.socket.status = 'charging'; return order;
}
function getOrder(state, id) { const o = state.orders.find(x => x.id === id); if (!o) throw new Error('订单不存在'); return o; }
function updateFee(o) {
  o.electricityCents = Math.round(o.energyWh * o.rates.electricity / 1000);
  o.serviceCents = Math.round(o.energyWh * o.rates.service / 1000);
  o.totalCents = o.electricityCents + o.serviceCents;
}
export function refreshSession(state, id, now = Date.now()) {
  const o = getOrder(state,id);
  if (o.status !== 'charging') return o;
  if (!Number.isFinite(now) || now < o.startedAt) throw new Error('模拟计量时间无效');
  const stopAfterMs=o.chargePlan?.minutes>0?o.chargePlan.minutes*60000:
    o.chargePlan?.id==='FULL'?o.fullEnergyWh*3600000/SIMULATED_POWER_WATTS:Infinity;
  const elapsed = Math.min(now - o.startedAt,stopAfterMs);
  o.minutes = Math.floor(elapsed / 60000);
  o.energyWh = Math.round(elapsed * SIMULATED_POWER_WATTS / 3600000);
  updateFee(o);
  if(elapsed>=stopAfterMs)finishSession(state,o,o.startedAt+stopAfterMs,o.chargePlan.id==='FULL'?'电量已充满':'定时时长已到');
  return o;
}
function finishSession(state,o,now,reason) {
  o.status='ended';o.endedAt=now;o.endReason=reason;
  o.payment=o.totalCents===0?'free':'unpaid';
  const match=findSocket(state,o.socketCode);if(match)match.socket.status='idle';
  return o;
}
export function stopSession(state, id, now = Date.now()) {
  const o = getOrder(state,id); if (o.status === 'ended') return o;
  refreshSession(state,id,now);
  if(o.status==='ended')return o;
  return finishSession(state,o,now,'用户提前结束');
}
export function payOrder(state, id) {
  const o = getOrder(state,id); if (o.status !== 'ended') throw new Error('请先结束充电，再模拟支付');
  if (o.payment === 'unpaid') o.payment = 'paid'; return o;
}
export function submitReport(state, code, description) {
  if (!findSocket(state,code)) throw new Error('插座编号不存在');
  const body = String(description || '').trim();
  if(body.length < 5 || body.length > 300) throw new Error('请填写 5—300 字的问题说明');
  const report = {id:`REPAIR-${Date.now()}-${state.reports.length+1}`,socketCode:code,description:body,status:'pending',createdAt:Date.now()};
  state.reports.unshift(report); return report;
}
export function restoreState(value) {
  try {
    if(![1,2].includes(value?.version) || !Array.isArray(value.stations) || !value.stations.length || !Array.isArray(value.orders) || !Array.isArray(value.reports)) return createDemoState();
    for (const s of value.stations) {
      if (!s.id || !s.name || !Array.isArray(s.devices) || !Number.isFinite(s.rates?.electricity) || !Number.isFinite(s.rates?.service)) return createDemoState();
      for(const d of s.devices) if(typeof d.online !== 'boolean' || !Array.isArray(d.sockets) || d.sockets.some(p=>!p.code || !['idle','charging','fault'].includes(p.status))) return createDemoState();
    }
    for(const o of value.orders) if(!o.id || !findSocket(value,o.socketCode) || !['charging','ended'].includes(o.status) || !['unpaid','paid','free'].includes(o.payment) || !Number.isFinite(o.minutes) || o.minutes<0 || !Number.isFinite(o.totalCents) || !Number.isFinite(o.rates?.electricity) || !Number.isFinite(o.rates?.service)) return createDemoState();
    for (const o of value.orders) {
      if(o.chargePlan){
        const plan=CHARGE_PLANS.find(p=>p.id===o.chargePlan.id);
        if(!plan||o.chargePlan.minutes!==plan.minutes||
          (plan.id==='FULL'&&(!Number.isSafeInteger(o.fullEnergyWh)||o.fullEnergyWh<=0)))return createDemoState();
        o.chargePlan={...plan};
      }
      if (!Number.isFinite(o.startedAt) || typeof o.stationName !== 'string' ||
          ![o.minutes,o.energyWh,o.electricityCents,o.serviceCents,o.totalCents,o.rates.electricity,o.rates.service].every(n=>Number.isSafeInteger(n)&&n>=0) ||
          o.totalCents !== o.electricityCents + o.serviceCents ||
          (o.status==='charging' && (o.payment!=='unpaid' || findSocket(value,o.socketCode).socket.status!=='charging')) ||
          (o.status==='ended' && !Number.isFinite(o.endedAt))) return createDemoState();
    }
    if (value.orders.filter(o=>o.status==='charging').length>1) return createDemoState();
    for (const r of value.reports) {
      if (!r || typeof r.id!=='string' || !r.id || !findSocket(value,r.socketCode) ||
          typeof r.description!=='string' || r.description.trim().length<5 || r.description.length>300 ||
          r.status!=='pending' || !Number.isFinite(r.createdAt)) return createDemoState();
    }
    return migrateCampusMetadata(normalizeDualSocketLayout(value));
  } catch { return createDemoState(); }
}
export const yuan = cents => typeof cents==='number'&&Number.isFinite(cents)?(cents / 100).toFixed(2):'—';
export const energy = wh => typeof wh==='number'&&Number.isFinite(wh)?(wh / 1000).toFixed(3):'—';

export function migrateCampusMetadata(input){
 const state=JSON.parse(JSON.stringify(input));
 for(const target of campusCatalog.stations.filter(s=>s.campusLocationRevision===3)){
  const station=state.stations.find(s=>s.id===target.id);
  if(!station||!(target.previousLocations||[]).some(old=>station.name===old.name&&station.address===old.address&&Number(station.latitude)===old.latitude&&Number(station.longitude)===old.longitude))continue;
  const {name,area,address,latitude,longitude,coordinateType,coordinateNote,landmark,campusLocationRevision}=target;
  Object.assign(station,{name,area,address,latitude,longitude,coordinateType,coordinateNote,landmark,campusLocationRevision});
 }return state;
}
