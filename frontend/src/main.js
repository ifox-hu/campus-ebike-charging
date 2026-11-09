import { createApp } from 'vue'
import {isStaticDemo} from './runtime.js'
import './style.css'
import './management.css'
import './topbar.css'
async function bootstrap(){document.title=isStaticDemo?'电动自行车智能充电管理系统 · 公开演示':import.meta.env.MODE==='connected'?'电动自行车智能充电管理系统 · 后端联调版':'电动自行车智能充电管理系统 · 本地演示';const {default:App}=await (import.meta.env.MODE==='connected'?import('./connected/ConnectedApp.vue'):import('./App.vue'));createApp(App).mount('#app')}
bootstrap()
