// Public demonstration adapter. It provides no authentication or server access.
// Demo credentials are public UI simulation only, never a security boundary.
// No password is persisted or sent to a server; settings belong to this browser.
import {validateAvatar} from './avatar.js'
export const STATIC_DEMO_ACCOUNT=Object.freeze({username:'demo',password:'Demo@123456'})
const key='campus-charging-pages-settings-v1',sessionKey='campus-charging-pages-session-v1'
export function createStaticAccountRequest({storage,sessionStorage,now=()=>new Date().toISOString()}){
 const initial=()=>({profile:{id:'public-demo',username:'demo',displayName:'演示管理员',role:'ADMIN',avatar:'',email:'',phone:'',bio:'公开静态演示，无真实账号权限。',preferences:{fontSize:'normal',density:'comfortable'},updatedAt:now()},readKeys:[]})
 let active=false
 try{active=sessionStorage?.getItem(sessionKey)==='active'}catch{}
 const unauthorized=message=>Object.assign(Error(message),{status:401})
 let state=initial()
 try{const saved=JSON.parse(storage.getItem(key)||'null');if(saved?.profile?.username==='demo'&&Array.isArray(saved.readKeys))state={profile:{...state.profile,...saved.profile,id:'public-demo',username:'demo',role:'ADMIN'},readKeys:saved.readKeys.filter(v=>typeof v==='string')}}catch{}
 try{state.profile.avatar=validateAvatar(state.profile.avatar||'')}catch{state.profile.avatar=''}
 const save=()=>{state.profile.updatedAt=now();storage.setItem(key,JSON.stringify(state))}
 const response=(data,message='公开演示操作已完成')=>({data:JSON.parse(JSON.stringify(data)),message})
 return async(path,{method='GET',body={}}={})=>{
  if(path==='/auth/login'&&method==='POST'){
   if(body.username!==STATIC_DEMO_ACCOUNT.username||body.password!==STATIC_DEMO_ACCOUNT.password)throw unauthorized('演示账号或密码不正确，请使用页面提示的演示账号。')
   active=true;try{sessionStorage?.setItem(sessionKey,'active')}catch{}
   return response(state.profile,'已登录公开演示')
  }
  if(path==='/auth/logout'&&method==='POST'){
   active=false;try{sessionStorage?.removeItem(sessionKey)}catch{}
   return response(null,'已退出公开演示')
  }
  if(!active)throw unauthorized('请先登录公开演示。')
  if(path==='/auth/me')return response(state.profile)
  if(path==='/account/password')throw Error('公开演示没有真实账号，不提供修改密码功能。')
  if(path==='/account/profile'&&method==='PUT'){
   const name=String(body.displayName||'').trim()
   if(!name||name.length>60)throw Error('显示名称须为 1～60 个字符。')
   const avatar=body.avatar===undefined?state.profile.avatar:validateAvatar(body.avatar)
   const previous={...state.profile}
   for(const field of ['email','phone','bio'])state.profile[field]=String(body[field]||'').slice(0,field==='bio'?300:160)
   state.profile.displayName=name;state.profile.avatar=avatar
   try{save()}catch{state.profile=previous;throw Error('个人资料保存失败，浏览器存储空间可能不足，请缩小头像后重试。')}
   return response(state.profile)
  }
  if(path==='/account/preferences'&&method==='PUT'){
   if(!['normal','large','xlarge'].includes(body.fontSize)||!['comfortable','compact'].includes(body.density))throw Error('显示设置不受支持。')
   state.profile.preferences={fontSize:body.fontSize,density:body.density};save();return response(state.profile)
  }
  if(path==='/notifications/read-state'){
   if(method==='POST'){state.readKeys=[...new Set([...state.readKeys,...(body.keys||[]).filter(v=>typeof v==='string')])].slice(-2000);save()}
   return response(state.readKeys)
  }
  throw Error('公开演示不支持此接口。')
 }
}
