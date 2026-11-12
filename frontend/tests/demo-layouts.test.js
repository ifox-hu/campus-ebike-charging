import test from 'node:test'
import assert from 'node:assert/strict'
import {createSeed} from '../src/domain/seed.js'
import * as migrations from '../src/domain/migration.js'

const profile=(db,id)=>db.rows.filter(r=>r.stationId===id).sort((a,b)=>a.index-b.index).map(r=>db.devices.filter(d=>d.rowId===r.id).length)
test('campus stations have stable, different row profiles with paired sockets',()=>{
 const db=createSeed()
 assert.deepEqual(db.stations.slice(0,5).map(s=>profile(db,s.id)),[[12,15,12],[13,15],[12],[9,11,8],[10,12]])
 assert.equal(db.devices.length,365)
 assert.equal(db.sockets.length,730)
 assert.ok(db.devices.every(d=>db.sockets.filter(p=>p.deviceId===d.id).length===2))
 assert.deepEqual(createSeed(),db)
})

test('legacy row profiles migrate without changing device, socket, order or repair identity',()=>{
 const db=createSeed()
 const legacy=[[12,15,12],[16,12],[12],[14,14],[12,10]]
 for(const [index,counts] of legacy.entries()){
  const station=db.stations[index];delete station.demoLayoutRevision
  db.rows=db.rows.filter(r=>r.stationId!==station.id)
  const devices=db.devices.filter(d=>d.stationId===station.id)
  let offset=0
  for(const [ri,count] of counts.entries()){
   const row={id:`ROW${index+1}-${ri+1}`,stationId:station.id,name:String.fromCharCode(65+ri)+'排',index:ri+1};db.rows.push(row)
   for(let p=1;p<=count;p++){const d=devices[offset++];d.rowId=row.id;d.position=p;d.name=row.name+String(p).padStart(2,'0')+'号双插座设备'}
  }
 }
 const original=JSON.stringify(db),ids=db.devices.map(d=>[d.id,d.code,d.stationId])
 const result=migrations.migrateDemoLayouts(db)
 assert.equal(JSON.stringify(db),original)
 assert.deepEqual(result.stations.slice(0,5).map(s=>profile(result,s.id)),[[12,15,12],[13,15],[12],[9,11,8],[10,12]])
 assert.deepEqual(result.devices.map(d=>[d.id,d.code,d.stationId]),ids)
 assert.deepEqual(result.sockets,db.sockets)
 assert.deepEqual(result.orders,db.orders)
 assert.deepEqual(result.reports,db.reports)
 assert.deepEqual(migrations.migrateDemoLayouts(result),result)
})

test('a manually configured station layout is not overwritten by demo migration',()=>{
 const db=createSeed();delete db.stations[1].demoLayoutRevision
 db.rows.find(r=>r.stationId==='ST02').name='用户配置排'
 const before=JSON.stringify(db)
 assert.equal(JSON.stringify(migrations.migrateDemoLayouts(db)),before)
})
