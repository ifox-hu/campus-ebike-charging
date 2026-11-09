<template><view class="bottom-nav"><button :class="['nav-item',{active:current==='home'}]" @click="open('home')"><image :src="'/static/'+(current==='home'?'home-active':'home')+'.png'"/><text>首页</text></button><button class="scan-nav" aria-label="扫码充电" @click="scan(openSocket)"><image src="/static/scan.png"/></button><button :class="['nav-item',{active:current==='mine'}]" @click="open('mine')"><image :src="'/static/'+(current==='mine'?'mine-active':'mine')+'.png'"/><text>我的</text></button></view></template>
<script setup>
import {scan,openSocket} from '../store.js';
const props=defineProps({current:String});
const open=page=>{if(page!==props.current)uni.reLaunch({url:`/pages/${page}/index`});};
</script>
