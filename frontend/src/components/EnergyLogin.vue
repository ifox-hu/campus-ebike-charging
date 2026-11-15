<script setup>
import brandMark from '../assets/brand-mark.svg'
import {onMounted,onBeforeUnmount,ref,watch} from 'vue'
import UiIcon from './UiIcon.vue'
import './energy-login.css'
const props=defineProps({title:{type:String,default:'管理员登录'},subtitle:{type:String,default:'登录管理平台，连接无限可能'},username:String,password:String,remember:Boolean,allowRemember:{type:Boolean,default:true},busy:Boolean,error:String,message:String})
const emit=defineEmits(['update:username','update:password','update:remember','submit'])
const stage=ref(null),hit=ref(null),show=ref(false),status=ref('能量场已就绪'),focused=ref(false)
let cleanup,active=true,ready=Promise.resolve()
watch(focused,value=>cleanup?.setFocused(value))
watch(()=>props.busy,value=>cleanup?.setBusy(value))
function focusOut(event){focused.value=event.currentTarget.contains(event.relatedTarget)}
defineExpose({async complete(){await ready;if(active)await cleanup?.complete()}})
onMounted(()=>{
 ready=import('./energyScene.js').then(({mountEnergyScene})=>{
  if(!active)return
  cleanup=mountEnergyScene(stage.value,hit.value,text=>status.value=text)
  cleanup.setFocused(focused.value)
  cleanup.setBusy(props.busy)
 }).catch(()=>{status.value='能量核心 · 静态展示'})
})
onBeforeUnmount(()=>{active=false;cleanup?.()})
</script>
<template>
 <main class="energy-login" aria-label="电动自行车智慧充电管理系统登录">
  <div class="ec-atmosphere" aria-hidden="true"></div>
  <header class="ec-nav"><div class="ec-brand"><img class="ec-mark" :src="brandMark" alt=""/><div><b>智慧充电</b><small>SMART E-BIKE CHARGING</small></div></div><div class="ec-nav-right"><span><b class="ec-dot"></b>智慧充电管理平台</span><span>简体中文</span></div></header>
  <section class="ec-hero"><div class="ec-eyebrow">BEYOND ENERGY. INTO THE FUTURE.</div><h1>能量无界<span>智联未来</span></h1><p>让数据流动，让连接发生。<br>以智慧，驱动每一种可能。</p></section>
  <span class="ec-ghost-word" aria-hidden="true">ENERGY</span>
  <div ref="stage" class="ec-stage"><div class="ec-fallback" aria-hidden="true"></div><button ref="hit" type="button" class="ec-core-hit" aria-label="拖拽旋转能量装置，滚轮或双指缩放，点击触发能量反馈"></button></div>
  <div class="ec-callout ec-callout-a" aria-hidden="true"><small>ENERGY NEXUS</small><strong><b class="ec-dot"></b>{{status}}</strong></div>
  <div class="ec-callout ec-callout-b" aria-hidden="true"><small>CONNECTED INTELLIGENCE</small><strong>连接 · 感知 · 进化</strong></div>
  <span class="ec-status-a11y" role="status">{{status}}</span>
  <span class="ec-side-caption" aria-hidden="true">SMART CHARGING / INFINITE POSSIBILITIES</span>
  <div class="ec-panel-shell"><form class="ec-panel" aria-label="管理平台登录" @focusin="focused=true" @focusout="focusOut" @submit.prevent="!busy&&emit('submit')">
   <div class="ec-panel-top"><span>ACCESS YOUR WORKSPACE</span><UiIcon name="fullscreen"/></div><h2>{{title}}</h2><p class="ec-sub">{{subtitle}}</p>
   <p v-if="message" class="ec-login-info" role="status">{{message}}</p><p v-if="error" class="ec-feedback" role="alert">{{error}}</p>
   <label class="ec-label" for="energy-account">登录账号</label><div class="ec-field"><UiIcon name="user"/><input id="energy-account" :value="username" @input="emit('update:username',$event.target.value)" placeholder="请输入账号" autocomplete="username" required maxlength="64" :disabled="busy"/></div>
   <label class="ec-label" for="energy-password">登录密码</label><div class="ec-field"><UiIcon name="lock"/><input id="energy-password" :value="password" @input="emit('update:password',$event.target.value)" placeholder="请输入密码" :type="show?'text':'password'" autocomplete="current-password" required maxlength="72" :disabled="busy"/><button class="ec-eye" type="button" :aria-label="show?'隐藏密码':'显示密码'" @click="show=!show"><UiIcon :name="show?'eyeOff':'eye'"/></button></div>
   <div v-if="allowRemember" class="ec-options"><label><input :checked="remember" @change="emit('update:remember',$event.target.checked)" type="checkbox"/>记住账号</label><span>不保存密码</span></div>
   <button type="submit" class="ec-submit login-submit" :disabled="busy"><span>{{busy?'正在登录…':'登 录'}}</span><UiIcon name="arrow"/></button>
   <div v-if="$slots.help" class="ec-help-content"><slot name="help"/></div>
   <div class="ec-secure"><UiIcon name="rule"/>管理员与运营员统一登录</div>
  </form></div>
  <footer class="ec-footer"><span class="ec-footer-word">ENERGY · CONNECTION · INTELLIGENCE</span><span class="ec-footer-note">电动自行车智慧充电管理系统</span></footer>
 </main>
</template>
