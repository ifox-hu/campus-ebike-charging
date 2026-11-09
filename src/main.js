import { createApp } from 'vue'
import './style.css'
import './management.css'
import './topbar.css'
async function bootstrap(){document.title=import.meta.env.MODE==='connected'?'非机动车充电管理平台 · 后端联调版':'非机动车充电管理平台 · 本地演示';const {default:App}=await (import.meta.env.MODE==='connected'?import('./connected/ConnectedApp.vue'):import('./App.vue'));createApp(App).mount('#app')}
bootstrap()
