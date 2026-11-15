<script setup>
import { ref } from 'vue'
import {isStaticDemo} from '../runtime.js'
import {STATIC_DEMO_ACCOUNT} from '../services/staticAccount.js'
import { account, signIn, restoreAccount } from '../domain/account.js'
import EnergyLogin from './EnergyLogin.vue'
const emit=defineEmits(['success','pending'])
const energyLogin=ref(null)
const rememberKey=isStaticDemo?'campus-demo-last-account':'ebike-last-admin-account'
let remembered='';try{remembered=localStorage.getItem(rememberKey)||''}catch{}
const username=ref(remembered||(isStaticDemo?'demo':'admin')),password=ref(''),remember=ref(!!remembered),busy=ref(false),error=ref('')
function fillDemo(){username.value=STATIC_DEMO_ACCOUNT.username;password.value=STATIC_DEMO_ACCOUNT.password;error.value=''}
async function login(){if(busy.value)return;error.value='';busy.value=true;emit('pending',true);try{await signIn(username.value.trim(),password.value);try{if(remember.value)localStorage.setItem(rememberKey,username.value.trim());else localStorage.removeItem(rememberKey)}catch{}password.value='';if(account.user){await energyLogin.value?.complete();if(account.user)emit('success')}}catch(e){error.value=e.message;password.value=''}finally{busy.value=false;emit('pending',false)}}
</script>
<template>
 <EnergyLogin ref="energyLogin" v-model:username="username" v-model:password="password" v-model:remember="remember" :title="isStaticDemo?'在线演示登录':'管理员登录'" :subtitle="isStaticDemo?'校园 · 医院 · 小区 · 园区 · 办公区集中充电':'登录后管理站点、设备与独立插座'" :busy="busy" :error="error||account.error" :message="account.loginMessage" @submit="login">
  <template #help>
   <button v-if="account.error&&!isStaticDemo" type="button" class="text-button reconnect-button" @click="restoreAccount">重试连接账号服务</button>
   <div v-if="isStaticDemo" class="demo-login-help"><div class="demo-help-heading"><strong>公开演示账号</strong><button type="button" @click="fillDemo">填入演示账号</button></div><p>账号 <code>{{STATIC_DEMO_ACCOUNT.username}}</code> · 密码 <code>{{STATIC_DEMO_ACCOUNT.password}}</code></p><small>此登录用于展示操作流程，数据仅保存在当前浏览器。</small></div>
   <div v-else><strong>本机首次初始化</strong><p>账号 <code>admin</code> · 初始密码 <code>Admin@123456</code></p><small>仅新建账号时生效，已修改的密码不会被覆盖。</small></div>
  </template>
 </EnergyLogin>
</template>
<style scoped>
.demo-login-badge{display:inline-block;margin-bottom:12px;padding:5px 9px;border-radius:5px;background:#f1eeff;color:#8173cb;font-size:10px;font-weight:600;letter-spacing:1.4px}.demo-help-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.demo-help-heading .text-button{font-size:12px;white-space:nowrap}.demo-login-help p{line-height:1.8}.demo-login-help code{white-space:nowrap}
@media(max-width:480px){.demo-login-help p{font-size:12px}.demo-help-heading{gap:6px}.demo-help-heading .text-button{font-size:11px}}
</style>
