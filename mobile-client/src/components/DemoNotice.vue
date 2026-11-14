<template><view class="demo-note">{{map?'地图为演示示意，不代表实际站点位置':isBackend?(connection.user?.features?.mockPayment?'平台账号同步 · 模拟支付不扣款':'平台账号同步 · 支付宝沙箱测试交易'):'本地体验 · 不连接真实设备或支付'}}</view></template>
<script setup>
import {isBackend,connection} from '../store.js';
defineProps({map:Boolean});
</script>
