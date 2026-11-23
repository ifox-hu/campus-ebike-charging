<script setup>
import { computed } from 'vue';
import ConnectedTablePage from '../ConnectedTablePage.vue';
import DeviceLayout from '../DeviceLayout.vue';
import { relationRows, scopeDeviceCatalog, scopeRecords, statusLabel } from '../platformClient.js';
import ConnectedScopeFilter from './ConnectedScopeFilter.vue';

const props = defineProps({
  title: String,
  navigationVersion: Number,
  loading: Boolean,
  error: String,
  page: String,
  data: Object,
  scope: Object,
  stationName: String,
  abnormalDeviceIds: Array,
  canWrite: Boolean,
  canManageStations: Boolean,
  operatorNames: Object,
});
defineEmits(['edit', 'detail', 'device', 'clear-scope']);

const devicePage = computed(() => props.page === 'devices');
const columns = computed(() =>
  devicePage.value
    ? [
        ['code', '设备编号'],
        ['name', '设备名称'],
        ['stationName', '所属站点'],
        ['socketCount', '插座数量'],
        ['state', '通信状态'],
      ]
    : [
        ['name', '站点名称'],
        ...(props.canManageStations ? [['operatorName', '运营商']] : []),
        ['address', '地址'],
        ['position', '坐标'],
        ['deviceCount', '设备数'],
        ['socketCount', '插座数'],
        ['state', '运营状态'],
      ],
);
const relations = computed(() =>
  relationRows(props.data.stations, props.data.devices, props.data.sockets),
);
const deviceScope = computed(() => ({
  ...props.scope,
  abnormalDeviceIds: props.abnormalDeviceIds,
}));
const scopedData = computed(() => scopeDeviceCatalog(props.data, deviceScope.value));
const records = computed(() => {
  if (devicePage.value) {
    const devices = relations.value.devices.map((device) => ({
      ...device,
      state: statusLabel(device.status, 'device'),
    }));
    return scopeRecords(devices, deviceScope.value);
  }
  return relations.value.stations.map((station) => ({
    ...station,
    operatorName: props.operatorNames?.[station.operatorId ?? 1] || '',
    position:
      station.latitude == null || station.longitude == null
        ? '未提供'
        : station.latitude +
          ', ' +
          station.longitude +
          ' · ' +
          (station.coordinateType || '坐标系未提供'),
    state: statusLabel(station.status, 'station'),
  }));
});
</script>

<template>
  <ConnectedTablePage
    :title="title"
    :navigation-version="navigationVersion"
    :loading="loading"
    :error="error"
    :description="
      devicePage
        ? '按服务端排号分组；新增设备固定为每台 A/B 两个独立插座。'
        : '站点位置采用服务端坐标与坐标系，不推测缺失坐标。'
    "
    :columns="columns"
    :records="records"
  >
    <template #create>
      <button
        v-if="devicePage ? canWrite : canManageStations"
        class="soft-button active"
        @click="$emit('edit', { type: page })"
      >
        {{ devicePage ? '新增一批设备' : '新增站点' }}
      </button>
    </template>
    <template #before-table="{ resetFilters }">
      <ConnectedScopeFilter
        :scope="scope"
        :station-name="stationName"
        @clear="
          $emit('clear-scope');
          resetFilters();
        "
      />
      <DeviceLayout v-if="devicePage" :data="scopedData" @open="$emit('device', $event)" />
    </template>
    <template #actions="{ row }">
      <button
        v-if="canWrite"
        class="table-link"
        @click="$emit('edit', { type: devicePage ? 'device' : 'stations', record: row })"
      >
        编辑
      </button>
      <button
        class="table-link"
        @click="$emit('detail', { type: devicePage ? 'device' : 'station', record: row })"
      >
        {{ devicePage ? '查看插座' : '关联业务' }}
      </button>
    </template>
  </ConnectedTablePage>
</template>
