<script setup>
import { computed } from 'vue';
import RateSchedulePanel from '../../components/RateSchedulePanel.vue';
import ConnectedTablePage from '../ConnectedTablePage.vue';
import { formatNumber } from '../platformClient.js';
import ConnectedScopeFilter from './ConnectedScopeFilter.vue';

const props = defineProps({
  title: String,
  navigationVersion: Number,
  loading: Boolean,
  error: String,
  stations: Array,
  rates: Array,
  scope: Object,
  stationName: String,
  canWrite: Boolean,
  ratesBusy: Boolean,
  ratesError: String,
});
const stationId = defineModel('stationId', { type: String, required: true });
defineEmits(['reload', 'edit', 'remove', 'clear-scope']);

const columns = [
  ['startTime', '开始时间'],
  ['endTime', '结束时间'],
  ['electric', '电价（元/kWh）'],
  ['service', '服务费（元/kWh）'],
];
const records = computed(() =>
  props.rates.map((rate) => ({
    ...rate,
    electric: formatNumber(rate.electricityPrice),
    service: formatNumber(rate.servicePrice, 4),
  })),
);
</script>

<template>
  <ConnectedTablePage
    :title="title"
    :navigation-version="navigationVersion"
    :loading="loading"
    :error="error"
    description="完整展示所选站点的分时费率，不使用模拟单价。"
    :columns="columns"
    :records="records"
  >
    <template #create>
      <button v-if="canWrite" class="soft-button active" @click="$emit('edit', { type: 'rates' })">
        新增费率时段
      </button>
    </template>
    <template #filters="{ resetPage }">
      <select
        v-model="stationId"
        aria-label="选择费率站点"
        @change="
          resetPage();
          $emit('reload');
        "
      >
        <option value="">选择站点</option>
        <option v-for="station in stations" :key="station.id" :value="String(station.id)">
          {{ station.name }}
        </option>
      </select>
      <button class="outline-button" :disabled="ratesBusy || !stationId" @click="$emit('reload')">
        刷新费率
      </button>
    </template>
    <template #before-table="{ resetFilters }">
      <RateSchedulePanel v-if="stationId && !ratesError" :rates="rates" :loading="ratesBusy" />
      <p v-if="ratesError" class="remote-error" role="alert">{{ ratesError }}</p>
      <ConnectedScopeFilter
        :scope="scope"
        :station-name="stationName"
        @clear="
          $emit('clear-scope');
          resetFilters();
        "
      />
    </template>
    <template #actions="{ row }">
      <button
        v-if="canWrite"
        class="table-link"
        @click="$emit('edit', { type: 'rates', record: row })"
      >
        编辑
      </button>
      <button v-if="canWrite" class="table-link" @click="$emit('remove', row)">删除</button>
    </template>
  </ConnectedTablePage>
</template>
