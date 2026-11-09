import test from 'node:test'
import assert from 'node:assert/strict'
import {createStaticAccountRequest} from '../src/services/staticAccount.js'
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}}

test('static Pages opens a clearly identified demo profile without any server',async()=>{
 const request=createStaticAccountRequest({storage:memory()})
 const {data}=await request('/auth/me')
 assert.equal(data.username,'demo')
 assert.equal(data.displayName,'演示管理员')
 assert.equal(data.role,'ADMIN')
 await assert.rejects(()=>request('/account/password',{method:'POST',body:{currentPassword:'secret',newPassword:'secret2'}}),/公开演示/)
})

test('static preferences and read notices persist per browser and unknown endpoints fail',async()=>{
 const storage=memory(),request=createStaticAccountRequest({storage})
 await request('/account/preferences',{method:'PUT',body:{fontSize:'large',density:'compact'}})
 await request('/notifications/read-state',{method:'POST',body:{keys:['notice-a','notice-a','notice-b']}})
 const restored=createStaticAccountRequest({storage})
 assert.deepEqual((await restored('/auth/me')).data.preferences,{fontSize:'large',density:'compact'})
 assert.deepEqual((await restored('/notifications/read-state')).data,['notice-a','notice-b'])
 await assert.rejects(()=>request('/account/preferences',{method:'PUT',body:{fontSize:'bad',density:'compact'}}),/显示设置/)
 await assert.rejects(()=>request('/unknown'),/不支持/)
})
