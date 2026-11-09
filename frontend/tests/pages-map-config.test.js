import test from 'node:test'
import assert from 'node:assert/strict'
import config from '../vite.config.js'

function setEnv(t,name,value){
 const previous=process.env[name]
 process.env[name]=value
 t.after(()=>{if(previous===undefined)delete process.env[name];else process.env[name]=previous})
}

test('要求真实地图的在线发布缺少 Key 或安全码时必须失败',t=>{
 setEnv(t,'PAGES_REQUIRE_AMAP','true')
 setEnv(t,'PAGES_AMAP_KEY','')
 setEnv(t,'PAGES_AMAP_SECURITY_CODE','')
 assert.throws(()=>config({mode:'pages'}),/AMAP_WEB_KEY.*AMAP_SECURITY_CODE/)
 setEnv(t,'PAGES_AMAP_KEY','test-web-key')
 assert.throws(()=>config({mode:'pages'}),/AMAP_WEB_KEY.*AMAP_SECURITY_CODE/)
 setEnv(t,'PAGES_AMAP_SECURITY_CODE','test-security-code')
 assert.doesNotThrow(()=>config({mode:'pages'}))
})

test('未要求真实地图的本地静态预览仍可使用坐标示意',t=>{
 setEnv(t,'PAGES_REQUIRE_AMAP','false')
 setEnv(t,'PAGES_AMAP_KEY','')
 setEnv(t,'PAGES_AMAP_SECURITY_CODE','')
 assert.doesNotThrow(()=>config({mode:'pages'}))
})
