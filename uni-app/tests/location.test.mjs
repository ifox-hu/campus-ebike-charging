import test from 'node:test';
import assert from 'node:assert/strict';
import {stationPosition,osmEmbedUrl,navigationUrl,gcjToWgs,wgsToGcj} from '../src/domain/location.mjs';
test('missing and unknown coordinates do not generate fake map positions',()=>{
 for(const s of [{},{latitude:null,longitude:114,coordinateType:'GCJ02'},{latitude:91,longitude:114,coordinateType:'GCJ02'},{latitude:22,longitude:114,coordinateType:'UNKNOWN'}])assert.equal(stationPosition(s),null);
});
test('GCJ02 and WGS84 round-trip accurately and navigation keeps its original coordinate type',()=>{
 const original={latitude:22.553,longitude:113.883};
 const gps=gcjToWgs(original);const back=wgsToGcj(gps);
 assert.ok(Math.abs(original.latitude-back.latitude)<0.00001);
 assert.ok(Math.abs(original.longitude-back.longitude)<0.00001);
 const station={...original,coordinateType:'GCJ-02',name:'A&B 测试站'};
 const url=new URL(navigationUrl(station));assert.equal(url.searchParams.get('name'),'A&B 测试站');assert.equal(url.searchParams.get('coordinate'),'gaode');
 const osm=new URL(osmEmbedUrl(station));const marker=osm.searchParams.get('marker').split(',').map(Number);
 assert.ok(Math.abs(marker[0]-gps.latitude)<0.000001);
 assert.equal(navigationUrl({...station,coordinateType:'WGS84'}).includes('coordinate=wgs84'),true);
});

test('initial map frames a few hundred metres around the selected station',()=>{
 for(const coordinateType of ['GCJ02','WGS84']){
  const station={latitude:22.553,longitude:113.883,coordinateType};
  const url=new URL(osmEmbedUrl(station));
  const [west,south,east,north]=url.searchParams.get('bbox').split(',').map(Number);
  const [latitude,longitude]=url.searchParams.get('marker').split(',').map(Number);
  assert.ok(east-west<=0.0031,'initial view should be street-scale, not district-scale');
  assert.ok(north-south<=0.0021,'initial view should stay close even in a compact map');
  assert.ok(Math.abs((west+east)/2-longitude)<1e-8);
  assert.ok(Math.abs((south+north)/2-latitude)<1e-8);
 }
});
