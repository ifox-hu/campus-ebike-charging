import test from 'node:test';
import assert from 'node:assert/strict';
import {mapCatalog} from '../src/api/mapping.mjs';
import {groupStationRows} from '../src/domain/dual-socket-layout.mjs';
test('管理端业务目录保留设备排、排内序号及独立插座功率',()=>{
 const stations=mapCatalog([{id:3,name:'原管理站点',status:'OPERATING'}],[{id:4,stationId:3,code:'EB-0001',status:'ONLINE',rowId:'ROW1-1',rowName:'A排',position:1}],[{id:9,chargerId:4,code:'EB-0001-A',status:'IDLE',powerWatts:450},{id:10,chargerId:4,code:'EB-0001-B',status:'FAULT',powerWatts:300}]);
 const rows=groupStationRows(stations[0]);assert.equal(rows[0].name,'A排');assert.equal(rows[0].devices[0].position,1);
 assert.equal(stations[0].devices[0].sockets[0].powerWatts,450);assert.equal(stations[0].devices[0].sockets[1].status,'fault');
});
