import test from 'node:test';
import assert from 'node:assert/strict';
import {payAlipayMini} from '../src/api/alipay-mini.mjs';

test('native payment uses backend trade number and queries even after cancellation',async()=>{
  const calls=[];
  const native={getAuthCode:o=>{assert.equal(o.scopes,'auth_base');o.success({authCode:'once'});},tradePay:o=>{calls.push(o.tradeNO);o.fail({resultCode:'6001'});}};
  const result=await payAlipayMini({native,checkout:async code=>{assert.equal(code,'once');return {tradeNo:'202611120000123456',environment:'ALIPAY_MINI_SANDBOX'};},query:async()=>{calls.push('query');return {payment:'unpaid'};}});
  assert.deepEqual(calls,['202611120000123456','query']);assert.equal(result.payment,'unpaid');
});
test('client success does not imply paid; only backend response counts',async()=>{
  const native={getAuthCode:o=>o.success({authCode:'once'}),tradePay:o=>o.success({resultCode:'9000'})};
  assert.equal((await payAlipayMini({native,checkout:async()=>({tradeNo:'202611120000123456',environment:'ALIPAY_MINI_SANDBOX'}),query:async()=>({payment:'unpaid'})})).payment,'unpaid');
});
test('invalid environment and stale checkout cannot launch native payment',async()=>{
  let launches=0,queries=0;
  const native={getAuthCode:o=>o.success({authCode:'once'}),tradePay:()=>{launches++;}};
  await assert.rejects(payAlipayMini({native,checkout:async()=>({tradeNo:'202611120000123456',environment:'PRODUCTION'}),query:async()=>{queries++;}}),/沙箱/);
  assert.equal(await payAlipayMini({native,checkout:async()=>null,query:async()=>{queries++;}}),null);
  assert.equal(launches,0);assert.equal(queries,0);
});
