import { mapCatalog, mapOrder, mapOrders,mapReport,mapReports } from './mapping.mjs';
import {payAlipayMini} from './alipay-mini.mjs';

// State is supplied by the Vue store; this module also runs without a browser.
// Epoch checks prevent a late response from repopulating a logged-out account.
export function createCustomerStore({api,state,connection,session,saveSession,now=Date.now}) {
  let epoch=0,revision=0,refreshTask=null;
  function clear() {
    epoch++; revision++; refreshTask=null;
    session.token=null;session.expiresAt=0;
    connection.user=null;connection.loading=false;connection.authenticating=false;connection.operation='';connection.error='';connection.operationError='';
    connection.stale=false;connection.lastSyncedAt=null;
    state.stations=[];state.orders=[];state.reports=[];
    saveSession(null);
  }
  const current=(version,token)=>version===epoch&&token===session.token;
  const requireUser=profile=>{if(profile?.role!=='USER')throw new Error('请使用普通用户账号登录');return profile;};
  async function refresh() {
    if(connection.operation)return false;
    if(!session.token)return false;
    if(session.expiresAt<=now()){clear();connection.error='登录已过期，请重新登录';return false;}
    if(refreshTask)return refreshTask;
    const version=epoch,token=session.token,snapshotRevision=++revision;
    connection.loading=true;connection.error='';connection.operationError='';
    const task=(async()=>{
      try {
        const profile=requireUser(await api.me());
        const [stations,chargers,connectors,orders,reports]=await Promise.all([api.stations(),api.chargers(),api.connectors(),api.orders(),profile.features?.repairs?api.reports():Promise.resolve([])]);
        const catalog=mapCatalog(stations,chargers,connectors),mappedOrders=mapOrders(orders,catalog);
        if(!current(version,token)||snapshotRevision!==revision)return false;
        connection.user=profile;state.stations=catalog;state.orders=mappedOrders;state.reports=mapReports(reports);
        connection.stale=false;connection.lastSyncedAt=now();
        return true;
      }catch(error){
        if(current(version,token)) {
          if(error.message==='请使用普通用户账号登录')clear();
          connection.error=error.message;connection.stale=!!connection.lastSyncedAt;
        }
        return false;
      }finally{if(current(version,token)){connection.loading=false;refreshTask=null;}}
    })();
    refreshTask=task;
    return task;
  }
  async function authenticate(credentials,register=false) {
    if(connection.authenticating)return false;
    clear(); const version=epoch;
    connection.authenticating=true;
    try {
      const result=await (register?api.register(credentials):api.login(credentials));
      if(version!==epoch)return false;
      if(typeof result?.token!=='string'||!result.token||!Number.isFinite(result.expiresIn)||result.expiresIn<=0)throw new Error('登录响应不完整，请重试');
      session.token=result.token;session.expiresAt=now()+result.expiresIn*1000;
      const profile=requireUser(await api.me());
      if(!current(version,result.token))return false;
      connection.user=profile;
      saveSession({token:session.token,expiresAt:session.expiresAt});
      await refresh();
      return current(version,result.token)&&!!connection.user;
    }catch(error){
      if(version===epoch){clear();connection.error=error.message;}
      return false;
    }finally{if(version===epoch)connection.authenticating=false;}
  }
  async function order(id) {
    if(connection.operation||connection.loading)return null;
    const version=epoch,token=session.token,readRevision=revision;
    try {
      const mapped=mapOrder(await api.order(id),state.stations);
      if(!current(version,token)||readRevision!==revision)return null;
      const index=state.orders.findIndex(o=>o.id===mapped.id);
      if(index<0)state.orders.unshift(mapped);else state.orders.splice(index,1,mapped);
      connection.error='';return mapped;
    }catch(error){if(current(version,token)&&readRevision===revision)connection.error=error.message;return null;}
  }
  async function operate(id,operation) {
    if(!['stop','pay'].includes(operation))throw new Error('不支持的订单操作');
    if(connection.operation||connection.loading)return null;
    const version=epoch,token=session.token;
    revision++;
    connection.operation=operation;connection.error='';connection.operationError='';
    try {
      const raw=await api[operation](id);
      if(!current(version,token))return null;
      const mapped=mapOrder(raw,state.stations);
      const index=state.orders.findIndex(o=>o.id===mapped.id);
      if(index<0)state.orders.unshift(mapped);else state.orders.splice(index,1,mapped);
      return mapped;
    }catch(error){if(current(version,token))connection.operationError=error.message;return null;}
    finally{if(current(version,token))connection.operation='';}
  }
  async function start(stationId,connectorId,durationMinutes,chargeMode,paymentMethod){
    if(connection.operation||connection.loading)return null;
    if(!connection.user?.features?.bikeCharging){connection.operationError='当前服务暂未开放启动功能';return null;}
    const version=epoch,token=session.token;revision++;connection.operation='start';connection.error='';connection.operationError='';
    try{
      const payload={stationId,connectorId};
      if(chargeMode)payload.chargeMode=chargeMode;
      if(paymentMethod)payload.paymentMethod=String(paymentMethod).toUpperCase();
      if(chargeMode!=='FULL'&&durationMinutes!==undefined)payload.durationMinutes=durationMinutes;
      const mapped=mapOrder(await api.start(payload),state.stations);
      if(!current(version,token))return null;
      state.orders=[mapped,...state.orders.filter(o=>o.id!==mapped.id)];return mapped;
    }catch(error){
      if(!current(version,token))return null;
      connection.operationError=error.message;
      if(error.kind==='network'){
        try{
          const refreshed=mapOrders(await api.orders(),state.stations);
          if(!current(version,token))return null;
          state.orders=refreshed;
          const found=refreshed.find(o=>o.stationId===String(stationId)&&o.connectorId===String(connectorId)&&['starting','charging'].includes(o.status));
          if(found){connection.operationError='';return found;}
        }catch{ /* Keep the original uncertain-result message; never retry POST. */ }
      }
      return null;
    }finally{if(current(version,token))connection.operation='';}
  }
  async function report(payload){
    if(connection.operation||connection.loading)return null;
    if(!connection.user?.features?.repairs){connection.operationError='当前服务暂未开放报修功能';return null;}
    const version=epoch,token=session.token;revision++;connection.operation='report';connection.error='';connection.operationError='';
    try{
      const mapped=mapReport(await api.report(payload));
      if(!current(version,token))return null;
      state.reports=[mapped,...state.reports.filter(r=>r.id!==mapped.id)];return mapped;
    }catch(error){if(current(version,token))connection.operationError=error.message;return null;}
    finally{if(current(version,token))connection.operation='';}
  }
  async function rates(stationId) {
    const version=epoch,token=session.token;
    const station=state.stations.find(s=>s.id===stationId);
    if(!station||station.ratesLoading)return;
    station.ratesLoading=true;station.ratesError='';
    try {
      const periods=await api.prices(stationId);
      if(!Array.isArray(periods))throw new Error('费率数据格式不正确');
      if(current(version,token))station.ratePeriods=periods;
    }catch(error){if(current(version,token))station.ratesError=error.message;}
    finally{station.ratesLoading=false;}
  }
  async function checkout(id) {
    if(connection.operation||connection.loading)return null;
    const version=epoch,token=session.token;
    revision++;connection.operation='checkout';connection.operationError='';
    try {
      const result=await api.checkout(id);
      if(!current(version,token))return null;
      if(result?.environment!=='ALIPAY_SANDBOX'||!/^https:\/\/openapi-sandbox\.dl\.alipaydev\.com\/gateway\.do\?/.test(result.checkoutUrl))throw new Error('沙箱收银台地址无效');
      return result;
    }catch(error){if(current(version,token))connection.operationError=error.message;return null;}
    finally{if(current(version,token))connection.operation='';}
  }
  async function mockPay(id,method){
    if(connection.operation||connection.loading||!session.token)return null;
    const selected=String(method||'').toUpperCase();
    if(!['WECHAT','ALIPAY'].includes(selected)){connection.operationError='请选择微信支付或支付宝';return null;}
    const version=epoch,token=session.token;
    revision++;connection.operation='mockPay';connection.operationError='';connection.error='';
    try{
      const raw=await api.mockPay(id,selected);
      if(!current(version,token))return null;
      const mapped=mapOrder(raw,state.stations);
      const index=state.orders.findIndex(o=>o.id===mapped.id);
      if(index<0)state.orders.unshift(mapped);else state.orders.splice(index,1,mapped);
      return mapped;
    }catch(error){if(current(version,token))connection.operationError=error.message;return null;}
    finally{if(current(version,token))connection.operation='';}
  }
  async function payMini(id,native) {
    if(connection.operation||connection.loading||!session.token)return null;
    const version=epoch,token=session.token;
    revision++;connection.operation='checkout';connection.operationError='';
    try {
      return await payAlipayMini({native,
        checkout:async authCode=>{
          if(!current(version,token))return null;
          const result=await api.miniCheckout(id,authCode);
          return current(version,token)?result:null;
        },
        query:async()=>{
          if(!current(version,token))return null;
          const raw=await api.pay(id);
          if(!current(version,token))return null;
          const mapped=mapOrder(raw,state.stations);
          const index=state.orders.findIndex(o=>o.id===mapped.id);
          if(index<0)state.orders.unshift(mapped);else state.orders.splice(index,1,mapped);
          return mapped;
        }});
    }catch(error){if(current(version,token))connection.operationError=error.message;return null;}
    finally{if(current(version,token))connection.operation='';}
  }
  return {clear,refresh,authenticate,order,operate,rates,start,report,checkout,payMini,mockPay};
}
