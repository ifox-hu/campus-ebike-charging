import test from 'node:test'
import assert from 'node:assert/strict'
import { createSeed } from '../src/domain/seed.js'
import { migrateV2 } from '../src/domain/migration.js'
import { createService,socketStatus } from '../src/domain/service.js'
test('初始场景是多排、每排十几台、每台恰好两个插座',()=>{const db=createSeed();assert.equal(db.rows.filter(r=>r.stationId==='ST01').length,3);assert.deepEqual(db.rows.filter(r=>r.stationId==='ST01').map(r=>db.devices.filter(d=>d.rowId===r.id).length),[12,15,12]);assert.ok(db.devices.every(d=>db.sockets.filter(s=>s.deviceId===d.id).length===2));assert.equal(db.sockets.length,db.devices.length*2)})
test('旧七插座示例拆分为四台双插座设备，保留原数据、历史和占用关联',()=>{
 const source={version:2,sequence:100,stations:[{id:'CUSTOM',name:'用户自建站',enabled:true}],users:[{id:'U1',enabled:true}],rates:[{stationId:'CUSTOM',electricRate:.6,serviceRate:.2}],devices:[{id:'OLD',code:'OLD-01',name:'七路演示设备',stationId:'CUSTOM',enabled:true,online:true}],sockets:Array.from({length:7},(_,i)=>({id:`P${i+1}`,deviceId:'OLD',number:i+1,code:`OLD-01-${i+1}`,enabled:true,fault:false})),orders:[{id:'O1',socketId:'P7',deviceId:'OLD',deviceCode:'OLD-01',socketCode:'OLD-01-7',status:'charging'}],reports:[{id:'R1',socketId:'P7',status:'pending'}]}
 const before=JSON.stringify(source),db=migrateV2(source)
 assert.equal(JSON.stringify(source),before);assert.equal(db.devices.length,4);assert.equal(db.sockets.length,8);assert.equal(db.rows.length,1)
 assert.ok(db.devices.every(d=>db.sockets.filter(p=>p.deviceId===d.id).length===2));assert.equal(db.reports[0].socketId,'P7')
 const p7=db.sockets.find(p=>p.id==='P7');assert.equal(db.orders[0].deviceId,p7.deviceId);assert.equal(db.orders[0].socketCode,'OLD-01-7');assert.equal(socketStatus(db,p7),'充电中')
 createService(db).setDeviceOnline(p7.deviceId,false);assert.equal(socketStatus(db,p7),'异常占用')
})
