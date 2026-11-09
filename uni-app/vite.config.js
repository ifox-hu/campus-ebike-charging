import { defineConfig,loadEnv } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import {amapProxyOptions} from './config/amap-proxy.mjs';
export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'');
  const proxy={...amapProxyOptions(env.AMAP_SECURITY_JSCODE),...(env.VITE_API_BASE_URL==='/api'?{'/api':{target:env.MOBILE_API_PROXY_TARGET||'http://127.0.0.1:8081',changeOrigin:true}}:{})};
  return {plugins:[uni()],server:{host:'127.0.0.1',port:Number(env.MOBILE_DEV_PORT||5197),strictPort:true,
    proxy
  },preview:{host:'127.0.0.1',proxy}};
});
