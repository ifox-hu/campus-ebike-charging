import test from 'node:test'
import assert from 'node:assert/strict'
import {createSeed} from '../src/domain/seed.js'
import * as stationMap from '../src/domain/stationMap.js'

test('站点地图统计沿用实际插座状态，离线停用故障及异常占用不计为空闲',()=>{
 const rows=stationMap.buildStationMapRows(createSeed()),first=rows.find(s=>s.id==='ST01')
 assert.deepEqual({devices:first.deviceCount,sockets:first.socketCount,free:first.free,charging:first.charging,fault:first.fault,offline:first.offlineDevices,abnormal:first.abnormal,pending:first.pendingRepairs},
  {devices:39,sockets:78,free:69,charging:3,fault:2,offline:1,abnormal:1,pending:3})
 assert.equal(first.tone,'alert')
 assert.equal(rows.find(s=>s.id==='ST02').free,56)
})
test('地图摘要随本地业务状态变化，不修改业务数据',()=>{
 const db=createSeed(),before=JSON.stringify(db)
 stationMap.buildStationMapRows(db);assert.equal(JSON.stringify(db),before)
 db.stations[0].enabled=false;db.reports[0].status='resolved'
 const first=stationMap.buildStationMapRows(db)[0]
 assert.equal(first.free,0);assert.equal(first.pendingRepairs,2);assert.equal(first.tone,'disabled')
})
test('只接受有效GCJ02坐标，不将缺失值空串和未知坐标系变成有效位置',()=>{
 for(const value of [{lat:null,lng:112},{lat:'',lng:112},{lat:91,lng:112},{lat:32,lng:200},{lat:32,lng:112,coordinateType:'WGS84'},{lat:NaN,lng:112}])assert.equal(stationMap.stationPosition(value),null)
 assert.deepEqual(stationMap.stationPosition({lat:'32.9912',lng:'112.5231'}),[112.5231,32.9912])
 assert.deepEqual(stationMap.stationPosition({lat:32,lng:112,coordinateType:'GCJ-02'}),[112,32])
})
test('搜索和状态筛选可组合，缺失坐标站点仍可查询',()=>{
 const db=createSeed();db.stations[4].lat=null
 const rows=stationMap.buildStationMapRows(db)
 assert.deepEqual(stationMap.filterMapStations(rows,'教学','alert').map(s=>s.id),['ST01'])
 assert.equal(stationMap.filterMapStations(rows,'不存在','all').length,0)
 assert.deepEqual(stationMap.filterMapStations(rows,'东升园','all').map(s=>s.id),['ST05'])
 assert.equal(rows[4].position,null)
 db.stations[1].enabled=false
 assert.deepEqual(stationMap.filterMapStations(stationMap.buildStationMapRows(db),'','disabled').map(s=>s.id),['ST02'])
})
test('坐标示意只投影有效站点，单点和重合点结果有限且落在可点击范围',()=>{
 const rows=[{id:'a',position:[112,32]},{id:'b',position:[112,32]},{id:'bad',position:null}]
 const points=stationMap.projectMapStations(rows)
 assert.equal(points.length,2)
 for(const p of points){assert.ok(Number.isFinite(p.x)&&p.x>=10&&p.x<=90);assert.ok(Number.isFinite(p.y)&&p.y>=15&&p.y<=85)}
 assert.notDeepEqual([points[0].x,points[0].y],[points[1].x,points[1].y])
 assert.deepEqual(stationMap.projectMapStations([]),[])
})
