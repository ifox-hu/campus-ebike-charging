import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoState, availableCount, startSession, refreshSession, stopSession, payOrder, submitReport, findSocket, restoreState } from '../src/domain/charging.mjs';

test('selected local duration caps energy and releases the socket at its deadline',()=>{
  const state=createDemoState();
  assert.throws(()=>startSession(state,'14500006-01',1000,'alipay',0),/时长/);
  const order=startSession(state,'14500006-01',1000,'alipay',60);
  refreshSession(state,order.id,1000+90*60000);
  assert.equal(order.durationMinutes,60);assert.equal(order.minutes,60);
  assert.equal(order.energyWh,300);assert.equal(order.endedAt,1000+60*60000);
  assert.equal(order.status,'ended');assert.equal(order.endReason,'DURATION_REACHED');
  assert.equal(findSocket(state,order.socketCode).socket.status,'idle');
});

test('only online idle sockets count as available', () => {
  const s = createDemoState();
  assert.equal(availableCount(s.stations[0]), 72);
  assert.equal(availableCount(s.stations[1]), 54);
});
test('unknown and non-idle ports cannot be started', () => {
  for (const code of ['BAD', '14500006-03', '14500006-04', '14500008-01']) {
    assert.throws(() => startSession(createDemoState(), code), /不存在|不可用|离线/);
  }
});
test('start takes a rate snapshot, repeated start does not append an order', () => {
  const s = createDemoState(); const count = s.orders.length;
  startSession(s, '14500006-01', 1000);
  assert.equal(s.orders.length, count + 1);
  assert.equal(findSocket(s, '14500006-01').socket.status, 'charging');
  assert.throws(() => startSession(s, '14500006-02', 1000), /正在充电/);
  assert.equal(s.orders.length, count + 1);
  s.stations[0].rates.electricity = 900;
  assert.equal(s.orders[0].rates.electricity, 60);
});
test('elapsed time at 300W costs only 27 cents and releases socket', () => {
  const s = createDemoState(); const o = startSession(s, '14500006-01', 1000);
  refreshSession(s, o.id, 1000 + 90 * 60000); stopSession(s, o.id, 1000 + 90 * 60000);
  assert.equal(o.energyWh, 450); assert.equal(o.electricityCents, 27);
  assert.equal(o.serviceCents, 0); assert.equal(o.totalCents, 27);
  assert.equal(findSocket(s, o.socketCode).socket.status, 'idle');
  assert.equal(o.status, 'ended'); assert.equal(o.payment, 'unpaid');
  stopSession(s, o.id); assert.equal(o.totalCents, 27);
  refreshSession(s, o.id, 1000 + 120 * 60000); assert.equal(o.totalCents, 27);
});
test('payment requires an ended order and is idempotent', () => {
  const s = createDemoState(); const o = startSession(s, '14500006-01', 1000);
  assert.throws(() => payOrder(s, o.id), /结束/);
  stopSession(s, o.id, 1000 + 90 * 60000);
  payOrder(s, o.id); payOrder(s, o.id);
  assert.equal(o.payment, 'paid'); assert.equal(o.totalCents, 27);
});
test('automatic readings use elapsed time and repeated refresh does not add time', () => {
  const s = createDemoState(); const o = startSession(s, '14500006-01', 1000);
  for (const now of [-1, NaN, Infinity, 0]) assert.throws(() => refreshSession(s, o.id, now), /时间/);
  refreshSession(s, o.id, 121000); refreshSession(s, o.id, 121000);
  assert.equal(o.minutes, 2); assert.equal(o.energyWh, 10);
  const restored=restoreState(JSON.parse(JSON.stringify(s)));
  refreshSession(restored,o.id,181000);
  assert.equal(restored.orders[0].minutes,3); assert.equal(restored.orders[0].energyWh,15);
});
test('reports validate resource and content without silently disabling sockets', () => {
  const s = createDemoState();
  assert.throws(() => submitReport(s, 'BAD', '插座无法使用'), /不存在/);
  assert.throws(() => submitReport(s, '14500006-01', '  '), /问题说明/);
  const r = submitReport(s, '14500006-01', '插座指示灯不亮，请检查');
  assert.equal(r.status, 'pending'); assert.equal(s.reports.length, 1);
  assert.equal(findSocket(s, '14500006-01').socket.status, 'idle');
});
test('valid persisted state retains active session, malformed data resets', () => {
  const s = createDemoState(); const o = startSession(s, '14500006-01', 1000);
  refreshSession(s, o.id, 1000 + 15 * 60000);
  const restored = restoreState(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.orders[0].minutes, 15);
  assert.equal(restored.orders[0].status, 'charging');
  assert.equal(restoreState({version: 1, stations: []}).stations.length, 3);
  assert.equal(restoreState(null).orders.filter(x => x.status === 'charging').length, 0);
});

test('malformed reports and numeric order fields cannot break restored pages', () => {
  for (const corrupt of [
    s=>s.reports.push(null),
    s=>s.reports.push({id:'bad',socketCode:'14500006-01'}),
    s=>{s.orders[0].energyWh=undefined;},
    s=>{s.orders[0].totalCents=-36;}
  ]) {
    const s=createDemoState(); corrupt(s);
    assert.deepEqual(restoreState(s),createDemoState());
  }
});
test('valid report history survives reload with its text and timestamp', () => {
  const s=createDemoState(); const r=submitReport(s,'14500006-01','插座指示灯不亮，请检查');
  assert.deepEqual(restoreState(JSON.parse(JSON.stringify(s))).reports,[r]);
});
test('multiple current sessions or a released current socket reset inconsistent storage', () => {
  const s=createDemoState(); const o=startSession(s,'14500006-01');
  findSocket(s,o.socketCode).socket.status='idle';
  assert.equal(restoreState(s).orders.some(x=>x.status==='charging'),false);
  const duplicate=createDemoState(); startSession(duplicate,'14500006-01');
  duplicate.orders.unshift({...duplicate.orders[0],id:'duplicate'});
  assert.equal(restoreState(duplicate).orders.some(x=>x.status==='charging'),false);
});

test('configured socket power and selected payment channel are snapshotted',()=>{
 const state=createDemoState();findSocket(state,'14500006-01').socket.powerWatts=500;
 const order=startSession(state,'14500006-01',1000,'alipay');
 findSocket(state,'14500006-01').socket.powerWatts=1000;state.stations[0].rates.service=99;
 refreshSession(state,order.id,1000+3600000);
 assert.equal(order.energyWh,500);assert.equal(order.electricityCents,30);
 assert.equal(order.serviceCents,0);assert.equal(order.totalCents,30);assert.equal(order.paymentMethod,'alipay');
 const restored=restoreState(JSON.parse(JSON.stringify(state)));
 assert.equal(restored.orders[0].powerWatts,500);assert.equal(restored.orders[0].totalCents,30);
});
test('restoring legacy bills preserves history while new orders charge electricity only',()=>{
 const state=createDemoState();state.stations[0].rates.service=20;
 state.orders[0].rates.service=20;state.orders[0].serviceCents=9;state.orders[0].totalCents=36;
 const restored=restoreState(state);assert.equal(restored.orders[0].totalCents,36);
 assert.equal(restored.stations[0].rates.service,0);
 const order=startSession(restored,'14500006-01',1000);
 refreshSession(restored,order.id,3601000);assert.equal(order.totalCents,18);assert.equal(order.serviceCents,0);
});
