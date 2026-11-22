<script setup>
import { computed } from 'vue';
import ConnectedTablePage from '../ConnectedTablePage.vue';
import ConnectedScopeFilter from './ConnectedScopeFilter.vue';

const props = defineProps({
  title: String,
  navigationVersion: Number,
  loading: Boolean,
  error: String,
  scope: Object,
  stationName: String,
  users: Object,
  canWrite: Boolean,
  pagingDisabled: Boolean,
});
defineEmits(['change-page', 'detail', 'clear-scope']);

const columns = [
  ['username', '账号'],
  ['displayName', '名称'],
  ['state', '账号状态'],
];
const records = computed(() =>
  props.users.rows.map((user) => ({
    ...user,
    state: user.enabled ? '启用' : '停用',
  })),
);
</script>

<template>
  <ConnectedTablePage
    :title="title"
    :navigation-version="navigationVersion"
    :loading="loading"
    :error="error"
    description="仅管理普通用户；状态更新由服务端校验并记录日志。"
    :columns="columns"
    :records="records"
    :server-page="users"
    :paging-disabled="pagingDisabled"
    @change-page="$emit('change-page', $event)"
  >
    <template #before-table="{ resetFilters }">
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
        :disabled="pagingDisabled || row.role !== 'USER'"
        @click="$emit('detail', { type: 'user', record: row })"
      >
        {{ row.enabled ? '停用' : '启用' }}
      </button>
    </template>
  </ConnectedTablePage>
</template>
