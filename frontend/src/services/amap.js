// Reuse the legacy demo's native AMap 2.0 integration; no map wrapper dependency.
let pending=null
export function loadAmap({key,securityCode}){
 if(window.AMap?.Map)return Promise.resolve(window.AMap)
 if(!key)return Promise.reject(new Error('未配置高德地图 Key'))
 if(pending)return pending
 pending=new Promise((resolve,reject)=>{
  window._AMapSecurityConfig={securityJsCode:securityCode||''}
  const script=document.createElement('script')
  let settled=false
  const finish=(error)=>{
   if(settled)return;settled=true;clearTimeout(timer);script.onload=null;script.onerror=null
   if(error){script.remove();reject(error)}else resolve(window.AMap)
  }
  const timer=setTimeout(()=>finish(new Error('地图服务加载超时，可重试或继续使用站点示意')),12000)
  script.src=`https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.Scale,AMap.ToolBar`
  script.async=true
  script.onload=()=>finish(window.AMap?.Map?null:new Error('地图服务未就绪，请检查地图配置'))
  script.onerror=()=>finish(new Error('地图服务连接失败，请检查网络或地图配置'))
  document.head.appendChild(script)
 }).catch(error=>{pending=null;throw error})
 return pending
}
