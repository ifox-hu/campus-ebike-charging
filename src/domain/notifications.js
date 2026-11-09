import { ref,computed,watch } from 'vue'
import { db } from './store.js'
import { account } from './account.js'
import { accountRequest } from '../services/accountApi.js'
import { notificationSignals,mergeNotificationLedger } from './notificationModel.js'
const key='ebike-operation-notification-ledger-v1'
let cached=[];try{const data=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(data))cached=data.filter(e=>e&&typeof e.key==='string'&&e.target)}catch{}
export const notifications=ref(cached),readKeys=ref(new Set()),noticeError=ref(''),noticeBusy=ref(false)
watch(()=>notificationSignals(db),signals=>{notifications.value=mergeNotificationLedger(notifications.value,signals);try{localStorage.setItem(key,JSON.stringify(notifications.value))}catch{noticeError.value='通知历史未能保存到浏览器。'}},{deep:true,immediate:true})
export const unreadNotifications=computed(()=>notifications.value.filter(n=>!readKeys.value.has(n.key)))
export async function refreshReadState(){if(!account.user||document.hidden)return;const id=account.user.id;try{const r=await accountRequest('/notifications/read-state');if(account.user?.id===id){readKeys.value=new Set([...readKeys.value,...r.data]);noticeError.value=''}}catch(e){noticeError.value=e.message}}
watch(()=>account.user?.id,id=>{readKeys.value=new Set();noticeError.value='';if(id)refreshReadState()},{immediate:true})
export async function markRead(keys){if(!keys.length)return;noticeBusy.value=true;try{const r=await accountRequest('/notifications/read-state',{method:'POST',body:{keys}});readKeys.value=new Set([...readKeys.value,...r.data]);noticeError.value=''}catch(e){noticeError.value=e.message;throw e}finally{noticeBusy.value=false}}
