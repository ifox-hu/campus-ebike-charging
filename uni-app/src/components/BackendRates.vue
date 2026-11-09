<template>
  <view v-if="station" class="backend-rates">
    <text class="section-title">分时费率</text>
    <text v-if="station.ratesLoading" class="block muted small">正在读取费率…</text>
    <view v-else-if="station.ratesError"><text class="field-error">{{station.ratesError}}</text><button class="text-button" @click="loadRates(station.id)">重新读取费率</button></view>
    <text v-else-if="!station.ratePeriods?.length" class="block muted small">暂无可用费率，请稍后查询</text>
    <view v-for="period in station.ratePeriods||[]" :key="period.id" class="rate-period">
      <text class="block">{{period.startTime}}—{{period.endTime}}</text>
      <text class="muted small">电费 {{period.electricityPrice}} 元/度 · 服务费 {{period.servicePrice}} 元/度</text>
    </view>
    <text class="block muted small">最终费用以订单结算结果为准。</text>
  </view>
</template>
<script setup>
import {loadRates} from '../store.js';
defineProps({station:Object});
</script>
