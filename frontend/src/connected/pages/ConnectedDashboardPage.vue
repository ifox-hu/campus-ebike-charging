<script setup>
import { computed, ref, watch } from 'vue';
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
const mapOperatorId = ref('');
const alertsOperatorId = ref('');
const scopedSource = computed(() => scopeDashboardSource(props.source, operatorId.value));
const mapSource = computed(() => scopeDashboardSource(props.source, mapOperatorId.value));
const alertsSource = computed(() => scopeDashboardSource(props.source, alertsOperatorId.value));
const operatorCount = computed(() => operatorId.value ? 1 : props.operators.length);

watch(operatorId, value => {
  mapOperatorId.value = value;
  alertsOperatorId.value = value;
});
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
        label="概览运营商"
      />
    </header>
    <OverviewSummary
      :source="scopedSource"
      :all-source="source"
      :operator-id="operatorId"
      :operators="operators"
      :operator-count="operatorCount"
      :platform-admin="platformAdmin"
      :loaded="!!loadedAt"
      @navigate="$emit('navigate', $event)"
      @device="$emit('device', $event)"
      @order="$emit('order', $event)"
    />
    <OrderTrendCard
      :source="source"
      :operators="operators"
      :platform-admin="platformAdmin"
      :operator-id="operatorId"
    />
    <section v-if="loadedAt" class="dashboard-map-section" aria-label="站点分布">
      <div v-if="platformAdmin" class="dashboard-card-filter">
        <DashboardOperatorFilter
          v-model="mapOperatorId"
          :operators="operators"
          label="地图运营商"
        />
      </div>
      <DashboardStationMap :source="mapSource" @navigate="$emit('navigate', $event)" />
    </section>
    <section class="dashboard-alert-section" aria-label="设备告警记录">
      <div v-if="platformAdmin" class="dashboard-card-filter">
        <DashboardOperatorFilter
          v-model="alertsOperatorId"
          :operators="operators"
          label="告警运营商"
        />
      </div>
      <OperationsPanel
        :source="alertsSource"
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
.dashboard-card-filter {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.5rem 0;
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
