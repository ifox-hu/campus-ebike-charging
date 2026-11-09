import test from 'node:test'
import assert from 'node:assert/strict'
import {createSeed} from '../src/domain/seed.js'
import * as migrations from '../src/domain/migration.js'

test('all five demonstration sites use the Nanyang Normal University campus area rather than the old city coordinates',()=>{
  const state=createSeed()
  assert.equal(state.stations.length,5)
  for(const s of state.stations){
    assert.equal(s.scene,'校园')
    assert.match(s.address,/南阳师范学院/)
    assert.ok(s.lng>112.475&&s.lng<112.5,`${s.id} longitude outside campus vicinity: ${s.lng}`)
    assert.ok(s.lat>32.973&&s.lat<32.982,`${s.id} latitude outside campus vicinity: ${s.lat}`)
    assert.equal(s.coordinateType,'GCJ02')
  }
})

test('known old coordinates migrate without resetting devices, orders, rates or reports',()=>{
  const old=createSeed()
  Object.assign(old.stations[0],{name:'教学楼东侧示例站',lat:32.9912,lng:112.5231,address:'教学区东侧集中停车棚'})
  delete old.stations[0].campusLocationRevision
  const business=JSON.stringify({devices:old.devices,orders:old.orders,reports:old.reports,rates:old.rates})
  const result=migrations.migrateCampusLocations(old)
  assert.ok(result.stations[0].lng<112.5)
  assert.equal(JSON.stringify({devices:result.devices,orders:result.orders,reports:result.reports,rates:result.rates}),business)
  assert.deepEqual(migrations.migrateCampusLocations(result),result)
})

test('a manually edited station and independently added sites are preserved during migration',()=>{
  const db=createSeed()
  Object.assign(db.stations[0],{name:'人工校对的站点',lat:31,lng:113,address:'已人工修改'})
  db.stations.push({id:'CUSTOM',name:'自建站',lat:30,lng:114})
  const before=JSON.stringify([db.stations[0],db.stations.at(-1)])
  const result=migrations.migrateCampusLocations(db)
  assert.equal(JSON.stringify([result.stations[0],result.stations.at(-1)]),before)
})
