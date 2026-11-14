import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,startSession,refreshSession,stopSession,restoreState,findSocket,payOrder} from '../src/domain/charging.mjs';

test('FULL runs through taper and stops at the simulated completion time even after a late refresh',()=>{
  const state=createDemoState();
  const order=startSession(state,'14500006-01',1000,'wechat',null,'FULL');
  assert.equal(order.chargeMode,'FULL');
  refreshSession(state,order.id,1000+180*60000);
  assert.equal(order.status,'charging');assert.equal(order.energyWh,900);
  refreshSession(state,order.id,1000+210*60000);
  assert.equal(order.status,'charging');assert.equal(order.currentPowerWatts,5);
  refreshSession(state,order.id,1000+400*60000);
  assert.equal(order.status,'ended');assert.equal(order.endReason,'FULL_SIMULATED');
  assert.equal(order.minutes,215);assert.equal(order.endedAt,12901000);
  assert.equal(order.energyWh,977);assert.equal(order.totalCents,59);assert.equal(order.serviceCents,0);
  assert.equal(findSocket(state,order.socketCode).socket.status,'idle');
});

test('FULL uses saved socket power and survives storage restoration without resetting its curve',()=>{
  const state=createDemoState();findSocket(state,'14500006-01').socket.powerWatts=600;
  const order=startSession(state,'14500006-01',1000,'alipay',null,'FULL');
  refreshSession(state,order.id,1000+180*60000);
  const restored=restoreState(JSON.parse(JSON.stringify(state)));
  findSocket(restored,'14500006-01').socket.powerWatts=1200;
  refreshSession(restored,order.id,1000+215*60000);
  assert.equal(restored.orders[0].energyWh,1953);assert.equal(restored.orders[0].totalCents,117);
});

test('manual early FULL stop bills only elapsed energy and leaves history unchanged on later refresh',()=>{
  const state=createDemoState(),order=startSession(state,'14500006-01',1000,'wechat',null,'FULL');
  stopSession(state,order.id,1000+60*60000);
  assert.equal(order.endReason,'USER_STOPPED');assert.equal(order.energyWh,300);
  refreshSession(state,order.id,1000+900*60000);
  assert.equal(order.totalCents,18);assert.equal(order.minutes,60);
});

test('local simulated payment records an explicit mock receipt and cannot change channels after payment',()=>{
  for(const method of ['wechat','alipay']){
    const state=createDemoState(),order=startSession(state,'14500006-01',1000,method,60);
    stopSession(state,order.id,1000+30*60000);
    payOrder(state,order.id,method);
    assert.equal(order.payment,'paid');assert.equal(order.paymentEnvironment,'MOCK');
    assert.match(order.paymentNo,/^MOCK-/);const receipt=order.paymentNo;
    payOrder(state,order.id,method==='wechat'?'alipay':'wechat');
    assert.equal(order.paymentNo,receipt);assert.equal(order.paymentMethod,method);
  }
});

test('unknown charge modes cannot reserve sockets',()=>{
  const state=createDemoState();
  assert.throws(()=>startSession(state,'14500006-01',1000,'wechat',60,'UNKNOWN'),/方式/);
  assert.equal(findSocket(state,'14500006-01').socket.status,'idle');
});
