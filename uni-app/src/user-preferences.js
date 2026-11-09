import {reactive,computed,watch} from 'vue';
import {connection,isBackend,apiBase,state} from './store.js';
import {buildMessages} from './domain/user-experience.mjs';
export const preferences=reactive({favorites:[],recent:[],read:[]});
let storageKey='';
watch(()=>isBackend?connection.user?.username:'local-demo',username=>{
 storageKey=username?`ebike-preferences:${apiBase}:${username}`:'';
 let saved=null;try{if(storageKey)saved=uni.getStorageSync(storageKey);}catch{}
 for(const name of ['favorites','recent','read'])preferences[name]=Array.isArray(saved?.[name])?saved[name].filter(x=>typeof x==='string'):[];
},{immediate:true});
function save(){try{if(storageKey)uni.setStorageSync(storageKey,JSON.parse(JSON.stringify(preferences)));}catch{uni.showToast({title:'本机偏好保存失败，当前更改仅在本次有效',icon:'none'});}}
export function toggleFavorite(id){if(isBackend&&!connection.user)return;const i=preferences.favorites.indexOf(id);if(i<0)preferences.favorites.push(id);else preferences.favorites.splice(i,1);save();}
export function rememberStation(id){if(isBackend&&!connection.user)return;preferences.recent=[id,...preferences.recent.filter(x=>x!==id)].slice(0,20);save();}
export const messages=computed(()=>buildMessages(state.orders,state.reports));
export const unreadCount=computed(()=>messages.value.filter(m=>!preferences.read.includes(m.id)).length);
export function markRead(id){if(!preferences.read.includes(id)){preferences.read.push(id);save();}}
export function markAllRead(){preferences.read=messages.value.map(m=>m.id);save();}
