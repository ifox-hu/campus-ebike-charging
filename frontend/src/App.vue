<script setup>
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
import { navigation,referenceUrl } from './data.js'
import { api,db,storageWarning } from './domain/store.js'
import { account,restoreAccount,checkSession } from './domain/account.js'
import { refreshReadState } from './domain/notifications.js'
const fromHash=()=>navigation.some(n=>n.id===location.hash.slice(2))?location.hash.slice(2):'dashboard'
const currentPage=ref(fromHash()),stationScope=ref(''),collapsed=ref(false),dialog=ref(null),toast=ref(''),toastError=ref(false)
const pageTitle=computed(()=>navigation.find(n=>n.id===currentPage.value)?.label||'数据统计')
let toastTimer,sessionTimer
function message(text,error=false){toast.value=text;toastError.value=error;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.value='',3500)}
function navigate(target){const p=typeof target==='string'?{page:target}:target;if(!navigation.some(n=>n.id===p.page))return;stationScope.value=p.stationId||'';currentPage.value=p.page;location.hash=`/${p.page}`;dialog.value=null}
function openDevice(value){const data=typeof value==='string'?{id:value}:value;dialog.value={type:'device',title:'设备与独立插座',id:data.id||data.deviceId,focusSocketId:data.socketId}}
function openOrder(id){dialog.value={type:'order',title:'充电订单详情',id}}
function edit(payload){const labels={stations:'站点',devices:'设备',rates:'收费规则',reports:'报修处理',rows:'设备排',batch:'追加设备'};dialog.value={type:'editor',entityType:payload.type,id:payload.id,stationId:payload.stationId,rowId:payload.rowId,title:payload.type==='reports'?'报修处理':payload.type==='batch'?'批量追加双插座设备':`${payload.id?'修改':'新增'}${labels[payload.type]}`}}
function openTarget(t){if(t.deviceId)openDevice(t);else if(t.orderId)openOrder(t.orderId);else if(t.reportId)edit({type:'reports',id:t.reportId});else navigate(t)}
function openAccount(mode){dialog.value={type:'account',mode,title:({profile:'个人中心',password:'修改密码',preferences:'显示设置'})[mode]}}
function saved(text){dialog.value=null;message(typeof text==='string'?text:'已保存，关联页面与工作台已同步更新。')}
function confirmToggle(p){dialog.value={...p,type:'confirm'}}
function applyConfirmation(){try{const d=dialog.value;({station:api.setStationEnabled,device:api.setDeviceEnabled,user:api.setUserEnabled}[d.kind])(d.id,d.enabled);dialog.value=null;message('状态已更新，历史记录保留。')}catch(e){dialog.value.error=e.message}}
function handleEscape(e){if(e.key==='Escape')dialog.value=null}
function routeChanged(){if(account.user)currentPage.value=fromHash()}
function loggedIn(){navigate(account.returnTo||'dashboard')}
watch(()=>account.user,(user,old)=>{if(!user&&old){account.returnTo=currentPage.value;dialog.value=null;location.hash='/login'}else if(user&&!old&&location.hash==='/login'){navigate(account.returnTo||'dashboard')}})
onMounted(()=>{account.returnTo=currentPage.value;restoreAccount();document.addEventListener('keydown',handleEscape);window.addEventListener('hashchange',routeChanged);sessionTimer=setInterval(()=>{checkSession();refreshReadState()},30000)})
onBeforeUnmount(()=>{clearTimeout(toastTimer);clearInterval(sessionTimer);document.removeEventListener('keydown',handleEscape);window.removeEventListener('hashchange',routeChanged)})
</script>
<template>
 <div v-if="account.loading" class="auth-loading"><span class="auth-loading-spinner"></span><p>{{isStaticDemo?'正在载入公开演示…':'正在连接账号服务…'}}</p></div>
 <LoginPage v-else-if="!account.user" @success="loggedIn"/>
 <div v-else class="platform" :class="{'sidebar-collapsed':collapsed}">
  <aside class="sidebar"><a href="#/dashboard" class="brand" aria-label="电动自行车智慧充电管理系统首页" @click.prevent="navigate('dashboard')"><svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true"><path d="M17 2a14 14 0 1 0 0 28C8 24 8 13 17 2Z" fill="#615eff"/><path d="M21 6c9 5 12 15 5 22-3 3-8 3-12 0 6-1 8-6 5-10-4-5-5-8 2-12Z" fill="#4d58f1"/><path d="m18 9-5 9h6l-2 7 8-11h-7Z" fill="#dce6ff"/></svg><span class="brand-name">电动自行车<br/>智慧充电管理系统</span></a><nav class="navigation" aria-label="主导航"><div v-for="nav in navigation" :key="nav.id" class="nav-group"><button class="nav-item" :class="{active:nav.id===currentPage}" @click="navigate(nav.id)" :title="nav.label"><UiIcon :name="nav.icon"/><span>{{nav.label}}</span></button></div></nav><div class="sidebar-project-note" v-if="!collapsed"><strong>电动自行车智慧充电</strong><span>校园 · 医院 · 小区 · 园区 · 办公区</span><small>双插座设备 · 业务软件模拟</small></div></aside>
  <header class="topbar" :class="{'collapsed-topbar':collapsed}"><button class="icon-button fold-button" @click="collapsed=!collapsed" :aria-label="collapsed?'展开导航':'收起导航'"><UiIcon name="menu" size="1.5rem"/></button><div class="breadcrumbs"><span>电动自行车充电管理 / </span><strong>{{pageTitle}}</strong></div><TopbarTools @target="openTarget" @account="openAccount" @runtime="dialog={type:'runtime',title:'运行状态与说明'}" @message="message"/></header>
  <main class="main-content"><div class="tab-strip"><button class="active-tab"><i></i>{{pageTitle}}</button><span class="tab-mode-note">{{currentPage==='dashboard'?'运营概览':'基础业务管理'}} · 设备软件模拟</span></div><p v-if="storageWarning.message" class="storage-warning">{{storageWarning.message}}</p><DashboardPage v-if="currentPage==='dashboard'" @open-device="openDevice" @navigate="navigate" @message="message"/><OperationsPanel v-else-if="currentPage==='operations'" :source="db" :account-key="account.user.username" @device="openDevice" @order="openOrder"/><ManagePage v-else :key="currentPage" :page="currentPage" :station-scope="stationScope" @edit="edit" @device="openDevice" @order="openOrder" @confirm="confirmToggle" @navigate="navigate"/></main>
  <Transition name="toast"><div v-if="toast" role="status" class="toast-message" :class="{error:toastError}"><span>{{toastError?'!':'✓'}}</span>{{toast}}</div></Transition>
  <div v-if="dialog" class="modal-shade" @click.self="dialog=null"><section class="modal-card" :class="{'wide-modal':dialog.type==='device','editor-modal':dialog.type==='editor'}" role="dialog" aria-modal="true" :aria-label="dialog.title"><header><h2>{{dialog.title}}</h2><button class="icon-button" aria-label="关闭弹窗" @click="dialog=null"><UiIcon name="close" size="1.3rem"/></button></header><EntityEditor v-if="dialog.type==='editor'" :key="`${dialog.entityType}-${dialog.id}`" :type="dialog.entityType" :id="dialog.id" :station-id="dialog.stationId" :row-id="dialog.rowId" @done="saved" @cancel="dialog=null"/><SocketPanel v-else-if="dialog.type==='device'" :id="dialog.id" :focus-socket-id="dialog.focusSocketId" @order="openOrder" @message="message"/><OrderDetails v-else-if="dialog.type==='order'" :id="dialog.id" @message="message"/><AccountPanel v-else-if="dialog.type==='account'" :key="dialog.mode" :mode="dialog.mode" @done="saved" @close="dialog=null" @message="message"/><template v-else-if="dialog.type==='confirm'"><p class="dialog-copy">{{dialog.description}}</p><p v-if="dialog.error" class="form-error dialog-error" role="alert">{{dialog.error}}</p></template><template v-else><div class="runtime-status"><div><span>{{isStaticDemo?'演示模式':'账号服务'}}</span><strong :class="account.serverOnline?'online-label':'offline-label'">{{isStaticDemo?'GitHub Pages · 浏览器本地演示':account.serverOnline?'已连接 Spring Boot 服务':'连接暂不可用'}}</strong></div><div><span>当前账号</span><strong>{{account.user.username}} · {{account.user.displayName}}</strong></div><div><span>资料与显示设置</span><strong>{{isStaticDemo?'当前浏览器本地存储':'服务端文件数据库持久化'}}</strong></div><div><span>通知已读状态</span><strong>{{isStaticDemo?'保存在当前浏览器':'按登录账号保存'}}</strong></div><div><span>充电业务</span><strong>浏览器本地模拟数据</strong></div><div><span>设备与支付</span><strong>软件模拟，无实物控制或真实交易</strong></div></div><p class="dialog-copy">{{isStaticDemo?'本页为公开静态演示，无真实账号权限；资料、显示设置、通知和充电业务数据仅保存在当前浏览器，不连接账号服务，不发生真实支付。':'设备按“站点 → 多排设备 → 每台两个独立插座”组织。账号已接入会话校验；充电业务、MySQL 及 H5/小程序统一数据联调尚未完成。'}}</p><button v-if="!isStaticDemo" class="text-button runtime-recheck" @click="checkSession">重新检查账号连接</button><a class="source-link" :href="referenceUrl" target="_blank" rel="noopener noreferrer">首页视觉参考 ↗</a></template><footer v-if="!['editor','account'].includes(dialog.type)"><button v-if="dialog.type==='confirm'" class="outline-button" @click="dialog=null">取消</button><button class="soft-button active" @click="dialog.type==='confirm'?applyConfirmation():dialog=null">{{dialog.type==='confirm'?'确认':'关闭'}}</button></footer></section></div>
 </div>
</template>
