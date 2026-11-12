import test from 'node:test'
import assert from 'node:assert/strict'
import {createSeed} from '../src/domain/seed.js'
import * as migrations from '../src/domain/migration.js'
import {readFileSync} from 'node:fs'

test('all three clients consume identical scenario catalogs',()=>{
 const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'))
 const source=read('../src/domain/scenario-stations.json')
 assert.deepEqual(read('../../uni-app/src/data/scenario-stations.json'),source)
 assert.deepEqual(read('../../backend/charging-service/src/main/resources/scenario-stations.json'),source)
})
test('six scenes include two examples per non-campus category with usable devices',()=>{
 const db=createSeed();assert.equal(db.stations.length,16)
 for(const scene of ['医院','住宅小区','产业园区','办公区','商业配套']){
  const sites=db.stations.filter(s=>s.scene===scene);assert.equal(sites.length,2,scene)
  for(const s of sites){assert.match(s.note,/虚构/);assert.ok(db.devices.some(d=>d.stationId===s.id));assert.ok(db.rates.some(r=>r.stationId===s.id))}
 }
 assert.equal(new Set(db.sockets.map(s=>s.code)).size,db.sockets.length)
 assert.ok(db.devices.every(d=>db.sockets.filter(s=>s.deviceId===d.id).length===2))
})
test('existing cache gains samples once without replacing existing business data',()=>{
 const old=createSeed();old.stations=old.stations.slice(0,5)
 const ids=new Set(old.stations.map(s=>s.id));old.devices=old.devices.filter(d=>ids.has(d.stationId));old.rows=old.rows.filter(r=>ids.has(r.stationId));old.rates=old.rates.filter(r=>ids.has(r.stationId));const devices=new Set(old.devices.map(d=>d.id));old.sockets=old.sockets.filter(s=>devices.has(s.deviceId))
 old.stations[0].name='自定义名称';const before=structuredClone(old)
 assert.equal(typeof migrations.expandDemoScenarios,'function')
 const result=migrations.expandDemoScenarios(old);assert.equal(result.stations.length,16)
 for(const k of ['stations','devices','sockets','rows','rates'])assert.deepEqual(result[k].slice(0,before[k].length),before[k])
 for(const k of ['orders','reports','users'])assert.deepEqual(result[k],before[k])
 assert.deepEqual(old,before);assert.deepEqual(migrations.expandDemoScenarios(result),result)
})

test('expansion resolves custom station and device ID collisions without changing them',()=>{
 const old=createSeed();old.stations=old.stations.slice(0,5)
 const stationIds=new Set(old.stations.map(s=>s.id));old.devices=old.devices.filter(d=>stationIds.has(d.stationId));old.rows=old.rows.filter(r=>stationIds.has(r.stationId));old.rates=old.rates.filter(r=>stationIds.has(r.stationId));const deviceIds=new Set(old.devices.map(d=>d.id));old.sockets=old.sockets.filter(s=>deviceIds.has(s.deviceId))
 const station={id:'ST07',name:'自建医院',scene:'医院'},device={id:'D130',stationId:station.id,code:'EB-0130'};old.stations.push(station);old.devices.push(device)
 const result=migrations.expandDemoScenarios(old)
 assert.deepEqual(result.stations.find(s=>s.id===station.id),station);assert.deepEqual(result.devices.find(d=>d.id===device.id),device)
 for(const key of ['stations','rows','devices','sockets'])assert.equal(new Set(result[key].map(x=>x.id)).size,result[key].length)
 assert.equal(new Set(result.sockets.map(s=>s.code)).size,result.sockets.length)
 assert.equal(result.stations.length,17)
})
