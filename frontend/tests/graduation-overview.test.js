import test from 'node:test'
import assert from 'node:assert/strict'
import * as ops from '../src/domain/operations.js'
import * as platform from '../src/connected/platformClient.js'
import {buildStationMapRows} from '../src/domain/stationMap.js'

test('connected map and overview never count offline sockets or disabled devices as idle',()=>{
 const db=ops.mapConnectedSource({stations:[{id:1,status:'OPERATING'}],devices:[{id:2,stationId:1,status:'OFFLINE'},{id:3,stationId:1,status:'DISABLED'}],sockets:[{id:4,chargerId:2,status:'IDLE'},{id:5,chargerId:3,status:'IDLE'}],orders:[],reports:[],reportsLoaded:true});
 assert.equal(buildStationMapRows(db)[0].free,0);assert.equal(ops.activeAlerts(db).filter(a=>a.title==='设备离线').length,1);
});

test('overview separates today bills from active estimates and current resources',()=>{
 assert.equal(typeof ops.overviewMetrics,'function')
 const db={stations:[{id:1,enabled:true}],devices:[{id:2,stationId:1,online:true,enabled:true}],sockets:[{id:3,deviceId:2,serverStatus:'IDLE',enabled:true},{id:4,deviceId:2,serverStatus:'CHARGING',enabled:true}],orders:[
 {id:1,stationId:1,socketId:4,status:'charging',startedAt:'2026-11-14T09:00:00',total:99,energy:10},
 {id:2,stationId:1,status:'ended',startedAt:'2026-11-14T00:00:00',total:.6,energy:1},
 {id:3,stationId:1,status:'ended',startedAt:'2026-11-13T23:00:00',endedAt:'2026-11-14T01:00:00',total:5,energy:3}],reports:[{status:'OPEN'}],reportsLoaded:true}
 const value=ops.overviewMetrics(db,'2026-11-14')
 assert.equal(value.orders,2);assert.equal(value.amount,.6);assert.equal(value.energy,1);assert.equal(value.free,1);assert.equal(value.pendingRepairs,1)
 assert.equal(ops.overviewMetrics({...db,reportsLoaded:false},'2026-11-14').pendingRepairs,null)
 assert.equal(ops.overviewMetrics({...db,orders:[]},'2026-11-14').amount,0)
})
test('full-charge plan, meter, end reason and unknown history remain truthful',()=>{
 assert.equal(typeof platform.orderPresentation,'function')
 const full=platform.orderPresentation({chargeMode:'FULL',durationMinutes:720,meteringSource:'SOFTWARE',endReason:'FULL_SIMULATED'})
 assert.equal(full.plan,'充满自停');assert.match(full.meter,/软件模拟/);assert.match(full.reason,/模拟/)
 assert.equal(platform.orderPresentation({}).plan,'历史订单未记录')
 assert.match(platform.orderPresentation({durationMinutes:60}).plan,/60/)
})
test('electricity rate form always sends zero service fee and rejects empty or negative price',()=>{
 assert.equal(typeof platform.electricityRatePayload,'function')
 const form={stationId:'3',startTime:'00:00:00',endTime:'23:59:59',electricityPrice:'0.6',servicePrice:99}
 assert.deepEqual(platform.electricityRatePayload(form),{stationId:3,startTime:'00:00:00',endTime:'23:59:59',electricityPrice:.6,servicePrice:0})
 assert.throws(()=>platform.electricityRatePayload({...form,electricityPrice:''}))
 assert.throws(()=>platform.electricityRatePayload({...form,electricityPrice:-1}))
})
test('station and abnormal filters use real IDs without changing source arrays',()=>{
 assert.equal(typeof platform.scopeRecords,'function')
 const rows=[{id:1,stationId:4,status:'ONLINE'},{id:2,stationId:5,status:'OFFLINE'},{id:3,stationId:4,status:'OFFLINE'}]
 assert.deepEqual(platform.scopeRecords(rows,{stationId:'4',abnormalOnly:true}).map(x=>x.id),[3])
 assert.equal(platform.scopeRecords(rows,{}).length,3);assert.equal(rows.length,3)
})

test('device layout narrows station choices with linked station or abnormal scope',()=>{
 assert.equal(typeof platform.scopeDeviceCatalog,'function');
 const data={stations:[{id:7},{id:8}],devices:[{id:20,stationId:7,status:'ONLINE'},{id:21,stationId:8,status:'OFFLINE'}],sockets:[]};
 assert.deepEqual(platform.scopeDeviceCatalog(data,{abnormalOnly:true}).stations.map(s=>s.id),[8]);
 assert.deepEqual(platform.scopeDeviceCatalog(data,{stationId:8}).devices.map(d=>d.id),[21]);
 assert.equal(platform.scopeDeviceCatalog(data,{}).stations.length,2);
});

test('current abnormal metrics exclude historical failed starts but retain active faults',()=>{
 const db=ops.mapConnectedSource({stations:[{id:1,status:'OPERATING'}],devices:[{id:2,stationId:1,status:'ONLINE'}],sockets:[{id:3,chargerId:2,status:'IDLE'}],orders:[{id:4,stationId:1,connectorId:3,status:'START_FAILED',startTime:'2025-01-01T09:00:00'}],reports:[],reportsLoaded:true});
 assert.equal(ops.overviewMetrics(db,'2026-11-14').abnormalDevices,0);
 assert.equal(ops.activeAlerts(db).length,1);
 assert.deepEqual(ops.currentAbnormalDeviceIds(db),[]);
 db.orders.push({id:5,stationId:1,socketId:3,status:'abnormal'});
 assert.deepEqual(ops.currentAbnormalDeviceIds(db),[2]);
 db.orders.pop();db.sockets[0].fault=true;
 assert.equal(ops.overviewMetrics(db,'2026-11-14').abnormalDevices,1);
});

test('planned device disablement does not create a map offline alert',()=>{
 const db=ops.mapConnectedSource({stations:[{id:1,status:'OPERATING'}],devices:[{id:2,stationId:1,status:'DISABLED'}],sockets:[{id:3,chargerId:2,status:'IDLE'}],orders:[],reports:[],reportsLoaded:true});
 const station=buildStationMapRows(db)[0];
 assert.equal(station.offlineDevices,0);assert.equal(station.hasAlert,false);assert.equal(station.disabled,1);
});
