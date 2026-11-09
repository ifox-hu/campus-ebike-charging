import { defineConfig,loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import {fileURLToPath} from 'node:url'
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'')
 const pages=mode==='pages'
 // The original demo already holds local frontend map credentials. Prefer this
 // app's own env when present; reuse only those two browser map settings.
 const legacy=loadEnv(mode,fileURLToPath(new URL('../ev-charging-platform/frontend/',import.meta.url)),'VITE_AMAP_')
 return {base:pages?(process.env.PAGES_BASE_PATH||'./'):'/',plugins:[vue()],define:{
  'import.meta.env.VITE_AMAP_KEY':JSON.stringify(pages?(process.env.PAGES_AMAP_KEY||''):(env.VITE_AMAP_KEY||legacy.VITE_AMAP_KEY||'')),
  'import.meta.env.VITE_AMAP_SECURITY_CODE':JSON.stringify(pages?(process.env.PAGES_AMAP_SECURITY_CODE||''):(env.VITE_AMAP_SECURITY_CODE||legacy.VITE_AMAP_SECURITY_CODE||''))
 },build:{outDir:pages?'dist-pages':mode==='connected'?'dist-connected':'dist'},server:{proxy:pages?{}:{'/api':{target:mode==='connected'?(env.ADMIN_API_PROXY_TARGET||'http://127.0.0.1:8081'):'http://127.0.0.1:8092',changeOrigin:true}}}}
})
