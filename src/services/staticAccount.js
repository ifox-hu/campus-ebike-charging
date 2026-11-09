// Public demonstration adapter. It provides no authentication or server access.
// No credentials are accepted or stored; all settings belong to this browser.
const key='campus-charging-pages-settings-v1'
export function createStaticAccountRequest({storage,now=()=>new Date().toISOString()}){
 const initial=()=>({profile:{id:'public-demo',username:'demo',displayName:'演示管理员',role:'ADMIN',email:'',phone:'',bio:'公开静态演示，无真实账号权限。',preferences:{fontSize:'normal',density:'comfortable'},updatedAt:now()},readKeys:[]})
 let state=initial()
 try{const saved=JSON.parse(storage.getItem(key)||'null');if(saved?.profile?.username==='demo'&&Array.isArray(saved.readKeys))state={profile:{...state.profile,...saved.profile,id:'public-demo',username:'demo',role:'ADMIN'},readKeys:saved.readKeys.filter(v=>typeof v==='string')}}catch{}
 const save=()=>{state.profile.updatedAt=now();storage.setItem(key,JSON.stringify(state))}
 const response=(data,message='公开演示操作已完成')=>({data:JSON.parse(JSON.stringify(data)),message})
 return async(path,{method='GET',body={}}={})=>{
  if(path==='/auth/me'||path==='/auth/login')return response(state.profile)
  if(path==='/auth/logout')return response(null,'已退出公开演示')
  if(path==='/account/password')throw Error('公开演示没有真实账号，不提供修改密码功能。')
  if(path==='/account/profile'&&method==='PUT'){
   const name=String(body.displayName||'').trim()
   if(!name||name.length>60)throw Error('显示名称须为 1～60 个字符。')
   for(const field of ['email','phone','bio'])state.profile[field]=String(body[field]||'').slice(0,field==='bio'?300:160)
   state.profile.displayName=name;save();return response(state.profile)
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
