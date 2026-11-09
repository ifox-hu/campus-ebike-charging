import {isStaticDemo} from '../runtime.js'
import {createStaticAccountRequest} from './staticAccount.js'
const staticRequest=isStaticDemo?createStaticAccountRequest({storage:localStorage,sessionStorage}):null
let csrfToken = null
async function timedFetch(url,options){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{return await fetch(url,{...options,signal:controller.signal})}catch(e){if(e.name==='AbortError')throw Error('账号服务连接超时，请稍后重试。');throw e}finally{clearTimeout(timer)}}
export async function refreshCsrf(){
 if(isStaticDemo)return null
 const r=await timedFetch('/api/auth/csrf',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('账号服务未连接，请先启动后台服务。');csrfToken=await r.json();return csrfToken
}
export async function accountRequest(path,{method='GET',body,form=false,quiet401=false}={}){
 if(isStaticDemo)return staticRequest(path,{method,body})
 try{
  const headers={Accept:'application/json'}
  if(!['GET','HEAD'].includes(method)){if(!csrfToken)await refreshCsrf();headers[csrfToken.headerName]=csrfToken.token}
  if(body!==undefined)headers['Content-Type']=form?'application/x-www-form-urlencoded':'application/json'
  const r=await timedFetch(`/api${path}`,{method,headers,credentials:'same-origin',cache:'no-store',body:body===undefined?undefined:form?new URLSearchParams(body).toString():JSON.stringify(body)})
  const data=await r.json().catch(()=>({}))
  if(!r.ok){if(r.status===401&&!quiet401)window.dispatchEvent(new CustomEvent('admin-session-expired'));if(r.status===403)csrfToken=null;const e=Error(data.message||(r.status>=500?'账号服务暂时不可用，请稍后重试。':'操作未完成，请重试。'));e.status=r.status;throw e}
  return data
 }catch(e){if(e instanceof TypeError)throw Error('无法连接账号服务，请检查本机后台服务是否启动。');throw e}
}
export function forgetCsrf(){csrfToken=null}
