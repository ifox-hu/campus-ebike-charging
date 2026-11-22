<script setup>
import brandMark from './assets/brand-mark.svg'
import ManagementWorkspace from './components/management/ManagementWorkspace.vue'
import { managementNavigation, managementPages } from './domain/management.js'
import { createDemoManagementClient } from './domain/managementDemo.js'
import OperationsPanel from './components/OperationsPanel.vue'
import { computed,onMounted,onBeforeUnmount,ref,watch } from 'vue'
import {isStaticDemo} from './runtime.js'
import DashboardPage from './components/DashboardPage.vue'
import ManagePage from './components/ManagePage.vue'
import EntityEditor from './components/EntityEditor.vue'
import OrderDetails from './components/OrderDetails.vue'
import SocketPanel from './components/SocketPanel.vue'
import TopbarTools from './components/TopbarTools.vue'
import AccountPanel from './components/AccountPanel.vue'
import LoginPage from './components/LoginPage.vue'
import UiIcon from './components/UiIcon.vue'
import PageTabs from './components/PageTabs.vue'
import { createTabState, visitPage, closePage } from './domain/pageTabs.js'
import { navigation } from './data.js'
import { api,db,storageWarning,selectDemoOperator,getDemoManagementSource,refreshDemoManagementView } from './domain/store.js'
import { DEMO_OPERATORS } from './domain/operatorDemo.js'
import { account,restoreAccount,checkSession } from './domain/account.js'
import { refreshReadState } from './domain/notifications.js'
const operatorView=computed(()=>isStaticDemo&&account.user?.role==='OPERATOR_ADMIN')
const operatorFilter=ref('')
const visibleNavigation=computed(()=>managementNavigation(account.user?.role || 'ADMIN'))
const managementClient=createDemoManagementClient({getUser:()=>account.user,getSource:getDemoManagementSource,onChanged:()=>refreshDemoManagementView()})
const demoOperators=ref(DEMO_OPERATORS)
async function managementUpdated(){demoOperators.value=await managementClient.operators()}
const operatorName=computed(()=>DEMO_OPERATORS.find(item=>item.id===account.user?.operatorId)?.name)
const canManageStations=computed(()=>!operatorView.value&&!operatorFilter.value)
const fromHash=()=>visibleNavigation.value.some(n=>n.id===location.hash.slice(2))?location.hash.slice(2):'dashboard'
const pageTabs=ref(createTabState(fromHash()))
const currentPage=computed(()=>pageTabs.value.currentPage)
const collapsed=ref(false),dialog=ref(null),toast=ref(''),toastError=ref(false),loginPending=ref(false)
const pageTitle=computed(()=>visibleNavigation.value.find(n=>n.id===currentPage.value)?.label||'数据统计')
let toastTimer,sessionTimer
function message(text,error=false){toast.value=text;toastError.value=error;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.value='',3500)}
function navigate(target){if(!visibleNavigation.value.some(item=>item.id===(typeof target==='string'?target:target.page)))return;if((typeof target==='string'?target:target.page)==='operators'&&operatorFilter.value){operatorFilter.value='';selectDemoOperator(null)}const next=visitPage(pageTabs.value,target);if(next===pageTabs.value)return;pageTabs.value=next;location.hash=`/${next.currentPage}`;dialog.value=null}
function closeTab(page){const next=closePage(pageTabs.value,page);if(next===pageTabs.value)return;const changed=next.currentPage!==currentPage.value;pageTabs.value=next;if(changed){location.hash=`/${next.currentPage}`;dialog.value=null}}
function openDevice(value){const data=typeof value==='string'?{id:value}:value;dialog.value={type:'device',title:'设备与独立插座',id:data.id||data.deviceId,focusSocketId:data.socketId}}
function openOrder(id){dialog.value={type:'order',title:'充电订单详情',id}}
function edit(payload){if(payload.type==='stations'&&!payload.id&&!canManageStations.value)return;const labels={stations:'站点',devices:'设备',rates:'收费规则',reports:'报修处理',rows:'设备排',batch:'追加设备'};dialog.value={type:'editor',entityType:payload.type,beforeValue:recordFor(payload.type,payload.id),id:payload.id,stationId:payload.stationId,rowId:payload.rowId,title:payload.type==='reports'?'报修处理':payload.type==='batch'?'批量追加双插座设备':`${payload.id?'修改':'新增'}${labels[payload.type]}`}}
function openTarget(t){if(t.deviceId)openDevice(t);else if(t.orderId)openOrder(t.orderId);else if(t.reportId)edit({type:'reports',id:t.reportId});else navigate(t)}
function openAccount(mode){dialog.value={type:'account',mode,title:({profile:'个人中心',password:'修改密码',preferences:'显示设置'})[mode]}}
function saved(text){const changed=dialog.value;if(changed?.type==='editor')managementClient.recordOperation({action:'维护'+changed.entityType,path:'/demo/'+changed.entityType+'/'+(changed.id||'new'),method:changed.id?'PUT':'POST',beforeValue:changed.beforeValue,afterValue:recordFor(changed.entityType,changed.id)}).catch(failure=>message(failure.message,true));dialog.value=null;message(typeof text==='string'?text:'已保存，关联页面与工作台已同步更新。')}
function recordFor(type,id){return JSON.parse(JSON.stringify(db[type]?.find(row=>String(row.id)===String(id))||null))}
function confirmToggle(p){if((p.kind==='user'&&operatorView.value))return;dialog.value={...p,type:'confirm'}}
function applyConfirmation(){try{const d=dialog.value;const collection={station:'stations',device:'devices',user:'users'}[d.kind];const before=recordFor(collection,d.id);({station:api.setStationEnabled,device:api.setDeviceEnabled,user:api.setUserEnabled}[d.kind])(d.id,d.enabled);managementClient.recordOperation({action:'修改状态',path:'/demo/'+collection+'/'+d.id,method:'PATCH',beforeValue:before,afterValue:recordFor(collection,d.id)}).catch(failure=>message(failure.message,true));dialog.value=null;message('状态已更新，历史记录保留。')}catch(e){dialog.value.error=e.message}}
function handleEscape(e){if(e.key==='Escape')dialog.value=null}
function routeChanged(){if(account.user&&fromHash()!==currentPage.value)navigate(fromHash())}
function loggedIn(){navigate(visibleNavigation.value.some(item=>item.id===account.returnTo)?account.returnTo:'dashboard')}
watch(()=>account.user?.username,()=>{
 operatorFilter.value=''
 selectDemoOperator(account.user?.operatorId||null)
 if(account.user?.role==='ADMIN')managementUpdated()
 pageTabs.value=createTabState(fromHash())
 dialog.value=null
},{flush:'sync'})
function changeOperatorFilter(){
 selectDemoOperator(operatorFilter.value||null)
 pageTabs.value=createTabState(currentPage.value)
 dialog.value=null
}
watch(()=>account.user,(user,old)=>{if(!user&&old){account.returnTo=currentPage.value;dialog.value=null;location.hash='/login'}else if(user&&!old&&location.hash==='/login'){navigate(account.returnTo||'dashboard')}})
onMounted(()=>{account.returnTo=currentPage.value;restoreAccount();document.addEventListener('keydown',handleEscape);window.addEventListener('hashchange',routeChanged);sessionTimer=setInterval(()=>{checkSession();refreshReadState()},30000)})
onBeforeUnmount(()=>{clearTimeout(toastTimer);clearInterval(sessionTimer);document.removeEventListener('keydown',handleEscape);window.removeEventListener('hashchange',routeChanged)})
</script>
<template>
 <div v-if="account.loading" class="auth-loading"><span class="auth-loading-spinner"></span><p>{{isStaticDemo?'正在载入公开演示…':'正在连接账号服务…'}}</p></div>
 <LoginPage v-else-if="!account.user||loginPending" @pending="loginPending=$event" @success="loggedIn"/>
 <div v-else class="platform" :class="{'sidebar-collapsed':collapsed}">
  <aside class="sidebar"><a href="#/dashboard" class="brand" aria-label="电动自行车智慧充电管理系统首页" @click.prevent="navigate('dashboard')"><img class="brand-logo" :src="brandMark" alt=""/><span class="brand-name">电动自行车<br/>智慧充电管理系统</span></a><nav class="navigation" aria-label="主导航"><div v-for="nav in visibleNavigation" :key="nav.id" class="nav-group"><button class="nav-item" :class="{active:nav.id===currentPage}" @click="navigate(nav.id)" :title="nav.label"><UiIcon :name="nav.icon"/><span>{{nav.label}}</span></button></div></nav></aside>
  <header class="topbar" :class="{'collapsed-topbar':collapsed}"><button class="icon-button fold-button" @click="collapsed=!collapsed" :aria-label="collapsed?'展开导航':'收起导航'"><UiIcon name="menu" size="1.5rem"/></button><div class="breadcrumbs"><span>电动自行车充电管理 / </span><strong>{{pageTitle}}</strong></div><span v-if="operatorName" class="preview-mode-chip">{{operatorName}}</span><TopbarTools @target="openTarget" @account="openAccount" @runtime="dialog={type:'runtime',title:'运行状态与说明'}" @message="message"/></header>
  <main class="main-content">
   <div class="tab-strip workspace-tab-strip"><PageTabs :tabs="pageTabs.tabs" :current-page="currentPage" :navigation="visibleNavigation" @select="navigate" @close="closeTab"/><span class="tab-mode-note">{{currentPage==='dashboard'?'运营概览':'基础业务管理'}} · 设备软件模拟</span></div>
   <p v-if="storageWarning.message" class="storage-warning">{{storageWarning.message}}</p>
   <div v-for="tab in pageTabs.tabs" v-show="currentPage===tab.page" :key="tab.page" class="workspace-page">
    <ManagementWorkspace v-if="managementPages.has(tab.page)" :key="account.user.username + tab.page + operatorFilter" :page="tab.page" :client="managementClient" :user="account.user" :operator-id="operatorFilter" :operators="demoOperators" :stations="db.stations" :source="db" @updated="managementUpdated" @order="openOrder"/>
    <DashboardPage v-else-if="tab.page==='dashboard'" :source="db" :operators="demoOperators" :platform-admin="!operatorView" @open-device="openDevice" @navigate="navigate" @message="message"/>
    <OperationsPanel v-else-if="tab.page==='operations'" :show-statistics="false" :source="db" :account-key="account.user.username" @device="openDevice" @order="openOrder"/>
    <ManagePage v-else :page="tab.page" :station-scope="tab.stationId" :can-manage-stations="canManageStations" @edit="edit" @device="openDevice" @order="openOrder" @confirm="confirmToggle" @navigate="navigate"/>
   </div>
  </main>
  <Transition name="toast"><div v-if="toast" role="status" class="toast-message" :class="{error:toastError}"><span>{{toastError?'!':'✓'}}</span>{{toast}}</div></Transition>
  <div v-if="dialog" class="modal-shade" @click.self="dialog=null"><section class="modal-card" :class="{'wide-modal':dialog.type==='device','editor-modal':dialog.type==='editor'}" role="dialog" aria-modal="true" :aria-label="dialog.title"><header><h2>{{dialog.title}}</h2><button class="icon-button" aria-label="关闭弹窗" @click="dialog=null"><UiIcon name="close" size="1.3rem"/></button></header><EntityEditor v-if="dialog.type==='editor'" :key="`${dialog.entityType}-${dialog.id}`" :type="dialog.entityType" :id="dialog.id" :station-id="dialog.stationId" :row-id="dialog.rowId" @done="saved" @cancel="dialog=null"/><SocketPanel v-else-if="dialog.type==='device'" :id="dialog.id" :focus-socket-id="dialog.focusSocketId" @order="openOrder" @message="message"/><OrderDetails v-else-if="dialog.type==='order'" :id="dialog.id" @message="message"/><AccountPanel v-else-if="dialog.type==='account'" :key="dialog.mode" :mode="dialog.mode" @done="saved" @close="dialog=null" @message="message"/><template v-else-if="dialog.type==='confirm'"><p class="dialog-copy">{{dialog.description}}</p><p v-if="dialog.error" class="form-error dialog-error" role="alert">{{dialog.error}}</p></template><template v-else><div class="runtime-status"><div><span>{{isStaticDemo?'演示模式':'账号服务'}}</span><strong :class="account.serverOnline?'online-label':'offline-label'">{{isStaticDemo?'GitHub Pages · 浏览器本地演示':account.serverOnline?'已连接 Spring Boot 服务':'连接暂不可用'}}</strong></div><div><span>当前账号</span><strong>{{account.user.username}} · {{account.user.displayName}}</strong></div><div><span>资料与显示设置</span><strong>{{isStaticDemo?'当前浏览器本地存储':'服务端文件数据库持久化'}}</strong></div><div><span>通知已读状态</span><strong>{{isStaticDemo?'保存在当前浏览器':'按登录账号保存'}}</strong></div><div><span>充电业务</span><strong>浏览器本地模拟数据</strong></div><div><span>设备与支付</span><strong>软件模拟，无实物控制或真实交易</strong></div></div><p class="dialog-copy">{{isStaticDemo?'本页为公开静态演示，无真实账号权限；资料、显示设置、通知和充电业务数据仅保存在当前浏览器，不连接账号服务，不发生真实支付。':'设备按“站点 → 多排设备 → 每台两个独立插座”组织。账号已接入会话校验；充电业务、MySQL 及 H5/小程序统一数据联调尚未完成。'}}</p><button v-if="!isStaticDemo" class="text-button runtime-recheck" @click="checkSession">重新检查账号连接</button></template><footer v-if="!['editor','account'].includes(dialog.type)"><button v-if="dialog.type==='confirm'" class="outline-button" @click="dialog=null">取消</button><button class="soft-button active" @click="dialog.type==='confirm'?applyConfirmation():dialog=null">{{dialog.type==='confirm'?'确认':'关闭'}}</button></footer></section></div>
 </div>
</template>

<style scoped>
.workspace-tab-strip{height:auto;min-height:3.75rem;min-width:0}
.workspace-tab-strip>.tab-mode-note{flex-shrink:0}
@media(max-width:900px){.workspace-tab-strip>.tab-mode-note{display:none}}
</style>
