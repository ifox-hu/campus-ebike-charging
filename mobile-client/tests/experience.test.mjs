import test from 'node:test';
import assert from 'node:assert/strict';
import * as ux from '../src/domain/experience.mjs';
import {mapCatalog,mapReport} from '../src/api/mapping.mjs';
test('station filters combine scene, preferences and query without mutating source',()=>{
 const rows=[{id:'1',name:'东站',address:'校园',scene:'校园'},{id:'2',name:'南站',address:'园区',scene:'医院'}];
 assert.equal(typeof ux.filterStations,'function');
 assert.deepEqual(ux.filterStations(rows,{scene:'医院',query:'南',favorites:['2'],tab:'favorites'}).map(s=>s.id),['2']);
 assert.equal(ux.filterStations(rows,{tab:'favorites',favorites:[]}).length,0);assert.equal(rows.length,2);
});
test('preferences are isolated by account and recent entries are unique and bounded',()=>{
 assert.equal(typeof ux.preferenceKey,'function');
 assert.notEqual(ux.preferenceKey('/api','a'),ux.preferenceKey('/api','b'));
 assert.deepEqual(ux.visitStation(['1','2'],'2'),['2','1']);
 assert.equal(ux.visitStation(Array.from({length:20},(_,i)=>String(i)),'new').length,10);
});
test('catalog preserves scene and does not count disabled hardware as enabled',()=>{
 const [s]=mapCatalog([{id:1,scene:'医院',status:'OPERATING'}],[{id:2,stationId:1,status:'ONLINE',enabled:false}],[]);
 assert.equal(s.scene,'医院');assert.equal(s.devices[0].enabled,false);
});
test('repair progress accepts serialized timeline and safely rejects malformed data',()=>{
 assert.deepEqual(mapReport({id:1,progressHistory:'[{"status":"PROCESSING","note":"已接单"}]'}).progressHistory,[{status:'PROCESSING',note:'已接单'}]);
 assert.deepEqual(mapReport({id:1,progressHistory:'bad'}).progressHistory,[]);
});
