// Local demonstration only. Monetary inputs and outputs use integer cents.
import {normalizeDualSocketLayout} from './dual-socket-layout.mjs';
const DEFAULT_CHARGING_POWER_WATTS = 300;
const makeSockets = (id, states) => states.map((status, i) => ({ code: `${id}-${String(i + 1).padStart(2, '0')}`, number: i + 1, status }));
function legacyDemoState() {
  return { version: 1, stations: [
    { id: 'baoan', name: '宝安测试电单车充电站', address: '深圳市宝安区新安街道 · 演示站点', area: '新安街道', x: 52, y: 31, rates: { electricity: 60, service: 0 }, devices: [
      { id: '14500006', online: true, sockets: makeSockets('14500006', ['idle', 'idle', 'charging', 'fault', 'idle', 'idle']) },
      { id: '14500008', online: false, sockets: makeSockets('14500008', ['idle', 'idle', 'idle', 'idle']) }
    ] },
    { id: 'garden', name: '海滨花园便民充电站', address: '深圳市宝安区海滨片区 · 演示站点', area: '海滨片区', x: 28, y: 56, rates: { electricity: 60, service: 0 }, devices: [
      { id: '14500011', online: true, sockets: makeSockets('14500011', ['idle', 'charging', 'idle', 'fault']) }
    ] },
    { id: 'campus', name: '校园东区集中充电站', address: '校园东区自行车停放区 · 演示站点', area: '校园东区', x: 73, y: 65, rates: { electricity: 60, service: 0 }, devices: [
      { id: '14500021', online: true, sockets: makeSockets('14500021', ['idle', 'idle', 'idle', 'idle']) }
    ] }
  ], orders: [
    { id: 'DEMO-20261108-001', stationId: 'baoan', stationName: '宝安测试电单车充电站', socketCode: '14500006-02', startedAt: 1794110400000, endedAt: 1794115800000, minutes: 90, energyWh: 450, rates: {electricity:60,service:20}, electricityCents:27,serviceCents:9,totalCents:36,status:'ended',payment:'paid' }
  ], reports: [] };
}
export function applyElectricityPolicy(state) {
  for (const station of state.stations) {
    station.rates.service = 0;
    for (const device of station.devices) for (const socket of device.sockets) {
      if (!Number.isFinite(socket.powerWatts) || socket.powerWatts <= 0) socket.powerWatts = DEFAULT_CHARGING_POWER_WATTS;
    }
  }
  return state;
}
export function chargingPower(socket, device) {
  const power = socket?.powerWatts ?? device?.powerWatts;
  return typeof power === 'number' && Number.isFinite(power) && power > 0 ? power : null;
}
export const paymentMethods = [{id:'wechat',name:'微信支付'},{id:'alipay',name:'支付宝'}];
export function paymentMethodName(id) {
  if(['ALIPAY_SANDBOX','ALIPAY_MINI_SANDBOX'].includes(id))return '支付宝（沙箱）';
  return paymentMethods.find(method=>method.id===String(id||'').toLowerCase())?.name || '未选择';
}
export function createDemoState(){
  const state = normalizeDualSocketLayout(legacyDemoState(),{preserveLegacyCodes:false});
  state.orders[0].rates.service=0; state.orders[0].serviceCents=0; state.orders[0].totalCents=state.orders[0].electricityCents;
  return applyElectricityPolicy(state);
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
export function startSession(state, code, now = Date.now(), paymentMethod = 'wechat', durationMinutes = 120, chargeMode = 'TIMED') {
  if(!['TIMED','FULL'].includes(chargeMode))throw new Error('请选择有效的充电方式');
  if(chargeMode==='TIMED'&&(!Number.isInteger(durationMinutes)||durationMinutes<1||durationMinutes>720))throw new Error('充电时长须为 1—720 分钟');
  const match = findSocket(state, code);
  if (!match) throw new Error('插座编号不存在，请核对后重试');
  if (!isDeviceAvailable(match.station,match.device)) throw new Error('站点或设备离线、停用，当前不可用');
  if (state.orders.some(x => x.status === 'charging')) throw new Error('已有订单正在充电，请先结束当前充电');
  if (match.socket.status !== 'idle') throw new Error('插座当前不可用，请选择空闲插座');
  if (!paymentMethods.some(method=>method.id===paymentMethod)) throw new Error('请选择微信支付或支付宝');
  const powerWatts=chargingPower(match.socket,match.device);
  if (!powerWatts) throw new Error('插座功率未配置，请联系管理员');
  const order = { powerWatts, paymentMethod, billingPolicy:'electricity-only', id: `DEMO-${now}-${state.orders.length + 1}`, stationId: match.station.id, stationName: match.station.name, socketCode: code, startedAt: now, minutes: 0, energyWh: 0, rates: {electricity:match.station.rates.electricity, service:0}, electricityCents: 0, serviceCents: 0, totalCents: 0, status: 'charging', payment: 'unpaid' };
  Object.assign(order,{chargeMode,durationMinutes:chargeMode==='FULL'?null:durationMinutes,scheduledEndsAt:now+(chargeMode==='FULL'?215:durationMinutes)*60000});
  if(chargeMode==='FULL')order.completionPolicy='SOFTWARE_TAPER_V1';
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
  if (!Number.isFinite(now) || now < o.startedAt) throw new Error('计量时间无效');
  const reached=Number.isFinite(o.scheduledEndsAt)&&now>=o.scheduledEndsAt;
  const elapsed = (reached?o.scheduledEndsAt:now) - o.startedAt;
  o.minutes = Math.floor(elapsed / 60000);
  const watts=o.powerWatts||DEFAULT_CHARGING_POWER_WATTS;
  const tapered=o.chargeMode==='FULL'&&o.completionPolicy==='SOFTWARE_TAPER_V1';
  const profile=simulatedFullProfile(elapsed,watts);
  o.energyWh = tapered?profile.energyWh:Math.round(elapsed*watts/3600000);
  o.currentPowerWatts=tapered?profile.watts:watts;
  updateFee(o);
  if(reached){o.status='ended';o.endedAt=o.scheduledEndsAt;o.currentPowerWatts=0;o.endReason=tapered?'FULL_SIMULATED':'DURATION_REACHED';o.payment=o.totalCents===0?'free':'unpaid';const match=findSocket(state,o.socketCode);if(match)match.socket.status='idle';}
  return o;
}
export function stopSession(state, id, now = Date.now()) {
  const o = getOrder(state,id); if (o.status === 'ended') return o;
  refreshSession(state,id,now); if(o.status==='ended')return o;
  o.status = 'ended'; o.endedAt = now;o.endReason='USER_STOPPED';o.currentPowerWatts=0;
  o.payment = o.totalCents === 0 ? 'free' : 'unpaid';
  const match = findSocket(state,o.socketCode); if(match) match.socket.status = 'idle'; return o;
}
// Deterministic software profile only; never a physical battery/SOC measurement.
export function simulatedFullProfile(elapsedMs,watts){
  const seconds=Math.min(12900,Math.max(0,elapsedMs/1000));
  const ramp=Math.min(1800,Math.max(0,seconds-10800)),low=watts/60;
  const wattSeconds=watts*Math.min(seconds,10800)+watts*ramp-(watts-low)*ramp*ramp/3600+low*Math.max(0,seconds-12600);
  return {energyWh:Math.round(wattSeconds/3600),watts:Math.round((seconds<=10800?watts:seconds>=12600?low:watts-(watts-low)*ramp/1800)*100)/100};
}
export function payOrder(state, id, method) {
  const o = getOrder(state,id); if (o.status !== 'ended') throw new Error('请先结束充电，再模拟支付');
  if(o.payment!=='unpaid')return o;
  const selected=method||o.paymentMethod||'wechat';
  if(!paymentMethods.some(m=>m.id===selected))throw new Error('请选择微信支付或支付宝');
  Object.assign(o,{payment:'paid',paymentMethod:selected,paymentEnvironment:'MOCK',paymentNo:'MOCK-'+o.id,paidAt:Date.now()});
  return o;
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
    return applyElectricityPolicy(normalizeDualSocketLayout(value));
  } catch { return createDemoState(); }
}
export const yuan = cents => typeof cents==='number'&&Number.isFinite(cents)?(cents / 100).toFixed(2):'—';
export const energy = wh => typeof wh==='number'&&Number.isFinite(wh)?(wh / 1000).toFixed(3):'—';
