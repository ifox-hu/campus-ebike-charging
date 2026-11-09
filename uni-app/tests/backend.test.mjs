import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient, ApiError } from '../src/api/client.mjs';
import { mapCatalog, mapOrder, resolveBackendSocket } from '../src/api/mapping.mjs';
import { createCustomerStore } from '../src/api/customer-store.mjs';
import { orderStatusText, matchesOrderFilter } from '../src/domain/order-status.mjs';
import {availableCount,energy,yuan} from '../src/domain/charging.mjs';

const rawStations=[{id:7,name:'校园测试站',address:'东区',status:'OPERATING'}];
const rawChargers=[{id:20,stationId:7,code:'BIKE-A',name:'一号设备',status:'ONLINE'}];
const rawSockets=[{id:31,chargerId:20,code:'BIKE-A-01',status:'IDLE'},{id:32,chargerId:20,code:'BIKE-A-02',status:'UNRECOGNIZED'}];
const rawOrder={id:90,orderNo:'CO-90',stationId:7,connectorId:31,status:'COMPLETED',paymentStatus:'UNPAID',startTime:'2026-11-09T10:00:00',endTime:'2026-11-09T11:30:00',energyKwh:'0.450',electricityFee:'0.27',serviceFee:'0.09',totalAmount:'0.36'};
const catalog=()=>mapCatalog(rawStations,rawChargers,rawSockets);
function setup(overrides={}) {
  const state={stations:[],orders:[],reports:[]};
  const connection={user:null,loading:false,authenticating:false,error:'',operation:''};
  const session={token:'test-token',expiresAt:999999};const saved=[];
  const api={me:async()=>({username:'student',displayName:'测试用户',role:'USER'}),stations:async()=>rawStations,chargers:async()=>rawChargers,connectors:async()=>rawSockets,orders:async()=>[rawOrder],order:async()=>rawOrder,login:async()=>({token:'new-token',expiresIn:7200}),pay:async()=>({...rawOrder,paymentStatus:'PAID'}),...overrides};
  const service=createCustomerStore({api,state,connection,session,saveSession:s=>saved.push(s),now:()=>1000});
  return {state,connection,session,service,saved};
}
test('request client sends bearer token and the actual customer payment contract', async()=>{
  const calls=[];
  const api=createApiClient({baseUrl:'https://local.test/api/',getToken:()=>'token',request:options=>{calls.push(options);options.success({statusCode:200,data:{code:200,data:{id:90}}});}});
  await api.pay(90);
  assert.equal(calls[0].url,'https://local.test/api/customer/orders/90/mock-payment');
  assert.equal(calls[0].header.Authorization,'Bearer token');
  assert.deepEqual(calls[0].data,{method:'WECHAT'});
});
test('401 expires only authenticated requests; login failures keep the server explanation',async()=>{
  const expired=[];
  const api=createApiClient({baseUrl:'/api',getToken:()=>'old',onUnauthorized:token=>expired.push(token),request:o=>o.success({statusCode:401,data:{code:401,message:'账号或密码错误',data:null}})});
  await assert.rejects(api.login({}),/账号或密码错误/);assert.deepEqual(expired,[]);
  await assert.rejects(api.orders(),/重新登录/);assert.deepEqual(expired,['old']);
});
test('network mutations are not retried and do not claim a confirmed failure',async()=>{
  let calls=0;
  const api=createApiClient({baseUrl:'/api',getToken:()=>'token',request:o=>{calls++;o.fail({errMsg:'timeout'});}});
  await assert.rejects(api.pay(90),e=>e instanceof ApiError&&e.kind==='network'&&/尚未确认/.test(e.message));
  assert.equal(calls,1);
});
test('HTTP success with invalid envelopes is rejected instead of accepted as empty data',async()=>{
  const api=createApiClient({baseUrl:'/api',getToken:()=>'token',request:o=>o.success({statusCode:200,data:{code:200}})});
  await assert.rejects(api.orders(),/数据格式/);
});
test('catalog uses server IDs and arbitrary socket codes; unknown status stays unavailable',()=>{
  const stations=catalog();assert.equal(stations[0].devices[0].sockets[1].status,'unknown');
  assert.equal(resolveBackendSocket(stations,'https://example.test/?socket=BIKE-A-01').socket.id,'31');
  assert.throws(()=>resolveBackendSocket(stations,'14500006-01'),/未找到/);
  assert.equal(stations[0].rates,null);
});

test('disabled stations and devices do not count as available; missing amounts display as unknown',()=>{
  const stations=catalog();assert.equal(availableCount(stations[0]),1);
  stations[0].enabled=false;assert.equal(availableCount(stations[0]),0);
  stations[0].enabled=true;stations[0].devices[0].enabled=false;assert.equal(availableCount(stations[0]),0);
  assert.equal(yuan(null),'—');assert.equal(energy(null),'—');assert.equal(yuan(0),'0.00');
});
test('ambiguous socket codes cannot select the wrong resource',()=>{
  const stations=catalog();stations[0].devices[0].sockets.push({...stations[0].devices[0].sockets[0],id:'99'});
  assert.throws(()=>resolveBackendSocket(stations,'BIKE-A-01'),/不唯一/);
});
test('server money and energy units are mapped without inventing historical rates',()=>{
  const order=mapOrder(rawOrder,catalog());
  assert.equal(order.energyWh,450);assert.equal(order.totalCents,36);assert.equal(order.minutes,90);
  assert.equal(order.rates,null);assert.equal(order.status,'ended');assert.equal(order.payment,'unpaid');
  const absent=mapOrder({...rawOrder,totalAmount:null,energyKwh:null},catalog());
  assert.equal(absent.totalCents,null);assert.equal(absent.energyWh,null);
});
test('starting, failed and unknown orders cannot be shown as completed or payable',()=>{
  for(const status of ['starting','failed','unknown']) {
    const order={status,payment:'unpaid'};
    assert.equal(matchesOrderFilter(order,'unpaid'),false);assert.equal(matchesOrderFilter(order,'ended'),false);
  }
  assert.equal(orderStatusText({status:'failed',payment:'unpaid'}),'启动失败');
  assert.equal(orderStatusText({status:'ended',payment:'unknown'}),'支付状态待确认');
});
test('refresh commits a complete server snapshot and clears local demo history',async()=>{
  const {service,state}=setup();state.reports=[{id:'local-demo'}];
  assert.equal(await service.refresh(),true);
  assert.equal(state.stations[0].id,'7');assert.equal(state.orders[0].id,'90');assert.deepEqual(state.reports,[]);
});
test('logout discards late responses and clears private data',async()=>{
  let resolveOrders;
  const pending=new Promise(resolve=>{resolveOrders=resolve;});
  const {service,state,session}=setup({orders:()=>pending});
  const refresh=service.refresh();await Promise.resolve();service.clear();resolveOrders([rawOrder]);await refresh;
  assert.equal(session.token,null);assert.deepEqual(state.orders,[]);assert.deepEqual(state.stations,[]);
});
test('partial refresh failure keeps the last complete same-user snapshot',async()=>{
  const {service,state,connection}=setup({connectors:async()=>{throw new Error('设备获取失败');}});
  state.stations=[{id:'previous'}];await service.refresh();
  assert.deepEqual(state.stations,[{id:'previous'}]);assert.equal(connection.error,'设备获取失败');
});
test('administrator login is rejected by the customer frontend',async()=>{
  const {service,session,connection}=setup({me:async()=>({role:'ADMIN'})});
  assert.equal(await service.authenticate({username:'admin',password:'not-saved'}),false);
  assert.equal(session.token,null);assert.match(connection.error,/普通用户/);
});
test('failed stop keeps the order charging and a duplicate pending mutation is blocked',async()=>{
  let rejectStop;let calls=0;
  const {service,state,connection}=setup({stop:()=>{calls++;return new Promise((_,reject)=>{rejectStop=reject;});}});
  state.stations=catalog();state.orders=[mapOrder({...rawOrder,status:'CHARGING'},state.stations)];
  const first=service.operate('90','stop');assert.equal(await service.operate('90','stop'),null);
  rejectStop(new Error('模拟桩未启用'));await first;
  assert.equal(calls,1);assert.equal(state.orders[0].status,'charging');assert.equal(connection.operation,'');assert.match(connection.operationError,/未启用/);
});

test('an older poll cannot overwrite a confirmed payment result',async()=>{
  let resolveOrder;
  const {service,state}=setup({order:()=>new Promise(resolve=>{resolveOrder=resolve;})});
  state.stations=catalog();state.orders=[mapOrder(rawOrder,state.stations)];
  const stalePoll=service.order('90');
  await service.operate('90','pay');
  resolveOrder(rawOrder);await stalePoll;
  assert.equal(state.orders[0].payment,'paid');
});
test('mutations cannot race a full refresh and polling does not erase a stop error',async()=>{
  let resolveOrders;let writes=0;
  const pending=new Promise(resolve=>{resolveOrders=resolve;});
  const {service,connection}=setup({orders:()=>pending,pay:async()=>{writes++;return rawOrder;},stop:async()=>{throw new Error('结算暂不可用');}});
  const refreshing=service.refresh();await Promise.resolve();
  assert.equal(await service.operate('90','pay'),null);assert.equal(writes,0);
  resolveOrders([rawOrder]);await refreshing;
  await service.operate('90','stop');await service.order('90');
  assert.equal(connection.operationError,'结算暂不可用');
});

test('customer start sends only resource IDs and refuses an older backend without features',async()=>{
  let payload,calls=0;
  const x=setup({start:async data=>{payload=data;calls++;return {...rawOrder,status:'CHARGING'};}});
  x.state.stations=catalog();x.connection.user={role:'USER'};
  assert.equal(await x.service.start('7','31'),null);assert.equal(calls,0);
  x.connection.user.features={bikeCharging:true};
  assert.equal((await x.service.start('7','31')).status,'charging');
  assert.deepEqual(payload,{stationId:'7',connectorId:'31'});
});
test('uncertain start reconciles by reading instead of sending another POST',async()=>{
  let writes=0;
  const x=setup({start:async()=>{writes++;throw new ApiError('结果未确认',0,'network');},orders:async()=>[{...rawOrder,status:'CHARGING'}]});
  x.state.stations=catalog();x.connection.user={role:'USER',features:{bikeCharging:true}};
  assert.equal((await x.service.start('7','31')).id,'90');assert.equal(writes,1);
});
test('repair results come from the server and keep the request key',async()=>{
  let body;
  const x=setup({report:async data=>{body=data;return {id:8,socketCode:'BIKE-A-01',description:data.description,status:'OPEN',createdAt:'2026-11-09T10:00:00'};}});
  x.connection.user={role:'USER',features:{repairs:true}};
  const result=await x.service.report({connectorId:'31',description:'插座指示灯不亮',requestKey:'same-key'});
  assert.equal(result.status,'pending');assert.equal(body.requestKey,'same-key');assert.equal(x.state.reports.length,1);
});
test('order display preserves startup names and rate snapshots after station changes',()=>{
  const order=mapOrder({...rawOrder,stationNameSnapshot:'启动时站名',socketCodeSnapshot:'OLD-CODE',elapsedSeconds:5400,priceSnapshot:'[{"startTime":"00:00","endTime":"23:59:59","electricityPrice":0.6,"servicePrice":0.2}]'},catalog());
  assert.equal(order.stationName,'启动时站名');assert.equal(order.socketCode,'OLD-CODE');assert.equal(order.ratePeriods[0].electricityPrice,0.6);assert.equal(order.minutes,90);
});
