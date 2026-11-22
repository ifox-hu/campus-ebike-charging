<script setup>
import OperationsPanel from '../OperationsPanel.vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { decimal, downloadCsv } from '../../domain/management.js';
const props = defineProps({ client: Object, user: Object, operatorId: { default: '' }, stations: Array, source: Object });
const from = ref('');
const to = ref('');
const stationId = ref('');
const result = ref(null);
const busy = ref(false);
const error = ref('');
let revision = 0;
const availableStations = computed(() => (props.stations || []).filter(row => !props.operatorId || String(row.operatorId) === String(props.operatorId)));
const metrics = [
  ['orderCount', '订单数', '笔'], ['energyKwh', '已结束订单电量', 'kWh'],
  ['totalAmount', '已结束订单应收', '元'], ['paidAmount', '已支付金额', '元'],
  ['electricityFee', '电费', '元'], ['serviceFee', '服务费', '元'],
  ['activeCount', '进行中订单', '笔'], ['openRepairCount', '当前待处理报修', '条'],
];
async function load() {
  const request = ++revision;
  error.value = '';
  result.value = null;
  busy.value = false;
  if (from.value && to.value && from.value > to.value) { error.value = '开始日期不能晚于结束日期。'; return; }
  busy.value = true;
  try {
    const data = await props.client.statistics({ operatorId: props.operatorId, stationId: stationId.value, from: from.value, to: to.value });
    if (request === revision) result.value = data;
  } catch (failure) { if (request === revision && !failure.stale) error.value = failure.message; }
  finally { if (request === revision) busy.value = false; }
}
function exportRows() {
  if (!result.value) return;
  downloadCsv('充电经营统计.csv', [
    ['运营商', '站点', '订单数', '充电量(kWh)', '电费(元)', '服务费(元)', '应收金额(元)', '已支付金额(元)', '在线设备', '设备总数', '待处理报修'],
    ...result.value.rows.map(row => [row.operatorName, row.stationName, row.orderCount, row.energyKwh, decimal(row.electricityFee), decimal(row.serviceFee), decimal(row.totalAmount), decimal(row.paidAmount), row.onlineDeviceCount, row.deviceCount, row.openRepairCount]),
  ]);
}
watch(() => props.operatorId, () => { stationId.value = ''; load(); }, { immediate: true });
onBeforeUnmount(() => { revision++; });
</script>

<template>
  <section class="management-page">
    <header class="management-heading"><div><h1>{{ user.role === 'ADMIN' ? '统计分析' : '经营统计' }}</h1><p>按充电开始日期汇总订单，设备和报修展示当前状态。</p></div><button class="outline-button" :disabled="busy || !result" @click="exportRows">导出当前结果</button></header>
    <form class="mg-filters" @submit.prevent="load"><label>开始日期<input v-model="from" type="date" /></label><label>结束日期<input v-model="to" type="date" /></label><label>站点<select v-model="stationId"><option value="">全部站点</option><option v-for="site in availableStations" :key="site.id" :value="site.id">{{ site.name }}</option></select></label><button class="soft-button active" :disabled="busy">{{ busy ? '查询中…' : '查询统计' }}</button></form>
    <p v-if="error" class="mg-error" role="alert">{{ error }}</p><p v-if="busy" class="mg-notice" role="status">正在汇总经营数据…</p>
    <template v-if="result"><div class="mg-metrics"><article v-for="[key, label, unit] in metrics" :key="key"><span>{{ label }}</span><strong>{{ unit === '元' ? decimal(result.summary[key]) : result.summary[key] ?? 0 }} <small>{{ unit }}</small></strong></article></div>
      <h2 class="mg-subheading">站点经营明细</h2><div class="mg-table-wrap"><table class="management-table"><thead><tr><th v-if="user.role === 'ADMIN'">运营商</th><th>站点</th><th>订单数</th><th>电量（kWh）</th><th>电费（元）</th><th>服务费（元）</th><th>应收（元）</th><th>已支付（元）</th><th>在线设备</th><th>待处理报修</th></tr></thead><tbody>
        <tr v-for="row in result.rows" :key="row.operatorId + '-' + row.stationId"><td v-if="user.role === 'ADMIN'">{{ row.operatorName }}</td><td>{{ row.stationName }}</td><td>{{ row.orderCount }}</td><td>{{ row.energyKwh }}</td><td>{{ decimal(row.electricityFee) }}</td><td>{{ decimal(row.serviceFee) }}</td><td>{{ decimal(row.totalAmount) }}</td><td>{{ decimal(row.paidAmount) }}</td><td>{{ row.onlineDeviceCount }} / {{ row.deviceCount }}</td><td>{{ row.openRepairCount }}</td></tr><tr v-if="!result.rows.length"><td :colspan="user.role === 'ADMIN' ? 10 : 9" class="empty-table">暂无站点数据</td></tr>
      </tbody></table></div>
      <h2 class="mg-subheading">每日订单汇总</h2><div class="mg-table-wrap"><table class="management-table"><thead><tr><th>日期</th><th>订单数</th><th>电量（kWh）</th><th>应收（元）</th><th>已支付（元）</th><th>订单量</th></tr></thead><tbody><tr v-for="day in result.daily" :key="day.date"><td>{{ day.date }}</td><td>{{ day.orderCount }}</td><td>{{ day.energyKwh }}</td><td>{{ decimal(day.totalAmount) }}</td><td>{{ decimal(day.paidAmount) }}</td><td><meter :value="day.orderCount" :max="Math.max(1, ...result.daily.map(item => item.orderCount))" :aria-label="day.date + '订单量'" /></td></tr><tr v-if="!result.daily.length"><td colspan="6" class="empty-table">当前日期范围暂无订单</td></tr></tbody></table></div>
    </template>
    <OperationsPanel v-if="source" :source="source" :show-alerts="false" :show-metrics="false" />
  </section>
</template>
