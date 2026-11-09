<template><view class="demo-note">{{map?'地图为演示示意，不代表实际站点位置':isBackend?'平台账号同步 · 设备与支付仍为模拟':'本地模拟演示 · 不连接真实设备或支付'}}</view></template>
<script setup>
import {isBackend} from '../store.js';
defineProps({map:Boolean});
</script>
