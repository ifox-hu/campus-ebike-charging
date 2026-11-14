<template><view class="header" :class="{transparent}" :style="headerStyle"><button v-if="back" class="header-back" aria-label="返回" @click="goBack">‹</button><view v-else class="header-back empty"/><text class="header-title">{{title}}</text><view class="header-right"><slot/></view></view></template>
<script setup>
import { ref } from 'vue';
defineProps({title:String,back:Boolean,transparent:Boolean});
const headerStyle = ref({});
// #ifdef MP-WEIXIN
try {
  const windowInfo = uni.getWindowInfo();
  const menu = uni.getMenuButtonBoundingClientRect();
  const statusHeight = windowInfo.statusBarHeight || 0;
  const validMenu = menu.height > 0 && menu.top >= statusHeight;
  const barHeight = validMenu ? menu.height + (menu.top - statusHeight) * 2 : 44;
  const side = validMenu ? Math.max(44, windowInfo.windowWidth - menu.left + 8) : 96;
  headerStyle.value = { height: `${statusHeight + barHeight}px`, paddingTop: `${statusHeight}px`, paddingLeft: `${side}px`, paddingRight: `${side}px`, '--nav-height': `${barHeight}px`, '--nav-side': `${side}px` };
} catch { /* CSS status-bar fallback remains available on older clients. */ }
// #endif
const goBack=()=>{const pages=getCurrentPages();if(pages.length>1)uni.navigateBack();else uni.reLaunch({url:'/pages/home/index'});};
</script>
