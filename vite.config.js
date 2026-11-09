import { defineConfig,loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig(({mode})=>{const env=loadEnv(mode,process.cwd(),'');return {plugins:[vue()],build:{outDir:mode==='connected'?'dist-connected':'dist'},server:{proxy:{'/api':{target:mode==='connected'?(env.ADMIN_API_PROXY_TARGET||'http://127.0.0.1:8081'):'http://127.0.0.1:8092',changeOrigin:true}}}}})
