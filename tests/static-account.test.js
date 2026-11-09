import test from 'node:test'
import assert from 'node:assert/strict'
import {createStaticAccountRequest} from '../src/services/staticAccount.js'
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),dump:()=>JSON.stringify([...data])}}
const login=request=>request('/auth/login',{method:'POST',body:{username:'demo',password:'Demo@123456'}})

test('static Pages requires explicit demo login and rejects incorrect credentials',async()=>{
 const request=createStaticAccountRequest({storage:memory(),sessionStorage:memory()})
 await assert.rejects(()=>request('/auth/me'),e=>e.status===401)
 await assert.rejects(()=>request('/account/preferences',{method:'PUT',body:{fontSize:'large',density:'compact'}}),e=>e.status===401)
 await assert.rejects(()=>request('/auth/login',{method:'POST',body:{username:'demo',password:'wrong'}}),/演示账号或密码不正确/)
 await assert.rejects(()=>request('/auth/login',{method:'POST',body:{username:'someone',password:'Demo@123456'}}),/演示账号或密码不正确/)
 const {data}=await login(request)
 assert.equal(data.username,'demo');assert.equal(data.displayName,'演示管理员');assert.equal(data.role,'ADMIN')
 await assert.rejects(()=>request('/account/password',{method:'POST',body:{currentPassword:'secret',newPassword:'secret2'}}),/公开演示/)
})

test('static demo session survives refresh, logout survives refresh and no password is persisted',async()=>{
 const storage=memory(),sessionStorage=memory(),request=createStaticAccountRequest({storage,sessionStorage})
 await login(request)
 await request('/account/profile',{method:'PUT',body:{displayName:'校园演示管理员'}})
 const restored=createStaticAccountRequest({storage,sessionStorage})
 assert.equal((await restored('/auth/me')).data.displayName,'校园演示管理员')
 await restored('/auth/logout',{method:'POST'})
 await assert.rejects(()=>createStaticAccountRequest({storage,sessionStorage})('/auth/me'),e=>e.status===401)
 await login(restored)
 assert.equal((await restored('/auth/me')).data.displayName,'校园演示管理员')
 assert.doesNotMatch(storage.dump()+sessionStorage.dump(),/Demo@123456|password/)
})

test('static preferences and read notices persist per browser and unknown endpoints fail',async()=>{
 const storage=memory(),sessionStorage=memory(),request=createStaticAccountRequest({storage,sessionStorage});await login(request)
 await request('/account/preferences',{method:'PUT',body:{fontSize:'large',density:'compact'}})
 await request('/notifications/read-state',{method:'POST',body:{keys:['notice-a','notice-a','notice-b']}})
 const restored=createStaticAccountRequest({storage,sessionStorage})
 assert.deepEqual((await restored('/auth/me')).data.preferences,{fontSize:'large',density:'compact'})
 assert.deepEqual((await restored('/notifications/read-state')).data,['notice-a','notice-b'])
 await assert.rejects(()=>request('/account/preferences',{method:'PUT',body:{fontSize:'bad',density:'compact'}}),/显示设置/)
 await assert.rejects(()=>request('/unknown'),/不支持/)
})
