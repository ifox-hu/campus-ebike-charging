import { createApp } from 'vue'
import {useBusinessBackend,isLocalBusinessEntry} from './runtime.js'
import './style.css'
import './management.css'
import './topbar.css'
async function bootstrap(){
 document.title=isLocalBusinessEntry?'电动自行车智慧充电 · 本机业务入口':useBusinessBackend?'电动自行车智慧充电管理系统 · 统一业务版':'电动自行车智慧充电管理系统 · 本地演示'
 const {default:App}=await (isLocalBusinessEntry?import('./LocalBusinessEntry.vue'):useBusinessBackend?import('./connected/ConnectedApp.vue'):import('./App.vue'))
 createApp(App).mount('#app')
}
bootstrap()
