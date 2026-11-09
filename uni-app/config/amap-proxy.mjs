// The security code stays in the Vite process; only the public SDK key enters H5.
export function amapProxyOptions(securityCode){
 if(!securityCode)return {};
 const rewrite=path=>{
  const url=new URL(path.replace(/^\/_AMapService/,''),'https://restapi.amap.com');
  url.searchParams.set('jscode',securityCode);
  return url.pathname+url.search;
 };
 return {
  '/_AMapService/v4/map/styles':{target:'https://webapi.amap.com',changeOrigin:true,rewrite},
  '/_AMapService':{target:'https://restapi.amap.com',changeOrigin:true,rewrite},
 };
}
