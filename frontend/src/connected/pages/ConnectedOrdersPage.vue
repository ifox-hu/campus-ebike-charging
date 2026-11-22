<script setup>
import { computed } from 'vue';
import ConnectedTablePage from '../ConnectedTablePage.vue';
import { formatNumber, scopeRecords, statusLabel } from '../platformClient.js';
import ConnectedScopeFilter from './ConnectedScopeFilter.vue';

const props = defineProps({
  title: String,
  navigationVersion: Number,
  loading: Boolean,
  error: String,
  orders: Array,
  stationName: Function,
  socketName: Function,
  scope: Object,
  abnormalDeviceIds: Array,
});
defineEmits(['detail', 'clear-scope']);

const columns = [
  ['orderNo', '订单编号'],
  ['owner', '用户账号'],
  ['stationName', '站点'],
  ['socketCode', '插座编号'],
  ['startTime', '开始时间'],
  ['energy', '电量（kWh）'],
  ['amount', '费用（元）'],
  ['state', '订单状态'],
  ['payment', '支付状态'],
];
const records = computed(() => {
  const orders = props.orders.map((order) => ({
    ...order,
    owner: order.ownerUsername || '未提供',
    stationName: order.stationNameSnapshot || props.stationName(order.stationId),
    socketCode: order.socketCodeSnapshot || props.socketName(order.connectorId),
    energy: formatNumber(order.energyKwh, 3),
    amount: formatNumber(order.totalAmount),
    state: statusLabel(order.status, 'order'),
    payment: statusLabel(order.paymentStatus, 'payment'),
  }));
  const { date, completedOnly } = props.scope;
  return scopeRecords(orders, {
    ...props.scope,
    abnormalDeviceIds: props.abnormalDeviceIds,
  }).filter(
    (order) =>
      (!date || String(order.startTime).slice(0, 10) === date) &&
      (!completedOnly || order.status === 'COMPLETED'),
  );
});
</script>

<template>
  <ConnectedTablePage
    :title="title"
    :navigation-version="navigationVersion"
    :loading="loading"
    :error="error"
    description="订单状态与支付状态分别展示，金额不由前端重新计算。"
    :columns="columns"
    :records="records"
  >
    <template #before-table="{ resetFilters }">
      <ConnectedScopeFilter
        :scope="scope"
        :station-name="scope.stationId ? stationName(scope.stationId) : ''"
        @clear="
          $emit('clear-scope');
          resetFilters();
        "
      />
    </template>
    <template #actions="{ row }">
      <button class="table-link" @click="$emit('detail', row)">详情</button>
    </template>
  </ConnectedTablePage>
</template>
