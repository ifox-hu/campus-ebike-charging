import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState} from '../src/domain/charging.mjs';
import {groupStationRows} from '../src/domain/dual-socket-layout.mjs';

const expected=[['逸夫教学楼南侧',[12,15,12]],['中区四公寓东侧',[13,15]],['体育馆南侧',[12]],['西区八公寓北侧',[9,11,8]],['东升园餐厅南侧',[10,12]]];
test('NYNU demo uses the five fixed layouts from the user reference',()=>{
 const state=createDemoState();
 const sites=state.stations.filter(s=>s.name.includes('南阳师范学院'));
 assert.equal(sites.length,5);
 for(const [label,rows] of expected){
  const site=sites.find(s=>s.name.includes(label));assert.ok(site,label);
  assert.deepEqual(groupStationRows(site).map(r=>r.devices.length),rows);
  assert.ok(site.devices.every(d=>d.sockets.length===2));
 }
 assert.equal(sites.reduce((n,s)=>n+s.devices.length,0),129);
 assert.equal(sites.reduce((n,s)=>n+s.devices.flatMap(d=>d.sockets).length,0),258);
 assert.deepEqual(createDemoState(),state,'refresh must not randomize rows or devices');
});
