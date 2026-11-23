<script setup>
import { computed, ref } from 'vue';
import DashboardDateFilter from '../../components/DashboardDateFilter.vue';
import {dashboardRange,dashboardRangeForSource} from '../../domain/dashboardPeriod.js';
import OverviewSummary from '../OverviewSummary.vue';
import OperationsPanel from '../../components/OperationsPanel.vue';
import DashboardStationMap from '../../components/DashboardStationMap.vue';
import DashboardOperatorFilter from '../../components/DashboardOperatorFilter.vue';
import OrderTrendCard from '../../components/OrderTrendCard.vue';
import { scopeDashboardSource } from '../../domain/dashboardView.js';

const props = defineProps({
  source: { type: Object, required: true },
  operators: { type: Array, default: () => [] },
  client: Object,
  accountKey: String,
  loadedAt: String,
  platformAdmin: Boolean,
});
defineEmits(['navigate', 'device', 'order']);

const operatorId = ref('');
const dateRange=ref(dashboardRange('sixMonths'));
const period=ref('sixMonths');
const chartRange=computed(()=>dashboardRangeForSource(scopedSource.value,dateRange.value));
const scopedSource = computed(() => scopeDashboardSource(props.source, operatorId.value));
const operatorCount = computed(() => operatorId.value ? 1 : props.operators.length);

</script>

<template>
  <section class="management-page remote-overview">
    <header class="management-heading">
      <div>
        <h1>{{ platformAdmin ? '平台概览' : '运营概览' }}</h1>
        <p>查看站点运行情况、充电订单和待处理事项。</p>
      </div>
      <DashboardOperatorFilter
        v-if="platformAdmin"
        v-model="operatorId"
        :operators="operators"
        label="运营商"
      />
    </header>
    <DashboardDateFilter v-model="dateRange" @period="period=$event"/>
    <OverviewSummary
      :source="scopedSource"
      :range="dateRange"
      :period="period"
      :operator-count="operatorCount"
      :platform-admin="platformAdmin"
      :loaded="!!loadedAt"
      @navigate="$emit('navigate', $event)"
      @device="$emit('device', $event)"
      @order="$emit('order', $event)"
    />
    <OrderTrendCard :source="scopedSource" :range="chartRange" />
    <section v-if="loadedAt" class="dashboard-map-section" aria-label="站点分布">
      <DashboardStationMap :source="scopedSource" @navigate="$emit('navigate', $event)" />
    </section>
    <section class="dashboard-alert-section" aria-label="设备告警记录">
      <OperationsPanel
        :source="scopedSource"
        :client="client"
        :show-metrics="false"
        :show-statistics="false"
        :account-key="accountKey"
        @device="$emit('device', $event)"
        @order="$emit('order', $event)"
        @navigate="$emit('navigate', $event)"
      />
    </section>
  </section>
</template>

<style scoped>
.dashboard-map-section,
.dashboard-alert-section {
  min-width: 0;
}
@media (max-width: 520px) {
  .remote-overview > .management-heading {
    flex-wrap: wrap;
    gap: 1rem;
  }
  .remote-overview > .management-heading > div {
    flex: 1 0 100%;
  }
}
</style>
