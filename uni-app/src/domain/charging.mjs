// Local demonstration only. Monetary inputs and outputs use integer cents.
import {normalizeDualSocketLayout} from './dual-socket-layout.mjs';
import campusCatalog from '../data/campus-stations.json' with {type:'json'};
import scenarioCatalog from '../data/scenario-stations.json' with {type:'json'};
export const CHARGE_PLANS = Object.freeze([
  Object.freeze({id:'HOUR_1',label:'1h',minutes:60,description:'到时自动停止'}),
  Object.freeze({id:'HOUR_2',label:'2h',minutes:120,description:'到时自动停止'}),
  Object.freeze({id:'HOUR_3',label:'3h',minutes:180,description:'到时自动停止'}),
  Object.freeze({id:'FULL',label:'充满自停',minutes:null,description:'持续低功率后停止（模拟）'}),
  Object.freeze({id:'CUSTOM',label:'自定义',minutes:null,description:'15—720分钟'})
]);
export function resolvePlan(id,customMinutes){
  const plan=CHARGE_PLANS.find(p=>p.id===id);
  if(!plan)throw new Error('请选择有效的充电方式');
  if(id!=='CUSTOM')return {...plan};
  const minutes=Number(customMinutes);
  if(!Number.isInteger(minutes)||minutes<15||minutes>720)throw new Error('自定义时长须为15—720分钟的整数');
  return {...plan,minutes,label:`自定义 ${minutes}分钟`};
}
// Demonstration profile only: 180 min rated, 30 min taper, 5 min low power.
// These are internal simulation settings, not real battery measurements.
const SIMULATED_POWER_WATTS=300;
export function simulatedPowerProfile(elapsedMs){
  const seconds=Math.max(0,elapsedMs/1000),ramp=Math.min(1800,Math.max(0,seconds-10800));
  const watts=seconds<=10800?300:seconds>=12600?5:300-295*ramp/1800;
  const energyWh=(300*Math.min(seconds,10800)+300*ramp-295*ramp*ramp/3600+5*Math.max(0,seconds-12600))/3600;
  return {watts:Math.round(watts*1000)/1000,energyWh:Math.round(energyWh)};
}
export function estimatePlanCost(rates,planId,customMinutes) {
  const plan=resolvePlan(planId,customMinutes);
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
 state.stations=[...campusCatalog.stations.map(site=>({...site,scene:'校园'})),...scenarioCatalog].map(site=>({...site,coordinateNote:site.coordinateNote||site.note,rates:{electricity:60,service:20},devices:legacy.get(site.id)?.devices||[]}));
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
export function startSession(state, code, now = Date.now(), planId = 'FULL',customMinutes) {
  const plan=resolvePlan(planId,customMinutes);
  const match = findSocket(state, code);
  if (!match) throw new Error('插座编号不存在，请核对后重试');
  if (!isDeviceAvailable(match.station,match.device)) throw new Error('站点或设备离线、停用，当前不可用');
  if (state.orders.some(x => x.status === 'charging')) throw new Error('已有订单正在充电，请先结束当前充电');
  if (match.socket.status !== 'idle') throw new Error('插座当前不可用，请选择空闲插座');
  const order = { id: `DEMO-${now}-${state.orders.length + 1}`, stationId: match.station.id, stationName: match.station.name, socketCode: code, startedAt: now, minutes: 0, energyWh: 0, rates: {...match.station.rates}, electricityCents: 0, serviceCents: 0, totalCents: 0, status: 'charging', payment: 'unpaid' };
  order.chargePlan={...plan};
  order.estimatedCents=estimatePlanCost(order.rates,planId,customMinutes)?.totalCents??null;
  if(plan.id==='FULL')order.completionPolicy='POWER_V1';
  order.meteringSource='SOFTWARE';order.simulatedPowerWatts=SIMULATED_POWER_WATTS;
  order.currentPowerWatts=SIMULATED_POWER_WATTS;
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
  const tapered=o.chargePlan?.id==='FULL'&&o.completionPolicy==='POWER_V1';
  const stopAfterMs=o.chargePlan?.minutes>0?o.chargePlan.minutes*60000:
    o.chargePlan?.id==='FULL'?(tapered?215:720)*60000:Infinity;
  const elapsed = Math.min(now - o.startedAt,stopAfterMs);
  o.minutes = Math.floor(elapsed / 60000);
  o.energyWh = tapered?simulatedPowerProfile(elapsed).energyWh:Math.round(elapsed * SIMULATED_POWER_WATTS / 3600000);
  o.currentPowerWatts=tapered?simulatedPowerProfile(elapsed).watts:SIMULATED_POWER_WATTS;
  updateFee(o);
  if(elapsed>=stopAfterMs)finishSession(state,o,o.startedAt+stopAfterMs,o.chargePlan.id==='FULL'?(tapered?'低功率持续，模拟充电结束':'最长充电时限已到'):'定时时长已到');
  return o;
}
function finishSession(state,o,now,reason) {
  o.status='ended';o.endedAt=now;o.endReason=reason;o.currentPowerWatts=0;
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
        // Retain historical four/five-hour plans, but do not offer them for new orders.
        const legacy={HOUR_4:{id:'HOUR_4',label:'4小时',minutes:240},HOUR_5:{id:'HOUR_5',label:'5小时',minutes:300}};
        const plan=legacy[o.chargePlan.id]||resolvePlan(o.chargePlan.id,o.chargePlan.minutes);
        if(!plan||o.chargePlan.minutes!==plan.minutes||
          (plan.id==='FULL'&&o.completionPolicy!=='POWER_V1'&&(!Number.isSafeInteger(o.fullEnergyWh)||o.fullEnergyWh<=0)))return createDemoState();
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
    return expandDemoScenarios(migrateCampusMetadata(normalizeDualSocketLayout(value)));
  } catch { return createDemoState(); }
}
export const yuan = cents => typeof cents==='number'&&Number.isFinite(cents)?(cents / 100).toFixed(2):'—';

export function expandDemoScenarios(input){
 const state=JSON.parse(JSON.stringify(input));
 if(state.scenarioCatalogRevision>=1||!state.stations.some(s=>['baoan','garden'].includes(s.id)))return state;
 const ids=new Set(state.stations.flatMap(s=>s.devices.map(d=>String(d.id)))),codes=new Set(state.stations.flatMap(s=>s.devices.flatMap(d=>d.sockets.map(p=>p.code))));let serial=28000000;
 for(const site of createDemoState().stations.filter(s=>s.id.startsWith('SC'))){
  if(state.stations.some(s=>s.id===site.id))continue;
  for(const d of site.devices){let id=String(d.id);while(ids.has(id)||codes.has(id+'-01')||codes.has(id+'-02'))id=String(++serial);ids.add(id);d.id=id;d.code=id;for(const [i,p] of d.sockets.entries()){p.code=`${id}-0${i+1}`;codes.add(p.code)}}
  state.stations.push(site);
 }
 state.scenarioCatalogRevision=1;return state;
}
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
