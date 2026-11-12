import test from 'node:test'
import assert from 'node:assert/strict'
import {createSeed} from '../src/domain/seed.js'
import {catalogOf,mergeCatalog,applySocketSnapshot} from '../src/domain/catalogBridge.js'
import {socketStatus,createService} from '../src/domain/service.js'
test('原16个站点及365台双插座设备完整发布，不夹带账号和模拟订单',()=>{
 const db=createSeed(),catalog=catalogOf(db)
 assert.equal(catalog.stations.length,16);assert.equal(catalog.devices.length,365);assert.equal(catalog.sockets.length,730)
 assert.equal(catalog.users,undefined);assert.equal(catalog.orders,undefined)
 assert.ok(catalog.sockets.every(s=>s.powerWatts===300));assert.ok(catalog.rates.every(r=>!('serviceRate' in r)))
})
test('发布后使用业务占用状态，离线设备不计为空闲且不允许本地模拟启动',()=>{
 const db=createSeed(),socket=db.sockets[0],api=createService(db)
 applySocketSnapshot(db,[{externalId:socket.id,id:987,status:'IDLE'}])
 assert.equal(socketStatus(db,socket),'空闲')
 db.devices[0].online=false;assert.equal(socketStatus(db,socket),'离线')
 socket.businessStatus='CHARGING';assert.equal(socketStatus(db,socket),'充电中')
 assert.throws(()=>api.setSocketPower(socket.id,400),/未结束任务/)
 assert.throws(()=>api.requestStartSimulation(socket.id,'U1'),/业务库/)
})
test('非法导入在修改任何记录前失败',()=>{
 const db=createSeed(),c=catalogOf(db),before=JSON.stringify(db)
 c.stations[0].name='不应写入';c.sockets[0].id=''
 assert.throws(()=>mergeCatalog(db,c),/编号/);assert.equal(JSON.stringify(db),before)
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
