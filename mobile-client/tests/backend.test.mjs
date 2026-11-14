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

test('FULL start sends mode and selected channel without a false timed duration',async()=>{
  let payload;
  const x=setup({start:async data=>{payload=data;return {...rawOrder,status:'CHARGING',chargeMode:'FULL',paymentMethod:'WECHAT'};}});
  x.connection.user={features:{bikeCharging:true}};
  const order=await x.service.start('7','31',null,'FULL','wechat');
  assert.deepEqual(payload,{stationId:'7',connectorId:'31',chargeMode:'FULL',paymentMethod:'WECHAT'});
  assert.equal(order.chargeMode,'FULL');
});

test('mock payment sends selected channel to the backend without a client amount',async()=>{
  let call;
  const api=createApiClient({baseUrl:'/api',getToken:()=>'token',request:o=>{call=o;o.success({statusCode:200,data:{code:200,data:rawOrder}});}});
  assert.equal(typeof api.mockPay,'function');
  await api.mockPay(90,'WECHAT');
  assert.equal(call.url,'/api/customer/orders/90/mock-payment');
  assert.deepEqual(call.data,{method:'WECHAT'});assert.equal(call.header.Authorization,'Bearer token');
});

test('mock payment updates state only after server confirmation and blocks duplicate requests',async()=>{
  let finish,calls=0;
  const x=setup({mockPay:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}});
  x.state.orders=[mapOrder(rawOrder,[])];
  assert.equal(typeof x.service.mockPay,'function');
  const pending=x.service.mockPay(90,'wechat');
  assert.equal(x.state.orders[0].payment,'unpaid');
  assert.equal(await x.service.mockPay(90,'alipay'),null);assert.equal(calls,1);
  finish({...rawOrder,paymentStatus:'PAID',paymentMethod:'WECHAT',paymentNo:'MOCK-test'});
  const result=await pending;
  assert.equal(result.payment,'paid');assert.equal(result.paymentEnvironment,'MOCK');
});

test('logout discards a pending simulated payment and network uncertainty leaves the bill unpaid',async()=>{
  let finish;
  const x=setup({mockPay:()=>new Promise(resolve=>{finish=resolve;})});
  x.state.orders=[mapOrder(rawOrder,[])];
  const pending=x.service.mockPay(90,'alipay');x.service.clear();
  finish({...rawOrder,paymentStatus:'PAID',paymentNo:'MOCK-late'});
  assert.equal(await pending,null);assert.deepEqual(x.state.orders,[]);
  const y=setup({mockPay:async()=>{throw new ApiError('请求结果尚未确认',0,'network');}});
  y.state.orders=[mapOrder(rawOrder,[])];
  assert.equal(await y.service.mockPay(90,'wechat'),null);
  assert.equal(y.state.orders[0].payment,'unpaid');assert.match(y.connection.operationError,/尚未确认/);
});
test('socket watts and station changes come from latest server catalog',()=>{
  const result=mapCatalog([{...rawStations[0],name:'更新后的站点'}],rawChargers,[{...rawSockets[0],powerWatts:450,ratedPower:120}]);
  assert.equal(result[0].name,'更新后的站点');
  assert.equal(result[0].devices[0].sockets[0].powerWatts,450);
});
test('order maps selected duration and server deadline without inventing legacy values',()=>{
  const result=mapOrder({...rawOrder,durationMinutes:120,scheduledEndTime:'2026-11-09T12:00:00',powerWatts:450},catalog());
  assert.equal(result.durationMinutes,120);assert.equal(result.powerWatts,450);
  assert.equal(result.scheduledEndTimeText,'2026-11-09T12:00:00');
  assert.equal(mapOrder(rawOrder,catalog()).durationMinutes,null);
});
function setup(overrides={}) {
  const state={stations:[],orders:[],reports:[]};
  const connection={user:null,loading:false,authenticating:false,error:'',operation:''};
  const session={token:'test-token',expiresAt:999999};const saved=[];
  const api={me:async()=>({username:'student',displayName:'测试用户',role:'USER'}),stations:async()=>rawStations,chargers:async()=>rawChargers,connectors:async()=>rawSockets,orders:async()=>[rawOrder],order:async()=>rawOrder,login:async()=>({token:'new-token',expiresIn:7200}),pay:async()=>({...rawOrder,paymentStatus:'PAID'}),...overrides};
  const service=createCustomerStore({api,state,connection,session,saveSession:s=>saved.push(s),now:()=>1000});
  return {state,connection,session,service,saved};
}

test('refresh failure labels retained data as stale and success/logout clear that label',async()=>{
 let fail=false;
 const x=setup({stations:async()=>{if(fail)throw new Error('断网');return rawStations;}});
 await x.service.refresh();assert.equal(x.connection.lastSyncedAt,1000);
 fail=true;await x.service.refresh();assert.equal(x.connection.stale,true);assert.equal(x.state.stations.length,1);
 fail=false;await x.service.refresh();assert.equal(x.connection.stale,false);
 x.service.clear();assert.equal(x.connection.lastSyncedAt,null);assert.equal(x.connection.stale,false);
});
test('request client sends bearer token and the actual customer payment contract', async()=>{
  const calls=[];
  const api=createApiClient({baseUrl:'https://local.test/api/',getToken:()=>'token',request:options=>{calls.push(options);options.success({statusCode:200,data:{code:200,data:{id:90}}});}});
  await api.pay(90);
  assert.equal(calls[0].url,'https://local.test/api/customer/orders/90/alipay-sandbox/query');
  assert.equal(calls[0].header.Authorization,'Bearer token');
  assert.equal(calls[0].data,undefined);
});
test('401 expires only authenticated requests; login failures keep the server explanation',async()=>{
  const expired=[];
  const api=createApiClient({baseUrl:'/api',getToken:()=>'old',onUnauthorized:token=>expired.push(token),request:o=>o.success({statusCode:401,data:{code:401,message:'账号或密码错误',data:null}})});
  await assert.rejects(api.login({}),/账号或密码错误/);assert.deepEqual(expired,[]);
  await assert.rejects(api.orders(),/重新登录/);assert.deepEqual(expired,['old']);
});

test('sandbox checkout never marks an order paid and blocks concurrent mutations',async()=>{
  let finish;
  const {service,state,connection}=setup({checkout:()=>new Promise(resolve=>{finish=resolve;})});
  state.orders=[mapOrder(rawOrder,[])];
  const pending=service.checkout(90);
  assert.equal(connection.operation,'checkout');
  assert.equal(await service.operate(90,'pay'),null);
  finish({checkoutUrl:'https://openapi-sandbox.dl.alipaydev.com/gateway.do?sign=test',environment:'ALIPAY_SANDBOX'});
  assert.ok(await pending);assert.equal(state.orders[0].payment,'unpaid');
  assert.equal(connection.operation,'');
});

test('sandbox checkout discards a response after logout and rejects unexpected gateways',async()=>{
  let finish;
  const first=setup({checkout:()=>new Promise(resolve=>{finish=resolve;})});
  const pending=first.service.checkout(90);first.service.clear();
  finish({checkoutUrl:'https://openapi-sandbox.dl.alipaydev.com/gateway.do?sign=test',environment:'ALIPAY_SANDBOX'});
  assert.equal(await pending,null);
  for(const checkoutUrl of ['https://openapi.alipay.com/gateway.do?sign=x','https://evil.example/gateway.do?sign=x','javascript:alert(1)']){
    const next=setup({checkout:async()=>({checkoutUrl,environment:'ALIPAY_SANDBOX'})});
    assert.equal(await next.service.checkout(90),null);assert.match(next.connection.operationError,/地址无效/);
  }
});

test('sandbox checkout sends only the owned order ID and no client-calculated price',async()=>{
  const calls=[];
  const api=createApiClient({baseUrl:'/api',getToken:()=>'token',request:o=>{calls.push(o);o.success({statusCode:200,data:{code:200,data:{}}});}});
  await api.checkout(90);
  assert.equal(calls[0].url,'/api/customer/orders/90/alipay-sandbox/checkout');
  assert.equal(calls[0].method,'POST');assert.equal(calls[0].data,undefined);
});
test('mini checkout sends auth code only, with owned resource ID and bearer token',async()=>{
  let call;
  const api=createApiClient({baseUrl:'/api',getToken:()=>'token',request:o=>{call=o;o.success({statusCode:200,data:{code:200,data:{}}});}});
  await api.miniCheckout(90,'once');
  assert.equal(call.url,'/api/customer/orders/90/alipay-sandbox/mini-checkout');
  assert.deepEqual(call.data,{authCode:'once'});assert.equal(call.header.Authorization,'Bearer token');
});
test('mini cashier locks mutations until backend query and survives returning to page',async()=>{
  let finish;
  const x=setup({miniCheckout:async()=>({tradeNo:'202611120000123456',environment:'ALIPAY_MINI_SANDBOX'})});
  x.state.orders=[mapOrder(rawOrder,[])];
  const native={getAuthCode:o=>o.success({authCode:'once'}),tradePay:o=>{finish=()=>o.success({resultCode:'9000'});}};
  const pending=x.service.payMini(90,native);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(x.connection.operation,'checkout');
  assert.equal(await x.service.refresh(),false);assert.equal(await x.service.operate(90,'pay'),null);
  assert.equal(x.state.orders[0].payment,'unpaid');
  finish();assert.equal((await pending).payment,'paid');assert.equal(x.connection.operation,'');
});
test('logout during mini authorization cannot create a payment for the next user',async()=>{
  let authorize,calls=0;
  const x=setup({miniCheckout:async()=>{calls++;}});
  const pending=x.service.payMini(90,{getAuthCode:o=>{authorize=o.success;},tradePay:()=>assert.fail('stale payment launched')});
  x.service.clear();authorize({authCode:'once'});
  assert.equal(await pending,null);assert.equal(calls,0);
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

test('selected charging minutes are sent to the server without client price or power',async()=>{
  let payload;
  const x=setup({start:async data=>{payload=data;return {...rawOrder,status:'CHARGING',durationMinutes:180};}});
  x.state.stations=catalog();x.connection.user={role:'USER',features:{bikeCharging:true}};
  assert.equal((await x.service.start('7','31',180)).durationMinutes,180);
  assert.deepEqual(payload,{stationId:'7',connectorId:'31',durationMinutes:180});
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
