import test from 'node:test';
import assert from 'node:assert/strict';
import {amapCenter,createStationMap} from '../src/domain/amap.mjs';
import {amapProxyOptions} from '../config/amap-proxy.mjs';
import fs from 'node:fs';
import {createDemoState} from '../src/domain/charging.mjs';

test('fresh local campus examples match the verified server demonstration coordinates',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('../src/data/campus-stations.json',import.meta.url),'utf8'));
 const local=createDemoState();
 for(const campus of fixture.stations){
  const station=local.stations.find(s=>s.name===campus.name);assert.ok(station);
  assert.equal(station.address,campus.address);assert.equal(station.coordinateType,'GCJ02');
  assert.deepEqual(amapCenter(station),[campus.longitude,campus.latitude]);
 }
});

test('AMap uses GCJ02 and converts only WGS84 stations',()=>{
 const station={latitude:22.543096,longitude:114.057865,coordinateType:'GCJ02'};
 assert.deepEqual(amapCenter(station),[114.057865,22.543096]);
 const converted=amapCenter({...station,coordinateType:'WGS84'});
 assert.ok(Math.abs(converted[0]-station.longitude)>0.001);
 assert.equal(amapCenter({...station,coordinateType:'UNKNOWN'}),null);
});

test('station map starts close, changes station, recenters and releases the SDK map',()=>{
 let map,marker;
 const sdk={Map:class{constructor(container,options){this.container=container;this.options=options;map=this;}addControl(){}setZoomAndCenter(zoom,center){this.zoom=zoom;this.center=center;}destroy(){this.destroyed=true;}},
 Marker:class{constructor(options){this.options=options;marker=this;}setPosition(p){this.position=p;}setTitle(t){this.title=t;}},Scale:class{},ToolBar:class{}};
 const first={name:'站点一',latitude:22.54,longitude:114.05,coordinateType:'GCJ02'};
 const view=createStationMap(sdk,'map-container',first);
 assert.equal(map.options.zoom,17);assert.deepEqual(map.options.center,[114.05,22.54]);
 assert.equal(marker.options.map,map);
 const second={...first,name:'站点二',latitude:22.55,longitude:113.9};
 view.select(second);assert.deepEqual(map.center,[113.9,22.55]);assert.equal(marker.title,'站点二');
 map.zoom=10;map.center=[100,30];view.recenter();
 assert.equal(map.zoom,17);assert.deepEqual(map.center,[113.9,22.55]);
 view.destroy();assert.equal(map.destroyed,true);
});

test('AMap proxy sends security code only upstream and preserves SDK query parameters',()=>{
 const proxy=amapProxyOptions('server-only-test-code');
 assert.equal(proxy['/_AMapService/v4/map/styles'].target,'https://webapi.amap.com');
 assert.equal(proxy['/_AMapService'].target,'https://restapi.amap.com');
 const rewritten=proxy['/_AMapService'].rewrite('/_AMapService/v3/log/init?key=public-test-key&jscode=untrusted');
 const url=new URL(rewritten,'https://restapi.amap.com');
 assert.equal(url.pathname,'/v3/log/init');assert.equal(url.searchParams.get('key'),'public-test-key');
 assert.deepEqual(url.searchParams.getAll('jscode'),['server-only-test-code']);
 assert.deepEqual(amapProxyOptions(''),{});
});
