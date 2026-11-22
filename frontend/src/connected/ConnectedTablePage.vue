<script setup>
import { computed, ref, watch } from 'vue';
import StatusTag from '../components/StatusTag.vue';

const props = defineProps({
  title: String,
  description: String,
  columns: Array,
  records: Array,
  navigationVersion: Number,
  loading: Boolean,
  error: String,
  serverPage: Object,
  pagingDisabled: Boolean,
});
const emit = defineEmits(['change-page']);
const keyword = ref('');
const page = ref(1);
const pageSize = 20;
const rows = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  return props.records.filter(
    (row) =>
      !query ||
      Object.values(row).some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(query),
      ),
  );
});
const pages = computed(() => Math.max(1, Math.ceil(rows.value.length / pageSize)));
const visible = computed(() =>
  props.serverPage
    ? rows.value
    : rows.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const currentPage = computed(() => (props.serverPage ? Number(props.serverPage.page) : page.value));
const lastPage = computed(() =>
  props.serverPage ? Math.max(1, props.serverPage.totalPages) : pages.value,
);

function resetPage() {
  page.value = 1;
}

function resetFilters() {
  keyword.value = '';
  resetPage();
}

function changePage(direction) {
  if (props.serverPage) emit('change-page', currentPage.value + direction);
  else page.value += direction;
}

watch(() => props.navigationVersion, resetFilters);
watch(pages, (value) => {
  if (page.value > value) page.value = value;
});
</script>

<template>
  <section class="management-page">
    <header class="management-heading">
      <div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
    </header>
    <div class="filter-bar">
      <slot name="create" />
      <input
        v-model="keyword"
        aria-label="筛选服务端列表"
        placeholder="筛选当前已加载数据"
        @input="resetPage"
      />
      <slot name="filters" :reset-page="resetPage" />
    </div>
    <slot name="before-table" :reset-filters="resetFilters" />
    <div class="management-table-wrap">
      <table class="management-table">
        <thead>
          <tr>
            <th>序号</th>
            <th v-for="[key, label] in columns" :key="key">{{ label }}</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in visible" :key="row.id">
            <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
            <td v-for="[key] in columns" :key="key">
              <StatusTag v-if="['state', 'payment'].includes(key)" :text="row[key]" />
              <span v-else>{{ row[key] ?? '—' }}</span>
            </td>
            <td><slot name="actions" :row="row" /></td>
          </tr>
          <tr v-if="!visible.length">
            <td :colspan="columns.length + 2" class="empty-table">
              {{
                loading
                  ? '正在读取服务端…'
                  : error
                    ? '读取未完成，请处理提示后重试'
                    : '暂无符合条件的服务端记录'
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <footer class="remote-pagination">
      <span>{{
        serverPage
          ? '当前服务端分页共 ' + serverPage.total + ' 位普通用户；筛选仅针对本页'
          : '筛选结果共 ' + rows.length + ' 条'
      }}</span>
      <button
        class="outline-button"
        :disabled="pagingDisabled || currentPage <= 1"
        @click="changePage(-1)"
      >
        上一页
      </button>
      <span>{{ currentPage }} / {{ lastPage }}</span>
      <button
        class="outline-button"
        :disabled="pagingDisabled || currentPage >= lastPage"
        @click="changePage(1)"
      >
        下一页
      </button>
    </footer>
  </section>
</template>
