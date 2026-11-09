// Station coordinates only. No user location is collected by this module.
const PI=Math.PI,A=6378245,EE=0.006693421622965943;
const outside=({latitude:y,longitude:x})=>x<72.004||x>137.8347||y<0.8293||y>55.8271;
function offset({latitude:y,longitude:x}){
 const a=x-105,b=y-35;
 let lat=-100+2*a+3*b+.2*b*b+.1*a*b+.2*Math.sqrt(Math.abs(a));
 lat+=(20*Math.sin(6*a*PI)+20*Math.sin(2*a*PI))*2/3;
 lat+=(20*Math.sin(b*PI)+40*Math.sin(b/3*PI))*2/3;
 lat+=(160*Math.sin(b/12*PI)+320*Math.sin(b*PI/30))*2/3;
 let lon=300+a+2*b+.1*a*a+.1*a*b+.1*Math.sqrt(Math.abs(a));
 lon+=(20*Math.sin(6*a*PI)+20*Math.sin(2*a*PI))*2/3;
 lon+=(20*Math.sin(a*PI)+40*Math.sin(a/3*PI))*2/3;
 lon+=(150*Math.sin(a/12*PI)+300*Math.sin(a/30*PI))*2/3;
 const rad=y/180*PI,magic=1-EE*Math.sin(rad)**2,sqrt=Math.sqrt(magic);
 return {latitude:lat*180/((A*(1-EE))/(magic*sqrt)*PI),longitude:lon*180/(A/sqrt*Math.cos(rad)*PI)};
}
export function wgsToGcj(point){if(outside(point))return {...point};const d=offset(point);return {latitude:point.latitude+d.latitude,longitude:point.longitude+d.longitude};}
export function gcjToWgs(point){
 if(outside(point))return {...point};let guess={...point};
 for(let i=0;i<5;i++){const mapped=wgsToGcj(guess);guess={latitude:guess.latitude+point.latitude-mapped.latitude,longitude:guess.longitude+point.longitude-mapped.longitude};}
 return guess;
}
export function stationPosition(station){
 if(station?.latitude===null||station?.longitude===null||station?.latitude===''||station?.longitude==='')return null;
 const latitude=Number(station?.latitude),longitude=Number(station?.longitude);
 const type=String(station?.coordinateType||'').toUpperCase().replaceAll('-','');
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180||!['GCJ02','WGS84'].includes(type))return null;
 return {latitude,longitude,type};
}
export function osmEmbedUrl(station){
 const p=stationPosition(station);if(!p)return null;const gps=p.type==='GCJ02'?gcjToWgs(p):p;
 if(Math.abs(gps.latitude)>85)return null;
 const params={bbox:[Math.max(-180,gps.longitude-.0015),gps.latitude-.001,Math.min(180,gps.longitude+.0015),gps.latitude+.001].join(','),layer:'mapnik',marker:`${gps.latitude},${gps.longitude}`};
 return 'https://www.openstreetmap.org/export/embed.html?'+query(params);
}
export function navigationUrl(station){
 const p=stationPosition(station);if(!p)return null;
 // URI API accepts the original coordinate system; do not silently shift it.
 const params={position:`${p.longitude},${p.latitude}`,name:station.name||'充电站点',coordinate:p.type==='GCJ02'?'gaode':'wgs84',callnative:'1'};
 return 'https://uri.amap.com/marker?'+query(params);
}

function query(params){return Object.entries(params).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');}
