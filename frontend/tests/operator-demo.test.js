import test from 'node:test'
import assert from 'node:assert/strict'
import {createSeed} from '../src/domain/seed.js'
import {addOperatorOwnership, operatorDemoData, mergeOperatorDemoData} from '../src/domain/operatorDemo.js'
import {createService} from '../src/domain/service.js'

test('operator demo data only includes its site relationships and edits merge into platform view', () => {
 const data=addOperatorOwnership(createSeed())
 const campus=operatorDemoData(data,'campus')
 const hospital=operatorDemoData(data,'hospital')
 assert.ok(campus.stations.length>=2)
 assert.ok(hospital.stations.length>=1)
 assert.ok(campus.devices.every(device=>campus.stations.some(site=>site.id===device.stationId)))
 assert.ok(hospital.sockets.every(socket=>hospital.devices.some(device=>device.id===socket.deviceId)))
 assert.ok(campus.orders.every(order=>campus.stations.some(site=>site.id===order.stationId)))
 assert.ok(campus.reports.every(report=>campus.sockets.some(socket=>socket.id===report.socketId)))
 const rate=campus.rates[0]
 assert.throws(()=>createService(campus).saveRate(hospital.stations[0].id, 1, .1))
 campus.rates[0]={...rate,electricRate:1}
 const merged=mergeOperatorDemoData(data,campus,'campus')
 assert.equal(merged.rates.find(row=>row.stationId===rate.stationId).electricRate,1)
 assert.deepEqual(operatorDemoData(merged,'hospital'),hospital)
})
