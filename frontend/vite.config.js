import { defineConfig,loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'')
 const pages=mode==='pages'
 if(pages&&process.env.PAGES_REQUIRE_AMAP==='true'&&(!process.env.PAGES_AMAP_KEY?.trim()||!process.env.PAGES_AMAP_SECURITY_CODE?.trim())){
  throw new Error('在线地图发布需要配置 GitHub Secrets：AMAP_WEB_KEY 和 AMAP_SECURITY_CODE')
 }
 return {base:pages?(process.env.PAGES_BASE_PATH||'./'):'/',plugins:[vue()],define:{
  'import.meta.env.VITE_AMAP_KEY':JSON.stringify(pages?(process.env.PAGES_AMAP_KEY||''):(env.VITE_AMAP_KEY||'')),
  'import.meta.env.VITE_AMAP_SECURITY_CODE':JSON.stringify(pages?(process.env.PAGES_AMAP_SECURITY_CODE||''):(env.VITE_AMAP_SECURITY_CODE||''))
 },build:{outDir:pages?'dist-pages':mode==='connected'?'dist-connected':'dist'},server:{watch:{ignored:['**/e2e/artifacts/**']},proxy:pages?{}:{'/api':{target:mode==='connected'?(env.ADMIN_API_PROXY_TARGET||'http://127.0.0.1:8081'):'http://127.0.0.1:8092',changeOrigin:true}}}}
})
