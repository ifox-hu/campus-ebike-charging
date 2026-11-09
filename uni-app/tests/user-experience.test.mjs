import test from 'node:test';import assert from 'node:assert/strict';
import {buildMessages,filterStations} from '../src/domain/user-experience.mjs';
test('messages have stable per-event identities and link back to orders and repairs',()=>{
 const orders=[{id:'1',status:'ended',payment:'unpaid',startedAt:1000,endedAt:2000,stationName:'站点',endReason:'定时时长已到'}];
 const reports=[{id:'2',status:'resolved',updatedAt:3000,resolution:'已处理'}];
 const a=buildMessages(orders,reports);assert.equal(a.length,3);assert.equal(new Set(a.map(m=>m.id)).size,3);
 assert.deepEqual(a.map(m=>m.id),buildMessages(orders,reports).map(m=>m.id));assert.match(a[0].path,/report/);
});
test('scene, favorites and free sorting combine without mutating source',()=>{
 const source=[{id:'a',name:'一站',scene:'校园',devices:[{online:true,sockets:[{status:'idle'}]}]},{id:'b',name:'二站',scene:'住宅小区',devices:[]}];
 assert.deepEqual(filterStations(source,{scene:'校园',savedOnly:true,favorites:['a']}).map(x=>x.id),['a']);
 assert.equal(filterStations(source,{scene:'园区'}).length,0);assert.equal(source[0].id,'a');
});
