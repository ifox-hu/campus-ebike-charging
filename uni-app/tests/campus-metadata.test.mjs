import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,migrateCampusMetadata,restoreState} from '../src/domain/charging.mjs';
import catalog from '../src/data/campus-stations.json' with {type:'json'};
test('five building locations include auditable sources and stable outdoor planning positions',()=>{
 const sites=createDemoState().stations.slice(0,5);assert.equal(sites.length,5);
 for(const s of sites){assert.equal(s.campusLocationRevision,3);assert.equal(s.landmark.source,'https://gis.nynu.edu.cn/#/');assert.match(s.address,/侧.*附近/);}
});
test('cached stock metadata migrates without changing custom data or business history',()=>{
 const before=createDemoState();before.stations.slice(0,5).forEach((s,i)=>Object.assign(s,catalog.stations[i].previousLocation,{campusLocationRevision:1}));before.stations[1].address='人工校对地址';
 const result=restoreState(before);assert.equal(result.stations[0].campusLocationRevision,3);assert.deepEqual(result.stations[1],before.stations[1]);
 assert.deepEqual(result.orders,before.orders);assert.deepEqual(result.reports,before.reports);
 before.stations.forEach((s,i)=>assert.deepEqual(result.stations[i].devices,s.devices));assert.deepEqual(migrateCampusMetadata(result),result);
});
