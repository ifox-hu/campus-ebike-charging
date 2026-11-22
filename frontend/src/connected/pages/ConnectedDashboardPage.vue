<script setup>
import OverviewSummary from '../OverviewSummary.vue';
import OperationsPanel from '../../components/OperationsPanel.vue';
import DashboardStationMap from '../../components/DashboardStationMap.vue';
defineProps({ source: Object, client: Object, accountKey: String, loadedAt: String, platformAdmin: Boolean });
defineEmits(['navigate', 'device', 'order']);
</script>
<template>
  <section class="management-page remote-overview">
    <header class="management-heading">
      <div>
        <h1>{{ platformAdmin ? '平台概览' : '运营概览' }}</h1>
        <p>查看站点运行情况、充电订单和待处理事项。</p>
      </div>
    </header>
    <OverviewSummary
      :source="source"
      :loaded="!!loadedAt"
      @navigate="$emit('navigate', $event)"
      @device="$emit('device', $event)"
      @order="$emit('order', $event)"
    /><DashboardStationMap
      v-if="loadedAt"
      :source="source"
      @navigate="$emit('navigate', $event)"
    /><OperationsPanel
      :source="source"
      :client="client"
      :show-metrics="false"
      :show-statistics="false"
      :account-key="accountKey"
      @device="$emit('device', $event)"
      @order="$emit('order', $event)"
      @navigate="$emit('navigate', $event)"
    />

  </section>
</template>
