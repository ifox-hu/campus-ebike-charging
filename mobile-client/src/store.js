import { reactive,computed } from 'vue';
import { restoreState, parseSocketCode, findSocket } from './domain/charging.mjs';
import { navigationTarget } from './domain/navigation.mjs';
import { createApiClient } from './api/client.mjs';
import { createCustomerStore } from './api/customer-store.mjs';
import { resolveBackendSocket } from './api/mapping.mjs';
export const apiBase=String(import.meta.env.VITE_API_BASE_URL||'').trim().replace(/\/$/,'');
export const isBackend=!!apiBase;
export const connection=reactive({user:null,loading:false,authenticating:false,error:'',operation:'',operationError:''});
const session=reactive({token:null,expiresAt:0});
export const hasSession=computed(()=>!!session.token);
const sessionKey='lightcharge-session:'+apiBase;
if(isBackend){try{const saved=uni.getStorageSync(sessionKey);if(typeof saved?.token==='string'&&saved.expiresAt>Date.now()){session.token=saved.token;session.expiresAt=saved.expiresAt;}}catch{}}
const key = 'yun-mobile-demo-v2';
const legacyKey = 'yun-mobile-demo-v1';
let saved;
try { saved = uni.getStorageSync(key) || uni.getStorageSync(legacyKey); } catch { saved = null; }
export const state = reactive(isBackend?{stations:[],orders:[],reports:[]}:restoreState(saved));
const saveSession=value=>{
  try{if(value)uni.setStorageSync(sessionKey,value);else uni.removeStorageSync(sessionKey);}
  catch{uni.showToast({title:'登录信息未能保存，下次进入需重新登录',icon:'none'});}
};
const api=createApiClient({request:options=>uni.request(options),baseUrl:apiBase,getToken:()=>session.token,
  onUnauthorized:token=>{if(token===session.token){customer.clear();connection.error='登录已失效，请重新登录';}}
});
const customer=createCustomerStore({api,state,connection,session,saveSession});
export const refreshData=()=>isBackend?customer.refresh():Promise.resolve(true);
export const authenticate=(credentials,register)=>customer.authenticate(credentials,register);
export const logout=()=>customer.clear();
export const refreshOrder=id=>customer.order(id);
export const operateOrder=(id,operation)=>customer.operate(id,operation);
export const checkoutAlipay=id=>customer.checkout(id);
export const payAlipayMiniNative=(id,native)=>customer.payMini(id,native);
export const startBackend=(stationId,connectorId,durationMinutes,chargeMode,paymentMethod)=>customer.start(stationId,connectorId,durationMinutes,chargeMode,paymentMethod);
export const mockPayBackend=(id,method)=>customer.mockPay(id,method);
export const reportBackend=payload=>customer.report(payload);
export const loadRates=id=>isBackend?customer.rates(id):Promise.resolve();
export function persist() {
  if(isBackend)return;
  try { uni.setStorageSync(key, JSON.parse(JSON.stringify(state))); }
  catch { uni.showToast({title:'本地存储失败，当前更改仅在本次保留',icon:'none'}); }
}
export function action(fn) {
  if(isBackend){uni.showToast({title:'当前操作暂未开放，请稍后再试',icon:'none'});return null;}
  try { const result = fn(); persist(); return result; }
  catch(e) { uni.showToast({title:e.message || '操作失败，请重试',icon:'none',duration:2800}); return null; }
}
let navigating = false;
export function go(path) {
  if (navigating) return;
  const target = navigationTarget(getCurrentPages(), path);
  if (target.method === 'navigateBack' && target.delta === 0) return;
  navigating = true;
  const { method, ...options } = target;
  uni[method]({ ...options,
    fail: () => uni.showToast({title:'页面打开失败，请重试',icon:'none'}),
    complete: () => { navigating = false; }
  });
}
export function openSocket(value) {
  if(isBackend){
    if(!connection.user)return go('/pages/account/index');
    try{const found=resolveBackendSocket(state.stations,value);go(`/pages/start/index?station=${encodeURIComponent(found.station.id)}&device=${encodeURIComponent(found.device.id)}&socket=${encodeURIComponent(found.socket.code)}`);}
    catch(error){uni.showToast({title:error.message,icon:'none'});}
    return;
  }
  action(()=>{const code=parseSocketCode(value); const found=findSocket(state,code); if(!found)throw new Error('未找到该插座，请核对编号'); go(`/pages/start/index?station=${found.station.id}&device=${found.device.id}&socket=${code}`);});
}
export function enterCode(onCode) {
  uni.showModal({title:'输入插座编号',editable:true,placeholderText:isBackend?'请输入平台提供的插座编号':'例如 14500006-01',confirmText:'查看插座',success:res => {if(res.confirm) onCode(res.content);}});
}
export function scan(onCode) {
  // #ifdef MP-WEIXIN
  uni.scanCode({onlyFromCamera:false,success:res=>onCode(res.result),fail:err=>{if(!String(err.errMsg).includes('cancel'))uni.showToast({title:'扫码未成功，可使用输入编号',icon:'none'});}});
  // #endif
  // #ifndef MP-WEIXIN
  enterCode(onCode);
  // #endif
}
