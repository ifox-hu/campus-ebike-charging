<script setup>
import {computed,onMounted,onBeforeUnmount,ref,watch} from 'vue'
import {db} from '../domain/store.js'
import {catalogOf,mergeCatalog,applySocketSnapshot} from '../domain/catalogBridge.js'
const local=['127.0.0.1','localhost','[::1]'].includes(location.hostname)
const opened=ref(false),username=ref('demo_admin'),password=ref(''),connected=ref(false),automatic=ref(false),busy=ref(false),message=ref(''),error=ref(''),transfer=ref(''),revision=ref(0)
const catalog=computed(()=>JSON.stringify(catalogOf(db))),count=computed(()=>`${db.stations.length} 个站点 · ${db.devices.length} 台设备 · ${db.sockets.length} 个插座`)
let token='',baseline='',poll,timer,disposed=false
const tokenKey='management-catalog-session-token'
try{if(local)token=sessionStorage.getItem(tokenKey)||''}catch{}
function disconnect(){token='';connected.value=false;automatic.value=false;sessionStorage.removeItem(tokenKey);for(const socket of db.sockets){delete socket.businessId;delete socket.businessStatus}}
async function request(method='GET',body){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000)
 try{
  const r=await fetch('/api/management-catalog',{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:body?JSON.stringify(body):undefined,signal:controller.signal})
  const data=await r.json();if(!r.ok||data.code!==200){if(r.status===401)disconnect();throw Error(data.message||'目录同步失败')}
  return data.data
 }finally{clearTimeout(timeout)}
}
async function login(){
 error.value='';busy.value=true
 try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:username.value,password:password.value})});password.value='';const data=await r.json();if(!r.ok||!data.data?.token||data.data.role!=='ADMIN')throw Error(data.message||'请使用业务后端管理员账号');token=data.data.token;const state=await request();connected.value=true;sessionStorage.setItem(tokenKey,token);revision.value=state.revision;applySocketSnapshot(db,state.sockets);message.value=`已连接业务库，目录版本 ${state.revision}。点击发布本页站点，或先读取已发布目录。`}catch(e){error.value=e.message;token='';connected.value=false}finally{busy.value=false}
}
async function publish(){
 if(!connected.value||busy.value)return;busy.value=true;error.value=''
 const submitted=catalog.value
 try{const result=await request('POST',{revision:revision.value,catalog:JSON.parse(submitted)});if(disposed)return;revision.value=result.revision;baseline=submitted;automatic.value=true;applySocketSnapshot(db,result.sockets);message.value=`已发布：${count.value}；H5、小程序从同一业务库读取。后续配置变更自动发布。`}
 catch(e){automatic.value=false;error.value=e.name==='AbortError'?'请求超时，请先读取服务端目录核对结果，再重试发布。':e.message}
 finally{busy.value=false;if(automatic.value&&catalog.value!==baseline)timer=setTimeout(publish,800)}
}
function backup(){localStorage.setItem(`management-catalog-backup-${Date.now()}`,JSON.stringify(catalogOf(db)))}
async function readPublished(){
 if(busy.value)return;busy.value=true;error.value=''
 try{const result=await request();if(!result.catalog.stations)throw Error('业务库还没有发布管理目录，请先发布。');backup();automatic.value=false;mergeCatalog(db,result.catalog);revision.value=result.revision;baseline=catalog.value;automatic.value=true;applySocketSnapshot(db,result.sockets);message.value='已合并已发布目录；本页原有额外站点和历史记录保留。'}catch(e){error.value=e.message}finally{busy.value=false}
}
function exportCatalog(){transfer.value=JSON.stringify(catalogOf(db));message.value='下方为当前浏览器的完整站点目录，可复制到本机管理端导入。不会包含账号或订单。'}
function importCatalog(){try{const data=JSON.parse(transfer.value);backup();automatic.value=false;mergeCatalog(db,data);message.value='已合并导入目录，原目录已备份；点击发布本页站点后同步到用户端。';error.value=''}catch(e){error.value=e.message}}
watch(catalog,()=>{if(automatic.value&&catalog.value!==baseline){clearTimeout(timer);timer=setTimeout(publish,800)}})
onMounted(async()=>{if(token)try{const state=await request();if(disposed)return;connected.value=true;revision.value=state.revision;baseline=JSON.stringify(state.catalog);automatic.value=catalog.value===baseline;applySocketSnapshot(db,state.sockets);if(!automatic.value)message.value='本页目录与已发布版本不同，请核对后发布或读取已发布目录。'}catch(e){error.value=e.message}poll=setInterval(async()=>{if(!connected.value||busy.value||document.hidden)return;try{const state=await request();if(disposed)return;applySocketSnapshot(db,state.sockets);if(state.revision!==revision.value){automatic.value=false;error.value='其他页面已发布新版本，请先读取已发布目录再修改。'} }catch(e){automatic.value=false;error.value=e.message}},5000)})
onBeforeUnmount(()=>{disposed=true;clearInterval(poll);clearTimeout(timer);token=''})
</script>
<template><section class="catalog-sync"><div class="catalog-sync-line"><strong>{{local?'站点业务同步':'原管理端站点目录'}}</strong><span>{{count}}</span><span v-if="connected">{{automatic?'自动发布中':'已连接，待发布'}} · v{{revision}}</span><button class="table-link" @click="opened=!opened">{{opened?'收起':'同步设置 / 导出目录'}}</button></div><div v-if="opened" class="catalog-sync-body"><p v-if="!local">本站保留原管理界面和本浏览器站点。仅本机演示时，将目录复制到 5207 导入并发布，H5 和小程序即可使用这些站点。</p><form v-if="local&&!connected" class="catalog-sync-line" @submit.prevent="login"><label>业务管理员<input v-model="username" aria-label="业务同步账号" autocomplete="username"/></label><label>密码<input v-model="password" aria-label="业务同步密码" type="password" autocomplete="current-password"/></label><button class="soft-button active" :disabled="busy">连接业务后端</button></form><div v-if="local&&connected" class="catalog-sync-line"><button class="soft-button active" :disabled="busy" @click="publish">发布本页站点</button><button class="outline-button" :disabled="busy" @click="readPublished">读取已发布目录</button><button class="table-link" @click="disconnect">断开业务同步</button><span>配置修改后自动发布；插座占用状态每 5 秒刷新。</span></div><div class="catalog-sync-line"><button class="outline-button" @click="exportCatalog">导出当前站点目录</button><button v-if="local" class="outline-button" @click="importCatalog">合并导入目录</button></div><textarea v-model="transfer" aria-label="站点目录 JSON" rows="3" placeholder="导出后复制目录；本机端也可粘贴导入"/><p v-if="message" role="status">{{message}}</p><p v-if="error" class="form-error" role="alert">{{error}}</p></div><p v-else-if="error" class="form-error" role="alert">{{error}}</p></section></template>
<style scoped>.catalog-sync{margin:12px 20px;padding:10px 16px;border:1px solid #dfe5f1;border-radius:8px;background:#f5f7fc;color:#525b70;font-size:13px}.catalog-sync-line{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.catalog-sync-body{display:grid;gap:12px;margin-top:12px}.catalog-sync label{display:flex;gap:8px;align-items:center}.catalog-sync input{padding:7px;width:160px}.catalog-sync textarea{width:100%;box-sizing:border-box;font-size:12px}.catalog-sync p{margin:0}</style>
