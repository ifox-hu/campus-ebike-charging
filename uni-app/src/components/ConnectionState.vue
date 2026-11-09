<template>
  <view v-if="isBackend" class="connection-state panel">
    <text v-if="connection.loading" class="block muted small">正在同步账号数据…</text>
    <text v-if="connection.error" class="block field-error">{{connection.error}}</text>
    <text v-if="connection.operationError" class="block field-error">{{connection.operationError}}</text>
    <button v-if="!connection.user&&hasSession&&!connection.loading" class="text-button" @click="refreshData">重新连接</button>
    <button v-if="!connection.user&&!hasSession&&!connection.loading" class="text-button" @click="go('/pages/account/index')">登录后查看站点与订单</button>
    <view v-else-if="connection.user" class="section-row connection-actions">
      <text class="muted small">{{connection.user.displayName||connection.user.username}} · 平台账号</text>
      <button class="small-link" :disabled="connection.loading||!!connection.operation" @click="refreshData">{{connection.loading?'同步中':'刷新数据'}}</button>
    </view>
  </view>
</template>
<script setup>
import {isBackend,connection,go,refreshData,hasSession} from '../store.js';
</script>
