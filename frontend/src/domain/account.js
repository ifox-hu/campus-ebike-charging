import { reactive, watch } from 'vue'
import { accountRequest, refreshCsrf, forgetCsrf } from '../services/accountApi.js'
export const account=reactive({user:null,loading:true,serverOnline:false,error:'',loginMessage:'',returnTo:'dashboard'})
export function applyPreferences(preferences){const p=preferences||{fontSize:'normal',density:'comfortable'};document.documentElement.dataset.fontSize=p.fontSize;document.documentElement.dataset.density=p.density;document.documentElement.style.setProperty('--ui-font-scale',({normal:1,large:1.12,xlarge:1.24})[p.fontSize]||1)}
watch(()=>account.user?.preferences,applyPreferences,{deep:true,immediate:true})
window.addEventListener('admin-session-expired',()=>{if(account.user){account.user=null;account.loginMessage='登录已过期或会话失效，请重新登录。'}forgetCsrf()})
export async function restoreAccount(){account.loading=true;account.error='';try{const result=await accountRequest('/auth/me',{quiet401:true});account.user=result.data;account.serverOnline=true;account.loginMessage=''}catch(e){account.user=null;account.serverOnline=e.status===401;if(e.status!==401)account.error=e.message}finally{account.loading=false}}
export async function signIn(username,password){await refreshCsrf();const result=await accountRequest('/auth/login',{method:'POST',body:{username,password},form:true,quiet401:true});forgetCsrf();account.user=result.data;account.serverOnline=true;account.loginMessage='';location.hash='/'+account.returnTo;await refreshCsrf().catch(()=>{})}
export async function signOut(){await accountRequest('/auth/logout',{method:'POST'});forgetCsrf();account.user=null;account.loginMessage='你已安全退出。';location.hash='/login';accountChannel.postMessage('logout')}
export async function saveProfile(values){const r=await accountRequest('/account/profile',{method:'PUT',body:values});account.user=r.data;return r.data}
export async function savePreferences(values){const r=await accountRequest('/account/preferences',{method:'PUT',body:values});account.user=r.data;return r.data}
export async function updatePassword(currentPassword,newPassword){const r=await accountRequest('/account/password',{method:'POST',body:{currentPassword,newPassword}});forgetCsrf();account.user=null;account.loginMessage=r.message;location.hash='/login';accountChannel.postMessage('password-changed')}
const accountChannel=new BroadcastChannel('ebike-account-session')
accountChannel.onmessage=e=>{if(['logout','password-changed'].includes(e.data)){account.user=null;forgetCsrf();account.loginMessage=e.data==='logout'?'账号已在另一个页面退出。':'密码已变更，请重新登录。'}}
export async function checkSession(){if(!account.user||document.hidden)return;try{const result=await accountRequest('/auth/me');if(account.user&&account.user.updatedAt!==result.data.updatedAt)account.user=result.data;account.serverOnline=true}catch(e){if(e.status!==401)account.serverOnline=false}}
