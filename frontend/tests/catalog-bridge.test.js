import test from 'node:test'
import assert from 'node:assert/strict'
import {createSeed} from '../src/domain/seed.js'
import {catalogOf,mergeCatalog,applySocketSnapshot} from '../src/domain/catalogBridge.js'
test('原16个站点及365台双插座设备完整发布，不夹带账号和模拟订单',()=>{
 const db=createSeed(),catalog=catalogOf(db)
 assert.equal(catalog.stations.length,16);assert.equal(catalog.devices.length,365);assert.equal(catalog.sockets.length,730)
 assert.equal(catalog.users,undefined);assert.equal(catalog.orders,undefined)
 assert.ok(catalog.sockets.every(s=>s.powerWatts===300));assert.ok(catalog.rates.every(r=>!('serviceRate' in r)))
})
test('合并目录保留手工站点和全部历史，运行状态不触发配置回写',()=>{
 const db=createSeed(),before=JSON.stringify(db.orders)
 db.stations.push({id:'CUSTOM',name:'手工站点'})
 const catalog=catalogOf(createSeed());catalog.stations[0].name='原管理端改名'
 mergeCatalog(db,catalog)
 assert.ok(db.stations.some(s=>s.id==='CUSTOM'));assert.equal(db.stations[0].name,'原管理端改名');assert.equal(JSON.stringify(db.orders),before)
 const config=JSON.stringify(catalogOf(db));applySocketSnapshot(db,[{externalId:db.sockets[0].id,id:987,status:'CHARGING'}])
 assert.equal(db.sockets[0].businessStatus,'CHARGING');assert.equal(JSON.stringify(catalogOf(db)),config)
})
