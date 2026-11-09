import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,startSession,refreshSession,stopSession,findSocket,restoreState,estimatePlanCost} from '../src/domain/charging.mjs';

for (const [planId,minutes] of [['HOUR_1',60],['HOUR_2',120],['HOUR_3',180],['CUSTOM',300]]) {
  test(`${planId} persists selection and stops exactly at its deadline after a late refresh`,()=>{
    const state=createDemoState();
    const order=startSession(state,'14500006-01',1000,planId,minutes);
    assert.equal(order.chargePlan.id,planId);
    assert.equal(order.chargePlan.minutes,minutes);
    const restored=restoreState(JSON.parse(JSON.stringify(state)));
    refreshSession(restored,order.id,1000+(minutes-1)*60000);
    assert.equal(restored.orders[0].status,'charging');
    const ended=refreshSession(restored,order.id,1000+(minutes+20)*60000);
    assert.equal(ended.status,'ended');
    assert.equal(ended.endedAt,1000+minutes*60000);
    assert.equal(ended.minutes,minutes);
    assert.equal(ended.energyWh,minutes*5);
    assert.equal(ended.endReason,'定时时长已到');
    assert.equal(findSocket(restored,order.socketCode).socket.status,'idle');
    const total=ended.totalCents;
    stopSession(restored,order.id,1000+(minutes+30)*60000);
    assert.equal(ended.totalCents,total);
    assert.equal(ended.endedAt,1000+minutes*60000);
  });
}

test('full-charge plan ends on the internal simulated full reading, with no extra billing after refresh',()=>{
  const state=createDemoState();
  const order=startSession(state,'14500006-01',1000,'FULL');
  assert.equal(order.chargePlan.label,'充满自停');
  refreshSession(state,order.id,1000+239*60000);
  assert.equal(order.status,'charging');
  refreshSession(state,order.id,1000+300*60000);
  assert.equal(order.status,'ended');
  assert.equal(order.endReason,'电量已充满');
  assert.equal(order.energyWh,1200);
  assert.equal(order.endedAt,1000+240*60000);
  assert.equal(findSocket(state,order.socketCode).socket.status,'idle');
});

test('early stop still works and unsupported plans never reserve a socket',()=>{
  const state=createDemoState();
  assert.throws(()=>startSession(state,'14500006-01',1000,'INVALID'),/充电方式/);
  assert.equal(findSocket(state,'14500006-01').socket.status,'idle');
  const order=startSession(state,'14500006-01',1000,'HOUR_2');
  stopSession(state,order.id,1000+30*60000);
  assert.equal(order.minutes,30);
  assert.equal(order.endReason,'用户提前结束');
  assert.equal(order.chargePlan.label,'2h');
});

test('legacy orders remain readable without adopting a new automatic deadline',()=>{
  const state=createDemoState();
  const order=startSession(state,'14500006-01',1000,'HOUR_1');
  delete order.chargePlan;
  const restored=restoreState(JSON.parse(JSON.stringify(state)));
  refreshSession(restored,order.id,1000+300*60000);
  assert.equal(restored.orders[0].status,'charging');
});

test('selecting longer charging durations changes the estimate using the station rates',()=>{
  const rates={electricity:60,service:20};
  for(const [id,total] of [['HOUR_1',24],['HOUR_2',48],['HOUR_3',72],['CUSTOM',120]]) {
    assert.equal(estimatePlanCost(rates,id,300).totalCents,total);
  }
  assert.equal(estimatePlanCost({electricity:100,service:30},'HOUR_2').totalCents,78);
  assert.equal(estimatePlanCost(rates,'FULL'),null);
});

test('the deadline bill matches the upfront estimate while an early stop costs only actual usage',()=>{
  const state=createDemoState();
  const estimate=estimatePlanCost(state.stations[0].rates,'CUSTOM',300);
  const order=startSession(state,'14500006-01',1000,'CUSTOM',300);
  stopSession(state,order.id,1000+60*60000);
  assert.equal(estimate.totalCents,120);
  assert.equal(order.totalCents,24);
  const next=startSession(state,'14500006-01',1000,'CUSTOM',300);
  refreshSession(state,next.id,1000+350*60000);
  assert.equal(next.totalCents,estimate.totalCents);
});
