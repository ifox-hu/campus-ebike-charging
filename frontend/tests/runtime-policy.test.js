import test from 'node:test'
import assert from 'node:assert/strict'
import {resolveRuntime} from '../src/runtime-policy.js'
import config from '../vite.config.js'

test('5207 本机 Pages 模式使用统一业务界面，不读取静态演示缓存',()=>{
 for(const hostname of ['127.0.0.1','localhost','[::1]']){
  assert.deepEqual(resolveRuntime('pages',hostname),{business:true,localEntry:false})
 }
 assert.deepEqual(resolveRuntime('connected','127.0.0.1'),{business:true,localEntry:false})
})

test('GitHub Pages 只提供本机入口，不把访问者的电脑当成已连接后端',()=>{
 assert.deepEqual(resolveRuntime('pages','ifox-hu.github.io'),{business:false,localEntry:true})
 assert.deepEqual(resolveRuntime('pages','127.0.0.1.evil.test'),{business:false,localEntry:true})
 assert.deepEqual(resolveRuntime('development','127.0.0.1'),{business:false,localEntry:false})
})

test('本地 5207 开发与构建预览均代理统一 8081 API',()=>{
 const result=config({mode:'pages',command:'serve'})
 assert.equal(result.server.proxy['/api'].target,'http://127.0.0.1:8081')
 assert.equal(result.preview.proxy['/api'].target,'http://127.0.0.1:8081')
})
