import test from 'node:test'
import assert from 'node:assert/strict'
import {CAMPUS_DEMO_LOCATIONS} from '../src/domain/campusLocations.js'

test('all five campus sites identify a specific building and public source instead of campus centres',()=>{
 const names=['逸夫教学楼','第四学生公寓（中区）','体育馆','第八学生公寓（西区）','东区学生餐厅']
 assert.deepEqual(CAMPUS_DEMO_LOCATIONS.map(s=>s.landmark?.name),names)
 for(const site of CAMPUS_DEMO_LOCATIONS){
  assert.equal(site.landmark.source,'https://gis.nynu.edu.cn/#/')
  assert.equal(site.coordinateType,'GCJ02')
  assert.equal(site.campusLocationRevision,3)
  assert.match(site.address,/附近|侧/)
  assert.match(site.note,/规划|演示/)
 }
})

import {createSeed} from '../src/domain/seed.js'
import {migrateCampusLocations} from '../src/domain/migration.js'
import {PREVIOUS_CAMPUS_LOCATIONS} from '../src/domain/campusLocations.js'
test('revision 1 migration preserves business data and custom coordinates or addresses',()=>{
 const source=createSeed();source.stations=source.stations.map((s,i)=>({...s,...PREVIOUS_CAMPUS_LOCATIONS[i],campusLocationRevision:1}));
 source.stations[1].address='人工校对地址';source.stations[2].lat=32.9787;
 const result=migrateCampusLocations(source);assert.equal(result.stations[0].campusLocationRevision,3);assert.deepEqual(result.stations[1],source.stations[1]);assert.deepEqual(result.stations[2],source.stations[2]);
 for(const key of ['devices','sockets','rows','orders','reports','rates'])assert.deepEqual(result[key],source[key]);
 assert.deepEqual(migrateCampusLocations(result),result);
})
