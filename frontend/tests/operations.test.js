import test from 'node:test';import assert from 'node:assert/strict';
import {operationsStats,activeAlerts,mapConnectedSource} from '../src/domain/operations.js';
import {buildStationMapRows} from '../src/domain/stationMap.js';
test('analytics distinguish settled bills from active estimates and honor filters',()=>{
 const db={stations:[{id:'s',scene:'校园',name:'一站'}],devices:[],sockets:[],orders:[{stationId:'s',status:'ended',startedAt:'2026-11-09 10:00:00',energy:.3,total:.24},{stationId:'s',status:'charging',startedAt:'2026-11-09 10:00:00',energy:.1,total:99}],reports:[]};
 const result=operationsStats(db,{from:'2026-11-09',to:'2026-11-09',scene:'校园'});assert.equal(result.amount,.24);assert.equal(result.completed,1);assert.equal(result.hours[10],2);assert.equal(operationsStats(db,{scene:'园区'}).orders,0);
});
test('connected mapping preserves disabled/fault and physical row information',()=>{
 const source=mapConnectedSource({stations:[{id:1,status:'OPERATING'}],devices:[{id:2,stationId:1,rowName:'B排',status:'OFFLINE',enabled:true}],sockets:[{id:3,chargerId:2,status:'FAULT'}],orders:[]});
 assert.equal(source.devices[0].rowName,'B排');assert.equal(source.sockets[0].fault,true);assert.equal(activeAlerts(source).length,2);
});
test('a recovered and recurring failure creates a new alert key',()=>{
 const db={stations:[],devices:[{id:1,online:false,enabled:true,statusRevision:1}],sockets:[],orders:[]};
 const first=activeAlerts(db)[0].key;db.devices[0].online=true;db.devices[0].statusRevision++;
 assert.equal(activeAlerts(db).length,0);db.devices[0].online=false;db.devices[0].statusRevision++;
 assert.notEqual(activeAlerts(db)[0].key,first);
});
test('connected map never infers a busy or unknown server socket as idle',()=>{
 const source=mapConnectedSource({stations:[{id:1,status:'OPERATING'}],devices:[{id:2,stationId:1,status:'ONLINE',enabled:true}],sockets:[{id:3,chargerId:2,status:'CHARGING'},{id:4,chargerId:2,status:'UNKNOWN'}],orders:[]});
 const row=buildStationMapRows(source)[0];assert.equal(row.free,0);assert.equal(row.charging,1);assert.equal(row.disabled,1);assert.equal(row.pendingRepairs,null);
});
