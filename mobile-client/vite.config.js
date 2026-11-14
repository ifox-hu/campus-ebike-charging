import { defineConfig,loadEnv } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'');
  return {plugins:[uni()],server:{host:'127.0.0.1',port:Number(env.MOBILE_DEV_PORT||5197),strictPort:true,
    ...(env.VITE_API_BASE_URL==='/api'?{proxy:{'/api':{target:env.MOBILE_API_PROXY_TARGET||'http://127.0.0.1:8081',changeOrigin:true}}}:{})
  }};
});
