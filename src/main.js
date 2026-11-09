import { createApp } from 'vue'
import {isStaticDemo} from './runtime.js'
import './style.css'
import './management.css'
import './topbar.css'
async function bootstrap(){document.title=isStaticDemo?'校园非机动车充电平台 · 公开演示':import.meta.env.MODE==='connected'?'非机动车充电管理平台 · 后端联调版':'非机动车充电管理平台 · 本地演示';const {default:App}=await (import.meta.env.MODE==='connected'?import('./connected/ConnectedApp.vue'):import('./App.vue'));createApp(App).mount('#app')}
bootstrap()
