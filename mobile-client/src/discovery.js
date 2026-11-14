import {computed,reactive,watch} from 'vue';
import {apiBase,isBackend,connection} from './store.js';
import {preferenceKey,visitStation} from './domain/experience.mjs';
const value=reactive({favorites:[],recent:[]});
const key=computed(()=>preferenceKey(apiBase,isBackend?(connection.user?.id||connection.user?.username||'guest'):'demo'));
watch(key,()=>{let saved;try{saved=uni.getStorageSync(key.value);}catch{}value.favorites=Array.isArray(saved?.favorites)?saved.favorites.filter(x=>typeof x==='string'):[];value.recent=Array.isArray(saved?.recent)?saved.recent.filter(x=>typeof x==='string').slice(0,10):[];},{immediate:true,flush:'sync'});
function save(){try{uni.setStorageSync(key.value,{favorites:[...value.favorites],recent:[...value.recent]});}catch{uni.showToast({title:'本机偏好保存失败',icon:'none'});}}
export const discovery=value;
export function toggleFavorite(id){id=String(id);value.favorites=value.favorites.includes(id)?value.favorites.filter(x=>x!==id):[...value.favorites,id];save();}
export function rememberStation(id){value.recent=visitStation(value.recent,id);save();}
