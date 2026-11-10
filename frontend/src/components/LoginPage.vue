<script setup>
import { ref } from 'vue'
import {isStaticDemo} from '../runtime.js'
import {STATIC_DEMO_ACCOUNT} from '../services/staticAccount.js'
import { account, signIn, restoreAccount } from '../domain/account.js'
const emit=defineEmits(['success'])
const rememberKey=isStaticDemo?'campus-demo-last-account':'ebike-last-admin-account'
let remembered='';try{remembered=localStorage.getItem(rememberKey)||''}catch{}
const username=ref(remembered||(isStaticDemo?'demo':'admin')),password=ref(''),remember=ref(!!remembered),show=ref(false),busy=ref(false),error=ref('')
function fillDemo(){username.value=STATIC_DEMO_ACCOUNT.username;password.value=STATIC_DEMO_ACCOUNT.password;error.value=''}
async function login(){error.value='';busy.value=true;try{await signIn(username.value.trim(),password.value);try{if(remember.value)localStorage.setItem(rememberKey,username.value.trim());else localStorage.removeItem(rememberKey)}catch{}password.value='';emit('success')}catch(e){error.value=e.message;password.value=''}finally{busy.value=false}}
</script>
<template>
 <main class="auth-shell">
  <div class="auth-brand"><span class="auth-logo">ϟ</span><span>电动自行车智慧充电管理系统</span></div>
  <section class="login-card">
   <div class="login-accent"></div>
   <header><span v-if="isStaticDemo" class="demo-login-badge">ONLINE DEMO</span><h1>{{isStaticDemo?'在线演示登录':'管理员登录'}}</h1><p>{{isStaticDemo?'校园 · 住宅小区 · 园区集中充电':'登录后管理站点、设备与独立插座'}}</p></header>
   <p v-if="account.loginMessage" class="login-info" role="status">{{account.loginMessage}}</p>
   <p v-if="error||account.error" class="form-error" role="alert">{{error||account.error}}</p>
   <form @submit.prevent="login">
    <label>账号<input v-model="username" autocomplete="username" required maxlength="64" placeholder="请输入管理员账号"/></label>
    <label>密码<div class="password-input"><input v-model="password" :type="show?'text':'password'" autocomplete="current-password" required maxlength="64" placeholder="请输入密码"/><button type="button" @click="show=!show" :aria-label="show?'隐藏密码':'显示密码'">{{show?'隐藏':'显示'}}</button></div></label>
    <label class="remember-account"><input v-model="remember" type="checkbox"/> 记住账号 <span>不保存密码</span></label>
    <button class="login-submit" :disabled="busy" type="submit">{{busy?'正在登录…':'登 录'}}</button>
   </form>
   <button v-if="account.error&&!isStaticDemo" class="text-button reconnect-button" @click="restoreAccount">重试连接账号服务</button>
   <div v-if="isStaticDemo" class="login-help demo-login-help"><div class="demo-help-heading"><strong>公开演示账号</strong><button type="button" class="text-button" @click="fillDemo">填入演示账号</button></div><p>账号 <code>{{STATIC_DEMO_ACCOUNT.username}}</code> · 密码 <code>{{STATIC_DEMO_ACCOUNT.password}}</code></p><small>此登录用于展示操作流程，数据仅保存在当前浏览器。</small></div>
   <div v-else class="login-help"><strong>本机首次初始化</strong><p>账号 <code>admin</code> · 初始密码 <code>Admin@123456</code></p><small>仅新建账号时生效，已修改的密码不会被覆盖。</small></div>
  </section>
  <footer class="login-footer">电动自行车智慧充电管理系统<br/>{{isStaticDemo?'公开静态演示 · 无真实设备控制与付款':'账号由本机 Spring Boot 服务校验；充电设备与业务数据仍为软件模拟。'}}</footer>
 </main>
</template>
<style scoped>
.demo-login-badge{display:inline-block;margin-bottom:12px;padding:5px 9px;border-radius:5px;background:#f1eeff;color:#8173cb;font-size:10px;font-weight:600;letter-spacing:1.4px}.demo-help-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.demo-help-heading .text-button{font-size:12px;white-space:nowrap}.demo-login-help p{line-height:1.8}.demo-login-help code{white-space:nowrap}
@media(max-width:480px){.demo-login-help p{font-size:12px}.demo-help-heading{gap:6px}.demo-help-heading .text-button{font-size:11px}}
</style>
