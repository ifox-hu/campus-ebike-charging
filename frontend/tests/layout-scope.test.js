import test from 'node:test'
import assert from 'node:assert/strict'
import {selectLayoutScope} from '../src/domain/layoutScope.js'

const stations=[{id:'S1',name:'校园站',rowCount:1,deviceCount:2,portCount:4},{id:'S2',name:'医院站',rowCount:1,deviceCount:1,portCount:2}]
const rows=[{id:'R1',stationId:'S1',name:'A排',devices:[{code:'A1',name:'设备',status:'正常'},{code:'A2',name:'设备',status:'离线'}]},{id:'R2',stationId:'S2',name:'A排',devices:[{code:'B1',name:'设备',status:'正常'}]}]
test('all stations keeps separate rows and sums capacity',()=>{
 const result=selectLayoutScope(stations,rows,'')
 assert.deepEqual(result.summary,{name:'全部站点',rowCount:2,deviceCount:3,portCount:6})
 assert.deepEqual(result.rows.map(r=>r.stationName),['校园站','医院站'])
 assert.equal(result.rows.flatMap(r=>r.visible).length,3)
})
test('station, keyword and status filters combine without changing source rows',()=>{
 const before=structuredClone(rows)
 assert.deepEqual(selectLayoutScope(stations,rows,'S1','A','离线').rows[0].visible.map(d=>d.code),['A2'])
 assert.equal(selectLayoutScope(stations,rows,'','B1','正常').rows[0].stationId,'S2')
 assert.equal(selectLayoutScope(stations,rows,'S2').summary.portCount,2)
 assert.deepEqual(rows,before)
})
