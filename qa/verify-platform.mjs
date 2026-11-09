// Only targets the disposable QA fixture, never the normal 8081 database.
import assert from 'node:assert/strict'
import {createPlatformClient} from '../src/connected/platformClient.js'
const base='http://127.0.0.1:18082'
const client=createPlatformClient({fetchImpl:(path,options)=>fetch(base+path,options)})
const profile=await client.login('admin_qa','admin-qa-password')
assert.equal(profile.role,'ADMIN')
const stations=await client.stations(),devices=await client.devices(),sockets=await client.sockets(),orders=await client.orders()
assert.equal(stations[0].name,'校园接口验收站');assert.equal(devices.length,1);assert.equal(sockets.length,2)
const completed=orders.find(o=>o.orderNo==='QA-COMPLETED');assert.ok(completed);assert.equal(Number(completed.totalAmount),.36);assert.equal(Number(completed.energyKwh),.45)
const rates=await client.rates(stations[0].id);assert.equal(Number(rates[0].electricityPrice),.6)
const users=await client.users();const target=users.rows.find(u=>u.username==='other_qa');assert.ok(target?.enabled)
try{
 await client.setUserEnabled(target.id,false)
 assert.equal((await client.users()).rows.find(u=>u.id===target.id).enabled,false)
 const attempt=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'other_qa',password:'other-qa-password'})});assert.equal(attempt.status,401)
}finally{await client.setUserEnabled(target.id,true)}
assert.equal((await client.users()).rows.find(u=>u.id===target.id).enabled,true)
const audit=await client.audit();assert.ok(audit.rows.some(a=>a.path===`/api/auth/users/${target.id}/status`&&a.statusCode===200))
const ordinary=createPlatformClient({fetchImpl:(p,o)=>fetch(base+p,o)});await assert.rejects(()=>ordinary.login('mobile_qa','mobile-qa-password'),/管理员/)
client.logout();await assert.rejects(()=>client.orders(),/登录/)
console.log(JSON.stringify({result:'passed',storage:'isolated-H2-memory',stations:stations.length,devices:devices.length,sockets:sockets.length,orders:orders.length,amount:.36,disabledLoginRejected:true,userRestored:true,auditRecorded:true,ordinaryRoleRejected:true,logoutCleared:true}))
