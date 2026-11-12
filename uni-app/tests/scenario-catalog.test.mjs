import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,restoreState} from '../src/domain/charging.mjs';
test('mobile samples cover six scenes with paired devices',()=>{
 const db=createDemoState();assert.equal(db.stations.length,16);
 for(const scene of ['医院','住宅小区','产业园区','办公区','商业配套'])assert.equal(db.stations.filter(s=>s.scene===scene).length,2,scene);
 assert.ok(db.stations.every(s=>s.devices.length&&s.devices.every(d=>d.sockets.length===2)));
 const codes=db.stations.flatMap(s=>s.devices.flatMap(d=>d.sockets.map(p=>p.code)));assert.equal(new Set(codes).size,codes.length);
});
test('mobile cached data receives missing samples while retaining orders and devices',()=>{
 const old=createDemoState();old.stations=old.stations.filter(s=>s.scene==='校园');const before=structuredClone(old);
 const result=restoreState(old);assert.equal(result.stations.length,16);
 assert.deepEqual(result.stations.slice(0,before.stations.length),before.stations);
 assert.deepEqual(result.orders,before.orders);assert.deepEqual(result.reports,before.reports);assert.deepEqual(restoreState(result),result);
});
