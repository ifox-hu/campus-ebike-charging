import { defineConfig,loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'')
 const pages=mode==='pages'
 return {base:pages?(process.env.PAGES_BASE_PATH||'./'):'/',plugins:[vue()],define:{
  'import.meta.env.VITE_AMAP_KEY':JSON.stringify(pages?(process.env.PAGES_AMAP_KEY||''):(env.VITE_AMAP_KEY||'')),
  'import.meta.env.VITE_AMAP_SECURITY_CODE':JSON.stringify(pages?(process.env.PAGES_AMAP_SECURITY_CODE||''):(env.VITE_AMAP_SECURITY_CODE||''))
 },build:{outDir:pages?'dist-pages':mode==='connected'?'dist-connected':'dist'},server:{proxy:pages?{}:{'/api':{target:mode==='connected'?(env.ADMIN_API_PROXY_TARGET||'http://127.0.0.1:8081'):'http://127.0.0.1:8092',changeOrigin:true}}}}
})
