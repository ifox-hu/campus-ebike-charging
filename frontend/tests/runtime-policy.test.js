import test from 'node:test'
import assert from 'node:assert/strict'
import {resolveRuntime} from '../src/runtime-policy.js'
import config from '../vite.config.js'

test('5207 保留原管理端及其完整站点目录',()=>{
 for(const hostname of ['127.0.0.1','localhost','[::1]']){
  assert.deepEqual(resolveRuntime('pages',hostname),{business:false,localEntry:false})
 }
 assert.deepEqual(resolveRuntime('connected','127.0.0.1'),{business:true,localEntry:false})
})

test('GitHub Pages 保留原管理端，不替换为入口页',()=>{
 assert.deepEqual(resolveRuntime('pages','ifox-hu.github.io'),{business:false,localEntry:false})
 assert.deepEqual(resolveRuntime('pages','127.0.0.1.evil.test'),{business:false,localEntry:false})
 assert.deepEqual(resolveRuntime('development','127.0.0.1'),{business:false,localEntry:false})
})

test('本地 5207 开发与构建预览均代理统一 8081 API',()=>{
 const result=config({mode:'pages',command:'serve'})
 assert.equal(result.server.proxy['/api'].target,'http://127.0.0.1:8081')
 assert.equal(result.preview.proxy['/api'].target,'http://127.0.0.1:8081')
})
