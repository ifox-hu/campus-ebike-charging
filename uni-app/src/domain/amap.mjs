import {stationPosition,wgsToGcj} from './location.mjs';

export function amapCenter(station){
 const point=stationPosition(station);if(!point)return null;
 const gcj=point.type==='WGS84'?wgsToGcj(point):point;
 return [gcj.longitude,gcj.latitude];
}

export function createStationMap(AMap,container,station){
 let current=station;
 const center=amapCenter(current);if(!center)throw new Error('站点坐标不可用');
 const map=new AMap.Map(container,{zoom:17,center,viewMode:'2D',resizeEnable:true});
 const marker=new AMap.Marker({map,position:center,title:current.name});
 map.addControl(new AMap.Scale({position:'LB'}));
 map.addControl(new AMap.ToolBar({position:'RT'}));
 const recenter=()=>map.setZoomAndCenter(17,amapCenter(current),true);
 return {select(next){if(!amapCenter(next))return;current=next;marker.setPosition(amapCenter(next));marker.setTitle(next.name);recenter();},recenter,destroy:()=>map.destroy()};
}

export async function loadAmap(key){
 if(!key)throw new Error('尚未配置高德地图 Web Key');
 window._AMapSecurityConfig={serviceHost:window.location.origin+'/_AMapService'};
 const {default:loader}=await import('@amap/amap-jsapi-loader');
 return loader.load({key,version:'2.0',plugins:['AMap.Scale','AMap.ToolBar']});
}
