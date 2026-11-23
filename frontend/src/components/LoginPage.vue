<script setup>
import { ref } from 'vue'
import {isStaticDemo} from '../runtime.js'
import {STATIC_DEMO_ACCOUNT,STATIC_DEMO_ACCOUNTS} from '../services/staticAccount.js'
import { account, signIn, restoreAccount, loadLoginCaptcha } from '../domain/account.js'
import LoginCaptcha from './LoginCaptcha.vue'
import EnergyLogin from './EnergyLogin.vue'
const emit=defineEmits(['success','pending'])
const energyLogin=ref(null),loginCaptcha=ref(null)
const rememberKey=isStaticDemo?'campus-demo-last-account':'ebike-last-admin-account'
let remembered='';try{remembered=localStorage.getItem(rememberKey)||''}catch{}
const username=ref(remembered||(isStaticDemo?'demo':'admin')),password=ref(''),remember=ref(!!remembered),busy=ref(false),error=ref('')
const selectedDemo=ref(STATIC_DEMO_ACCOUNT.username)
async function fillDemo(demo){username.value=demo.username;password.value=demo.password;error.value='';await loginCaptcha.value?.fillDemo()}
async function login(){if(busy.value)return;error.value='';busy.value=true;emit('pending',true);try{const captcha=loginCaptcha.value.validate();await signIn(username.value.trim(),password.value,captcha);try{if(remember.value)localStorage.setItem(rememberKey,username.value.trim());else localStorage.removeItem(rememberKey)}catch{}password.value='';if(account.user){await energyLogin.value?.complete();if(account.user)emit('success')}}catch(e){error.value=e.message;password.value='';await loginCaptcha.value?.refresh()}finally{busy.value=false;emit('pending',false)}}
</script>
<template>
 <EnergyLogin ref="energyLogin" v-model:username="username" v-model:password="password" v-model:remember="remember" :title="isStaticDemo?'在线演示登录':'管理员登录'" :subtitle="isStaticDemo?'校园 · 医院 · 小区 · 园区 · 办公区集中充电':'登录后管理站点、设备与独立插座'" :busy="busy" :error="error||account.error" :message="account.loginMessage" @submit="login">
  <template #captcha><LoginCaptcha ref="loginCaptcha" :load-challenge="loadLoginCaptcha" :disabled="busy"/></template>
  <template #help>
   <button v-if="account.error&&!isStaticDemo" type="button" class="text-button reconnect-button" @click="restoreAccount">重试连接账号服务</button>
   <div v-if="isStaticDemo" class="demo-login-help">
    <div class="demo-help-heading">
     <select v-model="selectedDemo" aria-label="公开演示角色">
      <option v-for="demo in STATIC_DEMO_ACCOUNTS" :key="demo.username" :value="demo.username">{{demo.label}} · {{demo.username}}</option>
     </select>
     <button type="button" @click="fillDemo(STATIC_DEMO_ACCOUNTS.find(demo=>demo.username===selectedDemo))">填入演示账号</button>
    </div>
    <p>通用密码 <code>{{STATIC_DEMO_ACCOUNT.password}}</code></p>
   </div>
   <div v-else><strong>本机首次初始化</strong><p>账号 <code>admin</code> · 初始密码 <code>Admin@123456</code></p><small>仅新建账号时生效，已修改的密码不会被覆盖。</small></div>
  </template>
 </EnergyLogin>
</template>
<style scoped>
.demo-help-heading select{min-width:0;max-width:100%;background:#172438;color:#c6d8ec;border:1px solid #7388a76b;border-radius:5px;padding:4px;font:inherit}
.demo-login-badge{display:inline-block;margin-bottom:12px;padding:5px 9px;border-radius:5px;background:#f1eeff;color:#8173cb;font-size:10px;font-weight:600;letter-spacing:1.4px}.demo-help-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.demo-help-heading .text-button{font-size:12px;white-space:nowrap}.demo-login-help p{line-height:1.8}.demo-login-help code{white-space:nowrap}
@media(max-width:480px){.demo-login-help p{font-size:12px}.demo-help-heading{gap:6px}.demo-help-heading .text-button{font-size:11px}}
</style>
