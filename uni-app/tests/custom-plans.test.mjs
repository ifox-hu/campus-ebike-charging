import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARGE_PLANS,createDemoState,startSession,refreshSession,restoreState,estimatePlanCost} from '../src/domain/charging.mjs';
test('only the five requested plans are selectable',()=>assert.deepEqual(CHARGE_PLANS.map(p=>p.id),['HOUR_1','HOUR_2','HOUR_3','FULL','CUSTOM']));
test('custom duration is validated before occupying a socket',()=>{
 for(const minutes of [0,14,721,15.5,NaN])assert.throws(()=>startSession(createDemoState(),'14500006-01',1000,'CUSTOM',minutes));
 const state=createDemoState(),o=startSession(state,'14500006-01',1000,'CUSTOM',75);
 assert.equal(o.estimatedCents,31);
 const restored=restoreState(JSON.parse(JSON.stringify(state)));
 const ended=refreshSession(restored,o.id,1000+100*60000);
 assert.equal(ended.chargePlan.minutes,75);assert.equal(ended.minutes,75);assert.equal(ended.totalCents,31);
 assert.equal(estimatePlanCost({electricity:60,service:20},'CUSTOM',150).totalCents,60);
});
test('old four/five-hour orders survive restoration without becoming new choices',()=>{
 const state=createDemoState(),o=startSession(state,'14500006-01',1000,'HOUR_1');
 o.chargePlan={id:'HOUR_5',label:'5小时',minutes:300};
 const restored=restoreState(JSON.parse(JSON.stringify(state)));
 assert.equal(restored.orders[0].id,o.id);assert.equal(restored.orders[0].chargePlan.minutes,300);
});
